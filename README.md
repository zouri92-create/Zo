# Libro in Pratica

App web che trasforma un libro in un percorso di lezioni quotidiane per applicarlo nella vita di tutti i giorni.

- **Carica** un libro in formato EPUB, PDF (con testo selezionabile), TXT o Markdown.
- Il libro viene diviso in lezioni seguendo i capitoli; **Claude** ne ricava tesi e principi.
- Ogni lezione: idea chiave, spiegazione, citazione, 3 applicazioni concrete (lavoro, relazioni, te stesso…), **sfida del giorno**, errore da evitare.
- **Diario** serale con feedback del coach e **chat** per chiedere come applicare l'idea a situazioni reali.
- Sezione **"Su di me"** per personalizzare gli esempi; progressi e giorni consecutivi.

Il file `index.html` è pubblicato come Artifact su claude.ai (usa le capacità `sample`, `db` e `user`).
Il testo del libro resta nel browser (IndexedDB); lezioni e progressi sono salvati nell'account.

---

# ZO – Modelli Mentali

`zo.html`: biblioteca **offline** di 87 modelli mentali, per impararli uno a settimana e usarli nella vita di tutti i giorni. Non serve internet né un account: tutto il contenuto è dentro il file e i progressi restano nel browser.

- **Il tuo piano**: modello della settimana (giorno X di 7), esercizio e domanda del giorno, progresso per area, prossime settimane.
- **Biblioteca**: 87 schede complete, con ricerca e filtri per area e per stato. Ogni scheda ha lettura Rapida o Approfondita, segnali per riconoscere il modello, esempi quotidiani, 3 esercizi da spuntare, domande da farsi, l'errore da evitare, un quiz e i modelli della stessa area.
- **Applicalo a una tua situazione**: una scheda guidata (situazione, risposte alle domande del modello, cosa farò) che finisce nel diario.
- **Ripasso** con quiz dai modelli completati e **Diario** di note e schede.
- **Impostazioni**: nome, ordine del percorso, copia di sicurezza dei dati, azzera progressi.

I sorgenti sono in `zo-src/`: le schede in `zo-src/data/` (un file per area), l'elenco in `models.js`, l'app in `app.js`.
Dopo una modifica, rigenera il file unico con `python3 zo-src/build.py`.
