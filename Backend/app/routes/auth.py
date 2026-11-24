import re
from typing import Dict, Literal, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel, Field, field_validator

from app.data.auth_storage import (
    authenticate_user,
    create_session,
    create_user,
    delete_session,
    get_session_user,
    initialize_auth_storage,
    update_user_mobility_profile,
)


router = APIRouter(prefix="/api/auth", tags=["Autenticación"])
bearer_scheme = HTTPBearer(auto_error=False)
initialize_auth_storage()


class Credenciales(BaseModel):
    correo: str = Field(..., min_length=3, max_length=254)
    password: str = Field(..., min_length=8, max_length=128)

    @field_validator("correo")
    @classmethod
    def validar_correo(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not re.fullmatch(r"[^@\s]{1,64}@[^@\s]{1,189}\.[^@\s]{2,}", normalized):
            raise ValueError("Ingresa un correo electrónico válido.")
        return normalized


class Registro(Credenciales):
    nombre: str = Field(..., min_length=2, max_length=80)
    perfil_movilidad: Literal[
        "silla_ruedas",
        "baston_andador",
        "baja_vision",
        "adulto_mayor",
        "estandar",
    ] = "estandar"

    @field_validator("nombre")
    @classmethod
    def validar_nombre(cls, value: str) -> str:
        normalized = value.strip()
        if len(normalized) < 2:
            raise ValueError("El nombre debe tener al menos 2 caracteres.")
        return normalized


class ActualizarPerfilMovilidad(BaseModel):
    perfil_movilidad: Literal[
        "silla_ruedas",
        "baston_andador",
        "baja_vision",
        "adulto_mayor",
        "estandar",
    ]


def _respuesta_sesion(user: Dict) -> Dict:
    return {
        "access_token": create_session(user["id"]),
        "token_type": "bearer",
        "usuario": user,
    }


@router.post("/registro", status_code=status.HTTP_201_CREATED)
def registrar_usuario(registro: Registro):
    user = create_user(
        registro.nombre,
        registro.correo,
        registro.password,
        registro.perfil_movilidad,
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Ya existe una cuenta con ese correo electrónico.",
        )
    return _respuesta_sesion(user)


@router.post("/login")
def iniciar_sesion(credenciales: Credenciales):
    user = authenticate_user(credenciales.correo, credenciales.password)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return _respuesta_sesion(user)


def usuario_opcional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
) -> Optional[Dict]:
    if credentials is None:
        return None
    if credentials.scheme.lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El esquema de autenticación no es válido.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = get_session_user(credentials.credentials)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="La sesión expiró o no es válida. Inicia sesión nuevamente.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def usuario_autenticado(
    user: Optional[Dict] = Depends(usuario_opcional),
) -> Dict:
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Inicia sesión para realizar esta acción.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


@router.get("/me")
def obtener_usuario_actual(user: Dict = Depends(usuario_autenticado)):
    return user


@router.patch("/me")
def actualizar_perfil_movilidad(
    perfil: ActualizarPerfilMovilidad,
    user: Dict = Depends(usuario_autenticado),
):
    updated_user = update_user_mobility_profile(
        user["id"], perfil.perfil_movilidad
    )
    if updated_user is None:
        raise HTTPException(status_code=404, detail="No se encontró la cuenta.")
    return updated_user


@router.post("/logout")
def cerrar_sesion(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    _user: Dict = Depends(usuario_autenticado),
):
    if credentials is not None:
        delete_session(credentials.credentials)
    return {"mensaje": "Sesión cerrada correctamente."}
