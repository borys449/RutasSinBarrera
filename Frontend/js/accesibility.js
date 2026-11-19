/**
 * RutaSinBarreras — Módulo de Accesibilidad y Asistencia
 */

(function () {
  let currentFontScale = 1.0;
  const FONT_STEP = 0.1;
  const MIN_SCALE = 0.8;
  const MAX_SCALE = 1.6;

  document.addEventListener("DOMContentLoaded", () => {
    initAccessibilityToolbar();
  });

  function initAccessibilityToolbar() {
    const btnContrast = document.getElementById("btn-contrast");
    const btnFontIncrease = document.getElementById("btn-font-increase");
    const btnFontDecrease = document.getElementById("btn-font-decrease");
    const btnFontReset = document.getElementById("btn-font-reset");
    const btnDyslexic = document.getElementById("btn-dyslexic");
    const btnSpeak = document.getElementById("btn-speak-explanation");

    // Contraste
    if (btnContrast) {
      btnContrast.addEventListener("click", () => {
        document.body.classList.toggle("high-contrast");
        const active = document.body.classList.contains("high-contrast");
        btnContrast.setAttribute("aria-pressed", active ? "true" : "false");
        announceAria(`Modo alto contraste ${active ? "activado" : "desactivado"}`);
      });
    }

    // Aumentar Fuente
    if (btnFontIncrease) {
      btnFontIncrease.addEventListener("click", () => {
        if (currentFontScale < MAX_SCALE) {
          currentFontScale += FONT_STEP;
          applyFontScale();
        }
      });
    }

    // Disminuir Fuente
    if (btnFontDecrease) {
      btnFontDecrease.addEventListener("click", () => {
        if (currentFontScale > MIN_SCALE) {
          currentFontScale -= FONT_STEP;
          applyFontScale();
        }
      });
    }

    // Restaurar Fuente
    if (btnFontReset) {
      btnFontReset.addEventListener("click", () => {
        currentFontScale = 1.0;
        applyFontScale();
        announceAria("Tamaño de texto restablecido");
      });
    }

    // Fuente Dislexia
    if (btnDyslexic) {
      btnDyslexic.addEventListener("click", () => {
        document.body.classList.toggle("font-dyslexic");
        const active = document.body.classList.contains("font-dyslexic");
        btnDyslexic.setAttribute("aria-pressed", active ? "true" : "false");
        announceAria(`Fuente legible ${active ? "activada" : "desactivada"}`);
      });
    }

    // Lector por Voz (Text-to-Speech)
    if (btnSpeak) {
      btnSpeak.addEventListener("click", () => {
        const textElement = document.getElementById("ai-explanation-text");
        if (textElement) {
          speakText(textElement.innerText);
        }
      });
    }
  }

  function applyFontScale() {
    document.documentElement.style.setProperty("--font-scale", `${currentFontScale.toFixed(2)}rem`);
    announceAria(`Tamaño de texto ajustado al ${Math.round(currentFontScale * 100)}%`);
  }

  function speakText(text) {
    if (!("speechSynthesis" in window)) {
      alert("La síntesis de voz no está soportada en su navegador.");
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-EC";
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  }

  function announceAria(message) {
    let liveRegion = document.getElementById("aria-live-announcer");
    if (!liveRegion) {
      liveRegion = document.createElement("div");
      liveRegion.id = "aria-live-announcer";
      liveRegion.className = "sr-only";
      liveRegion.setAttribute("aria-live", "polite");
      document.body.appendChild(liveRegion);
    }
    liveRegion.textContent = message;
  }

  window.a11y = {
    speakText,
    announceAria
  };
})();
