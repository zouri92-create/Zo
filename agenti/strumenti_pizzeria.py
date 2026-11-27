"""Strumenti extra per gli agenti: grafica, immagini AI, Facebook, TikTok.

Ogni "pacchetto" è un gruppo di strumenti che il capo può dare a uno specialista:
  grafica      -> impagina foto + testi in immagini pronte per i social (Pillow)
                  e monta video verticali per TikTok (ffmpeg)
  immagini_ai  -> genera immagini da zero con OpenAI (serve OPENAI_API_KEY)
  facebook     -> pubblica sulla Pagina Facebook (chiede sempre conferma)
  tiktok       -> manda un video nelle bozze di TikTok (chiede sempre conferma)

Le credenziali si leggono dalle variabili d'ambiente (vedi .env.esempio).
"""

from __future__ import annotations

import base64
import os
import subprocess
import tempfile
import threading
import time
from pathlib import Path

import requests
from PIL import Image, ImageDraw, ImageFont, ImageOps

CARTELLA = Path(__file__).resolve().parent
CARTELLA_LAVORO = CARTELLA / "lavoro"
CARTELLA_FOTO = CARTELLA_LAVORO / "foto"        # qui metti le foto vere delle tue pizze
CARTELLA_USCITA = CARTELLA_LAVORO / "post"      # qui finiscono grafiche e video pronti

FORMATI = {
    "post": (1080, 1350),      # verticale 4:5, il migliore per il feed di Facebook
    "quadrato": (1080, 1080),
    "storia": (1080, 1920),    # 9:16, storie e TikTok
}

FONT_TITOLO = [
    CARTELLA / "font" / "titolo.ttf",
    CARTELLA / "font" / "titolo.otf",
    Path("/usr/share/fonts/opentype/inter/InterDisplay-Bold.otf"),
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),
    Path("C:/Windows/Fonts/arialbd.ttf"),
    Path("/System/Library/Fonts/Supplemental/Arial Bold.ttf"),
    Path("/Library/Fonts/Arial Bold.ttf"),
]
FONT_TESTO = [
    CARTELLA / "font" / "testo.ttf",
    CARTELLA / "font" / "testo.otf",
    Path("/usr/share/fonts/opentype/inter/Inter-Regular.otf"),
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
    Path("C:/Windows/Fonts/arial.ttf"),
    Path("/System/Library/Fonts/Supplemental/Arial.ttf"),
    Path("/Library/Fonts/Arial.ttf"),
]

# Una sola domanda di conferma alla volta, anche se più agenti lavorano in parallelo.
blocco_conferma = threading.Lock()


def _schema(proprieta: dict, richiesti: list[str]) -> dict:
    return {
        "type": "object",
        "properties": proprieta,
        "required": richiesti,
        "additionalProperties": False,
    }


def _percorso(relativo: str) -> Path:
    p = (CARTELLA_LAVORO / relativo).resolve()
    if CARTELLA_LAVORO.resolve() not in p.parents:
        raise ValueError("Il percorso deve stare dentro la cartella lavoro/.")
    return p


def _rel(p: Path) -> str:
    return str(p.relative_to(CARTELLA_LAVORO))


def _nuovo_file(prefisso: str, estensione: str) -> Path:
    CARTELLA_USCITA.mkdir(parents=True, exist_ok=True)
    return CARTELLA_USCITA / f"{prefisso}-{time.strftime('%Y%m%d-%H%M%S')}-{int(time.time()*1000)%1000:03d}.{estensione}"


def _colore(hex_: str, predefinito: str) -> tuple:
    try:
        h = (hex_ or predefinito).lstrip("#")
        return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))
    except ValueError:
        return _colore(predefinito, predefinito)


# ---------------------------------------------------------------------------
# Definizioni degli strumenti, raggruppate in pacchetti
# ---------------------------------------------------------------------------

PACCHETTI: dict[str, list[dict]] = {
    "grafica": [
        {
            "name": "elenca_foto",
            "description": "Elenca le foto della pizzeria in lavoro/foto/ e le immagini già create in lavoro/post/.",
            "strict": True,
            "input_schema": _schema({}, []),
        },
        {
            "name": "vedi_immagine",
            "description": "Ti mostra un'immagine della cartella lavoro/, così puoi sceglierla o "
                           "controllare una grafica appena creata prima di proporla.",
            "strict": True,
            "input_schema": _schema(
                {"percorso": {"type": "string", "description": "Es. foto/margherita.jpg o post/post-....png"}},
                ["percorso"],
            ),
        },
        {
            "name": "crea_grafica",
            "description": (
                "Crea un'immagine per i social: prende una foto (ritagliata a riempire il formato) "
                "e ci mette sopra una fascia con titolo, sottotitolo, prezzo e una riga in basso "
                "(es. telefono o indirizzo). Senza foto usa uno sfondo a tinta unita. "
                "Testi brevi: il titolo al massimo 4-5 parole."
            ),
            "strict": True,
            "input_schema": _schema(
                {
                    "foto": {"type": "string", "description": "Percorso in lavoro/ (es. foto/diavola.jpg), oppure stringa vuota per nessuna foto."},
                    "formato": {"type": "string", "enum": list(FORMATI)},
                    "titolo": {"type": "string"},
                    "sottotitolo": {"type": "string", "description": "Può essere vuoto."},
                    "prezzo": {"type": "string", "description": "Es. '€ 7,50' oppure vuoto."},
                    "riga_in_basso": {"type": "string", "description": "Es. 'Ordina allo 06 1234567' oppure vuoto."},
                    "posizione_testo": {"type": "string", "enum": ["alto", "basso"]},
                    "colore_fascia": {"type": "string", "description": "Colore esadecimale, es. #B3261E."},
                    "colore_testo": {"type": "string", "description": "Colore esadecimale, es. #FFFFFF."},
                    "colore_prezzo": {"type": "string", "description": "Colore esadecimale del bollino prezzo, es. #F2C14E."},
                },
                ["foto", "formato", "titolo", "sottotitolo", "prezzo", "riga_in_basso",
                 "posizione_testo", "colore_fascia", "colore_testo", "colore_prezzo"],
            ),
        },
        {
            "name": "cambia_sfondo",
            "description": (
                "Scontorna la pizza (o il piatto) da una foto vera e la mette su uno sfondo nuovo e curato, "
                "con un'ombra morbida e un leggero ritocco di luce e colori. La pizza resta quella della "
                "foto: cambia solo lo sfondo. Usalo quando lo sfondo della foto è brutto o disordinato "
                "(bancone, cartone, piastrelle, luce cattiva). Il risultato è una foto da usare poi in crea_grafica. "
                "Tipi di sfondo: 'ai' = generato dalla descrizione (serve OPENAI_API_KEY); "
                "'immagine' = un file in lavoro/ (es. sfondi/legno.jpg); 'tinta' = colore pieno con sfumatura."
            ),
            "strict": True,
            "input_schema": _schema(
                {
                    "foto": {"type": "string", "description": "Foto originale in lavoro/, es. foto/diavola.jpg."},
                    "formato": {"type": "string", "enum": list(FORMATI)},
                    "tipo_sfondo": {"type": "string", "enum": ["ai", "immagine", "tinta"]},
                    "sfondo": {
                        "type": "string",
                        "description": "Per 'ai': descrizione dettagliata di una superficie VUOTA, con la stessa "
                                       "inquadratura della foto (es. 'vista dall'alto di un tavolo di legno scuro rustico, "
                                       "un po' di farina, foglie di basilico e pomodorini ai bordi, centro libero, luce calda "
                                       "laterale'). Per 'immagine': percorso del file. Per 'tinta': colore esadecimale.",
                    },
                    "spazio_testo": {
                        "type": "string", "enum": ["basso", "alto", "nessuno"],
                        "description": "Dove lasciare spazio libero per il testo di crea_grafica: la pizza si sposta dall'altra parte.",
                    },
                    "grandezza": {"type": "number", "description": "Quanto è grande la pizza rispetto alla larghezza, da 0.5 a 0.95 (consigliato 0.8)."},
                },
                ["foto", "formato", "tipo_sfondo", "sfondo", "spazio_testo", "grandezza"],
            ),
        },
        {
            "name": "crea_video",
            "description": (
                "Monta un video verticale 1080x1920 (per TikTok) a partire da una o più immagini, "
                "con un leggero zoom su ognuna. La musica si aggiunge poi nell'app TikTok."
            ),
            "strict": True,
            "input_schema": _schema(
                {
                    "immagini": {"type": "array", "items": {"type": "string"}, "description": "Percorsi in lavoro/, in ordine."},
                    "secondi_per_immagine": {"type": "number", "description": "Da 2 a 6."},
                },
                ["immagini", "secondi_per_immagine"],
            ),
        },
    ],
    "immagini_ai": [
        {
            "name": "genera_immagine_ai",
            "description": (
                "Genera un'immagine da zero con un modello di immagini AI. Usala per sfondi, "
                "ambientazioni, eventi o idee creative; per mostrare le pizze vere preferisci le foto "
                "in lavoro/foto/. Scrivi una descrizione dettagliata (soggetto, luce, stile, inquadratura). "
                "Non chiedere testo dentro l'immagine: i testi li aggiungi poi con crea_grafica."
            ),
            "strict": True,
            "input_schema": _schema(
                {
                    "descrizione": {"type": "string"},
                    "orientamento": {"type": "string", "enum": ["verticale", "quadrato"]},
                },
                ["descrizione", "orientamento"],
            ),
        },
    ],
    "facebook": [
        {
            "name": "pubblica_facebook",
            "description": (
                "Pubblica un post sulla Pagina Facebook della pizzeria, con un'immagine (consigliato) o solo testo. "
                "Prima di pubblicare viene chiesta conferma al titolare: se rifiuta, ricevi il suo commento "
                "e puoi correggere e riproporre."
            ),
            "strict": True,
            "input_schema": _schema(
                {
                    "immagine": {"type": "string", "description": "Percorso in lavoro/, oppure vuoto per solo testo."},
                    "testo": {"type": "string", "description": "Il testo del post, con eventuali emoji e hashtag."},
                },
                ["immagine", "testo"],
            ),
        },
    ],
    "tiktok": [
        {
            "name": "invia_bozza_tiktok",
            "description": (
                "Manda un video (creato con crea_video) nelle bozze dell'account TikTok della pizzeria. "
                "Il titolare riceve una notifica nell'app, aggiunge la musica e pubblica da lì. "
                "Prima dell'invio viene chiesta conferma al titolare. "
                "La didascalia non passa dall'API: riportala nel tuo resoconto, così il titolare la incolla."
            ),
            "strict": True,
            "input_schema": _schema(
                {
                    "video": {"type": "string", "description": "Percorso in lavoro/ del file .mp4."},
                    "didascalia": {"type": "string", "description": "Didascalia suggerita con hashtag."},
                },
                ["video", "didascalia"],
            ),
        },
    ],
}

NOMI_PACCHETTI = ["web", *PACCHETTI]  # "web" è la ricerca web di Claude, gestita in capo.py


def strumenti_di(pacchetti: list[str]) -> list[dict]:
    return [s for nome in pacchetti for s in PACCHETTI.get(nome, [])]


NOMI_STRUMENTI = {s["name"] for lista in PACCHETTI.values() for s in lista}


# ---------------------------------------------------------------------------
# Grafica
# ---------------------------------------------------------------------------

def _font(candidati: list[Path], dimensione: int):
    for p in candidati:
        if p.exists():
            return ImageFont.truetype(str(p), dimensione)
    return ImageFont.load_default(size=dimensione)


def _a_capo(draw, testo: str, font, larghezza: int) -> list[str]:
    righe, riga = [], ""
    for parola in testo.split():
        prova = f"{riga} {parola}".strip()
        if draw.textlength(prova, font=font) <= larghezza or not riga:
            riga = prova
        else:
            righe.append(riga)
            riga = parola
    if riga:
        righe.append(riga)
    return righe


def _testo_che_sta(draw, testo, candidati, dimensione, larghezza, max_righe):
    """Riduce il carattere finché il testo sta in max_righe."""
    while dimensione > 28:
        font = _font(candidati, dimensione)
        righe = _a_capo(draw, testo, font, larghezza)
        if len(righe) <= max_righe:
            return font, righe
        dimensione -= 6
    font = _font(candidati, dimensione)
    return font, _a_capo(draw, testo, font, larghezza)[:max_righe]


def crea_grafica(d: dict) -> str:
    L, A = FORMATI[d["formato"]]
    fascia = _colore(d["colore_fascia"], "#B3261E")
    col_testo = _colore(d["colore_testo"], "#FFFFFF")
    col_prezzo = _colore(d["colore_prezzo"], "#F2C14E")

    if d["foto"]:
        foto = Image.open(_percorso(d["foto"]))
        foto = ImageOps.exif_transpose(foto).convert("RGB")
        img = ImageOps.fit(foto, (L, A), method=Image.Resampling.LANCZOS)
    else:
        img = Image.new("RGB", (L, A), fascia)
    img = img.convert("RGBA")

    margine = int(L * 0.07)
    scala = L * (1.2 if A > 1.6 * L else 1.0)  # nelle storie verticali il testo può essere più grande
    larghezza_testo = L - 2 * margine
    disegno_prova = ImageDraw.Draw(img)

    f_tit, r_tit = _testo_che_sta(disegno_prova, d["titolo"].upper(), FONT_TITOLO, int(scala * 0.105), larghezza_testo, 3)
    f_sot, r_sot = (_testo_che_sta(disegno_prova, d["sottotitolo"], FONT_TESTO, int(scala * 0.045), larghezza_testo, 3)
                    if d["sottotitolo"] else (None, []))
    f_bas = _font(FONT_TESTO, int(scala * 0.034))

    alt_tit = sum(f_tit.getbbox(r)[3] for r in r_tit) + 12 * (len(r_tit) - 1)
    alt_sot = (sum(f_sot.getbbox(r)[3] for r in r_sot) + 8 * (len(r_sot) - 1)) if r_sot else 0
    alt_fascia = margine + alt_tit + (int(L * 0.03) + alt_sot if r_sot else 0) + margine
    if d["riga_in_basso"]:
        alt_fascia += f_bas.getbbox("Ag")[3] + int(L * 0.04)

    # Fascia colorata in alto o in basso, che sfuma verso la foto.
    y0 = 0 if d["posizione_testo"] == "alto" else A - alt_fascia
    if d["foto"]:
        sfumatura = int(alt_fascia * 0.45)
        maschera = Image.new("L", (1, A), 0)
        for y in range(A):
            dentro = y - y0 if d["posizione_testo"] == "basso" else (y0 + alt_fascia) - y
            if d["posizione_testo"] == "basso":
                dist = y - (y0 - sfumatura)
            else:
                dist = (y0 + alt_fascia + sfumatura) - y
            if dentro >= 0 and dentro <= alt_fascia:
                a = 225
            elif 0 <= dist < sfumatura:
                a = int(225 * (dist / sfumatura) ** 1.6)
            else:
                a = 0
            maschera.putpixel((0, y), a)
        strato = Image.new("RGBA", (L, A), (*fascia, 0))
        strato.putalpha(maschera.resize((L, A)))
        img = Image.alpha_composite(img, strato)
    draw = ImageDraw.Draw(img)

    y = y0 + margine
    for r in r_tit:
        draw.text((margine, y), r, font=f_tit, fill=col_testo)
        y += f_tit.getbbox(r)[3] + 12
    if r_sot:
        y += int(L * 0.03) - 12
        for r in r_sot:
            draw.text((margine, y), r, font=f_sot, fill=col_testo)
            y += f_sot.getbbox(r)[3] + 8
    if d["riga_in_basso"]:
        yb = y0 + alt_fascia - margine - f_bas.getbbox("Ag")[3] + int(L * 0.02)
        draw.line([margine, yb - int(L * 0.025), L - margine, yb - int(L * 0.025)], fill=col_testo, width=2)
        draw.text((margine, yb), d["riga_in_basso"], font=f_bas, fill=col_testo)

    # Bollino del prezzo, dalla parte opposta della fascia.
    if d["prezzo"]:
        f_pre = _font(FONT_TITOLO, int(L * 0.06))
        r = int(L * 0.13)
        cx = L - margine - r
        cy = (A - margine - r) if d["posizione_testo"] == "alto" else (margine + r)
        draw.ellipse([cx - r, cy - r, cx + r, cy + r], fill=col_prezzo)
        scuro = (30, 30, 30) if sum(col_prezzo) > 382 else (255, 255, 255)
        draw.text((cx, cy), d["prezzo"], font=f_pre, fill=scuro, anchor="mm")

    uscita = _nuovo_file(f"grafica-{d['formato']}", "png")
    img.convert("RGB").save(uscita, optimize=True)
    return f"Grafica salvata in {_rel(uscita)} ({L}x{A}). Guardala con vedi_immagine prima di proporla."


def crea_video(d: dict) -> str:
    immagini = [_percorso(p) for p in d["immagini"]]
    for p in immagini:
        if not p.exists():
            raise FileNotFoundError(f"Immagine non trovata: {_rel(p)}")
    sec = min(max(float(d["secondi_per_immagine"]), 2), 6)
    fps = 30
    uscita = _nuovo_file("video", "mp4")
    with tempfile.TemporaryDirectory() as tmp:
        spezzoni = []
        for i, p in enumerate(immagini):
            # Prepara un fotogramma 1080x1920 e ci fa un leggero zoom (effetto Ken Burns).
            base = ImageOps.fit(ImageOps.exif_transpose(Image.open(p)).convert("RGB"), (1080, 1920))
            fp = Path(tmp) / f"{i}.png"
            base.save(fp)
            sp = Path(tmp) / f"{i}.mp4"
            frame = int(sec * fps)
            subprocess.run(
                ["ffmpeg", "-y", "-loglevel", "error", "-loop", "1", "-i", str(fp),
                 "-vf", f"scale=2160:3840,zoompan=z='min(zoom+0.0008,1.08)':d={frame}:"
                        f"x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps={fps}",
                 "-t", str(sec), "-c:v", "libx264", "-pix_fmt", "yuv420p", str(sp)],
                check=True, capture_output=True,
            )
            spezzoni.append(sp)
        lista = Path(tmp) / "lista.txt"
        lista.write_text("".join(f"file '{s}'\n" for s in spezzoni))
        subprocess.run(
            ["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(lista),
             "-c", "copy", "-movflags", "+faststart", str(uscita)],
            check=True, capture_output=True,
        )
    return f"Video salvato in {_rel(uscita)} ({len(immagini)} immagini, {sec * len(immagini):.0f} secondi)."


def vedi_immagine(d: dict):
    p = _percorso(d["percorso"])
    img = ImageOps.exif_transpose(Image.open(p)).convert("RGB")
    img.thumbnail((1024, 1024))  # più piccola = meno token
    with tempfile.SpooledTemporaryFile() as buf:
        img.save(buf, "JPEG", quality=85)
        buf.seek(0)
        dati = base64.standard_b64encode(buf.read()).decode()
    return [
        {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": dati}},
        {"type": "text", "text": f"Questa è {d['percorso']}."},
    ]


def elenca_foto(_: dict) -> str:
    righe = []
    for titolo, cartella in (("Foto della pizzeria (lavoro/foto/)", CARTELLA_FOTO),
                             ("Immagini create (lavoro/post/)", CARTELLA_USCITA)):
        cartella.mkdir(parents=True, exist_ok=True)
        files = sorted(_rel(f) for f in cartella.rglob("*") if f.suffix.lower() in (".jpg", ".jpeg", ".png", ".webp", ".mp4"))
        righe.append(f"{titolo}:\n" + ("\n".join(f"- {f}" for f in files) or "- (vuota)"))
    return "\n\n".join(righe)


# ---------------------------------------------------------------------------
# Immagini AI (OpenAI)
# ---------------------------------------------------------------------------

def _genera_ai(descrizione: str, verticale: bool) -> Path:
    if not os.environ.get("OPENAI_API_KEY"):
        raise RuntimeError("Manca OPENAI_API_KEY: le immagini AI non sono configurate. "
                           "Usa le foto in lavoro/foto/ o uno sfondo 'tinta'/'immagine'.")
    from openai import OpenAI  # importato qui: serve solo se usi le immagini AI

    risultato = OpenAI().images.generate(
        model=os.environ.get("MODELLO_IMMAGINI", "gpt-image-1"),
        prompt=descrizione,
        size="1024x1536" if verticale else "1024x1024",
        quality=os.environ.get("QUALITA_IMMAGINI", "medium"),
    )
    uscita = _nuovo_file("ai", "png")
    uscita.write_bytes(base64.b64decode(risultato.data[0].b64_json))
    return uscita


def genera_immagine_ai(d: dict) -> str:
    uscita = _genera_ai(d["descrizione"], d["orientamento"] == "verticale")
    return f"Immagine AI salvata in {_rel(uscita)}. Guardala con vedi_immagine, poi usala come foto in crea_grafica."


# ---------------------------------------------------------------------------
# Sfondo nuovo per le foto vere
# ---------------------------------------------------------------------------

def _scontorna(img: Image.Image) -> Image.Image:
    """Toglie lo sfondo con rembg (gira sul tuo computer, gratis). Restituisce RGBA ritagliata."""
    from rembg import new_session, remove  # importato qui: il modello si scarica al primo uso

    global _sessione_scontorno
    if "_sessione_scontorno" not in globals():
        _sessione_scontorno = new_session(os.environ.get("MODELLO_SCONTORNO", "isnet-general-use"))
    ritaglio = remove(img, session=_sessione_scontorno).convert("RGBA")
    box = ritaglio.getchannel("A").point(lambda a: 255 if a > 20 else 0).getbbox()
    if not box:
        raise RuntimeError("Non ho trovato la pizza nella foto: prova con un'altra foto.")
    return ritaglio.crop(box)


def _ritocca(ritaglio: Image.Image) -> Image.Image:
    """Un filo più luminosa, colori più vivi e più nitida, senza esagerare."""
    from PIL import ImageEnhance, ImageFilter

    rgb, alfa = ritaglio.convert("RGB"), ritaglio.getchannel("A")
    rgb = ImageOps.autocontrast(rgb, cutoff=0.5)
    rgb = ImageEnhance.Color(rgb).enhance(1.12)
    rgb = ImageEnhance.Brightness(rgb).enhance(1.03)
    rgb = rgb.filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=3))
    # Bordo un po' ammorbidito, così non sembra ritagliata con le forbici.
    alfa = alfa.filter(ImageFilter.GaussianBlur(1.2))
    rgb.putalpha(alfa)
    return rgb


def _sfondo_tinta(L: int, A: int, colore: tuple) -> Image.Image:
    """Colore pieno con una luce morbida al centro e bordi più scuri: effetto studio fotografico."""
    from PIL import ImageFilter

    chiaro = tuple(min(255, int(c * 1.25 + 18)) for c in colore)
    scuro = tuple(int(c * 0.55) for c in colore)
    base = Image.new("RGB", (L, A), scuro)
    maschera = Image.new("L", (L, A), 0)
    ImageDraw.Draw(maschera).ellipse([-L * 0.2, A * 0.05, L * 1.2, A * 0.95], fill=255)
    maschera = maschera.filter(ImageFilter.GaussianBlur(L * 0.18))
    return Image.composite(Image.new("RGB", (L, A), chiaro), base, maschera)


def cambia_sfondo(d: dict) -> str:
    from PIL import ImageFilter

    L, A = FORMATI[d["formato"]]
    foto = ImageOps.exif_transpose(Image.open(_percorso(d["foto"]))).convert("RGB")
    ritaglio = _ritocca(_scontorna(foto))

    if d["tipo_sfondo"] == "ai":
        sorgente = Image.open(_genera_ai(
            d["sfondo"] + ". Superficie vuota al centro, nessun cibo al centro, nessun testo, nessuna persona, "
            "fotografia realistica, alta qualità, food photography.", verticale=A > L))
        sfondo = ImageOps.fit(sorgente.convert("RGB"), (L, A), method=Image.Resampling.LANCZOS)
    elif d["tipo_sfondo"] == "immagine":
        sorgente = ImageOps.exif_transpose(Image.open(_percorso(d["sfondo"])))
        sfondo = ImageOps.fit(sorgente.convert("RGB"), (L, A), method=Image.Resampling.LANCZOS)
    else:
        sfondo = _sfondo_tinta(L, A, _colore(d["sfondo"], "#3A2A22"))

    # Grandezza e posizione: lascia libera la zona del testo.
    g = min(max(float(d["grandezza"]), 0.5), 0.95)
    spazio = d["spazio_testo"]
    alt_max = A * (0.62 if spazio != "nessuno" else 0.9)
    scala = min(L * g / ritaglio.width, alt_max / ritaglio.height)
    ritaglio = ritaglio.resize((int(ritaglio.width * scala), int(ritaglio.height * scala)), Image.Resampling.LANCZOS)
    x = (L - ritaglio.width) // 2
    if spazio == "basso":
        y = int(A * 0.05)
    elif spazio == "alto":
        y = A - ritaglio.height - int(A * 0.05)
    else:
        y = (A - ritaglio.height) // 2

    # Ombra morbida sotto la pizza.
    ombra = Image.new("RGBA", (L, A), (0, 0, 0, 0))
    sagoma = ritaglio.getchannel("A").point(lambda a: int(a * 0.55))
    ombra.paste((0, 0, 0, 255), (x + int(L * 0.012), y + int(L * 0.025)), sagoma)
    ombra = ombra.filter(ImageFilter.GaussianBlur(L * 0.022))

    risultato = Image.alpha_composite(sfondo.convert("RGBA"), ombra)
    risultato.alpha_composite(ritaglio, (x, y))
    CARTELLA_FOTO.mkdir(parents=True, exist_ok=True)
    uscita = _nuovo_file("foto-sfondo", "png")
    risultato.convert("RGB").save(uscita, optimize=True)
    return (f"Foto con sfondo nuovo salvata in {_rel(uscita)} ({L}x{A}). Guardala con vedi_immagine: "
            "se va bene usala come 'foto' in crea_grafica, con posizione_testo uguale a spazio_testo.")


# ---------------------------------------------------------------------------
# Conferma del titolare
# ---------------------------------------------------------------------------

def chiedi_conferma(dove: str, file: str, testo: str) -> tuple[bool, str]:
    with blocco_conferma:
        print("\n" + "=" * 60)
        print(f"  PRONTO PER {dove.upper()}")
        if file:
            print(f"  File:  {_percorso(file)}")
        print("  Testo:")
        for riga in testo.splitlines() or [""]:
            print(f"    {riga}")
        print("=" * 60)
        risposta = input("  Pubblico? Scrivi 'ok' per confermare, altrimenti cosa cambiare: ").strip()
        print()
    return risposta.lower() in ("ok", "si", "sì", "s", "yes", "y", "vai"), risposta


# ---------------------------------------------------------------------------
# Facebook (Graph API)
# ---------------------------------------------------------------------------

def _graph_url(percorso: str) -> str:
    versione = os.environ.get("FACEBOOK_GRAPH_VERSION", "v23.0")
    return f"https://graph.facebook.com/{versione}/{percorso}"


def pubblica_facebook(d: dict) -> str:
    pagina = os.environ.get("FACEBOOK_PAGE_ID")
    token = os.environ.get("FACEBOOK_PAGE_TOKEN")
    if not pagina or not token:
        raise RuntimeError("Facebook non è configurato: mancano FACEBOOK_PAGE_ID o FACEBOOK_PAGE_TOKEN nel file .env.")

    ok, commento = chiedi_conferma("Facebook", d["immagine"], d["testo"])
    if not ok:
        return f"NON pubblicato. Il titolare ha risposto: «{commento}». Correggi e riproponi, oppure chiedi al capo."

    if d["immagine"]:
        with open(_percorso(d["immagine"]), "rb") as f:
            r = requests.post(
                _graph_url(f"{pagina}/photos"),
                data={"message": d["testo"], "access_token": token},
                files={"source": f},
                timeout=120,
            )
    else:
        r = requests.post(
            _graph_url(f"{pagina}/feed"),
            data={"message": d["testo"], "access_token": token},
            timeout=60,
        )
    dati = r.json()
    if r.status_code != 200 or "error" in dati:
        raise RuntimeError(f"Facebook ha risposto con un errore: {dati.get('error', dati)}")
    return f"Pubblicato su Facebook (id {dati.get('post_id') or dati.get('id')})."


# ---------------------------------------------------------------------------
# TikTok (Content Posting API, invio in bozza)
# ---------------------------------------------------------------------------

TIKTOK_API = "https://open.tiktokapis.com/v2/post/publish"


def invia_bozza_tiktok(d: dict) -> str:
    token = os.environ.get("TIKTOK_ACCESS_TOKEN")
    if not token:
        raise RuntimeError("TikTok non è configurato: manca TIKTOK_ACCESS_TOKEN nel file .env.")
    video = _percorso(d["video"])
    if video.suffix.lower() != ".mp4" or not video.exists():
        raise ValueError("Serve un file .mp4 esistente: crealo prima con crea_video.")

    ok, commento = chiedi_conferma("le bozze di TikTok", d["video"], d["didascalia"])
    if not ok:
        return f"NON inviato. Il titolare ha risposto: «{commento}». Correggi e riproponi."

    intestazioni = {"Authorization": f"Bearer {token}", "Content-Type": "application/json; charset=UTF-8"}
    dimensione = video.stat().st_size
    # I video piccoli (quelli che creiamo noi) si caricano in un pezzo solo.
    if dimensione > 64 * 1024 * 1024:
        raise ValueError("Il video è troppo grande (oltre 64 MB): usa meno immagini o meno secondi.")
    r = requests.post(
        f"{TIKTOK_API}/inbox/video/init/",
        headers=intestazioni,
        json={"source_info": {"source": "FILE_UPLOAD", "video_size": dimensione,
                              "chunk_size": dimensione, "total_chunk_count": 1}},
        timeout=60,
    )
    dati = r.json()
    if dati.get("error", {}).get("code") not in (None, "ok"):
        raise RuntimeError(f"TikTok ha rifiutato l'avvio del caricamento: {dati['error']}")
    publish_id = dati["data"]["publish_id"]
    upload_url = dati["data"]["upload_url"]

    with open(video, "rb") as f:
        r = requests.put(
            upload_url,
            data=f.read(),
            headers={"Content-Type": "video/mp4", "Content-Length": str(dimensione),
                     "Content-Range": f"bytes 0-{dimensione - 1}/{dimensione}"},
            timeout=300,
        )
    if r.status_code not in (200, 201):
        raise RuntimeError(f"Caricamento su TikTok fallito ({r.status_code}): {r.text[:300]}")

    stato = "sconosciuto"
    for _ in range(10):
        time.sleep(3)
        s = requests.post(f"{TIKTOK_API}/status/fetch/", headers=intestazioni,
                          json={"publish_id": publish_id}, timeout=30).json()
        stato = s.get("data", {}).get("status", stato)
        if stato in ("SEND_TO_USER_INBOX", "PUBLISH_COMPLETE", "FAILED"):
            break
    if stato == "FAILED":
        raise RuntimeError(f"TikTok non ha accettato il video: {s.get('data', {}).get('fail_reason')}")
    return (f"Video inviato nelle bozze di TikTok (stato: {stato}). Il titolare lo trova nelle notifiche "
            f"dell'app, aggiunge la musica e pubblica. Didascalia da incollare:\n{d['didascalia']}")


# ---------------------------------------------------------------------------

ESECUTORI = {
    "elenca_foto": elenca_foto,
    "vedi_immagine": vedi_immagine,
    "crea_grafica": crea_grafica,
    "crea_video": crea_video,
    "cambia_sfondo": cambia_sfondo,
    "genera_immagine_ai": genera_immagine_ai,
    "pubblica_facebook": pubblica_facebook,
    "invia_bozza_tiktok": invia_bozza_tiktok,
}


def esegui(nome: str, dati: dict):
    """Restituisce (contenuto, errore). Il contenuto può essere testo o una lista di blocchi."""
    try:
        return ESECUTORI[nome](dati), False
    except Exception as e:  # l'errore torna al modello, che può correggersi
        return f"Errore in {nome}: {e}", True
