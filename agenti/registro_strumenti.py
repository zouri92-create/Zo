"""Raccoglie in un posto solo tutti i pacchetti di strumenti che il capo può dare agli specialisti."""

from __future__ import annotations

import strumenti_google
import strumenti_pizzeria

MODULI = [strumenti_pizzeria, strumenti_google]

PACCHETTI: dict[str, list[dict]] = {}
ESECUTORI: dict = {}
for _m in MODULI:
    PACCHETTI.update(_m.PACCHETTI)
    ESECUTORI.update(_m.ESECUTORI)

NOMI_PACCHETTI = ["web", *PACCHETTI]  # "web" è la ricerca web di Claude, gestita in capo.py
NOMI_STRUMENTI = set(ESECUTORI)


def strumenti_di(pacchetti: list[str]) -> list[dict]:
    return [s for nome in pacchetti for s in PACCHETTI.get(nome, [])]


def esegui(nome: str, dati: dict):
    """Restituisce (contenuto, errore). Il contenuto può essere testo o una lista di blocchi."""
    try:
        return ESECUTORI[nome](dati), False
    except ModuleNotFoundError as e:
        return f"Errore in {nome}: manca la libreria '{e.name}'. Esegui: pip install -r requirements.txt", True
    except Exception as e:  # l'errore torna al modello, che può correggersi
        return f"Errore in {nome}: {e}", True
