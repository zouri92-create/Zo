# Agente capo

Un agente che coordina una squadra di agenti specializzati e, quando serve, ne crea di nuovi.

```
Tu ──► Capo ──┬─► crea_agente      (nuovo specialista, salvato in agenti.json)
              ├─► assegna_compito  ──► specialista (web + file in lavoro/)
              └─► assegna_compito  ──► altro specialista   (in parallelo)
```

- **Capo**: capisce la richiesta, la divide in compiti, sceglie o crea lo specialista adatto, controlla i risultati e ti risponde.
- **Specialisti**: ognuno ha un ambito e istruzioni proprie. Possono cercare sul web (se il capo lo abilita) e leggere o scrivere file nella cartella condivisa `lavoro/`, così si passano i risultati lunghi.
- Gli specialisti creati restano in `agenti.json` e vengono riusati le volte successive. Puoi anche modificarli a mano.

## Avvio

```bash
cd agenti
pip install -r requirements.txt
export ANTHROPIC_API_KEY=...      # la tua chiave da console.anthropic.com
python capo.py
```

Esempio: *"Voglio lanciare un podcast sulla crescita personale: fammi un piano con nome, 10 puntate e un post di presentazione."*
Il capo creerà, per esempio, un ricercatore, uno scrittore e un esperto di social, e li farà lavorare.

## Costi

Gira sul tuo computer: paghi solo i token dell'API, niente costi di hosting.
Di default tutti gli agenti usano `claude-opus-5-5`. Per spendere meno sugli specialisti:

```bash
MODELLO_SPECIALISTI=claude-sonnet-5-5 python capo.py   # oppure claude-haiku-5-5, il più economico
```

Ogni compito si ferma comunque dopo 25 passaggi (`MAX_GIRI` in `capo.py`).
