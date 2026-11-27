"""Agente capo: dà ordini agli agenti specializzati e ne crea di nuovi.

Avvio:  python capo.py
Serve una chiave API in ANTHROPIC_API_KEY (oppure un profilo `ant auth login`).

- Il capo parla con te, divide il lavoro e lo assegna agli specialisti.
- Se manca lo specialista adatto, il capo lo crea (nome, scopo, istruzioni)
  e lo salva in agenti.json, così resta disponibile anche le volte successive.
- Gli specialisti possono avere strumenti in più (vedi registro_strumenti.py):
  ricerca web, grafica, immagini AI, Facebook, TikTok, Google Ads, Analytics,
  Search Console e la scheda Google del locale. Leggono e scrivono
  file nella cartella lavoro/.
- Le chiavi (Anthropic, OpenAI, Facebook, TikTok) vanno nel file .env
  (copia .env.esempio).
"""

from __future__ import annotations

import json
from datetime import date
import os
import re
import sys
import threading
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

CARTELLA = Path(__file__).resolve().parent


def carica_env() -> None:
    """Legge le righe NOME=valore del file .env (senza sovrascrivere variabili già impostate)."""
    f = CARTELLA / ".env"
    if not f.exists():
        return
    for riga in f.read_text(encoding="utf-8").splitlines():
        riga = riga.strip()
        if riga and not riga.startswith("#") and "=" in riga:
            k, v = riga.split("=", 1)
            os.environ.setdefault(k.strip(), v.strip().strip('"').strip("'"))


carica_env()

import anthropic  # noqa: E402  (dopo carica_env, così legge ANTHROPIC_API_KEY dal .env)

import registro_strumenti as extra  # noqa: E402

FILE_AGENTI = CARTELLA / "agenti.json"
FILE_AGENTI_INIZIALI = CARTELLA / "agenti_iniziali.json"
CARTELLA_LAVORO = CARTELLA / "lavoro"

# Modelli: Sonnet per tutti (buon rapporto qualità/prezzo). Si cambiano nel file .env,
# per esempio MODELLO_CAPO=claude-opus-5-5 per un capo più capace.
MODELLO_CAPO = os.environ.get("MODELLO_CAPO", "claude-sonnet-5-5")
MODELLO_SPECIALISTI = os.environ.get("MODELLO_SPECIALISTI", "claude-sonnet-5-5")
MAX_GIRI = 25  # limite di passaggi per ogni compito, per non spendere all'infinito

client = anthropic.Anthropic()
blocco_archivio = threading.Lock()  # più agenti possono lavorare in parallelo


# ---------------------------------------------------------------------------
# Archivio degli agenti specializzati
# ---------------------------------------------------------------------------

def carica_agenti() -> dict:
    """agenti.json è la tua squadra. Al primo avvio parte dagli agenti già pronti."""
    if FILE_AGENTI.exists():
        return json.loads(FILE_AGENTI.read_text(encoding="utf-8"))
    if FILE_AGENTI_INIZIALI.exists():
        agenti = json.loads(FILE_AGENTI_INIZIALI.read_text(encoding="utf-8"))
        salva_agenti(agenti)
        return agenti
    return {}


def pacchetti_di(agente: dict) -> list[str]:
    pacchetti = list(agente.get("strumenti", []))
    if agente.get("ricerca_web") and "web" not in pacchetti:  # vecchio formato
        pacchetti.append("web")
    return pacchetti


def salva_agenti(agenti: dict) -> None:
    FILE_AGENTI.write_text(
        json.dumps(agenti, ensure_ascii=False, indent=2), encoding="utf-8"
    )


def nome_valido(nome: str) -> bool:
    return bool(re.fullmatch(r"[a-z0-9_-]{2,40}", nome))


# ---------------------------------------------------------------------------
# Chiamata al modello (con gestione dei casi di stop)
# ---------------------------------------------------------------------------

def chiama(modello: str, sistema: str, strumenti: list, messaggi: list, effort: str):
    """Una richiesta al modello. Se il modello rifiuta, l'API ripiega da sola
    su un altro modello (fallbacks="default")."""
    return client.beta.messages.create(
        model=modello,
        max_tokens=16000,
        system=sistema,
        tools=strumenti,
        messages=messaggi,
        output_config={"effort": effort},
        betas=["server-side-fallback-2026-07-01"],
        fallbacks="default",
        cache_control={"type": "ephemeral"},
    )


def testo_di(risposta) -> str:
    return "\n".join(b.text for b in risposta.content if b.type == "text").strip()


def ciclo_agente(modello, sistema, strumenti, messaggi, esegui, effort, etichetta):
    """Ciclo classico: chiedi al modello, esegui gli strumenti, ripeti finché ha finito.
    `messaggi` viene aggiornato sul posto. Restituisce il testo finale."""
    for _ in range(MAX_GIRI):
        risposta = chiama(modello, sistema, strumenti, messaggi, effort)
        # Rimandiamo sempre il contenuto intero, senza toccarlo.
        messaggi.append({"role": "assistant", "content": risposta.content})

        if risposta.stop_reason == "refusal":
            return f"[{etichetta}] Ha rifiutato il compito."
        if risposta.stop_reason == "pause_turn":
            continue  # uno strumento del server (es. ricerca web) sta ancora lavorando
        if risposta.stop_reason == "max_tokens":
            return testo_di(risposta) + f"\n[{etichetta}] (risposta troncata: troppo lunga)"

        chiamate = [b for b in risposta.content if b.type == "tool_use"]
        if not chiamate:
            return testo_di(risposta)

        # Più chiamate nello stesso turno: le eseguiamo in parallelo
        # e rimandiamo tutti i risultati in un solo messaggio.
        with ThreadPoolExecutor(max_workers=4) as pool:
            risultati = list(pool.map(lambda b: esegui(b.name, b.input), chiamate))
        messaggi.append({
            "role": "user",
            "content": [
                {
                    "type": "tool_result",
                    "tool_use_id": b.id,
                    "content": testo,
                    **({"is_error": True} if errore else {}),
                }
                for b, (testo, errore) in zip(chiamate, risultati)
            ],
        })
    return f"[{etichetta}] Interrotto: raggiunto il limite di {MAX_GIRI} passaggi."


# ---------------------------------------------------------------------------
# Strumenti degli specialisti
# ---------------------------------------------------------------------------

STRUMENTO_WEB = {"type": "web_search_20260209", "name": "web_search", "max_uses": 5}

STRUMENTI_FILE = [
    {
        "name": "leggi_file",
        "description": "Legge un file di testo dalla cartella di lavoro condivisa.",
        "strict": True,
        "input_schema": {
            "type": "object",
            "properties": {"percorso": {"type": "string", "description": "Percorso relativo, es. note/idee.md"}},
            "required": ["percorso"],
            "additionalProperties": False,
        },
    },
    {
        "name": "scrivi_file",
        "description": "Scrive (o sovrascrive) un file di testo nella cartella di lavoro condivisa. "
                       "Usalo per consegnare risultati lunghi che altri agenti dovranno leggere.",
        "strict": True,
        "input_schema": {
            "type": "object",
            "properties": {
                "percorso": {"type": "string", "description": "Percorso relativo, es. report/mercato.md"},
                "contenuto": {"type": "string"},
            },
            "required": ["percorso", "contenuto"],
            "additionalProperties": False,
        },
    },
    {
        "name": "elenca_file",
        "description": "Elenca i file presenti nella cartella di lavoro condivisa.",
        "strict": True,
        "input_schema": {"type": "object", "properties": {}, "required": [], "additionalProperties": False},
    },
]


def percorso_sicuro(relativo: str) -> Path:
    p = (CARTELLA_LAVORO / relativo).resolve()
    if CARTELLA_LAVORO.resolve() not in p.parents:
        raise ValueError("Il percorso deve stare dentro la cartella di lavoro.")
    return p


def esegui_strumento_file(nome: str, dati: dict):
    try:
        CARTELLA_LAVORO.mkdir(exist_ok=True)
        if nome == "leggi_file":
            p = percorso_sicuro(dati["percorso"])
            if not p.exists():
                return f"Il file {dati['percorso']} non esiste.", True
            return p.read_text(encoding="utf-8")[:100_000], False
        if nome == "scrivi_file":
            p = percorso_sicuro(dati["percorso"])
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text(dati["contenuto"], encoding="utf-8")
            return f"Salvato {dati['percorso']} ({len(dati['contenuto'])} caratteri).", False
        if nome == "elenca_file":
            files = sorted(str(f.relative_to(CARTELLA_LAVORO)) for f in CARTELLA_LAVORO.rglob("*") if f.is_file())
            return "\n".join(files) or "La cartella è vuota.", False
        return f"Strumento sconosciuto: {nome}", True
    except Exception as e:  # l'errore torna al modello, che può correggersi
        return f"Errore: {e}", True


def esegui_strumento_specialista(nome: str, dati: dict):
    if nome in extra.NOMI_STRUMENTI:
        return extra.esegui(nome, dati)
    return esegui_strumento_file(nome, dati)


def esegui_specialista(nome: str, compito: str):
    agenti = carica_agenti()
    agente = agenti.get(nome)
    if agente is None:
        return f"Non esiste un agente chiamato '{nome}'. Crealo prima con crea_agente.", True

    pacchetti = pacchetti_di(agente)
    strumenti = list(STRUMENTI_FILE) + extra.strumenti_di(pacchetti)
    if "web" in pacchetti:
        strumenti.append(STRUMENTO_WEB)

    # File di contesto (es. il profilo della pizzeria) letti ogni volta, così sono sempre aggiornati.
    contesto = ""
    for nome_file in agente.get("contesto", []):
        p = CARTELLA / nome_file
        if p.exists():
            contesto += f"\n\n<{nome_file}>\n{p.read_text(encoding='utf-8')}\n</{nome_file}>"

    sistema = (
        f"Sei '{nome}', un agente specializzato. Il tuo ambito: {agente['descrizione']}\n\n"
        f"{agente['istruzioni']}{contesto}\n\n"
        f"Oggi è {date.today().isoformat()}.\n\n"
        "Ricevi un compito dall'agente capo. Portalo a termine da solo, senza fare domande: "
        "se manca un'informazione, fai un'ipotesi ragionevole e dichiarala. "
        "Alla fine rispondi con un resoconto chiaro di cosa hai fatto e del risultato. "
        "Se il risultato è lungo, salvalo con scrivi_file e indica il percorso."
    )
    print(f"  → {nome} sta lavorando…", flush=True)
    messaggi = [{"role": "user", "content": compito}]
    esito = ciclo_agente(
        MODELLO_SPECIALISTI, sistema, strumenti, messaggi,
        esegui_strumento_specialista, effort="medium", etichetta=nome,
    )
    print(f"  ✓ {nome} ha finito.", flush=True)
    return esito, False


# ---------------------------------------------------------------------------
# Strumenti del capo
# ---------------------------------------------------------------------------

STRUMENTI_CAPO = [
    {
        "name": "elenca_agenti",
        "description": "Mostra gli agenti specializzati già esistenti, con il loro ambito.",
        "strict": True,
        "input_schema": {"type": "object", "properties": {}, "required": [], "additionalProperties": False},
    },
    {
        "name": "crea_agente",
        "description": (
            "Crea un nuovo agente specializzato, oppure aggiorna uno esistente con lo stesso nome. "
            "Crealo solo quando nessun agente esistente copre bene il compito."
        ),
        "strict": True,
        "input_schema": {
            "type": "object",
            "properties": {
                "nome": {"type": "string", "description": "Identificativo breve: minuscole, cifre, - o _ (es. copywriter)."},
                "descrizione": {"type": "string", "description": "Una frase: in cosa è specializzato."},
                "istruzioni": {
                    "type": "string",
                    "description": "Istruzioni dettagliate per l'agente: competenze, metodo di lavoro, "
                                   "formato del risultato, cosa evitare.",
                },
                "strumenti": {
                    "type": "array",
                    "items": {"type": "string", "enum": extra.NOMI_PACCHETTI},
                    "description": "Strumenti in più: web (ricerca), grafica (impagina foto e testi, "
                                   "monta video), immagini_ai (genera immagini), facebook (pubblica sulla "
                                   "Pagina, con conferma), tiktok (manda video in bozza, con conferma), "
                                   "google_ads (legge le campagne), google_analytics (visite al sito), "
                                   "search_console (ricerche Google verso il sito), google_business "
                                   "(scheda Maps: statistiche, recensioni, risposte e post con conferma). "
                                   "Dai solo quelli che servono.",
                },
                "contesto": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "File da fargli leggere sempre, es. [\"pizzeria.md\"]. Può essere vuoto.",
                },
            },
            "required": ["nome", "descrizione", "istruzioni", "strumenti", "contesto"],
            "additionalProperties": False,
        },
    },
    {
        "name": "assegna_compito",
        "description": (
            "Affida un compito a un agente specializzato e restituisce il suo resoconto. "
            "Il compito deve essere autosufficiente: l'agente non vede questa conversazione, "
            "quindi includi tutto il contesto che gli serve. "
            "Puoi chiamarlo più volte nello stesso turno per far lavorare più agenti in parallelo."
        ),
        "strict": True,
        "input_schema": {
            "type": "object",
            "properties": {
                "nome": {"type": "string", "description": "Nome dell'agente."},
                "compito": {"type": "string", "description": "Il compito completo, con contesto e risultato atteso."},
            },
            "required": ["nome", "compito"],
            "additionalProperties": False,
        },
    },
    {
        "name": "elimina_agente",
        "description": "Elimina un agente specializzato. Usalo solo se l'utente lo chiede.",
        "strict": True,
        "input_schema": {
            "type": "object",
            "properties": {"nome": {"type": "string"}},
            "required": ["nome"],
            "additionalProperties": False,
        },
    },
    *[s for s in STRUMENTI_FILE if s["name"] in ("leggi_file", "elenca_file")],
]


def esegui_strumento_capo(nome: str, dati: dict):
    try:
        if nome == "elenca_agenti":
            agenti = carica_agenti()
            if not agenti:
                return "Non ci sono ancora agenti specializzati.", False
            righe = [
                f"- {n}: {a['descrizione']}"
                + (f" [strumenti: {', '.join(pacchetti_di(a))}]" if pacchetti_di(a) else "")
                for n, a in agenti.items()
            ]
            return "\n".join(righe), False

        if nome == "crea_agente":
            if not nome_valido(dati["nome"]):
                return "Nome non valido: usa 2-40 caratteri tra minuscole, cifre, - e _.", True
            with blocco_archivio:
                agenti = carica_agenti()
                esisteva = dati["nome"] in agenti
                agenti[dati["nome"]] = {
                    "descrizione": dati["descrizione"],
                    "istruzioni": dati["istruzioni"],
                    "strumenti": [p for p in dati["strumenti"] if p in extra.NOMI_PACCHETTI],
                    "contesto": dati["contesto"],
                }
                salva_agenti(agenti)
            print(f"  ★ Agente {'aggiornato' if esisteva else 'creato'}: {dati['nome']}", flush=True)
            return f"Agente '{dati['nome']}' {'aggiornato' if esisteva else 'creato'}.", False

        if nome == "assegna_compito":
            return esegui_specialista(dati["nome"], dati["compito"])

        if nome == "elimina_agente":
            with blocco_archivio:
                agenti = carica_agenti()
                if agenti.pop(dati["nome"], None) is None:
                    return f"Non esiste un agente chiamato '{dati['nome']}'.", True
                salva_agenti(agenti)
            print(f"  ✗ Agente eliminato: {dati['nome']}", flush=True)
            return f"Agente '{dati['nome']}' eliminato.", False

        return esegui_strumento_file(nome, dati)
    except anthropic.APIError as e:
        return f"Errore dell'API mentre lavorava un agente: {e}", True


SISTEMA_CAPO = """Sei l'agente capo di una squadra di agenti specializzati. Parli in italiano con l'utente.

Il tuo lavoro:
1. Capire cosa vuole l'utente e dividere il lavoro in compiti.
2. Controllare con elenca_agenti quali specialisti esistono già.
3. Se per un compito manca uno specialista adatto, crearlo con crea_agente: dagli un ambito
   preciso e istruzioni dettagliate (competenze, metodo, formato del risultato). Preferisci
   pochi agenti ben definiti a tanti agenti simili; riusa quelli esistenti quando bastano.
4. Assegnare i compiti con assegna_compito. Ogni compito deve contenere tutto il contesto,
   perché lo specialista non vede questa conversazione. Compiti indipendenti: assegnali
   nello stesso turno, così lavorano in parallelo. Compiti che dipendono da altri: aspetta
   il risultato e passalo nel compito successivo (o indica il file in lavoro/ da leggere).
5. Controllare i risultati: se qualcosa non va, rimanda il compito con indicazioni precise.
6. Rispondere all'utente con una sintesi chiara del risultato finale.

Pizzeria: tutto ciò che riguarda la pizzeria (marketing, social, Google, menu, costi, fornitori,
personale, burocrazia, clienti, strategia) va a gestore-pizzeria, se esiste. Per gli altri ambiti
della vita e del lavoro dell'utente crea o usa specialisti dedicati.

Sui social: i post si pubblicano solo dopo la conferma del titolare, che viene chiesta
automaticamente dallo strumento di pubblicazione. Non dire mai che un post è uscito se lo
specialista non lo conferma nel suo resoconto.

Per domande semplici, rispondi direttamente senza coinvolgere altri agenti.
Se la richiesta dell'utente è ambigua su un punto che cambia davvero il risultato, chiedi prima."""


# ---------------------------------------------------------------------------
# Chat con l'utente
# ---------------------------------------------------------------------------

def main() -> None:
    print("Agente capo pronto. Scrivi una richiesta (oppure 'esci').")
    print(f"Agenti salvati: {', '.join(carica_agenti()) or 'nessuno'}\n")
    conversazione: list = []
    while True:
        try:
            richiesta = input("Tu: ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            break
        if richiesta.lower() in ("esci", "exit", "quit"):
            break
        if not richiesta:
            continue
        inizio = len(conversazione)
        conversazione.append({"role": "user", "content": richiesta})
        try:
            risposta = ciclo_agente(
                MODELLO_CAPO, SISTEMA_CAPO, STRUMENTI_CAPO, conversazione,
                esegui_strumento_capo, effort="high", etichetta="capo",
            )
        except anthropic.AuthenticationError:
            sys.exit("Chiave API non valida o mancante: imposta ANTHROPIC_API_KEY.")
        except anthropic.RateLimitError:
            print("Troppe richieste in poco tempo: aspetta un minuto e riprova.\n")
            del conversazione[inizio:]  # annulla il turno a metà
            continue
        except anthropic.APIConnectionError:
            print("Problema di connessione: controlla internet e riprova.\n")
            del conversazione[inizio:]  # annulla il turno a metà
            continue
        print(f"\nCapo: {risposta}\n")


if __name__ == "__main__":
    main()
