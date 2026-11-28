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

`zo.html`: biblioteca **offline** di modelli mentali (87 iniziali + i gruppi dal PDF dei 169, vedi `zo-src/elenco-169.md`), per impararli uno a settimana e usarli nella vita di tutti i giorni. Non serve internet né un account: tutto il contenuto è dentro il file e i progressi restano nel browser.

- **Il tuo piano**: modello in corso con il **prossimo passo** da fare, ritmo a scelta (1, 2 o 3 modelli a settimana), giorni di fila, progresso per area.
- **5 passi per padroneggiare un modello**: letto, esercizio fatto, quiz superato, applicato a una situazione, ricordato in 3 ripassi di fila.
- **Domande «Quale modello?»**: create dagli esempi e dai segnali delle schede, mescolate nel ripasso e nell'allenamento misto.
- **Percorso essenziale**: prima i 30 modelli più utili nella vita quotidiana, poi tutti gli altri (scelta in Impostazioni).
- **Ripasso automatico**: i modelli completati o con il quiz fatto tornano a intervalli crescenti (1, 3, 7, 14, 30, 60 giorni); prima si prova a ricordare, poi una domanda.
- **Ho una decisione da prendere**: descrivi la situazione o scegli il tipo di problema, ZO suggerisce 5 modelli con le loro domande e salva la decisione nel diario.
- **Biblioteca**: 87 schede complete, con ricerca e filtri per area e per stato. Ogni scheda ha lettura Rapida o Approfondita, segnali per riconoscere il modello, esempi quotidiani, 3 esercizi da spuntare, domande da farsi, l'errore da evitare, un quiz e i modelli della stessa area.
- **Applicalo a una tua situazione**: una scheda guidata (situazione, risposte alle domande del modello, cosa farò) che finisce nel diario.
- **Ripasso** con quiz dai modelli completati e **Diario** di note e schede.
- **Impostazioni**: nome, ordine del percorso, copia di sicurezza dei dati, azzera progressi.

I sorgenti sono in `zo-src/`: le schede in `zo-src/data/` (un file per area), l'elenco in `models.js`, l'app in `app.js`.
Dopo una modifica, rigenera il file unico con `python3 zo-src/build.py`.
