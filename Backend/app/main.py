from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes.lugares import router as lugares_router
from app.routes.rutas import router as rutas_router
from app.routes.reportes import router as reportes_router

app = FastAPI(
    title="RutaSinBarreras API — Campus ULEAM Manta",
    description=(
        "Backend para el prototipo de enrutamiento urbano accesible enfocado en "
        "el campus matriz de la Universidad Laica Eloy Alfaro de Manabí (ULEAM) en Manta, Ecuador. "
        "Permite calcular rutas adaptadas a personas con discapacidad motriz y visual, "
        "consultar lugares clave y registrar barreras físicas colaborativas."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configuración de CORS para permitir peticiones del frontend local (Live Server, file://, localhost)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Registro de routers de la API
app.include_router(lugares_router)
app.include_router(rutas_router)
app.include_router(reportes_router)


@app.get("/", tags=["General"])
def inicio():
    return {
        "sistema": "RutaSinBarreras API",
        "campus": "Universidad Laica Eloy Alfaro de Manabí (ULEAM)",
        "estado": "Operativo",
        "documentacion": "/docs"
    }
