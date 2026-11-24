from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Dict, List, Optional, Tuple
from app.data.storage import (
    delete_obstaculo,
    get_all_obstaculos,
    increment_obstaculo_confirmation,
    save_new_obstaculo,
    update_obstaculo,
)
from app.routes.auth import usuario_autenticado, usuario_opcional

router = APIRouter(prefix="/api/obstaculos", tags=["Obstáculos y Reportes"])
reportes_router = APIRouter(prefix="/api/reportes", tags=["Reportes del frontend"])


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


class ReporteFrontend(BaseModel):
    id: str
    titulo: str
    tipo: str
    severidad: str
    descripcion: str
    coordenadas: List[float]
    fechaActualizacion: str
    confirmaciones: int
    confianza: int
    esPropietario: bool = False


class ReporteBaseFrontend(BaseModel):
    titulo: str = Field(..., min_length=4)
    tipo: str
    severidad: str
    descripcion: str = Field(..., min_length=6)


class ReporteCrearFrontend(ReporteBaseFrontend):
    coordenadas: Tuple[float, float]


class ReporteActualizarFrontend(BaseModel):
    titulo: str = Field(..., min_length=4)
    tipo: str
    severidad: str
    descripcion: str = Field(..., min_length=6)


class ConfirmacionFrontend(BaseModel):
    exito: bool
    nuevoNivelConfianza: int


@router.get("", response_model=List[Obstaculo])
def listar_obstaculos():
    """
    Devuelve la lista completa de barreras, obstáculos y apoyos de accesibilidad
    vigentes en el campus ULEAM.
    """
    return get_all_obstaculos()


@router.post("", response_model=Obstaculo, status_code=status.HTTP_201_CREATED)
def reportar_obstaculo(
    obstaculo_in: ObstaculoCrear,
    usuario: Dict = Depends(usuario_autenticado),
):
    """
    Registra un nuevo obstáculo o reporte comunitario de accesibilidad
    y lo persiste en la base de datos campus_mock.json.
    """
    datos = obstaculo_in.model_dump()
    datos["creador_id"] = usuario["id"]
    if not datos.get("ultima_actualizacion"):
        datos["ultima_actualizacion"] = date.today().isoformat()
    if not datos.get("nivel_confianza"):
        datos["nivel_confianza"] = "Medio (85%)"

    nuevo_obstaculo = save_new_obstaculo(datos)
    return nuevo_obstaculo


@reportes_router.get("", response_model=List[ReporteFrontend])
def listar_reportes_frontend(
    usuario: Optional[Dict] = Depends(usuario_opcional),
):
    return [
        _adaptar_obstaculo(obstaculo, usuario)
        for obstaculo in get_all_obstaculos()
    ]


@reportes_router.post("", status_code=status.HTTP_201_CREATED)
def crear_reporte_frontend(
    reporte: ReporteCrearFrontend,
    _usuario: Dict = Depends(usuario_autenticado),
):
    lat, lng = reporte.coordenadas
    datos = {
        "titulo": reporte.titulo,
        "tipo": reporte.tipo,
        "severidad": reporte.severidad,
        "descripcion": reporte.descripcion,
        "mensaje": f"{reporte.titulo}: {reporte.descripcion}",
        "lat": lat,
        "lng": lng,
        "coordenadas": [lat, lng],
        "confirmaciones": 1,
        "confianza": 75,
        "nivel_confianza": "75%",
        "ultima_actualizacion": date.today().isoformat(),
        "creador_id": _usuario["id"],
    }
    guardado = save_new_obstaculo(datos)
    return {
        "exito": True,
        "mensaje": "Reporte registrado correctamente.",
        "reporte": _adaptar_obstaculo(guardado, _usuario)
    }


@reportes_router.put("/{reporte_id}", status_code=status.HTTP_200_OK)
def actualizar_reporte_frontend(
    reporte_id: str,
    reporte: ReporteActualizarFrontend,
    usuario: Dict = Depends(usuario_autenticado),
):
    cambios = {
        "titulo": reporte.titulo,
        "tipo": reporte.tipo,
        "severidad": reporte.severidad,
        "descripcion": reporte.descripcion,
        "mensaje": f"{reporte.titulo}: {reporte.descripcion}",
        "ultima_actualizacion": date.today().isoformat(),
        "fechaActualizacion": date.today().isoformat(),
    }
    actualizado = update_obstaculo(reporte_id, usuario["id"], cambios)
    if actualizado is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No existe el reporte o no tienes permiso para modificarlo.",
        )
    return {
        "exito": True,
        "mensaje": "Reporte actualizado correctamente.",
        "reporte": _adaptar_obstaculo(actualizado, usuario),
    }


@reportes_router.delete("/{reporte_id}", status_code=status.HTTP_200_OK)
def eliminar_reporte_frontend(
    reporte_id: str,
    usuario: Dict = Depends(usuario_autenticado),
):
    if not delete_obstaculo(reporte_id, usuario["id"]):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No existe el reporte o no tienes permiso para eliminarlo.",
        )
    return {"exito": True, "mensaje": "Reporte eliminado correctamente."}


@reportes_router.post("/{reporte_id}/confirmar", response_model=ConfirmacionFrontend)
def confirmar_reporte_frontend(
    reporte_id: str,
    _usuario: Dict = Depends(usuario_autenticado),
):
    obstaculo = increment_obstaculo_confirmation(reporte_id)
    if obstaculo is None:
        raise HTTPException(status_code=404, detail=f"No existe el reporte '{reporte_id}'")
    return {
        "exito": True,
        "nuevoNivelConfianza": _extraer_confianza(obstaculo)
    }


def _adaptar_obstaculo(
    obstaculo: Dict, usuario: Optional[Dict] = None
) -> ReporteFrontend:
    mensaje = obstaculo.get("mensaje", "")
    titulo_mensaje, separator, descripcion_mensaje = mensaje.partition(":")
    coordenadas = obstaculo.get("coordenadas")
    if coordenadas is None:
        coordenadas = [obstaculo["lat"], obstaculo["lng"]]

    return ReporteFrontend(
        id=obstaculo["id"],
        titulo=obstaculo.get("titulo") or titulo_mensaje or obstaculo.get("tipo", "obstaculo"),
        tipo=obstaculo.get("tipo", "otro"),
        severidad=obstaculo.get("severidad", "sin_clasificar"),
        descripcion=obstaculo.get("descripcion") or (descripcion_mensaje.strip() if separator else mensaje),
        coordenadas=coordenadas,
        fechaActualizacion=obstaculo.get("fechaActualizacion") or obstaculo.get("ultima_actualizacion", ""),
        confirmaciones=int(obstaculo.get("confirmaciones", 0)),
        confianza=_extraer_confianza(obstaculo),
        esPropietario=bool(
            usuario and obstaculo.get("creador_id") == usuario.get("id")
        ),
    )


def _extraer_confianza(obstaculo: Dict) -> int:
    confianza = obstaculo.get("confianza")
    if confianza is not None:
        return int(confianza)
    nivel = str(obstaculo.get("nivel_confianza", ""))
    digits = "".join(char for char in nivel if char.isdigit())
    return int(digits) if digits else 0
