/**
 * ==========================================================================
 * Rutas Sin Barrera - Controlador Principal de la Aplicación (app.js)
 * Orquestación de módulos, validaciones en tiempo real, gestión de pestañas,
 * componentes de formulario reutilizables y experiencia accesible.
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', async () => {
  // Estado local de la aplicación
  let lugaresCache = [];
  let reportesCache = [];
  let ultimaRutaCalculada = null;
  let usuarioActual = null;
  let reporteEnEdicion = null;
  let abrirAuth = () => {};

  // Elementos DOM Principales
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabPanels = document.querySelectorAll('.tab-panel');
  const selectOrigen = document.getElementById('select-origen');
  const selectDestino = document.getElementById('select-destino');
  const selectPerfil = document.getElementById('select-perfil');
  const formRuta = document.getElementById('form-calcular-ruta');
  const btnCalcularRuta = document.getElementById('btn-calcular-ruta');
  const resultadoRutaContainer = document.getElementById('resultado-ruta-container');
  const textoExplicacionIA = document.getElementById('texto-explicacion-ia');
  const metricaDistancia = document.getElementById('metrica-distancia');
  const metricaTiempo = document.getElementById('metrica-tiempo');
  const metricaBarreras = document.getElementById('metrica-barreras');
  const listaPasosRuta = document.getElementById('lista-pasos-ruta');
  const btnLeerExplicacion = document.getElementById('btn-leer-explicacion-ia');
  const btnLeerPasos = document.getElementById('btn-leer-todos-pasos');
  const listaLugares = document.getElementById('lista-lugares');
  const filtroCategoria = document.getElementById('filtro-categoria-lugares');
  const inputBuscarLugar = document.getElementById('buscar-lugar');
  const formReportar = document.getElementById('form-reportar-obstaculo');
  const reportLoginNotice = document.getElementById('report-login-required');
  const communityAuthNotice = document.getElementById('community-auth-notice');
  const listaReportesComunidad = document.getElementById('lista-reportes-comunidad');
  const contadorReportes = document.getElementById('contador-reportes');
  const editReportDialog = document.getElementById('edit-report-dialog');
  const formEditReport = document.getElementById('form-edit-report');
  const btnGpsReporte = document.getElementById('btn-gps-reporte');
  const btnMapaMiUbicacion = document.getElementById('btn-mapa-mi-ubicacion');
  const btnMapaLimpiar = document.getElementById('btn-mapa-limpiar-ruta');
  const btnToggleSidebarMobile = document.getElementById('btn-toggle-sidebar-mobile');
  const sidebarDrawer = document.getElementById('sidebar-drawer');
  const connectionBadge = document.getElementById('connection-badge');
  const connectionText = document.getElementById('connection-text');

  // ==========================================================================
  // 1. INICIALIZACIÓN DE LA APLICACIÓN
  // ==========================================================================

  // Inicializar mapa interactivo
  MapModule.init('map');

  // Inicializar pestañas y navegación accesible
  initTabs();

  // Cargar datos iniciales
  await cargarDatosIniciales();

  // Configurar oyentes de eventos
  setupAppEvents();
  await setupAuthEvents();

  // ==========================================================================
  // 2. GESTIÓN DE PESTAÑAS (TABS)
  // ==========================================================================

  function initTabs() {
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const targetPanelId = btn.getAttribute('aria-controls');
        activarPestana(btn, targetPanelId);
      });

      // Accesibilidad por teclado (Flechas izquierda/derecha)
      btn.addEventListener('keydown', (e) => {
        const tabsArray = Array.from(tabButtons);
        const index = tabsArray.indexOf(btn);

        if (e.key === 'ArrowRight') {
          const next = tabsArray[(index + 1) % tabsArray.length];
          next.focus();
          activarPestana(next, next.getAttribute('aria-controls'));
        } else if (e.key === 'ArrowLeft') {
          const prev = tabsArray[(index - 1 + tabsArray.length) % tabsArray.length];
          prev.focus();
          activarPestana(prev, prev.getAttribute('aria-controls'));
        }
      });
    });
  }

  function activarPestana(btnSeleccionado, panelId) {
    tabButtons.forEach(btn => {
      btn.setAttribute('aria-selected', 'false');
    });
    btnSeleccionado.setAttribute('aria-selected', 'true');

    tabPanels.forEach(panel => {
      panel.classList.remove('active');
    });

    const targetPanel = document.getElementById(panelId);
    if (targetPanel) {
      targetPanel.classList.add('active');
      const nombrePestana = btnSeleccionado.querySelector('span')?.textContent || 'Sección';
      A11yModule.announce(`Sección activa: ${nombrePestana}`);
    }
  }

  // ==========================================================================
  // 3. CARGA DE DATOS INICIALES (LUGARES Y REPORTES)
  // ==========================================================================

  async function cargarDatosIniciales() {
    try {
      // 1. Cargar Lugares
      lugaresCache = await ApiService.getLugares();
      poblarSelectsRuta(lugaresCache);
      renderizarListaLugares(lugaresCache);

      // Renderizar en mapa con callbacks para orígenes/destinos directos
      MapModule.renderLugares(
        lugaresCache,
        (idOrigen) => {
          selectOrigen.value = idOrigen;
          validarCampoRuta(selectOrigen, 'error-origen');
          activarPestana(document.getElementById('tab-rutas'), 'panel-rutas');
          showToast("Punto de origen establecido desde el mapa", "info");
        },
        (idDestino) => {
          selectDestino.value = idDestino;
          validarCampoRuta(selectDestino, 'error-destino');
          activarPestana(document.getElementById('tab-rutas'), 'panel-rutas');
          showToast("Punto de destino establecido desde el mapa", "info");
        }
      );

      // 2. Cargar Reportes Comunitarios
      await refrescarReportes();

      // 3. Actualizar indicador de estado de conexión
      actualizarEstadoConexion();

    } catch (err) {
      console.error("Error cargando datos iniciales:", err);
      showToast("Error al inicializar la base de datos de accesibilidad", "error");
    }
  }

  async function refrescarReportes() {
    reportesCache = await ApiService.getReportes();
    renderizarListaReportes(reportesCache);
    MapModule.renderReportes(reportesCache, handleConfirmarReporte);
  }

  function actualizarEstadoConexion() {
    if (ApiService.isOffline()) {
      connectionBadge.className = 'connection-status offline';
      connectionText.textContent = 'Modo: Local / Demo';
    } else {
      connectionBadge.className = 'connection-status';
      connectionText.textContent = 'API: Conectado';
    }
  }

  function poblarSelectsRuta(lugares) {
    selectOrigen.innerHTML = '<option value="">-- Seleccionar Origen --</option>';
    selectDestino.innerHTML = '<option value="">-- Seleccionar Destino --</option>';

    lugares.forEach(lugar => {
      const optOrigen = document.createElement('option');
      optOrigen.value = lugar.id;
      optOrigen.textContent = `${lugar.nombre} (${lugar.categoria.toUpperCase()})`;
      selectOrigen.appendChild(optOrigen);

      const optDestino = document.createElement('option');
      optDestino.value = lugar.id;
      optDestino.textContent = `${lugar.nombre} (${lugar.categoria.toUpperCase()})`;
      selectDestino.appendChild(optDestino);
    });

    // Seleccionar por defecto dos lugares distintos para facilitar prueba inmediata
    if (lugares.length >= 2) {
      selectOrigen.value = lugares[0].id;
      selectDestino.value = lugares[1].id;
    }
  }

  // ==========================================================================
  // 4. CÁLCULO DE RUTA CON IA Y EXPLICACIÓN ACCESIBLE
  // ==========================================================================

  formRuta.addEventListener('submit', async (e) => {
    e.preventDefault();

    const origenId = selectOrigen.value;
    const destinoId = selectDestino.value;
    const perfilId = selectPerfil.value;

    // Validación
    let esValido = true;

    if (!origenId) {
      marcarInvalido(selectOrigen, 'error-origen', "Por favor selecciona un punto de inicio.");
      esValido = false;
    } else {
      marcarValido(selectOrigen, 'error-origen');
    }

    if (!destinoId) {
      marcarInvalido(selectDestino, 'error-destino', "Por favor selecciona un punto de destino.");
      esValido = false;
    } else if (destinoId === origenId) {
      marcarInvalido(selectDestino, 'error-destino', "El destino debe ser diferente al origen.");
      esValido = false;
    } else {
      marcarValido(selectDestino, 'error-destino');
    }

    if (!esValido) {
      A11yModule.announce("Hay errores en el formulario de cálculo de ruta.");
      return;
    }

    // Estado de carga (Loading State)
    btnCalcularRuta.disabled = true;
    const textoOriginalBoton = btnCalcularRuta.innerHTML;
    btnCalcularRuta.innerHTML = `
      <div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>
      <span>Analizando accesibilidad con IA...</span>
    `;

    try {
      const resultado = await ApiService.calcularRuta(origenId, destinoId, perfilId);
      ultimaRutaCalculada = resultado;

      // Dibujar ruta en el mapa
      MapModule.trazarRuta(resultado.coordenadasRuta);

      // Mostrar resultados y tarjeta de IA
      textoExplicacionIA.textContent = resultado.explicacionIA;
      metricaDistancia.textContent = resultado.distancia;
      metricaTiempo.textContent = resultado.tiempoEstimado;
      metricaBarreras.textContent = `${resultado.barrerasEvitadas} evitadas`;

      // Renderizar pasos
      listaPasosRuta.innerHTML = '';
      resultado.pasos.forEach((paso, idx) => {
        const li = document.createElement('li');
        li.className = 'step-item';
        li.innerHTML = `
          <span class="step-num" aria-hidden="true">${idx + 1}</span>
          <span>${paso}</span>
        `;
        listaPasosRuta.appendChild(li);
      });

      resultadoRutaContainer.style.display = 'flex';
      actualizarEstadoConexion();

      // Alerta accesible y háptica
      A11yModule.vibrateFeedback([120, 80, 120]);
      A11yModule.announce(`Ruta calculada con éxito. Distancia: ${resultado.distancia}. ${resultado.explicacionIA}`);
      showToast("Ruta calculada y trazada en el mapa", "success");

      // Si la preferencia de voz automática está activa, leer la explicación
      if (A11yModule.getPrefs().ttsEnabled) {
        A11yModule.speak(resultado.explicacionIA, textoExplicacionIA);
      }

    } catch (err) {
      console.error("Error calculando ruta:", err);
      showToast(err.message || "No se pudo calcular la ruta en este momento", "error");
    } finally {
      btnCalcularRuta.disabled = false;
      btnCalcularRuta.innerHTML = textoOriginalBoton;
    }
  });

  // Botón para escuchar la explicación de la IA
  btnLeerExplicacion.addEventListener('click', () => {
    if (ultimaRutaCalculada && ultimaRutaCalculada.explicacionIA) {
      A11yModule.speak(ultimaRutaCalculada.explicacionIA, textoExplicacionIA);
    }
  });

  // Botón para leer todos los pasos secuencialmente
  btnLeerPasos.addEventListener('click', () => {
    if (ultimaRutaCalculada && ultimaRutaCalculada.pasos) {
      const textoCompleto = ultimaRutaCalculada.pasos.join(". Siguiente paso: ");
      A11yModule.speak(`Instrucciones de la ruta: ${textoCompleto}`, listaPasosRuta);
    }
  });

  // ==========================================================================
  // 5. LISTADO Y BÚSQUEDA DE LUGARES ACCESIBLES
  // ==========================================================================

  function renderizarListaLugares(lugares) {
    listaLugares.innerHTML = '';

    if (lugares.length === 0) {
      listaLugares.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
          No se encontraron lugares en esta categoría.
        </div>
      `;
      return;
    }

    lugares.forEach(lugar => {
      const card = document.createElement('article');
      card.className = 'item-card';

      let badgeClass = `badge-${lugar.categoria}`;
      let categoriaLabel = lugar.categoria.toUpperCase();

      card.innerHTML = `
        <div class="item-header">
          <h4 class="item-title">${lugar.nombre}</h4>
          <span class="badge ${badgeClass}">${categoriaLabel}</span>
        </div>
        <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0;">${lugar.descripcion}</p>
        <div style="display: flex; gap: 0.5rem; margin-top: 0.4rem;">
          <button type="button" class="btn btn-secondary btn-sm btn-ver-mapa" data-lat="${lugar.coordenadas[0]}" data-lng="${lugar.coordenadas[1]}" style="flex:1;">
            📍 Ver en Mapa
          </button>
          <button type="button" class="btn btn-primary btn-sm btn-ir-aqui" data-id="${lugar.id}" style="flex:1;">
            🚶 Ruta hasta aquí
          </button>
        </div>
      `;

      // Eventos de botones de la tarjeta
      const btnVer = card.querySelector('.btn-ver-mapa');
      btnVer.onclick = () => {
        MapModule.centrarEn(lugar.coordenadas[0], lugar.coordenadas[1], 18);
        A11yModule.announce(`Centrado en el mapa: ${lugar.nombre}`);
      };

      const btnIr = card.querySelector('.btn-ir-aqui');
      btnIr.onclick = () => {
        selectDestino.value = lugar.id;
        validarCampoRuta(selectDestino, 'error-destino');
        activarPestana(document.getElementById('tab-rutas'), 'panel-rutas');
        showToast(`Destino establecido: ${lugar.nombre}`, "info");
      };

      listaLugares.appendChild(card);
    });
  }

  // Filtros de categoría y búsqueda en tiempo real
  filtroCategoria.addEventListener('change', aplicarFiltroLugares);
  inputBuscarLugar.addEventListener('input', aplicarFiltroLugares);

  function aplicarFiltroLugares() {
    const cat = filtroCategoria.value;
    const query = inputBuscarLugar.value.toLowerCase().trim();

    const filtrados = lugaresCache.filter(l => {
      const coincideCat = (cat === 'todos') || (l.categoria === cat);
      const coincideQuery = (query === '') || l.nombre.toLowerCase().includes(query) || l.descripcion.toLowerCase().includes(query);
      return coincideCat && coincideQuery;
    });

    renderizarListaLugares(filtrados);
  }

  // ==========================================================================
  // 6. GESTIÓN DE REPORTES COMUNITARIOS
  // ==========================================================================

  formReportar.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!usuarioActual) {
      abrirAuth('login');
      showToast("Inicia sesión para publicar reportes comunitarios.", "info");
      return;
    }

    const tituloInput = document.getElementById('reporte-titulo');
    const tipoInput = document.getElementById('reporte-tipo');
    const severidadInput = document.getElementById('reporte-severidad');
    const descInput = document.getElementById('reporte-descripcion');
    const coordInput = document.getElementById('reporte-coordenadas');
    const btnGuardar = document.getElementById('btn-guardar-reporte');

    // Validaciones
    let esValido = true;

    if (tituloInput.value.trim().length < 4) {
      marcarInvalido(tituloInput, 'error-reporte-titulo', "Ingresa un título válido de al menos 4 caracteres.");
      esValido = false;
    } else {
      marcarValido(tituloInput, 'error-reporte-titulo');
    }

    if (descInput.value.trim().length < 6) {
      marcarInvalido(descInput, 'error-reporte-descripcion', "Detalla brevemente la situación del obstáculo.");
      esValido = false;
    } else {
      marcarValido(descInput, 'error-reporte-descripcion');
    }

    if (!coordInput.value.trim()) {
      marcarInvalido(coordInput, 'error-reporte-ubicacion', "Debes hacer clic en el mapa para marcar la coordenada exacta.");
      esValido = false;
    } else {
      marcarValido(coordInput, 'error-reporte-ubicacion');
    }

    if (!esValido) {
      A11yModule.announce("Formulario de reporte incompleto. Por favor revisa los campos en rojo.");
      return;
    }

    // Coordenadas
    const coordsArr = coordInput.value.split(',').map(n => parseFloat(n.trim()));

    const nuevoReporteData = {
      titulo: tituloInput.value.trim(),
      tipo: tipoInput.value,
      severidad: severidadInput.value,
      descripcion: descInput.value.trim(),
      coordenadas: coordsArr
    };

    // Estado de carga
    btnGuardar.disabled = true;
    const txtOriginal = btnGuardar.innerHTML;
    btnGuardar.innerHTML = `
      <div class="spinner" style="width: 20px; height: 20px; border-width: 2px;"></div>
      <span>Guardando reporte comunitario...</span>
    `;

    try {
      await ApiService.crearReporte(nuevoReporteData);

      // Limpiar formulario
      formReportar.reset();
      coordInput.value = '';

      // Recargar lista y mapa
      await refrescarReportes();

      // Feedback háptico y sonoro
      A11yModule.vibrateFeedback([200]);
      showToast("¡Reporte publicado con éxito para la comunidad!", "success");
      A11yModule.announce("Reporte publicado con éxito.");

      // Cambiar a la pestaña de reportes para ver el nuevo elemento
      activarPestana(document.getElementById('tab-reportes'), 'panel-reportes');

    } catch (err) {
      console.error("Error al crear reporte:", err);
      showToast(err.message || "Ocurrió un error al enviar el reporte", "error");
    } finally {
      btnGuardar.disabled = false;
      btnGuardar.innerHTML = txtOriginal;
    }
  });

  document.getElementById('btn-edit-report-close').addEventListener('click', () => {
    editReportDialog.close();
  });
  document.getElementById('btn-edit-report-cancel').addEventListener('click', () => {
    editReportDialog.close();
  });
  editReportDialog.addEventListener('close', () => {
    reporteEnEdicion = null;
  });
  formEditReport.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!usuarioActual || !reporteEnEdicion?.esPropietario) {
      showToast("Solo puedes editar los reportes publicados desde tu cuenta.", "error");
      editReportDialog.close();
      return;
    }

    const btnSave = document.getElementById('btn-edit-report-save');
    btnSave.disabled = true;
    try {
      await ApiService.actualizarReporte(reporteEnEdicion.id, {
        titulo: document.getElementById('edit-reporte-titulo').value.trim(),
        tipo: document.getElementById('edit-reporte-tipo').value,
        severidad: document.getElementById('edit-reporte-severidad').value,
        descripcion: document.getElementById('edit-reporte-descripcion').value.trim()
      });
      editReportDialog.close();
      await refrescarReportes();
      showToast("Reporte actualizado correctamente.", "success");
      A11yModule.announce("Reporte actualizado correctamente.");
    } catch (error) {
      console.error("Error al actualizar reporte:", error);
      showToast(error.message || "No se pudo actualizar el reporte.", "error");
    } finally {
      btnSave.disabled = false;
      reporteEnEdicion = null;
    }
  });

  // Botón para geolocalizar ubicación del reporte
  btnGpsReporte.addEventListener('click', () => {
    MapModule.localizarUsuario(
      (lat, lng) => {
        const coordInput = document.getElementById('reporte-coordenadas');
        coordInput.value = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        marcarValido(coordInput, 'error-reporte-ubicacion');
        showToast("Ubicación fijada en tus coordenadas actuales", "info");
      },
      (msg) => {
        showToast(msg, "warning");
      }
    );
  });

  function renderizarListaReportes(reportes) {
    listaReportesComunidad.innerHTML = '';
    contadorReportes.textContent = `${reportes.length} Activos`;

    if (reportes.length === 0) {
      listaReportesComunidad.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 1.5rem;">
          No hay obstáculos reportados actualmente. ¡El campus se reporta despejado!
        </div>
      `;
      return;
    }

    reportes.forEach(rep => {
      const card = document.createElement('article');
      card.className = 'item-card';

      let badgeConfianzaClass = 'badge-confidence-high';
      if (rep.confianza < 80) badgeConfianzaClass = 'badge-confidence-mid';
      if (rep.confianza < 60) badgeConfianzaClass = 'badge-confidence-low';
      const esPropietario = Boolean(usuarioActual && rep.esPropietario);
      const reporteId = escaparHTML(rep.id);
      const titulo = escaparHTML(rep.titulo);
      const tipoSeveridad = escaparHTML(String(rep.severidad || '').toUpperCase());
      const fecha = escaparHTML(rep.fechaActualizacion);
      const descripcion = escaparHTML(rep.descripcion);
      const confianza = escaparHTML(rep.confianza);
      const lat = escaparHTML(rep.coordenadas[0]);
      const lng = escaparHTML(rep.coordenadas[1]);

      card.innerHTML = `
        <div class="item-header">
          <h4 class="item-title">⚠️ ${titulo}</h4>
          <span class="badge ${badgeConfianzaClass}">${confianza}% Confiabilidad</span>
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: center; margin: 0.2rem 0;">
          <span class="badge badge-obstaculo">Severidad: ${tipoSeveridad}</span>
          <span style="font-size: 0.75rem; color: var(--text-muted);">${fecha}</span>
        </div>
        <p style="font-size: 0.85rem; color: var(--text-main); margin: 0.3rem 0;">${descripcion}</p>
        <div style="display: flex; gap: 0.5rem; margin-top: 0.5rem;">
          <button type="button" class="btn btn-secondary btn-sm btn-ubicar-reporte" data-lat="${lat}" data-lng="${lng}" style="flex:1;">
            📍 Ver en Mapa
          </button>
          <button type="button" class="btn btn-primary btn-sm btn-confirmar-lista" data-id="${reporteId}" style="flex:1;" ${usuarioActual ? '' : 'disabled'}>
            ${usuarioActual ? '👍 Confirmar (+5%)' : 'Inicia sesión para confirmar'}
          </button>
        </div>
        ${esPropietario ? `
          <div class="report-owner-actions" aria-label="Acciones de tu reporte">
            <button type="button" class="btn btn-secondary btn-sm btn-editar-reporte" data-id="${reporteId}">Editar</button>
            <button type="button" class="btn btn-danger btn-sm btn-eliminar-reporte" data-id="${reporteId}">Eliminar</button>
          </div>
        ` : ''}
      `;

      // Eventos
      const btnUbicar = card.querySelector('.btn-ubicar-reporte');
      btnUbicar.onclick = () => {
        MapModule.centrarEn(rep.coordenadas[0], rep.coordenadas[1], 18);
        A11yModule.announce(`Centrado en obstáculo: ${rep.titulo}`);
      };

      const btnConf = card.querySelector('.btn-confirmar-lista');
      btnConf.onclick = async () => {
        await handleConfirmarReporte(rep.id);
      };

      const btnEditar = card.querySelector('.btn-editar-reporte');
      if (btnEditar) {
        btnEditar.addEventListener('click', () => abrirEdicionReporte(rep));
      }

      const btnEliminar = card.querySelector('.btn-eliminar-reporte');
      if (btnEliminar) {
        btnEliminar.addEventListener('click', () => handleEliminarReporte(rep));
      }

      listaReportesComunidad.appendChild(card);
    });
  }

  function escaparHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    })[character]);
  }

  function abrirEdicionReporte(reporte) {
    if (!usuarioActual || !reporte.esPropietario) {
      showToast("Solo puedes editar los reportes publicados desde tu cuenta.", "error");
      return;
    }
    reporteEnEdicion = reporte;
    document.getElementById('edit-reporte-titulo').value = reporte.titulo;
    const tipoInput = document.getElementById('edit-reporte-tipo');
    tipoInput.value = Array.from(tipoInput.options).some(option => option.value === reporte.tipo)
      ? reporte.tipo
      : 'otro';
    const severidadInput = document.getElementById('edit-reporte-severidad');
    severidadInput.value = Array.from(severidadInput.options).some(option => option.value === reporte.severidad)
      ? reporte.severidad
      : 'moderado';
    document.getElementById('edit-reporte-descripcion').value = reporte.descripcion;
    editReportDialog.showModal();
  }

  async function handleEliminarReporte(reporte) {
    if (!usuarioActual || !reporte.esPropietario) {
      showToast("Solo puedes eliminar los reportes publicados desde tu cuenta.", "error");
      return;
    }
    if (!window.confirm(`¿Eliminar el reporte "${reporte.titulo}"? Esta acción no se puede deshacer.`)) {
      return;
    }
    try {
      await ApiService.eliminarReporte(reporte.id);
      await refrescarReportes();
      showToast("Reporte eliminado correctamente.", "success");
      A11yModule.announce("Reporte eliminado correctamente.");
    } catch (error) {
      console.error("Error al eliminar reporte:", error);
      showToast(error.message || "No se pudo eliminar el reporte.", "error");
    }
  }

  async function handleConfirmarReporte(reporteId) {
    if (!usuarioActual) {
      abrirAuth('login');
      showToast("Inicia sesión para confirmar reportes comunitarios.", "info");
      return;
    }

    try {
      const res = await ApiService.confirmarReporte(reporteId);
      await refrescarReportes();

      showToast(`¡Gracias! Confiabilidad actualizada a ${res.nuevoNivelConfianza}%`, "success");
      A11yModule.announce("Reporte confirmado con éxito.");
    } catch (err) {
      console.error("Error al confirmar reporte:", err);
      showToast(err.message || "No se pudo confirmar el reporte", "error");
    }
  }

  // ==========================================================================
  // 7. PREFERENCIAS DEL PERFIL
  // ==========================================================================

  const btnGuardarPerfil = document.getElementById('btn-guardar-perfil');
  const perfilDefectoSelect = document.getElementById('perfil-usuario-defecto');
  const checkVibracion = document.getElementById('check-vibracion');
  const checkVozAuto = document.getElementById('check-voz-automatica');

  const descripcionesPerfil = {
    silla_ruedas: 'Las rutas priorizarán evitar escaleras y buscar recorridos adecuados para silla de ruedas.',
    baston_andador: 'Las rutas usarán el perfil Bastón / Andador para priorizar recorridos acordes a tu movilidad.',
    baja_vision: 'Las rutas usarán el perfil Baja Visión / Ceguera para priorizar indicaciones y recorridos adecuados.',
    adulto_mayor: 'Las rutas usarán el perfil Adulto Mayor para priorizar recorridos acordes a tus preferencias.',
    estandar: 'Las rutas usarán el perfil de movilidad general.'
  };

  function actualizarResumenPerfil(perfil) {
    const resumen = document.getElementById('perfil-movilidad-resumen');
    resumen.textContent = descripcionesPerfil[perfil] || descripcionesPerfil.estandar;
  }

  function aplicarPerfilMovilidad(perfil) {
    const existePerfil = Array.from(perfilDefectoSelect.options)
      .some((option) => option.value === perfil);
    if (!existePerfil) return;

    perfilDefectoSelect.value = perfil;
    selectPerfil.value = perfil;
    localStorage.setItem('rsb_perfil_defecto', perfil);
    actualizarResumenPerfil(perfil);
    if (usuarioActual) {
      const option = Array.from(perfilDefectoSelect.options)
        .find((item) => item.value === perfil);
      document.getElementById('profile-account-mobility').textContent =
        option ? option.textContent : 'Movilidad general';
    }
  }

  perfilDefectoSelect.addEventListener('change', () => {
    actualizarResumenPerfil(perfilDefectoSelect.value);
  });

  btnGuardarPerfil.addEventListener('click', async () => {
    A11yModule.setHapticEnabled(checkVibracion.checked);
    A11yModule.setTtsEnabled(checkVozAuto.checked);

    const perfil = perfilDefectoSelect.value;
    if (usuarioActual) {
      try {
        usuarioActual = await ApiService.actualizarPerfilMovilidad(perfil);
      } catch (error) {
        aplicarPerfilMovilidad(usuarioActual.perfil_movilidad || 'estandar');
        showToast(error.message || 'No se pudo guardar tu perfil en la cuenta.', 'error');
        return;
      }
    }

    aplicarPerfilMovilidad(perfil);
    A11yModule.vibrateFeedback([100]);
    showToast("Preferencias de accesibilidad guardadas", "success");
    A11yModule.announce("Preferencias guardadas.");
  });

  // Cargar perfil por defecto si estaba guardado
  const perfilGuardado = localStorage.getItem('rsb_perfil_defecto');
  if (perfilGuardado) {
    if (perfilDefectoSelect) perfilDefectoSelect.value = perfilGuardado;
    if (selectPerfil) selectPerfil.value = perfilGuardado;
  }
  if (usuarioActual) {
    aplicarPerfilMovilidad(usuarioActual.perfil_movilidad || 'estandar');
  }
  actualizarResumenPerfil(perfilDefectoSelect.value);

  // ==========================================================================
  // 8. CONTROLES DEL MAPA Y MÓVIL
  // ==========================================================================

  function setupAppEvents() {
    // Botón mi ubicación
    btnMapaMiUbicacion.addEventListener('click', () => {
      MapModule.localizarUsuario(null, (msg) => showToast(msg, "warning"));
    });

    // Botón limpiar ruta
    btnMapaLimpiar.addEventListener('click', () => {
      MapModule.limpiarRuta();
      resultadoRutaContainer.style.display = 'none';
      ultimaRutaCalculada = null;
      showToast("Ruta removida del mapa", "info");
    });

    // Drawer en móvil
    btnToggleSidebarMobile.addEventListener('click', () => {
      sidebarDrawer.classList.toggle('open');
      const abierto = sidebarDrawer.classList.contains('open');
      btnToggleSidebarMobile.textContent = abierto ? "Cerrar Panel" : "Abrir Panel";
    });
  }

  // ==========================================================================
  // 9. REGISTRO E INICIO DE SESIÓN
  // ==========================================================================

  async function setupAuthEvents() {
    const dialog = document.getElementById('auth-dialog');
    const btnOpen = document.getElementById('btn-auth-open');
    const btnClose = document.getElementById('btn-auth-close');
    const btnSwitch = document.getElementById('btn-auth-switch');
    const btnLogout = document.getElementById('btn-auth-logout');
    const loginForm = document.getElementById('form-login');
    const registerForm = document.getElementById('form-registro');
    const message = document.getElementById('auth-message');
    const title = document.getElementById('auth-title');
    const switchLabel = document.getElementById('auth-switch-label');
    const userName = document.getElementById('auth-user-name');
    const accountInfo = document.getElementById('profile-account-info');
    const profileSigninNote = document.getElementById('profile-signin-note');

    function renderAuthState() {
      const signedIn = Boolean(usuarioActual);
      userName.textContent = signedIn ? `Hola, ${usuarioActual.nombre}` : '';
      userName.hidden = !signedIn;
      btnOpen.hidden = signedIn;
      btnLogout.hidden = !signedIn;
      formReportar.hidden = !signedIn;
      reportLoginNotice.hidden = signedIn;
      communityAuthNotice.hidden = signedIn;
      accountInfo.hidden = !signedIn;
      profileSigninNote.hidden = signedIn;
      if (signedIn) {
        document.getElementById('profile-account-name').textContent = usuarioActual.nombre;
        document.getElementById('profile-account-email').textContent = usuarioActual.correo;
        const mobilityOption = Array.from(
          document.getElementById('perfil-usuario-defecto').options
        ).find((option) => option.value === usuarioActual.perfil_movilidad);
        document.getElementById('profile-account-mobility').textContent =
          mobilityOption ? mobilityOption.textContent : 'Movilidad general';
      }
      renderizarListaReportes(reportesCache);
      MapModule.renderReportes(reportesCache, handleConfirmarReporte);
    }

    function mostrarMensaje(texto) {
      message.textContent = texto;
      message.hidden = false;
    }

    function abrirDialogoAuth(mode) {
      const isRegister = mode === 'register';
      loginForm.hidden = isRegister;
      registerForm.hidden = !isRegister;
      title.textContent = isRegister ? 'Crear cuenta' : 'Iniciar sesión';
      switchLabel.textContent = isRegister ? '¿Ya tienes cuenta?' : '¿No tienes cuenta?';
      btnSwitch.textContent = isRegister ? 'Inicia sesión' : 'Regístrate';
      message.hidden = true;
      if (!dialog.open) dialog.showModal();
      const firstInput = (isRegister ? registerForm : loginForm).querySelector('input');
      if (firstInput) firstInput.focus();
    }

    abrirAuth = abrirDialogoAuth;
    btnOpen.addEventListener('click', () => abrirDialogoAuth('login'));
    document.getElementById('btn-report-login').addEventListener('click', () => {
      abrirDialogoAuth('login');
    });
    document.getElementById('btn-community-login').addEventListener('click', () => {
      abrirDialogoAuth('login');
    });
    btnClose.addEventListener('click', () => dialog.close());
    btnSwitch.addEventListener('click', () => {
      abrirDialogoAuth(registerForm.hidden ? 'register' : 'login');
    });

    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      message.hidden = true;
      const submit = loginForm.querySelector('button[type="submit"]');
      submit.disabled = true;
      try {
        usuarioActual = await ApiService.iniciarSesion({
          correo: document.getElementById('login-correo').value.trim(),
          password: document.getElementById('login-password').value
        });
        aplicarPerfilMovilidad(usuarioActual.perfil_movilidad || 'estandar');
        renderAuthState();
        await refrescarReportes();
        loginForm.reset();
        dialog.close();
        showToast(`Bienvenido, ${usuarioActual.nombre}.`, 'success');
      } catch (error) {
        mostrarMensaje(error.message || 'No se pudo iniciar sesión.');
      } finally {
        submit.disabled = false;
      }
    });

    registerForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      message.hidden = true;
      const submit = registerForm.querySelector('button[type="submit"]');
      submit.disabled = true;
      try {
        usuarioActual = await ApiService.registrarUsuario({
          nombre: document.getElementById('registro-nombre').value.trim(),
          correo: document.getElementById('registro-correo').value.trim(),
          perfil_movilidad: document.getElementById('registro-perfil-movilidad').value,
          password: document.getElementById('registro-password').value
        });
        aplicarPerfilMovilidad(usuarioActual.perfil_movilidad || 'estandar');
        renderAuthState();
        await refrescarReportes();
        registerForm.reset();
        dialog.close();
        showToast(`Cuenta creada. ¡Bienvenido, ${usuarioActual.nombre}!`, 'success');
      } catch (error) {
        mostrarMensaje(error.message || 'No se pudo crear la cuenta.');
      } finally {
        submit.disabled = false;
      }
    });

    btnLogout.addEventListener('click', async () => {
      try {
        await ApiService.cerrarSesion();
        showToast('Sesión cerrada.', 'info');
      } catch (error) {
        console.warn('La sesión se cerró en este navegador, pero el servidor no respondió.', error);
        showToast('Sesión cerrada en este navegador.', 'info');
      } finally {
        usuarioActual = null;
        await refrescarReportes();
        renderAuthState();
      }
    });

    try {
      usuarioActual = await ApiService.obtenerUsuarioActual();
    } catch (error) {
      console.warn('No se pudo validar la sesión guardada.', error);
    }
    renderAuthState();
  }

  // ==========================================================================
  // 10. HELPERS ACCESIBLES Y VALIDACIONES
  // ==========================================================================

  function marcarInvalido(inputEl, errorId, mensaje) {
    inputEl.classList.add('is-invalid');
    const errEl = document.getElementById(errorId);
    if (errEl) {
      errEl.textContent = mensaje;
      errEl.classList.add('visible');
    }
  }

  function marcarValido(inputEl, errorId) {
    inputEl.classList.remove('is-invalid');
    const errEl = document.getElementById(errorId);
    if (errEl) {
      errEl.classList.remove('visible');
    }
  }

  function validarCampoRuta(selectEl, errorId) {
    if (selectEl.value) {
      marcarValido(selectEl, errorId);
    }
  }

  selectOrigen.addEventListener('change', () => validarCampoRuta(selectOrigen, 'error-origen'));
  selectDestino.addEventListener('change', () => validarCampoRuta(selectDestino, 'error-destino'));

  /**
   * Sistema de Notificaciones Accesibles (Toast)
   */
  function showToast(mensaje, tipo = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.setAttribute('role', 'alert');

    let icono = 'ℹ️';
    if (tipo === 'success') icono = '✅';
    if (tipo === 'error') icono = '❌';
    if (tipo === 'warning') icono = '⚠️';

    const icon = document.createElement('span');
    icon.textContent = icono;
    const text = document.createElement('span');
    text.textContent = mensaje;
    toast.append(icon, text);

    container.appendChild(toast);

    // Auto-eliminar después de 4 segundos
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 300ms ease';
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }
});
