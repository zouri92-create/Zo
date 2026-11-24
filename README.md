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

`zo.html`: app per imparare un modello mentale a settimana (87 modelli in 7 aree) e usarlo nella vita di tutti i giorni.

- **Il tuo piano**: modello della settimana (giorno X di 7), progresso per area, prossime settimane, modelli da ripassare.
- **Settimana / scheda**: lettura Rapida o Approfondita, come riconoscerlo, esempi quotidiani, sfida della settimana, domande da farsi, errore da evitare, quiz, modelli collegati. La scheda la scrive **Claude** al primo accesso, con esempi adattati al profilo, e resta salvata.
- **Applicalo a una tua situazione**: descrivi un problema reale e Claude mostra come usare il modello.
- **Diario** con commento facoltativo di Claude.
- **Impostazioni**: profilo "Su di te", ordine del percorso (elenco, aree alternate, casuale), azzera progressi.

Pubblicata come Artifact su claude.ai (capacità `sample`, `db`, `user`); i dati restano privati nell'account.
