// SzelSzig App – egyszerű, statikus térképes weboldal
// Térkép motor: Leaflet.js + Leaflet.markercluster + OpenStreetMap csempék
// (nincs szükség API kulcsra). A pontok klaszterezve jelennek meg, hogy nagy
// kicsinyítésnél is átlátható maradjon a térkép (ahogy a diplomamunka is leírja).

const SOPRON_CENTER = [47.6817, 16.5845];

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

  addMarkers("szigetek", SZELSZIG_DATA.szigetek, (p) =>
    `<b>${p.name}</b><br>${p.area ? `<span style="color:#5b6f73">${p.area}</span><br>` : ""}Gyűjthető: ${
      p.fractions.length ? p.fractions.map((f) => `<span class="frac">${f}</span>`).join("") : "<em>nincs adat</em>"
    }${routeLink(p)}`
  );

  addMarkers("udvarok", SZELSZIG_DATA.udvarok, (p) =>
    `<b>${p.name}</b><br>${p.county || ""}${routeLink(p)}`
  );

  addMarkers("edenyek", SZELSZIG_DATA.edenyek, (p) =>
    `<b>${p.name}</b><br>Köztéri kommunális gyűjtőedény${p.type ? ` <span class="frac">${p.type}</span>` : ""}${routeLink(p)}`
  );

  addMarkers("taeg", SZELSZIG_DATA.taeg, (p) =>
    `<b>${p.name}</b><br>TAEG erdészeti/turisztikai kommunális gyűjtőedény${routeLink(p)}`
  );
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
    }).bindPopup(popupFn(p));
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
});
