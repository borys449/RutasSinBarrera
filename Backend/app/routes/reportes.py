from datetime import date
from fastapi import APIRouter, status
from pydantic import BaseModel, Field
from typing import List, Optional
from app.data.storage import get_all_obstaculos, save_new_obstaculo

router = APIRouter(prefix="/api/obstaculos", tags=["Obstáculos y Reportes"])


class ObstaculoBase(BaseModel):
    tipo: str = Field(..., description="Tipo de obstáculo: 'escaleras', 'loma_empinada', 'bache', 'rampa'")
    mensaje: str = Field(..., description="Descripción o advertencia del obstáculo")
    lat: float
    lng: float
    nivel_confianza: Optional[str] = "Alto (95%)"
    ultima_actualizacion: Optional[str] = None


class ObstaculoCrear(ObstaculoBase):
    id: Optional[str] = None


class Obstaculo(ObstaculoBase):
    id: str


@router.get("", response_model=List[Obstaculo])
def listar_obstaculos():
    """
    Devuelve la lista completa de barreras, obstáculos y apoyos de accesibilidad
    vigentes en el campus ULEAM.
    """
    return get_all_obstaculos()


@router.post("", response_model=Obstaculo, status_code=status.HTTP_201_CREATED)
def reportar_obstaculo(obstaculo_in: ObstaculoCrear):
    """
    Registra un nuevo obstáculo o reporte comunitario de accesibilidad
    y lo persiste en la base de datos campus_mock.json.
    """
    datos = obstaculo_in.model_dump()
    if not datos.get("ultima_actualizacion"):
        datos["ultima_actualizacion"] = date.today().isoformat()
    if not datos.get("nivel_confianza"):
        datos["nivel_confianza"] = "Medio (85%)"

    nuevo_obstaculo = save_new_obstaculo(datos)
    return nuevo_obstaculo
