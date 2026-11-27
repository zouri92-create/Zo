"""Strumenti Google per l'agente di marketing.

Pacchetti:
  google_ads        -> legge campagne, parole chiave e risultati (solo lettura, non cambia nulla)
  google_analytics  -> legge visite e conversioni del sito (GA4)
  search_console    -> legge con quali ricerche la gente trova il sito
  google_business   -> scheda su Google Maps: statistiche, recensioni, risposte e post (con conferma)

Un solo collegamento OAuth per tutti: lancia `python collega_google.py` una volta.
Le librerie Google si importano solo quando servono, così il resto funziona anche senza.
"""

from __future__ import annotations

import datetime as dt
import json
import os

import requests

AMBITI = [
    "https://www.googleapis.com/auth/adwords",
    "https://www.googleapis.com/auth/analytics.readonly",
    "https://www.googleapis.com/auth/webmasters.readonly",
    "https://www.googleapis.com/auth/business.manage",
]


def _schema(proprieta: dict, richiesti: list[str]) -> dict:
    return {"type": "object", "properties": proprieta, "required": richiesti, "additionalProperties": False}


DATE = {
    "data_inizio": {"type": "string", "description": "AAAA-MM-GG"},
    "data_fine": {"type": "string", "description": "AAAA-MM-GG"},
}

# ---------------------------------------------------------------------------
# Definizioni degli strumenti
# ---------------------------------------------------------------------------

PACCHETTI: dict[str, list[dict]] = {
    "google_ads": [
        {
            "name": "google_ads_riepilogo",
            "description": (
                "Riepilogo delle campagne Google Ads in un periodo: costo, impressioni, clic, CTR, CPC medio, "
                "conversioni e costo per conversione, campagna per campagna. Solo lettura."
            ),
            "strict": True,
            "input_schema": _schema(DATE, ["data_inizio", "data_fine"]),
        },
        {
            "name": "google_ads_query",
            "description": (
                "Esegue una query GAQL di sola lettura su Google Ads, per analisi più fini: parole chiave "
                "(keyword_view), termini di ricerca (search_term_view), annunci (ad_group_ad), "
                "località (geographic_view), orari (segments.hour, segments.day_of_week), dispositivi. "
                "Nota: metrics.cost_micros è in milionesimi di euro. Usa sempre un filtro sulle date "
                "e LIMIT. Restituisce al massimo 200 righe."
            ),
            "strict": True,
            "input_schema": _schema({"query": {"type": "string", "description": "Query GAQL completa."}}, ["query"]),
        },
    ],
    "google_analytics": [
        {
            "name": "analytics_report",
            "description": (
                "Report di Google Analytics 4 sul sito. Esempi di dimensioni: date, sessionDefaultChannelGroup, "
                "sessionSource, pagePath, city, deviceCategory. Esempi di metriche: sessions, activeUsers, "
                "screenPageViews, conversions, keyEvents, engagementRate."
            ),
            "strict": True,
            "input_schema": _schema(
                {
                    "dimensioni": {"type": "array", "items": {"type": "string"}},
                    "metriche": {"type": "array", "items": {"type": "string"}},
                    **DATE,
                    "limite": {"type": "integer", "description": "Massimo righe, fino a 200."},
                },
                ["dimensioni", "metriche", "data_inizio", "data_fine", "limite"],
            ),
        },
    ],
    "search_console": [
        {
            "name": "search_console_report",
            "description": (
                "Ricerche Google che portano al sito: clic, impressioni, CTR e posizione media. "
                "Dimensioni possibili: query, page, country, device, date."
            ),
            "strict": True,
            "input_schema": _schema(
                {
                    "dimensioni": {"type": "array", "items": {"type": "string", "enum": ["query", "page", "country", "device", "date"]}},
                    **DATE,
                    "limite": {"type": "integer", "description": "Massimo righe, fino a 200."},
                },
                ["dimensioni", "data_inizio", "data_fine", "limite"],
            ),
        },
    ],
    "google_business": [
        {
            "name": "scheda_google_statistiche",
            "description": (
                "Statistiche della scheda Google (Maps e Ricerca) in un periodo: visualizzazioni, chiamate, "
                "richieste di indicazioni stradali, clic sul sito, clic per ordinare."
            ),
            "strict": True,
            "input_schema": _schema(DATE, ["data_inizio", "data_fine"]),
        },
        {
            "name": "recensioni_google",
            "description": "Legge le recensioni più recenti della scheda Google, con voto, testo e risposta già data.",
            "strict": True,
            "input_schema": _schema({"quante": {"type": "integer", "description": "Da 1 a 50."}}, ["quante"]),
        },
        {
            "name": "rispondi_recensione",
            "description": (
                "Pubblica (o sostituisce) la risposta del locale a una recensione Google. "
                "Viene chiesta conferma al titolare: se rifiuta, ricevi il suo commento."
            ),
            "strict": True,
            "input_schema": _schema(
                {
                    "recensione": {"type": "string", "description": "Il campo 'id' restituito da recensioni_google."},
                    "risposta": {"type": "string"},
                },
                ["recensione", "risposta"],
            ),
        },
        {
            "name": "pubblica_post_google",
            "description": (
                "Pubblica un aggiornamento (solo testo, con pulsante 'Chiama') sulla scheda Google del locale: "
                "novità, pizza del mese, offerte. Viene chiesta conferma al titolare."
            ),
            "strict": True,
            "input_schema": _schema({"testo": {"type": "string", "description": "Massimo 1500 caratteri."}}, ["testo"]),
        },
    ],
}


# ---------------------------------------------------------------------------
# Credenziali
# ---------------------------------------------------------------------------

def _env(nome: str) -> str:
    v = os.environ.get(nome, "").strip()
    if not v:
        raise RuntimeError(f"Manca {nome} nel file .env (vedi README, sezione Google).")
    return v


def credenziali():
    from google.auth.transport.requests import Request
    from google.oauth2.credentials import Credentials

    cred = Credentials(
        token=None,
        refresh_token=_env("GOOGLE_REFRESH_TOKEN"),
        client_id=_env("GOOGLE_CLIENT_ID"),
        client_secret=_env("GOOGLE_CLIENT_SECRET"),
        token_uri="https://oauth2.googleapis.com/token",
        scopes=AMBITI,
    )
    cred.refresh(Request())
    return cred


def _get(url: str, **params):
    r = requests.get(url, headers={"Authorization": f"Bearer {credenziali().token}"}, params=params, timeout=60)
    if r.status_code != 200:
        raise RuntimeError(f"Google ha risposto {r.status_code}: {r.text[:500]}")
    return r.json()


def _json(dati) -> str:
    return json.dumps(dati, ensure_ascii=False, indent=1, default=str)


def _data(s: str) -> dt.date:
    return dt.date.fromisoformat(s)


# ---------------------------------------------------------------------------
# Google Ads (sola lettura)
# ---------------------------------------------------------------------------

def _ads_client():
    from google.ads.googleads.client import GoogleAdsClient

    config = {
        "developer_token": _env("GOOGLE_ADS_DEVELOPER_TOKEN"),
        "client_id": _env("GOOGLE_CLIENT_ID"),
        "client_secret": _env("GOOGLE_CLIENT_SECRET"),
        "refresh_token": _env("GOOGLE_REFRESH_TOKEN"),
        "use_proto_plus": True,
    }
    if os.environ.get("GOOGLE_ADS_LOGIN_CUSTOMER_ID"):
        config["login_customer_id"] = os.environ["GOOGLE_ADS_LOGIN_CUSTOMER_ID"].replace("-", "")
    return GoogleAdsClient.load_from_dict(config)


def _ads_righe(query: str, limite: int = 200) -> list[dict]:
    from google.protobuf.json_format import MessageToDict

    client = _ads_client()
    servizio = client.get_service("GoogleAdsService")
    cliente = _env("GOOGLE_ADS_CUSTOMER_ID").replace("-", "")
    righe = []
    for blocco in servizio.search_stream(customer_id=cliente, query=query):
        for riga in blocco.results:
            righe.append(MessageToDict(type(riga).pb(riga), preserving_proto_field_name=True))
            if len(righe) >= limite:
                return righe
    return righe


def google_ads_riepilogo(d: dict) -> str:
    _data(d["data_inizio"]), _data(d["data_fine"])  # controlla il formato
    righe = _ads_righe(f"""
        SELECT campaign.name, campaign.status, campaign.advertising_channel_type,
               metrics.cost_micros, metrics.impressions, metrics.clicks,
               metrics.conversions, metrics.conversions_value
        FROM campaign
        WHERE segments.date BETWEEN '{d["data_inizio"]}' AND '{d["data_fine"]}'
          AND campaign.status != 'REMOVED'
        ORDER BY metrics.cost_micros DESC""")
    if not righe:
        return "Nessuna campagna con dati in questo periodo."
    tabella, tot = [], {"costo": 0.0, "impressioni": 0, "clic": 0, "conversioni": 0.0}
    for r in righe:
        m, c = r.get("metrics", {}), r.get("campaign", {})
        costo = int(m.get("cost_micros", 0)) / 1_000_000
        imp, clic, conv = int(m.get("impressions", 0)), int(m.get("clicks", 0)), float(m.get("conversions", 0))
        tot["costo"] += costo; tot["impressioni"] += imp; tot["clic"] += clic; tot["conversioni"] += conv
        tabella.append({
            "campagna": c.get("name"), "stato": c.get("status"), "tipo": c.get("advertising_channel_type"),
            "costo_eur": round(costo, 2), "impressioni": imp, "clic": clic,
            "ctr_%": round(100 * clic / imp, 2) if imp else 0,
            "cpc_medio_eur": round(costo / clic, 2) if clic else None,
            "conversioni": round(conv, 1),
            "costo_per_conversione_eur": round(costo / conv, 2) if conv else None,
        })
    tot["costo"] = round(tot["costo"], 2)
    return _json({"periodo": [d["data_inizio"], d["data_fine"]], "totale": tot, "campagne": tabella})


def google_ads_query(d: dict) -> str:
    q = d["query"].strip()
    if not q.upper().startswith("SELECT"):
        raise ValueError("Sono permesse solo query SELECT (sola lettura).")
    return _json(_ads_righe(q))


# ---------------------------------------------------------------------------
# Google Analytics 4
# ---------------------------------------------------------------------------

def analytics_report(d: dict) -> str:
    from google.analytics.data_v1beta import BetaAnalyticsDataClient
    from google.analytics.data_v1beta.types import DateRange, Dimension, Metric, RunReportRequest

    client = BetaAnalyticsDataClient(credentials=credenziali())
    risposta = client.run_report(RunReportRequest(
        property=f"properties/{_env('GA4_PROPERTY_ID')}",
        dimensions=[Dimension(name=n) for n in d["dimensioni"]],
        metrics=[Metric(name=n) for n in d["metriche"]],
        date_ranges=[DateRange(start_date=d["data_inizio"], end_date=d["data_fine"])],
        limit=max(1, min(int(d["limite"]), 200)),
    ))
    righe = [
        {**{n: v.value for n, v in zip(d["dimensioni"], r.dimension_values)},
         **{n: v.value for n, v in zip(d["metriche"], r.metric_values)}}
        for r in risposta.rows
    ]
    return _json(righe) if righe else "Nessun dato in questo periodo."


# ---------------------------------------------------------------------------
# Search Console
# ---------------------------------------------------------------------------

def search_console_report(d: dict) -> str:
    from googleapiclient.discovery import build

    servizio = build("searchconsole", "v1", credentials=credenziali(), cache_discovery=False)
    risposta = servizio.searchanalytics().query(
        siteUrl=_env("SEARCH_CONSOLE_SITO"),
        body={
            "startDate": d["data_inizio"], "endDate": d["data_fine"],
            "dimensions": d["dimensioni"], "rowLimit": max(1, min(int(d["limite"]), 200)),
        },
    ).execute()
    righe = [
        {**dict(zip(d["dimensioni"], r.get("keys", []))),
         "clic": r.get("clicks"), "impressioni": r.get("impressions"),
         "ctr_%": round(100 * r.get("ctr", 0), 2), "posizione": round(r.get("position", 0), 1)}
        for r in risposta.get("rows", [])
    ]
    return _json(righe) if righe else "Nessun dato in questo periodo."


# ---------------------------------------------------------------------------
# Google Business Profile (scheda su Maps)
# ---------------------------------------------------------------------------

METRICHE_SCHEDA = {
    "BUSINESS_IMPRESSIONS_MOBILE_MAPS": "visualizzazioni Maps da cellulare",
    "BUSINESS_IMPRESSIONS_DESKTOP_MAPS": "visualizzazioni Maps da computer",
    "BUSINESS_IMPRESSIONS_MOBILE_SEARCH": "visualizzazioni Ricerca da cellulare",
    "BUSINESS_IMPRESSIONS_DESKTOP_SEARCH": "visualizzazioni Ricerca da computer",
    "CALL_CLICKS": "chiamate",
    "BUSINESS_DIRECTION_REQUESTS": "richieste di indicazioni",
    "WEBSITE_CLICKS": "clic sul sito",
    "BUSINESS_FOOD_ORDERS": "ordini di cibo",
    "BUSINESS_FOOD_MENU_CLICKS": "clic sul menu",
}

STELLE = {"ONE": 1, "TWO": 2, "THREE": 3, "FOUR": 4, "FIVE": 5}


def _sede() -> tuple[str, str]:
    return _env("GOOGLE_BUSINESS_ACCOUNT_ID"), _env("GOOGLE_BUSINESS_LOCATION_ID")


def scheda_google_statistiche(d: dict) -> str:
    _, sede = _sede()
    inizio, fine = _data(d["data_inizio"]), _data(d["data_fine"])
    params = [("dailyMetrics", m) for m in METRICHE_SCHEDA] + [
        ("dailyRange.start_date.year", inizio.year), ("dailyRange.start_date.month", inizio.month),
        ("dailyRange.start_date.day", inizio.day), ("dailyRange.end_date.year", fine.year),
        ("dailyRange.end_date.month", fine.month), ("dailyRange.end_date.day", fine.day),
    ]
    r = requests.get(
        f"https://businessprofileperformance.googleapis.com/v1/locations/{sede}:fetchMultiDailyMetricsTimeSeries",
        headers={"Authorization": f"Bearer {credenziali().token}"}, params=params, timeout=60,
    )
    if r.status_code != 200:
        raise RuntimeError(f"Google ha risposto {r.status_code}: {r.text[:500]}")
    totali = {}
    for gruppo in r.json().get("multiDailyMetricTimeSeries", []):
        for serie in gruppo.get("dailyMetricTimeSeries", []):
            valori = serie.get("timeSeries", {}).get("datedValues", [])
            totali[METRICHE_SCHEDA.get(serie.get("dailyMetric"), serie.get("dailyMetric"))] = sum(
                int(v.get("value", 0)) for v in valori)
    return _json({"periodo": [d["data_inizio"], d["data_fine"]], "totali": totali})


def _url_recensioni() -> str:
    account, sede = _sede()
    return f"https://mybusiness.googleapis.com/v4/accounts/{account}/locations/{sede}/reviews"


def recensioni_google(d: dict) -> str:
    dati = _get(_url_recensioni(), pageSize=max(1, min(int(d["quante"]), 50)), orderBy="updateTime desc")
    recensioni = [
        {
            "id": r.get("reviewId"),
            "autore": r.get("reviewer", {}).get("displayName"),
            "stelle": STELLE.get(r.get("starRating"), r.get("starRating")),
            "data": r.get("createTime", "")[:10],
            "testo": r.get("comment", ""),
            "risposta_del_locale": r.get("reviewReply", {}).get("comment"),
        }
        for r in dati.get("reviews", [])
    ]
    riepilogo = {"media": dati.get("averageRating"), "totale_recensioni": dati.get("totalReviewCount")}
    return _json({"riepilogo": riepilogo, "recensioni": recensioni})


def _conferma(dove: str, testo: str):
    from strumenti_pizzeria import chiedi_conferma
    return chiedi_conferma(dove, "", testo)


def rispondi_recensione(d: dict) -> str:
    ok, commento = _conferma(f"risposta alla recensione {d['recensione']}", d["risposta"])
    if not ok:
        return f"NON pubblicata. Il titolare ha risposto: «{commento}». Correggi e riproponi."
    r = requests.put(
        f"{_url_recensioni()}/{d['recensione']}/reply",
        headers={"Authorization": f"Bearer {credenziali().token}"},
        json={"comment": d["risposta"]}, timeout=60,
    )
    if r.status_code != 200:
        raise RuntimeError(f"Google ha risposto {r.status_code}: {r.text[:500]}")
    return "Risposta pubblicata sulla recensione."


def pubblica_post_google(d: dict) -> str:
    ok, commento = _conferma("la scheda Google", d["testo"])
    if not ok:
        return f"NON pubblicato. Il titolare ha risposto: «{commento}». Correggi e riproponi."
    account, sede = _sede()
    r = requests.post(
        f"https://mybusiness.googleapis.com/v4/accounts/{account}/locations/{sede}/localPosts",
        headers={"Authorization": f"Bearer {credenziali().token}"},
        json={"languageCode": "de", "summary": d["testo"][:1500], "topicType": "STANDARD",
              "callToAction": {"actionType": "CALL"}},
        timeout=60,
    )
    if r.status_code != 200:
        raise RuntimeError(f"Google ha risposto {r.status_code}: {r.text[:500]}")
    return "Aggiornamento pubblicato sulla scheda Google."


ESECUTORI = {
    "google_ads_riepilogo": google_ads_riepilogo,
    "google_ads_query": google_ads_query,
    "analytics_report": analytics_report,
    "search_console_report": search_console_report,
    "scheda_google_statistiche": scheda_google_statistiche,
    "recensioni_google": recensioni_google,
    "rispondi_recensione": rispondi_recensione,
    "pubblica_post_google": pubblica_post_google,
}
