/* ---------- conexiunea cu serverul (înlocuiește window.claude) ----------
   Expune același API pe care îl folosește restul aplicației:
   db.collection(c).onSnapshot / .doc(id?).set|update|delete, db.doc('c/id'),
   assets.upload(file), downloads.save({filename, data}). */
(function(){
  const cache={};              // c -> {id: data}
  const subs=[];               // {c, id?, f, err}
  let lastJson={};             // c -> JSON pentru detectarea schimbărilor
  const clone=o=>JSON.parse(JSON.stringify(o));
  const newId=()=>{const a=new Uint8Array(10);crypto.getRandomValues(a);return Array.from(a,b=>b.toString(36).padStart(2,'0')).join('').slice(0,20)};

  async function api(url,opt={}){
    const r=await fetch(url,{credentials:'same-origin',cache:'no-store',...opt});
    if(r.status===401){location.replace('/login');throw new Error('Sesiunea a expirat.')}
    const j=await r.json().catch(()=>({}));
    if(!r.ok)throw new Error(j.error||('Eroare server '+r.status));
    return j;
  }
  function fire(c){subs.forEach(s=>{if(s.c!==c)return;try{s.f(snap(s))}catch(e){console.error(e)}})}
  function snap(s){const col=cache[s.c]||{};
    if(s.id!=null){const d=col[s.id];return {id:s.id,exists:!!d,data:()=>d?clone(d):undefined}}
    return {docs:Object.keys(col).map(id=>({id,exists:true,data:()=>clone(col[id])}))}}

  let loadedOnce=false,loading=null;
  async function refresh(){
    if(loading)return loading;
    loading=(async()=>{
      try{
        const {collections}=await api('/api/data');
        const names=new Set([...Object.keys(collections),...Object.keys(cache),...subs.map(s=>s.c)]);
        names.forEach(c=>{const next=collections[c]||{},js=JSON.stringify(next);
          if(!loadedOnce||lastJson[c]!==js){cache[c]=next;lastJson[c]=js;fire(c)}});
        loadedOnce=true;
      }catch(e){
        if(!loadedOnce){const v=document.getElementById('view');
          if(v)v.innerHTML='<div class="empty"><b>Datele nu au putut fi încărcate</b>'+String(e.message||e).replace(/</g,'&lt;')+'</div>';}
        subs.forEach(s=>s.err&&s.err(e));
      }finally{loading=null}
    })();
    return loading;
  }
  // sincronizare: la 20 s și când revii în fereastră
  setInterval(()=>{if(document.visibilityState==='visible')refresh()},20000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')refresh()});

  function local(c,id,data){const col=cache[c]=cache[c]||{};if(data===null)delete col[id];else col[id]=data;lastJson[c]=JSON.stringify(col);fire(c)}
  async function write(c,id,method,body,optimistic){
    const before=cache[c]&&cache[c][id]?clone(cache[c][id]):null;
    local(c,id,optimistic);
    try{await api(`/api/data/${encodeURIComponent(c)}/${encodeURIComponent(id)}`,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined})}
    catch(e){local(c,id,before);throw e}
  }
  function docRef(c,id){id=id||newId();return {id,
    set:d=>write(c,id,'PUT',d,clone(d)),
    update:d=>{const cur=cache[c]&&cache[c][id];if(!cur)return Promise.reject(new Error('Documentul nu există.'));return write(c,id,'PATCH',d,{...clone(cur),...clone(d)})},
    delete:()=>write(c,id,'DELETE',null,null),
    onSnapshot:(f,err)=>{const s={c,id,f,err};subs.push(s);if(loadedOnce)setTimeout(()=>f(snap(s)),0);return()=>{const i=subs.indexOf(s);if(i>=0)subs.splice(i,1)}}}}
  const db={
    collection:c=>({doc:id=>docRef(c,id),onSnapshot:(f,err)=>{const s={c,f,err};subs.push(s);if(loadedOnce)setTimeout(()=>f(snap(s)),0);return()=>{const i=subs.indexOf(s);if(i>=0)subs.splice(i,1)}}}),
    doc:p=>{const [c,id]=p.split('/');return docRef(c,id)}};

  const assets={async upload(file){const fd=new FormData();fd.append('file',file,file.name);return api('/api/files',{method:'POST',body:fd})}};
  const MIME={pdf:'application/pdf',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',html:'text/html;charset=utf-8',json:'application/json',csv:'text/csv;charset=utf-8'};
  const downloads={async save({filename,data}){
    const ext=(filename.split('.').pop()||'').toLowerCase();
    const blob=data instanceof Blob?data:new Blob([data],{type:MIME[ext]||'application/octet-stream'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),4000);return {ok:true}}};

  window.__wm={refresh,api};
  window.claude={use:async n=>{if(n==='db'){refresh();return db}if(n==='assets')return assets;if(n==='downloads')return downloads;return null}};
})();
