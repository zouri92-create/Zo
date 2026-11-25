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

# Giro Consegne (estensione Chrome, cartella `consegne/`)

Pianificatore delle consegne a domicilio: dato l'elenco degli ordini (Sito, Just Eat, Uber Eats, Wolt, telefono)
e i fattorini in turno, propone **quale giro dare a ogni fattorino**, in che ordine fare le consegne,
**a che ora arriva** da ogni cliente e **quando rientra** al locale.

- Parte sempre dall'ordine più urgente e ci abbina gli ordini vicini solo se nessun cliente sfora l'orario promesso (default 60 min).
- Avvisa in rosso gli ordini che arriveranno in ritardo con i fattorini disponibili.
- "Assegna e parti" mette il fattorino in giro e toglie i suoi ordini dalla lista; ogni consegna sparisce da sola all'orario di arrivo previsto e il fattorino torna libero da solo all'orario di rientro ("Rientrato" serve solo se torna prima).
- "Apri in Google Maps" apre il percorso del giro nel navigatore.
- Con una **chiave API Google** (Geocoding API + Routes API) usa indirizzi e tempi reali, con circa 3 richieste per ordine;
  senza chiave stima i tempi in linea d'aria con OpenStreetMap.
- I dati restano in Chrome (localStorage dell'estensione).

## Installazione
1. Scarica e decomprimi la cartella `consegne`.
2. In Chrome apri `chrome://extensions` e attiva **Modalità sviluppatore** (in alto a destra).
3. **Carica estensione non pacchettizzata** e scegli la cartella `consegne`.
4. Clicca l'icona del puzzle in alto, fissa **Giro Consegne** con la puntina e cliccala per aprire il programma.
