import math
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Dict, List, Optional, Any
from app.data.storage import get_all_obstaculos, get_all_lugares
from app.services.routing_ai import calcular_ruta_accesible

router = APIRouter(prefix="/api/rutas", tags=["Rutas"])


class PuntoCoordenada(BaseModel):
    id: Optional[str] = None
    lat: float
    lng: float
    nombre: Optional[str] = None


class SolicitudRuta(BaseModel):
    origen_id: Optional[str] = None
    destino_id: Optional[str] = None
    perfil_movilidad: Optional[str] = None
    origen: Optional[PuntoCoordenada] = None
    destino: Optional[PuntoCoordenada] = None
    perfil: Optional[str] = None


class RespuestaRutaFrontend(BaseModel):
    exito: bool
    origen: str
    destino: str
    perfil: str
    coordenadasRuta: List[List[float]]
    explicacionIA: str
    distancia: str
    tiempoEstimado: str
    barrerasEvitadas: int
    pasos: List[str]


@router.post("/calcular", response_model=RespuestaRutaFrontend)
def calcular_ruta(solicitud: SolicitudRuta):
    """
    Calcula una ruta peatonal accesible entre dos puntos en el campus ULEAM,
    considerando el perfil del usuario y los obstáculos reportados.
    """
    lugares = get_all_lugares()
    origen = _resolver_punto(solicitud.origen_id, solicitud.origen, lugares, "origen")
    destino = _resolver_punto(solicitud.destino_id, solicitud.destino, lugares, "destino")

    perfil = (solicitud.perfil_movilidad or solicitud.perfil or "silla_ruedas").strip().lower()
    perfiles_motor = {
        "silla_ruedas": "silla_ruedas",
        "baja_vision": "discapacidad_visual",
        "discapacidad_visual": "discapacidad_visual",
        "baston_andador": "muletas",
        "adulto_mayor": "muletas",
        "muletas": "muletas",
        "estandar": "estandar"
    }
    if perfil not in perfiles_motor:
        raise HTTPException(
            status_code=400,
            detail=f"Perfil no válido: {perfil}"
        )

    obstaculos = get_all_obstaculos()
    resultado = calcular_ruta_accesible(
        origen=origen,
        destino=destino,
        perfil=perfiles_motor[perfil],
        obstaculos=obstaculos,
        lugares=lugares
    )

    coordenadas = resultado["ruta_coordenadas"]
    distancia_m = sum(
        _distancia_metros(inicio, fin)
        for inicio, fin in zip(coordenadas, coordenadas[1:])
    )
    minutos = max(1, math.ceil(distancia_m / 60))
    nombre_origen = origen.get("nombre") or origen.get("id") or "Origen"
    nombre_destino = destino.get("nombre") or destino.get("id") or "Destino"

    return RespuestaRutaFrontend(
        exito=True,
        origen=nombre_origen,
        destino=nombre_destino,
        perfil=perfil,
        coordenadasRuta=coordenadas,
        explicacionIA=(
            f"{resultado['explicacion_ia']} "
            "El trazado es experimental y debe validarse en campo; no representa una ruta peatonal verificada."
        ),
        distancia=f"{round(distancia_m)} m",
        tiempoEstimado=f"{minutos} min aprox.",
        barrerasEvitadas=len(resultado["obstaculos_evitados"]),
        pasos=[
            f"Inicio: {nombre_origen}.",
            "Sigue el trazado experimental del mapa y verifica las condiciones del camino en sitio.",
            f"Destino: {nombre_destino}."
        ]
    )


def _resolver_punto(
    lugar_id: Optional[str],
    punto: Optional[PuntoCoordenada],
    lugares: List[Dict[str, Any]],
    nombre_campo: str
) -> Dict[str, Any]:
    if lugar_id:
        lugar = next((item for item in lugares if item.get("id") == lugar_id), None)
        if lugar is None:
            raise HTTPException(status_code=404, detail=f"No se encontró el {nombre_campo} '{lugar_id}'")
        return {
            "id": lugar["id"],
            "nombre": lugar.get("nombre"),
            "lat": lugar["lat"],
            "lng": lugar["lng"]
        }

    if punto is None:
        raise HTTPException(status_code=422, detail=f"Se requiere el ID o las coordenadas del {nombre_campo}")
    return punto.model_dump()


def _distancia_metros(punto_a: List[float], punto_b: List[float]) -> float:
    radio_tierra_m = 6_371_000
    lat1, lng1 = map(math.radians, punto_a)
    lat2, lng2 = map(math.radians, punto_b)
    delta_lat = lat2 - lat1
    delta_lng = lng2 - lng1
    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1) * math.cos(lat2) * math.sin(delta_lng / 2) ** 2
    )
    return radio_tierra_m * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
