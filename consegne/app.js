/* ===================== Stato ===================== */
const KEY = 'giroConsegne.v1';
const DEF = {
  settings:{ base:null, apiKey:'', promiseMin:60, prepMin:15, serviceMin:3, maxStops:3, maxExtra:10, maxWait:5, mode:'TWO_WHEELER', speedKmh:22 },
  orders:[], drivers:[], cache:{}
};
let S = load();
function load(){
  try{ const s = JSON.parse(localStorage.getItem(KEY)); if(s) return {...DEF, ...s, settings:{...DEF.settings, ...s.settings}}; }catch(e){}
  return structuredClone(DEF);
}
function save(){ try{ localStorage.setItem(KEY, JSON.stringify(S)); }catch(e){} }
const uid = () => Math.random().toString(36).slice(2,9);
const MIN = 60000;
const now = () => Date.now();
const fmt = t => new Date(t).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const PLAT_COL = {'Sito':'#6d4cc2','Just Eat':'#ff8000','Uber Eats':'#06c167','Wolt':'#00a5d8','Telefono':'#7a7468'};
const TRIP_COL = ['#d2491d','#1f6fd1','#1f8a4c','#a83fb0','#c98a00','#0f8f8f','#b0304a','#5560c9'];

/* ===================== Google Maps ===================== */
let gReady = false;
async function googleGeocode(address, key){
  let url = 'https://maps.googleapis.com/maps/api/geocode/json?language=it&address='+encodeURIComponent(address)+'&key='+encodeURIComponent(key);
  const b = S.settings.base;
  if(b) url += `&bounds=${b.lat-.15},${b.lng-.2}|${b.lat+.15},${b.lng+.2}`;   // cerca vicino al locale
  const j = await (await fetch(url)).json();
  if(j.status==='ZERO_RESULTS') throw new Error('Indirizzo non trovato');
  if(j.status!=='OK') throw Object.assign(new Error(j.error_message || j.status), {google:true});
  const g = j.results[0];
  return {lat:g.geometry.location.lat, lng:g.geometry.location.lng, label:g.formatted_address};
}
/* Prova la chiave con una ricerca vera: se Google risponde, la chiave funziona */
async function checkKey(){
  gReady = false;
  if(S.settings.apiKey){
    try{ await googleGeocode(S.settings.base?.address || 'Berlin', S.settings.apiKey); gReady = true; }
    catch(e){ setBadge(); throw e; }
  }
  setBadge();
}
function setBadge(){
  const b = $('gBadge');
  b.textContent = gReady ? 'Google Maps collegato · tempi reali' : 'Tempi stimati (senza Google)';
  b.classList.toggle('on', gReady);
}

/* Geocodifica: Google se disponibile, altrimenti OpenStreetMap */
async function geocode(address){
  const m = address.match(/^\s*(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)\s*$/);
  if(m) return {lat:+m[1], lng:+m[2], label:address};
  if(gReady) return googleGeocode(address, S.settings.apiKey);
  let url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(address);
  if(S.settings.base){ const b=S.settings.base; url += `&viewbox=${b.lng-.2},${b.lat+.15},${b.lng+.2},${b.lat-.15}`; }
  const r = await fetch(url, {headers:{'Accept-Language':'it'}});
  const j = await r.json();
  if(!j[0]) throw new Error('Indirizzo non trovato');
  return {lat:+j[0].lat, lng:+j[0].lon, label:j[0].display_name.split(',').slice(0,3).join(',')};
}

/* ===================== Tempi di viaggio ===================== */
const pkey = p => p.lat.toFixed(5)+','+p.lng.toFixed(5);
function haversineKm(a,b){
  const R=6371, r=x=>x*Math.PI/180;
  const dLat=r(b.lat-a.lat), dLng=r(b.lng-a.lng);
  const h=Math.sin(dLat/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dLng/2)**2;
  return 2*R*Math.asin(Math.sqrt(h));
}
/* minuti da a -> b */
/* Per contenere i costi Google si chiedono solo i tragitti locale <-> cliente (2 per ordine, tenuti in memoria).
   I tragitti tra un cliente e l'altro si stimano in linea d'aria, corretti con il rapporto osservato sui tragitti Google. */
const CACHE_DAYS = 14;
function estimate(a,b){
  const km = haversineKm(a,b)*1.35;           // le strade non sono in linea d'aria
  return km / S.settings.speedKmh * 60 + 2;   // +2 min parcheggio/partenza
}
function calib(){
  const base = S.settings.base; if(!base) return 1;
  const r = [];
  for(const [k,c] of Object.entries(S.cache)){
    const [a,b] = k.split('>').map(x=>{const [lat,lng]=x.split(',').map(Number); return {lat,lng};});
    const est = estimate(a,b); if(est > 3) r.push(c.m/est);
  }
  if(r.length < 3) return 1;
  r.sort((x,y)=>x-y); return Math.min(2.5, Math.max(.4, r[Math.floor(r.length/2)]));
}
let calibCache = {n:-1, v:1};
function tt(a,b){
  if(pkey(a)===pkey(b)) return 0;
  const c = S.cache[pkey(a)+'>'+pkey(b)];
  if(c) return c.m;
  const n = Object.keys(S.cache).length;
  if(calibCache.n !== n) calibCache = {n, v:calib()};
  return Math.round(estimate(a,b) * calibCache.v);
}
let matrixBusy = false;
async function refreshMatrix(){
  if(!gReady || matrixBusy || !S.settings.base) return;
  const base = {lat:S.settings.base.lat, lng:S.settings.base.lng};
  for(const [k,c] of Object.entries(S.cache)) if(now()-c.at > CACHE_DAYS*24*60*MIN) delete S.cache[k];
  const pts = [...new Map(activeOrders().filter(o=>o.lat!=null).map(o=>[pkey(o),{lat:o.lat,lng:o.lng}])).values()];
  const out = pts.filter(p=>!S.cache[pkey(base)+'>'+pkey(p)]);
  const back = pts.filter(p=>!S.cache[pkey(p)+'>'+pkey(base)]);
  if(!out.length && !back.length) return;
  matrixBusy = true;
  try{
    for(let i=0;i<out.length;i+=25) await routeMatrix([base], out.slice(i,i+25));
    for(let i=0;i<back.length;i+=25) await routeMatrix(back.slice(i,i+25), [base]);
    save(); render();
  }catch(e){ console.warn('Routes API', e); }
  finally{ matrixBusy = false; }
}
async function routeMatrix(origins, dests){
  const wp = p => ({waypoint:{location:{latLng:{latitude:p.lat,longitude:p.lng}}}});
  const r = await fetch('https://routes.googleapis.com/distanceMatrix/v2:computeRouteMatrix', {
    method:'POST',
    headers:{'Content-Type':'application/json','X-Goog-Api-Key':S.settings.apiKey,'X-Goog-FieldMask':'originIndex,destinationIndex,duration,condition'},
    body: JSON.stringify({origins:origins.map(wp), destinations:dests.map(wp), travelMode:S.settings.mode, languageCode:'it'})
  });
  if(!r.ok) throw new Error('Routes API '+r.status+': '+(await r.text()).slice(0,200));
  const rows = await r.json();
  for(const e of rows){
    if(e.condition!=='ROUTE_EXISTS' || !e.duration) continue;
    const a=origins[e.originIndex], b=dests[e.destinationIndex];
    S.cache[pkey(a)+'>'+pkey(b)] = {m: Math.ceil(parseInt(e.duration)/60), at: now()};
  }
}

/* ===================== Ordini e fattorini ===================== */
const activeOrders = () => S.orders.filter(o=>o.status!=='consegnato');
const pendingOrders = () => S.orders.filter(o=>o.status==='attesa' && o.lat!=null);

async function addOrder({address, platform='Sito', name='', at=now(), promiseMin, prepMin, deadline}){
  const st = S.settings;
  const o = { id:uid(), address, platform, name, at,
    deadline: deadline ?? at + (promiseMin ?? st.promiseMin)*MIN,
    readyAt: at + (prepMin ?? st.prepMin)*MIN,
    status:'attesa', lat:null, lng:null };
  S.orders.push(o); save(); render();
  try{ Object.assign(o, await geocode(address)); o.geoError=null; }
  catch(e){ o.geoError = e.message; }
  save(); render(); refreshMatrix();
  return o;
}

function deliverTrip(driver){
  const ids = new Set(driver.trip?.orderIds||[]);
  S.orders = S.orders.filter(o=>!ids.has(o.id));
  driver.trip=null; driver.out=false;
  save();
}

/* ===================== Pianificazione ===================== */
/* Valuta un giro: partenza dal locale a t0 (o quando l'ultimo ordine è pronto), consegne in ordine, ritorno. */
function evalTrip(stops, t0){
  const base = S.settings.base, svc = S.settings.serviceMin*MIN;
  const dep = Math.max(t0, ...stops.map(o=>o.readyAt));
  let t = dep, prev = base; const etas = [];
  for(const o of stops){ t += tt(prev,o)*MIN; etas.push(t); t += svc; prev = o; }
  return {dep, etas, ret: t + tt(prev,base)*MIN};
}

/* Costruisce il prossimo giro per un fattorino libero a t0, partendo dall'ordine più urgente
   e aggiungendo gli ordini vicini finché nessuno sfora la promessa (o il ritardo massimo aggiunto). */
function buildTrip(t0, pool){
  const st = S.settings;
  const sorted = [...pool].sort((a,b)=>a.deadline-b.deadline || a.readyAt-b.readyAt);
  // l'ordine più urgente tra quelli pronti entro poco; se nessuno è pronto, il più urgente in assoluto
  const soon = sorted.filter(o=>o.readyAt <= t0 + st.maxWait*MIN);
  let trip = [ (soon[0] || sorted[0]) ];
  let ev = evalTrip(trip, t0);
  while(trip.length < st.maxStops){
    let best = null;
    for(const c of sorted){
      if(trip.includes(c)) continue;
      if(c.readyAt > ev.dep + st.maxWait*MIN) continue;          // non far aspettare troppo il fattorino
      for(let pos=0; pos<=trip.length; pos++){
        const cand = [...trip.slice(0,pos), c, ...trip.slice(pos)];
        const e2 = evalTrip(cand, t0);
        let ok = true;
        for(let i=0;i<cand.length && ok;i++){
          const o = cand[i];
          if(o===c){
            // il nuovo ordine deve arrivare in tempo, a meno che non sia già comunque in ritardo
            const alone = evalTrip([c], ev.ret).etas[0];
            if(e2.etas[i] > o.deadline && e2.etas[i] >= alone) ok = false;
          } else {
            const old = ev.etas[trip.indexOf(o)];
            if(e2.etas[i] - old > st.maxExtra*MIN) ok = false;
            if(e2.etas[i] > o.deadline && old <= o.deadline) ok = false;   // non far diventare tardi chi era in orario
          }
        }
        if(!ok) continue;
        const cost = e2.ret - ev.ret;
        if(!best || cost < best.cost) best = {cost, cand, e2};
      }
    }
    if(!best) break;
    trip = best.cand; ev = best.e2;
  }
  return {stops:trip, ...ev};
}

function plan(){
  const t = now();
  const drivers = S.drivers.filter(d=>d.onShift);
  const avail = new Map(drivers.map(d=>[d.id, d.out && d.trip ? Math.max(t, d.trip.ret) : t]));
  let pool = pendingOrders();
  const trips = [];
  let guard = 0;
  while(pool.length && drivers.length && guard++ < 60){
    const d = drivers.reduce((a,b)=>avail.get(a.id)<=avail.get(b.id)?a:b);
    const tr = buildTrip(avail.get(d.id), pool);
    tr.driver = d;
    trips.push(tr);
    pool = pool.filter(o=>!tr.stops.includes(o));
    avail.set(d.id, tr.ret);
  }
  return trips;
}

/* ===================== Rendering ===================== */
function etaClass(eta, deadline){
  const slack = (deadline-eta)/MIN;
  return slack < 0 ? 'bad' : slack < 8 ? 'warn' : 'ok';
}
function platTag(p){ return `<span class="plat" style="background:${PLAT_COL[p]||'#777'}">${esc(p)}</span>`; }

/* Aggiornamento automatico: all'orario di arrivo previsto l'ordine sparisce,
   all'orario di rientro previsto il fattorino torna libero. */
function autoUpdate(){
  const t = now(); let changed = false;
  for(const d of S.drivers){
    if(!d.out || !d.trip) continue;
    d.trip.orderIds.forEach((id,k)=>{
      if(t >= d.trip.etas[k] && S.orders.some(o=>o.id===id)){ S.orders = S.orders.filter(o=>o.id!==id); changed = true; }
    });
    if(t >= d.trip.ret){ deliverTrip(d); changed = true; }
  }
  S.orders = S.orders.filter(o=>o.status!=='consegnato');
  if(changed) save();
}

let lastTrips = [];
function render(){
  autoUpdate();
  const t = now();
  $('clock').textContent = fmt(t);
  const st = S.settings;
  $('baseInfo').textContent = st.base ? '📍 '+st.base.label : 'Imposta l\'indirizzo del locale per iniziare.';

  // --- ordini ---
  const act = S.orders.filter(o=>o.status==='attesa').sort((a,b)=>a.deadline-b.deadline);
  $('pendCount').textContent = S.orders.filter(o=>o.status==='attesa').length;
  $('orderList').innerHTML = act.length ? act.map(o=>{
    const left = Math.round((o.deadline-t)/MIN);
    const drv = o.status==='in_consegna' ? S.drivers.find(d=>d.id===o.driverId) : null;
    return `<div class="item">
      <div class="grow">
        <div class="addr">${esc(o.label||o.address)}</div>
        <div class="meta">${platTag(o.platform)} ${esc(o.name)} · entro <b>${fmt(o.deadline)}</b> (${left>=0?left+' min':'<span style="color:var(--bad)">in ritardo di '+(-left)+' min</span>'}) · pronto ${fmt(o.readyAt)}</div>
        ${o.geoError?`<div class="meta" style="color:var(--bad)">⚠ ${esc(o.geoError)} — <a href="#" data-regeo="${o.id}">riprova</a></div>`:''}
        ${o.lat==null && !o.geoError?'<div class="meta">Cerco l\'indirizzo…</div>':''}
        ${drv?`<div class="meta">🛵 in consegna con ${esc(drv.name)}</div>`:''}
      </div>
      <div style="display:flex;flex-direction:column;gap:4px">
        <button class="small" data-ready="${o.id}" title="Segna pronto adesso">Pronto</button>
        <button class="small" data-del="${o.id}" title="Elimina">✕</button>
      </div></div>`;
  }).join('') : '<div class="empty">Nessun ordine in attesa.</div>';

  // --- fattorini ---
  $('driverList').innerHTML = S.drivers.length ? S.drivers.map((d,i)=>{
    const col = TRIP_COL[i%TRIP_COL.length];
    let state = !d.onShift ? '<span class="muted">fuori turno</span>'
      : d.out && d.trip ? `in giro · rientro ~<b>${fmt(d.trip.ret)}</b>${d.trip.ret<t?' <span style="color:var(--warn)">(atteso)</span>':''}`
      : '<span style="color:var(--ok)">al locale, libero</span>';
    return `<div class="driver"><span class="dot" style="background:${col}"></span>
      <div class="grow" style="flex:1"><b>${esc(d.name)}</b><div class="meta">${state}</div></div>
      ${d.out?`<button class="small" data-back="${d.id}">Rientrato</button>`:''}
      <button class="small" data-shift="${d.id}">${d.onShift?'Fine turno':'In turno'}</button>
      <button class="small" data-rmd="${d.id}">✕</button></div>`;
  }).join('') : '<div class="empty">Aggiungi almeno un fattorino.</div>';

  // --- piano ---
  const alerts = [];
  if(!st.base) alerts.push('<div class="alert info">Imposta l\'indirizzo del locale nelle impostazioni.</div>');
  const trips = st.base ? plan() : [];
  lastTrips = trips;
  if(st.base && pendingOrders().length && !S.drivers.some(d=>d.onShift)) alerts.push('<div class="alert">Ci sono ordini ma nessun fattorino in turno.</div>');
  const late = trips.flatMap(tr=>tr.stops.filter((o,i)=>tr.etas[i]>o.deadline));
  if(late.length) alerts.push(`<div class="alert">⚠ ${late.length} ${late.length===1?'ordine arriverà':'ordini arriveranno'} oltre l'orario promesso con i fattorini attuali. Valuta un fattorino in più o avvisa il cliente.</div>`);
  $('alerts').innerHTML = alerts.join('');

  const onShift = S.drivers.filter(d=>d.onShift);
  const lastRet = trips.length ? Math.max(...trips.map(x=>x.ret)) : null;
  $('kpis').innerHTML = `
    <div class="kpi"><b>${pendingOrders().length}</b><span>da assegnare</span></div>
    <div class="kpi"><b>${onShift.filter(d=>!d.out).length}/${onShift.length}</b><span>fattorini liberi</span></div>
    <div class="kpi"><b style="color:${late.length?'var(--bad)':'var(--ok)'}">${late.length}</b><span>in ritardo previsto</span></div>
    <div class="kpi"><b>${lastRet?fmt(lastRet):'—'}</b><span>fine ultimo giro</span></div>`;
  $('planTime').textContent = 'aggiornato '+fmt(t);

  const firstOf = new Set();
  const outTrips = S.drivers.filter(d=>d.onShift && d.out && d.trip);
  let html = '';
  for(const d of outTrips){
    const i = S.drivers.indexOf(d), col = TRIP_COL[i%TRIP_COL.length];
    html += `<div class="trip" style="--c:${col};opacity:.75">
      <div class="trip-head"><b>${esc(d.name)}</b><span class="badge">in giro dalle ${fmt(d.trip.dep)}</span></div>
      <ul class="stops">${d.trip.orderIds.map((id,k)=>{const o=S.orders.find(x=>x.id===id); if(!o) return ''; const eta=d.trip.etas[k];
        return `<li><span class="grow">${esc(o.label||o.address)} ${platTag(o.platform)}</span><span class="eta ${etaClass(eta,o.deadline)}">~${fmt(eta)}</span></li>`;}).join('')}</ul>
      <div class="ret">Rientro previsto <b>${fmt(d.trip.ret)}</b> · le consegne spariscono da sole all'orario di arrivo</div></div>`;
  }
  trips.forEach(tr=>{
    const d = tr.driver, i = S.drivers.indexOf(d), col = TRIP_COL[i%TRIP_COL.length];
    const isNext = !firstOf.has(d.id); firstOf.add(d.id);
    const canGo = isNext && !d.out;
    const waitMin = Math.round((tr.dep - t)/MIN);
    const when = tr.dep <= t+MIN ? 'parte <b>adesso</b>' : `parte alle <b>${fmt(tr.dep)}</b>${(d.out||!isNext)?' (dopo il rientro)':waitMin>0?` (tra ${waitMin} min, quando gli ordini sono pronti)`:''}`;
    html += `<div class="trip ${canGo?'next':''}" style="--c:${col}">
      <div class="trip-head"><b>${esc(d.name)}</b><span class="meta">${when}</span>
        ${canGo?`<button class="small primary" style="margin-left:auto" data-go="${d.id}">Assegna e parti</button>`:''}</div>
      <ul class="stops">${tr.stops.map((o,k)=>`<li><span class="grow">${esc(o.label||o.address)} ${platTag(o.platform)}<span class="meta"> · entro ${fmt(o.deadline)}</span></span>
        <span class="eta ${etaClass(tr.etas[k],o.deadline)}">~${fmt(tr.etas[k])}</span></li>`).join('')}</ul>
      <div class="ret">Rientro al locale ~<b>${fmt(tr.ret)}</b> · giro di ${Math.round((tr.ret-tr.dep)/MIN)} min · <a href="${mapsLink(tr.stops)}" target="_blank" rel="noopener">Apri in Google Maps</a></div></div>`;
  });
  if(!html) html = '<div class="empty">Nessuna consegna da pianificare.</div>';
  $('plan').innerHTML = html;

  drawMap(trips, outTrips);
}

/* Schema dei giri: posizioni reali in scala, senza sfondo stradale (per strade e navigazione c'è "Apri in Google Maps"). */
function drawMap(trips, outTrips){
  const el = $('map'), b = S.settings.base;
  if(!b){ el.innerHTML = '<div class="empty">Imposta l\'indirizzo del locale.</div>'; return; }
  const groups = [
    ...outTrips.map(d=>({stops:d.trip.orderIds.map(id=>S.orders.find(x=>x.id===id)).filter(o=>o&&o.lat!=null), col:TRIP_COL[S.drivers.indexOf(d)%TRIP_COL.length], dashed:true})),
    ...trips.map((tr,i)=>({stops:tr.stops, col:TRIP_COL[S.drivers.indexOf(tr.driver)%TRIP_COL.length], dashed:false, later: trips.slice(0,i).some(x=>x.driver===tr.driver)}))
  ];
  const all = [b, ...groups.flatMap(g=>g.stops)];
  const k = Math.cos(b.lat*Math.PI/180);
  const xs = all.map(p=>p.lng*k), ys = all.map(p=>-p.lat);
  const W = 600, H = 340, pad = 28;
  let minX=Math.min(...xs), maxX=Math.max(...xs), minY=Math.min(...ys), maxY=Math.max(...ys);
  const span = Math.max(maxX-minX, maxY-minY, 0.01);
  const sc = Math.min((W-2*pad)/Math.max(maxX-minX, span*.3), (H-2*pad)/Math.max(maxY-minY, span*.3));
  const cx=(minX+maxX)/2, cy=(minY+maxY)/2;
  const P = p => [W/2 + (p.lng*k-cx)*sc, H/2 + (-p.lat-cy)*sc];
  const kmPx = sc / 111.32;   // pixel per km
  const barKm = [0.5,1,2,5,10].find(v=>v*kmPx>60) || 10;
  let svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Schema dei giri">`;
  for(const g of groups){
    const pts = [b, ...g.stops, b].map(P).map(p=>p.join(',')).join(' ');
    svg += `<polyline points="${pts}" fill="none" stroke="${g.col}" stroke-width="3" stroke-opacity="${g.later?.3:.8}" ${g.dashed?'stroke-dasharray="6 6"':''}/>`;
  }
  for(const g of groups) g.stops.forEach((o,i)=>{ const [x,y]=P(o);
    svg += `<g><title>${esc(o.label||o.address)}</title><circle cx="${x}" cy="${y}" r="11" fill="${g.col}" fill-opacity="${g.later?.45:1}" stroke="#fff" stroke-width="2"/><text x="${x}" y="${y+4}" text-anchor="middle" font-size="11" font-weight="700" fill="#fff">${i+1}</text></g>`; });
  const [bx,by]=P(b);
  svg += `<g><title>Locale</title><rect x="${bx-12}" y="${by-12}" width="24" height="24" rx="6" fill="var(--ink)"/><text x="${bx}" y="${by+5}" text-anchor="middle" font-size="13">🏠</text></g>`;
  svg += `<g fill="var(--muted)" font-size="11"><line x1="${pad}" y1="${H-12}" x2="${pad+barKm*kmPx}" y2="${H-12}" stroke="var(--muted)" stroke-width="2"/><text x="${pad}" y="${H-18}">${barKm} km</text></g></svg>`;
  el.innerHTML = svg;
}
/* Link a Google Maps con il percorso del giro (gratis, apre la navigazione) */
function mapsLink(stops){
  const b = S.settings.base, c = p => p.lat.toFixed(6)+','+p.lng.toFixed(6);
  const u = new URL('https://www.google.com/maps/dir/');
  u.searchParams.set('api','1'); u.searchParams.set('origin', c(b)); u.searchParams.set('destination', c(b));
  u.searchParams.set('waypoints', stops.map(c).join('|')); u.searchParams.set('travelmode', S.settings.mode==='DRIVE'?'driving':'two-wheeler');
  return u.toString();
}

/* ===================== Eventi ===================== */
function fillSettings(){
  const st=S.settings;
  $('sBase').value = st.base?.address || '';
  $('sKey').value = st.apiKey || '';
  for(const [id,k] of [['sPromise','promiseMin'],['sPrep','prepMin'],['sService','serviceMin'],['sMaxStops','maxStops'],['sMaxExtra','maxExtra'],['sMaxWait','maxWait'],['sMode','mode'],['sSpeed','speedKmh']]){
    const el=$(id); el.value = st[k];
    el.onchange = () => { st[k] = el.type==='number' ? Math.max(0, +el.value||0) : el.value; if(k==='mode') S.cache={}; save(); render(); refreshMatrix(); };
  }
  resetForm();
}
function resetForm(){
  const d = new Date(); $('oAt').value = d.toTimeString().slice(0,5);
  $('oPromise').value = S.settings.promiseMin; $('oPrep').value = S.settings.prepMin;
}
function timeToday(hhmm){
  const [h,m] = hhmm.split(':').map(Number); const d = new Date(); d.setHours(h,m,0,0);
  if(d.getTime() - now() > 12*60*MIN) d.setDate(d.getDate()-1);   // es. ordine delle 23:50 inserito dopo mezzanotte
  return d.getTime();
}

$('orderForm').onsubmit = async e => {
  e.preventDefault();
  if(!S.settings.base){ $('formMsg').textContent = 'Prima imposta l\'indirizzo del locale.'; return; }
  const address = $('oAddr').value.trim(); if(!address) return;
  const at = $('oAt').value ? timeToday($('oAt').value) : now();
  $('formMsg').textContent = '';
  addOrder({address, platform:$('oPlat').value, name:$('oName').value.trim(), at, promiseMin:+$('oPromise').value, prepMin: (now()-at)/MIN + Math.max(0, +$('oPrep').value)});   // "pronto tra X min" conta da adesso
  $('oAddr').value=''; $('oName').value=''; resetForm(); $('oAddr').focus();
};
$('bulkBtn').onclick = async () => {
  if(!S.settings.base){ alert('Prima imposta l\'indirizzo del locale.'); return; }
  const lines = $('bulk').value.split('\n').map(l=>l.trim()).filter(Boolean);
  for(const l of lines){
    const [address, plat, hh] = l.split(';').map(s=>s?.trim());
    const platform = ['Sito','Just Eat','Uber Eats','Wolt','Telefono'].find(p=>p.toLowerCase()===(plat||'').toLowerCase()) || 'Sito';
    const deadline = hh && /^\d{1,2}:\d{2}$/.test(hh) ? timeToday(hh) : undefined;
    await addOrder({address, platform, deadline});
    if(!gReady) await new Promise(r=>setTimeout(r,1100));   // rispetta i limiti di OpenStreetMap
  }
  $('bulk').value='';
};
$('sBaseBtn').onclick = async () => {
  const a = $('sBase').value.trim(); if(!a) return;
  $('baseInfo').textContent = 'Cerco…';
  try{ const g = await geocode(a); S.settings.base = {address:a, ...g}; S.cache={}; save(); render(); refreshMatrix(); }
  catch(e){ $('baseInfo').textContent = '⚠ '+e.message; }
};
$('sKeyBtn').onclick = async () => {
  S.settings.apiKey = $('sKey').value.trim(); save();
  if(!S.settings.apiKey){ gReady=false; setBadge(); return; }
  try{ await checkKey(); render(); refreshMatrix(); alert('Google Maps collegato!'); }
  catch(e){ alert('Google ha rifiutato la chiave: '+e.message+'\n\nControlla di aver copiato tutta la chiave e di aver abilitato Geocoding API e Routes API.'); }
};
$('dAdd').onclick = () => {
  const n = $('dName').value.trim(); if(!n) return;
  S.drivers.push({id:uid(), name:n, onShift:true, out:false, trip:null});
  $('dName').value=''; save(); render();
};
$('dName').onkeydown = e => { if(e.key==='Enter') $('dAdd').click(); };
$('demoBtn').onclick = () => {
  if(S.orders.length && !confirm('Aggiungo ordini di esempio a quelli esistenti?')) return;
  if(!S.settings.base) S.settings.base = {address:'Piazza del Duomo, Milano', label:'Piazza del Duomo, Milano (esempio)', lat:45.4642, lng:9.1900};
  if(!S.drivers.length) S.drivers.push({id:uid(),name:'Marco',onShift:true,out:false,trip:null},{id:uid(),name:'Luca',onShift:true,out:false,trip:null});
  const b=S.settings.base, plats=['Sito','Just Eat','Uber Eats','Wolt','Sito','Just Eat','Wolt','Sito'];
  const offs=[[.012,.010],[.015,.016],[-.010,.020],[-.014,.015],[.004,-.022],[.008,-.018],[-.020,-.006],[.018,.002]];
  offs.forEach(([dy,dx],i)=>{
    const at = now() - (30 - i*4)*MIN;
    S.orders.push({id:uid(), address:'Cliente esempio '+(i+1), label:'Cliente esempio '+(i+1), platform:plats[i], name:'#'+(1040+i), at,
      deadline: at+S.settings.promiseMin*MIN, readyAt: at+S.settings.prepMin*MIN, status:'attesa', lat:b.lat+dy, lng:b.lng+dx});
  });
  save(); fillSettings(); render(); refreshMatrix();
};

document.addEventListener('click', e => {
  const t = e.target.closest('[data-del],[data-ready],[data-go],[data-back],[data-shift],[data-rmd],[data-regeo]'); if(!t) return;
  const ds = t.dataset;
  if(ds.del){ S.orders = S.orders.filter(o=>o.id!==ds.del); S.drivers.forEach(d=>{ if(d.trip){ const k=d.trip.orderIds.indexOf(ds.del); if(k>=0){ d.trip.orderIds.splice(k,1); d.trip.etas.splice(k,1);} } }); }
  if(ds.ready){ const o=S.orders.find(x=>x.id===ds.ready); if(o) o.readyAt=Math.min(o.readyAt, now()); }
  if(ds.regeo){ e.preventDefault(); const o=S.orders.find(x=>x.id===ds.regeo); if(o){ o.geoError=null; geocode(o.address).then(g=>Object.assign(o,g)).catch(er=>o.geoError=er.message).finally(()=>{save();render();refreshMatrix();}); } }
  if(ds.go){
    const d=S.drivers.find(x=>x.id===ds.go), tr=lastTrips.find(x=>x.driver.id===ds.go);
    if(d && tr){
      const ev = evalTrip(tr.stops, now());     // ricalcola partendo da adesso
      tr.stops.forEach(o=>{ o.status='in_consegna'; o.driverId=d.id; });
      d.out = true; d.trip = {orderIds:tr.stops.map(o=>o.id), etas:ev.etas, dep:Math.max(now(),ev.dep), ret:ev.ret};
    }
  }
  if(ds.back){ const d=S.drivers.find(x=>x.id===ds.back); if(d) deliverTrip(d); }
  if(ds.shift){ const d=S.drivers.find(x=>x.id===ds.shift); if(d) d.onShift=!d.onShift; }
  if(ds.rmd){ const d=S.drivers.find(x=>x.id===ds.rmd); if(d && (!d.out || confirm('Il fattorino è in giro: rimuoverlo?'))){ if(d.out) deliverTrip(d); S.drivers=S.drivers.filter(x=>x!==d); } }
  save(); render();
});

/* ===================== Avvio ===================== */
fillSettings(); setBadge(); render();
if(S.settings.apiKey) checkKey().then(()=>{ render(); refreshMatrix(); }).catch(e=>console.warn('Chiave Google', e));
setInterval(()=>{ render(); refreshMatrix(); }, 15000);
