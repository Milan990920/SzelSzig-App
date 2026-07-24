/**
 * Példa / demó adatok a SzelSzig App weboldalhoz.
 *
 * FONTOS: Ezek NEM valódi, hivatalos STKH Kft. / Sopron Holding Zrt. adatok,
 * csupán illusztrációs célú, hozzávetőleges koordináták, hogy a térkép
 * működése bemutatható legyen. Éles használat előtt ezt a fájlt kell majd
 * lecserélni a szolgáltatóktól kapott valódi adatgyűjteményre (lásd README).
 */

const SZELSZIG_DATA = {
  szigetek: [
    { name: "Fő tér – szelektív sziget", lat: 47.6853, lng: 16.5845, fractions: ["papír", "műanyag", "üveg", "fém"] },
    { name: "Deák tér – szelektív sziget", lat: 47.6892, lng: 16.5799, fractions: ["papír", "műanyag", "üveg"] },
    { name: "Kurucdomb – szelektív sziget", lat: 47.6924, lng: 16.5748, fractions: ["papír", "műanyag", "fém"] },
    { name: "Jereván lakótelep – szelektív sziget", lat: 47.6748, lng: 16.6052, fractions: ["papír", "műanyag", "üveg", "fém"] },
    { name: "Győri úti sziget", lat: 47.6923, lng: 16.6003, fractions: ["műanyag", "üveg"] },
    { name: "Balfi úti sziget", lat: 47.6796, lng: 16.6018, fractions: ["papír", "műanyag", "fém"] },
    { name: "Tómalom – szelektív sziget", lat: 47.6648, lng: 16.5702, fractions: ["papír", "üveg"] },
    { name: "Lővér körúti sziget", lat: 47.6742, lng: 16.5924, fractions: ["papír", "műanyag", "üveg", "fém"] },
    { name: "Vasútállomás melletti sziget", lat: 47.6807, lng: 16.5924, fractions: ["műanyag", "fém"] },
    { name: "Soproni Egyetem – szelektív sziget", lat: 47.6873, lng: 16.5789, fractions: ["papír", "műanyag", "üveg", "fém"] },
  ],
  udvarok: [
    { name: "STKH Zöldudvar – Sopron I.", lat: 47.6775, lng: 16.6080, open: "K, Cs, Szo: 8:00–15:00 (leadás 14:45-ig)" },
    { name: "STKH Zöldudvar – Sopron II.", lat: 47.6960, lng: 16.5860, open: "K, Cs, Szo: 8:00–15:00 (leadás 14:45-ig)" },
    { name: "STKH Zöldudvar – Sopron III.", lat: 47.6690, lng: 16.5830, open: "K, Cs, Szo: 8:00–15:00 (leadás 14:45-ig)" },
    { name: "STKH Zöldudvar – Sopron IV.", lat: 47.6840, lng: 16.6070, open: "K, Cs, Szo: 8:00–15:00 (leadás 14:45-ig)" },
  ],
  edenyek: [
    { name: "Közterületi gyűjtőedény – Várkerület", lat: 47.6838, lng: 16.5883 },
    { name: "Közterületi gyűjtőedény – Ógabona tér", lat: 47.6858, lng: 16.5820 },
    { name: "Közterületi gyűjtőedény – Erzsébet-kert", lat: 47.6828, lng: 16.5862 },
    { name: "Közterületi gyűjtőedény – Petőfi tér", lat: 47.6875, lng: 16.5900 },
    { name: "Közterületi gyűjtőedény – Lővér uszoda", lat: 47.6715, lng: 16.5960 },
    { name: "Közterületi gyűjtőedény – Egyetem tér", lat: 47.6868, lng: 16.5778 },
  ],
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
    icon: "📦",
    tips: [
      "Lapítsd össze a kartondobozokat, így kevesebb helyet foglalnak.",
      "A zsíros, élelmiszertől szennyezett papír (pl. pizzásdoboz alja) nem újrahasznosítható.",
      "A tépőzáras, fóliázott papírokat (pl. egyes füzetborítók) inkább a kommunálisba dobd.",
    ],
  },
  {
    fraction: "Műanyag",
    color: "#f5a623",
    icon: "🥤",
    tips: [
      "Öblítsd ki az ételmaradékot, italmaradékot a flakonokból, dobozokból.",
      "A PET palackokat érdemes összenyomni – kivéve, ha REpontra viszed vissza (ott ne tapossd laposra)!",
      "A vegyes anyagú csomagolás (pl. alufóliás chipszacskó) sajnos jellemzően nem szelektálható.",
    ],
  },
  {
    fraction: "Üveg",
    color: "#2e8b57",
    icon: "🍾",
    tips: [
      "A kupakot és a fém záróelemet külön gyűjtsd (fém frakció).",
      "A síküveg (pl. ablaküveg, tükör) nem kerülhet az üveg szigetre, ez hulladékudvarba való.",
      "A törött üveget becsomagolva, jelölve dobd ki, hogy senki ne sérüljön meg.",
    ],
  },
  {
    fraction: "Fém",
    color: "#9b59b6",
    icon: "🥫",
    tips: [
      "Az alumínium italos dobozokat a REpontokon 2-5 Ft-ért vissza is válthatod.",
      "A konzervdobozokat érdemes kiöblíteni és lehetőség szerint összelapítani.",
      "A veszélyes anyagot tartalmazó fém göngyölegek (pl. festékes doboz) hulladékudvarba valók.",
    ],
  },
];
