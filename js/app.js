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
    `<b>${p.name}</b><br>Köztéri kommunális gyűjtőedény${p.type ? ` <span class="frac">${p.type}</span>` : ""}${routeLink(p)}`
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
  return `<b>${p.name}</b><br>${p.county || ""}
    <details class="popup-details"><summary>Nyitvatartás és feltételek</summary>
      <p>${HULLADEKUDVAR_INFO.hours}</p>
      <p><b>Elfogadott hulladék:</b> ${HULLADEKUDVAR_INFO.accepted}</p>
      <p><b>Feltétel:</b> ${HULLADEKUDVAR_INFO.condition}</p>
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

function setupReportForm() {
  const form = document.getElementById("report-form");
  const photoInput = document.getElementById("report-photo");
  const preview = document.getElementById("report-photo-preview");
  const locateBtn = document.getElementById("report-locate-btn");
  const locationText = document.getElementById("report-location-text");

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
    <div class="sorting-card" data-category="${s.category}" style="border-top-color:${s.color}">
      <h3>${s.category}${s.tagline ? ` <span class="sorting-tagline">${s.tagline}</span>` : ""}</h3>
      <div class="sorting-col">
        <p class="sorting-heading sorting-yes">✔ Tedd bele!</p>
        <ul>${s.accept.map((i) => `<li>${i.icon} ${i.text}</li>`).join("")}</ul>
      </div>
      <div class="sorting-col">
        <p class="sorting-heading sorting-no">✘ Ne tedd bele!</p>
        <ul>${s.reject.map((i) => `<li>${i.icon} ${i.text}</li>`).join("")}</ul>
      </div>
    </div>`
  ).join("");
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

function selectSortingItem(text) {
  const data = SORTING_INDEX.get(text);
  if (!data) return;

  const resultBox = document.getElementById("sorting-result");
  resultBox.hidden = false;
  resultBox.innerHTML = `
    <span class="sorting-result-icon">${data.icon}</span>
    <div>
      <div class="sorting-result-title">${text}</div>
      <div class="sorting-result-pills">
        ${data.matches
          .map(
            (m) =>
              `<span class="sorting-pill ${m.status === "accept" ? "pill-yes" : "pill-no"}" style="--pill-color:${m.color}">
                ${m.status === "accept" ? "✔" : "✘"} ${m.category}${m.status === "reject" ? " – ide NE" : ""}
              </span>`
          )
          .join("")}
      </div>
    </div>`;

  document.querySelectorAll(".sorting-card").forEach((card) => {
    const match = data.matches.some((m) => m.category === card.dataset.category);
    card.classList.toggle("sorting-card-highlight", match);
    card.classList.toggle("sorting-card-dim", !match);
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
}

function renderCalendar() {
  const tbody = document.getElementById("calendar-body");
  tbody.innerHTML = SZELSZIG_CALENDAR.map(
    (row) => `
    <tr>
      <td><span class="frac-pill"><span class="dot" style="background:${row.color}"></span>${row.fraction}</span></td>
      <td>${row.day}</td>
    </tr>`
  ).join("");
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
    });
  });
}

function setupFilters() {
  document.querySelectorAll(".filter-chip").forEach((chip) => {
    chip.addEventListener("click", () => toggleCategory(chip.dataset.cat));
  });
  document.getElementById("locate-btn").addEventListener("click", locateMe);
}

document.addEventListener("DOMContentLoaded", () => {
  initMap();
  renderCalendar();
  renderTips();
  setupTabs();
  setupFilters();
  setupAddressSearch();
  setupReportForm();
  setupCampus();
});
