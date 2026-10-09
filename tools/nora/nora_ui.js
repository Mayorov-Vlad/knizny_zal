// =====================================================================
//  «Нора» — новый интерфейс поверх данных и логики прежней версии.
//  Всё хранится как раньше (zal.* в localStorage + облако Telegram),
//  поэтому полки, резервные копии и ссылки «поделиться» продолжают работать.
// =====================================================================
const $=s=>document.querySelector(s);
const RM=matchMedia("(prefers-reduced-motion: reduce)").matches;
const IMGFL=id=>"https://fantlab.ru/images/editions/big/"+id;
const NOW7=()=>new Date().toISOString().slice(0,7);
const r5=r=>r==null?null:Math.round(r/2);
const T={books:{did:"Уже прочитано",read:"Прочитано",want:"Хочу прочитать",u:["книга","книги","книг"],what:"эту книгу"},
         films:{did:"Уже посмотрено",read:"Посмотрено",want:"Хочу посмотреть",u:["фильм","фильма","фильмов"],what:"этот фильм"}};
let REALM="books";   // кино убрано из Норы (заметки — claude/films-app-notes.md в проекте)
const isF=()=>REALM==="films";
const tgHaptic=t=>{try{TG&&TG.HapticFeedback&&TG.HapticFeedback.impactOccurred(t||"light")}catch(e){}};

// ---------- каталоги для быстрого поиска ----------
const CATT={};CAT.forEach(c=>{const k=norm(c.t);if(!CATT[k])CATT[k]=c});
const LENPG={short:220,mid:380,long:650};
const catOf=x=>{const c=CATT[norm(x.t)];return c&&(!x.a||!c.a||norm(c.a).includes(norm(String(x.a).split(" ").slice(-1)[0])))?c:null};
const palOf=t=>PAL[hsh(String(t))%PAL.length];

// ---------- обложки: настоящие (Фантлаб/Википедия) поверх рисованных ----------
const IMG=LS.get("zal.img2",{});let imgT=0;const imgSave=()=>{clearTimeout(imgT);imgT=setTimeout(()=>LS.set("zal.img2",IMG),500)};
try{localStorage.removeItem("zal.img")}catch(e){}
// выбор обложки вручную: "draw" — рисованная, иначе адрес картинки (синхронизируется)
let COV=LS.get("zal.cov",{});const covSave=()=>LS.set("zal.cov",COV);
const ikey=x=>x._f?"f:"+(x.id||norm(x.t)+(x.y||"")):norm(x.t)+"|"+norm(x.a||"");
// IMG[k]: адрес картинки; "!время" — источник ответил «нет обложки» (повторим через 2 недели)
const NOIMG_TTL=14*864e5;
const imgOf=x=>{const c=COV[ikey(x)];if(c==="draw")return "";if(c)return c;const v=x.img||IMG[ikey(x)]||"";return v&&v[0]!=="!"?v:""};
const imgKnown=k=>{const v=IMG[k];if(!v)return false;if(v[0]!=="!")return true;return Date.now()-(+v.slice(1)||0)<NOIMG_TTL};
const imgTag=u=>`<img src="${esc(u)}" alt="" referrerpolicy="no-referrer" decoding="async" onload="NORA_IMGOK(this)" onerror="NORA_IMGERR(this)">`;
window.NORA_IMGOK=function(img){const w=img.naturalWidth,h=img.naturalHeight,r=h/Math.max(1,w),box=img.closest("[data-ik]"),k=box&&box.dataset.ik;
  if(k&&!COV[k]&&(w<150||h<200||r<1.2||r>1.85)){img.remove();if(IMG[k]===img.getAttribute("src")){IMG[k]="!"+Date.now();imgSave()}document.querySelectorAll(`#app [data-ik="${CSS.escape(k)}"] img`).forEach(x=>x.remove());return}
  img.classList.add("ok")};
function cv(x,w){const k=ikey(x),u=imgOf(x);let inner="";
  if(x._f)inner=`<span class="L">${poster({...(x.src||{}),id:x.id||x.t,t:x.t,y:x.y,g:x.g||0},w||120)}</span>`;
  else{const s=x.src&&x.src.bg?x.src:null,c=catOf(x),p=palOf(x.t),b=s||{id:x.id||x.t,t:x.t,a:x.a||"",g:x.g||(c&&c.g)||"modern",bg:(c&&c.bg)||p[0],fg:(c&&c.fg)||p[1],tags:c&&c.tags};
    inner=`<span class="L">${cover({...b,a:b.a||""},w||120)}</span>`}
  if(!u&&x.t)wantImg(x);
  return `<div class="cv lg" data-ik="${esc(k)}" style="--lw:${w||120}px">${inner}${u?imgTag(u):""}</div>`}
// картинка не загрузилась (сеть) — пробуем ещё раз с паузой; после 4 неудач ищем обложку заново
const IERR={};
window.NORA_IMGERR=function(img){const box=img.closest("[data-ik]"),k=box&&box.dataset.ik,u=img.getAttribute("src");img.remove();if(!k)return;
  const n=IERR[k]=(IERR[k]||0)+1;
  if(n<=4)setTimeout(()=>{document.querySelectorAll(`#app [data-ik="${CSS.escape(k)}"]`).forEach(el=>{if(!el.querySelector("img"))el.insertAdjacentHTML("beforeend",imgTag(u))})},[2e3,6e3,15e3,4e4][n-1]);
  else if(IMG[k]===u){delete IMG[k];imgSave()}};
const IQ=[],IX={};let iqn=0,iretry=0;
function wantImg(x){const k=ikey(x);if(imgKnown(k)||IX[k])return;IX[k]=1;IQ.push({x,k});pump()}
function putImg(k,u){document.querySelectorAll(`#app [data-ik="${CSS.escape(k)}"]`).forEach(el=>{if(!el.querySelector("img"))el.insertAdjacentHTML("beforeend",imgTag(u))});
  const sl=document.querySelector(`.slide [data-ik="${CSS.escape(k)}"]`);if(sl){const bg=sl.closest(".slide").querySelector(".bg");if(bg&&!bg.firstChild)bg.innerHTML=`<img src="${esc(u)}" alt="" referrerpolicy="no-referrer">`}
  if(curImgKey===k)ambient(u);const pre=new Image();pre.referrerPolicy="no-referrer";pre.src=u}
function pump(){while(iqn<6&&IQ.length){const {x,k}=IQ.shift();iqn++;
  findImg(x).then(u=>{delete IX[k];
    if(u===null){IQ.push({x,k});IX[k]=1;if(Date.now()-(pump._f||0)>1500){iretry=Math.min(iretry+1,6);pump._f=Date.now()}return}   // сеть подвела — встанет в очередь снова
    iretry=0;IMG[k]=u||"!"+Date.now();imgSave();if(u)putImg(k,u)})
  .finally(()=>{iqn--;if(iretry&&IQ.length){clearTimeout(pump._t);pump._t=setTimeout(pump,[0,2e3,5e3,1e4,2e4,3e4,6e4][iretry])}else pump()})}}
addEventListener("online",()=>{iretry=0;pump()});
document.addEventListener("visibilitychange",()=>{if(!document.hidden){iretry=0;pump()}});
async function flj(path){const r=await fetch("https://api.fantlab.ru"+path);if(!r.ok)throw new Error(r.status);return r.json()}
const flClean=d=>{d=String(d||"").replace(/\[[^\]]*\]/g,"").replace(/<[^>]+>/g,"").replace(/\s+/g," ").trim();return d.length>260?d.slice(0,d.lastIndexOf(" ",250))+"…":d};
// издания произведения: берём самое свежее русское с обложкой; если все старше 1995 — null (рисованная обложка смотрится лучше)
const EDS={};
async function editionsOf(id){if(EDS[id])return EDS[id];const j=await flj("/work/"+id+"/extended");const L=[];Object.values(j.editions_blocks||{}).forEach(b=>(b.list||[]).forEach(e=>L.push(e)));
  const ok=L.filter(e=>e.pic_num>0&&(!e.lang_code||e.lang_code==="ru")&&!e.plandate).sort((a,b)=>(b.year||0)-(a.year||0)||(a.type===10?-1:1));return EDS[id]=ok}
async function bestEdition(id){if(!id)return undefined;const L=await editionsOf(id);if(!L.length)return undefined;const fresh=L.filter(e=>(e.year||0)>=1995);
  if(!fresh.length)return null;const single=fresh.filter(e=>e.type===10);return (single[0]||fresh[0]).edition_id}
async function wikiImg(q){const j=await (await fetch("https://ru.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrlimit=5&gsrsearch="+encodeURIComponent(q)+"&prop=pageimages&piprop=thumbnail&pithumbsize=500&pilicense=any")).json();
  const p=Object.values((j.query||{}).pages||{}).sort((a,b)=>a.index-b.index).find(p=>p.thumbnail);return p?p.thumbnail.source:""}
// null — не удалось связаться (повторим), "" — обложки нет, иначе адрес
async function findImg(x){try{
  if(!x._f){const sur=norm(String(x.a||"").split(" ").slice(-1)[0]),pic=w=>w.pic_edition_id||w.pic_edition_id_auto;
    const pick=s=>{const L=(Array.isArray(s)?s:[]).filter(pic);return L.find(w=>!sur||norm(w.autor_rusname||"").includes(sur)||norm(w.autor_name||"").includes(sur))||L.find(w=>norm(w.rusname||w.name||"")===norm(x.t))};
    let w=pick(await flj("/search-works?q="+encodeURIComponent(x.t)+"&page=1&onlymatches=1"));
    if(!w){const t2=String(x.t).replace(/[«»"'’.,:;!?()—–-]+/g," ").replace(/\s+/g," ").trim();if(t2!==x.t||x.a)w=pick(await flj("/search-works?q="+encodeURIComponent(t2+(x.a?" "+String(x.a).split(" ").slice(-1)[0]:""))+"&page=1"))}
    if(w){const ed=await bestEdition(w.work_id).catch(()=>undefined);if(ed===null)return "";return IMGFL(ed||pic(w))}
    return await wikiImg(x.t+" "+(x.a||"")+" роман книга")}
  return await wikiImg((x.t+" "+(x.y||"")+(x.s?" сериал":" фильм")).trim())}catch(e){return null}}
// рисованная обложка рисуется в своём размере и подгоняется под ячейку
const RO=window.ResizeObserver?new ResizeObserver(es=>es.forEach(e=>{const el=e.target,lw=parseFloat(el.style.getPropertyValue("--lw"))||120,w=e.contentRect.width;if(w)el.style.setProperty("--k",(w/lw).toFixed(4))})):null;
const fitCovers=root=>{if(!RO)return;(root||document).querySelectorAll(".cv.lg:not([data-ro])").forEach(el=>{el.dataset.ro=1;RO.observe(el)})};
new MutationObserver(()=>fitCovers($("#app"))).observe(document.getElementById("app"),{childList:true,subtree:true});

// ---------- единый вид записи для интерфейса ----------
function bItem(b,kind){const c=catOf(b)||{};
  return {t:b.t,a:b.a||c.a||"",y:b.y||c.y||null,c:b.c||c.c||"",g:b.g||c.g||"modern",pg:b.pg||LENPG[c.len]||null,rd:b.rd,r:b.r,
    ds:b.ann||c.ann||"",wy:b.why||b.when||c.when||"",tags:b.tags||c.tags||[],src:b,kind,id:b.id||c.id,bg:b.bg||c.bg,fg:b.fg||c.fg}}
function fItem(f,kind){return {s:f.s||undefined,_f:1,t:fTitle(f),a:f.o&&f.o!==fTitle(f)?f.o:"",y:f.y||null,c:(f.c||[]).map(cName)[0]||"",cs:f.c||[],g:f.g||0,m:f.m||0,
    rd:f.d,r:f.r,ds:f.ds||"",wy:f.wy||"",s:f.s,src:f,kind,id:f.id,img:f.img}}
// ---------- описания: подробное с Фантлаба (у каждой книги своё), иначе аннотация каталога ----------
const DESC=LS.get("zal.desc",{});let descT=0;const descSave=()=>{clearTimeout(descT);descT=setTimeout(()=>LS.set("zal.desc",DESC),600)};
const descOf=x=>{const d=DESC[ikey(x)];return (d&&d.length>(x.ds||"").length?d:"")||x.ds||x.wy||""};
const dClean=d=>{d=String(d||"").replace(/\[[^\]]*\]/g,"").replace(/<[^>]+>/g,"").replace(/\s+/g," ").trim();if(d.length<=620)return d;const cut=d.slice(0,620),i=Math.max(cut.lastIndexOf(". "),cut.lastIndexOf("! "),cut.lastIndexOf("? "));return i>200?cut.slice(0,i+1):cut.slice(0,cut.lastIndexOf(" "))+"…"};
const DQ=[],DX={};let dqn=0;
function wantDesc(x,cb){if(!x||x._f)return;const k=ikey(x);if(DESC[k]!==undefined){if(cb)cb();return}if(DX[k]){(DX[k].cbs=DX[k].cbs||[]).push(cb);return}DX[k]={cbs:cb?[cb]:[]};DQ.push({x,k});dpump()}
function dpump(){while(dqn<3&&DQ.length){const {x,k}=DQ.shift();dqn++;
  (async()=>{const s=await flj("/search-works?q="+encodeURIComponent(x.t)+"&page=1&onlymatches=1");const sur=norm(String(x.a||"").split(" ").slice(-1)[0]);const L=Array.isArray(s)?s:[];
    const w=L.find(w=>!sur||norm(w.autor_rusname||"").includes(sur)||norm(w.autor_name||"").includes(sur))||L.find(w=>norm(w.rusname||w.name||"")===norm(x.t));if(!w)return "";
    const j=await flj("/work/"+w.work_id);return dClean(j.work_description||"")})()
  .then(d=>{DESC[k]=d||"";descSave()}).catch(()=>{}).finally(()=>{const cbs=(DX[k]||{}).cbs||[];delete DX[k];dqn--;cbs.forEach(f=>{try{f&&f()}catch(e){}});dpump()})}}


// ---------- адаптер данных: книги ----------
const BK={
  read:()=>BOOKS.map(b=>bItem(b,"read")),
  want:()=>{const L=want.map(w=>bItem(w,"want"));if(nowBook&&!VIEW){const n=bItem(nowBook,"now");n.now=1;L.unshift(n)}return L},
  has:x=>READ.has(norm(x.t))?"read":want.some(w=>norm(w.t)===norm(x.t))?"want":"",
  addWant(x){if(BK.has(x))return;const c=catOf(x);const base=c?{...c}:{id:"w"+Date.now().toString(36),t:x.t,a:x.a||"",c:x.c||"",y:x.y||null,g:GEN[x.g]?x.g:"modern",ann:x.ds||""};
    want.unshift({...base,from:"Шуршуня",why:x.wy||base.when||""});saveWant()},
  rmWant(x){if(x.now){nowBook=null;saveNow();return}want=want.filter(w=>norm(w.t)!==norm(x.t));saveWant()},
  markRead(x,r10,silentDate){const c=catOf(x)||{};if(x.now){nowBook=null;saveNow()}want=want.filter(w=>norm(w.t)!==norm(x.t));saveWant();
    const rec={t:x.t,a:x.a||c.a||"Автор не указан",c:x.c||c.c||NEWSHELF,y:x.y||c.y||null,g:GEN[x.g]?x.g:(c.g||"modern"),pg:x.pg||LENPG[c.len]||320,r:r10??null};
    if(c.ann)rec.ann=c.ann;if(c.tags)rec.tags=c.tags;if(c.bg){rec.bg=c.bg;rec.fg=c.fg;rec.m=motifOf(c)}if(c.f)rec.f=c.f;if(silentDate)rec.rd=undefined;return addBook(rec)},
  setR(x,r10){const b=x.src;b.r=r10;if(b.user){const m=mine.find(y=>y.id===b.id);if(m)m.r=r10;saveMine()}else{EDITS[b.id]={...(EDITS[b.id]||{}),r:r10};saveEdits()}},
  rmRead(x){const b=x.src;if(b.user){mine=mine.filter(y=>y.id!==b.id);saveMine()}else{EDITS[b.id]={_del:true};saveEdits()}const i=BOOKS.indexOf(b);if(i>=0)BOOKS.splice(i,1);READ.delete(norm(b.t))},
  skip(x){if(x.id){dismissed.add(x.id);LS.set("zal.skip",[...dismissed])}},
  unskip(x){dismissed.delete(x.id);LS.set("zal.skip",[...dismissed])}};
// ---------- адаптер данных: кино ----------
const FSKIP=new Set(LS.get("zal.fskip",[]));
const toFilm=x=>{if(x.src&&x.src.id)return x.src;
  if(FILMS){const nt=norm(x.t);let best=null;for(const f of FILMS){if((norm(f.ru)===nt||norm(f.o)===nt)&&(!x.y||Math.abs((f.y||0)-x.y)<=1)&&(!best||f.v>best.v))best=f}if(best&&!x.s)return best}
  return {id:"w"+hsh(norm(x.t)+(x.y||"")).toString(36),t:x.t,y:x.y||null,g:0,c:[],m:x.m||0,s:x.s?1:undefined}};
const FM={
  read:()=>FSEEN.map(f=>fItem(f,"read")),
  want:()=>FWANT.map(f=>fItem(f,"want")),
  has:x=>{const nt=norm(x.t);return FSEEN.some(f=>f.id===x.id||norm(fTitle(f))===nt)?"read":FWANT.some(f=>f.id===x.id||norm(fTitle(f))===nt)?"want":""},
  addWant(x){if(FM.has(x))return;const f=toFilm(x);FWANT.unshift({...snap(f),s:f.s||x.s,d:new Date().toISOString().slice(0,10)});saveF()},
  rmWant(x){const nt=norm(x.t);FWANT=FWANT.filter(f=>f.id!==x.id&&norm(fTitle(f))!==nt);saveF()},
  markRead(x,r10,silentDate){const f=toFilm(x);FWANT=FWANT.filter(y=>y.id!==f.id);const ex=FSEEN.find(y=>y.id===f.id);
    if(ex)ex.r=r10;else FSEEN.unshift({...snap(f),s:f.s||x.s,r:r10??null,n:"",d:silentDate?undefined:NOW7()});saveF()},
  setR(x,r10){x.src.r=r10;saveF()},
  rmRead(x){FSEEN=FSEEN.filter(f=>f!==x.src);saveF()},
  skip(x){FSKIP.add(x.id);LS.set("zal.fskip",[...FSKIP])},
  unskip(x){FSKIP.delete(x.id);LS.set("zal.fskip",[...FSKIP])}};
const DATA=()=>isF()?FM:BK;

// ---------- атмосфера ----------
let ambFlip=false,ambSrc="",curImgKey="";
function ambient(src){if(!src||src===ambSrc)return;ambSrc=src;const a=$("#ambA"),b=$("#ambB"),n=ambFlip?a:b,o=ambFlip?b:a;ambFlip=!ambFlip;n.referrerPolicy="no-referrer";n.onload=()=>{n.classList.add("on");o.classList.remove("on")};n.src=src}
const ambFor=x=>{if(!x)return;curImgKey=ikey(x);const u=imgOf(x);if(u)ambient(u)};

// ---------- лента: что подбирает Шуршуня ----------
let slides=[],cur=-1,acts=[],feedMore=null;
const IC={x:'<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',u:'<svg viewBox="0 0 24 24"><path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4.5 4.5v4h4"/></svg>',v:'<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>'};
function tasteQ(){const q={tags:{},says:[]};BOOKS.filter(b=>(b.r??IMPLIED[b.id]??0)>=8).forEach(b=>tagsOf(b).forEach(t=>q.tags[t]=(q.tags[t]||0)+1));
  want.forEach(w=>(w.tags||tagsOf(w)).forEach(t=>q.tags[t]=(q.tags[t]||0)+.5));
  q.tags=Object.fromEntries(Object.entries(q.tags).sort((a,b)=>b[1]-a[1]).slice(0,14).map(([t,w])=>[t,Math.min(3,w)]));return q}
function whyBook(b){const loved=BOOKS.filter(x=>(x.r??0)>=8);let best=null,bc=0;loved.forEach(l=>{const c=tagsOf(l).filter(t=>(b.tags||[]).includes(t)).length;if(c>bc){bc=c;best=l}});
  return best&&bc>=2?`Похоже на «${best.t}»: ${(b.tags||[]).filter(t=>tagsOf(best).includes(t)).slice(0,2).join(", ")}.`:""}
function bookFeed(){const q=tasteQ();let rank=rankFor(q);{const extra=rankFor({tags:{},says:[]}).filter(b=>!rank.includes(b));rank=[...rank,...extra]}
  if(NF.ask){const aq=parse(NF.ask),hit=Object.keys(aq.tags).length||aq.g||aq.c?rankFor(aq):[];rank=[...hit,...rank.filter(b=>!hit.includes(b))]}
  rank=rank.filter(b=>bookPass(b));if(NF.mood.length>1)rank=rank.map((b,k)=>({b,k:k-bookMoodHits(b)*40})).sort((x,y)=>x.k-y.k).map(x=>x.b);
  const out=[],au=new Set(),later=[];for(const b of rank){if(au.has(b.a)){later.push(b);continue}au.add(b.a);out.push(b)}
  const all=[...out,...later];let i=0;feedMore=()=>{const chunk=all.slice(i,i+25);i+=25;return chunk.map(b=>{const it=bItem(b,"feed");it.why=whyBook(b);return it})};return feedMore()}
function filmFeed(){if(!FILMS)return [];const res=filmList();let i=0;
  feedMore=()=>{const chunk=res.slice(i,i+25);i+=25;return chunk.map(f=>fItem(f,"feed"))};return feedMore()}
function slideHTML(x,j){const meta=x.a||"";
  return `<article class="slide" data-j="${j}"><div class="wrap"><div class="fly gl"><div class="bg"></div><div class="lean r"><i>${IC.v}</i><b>Добавить</b></div><div class="lean l"><i>${IC.x}</i><b>Не предлагать</b></div><div class="obj">${cv(x,220)}</div><div class="info"><h2>${esc(x.t)}</h2><div class="meta">${esc(meta)}</div><p class="ds">${esc(descOf(x))}</p>
  <div class="acts3"><button class="rb gl press" data-skip="${j}" aria-label="Не предлагать">${IC.x}</button><button class="rb sm gl press" data-undo aria-label="Отменить действие">${IC.u}</button><button class="rb w press" data-want="${j}" aria-label="Добавить">${IC.v}</button></div></div></div></div></article>`}
function slideDesc(el,x){const upd=()=>{const p=el.querySelector(".info p.ds");if(p)p.textContent=descOf(x)};upd();wantDesc(x,upd);const nx=el.nextElementSibling;if(nx&&nx.dataset.j!=null){const y=slides[+nx.dataset.j];if(y)wantDesc(y,()=>{const p=nx.querySelector(".info p.ds");if(p)p.textContent=descOf(y)})}}
function bgFill(sl,x){const u=imgOf(x),bg=sl.querySelector(".bg");if(u&&bg&&!bg.firstChild)bg.innerHTML=`<img src="${esc(u)}" alt="" referrerpolicy="no-referrer">`}
function endInner(){return `<h2>Пока всё</h2><p>Шуршуня подберёт новое, как только ты что-нибудь отметишь. А пока можно поискать через лупу.</p><div class="acts"><button class="btn w" data-find>Найти через поиск</button></div>`}
function drawDots(){const n=$("#feed").children.length;$("#dots").innerHTML=Array.from({length:Math.min(n,30)},(_,k)=>`<i class="${k===Math.max(0,cur)?"on":""}"></i>`).join("")}
function buildFeed(){acts=[];const f=$("#feed");$("#ffil").hidden=true;if(!VIEW)drawFbar();
  if(isF()&&!FILMS){f.innerHTML=`<article class="slide end" data-end><div class="card gl"><h2>Достаю плёнку…</h2><p>Загружаю киноархив.</p></div></article>`;loadFilms().then(()=>{if(isF())buildFeed()}).catch(()=>{f.innerHTML=`<article class="slide end" data-end><div class="card gl"><h2>Архив не загрузился</h2><p>Проверь интернет и открой ленту ещё раз.</p></div></article>`});return}
  slides=isF()?filmFeed():bookFeed();
  f.innerHTML=slides.map(slideHTML).join("")+`<article class="slide end" data-end><div class="card gl">${slides.length?endInner():emptyInner()}</div></article>`;
  f.scrollTop=0;cur=-1;drawDots();onFeedScroll();updUndo();}
function moreSlides(){if(!feedMore)return;const add=feedMore();if(!add.length)return;const base=slides.length;slides.push(...add);
  $("#feed [data-end]").insertAdjacentHTML("beforebegin",add.map((x,i)=>slideHTML(x,base+i)).join(""));drawDots();updUndo()}
function onFeedScroll(){const f=$("#feed");if(!f.clientHeight)return;const j=Math.round(f.scrollTop/f.clientHeight);if(j===cur)return;cur=j;
  const el=f.children[j],x=el&&el.dataset.j!=null?slides[+el.dataset.j]:null;if(x){ambFor(x);bgFill(el,x);slideDesc(el,x)}const nx=f.children[j+1];if(nx&&nx.dataset.j!=null)bgFill(nx,slides[+nx.dataset.j]);
  document.querySelectorAll("#dots i").forEach((d,k)=>d.classList.toggle("on",k===j));if(f.children.length-j<6)moreSlides();tgHaptic("soft")}
$("#feed").addEventListener("scroll",onFeedScroll,{passive:true});
const slideEl=j=>$(`#feed .slide[data-j="${j}"]`);
function decide(j,kind){const x=slides[j];if(!x||x._done)return;if(CO&&CO.step<3&&kind!==(CO.step===1?"want":"skip")){const sl=slideEl(j),fl=sl&&sl.querySelector(".fly");if(fl){leanTo(fl,0);fl.style.transition="transform .4s cubic-bezier(.2,1.3,.4,1)";fl.style.transform="";fl.style.opacity=""}tgHaptic("rigid");return}x._done=kind;const D=DATA();if(kind==="want")D.addWant(x);else D.skip(x);
  acts.push({j,kind,F:!!x._f});if(acts.length>3)acts.shift();const sl=slideEl(j),fl=sl.querySelector(".fly");
  fl.style.transition="transform .38s cubic-bezier(.4,0,.7,1),opacity .38s";fl.style.transform=`translateX(${kind==="want"?125:-125}%) rotate(${kind==="want"?10:-10}deg)`;fl.style.opacity=0;
  toast(kind==="want"?"Добавлено в избранное":"Больше не предложу");tgHaptic("medium");
  setTimeout(()=>{sl.remove();cur=-1;onFeedScroll();drawDots();updUndo();if(CO)coachNext()},390)}
function undo(){if(!acts.length)return;if(CO&&CO.step!==3)return;const {j,kind,F}=acts.pop(),x=slides[j],D=F?FM:BK;if(kind==="want")D.rmWant(x);else D.unskip(x);delete x._done;
  const f=$("#feed"),next=[...f.children].find(el=>el.dataset.end!=null||+el.dataset.j>j);next.insertAdjacentHTML("beforebegin",slideHTML(x,j));
  const sl=slideEl(j),fl=sl.querySelector(".fly"),pos=[...f.children].indexOf(sl);bgFill(sl,x);fl.style.transition="none";fl.style.opacity=0;fl.style.transform=`translateX(${kind==="want"?125:-125}%) rotate(${kind==="want"?10:-10}deg)`;
  f.scrollTo({top:pos*f.clientHeight});void fl.offsetWidth;fl.style.transition="transform .45s cubic-bezier(.2,.9,.3,1),opacity .3s";fl.style.transform="";fl.style.opacity="";
  cur=-1;onFeedScroll();drawDots();updUndo();toast("Возвращено");tgHaptic();if(CO)setTimeout(coachNext,500)}
function updUndo(){document.querySelectorAll("#feed [data-undo]").forEach(b=>b.disabled=!acts.length)}
function leanTo(fl,dx){const r=fl.querySelector(".lean.r"),l=fl.querySelector(".lean.l"),k=v=>Math.max(0,Math.min(1,(v-24)/70));
  r.style.opacity=k(dx);l.style.opacity=k(-dx);r.style.transform=`translate(-50%,-50%) scale(${.85+.15*k(dx)})`;l.style.transform=`translate(-50%,-50%) scale(${.85+.15*k(-dx)})`}
(function(){const f=$("#feed");let g=null;
  const start=(x,y,t)=>{const sl=t.closest(".slide:not(.end)");if(!sl||t.closest("button")||slides[+sl.dataset.j]._done)return;g={x,y,sl,mode:null,dx:0}};
  const move=(x,y,e)=>{if(!g)return;const dx=x-g.x,dy=y-g.y;
    if(!g.mode){if(Math.abs(dx)<8&&Math.abs(dy)<8)return;if(Math.abs(dy)>Math.abs(dx)){g=null;return}g.mode="h";f.style.overflowY="hidden"}
    if(e&&e.cancelable)e.preventDefault();g.dx=dx;const fl=g.sl.querySelector(".fly");fl.style.transition="none";fl.style.transform=`translateX(${dx}px) rotate(${dx/26}deg)`;leanTo(fl,dx)};
  const end=()=>{if(!g)return;const {sl,mode,dx}=g;g=null;f.style.overflowY="";if(mode!=="h")return;const fl=sl.querySelector(".fly");leanTo(fl,0);
    if(Math.abs(dx)>80)decide(+sl.dataset.j,dx>0?"want":"skip");else{fl.style.transition="transform .4s cubic-bezier(.2,1.3,.4,1)";fl.style.transform=""}};
  f.addEventListener("touchstart",e=>{const t=e.touches[0];start(t.clientX,t.clientY,e.target)},{passive:true});
  f.addEventListener("touchmove",e=>{const t=e.touches[0];move(t.clientX,t.clientY,e)},{passive:false});
  f.addEventListener("touchend",end);f.addEventListener("touchcancel",end);
  f.addEventListener("mousedown",e=>start(e.clientX,e.clientY,e.target));addEventListener("mousemove",e=>{if(g)move(e.clientX,e.clientY,null)});addEventListener("mouseup",end)})();
$("#feed").addEventListener("click",e=>{const t=e.target;
  const w=t.closest("[data-want]");if(w){decide(+w.dataset.want,"want");return}
  const sk=t.closest("[data-skip]");if(sk){decide(+sk.dataset.skip,"skip");return}
  if(t.closest("[data-undo]")){undo();return}
  if(t.closest("[data-find]")){$("#srchB").click();return}
  const ob=t.closest(".obj,.info h2");if(ob&&!t.closest("button")){const sl=ob.closest(".slide");const x=sl&&slides[+sl.dataset.j];if(x&&Date.now()-lastTap>350)setTimeout(()=>{if(Date.now()-lastTap>300)openItem(x,"rec")},320)}});
let lastTap=0;
$("#feed").addEventListener("pointerup",e=>{const o=e.target.closest(".obj");if(!o)return;const now=Date.now();if(now-lastTap>320){lastTap=now;return}lastTap=now+400;
  const j=+o.closest(".slide").dataset.j;if(!slides[j]||slides[j]._done)return;const h=document.createElement("div");h.className="heart";h.innerHTML='<svg viewBox="0 0 24 24"><path d="M12 21s-7.5-4.6-9.5-9.3C1 8 3.4 4.5 7 4.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 3.6 0 6 3.5 4.5 7.2C19.5 16.4 12 21 12 21z"/></svg>';o.appendChild(h);setTimeout(()=>h.remove(),950);
  setTimeout(()=>decide(j,"want"),260)});
function tilt(x,y){document.querySelectorAll("#feed .obj .cv").forEach(c=>{c.style.setProperty("--ry",(x*24)+"deg");c.style.setProperty("--rx",(-y*18)+"deg")})}
addEventListener("pointermove",e=>{if(!RM&&$("#s-feed").classList.contains("on"))tilt(e.clientX/innerWidth-.5,e.clientY/innerHeight-.5)},{passive:true});
addEventListener("deviceorientation",e=>{if(RM||e.gamma==null)return;tilt(Math.max(-.5,Math.min(.5,e.gamma/40)),Math.max(-.5,Math.min(.5,(e.beta-50)/50)))},{passive:true});
document.addEventListener("change",e=>{if(e.target.id==="tHide"&&e.target.closest("#vshBody")){TF.hideWant=e.target.checked;saveTF()}});

// ---------- полка ----------
let fi=0,colF="want",flowHold=0;
const pickCol=()=>{colF=VIEW?"read":DATA().want().length?"want":"read"};
function recList(){if(isF()){if(!FILMS)return [];if(!recList._f||recList._v!==FSEEN.length+FWANT.length+FSKIP.size){recList._f=tevoFilter().filter(f=>!FSKIP.has(f.id)).slice(0,40).map(f=>fItem(f,"rec"));recList._v=FSEEN.length+FWANT.length+FSKIP.size}return recList._f}
  const key=BOOKS.length+"|"+want.length+"|"+dismissed.size;if(recList._k!==key){recList._b=rankFor(tasteQ()).slice(0,40).map(b=>{const x=bItem(b,"rec");x.why=whyBook(b);return x});recList._k=key}return recList._b}
const flowList=()=>VIEW?(DATA().want().length?DATA().want():DATA().read().filter(x=>x.r!=null).sort((a,b)=>b.r-a.r).slice(0,20)):colF==="want"?DATA().want():recList();
const gridList=()=>colF==="want"?DATA().want():DATA().read();
function drawFlow(){const L=flowList();fi=L.length?((fi%L.length)+L.length)%L.length:0;
  $("#flow").innerHTML=L.slice(0,60).map(x=>cv(x,176)).join("");[...$("#flow").children].forEach((c,i)=>{c.dataset.i=i});layoutFlow(true)}
function layoutFlow(first){const L=flowList().slice(0,60),n=L.length;if($("#flow").children.length!==n){drawFlow();return}
  [...$("#flow").children].forEach((c,i)=>{let o=((i-fi)%n+n)%n;if(o>n/2)o-=n;const a=Math.abs(o),prev=c.dataset.o==null?null:+c.dataset.o;c.dataset.o=o;
    const tf=`translateX(${o*150}px) scale(${o===0?1:.8})`,op=a>2?0:1;
    if(prev!=null&&Math.abs(prev-o)>1){c.style.transition="none";c.style.opacity=0;c.style.transform=tf;void c.offsetWidth;c.style.transition="";requestAnimationFrame(()=>{c.style.opacity=op})}
    else{c.style.transform=tf;c.style.opacity=op}
    c.style.zIndex=50-a;c.style.pointerEvents=a>2?"none":"";c.style.filter=o===0?"none":`brightness(${1-a*.25})`;c.classList.toggle("mid",o===0)});
  const x=L[fi],cap=$("#flowCap");
  cap.innerHTML=x?`${x.now?`<span class="fm" style="margin:0 0 6px">Сейчас читаю</span>`:""}<b>${esc(x.t)}</b><span class="fm">${esc(x.a||"")}</span><p>${esc(descOf(x))}</p>`
    :`<span class="fm">${VIEW?"Здесь пусто.":colF==="want"?"Здесь пока пусто — добавь что-нибудь из ленты или через лупу вверху.":isF()&&!FILMS?"Загружаю киноархив…":"Здесь пока пусто."}</span>`;
  if(!first){cap.classList.remove("sw");void cap.offsetWidth;cap.classList.add("sw")}
  if(x)wantDesc(x,()=>{if(flowList()[fi]===x){const p=cap.querySelector("p");if(p)p.textContent=descOf(x)}});
  ambFor(x)}
function stepFlow(d){const n=Math.min(60,flowList().length);if(n<2)return;fi=((fi+d)%n+n)%n;layoutFlow()}
(function(){const el=$("#flow");let x0=null,y0=null,mode=null,moved=0;
  const down=(x,y)=>{x0=x;y0=y;mode=null;moved=0;flowHold=Date.now()};
  const mv=(x,y,e)=>{if(x0==null)return;const dx=x-x0,dy=y-y0;if(!mode){if(Math.abs(dx)<8&&Math.abs(dy)<8)return;mode=Math.abs(dx)>Math.abs(dy)?"h":"v"}
    if(mode!=="h")return;if(e&&e.cancelable)e.preventDefault();if(Math.abs(dx)>44){stepFlow(dx<0?1:-1);x0=x;moved++;flowHold=Date.now();tgHaptic()}};
  el.addEventListener("touchstart",e=>{const t=e.touches[0];down(t.clientX,t.clientY)},{passive:true});
  el.addEventListener("touchmove",e=>{const t=e.touches[0];mv(t.clientX,t.clientY,e)},{passive:false});
  el.addEventListener("touchend",()=>{x0=null});
  el.addEventListener("mousedown",e=>down(e.clientX,e.clientY));addEventListener("mousemove",e=>mv(e.clientX,e.clientY,null));addEventListener("mouseup",()=>{x0=null});
  el.addEventListener("click",e=>{const c=e.target.closest(".cv");if(c&&!moved){flowHold=Date.now();const i=+c.dataset.i;if(i!==fi){fi=i;layoutFlow()}openItem(flowList()[i],colF==="want"?"top":"rec")}})})();
(function tick(){if(!(document.hidden||!$("#s-col").classList.contains("on")||$("#vsheet").classList.contains("on")||sheetOpen||Date.now()-flowHold<6000))stepFlow(-1);setTimeout(tick,colF==="want"?5600:3600)})();
function drawCol(){
  $("#vbanner").hidden=!VIEW;if(VIEW)$("#vbanner").innerHTML=`<b>Полки${SHARED&&SHARED.n?" — "+esc(SHARED.n):""}</b><span> · только для просмотра</span>`;
  $("#pills").innerHTML=(VIEW?[["read",T[REALM].read]]:[["want",T[REALM].want],["read",T[REALM].read]]).map(([k,l])=>`<button class="gl ${colF===k?"on":""}" data-f="${k}">${l}</button>`).join("");
  const G=gridList();$("#grid").innerHTML=G.map((x,i)=>`<button data-g="${i}">${cv(x,110)}<small>${esc(x.t)}</small>${x.r!=null&&colF==="read"?`<em>★ ${r5(x.r)}</em>`:""}</button>`).join("")||`<p class="gempty">${colF==="read"?(isF()?"Здесь появятся просмотренные фильмы.":"Здесь появятся прочитанные книги."):""}</p>`;
  drawFlow();drawViews()}
$("#pills").addEventListener("click",e=>{const b=e.target.closest("[data-f]");if(b){colF=b.dataset.f;fi=0;drawCol();tgHaptic()}});
// ---------- виды полки: обложки, полки по странам, лента веков, карта, авторы (из первой Норы) ----------
const cvw=document.createElement("div");cvw.className="cviews";cvw.id="cviews";$("#pills").after(cvw);
const oldv=document.createElement("div");oldv.className="L oldv";oldv.id="oldv";$("#grid").after(oldv);
let colV=LS.get("zal.colv",{read:"grid",want:"grid"});
const VIEWS={read:[["grid","Обложки"],["shelves","Полки"],["cent","Века"],["map","Карта"],["authors","Авторы"]],want:[["grid","Обложки"],["shelves","Полки"]]};
function centHTML(){const dated=BOOKS.filter(b=>b.y).sort((a,b)=>a.y-b.y),byCt={};dated.forEach(b=>(byCt[centuryOf(b.y)]=byCt[centuryOf(b.y)]||[]).push(b));
  const undated=BOOKS.filter(b=>!b.y);
  return Object.keys(byCt).map(ct=>`<div class="cent"><h2>${ROMAN[ct]||ct} век</h2><div class="tl">${byCt[ct].map(b=>`<button class="tl-row" data-id="${b.id}"><span class="yr">${b.y}</span>${cover(b,40)}<span class="tx"><b>${esc(b.t)}</b><span>${esc(b.a)}${b.c&&!NOCOUNTRY.has(b.c)?" · "+esc(b.c):""}</span></span></button>`).join("")}</div></div>`).join("")+
   (undated.length?`<div class="cent"><h2>Без года</h2><div class="tl">${undated.map(b=>`<button class="tl-row" data-id="${b.id}"><span class="yr">—</span>${cover(b,40)}<span class="tx"><b>${esc(b.t)}</b><span>${esc(b.a||"")}</span></span></button>`).join("")}</div></div>`:"")}
function authorsHTML(){const by={};BOOKS.forEach(b=>{const a=b.a&&b.a!=="Автор не указан"?b.a:"Автор не указан";(by[a]=by[a]||[]).push(b)});
  return `<div class="authors">${Object.entries(by).sort((x,y)=>(y[1].length-x[1].length)||x[0].localeCompare(y[0],"ru")).map(([a,bs])=>`<div class="au-card"><h3>${esc(a)}</h3><div class="sub">${esc(bs[0].c&&!NOCOUNTRY.has(bs[0].c)?bs[0].c:"")}</div><div class="au-books">${bs.map(b=>`<button class="au-book" data-id="${b.id}">${cover(b,34)}<b>${esc(b.t)}</b></button>`).join("")}</div></div>`).join("")}</div>`}
function drawViews(){cvw.hidden=true;oldv.hidden=true;$("#grid").hidden=false;return;const L=VIEW?[["grid","Обложки"],["shelves","Полки"],["cent","Века"],["map","Карта"]]:VIEWS[colF]||VIEWS.read,v=L.some(x=>x[0]===colV[colF])?colV[colF]:"grid";
  const empty=!gridList().length;cvw.hidden=empty;
  cvw.innerHTML=L.map(([k,l])=>`<button class="${v===k?"on":""}" data-cv="${k}">${l}</button>`).join("");
  $("#grid").hidden=v!=="grid"&&!empty;oldv.hidden=v==="grid"||empty;
  if(v==="grid"||empty){oldv.innerHTML="";return}
  if(v==="shelves")oldv.innerHTML=`<div id="shelfAll">${colF==="want"&&!VIEW?spinesHTML(want.map((b,i)=>({b,i})),"want"):spinesHTML(BOOKS.map((b,i)=>({b,i})))}</div>`;
  else if(v==="cent")oldv.innerHTML=centHTML();
  else if(v==="map")oldv.innerHTML=mapHTML();
  else if(v==="authors")oldv.innerHTML=authorsHTML();
  requestAnimationFrame(()=>{try{fitAll(oldv)}catch(e){}})}
cvw.addEventListener("click",e=>{const b=e.target.closest("[data-cv]");if(!b)return;colV[colF]=b.dataset.cv;LS.set("zal.colv",colV);tgHaptic();drawViews()});
$("#grid").addEventListener("click",e=>{const b=e.target.closest("[data-g]");if(b){flowHold=Date.now();openItem(gridList()[+b.dataset.g],colF)}});

// ---------- карточка ----------
let cardX=null,cardL=null,vDirty=false;
function vOpen(html,tall){$("#vshBody").innerHTML=html;const sh=$("#vsheet");sh.classList.toggle("tall",!!tall);sh.classList.add("on");$("#vsh").scrollTop=0;tgHaptic("medium");syncBack()}
function vClose(){$("#vsheet").classList.remove("on");document.activeElement&&document.activeElement.blur();syncBack();
  if(vDirty){vDirty=false;setTimeout(refresh,520)}}
$("#vsheet").addEventListener("click",e=>{if(e.target.closest("[data-close],[data-vclose]"))vClose()});
(function(){const el=$("#vsh");let y0=null,dy=0;el.addEventListener("touchstart",e=>{if(el.scrollTop>0||e.target.closest("input,.sx-au,.f-chips,.f-sort"))return;y0=e.touches[0].clientY;dy=0},{passive:true});
  el.addEventListener("touchmove",e=>{if(y0==null)return;dy=Math.max(0,e.touches[0].clientY-y0);el.style.transition="none";el.style.transform=`translateY(${dy}px)`},{passive:true});
  el.addEventListener("touchend",()=>{if(y0==null)return;y0=null;
    if(dy>90){el.style.transition="transform .26s cubic-bezier(.4,0,1,1)";el.style.transform="translateY(110%)";setTimeout(()=>{el.style.transition="none";vClose();requestAnimationFrame(()=>{el.style.transform="";requestAnimationFrame(()=>{el.style.transition=""})})},250)}
    else{el.style.transition="transform .35s cubic-bezier(.2,1.2,.4,1)";el.style.transform="";setTimeout(()=>{el.style.transition=""},360)}})})();
const starsHTML=(x,attr)=>`<div class="stars">${Array.from({length:6},(_,n)=>`<button ${attr}="${n}" class="${r5(x.r)===n?"on":""}">${n}</button>`).join("")}</div>`;
function itemHTML(){const x=cardX,L=cardL,F=!!x._f;const meta=x.a||"";
  const src=x.src||{},acc=(src.acclaim||[]).slice(0,3);
  return `<div class="dt">${cv(x,150)}${F?"":covRow(x)}<h2>${esc(x.t)}</h2><div class="meta">${esc(meta)}</div>
  <p class="dd" id="cardDesc">${esc(descOf(x))}</p>${x.wy&&x.wy!==descOf(x)?`<p class="dd q">${esc(x.wy)}</p>`:""}
  ${acc.length?`<div class="acc">${acc.map(a=>`<span>${esc(a)}</span>`).join("")}</div>`:""}
  ${F&&src.r&&L!=="read"?`<p class="dd sm">IMDb ${fmtR(src.r)}${src.v?" · "+fmtVotes(src.v)+" оценок":""}${src.hr===0?" · не выходил в России":""}</p>`:""}
  ${L==="rec"?`<div class="one"><button class="btn w" data-cwant>Добавить в избранное</button></div>`
   :L==="top"?(x.now?`<div class="one"><button class="btn w" data-cmv>${T[REALM].did}</button></div>`:`<div class="one"><button class="btn" data-crm>Убрать из избранного</button></div>`)
   :`<div class="acts"><button class="btn w" data-cmv>${T[REALM].did}</button><button class="btn" data-crm>Убрать</button></div>`}</div>`}
function openItem(x,L){if(!x)return;
  if(L==="read"){if(x._f)openFilm(x.src);else openBook(x.src.id);return}
  if(VIEW)return;cardX=x;cardL=L;ambFor(x);vOpen(itemHTML());if(!x._f)wantDesc(x,()=>{const d=$("#cardDesc");if(d&&cardX===x)d.textContent=descOf(x)})}
$("#vshBody").addEventListener("click",e=>{const t=e.target;if(!cardX||$("#fres"))return;const D=cardX._f?FM:BK;
  if(t.closest("[data-cmv]")){const x=cardX;vClose();rmAsk(x,null,n=>{D.markRead(x,n*2);toast(x._f?"Отмечено как просмотренное":"Отмечено как прочитанное");refresh()},"Без оценки",()=>{D.markRead(x,null);refresh()});return}
  if(t.closest("[data-cwant]")){D.addWant(cardX);vDirty=true;toast("Добавлено в избранное");vClose();return}
  if(t.closest("[data-crm]")){D.rmWant(cardX);vDirty=true;toast("Убрано из избранного");vClose();return}});

// ---------- оценка: экран со звёздами ----------
const STAR='<svg viewBox="0 0 24 24"><path d="M12 3.2l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6-4.5-4.2 6.1-.7z"/></svg>';
let rmCb=null;
function rmAsk(x,curR,onPick,noLabel,onNo){rmCb={onPick,onNo};$("#rmCv").innerHTML=cv(x,120);$("#rmT").textContent=x.t;$("#rmA").textContent=[x.a,x.s?"сериал":""].filter(Boolean).join(" · ");$("#rmX").textContent=noLabel||"";$("#rmX").hidden=!noLabel;
  $("#rmSt").innerHTML=[1,2,3,4,5].map(n=>`<button data-st="${n}" class="${curR>=n?"on":""}" aria-label="${n} из 5">${STAR}</button>`).join("");$("#rm").classList.add("on");tgHaptic("soft")}
function rmClose(){$("#rm").classList.remove("on");rmCb=null}
$("#rmSt").addEventListener("click",e=>{const b=e.target.closest("[data-st]");if(!b||!rmCb)return;const n=+b.dataset.st,cb=rmCb;
  $("#rmSt").querySelectorAll("button").forEach(x=>x.classList.toggle("on",+x.dataset.st<=n));b.classList.add("pop");tgHaptic("medium");cb.onPick(n);setTimeout(rmClose,380)});
$("#rmX").onclick=()=>{const cb=rmCb;rmClose();cb&&cb.onNo&&cb.onNo()};
$("#rm").addEventListener("click",e=>{if(e.target.id==="rm")rmClose()});

// ---------- поиск ----------
const SX={k:"books",q:"",seq:0,t:0,list:[],authors:[],mode:"q",au:null};
const PLUS='<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>';
const recentGet=()=>LS.get("zal.recent",[]);
function recentAdd(q){q=q.trim();if(norm(q).length<2)return;LS.set("zal.recent",[q,...recentGet().filter(x=>norm(x)!==norm(q))].slice(0,8))}
const sxHas=x=>(SX.k==="films"?FM:BK).has(x);
function hl(t,q){const s=String(t||""),nq=String(q||"").trim().toLowerCase().replace(/ё/g,"е");if(nq.length<2)return esc(s);const i=s.toLowerCase().replace(/ё/g,"е").indexOf(nq);
  return i<0?esc(s):esc(s.slice(0,i))+"<mark>"+esc(s.slice(i,i+nq.length))+"</mark>"+esc(s.slice(i+nq.length))}
function sxRow(x,i){const st=sxHas(x),F=SX.k==="films";
  return `<div class="fr" data-i="${i}">${cv(x,48)}<div class="tx"><b>${hl(x.t,SX.q)}</b><span>${hl([x.a,x.y,x.c,x.s?"сериал":"",F&&x.src&&x.src.hr===0?"не выходил в РФ":""].filter(Boolean).join(" · "),SX.q)}</span></div><div class="ac">${st?`<em>${st==="read"?(F?"Просмотрено":"Прочитано"):"В избранном"}</em>`:`<button class="ib" data-sx="want" aria-label="В избранное">${PLUS}</button><button class="ib w" data-sx="read" aria-label="${F?"Смотрела":"Читала"}">${IC.v}</button>`}</div></div>`}
const POPF=[["Интерстеллар",2014],["Во все тяжкие",2008,1],["Друзья",1994,1],["Форрест Гамп",1994],["Побег из Шоушенка",1994],["Шерлок",2010,1],["Зелёная миля",1999],["Начало",2010],["Игра престолов",2011,1],["Титаник",1997],
  ["Бойцовский клуб",1999],["Чернобыль",2019,1],["Криминальное чтиво",1994],["Матрица",1999],["Очень странные дела",2016,1],["1+1",2011],["Амели",2001],["Унесённые призраками",2001],["Паразиты",2019],["Ла-Ла Ленд",2016],
  ["Остров проклятых",2010],["Тьма",2017,1],["Брат",1997],["Москва слезам не верит",1979],["Король Лев",1994],["Аркейн",2021,1],["Властелин колец: Братство Кольца",2001],["Отступники",2006],["Джентльмены",2019],["Иван Васильевич меняет профессию",1973],["Достучаться до небес",1997],["Амадей",1984]];
const POPB=["Мастер и Маргарита","1984","Гарри Поттер и философский камень","Преступление и наказание","Маленький принц","Три товарища","Гордость и предубеждение","Над пропастью во ржи","Шантарам","Анна Каренина","Портрет Дориана Грея","Убить пересмешника",
  "Великий Гэтсби","Норвежский лес","Тень ветра","Цветы для Элджернона","Джейн Эйр","Мартин Иден","Властелин колец","Убийство в «Восточном экспрессе»","Отцы и дети","Игра престолов","Унесённые ветром","Сто лет одиночества"];
const POPBA={"Мастер и Маргарита":"Михаил Булгаков","1984":"Джордж Оруэлл","Гарри Поттер и философский камень":"Джоан Роулинг","Преступление и наказание":"Фёдор Достоевский","Маленький принц":"Антуан де Сент-Экзюпери","Три товарища":"Эрих Мария Ремарк","Гордость и предубеждение":"Джейн Остин","Над пропастью во ржи":"Джером Сэлинджер","Шантарам":"Грегори Дэвид Робертс","Анна Каренина":"Лев Толстой","Портрет Дориана Грея":"Оскар Уайльд","Убить пересмешника":"Харпер Ли","Великий Гэтсби":"Фрэнсис Скотт Фицджеральд","Норвежский лес":"Харуки Мураками","Тень ветра":"Карлос Руис Сафон","Цветы для Элджернона":"Дэниел Киз","Джейн Эйр":"Шарлотта Бронте","Мартин Иден":"Джек Лондон","Властелин колец":"Джон Р. Р. Толкин","Убийство в «Восточном экспрессе»":"Агата Кристи","Отцы и дети":"Иван Тургенев","Игра престолов":"Джордж Мартин","Унесённые ветром":"Маргарет Митчелл","Сто лет одиночества":"Габриэль Гарсиа Маркес"};
function popBooks(){return POPB.map(t=>{const c=catOf({t,a:POPBA[t]});return c?bItem(c,"pop"):{t,a:POPBA[t],kind:"pop"}})}
function popFilms(){return POPF.map(([t,y,s])=>{if(FILMS&&!s){const f=toFilm({t,y});if(f&&FILMS_MAP&&FILMS_MAP.get(f.id))return fItem(f,"pop")}return {_f:1,t,y,s:s?1:undefined,id:"w"+hsh(norm(t)+y).toString(36),kind:"pop"}})}
function localFind(q){if(SX.k==="films"){const own=[...FSEEN,...FWANT].filter(f=>nameMatches(q,fTitle(f),f.o||"")).map(f=>fItem(f,"own"));const arch=FILMS?filmSearch(q,20).map(f=>fItem(f,"arch")):[];
    const seen=new Set(),out=[];[...own,...arch].forEach(x=>{if(seen.has(x.id))return;seen.add(x.id);out.push(x)});return out.slice(0,20)}
  return bookHits(q,[...BOOKS,...want,...CAT],8).map(b=>bItem(b,"hit"))}
async function onlineBooks(q){const [w,a]=await Promise.all([libWorks(q).catch(()=>[]),libAuthors(q).catch(()=>[])]);
  return {works:(w||[]).slice(0,16).map(x=>({t:x.t,a:x.a,y:x.y,kind:"fl",_fl:x._fl})),au:(a||[]).slice(0,4).map(x=>({id:x.id,name:x.name}))}}
async function onlineSeries(q){const j=await (await fetch("https://ru.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrlimit=10&gsrsearch="+encodeURIComponent(q+" сериал")+"&prop=pageimages&piprop=thumbnail&pithumbsize=400&pilicense=any")).json();
  const out=[];Object.values((j.query||{}).pages||{}).sort((a,b)=>a.index-b.index).forEach(p=>{const m=p.title.match(/^(.*?)\s*\((мини-сериал|телесериал|сериал|мультсериал|аниме)(?:,\s*(\d{4}))?[^)]*\)$/i);if(!m)return;
    const x={_f:1,t:m[1],y:m[3]?+m[3]:null,s:1,img:p.thumbnail?p.thumbnail.source:"",kind:"wiki"};x.id="w"+hsh(norm(x.t)+(x.y||"")).toString(36);out.push(x)});return {works:out.slice(0,8),au:[]}}
function sxDraw(state){const box=$("#fres");if(!box)return;const q=SX.q,F=SX.k==="films";let h="";
  if(SX.mode==="au"){h=`<div class="sx-h">${esc(SX.au.name)} — по популярности</div>`+(state==="load"?'<div class="sk"></div><div class="sk"></div><div class="sk"></div>':SX.list.map(sxRow).join("")||'<p class="hint">У автора не нашлось книг.</p>');box.innerHTML=h;box._l=SX.list;return}
  if(norm(q).length<2){const rec=recentGet(),pop=(F?popFilms():popBooks()).filter(x=>!sxHas(x)).slice(0,8);SX.list=pop;
    h=(rec.length?`<div class="sx-h">Недавние</div><div class="sx-rec">${rec.map(r=>`<button data-rq="${esc(r)}">${esc(r)}</button>`).join("")}</div>`:"")+
      `<div class="sx-h">${F?"Популярные фильмы и сериалы":"Популярные книги"}</div>`+pop.map(sxRow).join("");box.innerHTML=h;box._l=pop;return}
  if(SX.authors.length)h+=`<div class="sx-h">Авторы</div><div class="sx-au">${SX.authors.map((a,i)=>`<button data-au="${i}"><i>${esc(a.name[0]||"?")}</i>${hl(a.name,q)}</button>`).join("")}</div>`;
  h+=SX.list.length?`<div class="sx-h">${F?"Фильмы и сериалы":"Книги"}</div>`+SX.list.map(sxRow).join(""):"";
  if(state==="load")h+='<div class="sk"></div><div class="sk"></div><div class="sk"></div>';
  if(state==="done"&&!SX.list.length&&!SX.authors.length)h+=`<p class="hint">Ничего не нашлось. Попробуй часть названия${F?"":" или фамилию автора"}.</p>${F?`<button class="sx-manual" data-man>Добавить «${esc(q.trim())}» вручную</button>`:""}`;
  if(state==="err")h+='<p class="hint">Каталог не ответил — проверь интернет.</p>';
  box.innerHTML=h;box._l=SX.list}
function sxRun(){const q=$("#fq").value,my=++SX.seq;SX.q=q;SX.mode="q";clearTimeout(SX.t);$(".sx-clear").hidden=!q;
  if(norm(q).length<2){SX.authors=[];sxDraw();return}
  SX.list=localFind(q);SX.authors=[];sxDraw("load");
  SX.t=setTimeout(async()=>{try{if(SX.k==="films")await loadFilms().catch(()=>{});if(my!==SX.seq)return;if(SX.k==="films")SX.list=localFind(q);
      const o=await (SX.k==="films"?onlineSeries(q):onlineBooks(q));if(my!==SX.seq)return;const seen=new Set(SX.list.map(x=>norm(x.t)+(x._f?x.y:"")));
      SX.list=[...SX.list,...o.works.filter(x=>{const n=norm(x.t)+(x._f?x.y:"");if(seen.has(n))return false;seen.add(n);return true})];SX.authors=o.au;sxDraw("done")}
    catch(e){if(my===SX.seq)sxDraw("err")}},260)}
async function sxAuthor(a){SX.mode="au";SX.au=a;SX.list=[];sxDraw("load");const my=++SX.seq;
  try{const L=await libAuthorBooks(a.id);if(my!==SX.seq)return;SX.list=L.slice(0,30).map(x=>({t:x.t,a:x.a||a.name,y:x.y,c:x.c,kind:"fl"}));sxDraw("done")}catch(e){sxDraw("err")}}
$("#addB").onclick=()=>{if(VIEW)return;tgHaptic();openAddBook(SCREEN==="col"&&colF==="want"?"want":"read")};
$("#srchB").onclick=()=>{if(VIEW)return;SX.k=REALM;SX.q="";SX.mode="q";cardX=null;
  vOpen(`<div class="sbar gl"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg><input id="fq" type="text" enterkeyhint="search" autocomplete="off" autocorrect="off" spellcheck="false"><button class="sx-clear" hidden aria-label="Очистить"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>
   <div class="sx-tabs" hidden><button data-sk="books">Книги</button></div><div id="fres"></div><button class="sx-photo" data-photo>Добавить книгу по фото обложки или вручную</button>`,true);
  const upd=()=>{document.querySelectorAll("[data-sk]").forEach(b=>b.classList.toggle("on",b.dataset.sk===SX.k));$("#fq").placeholder=SX.k==="films"?"Фильм или сериал":"Название или автор";$("[data-photo]").hidden=SX.k==="films"};upd();
  $("#fq").addEventListener("input",sxRun);$("#fq").addEventListener("keydown",e=>{if(e.key==="Enter"){recentAdd($("#fq").value);$("#fq").blur()}});
  $(".sx-clear").onclick=()=>{$("#fq").value="";sxRun();$("#fq").focus()};
  document.querySelector(".sx-tabs").onclick=e=>{const b=e.target.closest("[data-sk]");if(!b||b.dataset.sk===SX.k)return;SX.k=b.dataset.sk;upd();sxRun();tgHaptic()};
  if(SX.k==="films")loadFilms().then(()=>{if($("#fres")&&norm(SX.q).length<2)sxDraw()}).catch(()=>{});
  sxDraw();setTimeout(()=>$("#fq").focus(),80)};
$("#vshBody").addEventListener("click",e=>{const t=e.target;if(!$("#fres"))return;
  if(t.closest("[data-photo]")){vClose();setTimeout(()=>openAddBook(),300);return}
  const rq=t.closest("[data-rq]");if(rq){$("#fq").value=rq.dataset.rq;sxRun();return}
  const au=t.closest("[data-au]");if(au){recentAdd($("#fq").value);sxAuthor(SX.authors[+au.dataset.au]);tgHaptic();return}
  if(t.closest("[data-man]")){const q=SX.q.trim();const x={_f:1,t:q.charAt(0).toUpperCase()+q.slice(1),id:"u"+Date.now(),kind:"man"};FM.addWant(x);vDirty=true;toast("Добавлено в избранное");sxDraw("done");return}
  const b=t.closest("[data-sx]");const row=t.closest(".fr");if(!row)return;const x=$("#fres")._l[+row.dataset.i];if(!x)return;
  if(!b){if(sxHas(x)==="read"){vClose();setTimeout(()=>openItem((SX.k==="films"?FM:BK).read().find(y=>norm(y.t)===norm(x.t)),"read"),300)}return}
  if(sxHas(x))return;recentAdd($("#fq").value);const D=SX.k==="films"?FM:BK,F=SX.k==="films";
  const done=()=>{vDirty=true;row.querySelector(".ac").innerHTML=`<em>${sxHas(x)==="read"?(F?"Просмотрено":"Прочитано"):"В избранном"}</em>`};
  if(b.dataset.sx==="want"){D.addWant(x);done();toast("Добавлено в избранное");tgHaptic("medium");return}
  rmAsk(x,null,n=>{D.markRead(x,n*2);done();toast(F?"Отмечено как просмотренное":"Отмечено как прочитанное")},"Без оценки",()=>{D.markRead(x,null);done()})});

// ---------- статистика ----------
const ASIA=new Set(["Япония","Южная Корея","Китай","Индия","Тайвань","Гонконг","Вьетнам","Таиланд","Иран","Турция","Израиль","Индонезия","Филиппины"]);
const cntBy=(arr,f)=>{const m={};arr.forEach(x=>{const k=f(x);if(k!=null&&k!=="")m[k]=(m[k]||0)+1});return Object.entries(m).sort((a,b)=>b[1]-a[1])};
function bars(list){const mx=Math.max(1,...list.map(x=>x[1]));return `<div class="sbars">${list.map(([k,v])=>`<div class="bar2"><span>${esc(k)}</span><i style="width:${Math.max(6,v/mx*100)}%"></i><span>${v}</span></div>`).join("")}</div>`}
function stampEm(st){const C=2*Math.PI*35,f=st.cur/st.need;return `<div class="em"><svg viewBox="0 0 78 78"><circle cx="39" cy="39" r="35" fill="${st.ok?"rgba(255,255,255,.16)":"rgba(255,255,255,.04)"}" stroke="rgba(255,255,255,.14)" stroke-width="2.5"/><circle cx="39" cy="39" r="35" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-dasharray="${C*f} ${C}" transform="rotate(-90 39 39)"/></svg><svg class="mo" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round" stroke-linejoin="round">${MOTIFS[st.mo]||MOTIFS.stars}</svg></div>`}
function drawSum(){const F=isF(),r=DATA().read(),u=T[REALM].u,known=r.filter(x=>x.c&&!NOCOUNTRY.has(x.c)),rated=r.filter(x=>x.r!=null),avg=rated.reduce((s,x)=>s+x.r/2,0)/Math.max(1,rated.length),best=r.filter(x=>r5(x.r)===5);
  const cs=cntBy(known,x=>x.c),au=F?[]:cntBy(r.filter(x=>x.a&&x.a!=="Автор не указан"),x=>x.a),dated=r.filter(x=>x.y);
  const eras=F?cntBy(dated,x=>Math.floor(x.y/10)*10+"-е"):cntBy(dated,x=>(ROMAN[centuryOf(x.y)]||centuryOf(x.y))+" век");
  const gens=F?cntBy(r,x=>{const g=genreList(x.g||0);return g[0]||""}):cntBy(r,x=>GEN[x.g]);const vol=F?Math.round(r.reduce((a,x)=>a+(x.m||0),0)/60):r.reduce((a,x)=>a+(x.pg||0),0);const wn=DATA().want().length;
  const links=VIEW?"":`<div class="sc gl s3"><div class="themes" style="border-top:0;margin-top:0"><span>Тема</span>${[["dark","тёмная"],["light","светлая"]].map(([v,l])=>`<button data-theme-set="${v}" class="${(themePref()==="light"?"light":"dark")===v?"on":""}">${l}</button>`).join("")}</div></div>`;
  if(!r.length){$("#sumMore").innerHTML=`<div class="sc gl"><p style="margin:0;color:var(--ink2)">Статистика появится, когда на полке будет что-то ${F?"просмотренное":"прочитанное"}.</p></div>${links}`;return}
  const avgS=rated.length?avg.toFixed(1).replace(".",","):"—";
  const head=`<div class="sc gl s1"><div class="big"><b>${r.length}</b><span>${plural(r.length,...u)}<br>${F?"посмотрено":"прочитано"}</span></div>
     <div class="row3"><div><b>${vol.toLocaleString("ru-RU")}</b><span>${F?plural(vol,"час","часа","часов")+" просмотра":plural(vol,"страница","страницы","страниц")}</span></div><div><b>${avgS}<small>★</small></b><span>средняя оценка</span></div><div><b>${wn}</b><span>в избранном</span></div></div></div>`;
  const yNow=new Date().getFullYear(),maxA=au.length?au[0][1]:0,yearMax=Math.max(0,...cntBy(r.filter(x=>x.rd),x=>String(x.rd).slice(0,4)).map(x=>x[1])),g=Object.fromEntries(cntBy(r,x=>x.g));
  const ST=F?[["Первый фильм","первый фильм на полке","eye",r.length,1],["Десять фильмов","10 фильмов на полке","masks",r.length,10],["Пять стран","фильмы из 5 стран","compass",cs.length,5],
     ["Три десятилетия","фильмы трёх разных десятилетий","hourglass",eras.length,3],["Азия","фильм из Азии","cherry",known.some(x=>ASIA.has(x.c))?1:0,1],["Пять жанров","фильмы пяти разных жанров","crown",gens.length,5],
     ["Пять из пяти","5 фильмов на оценку 5","stars",best.length,5],["Долгий вечер","фильм длиннее 2,5 часов","moon",r.filter(x=>(x.m||0)>=150).length,1],["Старое кино","фильм, снятый до 1980 года","candle",r.filter(x=>x.y&&x.y<1980).length,1],["Киногод","12 фильмов за один год","tree",yearMax,12]]
    :[["Первая книга","первая книга на полке","books",r.length,1],["Десять книг","10 книг на полке","books",r.length,10],["Пятьдесят книг","50 книг на полке","books",r.length,50],["Пять стран","книги из 5 стран","compass",cs.length,5],["Десять стран","книги из 10 стран","compass",cs.length,10],["Три века","книги трёх разных веков","hourglass",eras.length,3],
     ["Азия","книга автора из Азии","cherry",known.some(x=>ASIA.has(x.c))?1:0,1],["Классика","10 классических книг","column",g.classic||0,10],["Сыщик","5 детективов","magnifier",g.detective||0,5],["Верность автору","3 книги одного автора","quill",maxA,3],
     ["Пять из пяти","5 книг на оценку 5","stars",best.length,5],["Толстая книга","книга от 600 страниц","stones",r.filter(x=>(x.pg||0)>=600).length,1],["Старинная книга","книга старше 200 лет","candle",r.filter(x=>x.y&&x.y<=yNow-200).length,1],["Книжный год","12 книг за один год","tree",yearMax,12],
     ["Цитатник","10 сохранённых цитат","quill",quotes.length,10],["Собеседник","3 обсуждённые книги","masks",BOOKS.filter(b=>Object.keys(discGet(b.id)).length).length,3]];
  const sts=ST.map(([t,h,mo,c,n])=>({t,h,mo,cur:Math.min(c,n),need:n,ok:c>=n})),got=sts.filter(x=>x.ok);
  const shown=[...got,...sts.filter(x=>!x.ok).sort((a,b)=>b.cur/b.need-a.cur/a.need)].slice(0,Math.max(9,got.length+3)-((Math.max(9,got.length+3))%3));
  const byY={};r.filter(x=>x.rd).forEach(x=>(byY[String(x.rd).slice(0,4)]=byY[String(x.rd).slice(0,4)]||[]).push(x));
  const yrs=Object.keys(byY).sort((a,b)=>b-a).map(y=>{const bs=byY[y],fav=bs.filter(x=>x.r!=null).sort((a,b)=>b.r-a.r)[0];
    return `<div class="yr"><div><b>${y}</b><small>${bs.length} ${plural(bs.length,...u)}</small></div>${fav?`<div class="fav"><div><span>Любим${F?"ый":"ая"}</span><em>${esc(fav.t)}</em></div>${cv(fav,34)}</div>`:""}</div>`}).join("");
  const third=F?["жанр","жанра","жанров",gens.length]:["автор","автора","авторов",au.length];
  const qs=F?[]:quotes.slice(-2).reverse(),discN=F?0:BOOKS.filter(b=>Object.keys(discGet(b.id)).length).length;
  $("#sumMore").innerHTML=`${head}
   <div class="sc gl s2"><div class="row3"><div><b>${cs.length}</b><span>${plural(cs.length,"страна","страны","стран")}</span></div><div><b>${eras.length}</b><span>${F?plural(eras.length,"десятилетие","десятилетия","десятилетий"):plural(eras.length,"век","века","веков")}</span></div><div><b>${third[3]}</b><span>${plural(third[3],third[0],third[1],third[2])}</span></div></div><div class="chips">${cs.map(([c])=>`<span>${esc(c)}</span>`).join("")}</div></div>
   ${best.length?`<div class="sc gl"><h3>Любимые</h3><div class="mini">${best.map(x=>`<button data-open="${esc(x.id)}">${cv(x,52)}</button>`).join("")}</div></div>`:""}
   ${yrs?`<div class="sc gl"><h3>Год за годом</h3><div class="yrs">${yrs}</div></div>`:""}
   <div class="sc gl"><div class="hd"><h3>${F?"Паспорт зрителя":"Читательский паспорт"}</h3><span>${got.length} из ${sts.length}</span></div><div class="stamps">${shown.map(st=>`<div class="stp${st.ok?"":" off"}">${stampEm(st)}<b>${esc(st.t)}</b><small>${esc(st.h)}</small>${st.ok?"":`<i>${st.cur} из ${st.need}</i>`}</div>`).join("")}</div></div>
   ${!F?`<div class="sc gl"><div class="hd"><h3>Цитаты</h3><span>${quotes.length}${discN?" · обсуждено книг: "+discN:""}</span></div>${qs.map(q=>`<p class="qt">«${esc(q.text)}»<small>${esc((BOOKS.find(b=>b.id===q.book)||{}).t||"")}</small></p>`).join("")}<div class="qbtns">${quotes.length?`<button class="btn" data-qall>Все цитаты</button>`:""}<button class="btn" data-qadd>Добавить цитату</button></div></div>`:""}
   ${eras.length?`<div class="sc gl"><h3>${F?"По десятилетиям":"По векам"}</h3>${bars(F?eras.sort((a,b)=>parseInt(b[0])-parseInt(a[0])):eras)}</div>`:""}
   ${gens.length?`<div class="sc gl"><h3>${F?"Что смотришь":"Что читаешь"}</h3>${bars(gens)}</div>`:""}
   ${au.length&&au[0][1]>1?`<div class="sc gl"><h3>${esc(au[0][0])}</h3><p style="margin:8px 0 0;color:var(--ink2);font-size:14px">Главный автор: ${au[0][1]} ${plural(au[0][1],...u)} на полке.</p></div>`:""}
   ${links}`}
$("#sumMore").addEventListener("click",e=>{const t=e.target;
  if(syncClick(t))return;
  if(t.closest("[data-import]")){importOpen();return}
  if(t.closest("[data-qadd]")){openQuoteForm();return}if(t.closest("[data-qall]")){openSheet(`<h3 class="sheet-h">Цитаты</h3><div class="qlist" id="qlist">${quotesListHTML()}</div>`);return}
  if(t.closest("[data-share]")){openShare();return}if(t.closest("[data-backup]")){openBackup();return}
  const th=t.closest("[data-theme-set]");if(th){const v=th.dataset.themeSet;try{v?localStorage.setItem("zal.theme",v):localStorage.removeItem("zal.theme")}catch(x){}if(TG&&TG.CloudStorage){try{TG.CloudStorage.setItem("theme",v||"")}catch(x){}}applyTheme();drawSum();tgHaptic();return}
  const o=t.closest("[data-open]");if(o){const x=DATA().read().find(y=>String(y.id)===o.dataset.open);if(x)openItem(x,"read")}});

// ---------- первая настройка ----------
let onbK="books",onbPick={};
function onbList(){return onbK==="films"?popFilms():popBooks()}
function onbDraw(){const F=onbK==="films",list=onbList();onbPick={};
  $("#onbStep").textContent=F?"2 из 2":"1 из 2";$("#onbH").textContent=F?"Выбери хотя бы два просмотренных фильма или сериала":"Выбери хотя бы две прочитанные книги";
  $("#onbP").textContent=F?"Нажми на фильм или сериал и поставь оценку.":"Нажми на книгу и поставь оценку.";
  $("#onbSkip").hidden=!F;$("#onbGrid").scrollTop=0;
  $("#onbGrid").innerHTML=list.map((x,i)=>`<div class="op${i===0?" nudge":""}" data-i="${i}">${cv(x,110)}${i===0?`<span class="tip">Нажми</span>`:""}<span class="badge"></span><small>${esc(x.t)}${x.s?" · сериал":""}</small></div>`).join("");
  $("#onbGrid")._l=list;onbBtn()}
function onbBtn(){const n=Object.keys(onbPick).length,b=$("#onbNext"),F=onbK==="films";b.disabled=n<2;b.textContent=n>=2?"Дальше":n?(F?"Выбери ещё один":"Выбери ещё одну"):(F?"Выбери хотя бы два":"Выбери хотя бы две")}
$("#onbGrid").addEventListener("click",e=>{const op=e.target.closest(".op");if(!op)return;document.querySelectorAll("#onbGrid .nudge").forEach(o=>{o.classList.remove("nudge");const t=o.querySelector(".tip");t&&t.remove()});
  const i=+op.dataset.i;rmAsk($("#onbGrid")._l[i],onbPick[i],n=>{onbPick[i]=n;op.classList.add("rated");op.querySelector(".badge").textContent="★ "+n;onbBtn()},onbPick[i]!=null?"Снять отметку":"",()=>{delete onbPick[i];op.classList.remove("rated");onbBtn()})});
function introShow(){const L=popBooks(),cells=12,reel=$("#reel");
  reel.innerHTML=Array.from({length:cells},(_,c)=>cv(L[c%L.length],130)).join("");$("#intro").classList.add("on");
  let t=0,k=cells,delay=55;const swap=()=>{const n=Math.min(cells,2+Math.floor(Math.random()*4));for(let m=0;m<n;m++){const c=reel.children[Math.floor(Math.random()*cells)];if(c)c.outerHTML=cv(L[(k++)%L.length],130)}};
  const tick=()=>{if(!$("#intro").classList.contains("on"))return;swap();t+=delay;delay=t<1600?55:Math.min(900,delay*1.35);
    if(t>2600&&!$("#intro").classList.contains("ready")){$("#flash").classList.add("on");$("#intro").classList.add("ready");tgHaptic("medium")}
    setTimeout(tick,t>2600?1400:delay)};
  setTimeout(tick,200)}
if(window.NSYNC&&NSYNC.on){$("#introGo").insertAdjacentHTML("afterend",`<button class="intro-login" id="introLogin">Уже есть аккаунт? Войти</button>`);$("#introLogin").onclick=()=>{authMode="in";authShow(()=>{$("#intro").classList.remove("on");if(emptyAll()){$("#onb").classList.add("on");onbDraw()}})}}
$("#introGo").onclick=()=>{const go=()=>{$("#intro").classList.remove("on");$("#onb").classList.add("on");onbDraw()};tgHaptic("medium");if(needAuth()){authMode="up";authShow(go)}else go()};
function onbSave(){const list=$("#onbGrid")._l,D=onbK==="films"?FM:BK,cs=checkStamps;checkStamps=()=>{};try{Object.entries(onbPick).forEach(([i,n])=>{const x=list[+i];if(!D.has(x))D.markRead(x,n*2,true)})}finally{checkStamps=cs}checkStamps(true)}
function onbFinish(){setTimeout(inviteCheck,1200);LS.set("zal.onb",1);$("#onb").classList.remove("on");setRealmUI("books");checkStamps(true);pickCol();fi=0;buildFeed();show("col");toast("Полки готовы")}
$("#onbNext").onclick=()=>{onbSave();tgHaptic("medium");onbFinish()};
$("#onbSkip").onclick=()=>onbFinish();

// ---------- обучение в ленте: по шагам, с настоящими действиями ----------
// 1) светится правая половина карточки — смахни вправо или ✓; 2) левая — влево или ✕; 3) кнопка отмены — только нажатие.
// Несколько быстрых нажатий в тёмной части — пропустить обучение.
let CO=null;
const coEl=document.createElement("div");coEl.className="co";coEl.innerHTML=`<div class="co-hole"></div><div class="co-b"></div><div class="co-b"></div><div class="co-b"></div><div class="co-b"></div><div class="co-txt"><b></b><small></small></div>`;
$("#app").appendChild(coEl);
const CO_TXT={1:["Добавить","смахни вправо или нажми ✓"],2:["Не предлагать","смахни влево или нажми ✕"],3:["Отменить действие","нажми — и книга вернётся"]};
function coRect(){const el=$("#feed").children[Math.max(0,cur)],fl=el&&el.querySelector(".fly");if(!fl)return null;const r0=fl.getBoundingClientRect(),fb=$("#fbar"),top=Math.max(r0.top,fb&&fb.offsetHeight?fb.getBoundingClientRect().bottom+8:0),r={left:r0.left,right:r0.right,top,bottom:r0.bottom,width:r0.width},cx=r.left+r.width/2;
  if(CO.step===1)return {l:cx+26,t:r.top,r:r.right,b:r.bottom};
  if(CO.step===2)return {l:r.left,t:r.top,r:cx-26,b:r.bottom};
  const u=el.querySelector("[data-undo]");if(!u)return null;const q=u.getBoundingClientRect();return {l:q.left-10,t:q.top-10,r:q.right+10,b:q.bottom+10}}
function coDraw(){if(!CO)return;const R=coRect();if(!R){setTimeout(coDraw,300);return}const W=innerWidth,H=innerHeight,[h,b1,b2,b3,b4]=coEl.children;
  Object.assign(h.style,{left:R.l+"px",top:R.t+"px",width:R.r-R.l+"px",height:R.b-R.t+"px",borderRadius:CO.step===3?"50%":"28px"});
  Object.assign(b1.style,{left:0,top:0,width:W+"px",height:R.t+"px"});Object.assign(b2.style,{left:0,top:R.b+"px",width:W+"px",height:H-R.b+"px"});
  Object.assign(b3.style,{left:0,top:R.t+"px",width:R.l+"px",height:R.b-R.t+"px"});Object.assign(b4.style,{left:R.r+"px",top:R.t+"px",width:W-R.r+"px",height:R.b-R.t+"px"});
  const tx=coEl.querySelector(".co-txt");tx.querySelector("b").textContent=CO_TXT[CO.step][0];tx.querySelector("small").textContent=CO_TXT[CO.step][1];
  tx.className="co-txt s"+CO.step;if(CO.step===1)Object.assign(tx.style,{left:"0px",width:R.l+"px",top:(R.t+R.b)/2+"px",bottom:""});
  else if(CO.step===2)Object.assign(tx.style,{left:R.r+"px",width:W-R.r+"px",top:(R.t+R.b)/2+"px",bottom:""});
  else Object.assign(tx.style,{left:"0px",width:W+"px",top:(R.t-90)+"px",bottom:""});
  coEl.classList.add("on");coEl.dataset.step=CO.step}
function coachNext(){if(!CO)return;CO.step++;if(CO.step>3){coachEnd(true);return}tgHaptic("medium");coEl.classList.remove("on");setTimeout(coDraw,280)}
function coachEnd(done){CO=null;coEl.classList.remove("on");LS.set("zal.coach",1);}
function coach(){if(LS.get("zal.coach",0)||!slides.length||VIEW||CO)return;CO={step:1,taps:[]};setTimeout(coDraw,500)}
coEl.addEventListener("click",e=>{if(!CO||!e.target.classList.contains("co-b"))return;const now=Date.now();CO.taps=CO.taps.filter(t=>now-t<1500);CO.taps.push(now);
  coEl.classList.add("nudge");setTimeout(()=>coEl.classList.remove("nudge"),250);if(CO.taps.length>=3){tgHaptic();coachEnd(false)}});
addEventListener("resize",()=>{if(CO)coDraw()});
$("#feed").addEventListener("scroll",()=>{if(CO)coDraw()},{passive:true});

// ---------- навигация ----------
let SCREEN="col";
function moveLens(){const b=document.querySelector(".dock button.on"),l=$("#lens");if(!b)return;l.style.width=b.offsetWidth+"px";l.style.transform=`translateX(${b.offsetLeft}px)`}
function show(s){SCREEN=s;document.body.classList.toggle("col",s==="col");document.body.classList.toggle("sum",s==="sum");const was=document.querySelector(".dock button.on");
  document.querySelectorAll("#app .screen").forEach(x=>x.classList.toggle("on",x.id==="s-"+s));document.querySelectorAll(".dock button").forEach(b=>b.classList.toggle("on",b.dataset.s===s));tgHaptic();
  if(was&&was.dataset.s!==s){const l=$("#lens");l.classList.add("go");setTimeout(()=>l.classList.remove("go"),260)}moveLens();
  if(s==="feed"){cur=-1;onFeedScroll();if(CO)setTimeout(coDraw,300);else coach()}else if(CO)coEl.classList.remove("on");if(s==="col")drawCol();if(s==="fr"){drawFr();frLoad()}if(s==="sum"){drawSum();const x=DATA().read()[0];ambFor(x)}}
function refresh(){if(SCREEN==="col")drawCol();else if(SCREEN==="sum")drawSum();else if(SCREEN==="feed"){const keep=$("#feed").scrollTop;if(!slides.length)buildFeed()}}
document.querySelector(".dock").addEventListener("click",e=>{const b=e.target.closest("[data-s]");if(b)show(b.dataset.s)});
function setRealmUI(r){REALM=r;LS.set("zal.realm",r);document.body.classList.toggle("films",r==="films");document.querySelectorAll("#app [data-realm]").forEach(x=>x.classList.toggle("on",x.dataset.realm===r))}
document.querySelector("#app .seg").addEventListener("click",e=>{const b=e.target.closest("[data-realm]");if(!b||b.dataset.realm===REALM)return;setRealmUI(b.dataset.realm);tgHaptic("medium");ambSrc="";acts=[];fi=0;pickCol();buildFeed();
  if(isF()&&!FILMS)loadFilms().then(()=>{if(isF())refresh()}).catch(()=>{});show(SCREEN)});
$("#top").addEventListener("click",e=>{if(e.target.closest("button"))return;const sc=document.querySelector("#app .screen.on .feed,#app .screen.on .scroll");if(sc){sc.scrollTo({top:0,behavior:"smooth"});tgHaptic()}});
addEventListener("resize",moveLens);

// ---------- связь со старыми функциями ----------
renderShelves=()=>{if(SCREEN==="col")drawCol();recList._k=null};
renderWant=()=>{recList._k=null;if(SCREEN==="col")drawCol()};
renderTime=()=>{if(SCREEN==="sum")drawSum()};
renderFilms=()=>{recList._v=-1;if(SCREEN==="col")drawCol();else if(SCREEN==="sum")drawSum()};
renderQuotes=()=>{if(SCREEN==="sum")drawSum()};
go=function(v){if(v==="ftev"){setRealmUI("films");buildFeed();show("feed")}else if(v==="fseen"||v==="fwant"){setRealmUI("films");show("col")}else if(v==="tev"){setRealmUI("books");show("feed")}else if(v==="time"){show("sum")}else show("col")};
setRealm=(r)=>{setRealmUI(r);pickCol();buildFeed();show(SCREEN)};
syncBack=function(){if(!TG||!TG.BackButton)return;(story||sheetOpen||disc||tevScope||$("#vsheet").classList.contains("on"))?TG.BackButton.show():TG.BackButton.hide()};
if(TG&&TG.BackButton)try{TG.BackButton.onClick(()=>{if($("#vsheet").classList.contains("on")&&!sheetOpen&&!disc&&!story&&!tevScope)vClose()})}catch(e){}
// оценки везде от 0 до 5 (хранятся как раньше, 0–10)
ratingPicker=function(cur){const c=cur==null?null:Math.round(cur/2);return `<div class="rate r5" id="rate">${[0,1,2,3,4,5].map(n=>`<button type="button" data-r="${n*2}" class="${c===n?"on":""}">${n}</button>`).join("")}<button type="button" data-r="" class="none${cur==null?" on":""}">без оценки</button></div>`};
applyTheme=function(){const pref=themePref();const dk=pref?pref==="dark":true;document.documentElement.setAttribute("data-theme",dk?"dark":"light");
  const bg=dk?"#05060A":"#F3F1EC";if(TG){try{TG.setHeaderColor(bg);TG.setBackgroundColor(bg);TG.setBottomBarColor&&TG.setBottomBarColor(bg)}catch(e){}}};
applyTheme();
// старые окна (карточка книги, обсуждения, факты) поверх нового интерфейса — после закрытия обновляем экран
const _closeSheet=closeSheet;closeSheet=function(){_closeSheet();setTimeout(refresh,340)};

// ---------- фильтры ленты: книги и кино ----------
// Внутри одной группы — «или», между группами — «и». Настроение, подборки, «не показывать» — у книг и у кино.
const NF=Object.assign({mood:[],len:"",pace:"",era:"",cty:[],acc:"",gen:[],hide:[],set:"",ask:""},LS.get("zal.nfb",{}));
const saveNF=()=>LS.set("zal.nfb",NF);
TF=Object.assign({kind:"",mood:[],hide:[],set:""},TF);
const has=(b,...t)=>t.some(x=>(b.tags||[]).includes(x));
const B_MOOD=[["touch","Трогательные",b=>has(b,"грустное")],["warm","Светлые и тёплые",b=>has(b,"тёплое","светлое")],["cozy","Уютные",b=>has(b,"уют","тёплое")&&!has(b,"мрачное","жутковатое")],
  ["fun","Смешные",b=>has(b,"смешное","юмор","сатира")],["grip","Захватывающие",b=>has(b,"напряжённое","динамичное","триллер")],["atm","Атмосферные",b=>has(b,"атмосферное")],
  ["dark","Мрачные",b=>has(b,"мрачное","готика")],["insp","Вдохновляющие",b=>has(b,"вдохновляющее")],["think","Заставляют задуматься",b=>has(b,"интеллектуальное","философский роман")],
  ["rom","Романтичные",b=>has(b,"романтичное","любовь")],["scary","Пугающие",b=>has(b,"жутковатое","хоррор","мистика")]];
const YNOW=new Date().getFullYear();
const B_LEN=[["short","Короткие"],["mid","Средние"],["long","Толстые"]];
const B_PACE=[["slow","Неспешные",b=>has(b,"медленное","атмосферное")&&!has(b,"динамичное")],["fast","Динамичные",b=>has(b,"динамичное","напряжённое")]];
const B_ERA=[["old","Классика до XX века",b=>b.y&&b.y<1900],["xx","XX век",b=>b.y>=1900&&b.y<2000],["now","Современные",b=>b.y>=2000],["new","Новинки",b=>b.y>=YNOW-2]];
const B_ACC=[["prize","С премиями",b=>(b.acclaim||[]).length>0],["nobel","Нобелевские лауреаты",b=>(b.acclaim||[]).some(a=>/нобел/i.test(a))]];
const B_GEN=["classic","modern","detective","fantasy","scifi","kids","nonfic"];
const B_CTY=(()=>{const c={};CAT.forEach(b=>{if(b.c)c[b.c]=(c[b.c]||0)+1});return Object.entries(c).sort((a,b)=>b[1]-a[1]).slice(0,18).map(x=>x[0])})();
const B_SET=[["evening","На один вечер",b=>b.len==="short"],["calm","Если на душе неспокойно",b=>has(b,"тёплое","светлое","уют")&&!has(b,"мрачное","жутковатое","война")&&b.heavy<2],
  ["away","Чтобы отвлечься",b=>has(b,"напряжённое","динамичное","смешное","приключения")&&b.heavy<2],["road","В дорогу",b=>has(b,"приключения","путешествия","динамичное","детектив")&&b.len!=="long"],
  ["night","Перед сном",b=>has(b,"уют","тёплое","светлое","сказка")&&!has(b,"жутковатое","хоррор","напряжённое")],["weekend","Для долгих выходных",b=>b.len==="long"],
  ["classic","Классика, до которой всё не доходят руки",b=>b.g==="classic"&&b.q>=3]];
function bookPass(b,skip){const F=NF,find=(L,id)=>(L.find(x=>x[0]===id)||[])[2];
  if(skip!=="mood"&&F.mood.length&&!F.mood.some(m=>find(B_MOOD,m)(b)))return false;
  if(skip!=="len"&&F.len&&b.len!==F.len)return false;
  if(skip!=="pace"&&F.pace&&!find(B_PACE,F.pace)(b))return false;
  if(skip!=="era"&&F.era&&!find(B_ERA,F.era)(b))return false;
  if(skip!=="cty"&&F.cty.length&&!F.cty.includes(b.c))return false;
  if(skip!=="acc"&&F.acc&&!find(B_ACC,F.acc)(b))return false;
  if(skip!=="gen"&&F.gen.length&&!F.gen.includes(b.g))return false;
  if(skip!=="hide"&&F.hide.length&&F.hide.includes(b.g))return false;
  if(skip!=="set"&&F.set&&!find(B_SET,F.set)(b))return false;return true}
const bookMoodHits=b=>NF.mood.filter(m=>(B_MOOD.find(x=>x[0]===m)||[])[2](b)).length;
const bookPool=()=>CAT.filter(b=>score(b,{tags:{},says:[]})!=null);

// кино: настроение и подборки — из жанров IMDb (номера как в FG_RU)
const G=n=>1<<n,GA=(f,...n)=>n.some(i=>f.g&G(i)),GN=(f,...n)=>!n.some(i=>f.g&G(i));
const F_MOOD=[["fun","Смешные",f=>GA(f,4)&&GN(f,12)],["touch","Трогательные",f=>GA(f,7)&&GA(f,16,8,3)&&GN(f,12,19,0)],["cozy","Уютные",f=>GA(f,8,2)&&GN(f,12,19,5,20)],
  ["grip","Захватывающие",f=>GA(f,19,0,15,5)],["scary","Пугающие",f=>GA(f,12)],["rom","Романтичные",f=>GA(f,16)],
  ["think","Заставляют задуматься",f=>GA(f,7,6,3,11)&&f.r>=75],["pretty","Красивые",f=>GA(f,9,1,2,17)&&f.r>=70]];
const F_SET=[["two","На вечер вдвоём",f=>GA(f,16,4)&&GN(f,12)&&(!f.m||f.m<=150)&&f.r>=65],["family","Посмотреть всей семьёй",f=>GA(f,8,2)&&GN(f,12,19)],
  ["short","Короче полутора часов",f=>f.m&&f.m<90],["gems","Неочевидные находки",f=>f.v<20000&&f.r>=72],["must","Классика, которую стыдно не видеть",f=>f.y&&f.y<1990&&f.v>=100000&&f.r>=78]];
function filmExtra(f,skip){const T=TF;if(skip!=="kind"&&T.kind&&((T.kind==="series")!==!!f.s))return false;
  if(skip!=="mood"&&T.mood.length&&!T.mood.some(m=>(F_MOOD.find(x=>x[0]===m)||[])[2](f)))return false;
  if(skip!=="hide"&&T.hide.length&&T.hide.some(i=>f.g&G(i)))return false;
  if(skip!=="set"&&T.set&&!(F_SET.find(x=>x[0]===T.set)||[])[2](f))return false;return true}
function filmList(){if(!FILMS)return [];return tevoFilter().filter(f=>!FSKIP.has(f.id)&&filmExtra(f))}
// без сортировки — для быстрого подсчёта
function filmCount(skipTF,skip){const T=TF,save={};if(skipTF){save[skipTF]=T[skipTF];T[skipTF]=Array.isArray(T[skipTF])?[]:skipTF==="years"?null:skipTF==="rating"?0:["fame","len","ru"].includes(skipTF)?"any":""}
  const s=T.sort;T.sort="none";let n=0;try{n=tevoFilter().filter(f=>!FSKIP.has(f.id)&&filmExtra(f,skip)).length}finally{T.sort=s;Object.assign(T,save)}return n}

// активные фильтры — подписи и сброс по одному
function activeList(){const out=[];
  if(isF()){const T=TF,lab=(L,id)=>(L.find(x=>x[0]===id)||[])[1];
    if(T.set)out.push(["set",lab(F_SET,T.set)]);if(T.kind)out.push(["kind",T.kind==="series"?"Сериалы":"Фильмы"]);
    T.mood.forEach(m=>out.push(["mood:"+m,lab(F_MOOD,m)]));T.genres.forEach(i=>out.push(["tg:"+i,FG_RU[i]]));T.countries.forEach(c=>out.push(["tc:"+c,cName(c)]));
    if(T.years){const d=DECADES.find(x=>x[0]===T.years[0]);out.push(["years",d?d[2]:T.years.join("–")])}if(T.rating)out.push(["rating","IMDb "+fmtR(T.rating)+"+"]);
    if(T.fame!=="any")out.push(["fame",{hit:"Хиты",known:"Известные",rare:"Малоизвестные"}[T.fame]]);if(T.len!=="any")out.push(["len",{short:"До 90 минут",mid:"90–150 минут",long:"Дольше 150 минут"}[T.len]]);
    if(T.lang)out.push(["lang",lName(T.lang)]);if(T.ru!=="any")out.push(["ru",T.ru==="yes"?"Выходили в России":"Не выходили в России"]);T.hide.forEach(i=>out.push(["hide:"+i,"Без: "+FG_RU[i].toLowerCase()]))}
  else{const F=NF,lab=(L,id)=>(L.find(x=>x[0]===id)||[])[1];
    if(F.ask)out.push(["ask","«"+F.ask+"»"]);if(F.set)out.push(["set",lab(B_SET,F.set)]);F.mood.forEach(m=>out.push(["mood:"+m,lab(B_MOOD,m)]));F.gen.forEach(g=>out.push(["gen:"+g,GEN[g]]));
    if(F.len)out.push(["len",lab(B_LEN,F.len)]);if(F.pace)out.push(["pace",lab(B_PACE,F.pace)]);if(F.era)out.push(["era",lab(B_ERA,F.era)]);
    F.cty.forEach(c=>out.push(["cty:"+c,c]));if(F.acc)out.push(["acc",lab(B_ACC,F.acc)]);F.hide.forEach(g=>out.push(["hide:"+g,"Без: "+GEN[g].toLowerCase()]))}
  return out}
function dropFilter(key){const [k,v]=key.split(":");
  if(isF()){const T=TF;if(k==="mood")T.mood=T.mood.filter(x=>x!==v);else if(k==="tg")T.genres=T.genres.filter(x=>x!==+v);else if(k==="tc")T.countries=T.countries.filter(x=>x!==v);
    else if(k==="hide")T.hide=T.hide.filter(x=>x!==+v);else if(k==="years")T.years=null;else if(k==="rating")T.rating=0;else if(["fame","len","ru"].includes(k))T[k]="any";else T[k]="";saveTF()}
  else{const F=NF;if(k==="mood")F.mood=F.mood.filter(x=>x!==v);else if(k==="gen")F.gen=F.gen.filter(x=>x!==v);else if(k==="cty")F.cty=F.cty.filter(x=>x!==v);
    else if(k==="hide")F.hide=F.hide.filter(x=>x!==v);else F[k]="";saveNF()}}
function resetAll(){if(isF()){Object.assign(TF,{genres:[],countries:[],years:null,rating:0,fame:"any",len:"any",lang:"",ru:"any",kind:"",mood:[],hide:[],set:""});saveTF()}
  else{Object.assign(NF,{mood:[],len:"",pace:"",era:"",cty:[],acc:"",gen:[],hide:[],set:"",ask:""});saveNF()}}
function countNow(){return isF()?filmCount():bookPool().filter(b=>bookPass(b)).length}
// какой один фильтр снять, чтобы нашлось больше всего
function bestDrop(){let best=null,bn=0;activeList().forEach(([key,label])=>{const saveB=JSON.stringify(NF),saveT=JSON.stringify(TF);dropFilter(key);const n=countNow();
  Object.assign(NF,JSON.parse(saveB));Object.assign(TF,JSON.parse(saveT));if(n>bn){bn=n;best=[key,label,n]}});saveNF();saveTF();return best}

// строка над лентой: «Фильтры», выбранное с крестиком, быстрые настроения
const fbar=document.createElement("div");fbar.className="fbar";fbar.id="fbar";$("#s-feed").appendChild(fbar);
function drawFbar(){const act=activeList(),moods=isF()?F_MOOD:B_MOOD,sel=isF()?TF.mood:NF.mood;
  fbar.innerHTML=`<button class="fc gl main${act.length?" on":""}" data-fopen><svg viewBox="0 0 24 24"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg>Фильтры${act.length?` <i>${act.length}</i>`:""}</button>`+
    act.map(([k,l])=>`<button class="fc gl on" data-fdrop="${esc(k)}">${esc(l)}<svg viewBox="0 0 24 24"><path d="M7 7l10 10M17 7L7 17"/></svg></button>`).join("")+
    moods.filter(m=>!sel.includes(m[0])).map(m=>`<button class="fc gl" data-fmood="${m[0]}">${m[1]}</button>`).join("")}
function applyFilters(){vDirty=false;buildFeed()}
fbar.addEventListener("click",e=>{const t=e.target.closest("button");if(!t)return;tgHaptic();
  if(t.dataset.fopen!=null){openFilters();return}
  if(t.dataset.fdrop){dropFilter(t.dataset.fdrop);applyFilters();return}
  if(t.dataset.fmood){(isF()?TF.mood:NF.mood).push(t.dataset.fmood);isF()?saveTF():saveNF();applyFilters();fbar.scrollLeft=0}});

// лист со всеми фильтрами
const fsec=(title,html,note)=>`<div class="fsec"><h4>${title}${note?`<small>${note}</small>`:""}</h4><div class="fch">${html}</div></div>`;
const fchip=(grp,val,on,label)=>`<button type="button" class="fk${on?" on":""}" data-fg="${grp}" data-fv="${esc(String(val))}">${esc(label)}</button>`;
function filtersHTML(){if(isF()){const T=TF;
  return fsec("Подборки",F_SET.map(([id,l])=>fchip("set",id,T.set===id,l)).join(""))+
   fsec("Что смотрим",[["","Всё"],["film","Фильмы"],["series","Сериалы"]].map(([v,l])=>fchip("kind",v,T.kind===v,l)).join(""))+
   fsec("Настроение",F_MOOD.map(([id,l])=>fchip("mood",id,T.mood.includes(id),l)).join(""),"можно несколько")+
   fsec("Жанр",FG_RU.map((g,i)=>fchip("tg",i,T.genres.includes(i),g)).join(""),"можно несколько")+
   fsec("Страна",TOPC.map(c=>fchip("tc",c,T.countries.includes(c),cName(c))).join(""))+
   fsec("Годы",DECADES.map(([a,b,l],i)=>fchip("ty",i,!!T.years&&T.years[0]===a&&T.years[1]===b,l)).join(""))+
   (T.kind==="series"?"":fsec("Длительность",[["any","Любая"],["short","До 90 минут"],["mid","90–150 минут"],["long","Дольше 150 минут"]].map(([v,l])=>fchip("tl",v,T.len===v,l)).join("")))+
   fsec("Рейтинг IMDb",[[0,"Любой"],[60,"6+"],[70,"7+"],[75,"7,5+"],[80,"8+"]].map(([v,l])=>fchip("tr",v,T.rating===v,l)).join(""))+
   fsec("Известность",[["any","Любая"],["hit","Хиты"],["known","Известные"],["rare","Малоизвестные"]].map(([v,l])=>fchip("tf",v,T.fame===v,l)).join(""))+
   fsec("Язык оригинала",[["","Любой"],...TOPL.map(l=>[l,lName(l)])].map(([v,l])=>fchip("tlg",v,T.lang===v,l)).join(""))+
   fsec("Прокат в России",[["any","Неважно"],["yes","Выходили"],["no","Не выходили"]].map(([v,l])=>fchip("tru",v,T.ru===v,l)).join(""))+
   fsec("Не показывать",FG_RU.map((g,i)=>fchip("hide",i,T.hide.includes(i),g)).join(""))+
   fsec("Сортировка",[["pop","Популярные"],["rating","По рейтингу"],["new","Новые"],["old","Старые"],["rnd","Вперемешку"]].map(([v,l])=>fchip("ts",v,T.sort===v,l)).join(""))}
  const F=NF;
  return `<div class="fsec"><h4>Своими словами<small>Шуршуня поймёт</small></h4><input class="sy-in fask" id="fAsk" value="${esc(F.ask)}" placeholder="Например: короткое и смешное про Японию" enterkeyhint="done"></div>`+fsec("Подборки",B_SET.map(([id,l])=>fchip("set",id,F.set===id,l)).join(""))+
   fsec("Настроение",B_MOOD.map(([id,l])=>fchip("mood",id,F.mood.includes(id),l)).join(""),"можно несколько")+
   fsec("Жанр",B_GEN.map(g=>fchip("gen",g,F.gen.includes(g),GEN[g])).join(""),"можно несколько")+
   fsec("Объём",B_LEN.map(([id,l])=>fchip("len",id,F.len===id,l)).join(""))+
   fsec("Темп",B_PACE.map(([id,l])=>fchip("pace",id,F.pace===id,l)).join(""))+
   fsec("Эпоха",B_ERA.map(([id,l])=>fchip("era",id,F.era===id,l)).join(""))+
   fsec("Страна автора",B_CTY.map(c=>fchip("cty",c,F.cty.includes(c),c)).join(""))+
   fsec("Признание",B_ACC.map(([id,l])=>fchip("acc",id,F.acc===id,l)).join(""))+
   fsec("Не показывать",B_GEN.map(g=>fchip("hide",g,F.hide.includes(g),GEN[g])).join(""))}
function filtersFoot(){const n=countNow();return `<div class="ffoot"><button class="btn" data-freset>Сбросить</button><button class="btn w" data-fshow${n?"":" disabled"}>${n?"Показать "+n.toLocaleString("ru-RU"):"Ничего не нашлось"}</button></div>`}
function openFilters(){vOpen(`<h3 class="vh">Фильтры</h3><div class="fwrap" id="fwrap">${filtersHTML()}</div>${filtersFoot()}`,true);vDirty=false;$("#vsheet").classList.add("filters")}
function redrawFilters(){const w=$("#fwrap");if(!w)return;const top=$("#vsh").scrollTop;w.innerHTML=filtersHTML();$("#vshBody .ffoot").outerHTML=filtersFoot();$("#vsh").scrollTop=top}
$("#vshBody").addEventListener("input",e=>{if(e.target.id!=="fAsk")return;NF.ask=e.target.value.trim();saveNF();clearTimeout(NF._t);NF._t=setTimeout(()=>{const f=$("#vshBody .ffoot");if(f)f.outerHTML=filtersFoot()},350)});
$("#vshBody").addEventListener("keydown",e=>{if(e.target.id==="fAsk"&&e.key==="Enter")e.target.blur()});
$("#vshBody").addEventListener("click",e=>{
  if(e.target.closest("[data-freset]")){resetAll();redrawFilters();tgHaptic();return}
  if(e.target.closest("[data-fshow]")){$("#vsheet").classList.remove("filters");vClose();applyFilters();return}
  const t=e.target.closest("[data-fg]");if(!t)return;tgHaptic();const g=t.dataset.fg,v=t.dataset.fv;
  const tog=(arr,x)=>arr.includes(x)?arr.filter(y=>y!==x):[...arr,x];
  if(isF()){const T=TF;
    if(g==="set")T.set=T.set===v?"":v;else if(g==="kind")T.kind=v;else if(g==="mood")T.mood=tog(T.mood,v);else if(g==="tg")T.genres=tog(T.genres,+v);else if(g==="tc")T.countries=tog(T.countries,v);
    else if(g==="ty"){const [a,b]=DECADES[+v];T.years=T.years&&T.years[0]===a&&T.years[1]===b?null:[a,b]}else if(g==="tl")T.len=v;else if(g==="tr")T.rating=+v;else if(g==="tf")T.fame=v;
    else if(g==="tlg")T.lang=v;else if(g==="tru")T.ru=v;else if(g==="hide")T.hide=tog(T.hide,+v);else if(g==="ts")T.sort=v;saveTF()}
  else{const F=NF;if(["set","len","pace","era","acc"].includes(g))F[g]=F[g]===v?"":v;else F[g]=tog(F[g],v);saveNF()}
  redrawFilters()});
// при закрытии листа фильтров свайпом или тапом по фону — тоже применяем
new MutationObserver(()=>{const sh=$("#vsheet");if(!sh.classList.contains("on")&&sh.classList.contains("filters")){sh.classList.remove("filters");applyFilters()}}).observe($("#vsheet"),{attributes:true,attributeFilter:["class"]});

// пустая лента: подсказываем, какой фильтр ослабить
function emptyInner(){const act=activeList();if(!act.length)return endInner();const d=bestDrop();
  return `<h2>Ничего не нашлось</h2><p>С такими фильтрами ${isF()?"фильмов":"книг"} не осталось.${d?` Если убрать «${esc(d[1])}», найдётся ${d[2].toLocaleString("ru-RU")}.`:""}</p><div class="acts col">${d?`<button class="btn w" data-fdrop2="${esc(d[0])}">Убрать «${esc(d[1])}»</button>`:""}<button class="btn" data-freset2>Сбросить все фильтры</button></div>`}
$("#feed").addEventListener("click",e=>{const d=e.target.closest("[data-fdrop2]");if(d){dropFilter(d.dataset.fdrop2);applyFilters();return}if(e.target.closest("[data-freset2]")){resetAll();applyFilters()}});


// ---------- синхронизация: карточка, вход по почте ----------
const NS=window.NSYNC||{on:false};
const agoTxt=t=>{if(!t)return "ещё не было";const m=Math.round((Date.now()-t)/60000);return m<1?"только что":m<60?m+" мин назад":Math.round(m/60)<24?Math.round(m/60)+" ч назад":new Date(t).toLocaleDateString("ru-RU")};
function syncCard(){if(!NS.on)return "";const k=NS.key();
  const st=NS.err?`<span class="sy-err">Не синхронизировано: ${esc(NS.err)}</span>`:k?`Синхронизировано ${agoTxt(NS.last)}`:"Пока только на этом устройстве";
  return `<div class="sc gl sy"><h3>Синхронизация</h3><p class="sy-st">${st}</p>
   ${TG&&k?`<button data-sy-open>Открыть в браузере</button>`:""}${k?`<button data-sy-copy>Скопировать ссылку для входа</button>`:""}
   ${NS.email?`<p class="sy-mail">Вход по почте: <b>${esc(NS.email)}</b></p>`:k?`<button data-sy-mail>Привязать почту</button>`:`<button data-sy-login>Войти по почте</button>`}
   <p class="sy-note">${NS.email?"Если Telegram недоступен — открой Нору в любом браузере и войди с этой почтой.":"С почтой Нору можно открыть в любом браузере, даже если Telegram недоступен."}</p></div>`}
function syncClick(t){
  if(t.closest("[data-sy-open]")){const u=NS.link();try{TG&&TG.openLink?TG.openLink(u,{try_instant_view:false}):window.open(u,"_blank")}catch(e){window.open(u,"_blank")}return true}
  if(t.closest("[data-sy-copy]")){const u=NS.link();(navigator.clipboard?navigator.clipboard.writeText(u):Promise.reject()).then(()=>toast("Ссылка скопирована — не показывай её чужим")).catch(()=>{vOpen(`<h3 class="vh">Ссылка для входа</h3><p class="sy-note">Скопируй и открой в любом браузере. Не показывай её чужим: по ней открываются твои полки.</p><textarea class="sy-in" readonly rows="3">${esc(u)}</textarea>`)});return true}
  if(t.closest("[data-sy-mail]")){mailSheet("link");return true}
  if(t.closest("[data-sy-login]")){loginSheet();return true}
  return false}
function mailSheet(mode){const L=mode==="link";
  vOpen(`<h3 class="vh">${L?"Привязать почту":"Войти по почте"}</h3><p class="sy-note">${L?"Придумай пароль — с почтой и паролем Нору можно открыть в любом браузере, даже без Telegram.":"Почта и пароль, привязанные к Норе."}</p>
   <input class="sy-in" id="syE" type="email" autocomplete="email" placeholder="Почта" inputmode="email">
   <input class="sy-in" id="syP" type="password" autocomplete="${L?"new-password":"current-password"}" placeholder="${L?"Пароль, от 6 символов":"Пароль"}">
   <p class="sy-msg" id="syM"></p><div class="one"><button class="btn w" id="syGo">${L?"Привязать":"Войти"}</button></div>${L?"":`<button class="sy-link" id="syR">Забыли пароль?</button>`}`);
  $("#vsheet").classList.toggle("ontop",$("#intro").classList.contains("on")||$("#onb").classList.contains("on"));
  const go=$("#syGo"),msg=$("#syM");
  go.onclick=async()=>{const e=$("#syE").value.trim(),p=$("#syP").value;if(!e||!p){msg.textContent="Заполни почту и пароль";return}go.disabled=true;go.textContent=L?"Привязываю…":"Вхожу…";msg.textContent="";
    try{if(L){try{await NS.signUp(e,p)}catch(x){if(/уже есть Нора/.test(x.message))await NS.signIn(e,p);else throw x}}else await NS.signIn(e,p);
      vClose();toast(L?"Почта привязана":"Вход выполнен — загружаю полки");if(SCREEN==="sum")drawSum()}
    catch(x){msg.textContent=x.message;go.disabled=false;go.textContent=L?"Привязать":"Войти"}};
  const r=$("#syR");if(r)r.onclick=async()=>{const e=$("#syE").value.trim();if(!e){msg.textContent="Впиши почту — пришлю ссылку для нового пароля";return}
    try{await NS.reset(e);msg.textContent="Письмо отправлено. Задай новый пароль по ссылке и возвращайся."}catch(x){msg.textContent=x.message}}}
const loginSheet=()=>mailSheet("login");
addEventListener("nsync",()=>{if(SCREEN==="sum"&&!$("#vsheet").classList.contains("on"))drawSum()});
try{if(sessionStorage.getItem("nsync.applied")){sessionStorage.removeItem("nsync.applied");setTimeout(()=>toast("Подтянуты изменения с другого устройства"),600);
  if(TG){try{saveMine();saveEdits();saveWant();saveF();saveNow()}catch(e){}}}}catch(e){}


// ---------- заставка при каждом открытии: обложки мелькают, пока всё грузится, потом замирают ----------
const SPL={stop:false,k:0};
function splashRun(){const sp=$("#splash"),reel=$("#spReel");if(!sp||!reel)return;
  const own=[...BOOKS.map(b=>bItem(b,"read")),...want.map(w=>bItem(w,"want"))],L=own.length>=8?own.sort(()=>Math.random()-.5):[...own,...popBooks()];
  const cells=reel.children.length;for(let c=0;c<cells;c++){reel.children[c].outerHTML=cv(L[c%L.length],130)}SPL.k=cells;
  let delay=70;const tick=()=>{if(SPL.stop)return;const n=2+Math.floor(Math.random()*4);for(let m=0;m<n;m++){const c=reel.children[Math.floor(Math.random()*cells)];if(c)c.outerHTML=cv(L[(SPL.k++)%L.length],130)}
    setTimeout(tick,delay)};setTimeout(tick,90)}
function splashReady(){const imgs=[...document.querySelectorAll("#flow .cv.mid img,#flow .cv img,#grid .cv img")].slice(0,9);
  const one=im=>im.complete?Promise.resolve():new Promise(r=>{im.addEventListener("load",r,{once:true});im.addEventListener("error",r,{once:true})});
  return Promise.all([document.fonts?document.fonts.ready:0,...imgs.map(one)])}
function splashEnd(){const sp=$("#splash");if(!sp||SPL.done)return;SPL.done=true;SPL.stop=true;sp.classList.add("frozen");tgHaptic("medium");
  setTimeout(()=>sp.classList.add("out"),700);setTimeout(()=>{sp.classList.remove("on");sp.remove();afterSplash()},1300)}
function splashStart(){splashRun();const t0=performance.now();
  Promise.race([new Promise(r=>setTimeout(r,1600)).then(splashReady),new Promise(r=>setTimeout(r,3200))]).then(()=>{const wait=Math.max(0,1900-(performance.now()-t0));setTimeout(splashEnd,wait)})}


// ---------- друзья: полки друзей и «что нового» (без ссылок-снимков) ----------
// Свой профиль публикуется в облако (profiles/<uid>): имя, прочитанное, «хочу прочитать», последние события.
const myName=()=>{const n=LS.get("zal.name","");if(n)return n;const u=TG&&TG.initDataUnsafe&&TG.initDataUnsafe.user;return (u&&u.first_name)||(NS.email?String(NS.email).split("@")[0]:"")};
let FRIENDS=LS.get("zal.friends",[]);const frSave=()=>LS.set("zal.friends",FRIENDS);
let FSEEN2=LS.get("zal.frseen",{});const frSeenSave=()=>LS.set("zal.frseen",FSEEN2);
const FRP={};   // загруженные профили друзей
const hueOf=s=>hsh(String(s))%360;
const avatar=(n,uid,cls="")=>`<i class="ava ${cls}" style="--h:${hueOf(uid)}">${esc((n||"?").trim().charAt(0).toUpperCase())}</i>`;
function snapNow(){return {read:BOOKS.map(b=>({t:b.t,a:b.a||"",r:b.r??null,rd:b.rd||"",ds:(b.ann||"").slice(0,300)})),want:want.map(w=>({t:w.t,a:w.a||""})),now:nowBook&&nowBook.t?{t:nowBook.t,a:nowBook.a||""}:null}}
function pubCheck(){if(!NS.on||VIEW||!(NS.hasTok&&NS.hasTok()))return;const cur=snapNow(),name=myName(),sig=JSON.stringify([name,cur]);const prev=LS.get("zal.sync.pub",null);
  if(prev&&prev.sig===sig)return;const ev=prev?prev.ev||[]:[],now=Date.now(),add=[];
  if(prev&&prev.snap){const pr=new Map(prev.snap.read.map(b=>[norm(b.t),b])),pw=new Set(prev.snap.want.map(w=>norm(w.t)));
    cur.read.forEach(b=>{const o=pr.get(norm(b.t));if(!o)add.push({k:"read",t:b.t,a:b.a,r:b.r,ts:now});else if(b.r!=null&&o.r!==b.r)add.push({k:"rate",t:b.t,a:b.a,r:b.r,ts:now})});
    cur.want.forEach(w=>{if(!pw.has(norm(w.t)))add.push({k:"want",t:w.t,a:w.a,ts:now})});
    if(cur.now&&(!prev.snap.now||norm(prev.snap.now.t)!==norm(cur.now.t)))add.push({k:"now",t:cur.now.t,a:cur.now.a,ts:now})}
  const evs=[...add,...ev].slice(0,40);
  NS.putProfile(name,{...cur,ev:evs}).then(ok=>{if(ok)localStorage.setItem("zal.sync.pub",JSON.stringify({sig,snap:cur,ev:evs}))}).catch(()=>{})}
setInterval(pubCheck,20000);document.addEventListener("visibilitychange",()=>{if(document.hidden)pubCheck()});setTimeout(pubCheck,6000);
async function frLoad(){if(!NS.on)return;await Promise.all(FRIENDS.map(f=>NS.getProfile(f.uid).then(p=>{if(p){FRP[f.uid]=p;if(p.n&&p.n!==f.n){f.n=p.n;frSave()}}}).catch(()=>{})));frDotUpd();if(SCREEN==="fr")drawFr()}
const frNew=f=>{const p=FRP[f.uid];return p&&(p.ev||[]).some(e=>e.ts>(FSEEN2[f.uid]||0))};
function frDotUpd(){const d=$("#frDot");if(d)d.hidden=!FRIENDS.some(frNew)}
const evLabel=e=>e.k==="read"?(e.r!=null?"прочитано ★"+r5(e.r):"прочитано"):e.k==="rate"?"оценка ★"+r5(e.r):e.k==="want"?"хочет прочитать":"читает сейчас";
const whenTxt=ts=>{const d=new Date(ts),t=new Date();const days=Math.floor((new Date(t.toDateString())-new Date(d.toDateString()))/864e5);return days<=0?"сегодня":days===1?"вчера":days<7?days+" "+plural(days,"день","дня","дней")+" назад":d.toLocaleDateString("ru-RU",{day:"numeric",month:"long"})};
const fbItem=b=>{const it=bItem({...b,id:b.id||"f"+hsh(norm(b.t)).toString(36)},"friend");it.ds=b.ds||it.ds;return it};
function inviteLink(){const u=NS.uid&&NS.uid();if(!u)return "";return TG?`https://t.me/${SHARE_BOT}?startapp=f_${u}`:`https://moya-nora.github.io/#f=${u}`}
function drawFr(){const box=$("#frBox");if(!box)return;const me=myName();
  const list=FRIENDS.map(f=>({f,p:FRP[f.uid]})),news=list.filter(x=>x.p&&(x.p.ev||[]).length).sort((a,b)=>(b.p.ev[0].ts||0)-(a.p.ev[0].ts||0));
  box.innerHTML=`<h1 class="fr-h">Друзья</h1>
   <div class="fr-row"><button class="fr-add" data-fr-inv><i class="ava plus">+</i><span>Пригласить</span></button>${list.map(({f})=>`<button class="fr-av" data-fr-open="${esc(f.uid)}">${avatar(f.n,f.uid,frNew(f)?"new":"")}<span>${esc(f.n||"Друг")}</span></button>`).join("")}</div>
   ${FRIENDS.length?"":`<div class="sc gl fr-empty"><h3>Полки друзей</h3><p>Пригласи друга — и вы будете видеть полки друг друга: что прочитано, какие оценки, что хочется прочитать. Ссылкой-снимком делиться больше не нужно: всё обновляется само.</p><button class="btn w" data-fr-inv>Пригласить друга</button></div>`}
   ${news.length?`<h3 class="fr-sec">Что нового</h3>`+news.map(({f,p})=>{const ev=(p.ev||[]).slice(0,10),fresh=ev.filter(e=>e.ts>(FSEEN2[f.uid]||0)).length;
     return `<div class="sc gl frc"><button class="frh" data-fr-open="${esc(f.uid)}">${avatar(f.n,f.uid)}<b>${esc(f.n||"Друг")}</b><span>${whenTxt(ev[0].ts)}${fresh?` · новых: ${fresh}`:""}</span></button>
       <div class="frs">${ev.map((e,i)=>`<button class="fre" data-fr-ev="${esc(f.uid)}|${i}">${cv(fbItem(e),84)}<em>${esc(evLabel(e))}</em><small>${esc(e.t)}</small></button>`).join("")}</div></div>`}).join(""):FRIENDS.length?`<p class="fr-note">Когда друзья что-нибудь прочитают или оценят, это появится здесь.</p>`:""}
   <div class="fr-me">Тебя видят как <b>${esc(me||"без имени")}</b> <button data-fr-name>изменить</button></div>`}
async function frInvite(){const link=inviteLink();if(!link){toast("Сначала нужен вход");authShow();return}const text="Добавь меня в друзья в Норе — будем видеть книжные полки друг друга";
  if(TG&&TG.openTelegramLink){try{TG.openTelegramLink("https://t.me/share/url?url="+encodeURIComponent(link)+"&text="+encodeURIComponent(text));return}catch(e){}}
  if(navigator.share){try{await navigator.share({title:"Нора",text,url:link});return}catch(e){}}
  try{await navigator.clipboard.writeText(link);toast("Ссылка-приглашение скопирована")}catch(e){vOpen(`<h3 class="vh">Приглашение</h3><textarea class="sy-in" rows="3" readonly>${esc(link)}</textarea>`)}}
function frShelf(uid,tab){const f=FRIENDS.find(x=>x.uid===uid),p=FRP[uid];if(!f)return;FSEEN2[uid]=Date.now();frSeenSave();frDotUpd();
  if(!p){vOpen(`<h3 class="vh">${esc(f.n||"Друг")}</h3><p class="sy-note">Полки пока не загрузились — проверь интернет.</p>`);return}
  tab=tab||"read";const L=(tab==="read"?p.read:p.want)||[];
  vOpen(`<div class="frp">${avatar(f.n,uid,"big")}<h3 class="vh">${esc(f.n||"Друг")}</h3><p class="sy-note">${(p.read||[]).length} ${plural((p.read||[]).length,"книга","книги","книг")} прочитано${p.now?` · сейчас: «${esc(p.now.t)}»`:""}</p></div>
   <div class="imp-to"><button class="${tab==="read"?"on":""}" data-frt="read">Прочитано</button><button class="${tab==="want"?"on":""}" data-frt="want">Хочет прочитать</button></div>
   <div class="frg">${L.map((b,i)=>`<button data-frb="${i}">${cv(fbItem(b),100)}<small>${esc(b.t)}</small>${b.r!=null?`<em>★ ${r5(b.r)}</em>`:""}</button>`).join("")||`<p class="sy-note">Пусто.</p>`}</div>
   <button class="fr-del" data-fr-del>Убрать из друзей</button>`,true);
  const sh=$("#vshBody");sh._fr={uid,tab}}
function frBook(uid,b){const f=FRIENDS.find(x=>x.uid===uid)||{},x=fbItem(b),has=BK.has(x);cardX=x;cardL="friend";
  vOpen(`<div class="dt">${cv(x,150)}<h2>${esc(x.t)}</h2><div class="meta">${esc(x.a||"")}</div>${b.r!=null?`<p class="dd q">У ${esc(f.n||"друга")}: ★ ${r5(b.r)}</p>`:""}<p class="dd" id="cardDesc">${esc(descOf(x))}</p>
   <div class="one">${has?`<button class="btn" disabled>${has==="read"?"Уже прочитано":"Уже в «Хочу прочитать»"}</button>`:`<button class="btn w" data-fr-want>Хочу прочитать</button>`}</div></div>`);
  wantDesc(x,()=>{const d=$("#cardDesc");if(d&&cardX===x)d.textContent=descOf(x)})}
async function frAddFlow(uid){if(!uid||uid===(NS.uid&&NS.uid()))return;if(FRIENDS.some(f=>f.uid===uid)){show("fr");return}
  let p=null;try{p=await NS.getProfile(uid)}catch(e){}const n=p&&p.n||"Друг";
  vOpen(`<div class="frp">${avatar(n,uid,"big")}<h3 class="vh">${esc(n)} приглашает в друзья</h3><p class="sy-note">Будут видны полки друг друга: что прочитано, оценки и что хочется прочитать.</p></div><button class="btn w fr-yes" data-fr-yes="${esc(uid)}">Добавить в друзья</button>`);
  if(p)FRP[uid]=p;$("#vshBody")._addn=n}
document.addEventListener("click",e=>{const t=e.target;
  if(t.closest("[data-fr-inv]")){tgHaptic();frInvite();return}
  const o=t.closest("[data-fr-open]");if(o){tgHaptic();frShelf(o.dataset.frOpen);return}
  const ev=t.closest("[data-fr-ev]");if(ev){const [uid,i]=ev.dataset.frEv.split("|");const e2=(FRP[uid].ev||[])[+i];if(e2)frBook(uid,e2);return}
  const tb=t.closest("[data-frt]");if(tb){const fr=$("#vshBody")._fr;if(fr)frShelf(fr.uid,tb.dataset.frt);return}
  const bb=t.closest("[data-frb]");if(bb){const fr=$("#vshBody")._fr;if(fr){const p=FRP[fr.uid];frBook(fr.uid,(fr.tab==="read"?p.read:p.want)[+bb.dataset.frb])}return}
  if(t.closest("[data-fr-want]")){BK.addWant(cardX);vDirty=true;toast("Добавлено в избранное");vClose();return}
  if(t.closest("[data-fr-del]")){const fr=$("#vshBody")._fr;if(fr){FRIENDS=FRIENDS.filter(x=>x.uid!==fr.uid);frSave();vClose();drawFr();toast("Убрано из друзей")}return}
  const y=t.closest("[data-fr-yes]");if(y){const uid=y.dataset.frYes;FRIENDS.push({uid,n:$("#vshBody")._addn||"",added:Date.now()});frSave();vClose();show("fr");frLoad();toast("Теперь в друзьях");return}
  if(t.closest("[data-fr-name]")){vOpen(`<h3 class="vh">Как тебя зовут?</h3><p class="sy-note">Это имя увидят друзья.</p><input class="sy-in" id="frN" value="${esc(myName())}" maxlength="40"><div class="one"><button class="btn w" data-fr-nsave>Сохранить</button></div>`);return}
  if(t.closest("[data-fr-nsave]")){const v=$("#frN").value.trim();if(v){LS.set("zal.name",v.slice(0,40));pubCheck()}vClose();drawFr();return}});
// приглашение по ссылке: #f=<uid> или startapp=f_<uid>
const INV=(()=>{const h=location.hash.match(/[#&]f=([\w-]{10,})/);if(h){history.replaceState(null,"",location.pathname+location.search);return h[1]}const sp=TG&&TG.initDataUnsafe&&TG.initDataUnsafe.start_param||"";const m=sp.match(/^f_([\w-]{10,})$/);return m?m[1]:""})();
function inviteCheck(){if(INV&&!needAuth()&&!$("#onb").classList.contains("on")&&!$("#intro").classList.contains("on"))setTimeout(()=>frAddFlow(INV),400)}
setTimeout(frLoad,2500);


// ---------- подсказка «Нора на экране „Домой“» ----------
// Не в первые дни: через неделю и после нескольких открытий; «Не сейчас» — снова через 3 недели, максимум 3 раза.
// Если уже установлено (Telegram сообщает статус, браузер — режим «приложения»), не показываем.
const HS={get:k=>{try{return JSON.parse(localStorage.getItem("zal.sync.hs")||"{}")[k]}catch(e){}},set(k,v){let o={};try{o=JSON.parse(localStorage.getItem("zal.sync.hs")||"{}")}catch(e){}o[k]=v;localStorage.setItem("zal.sync.hs",JSON.stringify(o))}};
if(!HS.get("first"))HS.set("first",Date.now());HS.set("opens",(HS.get("opens")||0)+1);
const standalone=()=>!!(window.matchMedia&&matchMedia("(display-mode: standalone)").matches)||navigator.standalone===true;
let bip=null;addEventListener("beforeinstallprompt",e=>{e.preventDefault();bip=e});
addEventListener("appinstalled",()=>HS.set("done",1));
const isIOS=/iPhone|iPad|iPod/.test(navigator.userAgent),isAndroid=/Android/.test(navigator.userAgent);
function hsDue(){if(VIEW||HS.get("done")||HS.get("never"))return false;if((HS.get("shows")||0)>=3)return false;
  const days=(Date.now()-HS.get("first"))/864e5;if(days<7||(HS.get("opens")||0)<4)return false;if(Date.now()-(HS.get("last")||0)<21*864e5)return false;return true}
function hsCheck(){if(!hsDue())return;if(standalone()){HS.set("done",1);return}
  if(TG&&TG.checkHomeScreenStatus){try{TG.checkHomeScreenStatus(st=>{if(st==="added"){HS.set("done",1);return}if(st==="missed")hsShow("tg");else if(st==="unsupported")return;else hsShow("tg")})}catch(e){}return}
  if(TG)return;hsShow("web")}
const hsEl=document.createElement("div");hsEl.className="hsb";$("#app").appendChild(hsEl);
function hsShow(mode){HS.set("last",Date.now());HS.set("shows",(HS.get("shows")||0)+1);
  hsEl.innerHTML=`<img src="icons/icon-192.png" alt=""><div class="hs-tx"><b>Нора на экране «Домой»</b><span>Открывается в одно касание, как обычное приложение.</span></div>
   <div class="hs-acts"><button class="btn w" data-hs-go>${mode==="tg"||bip?"Добавить":"Как добавить"}</button><button class="hs-no" data-hs-later>Не сейчас</button></div><button class="hs-x" data-hs-never aria-label="Больше не показывать">Больше не показывать</button>`;
  hsEl.dataset.mode=mode;setTimeout(()=>hsEl.classList.add("on"),50)}
const hsHide=()=>hsEl.classList.remove("on");
hsEl.addEventListener("click",async e=>{const t=e.target;
  if(t.closest("[data-hs-later]")){hsHide();return}
  if(t.closest("[data-hs-never]")){HS.set("never",1);hsHide();return}
  if(!t.closest("[data-hs-go]"))return;hsHide();
  if(hsEl.dataset.mode==="tg"&&TG.addToHomeScreen){try{TG.onEvent&&TG.onEvent("homeScreenAdded",()=>HS.set("done",1));TG.addToHomeScreen()}catch(x){}return}
  if(bip){bip.prompt();try{const r=await bip.userChoice;if(r.outcome==="accepted")HS.set("done",1)}catch(x){}bip=null;return}
  vOpen(`<h3 class="vh">Нора на экране «Домой»</h3><ol class="hs-steps">${isIOS?`<li>Нажми кнопку «Поделиться» <span class="hs-ic">⬆</span> внизу экрана Safari.</li><li>Пролистай вниз и выбери «На экран „Домой“».</li><li>Нажми «Добавить» — иконка Норы появится рядом с другими приложениями.</li>`
    :isAndroid?`<li>Открой меню браузера — три точки вверху справа.</li><li>Выбери «Добавить на главный экран» или «Установить приложение».</li><li>Подтверди — иконка Норы появится на рабочем столе.</li>`
    :`<li>Открой меню браузера.</li><li>Выбери «Установить» или «Добавить на главный экран».</li><li>Подтверди — Нора появится среди приложений.</li>`}</ol>`)});

// ---------- обязательная регистрация ----------
const needAuth=()=>!!(NS.on&&!VIEW&&!(NS.hasTok&&NS.hasTok()));
const authEl=document.createElement("div");authEl.className="auth";authEl.id="auth";$("#app").appendChild(authEl);
let authNext=null,authMode="up";
function authShow(next){authNext=next||null;if(NS.email&&authMode==="up")authMode="in";authDraw();authEl.classList.add("on")}
function authDraw(){const up=authMode==="up";
  authEl.innerHTML=`<div class="au-in"><h1>${up?"Создай аккаунт":"Вход"}</h1><p>${up?"Почта и пароль нужны, чтобы полки не потерялись и открывались на любом устройстве — в Telegram, в браузере, на телефоне и компьютере.":"Почта и пароль, привязанные к Норе."}</p>
   ${up?`<input class="sy-in" id="auN" autocomplete="given-name" placeholder="Имя — так тебя увидят друзья" value="${esc(myName())}">`:""}
   <input class="sy-in" id="auE" type="email" autocomplete="email" inputmode="email" placeholder="Почта">
   <input class="sy-in" id="auP" type="password" autocomplete="${up?"new-password":"current-password"}" placeholder="${up?"Пароль, от 6 символов":"Пароль"}">
   <p class="sy-msg" id="auM"></p><button class="btn w" id="auGo">${up?"Создать аккаунт":"Войти"}</button>
   <button class="au-sw" id="auSw">${up?"Уже есть аккаунт? Войти":"Нет аккаунта? Создать"}</button>${up?"":`<button class="au-sw" id="auR">Забыли пароль?</button>`}</div>`;
  const go=$("#auGo"),msg=$("#auM");
  $("#auSw").onclick=()=>{authMode=up?"in":"up";authDraw();tgHaptic()};
  const r=$("#auR");if(r)r.onclick=async()=>{const e=$("#auE").value.trim();if(!e){msg.textContent="Впиши почту — придёт ссылка для нового пароля";return}try{await NS.reset(e);msg.textContent="Письмо отправлено. Задай новый пароль по ссылке и возвращайся."}catch(x){msg.textContent=x.message}};
  go.onclick=async()=>{const e=$("#auE").value.trim(),p=$("#auP").value;if(!e||!p){msg.textContent="Заполни почту и пароль";return}go.disabled=true;go.textContent=up?"Создаю…":"Вхожу…";msg.textContent="";
    const nm=$("#auN");if(nm&&nm.value.trim())LS.set("zal.name",nm.value.trim().slice(0,40));
    try{if(up){try{await NS.signUp(e,p)}catch(x){if(/уже есть Нора/.test(x.message)){await NS.signIn(e,p)}else throw x}}else await NS.signIn(e,p);
      authEl.classList.remove("on");tgHaptic("medium");toast(up?"Аккаунт создан":"Вход выполнен");const n=authNext;authNext=null;if(n)n();setTimeout(()=>{pubCheck();inviteCheck()},800)}
    catch(x){msg.textContent=x.message;go.disabled=false;go.textContent=up?"Создать аккаунт":"Войти"}};
  $("#auP").onkeydown=e=>{if(e.key==="Enter")go.click()}}
function afterSplash(){setTimeout(inviteCheck,300);setTimeout(()=>{if(!$("#auth").classList.contains("on")&&!$("#onb").classList.contains("on")&&!$("#intro").classList.contains("on")&&!$("#vsheet").classList.contains("on"))hsCheck()},4000);if(needAuth()&&!$("#intro").classList.contains("on")&&!$("#onb").classList.contains("on")&&LS.get("zal.onb",0))authShow()}


// ---------- смена обложки вручную: фото / рисунок / другое издание ----------
let COVX=null;
function covRow(x){COVX=x;const c=COV[ikey(x)];const mode=c==="draw"?"draw":c?"pick":"auto";
  return `<div class="covsw"><span>Обложка</span><button data-cov="auto" class="${mode==="auto"?"on":""}">авто</button><button data-cov="draw" class="${mode==="draw"?"on":""}">рисунок</button><button data-cov="next" class="${mode==="pick"?"on":""}">другое издание ↻</button></div>`}
async function covNext(x){const k=ikey(x);const s=await flj("/search-works?q="+encodeURIComponent(x.t)+"&page=1&onlymatches=1");const sur=norm(String(x.a||"").split(" ").slice(-1)[0]);
  const w=(Array.isArray(s)?s:[]).find(w=>!sur||norm(w.autor_rusname||"").includes(sur)||norm(w.autor_name||"").includes(sur))||(Array.isArray(s)?s[0]:null);if(!w)throw new Error("none");
  const L=await editionsOf(w.work_id);if(!L.length)throw new Error("none");const cur=imgOf(x),i=L.findIndex(e=>IMGFL(e.edition_id)===cur);
  COV[k]=IMGFL(L[(i+1)%L.length].edition_id);covSave();return L.length}
function covApply(x){const k=ikey(x),u=imgOf(x);document.querySelectorAll(`[data-ik="${CSS.escape(k)}"]`).forEach(el=>{el.querySelectorAll("img").forEach(i=>i.remove());if(u)el.insertAdjacentHTML("beforeend",imgTag(u))});
  document.querySelectorAll(".covsw").forEach(r=>{const c=COV[k];r.querySelectorAll("[data-cov]").forEach(b=>b.classList.toggle("on",b.dataset.cov===(c==="draw"?"draw":c?"next":"auto")))});vDirty=true}
document.addEventListener("click",async e=>{const b=e.target.closest("[data-cov]");if(!b||!COVX)return;const x=COVX,k=ikey(x),m=b.dataset.cov;tgHaptic();
  if(m==="auto"){delete COV[k];covSave();if(!imgOf(x)){delete IMG[k];wantImg(x)}covApply(x);return}
  if(m==="draw"){COV[k]="draw";covSave();covApply(x);return}
  b.textContent="ищу…";try{const n=await covNext(x);b.textContent=n>1?"другое издание ↻":"другого нет";covApply(x)}catch(err){b.textContent="не нашлось"}});
// карточка прочитанной книги (старое окно) — настоящая обложка и выбор обложки
const _openBook=openBook;openBook=function(id){_openBook(id);const b=BOOKS.find(x=>x.id===id),sh=$("#sheet");if(!b||!sh)return;const x=bItem(b,"read"),c=sh.querySelector(".bk .cover");
  if(c)c.outerHTML=`<div class="bk-cv">${cv(x,112)}</div>`;const m=sh.querySelector(".bk-meta");if(m&&!VIEW)m.insertAdjacentHTML("beforeend",covRow(x))};


// ---------- перенос книг из Литрес, Яндекс Книг, LiveLib и других ----------
// Готового доступа к спискам этих сервисов нет: переносим скриншотами (распознавание текста) или списком.
function importOpen(){vOpen(`<h3 class="vh">Перенести книги</h3>
  <p class="sy-note" style="font-size:14px;color:var(--ink2)">Литрес, Яндекс Книги, LiveLib и Bookmate не дают забрать список напрямую, поэтому есть два способа.</p>
  <div class="imp-step"><b>1. Скриншоты</b><span>Открой в сервисе раздел «Мои книги» или «Прочитанное», сделай несколько скриншотов списка и загрузи их — Нора прочитает названия.</span><button class="btn w" data-imp-shot>Загрузить скриншоты</button></div>
  <div class="imp-step"><b>2. Списком</b><span>Скопируй названия из сервиса или заметок и вставь — по одной книге в строке, автор через тире по желанию.</span>
   <textarea class="sy-in" id="impT" rows="6" placeholder="Мастер и Маргарита — Булгаков&#10;Норвежский лес&#10;Сто лет одиночества — Маркес"></textarea>
   <div class="imp-to"><button class="on" data-imp-to="read">Прочитано</button><button data-imp-to="want">Хочу прочитать</button></div>
   <button class="btn w" data-imp-parse>Разобрать список</button></div><div id="impRes"></div>`,true)}
let IMP={to:"read",list:[]};
function impParse(text){const out=[],seen=new Set();String(text).split(/\n+/).map(l=>l.replace(/^[\s\d.)•\-–—*]+/,"").trim()).filter(l=>l.length>1).forEach(line=>{
  const [t0,a0]=line.split(/\s+[—–-]\s+|\s*;\s*|\t/);const t=(t0||"").replace(/[«»"]/g,"").trim(),a=(a0||"").trim();if(!t)return;
  const sur=norm(a.split(" ").slice(-1)[0]||"");let c=CAT.find(b=>norm(b.t)===norm(t)&&(!sur||norm(b.a).includes(sur)))||(!a?CAT.find(b=>norm(b.t)===norm(t)):null);
  if(!c){const m=matchBooks(line);c=m[0]||null}const x=c?bItem(c,"cat"):{t:t.charAt(0).toUpperCase()+t.slice(1),a,kind:"man"};
  const k=norm(x.t);if(seen.has(k))return;seen.add(k);out.push({x,ok:!BK.has(x),found:!!c})});return out}
function impDraw(){const box=$("#impRes");if(!box)return;const L=IMP.list,n=L.filter(i=>i.ok).length;
  box.innerHTML=L.length?`<div class="imp-list">${L.map((i,j)=>`<label class="imp-row"><input type="checkbox" data-imp-i="${j}" ${i.ok?"checked":""} ${BK.has(i.x)?"disabled":""}><span><b>${esc(i.x.t)}</b><small>${esc([i.x.a,BK.has(i.x)?"уже на полке":i.found?"":"нет в каталоге — добавится как есть"].filter(Boolean).join(" · "))}</small></span></label>`).join("")}</div>
   <button class="btn w" data-imp-add ${n?"":"disabled"}>Добавить: ${n} ${plural(n,"книга","книги","книг")}</button>`:`<p class="sy-msg">Не получилось разобрать ни одной строки.</p>`}
document.addEventListener("click",e=>{const t=e.target;if(!t.closest("#vshBody"))return;
  if(t.closest("[data-imp-shot]")){vClose();openAddBook("read");setTimeout(()=>{const f=$("#bPhoto");if(f)f.click()},30);return}
  const to=t.closest("[data-imp-to]");if(to){IMP.to=to.dataset.impTo;document.querySelectorAll("[data-imp-to]").forEach(b=>b.classList.toggle("on",b===to));tgHaptic();return}
  if(t.closest("[data-imp-parse]")){IMP.list=impParse($("#impT").value);impDraw();tgHaptic();return}
  if(t.closest("[data-imp-add]")){const L=IMP.list.filter(i=>i.ok&&!BK.has(i.x));const cs=checkStamps;checkStamps=()=>{};
    try{L.forEach(i=>IMP.to==="want"?BK.addWant(i.x):BK.markRead(i.x,null,true))}finally{checkStamps=cs}checkStamps(true);
    vDirty=true;vClose();toast(`Добавлено: ${L.length} ${plural(L.length,"книга","книги","книг")}`);return}});
document.addEventListener("change",e=>{const c=e.target.closest("[data-imp-i]");if(!c)return;IMP.list[+c.dataset.impI].ok=c.checked;const n=IMP.list.filter(i=>i.ok).length,b=$("[data-imp-add]");if(b){b.disabled=!n;b.textContent=`Добавить: ${n} ${plural(n,"книга","книги","книг")}`}});
// кнопка переноса — в окне «Добавить книгу» и в статистике
const _openAddBook=openAddBook;openAddBook=function(target,pre){_openAddBook(target,pre);const pb=$("#bPhotoBtn");if(pb&&!pre)pb.insertAdjacentHTML("afterend",`<button type="button" class="imp-link" id="impLink">Перенести книги из Литрес, Яндекс Книг, LiveLib…</button>`);const il=$("#impLink");if(il)il.onclick=()=>{closeSheet();setTimeout(importOpen,330)}};

// ---------- запуск ----------
if(VIEW){document.body.classList.add("viewing");REALM="books"}
setRealmUI(REALM);pickCol();buildFeed();show("col");
if(VIEW){const sp=$("#splash");if(sp)sp.remove()}else splashStart();
// заранее подтягиваем обложки всего, что лежит на полках (обеих)
setTimeout(()=>{try{[BK,FM].forEach(D=>{D.want().forEach(wantImg);D.read().forEach(wantImg)})}catch(e){}},1200);
moveLens();document.fonts&&document.fonts.ready.then(moveLens);
if(REALM==="films")loadFilms().then(()=>{if(isF()){buildFeed();refresh()}}).catch(()=>{});
const emptyAll=()=>!BOOKS.length&&!want.length&&!FSEEN.length&&!FWANT.length&&!nowBook;
if(!VIEW&&!LS.get("zal.onb",0)){if(!emptyAll())LS.set("zal.onb",1);else setTimeout(()=>{if(emptyAll()&&!LS.get("zal.onb",0))introShow()},900)}
