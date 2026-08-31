# SzelSzig App

Egyszerű, statikus, térképes weboldal a **SzelSzig App** bemutatására — Janzsó Milán Gábor
(Soproni Egyetem, Környezetmérnök MSc) diplomamunkájában bemutatott, szelektív
hulladékgyűjtést segítő alkalmazás ötlete alapján.

Nincs szükség build lépésre vagy szerverre: tiszta HTML/CSS/JavaScript, térképként
[Leaflet.js](https://leafletjs.com/) + OpenStreetMap csempék (API kulcs nem kell).

## Funkciók

- **Térkép** – 422 szelektív sziget, 17 hulladékudvar (részletes nyitvatartással,
  elfogadott hulladékfajtákkal, üzemeltetői elérhetőséggel), 694 köztéri kommunális
  gyűjtőedény és 68 TAEG erdei gyűjtőedény, valós GPS-koordinátákkal,
  klaszterezve (nagy kicsinyítésnél összevont, ráközelítve szétbontott
  jelölőkkel), kategóriánként ki/be kapcsolható szűréssel, geolokációval
  ("Hol vagyok?"), cím szerinti kereséssel és útvonaltervezéssel (Google Maps)
- **Hulladéknaptár** – a házhoz menő gyűjtés rendje frakciónként
- **Tippek** – szelektálási jótanácsok anyagtípusonként
- **Hibabejelentés** – sérült/tele edény vagy illegális lerakás bejelentése fotóval és helyszínnel
- **Egyetem** – a Soproni Egyetem 10 épületének/38 szintjének gyűjtőpont-alaprajzai,
  jelmagyarázattal és egy ikonos, kereshető "Hova dobjam?" útmutatóval
- **Rólunk** – a projekt és a diplomamunka háttere

## Tartalom

- `index.html` – az oldal váza (Térkép / Hulladéknaptár / Tippek / Hibabejelentés / Egyetem / Rólunk fülek)
- `css/style.css` – kinézet
- `js/data.js` – **valós** gyűjtőpont-adatok (STKH Kft. / Sopron Holding Zrt. / TAEG Zrt.)
  és a hulladéknaptár/tippek tartalom — generálva a `scripts/build_data.py` szkripttel
- `js/campus.js` – a Soproni Egyetem campus alaprajzai, jelmagyarázata és a "Hova dobjam?" adatok
- `js/app.js` – térkép inicializálás, klaszterezés, szűrők, geolokáció, keresések, tab-váltás
- `assets/logo.png` – a diplomamunkából kinyert eredeti SzelSzig App logó
- `assets/campus/` – a Soproni Egyetem épület-alaprajzai (tömörített JPEG-ek)
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

A `js/data.js` a `scripts/build_data.py` szkripttel készül, az alábbi Excel forrásfájlokból:

- `Szelszig_adat_összesítő.xlsx` (`Szigetek GPS` és `STKH Hulladékudvar` munkalapok) –
  szelektív szigetek és hulladékudvarok, kizárólag az STKH Kft. szolgáltatási területére
  szűrve (a "Terület" oszlop `STKH`-val kezdődő sorai)
- `App_Kommunális_edények.xlsx` – köztéri kommunális gyűjtőedények
- `TAEG_2_Szerkesztett.xlsx` – TAEG Zrt. erdészeti/turisztikai kommunális edényei
- `Szelektív_szigetek_gyűjtési_szabályai...xlsx` – frakciónkénti "mit dobhatok bele?" szabályzat
- `Hulladekudvarok_reszletes.xlsx` *(opcionális)* – hulladékudvaronkénti nyitvatartás,
  elfogadott hulladékfajták, üzemeltető és elérhetőség; GPS-koordináta alapján párosítva
  a fenti hulladékudvar-listával. **Megjegyzés:** ez a fájl nem közvetlen STKH-adatszolgáltatás,
  hanem nyilvános közlemények/honlapok alapján összeállított kutatás (2026.07.27-i állapot) —
  néhány telephelynél maga a forrás is jelzi, hogy a pontos nyitvatartást a linken érdemes
  ellenőrizni, ezt a figyelmeztetést a felület is megjeleníti.
- `telepulesek.csv` *(opcionális, `;` elválasztóval)* – oszlopok: `telepules`, `heti_nap`
  (a heti kommunális gyűjtés napja), `megjegyzes` (pl. ha egy településen körzetenként/
  utcánként eltér a rend). Ez adja a Hulladéknaptár település-listáját.
- `gyujtesi_napok.csv` *(opcionális, `;` elválasztóval)* – oszlopok: `telepules`, `datum`
  (ÉÉÉÉ-HH-NN), `tipus` (`Szelektiv` vagy `Zoldhulladek`). Ez az STKH Kft. 2026-os
  gyűjtési naptárának soronkénti bontása, ebből épül fel az egyes települések
  szelektív/zöldhulladék dátumlistája.

A szkript a forrás Excel/CSV fájlokat nem tartalmazza a repóban (ezek a felhasználó saját,
STKH Kft./Sopron Holding Zrt. által biztosított munkafájljai). Frissítéshez:

1. Tedd a friss Excel és CSV fájlokat egy mappába, és állítsd be az `SRC` elérési utat a
   `scripts/build_data.py` tetején.
2. Futtasd: `python3 scripts/build_data.py` — ez felülírja a `js/data.js` fájlt.
3. A `telepulesek.csv` + `gyujtesi_napok.csv` alapján épül fel a `WASTE_CALENDAR_TOWNS`
   tömb (Hulladéknaptár funkció). A térképi koordinátákat a szkript a már meglévő
   szelektívsziget-adatokból próbálja kitalálni: elsőként azonos településnevű szigetek
   GPS-pozícióinak átlagolásával, másodikként (ha ez nem talál egyezést — pl. egy
   nagyobb város külterületi majorja/településrésze, ami a szigetadatban nem önálló
   előtagként szerepel) a teljes szigetnévben való kereséssel. Amelyik településhez így
   sem található koordináta, ott a felület a térkép megnyitásakor a meglévő
   címkereséshez hasonlóan, a háttérben lekérdezi a település koordinátáit (OpenStreetMap
   Nominatim szolgáltatással). Ez kb. 213 településből kb. 181-nél talál rögtön
   koordinátát, a többinél az élő oldalon futásidőben történik a keresés.
4. **Fontos adatminőségi hiba (2026.08, javítva):** kiderült, hogy a forrás Excel
   "Szigetek GPS" munkalapján egy nagyobb, Vas megyei településcsoport (Szentgotthárd,
   Körmend és Vasvár térsége — kb. 60 település) szigeteinek koordinátája egy közel
   egységes, kb. 20-50 km-es eltolással volt rögzítve (a települések egymáshoz képest
   nagyjából jó helyen voltak, csak az egész csoport rossz helyre került). Ezt a
   `KNOWN_COORD_FIXES` szótár javítja a szkriptben, Wikipédia-adatok alapján
   ellenőrizve — a kulcs a sziget neve ÉS az eredeti (hibás) koordinátája együtt, mert
   néhány település több szigete azonos névvel, eltérő koordinátával szerepel a
   forrásban. Az 5 olyan naptárbeli település (pl. Fertőújlak, Sopron-Balf), amelyiknek
   egyáltalán nincs önálló szigetadata, a `CALENDAR_COORD_OVERRIDES` szótárban kap
   kézzel megadott koordinátát. Ha további hibás pontot találsz, ide vegyél fel egy új
   bejegyzést — érdemes a `js/data.js`-ben és a forrás Excelben egyaránt javítani.
5. A tippek (`SZELSZIG_TIPS`) egyelőre kézzel szerkesztett tartalom a `js/data.js` alján.

**Adatminőségi megjegyzés:** a forrás Excelekben 2 szigetsor és 2 másik sor koordinátája
értelmezhetetlen/hibás volt (pl. szélesség=hosszúság, vagy hiányzó számjegy) — ezeket a
szkript automatikusan kihagyja, hibás pontot nem jelenít meg a térkép.
