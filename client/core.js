const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const r2=n=>Math.round((n+Number.EPSILON)*100)/100;
const fmt=(n,d=2)=>(n==null||isNaN(n))?'—':Number(n).toLocaleString('ro-RO',{minimumFractionDigits:d,maximumFractionDigits:d});
const eur=n=>fmt(n)+' €', ron=n=>fmt(n)+' lei';
const todayS=()=>new Date().toLocaleDateString('sv');
const fdate=d=>d?String(d).split('-').reverse().join('.'):'—';
const dayNum=d=>{const [y,m,x]=d.split('-').map(Number);return Date.UTC(y,m-1,x)/864e5};
const addDays=(d,n)=>{const t=new Date((dayNum(d)+n)*864e5);return t.toISOString().slice(0,10)};
const daysTo=d=>Math.round(dayNum(d)-dayNum(todayS()));
const norm=s=>String(s||'').toUpperCase().replace(/\s+/g,'');
const sum=(a,f)=>a.reduce((s,x)=>s+(f(x)||0),0);
const DEF={hexAdv:10,markup:15,termDays:5,adv:20,comm:50,vat:21,hexDays:90,series:'WMP',coName:'WIZ MOBILE SRL',coCui:'RO32753481',coReg:'J35/252/2014',coAddr:'Sat Dumbravita, Com. Dumbravita, Str. Liliacului nr. 1, ap. 8, jud. Timis',coBank:'',coIban:'',coEmail:'',coPhone:'',hxName:'HEXING TECHNOLOGIES EUROPE SRL',hxCui:'RO48648032',hxReg:'J2024000246352 /19.01.2024',hxAddr:'Sat Giarmata, Com. Giarmata, Dj 691 Km 8 + 775 M Dreapta, jud. Timis',hxContact:'Ioana Vaidean, 0742 058 188'};
const KEYS=['products','agents','orders','payments','hexing','cinv','cfg'];
const defExit=p=>p.exit!=null?p.exit:(p.entry!=null?r2(p.entry*(1+S.cfg.markup/100)):'');
const entOf=l=>l.entryEur!=null?l.entryEur:((prod(l.productId)||{}).entry??0);
const mkOf=l=>{const e=entOf(l),u=+l.unitEur;return e>0&&u>0?r2((u/e-1)*100):''};
const S={products:[],agents:[],orders:[],payments:[],hexing:[],cinv:[],cfg:{...DEF}};
const loaded={};let db=null,assets=null,downloads=null,canWrite=true;
const ui={rm:todayS().slice(0,7),tab:'orders',filter:'all',q:'',pq:'',pcat:'',hq:'',sOnly:true,live:null};
try{const t=localStorage.getItem('cl-tab');if(t)ui.tab=t}catch(e){}
let drafts={};

function toast(m,bad){const t=$('#toast');t.textContent=m;t.hidden=false;t.style.background=bad?'var(--bad)':'';t.style.color=bad?'#fff':'';clearTimeout(toast.h);toast.h=setTimeout(()=>t.hidden=true,3200)}
const val=(id,def='')=>drafts[id]!==undefined?drafts[id]:def;
document.addEventListener('input',e=>{if(e.target.id)drafts[e.target.id]=e.target.type==='checkbox'?e.target.checked:e.target.value});

/* ---------- parsing / validation ---------- */
function num(s){if(typeof s==='number')return s;s=String(s??'').replace(/[^\d.,-]/g,'');if(!s)return NaN;
  const lc=s.lastIndexOf(','),ld=s.lastIndexOf('.');
  if(lc>-1&&ld>-1){s=lc>ld?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'')}
  else if(lc>-1){s=/^-?\d{1,3}(,\d{3})+$/.test(s)?s.replace(/,/g,''):s.replace(',','.')}
  return parseFloat(s)}
function validCUI(s){s=String(s).toUpperCase().replace(/\s/g,'').replace(/^RO/,'');if(!/^\d{2,10}$/.test(s))return false;
  const key='753217532',body=s.slice(0,-1).padStart(9,'0');let t=0;for(let i=0;i<9;i++)t+=body[i]*key[i];let c=t*10%11;if(c===10)c=0;return c==s.slice(-1)}
function validCNP(s){if(!/^\d{13}$/.test(s))return false;const k='279146358279';let t=0;for(let i=0;i<12;i++)t+=s[i]*k[i];let c=t%11;if(c===10)c=1;return c==s[12]}
function idCheck(s){s=String(s||'').trim();if(!s)return null;if(/^\d{13}$/.test(s))return validCNP(s)?{ok:1,t:'CNP valid'}:{ok:0,t:'CNP cu cifră de control greșită'};
  return validCUI(s)?{ok:1,t:'CUI valid'}:{ok:0,t:'CUI/CNP invalid (cifra de control nu se potrivește)'}}

/* ---------- catalogue ---------- */
const prod=id=>S.products.find(p=>p.id===id);
const plabel=p=>`#${p.nr} ${p.code?p.code+' · ':''}${p.name}`;
function findProduct(t){t=String(t||'').trim();if(!t)return null;
  let p=S.products.find(p=>plabel(p)===t)||S.products.find(p=>p.code&&norm(p.code)===norm(t))||S.products.find(p=>norm(p.name)===norm(t));
  if(!p)p=S.products.find(q=>(q.aliases||[]).some(a=>norm(a)===norm(t)))||null;
  if(!p){const n=norm(t);let best=null;S.products.forEach(q=>{const k=norm(q.code);if(k.length>=6&&n.startsWith(k)&&/^R\d{4,6}$/.test(n.slice(k.length))&&(!best||k.length>norm(best.code).length))best=q});p=best}
  return p||null}
function catalogue(){$('#plist').innerHTML=S.products.slice().sort((a,b)=>a.nr-b.nr).map(p=>`<option value="${esc(plabel(p))}"></option>`).join('')}

/* ---------- order maths ---------- */
function payOf(o){return S.payments.filter(p=>p.orderId===o.id)}
function calcOrder(o){
  const vatR=o.vatRate??S.cfg.vat, rate=+o.rate||0;
  let net=0,netEur=0,entryEur=0,comEur=0,neg=false;
  const lines=(o.lines||[]).map(l=>{
    const q=+l.qty||0,u=+l.unitEur||0,p=prod(l.productId);
    const ent=l.entryEur!=null?l.entryEur:(p&&p.entry!=null?p.entry:0);
    const unitRon=r2(u*rate), valRon=r2(q*unitRon), valEur=r2(q*u);
    const mar=r2(q*(u-ent)); if(mar<0)neg=true;
    net+=valRon;netEur+=valEur;entryEur+=q*ent;comEur+=mar*S.cfg.comm/100;
    return {...l,q,u,p,ent,unitRon,valRon,valEur,mar}});
  net=r2(net);const vat=r2(net*vatR/100),total=r2(net+vat),advPct=+(o.advPct??S.cfg.adv),advance=r2(total*advPct/100);
  const pays=payOf(o).sort((a,b)=>(a.date||'').localeCompare(b.date||'')),paid=r2(sum(pays,x=>x.amount));
  const rest=r2(Math.max(0,total-paid)), full=total>0&&paid>=total-0.005, advOk=paid>=advance-0.005;
  const marEur=r2(netEur-entryEur), comE=r2(comEur), comRon=r2(comE*rate);
  const inv=S.cinv.filter(x=>x.orderId===o.id),invQ={},ordQ={};
  inv.forEach(x=>(x.lines||[]).forEach(l=>{invQ[l.productId]=(invQ[l.productId]||0)+(+l.qty||0)}));
  (o.lines||[]).forEach(l=>{ordQ[l.productId]=(ordQ[l.productId]||0)+(+l.qty||0)});
  const anyInv=Object.values(invQ).some(v=>v>0),allInv=Object.keys(ordQ).length>0&&Object.keys(ordQ).every(k=>(invQ[k]||0)>=ordQ[k]);
  let st=allInv?'final':anyInv?'part':full?'full':advOk?'adv':'wait';
  const termDays=Math.round(+(o.termDays??S.cfg.termDays)),due=o.date?addDays(o.date,termDays):'';
  return {advPct,inv,invQ,ordQ,allInv,termDays,due,lines,net,vat,vatR,total,advance,pays,paid,rest,full,advOk,marEur,comEur:comE,comRon,neg,netEur,st,
    advLeft:r2(Math.max(0,advance-paid))}}
const ST={part:['acc','Parțial facturat'],wait:['warn','Așteaptă avansul'],adv:['info','Avans achitat'],full:['ok','Achitat integral'],final:['acc','Facturat final']};
const badge=(k,t)=>`<span class="badge ${k}">${esc(t)}</span>`;
const stBadge=c=>badge(...ST[c.st]);
const agentName=id=>(S.agents.find(a=>a.id===id)||{}).name||'—';

/* ---------- Hexing verification ---------- */
function verifyHex(h){
  const iss=[],ln=[];const L=h.lines||[];
  const imp=L.map(l=>{const p=prod(l.productId);return p&&p.entry>0&&l.unit>0?l.unit/p.entry:null}).filter(x=>x!=null).sort((a,b)=>a-b);
  const med=imp.length?imp[Math.floor((imp.length-1)/2)]:null;
  const given=+h.rate>0?+h.rate:0,ref=given||med;
  L.forEach((l,i)=>{const p=prod(l.productId),m=[];
    if(!(l.qty>0)||!Number.isInteger(+l.qty))m.push(['bad','Cantitate invalidă']);
    if(!(l.unit>0))m.push(['bad','Preț lipsă']);
    if(!p)m.push(['bad',`Cod necunoscut în lista de produse (${l.code||'fără cod'})`]);
    else if(p.entry==null)m.push(['warn','Produsul nu are preț de intrare în listă']);
    else if(l.unit>0&&ref){const exp=r2(p.entry*ref),tol=Math.max(0.02,exp*0.002);
      if(Math.abs(l.unit-exp)>tol){const ir=l.unit/p.entry;
        m.push(['bad',given?`Preț ${ron(l.unit)} diferit de ${ron(exp)} (intrare ${eur(p.entry)} × curs ${fmt(given,4)}); curs implicit ${fmt(ir,4)}`:`Curs implicit ${fmt(ir,4)} diferit de al celorlalte rânduri (${fmt(med,4)}); preț așteptat ${ron(exp)}`])}}
    ln.push(m);m.forEach(x=>iss.push({sev:x[0],t:`Rând ${i+1}: `+x[1]}))});
  if(!given&&med)iss.push({sev:'info',t:`Curs implicit EUR/RON calculat din prețuri: ${fmt(med,4)}. Introdu cursul de pe factură pentru o verificare exactă.`});
  const calc=r2(sum(L,l=>l.qty*l.unit));
  if(h.total!=null&&h.total!==''&&Math.abs(calc-h.total)>0.02)iss.push({sev:'bad',t:`Totalul declarat ${ron(h.total)} nu corespunde cu suma rândurilor ${ron(calc)}`});
  if(!L.length)iss.push({sev:'warn',t:'Documentul nu are rânduri introduse, deci prețurile nu pot fi verificate'});
  if(!h.fileUrl)iss.push({sev:'warn',t:'Nu este atașat fișierul PDF al documentului'});
  if(S.hexing.some(x=>x.id!==h.id&&x.kind===h.kind&&norm(x.number)===norm(h.number)))iss.push({sev:'warn',t:'Există deja un document de același tip cu acest număr'});
  if(h.kind==='final'&&h.refId){const r=S.hexing.find(x=>x.id===h.refId);
    if(r){const by=a=>{const m={};(a||[]).forEach(l=>{const k=l.productId||norm(l.code);m[k]=m[k]||{q:0,u:l.unit};m[k].q+=+l.qty});return m};
      const A=by(r.lines),B=by(h.lines);
      Object.keys(A).forEach(k=>{const n=(prod(k)||{}).name||k;if(!B[k])iss.push({sev:'warn',t:`Încă nelivrat din proformă: ${n} (${A[k].q} buc.)`});
        else{if(B[k].q>A[k].q)iss.push({sev:'bad',t:`${n}: cantitate ${B[k].q} în factură, mai mare decât ${A[k].q} în proformă`});else if(B[k].q<A[k].q)iss.push({sev:'warn',t:`${n}: livrare parțială, ${B[k].q} din ${A[k].q} buc. din proformă`});
          if(Math.abs(A[k].u-B[k].u)>0.005)iss.push({sev:'bad',t:`${n}: preț ${ron(B[k].u)} în factură față de ${ron(A[k].u)} în proformă`})}});
      Object.keys(B).forEach(k=>{if(!A[k])iss.push({sev:'bad',t:`În factură, dar nu în proformă: ${(prod(k)||{}).name||k}`})})}}
  if(h.kind==='final'&&h.dueDate&&h.date&&h.dueDate!==addDays(h.date,S.cfg.hexDays))iss.push({sev:'warn',t:`Scadența de pe factură (${fdate(h.dueDate)}) diferă de data facturii + ${S.cfg.hexDays} zile (${fdate(addDays(h.date,S.cfg.hexDays))})`});
  if(h.totalVat!==''&&h.totalVat!=null&&h.total!==''&&h.total!=null&&Math.abs(r2(h.total*(1+S.cfg.vat/100))-h.totalVat)>0.05)iss.push({sev:'warn',t:`Totalul cu TVA ${ron(h.totalVat)} nu corespunde cu totalul fără TVA plus TVA ${S.cfg.vat}%`});
  if(h.kind==='proforma'&&+h.advance>0){const e=hexAdvDue(h);if(Math.abs(e-h.advance)>1)iss.push({sev:'warn',t:`Avansul plătit ${ron(h.advance)} diferă de ${S.cfg.hexAdv}% din proformă (${ron(e)})`})}
  if(h.kind==='final'&&+h.advance>0&&h.refId){const r=S.hexing.find(x=>x.id===h.refId);if(r&&+r.advance>0&&Math.abs(r.advance-h.advance)>0.01)iss.push({sev:'bad',t:`Avansul scăzut în factură (${ron(h.advance)}) diferă de avansul plătit pe proformă (${ron(r.advance)})`})}
  const errs=iss.filter(x=>x.sev==='bad').length,warns=iss.filter(x=>x.sev==='warn').length;
  return {iss,ln,calc,errs,warns,med,given}}
const hexDue=h=>h.kind==='final'&&h.date?(h.dueDate||addDays(h.date,S.cfg.hexDays)):null;
const vBadge=v=>v.errs?badge('bad',`${v.errs} ${v.errs===1?'problemă':'probleme'}`):v.warns?badge('warn',`${v.warns} ${v.warns===1?'avertisment':'avertismente'}`):badge('ok','Verificat, fără diferențe');

/* ---------- stock ---------- */
function stock(){
  const del={},open={};
  S.cinv.forEach(x=>(x.lines||[]).forEach(l=>{del[l.productId]=(del[l.productId]||0)+(+l.qty||0)}));
  S.orders.forEach(o=>{const c=calcOrder(o);Object.keys(c.ordQ).forEach(k=>{open[k]=(open[k]||0)+Math.max(0,c.ordQ[k]-(c.invQ[k]||0))})});
  return S.products.map(p=>{
    const rec=sum(S.hexing.filter(h=>h.kind==='final'),h=>sum((h.lines||[]).filter(l=>l.productId===p.id),l=>+l.qty));
    const d=del[p.id]||0,op=open[p.id]||0,st=rec-d;
    return {p,rec,del:d,open:op,st,need:Math.max(0,op-Math.max(0,st))}}).filter(x=>x.rec||x.del||x.open)}

/* ---------- client invoice verification ---------- */
function verifyCinv(x){
  const iss=[],ln=[],L=x.lines||[];const o=S.orders.find(o=>o.id===x.orderId);
  if(!o)iss.push({sev:'bad',t:'Factura nu este legată de o comandă'});
  const c=o?calcOrder(o):null;
  const others={};S.cinv.filter(y=>y.id!==x.id&&y.orderId===x.orderId).forEach(y=>(y.lines||[]).forEach(l=>{others[l.productId]=(others[l.productId]||0)+(+l.qty||0)}));
  const mine={};L.forEach(l=>{mine[l.productId]=(mine[l.productId]||0)+(+l.qty||0)});
  L.forEach((l,i)=>{const m=[],p=prod(l.productId);
    if(!(l.qty>0)||!Number.isInteger(+l.qty))m.push(['bad','Cantitate invalidă']);
    if(!p)m.push(['bad','Produs necunoscut în lista de produse']);
    else if(c){const ol=c.lines.find(z=>z.productId===l.productId);
      if(!ol)m.push(['bad','Produsul nu face parte din comandă']);
      else{if(Math.abs(l.unit-ol.unitRon)>0.01)m.push(['bad',`Preț ${ron(l.unit)} diferit de proformă ${ron(ol.unitRon)}`]);
        const tot=(others[l.productId]||0)+mine[l.productId];if(tot>c.ordQ[l.productId])m.push(['bad',`Cantitate facturată în total ${tot}, peste cantitatea comandată ${c.ordQ[l.productId]}`])}}
    ln.push(m);m.forEach(z=>iss.push({sev:z[0],t:`Rând ${i+1}: ${z[1]}`}))});
  const calc=r2(sum(L,l=>l.qty*l.unit));
  if(x.total!==''&&x.total!=null&&Math.abs(calc-x.total)>0.02)iss.push({sev:'bad',t:`Totalul declarat ${ron(x.total)} nu corespunde cu suma rândurilor ${ron(calc)}`});
  if(x.totalVat!==''&&x.totalVat!=null&&x.total!==''&&x.total!=null&&Math.abs(r2(x.total*(1+(c?c.vatR:S.cfg.vat)/100))-x.totalVat)>0.05)iss.push({sev:'warn',t:`Totalul cu TVA ${ron(x.totalVat)} nu corespunde cu totalul fără TVA plus TVA`});
  if(c&&!c.full)iss.push({sev:'warn',t:`Clientul nu a achitat integral proforma (rest ${ron(c.rest)}). Restul se încasează înainte de factura finală.`});
  if(!L.length)iss.push({sev:'warn',t:'Factura nu are rânduri introduse, deci nu scade din stoc'});
  if(!x.fileUrl)iss.push({sev:'warn',t:'Nu este atașat fișierul PDF al facturii'});
  if(S.cinv.some(y=>y.id!==x.id&&norm(y.number)===norm(x.number)))iss.push({sev:'warn',t:'Există deja o factură cu acest număr'});
  const errs=iss.filter(z=>z.sev==='bad').length,warns=iss.filter(z=>z.sev==='warn').length;
  return {iss,ln,calc,errs,warns}}
