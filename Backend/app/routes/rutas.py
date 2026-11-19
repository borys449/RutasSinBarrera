from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional, Any
from app.data.storage import get_all_obstaculos, get_all_lugares
from app.services.routing_ai import calcular_ruta_accesible

router = APIRouter(prefix="/api/rutas", tags=["Rutas"])


class PuntoCoordenada(BaseModel):
    id: Optional[str] = None
    lat: float
    lng: float
    nombre: Optional[str] = None


class AlertaEnRuta(BaseModel):
    lat: float
    lng: float
    tipo: str
    mensaje: str


class SolicitudRuta(BaseModel):
    origen: PuntoCoordenada
    destino: PuntoCoordenada
    perfil: str = Field(
        default="silla_ruedas",
        description="Perfil de accesibilidad: 'silla_ruedas', 'discapacidad_visual', 'muletas'"
    )


class RespuestaRuta(BaseModel):
    ruta_coordenadas: List[List[float]]
    obstaculos_evitados: List[str]
    alertas_en_ruta: List[AlertaEnRuta]
    explicacion_ia: str
    nivel_confianza: str
    ultima_actualizacion: str


@router.post("/calcular", response_model=RespuestaRuta)
def calcular_ruta(solicitud: SolicitudRuta):
    """
    Calcula una ruta peatonal accesible entre dos puntos en el campus ULEAM,
    considerando el perfil del usuario y los obstáculos reportados.
    """
    perfiles_validos = ["silla_ruedas", "discapacidad_visual", "muletas"]
    perfil_clean = solicitud.perfil.strip().lower()
    if perfil_clean not in perfiles_validos:
        raise HTTPException(
            status_code=400,
            detail=f"Perfil no válido. Debe ser uno de: {', '.join(perfiles_validos)}"
        )

    obstaculos = get_all_obstaculos()
    lugares = get_all_lugares()

    resultado = calcular_ruta_accesible(
        origen=solicitud.origen.model_dump(),
        destino=solicitud.destino.model_dump(),
        perfil=perfil_clean,
        obstaculos=obstaculos,
        lugares=lugares
    )

    return resultado
