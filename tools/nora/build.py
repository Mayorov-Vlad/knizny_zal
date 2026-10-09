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

# без рода: интерфейс не угадывает, кто читает
NEUTRAL = [
 ("Кого из них ты бы оправдала охотнее", "Кого из них проще оправдать"),
 ("Бывало ли, что ты влюблялась в образ, а не в человека", "Бывает ли, что влюбляешься в образ, а не в человека"),
 ("и бывала ли ты в таком положении?", "и знакомо ли тебе такое положение?"),
 ("Согласна ли ты с таким финалом?", "Убеждает ли тебя такой финал?"),
 ("А как прочитала ты?", "А как это видится тебе?"),
 ("Согласна ли ты с тем, как она сама расставляет", "Убеждает ли тебя то, как она сама расставляет"),
 ("что ты «примеряла» чужие версии себя", "что «примеряешь» чужие версии себя"),
 ("Если бы ты прочитала «Аляску Сандерс» первой", "Если бы «Аляска Сандерс» попалась первой"),
 ("Согласна ли ты, что это благородство, или это холодность", "Это благородство — или холодность"),
 ("Ты поставила книге 5.", "У книги оценка 5."),
 ("Ты поставила книге 1.", "У книги оценка 1."),
 ("Согласна ли ты с хвалебными отзывами?", "Убеждают ли хвалебные отзывы?"),
 ("Согласна ли ты с теми, кто считает", "Близка ли тебе мысль тех, кто считает"),
 ("атмосфера, которую ты полюбила,", "атмосфера, которая так нравится,"),
 ("При перечитывании ты разочаровалась.", "При перечитывании пришло разочарование."),
 ("так, как ты не поступила бы ни за что?", "так, как для тебя немыслимо?"),
 ("Как ответила бы ты?", "Какой ответ у тебя?"),
 ("Какое название дала бы ей ты?", "Как назвать её по-своему?"),
 ("что думаешь ты сама", "что думаешь на самом деле"),
 ("Кому из знакомых ты бы подарила эту книгу — и что написала бы на первой странице?", "Кому из знакомых стоит подарить эту книгу — и что написать на первой странице?"),
 ("В какой момент ты заподозрила разгадку?", "В какой момент появилась догадка?"),
 ("если ты её пропустила", "если её не удалось заметить"),
 ("Какое правило этого мира ты бы перенесла в наш", "Какое правило этого мира стоит перенести в наш"),
 ("Я пересмотрел всё, что ты видела,", "Я пересмотрел всё, что есть на твоей полке,"),
 ("Вернула в «Хочу прочитать»", "Возвращено в «Хочу прочитать»"),
 ("Найди фильм, который уже смотрела,", "Найди уже просмотренный фильм —"),
 ("Сфотографируй книги, которые уже прочитала,", "Сфотографируй уже прочитанные книги"),
 ("Ты хотела ${", "Хотелось ${"),
 ("Полка для подруги", "Полки для друзей"),
 ("ты бы пересказала подруге первым", "хочется пересказать первым"),
 ("готова ли ты потом заметить разницу", "получится ли потом заметить разницу"),
 ("если готова к бездне", "если хочется в бездну"),
 ("если готова к странной и пронзительной прозе", "под настроение для странной и пронзительной прозы"),
 ("если готова к жёсткой и честной прозе", "под настроение для жёсткой и честной прозы"),
 ("Когда готова к тяжёлому, но важному разговору", "Когда есть силы на тяжёлый, но важный разговор"),
 ("Когда готова попрощаться с героинями насовсем", "Когда пора попрощаться с героинями насовсем"),
 ("Если соскучилась по мушкетёрам", "Если не хватает мушкетёров"),
 ("что не одна такая", "что такое бывает не только с тобой"),
 ("когда сама в творческом кризисе", "в творческом кризисе"),
 ("когда занята делом и не замечаешь времени", "когда с головой в деле и не замечаешь времени"),
]
for x, y in NEUTRAL:
    assert x in old_js or y in old_js, x
    old_js = old_js.replace(x, y)
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
v5_body = rep(v5_body, '<div class="seg gl" role="tablist"><i></i><button data-realm="books" class="on press">Книги</button><button data-realm="films" class="press">Кино</button></div>',
              '<div class="seg" hidden><button data-realm="books" class="on">Книги</button></div><button class="addb gl press" id="addB" aria-label="Поставить книгу на полку"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>Поставить книгу на полку</button>')
v5_body = rep(v5_body, 'отметь несколько книг и фильмов, которые ты уже знаешь', 'отметь несколько книг, которые уже прочитаны')
v5_body = rep(v5_body, '<div class="stp" id="onbStep">1 из 2</div>', '<div class="stp" id="onbStep" hidden></div>')
v5_body = '<div class="splash on" id="splash" aria-hidden="true"><div class="sp-reel" id="spReel">'+''.join('<i></i>' for _ in range(15))+'</div><div class="sp-fade"></div><div class="sp-logo"><small>книжная</small><b>НОРА</b></div><div class="sp-flash"></div></div>' + v5_body
v5_body = rep(v5_body, '<button class="srch gl press" id="srchB" aria-label="Найти и добавить"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg></button>', '')
v5_body = rep(v5_body, '<button data-s="sum">', '<button class="dsrch press" id="srchB" aria-label="Поиск книг"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg></button><button data-s="fr"><svg viewBox="0 0 24 24"><circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="16.5" cy="9.5" r="2.6"/><path d="M15.5 14.2c2.6-.3 4.6 1.3 5 4.3"/></svg>Друзья<i class="dot" id="frDot" hidden></i></button><button data-s="sum">')
v5_body = rep(v5_body, '<section class="screen" id="s-sum">', '<section class="screen" id="s-fr"><div class="scroll" id="frScroll"><div id="frBox"></div></div></section><section class="screen" id="s-sum">')
v5_body = rep(v5_body, '<div class="scroll" id="colScroll">', '<div class="scroll" id="colScroll"><div class="vbanner gl" id="vbanner" hidden></div>')



def notL(sel):
    """правило нового вида не должно задевать вставки старой Норы (.L внутри #app)"""
    m = re.search(r'::?(?:before|after|placeholder|-webkit-scrollbar)\b', sel)
    base, pe = (sel[:m.start()], sel[m.start():]) if m else (sel, '')
    if base.endswith('#app') or base.endswith(' body') or base in ('*', 'html', 'body'): return sel
    return base + ':not(.L *)' + pe

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
                elif re.match(r'^[a-z][\w:()\-]*$', x): sels.append(':where(#app) ' + x)   # сбросы для тегов — слабые, как в оригинале
                else: sels.append('#app ' + x)
        out.append(','.join(notL(x) if '#app ' in x else x for x in sels) + '{' + body + '}')
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
        if sels: out.append(','.join(notL(x) for x in sels) + '{' + ';'.join(decls) + '}')
    return '\n'.join(out)
light_css = light_rules(v5_css)
# переменные v5 нужны и снаружи #app (например, для .L-листов) — дублируем на :root
root_vars = re.search(r':root\{[^}]*\}', v5_css).group(0)

# ---------- сборка ----------
fonts = '<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500;1,600&family=Inter+Tight:wght@400;500;600;700&display=swap" rel="stylesheet" media="print" onload="this.media=\'all\'">'

tg_loader = r'''<script>/* Скрипт Telegram нужен только внутри Telegram; в обычном браузере он может грузиться десятки секунд и держать чёрный экран */
(function(){var tg=/tgWebApp/.test(location.hash)||!!window.TelegramWebviewProxy||!!(window.external&&"notify" in window.external);try{tg=tg||!!sessionStorage.getItem("__telegram__initParams")}catch(e){}
if(tg)document.write('<script src="https://telegram.org/js/telegram-web-app.js"><\/script>')})();</script>'''
html = f'''<!doctype html>
<html lang="ru" data-theme="dark">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,user-scalable=no">
{tg_loader}
<link rel="manifest" href="manifest.webmanifest"><link rel="apple-touch-icon" href="icons/icon-180.png"><link rel="icon" href="icons/icon-192.png"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="Нора"><meta name="theme-color" content="#05060A"><title>Нора</title>
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
