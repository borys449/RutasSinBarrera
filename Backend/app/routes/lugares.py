from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import List, Optional
from app.data.storage import get_all_lugares

router = APIRouter(prefix="/api/lugares", tags=["Lugares"])


class Lugar(BaseModel):
    id: str
    nombre: str
    tipo: str
    lat: float
    lng: float
    referencia: Optional[str] = None


@router.get("", response_model=List[Lugar])
def listar_lugares(
    tipo: Optional[str] = Query(
        None,
        description="Filtrar por tipo de lugar: 'puerta', 'facultad' o 'punto_interes'"
    )
):
    """
    Devuelve los puntos de interés registrados en el campus ULEAM,
    con opción de filtrar por tipo.
    """
    return get_all_lugares(tipo)
