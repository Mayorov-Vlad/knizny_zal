// ---------- синхронизация «Норы» между Telegram и любыми браузерами ----------
// Данные живут в трёх местах: на устройстве (localStorage), в облаке Telegram (как раньше)
// и в Firestore (Google Firebase) — документ vaults/<ключ>. Ключ — длинная случайная строка:
// кто её знает, тот видит эти полки (так же устроены «ссылки для своих»). Почта и пароль
// (Firebase Auth) нужны, чтобы найти свой ключ, если Telegram недоступен: users/<uid> = {k}.
// Слияние — по ключам localStorage: у каждого ключа время последнего изменения, побеждает новее.
(function(){
const FB={apiKey:"AIzaSyD9yfazxfKpaEk1BNFDN61dEB3pfxT9cS4",projectId:"nora-ed429"};
const ON=!!(FB.apiKey&&FB.projectId);
const ls=window.localStorage,P=Storage.prototype,_set=P.setItem,_rm=P.removeItem,_get=P.getItem;
const SKIP=k=>!k||!k.startsWith("zal.")||k==="zal.img"||k==="zal.img2"||k==="zal.desc"||k==="zal.recent"||k.startsWith("zal.sync");
const jget=(k,d)=>{try{const v=_get.call(ls,k);return v?JSON.parse(v):d}catch(e){return d}};
const jset=(k,v)=>{try{_set.call(ls,k,JSON.stringify(v))}catch(e){}};
const TG=window.Telegram&&Telegram.WebApp&&Telegram.WebApp.initData?Telegram.WebApp:null;
const sp=TG&&TG.initDataUnsafe&&TG.initDataUnsafe.start_param||"";
const VIEWING=/[#&]s=/.test(location.hash)||(!!sp&&/^[23]/.test(sp));
let T=jget("zal.sync.t",null);
if(!T){T={};for(let i=0;i<ls.length;i++){const k=ls.key(i);if(!SKIP(k))T[k]=1}jset("zal.sync.t",T)}
let key=_get.call(ls,"zal.sync.k")||"",ready=false,booting=true,applying=false,timer=0,busy=false,again=false;
const S={on:ON&&!VIEWING,key:()=>key,last:+(_get.call(ls,"zal.sync.last")||0),err:"",email:_get.call(ls,"zal.sync.email")||(()=>{try{return JSON.parse(_get.call(ls,"zal.acct")||"\"\"")}catch(e){return ""}})()};
const emit=()=>{try{dispatchEvent(new Event("nsync"))}catch(e){}};
function mark(k){if(applying||SKIP(k))return;if(booting){if(!(k in T)){T[k]=0;jset("zal.sync.t",T)}return}T[k]=Date.now();jset("zal.sync.t",T);schedule(2500)}
P.setItem=function(k,v){_set.call(this,k,v);if(this===ls)mark(k)};
P.removeItem=function(k){_rm.call(this,k);if(this===ls)mark(k)};
function schedule(ms){if(!S.on)return;clearTimeout(timer);timer=setTimeout(sync,ms)}
const gen=()=>{const a=new Uint8Array(24);crypto.getRandomValues(a);return Array.from(a,b=>"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_"[b&63]).join("")+Date.now().toString(36)};
function setKey(k){key=k;_set.call(ls,"zal.sync.k",k);if(TG&&TG.CloudStorage){try{TG.CloudStorage.setItem("vk",k)}catch(e){}}emit()}
const base=()=>`https://firestore.googleapis.com/v1/projects/${FB.projectId}/databases/(default)/documents/`;
async function vaultGet(){const r=await fetch(base()+"vaults/"+key+"?key="+FB.apiKey,{cache:"no-store"});if(r.status===404)return {};if(!r.ok)throw new Error("HTTP "+r.status);
  const j=await r.json();try{return JSON.parse(j.fields.d.stringValue)||{}}catch(e){return {}}}
async function vaultPut(d){const body=JSON.stringify({fields:{d:{stringValue:JSON.stringify(d)},u:{integerValue:String(Date.now())},w:{stringValue:_get.call(ls,"zal.who")||""}}});
  if(body.length>950000)throw new Error("Слишком много данных для облака");
  const r=await fetch(base()+"vaults/"+key+"?key="+FB.apiKey,{method:"PATCH",headers:{"Content-Type":"application/json"},body});if(!r.ok)throw new Error("HTTP "+r.status)}
async function sync(){if(!S.on||!key||!ready)return;if(busy){again=true;return}busy=true;
  try{const d=await vaultGet();let changed=false,dirty=false;for(const k in d)if(SKIP(k)){delete d[k];dirty=true}applying=true;
    for(const k in d){if(SKIP(k))continue;const rt=d[k].t||0,lt=k in T?T[k]:-1;if(rt<=lt)continue;const cur=_get.call(ls,k);
      if(d[k].v!==cur){if(d[k].v==null)_rm.call(ls,k);else _set.call(ls,k,d[k].v);changed=true}T[k]=rt}
    applying=false;
    for(const k in T){if(SKIP(k))continue;const v=_get.call(ls,k);if(!d[k]||T[k]>(d[k].t||0)){d[k]={v,t:T[k]};dirty=true}}
    jset("zal.sync.t",T);if(dirty)await vaultPut(d);
    S.last=Date.now();_set.call(ls,"zal.sync.last",String(S.last));S.err="";emit();
    if(changed){try{sessionStorage.setItem("nsync.applied","1")}catch(e){}location.reload();return}}
  catch(e){applying=false;S.err=navigator.onLine===false?"нет интернета":"облако недоступно";emit();clearTimeout(timer);timer=setTimeout(sync,30000)}
  finally{busy=false;if(again){again=false;schedule(800)}}}
function start(){ready=true;sync();setTimeout(()=>{booting=false},1500)}
// ключ: из ссылки «#k=…», из облака Telegram или новый
const hk=location.hash.match(/[#&]k=([\w-]{32,})/);
if(hk){setKey(hk[1]);history.replaceState(null,"",location.pathname+location.search+location.hash.replace(/[#&]k=[\w-]+/,"").replace(/^#?$/,""))}
if(TG&&!VIEWING){const u=TG.initDataUnsafe&&TG.initDataUnsafe.user;const w=JSON.stringify(u&&String(u.username||"").toLowerCase()==="stanislava_kurdina"?"owner":"guest");if(_get.call(ls,"zal.who")!==w)ls.setItem("zal.who",w);else if(!("zal.who" in T)){T["zal.who"]=1;jset("zal.sync.t",T)}}
if(S.on){
  if(TG&&TG.CloudStorage){let done=false;const fin=()=>{if(done)return;done=true;if(!key)setKey(gen());start()};
    try{TG.CloudStorage.getItem("vk",(e,v)=>{if(!e&&v&&v.length>=32&&v!==key)setKey(v);else if(key&&v!==key){try{TG.CloudStorage.setItem("vk",key)}catch(x){}}fin()})}catch(e){fin()}
    setTimeout(fin,4000)}
  else if(key)start();else{ready=false;setTimeout(()=>{booting=false},1500)}
  addEventListener("online",()=>schedule(500));
  document.addEventListener("visibilitychange",()=>{if(document.hidden){if(timer){clearTimeout(timer);sync()}}else schedule(300)})}
else setTimeout(()=>{booting=false},1500);
// ---- вход по почте ----
async function idt(path,body){const r=await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:${path}?key=${FB.apiKey}`,{method:"POST",headers:{"Content-Type":"application/json","X-Firebase-Locale":"ru"},body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({}));if(!r.ok){const m=String((j.error&&j.error.message)||"").split(" ")[0];
    throw new Error({EMAIL_EXISTS:"На эту почту уже есть Нора — войди с её паролем",INVALID_LOGIN_CREDENTIALS:"Неверная почта или пароль",INVALID_PASSWORD:"Неверная почта или пароль",EMAIL_NOT_FOUND:"Такой почты нет",
      WEAK_PASSWORD:"Пароль слишком простой — нужно хотя бы 6 символов",INVALID_EMAIL:"Похоже, в почте опечатка",MISSING_PASSWORD:"Введи пароль",TOO_MANY_ATTEMPTS_TRY_LATER:"Слишком много попыток, попробуй позже"}[m]||"Не получилось: облако недоступно")}return j}
async function userDoc(j,method,k){const r=await fetch(base()+"users/"+j.localId,{method,headers:{"Content-Type":"application/json",Authorization:"Bearer "+j.idToken},body:method==="PATCH"?JSON.stringify({fields:{k:{stringValue:k}}}):undefined});
  if(method==="GET"){if(r.status===404)return null;if(!r.ok)throw new Error("Не получилось: облако недоступно");const x=await r.json();return x.fields&&x.fields.k&&x.fields.k.stringValue||null}
  if(!r.ok)throw new Error("Не получилось сохранить вход")}
// токен входа: храним только на этом устройстве (для записи своего профиля для друзей)
const tok={rt:_get.call(ls,"zal.sync.rt")||"",uid:_get.call(ls,"zal.sync.uid")||"",id:"",exp:0};
const keepTok=j=>{tok.rt=j.refreshToken||j.refresh_token||tok.rt;tok.uid=j.localId||j.user_id||tok.uid;tok.id=j.idToken||j.id_token||"";tok.exp=Date.now()+((+(j.expiresIn||j.expires_in)||3600)-120)*1000;
  _set.call(ls,"zal.sync.rt",tok.rt);_set.call(ls,"zal.sync.uid",tok.uid)};
S.uid=()=>tok.uid;S.hasTok=()=>!!tok.rt;
S.token=async()=>{if(tok.id&&Date.now()<tok.exp)return tok.id;if(!tok.rt)return "";const r=await fetch("https://securetoken.googleapis.com/v1/token?key="+FB.apiKey,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:"grant_type=refresh_token&refresh_token="+encodeURIComponent(tok.rt)});
  if(!r.ok)return "";keepTok(await r.json());return tok.id};
S.getProfile=async uid=>{const r=await fetch(base()+"profiles/"+uid+"?key="+FB.apiKey,{cache:"no-store"});if(r.status===404)return null;if(!r.ok)throw new Error("HTTP "+r.status);const j=await r.json(),f=j.fields||{};
  let d={};try{d=JSON.parse(f.d.stringValue)}catch(e){}return {uid,n:f.n?f.n.stringValue:"",u:f.u?+f.u.integerValue:0,...d}};
S.putProfile=async(n,d)=>{const t=await S.token();if(!t||!tok.uid)return false;const body=JSON.stringify({fields:{n:{stringValue:n},u:{integerValue:String(Date.now())},d:{stringValue:JSON.stringify(d)}}});
  if(body.length>900000)return false;const r=await fetch(base()+"profiles/"+tok.uid,{method:"PATCH",headers:{"Content-Type":"application/json",Authorization:"Bearer "+t},body});return r.ok};
const keep=email=>{S.email=email;_set.call(ls,"zal.sync.email",email);ls.setItem("zal.acct",JSON.stringify(email));emit()};
S.signUp=async(email,pw)=>{if(!key)setKey(gen());const j=await idt("signUp",{email,password:pw,returnSecureToken:true});keepTok(j);await userDoc(j,"PATCH",key);keep(email);ready=true;await sync()};
S.signIn=async(email,pw)=>{const j=await idt("signInWithPassword",{email,password:pw,returnSecureToken:true});keepTok(j);const k=await userDoc(j,"GET");
  if(k){if(k!==key)setKey(k)}else{if(!key)setKey(gen());await userDoc(j,"PATCH",key)}keep(email);ready=true;booting=false;await sync();emit()};
S.reset=email=>idt("sendOobCode",{requestType:"PASSWORD_RESET",email});
S.link=()=>key?"https://moya-nora.github.io/#k="+key:"";
S.now=()=>sync();
window.NSYNC=S;
})();
