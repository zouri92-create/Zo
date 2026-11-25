// Gira dentro la pagina di Cashdesk: legge la tabella degli ordini visibile e la passa a Giro Consegne
// tramite chrome.storage. Non clicca e non modifica nulla sulla cassa.
(() => {
  const norm = s => s.trim().toLowerCase().replaceAll('ß', 'ss').normalize('NFD')
    .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]/g, '');

  // Nomi di colonna possibili (tedesco, olandese, inglese, italiano)
  const COLS = {
    street:  ['strasse', 'straat', 'street', 'indirizzo', 'adresse', 'adres', 'address', 'lieferadresse'],
    zip:     ['plz', 'postcode', 'postleitzahl', 'zip', 'cap'],
    city:    ['stadt', 'ort', 'plaats', 'city', 'citta'],
    due:     ['lieferzeit', 'lieferuhrzeit', 'gewunschtelieferzeit', 'bezorgtijd', 'deliverytime', 'oraconsegna', 'zeit', 'uhrzeit'],
    countdown: ['countdown'],
    driver:  ['kurier', 'fahrer', 'koerier', 'bezorger', 'courier', 'driver', 'fattorino'],
    id:      ['bestellnummer', 'bestellnr', 'nr', 'ordernr', 'ordernummer', 'orderid', 'auftragsnummer', 'auftragsnr',
              'bestellid', 'orderno', 'ordernumber', 'numeroordine', 'bestelnummer', 'id'],
    name:    ['name', 'kunde', 'kundenname', 'klant', 'customer', 'cliente', 'naam'],
    source:  ['quelle', 'kanal', 'plattform', 'platform', 'herkunft', 'bron', 'source', 'channel', 'piattaforma'],
    status:  ['status', 'stato'],
  };

  function cellsOf(row) {
    return Array.from(row.querySelectorAll(':scope > th, :scope > td, :scope > [role=cell], :scope > [role=gridcell], :scope > [role=columnheader]'),
      c => (c.innerText || '').trim().replace(/\s+/g, ' '));
  }

  function read() {
    const groups = new Map();
    for (const row of document.querySelectorAll('tr, [role=row]')) {
      if (!row.getClientRects().length) continue;
      const owner = row.closest('table, [role=grid], [role=table]') || row.parentElement;
      if (!groups.has(owner)) groups.set(owner, []);
      groups.get(owner).push(row);
    }
    let found = false; const rows = []; let headers = null;
    for (const group of groups.values()) {
      let cols = null;
      for (const row of group) {
        const cells = cellsOf(row);
        const h = cells.map(norm);
        if (h.some(k => COLS.street.includes(k))) {
          // per ogni campo vince il nome di colonna più specifico (es. "Lieferzeit" prima di "Zeit")
          cols = Object.fromEntries(Object.entries(COLS).map(([k, keys]) => {
            for (const key of keys) { const i = h.indexOf(key); if (i >= 0) return [k, i]; }
            return [k, -1];
          }));
          headers = cells; found = true; continue;
        }
        if (!cols || cells.length < 3) continue;
        const get = k => (cols[k] >= 0 ? cells[cols[k]] || '' : '');
        const street = get('street');
        if (!street || !/\d/.test(street)) continue;              // serve un civico
        const driver = get('driver');
        rows.push({
          id: get('id'), street, zip: get('zip'), city: get('city'), name: get('name'),
          due: (get('due').match(/\b([01]?\d|2[0-3]):[0-5]\d\b/) || [''])[0],
          countdown: (get('countdown').replace('−', '-').match(/^([+-]?\d{1,3})\s*(?:min\.?)?$/i) || [])[1] ?? null,
          driver: /^[-–—]?$/.test(driver.trim()) ? '' : driver,
          status: get('status'),
          text: (get('source') + ' ' + cells.join(' ')).slice(0, 400),   // per riconoscere la piattaforma
        });
      }
    }
    return { found, rows, headers };
  }

  let last = '';
  let lastWrite = 0;
  function tick() {
    let snap;
    try { snap = read(); } catch (e) { return; }
    if (!snap.found) return;                       // in questa pagina/frame non c'è la tabella ordini
    const sig = JSON.stringify(snap.rows);
    const t = Date.now();
    if (sig === last && t - lastWrite < 30000) return;
    last = sig; lastWrite = t;
    try {
      chrome.storage.local.set({ cashdesk: { at: t, url: location.href, headers: snap.headers, rows: snap.rows } });
    } catch (e) { /* estensione ricaricata: questa pagina va aggiornata */ }
  }
  setInterval(tick, 5000);
  tick();
})();
