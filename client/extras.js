/* ---------- extra pentru versiunea web: ieșire din cont, backup ---------- */
(function(){
  const top=document.querySelector('.top');
  if(top&&!document.getElementById('logout')){const b=document.createElement('button');b.id='logout';b.className='btn sm';b.textContent='Ieșire';b.style.marginLeft='auto';
    b.onclick=async()=>{await fetch('/api/logout',{method:'POST'}).catch(()=>{});location.replace('/login')};
    const brand=top.querySelector('.brand');if(brand){brand.style.display='flex';brand.style.alignItems='center';brand.style.gap='10px';brand.style.flexWrap='wrap';brand.appendChild(b)}else top.appendChild(b)}
})();
const __vSettings=vSettings;
vSettings=function(){return __vSettings()+`
  <div class="sec" style="margin-top:18px"><h3>Backup date</h3>
   <p class="small muted" style="max-width:70ch">Descarcă periodic o copie a tuturor datelor (comenzi, plăți, facturi, produse, agenți, setări) într-un fișier JSON. Fișierele PDF atașate nu sunt incluse. Același fișier îl poți încărca înapoi aici.</p>
   <div class="bar"><button class="btn" data-act="bk-exp">Descarcă backup</button></div>
   <div class="grid" style="align-items:end">
    <label>Fișier backup (.json)<input id="bk-file" type="file" accept=".json,application/json"></label>
    <label>Mod import<select id="bk-mode"><option value="merge">Adaugă și actualizează</option><option value="replace">Înlocuiește tot (șterge datele actuale)</option></select></label>
    ${S.cfg.pinHash?`<label>Cod de validare<input id="bk-pin" type="password" autocomplete="off"></label>`:''}
    <div class="bar" style="margin:0"><button class="btn" data-act="bk-imp">Încarcă backup</button></div></div><div id="bk-msg"></div></div>`};
document.addEventListener('click',e=>{const b=e.target.closest('[data-act]');if(!b)return;const a=b.dataset.act;
  if(a==='bk-exp')(async()=>{try{const j=await window.__wm.api('/api/backup');await downloads.save({filename:`backup-comenzi-${todayS()}.json`,data:JSON.stringify(j,null,1)});toast('Backup descărcat')}catch(err){toast('Backup eșuat: '+err.message,1)}})();
  if(a==='bk-imp')(async()=>{const m=(t,k)=>{$('#bk-msg').innerHTML=`<div class="msg ${k}">${esc(t)}</div>`};
    const f=$('#bk-file').files[0];if(!f){m('Alege fișierul de backup.','bad');return}
    if(S.cfg.pinHash&&!await checkPin($('#bk-pin').value)){m('Cod de validare greșit.','bad');return}
    let j;try{j=JSON.parse(await f.text())}catch{m('Fișierul nu este un JSON valid.','bad');return}
    const mode=$('#bk-mode').value;
    try{const r=await window.__wm.api('/api/backup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({docs:j.docs,mode})});await window.__wm.refresh();toast(`Au fost importate ${r.count} înregistrări`)}catch(err){m('Importul a eșuat: '+err.message,'bad')}})();
});
