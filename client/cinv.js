/* ---------- CLIENT INVOICES ---------- */
function vCinv(){
  const rows=S.cinv.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  return `<div class="bar"><h2 class="grow">Facturi către clienți</h2><button class="btn pri" data-act="new-cinv">Încarcă factură</button></div>
  <p class="muted small" style="margin-top:-6px;max-width:74ch">Stocul scade doar pe baza facturilor încărcate aici. Fiecare factură se leagă de o comandă și se verifică față de proformă: produse, cantități și prețuri în lei.</p>
  ${rows.length?`<div class="tbl"><table><thead><tr><th>Factură</th><th>Data</th><th>Client</th><th>Proformă</th><th class="r">Total fără TVA</th><th>Verificare</th></tr></thead><tbody>
  ${rows.map(x=>{const o=S.orders.find(z=>z.id===x.orderId),v=verifyCinv(x);return `<tr class="click" data-act="cinv" data-id="${x.id}"><td class="mono">${esc(x.number)}${x.locked?' <span class="badge acc">Validată</span>':''}</td><td class="num">${fdate(x.date)}</td><td>${esc(o?o.clientName:'—')}</td><td class="mono">${esc(o?o.number:'—')}</td><td class="r num">${ron(v.calc)}</td><td>${vBadge(v)}</td></tr>`}).join('')}</tbody></table></div>`
  :`<div class="tbl"><div class="empty"><b>Nicio factură către client</b>Încarcă factura finală emisă clientului. Marfa iese din stoc doar după ce factura este în aplicație.</div></div>`}`}

function cinvDetail(id){const x=S.cinv.find(z=>z.id===id);if(!x)return null;const v=verifyCinv(x),o=S.orders.find(z=>z.id===x.orderId);
  return `<div class="dh"><div><h2>Factură client <span class="mono">${esc(x.number)}</span></h2><div class="muted small">Data ${fdate(x.date)}${o?` · ${esc(o.clientName)} · proformă ${esc(o.number)}`:''}</div></div><div style="display:flex;gap:8px;align-items:center">${vBadge(v)}<button class="btn sm" data-act="close">Închide</button></div></div>
  ${lockBar('cinv',id,x,'edit-cinv','del-cinv','',o?`<button class="btn" data-act="order" data-id="${o.id}">Vezi comanda</button>`:'')}
  <div class="sec"><h3>Rezultatul verificării</h3>${v.iss.length?v.iss.map(i=>`<div class="iss">${badge(i.sev==='bad'?'bad':'warn',i.sev==='bad'?'Eroare':'Atenție')}<span>${esc(i.t)}</span></div>`).join(''):'<div class="msg ok">Produsele, cantitățile și prețurile corespund proformei.</div>'}</div>
  <div class="sec"><h3>Rânduri (scad din stoc)</h3><div class="tbl" style="border:0"><table><thead><tr><th>Produs</th><th class="r">Cant.</th><th class="r">Preț lei</th><th class="r">Valoare lei</th><th></th></tr></thead><tbody>
  ${(x.lines||[]).map((l,i)=>{const p=prod(l.productId),m=v.ln[i]||[];return `<tr><td>${p?esc(p.name):'<i>necunoscut</i>'}<div class="muted small mono">${esc(l.code||(p&&p.code)||'')}</div></td><td class="r num">${l.qty}</td><td class="r num">${fmt(l.unit)}</td><td class="r num">${fmt(r2(l.qty*l.unit))}</td><td>${m.length?badge('bad','verifică'):badge('ok','ok')}</td></tr>`}).join('')}</tbody></table></div>
  <div class="kv tot" style="max-width:340px;margin-left:auto"><span>Total rânduri fără TVA</span><span class="num">${ron(v.calc)}</span></div>
  <div class="kv" style="max-width:340px;margin-left:auto"><span>Total declarat fără TVA</span><span class="num">${x.total!==''&&x.total!=null?ron(x.total):'—'}</span></div></div>`}

let cd=null;
function remainingLines(orderId,exceptId){const o=S.orders.find(z=>z.id===orderId);if(!o)return[];const c=calcOrder(o);
  const done={};S.cinv.filter(z=>z.orderId===orderId&&z.id!==exceptId).forEach(z=>(z.lines||[]).forEach(l=>{done[l.productId]=(done[l.productId]||0)+(+l.qty||0)}));
  const seen={},out=[];c.lines.forEach(l=>{if(seen[l.productId])return;seen[l.productId]=1;const rem=c.ordQ[l.productId]-(done[l.productId]||0);
    if(rem>0)out.push({productId:l.productId,code:l.code||(l.p&&l.p.code)||'',qty:rem,unit:l.unitRon})});return out}
function openCinvForm(orderId,id){const src=S.cinv.find(z=>z.id===id);
  cd=src?JSON.parse(JSON.stringify(src)):{orderId:orderId||'',number:'',date:todayS(),total:'',totalVat:'',lines:[],notes:'',fileUrl:'',fileName:'',fileId:''};
  if(src)cd.id=id;if(!src&&cd.orderId)cd.lines=remainingLines(cd.orderId,null);
  drafts={};openDrawer(`<div class="dh"><h2>${src?'Editează factura către client':'Încarcă factură către client'}</h2><button class="btn sm" data-act="close">Închide</button></div>
  <div class="sec"><div class="grid">
   <label>Comanda<select id="c-order"><option value="">Alege comanda</option>${S.orders.slice().sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map(o=>`<option value="${o.id}" ${o.id===cd.orderId?'selected':''}>${esc(o.number)} · ${esc(o.clientName)}</option>`).join('')}</select></label>
   <label>Număr factură<input id="c-num" value="${esc(cd.number)}"></label><label>Data facturii<input id="c-date" type="date" value="${cd.date}"></label>
   <label>Total fără TVA lei (opțional)<input id="c-total" type="number" step="0.01" value="${cd.total}"></label><label>Total cu TVA lei (opțional)<input id="c-tvat" type="number" step="0.01" value="${cd.totalVat}"></label>
   <label>Fișier PDF<input id="c-file" type="file" accept=".pdf,image/*">${cd.fileName?`<span class="small muted">Atașat: ${esc(cd.fileName)}</span>`:''}${assets?'':'<span class="small" style="color:var(--amber)">Încărcarea fișierelor necesită drepturi de editare.</span>'}</label></div><div id="c-read"></div></div>
  <div class="sec"><h3>Produse facturate</h3><div class="bar"><button class="btn sm" data-act="cinv-fill">Completează din comandă (ce nu e facturat încă)</button><button class="btn sm" data-act="cinv-addline">Adaugă rând</button></div>
   <div class="tbl lines" style="border:0"><table><thead><tr><th style="min-width:260px">Produs</th><th style="width:80px">Cant.</th><th style="width:120px">Preț lei fără TVA</th><th class="r">Valoare lei</th><th></th></tr></thead><tbody id="c-lines"></tbody></table></div></div>
  <div id="c-err"></div><div class="bar"><button class="btn pri" data-act="save-cinv">Salvează și verifică</button><button class="btn" data-act="close">Anulează</button></div>`);
  drawCLines()}
function drawCLines(){$('#c-lines').innerHTML=cd.lines.map((l,i)=>{const p=prod(l.productId);
  return `<tr data-i="${i}"><td><input class="cpick" list="plist" value="${esc(p?plabel(p):(l.rawCode||''))}" autocomplete="off" placeholder="Cod sau denumire">${!p&&l.rawCode?'<div class="small" style="color:var(--bad)">Produs nelegat de listă, alege-l din listă</div>':''}</td>
  <td><input class="cqty" type="number" min="1" step="1" value="${l.qty}"></td><td><input class="cunit" type="number" step="0.01" value="${l.unit}"></td><td class="r num">${fmt(r2((+l.qty||0)*(+l.unit||0)))}</td><td><button class="btn sm bad" data-act="cinv-rm" data-i="${i}" aria-label="Șterge rândul">×</button></td></tr>`}).join('')}
document.addEventListener('change',e=>{const t=e.target;
  if(t.id==='c-order'){cd.orderId=t.value;if(!cd.lines.length||cd.lines.every(l=>!l.productId)){cd.lines=remainingLines(cd.orderId,cd.id);drawCLines()}}
  if(t.id==='c-file'&&t.files[0])handleCinvFile(t.files[0]);
  if(t.closest&&t.closest('#c-lines')){const i=+t.closest('tr').dataset.i,l=cd.lines[i];
    if(t.classList.contains('cpick')){const p=findProduct(t.value);l.productId=p?p.id:'';if(p){l.code=p.code||'';if(!(+l.unit)){const o=S.orders.find(z=>z.id===cd.orderId);const ol=o&&calcOrder(o).lines.find(z=>z.productId===p.id);if(ol)l.unit=ol.unitRon}}else l.rawCode=t.value}
    if(t.classList.contains('cqty'))l.qty=t.value;if(t.classList.contains('cunit'))l.unit=t.value;drawCLines()}});
async function handleCinvFile(f){const box=$('#c-read');
  if(!(/\.pdf$/i.test(f.name)||f.type==='application/pdf')){box.innerHTML='';return}
  box.innerHTML='<div class="msg info">Se citește PDF-ul…</div>';
  try{const r=await readHexPdf(f);if(!r.lines.length)throw new Error('nu am găsit rândurile de produse');
    setv('c-num',r.number);setv('c-date',r.date);setv('c-total',r.net);setv('c-tvat',r.gross);
    cd.lines=r.lines.map(l=>{const p=findProduct(l.code)||findProduct(l.desc);return {productId:p?p.id:'',code:p?(p.code||''):'',rawCode:l.code,qty:l.qty,unit:l.unit}});drawCLines();
    const un=cd.lines.filter(l=>!l.productId).length;
    box.innerHTML=`<div class="msg ${un?'warn':'ok'}">Am citit factura ${esc(r.number)}: ${r.lines.length} rânduri, ${ron(r.net)} fără TVA.${un?` ${un} rânduri nu s-au potrivit cu lista de produse: alege produsul din listă.`:''} Verifică datele și apasă „Salvează și verifică”.</div>`}
  catch(e){box.innerHTML=`<div class="msg warn">Nu am putut citi automat PDF-ul (${esc(e.message||'eroare')}). Fișierul rămâne atașat; folosește „Completează din comandă” sau introdu rândurile manual.</div>`}}
async function saveCinv(){const g=id=>$('#'+id).value.trim(),err=[];
  const x={orderId:$('#c-order').value,number:g('c-num'),date:g('c-date'),total:g('c-total')===''?'':+g('c-total'),totalVat:g('c-tvat')===''?'':+g('c-tvat'),notes:'',fileUrl:cd.fileUrl||'',fileName:cd.fileName||'',fileId:cd.fileId||'',
    lines:cd.lines.filter(l=>l.productId||l.qty||l.unit).map(l=>({productId:l.productId||'',code:l.code||'',qty:+l.qty,unit:+l.unit}))};
  if(!x.orderId)err.push('Alege comanda la care se referă factura.');if(!x.number)err.push('Completează numărul facturii.');if(!x.date)err.push('Alege data facturii.');
  if(!x.lines.length)err.push('Adaugă cel puțin un produs facturat.');
  x.lines.forEach((l,i)=>{if(!l.productId)err.push(`Rândul ${i+1}: alege produsul din listă.`);else if(!(l.qty>0)||!Number.isInteger(l.qty))err.push(`Rândul ${i+1}: cantitate invalidă.`);else if(!(l.unit>0))err.push(`Rândul ${i+1}: introdu prețul în lei.`)});
  if(err.length){$('#c-err').innerHTML=`<div class="msg bad">${err.map(esc).join('<br>')}</div>`;return}
  const f=$('#c-file').files[0];
  try{if(f){if(!assets)throw new Error('Încărcarea fișierelor nu este disponibilă pentru contul tău.');toast('Se încarcă fișierul…');const r=await assets.upload(f);x.fileUrl=r.url;x.fileId=r.id;x.fileName=f.name}
    if(cd.id){x.createdAt=cd.createdAt||'';await db.doc('cinv/'+cd.id).set(x)}else{x.createdAt=new Date().toISOString();const ref=db.collection('cinv').doc();await ref.set(x);cd.id=ref.id}
    toast('Factura a fost salvată. Stocul s-a actualizat.');const id=cd.id;openLive(()=>cinvDetail(id))}
  catch(e){toast('Nu s-a putut salva: '+(e.message||e.code),1)}}

/* ---------- ORDER FORM TO HEXING (PDF) ---------- */
let ho=null;
function openHexOrder(id){const o=S.orders.find(z=>z.id===id);if(!o)return;const c=calcOrder(o),stk={};stock().forEach(r=>{stk[r.p.id]=r.st});
  ho={orderId:id,lines:c.lines.map(l=>({productId:l.productId,code:l.code||(l.p&&l.p.code)||'',name:l.name||(l.p&&l.p.name)||'',qty:l.q,entry:l.ent,stock:stk[l.productId]||0}))};
  drafts={};openDrawer(`<div class="dh"><div><h2>Comandă către Hexing</h2><div class="muted small">Pentru comanda clientului ${esc(o.clientName)}, proformă ${esc(o.number)}</div></div><button class="btn sm" data-act="close">Închide</button></div>
  <div class="sec"><div class="grid"><label>Număr comandă<input id="ho-num" value="${esc(o.hexOrderNo||'CMD-'+o.number)}"></label><label>Data<input id="ho-date" type="date" value="${o.hexOrderDate||todayS()}"></label>
   <label>Nume client (opțional, apare pe comandă)<input id="ho-client" value="${esc(o.hexOrderClient||'')}" placeholder="lasă gol dacă nu vrei să apară" autocomplete="off"><button type="button" class="btn sm" data-act="ho-fillclient" data-id="${id}" style="align-self:flex-start">Completează cu ${esc(o.clientName)}</button></label></div>
   <label style="margin-top:12px">Observații (apar pe comandă)<textarea id="ho-notes" rows="2" placeholder="ex. livrare la sediu, contact"></textarea></label></div>
  <div class="sec"><h3>Produse de comandat</h3><p class="small muted" style="margin-top:0">Pune cantitatea 0 pentru produsele pe care nu le comanzi acum, de exemplu cele deja pe stoc.</p>
   <div class="tbl" style="border:0"><table><thead><tr><th>Produs</th><th class="r">Pe stoc</th><th style="width:90px">Cant.</th><th class="r">Preț intrare €</th><th class="r">Valoare €</th></tr></thead><tbody>
   ${ho.lines.map((l,i)=>`<tr data-i="${i}"><td>${esc(l.name)}<div class="muted small mono">${esc(l.code)}</div></td><td class="r num">${l.stock}</td><td><input class="hoq" type="number" min="0" step="1" value="${l.qty}"></td><td class="r num">${fmt(l.entry)}</td><td class="r num hov">${fmt(r2(l.qty*l.entry))}</td></tr>`).join('')}</tbody></table></div>
   <div class="kv tot" style="max-width:340px;margin-left:auto"><span>Total fără TVA</span><span class="num" id="ho-tot">${eur(r2(sum(ho.lines,l=>l.qty*l.entry)))}</span></div></div>
  <div id="ho-err"></div><div class="bar"><button class="btn pri" data-act="dl-hexorder">Descarcă PDF</button><button class="btn" data-act="order" data-id="${id}">Înapoi la comandă</button></div>`)}
document.addEventListener('input',e=>{const t=e.target;if(!t.classList||!t.classList.contains('hoq'))return;const tr=t.closest('tr'),l=ho.lines[+tr.dataset.i];l.qty=+t.value||0;
  tr.querySelector('.hov').textContent=fmt(r2(l.qty*l.entry));$('#ho-tot').textContent=eur(r2(sum(ho.lines,x=>x.qty*x.entry)))});
async function dlHexOrder(){const o=S.orders.find(z=>z.id===ho.orderId),C=S.cfg;
  const lines=ho.lines.filter(l=>l.qty>0);if(!lines.length){$('#ho-err').innerHTML='<div class="msg bad">Pune cantitate la cel puțin un produs.</div>';return}
  const J=window.jspdf;if(!J||!downloads){toast('Generatorul PDF nu este disponibil în acest context',1);return}
  const number=$('#ho-num').value.trim()||'CMD-'+o.number,date=$('#ho-date').value||todayS(),notes=$('#ho-notes').value.trim(),client=$('#ho-client').value.trim();
  const doc=new J.jsPDF({unit:'mm',format:'a4'});
  doc.addFileToVFS('DV.ttf',FONT_REG);doc.addFont('DV.ttf','DV','normal');doc.addFileToVFS('DVB.ttf',FONT_BOLD);doc.addFont('DVB.ttf','DV','bold');
  const W=210,M=14;doc.setFont('DV','bold');doc.setFontSize(18);doc.text('COMANDĂ DE ACHIZIȚIE',M,20);
  doc.setFontSize(10);doc.setFont('DV','normal');doc.text(`Nr. ${number}   ·   Data ${fdate(date)}`,M,27);
  const party=(x,title,l1)=>{doc.setFont('DV','bold');doc.setFontSize(8);doc.setTextColor(100);doc.text(title,x,38);doc.setTextColor(0);doc.setFontSize(10);doc.text(l1[0],x,44);doc.setFont('DV','normal');doc.setFontSize(9);
    const rest=doc.splitTextToSize(l1.slice(1).filter(Boolean).join('\n'),85);doc.text(rest,x,49)};
  party(M,'CUMPĂRĂTOR',[C.coName,C.coCui?'CUI '+C.coCui:'',C.coReg?'Reg. com. '+C.coReg:'',C.coAddr,C.coEmail,C.coPhone]);
  party(W/2+4,'FURNIZOR',[C.hxName,C.hxCui?'CUI '+C.hxCui:'',C.hxReg?'Reg. com. '+C.hxReg:'',C.hxAddr,C.hxContact?'Contact: '+C.hxContact:'']);
  doc.setFontSize(10);doc.setFont('DV','normal');doc.text('Vă rugăm să emiteți factura proformă pentru produsele de mai jos.',M,81);
  let sy=91;if(client){doc.setFont('DV','bold');doc.text('Client: '+client,M,87);doc.setFont('DV','normal');sy=93}
  const total=r2(sum(lines,l=>l.qty*l.entry));
  doc.autoTable({startY:sy,margin:{left:M,right:M},styles:{font:'DV',fontSize:9,cellPadding:2},headStyles:{fillColor:[20,32,42],font:'DV',fontStyle:'bold'},
    head:[['Nr.','Cod produs','Denumire','U.M.','Cant.','Preț unitar €','Valoare €']],
    body:lines.map((l,i)=>[i+1,l.code,l.name,'buc',l.qty,fmt(l.entry),fmt(r2(l.qty*l.entry))]),
    foot:[[{content:'Total fără TVA',colSpan:6,styles:{halign:'right',fontStyle:'bold'}},{content:fmt(total)+' €',styles:{fontStyle:'bold',halign:'right'}}]],footStyles:{fillColor:[232,237,241],textColor:0,font:'DV'},
    columnStyles:{0:{cellWidth:10},1:{cellWidth:38},3:{cellWidth:12},4:{halign:'right',cellWidth:14},5:{halign:'right',cellWidth:30},6:{halign:'right',cellWidth:26}},theme:'grid'});
  let y=doc.lastAutoTable.finalY+8;doc.setFontSize(9);doc.setFont('DV','normal');
  const cond=[`Prețuri în EUR, fără TVA, conform listei de prețuri în vigoare. Facturare în RON.`,`Plată: avans ${C.hexAdv}% la proformă, diferența în ${C.hexDays} de zile de la data facturii.`,notes?`Observații: ${notes}`:''].filter(Boolean);
  doc.setFont('DV','bold');doc.text('Condiții',M,y);doc.setFont('DV','normal');y+=5;cond.forEach(t=>{const s=doc.splitTextToSize(t,W-2*M);doc.text(s,M,y);y+=s.length*4.6});
  doc.setFontSize(8);doc.setTextColor(100);doc.text(`Referință internă: proformă client ${o.number}`,M,285);
  try{await downloads.save({filename:`Comanda-${number.replace(/[^\w-]+/g,'_')}.pdf`,data:doc.output('arraybuffer')});
    await db.doc('orders/'+o.id).update({hexOrderNo:number,hexOrderDate:date,hexOrderClient:client});toast('Comanda către Hexing a fost descărcată')}
  catch(e){if(e.code!=='declined')toast('Descărcarea a eșuat: '+(e.message||e.code),1)}}

/* ---------- validation code (lock) ---------- */
async function hashPin(code,salt){const s=salt+'|'+code;if(window.crypto&&crypto.subtle){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return 'S'+[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('')}
  let h1=0xdeadbeef,h2=0x41c6ce57;for(let i=0;i<s.length;i++){const k=s.charCodeAt(i);h1=Math.imul(h1^k,2654435761);h2=Math.imul(h2^k,1597334677)}return 'C'+(h1>>>0).toString(16)+(h2>>>0).toString(16)}
async function checkPin(code){return !!S.cfg.pinHash&&!!code&&await hashPin(code,S.cfg.pinSalt||'')===S.cfg.pinHash}
function lockBar(kind,id,x,editAct,delAct,file,extra=''){const fl=x.fileUrl?`<a class="btn" href="${esc(x.fileUrl)}" target="_blank" rel="noopener">Deschide ${esc(x.fileName||'fișierul')}</a>`:'';
  if(x.locked)return `<div class="bar">${fl}${extra}<span class="badge acc">Validată${x.lockedAt?' · '+fdate(x.lockedAt):''}</span></div>
   <div class="grid" style="align-items:end"><label>Cod de validare<input id="pin-u" type="password" autocomplete="off" value="${esc(val('pin-u'))}"></label><div class="bar" style="margin:0"><button class="btn" data-act="unlock" data-kind="${kind}" data-id="${id}">Deblochează pentru editare</button><button class="btn bad" data-act="del-locked" data-kind="${kind}" data-id="${id}">Șterge cu cod</button></div></div>`;
  return `<div class="bar">${fl}${extra}<button class="btn" data-act="${editAct}" data-id="${id}">Editează</button><button class="btn bad" data-act="${delAct}" data-id="${id}">${drafts['del-'+id]?'Confirmă ștergerea'+(kind==='cinv'?' (stocul revine)':''):'Șterge'}</button></div>
   <div class="grid" style="align-items:end"><label>Cod de validare<input id="pin-v" type="password" autocomplete="off" value="${esc(val('pin-v'))}"></label><div class="bar" style="margin:0"><button class="btn pri" data-act="lock" data-kind="${kind}" data-id="${id}">Validează factura</button></div></div>
   <p class="small muted">După validare, factura poate fi editată sau ștearsă doar cu codul.</p>`}
