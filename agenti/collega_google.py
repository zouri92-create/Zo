"""Collega il tuo account Google all'agente (da fare una volta sola).

Uso:
    python collega_google.py percorso/del/client_secret.json

Il file client_secret.json si scarica da Google Cloud Console (vedi README, sezione Google).
Si apre il browser: accedi con l'account Google che gestisce Google Ads, Analytics,
Search Console e la scheda del locale, e accetta i permessi.
Lo script scrive GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET e GOOGLE_REFRESH_TOKEN nel file .env
e ti mostra gli ID della scheda Google.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import requests

from strumenti_google import AMBITI

FILE_ENV = Path(__file__).resolve().parent / ".env"


def aggiorna_env(valori: dict[str, str]) -> None:
    righe = FILE_ENV.read_text(encoding="utf-8").splitlines() if FILE_ENV.exists() else []
    fatti = set()
    for i, riga in enumerate(righe):
        chiave = riga.split("=", 1)[0].strip()
        if chiave in valori:
            righe[i] = f"{chiave}={valori[chiave]}"
            fatti.add(chiave)
    righe += [f"{k}={v}" for k, v in valori.items() if k not in fatti]
    FILE_ENV.write_text("\n".join(righe) + "\n", encoding="utf-8")


def main() -> None:
    if len(sys.argv) != 2:
        sys.exit("Uso: python collega_google.py percorso/del/client_secret.json")
    from google_auth_oauthlib.flow import InstalledAppFlow

    segreto = Path(sys.argv[1])
    flow = InstalledAppFlow.from_client_secrets_file(str(segreto), scopes=AMBITI)
    print("Si apre il browser: accedi con l'account Google del locale e accetta i permessi…")
    cred = flow.run_local_server(port=0, access_type="offline", prompt="consent")
    if not cred.refresh_token:
        sys.exit("Google non ha restituito un refresh token. Riprova: revoca l'accesso su "
                 "myaccount.google.com/permissions e rilancia lo script.")

    client = json.loads(segreto.read_text(encoding="utf-8"))
    client = client.get("installed") or client.get("web") or {}
    aggiorna_env({
        "GOOGLE_CLIENT_ID": client["client_id"],
        "GOOGLE_CLIENT_SECRET": client["client_secret"],
        "GOOGLE_REFRESH_TOKEN": cred.refresh_token,
    })
    print(f"✓ Collegamento salvato in {FILE_ENV}")

    # Elenca le schede Google (Business Profile) per trovare gli ID da mettere nel .env.
    intestazioni = {"Authorization": f"Bearer {cred.token}"}
    r = requests.get("https://mybusinessaccountmanagement.googleapis.com/v1/accounts",
                     headers=intestazioni, timeout=60)
    if r.status_code != 200:
        print(f"\nNon riesco a leggere le schede Google ({r.status_code}). Probabilmente Google non ha "
              "ancora approvato l'accesso alle API di Business Profile per il tuo progetto (vedi README).")
        return
    for account in r.json().get("accounts", []):
        account_id = account["name"].split("/")[-1]
        r2 = requests.get(
            f"https://mybusinessbusinessinformation.googleapis.com/v1/{account['name']}/locations",
            headers=intestazioni, params={"readMask": "name,title,storefrontAddress"}, timeout=60,
        )
        for sede in r2.json().get("locations", []) if r2.status_code == 200 else []:
            indirizzo = ", ".join(sede.get("storefrontAddress", {}).get("addressLines", []))
            print(f"\nScheda: {sede.get('title')} – {indirizzo}")
            print(f"  GOOGLE_BUSINESS_ACCOUNT_ID={account_id}")
            print(f"  GOOGLE_BUSINESS_LOCATION_ID={sede['name'].split('/')[-1]}")
    print("\nCopia nel file .env le due righe della tua pizzeria.")


if __name__ == "__main__":
    main()
