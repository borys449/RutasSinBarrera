/**
 * ==========================================================================
 * Rutas Sin Barrera - Módulo de Accesibilidad Universal (accesibility.js)
 * Síntesis de voz (Web Speech API), Respuesta háptica (Vibration API),
 * Alto contraste, Escalamiento tipográfico y Live Announcements (ARIA).
 * ==========================================================================
 */

const A11yModule = (function () {
  // Estado y preferencias accesibles del usuario
  const prefs = {
    fontSizeLevel: 'md', // 'sm', 'md', 'lg', 'xl'
    highContrast: false,
    ttsEnabled: false,
    ttsSpeed: 1.0,
    hapticEnabled: true
  };

  const FONT_LEVELS = ['sm', 'md', 'lg', 'xl'];
  let currentUtterance = null;
  let currentlyHighlightedEl = null;

  /**
   * Inicializa la configuración de accesibilidad recuperando preferencias guardadas.
   */
  function init() {
    loadPreferences();
    applyPreferences();
    setupEventListeners();
  }

  /**
   * Carga preferencias desde localStorage.
   */
  function loadPreferences() {
    try {
      const saved = localStorage.getItem('rsb_a11y_prefs');
      if (saved) {
        Object.assign(prefs, JSON.parse(saved));
      }
    } catch (e) {
      console.warn("No se pudieron cargar las preferencias de accesibilidad:", e);
    }
  }

  /**
   * Guarda las preferencias en localStorage.
   */
  function savePreferences() {
    try {
      localStorage.setItem('rsb_a11y_prefs', JSON.stringify(prefs));
    } catch (e) {
      console.warn("No se pudieron guardar las preferencias de accesibilidad:", e);
    }
  }

  /**
   * Aplica las clases y atributos visuales en el DOM según el estado.
   */
  function applyPreferences() {
    // 1. Escala tipográfica
    FONT_LEVELS.forEach(lvl => document.body.classList.remove(`font-size-${lvl}`));
    document.body.classList.add(`font-size-${prefs.fontSizeLevel}`);

    // 2. Alto contraste
    if (prefs.highContrast) {
      document.body.classList.add('theme-high-contrast');
    } else {
      document.body.classList.remove('theme-high-contrast');
    }

    // 3. Sincronizar botones de la barra superior si existen
    const btnContrast = document.getElementById('btn-contrast-toggle');
    if (btnContrast) {
      btnContrast.setAttribute('aria-pressed', prefs.highContrast ? 'true' : 'false');
      btnContrast.classList.toggle('active', prefs.highContrast);
    }

    const btnTts = document.getElementById('btn-tts-toggle');
    if (btnTts) {
      btnTts.setAttribute('aria-pressed', prefs.ttsEnabled ? 'true' : 'false');
      btnTts.classList.toggle('active', prefs.ttsEnabled);
    }

    // 4. Sincronizar controles en el panel de perfil
    const checkVib = document.getElementById('check-vibracion');
    if (checkVib) checkVib.checked = prefs.hapticEnabled;

    const checkVoz = document.getElementById('check-voz-automatica');
    if (checkVoz) checkVoz.checked = prefs.ttsEnabled;

    const sliderVoz = document.getElementById('slider-velocidad-voz');
    const valorVoz = document.getElementById('valor-velocidad-voz');
    if (sliderVoz && valorVoz) {
      sliderVoz.value = prefs.ttsSpeed;
      valorVoz.textContent = `${prefs.ttsSpeed}x`;
    }
  }

  /**
   * Configura oyentes de eventos para los botones de accesibilidad rápida.
   */
  function setupEventListeners() {
    // Aumentar fuente
    const btnIncrease = document.getElementById('btn-font-increase');
    if (btnIncrease) {
      btnIncrease.addEventListener('click', () => {
        changeFontSize(1);
      });
    }

    // Disminuir fuente
    const btnDecrease = document.getElementById('btn-font-decrease');
    if (btnDecrease) {
      btnDecrease.addEventListener('click', () => {
        changeFontSize(-1);
      });
    }

    // Alternar alto contraste
    const btnContrast = document.getElementById('btn-contrast-toggle');
    if (btnContrast) {
      btnContrast.addEventListener('click', () => {
        toggleHighContrast();
      });
    }

    // Alternar lectura por voz
    const btnTts = document.getElementById('btn-tts-toggle');
    if (btnTts) {
      btnTts.addEventListener('click', () => {
        toggleTts();
      });
    }

    // Slider de velocidad en panel de perfil
    const sliderVoz = document.getElementById('slider-velocidad-voz');
    const valorVoz = document.getElementById('valor-velocidad-voz');
    if (sliderVoz && valorVoz) {
      sliderVoz.addEventListener('input', (e) => {
        prefs.ttsSpeed = parseFloat(e.target.value);
        valorVoz.textContent = `${prefs.ttsSpeed}x`;
        savePreferences();
      });
    }
  }

  /**
   * Modifica el tamaño de tipografía de forma relativa.
   */
  function changeFontSize(delta) {
    const currentIndex = FONT_LEVELS.indexOf(prefs.fontSizeLevel);
    let nextIndex = currentIndex + delta;
    if (nextIndex < 0) nextIndex = 0;
    if (nextIndex >= FONT_LEVELS.length) nextIndex = FONT_LEVELS.length - 1;

    prefs.fontSizeLevel = FONT_LEVELS[nextIndex];
    savePreferences();
    applyPreferences();
    announce(`Tamaño de letra ajustado a nivel ${nextIndex + 1} de 4`);
  }

  /**
   * Alterna el modo de alto contraste.
   */
  function toggleHighContrast() {
    prefs.highContrast = !prefs.highContrast;
    savePreferences();
    applyPreferences();
    announce(prefs.highContrast ? "Modo de alto contraste activado" : "Modo de alto contraste desactivado");
    vibrateFeedback([80]);
  }

  /**
   * Alterna el modo de lectura automática por voz.
   */
  function toggleTts() {
    prefs.ttsEnabled = !prefs.ttsEnabled;
    savePreferences();
    applyPreferences();
    if (prefs.ttsEnabled) {
      speak("Lectura automática por voz activada.");
    } else {
      stopSpeaking();
      announce("Lectura automática desactivada.");
    }
  }

  /**
   * Síntesis de voz (Web Speech API) con resaltado visual del elemento.
   */
  function speak(text, elementToHighlight = null) {
    if (!('speechSynthesis' in window)) {
      console.warn("La síntesis de voz no es soportada por este navegador.");
      return;
    }

    stopSpeaking();

    if (!text || typeof text !== 'string') return;

    currentUtterance = new SpeechSynthesisUtterance(text);
    currentUtterance.lang = 'es-ES';
    currentUtterance.rate = prefs.ttsSpeed || 1.0;
    currentUtterance.pitch = 1.0;

    // Resaltado visual del elemento mientras se lee
    if (elementToHighlight) {
      currentlyHighlightedEl = elementToHighlight;
      currentlyHighlightedEl.classList.add('tts-reading-active');
    }

    currentUtterance.onend = () => {
      clearHighlight();
    };

    currentUtterance.onerror = () => {
      clearHighlight();
    };

    window.speechSynthesis.speak(currentUtterance);
  }

  /**
   * Detiene cualquier lectura de voz en curso y limpia el resaltado.
   */
  function stopSpeaking() {
    if ('speechSynthesis' in window && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    clearHighlight();
  }

  function clearHighlight() {
    if (currentlyHighlightedEl) {
      currentlyHighlightedEl.classList.remove('tts-reading-active');
      currentlyHighlightedEl = null;
    }
  }

  /**
   * Señal de vibración háptica (Vibration API).
   * Alerta a usuarios con discapacidad visual o sensorial.
   */
  function vibrateFeedback(pattern = [100]) {
    if (!prefs.hapticEnabled) return;
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {
        console.warn("Vibración háptica no permitida en este contexto:", e);
      }
    }
  }

  /**
   * Alerta háptica especial para detección o cercanía a un obstáculo crítico.
   * Patrón de doble pulso fuerte: vibrar 250ms, pausa 100ms, vibrar 250ms.
   */
  function vibrateObstacleAlert() {
    vibrateFeedback([250, 100, 250]);
  }

  /**
   * Envía un mensaje a los lectores de pantalla a través de la región aria-live.
   */
  function announce(message) {
    const announcer = document.getElementById('a11y-announcer');
    if (announcer) {
      announcer.textContent = '';
      setTimeout(() => {
        announcer.textContent = message;
      }, 50);
    }
  }

  return {
    init,
    changeFontSize,
    toggleHighContrast,
    toggleTts,
    speak,
    stopSpeaking,
    vibrateFeedback,
    vibrateObstacleAlert,
    announce,
    getPrefs: () => prefs,
    setHapticEnabled: (val) => { prefs.hapticEnabled = !!val; savePreferences(); },
    setTtsEnabled: (val) => { prefs.ttsEnabled = !!val; savePreferences(); applyPreferences(); }
  };
})();

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  A11yModule.init();
});
