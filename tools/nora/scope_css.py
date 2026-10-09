"""Изоляция старых стилей «Норы»: каждое правило получает префикс .L,
правила для html/body/:root и для старой навигации отбрасываются,
имена анимаций получают префикс L_, чтобы не пересекаться с новыми."""
import re

DROP_SEL = re.compile(r'nav\.tabs|body\.kb|\.realm\b|\.theme-sw|\.totop|\.rb\b|\.rb-|\.view\b|\.wrap\b|\.realm-veil')


def split_top(sel):
    out, depth, cur = [], 0, ''
    for ch in sel:
        if ch in '([': depth += 1
        elif ch in ')]': depth -= 1
        if ch == ',' and depth == 0:
            out.append(cur); cur = ''
        else:
            cur += ch
    out.append(cur)
    return [x.strip() for x in out if x.strip()]


def scope(css, names):
    out, i, n = [], 0, len(css)
    while i < n:
        if css.startswith('/*', i):
            j = css.index('*/', i) + 2; i = j; continue
        if css[i].isspace():
            i += 1; continue
        j = css.index('{', i)
        head = css[i:j].strip()
        # найти парную скобку
        depth, k = 1, j + 1
        while depth:
            if css[k] == '{': depth += 1
            elif css[k] == '}': depth -= 1
            k += 1
        body = css[j + 1:k - 1]
        i = k
        if head.startswith('@keyframes'):
            nm = head.split()[1]
            out.append(f'@keyframes L_{nm}{{{body}}}')
        elif head.startswith('@media') or head.startswith('@supports'):
            inner = scope(body, names)
            if inner.strip(): out.append(f'{head}{{{inner}}}')
        elif head.startswith('@'):
            out.append(f'{head}{{{body}}}')
        else:
            sels = []
            for x in split_top(head):
                if DROP_SEL.search(x): continue
                m = re.match(r'^((?::root|html|body)[^\s>+~]*)\s*(.*)$', x)
                if m:
                    lead, rest = m.group(1), m.group(2)
                    if rest.startswith('>'): rest = rest[1:].strip()
                    if re.search(r'(^|\s)(html|body)\b', rest): continue
                    if not rest:
                        if lead.startswith(':root'): sels.append(lead.replace(':root', ':root', 1) + ' .L')
                        continue
                    if lead in ('html', 'body'): sels.append('.L ' + rest)
                    else: sels.append(lead + ' .L ' + rest)
                else:
                    sels.append('.L ' + x)
            if not sels: continue
            for nm in names:
                body = re.sub(r'(animation(?:-name)?\s*:[^;}]*?)\b' + nm + r'\b', r'\1L_' + nm, body)
            out.append(','.join(sels) + '{' + body + '}')
    return '\n'.join(out)


def build(old_css):
    names = sorted(set(re.findall(r'@keyframes\s+([\w-]+)', old_css)), key=len, reverse=True)
    return scope(old_css, names)
