/* ---------- MONTHLY REPORT ---------- */
const MON=['ianuarie','februarie','martie','aprilie','mai','iunie','iulie','august','septembrie','octombrie','noiembrie','decembrie'];
const MONS=['ian','feb','mar','apr','mai','iun','iul','aug','sep','oct','nov','dec'];
const ymLabel=ym=>{const [y,m]=ym.split('-').map(Number);return `${MON[m-1]} ${y}`};
const ymShort=ym=>{const [y,m]=ym.split('-').map(Number);return `${MONS[m-1]} ${String(y).slice(2)}`};
const shiftYm=(ym,d)=>{const [y,m]=ym.split('-').map(Number);const t=y*12+(m-1)+d;return `${Math.floor(t/12)}-${String(t%12+1).padStart(2,'0')}`};
const sgn=n=>(n>0?'+':'')+ron(n);
function costRonUnit(pid,date){const fin=S.hexing.filter(h=>h.kind==='final');
  const pick=list=>{let q=0,v=0;list.forEach(h=>(h.lines||[]).forEach(l=>{if(l.productId===pid&&+l.qty>0&&+l.unit>0){q+=+l.qty;v+=l.qty*l.unit}}));return q?v/q:null};
  const a=pick(fin.filter(h=>!date||h.date<=date));return a!=null?a:pick(fin)}
function saleRows(){const rows=[];
  S.cinv.forEach(x=>{const o=S.orders.find(z=>z.id===x.orderId),c=o?calcOrder(o):null,rate=o?+o.rate:0;
    (x.lines||[]).forEach(l=>{const ol=c&&c.lines.find(z=>z.productId===l.productId),q=+l.qty||0,p=prod(l.productId);
      const saleRon=r2(q*l.unit),saleEur=ol?r2(q*ol.u):(rate>0?r2(saleRon/rate):0);
      const hu=costRonUnit(l.productId,x.date),noHex=hu==null,noEntry=!(ol&&ol.ent>0);
      let costEur=noEntry?(hu&&rate>0?r2(q*hu/rate):0):r2(q*ol.ent);
      const costAtRate=r2(costEur*rate),costRon=noHex||noEntry?costAtRate:r2(q*hu);
      const marEur=r2(saleEur-costEur),marRon=r2(saleRon-costAtRate),fx=r2(costAtRate-costRon),profit=r2(saleRon-costRon);
      const com=ol&&!noEntry?r2(S.cfg.comm/100*marEur*rate):0;
      rows.push({ym:(x.date||'').slice(0,7),inv:x,o,q,saleRon,saleEur,costEur,costRon,marEur,marRon,fx,profit,com,noHex,noEntry,rate})})});
  return rows}
function purchaseRows(){return S.hexing.filter(h=>h.kind==='final'&&h.date).map(h=>{const net=hexTotal(h);let eurK=0,ronK=0,unk=0;
  (h.lines||[]).forEach(l=>{const p=prod(l.productId),v=l.qty*l.unit;if(p&&p.entry>0){eurK+=l.qty*p.entry;ronK+=v}else unk+=v});
  const imp=eurK>0?ronK/eurK:null,eur=r2(eurK+(imp?unk/imp:0));
  return {ym:h.date.slice(0,7),h,net,eur,rate:eur>0?net/eur:null}})}
function monthAgg(ym,S1,P1){const s=S1.filter(r=>r.ym===ym),p=P1.filter(r=>r.ym===ym),a=f=>r2(sum(s,f));
  const o={sRon:a(r=>r.saleRon),sEur:a(r=>r.saleEur),cRon:a(r=>r.costRon),cEur:a(r=>r.costEur),mEur:a(r=>r.marEur),mRon:a(r=>r.marRon),fx:a(r=>r.fx),profit:a(r=>r.profit),com:a(r=>r.com),
    pRon:r2(sum(p,r=>r.net)),pEur:r2(sum(p,r=>r.eur)),nS:s.length,nP:p.length,noHex:s.filter(r=>r.noHex).length,noEntry:s.filter(r=>r.noEntry).length};
  o.net=r2(o.profit-o.com);return o}
function vReport(){
  const ym=ui.rm,S1=saleRows(),P1=purchaseRows(),A=monthAgg(ym,S1,P1);
  const months=[];for(let i=-11;i<=0;i++){const k=shiftYm(ym,i);months.push({k,a:monthAgg(k,S1,P1)})}
  const hasAny=S.cinv.length||S.hexing.some(h=>h.kind==='final');
  const fxk=A.fx>0?'ok':A.fx<0?'bad':'';
  const stats=`<div class="stats">
   <div><span>Vânzări fără TVA</span><b>${ron(A.sRon)}</b><em>${eur(A.sEur)} · ${A.nS} rânduri facturate</em></div>
   <div><span>Achiziții fără TVA (facturi Hexing)</span><b>${ron(A.pRon)}</b><em>${eur(A.pEur)} · ${A.nP} facturi</em></div>
   <div><span>Adaos (preț client − preț intrare)</span><b>${eur(A.mEur)}</b><em>${ron(A.mRon)} la cursul ING${A.cEur>0?` · ${fmt(A.mEur/A.cEur*100,1)}% din cost`:''}</em></div>
   <div><span>Diferență de curs valutar</span><b style="color:${A.fx>0?'var(--ok)':A.fx<0?'var(--bad)':'inherit'}">${A.nS?sgn(A.fx):'—'}</b><em>${A.fx>0?'favorabilă':A.fx<0?'nefavorabilă':'fără diferență'}</em></div>
   <div><span>Profit brut pe marfa vândută</span><b>${ron(A.profit)}</b><em>vânzări − costul real în lei</em></div>
   <div><span>Comisioane agenți</span><b>${ron(A.com)}</b><em>${S.cfg.comm}% din adaos</em></div>
   <div><span>Profit după comisioane</span><b>${ron(A.net)}</b><em>${A.sRon?fmt(A.net/A.sRon*100,1)+'% din vânzări':''}</em></div></div>`;
  // chart
  const mx=Math.max(1,...months.flatMap(m=>[m.a.sRon,m.a.pRon])),W=720,H=230,L=52,B=28,T=10,ch=H-B-T,gw=(W-L-8)/12;
  const nice=(v=>{const p=Math.pow(10,Math.floor(Math.log10(v)));const f=v/p;return (f<=1?1:f<=2?2:f<=5?5:10)*p})(mx),y=v=>T+ch-v/nice*ch;
  const kf=v=>v>=1e6?fmt(v/1e6,1)+' M':v>=1e3?fmt(v/1e3,0)+' k':fmt(v,0);
  const chart=`<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Vânzări și achiziții pe luni, în lei" style="width:100%;height:auto;max-height:260px">
   ${[0,1,2,3,4].map(i=>{const v=nice*i/4;return `<line x1="${L}" x2="${W-4}" y1="${y(v)}" y2="${y(v)}" stroke="var(--line)" stroke-width="1"/><text x="${L-6}" y="${y(v)+4}" text-anchor="end" font-size="11" fill="var(--muted)">${kf(v)}</text>`}).join('')}
   ${months.map((m,i)=>{const x0=L+i*gw,sel=m.k===ym;return `<g data-act="rm-set" data-v="${m.k}" style="cursor:pointer"><title>${ymLabel(m.k)}: vânzări ${ron(m.a.sRon)}, achiziții ${ron(m.a.pRon)}</title>
    <rect x="${x0}" y="${T}" width="${gw}" height="${ch+B-2}" fill="${sel?'var(--surface2)':'transparent'}"/>
    ${m.a.sRon>0?`<rect x="${x0+gw/2-14}" y="${y(m.a.sRon)}" width="13" height="${ch-(y(m.a.sRon)-T)}" rx="3" fill="var(--s1)"/>`:''}
    ${m.a.pRon>0?`<rect x="${x0+gw/2+1}" y="${y(m.a.pRon)}" width="13" height="${ch-(y(m.a.pRon)-T)}" rx="3" fill="var(--s2)"/>`:''}
    <text x="${x0+gw/2}" y="${H-9}" text-anchor="middle" font-size="11" fill="${sel?'var(--fg)':'var(--muted)'}" ${sel?'font-weight="600"':''}>${ymShort(m.k)}</text></g>`}).join('')}</svg>`;
  const sRows=S1.filter(r=>r.ym===ym),byInv={};sRows.forEach(r=>{(byInv[r.inv.id]=byInv[r.inv.id]||[]).push(r)});
  const invList=Object.values(byInv).map(rs=>{const f=k=>r2(sum(rs,r=>r[k]));return {inv:rs[0].inv,o:rs[0].o,rate:rs[0].rate,sRon:f('saleRon'),sEur:f('saleEur'),cEur:f('costEur'),cRon:f('costRon'),mEur:f('marEur'),fx:f('fx'),profit:f('profit'),com:f('com'),noHex:rs.some(r=>r.noHex),noEntry:rs.some(r=>r.noEntry)}}).sort((a,b)=>a.inv.date.localeCompare(b.inv.date));
  const pList=P1.filter(r=>r.ym===ym).sort((a,b)=>a.h.date.localeCompare(b.h.date));
  return `<div class="bar"><h2 class="grow">Raport lunar</h2><button class="btn" data-act="rm-prev" aria-label="Luna anterioară">‹</button><input id="rm" type="month" value="${ym}" style="width:auto"><button class="btn" data-act="rm-next" aria-label="Luna următoare">›</button><button class="btn" data-act="exp-report">Descarcă (Excel)</button></div>
  <p class="muted small" style="margin-top:-6px;max-width:76ch">${ymLabel(ym)}. Vânzările sunt facturile către clienți încărcate cu data în lună, achizițiile sunt facturile finale Hexing din lună. Toate sumele sunt fără TVA.</p>
  ${hasAny?stats:`<div class="tbl"><div class="empty"><b>Nu există încă date pentru raport</b>Raportul se completează din facturile finale Hexing și din facturile către clienți încărcate în aplicație.</div></div>`}
  ${A.noHex||A.noEntry?`<div class="msg warn">${A.noHex?`${A.noHex} rânduri vândute nu au încă factură Hexing de achiziție, deci costul lor este estimat la cursul ING și nu au diferență de curs. `:''}${A.noEntry?`${A.noEntry} rânduri nu au preț de intrare în euro, deci adaosul lor în euro este estimat din costul real.`:''}</div>`:''}
  ${hasAny?`<div class="sec"><h3>Ultimele 12 luni</h3>
   <div style="display:flex;gap:16px;margin-bottom:6px;font-size:12.5px"><span><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:var(--s1);margin-right:6px"></i>Vânzări (lei)</span><span><i style="display:inline-block;width:10px;height:10px;border-radius:2px;background:var(--s2);margin-right:6px"></i>Achiziții (lei)</span><span class="muted">Apasă pe o lună pentru detalii</span></div>
   ${chart}
   <div class="tbl" style="margin-top:12px"><table><thead><tr><th>Luna</th><th class="r">Vânzări lei</th><th class="r">Vânzări €</th><th class="r">Achiziții lei</th><th class="r">Achiziții €</th><th class="r">Adaos €</th><th class="r">Diferență curs lei</th><th class="r">Profit brut lei</th><th class="r">Comisioane lei</th><th class="r">Profit după comisioane</th></tr></thead><tbody>
   ${months.slice().reverse().map(m=>`<tr class="click" data-act="rm-set" data-v="${m.k}" style="${m.k===ym?'font-weight:600;background:var(--surface2)':''}"><td style="white-space:nowrap">${ymLabel(m.k)}</td><td class="r num">${fmt(m.a.sRon)}</td><td class="r num">${fmt(m.a.sEur)}</td><td class="r num">${fmt(m.a.pRon)}</td><td class="r num">${fmt(m.a.pEur)}</td><td class="r num">${fmt(m.a.mEur)}</td><td class="r num" style="color:${m.a.fx>0?'var(--ok)':m.a.fx<0?'var(--bad)':'inherit'}">${m.a.nS?sgn(m.a.fx).replace(' lei',''):'—'}</td><td class="r num">${fmt(m.a.profit)}</td><td class="r num">${fmt(m.a.com)}</td><td class="r num">${fmt(m.a.net)}</td></tr>`).join('')}</tbody></table></div></div>
  <div class="sec"><h3>Vânzări facturate în ${ymLabel(ym)}</h3>${invList.length?`<div class="tbl" style="border:0"><table><thead><tr><th>Factură</th><th>Client</th><th class="r">Vânzare lei</th><th class="r">Vânzare €</th><th class="r">Cost €</th><th class="r">Adaos €</th><th class="r">Curs ING</th><th class="r">Curs Hexing</th><th class="r">Diferență curs lei</th><th class="r">Profit brut lei</th><th class="r">Comision lei</th></tr></thead><tbody>
   ${invList.map(r=>`<tr class="click" data-act="cinv" data-id="${r.inv.id}"><td class="mono">${esc(r.inv.number)}<div class="small muted">${fdate(r.inv.date)}</div></td><td>${esc(r.o?r.o.clientName:'—')}</td><td class="r num">${fmt(r.sRon)}</td><td class="r num">${fmt(r.sEur)}</td><td class="r num">${fmt(r.cEur)}</td><td class="r num">${fmt(r.mEur)}</td><td class="r num">${fmt(r.rate,4)}</td><td class="r num">${r.noHex||!(r.cEur>0)?'—':fmt(r.cRon/r.cEur,4)}</td><td class="r num" style="color:${r.fx>0?'var(--ok)':r.fx<0?'var(--bad)':'inherit'}">${r.noHex?'—':fmt(r.fx)}</td><td class="r num">${fmt(r.profit)}</td><td class="r num">${fmt(r.com)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">Nicio factură către client în această lună.</p>'}</div>
  <div class="sec"><h3>Achiziții Hexing în ${ymLabel(ym)}</h3>${pList.length?`<div class="tbl" style="border:0"><table><thead><tr><th>Factură</th><th>Data</th><th class="r">Net lei</th><th class="r">Echivalent €</th><th class="r">Curs implicit</th><th>Plată</th></tr></thead><tbody>
   ${pList.map(r=>`<tr class="click" data-act="hex" data-id="${r.h.id}"><td class="mono">${esc(r.h.number)}</td><td class="num">${fdate(r.h.date)}</td><td class="r num">${fmt(r.net)}</td><td class="r num">${fmt(r.eur)}</td><td class="r num">${r.rate?fmt(r.rate,4):'—'}</td><td>${hexPayBadge(r.h)}</td></tr>`).join('')}</tbody></table></div>`:'<p class="muted">Nicio factură finală Hexing în această lună.</p>'}</div>
  <details class="sec"><summary style="cursor:pointer;font-weight:600">Cum se calculează</summary><div class="small muted" style="line-height:1.6;margin-top:8px">
   <b>Adaos €</b> = valoarea în euro din proformă − prețul de intrare din listă, pentru produsele facturate.<br>
   <b>Cost real în lei</b> = cantitatea facturată × prețul mediu în lei din facturile finale Hexing primite până la data facturii către client.<br>
   <b>Diferență de curs</b> = prețul de intrare în euro la cursul ING din proformă − costul real în lei. Pozitivă (favorabilă) înseamnă că Hexing te-a facturat mai ieftin decât ar fi ieșit la cursul ING.<br>
   <b>Profit brut</b> = vânzări în lei − cost real în lei = adaosul în lei la cursul ING + diferența de curs.<br>
   <b>Comision</b> = ${S.cfg.comm}% din adaosul în euro, la cursul din proformă. <b>Profit după comisioane</b> = profit brut − comisioane.</div></details>`:''}`}
async function exportReport(){if(!window.XLSX||!downloads){toast('Exportul nu este disponibil în acest context',1);return}
  const ym=ui.rm,S1=saleRows(),P1=purchaseRows(),A=monthAgg(ym,S1,P1);
  const wb=XLSX.utils.book_new(),add=(n,rows)=>XLSX.utils.book_append_sheet(wb,XLSX.utils.aoa_to_sheet(rows),n);
  add('Rezumat',[['Raport lunar',ymLabel(ym)],[],['Vânzări fără TVA lei',A.sRon],['Vânzări fără TVA €',A.sEur],['Achiziții fără TVA lei',A.pRon],['Achiziții fără TVA €',A.pEur],['Adaos €',A.mEur],['Adaos lei la curs ING',A.mRon],['Diferență de curs lei',A.fx],['Profit brut lei',A.profit],['Comisioane lei',A.com],['Profit după comisioane lei',A.net]]);
  add('Vânzări',[['Factură','Data','Client','Proformă','Cant.','Vânzare lei','Vânzare €','Cost €','Adaos €','Curs ING','Cost real lei','Diferență curs lei','Profit brut lei','Comision lei']].concat(S1.filter(r=>r.ym===ym).map(r=>[r.inv.number,r.inv.date,r.o?r.o.clientName:'',r.o?r.o.number:'',r.q,r.saleRon,r.saleEur,r.costEur,r.marEur,r.rate,r.costRon,r.fx,r.profit,r.com])));
  add('Achiziții',[['Factură','Data','Net lei','Echivalent €','Curs implicit']].concat(P1.filter(r=>r.ym===ym).map(r=>[r.h.number,r.h.date,r.net,r.eur,r.rate?r2(r.rate*10000)/10000:''])));
  try{await downloads.save({filename:`Raport-${ym}.xlsx`,data:XLSX.write(wb,{type:'array',bookType:'xlsx'})});toast('Raportul a fost descărcat')}catch(e){if(e.code!=='declined')toast('Descărcarea a eșuat: '+(e.message||e.code),1)}}
document.addEventListener('change',e=>{if(e.target.id==='rm'&&e.target.value){ui.rm=e.target.value;render()}});
