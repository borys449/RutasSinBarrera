import hashlib
import hmac
import secrets
import sqlite3
import time
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Dict, Optional


DATABASE_PATH = Path(__file__).resolve().parent / "users.sqlite3"
PASSWORD_ITERATIONS = 310_000
SESSION_DURATION_SECONDS = 12 * 60 * 60


@contextmanager
def _connect():
    connection = sqlite3.connect(DATABASE_PATH, timeout=10)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    try:
        with connection:
            yield connection
    finally:
        connection.close()


def initialize_auth_storage() -> None:
    with _connect() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                nombre TEXT NOT NULL,
                correo TEXT NOT NULL UNIQUE COLLATE NOCASE,
                password_hash BLOB NOT NULL,
                password_salt BLOB NOT NULL,
                creado_en TEXT NOT NULL,
                perfil_movilidad TEXT NOT NULL DEFAULT 'estandar'
            );
            CREATE TABLE IF NOT EXISTS sessions (
                token_hash TEXT PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                expires_at INTEGER NOT NULL
            );
            CREATE INDEX IF NOT EXISTS sessions_expiration
                ON sessions(expires_at);
            """
        )
        columns = {
            row["name"] for row in connection.execute("PRAGMA table_info(users)")
        }
        if "perfil_movilidad" not in columns:
            connection.execute(
                "ALTER TABLE users ADD COLUMN perfil_movilidad "
                "TEXT NOT NULL DEFAULT 'estandar'"
            )


def _hash_password(password: str, salt: bytes) -> bytes:
    return hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, PASSWORD_ITERATIONS
    )


def create_user(
    nombre: str,
    correo: str,
    password: str,
    perfil_movilidad: str = "estandar",
) -> Optional[Dict[str, Any]]:
    salt = secrets.token_bytes(16)
    password_hash = _hash_password(password, salt)
    creado_en = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    try:
        with _connect() as connection:
            cursor = connection.execute(
                """
                INSERT INTO users (
                    nombre, correo, password_hash, password_salt, creado_en, perfil_movilidad
                )
                VALUES (?, ?, ?, ?, ?, ?)
                """,
                (
                    nombre.strip(),
                    correo.strip().lower(),
                    password_hash,
                    salt,
                    creado_en,
                    perfil_movilidad,
                ),
            )
            user_id = cursor.lastrowid
    except sqlite3.IntegrityError:
        return None

    return {
        "id": user_id,
        "nombre": nombre.strip(),
        "correo": correo.strip().lower(),
        "creado_en": creado_en,
        "perfil_movilidad": perfil_movilidad,
    }


def authenticate_user(correo: str, password: str) -> Optional[Dict[str, Any]]:
    with _connect() as connection:
        user = connection.execute(
            "SELECT id, nombre, correo, password_hash, password_salt, creado_en, perfil_movilidad "
            "FROM users WHERE correo = ? COLLATE NOCASE",
            (correo.strip().lower(),),
        ).fetchone()

    if user is None:
        return None

    password_hash = _hash_password(password, user["password_salt"])
    if not hmac.compare_digest(password_hash, user["password_hash"]):
        return None

    return _public_user(user)


def create_session(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    expires_at = int(time.time()) + SESSION_DURATION_SECONDS
    with _connect() as connection:
        connection.execute(
            "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
            (token_hash, user_id, expires_at),
        )
        connection.execute("DELETE FROM sessions WHERE expires_at <= ?", (int(time.time()),))
    return token


def get_session_user(token: str) -> Optional[Dict[str, Any]]:
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    now = int(time.time())
    with _connect() as connection:
        user = connection.execute(
            """
            SELECT users.id, users.nombre, users.correo, users.creado_en,
                   users.perfil_movilidad
            FROM sessions
            JOIN users ON users.id = sessions.user_id
            WHERE sessions.token_hash = ? AND sessions.expires_at > ?
            """,
            (token_hash, now),
        ).fetchone()
        connection.execute("DELETE FROM sessions WHERE expires_at <= ?", (now,))
    return _public_user(user) if user is not None else None


def delete_session(token: str) -> None:
    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    with _connect() as connection:
        connection.execute("DELETE FROM sessions WHERE token_hash = ?", (token_hash,))


def update_user_mobility_profile(
    user_id: int, perfil_movilidad: str
) -> Optional[Dict[str, Any]]:
    with _connect() as connection:
        connection.execute(
            "UPDATE users SET perfil_movilidad = ? WHERE id = ?",
            (perfil_movilidad, user_id),
        )
        user = connection.execute(
            "SELECT id, nombre, correo, creado_en, perfil_movilidad "
            "FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
    return _public_user(user) if user is not None else None


def _public_user(user: sqlite3.Row) -> Dict[str, Any]:
    return {
        "id": user["id"],
        "nombre": user["nombre"],
        "correo": user["correo"],
        "creado_en": user["creado_en"],
        "perfil_movilidad": user["perfil_movilidad"],
    }
