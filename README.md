# SzelSzig App

Egyszerű, statikus, térképes weboldal a **SzelSzig App** bemutatására — Janzsó Milán Gábor
(Soproni Egyetem, Környezetmérnök MSc) diplomamunkájában bemutatott, szelektív
hulladékgyűjtést segítő alkalmazás ötlete alapján.

Nincs szükség build lépésre vagy szerverre: tiszta HTML/CSS/JavaScript, térképként
[Leaflet.js](https://leafletjs.com/) + OpenStreetMap csempék (API kulcs nem kell).

## Funkciók

- **Térkép** – szelektív szigetek, hulladékudvarok és köztéri kommunális gyűjtőedények
  térképen, kategóriánként ki/be kapcsolható jelöléssel, geolokációval ("Hol vagyok?")
  és útvonaltervezéssel (Google Maps)
- **Hulladéknaptár** – a házhoz menő gyűjtés rendje frakciónként
- **Tippek** – szelektálási jótanácsok anyagtípusonként
- **Rólunk** – a projekt és a diplomamunka háttere

## Tartalom

- `index.html` – az oldal váza (Térkép / Hulladéknaptár / Tippek / Rólunk fülek)
- `css/style.css` – kinézet
- `js/data.js` – **példa** gyűjtőpont-adatok és hulladéknaptár/tippek tartalom
- `js/app.js` – térkép inicializálás, szűrők, geolokáció, tab-váltás
- `assets/logo.png` – a diplomamunkából kinyert eredeti SzelSzig App logó
- `vendor/leaflet/` – helyben tárolt Leaflet könyvtár (nem függ külső CDN-től)

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

## Valós adatok bekötése

A `js/data.js`-ben szereplő gyűjtőpontok (szigetek, hulladékudvarok, kommunális
edények) **jelenleg illusztrációs példaadatok**, nem a STKH Kft. / Sopron Holding Zrt.
hivatalos adatai. Éles feltöltéshez:

1. Egyeztetés a STKH Kft.-vel és a Sopron Holding Zrt.-vel az adatok felhasználásáról.
2. A kapott GPS koordináták és gyűjthető frakciók behelyettesítése a
   `SZELSZIG_DATA` objektumba (`js/data.js`).
3. A valós hulladéknaptár (utcánkénti gyűjtési rend) feltöltése a
   `SZELSZIG_CALENDAR` tömbbe, vagy — nagyobb adatmennyiség esetén — külön
   JSON fájlból való betöltésre érdemes átállni.
