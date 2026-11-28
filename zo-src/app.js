/* ---------- the library: list order from models.js, content from data/*.js ---------- */
const slugify = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
/* The first 87 come from RAW in models.js; later groups carry their own area (c) and tagline (tg). */
const LIB_BY_TITLE = Object.fromEntries(LIB.map((x) => [x.t, x]));
const BASE = [...RAW.map(([cat, title, tag]) => ({ cat, title, tag })), ...LIB.filter((x) => x.c).map((x) => ({ cat: x.c, title: x.t, tag: x.tg }))];
const MODELS = BASE.map((b, i) => ({ ...LIB_BY_TITLE[b.title], n: i + 1, ...b, slug: slugify(b.title) }));
const BY = Object.fromEntries(MODELS.map((m) => [m.slug, m]));
const BY_T = Object.fromEntries(MODELS.map((m) => [m.title, m]));
const pick = (titles) => titles.map((t) => BY_T[t]).filter(Boolean);

/* Percorso essenziale: i modelli più utili nella vita di tutti i giorni, in un ordine pensato. */
const ESSENTIAL = pick([
  "La mappa non è il territorio", "Il cerchio di competenza", "Il pensiero di secondo ordine", "L'inversione",
  "Il pensiero probabilistico", "Compromessi", "Incentivi", "Il rasoio di Hanlon", "Il rasoio di Occam",
  "Euristica della conferma", "La fallacia dei costi sommersi", "Avversione alla perdita", "Lo sconto iperbolico",
  "Crescita composta", "Margine di sicurezza", "Principio di Pareto", "Rendimenti decrescenti", "Correlazione e causalità",
  "Il pensiero per principi primi", "Circuiti di retroazione", "Colli di bottiglia", "Leva", "Inerzia",
  "Il ciclo dell'abitudine", "Sistemi e obiettivi", "Decisioni rapide e correggibili", "Massimi locali e globali",
  "Regressione verso la media", "Teoria dei giochi", "Inquadratura",
]);
const ESSENTIAL_SET = new Set(ESSENTIAL.map((m) => m.slug));

/* «Ho una decisione da prendere»: tipi di problema, parole che li fanno riconoscere, modelli adatti. */
const DECISIONS = [
  { id: "squadra", label: "Gestire persone o un gruppo", words: ["licenzi", "assumer", "assunzion", "operai", "dipendent", "collaborator", "squadra", "team", "gruppo", "reparto", "personale", "lavorator", "apprendist", "socio", "soci"],
    models: ["Il rasoio di Hanlon", "I cinque perché", "Incentivi", "Schiettezza accompagnata da cura", "Il pensiero di secondo ordine"] },
  { id: "attivita", label: "La mia attività o il mio negozio", words: ["negozio", "attivit", "client", "concorren", "vendit", "fatturat", "ristorant", "bar ", "impresa", "prodott", "servizio", "fornitor", "partita iva"],
    models: ["Le cinque forze di Porter", "La strategia dell'oceano blu", "Jobs To Be Done", "Nicchie", "La proposta di valore"] },
  { id: "lavoro", label: "La mia carriera", words: ["lavoro", "carriera", "capo", "stipendio", "colloquio", "promozion", "azienda", "ufficio", "dimett", "cambiare lavoro", "offerta"],
    models: ["Ridurre il rimpianto futuro", "Il cerchio di competenza", "Compromessi", "Massimi locali e globali", "Decisioni rapide e correggibili"] },
  { id: "soldi", label: "Soldi, spese o investimenti", words: ["soldi", "spes", "comprar", "acquist", "investi", "risparm", "mutuo", "prestito", "debito", "azion", "prezzo", "euro"],
    models: ["Crescita composta", "Margine di sicurezza", "Avversione alla perdita", "La fallacia dei costi sommersi", "Diversificazione"] },
  { id: "persone", label: "Un conflitto con una persona", words: ["litig", "conflitt", "arrabbi", "partner", "marito", "moglie", "amic", "collega", "suocer", "discuss", "offes"],
    models: ["Il rasoio di Hanlon", "Comunicazione nonviolenta", "Relatività", "Reciprocità", "Il modello SCARF"] },
  { id: "progetto", label: "Un progetto che non va avanti", words: ["progetto", "bloccat", "fermo", "ritardo", "non riesco", "lento", "scadenz"],
    models: ["Colli di bottiglia", "Energia di attivazione", "Dividere e affrontare", "La fallacia dei costi sommersi", "Principio di Pareto"] },
  { id: "tempo", label: "Troppe cose da fare", words: ["troppe cose", "tempo", "stress", "impegni", "agenda", "stanco", "priorit", "urgent"],
    models: ["La matrice di Eisenhower", "Principio di Pareto", "Le due liste di Buffett", "Migliorare togliendo", "La legge di Parkinson"] },
  { id: "abitudine", label: "Cambiare un'abitudine", words: ["abitudin", "smettere", "smetter", "fumo", "fumar", "sigarett", "bere", "alcol", "dieta", "dimagr", "palestra", "sport", "telefono", "social", "dormire", "sonno", "pigr"],
    models: ["Il ciclo dell'abitudine", "Attrito e viscosità", "Sistemi e obiettivi", "Lo sconto iperbolico", "Il patto di Ulisse"] },
  { id: "notizia", label: "Valutare una notizia o un'idea", words: ["notizia", "articolo", "video", "dicono", "studio", "fonte", "vero", "falso", "credere"],
    models: ["Euristica della conferma", "Correlazione e causalità", "Il test CRAAP per le fonti", "Campionamento", "Falsificabilità"] },
  { id: "scelta", label: "Scegliere tra più opzioni", words: ["scegliere", "scelta", "opzion", "alternativ", "oppure", "indecis", "decidere"],
    models: ["L'inversione", "Il pensiero di secondo ordine", "Il processo decisionale WRAP", "Satisficing: una scelta abbastanza buona", "Il pensiero probabilistico"] },
  { id: "convincere", label: "Convincere qualcuno", words: ["convincere", "presentaz", "vendere", "propost", "cliente", "persuad", "spiegare"],
    models: ["Pubblico", "La retorica di Aristotele", "Inquadratura", "Il cerchio d'oro", "Caratteristiche e benefici"] },
  { id: "ripete", label: "Un problema che si ripete", words: ["sempre", "di nuovo", "ogni volta", "ripete", "ancora", "ricorrent", "errore"],
    models: ["I cinque perché", "Circuiti di retroazione", "Il diagramma a lisca di pesce", "Apprendimento a doppio ciclo", "Il modello del formaggio svizzero"] },
].map((d) => ({ ...d, models: pick(d.models) }));

/* ---------- helpers ---------- */
const $ = (s, el = document) => el.querySelector(s);
const app = $("#app");
const today = () => new Date().toISOString().slice(0, 10);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const daysSince = (d) => d ? Math.max(0, Math.floor((Date.now() - new Date(d + "T00:00:00").getTime()) / 86400000)) : 0;
const fmtDate = (d) => { try { return new Date(d).toLocaleDateString("it-IT", { day: "numeric", month: "long" }); } catch { return d; } };
function toast(msg) {
  const t = document.createElement("div"); t.className = "toast"; t.textContent = msg; t.setAttribute("role", "status");
  document.body.appendChild(t); setTimeout(() => t.remove(), 2800);
}
/* Deterministic shuffle so the right answer is not always in the same place. */
function seeded(seed) { let s = seed % 2147483647 || 1; return () => ((s = (s * 16807) % 2147483647) / 2147483647); }
function hash(str) { let h = 7; for (const c of str) h = (h * 31 + c.charCodeAt(0)) % 2147483647; return h; }
function shuffled(list, seed) { const r = seeded(seed); const a = list.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const BOLT = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>';
const bolts = (n) => `<span class="bolts" aria-label="Difficoltà ${n} su 3">${[1,2,3].map((i) => BOLT.replace("<svg", `<svg class="${i <= n ? "on" : ""}"`)).join("")}</span>`;
const BOOK = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M2 5.5C4.5 4 8.5 4 12 6c3.5-2 7.5-2 10-.5V19c-2.5-1.5-6.5-1.5-10 .5-3.5-2-7.5-2-10-.5z"/><path d="M12 6v13.5"/></svg>';

/* ---------- storage: everything stays in this browser, works without internet ---------- */
const KEY = "zo-offline-v1";
let S = { order: "essenziale", seed: 0, current: null, startedAt: {}, done: {}, quiz: {}, ex: {}, rev: {}, journal: [], nome: "" };
function load() {
  let st = null;
  try { st = JSON.parse(localStorage.getItem(KEY) || "null"); } catch {}
  if (st && typeof st === "object") {
    /* Dati di una versione precedente (senza ripasso): passa al percorso essenziale tenendo il modello in corso. */
    const old = !("rev" in st);
    S = { ...S, ...st }; normalize();
    if (old) { const cur = currentModel(); if (S.order === "lista") { S.order = "essenziale"; if (cur) S.current = cur.slug; } save(); }
  }
  normalize();
}
function normalize() {
  S.journal = Array.isArray(S.journal) ? S.journal : [];
  for (const k of ["startedAt", "done", "quiz", "ex", "rev"]) if (!S[k] || typeof S[k] !== "object") S[k] = {};
  for (const slug of Object.keys(S.done)) if (BY[slug] && !S.rev[slug]) S.rev[slug] = { box: 0, due: addDays(today(), 1), n: 0 };
}
let storageOk = true;
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); storageOk = true; }
  catch { if (storageOk) toast("Questo browser non permette di salvare: i progressi si perderanno chiudendo la pagina."); storageOk = false; }
}

/* ---------- the plan ---------- */
function planOrder() {
  const list = MODELS.slice();
  if (S.order === "categorie") {
    const groups = Object.keys(CATS).map((c) => list.filter((m) => m.cat === c)); const out = [];
    for (let i = 0; out.length < list.length; i++) for (const g of groups) if (g[i]) out.push(g[i]);
    return out;
  }
  if (S.order === "casuale") return shuffled(list, S.seed || 1);
  if (S.order === "essenziale") return [...ESSENTIAL, ...list.filter((m) => !ESSENTIAL_SET.has(m.slug))];
  return list;
}
function currentModel() {
  if (S.current && BY[S.current] && !S.done[S.current]) return BY[S.current];
  return planOrder().find((m) => !S.done[m.slug]) || null;
}
const doneCount = () => Object.keys(S.done).filter((k) => BY[k]).length;
const exDone = (slug) => (S.ex[slug] || []).filter(Boolean).length;

/* ---------- ripasso automatico a intervalli crescenti ---------- */
const INTERVALS = [1, 3, 7, 14, 30, 60]; // giorni prima del ripasso successivo, per livello
function addDays(d, n) { const x = new Date(d + "T12:00:00"); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); }
function schedule(slug) { if (BY[slug] && !S.rev[slug]) { S.rev[slug] = { box: 0, due: addDays(today(), 1), n: 0 }; save(); } }
const DAILY_MAX = 10;
function dueList() {
  return Object.entries(S.rev).filter(([slug, r]) => BY[slug] && r.due <= today())
    .sort((a, b) => a[1].due.localeCompare(b[1].due)).slice(0, DAILY_MAX).map(([slug]) => slug);
}
function nextDue() { const d = Object.entries(S.rev).filter(([s]) => BY[s]).map(([, r]) => r.due).sort(); return d[0] || null; }
function grade(slug, ok) {
  const r = S.rev[slug]; if (!r) return;
  r.box = ok ? Math.min(r.box + 1, INTERVALS.length - 1) : 0;
  r.due = addDays(today(), INTERVALS[r.box]); r.n = (r.n || 0) + 1; save();
}

/* ---------- domande «Quale modello?» costruite dagli esempi e dai segnali delle schede ---------- */
function studiedPool() { return MODELS.filter((x) => S.done[x.slug] || S.rev[x.slug]); }
function distractors(m, key) {
  let pool = studiedPool().filter((x) => x !== m);
  if (pool.length < 6) pool = [...new Set([...pool, ...ESSENTIAL.filter((x) => x !== m), ...MODELS.filter((x) => x.cat === m.cat && x !== m)])];
  return shuffled(pool, hash(m.slug + key)).slice(0, 3);
}
const mask = (text, m) => String(text).split(m.title).join("questo modello");
function whichQuestions(m) {
  const out = [];
  (m.es || []).forEach(([area, text], k) => out.push({ kind: "which", q: [`${area}. «${mask(text, m)}» Quale modello descrive meglio questa situazione?`,
    [m.title, ...distractors(m, "e" + k).map((x) => x.title)], 0, `È «${m.title}»: ${m.tag}`], i: "e" + k }));
  (m.ri || []).forEach(([sig, text], k) => out.push({ kind: "which", q: [`Segnale: «${sig}». ${mask(text, m)} Quale modello ti aiuta a riconoscerlo?`,
    [m.title, ...distractors(m, "r" + k).map((x) => x.title)], 0, `È «${m.title}»: ${m.tag}`], i: "r" + k }));
  return out;
}
/* Per il ripasso: domande sul contenuto e domande «Quale modello?», alternate. */
function reviewQuestions(m) {
  const own = m.qz.map((q, i) => ({ kind: "own", q, i })); const w = whichQuestions(m); const out = [];
  for (let i = 0; i < Math.max(own.length, w.length); i++) { if (own[i]) out.push(own[i]); if (w[i]) out.push(w[i]); }
  return out;
}

/* ---------- views ---------- */
let view = { name: "piano", slug: null, mode: "rapida" };
function setTop(left = "", right = "") { $("#topLeft").innerHTML = left; $("#topRight").innerHTML = right; }
function setTab(name) { document.querySelectorAll("nav.tabs a").forEach((a) => { if (a.dataset.tab === name) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current"); }); }
const backBtn = () => `<button class="iconbtn ghost" id="back" aria-label="Indietro"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>`;
function bindBack() { $("#back")?.addEventListener("click", () => history.length > 1 ? history.back() : (location.hash = "piano")); }

function route() {
  const h = (location.hash || "#piano").slice(1);
  window.scrollTo(0, 0);
  if (h.startsWith("m-") && BY[h.slice(2)]) { view = { ...view, name: "model", slug: h.slice(2) }; setTab(currentModel()?.slug === view.slug ? "settimana" : "biblioteca"); return renderModel(BY[view.slug]); }
  if (h === "ripasso") { view.name = h; setTab("piano"); return renderReview(); }
  if (h === "diario") { view.name = h; setTab("piano"); return renderJournal(); }
  if (h === "decisione") { view.name = h; setTab("piano"); return renderDecision(); }
  const name = ["piano", "settimana", "biblioteca", "impostazioni"].includes(h) ? h : "piano";
  view = { ...view, name, slug: null }; setTab(name);
  if (name === "piano") return renderPlan();
  if (name === "settimana") { const m = currentModel(); return m ? renderModel(m) : renderPlan(); }
  if (name === "biblioteca") return renderLibrary();
  return renderSettings();
}

/* Il tuo piano */
function renderPlan() {
  setTop();
  const m = currentModel(); const done = doneCount(); const pct = Math.round(done / MODELS.length * 100);
  if (m && !S.startedAt[m.slug]) { S.startedAt[m.slug] = today(); save(); }
  const day = m ? Math.min(7, daysSince(S.startedAt[m.slug]) + 1) : 0;
  const order = planOrder(); const next = order.filter((x) => !S.done[x.slug] && x !== m).slice(0, 4);
  const hello = S.nome ? `Ciao ${esc(S.nome)}.` : "Un modello mentale a settimana.";
  const exI = (day - 1) % 3; const exChecked = m && (S.ex[m.slug] || [])[exI];
  const due = dueList(); const nd = nextDue();
  app.innerHTML = `<div class="stack">
    <p class="muted">${hello} ${done ? `Hai completato ${done} modelli su ${MODELS.length}.` : `La biblioteca contiene ${MODELS.length} modelli in ${Object.keys(CATS).length} aree.`}</p>
    ${m ? `<div class="hero">
      <span class="eyebrow">Settimana ${done + 1} · ${esc(SHORT[m.cat])}${ESSENTIAL_SET.has(m.slug) && S.order === "essenziale" ? ` · essenziale ${ESSENTIAL.indexOf(m) + 1} di ${ESSENTIAL.length}` : ""}</span>
      <h1>${esc(m.title)}</h1>
      <p>${esc(m.tag)}</p>
      <div class="days" aria-label="Giorno ${day} di 7">${[1,2,3,4,5,6,7].map((i) => `<i class="${i <= day ? "on" : ""}"></i>`).join("")}</div>
      <p class="small">Giorno ${day} di 7 · esercizi fatti ${exDone(m.slug)} di 3${day >= 7 ? " · la settimana è finita: se ti senti pronto, segnalo come completato" : ""}</p>
      <div class="row"><button id="openWeek">Apri la lezione</button>${day >= 7 ? `<button class="alt" id="finishWeek">Segna come completato</button>` : ""}</div>
    </div>` : `<div class="hero"><span class="eyebrow">Percorso completato</span><h1>Hai studiato tutti i ${MODELS.length} modelli</h1><p>Ripassali con i quiz o rileggi le schede nella Biblioteca.</p></div>`}
  </div>
  ${m ? `<section class="block" style="margin-top:18px">
    <h2>Oggi</h2>
    <div class="today">
      <article><span class="eyebrow">Esercizio del giorno</span><p>${esc(m.ex[exI])}</p>
        <div class="row"><button id="exToday" class="${exChecked ? "" : "primary"}">${exChecked ? "Fatto ✓" : "Segna come fatto"}</button></div></article>
      <article><span class="eyebrow">Domanda da farti oggi</span><p style="font-family:var(--f-display);font-size:1.3rem;line-height:1.3">${esc(m.q[exI])}</p></article>
    </div>
  </section>` : ""}
  <section class="block" ${m ? "" : 'style="margin-top:18px"'}>
    <div class="today">
      <article><span class="eyebrow">Ripasso di oggi</span>
        <p>${due.length ? `${due.length} ${due.length === 1 ? "modello da ripassare" : "modelli da ripassare"}: ti faccio una domanda su ciascuno.`
          : nd ? `Niente da ripassare oggi. Il prossimo ripasso è il ${esc(fmtDate(nd))}.`
          : "Quando completi un modello o fai il suo quiz, torna qui per il ripasso: dopo 1 giorno, poi 3, 7, 14, 30 e 60."}</p>
        <div class="row"><a class="btn${due.length ? " primary" : ""}" href="#ripasso">${due.length ? "Inizia il ripasso" : "Allenamento libero"}</a></div></article>
      <article><span class="eyebrow">Ho una decisione da prendere</span>
        <p>Scegli il tipo di problema: ZO ti suggerisce i modelli adatti e le domande da farti.</p>
        <div class="row"><a class="btn" href="#decisione">Trova i modelli</a></div></article>
    </div>
    <a class="btn" href="#diario" style="justify-content:center">Il mio diario · ${S.journal.length}</a>
  </section>
  <section class="block">
    <div class="row" style="justify-content:space-between"><h2>Il tuo progresso</h2><span class="muted" style="font-variant-numeric:tabular-nums">${pct}%</span></div>
    <div class="bar" role="progressbar" aria-valuemin="0" aria-valuemax="${MODELS.length}" aria-valuenow="${done}"><i style="width:${pct}%"></i></div>
    <div class="cats">${Object.keys(CATS).map((c) => { const tot = MODELS.filter((x) => x.cat === c).length; const d = MODELS.filter((x) => x.cat === c && S.done[x.slug]).length;
      return `<span>${esc(CATS[c])}</span><span>${d}/${tot}</span><div class="bar"><i style="width:${Math.round(d / tot * 100)}%"></i></div>`; }).join("")}</div>
  </section>
  ${next.length ? `<section class="block"><h2>Prossime settimane</h2><div class="list">${next.map((x, i) => itemHTML(x, `Settimana ${done + 2 + i} · ${SHORT[x.cat]}`)).join("")}</div>
    <p class="small muted">L'ordine si cambia in Impostazioni. Puoi anche scegliere un modello dalla Biblioteca.</p></section>` : ""}`;
  $("#openWeek")?.addEventListener("click", () => { location.hash = "m-" + m.slug; });
  $("#finishWeek")?.addEventListener("click", () => complete(m));
  $("#exToday")?.addEventListener("click", () => { const a = S.ex[m.slug] || [false, false, false]; a[exI] = !a[exI]; S.ex[m.slug] = a; save(); renderPlan(); });
}

function itemHTML(m, eyebrow) {
  const q = S.quiz[m.slug]; const cur = currentModel()?.slug === m.slug; const e = exDone(m.slug);
  const pills = [
    S.done[m.slug] ? `<span class="pill ok">Completato</span>` : "",
    ESSENTIAL_SET.has(m.slug) ? `<span class="pill">Essenziale</span>` : "",
    cur ? `<span class="pill orange">Questa settimana</span>` : "",
    e ? `<span class="pill">Esercizi ${e}/3</span>` : "",
    q ? `<span class="pill">Quiz ${q.score}/${q.total}</span>` : "",
  ].join("");
  return `<a class="item" href="#m-${m.slug}">
    <span class="eyebrow">${esc(eyebrow || CATS[m.cat])}</span>
    <h3>${esc(m.title)}</h3>
    <p>${esc(m.tag)}</p>
    <span class="meta">${BOOK}Scheda del modello ${pills}</span>
  </a>`;
}

/* Biblioteca */
let filter = { cat: "", q: "", stato: "" };
function renderLibrary() {
  setTop();
  app.innerHTML = `<div class="stack">
    <h1>Biblioteca</h1>
    <p class="muted">${MODELS.length} schede complete, con esercizi, domande e quiz. Funzionano anche senza internet.</p>
    <input type="search" id="search" placeholder="Cerca un modello o una parola" aria-label="Cerca" value="${esc(filter.q)}">
    <div class="chips" role="group" aria-label="Filtra per area">
      <button data-cat="" aria-pressed="${!filter.cat}">Tutte · ${MODELS.length}</button>
      ${Object.keys(CATS).map((c) => `<button data-cat="${c}" aria-pressed="${filter.cat === c}">${esc(SHORT[c])} · ${MODELS.filter((m) => m.cat === c).length}</button>`).join("")}
    </div>
    <div class="chips" role="group" aria-label="Filtra per stato">
      ${[["", "Tutti"], ["ess", `Essenziali · ${ESSENTIAL.length}`], ["da", "Da studiare"], ["fatti", "Completati"]].map(([v, l]) => `<button data-st="${v}" aria-pressed="${filter.stato === v}">${l}</button>`).join("")}
    </div>
    <div class="list" id="results"></div>
  </div>`;
  const draw = () => {
    const q = slugify(filter.q);
    const list = MODELS.filter((m) => (!filter.cat || m.cat === filter.cat)
      && (!filter.stato || (filter.stato === "ess" ? ESSENTIAL_SET.has(m.slug) : (filter.stato === "fatti") === !!S.done[m.slug]))
      && (!q || slugify([m.title, m.tag, m.sp].join(" ")).includes(q)));
    $("#results").innerHTML = list.length ? list.map((m) => itemHTML(m)).join("") : `<p class="muted" style="padding:18px 4px">Nessun modello corrisponde alla ricerca.</p>`;
  };
  draw();
  $("#search").addEventListener("input", (e) => { filter.q = e.target.value; draw(); });
  app.querySelectorAll("[data-cat]").forEach((b) => b.addEventListener("click", () => {
    filter.cat = b.dataset.cat; app.querySelectorAll("[data-cat]").forEach((x) => x.setAttribute("aria-pressed", x === b)); draw(); }));
  app.querySelectorAll("[data-st]").forEach((b) => b.addEventListener("click", () => {
    filter.stato = b.dataset.st; app.querySelectorAll("[data-st]").forEach((x) => x.setAttribute("aria-pressed", x === b)); draw(); }));
}

/* Scheda del modello */
function quizHTML(items, prefix) {
  return `<div class="quiz">${items.map(({ m, q, i }) => {
    const opts = shuffled(q[1].map((o, j) => ({ o, j })), hash(m.slug + i));
    return `<div class="q" data-k="${prefix}${m.slug}:${i}">
      ${prefix ? `<span class="eyebrow">${esc(m.title)}</span>` : ""}
      <p style="font-weight:600">${esc(q[0])}</p>
      <div class="opts">${opts.map(({ o, j }) => `<button data-o="${j}">${esc(o)}</button>`).join("")}</div>
      <p class="why" hidden></p></div>`; }).join("")}</div>`;
}
function bindQuiz(items, onDone) {
  const answers = {};
  app.querySelectorAll(".q").forEach((qel, idx) => {
    const { q } = items[idx];
    qel.querySelectorAll("[data-o]").forEach((b) => b.addEventListener("click", () => {
      if (idx in answers) return;
      const j = +b.dataset.o; answers[idx] = j === q[2];
      qel.querySelectorAll("[data-o]").forEach((x) => { x.disabled = true; if (+x.dataset.o === q[2]) x.classList.add("right"); });
      if (j !== q[2]) b.classList.add("wrong");
      const why = qel.querySelector(".why"); why.hidden = false; why.textContent = (j === q[2] ? "Giusto. " : "Non proprio. ") + q[3];
      if (Object.keys(answers).length === items.length) onDone(Object.values(answers).filter(Boolean).length, items.length);
    }));
  });
}

function renderModel(m) {
  const isCur = currentModel()?.slug === m.slug; const done = !!S.done[m.slug];
  setTop(backBtn(),
    `<button class="iconbtn" id="doneTop" aria-label="${done ? "Completato" : "Segna come completato"}" title="${done ? "Completato" : "Segna come completato"}" style="${done ? "background:var(--teal);color:var(--paper);border-color:var(--teal)" : ""}"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg></button>`);
  bindBack();
  $("#doneTop").onclick = () => done ? undoComplete(m) : complete(m);
  const eyebrow = isCur ? `Settimana ${doneCount() + 1} · ${CATS[m.cat]}` : `${m.n} · ${CATS[m.cat]}`;
  const ex = S.ex[m.slug] || [false, false, false];
  const siblings = MODELS.filter((x) => x.cat === m.cat && x !== m);
  const pos = siblings.findIndex((x) => x.n > m.n); const related = [...siblings.slice(pos < 0 ? 0 : pos), ...siblings].slice(0, 3);
  const qItems = m.qz.map((q, i) => ({ m, q, i }));
  app.innerHTML = `<div class="stack">
    <span class="eyebrow">${esc(eyebrow)}</span>
    <h1>${esc(m.title)}</h1>
    <div class="row"><span class="eyebrow">Difficoltà</span> ${bolts(m.d)}</div>
    <div class="toggle" role="group" aria-label="Livello di lettura">
      <button data-mode="rapida" aria-pressed="${view.mode === "rapida"}">Rapida</button>
      <button data-mode="approfondita" aria-pressed="${view.mode === "approfondita"}">Approfondita</button>
    </div>
    <div class="idea">${esc(m.tag)}</div>
    <div class="prose" id="reading"></div>
  </div>
  <section class="block" style="margin-top:18px"><h2>Come riconoscerlo</h2><div>${m.ri.map(([a, b]) => `<details><summary>${esc(a)}</summary><p>${esc(b)}</p></details>`).join("")}</div></section>
  <section class="block"><h2>Nella vita di tutti i giorni</h2><div class="ex">${m.es.map(([a, b]) => `<article><span class="eyebrow">${esc(a)}</span><p>${esc(b)}</p></article>`).join("")}</div></section>
  <section class="block"><div class="challenge"><span class="eyebrow">Esercizi della settimana</span><p class="small">Fanne uno ogni due giorni. Spunta quelli che hai fatto.</p>
    <div class="ex-list">${m.ex.map((t, i) => `<label for="ex${i}" class="${ex[i] ? "done" : ""}"><input type="checkbox" id="ex${i}" data-ex="${i}" ${ex[i] ? "checked" : ""}><span>${esc(t)}</span></label>`).join("")}</div></div></section>
  <section class="block"><h2>Domande da farti quando decidi</h2><div class="prose"><ul>${m.q.map((d) => `<li>${esc(d)}</li>`).join("")}</ul></div>
    <h3 style="margin-top:8px">L'errore da evitare</h3><p class="muted">${esc(m.er)}</p></section>
  <section class="block" id="apply"><h2>Applicalo a una tua situazione</h2>
    <p class="muted">Scrivi una decisione o un problema reale e rispondi alle domande del modello. La scheda finisce nel tuo diario.</p>
    <div class="sheet">
      <label class="field" for="wsSit">La situazione<textarea id="wsSit" placeholder="Es. Devo decidere se accettare un lavoro che paga di più ma è lontano da casa."></textarea></label>
      ${m.q.map((d, i) => `<label class="field" for="wsQ${i}">${esc(d)}<textarea id="wsQ${i}" style="min-height:70px"></textarea></label>`).join("")}
      <label class="field" for="wsAct">Cosa farò, in concreto<textarea id="wsAct" style="min-height:70px" placeholder="Il primo passo e quando lo faccio"></textarea></label>
      <div><button class="primary" id="wsSave">Salva nel diario</button></div>
    </div></section>
  <section class="block"><h2>Verifica veloce</h2>${quizHTML(qItems, "")}<p class="small muted" id="quizScore">${S.quiz[m.slug] ? `Ultimo risultato: ${S.quiz[m.slug].score} su ${S.quiz[m.slug].total}.` : ""}</p></section>
  <section class="block"><h2>Diario di questo modello</h2><div class="stack" id="entries"></div>
    <label class="field" for="note">Dove l'hai visto in azione oggi?<textarea id="note" placeholder="Oggi ho notato che…"></textarea></label>
    <div><button id="saveNote">Salva la nota</button></div></section>
  <section class="block"><h2>Altri modelli di quest'area</h2><div class="links">${related.map((x) => `<a class="btn" href="#m-${x.slug}">${esc(x.title)}</a>`).join("")}</div></section>
  <section class="block"><div class="row">
    ${done ? `<button id="undo">Rimetti tra i modelli da studiare</button>` : `<button class="primary" id="complete">Segna come completato</button>`}
    ${!done && !isCur ? `<button id="pick">Studialo questa settimana</button>` : ""}
  </div></section>`;

  const drawReading = () => {
    $("#reading").innerHTML = view.mode === "rapida" ? `<p>${esc(m.sp)}</p>`
      : `<p>${esc(m.sp)}</p><h3>Come funziona</h3><p>${esc(m.ap[0])}</p><h3>Come usarlo, e i suoi limiti</h3><p>${esc(m.ap[1])}</p>`;
  };
  drawReading();
  app.querySelectorAll("[data-mode]").forEach((b) => b.addEventListener("click", () => {
    view.mode = b.dataset.mode; app.querySelectorAll("[data-mode]").forEach((x) => x.setAttribute("aria-pressed", x === b)); drawReading(); }));
  app.querySelectorAll("[data-ex]").forEach((c) => c.addEventListener("change", () => {
    const a = S.ex[m.slug] || [false, false, false]; a[+c.dataset.ex] = c.checked; S.ex[m.slug] = a; save();
    c.closest("label").classList.toggle("done", c.checked); if (c.checked) toast("Esercizio fatto");
  }));
  bindQuiz(qItems, (score, total) => {
    S.quiz[m.slug] = { score, total, data: today() }; const fresh = !S.rev[m.slug]; schedule(m.slug); save();
    $("#quizScore").textContent = `Risultato: ${score} su ${total}.${fresh ? " Questo modello entra nel ripasso: te lo riproporrò domani." : ""}`;
  });
  const drawEntries = () => {
    const list = S.journal.filter((e) => e.slug === m.slug).slice().reverse();
    $("#entries").innerHTML = list.length ? list.map(entryHTML).join("") : `<p class="small muted">Ancora nessuna nota per questo modello.</p>`;
    bindEntryDelete(drawEntries);
  };
  drawEntries();
  $("#saveNote").addEventListener("click", () => {
    const testo = $("#note").value.trim().slice(0, 3000); if (!testo) return $("#note").focus();
    S.journal.push({ id: Date.now().toString(36), slug: m.slug, data: today(), tipo: "nota", testo }); save();
    $("#note").value = ""; toast("Nota salvata"); drawEntries();
  });
  $("#wsSave").addEventListener("click", () => {
    const sit = $("#wsSit").value.trim(); if (!sit) return $("#wsSit").focus();
    const risposte = m.q.map((d, i) => [d, $("#wsQ" + i).value.trim().slice(0, 1500)]).filter(([, r]) => r);
    S.journal.push({ id: Date.now().toString(36), slug: m.slug, data: today(), tipo: "scheda", testo: sit.slice(0, 2000), risposte, azione: $("#wsAct").value.trim().slice(0, 1500) });
    save(); ["wsSit", "wsAct", "wsQ0", "wsQ1", "wsQ2"].forEach((id) => { $("#" + id).value = ""; });
    toast("Scheda salvata nel diario"); drawEntries();
  });
  $("#complete")?.addEventListener("click", () => complete(m));
  $("#undo")?.addEventListener("click", () => undoComplete(m));
  $("#pick")?.addEventListener("click", () => { S.current = m.slug; S.startedAt[m.slug] = today(); save(); toast(`“${m.title}” è il modello di questa settimana`); location.hash = "settimana"; });
}

function entryHTML(e) {
  const m = BY[e.slug];
  return `<div class="entry">
    <div class="row" style="justify-content:space-between"><span class="eyebrow" style="color:var(--muted)">${esc(fmtDate(e.data))}${view.name === "diario" && m ? ` · <a href="#m-${m.slug}">${esc(m.title)}</a>` : ""}${e.tipo === "scheda" ? " · Applicazione" : ""}${e.tipo === "decisione" ? " · Decisione" : ""}</span>
      <button class="ghost small" data-del="${esc(e.id)}" aria-label="Elimina questa nota">Elimina</button></div>
    <p>${esc(e.testo)}</p>
    ${(e.risposte || []).map(([d, r]) => `<div class="fb"><strong>${esc(d)}</strong><br>${esc(r)}</div>`).join("")}
    ${e.azione ? `<div class="fb"><strong>Cosa farò</strong><br>${esc(e.azione)}</div>` : ""}
    ${(e.modelli || []).filter((s) => BY[s]).length ? `<div class="links">${e.modelli.filter((s) => BY[s]).map((s) => `<a class="btn small" href="#m-${s}">${esc(BY[s].title)}</a>`).join("")}</div>` : ""}
  </div>`;
}
function bindEntryDelete(redraw) {
  app.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.armed) { S.journal = S.journal.filter((e) => e.id !== b.dataset.del); save(); redraw(); toast("Nota eliminata"); }
    else { b.dataset.armed = "1"; b.textContent = "Conferma eliminazione"; b.style.color = "var(--bad)"; }
  }));
}

/* Ripasso: prima quelli in scadenza oggi, uno alla volta; altrimenti allenamento libero. */
function renderReview() {
  setTop(backBtn()); bindBack();
  const due = dueList();
  if (due.length) return reviewStep(due, 0, 0);
  const pool = studiedPool();
  const source = pool.length >= 3 ? pool : ESSENTIAL;
  const picks = shuffled(source.flatMap((m) => whichQuestions(m).map((w) => ({ m, q: w.q, i: w.i }))), Date.now() % 100000).slice(0, 5);
  const nd = nextDue();
  app.innerHTML = `<div class="stack">
    <span class="eyebrow">Allenamento libero</span><h1>Quale modello?</h1>
    <p class="muted">Cinque situazioni reali: riconosci quale modello ti aiuta.
      ${pool.length >= 3 ? `Le situazioni vengono dai ${pool.length} modelli che hai studiato.` : "Finché non hai studiato almeno 3 modelli, le situazioni vengono dai modelli essenziali."}
      ${nd ? `Il prossimo ripasso programmato è il ${esc(fmtDate(nd))}.` : ""}</p>
  </div>
  <section class="block" style="margin-top:14px">${quizHTML(picks, "r:")}<p class="small muted" id="revScore"></p>
    <div><button class="primary" id="again">Altre cinque situazioni</button></div></section>`;
  bindQuiz(picks, (score, total) => { $("#revScore").textContent = `Risultato: ${score} su ${total}.`; });
  $("#again").addEventListener("click", renderReview);
}
function reviewStep(queue, idx, score) {
  window.scrollTo(0, 0);
  if (idx >= queue.length) {
    const nd = nextDue();
    app.innerHTML = `<div class="stack"><span class="eyebrow">Ripasso di oggi</span><h1>Fatto: ${score} su ${queue.length}</h1>
      <p class="muted">I modelli che hai ricordato torneranno tra più giorni; quelli sbagliati domani.${nd ? ` Prossimo ripasso: ${esc(fmtDate(nd))}.` : ""}</p>
      <div class="row"><a class="btn primary" href="#piano">Torna al piano</a><button id="free">Allenamento libero</button></div></div>`;
    $("#free").addEventListener("click", renderReview);
    return;
  }
  const m = BY[queue[idx]]; const r = S.rev[m.slug]; const qs = reviewQuestions(m); const qq = qs[(r.n || 0) % qs.length];
  const item = [{ m, q: qq.q, i: qq.i }]; const which = qq.kind === "which";
  const head = `<span class="eyebrow">Ripasso di oggi · ${idx + 1} di ${queue.length}</span>
    <div class="bar"><i style="width:${Math.round(idx / queue.length * 100)}%"></i></div>`;
  const tail = `<div class="row" id="nextRow" hidden><button class="primary" id="next">${idx + 1 < queue.length ? "Avanti" : "Fine"}</button><a class="btn" href="#m-${m.slug}">Rileggi la scheda</a></div>`;
  app.innerHTML = which
    ? `<div class="stack">${head}<h1>Quale modello?</h1><p class="muted">Leggi la situazione e riconosci il modello che ti aiuta.</p></div>
       <section class="block" style="margin-top:14px">${quizHTML(item, "")}${tail}</section>`
    : `<div class="stack">${head}<h1>${esc(m.title)}</h1>
      <div class="sheet" id="recall">
        <p><strong>Prima prova a ricordare.</strong> Scrivi con parole tue cosa dice questo modello e dove l'hai visto in azione. Anche due righe bastano.</p>
        <textarea id="recallText" aria-label="Cosa ricordo di questo modello" style="min-height:80px"></textarea>
        <div><button id="show">Confronta con la scheda</button></div>
      </div></div>
      <section class="block" style="margin-top:14px">${quizHTML(item, "")}${tail}</section>`;
  $("#show")?.addEventListener("click", () => {
    const mine = $("#recallText").value.trim();
    $("#recall").innerHTML = `${mine ? `<span class="eyebrow">Hai scritto</span><p class="muted">${esc(mine)}</p>` : ""}<span class="eyebrow">L'idea</span><p style="font-size:1.1rem">${esc(m.tag)}</p><p class="small muted">${esc(m.sp)}</p>`;
  });
  bindQuiz(item, (ok) => {
    grade(m.slug, ok === 1);
    $("#nextRow").hidden = false;
    $("#next").addEventListener("click", () => reviewStep(queue, idx + 1, score + ok));
  });
}

/* Ho una decisione da prendere */
let decision = { text: "", id: "", auto: [] };
/* Testo normalizzato: minuscole, senza accenti, lettere doppie ridotte (così «liccensiare» ≈ «licenziare»). */
const norm = (t) => String(t).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z]+/g, " ").replace(/([a-z])\1+/g, "$1").trim();
function lev(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++)
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length][b.length];
}
/* Una parola chiave corrisponde se una parola del testo inizia con essa, tollerando un errore di battitura. */
function stemHit(tokens, text, stem) {
  const s = norm(stem);
  if (s.includes(" ")) return (" " + text + " ").includes(" " + s);
  return tokens.some((t) => t.startsWith(s) || (s.length >= 5 && t.length >= s.length && lev(t.slice(0, s.length), s) <= 1));
}
function guessDecision(text) {
  const n = norm(text); const tokens = n.split(" "); let best = null, top = 0;
  for (const d of DECISIONS) { const sc = d.words.filter((w) => stemHit(tokens, n, w)).length; if (sc > top) { top = sc; best = d; } }
  return best;
}
const STOP = new Set(["voglio", "vorrei", "devo", "dovrei", "posso", "potrei", "sono", "essere", "fare", "questo", "questa", "quello", "quella", "perche", "quando", "molto", "anche", "ancora", "sempre", "tutto", "tutti", "cosa", "come", "dove", "nostro", "nostra", "mio", "mia", "suo", "sua", "loro", "fatto", "avere", "dopo", "prima"]);
let SEARCH_INDEX = null;
/* Se il tipo di problema non è riconosciuto, cerca nella Biblioteca i modelli più vicini alle parole scritte. */
function searchModels(text) {
  SEARCH_INDEX ||= MODELS.map((m) => ({ m, title: norm(m.title).split(" "), body: norm([m.tag, m.sp, ...(m.es || []).map((e) => e[1]), ...(m.ri || []).flat()].join(" ")).split(" ") }));
  const stems = [...new Set(norm(text).split(" ").filter((w) => w.length >= 5 && !STOP.has(w)).map((w) => w.slice(0, 5)))];
  if (!stems.length) return [];
  return SEARCH_INDEX.map(({ m, title, body }) => ({ m, sc: stems.reduce((a, st) => a + (title.some((w) => w.startsWith(st)) ? 3 : 0) + (body.some((w) => w.startsWith(st)) ? 1 : 0), 0) }))
    .filter((x) => x.sc > 0).sort((a, b) => b.sc - a.sc || (ESSENTIAL_SET.has(b.m.slug) - ESSENTIAL_SET.has(a.m.slug))).slice(0, 5).map((x) => x.m);
}
function renderDecision() {
  setTop(backBtn()); bindBack();
  const d = decision.id === "auto" ? { id: "auto", label: "Suggeriti dalle tue parole", models: decision.auto.map((s) => BY[s]).filter(Boolean) }
    : DECISIONS.find((x) => x.id === decision.id);
  app.innerHTML = `<div class="stack">
    <span class="eyebrow">Ho una decisione da prendere</span><h1>Quali modelli mi aiutano?</h1>
    <p class="muted">Descrivi la situazione oppure scegli il tipo di problema. ZO ti suggerisce i modelli adatti e le domande da farti.</p>
    <label class="field" for="decText">La tua situazione (facoltativo)<textarea id="decText" placeholder="Es. Non so se accettare un nuovo lavoro che paga di più ma è lontano da casa.">${esc(decision.text)}</textarea></label>
    <div><button class="primary" id="decGuess">Suggerisci i modelli</button></div>
    <div class="field"><span>Oppure scegli il tipo di problema</span>
      <div class="checks">${DECISIONS.map((x) => `<button class="small" data-dec="${x.id}" aria-pressed="${x.id === decision.id}" style="${x.id === decision.id ? "background:var(--ink);color:var(--bg);border-color:var(--ink)" : ""}">${esc(x.label)}</button>`).join("")}</div></div>
  </div>
  <div id="decOut"></div>`;
  const out = $("#decOut");
  if (d) {
    out.innerHTML = `<section class="block" style="margin-top:18px">
      <span class="eyebrow">${esc(d.label)}</span><h2>Modelli da usare</h2>
      <div class="stack">${d.models.map((m) => `<article class="entry">
        <span class="eyebrow">${esc(SHORT[m.cat])}</span>
        <h3><a href="#m-${m.slug}" style="color:inherit">${esc(m.title)}</a></h3>
        <p class="muted">${esc(m.tag)}</p>
        <div class="prose"><ul>${m.q.map((x) => `<li>${esc(x)}</li>`).join("")}</ul></div>
      </article>`).join("")}</div>
    </section>
    <section class="block"><h2>Le tue risposte</h2>
      <p class="muted">Rispondi alle domande che ti sembrano più utili. Salvando, la decisione finisce nel diario con i modelli usati.</p>
      <label class="field" for="decNotes">Cosa mi fanno vedere questi modelli<textarea id="decNotes"></textarea></label>
      <label class="field" for="decAct">Cosa farò, in concreto<textarea id="decAct" style="min-height:70px" placeholder="Il primo passo e quando lo faccio"></textarea></label>
      <div><button class="primary" id="decSave">Salva nel diario</button></div></section>`;
    $("#decSave").addEventListener("click", () => {
      const notes = $("#decNotes").value.trim().slice(0, 3000); const act = $("#decAct").value.trim().slice(0, 1500);
      if (!notes && !act) return $("#decNotes").focus();
      S.journal.push({ id: Date.now().toString(36), slug: null, data: today(), tipo: "decisione", testo: (decision.text.trim() || d.label).slice(0, 2000),
        risposte: notes ? [["Cosa mi fanno vedere i modelli", notes]] : [], azione: act, modelli: d.models.map((m) => m.slug) });
      save(); toast("Decisione salvata nel diario"); decision = { text: "", id: "", auto: [] }; location.hash = "diario";
    });
  }
  $("#decText").addEventListener("input", (e) => { decision.text = e.target.value; });
  $("#decGuess").addEventListener("click", () => {
    if (!decision.text.trim()) { toast("Scrivi la situazione o scegli un tipo di problema."); return $("#decText").focus(); }
    const g = guessDecision(decision.text);
    if (g) decision.id = g.id;
    else {
      const found = searchModels(decision.text);
      if (!found.length) { decision.id = ""; decision.auto = []; renderDecision(); toast("Non ho trovato modelli adatti: scegli il tipo di problema dall'elenco qui sotto."); return; }
      decision.id = "auto"; decision.auto = found.map((m) => m.slug);
    }
    renderDecision(); $("#decOut").scrollIntoView({ behavior: "smooth" });
  });
  app.querySelectorAll("[data-dec]").forEach((b) => b.addEventListener("click", () => { decision.id = b.dataset.dec; renderDecision(); $("#decOut").scrollIntoView({ behavior: "smooth" }); }));
}

/* Diario completo */
function renderJournal() {
  setTop(backBtn()); bindBack();
  const draw = () => {
    const list = S.journal.slice().reverse();
    app.innerHTML = `<div class="stack"><span class="eyebrow">Diario</span><h1>Il mio diario</h1>
      <p class="muted">${list.length ? `${list.length} note e schede di applicazione.` : "Qui compaiono le note, le schede “Applicalo a una tua situazione” e le decisioni che salvi."}</p>
      <div class="stack">${list.map(entryHTML).join("")}</div></div>`;
    bindEntryDelete(draw);
  };
  draw();
}

function complete(m) {
  S.done[m.slug] = today(); if (S.current === m.slug) S.current = null; schedule(m.slug);
  const n = currentModel(); if (n) S.startedAt[n.slug] = today(); save();
  toast(n ? `Completato. Prossimo: ${n.title}` : "Hai completato tutto il percorso");
  if (location.hash === "#piano") route(); else location.hash = "piano";
}
function undoComplete(m) { delete S.done[m.slug]; save(); toast("Rimesso tra i modelli da studiare"); route(); }

/* Impostazioni */
function renderSettings() {
  setTop();
  app.innerHTML = `<div class="stack">
    <h1>Impostazioni</h1>
    <p class="muted">ZO funziona senza internet e senza account. Progressi, esercizi e diario restano salvati in questo browser, su questo dispositivo.</p>
  </div>
  <section class="block" style="margin-top:14px">
    <label class="field" for="pNome">Come ti chiami<input type="text" id="pNome" value="${esc(S.nome)}" autocomplete="given-name"></label>
    <div><button class="primary" id="saveName">Salva</button></div>
  </section>
  <section class="block">
    <h2>Ordine del percorso</h2>
    <div class="radios">
      ${[["essenziale", "Prima i 30 essenziali", "I modelli più utili nella vita di tutti i giorni, poi tutti gli altri."],
         ["lista", "Nell'ordine dell'elenco", "Dal ragionamento alla narrazione, un'area dopo l'altra."],
         ["categorie", "Alternando le aree", "Ogni settimana un'area diversa, per collegare idee lontane."],
         ["casuale", "In ordine casuale", "Un ordine mescolato una volta e poi fisso."]].map(([v, t, d]) =>
        `<label for="ord-${v}"><input type="radio" name="ord" id="ord-${v}" value="${v}" ${S.order === v ? "checked" : ""}><span><strong>${t}</strong><span class="muted small">${d}</span></span></label>`).join("")}
    </div>
    <p class="small muted">Cambiare ordine non tocca i modelli completati né quello della settimana in corso.</p>
  </section>
  <section class="block">
    <h2>Copia di sicurezza</h2>
    <p class="muted">Per spostare i progressi su un altro dispositivo: copia il codice, poi incollalo qui sull'altro dispositivo.</p>
    <div class="row"><button id="exportBtn">Copia i miei dati</button></div>
    <textarea id="backup" aria-label="Codice dei dati" placeholder="Incolla qui il codice copiato" style="font-size:.8rem"></textarea>
    <div class="row"><button id="importBtn">Carica i dati incollati</button></div>
  </section>
  <section class="block">
    <h2>Ricomincia</h2>
    <p class="muted">Azzera modelli completati, esercizi, risultati dei quiz e ripasso. Il diario resta.</p>
    <div class="row" id="resetRow"><button id="reset">Azzera i progressi</button></div>
  </section>`;
  $("#saveName").addEventListener("click", () => { S.nome = $("#pNome").value.trim().slice(0, 60); save(); toast("Salvato"); });
  app.querySelectorAll("input[name=ord]").forEach((r) => r.addEventListener("change", () => {
    const cur = currentModel(); S.order = r.value; if (r.value === "casuale" && !S.seed) S.seed = Math.floor(Math.random() * 1e9) + 1;
    if (cur) S.current = cur.slug; save(); toast("Ordine aggiornato");
  }));
  $("#exportBtn").addEventListener("click", () => {
    const code = JSON.stringify(S); const ta = $("#backup"); ta.value = code;
    navigator.clipboard?.writeText(code).then(() => toast("Dati copiati"), () => { ta.select(); toast("Seleziona il testo e copialo"); }) ?? (ta.select(), toast("Seleziona il testo e copialo"));
  });
  $("#importBtn").addEventListener("click", () => {
    try {
      const st = JSON.parse($("#backup").value);
      if (!st || typeof st !== "object" || !("done" in st)) throw 0;
      S = { ...S, ...st }; normalize(); save(); toast("Dati caricati"); renderSettings();
    } catch { toast("Il codice non è valido. Copialo di nuovo per intero."); }
  });
  $("#reset").addEventListener("click", () => {
    $("#resetRow").innerHTML = `<span>Sei sicuro?</span><button class="primary" id="resetYes" style="background:var(--bad);border-color:var(--bad)">Sì, azzera</button><button id="resetNo">Annulla</button>`;
    $("#resetNo").onclick = renderSettings;
    $("#resetYes").onclick = () => { S.done = {}; S.quiz = {}; S.ex = {}; S.rev = {}; S.current = null; S.startedAt = {}; save(); toast("Progressi azzerati"); location.hash = "piano"; };
  });
}

/* ---------- boot ---------- */
load();
window.addEventListener("hashchange", route);
route();
