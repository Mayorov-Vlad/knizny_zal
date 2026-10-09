"""Сборка единой «Норы»: логика и данные старого app.html + новый интерфейс v5.
Запуск из корня репозитория: python3 tools/nora/build.py
Источник старого приложения — tools/nora/old_app.html (копия app.html до слияния),
новый вид — v5/index.html (стили и разметка), новый слой интерфейса — tools/nora/nora_ui.js,
дополнительные стили — tools/nora/extra.css.
Каталог CAT берётся из текущего app.html (его ежемесячно пополняет задача),
поэтому пересборка не теряет новых книг."""
import re, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from scope_css import build as scope_old, split_top

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
H = os.path.join(ROOT, 'tools', 'nora')
old = open(os.path.join(H, 'old_app.html'), encoding='utf-8').read()
v5 = open(os.path.join(ROOT, 'v5', 'index.html'), encoding='utf-8').read()
ui = open(os.path.join(H, 'nora_ui.js'), encoding='utf-8').read()
sync_js = open(os.path.join(H, 'sync.js'), encoding='utf-8').read()
extra = open(os.path.join(H, 'extra.css'), encoding='utf-8').read()


def cut(s, a, b, start=0):
    i = s.index(a, start); j = s.index(b, i + len(a))
    return s[i + len(a):j], i, j + len(b)


# ---------- старое ----------
head_end = old.index('<style>', old.index('</style>') )  # второй style = основной
font_block, _, _ = cut(old, '<style>', '</style>')
old_css, _, _ = cut(old, '<style>', '</style>', head_end)
old_body, _, _ = cut(old, '<body>', '<script>\n')
old_js_start = old.index('<script>\n', old.index('<body>')) + len('<script>\n')
old_js = old[old_js_start:old.rindex('</script>')]

# каталог CAT — из текущего app.html, если там он длиннее (ежемесячные пополнения)
def cat_line(t):
    i = t.index('const CAT=['); return t[i:t.index('\n', i)]
cur_app = open(os.path.join(ROOT, 'app.html'), encoding='utf-8').read()
if len(cat_line(cur_app)) > len(cat_line(old_js)):
    old_js = old_js.replace(cat_line(old_js), cat_line(cur_app))
    print('CAT взят из текущего app.html')

old_css = re.sub(r'\.cv(?![\w-])', '.lcv', old_css)
legacy_css = scope_old(old_css)


def rep(s, a, b, cnt=1):
    n = s.count(a)
    assert n == cnt, (a[:60], n)
    return s.replace(a, b)


# старый JS: убираем «наверх» и свайп между вкладками, обложки — на свои классы, оценки — из 5
old_js = rep(old_js, 'class="cover cv cv${st}', 'class="cover lcv lcv${st}')
i = old_js.index('(function(){const z=document.createElement("button");z.className="totop"')
j = old_js.index('})();', i) + 5
old_js = old_js[:i] + old_js[j:]
i = old_js.index('(function(){\n  let x0=0,y0=0,t0=0,mode=null,dx=0,el=null;')
j = old_js.index('// ---------- тема ----------', i)
old_js = old_js[:i] + old_js[j:]
for x, y in (('Тевосгинку', 'Шуршуне'), ('Тевосгинка', 'Шуршуни'), ('Тевосгинк', 'Шуршуня'), ('Тевосоник', 'Шуршуня')):
    old_js = old_js.replace(x, y)
    old_body = old_body.replace(x, y)
old_js = rep(old_js, 'const fs=Math.max(w*.1,Math.min(w*.22,w*11/Math.max(t.length,1)));', 'const fs=Math.max(w*.08,Math.min(w*.22,w*11/Math.max(t.length,1),w*.84/(mw*.66)));')
old_js = rep(old_js, 'l:a[9]?a[9].split(","):[],hr:a[10]}));', 'l:a[9]?a[9].split(","):[],hr:a[10],s:a[11]||0}));')
old_js = rep(old_js, 'const GUEST=!!(window.Telegram&&Telegram.WebApp&&Telegram.WebApp.initData)&&(!_tgu||String(_tgu.username||"").toLowerCase()!==OWNER);',
  'const GUEST=(window.Telegram&&Telegram.WebApp&&Telegram.WebApp.initData)?(!_tgu||String(_tgu.username||"").toLowerCase()!==OWNER):!!(window.NSYNC&&NSYNC.on&&localStorage.getItem("zal.who")!==\'"owner"\');')
old_js = rep(old_js, 'SHARE_BASE="https://mayorov-vlad.github.io/knizny_zal/"', 'SHARE_BASE="https://moya-nora.github.io/"')
old_js = rep(old_js, '<b>${b.r}</b><span>/ 10</span>', '<b>${Math.round(b.r/2)}</b><span>/ 5</span>')

# старая разметка: прячем, тост — новый
old_body = rep(old_body, '<div class="toast" id="toast"></div>', '')
ob = old_body.index('<div class="scrim" id="scrim">')
old_views, old_over = old_body[:ob], old_body[ob:]

# ---------- v5 ----------
v5_css, _, _ = cut(v5, '<style>', '</style>')
v5_body, _, _ = cut(v5, '<body>', '<script>\n')
v5_body = rep(v5_body, '<div class="sheet" id="sheet"><div class="sh-bg" data-close></div><div class="sh gl" id="sh"><div class="grab"></div><div id="shBody"></div></div></div>',
              '<div class="sheet" id="vsheet"><div class="sh-bg" data-close></div><div class="sh gl" id="vsh"><div class="grab"></div><div id="vshBody"></div></div></div>')
v5_body = rep(v5_body, '<section class="screen" id="s-feed"><div class="feed" id="feed"></div>',
              '<section class="screen" id="s-feed"><div class="feed" id="feed"></div><button class="ffil gl press" id="ffil" hidden aria-label="Фильтры"></button>')
v5_body = rep(v5_body, '<div class="scroll" id="colScroll">', '<div class="scroll" id="colScroll"><div class="vbanner gl" id="vbanner" hidden></div>')


def scope_v5(css):
    out, i, n = [], 0, len(css)
    while i < n:
        if css.startswith('/*', i):
            i = css.index('*/', i) + 2; continue
        if css[i].isspace():
            i += 1; continue
        j = css.index('{', i)
        head = css[i:j].strip()
        depth, k = 1, j + 1
        while depth:
            if css[k] == '{': depth += 1
            elif css[k] == '}': depth -= 1
            k += 1
        body = css[j + 1:k - 1]; i = k
        if head.startswith('@media') or head.startswith('@supports'):
            out.append(f'{head}{{{scope_v5(body)}}}'); continue
        if head.startswith('@'):
            out.append(f'{head}{{{body}}}'); continue
        sels = []
        for x in split_top(head):
            if x in ('*', 'html', 'html,body', 'body'):
                sels.append(x)  # глобальные основы: фон, шрифт, box-sizing
            elif x == ':root':
                sels.append('#app')
            else:
                m = re.match(r'^((?:html|body)[^\s>+~]*)\s+(.*)$', x)
                if m: sels.append(f'{m.group(1)} #app {m.group(2)}')
                else: sels.append('#app ' + x)
        out.append(','.join(sels) + '{' + body + '}')
    return '\n'.join(out)


new_css = scope_v5(v5_css)

# ---------- светлая тема: автоматически «переворачиваем» цвета нового вида ----------
DARKSEL = re.compile(r'^\.(intro|onb|rm|coach|reel|flash|cz|cundo|ctap|op|stp|onb-)|^\.rm-|^\.onb-')
def lc(m):
    t = m.group(0)
    if t.lower().startswith('rgba'):
        r, g, b_, a = [x.strip() for x in t[t.index('(') + 1:-1].split(',')]
        r, g, b_, a = int(r), int(g), int(b_), float(a)
        if min(r, g, b_) >= 200: return f'rgba(20,21,27,{round(min(a * .9, 1), 3)})'
        if max(r, g, b_) == 0: return f'rgba(0,0,0,{round(a * .3, 3)})'
        if max(r, g, b_) <= 64: return f'rgba(250,249,246,{a})'
        return t
    h = t[1:].lower()
    if len(h) == 3: h = ''.join(c * 2 for c in h)
    if len(h) not in (6, 8): return t
    rgb = [int(h[i:i + 2], 16) for i in (0, 2, 4)]
    if min(rgb) >= 230: return '#14151B'
    if max(rgb) <= 40: return '#F3F1EC' if max(rgb) < 30 else '#E3E1DC'
    return t
COL = re.compile(r'rgba\([^)]*\)|#[0-9a-fA-F]{3,8}\b')
def light_rules(css):
    out, i, n = [], 0, len(css)
    while i < n:
        if css.startswith('/*', i): i = css.index('*/', i) + 2; continue
        if css[i].isspace(): i += 1; continue
        j = css.index('{', i); head = css[i:j].strip()
        depth, k = 1, j + 1
        while depth:
            if css[k] == '{': depth += 1
            elif css[k] == '}': depth -= 1
            k += 1
        body = css[j + 1:k - 1]; i = k
        if head.startswith('@'): continue
        decls = [d for d in body.split(';') if COL.search(d) and not d.strip().startswith('animation')]
        if not decls: continue
        decls = [COL.sub(lc, d) for d in decls]
        L = 'html[data-theme="light"]'
        sels = []
        for x in split_top(head):
            if DARKSEL.search(x): continue
            if x in ('html', 'html,body', 'body'): sels += [L, L + ' body']
            elif x == ':root': sels.append(L + ' #app')
            else:
                m = re.match(r'^((?:html|body)[^\s>+~]*)\s+(.*)$', x)
                if m: sels.append(f'{L} {m.group(1)} #app {m.group(2)}')
                else: sels.append(f'{L} #app {x}')
        if sels: out.append(','.join(sels) + '{' + ';'.join(decls) + '}')
    return '\n'.join(out)
light_css = light_rules(v5_css)
# переменные v5 нужны и снаружи #app (например, для .L-листов) — дублируем на :root
root_vars = re.search(r':root\{[^}]*\}', v5_css).group(0)

# ---------- сборка ----------
fonts = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500;1,600&family=Inter+Tight:wght@400;500;600;700&display=swap" rel="stylesheet">'

html = f'''<!doctype html>
<html lang="ru" data-theme="dark">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
<script src="https://telegram.org/js/telegram-web-app.js"></script><title>Нора</title>
{fonts}
<style>{font_block}</style>
<style>
/* ===== старые листы и обложки (изолированы под .L) ===== */
{legacy_css}
</style>
<style>
/* ===== новый вид (изолирован под #app) ===== */
{root_vars}
{new_css}
</style>
<style>
/* ===== светлая тема ===== */
{light_css}
</style>
<style>
/* ===== стыковка ===== */
{extra}
</style>
</head>
<body>
<div id="app" lang="ru">
{v5_body}
</div>
<div class="L legacy-views" lang="ru" aria-hidden="true">{old_views}</div>
<div class="L legacy-over" lang="ru">{old_over}</div>
<script>
{sync_js}
</script>
<script>
{old_js}
;(function(){{
{ui}
}})();
</script>
</body>
</html>
'''
open(os.path.join(ROOT, 'app.html'), 'w', encoding='utf-8').write(html)
print('app.html', len(html.encode('utf-8')))
