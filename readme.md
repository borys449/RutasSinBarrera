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
  "nombre": "Puerta 1 - Ingreso Principal",
  "tipo": "puerta",
  "lat": -0.9524,
  "lng": -80.7455
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
  "mensaje": "No apto por aquí: escaleras sin rampa en acceso central",
  "lat": -0.9536,
  "lng": -80.7446,
  "nivel_confianza": "Alto (95%)",
  "ultima_actualizacion": "2026-11-18"
}
```
*Valores sugeridos para `tipo`: `escaleras`, `loma_empinada`, `bache`, `rampa`.*

---

## 3. Coordenadas y Puntos de Referencia del Campus ULEAM (Manta)

Tabla consolidada cruzando los registros geográficos de Google Maps (Av. Circunvalación, Manta) con la distribución interna de bloques, ingresos y zonas de encuentro de los planos institucionales del campus matriz:

| ID Sugerido | Nombre / Ubicación en Campus | Tipo | Referencia en Planos / Mapa | Latitud (`lat`) | Longitud (`lng`) |
| :--- | :--- | :--- | :--- | :---: | :---: |
| `uleam_centro` | Campus Matriz ULEAM (Centro) | `punto_interes` | Estadio Universitario / Eje central del campus | `-0.9538` | `-80.7448` |
| `puerta_1` | Puerta 1 - Ingreso Principal | `puerta` | Calle S/N - Ingreso Universidad (junto a Plaza Cultural y Av. Circunvalación) | `-0.9521` | `-80.7456` |
| `puerta_2` | Puerta 2 - Acceso Av. Circunvalación | `puerta` | Sector medio sobre Av. Circunvalación (cerca de Bloques B-16 / B-17) | `-0.9542` | `-80.7463` |
| `puerta_3` | Tercera Puerta ULEAM | `puerta` | Acceso sector norte / Avenida Universidad 5 | `-0.9516` | `-80.7442` |
| `fac_informatica` | Facultad de Ciencias Informáticas (FACCI) | `facultad` | Zona central-norte, junto al eje peatonal interior | `-0.9531` | `-80.7446` |
| `fac_industrial` | Facultad de Ingeniería Industrial | `facultad` | Sector norte, próximo a Tercera Puerta y Calle Universidad 6 | `-0.9523` | `-80.7449` |
| `fac_educacion` | Facultad de Ciencias de la Educación | `facultad` | Sector central del campus (cercano al área de Odontología) | `-0.9535` | `-80.7442` |
| `fac_odontologia` | Facultad de Ciencias de la Salud - Odontología | `facultad` | Contigua a Ciencias de la Educación, sector central-este | `-0.9536` | `-80.7438` |
| `fac_derecho` | Facultad de Ciencias Sociales, Derecho y Bienestar | `facultad` | Sector central (Jurisprudencia ULEAM) | `-0.9534` | `-80.7445` |
| `fac_turismo` | Facultad de Turismo y Hotelería | `facultad` | Sector suroeste, cercano a Av. Eléctricos 4 | `-0.9544` | `-80.7456` |
| `fac_medicina` | Facultad de Ciencias Médicas | `facultad` | Sector perimetral sobre Av. Circunvalación | `-0.9549` | `-80.7458` |
| `punto_encuentro_1` | Explanada Trabajo Social (Punto Encuentro 1) | `punto_interes` | Zona norte-central interior (plano de evacuación) | `-0.9528` | `-80.7449` |
| `punto_encuentro_2` | Canchas Múltiples (Punto Encuentro 2) | `punto_interes` | Zona este/sureste junto a Bloques B-05 / B-13 | `-0.9546` | `-80.7436` |
| `punto_encuentro_3` | Parque Comunicación (Punto Encuentro 3) | `punto_interes` | Sector oeste-central interior | `-0.9539` | `-80.7457` |
| `cac_uleam` | Centro de Atención Ciudadana (C.A.C.) | `punto_interes` | Sector norte, entre Plaza Cultural y Estadio Universitario | `-0.9527` | `-80.7453` |

> **Nota de calibración:** Debido a que los mapas comerciales presentan desfases respecto a las vías internas actuales de la universidad, estas coordenadas funcionan como base georreferenciada para el prototipo y pueden ajustarse con precisión decimal en `campus_mock.json` tras validación en campo.

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
