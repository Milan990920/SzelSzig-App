// SzelSzig App – egyszerű, statikus térképes weboldal
// Térkép motor: Leaflet.js + Leaflet.markercluster + OpenStreetMap csempék
// (nincs szükség API kulcsra). A pontok klaszterezve jelennek meg, hogy nagy
// kicsinyítésnél is átlátható maradjon a térkép (ahogy a diplomamunka is leírja).

const SOPRON_CENTER = [47.6817, 16.5845];

// Ide érkeznének a hibabejelentések. Demó/statikus oldalon nincs szerver, ezért
// mailto-val nyitjuk meg a bejelentést -- éles bevezetésnél ezt egy valódi
// ügyfélszolgálati rendszerhez kötött backend váltaná ki.
const REPORT_EMAIL = "ugyfelszolgalat@stkh.hu";

const CATEGORY_META = {
  szigetek: { label: "Szelektív szigetek", color: "#00acc1" },
  udvarok: { label: "Hulladékudvarok", color: "#c0392b" },
  edenyek: { label: "Kommunális edények", color: "#5b6f73" },
  taeg: { label: "TAEG erdei edények", color: "#6b8e23" },
};

let map;
let userMarker;
const layerGroups = {};
const activeCategories = new Set(Object.keys(CATEGORY_META));

function clusterIcon(color) {
  return (cluster) => {
    const count = cluster.getChildCount();
    const size = count < 25 ? 34 : count < 100 ? 42 : 50;
    return L.divIcon({
      html: `<div style="
        width:${size}px;height:${size}px;border-radius:50%;
        background:${color}cc;border:2px solid #fff;color:#fff;
        display:flex;align-items:center;justify-content:center;
        font-weight:700;font-size:${count < 100 ? 13 : 12}px;
        box-shadow:0 2px 6px rgba(0,0,0,.35);">${count}</div>`,
      className: "",
      iconSize: [size, size],
    });
  };
}

function initMap() {
  map = L.map("map", { scrollWheelZoom: true }).setView(SOPRON_CENTER, 12);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap közreműködők",
  }).addTo(map);

  Object.keys(CATEGORY_META).forEach((key) => {
    layerGroups[key] = L.markerClusterGroup({
      iconCreateFunction: clusterIcon(CATEGORY_META[key].color),
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      maxClusterRadius: 50,
    });
    map.addLayer(layerGroups[key]);
  });

  addMarkers("szigetek", SZELSZIG_DATA.szigetek, szigetPopup);

  addMarkers("udvarok", SZELSZIG_DATA.udvarok, udvarPopup);

  addMarkers("edenyek", SZELSZIG_DATA.edenyek, (p) =>
    `<b>${p.name}</b><br>Köztéri kommunális gyűjtőedény${routeLink(p)}`
  );

  addMarkers("taeg", SZELSZIG_DATA.taeg, (p) =>
    `<b>${p.name}</b><br>TAEG erdészeti/turisztikai kommunális gyűjtőedény${routeLink(p)}`
  );
}

function szigetPopup(p) {
  const fracPills = p.fractions.length
    ? p.fractions.map((f) => `<span class="frac">${f}</span>`).join("")
    : "<em>nincs adat</em>";
  const acceptedItems = p.fractions
    .filter((f) => FRACTION_ACCEPTED[f])
    .map((f) => `<li><b>${f}:</b> ${FRACTION_ACCEPTED[f]}</li>`)
    .join("");
  const details = acceptedItems
    ? `<details class="popup-details"><summary>Mit dobhatok bele?</summary><ul class="accepted-list">${acceptedItems}</ul></details>`
    : "";
  return `<b>${p.name}</b><br>${p.area ? `<span style="color:#5b6f73">${p.area}</span><br>` : ""}Gyűjthető: ${fracPills}${details}${routeLink(p)}`;
}

function udvarPopup(p) {
  const hours = p.hours || HULLADEKUDVAR_INFO.hours;
  const accepted = p.accepted || HULLADEKUDVAR_INFO.accepted;
  const extra = [
    p.operator ? `<p><b>Üzemeltető:</b> ${p.operator}</p>` : "",
    p.note ? `<p><b>Megjegyzés:</b> ${p.note}</p>` : "",
    !p.hours && !p.accepted ? `<p><b>Feltétel:</b> ${HULLADEKUDVAR_INFO.condition}</p>` : "",
    p.website ? `<p><a href="${p.website}" target="_blank" rel="noopener">Részletek a szolgáltató oldalán &rarr;</a></p>` : "",
    p.phone ? `<p><b>Ügyfélszolgálat:</b> ${p.phone}</p>` : "",
  ].join("");

  return `<b>${p.name}</b><br>${p.address || p.county || ""}
    <details class="popup-details"><summary>Nyitvatartás és feltételek</summary>
      <p>${hours}</p>
      <p><b>Elfogadott hulladék:</b> ${accepted}</p>
      ${extra}
    </details>${routeLink(p)}`;
}

function routeLink(p) {
  const url = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
  return `<br><a class="route-link" href="${url}" target="_blank" rel="noopener">Útvonalterv indítása &rarr;</a>`;
}

function addMarkers(category, points, popupFn) {
  const color = CATEGORY_META[category].color;
  const markers = points.map((p) => {
    const marker = L.circleMarker([p.lat, p.lng], {
      radius: 8,
      color: "#fff",
      weight: 2,
      fillColor: color,
      fillOpacity: 0.9,
    }).bindPopup(popupFn(p), { maxWidth: 300 });
    return marker;
  });
  layerGroups[category].addLayers(markers);
}

function toggleCategory(category) {
  const chip = document.querySelector(`.filter-chip[data-cat="${category}"]`);
  if (activeCategories.has(category)) {
    activeCategories.delete(category);
    map.removeLayer(layerGroups[category]);
    chip.classList.add("off");
  } else {
    activeCategories.add(category);
    map.addLayer(layerGroups[category]);
    chip.classList.remove("off");
  }
}

function locateMe() {
  if (!navigator.geolocation) {
    alert("A böngésződ nem támogatja a helymeghatározást.");
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      if (userMarker) map.removeLayer(userMarker);
      userMarker = L.marker([latitude, longitude], {
        icon: L.divIcon({
          className: "",
          html: '<div style="background:#2f6fed;width:16px;height:16px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 0 2px #2f6fed;"></div>',
          iconSize: [16, 16],
        }),
      })
        .addTo(map)
        .bindPopup("Te vagy itt")
        .openPopup();
      map.setView([latitude, longitude], 15);
    },
    () => alert("Nem sikerült meghatározni a pozíciódat. Ellenőrizd az engedélyeket."),
    { enableHighAccuracy: true, timeout: 8000 }
  );
}

// ---------------------------------------------------------------------------
// Cím szerinti keresés + legközelebbi gyűjtőpontok
// ---------------------------------------------------------------------------

let searchMarker;

function haversineKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function findNearest(lat, lng, perCategory = 1) {
  const results = [];
  Object.keys(CATEGORY_META).forEach((cat) => {
    const points = SZELSZIG_DATA[cat] || [];
    const withDist = points
      .map((p) => ({ ...p, category: cat, dist: haversineKm(lat, lng, p.lat, p.lng) }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, perCategory);
    results.push(...withDist);
  });
  return results.sort((a, b) => a.dist - b.dist);
}

function renderNearestList(lat, lng) {
  const container = document.getElementById("address-results");
  const nearest = findNearest(lat, lng, 1);
  container.innerHTML = `<ul class="nearest-list">${nearest
    .map((p) => {
      const meta = CATEGORY_META[p.category];
      const distText = p.dist < 1 ? `${Math.round(p.dist * 1000)} m` : `${p.dist.toFixed(1)} km`;
      const url = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
      return `<li class="nearest-item">
        <span><span class="dot" style="background:${meta.color};display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:6px;"></span>${meta.label}: ${p.name}</span>
        <span class="dist"><a href="${url}" target="_blank" rel="noopener">${distText} &rarr;</a></span>
      </li>`;
    })
    .join("")}</ul>`;
}

async function searchAddress(query) {
  const container = document.getElementById("address-results");
  container.innerHTML = `<p class="search-status">Keresés…</p>`;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=hu&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    const data = await res.json();
    if (!data.length) {
      container.innerHTML = `<p class="search-error">Nem található ilyen cím. Próbáld pontosabban megadni (pl. település is szerepeljen benne).</p>`;
      return;
    }
    const { lat, lon } = data[0];
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lon);

    if (searchMarker) map.removeLayer(searchMarker);
    searchMarker = L.marker([latNum, lngNum], {
      icon: L.divIcon({
        className: "",
        html: '<div style="background:#e91e63;width:18px;height:18px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);border:2px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,.4);"></div>',
        iconSize: [18, 18],
      }),
    })
      .addTo(map)
      .bindPopup(`Keresett cím: ${data[0].display_name}`)
      .openPopup();
    map.setView([latNum, lngNum], 15);

    renderNearestList(latNum, lngNum);
  } catch (err) {
    container.innerHTML = `<p class="search-error">A keresés nem sikerült (hálózati hiba). Próbáld újra.</p>`;
  }
}

function setupAddressSearch() {
  const form = document.getElementById("address-form");
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const query = document.getElementById("address-input").value.trim();
    if (!query) return;
    searchAddress(query.toLowerCase().includes("sopron") ? query : `${query}, Sopron`);
  });
}

// ---------------------------------------------------------------------------
// Hibabejelentés
// ---------------------------------------------------------------------------

let reportLocation = null;
let reportActiveType = "waste";

const REPORT_TYPE_OPTIONS = {
  waste: [
    "Sérült gyűjtőedény",
    "Nagyobb mennyiségű szemetelés",
    "Szemetelés",
    "Tele / túltöltött edény",
    "Illegális hulladéklerakás",
    "Egyéb hulladékkezelési probléma",
  ],
  app: ["Fejlesztési javaslat", "Hibajavítási javaslat", "Egyéb app visszajelzés"],
};

const REPORT_TYPE_TEXT = {
  waste: {
    lead: "Sérült gyűjtőedényt, tele konténert vagy illegális hulladéklerakást láttál? Jelentsd be fotóval és helyszínnel — ez segít a szolgáltatónak gyorsabban reagálni, telefonos ügyfélszolgálat nélkül.",
    submitLabel: "Bejelentés elküldése",
    note: "Ez a demó verzió a bejelentést egy előkészített e-mailben nyitja meg (nincs még saját szerver mögötte) — a <strong>fényképet ilyenkor kézzel kell csatolni</strong> a kiküldés előtt. Éles bevezetésnél ez egyenesen a szolgáltató ügyfélszolgálati rendszerébe futna be, fotóval és GPS-pozícióval együtt, kézi lépés nélkül.",
  },
  app: {
    lead: "Hiányzik egy funkció, hibát találtál az appban, vagy csak van egy jó ötleted? Írd meg — ez a visszajelzés közvetlenül az app fejlesztéséhez segít, nem a hulladékszállítóhoz megy.",
    submitLabel: "Javaslat elküldése",
    note: "Ez a demó verzió egyelőre nincs bekötve élő postafiókhoz — a fejlesztő hamarosan beállítja a fogadó e-mail címet. Addig is minden ötletet szívesen fogadunk, csak egy kicsit később jut el a fejlesztőhöz.",
  },
};

function setReportType(type) {
  reportActiveType = type;

  document.querySelectorAll(".report-type-btn").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.reportType === type);
  });

  const select = document.getElementById("report-type");
  select.innerHTML = REPORT_TYPE_OPTIONS[type].map((opt) => `<option value="${opt}">${opt}</option>`).join("");

  document.getElementById("report-waste-fields").hidden = type !== "waste";
  document.getElementById("report-app-fields").hidden = type !== "app";

  const text = REPORT_TYPE_TEXT[type];
  document.getElementById("report-lead").textContent = text.lead;
  document.getElementById("report-note").innerHTML = text.note;
  const submitBtn = document.getElementById("report-submit-btn");
  submitBtn.textContent = text.submitLabel;
  submitBtn.classList.toggle("submit-btn-app", type === "app");

  document.getElementById("report-status").hidden = true;
}

function setupReportForm() {
  const form = document.getElementById("report-form");
  const photoInput = document.getElementById("report-photo");
  const preview = document.getElementById("report-photo-preview");
  const locateBtn = document.getElementById("report-locate-btn");
  const locationText = document.getElementById("report-location-text");
  const statusEl = document.getElementById("report-status");

  document.querySelectorAll(".report-type-btn").forEach((btn) => {
    btn.addEventListener("click", () => setReportType(btn.dataset.reportType));
  });
  setReportType("waste");

  photoInput.addEventListener("change", () => {
    const file = photoInput.files[0];
    if (!file) {
      preview.hidden = true;
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      preview.src = e.target.result;
      preview.hidden = false;
    };
    reader.readAsDataURL(file);
  });

  locateBtn.addEventListener("click", () => {
    if (!navigator.geolocation) {
      alert("A böngésződ nem támogatja a helymeghatározást.");
      return;
    }
    locationText.textContent = "Pozíció lekérése…";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        reportLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        locationText.textContent = `Csatolva: ${reportLocation.lat.toFixed(5)}, ${reportLocation.lng.toFixed(5)}`;
      },
      () => {
        locationText.textContent = "Nem sikerült lekérni a pozíciót.";
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const type = document.getElementById("report-type").value;
    const desc = document.getElementById("report-desc").value.trim();

    if (reportActiveType === "app") {
      // Az app-visszajelzéseknek egyelőre nincs beállítva fogadó e-mail cím,
      // ezért ezt még nem küldjük el sehova — csak visszajelzünk a felületen.
      const email = document.getElementById("report-reply-email").value.trim();
      statusEl.hidden = false;
      statusEl.textContent = "Köszönjük az ötletet! 🙌 Ez a demó egyelőre nincs bekötve élő postafiókhoz, de a fejlesztő hamarosan beállítja — addig a beírt szöveg sajnos nem kerül automatikusan elküldésre.";
      console.log("SzelSzig App javaslat (nincs elküldve):", { type, desc, email });
      return;
    }

    const hasPhoto = photoInput.files.length > 0;
    const lines = [
      `Típus: ${type}`,
      `Leírás: ${desc || "(nincs megadva)"}`,
      reportLocation
        ? `Helyszín: ${reportLocation.lat.toFixed(5)}, ${reportLocation.lng.toFixed(5)} — https://www.google.com/maps?q=${reportLocation.lat},${reportLocation.lng}`
        : "Helyszín: nincs csatolva",
      hasPhoto ? "\n(Ne felejtsd el csatolni a kiválasztott fényképet ehhez az e-mailhez!)" : "",
      "\n— Küldve a SzelSzig App hibabejelentő űrlapjáról",
    ];

    const subject = encodeURIComponent(`SzelSzig App hibabejelentés – ${type}`);
    const body = encodeURIComponent(lines.join("\n"));
    window.location.href = `mailto:${REPORT_EMAIL}?subject=${subject}&body=${body}`;
  });
}

// ---------------------------------------------------------------------------
// Egyetem (campus) – épület/szint alaprajzok
// ---------------------------------------------------------------------------

let campusActiveBuilding = CAMPUS_BUILDINGS[0].id;
let campusActiveFloor = CAMPUS_BUILDINGS[0].floors[0].id;

function renderCampusBuildings() {
  const wrap = document.getElementById("campus-buildings");
  wrap.innerHTML = CAMPUS_BUILDINGS.map(
    (b) => `<button class="campus-chip${b.id === campusActiveBuilding ? " active" : ""}" data-building="${b.id}">${b.name}</button>`
  ).join("");
  wrap.querySelectorAll(".campus-chip").forEach((btn) => {
    btn.addEventListener("click", () => {
      campusActiveBuilding = btn.dataset.building;
      const building = CAMPUS_BUILDINGS.find((b) => b.id === campusActiveBuilding);
      campusActiveFloor = building.floors[0].id;
      renderCampusBuildings();
      renderCampusFloors();
    });
  });
}

function renderCampusFloors() {
  const building = CAMPUS_BUILDINGS.find((b) => b.id === campusActiveBuilding);
  const wrap = document.getElementById("campus-floors");
  wrap.innerHTML = building.floors
    .map((f) => `<button class="campus-floor-tab${f.id === campusActiveFloor ? " active" : ""}" data-floor="${f.id}">${f.label}</button>`)
    .join("");
  wrap.querySelectorAll(".campus-floor-tab").forEach((btn) => {
    btn.addEventListener("click", () => {
      campusActiveFloor = btn.dataset.floor;
      renderCampusFloors();
      renderCampusPlan();
    });
  });
  renderCampusPlan();
}

function renderCampusPlan() {
  const building = CAMPUS_BUILDINGS.find((b) => b.id === campusActiveBuilding);
  const floor = building.floors.find((f) => f.id === campusActiveFloor);
  const img = document.getElementById("campus-plan-img");
  img.src = floor.img;
  img.alt = `${building.name} – ${floor.label} alaprajz`;
}

function renderCampusLegend() {
  const wrap = document.getElementById("campus-legend");
  wrap.innerHTML = CAMPUS_LEGEND.map(
    (l) => `<div class="legend-item"><span class="legend-icon">${l.icon}</span><div><b>${l.label}</b><p>${l.desc}</p></div></div>`
  ).join("");
}

function renderCampusSorting() {
  const wrap = document.getElementById("campus-sorting");
  wrap.innerHTML = CAMPUS_SORTING.map(
    (s) => `
    <div class="sorting-card" data-category="${s.category}">
      <div class="sorting-card-head" style="background:${s.color}; color:${readableTextOn(s.color)}">
        <h3>${s.category}</h3>
        ${s.tagline ? `<span class="sorting-tagline">${s.tagline}</span>` : ""}
      </div>
      <div class="sorting-card-body">
        <div class="sorting-col">
          <p class="sorting-heading sorting-yes"><span class="sorting-badge sorting-badge-yes">✓</span>Tedd bele!</p>
          <ul>${s.accept.map((i) => `<li>${i.icon} ${i.text}</li>`).join("")}</ul>
        </div>
        <div class="sorting-col">
          <p class="sorting-heading sorting-no"><span class="sorting-badge sorting-badge-no">✕</span>Ne tedd bele!</p>
          <ul>${s.reject.map((i) => `<li>${i.icon} ${i.text}</li>`).join("")}</ul>
        </div>
      </div>
    </div>`
  ).join("");
}

function setupSortingToggle() {
  const btn = document.getElementById("sorting-toggle-all");
  const grid = document.getElementById("campus-sorting");
  btn.addEventListener("click", () => {
    const open = grid.hidden;
    grid.hidden = !open;
    btn.textContent = open ? "📋 Szabálylisták elrejtése" : "📋 Mutasd mind a három szabálylistát";
    btn.classList.toggle("open", open);
  });
}

// ---------------------------------------------------------------------------
// "Mi hova dobjam?" ikonos kereső
// ---------------------------------------------------------------------------

function buildSortingIndex() {
  const index = new Map(); // text -> { icon, matches: [{category, color, tagline, status}] }
  CAMPUS_SORTING.forEach((s) => {
    ["accept", "reject"].forEach((status) => {
      s[status].forEach((item) => {
        if (!index.has(item.text)) {
          index.set(item.text, { icon: item.icon, matches: [] });
        }
        index.get(item.text).matches.push({ category: s.category, color: s.color, tagline: s.tagline, status });
      });
    });
  });
  return index;
}

const SORTING_INDEX = buildSortingIndex();

function renderSortingIconGrid(filter = "") {
  const wrap = document.getElementById("sorting-icon-grid");
  const norm = filter.trim().toLowerCase();
  const entries = [...SORTING_INDEX.entries()].filter(([text]) => !norm || text.toLowerCase().includes(norm));

  if (!entries.length) {
    wrap.innerHTML = `<p class="search-status">Nincs találat — nézd át a lenti teljes listákat, vagy próbálj más kulcsszót.</p>`;
    return;
  }

  wrap.innerHTML = entries
    .map(([text, data]) => `<button type="button" class="sorting-chip" data-item="${text.replace(/"/g, "&quot;")}"><span class="sorting-chip-icon">${data.icon}</span>${text}</button>`)
    .join("");

  wrap.querySelectorAll(".sorting-chip").forEach((btn) => {
    btn.addEventListener("click", () => selectSortingItem(btn.dataset.item));
  });
}

function readableTextOn(hex) {
  // Egyszerű luminancia-becslés: sötét háttérre fehér, világosra sötét szöveg.
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!m) return "#fff";
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => parseInt(h, 16));
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? "#1c2b2f" : "#ffffff";
}

function selectSortingItem(text) {
  const data = SORTING_INDEX.get(text);
  if (!data) return;

  const resultBox = document.getElementById("sorting-result");
  resultBox.hidden = false;

  // Kategóriánként egy nagy, jól látható doboz — amelyikbe a tétel való, az
  // kiemelve (a saját frakció-színével, zöld kerettel), a többi elhalványítva.
  const binsHtml = CAMPUS_SORTING.map((s) => {
    const match = data.matches.find((m) => m.category === s.category);
    if (match && match.status === "accept") {
      return `<div class="sorting-bin sorting-bin-match" style="--bin-color:${s.color}; --bin-text:${readableTextOn(s.color)}">
        <span class="sorting-bin-name">${s.category}</span>
        <span class="sorting-bin-verdict">✓ Ide dobd!</span>
      </div>`;
    }
    if (match && match.status === "reject") {
      return `<div class="sorting-bin sorting-bin-reject">
        <span class="sorting-bin-name">${s.category}</span>
        <span class="sorting-bin-verdict">✕ Ide NE!</span>
      </div>`;
    }
    return `<div class="sorting-bin sorting-bin-off"><span class="sorting-bin-name">${s.category}</span></div>`;
  }).join("");

  resultBox.innerHTML = `
    <div class="sorting-result-head">
      <span class="sorting-result-icon">${data.icon}</span>
      <div class="sorting-result-title">${text} — hova dobjam?</div>
    </div>
    <div class="sorting-bins">${binsHtml}</div>`;

  document.querySelectorAll(".sorting-card").forEach((card) => {
    const match = data.matches.find((m) => m.category === card.dataset.category);
    card.classList.remove("sorting-card-highlight", "sorting-card-reject", "sorting-card-dim");
    if (match && match.status === "accept") {
      card.classList.add("sorting-card-highlight");
    } else if (match && match.status === "reject") {
      card.classList.add("sorting-card-reject");
    } else {
      card.classList.add("sorting-card-dim");
    }
  });

  resultBox.scrollIntoView({ behavior: "smooth", block: "center" });
}

function setupSortingSearch() {
  const input = document.getElementById("sorting-search-input");
  renderSortingIconGrid();
  input.addEventListener("input", () => renderSortingIconGrid(input.value));
}

function setupCampusLightbox() {
  const planImg = document.getElementById("campus-plan-img");
  const lightbox = document.getElementById("campus-lightbox");
  const lightboxImg = document.getElementById("campus-lightbox-img");
  const closeBtn = document.getElementById("campus-lightbox-close");

  planImg.addEventListener("click", () => {
    lightboxImg.src = planImg.src;
    lightboxImg.alt = planImg.alt;
    lightbox.classList.add("open");
    // Mobilon a kép szélesebb a képernyőnél — nyitáskor vízszintesen
    // középre görgetjük, hogy ne csak a bal szélét lássuk elsőre.
    requestAnimationFrame(() => {
      lightbox.scrollLeft = (lightbox.scrollWidth - lightbox.clientWidth) / 2;
    });
  });
  const close = () => lightbox.classList.remove("open");
  closeBtn.addEventListener("click", close);
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) close();
  });
}

function setupCampus() {
  renderCampusBuildings();
  renderCampusFloors();
  renderCampusLegend();
  renderCampusSorting();
  setupCampusLightbox();
  setupSortingSearch();
  setupSortingToggle();
}

// ---------------------------------------------------------------------------
// Hulladéknaptár – település-kereső + térkép + havi naptár
// ---------------------------------------------------------------------------

const HU_WEEKDAYS = ["Vasárnap", "Hétfő", "Kedd", "Szerda", "Csütörtök", "Péntek", "Szombat"];
const HU_WEEKDAYS_SHORT = ["Va", "Hé", "Ke", "Sze", "Csü", "Pé", "Szo"];
const WEEKDAY_TO_JS = { Vasárnap: 0, Hétfő: 1, Kedd: 2, Szerda: 3, Csütörtök: 4, Péntek: 5, Szombat: 6 };
const HU_MONTHS = ["január", "február", "március", "április", "május", "június", "július", "augusztus", "szeptember", "október", "november", "december"];

// Magyar ábécé szerinti rendezés (az egyszerű string-összehasonlítás az
// ékezetes kezdőbetűs településeket — Á, Ó, Ö, Ő, Ú… — a lista végére dobná).
const HU_COLLATOR = new Intl.Collator("hu", { sensitivity: "base" });

let calMap;
let calMapMarker;
let calSelectedTown = null;
let calViewYear, calViewMonth; // calViewMonth: 0-indexed
let calListMode = "upcoming";
const calGeocodeCache = new Map();

function pad2(n) {
  return String(n).padStart(2, "0");
}

function calTodayStr() {
  const t = new Date();
  return `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`;
}

function normalizeSearch(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function renderTownList(filter = "") {
  const wrap = document.getElementById("cal-town-list");
  const norm = normalizeSearch(filter.trim());
  const towns = WASTE_CALENDAR_TOWNS.filter((t) => !norm || normalizeSearch(t.name).includes(norm)).sort((a, b) =>
    HU_COLLATOR.compare(a.name, b.name)
  );

  wrap.innerHTML =
    towns
      .map((t) => {
        const jsDay = WEEKDAY_TO_JS[t.communalDay];
        const short = jsDay !== undefined ? HU_WEEKDAYS_SHORT[jsDay] : "?";
        const active = calSelectedTown && calSelectedTown.name === t.name ? " active" : "";
        return `<div class="cal-town-row${active}" data-town="${t.name.replace(/"/g, "&quot;")}">
          <span>${t.name}</span>
          <span class="cal-row-right"><span class="dot dot-kommunalis"></span>${short}</span>
        </div>`;
      })
      .join("") || `<p class="search-status">Nincs találat.</p>`;

  wrap.querySelectorAll(".cal-town-row").forEach((row) => {
    row.addEventListener("click", () => selectTown(row.dataset.town));
  });
}

function selectTown(name) {
  const town = WASTE_CALENDAR_TOWNS.find((t) => t.name === name);
  if (!town) return;
  calSelectedTown = town;

  document.getElementById("cal-empty").hidden = true;
  document.getElementById("cal-detail-card").hidden = false;
  document.getElementById("cal-town-name").textContent = town.name;
  document.getElementById("cal-weekday-pill").textContent = `Heti kommunális: ${town.communalDay}`;

  const noteEl = document.getElementById("cal-town-note");
  if (town.note) {
    noteEl.hidden = false;
    noteEl.textContent = town.note;
  } else {
    noteEl.hidden = true;
  }

  renderTownList(document.getElementById("cal-town-search").value);

  const today = new Date();
  calViewYear = today.getFullYear();
  calViewMonth = today.getMonth();
  renderCalMonth();
  renderEventsList();
  updateCalMap();
}

function placeCalMarker(lat, lng, name) {
  if (calMapMarker) calMap.removeLayer(calMapMarker);
  calMapMarker = L.marker([lat, lng]).addTo(calMap).bindPopup(name);
  calMap.setView([lat, lng], 12);
}

function updateCalMap() {
  if (!calMap) {
    calMap = L.map("cal-map", { scrollWheelZoom: false }).setView(SOPRON_CENTER, 9);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap közreműködők",
    }).addTo(calMap);
  }
  setTimeout(() => calMap.invalidateSize(), 50);

  const town = calSelectedTown;

  // Ha van a szigetadatból (kézzel ellenőrzött) koordinánk, azt használjuk —
  // ez megbízhatóbb, mint egy általános névkeresés. Csak azoknál a
  // településeknél kérünk élő helymeghatározást (OpenStreetMap Nominatim,
  // ugyanaz, mint a térkép cím szerinti keresőjénél), ahol nincs saját
  // szigetadat-alapú pozíció.
  if (town.lat && town.lng) {
    placeCalMarker(town.lat, town.lng, town.name);
    return;
  }

  if (calGeocodeCache.has(town.name)) {
    const cached = calGeocodeCache.get(town.name);
    if (cached) placeCalMarker(cached.lat, cached.lng, town.name);
    return;
  }

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=hu&q=${encodeURIComponent(town.name + ", Magyarország")}`;
  fetch(url, { headers: { Accept: "application/json" } })
    .then((r) => r.json())
    .then((data) => {
      if (calSelectedTown !== town) return; // közben másik település lett kiválasztva
      if (data.length) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        calGeocodeCache.set(town.name, { lat, lng });
        placeCalMarker(lat, lng, town.name);
      } else {
        calGeocodeCache.set(town.name, null);
        // nincs jobb találat — marad a becsült (szigetadatból számolt) pozíció, ha volt
      }
    })
    .catch(() => {
      // hálózati hiba — marad a becsült pozíció, ha volt, különben üres marad a térkép
    });
}

function renderCalMonth() {
  const town = calSelectedTown;
  document.getElementById("cal-month-label").textContent = `${calViewYear}. ${HU_MONTHS[calViewMonth]}`;

  const grid = document.getElementById("cal-grid");
  const firstDay = new Date(calViewYear, calViewMonth, 1);
  const daysInMonth = new Date(calViewYear, calViewMonth + 1, 0).getDate();
  const startOffset = (firstDay.getDay() + 6) % 7; // hétfővel kezdve

  const eventsByDate = {};
  town.dates.forEach(([d, type]) => {
    (eventsByDate[d] = eventsByDate[d] || []).push(type);
  });

  const todayStr = calTodayStr();
  const communalJs = WEEKDAY_TO_JS[town.communalDay];

  let html = ["Hé", "Ke", "Sze", "Csü", "Pé", "Szo", "Va"].map((d) => `<div class="cal-weekday-head">${d}</div>`).join("");
  for (let i = 0; i < startOffset; i++) html += `<div class="cal-day empty"></div>`;
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${calViewYear}-${pad2(calViewMonth + 1)}-${pad2(d)}`;
    const jsWeekday = new Date(calViewYear, calViewMonth, d).getDay();
    const dots = [];
    if (communalJs === jsWeekday) dots.push('<span class="dot dot-kommunalis"></span>');
    (eventsByDate[dateStr] || []).forEach((type) => {
      dots.push(`<span class="dot dot-${type === "szelektiv" ? "szelektiv" : "zoldhulladek"}"></span>`);
    });
    html += `<div class="cal-day${dateStr === todayStr ? " today" : ""}"><span>${d}</span><span class="cal-day-dots">${dots.join("")}</span></div>`;
  }
  grid.innerHTML = html;
}

function renderEventsList() {
  const town = calSelectedTown;
  const wrap = document.getElementById("cal-events-list");
  const todayStr = calTodayStr();
  let list = town.dates.slice();
  if (calListMode === "upcoming") list = list.filter(([d]) => d >= todayStr);

  if (!list.length) {
    wrap.innerHTML = `<p class="search-status">${calListMode === "upcoming" ? "Nincs több hátralévő dátum 2026-ban." : "Nincs rögzített dátum."}</p>`;
    return;
  }

  wrap.innerHTML = list
    .map(([d, type]) => {
      const isSzelektiv = type === "szelektiv";
      const label = isSzelektiv ? "Szelektív hulladék" : "Zöldhulladék";
      const [yy, mm, dd] = d.split("-").map(Number);
      const weekday = HU_WEEKDAYS[new Date(yy, mm - 1, dd).getDay()];
      const past = d < todayStr ? " past" : "";
      return `<div class="cal-event-row${past}">
        <span class="dot dot-${isSzelektiv ? "szelektiv" : "zoldhulladek"}"></span>
        <span class="date">${d}</span>
        <span>${label} (${weekday})</span>
      </div>`;
    })
    .join("");
}

function setupWasteCalendar() {
  renderTownList();

  document.getElementById("cal-town-search").addEventListener("input", (e) => renderTownList(e.target.value));

  document.getElementById("cal-prev-month").addEventListener("click", () => {
    calViewMonth--;
    if (calViewMonth < 0) {
      calViewMonth = 11;
      calViewYear--;
    }
    renderCalMonth();
  });
  document.getElementById("cal-next-month").addEventListener("click", () => {
    calViewMonth++;
    if (calViewMonth > 11) {
      calViewMonth = 0;
      calViewYear++;
    }
    renderCalMonth();
  });

  document.querySelectorAll("#cal-toggle button").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("#cal-toggle button").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      calListMode = btn.dataset.mode;
      renderEventsList();
    });
  });
}

function renderTips() {
  const grid = document.getElementById("tips-grid");
  grid.innerHTML = SZELSZIG_TIPS.map(
    (t) => `
    <div class="card">
      <h3><span class="badge" style="background:${t.color}"></span>${t.icon} ${t.fraction}</h3>
      <ul>${t.tips.map((tip) => `<li>${tip}</li>`).join("")}</ul>
    </div>`
  ).join("");
}

function setupTabs() {
  const buttons = document.querySelectorAll("nav.tabs button");
  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
      document.getElementById(btn.dataset.target).classList.add("active");
      if (btn.dataset.target === "view-map") {
        setTimeout(() => map && map.invalidateSize(), 50);
      }
      if (btn.dataset.target === "view-calendar") {
        setTimeout(() => calMap && calMap.invalidateSize(), 50);
      }
    });
  });
}

function setupFilters() {
  document.querySelectorAll(".filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => toggleCategory(chip.dataset.cat));
  });
  document.getElementById("locate-btn").addEventListener("click", locateMe);
}

// ---------------------------------------------------------------------------
// Sötét / világos mód
// ---------------------------------------------------------------------------

function setupThemeToggle() {
  const btn = document.getElementById("theme-toggle");
  const root = document.documentElement;

  let stored = null;
  try {
    stored = localStorage.getItem("szelszig-theme");
  } catch (e) {
    // localStorage nem elérhető (pl. privát böngészés) — marad a rendszerbeállítás
  }
  if (stored === "dark" || stored === "light") {
    root.setAttribute("data-theme", stored);
  }

  function isDark() {
    const explicit = root.getAttribute("data-theme");
    if (explicit === "dark") return true;
    if (explicit === "light") return false;
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function updateIcon() {
    btn.textContent = isDark() ? "☀️" : "🌙";
  }
  updateIcon();

  btn.addEventListener("click", () => {
    const next = isDark() ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try {
      localStorage.setItem("szelszig-theme", next);
    } catch (e) {
      // nem tudjuk elmenteni a választást, de a mostani munkamenetben érvényben marad
    }
    updateIcon();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  setupThemeToggle();
  initMap();
  setupWasteCalendar();
  renderTips();
  setupTabs();
  setupFilters();
  setupAddressSearch();
  setupReportForm();
  setupCampus();
});
