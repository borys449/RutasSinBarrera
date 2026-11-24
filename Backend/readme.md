# RutaSinBarreras — Guía Técnica de Backend e Integración API

Prototipo web de enrutamiento urbano accesible enfocado en el campus matriz de la **Universidad Laica Eloy Alfaro de Manabí (ULEAM)** en Manta, Ecuador. Este documento detalla las tareas correspondientes al desarrollo del **Backend** y la capa de comunicación **`Frontend/js/api.js`**, junto con el contrato de datos y las coordenadas geográficas de referencia del campus.

---

## 1. Alcance y Tareas Asignadas

### Backend (`Backend/app/`)
* **`Backend/app/data/campus_mock.json`**: Almacenar la base de datos inicial en formato JSON válido con los nodos del campus (puertas de acceso, facultades, puntos de referencia), obstáculos activos (escaleras, lomas empinadas, baches, rampas) y rutas accesibles predefinidas.
* **`Backend/app/services/routing_ai.py`**: Implementar la lógica de selección de rutas según el perfil de accesibilidad (`silla_ruedas`, `discapacidad_visual`, `muletas`) y generar el texto explicativo (`explicacion_ia`) detallando qué barreras se evitaron o qué accesos se priorizaron.
* **`Backend/app/routes/lugares.py`**: Exponer `GET /api/lugares` para devolver los puntos registrados del campus, permitiendo filtrar por `tipo` (`puerta`, `facultad`, `punto_interes`).
* **`Backend/app/routes/rutas.py`**: Exponer `POST /api/rutas/calcular` recibiendo `origen`, `destino` y `perfil`, devolviendo coordenadas de ruta, alertas, nivel de confianza y fecha de actualización.
* **`Backend/app/routes/reportes.py`**: Exponer `GET /api/obstaculos` y `POST /api/obstaculos` para consultar barreras vigentes y registrar nuevos reportes comunitarios persistiendo los cambios en `campus_mock.json`.
* **`Backend/app/main.py`**: Configurar la aplicación FastAPI, registrar los routers y habilitar **CORS** para permitir peticiones desde el frontend local sin bloqueos.

### Integración Frontend (`Frontend/js/api.js`)
* Centralizar todas las peticiones `fetch()` hacia los endpoints del backend (`GET /api/lugares`, `POST /api/rutas/calcular`, `GET /api/obstaculos`, `POST /api/obstaculos`).
* Implementar un **respaldo local (fallback offline)** con datos simulados en caso de que el servidor backend no esté levantado durante pruebas de interfaz o pérdida temporal de conexión.
* Garantizar que los objetos devueltos al resto del frontend (`app.js` y `map.js`) respeten exactamente el contrato de datos acordado.

---

## 2. Contrato de Datos (API REST)

### Estructura de Lugar (`GET /api/lugares`)
```json
{
  "id": "puerta_1",
  "nombre": "Puerta 1 - Ingreso principal",
  "tipo": "puerta",
  "lat": -0.9549122,
  "lng": -80.7460422
}
```

### Solicitud de Ruta (`POST /api/rutas/calcular`)
```json
{
  "origen": { "id": "puerta_1", "lat": -0.9524, "lng": -80.7455 },
  "destino": { "id": "fac_informatica", "lat": -0.9532, "lng": -80.7448 },
  "perfil": "silla_ruedas"
}
```
*Valores válidos para `perfil`: `silla_ruedas`, `discapacidad_visual`, `muletas`.*

### Respuesta de Ruta
```json
{
  "ruta_coordenadas": [
    [-0.9524, -80.7455],
    [-0.9529, -80.7451],
    [-0.9532, -80.7448]
  ],
  "obstaculos_evitados": ["Escaleras acceso central", "Loma muy empinada"],
  "alertas_en_ruta": [
    {
      "lat": -0.9529,
      "lng": -80.7451,
      "tipo": "rampa",
      "mensaje": "Rampa habilitada con pendiente suave"
    }
  ],
  "explicacion_ia": "Se seleccionó esta ruta para el perfil silla_ruedas porque evita escaleras y pendientes pronunciadas, priorizando el acceso por rampa.",
  "nivel_confianza": "Alto (94%)",
  "ultima_actualizacion": "2026-11-18"
}
```

### Reportes de Obstáculos (`GET` / `POST /api/obstaculos`)
```json
{
  "id": "obs_1",
  "tipo": "escaleras",
  "mensaje": "Escaleras sin rampa reportadas por un usuario",
  "lat": -0.954,
  "lng": -80.745,
  "nivel_confianza": "75%",
  "ultima_actualizacion": "AAAA-MM-DD"
}
```
*Valores sugeridos para `tipo`: `escaleras`, `loma_empinada`, `bache`, `rampa`.*
*No se precargan obstáculos: las alertas deben proceder de reportes de usuarios, no de ubicaciones de demostración.*

### Contrato compatible con el frontend

El backend conserva `/api/obstaculos` para su contrato original y expone además los endpoints que consume `Frontend/js/api.js`:

* `GET /api/lugares` devuelve `id`, `nombre`, `categoria`, `descripcion` y `coordenadas: [lat, lng]`. Los lugares almacenados como `puerta`, `facultad`, `biblioteca` y `punto_interes` se adaptan a las categorías del frontend.
* `POST /api/rutas/calcular` acepta `{ "origen_id": "...", "destino_id": "...", "perfil_movilidad": "..." }` y devuelve `coordenadasRuta`, `explicacionIA`, `distancia`, `tiempoEstimado`, `barrerasEvitadas` y `pasos`. También acepta el formato anterior con objetos `origen` y `destino`.
* `GET /api/reportes` adapta los obstáculos al modelo de reportes del frontend. `POST /api/reportes` registra reportes y `POST /api/reportes/{id}/confirmar` incrementa su confiabilidad.
* Los perfiles `baja_vision`, `baston_andador` y `adulto_mayor` se traducen a los perfiles que entiende el motor actual. El cálculo de ruta es experimental y debe validarse en campo; no representa una red peatonal verificada.

---

## 3. Coordenadas y Puntos de Referencia del Campus ULEAM (Manta)

Los pines de facultades, bibliotecas y puertas 1–3 corresponden a resultados de lugares de Google Maps; la puerta 4 proviene de OpenStreetMap. El centro es la referencia aproximada proporcionada por el usuario. Son ubicaciones de mapa, no un levantamiento topográfico ni una confirmación de accesibilidad; los edificios, entradas y condiciones de acceso deben verificarse en campo.

| ID | Lugar | Tipo | Latitud (`lat`) | Longitud (`lng`) |
| :--- | :--- | :--- | :---: | :---: |
| `uleam_centro` | Campus Matriz ULEAM (punto de referencia) | `punto_interes` | `-0.9527` | `-80.7452` |
| `puerta_1` | Puerta 1 - Ingreso principal | `puerta` | `-0.9549122` | `-80.7460422` |
| `puerta_2` | Puerta 2 ULEAM | `puerta` | `-0.9530482` | `-80.7436759` |
| `puerta_3` | Tercera puerta ULEAM | `puerta` | `-0.9506268` | `-80.7461297` |
| `puerta_4` | Puerta 4 ULEAM | `puerta` | `-0.9548909` | `-80.7441844` |
| `fac_informatica` | Facultad de Ciencias Informáticas (FACCI) | `facultad` | `-0.952382` | `-80.7447735` |
| `fac_industrial` | Facultad de Ingeniería Industrial | `facultad` | `-0.9512028` | `-80.7460773` |
| `fac_educacion` | Facultad de Ciencias de la Educación | `facultad` | `-0.9542543` | `-80.7461308` |
| `fac_odontologia` | Facultad de Ciencias de la Salud - Odontología | `facultad` | `-0.9529857` | `-80.7434419` |
| `fac_derecho` | Facultad de Ciencias Sociales, Derecho y Bienestar | `facultad` | `-0.9530813` | `-80.7462284` |
| `fac_turismo` | Facultad de Turismo y Hotelería | `facultad` | `-0.9537699` | `-80.7471212` |
| `fac_medicina` | Facultad de Ciencias Médicas | `facultad` | `-0.9517139` | `-80.7439939` |
| `biblioteca_economia` | Biblioteca de la Facultad de Economía | `biblioteca` | `-0.9540532` | `-80.74581` |
| `biblioteca_trabajo_social` | Biblioteca de Trabajo Social | `biblioteca` | `-0.950773` | `-80.7454928` |
| `biblioteca_derecho` | Biblioteca de Derecho | `biblioteca` | `-0.9531017` | `-80.7460541` |
| `biblioteca_ingenieria` | Biblioteca de Ingeniería | `biblioteca` | `-0.9518982` | `-80.7463366` |
| `biblioteca_arquitectura` | Biblioteca de Arquitectura | `biblioteca` | `-0.952776` | `-80.7462534` |

Los puntos de encuentro y el C.A.C. se retiraron del mapa por no contar con un pin verificable. Se pueden volver a agregar cuando se confirmen sus ubicaciones; tampoco se muestran obstáculos simulados como si fueran reportes reales.

---

## 4. Ejecución Local del Backend

1. Situarse en la carpeta `Backend`:
   ```bash
   cd Backend
   ```
2. Instalar dependencias (si aún no están instaladas):
   ```bash
   pip install fastapi uvicorn pydantic
   ```
3. Iniciar el servidor de desarrollo:
   ```bash
   uvicorn app.main:app --reload
   ```
4. Verificar documentación interactiva de endpoints en el navegador:
   * `http://127.0.0.1:8000/docs`

## 5. Registro e inicio de sesión

Las rutas de consulta siguen siendo públicas. Crear o confirmar reportes comunitarios requiere una sesión iniciada.

* `POST /api/auth/registro`: recibe `nombre`, `correo` y `password`; crea la cuenta y devuelve un token de acceso.
* `POST /api/auth/login`: recibe `correo` y `password`; devuelve un token de acceso.
* `GET /api/auth/me`: devuelve los datos de la cuenta actual, incluido `perfil_movilidad`. Requiere `Authorization: Bearer <token>`.
* `PATCH /api/auth/me`: actualiza el `perfil_movilidad` de la cuenta autenticada.
* `POST /api/auth/logout`: invalida la sesión actual.

El registro acepta `perfil_movilidad`: `silla_ruedas`, `baston_andador`, `baja_vision`, `adulto_mayor` o `estandar`. Las operaciones `POST` para crear o confirmar reportes requieren `Authorization: Bearer <token>`.

Las cuentas y sesiones se guardan en `Backend/app/data/users.sqlite3` (excluido de Git). Las contraseñas se almacenan con PBKDF2-HMAC-SHA256 y sal aleatoria; los tokens de sesión expiran a las 12 horas. En este prototipo el frontend conserva el token en `sessionStorage`; para producción, usa HTTPS, restringe CORS, agrega limitación de intentos y considera cookies `HttpOnly`/`Secure` o un proveedor de identidad.