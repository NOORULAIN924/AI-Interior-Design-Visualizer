from __future__ import annotations

from typing import Any

import numpy as np

try:
    import cv2  # type: ignore
except Exception:
    cv2 = None


def rgb_to_hex(rgb: np.ndarray | list[int] | tuple[int, int, int]) -> str:
    arr = np.array(rgb, dtype=np.int32)
    return f"#{int(arr[0]):02x}{int(arr[1]):02x}{int(arr[2]):02x}"


def hex_to_rgb(color_hex: str) -> np.ndarray:
    text = color_hex.replace("#", "")
    if len(text) != 6:
        return np.array([232, 223, 213], dtype=np.uint8)
    return np.array([int(text[0:2], 16), int(text[2:4], 16), int(text[4:6], 16)], dtype=np.uint8)


def extract_palette(image_rgb: np.ndarray, mask: np.ndarray | None = None, k: int = 4) -> dict[str, Any]:
    if mask is None:
        pixels = image_rgb.reshape(-1, 3)
    else:
        pixels = image_rgb[mask.astype(bool)]
    if pixels.size == 0:
        return {"regionPixelCount": 0, "swatches": [], "roles": {}}

    samples = pixels.astype(np.float32)
    unique_samples = np.unique(samples, axis=0)
    cluster_count = max(1, min(k, len(unique_samples)))

    if cv2 is not None and cluster_count > 1:
        criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 25, 1.0)
        compactness, labels, centers = cv2.kmeans(
            samples,
            cluster_count,
            None,
            criteria,
            8,
            cv2.KMEANS_PP_CENTERS,
        )
        counts = np.bincount(labels.flatten(), minlength=cluster_count)
    else:
        centers = unique_samples[np.linspace(0, len(unique_samples) - 1, cluster_count, dtype=int)]
        counts = np.ones(cluster_count, dtype=np.int32)
        compactness = 0.0

    total = float(counts.sum()) if counts.sum() > 0 else 1.0
    ranked_indices = np.argsort(counts)[::-1]

    swatches: list[dict[str, Any]] = []
    for rank, index in enumerate(ranked_indices):
        rgb = np.clip(np.round(centers[index]), 0, 255).astype(int)
        swatches.append(
            {
                "rank": rank,
                "rgb": [int(rgb[0]), int(rgb[1]), int(rgb[2])],
                "hex": rgb_to_hex(rgb),
                "share": round(float(counts[index]) / total, 4),
            }
        )

    dominant = swatches[0] if swatches else None
    secondary = swatches[1] if len(swatches) > 1 else dominant
    accent = swatches[2] if len(swatches) > 2 else secondary
    return {
        "kmeansCompactness": float(compactness),
        "regionPixelCount": int(len(pixels)),
        "swatches": swatches,
        "roles": {
            "dominant": {"weight": 60, "swatch": dominant},
            "secondary": {"weight": 30, "swatch": secondary},
            "accent": {"weight": 10, "swatch": accent},
        },
    }


def suggest_wall_palettes(room_palette: dict[str, Any]) -> list[dict[str, Any]]:
    swatches = room_palette.get("swatches", [])
    base = swatches[0]["hex"] if len(swatches) > 0 else "#f0e8dc"
    secondary = swatches[1]["hex"] if len(swatches) > 1 else "#d8c7b5"
    accent = swatches[2]["hex"] if len(swatches) > 2 else "#9aa7a1"
    return [
        {"name": "Warm Minimal", "wall": base, "trim": "#ffffff", "accent": accent},
        {"name": "Soft Contrast", "wall": secondary, "trim": "#f8f3ef", "accent": base},
        {"name": "Calm Studio", "wall": "#e8dfd5", "trim": "#f4f1ed", "accent": "#8ea3a0"},
    ]
