import json
from pathlib import Path
from typing import Dict, Any, List, Optional
import threading
from datetime import date

MOCK_FILE_PATH = Path(__file__).resolve().parent / "campus_mock.json"
_lock = threading.Lock()


def load_raw_data() -> Dict[str, Any]:
    with _lock:
        if not MOCK_FILE_PATH.exists():
            return {"lugares": [], "obstaculos": []}
        with open(MOCK_FILE_PATH, "r", encoding="utf-8") as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return {"lugares": [], "obstaculos": []}


def save_raw_data(data: Dict[str, Any]) -> None:
    with _lock:
        with open(MOCK_FILE_PATH, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)


def get_all_lugares(tipo: Optional[str] = None) -> List[Dict[str, Any]]:
    data = load_raw_data()
    lugares = data.get("lugares", [])
    if tipo:
        tipo_normalizado = tipo.strip().lower()
        return [l for l in lugares if l.get("tipo", "").lower() == tipo_normalizado]
    return lugares


def get_all_obstaculos() -> List[Dict[str, Any]]:
    data = load_raw_data()
    return data.get("obstaculos", [])


def save_new_obstaculo(obstaculo: Dict[str, Any]) -> Dict[str, Any]:
    data = load_raw_data()
    obstaculos = data.get("obstaculos", [])

    if not obstaculo.get("id"):
        # Generar id autoincremental
        siguiente_num = len(obstaculos) + 1
        obstaculo["id"] = f"obs_{siguiente_num}"

    obstaculos.append(obstaculo)
    data["obstaculos"] = obstaculos
    save_raw_data(data)
    return obstaculo


def increment_obstaculo_confirmation(obstaculo_id: str) -> Optional[Dict[str, Any]]:
    data = load_raw_data()
    for obstaculo in data.get("obstaculos", []):
        if obstaculo.get("id") != obstaculo_id:
            continue

        confianza = obstaculo.get("confianza")
        if confianza is None:
            digits = "".join(char for char in str(obstaculo.get("nivel_confianza", "")) if char.isdigit())
            confianza = int(digits) if digits else 75

        obstaculo["confirmaciones"] = int(obstaculo.get("confirmaciones", 0)) + 1
        obstaculo["confianza"] = min(99, int(confianza) + 5)
        obstaculo["nivel_confianza"] = f"{obstaculo['confianza']}%"
        obstaculo["ultima_actualizacion"] = date.today().isoformat()
        save_raw_data(data)
        return obstaculo

    return None
