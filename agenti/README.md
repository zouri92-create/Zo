# Agente capo

Un agente che coordina una squadra di agenti specializzati e, quando serve, ne crea di nuovi.

```
Tu ──► Capo ──┬─► crea_agente      (nuovo specialista, salvato in agenti.json)
              ├─► assegna_compito  ──► social-pizzeria  (grafica, immagini AI, Facebook, TikTok)
              └─► assegna_compito  ──► altro specialista  (in parallelo)
```

- **Capo**: capisce la richiesta, la divide in compiti, sceglie o crea lo specialista adatto, controlla i risultati e ti risponde.
- **Specialisti**: ognuno ha un ambito, istruzioni proprie e solo gli strumenti che gli servono:
  `web` (ricerca), `grafica`, `immagini_ai`, `facebook`, `tiktok`. Si passano i file nella cartella `lavoro/`.
- La squadra è salvata in `agenti.json` (al primo avvio viene creata da `agenti_iniziali.json`). Puoi modificarla a mano.

## Il primo specialista: `social-pizzeria`

Crea immagini e video per la pizzeria, scrive i post e li pubblica.

1. **Compila `pizzeria.md`**: nome, menu e prezzi, orari, telefono, tono di voce, colori. L'agente lo legge ogni volta e non inventa prezzi né offerte.
2. **Metti le foto delle tue pizze** in `lavoro/foto/` (jpg o png). Sono la base migliore: le pizze vere.
3. L'agente impagina foto e testi in **grafiche pronte** (formato post 4:5 per Facebook, storia 9:16 per TikTok), le **guarda** e le rifà se non vanno bene. Se configuri OpenAI può anche **generare immagini AI** per sfondi, eventi e idee creative.
4. **Facebook**: prima di pubblicare ti mostra file e testo e aspetta il tuo `ok`. Se scrivi altro (per esempio «metti il prezzo più grande»), corregge e ti ripropone il post.
5. **TikTok**: monta un video verticale dalle grafiche e, dopo il tuo `ok`, lo manda nelle **bozze** del tuo account. Ti arriva una notifica nell'app, aggiungi una musica di tendenza e pubblichi da lì. La didascalia te la scrive l'agente.

Esempi di richieste al capo:
- *«Fai un post per Facebook sulla diavola, con il prezzo.»*
- *«Prepara i post della settimana: lunedì margherita, mercoledì l'offerta 2 pizze + bibita, venerdì la pizza del mese. Pubblica su Facebook e manda i video su TikTok.»*

Grafiche e video restano comunque in `lavoro/post/`, anche se non pubblichi.

## Avvio

```bash
cd agenti
pip install -r requirements.txt
cp .env.esempio .env      # poi apri .env e inserisci le chiavi
python capo.py
```

Serve anche **ffmpeg** per i video di TikTok (`brew install ffmpeg` su Mac, `sudo apt install ffmpeg` su Linux, oppure da ffmpeg.org su Windows).
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

**Immagini AI** (`OPENAI_API_KEY`): crea una chiave su platform.openai.com. Costa qualche centesimo a immagine. Se non la metti, l'agente usa solo le tue foto.

> Nota: il codice di Facebook, TikTok e OpenAI è scritto seguendo le API come le conosco, ma non l'ho potuto provare con account veri. Al primo uso, se un servizio risponde con un errore, l'agente te lo mostra: incollamelo e lo sistemo.

## Costi

Gira sul tuo computer: paghi solo l'uso delle API, niente hosting.
Di default tutti gli agenti Claude usano `claude-opus-5-5`. Per spendere meno sugli specialisti, nel `.env`:

```
MODELLO_SPECIALISTI=claude-sonnet-5-5
```

Ogni compito si ferma comunque dopo 25 passaggi (`MAX_GIRI` in `capo.py`).
