/**
 * ==========================================================================
 * Rutas Sin Barrera - Módulo de Mapa Interactivo (map.js)
 * Renderizado de capas con Leaflet, marcadores accesibles con SVGs,
 * trazado de rutas recomendadas por IA y geolocalización.
 * ==========================================================================
 */

const MapModule = (function () {
  let map = null;
  let layerLugares = null;
  let layerReportes = null;
  let layerRuta = null;
  let markerUbicacion = null;
  let markerClickTemporal = null;

  // Punto de referencia del campus principal de ULEAM en Manta
  const CAMPUS_CENTER = [-0.9527, -80.7452];
  const DEFAULT_ZOOM = 17;

  /**
   * Genera un icono HTML accesible para Leaflet con SVG integrado.
   */
  function crearIconoAccesible(color, emojiIcono, etiqueta) {
    const html = `
      <div class="custom-map-pin" style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 3px 6px rgba(0,0,0,0.35);
        border: 2px solid #ffffff;
      " aria-label="${etiqueta}">
        <span style="
          transform: rotate(45deg);
          font-size: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
        ">${emojiIcono}</span>
      </div>
    `;

    return L.divIcon({
      html: html,
      className: 'map-custom-div-icon',
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32]
    });
  }

  /**
   * Inicializa el mapa de Leaflet y sus capas base.
   */
  function init(mapElementId = 'map') {
    if (map !== null) return;

    // Crear mapa
    map = L.map(mapElementId, {
      zoomControl: true,
      minZoom: 15,
      maxZoom: 19
    }).setView(CAMPUS_CENTER, DEFAULT_ZOOM);

    // Capa de losetas (Tiles OpenStreetMap)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors | RutaSinBarreras',
      maxZoom: 19
    }).addTo(map);

    // Inicializar grupos de capas
    layerLugares = L.layerGroup().addTo(map);
    layerReportes = L.layerGroup().addTo(map);
    layerRuta = L.layerGroup().addTo(map);

    // Oyente para clics en el mapa
    map.on('click', handleMapClick);

    // Mover controles de zoom a esquina inferior accesible si es necesario
    map.zoomControl.setPosition('topright');
  }

  /**
   * Manejador de clics en el mapa para ubicar obstáculos o puntos.
   */
  function handleMapClick(e) {
    const { lat, lng } = e.latlng;
    
    // Si la pestaña actual es la de reportar obstáculo, fijar coordenadas
    const inputCoord = document.getElementById('reporte-coordenadas');
    const tabReportar = document.getElementById('tab-reportar');

    if (inputCoord && tabReportar && tabReportar.getAttribute('aria-selected') === 'true') {
      inputCoord.value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      inputCoord.classList.remove('is-invalid');
      const err = document.getElementById('error-reporte-ubicacion');
      if (err) err.classList.remove('visible');

      // Colocar o mover marcador temporal de reporte
      if (markerClickTemporal) {
        map.removeLayer(markerClickTemporal);
      }
      markerClickTemporal = L.marker([lat, lng], {
        icon: crearIconoAccesible('#ed6c02', '📍', 'Punto de reporte seleccionado'),
        draggable: true
      }).addTo(map);

      markerClickTemporal.on('dragend', function (event) {
        const pos = event.target.getLatLng();
        inputCoord.value = `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`;
      });

      markerClickTemporal.bindPopup("<b>Ubicación seleccionada para reporte</b><br>Arrastra este marcador para ajustar la posición precisa.").openPopup();
      A11yModule.announce(`Coordenadas fijadas en el mapa: ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
    }
  }

  /**
   * Renderiza los puntos de interés y lugares accesibles del campus.
   */
  function renderLugares(lugares, onSelectOrigen, onSelectDestino) {
    if (!layerLugares) return;
    layerLugares.clearLayers();

    lugares.forEach(lugar => {
      let color = '#1976d2';
      let icono = '🏛️';

      if (lugar.categoria === 'campus') {
        color = '#1565c0';
        icono = '🎓';
      } else if (lugar.categoria === 'acceso') {
        color = '#0288d1';
        icono = '🚪';
      } else if (lugar.categoria === 'rampa') {
        color = '#0288d1';
        icono = '♿';
      } else if (lugar.categoria === 'ascensor') {
        color = '#00838f';
        icono = '🛗';
      } else if (lugar.categoria === 'bano') {
        color = '#7e22ce';
        icono = '🚻';
      } else if (lugar.categoria === 'descanso') {
        color = '#2e7d32';
        icono = '🌳';
      } else if (lugar.categoria === 'biblioteca') {
        color = '#6d4c41';
        icono = '📚';
      }

      const marker = L.marker(lugar.coordenadas, {
        icon: crearIconoAccesible(color, icono, lugar.nombre),
        title: lugar.nombre
      });

      // Contenido enriquecido y accesible del popup
      const popupHtml = `
        <div style="min-width: 190px; font-family: inherit;">
          <h4 style="margin: 0 0 4px 0; font-size: 0.95rem; color: #0f172a;">${lugar.nombre}</h4>
          <p style="margin: 0 0 8px 0; font-size: 0.8rem; color: #475569;">${lugar.descripcion}</p>
          <div style="display: flex; gap: 4px; margin-top: 6px;">
            <button type="button" class="btn btn-primary btn-sm btn-popup-origen" data-id="${lugar.id}" style="flex:1; font-size:0.75rem; padding: 4px 6px;">
              Desde aquí
            </button>
            <button type="button" class="btn btn-secondary btn-sm btn-popup-destino" data-id="${lugar.id}" style="flex:1; font-size:0.75rem; padding: 4px 6px;">
              Hasta aquí
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('popupopen', () => {
        const btnOrig = document.querySelector(`.btn-popup-origen[data-id="${lugar.id}"]`);
        const btnDest = document.querySelector(`.btn-popup-destino[data-id="${lugar.id}"]`);

        if (btnOrig && onSelectOrigen) {
          btnOrig.onclick = () => {
            onSelectOrigen(lugar.id);
            marker.closePopup();
          };
        }
        if (btnDest && onSelectDestino) {
          btnDest.onclick = () => {
            onSelectDestino(lugar.id);
            marker.closePopup();
          };
        }
      });

      layerLugares.addLayer(marker);
    });
  }

  /**
   * Renderiza los reportes comunitarios de obstáculos en el mapa.
   */
  function renderReportes(reportes, onConfirmar) {
    if (!layerReportes) return;
    layerReportes.clearLayers();

    reportes.forEach(rep => {
      let color = '#d32f2f'; // Crítico por defecto
      let icono = '⚠️';

      if (rep.severidad === 'moderado') color = '#ed6c02';
      if (rep.severidad === 'leve') color = '#fbc02d';

      const marker = L.marker(rep.coordenadas, {
        icon: crearIconoAccesible(color, icono, `Obstáculo: ${rep.titulo}`),
        title: rep.titulo
      });

      const popupHtml = `
        <div style="min-width: 210px; font-family: inherit;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <h4 style="margin: 0; font-size: 0.95rem; color: #b91c1c;">⚠️ ${rep.titulo}</h4>
          </div>
          <span class="badge badge-obstaculo" style="margin: 4px 0; display: inline-block;">
            Severidad: ${rep.severidad.toUpperCase()}
          </span>
          <p style="margin: 4px 0 8px 0; font-size: 0.8rem; color: #334155;">${rep.descripcion}</p>
          <div style="font-size: 0.75rem; color: #64748b; margin-bottom: 8px;">
            Confiabilidad: <strong>${rep.confianza}%</strong> (${rep.confirmaciones} votos)
          </div>
          <button type="button" class="btn btn-secondary btn-sm btn-block btn-confirmar-rep" data-id="${rep.id}">
            👍 Confirmar obstáculo (+5% conf.)
          </button>
        </div>
      `;

      marker.bindPopup(popupHtml);

      marker.on('popupopen', () => {
        // Alertas sensoriales al abrir un obstáculo
        A11yModule.vibrateObstacleAlert();
        
        const btn = document.querySelector(`.btn-confirmar-rep[data-id="${rep.id}"]`);
        if (btn && onConfirmar) {
          btn.onclick = async () => {
            await onConfirmar(rep.id);
            marker.closePopup();
          };
        }
      });

      layerReportes.addLayer(marker);
    });
  }

  /**
   * Traza visualmente en el mapa la polilínea accesible recomendada por la IA.
   */
  function trazarRuta(coordenadas) {
    if (!layerRuta) return;
    layerRuta.clearLayers();

    if (!coordenadas || coordenadas.length === 0) return;

    // Línea base con contraste alto (borde blanco y línea azul marino gruesa)
    const polylineContorno = L.polyline(coordenadas, {
      color: '#ffffff',
      weight: 10,
      opacity: 0.95,
      lineCap: 'round',
      lineJoin: 'round'
    });

    const polylinePrincipal = L.polyline(coordenadas, {
      color: '#0284c7',
      weight: 6,
      opacity: 1,
      dashArray: '8, 8', // Estilo punteado accesible para distinguir tipo de trazo
      lineCap: 'round',
      lineJoin: 'round'
    });

    layerRuta.addLayer(polylineContorno);
    layerRuta.addLayer(polylinePrincipal);

    // Marcador de inicio (Verde) y fin (Azul)
    const markerInicio = L.circleMarker(coordenadas[0], {
      radius: 9,
      fillColor: '#16a34a',
      color: '#ffffff',
      weight: 3,
      fillOpacity: 1
    }).bindPopup("<b>Punto de Partida</b>");

    const markerFin = L.circleMarker(coordenadas[coordenadas.length - 1], {
      radius: 9,
      fillColor: '#2563eb',
      color: '#ffffff',
      weight: 3,
      fillOpacity: 1
    }).bindPopup("<b>Destino Accesible</b>");

    layerRuta.addLayer(markerInicio);
    layerRuta.addLayer(markerFin);

    // Ajustar el zoom para encuadrar la ruta completa
    const bounds = L.latLngBounds(coordenadas);
    map.fitBounds(bounds, { padding: [50, 50] });

    // Mostrar botón de limpiar ruta
    const btnLimpiar = document.getElementById('btn-mapa-limpiar-ruta');
    if (btnLimpiar) btnLimpiar.style.display = 'inline-flex';
  }

  /**
   * Limpia el trazado de la ruta activa en el mapa.
   */
  function limpiarRuta() {
    if (layerRuta) {
      layerRuta.clearLayers();
    }
    const btnLimpiar = document.getElementById('btn-mapa-limpiar-ruta');
    if (btnLimpiar) btnLimpiar.style.display = 'none';
    
    A11yModule.announce("Ruta limpiada del mapa.");
  }

  /**
   * Centra la vista en unas coordenadas específicas.
   */
  function centrarEn(lat, lng, zoom = 18) {
    if (map) {
      map.setView([lat, lng], zoom, { animate: true });
    }
  }

  /**
   * Localiza y marca la posición del usuario en el mapa vía Geolocation API.
   */
  function localizarUsuario(onExito, onError) {
    if (!('geolocation' in navigator)) {
      if (onError) onError("La geolocalización no es compatible con tu navegador.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (markerUbicacion) {
          map.removeLayer(markerUbicacion);
        }

        markerUbicacion = L.circleMarker([latitude, longitude], {
          radius: 10,
          fillColor: '#0284c7',
          color: '#ffffff',
          weight: 3,
          fillOpacity: 1
        }).addTo(map);

        markerUbicacion.bindPopup("<b>Estás aquí</b>").openPopup();
        map.setView([latitude, longitude], 18);

        if (onExito) onExito(latitude, longitude);
        A11yModule.announce("Ubicación actual centrada en el mapa.");
      },
      (err) => {
        console.warn("Error obteniendo ubicación:", err.message);
        // Fallback a coordenadas del campus central para pruebas
        centrarEn(CAMPUS_CENTER[0], CAMPUS_CENTER[1], DEFAULT_ZOOM);
        if (onError) onError("No se pudo obtener la ubicación GPS (permiso denegado o fuera de rango).");
      },
      { timeout: 7000, enableHighAccuracy: true }
    );
  }

  return {
    init,
    renderLugares,
    renderReportes,
    trazarRuta,
    limpiarRuta,
    centrarEn,
    localizarUsuario
  };
})();
