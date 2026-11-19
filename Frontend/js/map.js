/**
 * RutaSinBarreras — Gestión de Mapa con Leaflet (Campus ULEAM Manta)
 */

let mapInstance = null;
let placesLayer = null;
let obstaclesLayer = null;
let routeLayer = null;
let onMapClickCallback = null;

// Centro de referencia: Estadio Universitario / Eje central ULEAM
const ULEAM_CENTER = [-0.9538, -80.7448];
const DEFAULT_ZOOM = 17;

function initMap(mapElementId = "map") {
  if (mapInstance) return mapInstance;

  mapInstance = L.map(mapElementId, {
    zoomControl: true,
    attributionControl: true
  }).setView(ULEAM_CENTER, DEFAULT_ZOOM);

  // Cartografía base accesible OpenStreetMap
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | ULEAM Manta'
  }).addTo(mapInstance);

  placesLayer = L.layerGroup().addTo(mapInstance);
  obstaclesLayer = L.layerGroup().addTo(mapInstance);
  routeLayer = L.layerGroup().addTo(mapInstance);

  // Evento clic en el mapa para registrar coordenadas
  mapInstance.on("click", (e) => {
    if (typeof onMapClickCallback === "function") {
      onMapClickCallback(e.latlng.lat, e.latlng.lng);
    }
  });

  return mapInstance;
}

function setOnMapClickListener(callback) {
  onMapClickCallback = callback;
}

/**
 * Renderiza los lugares del campus en el mapa.
 */
function renderLugares(lugares) {
  if (!placesLayer) return;
  placesLayer.clearLayers();

  lugares.forEach(lugar => {
    let color = "#0b57d0";
    let iconSymbol = "📍";

    if (lugar.tipo === "puerta") {
      color = "#0284c7";
      iconSymbol = "🚪";
    } else if (lugar.tipo === "facultad") {
      color = "#059669";
      iconSymbol = "🏛️";
    } else if (lugar.tipo === "punto_interes") {
      color = "#d97706";
      iconSymbol = "⭐";
    }

    const customIcon = L.divIcon({
      className: "custom-map-marker",
      html: `<div style="background:${color}; color:#fff; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; border:2px solid #fff; box-shadow:0 2px 5px rgba(0,0,0,0.3); font-size:14px;" title="${lugar.nombre}">${iconSymbol}</div>`,
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    const marker = L.marker([lugar.lat, lugar.lng], { icon: customIcon });
    marker.bindPopup(`
      <strong>${lugar.nombre}</strong><br>
      <span style="font-size:0.85em; color:#555;">Tipo: ${lugar.tipo}</span><br>
      ${lugar.referencia ? `<span style="font-size:0.8em; color:#777;">${lugar.referencia}</span>` : ""}
    `);
    placesLayer.addLayer(marker);
  });
}

/**
 * Renderiza los obstáculos vigentes en el mapa.
 */
function renderObstaculos(obstaculos) {
  if (!obstaclesLayer) return;
  obstaclesLayer.clearLayers();

  obstaculos.forEach(obs => {
    let color = "#de350b";
    let symbol = "⚠️";

    if (obs.tipo === "escaleras") {
      color = "#dc2626";
      symbol = "🪜";
    } else if (obs.tipo === "loma_empinada") {
      color = "#7c3aed";
      symbol = "⛰️";
    } else if (obs.tipo === "bache") {
      color = "#ea580c";
      symbol = "🕳️";
    } else if (obs.tipo === "rampa") {
      color = "#16a34a";
      symbol = "♿";
    }

    const obsIcon = L.divIcon({
      className: "obstacle-map-marker",
      html: `<div style="background:${color}; color:#fff; border-radius:6px; width:26px; height:26px; display:flex; align-items:center; justify-content:center; border:2px solid #fff; box-shadow:0 2px 4px rgba(0,0,0,0.3); font-size:13px;" title="${obs.mensaje}">${symbol}</div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 13]
    });

    const marker = L.marker([obs.lat, obs.lng], { icon: obsIcon });
    marker.bindPopup(`
      <strong style="color:${color}; text-transform:uppercase;">${obs.tipo.replace("_", " ")}</strong><br>
      <p style="margin:4px 0; font-size:0.9em;">${obs.mensaje}</p>
      <small style="color:#666;">Confianza: ${obs.nivel_confianza || "Alto"}</small>
    `);
    obstaclesLayer.addLayer(marker);
  });
}

/**
 * Dibuja la ruta accesible calculada en el mapa.
 */
function renderRuta(coordenadas) {
  if (!routeLayer || !mapInstance) return;
  routeLayer.clearLayers();

  if (!coordenadas || coordenadas.length === 0) return;

  const latlngs = coordenadas.map(c => [c[0], c[1]]);

  // Polilínea de ruta con borde contrastante
  const outlinePolyline = L.polyline(latlngs, {
    color: "#ffffff",
    weight: 9,
    opacity: 0.9
  });

  const polyline = L.polyline(latlngs, {
    color: "#2563eb",
    weight: 5,
    opacity: 0.95,
    dashArray: "8, 6"
  });

  routeLayer.addLayer(outlinePolyline);
  routeLayer.addLayer(polyline);

  // Marcadores de origen y destino
  const startIcon = L.divIcon({
    html: `<div style="background:#16a34a; color:#fff; border-radius:50%; width:22px; height:22px; display:flex; align-items:center; justify-content:center; font-weight:bold; border:2px solid #fff; font-size:11px;">A</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });

  const endIcon = L.divIcon({
    html: `<div style="background:#dc2626; color:#fff; border-radius:50%; width:22px; height:22px; display:flex; align-items:center; justify-content:center; font-weight:bold; border:2px solid #fff; font-size:11px;">B</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });

  routeLayer.addLayer(L.marker(latlngs[0], { icon: startIcon }).bindPopup("<strong>Origen</strong>"));
  routeLayer.addLayer(L.marker(latlngs[latlngs.length - 1], { icon: endIcon }).bindPopup("<strong>Destino</strong>"));

  // Ajustar vista a la ruta
  mapInstance.fitBounds(polyline.getBounds(), { padding: [50, 50] });
}

window.campusMap = {
  initMap,
  renderLugares,
  renderObstaculos,
  renderRuta,
  setOnMapClickListener
};
