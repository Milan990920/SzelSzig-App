# SzelSzig App

Egyszerű, statikus, térképes weboldal a **SzelSzig App** bemutatására — Janzsó Milán Gábor
(Soproni Egyetem, Környezetmérnök MSc) diplomamunkájában bemutatott, szelektív
hulladékgyűjtést segítő alkalmazás ötlete alapján.

Nincs szükség build lépésre vagy szerverre: tiszta HTML/CSS/JavaScript, térképként
[Leaflet.js](https://leafletjs.com/) + OpenStreetMap csempék (API kulcs nem kell).

## Funkciók

- **Térkép** – 422 szelektív sziget, 17 hulladékudvar, 694 köztéri kommunális
  gyűjtőedény és 68 TAEG erdei gyűjtőedény, valós GPS-koordinátákkal,
  klaszterezve (nagy kicsinyítésnél összevont, ráközelítve szétbontott
  jelölőkkel), kategóriánként ki/be kapcsolható szűréssel, geolokációval
  ("Hol vagyok?") és útvonaltervezéssel (Google Maps)
- **Hulladéknaptár** – a házhoz menő gyűjtés rendje frakciónként
- **Tippek** – szelektálási jótanácsok anyagtípusonként
- **Rólunk** – a projekt és a diplomamunka háttere

## Tartalom

- `index.html` – az oldal váza (Térkép / Hulladéknaptár / Tippek / Rólunk fülek)
- `css/style.css` – kinézet
- `js/data.js` – **valós** gyűjtőpont-adatok (STKH Kft. / Sopron Holding Zrt. / TAEG Zrt.)
  és a hulladéknaptár/tippek tartalom — generálva a `scripts/build_data.py` szkripttel
- `js/app.js` – térkép inicializálás, klaszterezés, szűrők, geolokáció, tab-váltás
- `assets/logo.png` – a diplomamunkából kinyert eredeti SzelSzig App logó
- `vendor/leaflet/` – helyben tárolt Leaflet könyvtár (nem függ külső CDN-től)
- `vendor/leaflet.markercluster/` – helyben tárolt marker-klaszterező könyvtár
- `scripts/build_data.py` – Excel → `js/data.js` konverter (lásd lent)

## Helyi megnyitás

```bash
python3 -m http.server 8000
# majd nyisd meg: http://localhost:8000
```

## Közzététel (GitHub Pages) — 1 perces beállítás

1. A repó **Settings** fülén menj a **Pages** menüpontra
2. **Source**: válaszd a **"Deploy from a branch"** opciót
3. **Branch**: `main`, mappa: **`/ (root)`**
4. **Save**

Ezután néhány percen belül élesedik az oldal a `https://milan990920.github.io/SzelSzig-App/`
címen (a pontos URL a Pages beállítások oldalán is megjelenik, miután elmentetted).

## Adatok frissítése

A `js/data.js` a `scripts/build_data.py` szkripttel készül, öt Excel forrásfájlból:

- `Szelszig_adat_összesítő.xlsx` (`Szigetek GPS` és `STKH Hulladékudvar` munkalapok) –
  szelektív szigetek és hulladékudvarok, kizárólag az STKH Kft. szolgáltatási területére
  szűrve (a "Terület" oszlop `STKH`-val kezdődő sorai)
- `App_Kommunális_edények.xlsx` – köztéri kommunális gyűjtőedények
- `TAEG_2_Szerkesztett.xlsx` – TAEG Zrt. erdészeti/turisztikai kommunális edényei

A szkript a forrás Excel fájlokat nem tartalmazza a repóban (ezek a felhasználó saját,
STKH Kft./Sopron Holding Zrt. által biztosított munkafájljai). Frissítéshez:

1. Tedd a friss Excel fájlokat egy mappába, és állítsd be az `SRC` elérési utat a
   `scripts/build_data.py` tetején.
2. Futtasd: `python3 scripts/build_data.py` — ez felülírja a `js/data.js` fájlt.
3. A hulladéknaptár (`SZELSZIG_CALENDAR`) és a tippek (`SZELSZIG_TIPS`) egyelőre kézzel
   szerkesztett tartalom a `js/data.js` alján — a valós, utcára pontos naptárhoz még
   szükséges egy külön STKH Kft. adatforrás bekötése.

**Adatminőségi megjegyzés:** a forrás Excelekben 2 szigetsor és 2 másik sor koordinátája
értelmezhetetlen/hibás volt (pl. szélesség=hosszúság, vagy hiányzó számjegy) — ezeket a
szkript automatikusan kihagyja, hibás pontot nem jelenít meg a térkép.
