/* ---------- the library: list order from models.js, content from data/*.js ---------- */
const slugify = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
const MODELS = RAW.map(([cat, title, tag], i) => ({ n: i + 1, cat, title, tag, slug: slugify(title), ...(LIB[i] || {}) }));
const BY = Object.fromEntries(MODELS.map((m) => [m.slug, m]));

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
let S = { order: "lista", seed: 0, current: null, startedAt: {}, done: {}, quiz: {}, ex: {}, journal: [], nome: "" };
function load() {
  try { const st = JSON.parse(localStorage.getItem(KEY) || "null"); if (st && typeof st === "object") S = { ...S, ...st }; } catch {}
  normalize();
}
function normalize() {
  S.journal = Array.isArray(S.journal) ? S.journal : [];
  for (const k of ["startedAt", "done", "quiz", "ex"]) if (!S[k] || typeof S[k] !== "object") S[k] = {};
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
  return list;
}
function currentModel() {
  if (S.current && BY[S.current] && !S.done[S.current]) return BY[S.current];
  return planOrder().find((m) => !S.done[m.slug]) || null;
}
const doneCount = () => Object.keys(S.done).filter((k) => BY[k]).length;
const exDone = (slug) => (S.ex[slug] || []).filter(Boolean).length;

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
  app.innerHTML = `<div class="stack">
    <p class="muted">${hello} ${done ? `Hai completato ${done} modelli su ${MODELS.length}.` : `La biblioteca contiene ${MODELS.length} modelli in 7 aree.`}</p>
    ${m ? `<div class="hero">
      <span class="eyebrow">Settimana ${done + 1} · ${esc(SHORT[m.cat])}</span>
      <h1>${esc(m.title)}</h1>
      <p>${esc(m.tag)}</p>
      <div class="days" aria-label="Giorno ${day} di 7">${[1,2,3,4,5,6,7].map((i) => `<i class="${i <= day ? "on" : ""}"></i>`).join("")}</div>
      <p class="small">Giorno ${day} di 7 · esercizi fatti ${exDone(m.slug)} di 3${day >= 7 ? " · la settimana è finita: se ti senti pronto, segnalo come completato" : ""}</p>
      <div class="row"><button id="openWeek">Apri la lezione</button>${day >= 7 ? `<button class="alt" id="finishWeek">Segna come completato</button>` : ""}</div>
    </div>` : `<div class="hero"><span class="eyebrow">Percorso completato</span><h1>Hai studiato tutti gli 87 modelli</h1><p>Ripassali con i quiz o rileggi le schede nella Biblioteca.</p></div>`}
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
    <div class="links-row"><a class="btn" href="#ripasso">Ripasso con quiz</a><a class="btn" href="#diario">Il mio diario · ${S.journal.length}</a></div>
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
      ${[["", "Tutti"], ["da", "Da studiare"], ["fatti", "Completati"]].map(([v, l]) => `<button data-st="${v}" aria-pressed="${filter.stato === v}">${l}</button>`).join("")}
    </div>
    <div class="list" id="results"></div>
  </div>`;
  const draw = () => {
    const q = slugify(filter.q);
    const list = MODELS.filter((m) => (!filter.cat || m.cat === filter.cat)
      && (!filter.stato || (filter.stato === "fatti") === !!S.done[m.slug])
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
  bindQuiz(qItems, (score, total) => { S.quiz[m.slug] = { score, total, data: today() }; save(); $("#quizScore").textContent = `Risultato: ${score} su ${total}.`; });
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
    <div class="row" style="justify-content:space-between"><span class="eyebrow" style="color:var(--muted)">${esc(fmtDate(e.data))}${view.name === "diario" && m ? ` · <a href="#m-${m.slug}">${esc(m.title)}</a>` : ""}${e.tipo === "scheda" ? " · Applicazione" : ""}</span>
      <button class="ghost small" data-del="${esc(e.id)}" aria-label="Elimina questa nota">Elimina</button></div>
    <p>${esc(e.testo)}</p>
    ${(e.risposte || []).map(([d, r]) => `<div class="fb"><strong>${esc(d)}</strong><br>${esc(r)}</div>`).join("")}
    ${e.azione ? `<div class="fb"><strong>Cosa farò</strong><br>${esc(e.azione)}</div>` : ""}
  </div>`;
}
function bindEntryDelete(redraw) {
  app.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => {
    if (b.dataset.armed) { S.journal = S.journal.filter((e) => e.id !== b.dataset.del); save(); redraw(); toast("Nota eliminata"); }
    else { b.dataset.armed = "1"; b.textContent = "Conferma eliminazione"; b.style.color = "var(--bad)"; }
  }));
}

/* Ripasso: domande dai modelli completati (o da tutta la biblioteca all'inizio) */
function renderReview() {
  setTop(backBtn()); bindBack();
  const pool = MODELS.filter((m) => S.done[m.slug]);
  const source = pool.length >= 3 ? pool : MODELS;
  const picks = shuffled(source.flatMap((m) => m.qz.map((q, i) => ({ m, q, i }))), Date.now() % 100000).slice(0, 5);
  app.innerHTML = `<div class="stack">
    <span class="eyebrow">Ripasso</span><h1>Cinque domande</h1>
    <p class="muted">${pool.length >= 3 ? `Prese dai ${pool.length} modelli che hai completato.` : "Prese da tutta la biblioteca. Quando avrai completato almeno 3 modelli, il ripasso userà solo quelli."}</p>
  </div>
  <section class="block" style="margin-top:14px">${quizHTML(picks, "r:")}<p class="small muted" id="revScore"></p>
    <div><button class="primary" id="again">Altre cinque domande</button></div></section>`;
  bindQuiz(picks, (score, total) => { $("#revScore").textContent = `Risultato: ${score} su ${total}.`; });
  $("#again").addEventListener("click", renderReview);
}

/* Diario completo */
function renderJournal() {
  setTop(backBtn()); bindBack();
  const draw = () => {
    const list = S.journal.slice().reverse();
    app.innerHTML = `<div class="stack"><span class="eyebrow">Diario</span><h1>Il mio diario</h1>
      <p class="muted">${list.length ? `${list.length} note e schede di applicazione.` : "Le note e le schede “Applicalo a una tua situazione” che salvi nelle lezioni compaiono qui."}</p>
      <div class="stack">${list.map(entryHTML).join("")}</div></div>`;
    bindEntryDelete(draw);
  };
  draw();
}

function complete(m) {
  S.done[m.slug] = today(); if (S.current === m.slug) S.current = null;
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
      ${[["lista", "Nell'ordine dell'elenco", "Dal ragionamento alla narrazione, un'area dopo l'altra."],
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
    <p class="muted">Azzera modelli completati, esercizi e risultati dei quiz. Il diario resta.</p>
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
    $("#resetYes").onclick = () => { S.done = {}; S.quiz = {}; S.ex = {}; S.current = null; S.startedAt = {}; save(); toast("Progressi azzerati"); location.hash = "piano"; };
  });
}

/* ---------- boot ---------- */
load();
window.addEventListener("hashchange", route);
route();
