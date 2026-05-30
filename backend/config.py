from __future__ import annotations

from pathlib import Path
from typing import Any
import os

PROJECT_ROOT = Path(__file__).resolve().parents[1]
BACKEND_DIR = PROJECT_ROOT / "backend"
STORAGE_DIR = BACKEND_DIR / "storage"
UPLOAD_DIR = STORAGE_DIR / "uploads"
PREVIEW_DIR = STORAGE_DIR / "previews"
OUTPUT_DIR = PROJECT_ROOT / "notebooks" / "outputs"

# Control whether preview images are persisted to the repository storage folder.
# Set environment variable SAVE_PREVIEWS=1 to enable saving; default is disabled
# to avoid cluttering the project folder during development.
SAVE_PREVIEWS = os.environ.get("SAVE_PREVIEWS", "0") in ("1", "true", "True")


STYLE_THEMES: dict[str, dict[str, list[int]]] = {
    "scandinavian": {
        "wall": [244, 239, 232],
        "sofa": [233, 226, 218],
        "wood": [199, 175, 145],
        "accent": [165, 191, 183],
    },
    "modern_luxe": {
        "wall": [226, 220, 214],
        "sofa": [58, 62, 70],
        "wood": [139, 104, 84],
        "accent": [192, 153, 105],
    },
    "japandi": {
        "wall": [238, 232, 222],
        "sofa": [208, 198, 184],
        "wood": [176, 143, 108],
        "accent": [124, 145, 133],
    },
    "industrial": {
        "wall": [225, 225, 226],
        "sofa": [80, 82, 87],
        "wood": [126, 110, 98],
        "accent": [112, 126, 143],
    },
}

FURNITURE_CATALOG: list[dict[str, Any]] = [
    {
        "id": "sofa-midcentury",
        "label": "Mid-century sofa",
        "category": "sofa",
        "style": "warm modern",
        "previewColor": "#7b6d62",
    },
    {
        "id": "chair-scandi",
        "label": "Scandinavian lounge chair",
        "category": "chair",
        "style": "airy minimal",
        "previewColor": "#d9d2c7",
    },
    {
        "id": "table-wood",
        "label": "Oak coffee table",
        "category": "table",
        "style": "natural",
        "previewColor": "#c8a47d",
    },
    {
        "id": "lamp-arc",
        "label": "Arc floor lamp",
        "category": "lamp",
        "style": "statement",
        "previewColor": "#b88a5a",
    },
]


def ensure_storage_dirs() -> None:
    folders = [UPLOAD_DIR, OUTPUT_DIR]
    if SAVE_PREVIEWS:
        folders.insert(1, PREVIEW_DIR)
    for folder in folders:
        folder.mkdir(parents=True, exist_ok=True)
