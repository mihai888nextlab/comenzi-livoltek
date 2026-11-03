/* ---------- actions ---------- */
document.addEventListener('input',e=>{const a=e.target.dataset&&e.target.dataset.actInput;if(!a)return;const v=e.target.type==='checkbox'?e.target.checked:e.target.value;
  if(a==='oq')ui.q=v;if(a==='hq')ui.hq=v;if(a==='pq')ui.pq=v;if(a==='pcat')ui.pcat=v;if(a==='sonly')ui.sOnly=v;render()});
document.addEventListener('change',e=>{const t=e.target;if(t.dataset&&t.dataset.actInput==='pcat'){ui.pcat=t.value;render()}if(t.id==='imp'&&t.files[0])importXlsx(t.files[0])});
const guard=async fn=>{try{await fn()}catch(e){toast('Operația a eșuat: '+(e.message||e.code),1)}};
document.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b||b.dataset.actInput)return;const a=b.dataset.act,id=b.dataset.id,d=b.dataset;
 const A={
  tab(){ui.tab=d.v;try{localStorage.setItem('cl-tab',ui.tab)}catch(e){}render();window.scrollTo(0,0)},
  filter(){ui.filter=d.v;render()},
  close(){closeDrawer()},
  'new-order'(){openOrderForm()},
  order(){openLive(()=>orderDetail(id))},
  'edit-order'(){openOrderForm(id)},
  'mk-all'(){const m=parseFloat($('#f-mkall').value),k=isNaN(m)?S.cfg.markup:m;od.lines.forEach(l=>{const e=entOf(l);if(e>0)l.unitEur=r2(e*(1+k/100))});drawLines();recalc()},
  'ho-fillclient'(){const o=S.orders.find(z=>z.id===id);if(o)$('#ho-client').value=o.clientName},
  hexorder(){openHexOrder(id)},'dl-hexorder'(){dlHexOrder()},
  'new-cinv'(){openCinvForm(d.order||'')},cinv(){openLive(()=>cinvDetail(id))},'edit-cinv'(){const x=S.cinv.find(z=>z.id===id);if(x&&x.locked){toast('Factura este validată.',1);return}openCinvForm('',id)},
  'cinv-fill'(){cd.orderId=$('#c-order').value;cd.lines=remainingLines(cd.orderId,cd.id);drawCLines()},
  'cinv-addline'(){cd.lines.push({productId:'',qty:1,unit:''});drawCLines()},'cinv-rm'(){cd.lines.splice(+d.i,1);drawCLines()},
  'save-cinv'(){guard(saveCinv)},
  lock(){guard(async()=>{if(!S.cfg.pinHash){toast('Setează mai întâi codul de validare în Setări.',1);return}if(!await checkPin($('#pin-v').value)){toast('Cod greșit.',1);return}await db.doc(d.kind+'/'+id).update({locked:true,lockedAt:todayS()});drafts['pin-v']='';toast('Factura a fost validată')})},
  unlock(){guard(async()=>{if(!await checkPin($('#pin-u').value)){toast('Cod greșit.',1);return}await db.doc(d.kind+'/'+id).update({locked:false,lockedAt:''});drafts['pin-u']='';toast('Factura a fost deblocată')})},
  'del-locked'(){guard(async()=>{if(!await checkPin($('#pin-u').value)){toast('Cod greșit.',1);return}await db.doc(d.kind+'/'+id).delete();closeDrawer();toast('Factura a fost ștearsă')})},
  'save-pin'(){guard(async()=>{const g=i=>($('#'+i)||{value:''}).value,m=(t,k)=>{$('#pin-msg').innerHTML=`<div class="msg ${k}">${t}</div>`};if(S.cfg.pinHash&&!await checkPin(g('pin-old'))){m('Codul actual este greșit.','bad');return}if(g('pin-new').length<4){m('Codul nou trebuie să aibă cel puțin 4 caractere.','bad');return}if(g('pin-new')!==g('pin-new2')){m('Cele două coduri nu coincid.','bad');return}const salt=Math.random().toString(36).slice(2);await db.doc('settings/main').set({...S.cfg,pinSalt:salt,pinHash:await hashPin(g('pin-new'),salt)});toast('Codul a fost salvat')})},
  'del-cinv'(){const x=S.cinv.find(z=>z.id===id);if(x&&x.locked){toast('Factura este validată. Folosește codul.',1);return}if(!drafts['del-'+id]){drafts['del-'+id]=1;refreshLive();return}guard(async()=>{await db.doc('cinv/'+id).delete();closeDrawer();toast('Factura a fost ștearsă')})},
  'add-line'(){od.lines.push({productId:'',qty:1,unitEur:''});drawLines();recalc()},
  'rm-line'(){od.lines.splice(+d.i,1);if(!od.lines.length)od.lines.push({productId:'',qty:1,unitEur:''});drawLines();recalc()},
  'save-order'(){guard(saveOrder)},
  proforma(){showProforma(id)},'dl-pf'(){dlProforma(id)},
  'del-order'(){if(S.cinv.some(x=>x.orderId===id)){toast('Comanda are facturi încărcate. Șterge-le întâi.',1);return}if(!drafts['del-'+id]){drafts['del-'+id]=1;refreshLive();return}guard(async()=>{for(const p of payOf({id}))await db.doc('payments/'+p.id).delete();await db.doc('orders/'+id).delete();closeDrawer();toast('Comanda a fost ștearsă')})},
  'add-pay'(){guard(async()=>{const amt=+val('p-amt',$('#p-amt').value);if(!(amt>0)){toast('Introdu suma plătită',1);return}
    await db.collection('payments').doc().set({orderId:id,date:val('p-date',$('#p-date').value)||todayS(),amount:r2(amt),kind:val('p-kind',$('#p-kind').value),note:val('p-note','').trim()});
    ['p-amt','p-note','p-kind','p-date'].forEach(k=>delete drafts[k]);toast('Plata a fost înregistrată');refreshLive()})},
  'del-pay'(){guard(()=>db.doc('payments/'+id).delete())},
  'set-final'(){guard(async()=>{const no=(val('fi-no','')||'').trim();if(!no){toast('Introdu numărul facturii finale',1);return}
    await db.doc('orders/'+id).update({finalInvoiceNo:no,finalInvoiceDate:val('fi-date',todayS())});delete drafts['fi-no'];toast('Comanda este facturată și scăzută din stoc')})},
  'clear-final'(){guard(()=>db.doc('orders/'+id).update({finalInvoiceNo:'',finalInvoiceDate:''}))},
  'com-pay'(){guard(()=>db.doc('orders/'+id).update({commissionPaidDate:todayS()}))},
  'com-unpay'(){guard(()=>db.doc('orders/'+id).update({commissionPaidDate:''}))},
  'new-hex'(){openHexForm()},hex(){openLive(()=>hexDetail(id))},'edit-hex'(){const x=S.hexing.find(z=>z.id===id);if(x&&x.locked){toast('Factura este validată.',1);return}openHexForm(id)},
  'hex-addline'(){hd.lines.push({productId:'',code:'',qty:1,unit:''});drawHexLines()},
  'hex-rm'(){hd.lines.splice(+d.i,1);drawHexLines()},
  'hex-parse'(){const r=parsePaste($('#h-paste').value);if(!r.length){toast('Nu am găsit rânduri valide. Folosește: cod, cantitate, preț.',1);return}hd.lines.push(...r);$('#h-paste').value='';drawHexLines();toast(`${r.length} rânduri importate`)},
  'save-hex'(){guard(saveHex)},
  'del-hex'(){const x=S.hexing.find(z=>z.id===id);if(x&&x.locked){toast('Factura este validată. Folosește codul.',1);return}if(!drafts['del-'+id]){drafts['del-'+id]=1;refreshLive();return}guard(async()=>{await db.doc('hexing/'+id).delete();closeDrawer();toast('Documentul a fost șters')})},
  'hex-pay'(){guard(()=>db.doc('hexing/'+id).update({paidDate:val('hp-date',todayS())}))},
  'hex-advpay'(){guard(async()=>{const amt=+$('#ha-amt').value;if(!(amt>0)){toast('Introdu suma plătită',1);return}await db.doc('hexing/'+id).update({advance:r2(amt),advDate:$('#ha-date').value||todayS()});delete drafts['ha-amt'];toast('Avansul a fost înregistrat')})},
  'hex-advunpay'(){guard(()=>db.doc('hexing/'+id).update({advance:'',advDate:''}))},
  'hex-unpay'(){guard(()=>db.doc('hexing/'+id).update({paidDate:''}))},
  'new-agent'(){openAgent()},'edit-agent'(){openAgent(id)},
  'save-agent'(){guard(async()=>{const name=$('#a-name').value.trim();if(!name){$('#a-err').innerHTML='<div class="msg bad">Completează numele agentului.</div>';return}
    const data={name,phone:$('#a-phone').value.trim(),email:$('#a-email').value.trim(),active:$('#a-act').checked};
    const ref=id?db.doc('agents/'+id):db.collection('agents').doc();await ref.set(data);closeDrawer();toast('Agentul a fost salvat')})},
  'del-agent'(){if(S.orders.some(o=>o.agentId===id)){guard(async()=>{await db.doc('agents/'+id).update({active:false});closeDrawer()});return}guard(async()=>{await db.doc('agents/'+id).delete();closeDrawer()})},
  'new-prod'(){openProd()},'edit-prod'(){openProd(id)},
  'save-prod'(){guard(async()=>{const name=$('#pr-name').value.trim();if(!name){$('#pr-err').innerHTML='<div class="msg bad">Completează denumirea.</div>';return}
    const n=v=>v===''?null:+v;const data={nr:+d.nr,code:$('#pr-code').value.trim(),name,warranty:$('#pr-war').value.trim(),category:$('#pr-cat').value.trim(),entry:n($('#pr-in').value),exit:n($('#pr-out').value)};
    const ref=id?db.doc('products/'+id):db.doc('products/p'+String(data.nr).padStart(3,'0'));await ref.set(data);closeDrawer();toast('Produsul a fost salvat')})},
  'rm-set'(){ui.rm=d.v;render()},'rm-prev'(){ui.rm=shiftYm(ui.rm,-1);render()},'rm-next'(){ui.rm=shiftYm(ui.rm,1);render()},'exp-report'(){exportReport()},
  'exp-prod'(){exportProducts()},
  'del-prod'(){const used=S.orders.some(o=>(o.lines||[]).some(l=>l.productId===id))||S.hexing.some(h=>(h.lines||[]).some(l=>l.productId===id))||S.cinv.some(x=>(x.lines||[]).some(l=>l.productId===id));
    if(used){toast('Produsul apare în comenzi sau documente și nu poate fi șters.',1);return}
    if(!drafts['del-'+id]){drafts['del-'+id]=1;openProd(id);return}guard(async()=>{await db.doc('products/'+id).delete();closeDrawer();toast('Produsul a fost șters')})},
  'apply-import'(){guard(async()=>{const ch=ui.imp||[];toast('Se actualizează lista…');let nr=Math.max(0,...S.products.map(x=>x.nr));
    const jobs=ch.map(c=>{if(c.id){const {id:_i,...rest}=c.old,u={};c.diffs.forEach(k=>u[k]=c.p[k]);return ()=>db.doc('products/'+c.id).set({...rest,...u})}
      nr++;const id='p'+String(nr).padStart(3,'0'),mynr=nr;return ()=>db.doc('products/'+id).set({...c.p,nr:mynr})});
    for(let i=0;i<jobs.length;i+=10)await Promise.all(jobs.slice(i,i+10).map(f=>f()));
    closeDrawer();toast(`${ch.length} produse actualizate`)})},
  'save-cfg'(){guard(async()=>{const g=i=>$('#'+i).value.trim(),n=i=>+$('#'+i).value;
    await db.doc('settings/main').set({coName:g('c-name'),coCui:g('c-cui'),coReg:g('c-reg'),coAddr:g('c-addr'),coBank:g('c-bank'),coIban:g('c-iban'),coEmail:g('c-email'),coPhone:g('c-phone'),adv:n('c-adv'),comm:n('c-comm'),vat:n('c-vat'),hexDays:n('c-hex'),hexAdv:n('c-hadv'),markup:n('c-mk'),termDays:n('c-term'),hxName:g('c-hxn'),hxCui:g('c-hxc'),hxReg:g('c-hxr'),hxAddr:g('c-hxa'),hxContact:g('c-hxt'),series:g('c-ser')||'WMP',pinHash:S.cfg.pinHash||'',pinSalt:S.cfg.pinSalt||''});toast('Setările au fost salvate')})},
 };
 if(A[a]){const r=A[a]();if(r&&r.then)r.catch(()=>{})}});

/* ---------- boot ---------- */
(async()=>{
  const c=window.claude;if(!c||!c.use){render();return}
  db=await c.use('db');assets=await c.use('assets').catch(()=>null);downloads=await c.use('downloads').catch(()=>null);
  if(!db){render();return}
  const sub=(name,key)=>db.collection(name).onSnapshot(s=>{S[key]=s.docs.map(d=>({id:d.id,...d.data()}));loaded[key]=1;render()},e=>{toast('Eroare la citirea datelor: '+(e.message||e.code),1)});
  sub('products','products');sub('agents','agents');sub('orders','orders');sub('payments','payments');sub('hexing','hexing');sub('cinv','cinv');
  db.doc('settings/main').onSnapshot(s=>{S.cfg={...DEF,...(s.exists?s.data():{})};loaded.cfg=1;render()},()=>{loaded.cfg=1;render()});
  setTimeout(()=>{if(!KEYS.every(k=>loaded[k]))$('#view').innerHTML='<div class="empty"><b>Datele se încarcă greu</b>Reîncarcă pagina dacă mesajul rămâne.</div>'},10000);
})();
