# Agente capo

Un agente che coordina una squadra di agenti specializzati e, quando serve, ne crea di nuovi.

```
Tu ──► Capo ──┬─► crea_agente      (nuovo specialista, salvato in agenti.json)
              ├─► assegna_compito  ──► marketing-pizzeria  (social, Google Ads, scheda Google…)
              └─► assegna_compito  ──► altro specialista  (in parallelo)
```

- **Capo**: capisce la richiesta, la divide in compiti, sceglie o crea lo specialista adatto, controlla i risultati e ti risponde.
- **Specialisti**: ognuno ha un ambito, istruzioni proprie e solo gli strumenti che gli servono:
  `web` (ricerca), `grafica`, `immagini_ai`, `facebook`, `tiktok`,
  `google_ads`, `google_analytics`, `search_console`, `google_business`. Si passano i file nella cartella `lavoro/`.
- La squadra è salvata in `agenti.json` (al primo avvio viene creata da `agenti_iniziali.json`). Puoi modificarla a mano.

## Il primo specialista: `marketing-pizzeria`

Si occupa di tutto il marketing della pizzeria. **Tutto ciò che vedono i clienti è in tedesco**: grafiche, post, hashtag, risposte alle recensioni. Con te parla in italiano e sotto ogni testo tedesco mette la traduzione.

1. **Compila `pizzeria.md`**: nome, menu e prezzi, orari, telefono, tono di voce, colori, regione (per il tedesco locale), budget e zona dei clienti. L'agente lo legge ogni volta e non inventa prezzi né offerte.
2. **Metti le foto delle tue pizze** in `lavoro/foto/` (jpg o png). Sono la base migliore: le pizze vere.
3. **Social**: impagina foto e testi in grafiche (formato post 4:5 per Facebook, storia 9:16 per TikTok), le guarda e le rifà se non vanno bene. Può anche generare immagini AI per sfondi ed eventi.
   - **Sfondo brutto?** Carica la foto così com'è: l'agente scontorna la pizza (resta quella vera) e la mette su uno sfondo nuovo, generato con l'AI (legno, pietra, marmo…), una tua immagine in `lavoro/sfondi/` o una tinta da studio con i colori del locale. Vengono meglio le foto in cui la pizza si vede intera.
   - **Facebook**: ti mostra file e testo e pubblica solo dopo il tuo `ok`. Se scrivi cosa cambiare, corregge e ripropone.
   - **TikTok**: dopo il tuo `ok` manda il video nelle **bozze**. Aggiungi la musica nell'app e pubblichi da lì.
4. **Scheda Google (Maps)**: legge chiamate, indicazioni e visualizzazioni, legge le recensioni e propone le risposte, pubblica aggiornamenti. Ogni risposta e ogni post li pubblica solo dopo il tuo `ok`.
5. **Google Ads**: legge campagne, parole chiave e termini di ricerca, trova sprechi e opportunità. **Solo lettura**: non cambia nulla e ti dice esattamente cosa modificare.
6. **Analytics e Search Console**: da dove arrivano le visite al sito e con quali ricerche.

Esempi di richieste al capo:
- *«Fai un post per Facebook sulla diavola, con il prezzo.»*
- *«Prepara i post della settimana: lunedì margherita, mercoledì l'offerta 2 pizze + bibita, venerdì la pizza del mese. Pubblica su Facebook e manda i video su TikTok.»*
- *«Come sta andando Google Ads questo mese rispetto al mese scorso? Dove sto sprecando soldi?»*
- *«Rispondi a tutte le recensioni Google senza risposta.»*
- *«Fammi un piano marketing per dicembre.»*

Grafiche e video restano comunque in `lavoro/post/`, anche se non pubblichi.

## Avvio

```bash
cd agenti
pip install -r requirements.txt
cp .env.esempio .env      # poi apri .env e inserisci le chiavi
python capo.py
```

Serve anche **ffmpeg** per i video di TikTok (`brew install ffmpeg` su Mac, `sudo apt install ffmpeg` su Linux, oppure da ffmpeg.org su Windows).
La prima volta che cambia uno sfondo scarica il modello per lo scontorno (circa 180 MB, una volta sola).
Per usare un tuo carattere, mettilo in `font/titolo.ttf` e `font/testo.ttf`.

## Collegare i social

Le chiavi vanno solo nel file `.env`, che resta sul tuo computer e non viene caricato su GitHub.

**Facebook** (`FACEBOOK_PAGE_ID`, `FACEBOOK_PAGE_TOKEN`)
1. Su developers.facebook.com crea un'app di tipo *Business*.
2. Con lo strumento *Graph API Explorer* genera un token utente con i permessi `pages_show_list`, `pages_read_engagement` e `pages_manage_posts`.
3. Trasformalo in un token di lunga durata, poi chiama `GET /me/accounts`: trovi l'`id` della Pagina e il suo `access_token`. Sono i due valori da mettere nel `.env`.

**TikTok** (`TIKTOK_ACCESS_TOKEN`)
1. Su developers.tiktok.com crea un'app e aggiungi il prodotto *Content Posting API*.
2. Chiedi il permesso `video.upload` e collega il tuo account con il login TikTok dell'app, per ottenere il token di accesso dell'utente.
3. L'invio nelle bozze non richiede la revisione dell'app da parte di TikTok. La pubblicazione diretta sì: per questo l'agente manda i video in bozza.

**Google** (Ads, Analytics, Search Console, scheda Maps): un solo collegamento per tutti.
1. Su console.cloud.google.com crea un progetto e attiva le API: *Google Ads API*, *Google Analytics Data API*, *Google Search Console API*, *Business Profile Performance API*, *My Business Account Management API*, *My Business Business Information API*.
2. In *API e servizi > Schermata consenso OAuth* scegli *Esterno* e aggiungi il tuo indirizzo Gmail tra gli utenti di test. Poi pubblica l'app in produzione, altrimenti il collegamento scade dopo 7 giorni.
3. In *Credenziali* crea un *ID client OAuth* di tipo *App desktop* e scarica il file JSON.
4. Lancia `python collega_google.py percorso/del/file.json`: si apre il browser, accedi e accetta. Lo script scrive le chiavi nel `.env` e ti mostra gli ID della scheda Google.
5. **Google Ads**: nel tuo account Ads vai su *Strumenti > Centro API* e richiedi il **token sviluppatore**. Mettilo in `GOOGLE_ADS_DEVELOPER_TOKEN` e l'ID cliente (10 cifre, senza trattini) in `GOOGLE_ADS_CUSTOMER_ID`. Se Google lo approva solo per account di test, chiedi l'accesso *Basic* dalla stessa pagina.
6. **Scheda Google**: le API di Business Profile vanno richieste con un modulo di Google (cerca *Business Profile API access request*). L'approvazione può richiedere qualche giorno. Nel frattempo tutto il resto funziona.
7. **Analytics**: in `GA4_PROPERTY_ID` metti l'ID numerico della proprietà (Amministrazione > Dettagli proprietà). **Search Console**: in `SEARCH_CONSOLE_SITO` metti l'indirizzo della proprietà, come lo vedi in Search Console.

Ogni servizio è facoltativo: se ne manca uno, l'agente lo dice e lavora con gli altri.

**Immagini AI** (`OPENAI_API_KEY`): crea una chiave su platform.openai.com. Costa qualche centesimo a immagine. Se non la metti, l'agente usa solo le tue foto.

> Nota: il codice di Facebook, TikTok, Google e OpenAI è scritto seguendo le API come le conosco, ma non l'ho potuto provare con account veri. Al primo uso, se un servizio risponde con un errore, l'agente te lo mostra: incollamelo e lo sistemo.

## Costi

Gira sul tuo computer: paghi solo l'uso delle API, niente hosting.
Di default tutti gli agenti usano **Claude Sonnet 5.5** (`claude-sonnet-5-5`): circa 0,15–0,25 $ per un post con grafica.
Per un capo più capace (costa circa il doppio), nel `.env`: `MODELLO_CAPO=claude-opus-5-5`.

Lo scontorno delle foto gira sul tuo computer ed è gratis. Le immagini AI (anche gli sfondi) costano qualche centesimo l'una: la qualità si sceglie con `QUALITA_IMMAGINI` nel `.env`.

Ogni compito si ferma comunque dopo 25 passaggi (`MAX_GIRI` in `capo.py`).
