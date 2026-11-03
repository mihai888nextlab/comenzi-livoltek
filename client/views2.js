/* ---------- HEXING list ---------- */
const hexTotal=h=>h.total!==''&&h.total!=null?+h.total:r2(sum(h.lines||[],l=>l.qty*l.unit));
const hexGross=h=>h.totalVat!==''&&h.totalVat!=null?+h.totalVat:r2(hexTotal(h)*(1+S.cfg.vat/100));
const hexAdvance=h=>{if(+h.advance>0)return +h.advance;const r=h.refId&&S.hexing.find(x=>x.id===h.refId);return r&&+r.advance>0?+r.advance:0};
const hexOwed=h=>h.kind==='final'?r2(Math.max(0,hexGross(h)-hexAdvance(h))):0;
const hexAdvDue=h=>r2(hexGross(h)*S.cfg.hexAdv/100);
const hexPayBadge=h=>h.kind==='final'?(h.paidDate?badge('ok','Plătită '+fdate(h.paidDate)):badge('warn','De plătit')):(+h.advance>0?badge('ok',`Avans ${ron(h.advance)} plătit`):badge('warn',`Avans ${ron(hexAdvDue(h))} de plătit`));
function vHexing(){
  const q=ui.hq.toLowerCase();
  const rows=S.hexing.filter(h=>!q||[h.number,h.notes].join(' ').toLowerCase().includes(q)).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  return `<div class="bar"><h2 class="grow">Facturi Hexing către Wiz Mobile</h2><button class="btn pri" data-act="new-hex">Încarcă document Hexing</button></div>
  <p class="muted small" style="margin-top:-6px;max-width:70ch">Documentele Hexing sunt în lei. Fiecare preț se verifică față de prețul de intrare în euro din listă, înmulțit cu cursul de pe factură. Factura finală se compară și cu proforma Hexing la care se referă. Scadența este la ${S.cfg.hexDays} zile de la data facturii finale.</p>
  <div class="bar"><input id="hq" class="grow" style="max-width:300px" placeholder="Caută după număr" value="${esc(ui.hq)}" data-act-input="hq"></div>
  ${rows.length?`<div class="tbl"><table><thead><tr><th>Tip</th><th>Număr</th><th>Data</th><th class="r">Total fără TVA</th><th class="r">Rest de plată (cu TVA)</th><th>Verificare</th><th>Scadență</th><th>Plată</th></tr></thead><tbody>
  ${rows.map(h=>{const v=verifyHex(h),d=hexDue(h);const dd=d&&!h.paidDate?daysTo(d):null;
   return `<tr class="click" data-act="hex" data-id="${h.id}"><td>${h.kind==='final'?badge('acc','Factură finală'):badge('','Proformă')}</td><td class="mono">${esc(h.number)}${h.locked?' <span class="badge acc">Validată</span>':''}</td><td class="num">${fdate(h.date)}</td><td class="r num">${fmt(hexTotal(h))}</td><td class="r num">${h.kind==='final'?(h.paidDate?'—':fmt(hexOwed(h))):'—'}</td><td>${vBadge(v)}</td>
   <td class="num">${d?fdate(d):'—'}${dd!=null?`<div class="small" style="color:${dd<0?'var(--bad)':dd<=14?'var(--amber)':'var(--muted)'}">${dd<0?`întârziată ${-dd} zile`:`peste ${dd} zile`}</div>`:''}</td>
   <td>${hexPayBadge(h)}</td></tr>`}).join('')}</tbody></table></div>`
  :`<div class="tbl"><div class="empty"><b>Niciun document Hexing</b>Încarcă proforma Hexing, apoi factura finală când marfa intră pe stoc.</div></div>`}`}

/* ---------- HEXING detail ---------- */
function hexDetail(id){const h=S.hexing.find(x=>x.id===id);if(!h)return null;const v=verifyHex(h),d=hexDue(h);const ref=h.refId&&S.hexing.find(x=>x.id===h.refId);
  return `<div class="dh"><div><h2>${h.kind==='final'?'Factură finală':'Proformă'} Hexing <span class="mono">${esc(h.number)}</span></h2><div class="muted small">Data ${fdate(h.date)}${ref?` · pe baza proformei ${esc(ref.number)}`:''}</div></div><div style="display:flex;gap:8px;align-items:center">${vBadge(v)}<button class="btn sm" data-act="close">Închide</button></div></div>
  ${lockBar('hexing',id,h,'edit-hex','del-hex','')}
  <div class="sec"><h3>Rezultatul verificării</h3>${v.iss.length?v.iss.map(i=>`<div class="iss">${badge(i.sev==='bad'?'bad':i.sev==='info'?'info':'warn',i.sev==='bad'?'Eroare':i.sev==='info'?'Info':'Atenție')}<span>${esc(i.t)}</span></div>`).join(''):'<div class="msg ok">Toate rândurile corespund listei de prețuri de intrare și totalul este corect.</div>'}</div>
  <div class="sec"><h3>Rânduri</h3>${(h.lines||[]).length?`<div class="tbl" style="border:0"><table><thead><tr><th>Produs</th><th class="r">Cant.</th><th class="r">Preț lei</th><th class="r">Intrare €</th><th class="r">Curs implicit</th><th class="r">Valoare lei</th><th></th></tr></thead><tbody>
  ${h.lines.map((l,i)=>{const p=prod(l.productId),m=v.ln[i]||[];return `<tr><td>${p?esc(p.name):'<i>necunoscut</i>'}<div class="muted small mono">${esc(l.code||(p&&p.code)||'')}</div></td><td class="r num">${l.qty}</td><td class="r num">${fmt(l.unit)}</td><td class="r num">${p&&p.entry!=null?fmt(p.entry):'—'}</td><td class="r num">${p&&p.entry>0&&l.unit>0?fmt(l.unit/p.entry,4):'—'}</td><td class="r num">${fmt(r2(l.qty*l.unit))}</td><td>${m.length?badge(m.some(x=>x[0]==='bad')?'bad':'warn','verifică'):badge('ok','ok')}</td></tr>`}).join('')}</tbody></table></div>
  <div class="kv tot" style="max-width:340px;margin-left:auto"><span>Total rânduri</span><span class="num">${ron(v.calc)}</span></div>`:'<p class="muted">Nu sunt rânduri introduse.</p>'}
  <div class="kv" style="max-width:340px;margin-left:auto"><span>Total declarat pe document</span><span class="num">${h.total!==''&&h.total!=null?ron(h.total):'—'}</span></div>
  <div class="kv" style="max-width:340px;margin-left:auto"><span>Curs EUR/RON de pe factură</span><span class="num">${h.rate?fmt(h.rate,4):'neintrodus'}</span></div></div>
  ${h.kind==='final'?`<div class="sec"><h3>Plata către Hexing</h3><div class="kv"><span>Total cu TVA</span><span class="num">${ron(hexGross(h))}</span></div><div class="kv"><span>Avans achitat</span><span class="num">${ron(hexAdvance(h))}</span></div><div class="kv"><span><b>Rest de plată</b></span><span class="num"><b>${ron(hexOwed(h))}</b></span></div>
  <div class="kv"><span>Scadent la ${fdate(d)}</span><span>${h.paidDate?badge('ok','Plătită la '+fdate(h.paidDate)):(()=>{const n=daysTo(d);return badge(n<0?'bad':n<=14?'warn':'info',n<0?`întârziată ${-n} zile`:`peste ${n} zile`)})()}</span></div>
  ${h.paidDate?`<button class="btn sm" data-act="hex-unpay" data-id="${id}">Anulează plata</button>`:`<div class="grid" style="align-items:end;margin-top:8px"><label>Data plății<input id="hp-date" type="date" value="${val('hp-date',todayS())}"></label><button class="btn" data-act="hex-pay" data-id="${id}">Marchează plătită</button></div>`}</div>`:''}
  ${h.kind==='proforma'?`<div class="sec"><h3>Avans către Hexing (${S.cfg.hexAdv}% din proformă)</h3>
   <div class="kv"><span>Total proformă cu TVA</span><span class="num">${ron(hexGross(h))}</span></div>
   <div class="kv"><span><b>Avans de plătit ${S.cfg.hexAdv}%</b></span><span class="num"><b>${ron(hexAdvDue(h))}</b></span></div>
   ${+h.advance>0?`<div class="kv"><span>${badge('ok','Plătit')} ${ron(h.advance)}${h.advDate?' la '+fdate(h.advDate):''}</span><button class="btn sm" data-act="hex-advunpay" data-id="${id}">Anulează</button></div>`
   :`<div class="grid" style="align-items:end;margin-top:8px"><label>Data plății<input id="ha-date" type="date" value="${val('ha-date',todayS())}"></label><label>Suma plătită (lei)<input id="ha-amt" type="number" step="0.01" value="${val('ha-amt',hexAdvDue(h))}"></label><button class="btn" data-act="hex-advpay" data-id="${id}">Marchează avansul plătit</button></div>`}
   ${S.hexing.filter(f=>f.refId===id).map(f=>`<p class="small muted">Facturată prin ${esc(f.number)} din ${fdate(f.date)}.</p>`).join('')}</div>`:''}
  ${h.notes?`<p class="small muted">${esc(h.notes)}</p>`:''}`}

/* ---------- HEXING form ---------- */
let hd=null;
function openHexForm(id){const src=S.hexing.find(h=>h.id===id);
  hd=src?JSON.parse(JSON.stringify(src)):{kind:'proforma',number:'',date:todayS(),total:'',refId:'',lines:[],notes:'',fileUrl:'',fileName:'',fileId:''};if(src)hd.id=id;
  drafts={};openDrawer(`<div class="dh"><h2>${src?'Editează documentul Hexing':'Încarcă document Hexing'}</h2><button class="btn sm" data-act="close">Închide</button></div>
  <div class="sec"><div class="grid"><label>Tip document<select id="h-kind"><option value="proforma" ${hd.kind==='proforma'?'selected':''}>Proformă Hexing → Wiz Mobile</option><option value="final" ${hd.kind==='final'?'selected':''}>Factură finală Hexing → Wiz Mobile</option></select></label>
   <label>Număr<input id="h-num" value="${esc(hd.number)}"></label><label>Data<input id="h-date" type="date" value="${hd.date}"></label>
   <label>Total document lei fără TVA<input id="h-total" type="number" step="0.01" value="${hd.total}"></label>
   <label>Data scadenței (de pe factură)<input id="h-due" type="date" value="${hd.dueDate||''}"></label>
   <label>Total cu TVA lei<input id="h-tvat" type="number" step="0.01" value="${hd.totalVat??''}"></label>
   <label>Avans plătit lei (la proformă)<input id="h-adv" type="number" step="0.01" value="${hd.advance??''}"></label>
   <label>Data plății avansului<input id="h-advd" type="date" value="${hd.advDate||''}"></label>
   <label>Curs EUR/RON de pe factură (opțional)<input id="h-rate" type="number" step="0.0001" min="0" value="${hd.rate??''}" placeholder="ex. 5,0950"></label>
   <label id="h-refw">Proforma Hexing aferentă<select id="h-ref"><option value="">Fără legătură</option>${S.hexing.filter(x=>x.kind==='proforma'&&x.id!==hd.id).map(x=>`<option value="${x.id}" ${x.id===hd.refId?'selected':''}>${esc(x.number)} · ${fdate(x.date)}</option>`).join('')}</select></label>
   <label>Fișier PDF (se citește automat)<input id="h-file" type="file" accept=".pdf,image/*">${hd.fileName?`<span class="small muted">Atașat: ${esc(hd.fileName)}</span>`:''}${assets?'':'<span class="small" style="color:var(--amber)">Încărcarea fișierelor necesită drepturi de editare.</span>'}</label></div><div id="h-read"></div></div>
  <div class="sec"><h3>Rânduri din document</h3>
   <p class="small muted" style="margin-top:0">Lipește din Excel tabelul facturii, cu antetul inclus: se citesc coloanele „Nume articol” (cod), „Cantitate” și „Preț” (net, în lei). Fără antet, ordinea este cod, cantitate, preț. Poți adăuga și rânduri manual.</p>
   <textarea id="h-paste" rows="3" class="mono" placeholder="Nume articol&#9;Cantitate&#9;Preț&#10;GT3-10KD1&#9;5&#9;2090,50"></textarea>
   <div class="bar" style="margin-top:8px"><button class="btn sm" data-act="hex-parse">Importă rândurile lipite</button><button class="btn sm" data-act="hex-addline">Adaugă rând</button></div>
   <div class="tbl lines" style="border:0"><table><thead><tr><th style="min-width:260px">Produs</th><th style="width:80px">Cant.</th><th style="width:110px">Preț lei</th><th class="r">Valoare lei</th><th></th></tr></thead><tbody id="h-lines"></tbody></table></div></div>
  <div class="sec"><label>Observații<textarea id="h-notes" rows="2">${esc(hd.notes)}</textarea></label></div>
  <div id="h-err"></div><div class="bar"><button class="btn pri" data-act="save-hex">Salvează și verifică</button><button class="btn" data-act="close">Anulează</button></div>`);
  drawHexLines();hexKind()}
function hexKind(){const f=$('#h-kind').value==='final';$('#h-refw').hidden=!f}
function drawHexLines(){$('#h-lines').innerHTML=hd.lines.map((l,i)=>{const p=prod(l.productId);
  return `<tr data-i="${i}"><td><input class="hpick" list="plist" value="${esc(p?plabel(p):(l.code||''))}" autocomplete="off" placeholder="Cod sau denumire">${!p&&l.rawCode?'<div class="small" style="color:var(--amber)">Cod nou: se adaugă în lista de produse la salvare</div>':!p&&l.code?'<div class="small" style="color:var(--bad)">Cod necunoscut în lista de produse</div>':''}</td>
  <td><input class="hqty" type="number" min="1" step="1" value="${l.qty}"></td><td><input class="hunit" type="number" step="0.01" value="${l.unit}"></td><td class="r num">${fmt(r2((+l.qty||0)*(+l.unit||0)))}</td><td><button class="btn sm bad" data-act="hex-rm" data-i="${i}" aria-label="Șterge rândul">×</button></td></tr>`}).join('')}
document.addEventListener('change',e=>{const t=e.target;
  if(t.id==='h-kind')hexKind();
  if(t.id==='h-file'&&t.files[0])handleHexFile(t.files[0]);
  if(t.closest&&t.closest('#h-lines')){const i=+t.closest('tr').dataset.i,l=hd.lines[i];
    if(t.classList.contains('hpick')){const p=findProduct(t.value);l.productId=p?p.id:'';l.code=p?(p.code||''):t.value;}
    if(t.classList.contains('hqty'))l.qty=t.value;if(t.classList.contains('hunit'))l.unit=t.value;drawHexLines()}});
function parsePaste(txt){
  const rows=txt.split(/\r?\n/).map(r=>r.trim()).filter(Boolean).map(r=>{let c=r.split(/\t|;/);if(c.length<3)c=r.split(/\s{2,}/);if(c.length<3)c=r.split(/\s+/);return c.map(x=>x.trim())});
  if(!rows.length)return[];
  const hd=rows[0].map(x=>x.toLowerCase()),fi=re=>hd.findIndex(x=>re.test(x));
  const ci=fi(/articol|^cod/),qi=fi(/cantit/),pi=fi(/pre[tțţ]/);
  const mapped=ci>=0&&qi>=0&&pi>=0,out=[];
  (mapped?rows.slice(1):rows).forEach(c=>{let key,qty,unit;
    if(mapped){key=c[ci];qty=num(c[qi]);unit=num(c[pi])}
    else{c=c.filter(x=>x!=='');if(c.length<3)return;key=c[0];unit=num(c[c.length-1]);qty=num(c[c.length-2])}
    if(!key||isNaN(unit)||isNaN(qty)||/^total/i.test(key))return;
    const p=findProduct(key);out.push({productId:p?p.id:'',code:p?(p.code||''):key,rawCode:key,qty,unit})});
  return out}
async function saveHex(){const err=[];const g=id=>$('#'+id).value.trim();
  const h={kind:$('#h-kind').value,number:g('h-num'),date:g('h-date'),total:g('h-total')===''?'':+g('h-total'),rate:g('h-rate')===''?'':+g('h-rate'),cur:'RON',dueDate:g('h-due'),totalVat:g('h-tvat')===''?'':+g('h-tvat'),advance:g('h-adv')===''?'':+g('h-adv'),advDate:g('h-advd'),refId:$('#h-kind').value==='final'?$('#h-ref').value:'',notes:$('#h-notes').value.trim(),fileUrl:hd.fileUrl||'',fileName:hd.fileName||'',fileId:hd.fileId||'',
   lines:hd.lines.filter(l=>l.productId||l.code||l.qty||l.unit).map(l=>({productId:l.productId||'',code:l.code||'',qty:+l.qty,unit:+l.unit}))};
  const added=[];const newByCode={};
  const alias={};hd.lines.forEach(l=>{if(l.productId&&l.rawCode){const p0=findProduct(l.rawCode);if(!p0||p0.id!==l.productId)(alias[l.productId]=alias[l.productId]||new Set()).add(l.rawCode)}});
  if(!h.number)err.push('Completează numărul documentului.');if(!h.date)err.push('Alege data documentului.');
  if(err.length){$('#h-err').innerHTML=`<div class="msg bad">${err.join('<br>')}</div>`;return}
  const f=$('#h-file').files[0];
  try{if(f){if(!assets)throw new Error('Încărcarea fișierelor nu este disponibilă pentru contul tău.');toast('Se încarcă fișierul…');const r=await assets.upload(f);h.fileUrl=r.url;h.fileId=r.id;h.fileName=f.name}
    for(const l of hd.lines){if(!l.productId&&l.rawCode){const k=norm(l.rawCode);
        if(!newByCode[k]){const nr=Math.max(0,...S.products.map(x=>x.nr),...added.map(x=>x.nr))+1,id='p'+String(nr).padStart(3,'0');
          const rate=+g('h-rate'),entry=rate>0&&l.unit>0?r2(l.unit/rate):null;
          const pr={nr,code:l.rawCode,name:l.desc||l.rawCode,warranty:'',category:'Adăugat din documente Hexing',entry,exit:null};
          await db.doc('products/'+id).set(pr);added.push({...pr,id});newByCode[k]=id}
        l.productId=newByCode[k];l.code=l.rawCode}}
    h.lines=hd.lines.filter(l=>l.productId||l.code||l.qty||l.unit).map(l=>({productId:l.productId||'',code:l.code||'',qty:+l.qty,unit:+l.unit}));
    for(const [pid,set] of Object.entries(alias)){const p=prod(pid);await db.doc('products/'+pid).update({aliases:[...new Set([...(p.aliases||[]),...set])]})}
    const prev=hd.id?S.hexing.find(x=>x.id===hd.id):null;if(prev){h.paidDate=prev.paidDate||'';await db.doc('hexing/'+hd.id).set(h)}
    else{h.paidDate='';h.createdAt=new Date().toISOString();const ref=db.collection('hexing').doc();await ref.set(h);hd.id=ref.id}
    toast(added.length?`Documentul a fost salvat. ${added.length} produse noi în listă: completează prețurile în fila Produse.`:'Documentul a fost salvat');const id=hd.id;openLive(()=>hexDetail(id))}
  catch(e){toast('Nu s-a putut salva: '+(e.message||e.code),1)}}

/* ---------- STOCK ---------- */
function vStock(){const rows=stock().sort((a,b)=>a.p.nr-b.p.nr).filter(r=>!ui.sOnly||r.need>0||r.st!==0||r.open>0);
  const need=rows.filter(r=>r.need>0);
  return `<div class="bar"><h2 class="grow">Stoc și necesar de comandat</h2><label style="flex-direction:row;align-items:center;gap:6px"><input type="checkbox" id="sonly" data-act-input="sonly" ${ui.sOnly?'checked':''}> Ascunde produsele fără mișcare</label></div>
  <p class="muted small" style="margin-top:-6px;max-width:72ch">Intrări = cantități din facturile finale Hexing. Ieșiri = doar facturile către clienți încărcate în aplicație. Necesarul arată ce lipsește pentru comenzile clienților încă nelivrate.</p>
  ${need.length?`<div class="msg warn">${need.length} ${need.length===1?'produs trebuie comandat':'produse trebuie comandate'} la Hexing pentru comenzile deschise.</div>`:''}
  ${rows.length?`<div class="tbl"><table><thead><tr><th>Produs</th><th class="r">Intrat (Hexing)</th><th class="r">Livrat</th><th class="r">Pe stoc</th><th class="r">Comandat de clienți</th><th class="r">De comandat</th></tr></thead><tbody>
  ${rows.map(r=>`<tr><td>${esc(r.p.name)}<div class="muted small mono">${esc(r.p.code||'')}</div></td><td class="r num">${r.rec}</td><td class="r num">${r.del}</td><td class="r num"><b style="${r.st<0?'color:var(--bad)':''}">${r.st}</b></td><td class="r num">${r.open}</td><td class="r num">${r.need?badge('warn',r.need+' buc.'):'—'}</td></tr>`).join('')}</tbody></table></div>`
  :`<div class="tbl"><div class="empty"><b>Încă nu există mișcări de stoc</b>Stocul apare după ce introduci comenzi clienți și facturi finale Hexing.</div></div>`}`}

/* ---------- AGENTS ---------- */
function vAgents(){const orders=S.orders.map(o=>({o,c:calcOrder(o)}));
  const stat=a=>{const r=orders.filter(x=>x.o.agentId===a.id);return {n:r.length,sales:sum(r,x=>x.c.net),com:sum(r,x=>x.c.comRon),due:sum(r.filter(x=>x.c.full&&!x.o.commissionPaidDate),x=>x.c.comRon),paid:sum(r.filter(x=>x.o.commissionPaidDate),x=>x.c.comRon)}};
  return `<div class="bar"><h2 class="grow">Agenți de vânzări</h2><button class="btn pri" data-act="new-agent">Agent nou</button></div>
  <p class="muted small" style="margin-top:-6px;max-width:72ch">Comisionul este ${S.cfg.comm}% din diferența dintre prețul către client și prețul de intrare. Devine de plătit când clientul a achitat integral proforma.</p>
  ${S.agents.length?`<div class="tbl"><table><thead><tr><th>Agent</th><th class="r">Comenzi</th><th class="r">Vânzări fără TVA</th><th class="r">Comision total</th><th class="r">De plătit acum</th><th class="r">Plătit</th><th></th></tr></thead><tbody>
  ${S.agents.slice().sort((a,b)=>a.name.localeCompare(b.name)).map(a=>{const s=stat(a);return `<tr><td><b>${esc(a.name)}</b> ${a.active===false?badge('','inactiv'):''}<div class="muted small">${esc([a.phone,a.email].filter(Boolean).join(' · '))}</div></td><td class="r num">${s.n}</td><td class="r num">${ron(s.sales)}</td><td class="r num">${ron(s.com)}</td><td class="r num">${s.due?`<b>${ron(s.due)}</b>`:'—'}</td><td class="r num">${ron(s.paid)}</td><td class="r"><button class="btn sm" data-act="edit-agent" data-id="${a.id}">Editează</button></td></tr>`}).join('')}</tbody></table></div>`
  :`<div class="tbl"><div class="empty"><b>Nu ai trecut încă niciun agent</b>Adaugă agenții ca să-i poți alege la fiecare comandă.</div></div>`}`}
function openAgent(id){const a=S.agents.find(x=>x.id===id)||{name:'',phone:'',email:'',active:true};
  openDrawer(`<div class="dh"><h2>${id?'Editează agent':'Agent nou'}</h2><button class="btn sm" data-act="close">Închide</button></div><div class="sec"><div class="grid"><label>Nume<input id="a-name" value="${esc(a.name)}"></label><label>Telefon<input id="a-phone" value="${esc(a.phone||'')}"></label><label>Email<input id="a-email" value="${esc(a.email||'')}"></label>
  <label style="flex-direction:row;align-items:center;gap:8px"><input type="checkbox" id="a-act" ${a.active!==false?'checked':''}> Activ (apare în lista de la comenzi)</label></div></div><div id="a-err"></div>
  <div class="bar"><button class="btn pri" data-act="save-agent" data-id="${id||''}">Salvează</button>${id?`<button class="btn bad" data-act="del-agent" data-id="${id}">${S.orders.some(o=>o.agentId===id)?'Are comenzi, dezactivează-l':'Șterge'}</button>`:''}</div>`)}

/* ---------- PRODUCTS ---------- */
function vProducts(){const q=ui.pq.toLowerCase(),cats=[...new Set(S.products.map(p=>p.category))];
  const rows=S.products.filter(p=>(!ui.pcat||p.category===ui.pcat)&&(!q||[p.code,p.name].join(' ').toLowerCase().includes(q))).sort((a,b)=>a.nr-b.nr);
  return `<div class="bar"><h2 class="grow">Lista de produse</h2><button class="btn" data-act="new-prod">Produs nou</button><button class="btn" data-act="exp-prod">Descarcă lista (Excel)</button><label class="btn" style="flex-direction:row;cursor:pointer">Actualizează din Excel<input id="imp" type="file" accept=".xlsx,.xls,.csv" hidden></label></div>
  <p class="muted small" style="margin-top:-6px;max-width:72ch">Prețuri în euro fără TVA. Prețul de ieșire este cel recomandat și se completează automat la comenzi, dar îl poți schimba pe fiecare comandă. Poți edita un produs apăsând pe rând, sau actualiza toată lista dintr-un fișier Excel cu coloanele Nr., Cod model, Denumire, Garanție, Preț intrare, Preț ieșire (opțional Categorie). Înainte de aplicare vezi ce se schimbă. „Descarcă lista” îți dă fișierul curent, pe care îl poți modifica și reîncărca.</p>
  <div class="bar"><input id="pq" class="grow" style="max-width:300px" placeholder="Caută cod sau denumire" value="${esc(ui.pq)}" data-act-input="pq"><select id="pcat" style="max-width:280px" data-act-input="pcat"><option value="">Toate categoriile</option>${cats.map(c=>`<option ${ui.pcat===c?'selected':''}>${esc(c)}</option>`).join('')}</select></div>
  ${rows.length?`<div class="tbl"><table><thead><tr><th>Nr.</th><th>Cod</th><th>Denumire</th><th>Garanție</th><th class="r">Intrare €</th><th class="r">Ieșire €</th><th class="r">Adaos</th></tr></thead><tbody>
  ${rows.map(p=>`<tr class="click" data-act="edit-prod" data-id="${p.id}"><td class="num">${p.nr}</td><td class="mono">${esc(p.code||'—')}</td><td>${esc(p.name)}</td><td>${esc(p.warranty||'')}</td><td class="r num">${p.entry!=null?fmt(p.entry):'—'}</td><td class="r num">${p.exit!=null?fmt(p.exit):'—'}</td><td class="r num">${p.entry&&p.exit?fmt((p.exit/p.entry-1)*100,1)+'%':'—'}</td></tr>`).join('')}</tbody></table></div>`
  :`<div class="tbl"><div class="empty"><b>${S.products.length?'Niciun produs găsit':'Lista de produse este goală'}</b>${S.products.length?'':'Importă fișierul Excel cu prețurile.'}</div></div>`}`}
function openProd(id){const p=S.products.find(x=>x.id===id)||{nr:Math.max(0,...S.products.map(x=>x.nr))+1,code:'',name:'',warranty:'',category:'',entry:'',exit:''};
  openDrawer(`<div class="dh"><h2>${id?'Editează produs':'Produs nou'}</h2><button class="btn sm" data-act="close">Închide</button></div><div class="sec"><div class="grid"><label>Cod model<input id="pr-code" value="${esc(p.code)}"></label><label>Denumire<input id="pr-name" value="${esc(p.name)}"></label><label>Garanție<input id="pr-war" value="${esc(p.warranty)}"></label><label>Categorie<input id="pr-cat" value="${esc(p.category)}" list="cats"></label>
  <label>Preț intrare € fără TVA<input id="pr-in" type="number" step="0.01" value="${p.entry??''}"></label><label>Preț ieșire € fără TVA<input id="pr-out" type="number" step="0.01" value="${p.exit??''}"></label></div><datalist id="cats">${[...new Set(S.products.map(x=>x.category))].map(c=>`<option value="${esc(c)}">`).join('')}</datalist>
  <p class="small muted">Comenzile deja create păstrează prețul de intrare de la data comenzii, deci comisioanele lor nu se schimbă.</p></div><div id="pr-err"></div><div class="bar"><button class="btn pri" data-act="save-prod" data-id="${id||''}" data-nr="${p.nr}">Salvează</button>${id?`<button class="btn bad" data-act="del-prod" data-id="${id}">${drafts['del-'+id]?'Confirmă ștergerea':'Șterge produsul'}</button>`:''}</div>`)}
async function importXlsx(file){try{
  if(!window.XLSX)throw new Error('cititorul Excel nu s-a încărcat');
  const wb=XLSX.read(await file.arrayBuffer(),{type:'array'});const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{header:1,defval:null});
  const hi=rows.findIndex(r=>r.some(c=>/cod/i.test(String(c||'')))&&r.some(c=>/intrare/i.test(String(c||''))));
  const H=hi>=0?rows[hi].map(c=>String(c||'')):[],fi=re=>H.findIndex(c=>re.test(c));
  const ix=hi>=0?{nr:fi(/^nr/i),code:fi(/cod/i),name:fi(/denumire|nume/i),war:fi(/garan/i),entry:fi(/intrare/i),exit:fi(/ie[sșş]ire/i),cat:fi(/categor/i)}:{nr:0,code:1,name:2,war:3,entry:4,exit:5,cat:-1};
  if(ix.name<0||ix.entry<0)throw new Error('nu găsesc coloanele Denumire și Preț intrare');
  const n=v=>typeof v==='number'?v:null,s=v=>v==null?'':String(v).replace(/\s*\n\s*/g,' / ').trim();
  let cat='';const out=[];
  rows.slice(hi+1).forEach(r=>{const nm=r[ix.name];
    if(nm&&(ix.nr<0||typeof r[ix.nr]==='number')&&(typeof r[ix.entry]==='number'||typeof r[ix.exit]==='number'||ix.nr>=0))
      out.push({code:s(r[ix.code]),name:String(nm).replace(/\s+/g,' ').trim(),warranty:ix.war>=0?s(r[ix.war]):'',category:ix.cat>=0&&r[ix.cat]?s(r[ix.cat]):cat,entry:n(r[ix.entry]),exit:ix.exit>=0?n(r[ix.exit]):null});
    else if(typeof r[0]==='string'&&r.slice(1).every(x=>x==null)&&r[0].length<80)cat=r[0].trim()});
  if(!out.length){toast('Nu am găsit produse în fișier. Verifică formatul coloanelor.',1);return}
  const used=new Set(),ch=[];let same=0;
  out.forEach(p=>{const nc=norm(p.code);let ex=nc?S.products.find(x=>!used.has(x.id)&&norm(x.code)===nc):null;
    if(!ex)ex=S.products.find(x=>!used.has(x.id)&&norm(x.name)===norm(p.name)&&(!nc||!x.code));
    if(!ex){ch.push({p,id:null});return}
    used.add(ex.id);const diffs=['code','name','warranty','category','entry','exit'].filter(k=>{if(k==='category'&&!p.category)return false;if(k==='warranty'&&!p.warranty)return false;return (ex[k]??'')!==(p[k]??'')});
    if(diffs.length)ch.push({p,id:ex.id,old:ex,diffs});else same++});
  const missing=S.products.filter(x=>!used.has(x.id)).length;
  drafts={};ui.imp=ch;
  const desc=c=>c.id?c.diffs.map(k=>k==='entry'||k==='exit'?`${k==='entry'?'intrare':'ieșire'} ${c.old[k]!=null?fmt(c.old[k]):'—'} → ${c.p[k]!=null?fmt(c.p[k]):'—'} €`:{code:'cod',name:'denumire',warranty:'garanție',category:'categorie'}[k]+' schimbată').join(', '):`produs nou · intrare ${c.p.entry!=null?eur(c.p.entry):'—'} · ieșire ${c.p.exit!=null?eur(c.p.exit):'—'}`;
  const sorted=ch.slice().sort((a,b)=>(a.id?0:1)-(b.id?0:1));
  openDrawer(`<div class="dh"><h2>Import listă de prețuri</h2><button class="btn sm" data-act="close">Închide</button></div><div class="sec"><p>Am citit <b>${out.length}</b> produse din fișier. Se actualizează <b>${ch.filter(c=>c.id).length}</b>, se adaugă <b>${ch.filter(c=>!c.id).length}</b>, rămân neschimbate <b>${same}</b>.${missing?` Încă <b>${missing}</b> produse din aplicație nu sunt în fișier și rămân cum sunt.`:''}</p>
  <p class="small muted">Produsele se potrivesc după cod (sau după denumire, dacă lipsește codul), nu după număr.</p>
  <div style="max-height:46vh;overflow:auto">${sorted.map(c=>`<div class="iss"><span>${c.id?badge('warn','modificat'):badge('info','nou')}</span><span><b>${esc(c.p.name)}</b> <span class="muted mono">${esc(c.p.code)}</span><div class="small muted">${esc(desc(c))}</div></span></div>`).join('')||'<p class="muted">Nicio modificare față de lista actuală.</p>'}</div>
  <p class="small muted">Comenzile existente își păstrează prețurile de la data comenzii.</p></div><div class="bar"><button class="btn pri" data-act="apply-import" ${ch.length?'':'disabled'}>Aplică importul</button><button class="btn" data-act="close">Anulează</button></div>`)}catch(e){toast('Fișierul nu a putut fi citit: '+e.message,1)}}
async function exportProducts(){if(!window.XLSX||!downloads){toast('Exportul nu este disponibil în acest context',1);return}
  const rows=[['Nr.','Cod model','Denumire comercială','Garanție','Preț intrare','Preț ieșire','Categorie']].concat(S.products.slice().sort((a,b)=>a.nr-b.nr).map(p=>[p.nr,p.code,p.name,p.warranty,p.entry,p.exit,p.category]));
  const wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),'Produse');
  try{await downloads.save({filename:'Lista-produse.xlsx',data:XLSX.write(wb,{type:'array',bookType:'xlsx'})});toast('Lista a fost descărcată')}catch(e){if(e.code!=='declined')toast('Descărcarea a eșuat: '+(e.message||e.code),1)}}

/* ---------- SETTINGS ---------- */
function vSettings(){const C=S.cfg,f=(id,l,v,t='text')=>`<label>${l}<input id="${id}" type="${t}" value="${esc(v)}"></label>`;
  return `<div class="bar"><h2 class="grow">Setări</h2></div>
  <div class="sec"><h3>Date firmă (apar pe proformă)</h3><div class="grid">${f('c-name','Denumire',C.coName)}${f('c-cui','CUI',C.coCui)}${f('c-reg','Nr. Reg. Com.',C.coReg)}${f('c-addr','Adresă',C.coAddr)}${f('c-bank','Bancă',C.coBank)}${f('c-iban','IBAN',C.coIban)}${f('c-email','Email',C.coEmail)}${f('c-phone','Telefon',C.coPhone)}</div></div>
  <div class="sec"><h3>Reguli de calcul</h3><div class="grid">${f('c-adv','Avans de la client la comandă (% din proformă)',C.adv,'number')}${f('c-hadv','Avans către Hexing la proformă (%)',C.hexAdv,'number')}${f('c-comm','Comision agent (% din adaos)',C.comm,'number')}${f('c-vat','TVA implicit (%)',C.vat,'number')}${f('c-hex','Termen plată Hexing (zile)',C.hexDays,'number')}${f('c-ser','Prefix număr proformă',C.series)}${f('c-mk','Adaos implicit când lipsește prețul de ieșire (%)',C.markup,'number')}${f('c-term','Termen de plată implicit pentru proforma către client (zile)',C.termDays,'number')}</div>
  <p class="small muted">Modificările de la avans, comision și termen se aplică tuturor comenzilor și documentelor, inclusiv celor existente.</p></div>
  <div class="sec"><h3>Furnizor Hexing (apare pe comanda către Hexing)</h3><div class="grid">${f('c-hxn','Denumire',C.hxName)}${f('c-hxc','CUI',C.hxCui)}${f('c-hxr','Nr. Reg. Com.',C.hxReg)}${f('c-hxa','Adresă',C.hxAddr)}${f('c-hxt','Persoană de contact și telefon',C.hxContact)}</div></div>
  <div class="sec"><h3>Cod de validare</h3><p class="small muted" style="max-width:70ch">Cu acest cod validezi facturile (cele către clienți și cele Hexing). O factură validată poate fi editată sau ștearsă doar cu codul.${C.pinHash?' <b>Codul este setat.</b>':' Codul nu este setat încă.'}</p>
   <div class="grid">${C.pinHash?f('pin-old','Codul actual','','password'):''}${f('pin-new','Cod nou (minim 4 caractere)','','password')}${f('pin-new2','Repetă codul nou','','password')}</div>
   <div class="bar" style="margin-top:8px"><button class="btn" data-act="save-pin">${C.pinHash?'Schimbă codul':'Setează codul'}</button></div><div id="pin-msg"></div></div>
  <button class="btn pri" data-act="save-cfg">Salvează setările</button>`}

/* ---------- PDF reader (Hexing e-Factura layout) ---------- */
async function readHexPdf(file){
  const lib=window.pdfjsLib;if(!lib)throw new Error('cititorul PDF nu s-a încărcat');
  lib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  const doc=await lib.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
  const items=[];
  for(let p=1;p<=doc.numPages;p++){const tc=await (await doc.getPage(p)).getTextContent();tc.items.forEach(i=>{const s=i.str.trim();if(s)items.push({s,x:i.transform[5],y:i.transform[4],a:i.transform[4],b:i.transform[5],p})})}
  if(items.some(i=>/^(PROFORMA|FACTURA)$/i.test(i.s))&&items.some(i=>/^Seria\s/i.test(i.s)))return readSmartBill(items);
  const rows=[];items.forEach(it=>{let r=rows.find(r=>r.p===it.p&&Math.abs(r.y-it.y)<1.8);if(!r){r={p:it.p,y:it.y,it:[]};rows.push(r)}r.it.push(it)});
  rows.forEach(r=>r.it.sort((a,b)=>a.x-b.x));
  const isDec=i=>/^-?\d+\.\d{2}$/.test(i.s),lines=[];
  rows.forEach(r=>{const idx=r.it.find(i=>/^\d{1,3}$/.test(i.s)&&i.x<45),q=r.it.find(i=>/^\d+\.\d{4}$/.test(i.s)),cur=r.it.find(i=>/^[A-Z]{3}$/.test(i.s));
    if(!idx||!q||!cur)return;
    const code=r.it.find(i=>i.x>45&&/[A-Z]/i.test(i.s)&&/^[A-Z0-9][A-Z0-9\-\/.]{4,}$/i.test(i.s));
    const dec=r.it.filter(isDec),price=dec.filter(i=>i.x<cur.x).pop(),val=dec[dec.length-1];
    if(!code||!price)return;
    lines.push({n:+idx.s,code:code.s,qty:+q.s,unit:+price.s,val:val?+val.s:null,cy:code.y,cp:code.p})});
  lines.sort((a,b)=>a.n-b.n);
  lines.forEach((l,k)=>{const nx=lines[k+1],lim=nx&&nx.cp===l.cp?nx.cy-0.5:l.cy+30;l.desc=items.filter(i=>i.p===l.cp&&i.x>45&&i.x<110&&i.y>l.cy+0.5&&i.y<lim&&!/^"?pretul|^Cod NC/i.test(i.s)).sort((a,b)=>a.y-b.y).map(i=>i.s).join(' ').replace(/\s+/g,' ').trim()});
  const valueFor=(lab,re)=>{const l=items.find(i=>lab.test(i.s));if(!l)return null;
    const c=items.filter(i=>re.test(i.s)&&i.p===l.p&&Math.abs(i.y-l.y)<1.5&&i.x>l.x).sort((a,b)=>a.x-b.x)[0];return c?c.s:null};
  const number=(items.find(i=>/^[A-Z]{1,5}\d{2,4}\s+nr\.?\s*\d+$/i.test(i.s))||items.find(i=>/^PHX\d+/i.test(i.s))||{}).s||'';
  let date=valueFor(/^Data emitere/i,/^\d{4}-\d{2}-\d{2}$/);const dm=/(\d{2})\.(\d{2})\.(\d{4})/.exec(number);if(!date&&dm)date=`${dm[3]}-${dm[2]}-${dm[1]}`;const due=valueFor(/^Data scadenta/i,/^\d{4}-\d{2}-\d{2}$/);
  const firstY=lines.length?Math.min(...rows.filter(r=>r.it.some(i=>lines.some(l=>l.code===i.s))).map(r=>r.y)):1e9;
  const tr=rows.filter(r=>r.p===1&&r.y<firstY&&r.it.filter(isDec).length>=3).sort((a,b)=>a.y-b.y)[0];
  const td=tr?tr.it.filter(isDec):[];
  const net=td[1]?+td[1].s:r2(sum(lines,l=>l.val||l.qty*l.unit)),gross=td[2]?+td[2].s:null;
  let advance=0,advDate='',proformaRef='';
  items.forEach(i=>{let m=/incasare\s+(\d{2}\.\d{2}\.\d{4})\s*=\s*([\d.,]+)\s*ron/i.exec(i.s);if(m){advDate=m[1];advance+=num(m[2])}
    m=/proforma\s+([A-Z0-9]+\/\d{2}\.\d{2}\.\d{4})/i.exec(i.s);if(m)proformaRef=m[1]});
  const ad=/(\d{2})\.(\d{2})\.(\d{4})/.exec(advDate);return {kind:'final',number,date:date||'',due:due||'',net,gross,advance,advDate:ad?`${ad[3]}-${ad[2]}-${ad[1]}`:'',proformaRef,lines}}
function readSmartBill(items){
  const rows=[];items.forEach(it=>{let r=rows.find(r=>r.p===it.p&&Math.abs(r.b-it.b)<1.8);if(!r){r={p:it.p,b:it.b,it:[]};rows.push(r)}r.it.push(it)});
  rows.forEach(r=>r.it.sort((x,y)=>x.a-y.a));
  const sm=items.map(i=>/Seria\s+(\S+)\s+nr\.?\s*(\d+)/i.exec(i.s)).find(Boolean);
  const number=sm?sm[1]+sm[2]:'';
  const dm=items.map(i=>/^Data.*?(\d{2})\/(\d{2})\/(\d{4})/i.exec(i.s)).find(Boolean);
  const codes=items.filter(i=>i.a>60&&i.a<110&&/[A-Z]/i.test(i.s)&&/^[A-Z0-9][A-Z0-9\-\/.]{5,}$/i.test(i.s));
  const isDec=i=>/^\d+\.\d{2}$/.test(i.s),lines=[];
  const lr=[];
  rows.slice().sort((x,y)=>x.p-y.p||y.b-x.b).forEach(r=>{const idx=r.it.find(i=>/^\d{1,3}$/.test(i.s)&&i.a<60),bu=r.it.find(i=>/^(buc|set|m|kg|ore?)\.?$/i.test(i.s)),dec=r.it.filter(isDec);
    if(!idx||!bu||dec.length<2)return;
    const q=r.it.find(i=>/^\d+(\.\d+)?$/.test(i.s)&&i.a>bu.a&&i.a<dec[0].a);if(!q)return;
    lr.push({r,idx,q,dec})});
  lr.forEach((x,k)=>{const prev=k>0&&lr[k-1].r.p===x.r.p?lr[k-1].r.b:Infinity;
    const code=codes.filter(c=>c.p===x.r.p&&c.b>=x.r.b-1&&c.b<prev-1).sort((m,n)=>n.b-m.b)[0];if(!code)return;
    const desc=items.filter(i=>i.p===x.r.p&&i.a>60&&i.a<110&&i.b<code.b-0.5&&i.b>=x.r.b-1&&!/^"?pretul|^Cod NC/i.test(i.s)).sort((m,n)=>n.b-m.b||m.a-n.a).map(i=>i.s).join(' ').replace(/\s+/g,' ').trim();
    lines.push({n:+x.idx.s,code:code.s,qty:+x.q.s,unit:+x.dec[0].s,val:+x.dec[1].s,desc})});
  lines.sort((a,b)=>a.n-b.n);
  const tr=rows.find(r=>r.it.some(i=>/^Total$/i.test(i.s))&&r.it.filter(isDec).length>=1),tp=rows.find(r=>r.it.some(i=>/^Total plata/i.test(i.s)));
  const td=tr?tr.it.filter(isDec):[],net=td[0]?+td[0].s:r2(sum(lines,l=>l.val)),gross=tp&&tp.it.filter(isDec)[0]?+tp.it.filter(isDec)[0].s:null;
  return {kind:items.some(i=>/^PROFORMA$/i.test(i.s))?'proforma':'invoice',number,date:dm?`${dm[3]}-${dm[2]}-${dm[1]}`:'',due:'',net,gross,advance:0,advDate:'',proformaRef:'',lines}}
const setv=(id,v)=>{const e=document.getElementById(id);if(e&&v!=null&&v!=='')e.value=v};
async function handleHexFile(f){const box=$('#h-read');
  if(!(/\.pdf$/i.test(f.name)||f.type==='application/pdf')){box.innerHTML='';return}
  box.innerHTML='<div class="msg info">Se citește PDF-ul…</div>';
  try{const r=await readHexPdf(f);if(!r.lines.length)throw new Error('nu am găsit rândurile de produse');
    const isPf=r.kind==='proforma';$('#h-kind').value=isPf?'proforma':'final';hexKind();
    setv('h-num',r.number);setv('h-date',r.date);if(!isPf)setv('h-due',r.due);setv('h-total',r.net);setv('h-tvat',r.gross);setv('h-adv',r.advance||'');setv('h-advd',r.advDate);
    hd.lines=r.lines.map(l=>{const p=findProduct(l.code);return {productId:p?p.id:'',code:p?(p.code||''):l.code,rawCode:l.code,desc:l.desc||'',qty:l.qty,unit:l.unit}});drawHexLines();
    const nw=hd.lines.filter(l=>!l.productId).length;
    if(r.proformaRef){const base=norm(r.proformaRef.split('/')[0]);const px=S.hexing.find(x=>x.kind==='proforma'&&norm(x.number).includes(base));if(px)$('#h-ref').value=px.id}
    const nt=$('#h-notes');if(!nt.value.trim()&&(r.proformaRef||r.advance))nt.value=[r.proformaRef?`Conform proformei ${r.proformaRef}`:'',r.advance?`avans încasat de Hexing${r.advDate?' la '+fdate(r.advDate):''}: ${ron(r.advance)}`:''].filter(Boolean).join('; ');
    box.innerHTML=`<div class="msg ok">Am citit ${isPf?'proforma':'factura'} ${esc(r.number)}: ${r.lines.length} rânduri, ${ron(r.net)} fără TVA${r.advance?`, avans ${ron(r.advance)}`:''}. ${nw?` ${nw} ${nw===1?'cod nou va fi adăugat':'coduri noi vor fi adăugate'} în lista de produse la salvare.`:''} Verifică datele și apasă „Salvează și verifică”.</div>`}
  catch(e){box.innerHTML=`<div class="msg warn">Nu am putut citi automat PDF-ul (${esc(e.message||'eroare')}). Fișierul rămâne atașat; introdu rândurile manual sau lipește-le din Excel.</div>`}}
