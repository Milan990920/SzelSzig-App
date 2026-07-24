import glob
import os
import re
import json

import pandas as pd

# Put the 5 source Excel files (received from STKH Kft. / Sopron Holding Zrt. /
# TAEG Zrt.) in this directory, or set SZELSZIG_SRC to point elsewhere. The
# files themselves are not committed to the repo -- see README.md "Adatok
# frissítése" for where each one comes from.
SRC = os.environ.get("SZELSZIG_SRC", os.path.join(os.path.dirname(__file__), "source-data"))
OUT = os.path.join(os.path.dirname(__file__), "..", "js", "data.js")


def find_one(keyword):
    matches = glob.glob(os.path.join(SRC, f"*{keyword}*.xlsx"))
    if not matches:
        raise FileNotFoundError(f"No source file matching '*{keyword}*.xlsx' in {SRC}")
    return matches[0]

def _clean_token(token):
    """Strip whitespace and collapse a token with stray extra dots, e.g.
    '47.43.10' (meant '47.4310') or '46. 5202' (meant '46.5202')."""
    token = re.sub(r"\s+", "", token)
    if token.count(".") > 1:
        head, *rest = token.split(".")
        token = head + "." + "".join(rest)
    return token


def parse_gps(s):
    if s is None:
        return None
    s = str(s).strip()
    if not s or s.lower() == "nan":
        return None
    # Decimal commas (Hungarian format) are always immediately followed by a
    # digit with no space, e.g. "47,61249"; the lat/lng *separator* comma is
    # always followed by whitespace, e.g. "47.68768, 16.59080". Normalize
    # only the former to a period so the separator stays intact.
    s = re.sub(r",(?=\d)", ".", s)
    parts = [p for p in s.split(",")]
    if len(parts) < 2:
        return None
    lat_s, lng_s = _clean_token(parts[0]), _clean_token(parts[1])
    try:
        lat, lng = float(lat_s), float(lng_s)
    except ValueError:
        return None
    if not (44 < lat < 49 and 14 < lng < 20):
        return None
    return round(lat, 6), round(lng, 6)


# ---------------------------------------------------------------------------
# 1) Szelektiv szigetek (STKH only) -- "Szigetek GPS" sheet
# ---------------------------------------------------------------------------
f_master = find_one("Szelszig_adat")

df = pd.read_excel(f_master, sheet_name="Szigetek GPS", header=0)
df = df.dropna(subset=[df.columns[1]])
df.columns = ["id", "telepules", "kozterulet", "gps", "papir", "uveg", "muanyag", "fem", "terulet"] + list(df.columns[9:])
df = df[df["terulet"].astype(str).str.startswith("STKH")]

szigetek = []
skipped_szigetek = 0
for _, row in df.iterrows():
    ll = parse_gps(row["gps"])
    if not ll:
        skipped_szigetek += 1
        continue
    fractions = []
    if str(row["papir"]).strip() == "van":
        fractions.append("papír")
    if str(row["uveg"]).strip() == "van":
        fractions.append("üveg")
    if str(row["muanyag"]).strip() == "van":
        fractions.append("műanyag")
    if str(row["fem"]).strip() == "van":
        fractions.append("fém")
    terulet = str(row["terulet"]).replace("STKH szolgáltatási terület", "STKH").strip()
    szigetek.append({
        "name": f"{row['telepules']} – {row['kozterulet']}".strip(" –"),
        "lat": ll[0], "lng": ll[1],
        "fractions": fractions,
        "area": terulet,
    })

print(f"szigetek: {len(szigetek)} (skipped {skipped_szigetek})")

# ---------------------------------------------------------------------------
# 2) Hulladekudvarok (STKH) -- "STKH Hulladékudvar" sheet
# ---------------------------------------------------------------------------
df2 = pd.read_excel(f_master, sheet_name="STKH Hulladékudvar", header=0)
df2 = df2.dropna(subset=[df2.columns[1]])
df2.columns = ["id", "nev", "gps", "varmegye"]

udvarok = []
for _, row in df2.iterrows():
    ll = parse_gps(row["gps"])
    if not ll:
        continue
    udvarok.append({
        "name": str(row["nev"]).strip(),
        "lat": ll[0], "lng": ll[1],
        "county": str(row["varmegye"]).strip(),
    })

print(f"hulladékudvarok: {len(udvarok)}")

# ---------------------------------------------------------------------------
# 3) Kommunalis edenyek -- "App_Kommunális edények" (the superset, 694 rows)
# ---------------------------------------------------------------------------
f_komm = find_one("App_Kommun")
df3 = pd.read_excel(f_komm, sheet_name="Munka1", header=0)
df3.columns = ["id", "coord", "addr", "type"]
df3 = df3.dropna(subset=["coord"])

edenyek = []
skipped_edenyek = 0
for _, row in df3.iterrows():
    ll = parse_gps(row["coord"])
    if not ll:
        skipped_edenyek += 1
        continue
    addr = str(row["addr"]).strip()
    addr = re.sub(r"^\d+\.\s*", "", addr)  # strip leading "12." index prefix
    edenyek.append({
        "name": addr,
        "lat": ll[0], "lng": ll[1],
        "type": str(row["type"]).strip() if pd.notna(row["type"]) else "",
    })

print(f"kommunális edények: {len(edenyek)} (skipped {skipped_edenyek})")

# ---------------------------------------------------------------------------
# 4) TAEG kommunalis edenyek (erdei/turista terulet) -- separate file
# ---------------------------------------------------------------------------
f_taeg = find_one("TAEG")
df4 = pd.read_excel(f_taeg, sheet_name="Munka2", header=0)
df4.columns = ["ssz", "nev", "gps"]
df4 = df4.dropna(subset=["nev"])

taeg = []
for _, row in df4.iterrows():
    ll = parse_gps(row["gps"])
    if not ll:
        continue
    taeg.append({
        "name": str(row["nev"]).strip(),
        "lat": ll[0], "lng": ll[1],
    })

print(f"TAEG edények: {len(taeg)}")

# ---------------------------------------------------------------------------
# 5) Szelektiv szigetek gyujtesi szabalyai -- mit fogadnak el frakciankent
# (a szigetek GPS-adatai csak azt mondjak meg, HOGY gyujtenek-e egy adott
# frakciot; ez a tabla adja hozza, hogy MIT lehet abba beledobni)
# ---------------------------------------------------------------------------
f_szab = find_one("szab_lyzata")
df5 = pd.read_excel(f_szab, sheet_name=0, header=0)
df5.columns = ["frakcio_label", "leiras"]
df5 = df5.dropna(subset=["leiras"])

FRACTION_KEY = {"Papírt": "papír", "Műanyagot": "műanyag", "Üveget": "üveg", "Fémet": "fém"}
fraction_accepted = {}
for _, row in df5.iterrows():
    key = FRACTION_KEY.get(str(row["frakcio_label"]).strip())
    if key:
        fraction_accepted[key] = str(row["leiras"]).strip()

print(f"frakció-szabályok: {list(fraction_accepted.keys())}")

# ---------------------------------------------------------------------------
# Write data.js
# ---------------------------------------------------------------------------
out = []
out.append("/**")
out.append(" * Valós gyűjtőpont-adatok a SzelSzig App weboldalhoz.")
out.append(" *")
out.append(" * Forrás: STKH Kft. és Sopron Holding Zrt. adatszolgáltatása, valamint a")
out.append(" * TAEG Zrt. erdészeti/turisztikai kommunális edényadatai (a felhasználó által")
out.append(" * biztosított Excel táblák alapján). A szelektív szigetek és hulladékudvarok")
out.append(" * kizárólag az STKH Kft. szolgáltatási területére vonatkoznak.")
out.append(" *")
out.append(" * Ez a fájl generált — forrás: build_data.py (nem kézzel szerkesztett).")
out.append(" */")
out.append("")
out.append("const SZELSZIG_DATA = {")
out.append(f"  szigetek: {json.dumps(szigetek, ensure_ascii=False)},")
out.append(f"  udvarok: {json.dumps(udvarok, ensure_ascii=False)},")
out.append(f"  edenyek: {json.dumps(edenyek, ensure_ascii=False)},")
out.append(f"  taeg: {json.dumps(taeg, ensure_ascii=False)},")
out.append("};")
out.append("")
out.append("// Mit lehet az egyes frakciókba dobni (STKH Kft. szelektív szigetek szabályzata)")
out.append(f"const FRACTION_ACCEPTED = {json.dumps(fraction_accepted, ensure_ascii=False)};")
out.append("")

# Keep the demo calendar & tips content (not covered by the Excel files)
extra = '''
// Hulladékudvarokra vonatkozó általános STKH Kft. szabályok (nem táblázatos
// adat, a diplomamunka szövege alapján -- telephelyenként eltérhet, az
// aktuális nyitvatartást célszerű az STKH Kft.-nél ellenőrizni).
const HULLADEKUDVAR_INFO = {
  hours: "A legtöbb telephely heti három napon, jellemzően kedden, csütörtökön és szombaton tart nyitva, 8:00–15:00 között. A hulladékot legkésőbb 14:45-ig kell leadni.",
  accepted: "Lakossági eredetű, előre szelektált hulladék adható le: pl. szétszerelt bútor, zöldhulladék, kisebb építési törmelék, valamint veszélyes hulladékok (fáradt motor-/kenőolaj, elemek, akkumulátorok, elektronikai hulladék, festékmaradék).",
  condition: "Csak az STKH Kft. szolgáltatási területén bejelentett lakcímmel rendelkező, hulladékszállítási díjhátralék nélküli lakosok vehetik igénybe.",
};

// Demó hulladéknaptár – házhoz menő zsákos gyűjtés (STKH Kft. rendszere alapján, példa)
const SZELSZIG_CALENDAR = [
  { fraction: "Papír", day: "Minden hónap 1. és 3. hétfője", color: "#2f6fed" },
  { fraction: "Műanyag", day: "Minden páros hét szerdája", color: "#f5a623" },
  { fraction: "Üveg", day: "Minden hónap 2. péntekje", color: "#2e8b57" },
  { fraction: "Zöldhulladék", day: "Április–november, havonta 1 alkalom", color: "#6aa84f" },
  { fraction: "Lomtalanítás", day: "Évente 1 alkalom, előzetes hirdetés szerint", color: "#8e44ad" },
];

// Szelektálási tippek a diplomamunka szakirodalmi része alapján
const SZELSZIG_TIPS = [
  {
    fraction: "Papír",
    color: "#2f6fed",
    icon: "\\ud83d\\udce6",
    tips: [
      "Lapítsd össze a kartondobozokat, így kevesebb helyet foglalnak.",
      "A zsíros, élelmiszertől szennyezett papír (pl. pizzásdoboz alja) nem újrahasznosítható.",
      "A tépőzáras, fóliázott papírokat (pl. egyes füzetborítók) inkább a kommunálisba dobd.",
    ],
  },
  {
    fraction: "Műanyag",
    color: "#f5a623",
    icon: "\\ud83e\\udd64",
    tips: [
      "Öblítsd ki az ételmaradékot, italmaradékot a flakonokból, dobozokból.",
      "A PET palackokat érdemes összenyomni – kivéve, ha REpontra viszed vissza (ott ne tapossd laposra)!",
      "A vegyes anyagú csomagolás (pl. alufóliás chipszacskó) sajnos jellemzően nem szelektálható.",
    ],
  },
  {
    fraction: "Üveg",
    color: "#2e8b57",
    icon: "\\ud83c\\udf7e",
    tips: [
      "A kupakot és a fém záróelemet külön gyűjtsd (fém frakció).",
      "A síküveg (pl. ablaküveg, tükör) nem kerülhet az üveg szigetre, ez hulladékudvarba való.",
      "A törött üveget becsomagolva, jelölve dobd ki, hogy senki ne sérüljön meg.",
    ],
  },
  {
    fraction: "Fém",
    color: "#9b59b6",
    icon: "\\ud83e\\udd6b",
    tips: [
      "Az alumínium italos dobozokat a REpontokon 2-5 Ft-ért vissza is válthatod.",
      "A konzervdobozokat érdemes kiöblíteni és lehetőség szerint összelapítani.",
      "A veszélyes anyagot tartalmazó fém göngyölegek (pl. festékes doboz) hulladékudvarba valók.",
    ],
  },
];
'''
out.append(extra)

with open(OUT, "w", encoding="utf-8") as fh:
    fh.write("\n".join(out))

print(f"written {OUT}")
