/**
 * Soproni Egyetem campus – szelektív hulladékgyűjtési helyszínrajzok.
 *
 * Forrás: a Soproni Egyetem saját, épületenkénti/szintenkénti alaprajzai,
 * amelyeken be vannak jelölve a gyűjtőedények helyei (a felhasználó által
 * biztosított PDF alapján). A rajzok maguk tartalmazzák a bejelölt
 * pontokat és a jelmagyarázatot; ez a fájl csak a böngészéshez szükséges
 * szerkezetet (épület → szint → kép) és a közös, újraépített jelmagyarázatot
 * adja hozzá.
 */

const CAMPUS_BUILDINGS = [{"id": "a", "name": "\"A\" épület", "floors": [{"id": "alagsor", "label": "Alagsor", "img": "assets/campus/a-alagsor.jpg"}, {"id": "foldszint", "label": "Földszint", "img": "assets/campus/a-foldszint.jpg"}, {"id": "1", "label": "I. emelet", "img": "assets/campus/a-1.jpg"}, {"id": "2", "label": "II. emelet", "img": "assets/campus/a-2.jpg"}]}, {"id": "uk", "name": "\"UK\" épület", "floors": [{"id": "foldszint", "label": "Földszint", "img": "assets/campus/uk-foldszint.jpg"}, {"id": "1", "label": "I. emelet", "img": "assets/campus/uk-1.jpg"}, {"id": "2", "label": "II. emelet", "img": "assets/campus/uk-2.jpg"}, {"id": "3", "label": "III. emelet", "img": "assets/campus/uk-3.jpg"}, {"id": "4", "label": "IV. emelet", "img": "assets/campus/uk-4.jpg"}, {"id": "5", "label": "V. emelet", "img": "assets/campus/uk-5.jpg"}, {"id": "6", "label": "VI. emelet", "img": "assets/campus/uk-6.jpg"}, {"id": "7", "label": "VII. emelet", "img": "assets/campus/uk-7.jpg"}]}, {"id": "rk", "name": "\"RK\" épület", "floors": [{"id": "alagsor", "label": "Alagsor", "img": "assets/campus/rk-alagsor.jpg"}, {"id": "foldszint", "label": "Földszint", "img": "assets/campus/rk-foldszint.jpg"}, {"id": "1", "label": "I. emelet", "img": "assets/campus/rk-1.jpg"}, {"id": "2", "label": "II. emelet", "img": "assets/campus/rk-2.jpg"}]}, {"id": "p", "name": "\"P\" épület", "floors": [{"id": "foldszint", "label": "Földszint", "img": "assets/campus/p-foldszint.jpg"}, {"id": "1", "label": "I. emelet", "img": "assets/campus/p-1.jpg"}, {"id": "2", "label": "II. emelet", "img": "assets/campus/p-2.jpg"}]}, {"id": "diakszallo", "name": "Diákszálló", "floors": [{"id": "pinceszint", "label": "Pinceszint", "img": "assets/campus/diakszallo-pinceszint.jpg"}, {"id": "foldszint", "label": "Földszint", "img": "assets/campus/diakszallo-foldszint.jpg"}, {"id": "altalanos", "label": "Általános emelet", "img": "assets/campus/diakszallo-altalanos.jpg"}, {"id": "4", "label": "4. emelet", "img": "assets/campus/diakszallo-4.jpg"}]}, {"id": "nrrc", "name": "\"NRRC\" épület", "floors": [{"id": "foldszint", "label": "Földszint", "img": "assets/campus/nrrc-foldszint.jpg"}, {"id": "1", "label": "I. emelet", "img": "assets/campus/nrrc-1.jpg"}, {"id": "2", "label": "II. emelet", "img": "assets/campus/nrrc-2.jpg"}, {"id": "3", "label": "III. emelet", "img": "assets/campus/nrrc-3.jpg"}]}, {"id": "ligneum", "name": "Ligneum", "floors": [{"id": "alagsor", "label": "Alagsor", "img": "assets/campus/ligneum-alagsor.jpg"}, {"id": "foldszint", "label": "Földszint", "img": "assets/campus/ligneum-foldszint.jpg"}, {"id": "1", "label": "I. emelet", "img": "assets/campus/ligneum-1.jpg"}]}, {"id": "bpk", "name": "\"BPK\" kollégium", "floors": [{"id": "foldszint", "label": "Földszint", "img": "assets/campus/bpk-foldszint.jpg"}]}, {"id": "bak", "name": "\"BAK\" kollégium", "floors": [{"id": "1", "label": "I. emelet", "img": "assets/campus/bak-1.jpg"}, {"id": "2", "label": "II. emelet", "img": "assets/campus/bak-2.jpg"}, {"id": "3", "label": "III. emelet", "img": "assets/campus/bak-3.jpg"}, {"id": "4", "label": "IV. emelet", "img": "assets/campus/bak-4.jpg"}]}, {"id": "c", "name": "\"C\" épület", "floors": [{"id": "alagsor", "label": "Alagsor", "img": "assets/campus/c-alagsor.jpg"}, {"id": "foldszint", "label": "Földszint", "img": "assets/campus/c-foldszint.jpg"}, {"id": "1", "label": "I. emelet", "img": "assets/campus/c-1.jpg"}]}];

// A helyszínrajzokon szereplő jelmagyarázat (újraépítve a saját stílusban)
const CAMPUS_LEGEND = [
  { icon: "🗑️", label: "Papír, műanyag, kommunális gyűjtőedények", desc: "Beltéri, elkülönített gyűjtésre alkalmas edénysor (folyosón, közösségi térben)." },
  { icon: "🪣", label: "Kültéri kommunális konténer", desc: "Épület melletti nagyméretű kommunális hulladékgyűjtő." },
  { icon: "♻️", label: "Kültéri szelektív sziget", desc: "Épület melletti szabadtéri szelektív gyűjtőpont (papír/műanyag/üveg)." },
  { icon: "🛢️", label: "Olajgyűjtő", desc: "Használt étolaj vagy motorolaj leadására szolgáló edény." },
  { icon: "🌿", label: "Biohulladék gyűjtő", desc: "Konyhai/zöld biohulladék gyűjtésére szolgáló edény." },
  { icon: "🗑", label: "Kommunális gyűjtő", desc: "Nem szelektálható, vegyes kommunális hulladék gyűjtője." },
];

// "Hova dobjam?" – a Soproni Egyetem 3R (Reduce, Reuse, Recycle) programjának
// tájékoztatója alapján (a felhasználó saját tervezésű plakátja)
const CAMPUS_SORTING = [
  {
    category: "Kommunális hulladék",
    color: "#2b2b2b",
    accept: [
      "Használt papír zsebkendő, szalvéta",
      "Kéztörlő papír",
      "Egyszer használatos kávés-, üdítőspohár",
      "Kávékapszula",
      "Zsíros, olajos, ételmaradékos ételcsomagolás",
      "Felvágott csomagoló, darabolt felvágottas műanyag tálca",
      "Szívószál",
      "Csokoládépapír",
      "Tabletta/gyógyszer üres tartója",
      "Befőttes gumi, befőttesüveg fedele",
      "Blokk (hőpapír)",
      "Légpárnás boríték",
      "Ételmaradékok, gyümölcshéjak",
    ],
    reject: ["Veszélyes hulladék (pl. elem, villanykörte, LED izzó, vegyszer, gyógyszer stb.)", "Minden más ami szelektíven gyűjthető"],
  },
  {
    category: "Műanyag",
    color: "#e8b800",
    tagline: "Tisztán, lapítva!",
    accept: [
      "PET palack (ásványvizes, üdítős flakon)",
      "Fólia, frissentartó fólia",
      "Nejlonzacskó, műanyagszatyor",
      "Tejes és üdítős doboz (TETRAPAK)",
      "Aludoboz (sörös-, energiaitalos-, konzervdoboz)",
      "Alufólia",
      "Előöblített ételes és mosószeres flakonok",
    ],
    reject: [
      "Zsíros, olajos, festékes, vegyszeres flakon",
      "Hungarocell és polipropilén (PP) ételtartó doboz (éttermi)",
      "Nem csomagolási eredetű műanyaghulladék",
    ],
  },
  {
    category: "Papír",
    color: "#2f6fed",
    accept: [
      "Irodai papír, tűzőkapcsos papírköteg",
      "Kartondoboz (lapítva)",
      "Hullámpapír",
      "Újságpapír",
      "Szórólap",
      "Prospektus",
      "Ablakos boríték",
    ],
    reject: ["Használt papír zsebkendő, szalvéta", "Kéztörlő papír", "Zsíros, olajos papír", "Matrica"],
  },
];
