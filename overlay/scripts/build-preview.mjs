// ساخت preview/index.html (تک‌فایلی، سه‌زبانه) از کاتالوگ، تم، پالت طلایی و پیام‌ها. اجرا: node scripts/build-preview.mjs
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const R = (p) => new URL("../" + p, import.meta.url);
const cat = JSON.parse(readFileSync(R("data/real-catalog.json"), "utf8"));
const M = JSON.parse(readFileSync(R("src/lib/i18n-messages.json"), "utf8"));
const css = readFileSync(R("src/styles/shop-theme.css"), "utf8") + readFileSync(R("src/styles/shop-gold.css"), "utf8");
const img = (f) => "data:image/webp;base64," + readFileSync(R("public/products/" + f)).toString("base64");
const products = cat.products.filter((p) => p.usd_cents && (p.images ?? []).length > 0).map((p) => ({
  slug: p.slug, name: p.name, brand: p.brand, cents: p.usd_cents, note: p.price_note === "از" ? "from" : p.price_note === "تقریبی" ? "approx" : null,
  specs: p.specs, desc: p.description ?? "", images: (p.images ?? []).map((i) => ({ src: img(i.file), alt: i.alt })),
}));
const fonts = "https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700&family=Inter:wght@400;600;700&family=Lalezar&family=Playfair+Display:wght@500;600;700&family=Vazirmatn:wght@400;600;700&display=swap";
const html = `<!doctype html><html lang="en" dir="ltr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Digital Shopping</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link rel="stylesheet" href="${fonts}">
<style>${css}
*{box-sizing:border-box}body{margin:0;line-height:1.7}
.wrap{max-width:1180px;margin:auto;padding:0 18px}.hd{display:flex;gap:12px;align-items:center;padding:12px 0;flex-wrap:wrap}
.sw{position:relative;flex:1;min-width:180px}.sw input{width:100%;padding:10px 14px;border-radius:12px;border:1px solid var(--line);background:var(--surface);color:var(--text);font:inherit}
.sg{position:absolute;inset-inline:0;top:110%;background:var(--surface);border:1px solid var(--line);border-radius:12px;overflow:hidden;display:none;z-index:40}
.sg button{display:block;width:100%;text-align:start;padding:9px 14px;border:0;background:none;color:var(--text);font:inherit;cursor:pointer}.sg button:hover{background:var(--surface-2)}
.bar{display:flex;gap:10px 14px;flex-wrap:wrap;align-items:center;padding:12px 0}.bar label{font-size:.8rem;color:var(--muted)}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:16px;padding-bottom:90px}
.hero{padding:34px 0 4px;text-align:center}.hero h1{margin:10px 0 0;font-size:clamp(1.7rem,4vw,2.5rem)}.hero p{margin:4px 0 0;color:var(--muted)}
.tag{font-size:.8rem;letter-spacing:.14em;text-transform:uppercase;color:var(--gold-text)}html[lang=fa] .tag{letter-spacing:0;text-transform:none}
.mo{position:fixed;inset:0;z-index:90;background:rgba(3,12,18,.62);overflow:auto;display:none;padding:20px 12px}
.mo>div{max-width:980px;margin:auto;background:var(--bg);border:1px solid var(--gold-line);border-radius:22px;padding:18px;position:relative}
.pg{display:grid;grid-template-columns:1.1fr 1fr;gap:20px;align-items:start}@media(max-width:760px){.pg{grid-template-columns:1fr}}
.th{display:flex;gap:8px;margin-top:10px}.th button{width:64px;height:64px;padding:4px;border-radius:12px;border:2px solid var(--line);background:var(--surface);cursor:pointer}.th button[aria-current=true]{border-color:var(--gold-1)}.th img{width:100%;height:100%;object-fit:contain}
.buy{position:sticky;top:12px;padding:18px;display:flex;flex-direction:column;gap:12px}
table{width:100%;border-collapse:collapse;font-size:.88rem}td{padding:9px 6px;border-bottom:1px solid var(--line);vertical-align:top}td:first-child{color:var(--muted);white-space:nowrap}
.x{position:absolute;top:10px;inset-inline-start:10px}.cb{position:fixed;bottom:18px;inset-inline:0;display:none;justify-content:center;z-index:50}
.cb .glass{padding:10px 16px;display:flex;gap:12px;align-items:center;border-color:var(--gold-line)}
</style></head><body><div class="scroll-progress" id="sp" aria-hidden="true"></div><div class="shop-root">
<div class="aurora" id="au" aria-hidden="true"><div class="aurora__far"></div><div class="aurora__mid"><i class="aurora__blob b1"></i><i class="aurora__blob b2"></i><i class="aurora__blob b3"></i><i class="aurora__blob b4"></i></div><div class="aurora__glow"></div><div class="aurora__noise"></div></div>
<div class="shop-content">
<header class="s-header"><div class="wrap hd"><a class="brand" href="#" aria-label="Digital Shopping">Digital Shopping</a>
<div class="sw"><input id="q" type="search" autocomplete="off"><div class="sg" id="sg"></div></div>
<div class="lang-sw" id="ls" role="group" aria-label="Language"><button data-l="en" lang="en">English</button><button data-l="fa" lang="fa">فارسی</button><button data-l="de" lang="de">Deutsch</button></div>
<button class="s-chip" id="th" style="padding:7px 12px"></button></div></header>
<main class="wrap"><section class="hero"><span class="tag" id="tg"></span><hr class="gold-rule" style="max-width:240px;margin:8px auto"><h1 class="gold-text" id="h1"></h1><p id="hp"></p></section>
<div class="bar" id="fb"></div><div class="grid" id="g"></div></main></div>
<div class="cb" id="cb"><div class="glass"><span id="cn"></span><button class="s-btn" id="co"></button></div></div>
<div class="mo" id="mo" data-native-scroll role="dialog" aria-modal="true" aria-label="Digital Shopping"><div id="md"></div></div></div>
<script>
const MSG=${JSON.stringify(M)},P=${JSON.stringify(products)};
const $=s=>document.querySelector(s),esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const S={lang:"en",q:"",brand:new Set(),max:Infinity,chip:new Set(),cmp:new Set(),open:null,theme:0};
const t=(k,v)=>{let s=(MSG[S.lang]&&MSG[S.lang][k])||MSG.en[k]||k;if(v)for(const a in v)s=s.split("{"+a+"}").join(v[a]);return s};
const usd=c=>{c=Math.round(c);const d=c%100===0?0:2;return new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:d,maximumFractionDigits:d}).format(c/100)};
const ICON={display:"▣",cpu:"⚙",gpu:"◈",ram:"◧",storage:"⛁",camera:"◉",front_camera:"◎",battery:"▮",os:"✦",weight:"⚖",thickness:"▭",sim:"▤",pen:"✎",body:"▦",ports:"⌁",cooling:"❄"};
const uniq=a=>[...new Set(a)];
const chipsAll=p=>{const o=[],r=String(p.specs.ram||"").match(/\\d+\\s?GB/);if(r)o.push("ram|"+r[0].replace(/\\s/,""));uniq((String(p.specs.storage||"").match(/\\d+\\s?(?:GB|TB)/g)||[]).map(x=>x.replace(/\\s/,""))).forEach(x=>o.push("st|"+x));const g=String(p.specs.gpu||"").match(/RTX \\d+/);if(g)o.push("gpu|"+g[0]);return o};
const lab=id=>{const[k,v]=id.split("|");return k==="gpu"?v:t(k==="ram"?"ram":"storage")+" "+v};
const chips=p=>chipsAll(p).slice(0,3);
const price=(p,lg)=>'<div class="s-price'+(lg?' s-price--lg':'')+'">'+(p.note?'<span class="s-price__from">'+t(p.note)+'</span>':'')+'<span class="s-price__v" dir="ltr">'+usd(p.cents)+'</span></div>';
const maxP=Math.max(...P.map(p=>p.cents)),brands=uniq(P.map(p=>p.brand)),allChips=uniq(P.flatMap(chipsAll)).sort();
function filters(){$("#fb").innerHTML='<span>'+brands.map(b=>'<button class="s-chip" data-b="'+esc(b)+'" aria-pressed="'+S.brand.has(b)+'">'+esc(b)+'</button>').join(" ")+'</span><label>'+t("maxPrice")+': <b dir="ltr" id="mv">'+usd(S.max===Infinity?maxP:S.max)+'</b> <input id="mr" type="range" min="50000" max="'+maxP+'" step="5000" value="'+(S.max===Infinity?maxP:S.max)+'"></label><span>'+allChips.map(c=>'<button class="s-chip" data-c="'+esc(c)+'" aria-pressed="'+S.chip.has(c)+'">'+esc(lab(c))+'</button>').join(" ")+'</span>'}
function list(){return P.filter(p=>(!S.q||(p.name+p.brand).toLowerCase().includes(S.q))&&(!S.brand.size||S.brand.has(p.brand))&&p.cents<=S.max&&[...S.chip].every(c=>chipsAll(p).includes(c)))}
function card(p,n){const i=p.images[0];return '<div class="reveal" style="--d:'+Math.min(n%4*70,210)+'ms"><a href="#" class="s-card" data-s="'+esc(p.slug)+'"><div class="s-media">'+(i?'<img loading="lazy" src="'+i.src+'" alt="'+esc(i.alt)+'">':'')+'</div><span class="s-price__from">'+esc(p.brand)+'</span><h3 style="font-size:.98rem;margin:0;line-height:1.5" dir="auto">'+esc(p.name)+'</h3><div style="display:flex;gap:6px;flex-wrap:wrap">'+chips(p).map(c=>'<span class="s-chip">'+esc(lab(c))+'</span>').join("")+'</div>'+price(p)+'</a></div>'}
let lastF=null;let io;function reveal(){io&&io.disconnect();io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add("in");io.unobserve(e.target)}}),{rootMargin:"0px 0px -6% 0px"});document.querySelectorAll(".reveal:not(.in):not(.reveal--pending)").forEach(el=>{if(reduce||el.getBoundingClientRect().top<innerHeight*.92)return;el.classList.add("reveal--pending");io.observe(el)})}
function render(){const l=list();$("#g").innerHTML=l.length?l.map(card).join(""):'<p>'+t("none")+'</p>';reveal()}
function skel(){$("#g").innerHTML=Array(8).fill('<div class="s-card" aria-hidden="true"><div class="skeleton" style="aspect-ratio:1"></div><div class="skeleton" style="height:14px;width:40%"></div><div class="skeleton" style="height:18px;width:85%"></div><div class="skeleton" style="height:26px;width:55%"></div></div>').join("")}
function bar(){$("#cb").style.display=S.cmp.size?"flex":"none";$("#cn").textContent=t("cmpCount",{n:S.cmp.size})}
function summary(p){if(S.lang==="fa")return p.desc;const s=p.specs,o=[s.display,s.cpu,s.gpu,s.ram&&t("spec.ram")+" "+s.ram,s.storage&&t("spec.storage")+" "+s.storage].filter(Boolean).slice(0,4);return t("lead")+": "+o.join(" · ")}
function open(slug){const p=P.find(x=>x.slug===slug);if(!p)return;S.open=slug;$("#sg").style.display="none";
$("#md").innerHTML='<button class="s-btn s-btn--ghost x" id="cl">'+t("close")+' ✕</button><div class="pg" style="margin-top:44px"><div><div class="s-media" style="border-radius:20px"><img id="big" src="'+(p.images[0]?p.images[0].src:"")+'" alt="'+esc(p.images[0]?p.images[0].alt:p.name)+'"></div><div class="th">'+p.images.map((i,n)=>'<button data-i="'+n+'" aria-current="'+(n==0)+'"><img src="'+i.src+'" alt=""></button>').join("")+'</div></div><div class="glass buy"><span class="s-price__from">'+esc(p.brand)+'</span><h2 style="margin:0;font-size:1.3rem" dir="auto">'+esc(p.name)+'</h2>'+price(p,1)+'<div style="display:flex;gap:6px;flex-wrap:wrap">'+chips(p).map(c=>'<span class="s-chip">'+esc(lab(c))+'</span>').join("")+'</div><button class="s-btn">'+t("add")+'</button><button class="s-btn s-btn--ghost" id="cp">'+t(S.cmp.has(slug)?"cmpDel":"cmpAdd")+'</button></div></div><hr class="gold-rule"><p style="margin:14px 0" dir="auto">'+esc(summary(p))+'</p><table>'+Object.entries(p.specs).map(([k,v])=>'<tr><td>'+(ICON[k]||"•")+" "+(MSG.en["spec."+k]?t("spec."+k):esc(k))+'</td><td dir="auto">'+esc(v)+'</td></tr>').join("")+'</table>';
$("#mo").style.display="block";document.body.style.overflow="hidden";if(!lastF)lastF=document.activeElement;$("#cl").focus();
$("#cl").onclick=close;$("#md").onclick=e=>{const b=e.target.closest(".th button");if(b){const i=p.images[+b.dataset.i];$("#big").src=i.src;document.querySelectorAll(".th button").forEach(x=>x.setAttribute("aria-current",x===b))}};
$("#cp").onclick=()=>{S.cmp.has(slug)?S.cmp.delete(slug):S.cmp.size<3&&S.cmp.add(slug);open(slug);bar()}}
function close(){S.open=null;$("#mo").style.display="none";document.body.style.overflow="";if(lastF&&lastF.focus)lastF.focus();lastF=null}
function lang(l){S.lang=l;try{localStorage.setItem("lang",l)}catch(e){}document.documentElement.lang=l;document.documentElement.dir=l==="fa"?"rtl":"ltr";
$("#q").placeholder=t("search");$("#tg").textContent=t("tagline");$("#h1").textContent=t("heroTitle");$("#hp").textContent=t("heroSub");$("#co").textContent=t("cmpBtn");
$("#th").textContent=t(["themeAuto","themeLight","themeDark"][S.theme]);document.querySelectorAll("#ls button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.l===l));
filters();render();bar();if(S.open)open(S.open)}
$("#ls").onclick=e=>{const b=e.target.closest("button");b&&lang(b.dataset.l)};
$("#fb").onclick=e=>{const b=e.target.closest("button");if(!b)return;const on=b.getAttribute("aria-pressed")!=="true";b.setAttribute("aria-pressed",on);const k=b.dataset.b?S.brand:S.chip,s=b.dataset.b||b.dataset.c;on?k.add(s):k.delete(s);render()};
$("#fb").oninput=e=>{if(e.target.id!=="mr")return;S.max=+e.target.value;$("#mv").textContent=usd(S.max);render()};
$("#q").oninput=e=>{S.q=e.target.value.trim().toLowerCase();render();const m=S.q?P.filter(p=>p.name.toLowerCase().includes(S.q)).slice(0,5):[];$("#sg").style.display=m.length?"block":"none";$("#sg").innerHTML=m.map(p=>'<button data-s="'+esc(p.slug)+'">'+esc(p.name)+'</button>').join("")};
$("#mo").onclick=e=>{if(e.target.id==="mo")close()};
$("#co").onclick=()=>{const l=P.filter(p=>S.cmp.has(p.slug)),ks=uniq(l.flatMap(p=>Object.keys(p.specs)));S.open=null;$("#md").innerHTML='<button class="s-btn s-btn--ghost x" id="cl">'+t("close")+' ✕</button><div style="margin-top:44px;overflow-x:auto"><table><tr><td></td>'+l.map(p=>'<td><b dir="auto">'+esc(p.name)+'</b><br><span dir="ltr">'+usd(p.cents)+'</span></td>').join("")+'</tr>'+ks.map(k=>'<tr><td>'+(MSG.en["spec."+k]?t("spec."+k):esc(k))+'</td>'+l.map(p=>'<td dir="auto">'+esc(p.specs[k]||"—")+'</td>').join("")+'</tr>').join("")+'</table></div>';$("#mo").style.display="block";document.body.style.overflow="hidden";if(!lastF)lastF=document.activeElement;$("#cl").focus();$("#cl").onclick=close};
document.addEventListener("click",e=>{const a=e.target.closest("[data-s]");if(a){e.preventDefault();open(a.dataset.s)}});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&$("#mo").style.display==="block")close()});
$("#th").onclick=()=>{S.theme=(S.theme+1)%3;S.theme?document.documentElement.dataset.theme=S.theme==1?"light":"dark":document.documentElement.removeAttribute("data-theme");$("#th").textContent=t(["themeAuto","themeLight","themeDark"][S.theme])};
/* پارالکس، نور موس، اسکرول نرم، نوار پیشرفت */
const root=document.documentElement,au=$("#au"),reduce=matchMedia("(prefers-reduced-motion: reduce)").matches,fine=matchMedia("(hover:hover) and (pointer:fine)").matches;
if(!reduce&&fine){au.setAttribute("data-live","");let r=0,x=0,y=0;addEventListener("pointermove",e=>{x=e.clientX;y=e.clientY;r||(r=requestAnimationFrame(()=>{r=0;au.style.setProperty("--mx",x+"px");au.style.setProperty("--my",y+"px");au.style.setProperty("--px",(x/innerWidth*2-1).toFixed(3));au.style.setProperty("--py",(y/innerHeight*2-1).toFixed(3))}))},{passive:true})}
const prog=()=>{const m=root.scrollHeight-innerHeight;root.style.setProperty("--sp",m>0?Math.min(1,scrollY/m):0)};addEventListener("scroll",prog,{passive:true});
if(!reduce&&fine){let tg=scrollY,cur=tg,raf=0;const mx=()=>Math.max(0,root.scrollHeight-innerHeight);const tick=()=>{cur+=(tg-cur)*.085;if(Math.abs(tg-cur)<.4){cur=tg;raf=0}else raf=requestAnimationFrame(tick);scrollTo(0,cur)};
const nat=n=>{for(;n&&n.nodeType===1&&n!==document.body&&n!==root;n=n.parentElement){if(n.hasAttribute("data-native-scroll"))return true;const o=getComputedStyle(n).overflowY;if((o==="auto"||o==="scroll")&&n.scrollHeight>n.clientHeight+1)return true}return false};
addEventListener("wheel",e=>{if(e.defaultPrevented||e.ctrlKey||e.metaKey||Math.abs(e.deltaX)>Math.abs(e.deltaY)||getComputedStyle(document.body).overflow==="hidden"||nat(e.target))return;e.preventDefault();tg=Math.max(0,Math.min(mx(),tg+e.deltaY*(e.deltaMode===1?32:e.deltaMode===2?innerHeight:1)));raf||(raf=requestAnimationFrame(tick))},{passive:false});
addEventListener("scroll",()=>{if(Math.abs(scrollY-cur)>2){cancelAnimationFrame(raf);raf=0;tg=cur=scrollY}},{passive:true});addEventListener("resize",()=>{prog();tg=Math.min(tg,mx())})}
const nav=(()=>{try{return localStorage.getItem("lang")}catch(e){}})()||navigator.language.slice(0,2);
skel();lang(Object.prototype.hasOwnProperty.call(MSG,nav)?nav:"en");skel();setTimeout(render,650);
</script></body></html>`;
mkdirSync(R("preview"), { recursive: true });
writeFileSync(R("preview/index.html"), html);
console.log("preview/index.html", (html.length / 1024).toFixed(0) + "KB,", products.length, "products");
