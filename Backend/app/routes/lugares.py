from fastapi import APIRouter, Query
from pydantic import BaseModel
from typing import List, Optional
from app.data.storage import get_all_lugares

router = APIRouter(prefix="/api/lugares", tags=["Lugares"])


class LugarFrontend(BaseModel):
    id: str
    nombre: str
    categoria: str
    descripcion: str
    coordenadas: List[float]


@router.get("", response_model=List[LugarFrontend])
def listar_lugares(
    tipo: Optional[str] = Query(
        None,
        description="Filtrar por tipo: 'puerta', 'facultad', 'biblioteca' o 'punto_interes'"
    )
):
    """
    Devuelve los puntos de interés registrados en el campus ULEAM,
    con el formato que consume el frontend y opción de filtrar por tipo.
    """
    lugares = get_all_lugares(tipo)
    return [
        LugarFrontend(
            id=lugar["id"],
            nombre=lugar["nombre"],
            categoria=_categoria_frontend(lugar),
            descripcion=_descripcion_frontend(lugar),
            coordenadas=[lugar["lat"], lugar["lng"]]
        )
        for lugar in lugares
    ]


def _categoria_frontend(lugar: dict) -> str:
    if lugar["tipo"] == "puerta":
        return "acceso"
    if lugar["id"] == "uleam_centro":
        return "campus"
    if lugar["tipo"] == "punto_interes":
        return "punto_interes"
    return lugar["tipo"]


def _descripcion_frontend(lugar: dict) -> str:
    referencia = lugar.get("referencia", "")
    if referencia:
        return f"Ubicación de referencia: {referencia}. Coordenadas por validar en campo."
    return "Coordenadas por validar en campo."
