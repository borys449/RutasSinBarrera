/**
 * RutaSinBarreras — Lógica de Aplicación Frontend
 * Integra api.js, map.js y accesibility.js
 */

document.addEventListener("DOMContentLoaded", async () => {
  // Inicializar mapa
  campusMap.initMap("map");

  // Elementos DOM
  const selectOrigen = document.getElementById("select-origen");
  const selectDestino = document.getElementById("select-destino");
  const selectPerfil = document.getElementById("select-perfil");
  const btnCalcular = document.getElementById("btn-calcular-ruta");
  const aiCard = document.getElementById("ai-explanation-card");
  const aiText = document.getElementById("ai-explanation-text");
  const aiConfidence = document.getElementById("ai-confidence-badge");
  const aiDate = document.getElementById("ai-update-date");
  const avoidedContainer = document.getElementById("avoided-obstacles-container");
  const avoidedList = document.getElementById("avoided-obstacles-list");
  const alertsContainer = document.getElementById("route-alerts-container");
  const alertsList = document.getElementById("route-alerts-list");

  // Elementos Modal Reportar Obstáculo
  const btnAbrirReporte = document.getElementById("btn-abrir-reporte");
  const modalReporte = document.getElementById("modal-reporte");
  const btnCerrarModal = document.getElementById("btn-cerrar-modal");
  const formReporte = document.getElementById("form-reporte-obstaculo");
  const inputLat = document.getElementById("reporte-lat");
  const inputLng = document.getElementById("reporte-lng");
  const selectTipoObs = document.getElementById("reporte-tipo");
  const inputMensajeObs = document.getElementById("reporte-mensaje");

  let lugaresCargados = [];

  // Cargar Lugares y Obstáculos desde la API (o Fallback)
  try {
    lugaresCargados = await api.getLugares();
    poblarSelectoresLugares(lugaresCargados);
    campusMap.renderLugares(lugaresCargados);

    const obstaculos = await api.getObstaculos();
    campusMap.renderObstaculos(obstaculos);
  } catch (err) {
    console.error("Error al cargar datos iniciales:", err);
  }

  // Poblar selectores de origen y destino
  function poblarSelectoresLugares(lugares) {
    selectOrigen.innerHTML = '<option value="">-- Seleccione Punto de Origen --</option>';
    selectDestino.innerHTML = '<option value="">-- Seleccione Punto de Destino --</option>';

    // Agrupar por tipo para mejor accesibilidad y usabilidad
    const grupos = {
      puerta: "🚪 Puertas de Acceso",
      facultad: "🏛️ Facultades",
      punto_interes: "⭐ Puntos de Interés"
    };

    Object.keys(grupos).forEach(tipo => {
      const items = lugares.filter(l => l.tipo === tipo);
      if (items.length > 0) {
        const optgroupO = document.createElement("optgroup");
        optgroupO.label = grupos[tipo];
        const optgroupD = document.createElement("optgroup");
        optgroupD.label = grupos[tipo];

        items.forEach(l => {
          const opt1 = new Option(l.nombre, l.id);
          const opt2 = new Option(l.nombre, l.id);
          optgroupO.appendChild(opt1);
          optgroupD.appendChild(opt2);
        });

        selectOrigen.appendChild(optgroupO);
        selectDestino.appendChild(optgroupD);
      }
    });

    // Valores por defecto sugeridos: Puerta 1 -> FACCI
    selectOrigen.value = "puerta_1";
    selectDestino.value = "fac_informatica";
  }

  // Evento Calcular Ruta
  btnCalcular.addEventListener("click", async () => {
    const idOrigen = selectOrigen.value;
    const idDestino = selectDestino.value;
    const perfil = selectPerfil.value;

    if (!idOrigen || !idDestino) {
      alert("Por favor seleccione un punto de origen y un punto de destino.");
      return;
    }

    if (idOrigen === idDestino) {
      alert("El origen y el destino no pueden ser el mismo lugar.");
      return;
    }

    const lugarOrigen = lugaresCargados.find(l => l.id === idOrigen);
    const lugarDestino = lugaresCargados.find(l => l.id === idDestino);

    if (!lugarOrigen || !lugarDestino) {
      alert("No se encontraron los datos geográficos de los puntos seleccionados.");
      return;
    }

    btnCalcular.disabled = true;
    btnCalcular.textContent = "Calculando ruta accesible...";

    try {
      const respuestaRuta = await api.calcularRuta(
        { id: lugarOrigen.id, lat: lugarOrigen.lat, lng: lugarOrigen.lng, nombre: lugarOrigen.nombre },
        { id: lugarDestino.id, lat: lugarDestino.lat, lng: lugarDestino.lng, nombre: lugarDestino.nombre },
        perfil
      );

      // Renderizar polyline en el mapa
      campusMap.renderRuta(respuestaRuta.ruta_coordenadas);

      // Mostrar panel explicativo de IA
      aiCard.style.display = "block";
      aiText.textContent = respuestaRuta.explicacion_ia;
      aiConfidence.textContent = respuestaRuta.nivel_confianza || "Alto (94%)";
      aiDate.textContent = `Actualizado: ${respuestaRuta.ultima_actualizacion || "Hoy"}`;

      // Mostrar obstáculos evitados
      if (respuestaRuta.obstaculos_evitados && respuestaRuta.obstaculos_evitados.length > 0) {
        avoidedContainer.style.display = "block";
        avoidedList.innerHTML = "";
        respuestaRuta.obstaculos_evitados.forEach(obs => {
          const li = document.createElement("li");
          li.className = "avoided-item";
          li.innerHTML = `<span>🛡️</span> <span>${obs}</span>`;
          avoidedList.appendChild(li);
        });
      } else {
        avoidedContainer.style.display = "none";
      }

      // Mostrar alertas en ruta
      if (respuestaRuta.alertas_en_ruta && respuestaRuta.alertas_en_ruta.length > 0) {
        alertsContainer.style.display = "block";
        alertsList.innerHTML = "";
        respuestaRuta.alertas_en_ruta.forEach(alerta => {
          const li = document.createElement("li");
          li.className = "alert-item";
          li.innerHTML = `<span>♿</span> <span>${alerta.mensaje}</span>`;
          alertsList.appendChild(li);
        });
      } else {
        alertsContainer.style.display = "none";
      }

      if (window.a11y && typeof window.a11y.announceAria === "function") {
        window.a11y.announceAria(`Ruta calculada con éxito. ${respuestaRuta.explicacion_ia}`);
      }
    } catch (err) {
      console.error("Error al calcular ruta:", err);
      alert("Hubo un problema al procesar la ruta accesible.");
    } finally {
      btnCalcular.disabled = false;
      btnCalcular.innerHTML = "<span>🧭</span> Calcular Ruta Accesible";
    }
  });

  // Modal de Reportes
  if (btnAbrirReporte) {
    btnAbrirReporte.addEventListener("click", () => {
      abrirModalReporte(-0.9538, -80.7448);
    });
  }

  if (btnCerrarModal) {
    btnCerrarModal.addEventListener("click", () => {
      modalReporte.style.display = "none";
    });
  }

  // Clic en mapa llena coordenadas y abre el modal
  campusMap.setOnMapClickListener((lat, lng) => {
    abrirModalReporte(lat, lng);
  });

  function abrirModalReporte(lat, lng) {
    inputLat.value = Number(lat).toFixed(6);
    inputLng.value = Number(lng).toFixed(6);
    modalReporte.style.display = "flex";
    inputMensajeObs.focus();
  }

  // Enviar formulario de nuevo obstáculo
  formReporte.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nuevo = {
      tipo: selectTipoObs.value,
      mensaje: inputMensajeObs.value.trim(),
      lat: parseFloat(inputLat.value),
      lng: parseFloat(inputLng.value)
    };

    if (!nuevo.mensaje) {
      alert("Por favor ingrese una descripción del obstáculo.");
      return;
    }

    try {
      const guardado = await api.reportarObstaculo(nuevo);
      modalReporte.style.display = "none";
      formReporte.reset();

      // Recargar lista y renderizar en mapa
      const obstaculosActualizados = await api.getObstaculos();
      campusMap.renderObstaculos(obstaculosActualizados);

      alert(`¡Obstáculo reportado con éxito! Registrado como: ${guardado.id}`);
    } catch (err) {
      console.error("Error al registrar reporte:", err);
      alert("No se pudo registrar el obstáculo.");
    }
  });
});
