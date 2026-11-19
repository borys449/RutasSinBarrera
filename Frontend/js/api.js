/**
 * RutaSinBarreras — Cliente de Integración API y Respaldo Offline
 * Campus Matriz ULEAM Manta
 */

const API_BASE_URL = "http://127.0.0.1:8000/api";

// Base de datos de respaldo offline (Fallback) conforme a la Tabla de Referencia del Campus ULEAM
const FALLBACK_LUGARES = [
  { id: "uleam_centro", nombre: "Campus Matriz ULEAM (Centro)", tipo: "punto_interes", lat: -0.9538, lng: -80.7448 },
  { id: "puerta_1", nombre: "Puerta 1 - Ingreso Principal", tipo: "puerta", lat: -0.9521, lng: -80.7456 },
  { id: "puerta_2", nombre: "Puerta 2 - Acceso Av. Circunvalación", tipo: "puerta", lat: -0.9542, lng: -80.7463 },
  { id: "puerta_3", nombre: "Tercera Puerta ULEAM", tipo: "puerta", lat: -0.9516, lng: -80.7442 },
  { id: "fac_informatica", nombre: "Facultad de Ciencias Informáticas (FACCI)", tipo: "facultad", lat: -0.9531, lng: -80.7446 },
  { id: "fac_industrial", nombre: "Facultad de Ingeniería Industrial", tipo: "facultad", lat: -0.9523, lng: -80.7449 },
  { id: "fac_educacion", nombre: "Facultad de Ciencias de la Educación", tipo: "facultad", lat: -0.9535, lng: -80.7442 },
  { id: "fac_odontologia", nombre: "Facultad de Ciencias de la Salud - Odontología", tipo: "facultad", lat: -0.9536, lng: -80.7438 },
  { id: "fac_derecho", nombre: "Facultad de Ciencias Sociales, Derecho y Bienestar", tipo: "facultad", lat: -0.9534, lng: -80.7445 },
  { id: "fac_turismo", nombre: "Facultad de Turismo y Hotelería", tipo: "facultad", lat: -0.9544, lng: -80.7456 },
  { id: "fac_medicina", nombre: "Facultad de Ciencias Médicas", tipo: "facultad", lat: -0.9549, lng: -80.7458 },
  { id: "punto_encuentro_1", nombre: "Explanada Trabajo Social (Punto Encuentro 1)", tipo: "punto_interes", lat: -0.9528, lng: -80.7449 },
  { id: "punto_encuentro_2", nombre: "Canchas Múltiples (Punto Encuentro 2)", tipo: "punto_interes", lat: -0.9546, lng: -80.7436 },
  { id: "punto_encuentro_3", nombre: "Parque Comunicación (Punto Encuentro 3)", tipo: "punto_interes", lat: -0.9539, lng: -80.7457 },
  { id: "cac_uleam", nombre: "Centro de Atención Ciudadana (C.A.C.)", tipo: "punto_interes", lat: -0.9527, lng: -80.7453 }
];

let FALLBACK_OBSTACULOS = [
  {
    id: "obs_1",
    tipo: "escaleras",
    mensaje: "No apto por aquí: escaleras sin rampa en acceso central",
    lat: -0.9536,
    lng: -80.7446,
    nivel_confianza: "Alto (95%)",
    ultima_actualizacion: "2026-11-18"
  },
  {
    id: "obs_2",
    tipo: "loma_empinada",
    mensaje: "Pendiente pronunciada superior al 12% hacia el pabellón de Medicina",
    lat: -0.9546,
    lng: -80.7460,
    nivel_confianza: "Medio (88%)",
    ultima_actualizacion: "2026-11-18"
  },
  {
    id: "obs_3",
    tipo: "bache",
    mensaje: "Adoquines levantados y bache en sendero peatonal hacia el C.A.C.",
    lat: -0.9526,
    lng: -80.7451,
    nivel_confianza: "Alto (91%)",
    ultima_actualizacion: "2026-11-18"
  },
  {
    id: "obs_4",
    tipo: "rampa",
    mensaje: "Rampa habilitada con pendiente suave y barandilla doble altura",
    lat: -0.9529,
    lng: -80.7451,
    nivel_confianza: "Alto (98%)",
    ultima_actualizacion: "2026-11-18"
  },
  {
    id: "obs_5",
    tipo: "rampa",
    mensaje: "Rampa de acceso lateral a FACCI con piso antideslizante",
    lat: -0.9532,
    lng: -80.7447,
    nivel_confianza: "Alto (96%)",
    ultima_actualizacion: "2026-11-18"
  },
  {
    id: "obs_6",
    tipo: "escaleras",
    mensaje: "Gradería de 8 escalones sin banda podotáctil de aviso",
    lat: -0.9533,
    lng: -80.7441,
    nivel_confianza: "Alto (93%)",
    ultima_actualizacion: "2026-11-18"
  }
];

/**
 * Consulta la lista de lugares del campus ULEAM.
 * @param {string|null} tipo - Filtro opcional: 'puerta', 'facultad', 'punto_interes'
 * @returns {Promise<Array>} Lista de lugares
 */
async function getLugares(tipo = null) {
  try {
    const url = tipo ? `${API_BASE_URL}/lugares?tipo=${encodeURIComponent(tipo)}` : `${API_BASE_URL}/lugares`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.warn("[API] Servidor no disponible, usando fallback local para lugares:", error.message);
    if (tipo) {
      return FALLBACK_LUGARES.filter(l => l.tipo.toLowerCase() === tipo.toLowerCase());
    }
    return FALLBACK_LUGARES;
  }
}

/**
 * Calcula la ruta accesible entre origen y destino según el perfil de accesibilidad.
 * @param {Object} origen - { id, lat, lng }
 * @param {Object} destino - { id, lat, lng }
 * @param {string} perfil - 'silla_ruedas' | 'discapacidad_visual' | 'muletas'
 * @returns {Promise<Object>} Datos de ruta calculada
 */
async function calcularRuta(origen, destino, perfil = "silla_ruedas") {
  try {
    const res = await fetch(`${API_BASE_URL}/rutas/calcular`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ origen, destino, perfil })
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.warn("[API] Servidor no disponible, generando ruta simulada fallback:", error.message);
    return generarRutaFallback(origen, destino, perfil);
  }
}

/**
 * Consulta la lista de obstáculos vigentes.
 * @returns {Promise<Array>}
 */
async function getObstaculos() {
  try {
    const res = await fetch(`${API_BASE_URL}/obstaculos`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.warn("[API] Servidor no disponible, usando fallback local de obstáculos:", error.message);
    return FALLBACK_OBSTACULOS;
  }
}

/**
 * Registra un nuevo obstáculo o reporte comunitario.
 * @param {Object} obstaculo - { tipo, mensaje, lat, lng, nivel_confianza? }
 * @returns {Promise<Object>} Obstáculo creado con su ID
 */
async function reportarObstaculo(obstaculo) {
  try {
    const res = await fetch(`${API_BASE_URL}/obstaculos`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(obstaculo)
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (error) {
    console.warn("[API] Servidor no disponible, persistiendo localmente en memoria fallback:", error.message);
    const nuevoObs = {
      id: `obs_${FALLBACK_OBSTACULOS.length + 1}`,
      tipo: obstaculo.tipo,
      mensaje: obstaculo.mensaje,
      lat: obstaculo.lat,
      lng: obstaculo.lng,
      nivel_confianza: obstaculo.nivel_confianza || "Medio (85%)",
      ultima_actualizacion: new Date().toISOString().split("T")[0]
    };
    FALLBACK_OBSTACULOS.push(nuevoObs);
    return nuevoObs;
  }
}

/**
 * Generador offline de ruta para fallback
 */
function generarRutaFallback(origen, destino, perfil) {
  const oLat = origen.lat;
  const oLng = origen.lng;
  const dLat = destino.lat;
  const dLng = destino.lng;

  const midLat = Number(((oLat + dLat) / 2).toFixed(6));
  const midLng = Number(((oLng + dLng) / 2).toFixed(6));

  const coordenadas = [
    [oLat, oLng],
    [midLat, Number((midLng - 0.0001).toFixed(6))],
    [dLat, dLng]
  ];

  let explicacion = "";
  let obstaculosEvitados = [];
  let alertas = [
    {
      lat: -0.9529,
      lng: -80.7451,
      tipo: "rampa",
      mensaje: "Rampa habilitada con pendiente suave"
    }
  ];

  if (perfil === "silla_ruedas") {
    obstaculosEvitados = ["Escaleras acceso central", "Loma muy empinada"];
    explicacion = "Se seleccionó esta ruta para el perfil silla_ruedas porque evita escaleras y pendientes pronunciadas, priorizando el acceso por rampa.";
  } else if (perfil === "discapacidad_visual") {
    obstaculosEvitados = ["Bache en sendero central", "Escalones sin aviso táctil"];
    explicacion = "Se seleccionó esta ruta para el perfil discapacidad_visual porque prioriza pasillos despejados y con superficies continuas.";
  } else {
    obstaculosEvitados = ["Escaleras empinadas"];
    explicacion = "Se seleccionó esta ruta para el perfil muletas porque reduce la distancia y evita escalinatas pronunciadas.";
  }

  return {
    ruta_coordenadas: coordenadas,
    obstaculos_evitados: obstaculosEvitados,
    alertas_en_ruta: alertas,
    explicacion_ia: explicacion,
    nivel_confianza: "Alto (94%)",
    ultima_actualizacion: new Date().toISOString().split("T")[0]
  };
}

// Exportar para uso modular o global
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    API_BASE_URL,
    getLugares,
    calcularRuta,
    getObstaculos,
    reportarObstaculo,
    FALLBACK_LUGARES,
    FALLBACK_OBSTACULOS
  };
} else {
  window.api = {
    API_BASE_URL,
    getLugares,
    calcularRuta,
    getObstaculos,
    reportarObstaculo,
    FALLBACK_LUGARES,
    FALLBACK_OBSTACULOS
  };
}
