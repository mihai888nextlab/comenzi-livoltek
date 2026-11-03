/* ---------- shell ---------- */
const TABS=[['orders','Comenzi'],['cinv','Facturi clienți'],['hexing','Facturi Hexing'],['stock','Stoc'],['report','Raport lunar'],['agents','Agenți'],['products','Produse'],['settings','Setări']];
function renderNav(){$('#nav').innerHTML=TABS.map(([k,t])=>`<button data-act="tab" data-v="${k}" aria-current="${ui.tab===k}">${t}</button>`).join('')}
let rq=0;function render(){cancelAnimationFrame(rq);rq=requestAnimationFrame(()=>{
  if(!db){$('#view').innerHTML=`<div class="empty"><b>Datele nu sunt disponibile</b>Conexiunea la baza de date nu este disponibilă. Reîncarcă pagina.</div>`;return}
  if(!KEYS.every(k=>loaded[k])){return}
  renderNav();catalogue();$('#sub').textContent=`${S.cfg.coName||'Wiz Mobile'} · prețuri în € fără TVA`;
  const y=window.scrollY;const a=document.activeElement;const aid=a&&a.id&&$('#view').contains(a)?a.id:null,pos=aid?a.selectionStart:null;
  $('#view').innerHTML=({orders:vOrders,report:vReport,cinv:vCinv,hexing:vHexing,stock:vStock,agents:vAgents,products:vProducts,settings:vSettings})[ui.tab]();
  if(aid){const n=document.getElementById(aid);if(n){n.focus();try{n.setSelectionRange(pos,pos)}catch(e){}}}
  window.scrollTo(0,y);
  if(ui.live)refreshLive()})}

/* ---------- drawer ---------- */
function openDrawer(html,live){drafts=live?drafts:{};ui.live=live||null;$('#drawer').innerHTML=html;$('#scrim').hidden=false;$('#drawer').scrollTop=0;document.body.style.overflow='hidden'}
function closeDrawer(){$('#scrim').hidden=true;ui.live=null;drafts={};document.body.style.overflow=''}
function refreshLive(){if(!ui.live)return;const top=$('#drawer').scrollTop;const h=ui.live();if(h==null){closeDrawer();return}$('#drawer').innerHTML=h;$('#drawer').scrollTop=top}
function openLive(fn){drafts={};ui.live=fn;$('#drawer').innerHTML=fn();$('#scrim').hidden=false;$('#drawer').scrollTop=0;document.body.style.overflow='hidden'}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#scrim').hidden)closeDrawer()});
$('#scrim').addEventListener('mousedown',e=>{if(e.target.id==='scrim')closeDrawer()});

/* ---------- ORDERS list ---------- */
function vOrders(){
  const rows=S.orders.map(o=>({o,c:calcOrder(o)}));
  const q=ui.q.toLowerCase();
  const f=rows.filter(({o,c})=>(ui.filter==='all'||c.st===ui.filter)&&(!q||[o.clientName,o.clientId,o.number,agentName(o.agentId)].join(' ').toLowerCase().includes(q)))
    .sort((a,b)=>(b.o.date||'').localeCompare(a.o.date||'')||String(b.o.number).localeCompare(String(a.o.number)));
  const open=rows.filter(r=>r.c.st!=='final');
  const toCollect=sum(open,r=>r.c.rest);
  const comDue=sum(rows.filter(r=>r.c.full&&!r.o.commissionPaidDate),r=>r.c.comRon);
  const hexOpen=S.hexing.filter(h=>h.kind==='final'&&!h.paidDate);
  const hexSum=sum(hexOpen,hexOwed)+sum(S.hexing.filter(h=>h.kind==='proforma'&&!(+h.advance>0)&&!S.hexing.some(f=>f.refId===h.id)),hexAdvDue);
  const next=hexOpen.map(hexDue).filter(Boolean).sort()[0];
  const chips=[['all','Toate'],['wait','Așteaptă avans'],['adv','Avans achitat'],['full','Achitate integral'],['part','Parțial facturate'],['final','Facturate integral']];
  return `<div class="stats">
    <div><span>Comenzi în lucru</span><b>${open.length}</b></div>
    <div><span>De încasat de la clienți (cu TVA)</span><b>${ron(toCollect)}</b></div>
    <div><span>Comision de plătit agenților</span><b>${ron(comDue)}</b></div>
    <div><span>De plătit către Hexing${next?` · scadent ${fdate(next)}`:''}</span><b>${ron(hexSum)}</b></div></div>
  <div class="bar"><h2 class="grow">Comenzi clienți</h2><button class="btn pri" data-act="new-order">Comandă nouă</button></div>
  <div class="bar"><div class="chips">${chips.map(([k,t])=>`<button class="chip" data-act="filter" data-v="${k}" aria-pressed="${ui.filter===k}">${t}</button>`).join('')}</div>
    <input id="oq" class="grow" style="max-width:300px;margin-left:auto" placeholder="Caută client, CUI, nr. proformă, agent" value="${esc(ui.q)}" data-act-input="oq"></div>
  ${f.length?`<div class="tbl"><table><thead><tr><th>Proformă</th><th>Data</th><th>Client</th><th>Agent</th><th class="r">Total cu TVA</th><th class="r">Încasat</th><th class="r">Rest</th><th>Stare</th></tr></thead><tbody>
  ${f.map(({o,c})=>`<tr class="click" data-act="order" data-id="${o.id}"><td class="mono">${esc(o.number)}</td><td class="num">${fdate(o.date)}</td>
    <td><b>${esc(o.clientName)}</b><div class="muted small mono">${esc(o.clientId)}</div></td><td>${esc(agentName(o.agentId))}</td>
    <td class="r num">${ron(c.total)}</td><td class="r num">${ron(c.paid)}</td><td class="r num">${c.rest>0?ron(c.rest):'—'}${c.rest>0&&c.st!=='final'&&c.due?`<div class="small" style="color:${daysTo(c.due)<0?'var(--bad)':'var(--muted)'}">scadent ${fdate(c.due)}</div>`:''}</td><td>${stBadge(c)}</td></tr>`).join('')}</tbody></table></div>`
  :`<div class="tbl"><div class="empty"><b>${S.orders.length?'Nicio comandă pentru filtrul ales':'Nu ai încă nicio comandă'}</b>${S.orders.length?'Schimbă filtrul sau căutarea.':'Apasă „Comandă nouă”, alege produsele și aplicația calculează proforma la cursul ING.'}</div></div>`}`}

/* ---------- ORDER detail ---------- */
function orderDetail(id){
  const o=S.orders.find(x=>x.id===id);if(!o)return null;const c=calcOrder(o);const ag=S.agents.find(a=>a.id===o.agentId);
  const idc=idCheck(o.clientId);
  const payDef=c.advOk?c.rest:c.advLeft;
  return `<div class="dh"><div><h2>${esc(o.clientName)}</h2><div class="muted small">Proformă <span class="mono">${esc(o.number)}</span> din ${fdate(o.date)} · curs ING ${fmt(o.rate,4)} · agent ${esc(ag?ag.name:'—')} · termen ${c.termDays} zile, scadent ${fdate(c.due)}</div></div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:flex-end">${stBadge(c)}<button class="btn sm" data-act="close">Închide</button></div></div>
  <div class="bar"><button class="btn pri" data-act="proforma" data-id="${id}">Vezi / descarcă proforma</button><button class="btn" data-act="hexorder" data-id="${id}">Comandă către Hexing (PDF)</button><button class="btn" data-act="edit-order" data-id="${id}">Editează comanda</button><button class="btn bad" data-act="del-order" data-id="${id}">${drafts['del-'+id]?'Confirmă ștergerea':'Șterge'}</button></div>
  ${o.hexOrderNo?`<p class="small muted">Comandă către Hexing generată: ${esc(o.hexOrderNo)} din ${fdate(o.hexOrderDate)}</p>`:''}
  <div class="sec"><h3>Client</h3><div class="grid"><div><div class="muted small">Nume</div>${esc(o.clientName)}</div><div><div class="muted small">CUI / CNP</div><span class="mono">${esc(o.clientId)}</span> ${idc?badge(idc.ok?'ok':'warn',idc.t):''}</div><div><div class="muted small">Adresă</div>${esc(o.address)||'—'}</div></div>${o.notes?`<p class="small muted">${esc(o.notes)}</p>`:''}</div>
  <div class="sec"><h3>Produse</h3><div class="tbl" style="border:0"><table><thead><tr><th>Produs</th><th class="r">Cant.</th><th class="r">Preț €</th><th class="r">Preț lei</th><th class="r">Valoare lei</th><th class="r">Adaos €</th></tr></thead><tbody>
  ${c.lines.map(l=>`<tr><td>${esc(l.name||(l.p&&l.p.name))}<div class="muted small mono">${esc(l.code||(l.p&&l.p.code)||'')}</div></td><td class="r num">${l.q}</td><td class="r num">${fmt(l.u)}</td><td class="r num">${fmt(l.unitRon)}</td><td class="r num">${fmt(l.valRon)}</td><td class="r num" style="${l.mar<0?'color:var(--bad)':''}">${fmt(l.mar)}</td></tr>`).join('')}</tbody></table></div>
  ${c.neg?`<div class="msg bad">Un rând se vinde sub prețul de intrare. Verifică prețurile.</div>`:''}
  <div style="max-width:340px;margin-left:auto;margin-top:8px"><div class="kv"><span>Total fără TVA</span><span class="num">${ron(c.net)}</span></div><div class="kv"><span>TVA ${c.vatR}%</span><span class="num">${ron(c.vat)}</span></div><div class="kv tot"><span>Total proformă</span><span class="num">${ron(c.total)}</span></div></div></div>

  <div class="sec"><h3>Plăți de la client</h3>
    <div class="kv"><span>Avans ${c.advPct}% la comandă</span><span class="num">${ron(c.advance)} ${c.advOk?badge('ok','achitat'):badge('warn','lipsesc '+ron(c.advLeft))}</span></div>
    <div class="kv"><span>Diferența, înainte de factura finală</span><span class="num">${ron(r2(c.total-c.advance))}</span></div>
    <div class="prog"><i style="width:${c.total?Math.min(100,c.paid/c.total*100):0}%"></i></div>
    <div class="kv"><span>Încasat ${ron(c.paid)}</span><span class="num"><b>Rest ${ron(c.rest)}</b></span></div>
    ${c.pays.length?`<table style="margin-top:6px"><tbody>${c.pays.map(p=>`<tr><td class="num">${fdate(p.date)}</td><td>${esc(p.kind)}${p.note?` <span class="muted">· ${esc(p.note)}</span>`:''}</td><td class="r num">${ron(p.amount)}</td><td class="r"><button class="btn sm bad" data-act="del-pay" data-id="${p.id}" aria-label="Șterge plata">×</button></td></tr>`).join('')}</tbody></table>`:'<p class="muted small">Nicio plată înregistrată.</p>'}
    <div class="grid" style="margin-top:10px;align-items:end"><label>Data<input id="p-date" type="date" value="${val('p-date',todayS())}"></label>
    <label>Suma (lei)<input id="p-amt" type="number" step="0.01" min="0" value="${val('p-amt',payDef>0?payDef:'')}"></label>
    <label>Tip<select id="p-kind">${['Avans','Rest','Altă plată'].map(k=>`<option ${val('p-kind',c.advOk?'Rest':'Avans')===k?'selected':''}>${k}</option>`).join('')}</select></label>
    <label>Notă<input id="p-note" value="${esc(val('p-note'))}" placeholder="ex. OP 123"></label>
    <button class="btn pri" data-act="add-pay" data-id="${id}">Adaugă plata</button></div></div>

  <div class="sec"><h3>Facturi către client</h3>
    ${c.inv.length?`<table><tbody>${c.inv.map(x=>{const vc=verifyCinv(x);return `<tr class="click" data-act="cinv" data-id="${x.id}"><td class="mono">${esc(x.number)}</td><td class="num">${fdate(x.date)}</td><td class="r num">${ron(vc.calc)}</td><td>${vBadge(vc)}</td></tr>`}).join('')}</tbody></table>`:'<p class="muted small">Nicio factură încărcată. Stocul scade doar după ce încarci factura către client.</p>'}
    <div class="bar" style="margin-top:10px"><button class="btn" data-act="new-cinv" data-order="${id}">Încarcă factură către client</button>${c.allInv?badge('ok','Comandă facturată integral'):c.inv.length?badge('info','Mai sunt produse de facturat'):''}</div></div>

  <div class="sec"><h3>Comision ${esc(ag?ag.name:'')}</h3>
    <div class="kv"><span>Adaos (preț client − preț intrare)</span><span class="num">${eur(c.marEur)}</span></div>
    <div class="kv"><span>Comision ${S.cfg.comm}% din adaos</span><span class="num"><b>${eur(c.comEur)}</b> · ${ron(c.comRon)}</span></div>
    ${o.commissionPaidDate?`<div class="kv"><span>${badge('ok','Plătit')} la ${fdate(o.commissionPaidDate)}</span><button class="btn sm" data-act="com-unpay" data-id="${id}">Anulează</button></div>`
    :`<div class="kv"><span>${c.full?badge('ok','De plătit: clientul a achitat integral'):badge('warn','Se plătește după încasarea integrală')}</span><button class="btn sm" data-act="com-pay" data-id="${id}">Marchează plătit</button></div>`}</div>`}

/* ---------- ORDER form ---------- */
let od=null; // draft order
function nextNumber(){const re=/(\d+)\s*$/;const n=Math.max(0,...S.orders.map(o=>{const m=re.exec(o.number||'');return m?+m[1]:0}));return `${S.cfg.series}-${String(n+1).padStart(4,'0')}`}
function openOrderForm(id){
  const src=S.orders.find(o=>o.id===id);
  const last=S.orders.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''))[0];
  od=src?JSON.parse(JSON.stringify(src)):{number:nextNumber(),date:todayS(),clientName:'',clientId:'',address:'',agentId:'',rate:'',vatRate:S.cfg.vat,termDays:S.cfg.termDays,advPct:S.cfg.adv,lines:[{productId:'',qty:1,unitEur:''}],notes:''};
  if(od.termDays==null)od.termDays=S.cfg.termDays;if(od.advPct==null)od.advPct=S.cfg.adv;
  if(src)od.id=id;od.lastRate=last?{r:last.rate,d:last.date}:null;
  const hasPay=src&&payOf(src).length;
  drafts={};openDrawer(`<div class="dh"><h2>${src?'Editează comanda':'Comandă nouă'}</h2><button class="btn sm" data-act="close">Închide</button></div>
  ${hasPay?`<div class="msg warn">Comanda are plăți înregistrate. Dacă schimbi produsele sau cursul, totalul proformei se modifică.</div>`:''}
  <div class="sec"><h3>Client și vânzare</h3><div class="grid">
   <label>Nume client<input id="f-name" value="${esc(od.clientName)}" autocomplete="off"></label>
   <label>CUI sau CNP<input id="f-cui" value="${esc(od.clientId)}" autocomplete="off"><span id="f-cui-hint" class="small"></span></label>
   <label>Adresă (apare pe proformă)<input id="f-addr" value="${esc(od.address)}"></label>
   <label>Agent de vânzări<select id="f-agent"><option value="">Alege agentul</option>${S.agents.filter(a=>a.active!==false||a.id===od.agentId).map(a=>`<option value="${a.id}" ${a.id===od.agentId?'selected':''}>${esc(a.name)}</option>`).join('')}</select>${S.agents.length?'':'<span class="small" style="color:var(--bad)">Adaugă mai întâi agenți în fila Agenți.</span>'}</label>
   <label>Nr. proformă<input id="f-num" value="${esc(od.number)}"></label>
   <label>Data proformei<input id="f-date" type="date" value="${od.date}"></label>
   <label>Curs ING EUR/RON din ziua proformei<input id="f-rate" type="number" step="0.0001" min="0" value="${od.rate}" placeholder="ex. 5,0950"><span class="small muted">${od.lastRate?`Ultimul curs folosit: ${fmt(od.lastRate.r,4)} (${fdate(od.lastRate.d)})`:'Introdu cursul de vânzare ING afișat în ziua emiterii.'}</span></label>
   <label>TVA %<input id="f-vat" type="number" step="1" min="0" value="${od.vatRate}"></label>
   <label>Avans la comandă (% din proformă)<input id="f-adv" type="number" step="0.1" min="0" max="100" value="${od.advPct}"></label>
   <label>Termen de plată proformă (zile)<input id="f-term" type="number" step="1" min="0" max="365" value="${od.termDays}"></label></div></div>
  <div class="sec"><h3>Produse comandate</h3>
   <div class="bar"><label style="flex-direction:row;align-items:center;gap:8px">Adaos general %<input id="f-mkall" type="number" step="0.1" style="width:90px" placeholder="${S.cfg.markup}"></label><button class="btn sm" data-act="mk-all">Aplică la toate produsele</button><span class="small muted">Implicit se folosește prețul de ieșire din listă. Poți schimba adaosul sau prețul pe fiecare rând.</span></div><div class="tbl lines" style="border:0"><table><thead><tr><th style="min-width:260px">Produs</th><th style="width:80px">Cant.</th><th style="width:110px">Preț € fără TVA</th><th style="width:90px">Adaos %</th><th class="r" style="min-width:110px">Valoare lei</th><th></th></tr></thead><tbody id="f-lines"></tbody></table></div>
   <button class="btn sm" data-act="add-line" style="margin-top:8px">Adaugă produs</button>
   <div id="f-tot" style="max-width:340px;margin-left:auto;margin-top:10px"></div></div>
  <div class="sec"><label>Observații<textarea id="f-notes" rows="2">${esc(od.notes)}</textarea></label></div>
  <div id="f-err"></div><div class="bar"><button class="btn pri" data-act="save-order">${src?'Salvează modificările':'Salvează comanda'}</button><button class="btn" data-act="close">Anulează</button></div>`);
  drawLines();recalc();idHint()}
function idHint(){const h=$('#f-cui-hint');if(!h)return;const r=idCheck($('#f-cui').value);h.textContent=r?r.t:'';h.style.color=r?(r.ok?'var(--ok)':'var(--amber)'):''}
function drawLines(){$('#f-lines').innerHTML=od.lines.map((l,i)=>{const p=prod(l.productId);
  return `<tr data-i="${i}"><td><input class="pick" list="plist" value="${esc(p?plabel(p):l.pickText||'')}" placeholder="Caută după cod sau denumire" autocomplete="off"><div class="small muted pinfo">${pinfo(p)}</div></td>
  <td><input class="qty" type="number" min="1" step="1" value="${l.qty}"></td><td><input class="unit" type="number" min="0" step="0.01" value="${l.unitEur}"></td><td><input class="mk" type="number" step="0.1" value="${mkOf(l)}" ${entOf(l)>0?'':'disabled'}></td><td class="r num rv">—</td>
  <td><button class="btn sm bad" data-act="rm-line" data-i="${i}" aria-label="Șterge rândul">×</button></td></tr>`}).join('')}
const pinfo=p=>p?`Intrare ${p.entry!=null?eur(p.entry):'—'} · listă ieșire ${p.exit!=null?eur(p.exit):'lipsește, introdu prețul'}`:'';
function recalc(){const c=calcOrder({...od,rate:+$('#f-rate').value||0,vatRate:+$('#f-vat').value||0,advPct:$('#f-adv').value===''?S.cfg.adv:+$('#f-adv').value,lines:od.lines.map(l=>({...l,productId:l.productId,qty:+l.qty,unitEur:+l.unitEur,entryEur:l.entryEur}))});
  document.querySelectorAll('#f-lines tr').forEach((tr,i)=>{const l=c.lines[i];tr.querySelector('.rv').textContent=l&&+$('#f-rate').value?ron(l.valRon):'—'});
  const m=c.marEur;$('#f-tot').innerHTML=`<div class="kv"><span>Total fără TVA</span><span class="num">${ron(c.net)}</span></div><div class="kv"><span>TVA ${c.vatR}%</span><span class="num">${ron(c.vat)}</span></div><div class="kv tot"><span>Total proformă</span><span class="num">${ron(c.total)}</span></div>
  <div class="kv small muted"><span>Avans ${c.advPct}% la comandă</span><span class="num">${ron(c.advance)}</span></div>
  <div class="kv small muted"><span>Adaos / comision agent</span><span class="num">${eur(m)} / ${eur(c.comEur)}</span></div>${c.neg?'<div class="msg bad">Un rând este sub prețul de intrare.</div>':''}`}
document.addEventListener('input',e=>{const t=e.target;
  if(t.id==='f-cui')idHint();
  if(t.closest&&t.closest('#f-lines')){const tr=t.closest('tr'),i=+tr.dataset.i,l=od.lines[i];
    if(t.classList.contains('qty'))l.qty=t.value;
    if(t.classList.contains('unit')){l.unitEur=t.value;tr.querySelector('.mk').value=mkOf(l)}
    if(t.classList.contains('mk')){const e=entOf(l),m=parseFloat(t.value);if(e>0&&!isNaN(m)){l.unitEur=r2(e*(1+m/100));tr.querySelector('.unit').value=l.unitEur}}
    if(t.classList.contains('pick')){const p=findProduct(t.value);l.pickText=t.value;
      if(p&&p.id!==l.productId){l.productId=p.id;l.entryEur=undefined;tr.querySelector('.pinfo').textContent=pinfo(p);const d=defExit(p);l.unitEur=d;tr.querySelector('.unit').value=d;const mk=tr.querySelector('.mk');mk.disabled=!(entOf(l)>0);mk.value=mkOf(l)}
      else if(!p){l.productId='';tr.querySelector('.pinfo').textContent=''}}
    recalc()}
  if(t.id==='f-rate'||t.id==='f-vat'||t.id==='f-adv')recalc()});
async function saveOrder(){
  const g=id=>$('#'+id).value.trim();const err=[];
  const o={...od};delete o.lastRate;delete o.id;
  o.clientName=g('f-name');o.clientId=g('f-cui');o.address=g('f-addr');o.agentId=$('#f-agent').value;o.number=g('f-num');o.date=g('f-date');o.rate=+g('f-rate');o.vatRate=+g('f-vat');o.termDays=Math.round(+g('f-term'));o.advPct=+g('f-adv');o.notes=$('#f-notes').value.trim();
  if(!o.clientName)err.push('Completează numele clientului.');
  if(!o.clientId)err.push('Completează CUI sau CNP.');
  if(!o.agentId)err.push('Alege agentul de vânzări.');
  if(!o.date)err.push('Alege data proformei.');
  if(!(o.rate>0))err.push('Introdu cursul ING din ziua proformei.');
  if(!(o.advPct>=0&&o.advPct<=100))err.push('Avansul trebuie să fie între 0 și 100%.');
  if(!(o.termDays>=0&&o.termDays<=365))err.push('Termenul de plată trebuie să fie între 0 și 365 de zile.');
  if(!o.number)err.push('Completează numărul proformei.');
  else if(S.orders.some(x=>x.id!==od.id&&norm(x.number)===norm(o.number)))err.push('Există deja o proformă cu acest număr.');
  const prev=od.id?S.orders.find(x=>x.id===od.id):null;
  o.lines=od.lines.filter(l=>l.productId||l.qty||l.unitEur).map(l=>{const p=prod(l.productId);
    const old=prev&&(prev.lines||[]).find(x=>x.productId===l.productId);
    return {productId:l.productId,code:p?p.code||'':'',name:p?p.name:'',qty:+l.qty,unitEur:+l.unitEur,entryEur:old&&old.entryEur!=null?old.entryEur:(p&&p.entry!=null?p.entry:0)}});
  if(!o.lines.length)err.push('Adaugă cel puțin un produs.');
  o.lines.forEach((l,i)=>{if(!l.productId)err.push(`Rândul ${i+1}: alege un produs din listă.`);else if(!(l.qty>0)||!Number.isInteger(l.qty))err.push(`Rândul ${i+1}: cantitate invalidă.`);else if(!(l.unitEur>0))err.push(`Rândul ${i+1}: introdu prețul în euro.`)});
  if(err.length){$('#f-err').innerHTML=`<div class="msg bad">${err.map(esc).join('<br>')}</div>`;$('#drawer').scrollTo({top:$('#drawer').scrollHeight});return}
  try{
    if(prev){Object.assign(o,{finalInvoiceNo:prev.finalInvoiceNo||'',finalInvoiceDate:prev.finalInvoiceDate||'',commissionPaidDate:prev.commissionPaidDate||'',createdAt:prev.createdAt});await db.doc('orders/'+od.id).set(o)}
    else{o.createdAt=new Date().toISOString();o.finalInvoiceNo='';o.finalInvoiceDate='';o.commissionPaidDate='';const ref=db.collection('orders').doc();await ref.set(o);od.id=ref.id}
    toast('Comanda a fost salvată');const id=od.id;openLive(()=>orderDetail(id))}
  catch(e){toast('Nu s-a putut salva: '+(e.message||e.code),1)}}

/* ---------- PROFORMA document ---------- */
const PF_CSS=`.pf{font:13px/1.4 Arial,Helvetica,sans-serif;color:#111;background:#fff;max-width:780px;margin:0 auto}.pf h1{font-size:22px;margin:0 0 2px;letter-spacing:.02em}.pf .meta{color:#444;margin-bottom:16px}.pf .two{display:flex;gap:30px;margin-bottom:16px}.pf .two>div{flex:1;min-width:0}.pf h4{margin:0 0 4px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;color:#555}.pf table{border-collapse:collapse;width:100%;margin-bottom:12px}.pf th{background:#eef1f3;text-align:left;font-size:11px;padding:6px;border:1px solid #cfd6db}.pf td{padding:6px;border:1px solid #cfd6db;vertical-align:top}.pf .r{text-align:right}.pf .tot{margin-left:auto;width:290px}.pf .tot div{display:flex;justify-content:space-between;padding:3px 0}.pf .tot .g{border-top:2px solid #111;font-weight:bold;font-size:15px;margin-top:4px;padding-top:6px}.pf .box{border:1px solid #cfd6db;padding:10px 12px;margin-top:14px;background:#f7f9fa}.pf small{color:#555}`;
function proformaBody(o){const c=calcOrder(o),C=S.cfg;
  return `<div class="pf"><h1>FACTURĂ PROFORMĂ</h1><div class="meta">Nr. <b>${esc(o.number)}</b> · Data ${fdate(o.date)} · Curs ING EUR/RON ${fmt(o.rate,4)} din ${fdate(o.date)}</div>
  <div class="two"><div><h4>Furnizor</h4><b>${esc(C.coName)}</b><br>${C.coCui?`CUI ${esc(C.coCui)}<br>`:''}${C.coReg?`Reg. com. ${esc(C.coReg)}<br>`:''}${esc(C.coAddr)}${C.coAddr?'<br>':''}${C.coBank?`Banca ${esc(C.coBank)}<br>`:''}${C.coIban?`IBAN ${esc(C.coIban)}<br>`:''}${esc(C.coEmail)} ${esc(C.coPhone)}</div>
  <div><h4>Client</h4><b>${esc(o.clientName)}</b><br>CUI/CNP ${esc(o.clientId)}<br>${esc(o.address)}</div></div>
  <table><thead><tr><th>Nr.</th><th>Cod</th><th>Denumire</th><th class="r">Cant.</th><th class="r">Preț unitar €</th><th class="r">Preț unitar lei</th><th class="r">Valoare lei</th></tr></thead><tbody>
  ${c.lines.map((l,i)=>`<tr><td>${i+1}</td><td>${esc(l.code||'')}</td><td>${esc(l.name||'')}</td><td class="r">${l.q} buc.</td><td class="r">${fmt(l.u)}</td><td class="r">${fmt(l.unitRon)}</td><td class="r">${fmt(l.valRon)}</td></tr>`).join('')}</tbody></table>
  <div class="tot"><div><span>Total fără TVA</span><span>${fmt(c.net)} lei</span></div><div><span>TVA ${c.vatR}%</span><span>${fmt(c.vat)} lei</span></div><div class="g"><span>Total de plată</span><span>${fmt(c.total)} lei</span></div></div>
  <div class="box"><b>Condiții de plată</b><br>Avans ${c.advPct}% la comandă: <b>${fmt(c.advance)} lei</b><br>Diferența de <b>${fmt(r2(c.total-c.advance))} lei</b> se achită înainte de emiterea facturii finale.<br>Termen de plată: <b>${c.termDays} zile</b>, scadent la <b>${fdate(c.due)}</b>.<br><small>Prețurile în euro sunt convertite la cursul ING din data proformei.</small>${o.notes?`<br><small>${esc(o.notes)}</small>`:''}</div></div>`}
function showProforma(id){const o=S.orders.find(x=>x.id===id);if(!o)return;
  openDrawer(`<div class="dh"><div><h2>Proformă ${esc(o.number)}</h2><div class="muted small">Descarci un fișier HTML care se deschide în browser și se poate tipări sau salva ca PDF.</div></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn pri" data-act="dl-pf" data-id="${id}">Descarcă</button><button class="btn" data-act="order" data-id="${id}">Înapoi la comandă</button></div></div><style>${PF_CSS}</style><div class="paper">${proformaBody(o)}</div>`,null)}
async function dlProforma(id){const o=S.orders.find(x=>x.id===id);if(!downloads){toast('Descărcarea nu este disponibilă în acest context',1);return}
  const html=`<!doctype html><html lang="ro"><head><meta charset="utf-8"><title>Proformă ${esc(o.number)}</title><style>body{margin:24px}${PF_CSS}@media print{body{margin:0}}</style></head><body>${proformaBody(o)}</body></html>`;
  try{await downloads.save({filename:`Proforma-${o.number.replace(/[^\w-]+/g,'_')}.html`,data:html});toast('Proforma a fost descărcată')}catch(e){if(e.code!=='declined')toast('Descărcarea a eșuat: '+(e.message||e.code),1)}}
