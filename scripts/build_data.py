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


def find_one_csv(keyword):
    matches = glob.glob(os.path.join(SRC, f"*{keyword}*.csv"))
    return matches[0] if matches else None

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

# Ismert hibás GPS-koordináták javítása a forrás Excelben (elírás/rossz sor,
# vagy egy egész településcsoport hibásan bevitt/eltolt koordinátái — ez
# utóbbi 2026.08-ban derült ki: egy sor Vas megyei település szigetadata
# egy nagyjából 20-50 km-es, közel egységes eltolással volt rögzítve).
# Kulcs: (sziget neve, EREDETI lat, EREDETI lng) — az eredeti koordináta is
# kell a kulcsba, mert néhány település (pl. Csörötnek) több szigete azonos
# névvel, de eltérő koordinátával szerepel a forrásban.
# Ellenőrizve a település valós (Wikipedia-beli) középpontja alapján.
KNOWN_COORD_FIXES = {
    ("Csákánydoroszló – Fő utca, Polg. Hivatal", 46.5805, 16.2953): (46.97282, 16.50466),
    ("Csempeszkopács – Hunyadi János utca", 47.0917, 16.4816): (47.15562, 16.80891),
    ("Torony – Szabadság utca", 47.23695, 16.54156): (47.23626, 16.53706),
    ("Csörötnek – Fő út", 46.5653, 16.2225): (46.9466, 16.36783),
    ("Csörötnek – Fő út", 46.5703, 16.2103): (46.95161, 16.35563),
    ("Csörötnek – Petőfi Sándor út", 46.5707, 16.2222): (46.952, 16.36753),
    ("Csörötnek – Vasúti út", 46.571, 16.2203): (46.9523, 16.36563),
    ("Daraboshegy – Szőcei utca 19. (templom mögött)", 46.573, 16.3407): (46.95951, 16.56914),
    ("Döbörhegy – Fő u 58 (Vegyesbolt)", 46.5928, 16.421): (46.99016, 16.70518),
    ("Döröske – Mogyorósi utca", 47.0038, 16.4154): (47.01133, 16.69643),
    ("Egyházashollós – Arany út", 47.0322, 16.4148): (47.05303, 16.6922),
    ("Egyházasrádóc – Kossuth L u. / volt Tsz /", 47.0503, 16.3638): (47.08705, 16.6134),
    ("Egyházasrádóc – Dózsa Gy. u (parkoló )", 47.0512, 16.3643): (47.08795, 16.6139),
    ("Egyházasrádóc – Kossuth Lajos utca (vasútállomás)", 47.0527, 16.3712): (47.08945, 16.6208),
    ("Fertőboz – Polgármesteri Hivatal mellett", 47.62087, 16.7656): (47.63666, 16.69926),
    ("Fertőszentmiklós – Mátrai u.", 47.35399, 16.52416): (47.58533, 16.87052),
    ("Fertőszentmiklós – Újtelep, Szent Imre u. kereszteződés", 47.34486, 16.52918): (47.58533, 16.87052),
    ("Gasztony – Fő utca (buszforduló )", 46.5757, 16.2715): (46.96542, 16.45559),
    ("Gasztony – Fő utca", 46.5752, 16.2645): (46.96492, 16.44859),
    ("Gasztony – Fő utca (Coop bolt )", 46.5748, 16.2657): (46.96452, 16.44979),
    ("Gersekarát – Dózsa György utca", 46.5823, 16.4423): (46.97389, 16.74667),
    ("Gyanógeregye – Petőfi Sándor utca", 47.0717, 16.4556): (47.12333, 16.76472),
    ("Halogy – Petőfi utca 92", 46.5813, 16.3325): (46.97122, 16.56074),
    ("Harasztifalu – Fő utca", 47.0305, 16.3304): (47.05083, 16.55279),
    ("Ivánc – Petőfi Sándor utca", 46.5609, 16.294): (46.93487, 16.49394),
    ("Ivánc – Thököly Imre utca", 46.562, 16.3003): (46.93597, 16.50024),
    ("Katafa – Kossuth utca 38", 46.5842, 16.38): (46.97975, 16.63194),
    ("Kemestaródfa – Csákányi utca", 46.5947, 16.31): (46.99722, 16.5175),
    ("Kisrákos – Fő út", 46.5127, 16.3004): (46.8613, 16.50033),
    ("Kisunyom – Temető utca", 47.0832, 16.3841): (47.1466, 16.64205),
    ("Kondorfa – Alvég utca", 46.5358, 16.2412): (46.89679, 16.40116),
    ("Kondorfa – Fővég út", 46.5339, 16.2307): (46.89489, 16.39066),
    ("Kondorfa – Hegy út", 46.5326, 16.2401): (46.89359, 16.40006),
    ("Kópháza – Kossuth L., Savanyúkút kereszteződés", 47.65651, 16.59097): (47.63806, 16.64278),
    ("Magyarlak – Kossuth Lajos út", 46.5701, 16.2): (46.95066, 16.33864),
    ("Magyarlak – Mátyás út", 46.5703, 16.2103): (46.95086, 16.34894),
    ("Magyarnádalja – Petőfi utca 29", 47.0039, 16.3157): (47, 16.533),
    ("Magyarszecsőd – Fő út", 47.0211, 16.3901): (47.03251, 16.64551),
    ("Molnaszecsőd – Kossuth út (Árvíz Presszó )", 47.0236, 16.4046): (47.04581, 16.67683),
    ("Nagykölked – Fő utca", 47.0357, 16.3312): (47.06556, 16.55222),
    ("Nagymizdó – Fő utca 45", 46.5926, 16.3919): (46.9915, 16.65488),
    ("Nemeskolta – Szabadság utca", 47.0832, 16.46): (47.14184, 16.76732),
    ("Nemeskér – Fő utca 68. (Élelmiszer bolt mellett)", 47.44202, 16.69742): (47.4847, 16.8053),
    ("Nemesmedves – Fő utca", 46.5947, 16.2402): (46.99722, 16.40083),
    ("Nádasd – Kossuth út", 46.5818, 16.3632): (46.97001, 16.60562),
    ("Nádasd – Petőfi út (Coop bolt )", 46.5759, 16.3615): (46.96411, 16.60392),
    ("Nádasd – Táncsics út (Mini Coop )", 46.5749, 16.3708): (46.96311, 16.61322),
    ("Nádasd – Vasúti út", 46.5757, 16.3637): (46.96391, 16.60612),
    ("Ostffyasszonyfa – Hegyaljai utca", 47.96583, 16.61027): (47.32894, 17.04452),
    ("Pinkamindszent – Fő utca", 47.0218, 16.2854): (47.03865, 16.4848),
    ("Püspökmolnári – Béke utca 37", 47.0037, 16.4153): (47.06551, 16.76775),
    ("Püspökmolnári – Petőfi Sándor utca", 47.0454, 16.4702): (47.10721, 16.82265),
    ("Rábahídvég – Bertha György utca", 47.0422, 16.4429): (47.06833, 16.74389),
    ("Rábapaty – Felsőpatyi út", 47.8404, 16.55588): (47.74647, 16.92647),
    ("Rábapaty – Budai utca", 47.1755, 16.55386): (47.08157, 16.92445),
    ("Rábapaty – Kossuth utca", 47.17195, 16.56114): (47.07802, 16.93173),
    ("Rádóckölked – Fő utca ( Polg Hivatal )", 47.0437, 16.3516): (47.07639, 16.58806),
    ("Rátót – Ady Endre utca", 46.5753, 16.2529): (46.96389, 16.42778),
    ("Rönök – Gagarin tér", 46.5839, 16.2202): (46.97662, 16.37248),
    ("Rönök – Táncsics Mihály út", 46.584, 16.2108): (46.97672, 16.36308),
    ("Sorkifalud – Jókai Mór utca", 47.0919, 16.4438): (47.14182, 16.73514),
    ("Sorkifalud – Kossuth Lajos utca 81", 47.0751, 16.4434): (47.12502, 16.73474),
    ("Sorkikápolna – Alkotmány utca", 47.0824, 16.4207): (47.13972, 16.70444),
    ("Sorokpolány – Fő utca", 47.0814, 16.4026): (47.13611, 16.67167),
    ("Szarvaskend – Fő u (kocsma mellett)", 46.5923, 16.4039): (46.98938, 16.67555),
    ("Szentpéterfa – Alkotmány utca", 47.0535, 16.2845): (47.09444, 16.47917),
    ("Szőce – Kölcsey utca 88", 46.5309, 16.3406): (46.88697, 16.56876),
    ("Tanakajd – Zrínyi I u ( Coop bolt )", 47.1135, 16.4354): (47.1869, 16.74224),
    ("Vasalja – Ady Endre utca", 47.0053, 16.3131): (47.013, 16.52204),
    ("Vasalja – Kossuth utca", 47.0043, 16.3043): (47.012, 16.51324),
    ("Vasasszonyfa – Rákóczi utca", 47.300454, 16.75153): (47.31305, 16.67033),
    ("Vasszentmihály – Fő utca ( Vegyes bolt )", 46.5811, 16.2433): (46.97017, 16.40669),
    ("Vasszentmihály – Petőfi utca", 46.5803, 16.2423): (46.96937, 16.40569),
    ("Viszák – Fő út", 46.5251, 16.2945): (46.88205, 16.49172),
    ("Őrimagyarósd – Dózsa és Ady utca sarka", 46.5318, 16.3208): (46.88531, 16.53305),
}
for s in szigetek:
    key = (s["name"], s["lat"], s["lng"])
    if key in KNOWN_COORD_FIXES:
        s["lat"], s["lng"] = KNOWN_COORD_FIXES[key]

# Néhány naptárbeli település (jellemzően egy nagyobb község külterületi
# része) nem szerepel önálló szigetként semmilyen formában, ezért a fenti
# módszerrel nem kapna koordinátát — ezeknek kézzel, Wikipédia-adat alapján
# adunk meg egy pozíciót.
CALENDAR_COORD_OVERRIDES = {
    "Fertőújlak": (47.6928, 16.845),
    "Horvátzsidány": (47.41028, 16.62611),
    "Kiszsidány": (47.41, 16.63944),
    "Nyárliget": (47.6588, 16.8949),
    "Sopron-Balf": (47.6333, 16.6),
}

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
# 2b) Hulladekudvarok reszletes adatai (nyitvatartas, elfogadott hulladek stb.)
# -- matched to the udvarok list above by nearest GPS coordinate, since the
# two source files don't share a common ID.
# ---------------------------------------------------------------------------
try:
    f_udvar_reszletes = find_one("Hulladekudvarok_reszletes")
except FileNotFoundError:
    f_udvar_reszletes = None

if f_udvar_reszletes:
    df2b = pd.read_excel(f_udvar_reszletes, sheet_name="Hulladékudvarok", header=0)
    df2b.columns = [
        "varmegye", "nev", "cim", "lat", "lng", "uzemelteto", "nyitvatartas",
        "elfogadott", "megjegyzes", "weboldal", "ugyfelszolgalat",
    ]

    def nearest_udvar_index(lat, lng):
        best_i, best_d = None, None
        for i, u in enumerate(udvarok):
            d = (u["lat"] - lat) ** 2 + (u["lng"] - lng) ** 2
            if best_d is None or d < best_d:
                best_i, best_d = i, d
        return best_i, best_d

    matched = 0
    for _, row in df2b.iterrows():
        if pd.isna(row["lat"]) or pd.isna(row["lng"]):
            continue
        idx, dist2 = nearest_udvar_index(float(row["lat"]), float(row["lng"]))
        if idx is None or dist2 > 0.01 ** 2:  # ~1km sanity cap, avoid mismatches
            continue
        udvarok[idx].update({
            "address": str(row["cim"]).strip() if pd.notna(row["cim"]) else None,
            "operator": str(row["uzemelteto"]).strip() if pd.notna(row["uzemelteto"]) else None,
            "hours": str(row["nyitvatartas"]).strip() if pd.notna(row["nyitvatartas"]) else None,
            "accepted": str(row["elfogadott"]).strip() if pd.notna(row["elfogadott"]) else None,
            "note": str(row["megjegyzes"]).strip() if pd.notna(row["megjegyzes"]) else None,
            "website": str(row["weboldal"]).strip() if pd.notna(row["weboldal"]) else None,
            "phone": str(row["ugyfelszolgalat"]).strip() if pd.notna(row["ugyfelszolgalat"]) else None,
        })
        matched += 1
    print(f"hulladékudvar részletek: {matched} párosítva")

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
# 6) Hulladeknaptar -- heti kommunalis nap + konkret szelektiv/zoldhulladek
# datumok, telepulesenkent (CSV forras, opcionalis). A terkephez a mar
# beolvasott 'szigetek' lista telepulesenkenti atlagkoordinatajat hasznaljuk
# -- ahol nincs egyezes sziget-adat, ott a felulet majd elo-geokodolja.
# ---------------------------------------------------------------------------
f_telepulesek = find_one_csv("telepulesek")
f_gyujtes = find_one_csv("gyujtesi_napok")

calendar_towns = []
if f_telepulesek and f_gyujtes:
    df_t = pd.read_csv(f_telepulesek, sep=";", encoding="utf-8-sig")
    df_t.columns = ["telepules", "heti_nap", "megjegyzes"]
    df_t = df_t.dropna(subset=["telepules"])
    df_t = df_t[df_t["telepules"].astype(str).str.strip() != ""]

    df_g = pd.read_csv(f_gyujtes, sep=";", encoding="utf-8-sig")
    df_g.columns = ["telepules", "datum", "tipus"]
    df_g = df_g.dropna(subset=["telepules"])

    town_coords = {}
    for s in szigetek:
        town = s["name"].split(" – ")[0].strip()
        town_coords.setdefault(town, []).append((s["lat"], s["lng"]))

    TYPE_MAP = {"Szelektiv": "szelektiv", "Zoldhulladek": "zoldhulladek"}
    dates_by_town = {}
    for _, row in df_g.iterrows():
        town = str(row["telepules"]).strip()
        tipus = TYPE_MAP.get(str(row["tipus"]).strip())
        datum = str(row["datum"]).strip()
        if tipus and datum:
            dates_by_town.setdefault(town, []).append([datum, tipus])

    matched_coords = 0
    for _, row in df_t.iterrows():
        town = str(row["telepules"]).strip()
        coords = town_coords.get(town)
        if not coords:
            # Néhány kisebb településrész (pl. egy nagyobb város külterületi
            # majorja) a szigetadatban nem önálló "telepules" előtagként,
            # hanem a közterület-mezőben szerepel (pl. "Kapuvár – Öntésmajor,
            # Szövetkezeti bolt"). Ilyenkor a teljes szigetnév alapján
            # keresünk rá a település nevére.
            substr_matches = [(s["lat"], s["lng"]) for s in szigetek if town in s["name"]]
            if substr_matches:
                coords = substr_matches
        megjegyzes = row["megjegyzes"]
        entry = {
            "name": town,
            "communalDay": str(row["heti_nap"]).strip(),
            "note": str(megjegyzes).strip() if pd.notna(megjegyzes) and str(megjegyzes).strip() else None,
            "dates": sorted(dates_by_town.get(town, [])),
        }
        if coords:
            entry["lat"] = round(sum(c[0] for c in coords) / len(coords), 5)
            entry["lng"] = round(sum(c[1] for c in coords) / len(coords), 5)
            matched_coords += 1
        elif town in CALENDAR_COORD_OVERRIDES:
            entry["lat"], entry["lng"] = CALENDAR_COORD_OVERRIDES[town]
            matched_coords += 1
        calendar_towns.append(entry)

    total_dates = sum(len(t["dates"]) for t in calendar_towns)
    print(f"hulladéknaptár: {len(calendar_towns)} település ({matched_coords} koordinátával), {total_dates} dátum")
else:
    print("hulladéknaptár CSV-k nem találhatók, kihagyva (opcionális)")

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
out.append("// Hulladéknaptár településenként: heti kommunális gyűjtési nap +")
out.append("// konkrét szelektív/zöldhulladék dátumok 2026-ra (STKH Kft. adatai alapján).")
out.append(f"const WASTE_CALENDAR_TOWNS = {json.dumps(calendar_towns, ensure_ascii=False)};")
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
