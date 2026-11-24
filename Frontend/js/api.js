/**
 * ==========================================================================
 * Rutas Sin Barrera - Capa de Servicio API (api.js)
 * Manejo de contratos REST, peticiones HTTP, estados de carga,
 * manejo de errores y contingencia offline / local mock.
 * ==========================================================================
 */

const ApiService = (function () {
  // Configuración base de la API del Backend (FastAPI / Flask)
  const API_CONFIG = {
    baseUrl: 'http://localhost:8000/api',
    timeoutMs: 3500,
    isOfflineMode: false
  };
  const AUTH_TOKEN_KEY = 'rsb_auth_token';
  const AUTH_USER_KEY = 'rsb_auth_user';

  function authHeaders() {
    const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function authRequest(path, options = {}) {
    const response = await fetchWithTimeout(`${API_CONFIG.baseUrl}${path}`, {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(data.detail || `Error HTTP ${response.status}`);
      error.status = response.status;
      throw error;
    }
    return data;
  }

  function saveSession(session) {
    sessionStorage.setItem(AUTH_TOKEN_KEY, session.access_token);
    sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(session.usuario));
    API_CONFIG.isOfflineMode = false;
    return session.usuario;
  }

  async function registrarUsuario(userData) {
    const session = await authRequest('/auth/registro', {
      method: 'POST',
      body: JSON.stringify(userData)
    });
    return saveSession(session);
  }

  async function iniciarSesion(credentials) {
    const session = await authRequest('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
    return saveSession(session);
  }

  async function actualizarPerfilMovilidad(perfilMovilidad) {
    const user = await authRequest('/auth/me', {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ perfil_movilidad: perfilMovilidad })
    });
    sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
    return user;
  }

  async function obtenerUsuarioActual() {
    if (!sessionStorage.getItem(AUTH_TOKEN_KEY)) return null;
    try {
      const user = await authRequest('/auth/me', { headers: authHeaders() });
      sessionStorage.setItem(AUTH_USER_KEY, JSON.stringify(user));
      API_CONFIG.isOfflineMode = false;
      return user;
    } catch (error) {
      if (error.status === 401) {
        sessionStorage.removeItem(AUTH_TOKEN_KEY);
        sessionStorage.removeItem(AUTH_USER_KEY);
        return null;
      }
      API_CONFIG.isOfflineMode = true;
      const cachedUser = sessionStorage.getItem(AUTH_USER_KEY);
      if (cachedUser) {
        try {
          return JSON.parse(cachedUser);
        } catch (parseError) {
          sessionStorage.removeItem(AUTH_USER_KEY);
        }
      }
      throw error;
    }
  }

  async function cerrarSesion() {
    const token = sessionStorage.getItem(AUTH_TOKEN_KEY);
    try {
      if (token) {
        await authRequest('/auth/logout', {
          method: 'POST',
          headers: authHeaders()
        });
      }
    } finally {
      sessionStorage.removeItem(AUTH_TOKEN_KEY);
      sessionStorage.removeItem(AUTH_USER_KEY);
    }
  }

  /**
   * Pines de referencia del campus. Las ubicaciones de Google Maps/OSM
   * son aproximadas y todavía requieren validación en campo.
   */
  const CAMPUS_MOCK_DATA = {
    lugares: [
      {
        id: "uleam_centro",
        nombre: "Campus Matriz ULEAM (punto de referencia)",
        categoria: "campus",
        descripcion: "Centro aproximado proporcionado por el usuario; no representa un edificio específico.",
        coordenadas: [-0.9527, -80.7452]
      },
      {
        id: "puerta_1",
        nombre: "Puerta 1 - Ingreso principal",
        categoria: "acceso",
        descripcion: "Pin de Google Maps; condiciones de acceso por verificar en sitio.",
        coordenadas: [-0.9549122, -80.7460422]
      },
      {
        id: "puerta_2",
        nombre: "Puerta 2 ULEAM",
        categoria: "acceso",
        descripcion: "Pin de Google Maps; condiciones de acceso por verificar en sitio.",
        coordenadas: [-0.9530482, -80.7436759]
      },
      {
        id: "puerta_3",
        nombre: "Tercera puerta ULEAM",
        categoria: "acceso",
        descripcion: "Pin de Google Maps; condiciones de acceso por verificar en sitio.",
        coordenadas: [-0.9506268, -80.7461297]
      },
      {
        id: "puerta_4",
        nombre: "Puerta 4",
        categoria: "acceso",
        descripcion: "Pin de OpenStreetMap; confirmar que corresponda a una entrada habilitada y verificar condiciones en sitio.",
        coordenadas: [-0.9548909, -80.7441844]
      },
      {
        id: "fac_informatica",
        nombre: "Facultad de Ciencias Informáticas (FACCI)",
        categoria: "facultad",
        descripcion: "Pin de Google Maps; ubicación del edificio por verificar en sitio.",
        coordenadas: [-0.952382, -80.7447735]
      },
      {
        id: "fac_industrial",
        nombre: "Facultad de Ingeniería Industrial",
        categoria: "facultad",
        descripcion: "Pin de Google Maps; ubicación del edificio por verificar en sitio.",
        coordenadas: [-0.9512028, -80.7460773]
      },
      {
        id: "fac_educacion",
        nombre: "Facultad de Ciencias de la Educación",
        categoria: "facultad",
        descripcion: "Pin de Google Maps; ubicación del edificio por verificar en sitio.",
        coordenadas: [-0.9542543, -80.7461308]
      },
      {
        id: "fac_odontologia",
        nombre: "Facultad de Ciencias de la Salud - Odontología",
        categoria: "facultad",
        descripcion: "Pin de Google Maps; ubicación del edificio por verificar en sitio.",
        coordenadas: [-0.9529857, -80.7434419]
      },
      {
        id: "fac_derecho",
        nombre: "Facultad de Ciencias Sociales, Derecho y Bienestar",
        categoria: "facultad",
        descripcion: "Pin de Google Maps; ubicación del edificio por verificar en sitio.",
        coordenadas: [-0.9530813, -80.7462284]
      },
      {
        id: "fac_turismo",
        nombre: "Facultad de Turismo y Hotelería",
        categoria: "facultad",
        descripcion: "Pin de Google Maps; ubicación del edificio por verificar en sitio.",
        coordenadas: [-0.9537699, -80.7471212]
      },
      {
        id: "fac_medicina",
        nombre: "Facultad de Ciencias Médicas",
        categoria: "facultad",
        descripcion: "Pin de Google Maps; ubicación del edificio por verificar en sitio.",
        coordenadas: [-0.9517139, -80.7439939]
      },
      {
        id: "biblioteca_economia",
        nombre: "Biblioteca de la Facultad de Economía",
        categoria: "biblioteca",
        descripcion: "Pin de Google Maps; confirmar que sea la biblioteca buscada y verificar en sitio.",
        coordenadas: [-0.9540532, -80.74581]
      },
      {
        id: "biblioteca_trabajo_social",
        nombre: "Biblioteca de Trabajo Social",
        categoria: "biblioteca",
        descripcion: "Pin de Google Maps; confirmar que sea la biblioteca buscada y verificar en sitio.",
        coordenadas: [-0.950773, -80.7454928]
      },
      {
        id: "biblioteca_derecho",
        nombre: "Biblioteca de Derecho",
        categoria: "biblioteca",
        descripcion: "Pin de Google Maps; confirmar que sea la biblioteca buscada y verificar en sitio.",
        coordenadas: [-0.9531017, -80.7460541]
      },
      {
        id: "biblioteca_ingenieria",
        nombre: "Biblioteca de Ingeniería",
        categoria: "biblioteca",
        descripcion: "Pin de Google Maps; confirmar que sea la biblioteca buscada y verificar en sitio.",
        coordenadas: [-0.9518982, -80.7463366]
      },
      {
        id: "biblioteca_arquitectura",
        nombre: "Biblioteca de Arquitectura",
        categoria: "biblioteca",
        descripcion: "Pin de Google Maps; confirmar que sea la biblioteca buscada y verificar en sitio.",
        coordenadas: [-0.952776, -80.7462534]
      }
    ],

    reportes: []
  };

  /**
   * Helper privado para peticiones con timeout y control de errores.
   */
  async function fetchWithTimeout(resource, options = {}) {
    const { timeout = API_CONFIG.timeoutMs } = options;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(resource, {
        ...options,
        signal: controller.signal
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  }

  /**
   * Obtiene la lista de lugares accesibles.
   */
  async function getLugares() {
    try {
      const res = await fetchWithTimeout(`${API_CONFIG.baseUrl}/lugares`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const error = new Error(data.detail || `HTTP error ${res.status}`);
        error.status = res.status;
        throw error;
      }
      const data = await res.json();
      API_CONFIG.isOfflineMode = false;
      return data;
    } catch (err) {
      console.warn("Aviso: Servidor API no disponible. Utilizando datos del campus en modo offline.", err.message);
      API_CONFIG.isOfflineMode = true;
      return CAMPUS_MOCK_DATA.lugares;
    }
  }

  /**
   * Solicita al backend una ruta accesible considerando perfil y obstáculos.
   * No genera trazados de demostración cuando el servicio no está disponible.
   */
  async function calcularRuta(origenId, destinoId, perfilId) {
    const payload = {
      origen_id: origenId,
      destino_id: destinoId,
      perfil_movilidad: perfilId
    };

    try {
      const res = await fetchWithTimeout(`${API_CONFIG.baseUrl}/rutas/calcular`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      API_CONFIG.isOfflineMode = false;
      return data;
    } catch (err) {
      console.warn("Aviso: No se pudo conectar con el servicio de rutas.", err.message);
      API_CONFIG.isOfflineMode = true;
      throw new Error("No se puede calcular una ruta accesible sin el servicio de rutas; los caminos del campus aún no están verificados.");
    }
  }

  /**
   * Obtiene los reportes comunitarios de obstáculos.
   */
  async function getReportes() {
    try {
      const res = await fetchWithTimeout(`${API_CONFIG.baseUrl}/reportes`, {
        headers: { 'Accept': 'application/json' }
      });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      API_CONFIG.isOfflineMode = false;
      return data;
    } catch (err) {
      console.warn("Aviso: Obteniendo reportes desde base local.", err.message);
      API_CONFIG.isOfflineMode = true;
      // Recuperar de localStorage si el usuario creó reportes previamente
      const guardados = localStorage.getItem('rsb_reportes_locales');
      if (guardados) {
        try {
          return JSON.parse(guardados);
        } catch (e) {}
      }
      return CAMPUS_MOCK_DATA.reportes;
    }
  }

  /**
   * Envía un nuevo reporte comunitario de obstáculo.
   */
  async function crearReporte(reporteData) {
    if (!sessionStorage.getItem(AUTH_TOKEN_KEY)) {
      throw new Error("Inicia sesión para publicar un reporte comunitario.");
    }
    try {
      const res = await fetchWithTimeout(`${API_CONFIG.baseUrl}/reportes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...authHeaders()
        },
        body: JSON.stringify(reporteData)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const error = new Error(data.detail || `HTTP error ${res.status}`);
        error.status = res.status;
        throw error;
      }
      const data = await res.json();
      API_CONFIG.isOfflineMode = false;
      return data;
    } catch (err) {
      if (err.status) throw err;
      console.warn("Aviso: Guardando reporte localmente por modo offline.", err.message);
      API_CONFIG.isOfflineMode = true;

      // Crear nuevo reporte mock local
      const nuevoReporte = {
        id: `rep_${Date.now()}`,
        titulo: reporteData.titulo,
        tipo: reporteData.tipo,
        severidad: reporteData.severidad,
        descripcion: reporteData.descripcion,
        coordenadas: reporteData.coordenadas,
        fechaActualizacion: "Hace un momento",
        confirmaciones: 1,
        confianza: 75
      };

      // Persistir en lista local
      let lista = CAMPUS_MOCK_DATA.reportes;
      const guardados = localStorage.getItem('rsb_reportes_locales');
      if (guardados) {
        try {
          lista = JSON.parse(guardados);
        } catch (e) {}
      }
      lista.unshift(nuevoReporte);
      localStorage.setItem('rsb_reportes_locales', JSON.stringify(lista));

      return {
        exito: true,
        mensaje: "Reporte registrado con éxito (Almacenado localmente)",
        reporte: nuevoReporte
      };
    }
  }

  /**
   * Confirma un reporte de la comunidad para incrementar su confiabilidad.
   */
  async function confirmarReporte(reporteId) {
    if (!sessionStorage.getItem(AUTH_TOKEN_KEY)) {
      throw new Error("Inicia sesión para confirmar un reporte comunitario.");
    }
    try {
      const res = await fetchWithTimeout(`${API_CONFIG.baseUrl}/reportes/${reporteId}/confirmar`, {
        method: 'POST',
        headers: authHeaders()
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const error = new Error(data.detail || `HTTP error ${res.status}`);
        error.status = res.status;
        throw error;
      }
      return await res.json();
    } catch (err) {
      if (err.status) throw err;
      // Manejo local offline
      let lista = CAMPUS_MOCK_DATA.reportes;
      const guardados = localStorage.getItem('rsb_reportes_locales');
      if (guardados) {
        try { lista = JSON.parse(guardados); } catch (e) {}
      }
      const item = lista.find(r => r.id === reporteId);
      if (item) {
        item.confirmaciones += 1;
        item.confianza = Math.min(99, item.confianza + 5);
        localStorage.setItem('rsb_reportes_locales', JSON.stringify(lista));
      }
      return { exito: true, nuevoNivelConfianza: item ? item.confianza : 90 };
    }
  }

  /**
   * Informa el estado actual del modo de conexión.
   */
  function isOffline() {
    return API_CONFIG.isOfflineMode;
  }

  return {
    registrarUsuario,
    iniciarSesion,
    actualizarPerfilMovilidad,
    obtenerUsuarioActual,
    cerrarSesion,
    getLugares,
    calcularRuta,
    getReportes,
    crearReporte,
    confirmarReporte,
    isOffline
  };
})();
