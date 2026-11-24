# Frontend - RutaSinBarreras

Interfaz web moderna, intuitiva y accesible para el sistema inteligente de rutas urbanas y de campus sin barreras.

## 🚀 Características Principales

1. **Accesibilidad Universal (WCAG 2.1 AA / AAA)**:
   - **Modo Alto Contraste**: Paleta con contraste superior a 7:1 (amarillo sobre negro con filtro de losetas de mapa).
   - **Escalamiento Tipográfico**: Tamaños de letra ajustables (A- / A+) sin romper el diseño responsive.
   - **Síntesis de Voz (Web Speech API)**: Lectura automática y manual de explicaciones de la IA e instrucciones de navegación paso a paso con resaltado visual del texto en lectura.
   - **Respuesta Háptica (Vibration API)**: Patrones de vibración para alertar sobre la proximidad de barreras críticas a personas con baja visión o ceguera.
   - **Navegación por Teclado**: Soporte para `:focus-visible`, enlace de salto al contenido (`.skip-link`) y regiones ARIA Live para lectores de pantalla.

2. **Cálculo de Rutas con IA Explicativa**:
   - Selección de perfil funcional (Silla de ruedas, Bastón/Andador, Baja visión, Adulto mayor, etc.).
   - Tarjeta con métricas de distancia, tiempo estimado y barreras evitadas.
   - Explicación contextual de la recomendación de la IA (ej. *"Se seleccionó esta ruta porque evita 2 tramos de escaleras críticas y utiliza rampas con pendiente menor al 5%"*).
   - El cálculo requiere el servicio de rutas; no se dibujan rutas simuladas cuando no hay conexión, porque los caminos accesibles no están verificados.

3. **Módulo de Reportes Comunitarios**:
   - Registro de incidencias (roturas, averías de ascensor, obras temporales) con coordenadas geográficas y nivel de severidad.
   - Cálculo del nivel de confianza dinámico mediante confirmaciones comunitarias.
   - Fecha de última actualización visible en cada reporte.
   - El formulario de publicación y las confirmaciones requieren iniciar sesión; la API también rechaza esas operaciones sin una sesión válida. Explorar rutas y lugares sigue siendo público.

4. **Cuentas de usuario**:
   - Registro e inicio de sesión conectados a la API, con sesión mantenida durante la pestaña actual del navegador.
   - Las contraseñas y sesiones se validan y almacenan en el backend; no se guardan contraseñas en el navegador.
   - El perfil de movilidad elegido al registrarse se guarda en la cuenta y se puede actualizar desde “Mi Perfil”.
   - “Mi Perfil” muestra el nombre, correo y perfil de movilidad de la cuenta activa.

5. **Cartografía Interactiva Ligera (Leaflet)**:
   - Marcadores personalizados con iconos SVG accesibles para rampas, ascensores, baños adaptados, zonas de descanso y obstáculos.
   - Trazado de polilíneas accesibles de alto contraste con patrón punteado.

6. **Resiliencia y Modo Offline**:
   - Detección automática del estado del backend.
   - Fallback con el punto de referencia del campus y las cuatro entradas registradas en OpenStreetMap. Facultades, biblioteca y accesibilidad de entradas quedan pendientes de verificación.

### Fuentes de ubicaciones

- Centro del campus: coordenadas proporcionadas por el usuario (`-0.9527, -80.7452`).
- Entradas 1–4: OpenStreetMap, nodos [8836686343](https://www.openstreetmap.org/node/8836686343), [12384558008](https://www.openstreetmap.org/node/12384558008), [12384558010](https://www.openstreetmap.org/node/12384558010) y [7352692095](https://www.openstreetmap.org/node/7352692095). © OpenStreetMap contributors, ODbL.
- Estos datos identifican puntos y entradas; no certifican que una ruta o entrada sea accesible. Las ubicaciones de facultades y biblioteca deben confirmarse antes de agregarlas.

---

## 📁 Estructura del Frontend

```text
Frontend/
├── css/
│   ├── accesibility.css    # Reglas WCAG AAA, alto contraste, zoom y lectura
│   └── styles.css          # Estilos generales, layout responsive, formulario y tarjetas
├── js/
│   ├── accesibility.js     # Módulo de síntesis de voz, vibración háptica y Live Announcer
│   ├── api.js              # Cliente REST, contratos de endpoints y contingencia offline
│   ├── app.js              # Controlador principal, validaciones reactivas y gestión de UI
│   └── map.js              # Motor cartográfico con Leaflet y trazado de rutas
├── index.html              # Marcado semántico HTML5 estructurado y accesible
└── readme.md               # Documentación técnica del módulo
```

---

## 💻 Cómo Ejecutar el Frontend

No requiere de compiladores pesados ni configuración compleja de Node/Webpack. Puede ejecutarse directamente abriendo `index.html` en cualquier navegador moderno o a través de cualquier servidor estático:

### Opción 1: Navegador directo
- Hacer doble clic en `Frontend/index.html`.

### Opción 2: Con Python
```bash
cd Frontend
python -m http.server 3000
```
Visitar `http://localhost:3000`.

### Opción 3: Con Live Server (VSCode)
- Clic derecho en `Frontend/index.html` -> *Open with Live Server*.
