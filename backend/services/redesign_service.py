from __future__ import annotations

from typing import Any

import numpy as np

from backend.config import FURNITURE_CATALOG, STYLE_THEMES
from backend.services.palette_service import hex_to_rgb


def apply_tint(image_rgb: np.ndarray, mask: np.ndarray, target_rgb: list[int] | np.ndarray, strength: float = 0.68) -> np.ndarray:
    result = image_rgb.copy().astype(np.float32)
    target = np.array(target_rgb, dtype=np.float32)
    result[mask] = result[mask] * (1.0 - strength) + target * strength
    return np.clip(result, 0, 255).astype(np.uint8)


def apply_style_theme(image_rgb: np.ndarray, masks: dict[str, np.ndarray], theme_name: str, wall_override: str | None = None) -> np.ndarray:
    theme = STYLE_THEMES.get(theme_name, STYLE_THEMES["japandi"])
    result = image_rgb.copy()
    if "wall" in masks:
        wall_color = hex_to_rgb(wall_override) if wall_override else np.array(theme["wall"], dtype=np.uint8)
        result = apply_tint(result, masks["wall"], wall_color.tolist(), strength=0.72)
    if "sofa" in masks:
        result = apply_tint(result, masks["sofa"], theme["sofa"], strength=0.78)
    if "table" in masks:
        result = apply_tint(result, masks["table"], theme["wood"], strength=0.70)
    if "lamp" in masks:
        result = apply_tint(result, masks["lamp"], theme["accent"], strength=0.62)
    return result


def build_design_payload(
    design_id: str,
    image_shape: tuple[int, int, int],
    image_source: dict[str, Any],
    masks: dict[str, np.ndarray],
    vector_layers: dict[str, list[dict[str, Any]]],
    room_palette: dict[str, Any],
    palette_suggestions: list[dict[str, Any]],
    selected_theme: str,
) -> dict[str, Any]:
    h, w = image_shape[:2]
    fabric_layers = [layer for layers in vector_layers.values() for layer in layers]
    return {
        "id": design_id,
        "source": {
            "imageSource": image_source.get("source", "upload"),
            "imageUrl": image_source.get("url"),
            "imageSize": {"width": int(w), "height": int(h)},
        },
        "regions": {
            name: {
                "pixelCount": int(mask.sum()),
                "vectorLayerCount": len(vector_layers.get(name, [])),
                "coverage": round(float(mask.mean()), 4),
            }
            for name, mask in masks.items()
        },
        "palette": {
            "roomPalette": room_palette,
            "recommendations": palette_suggestions,
            "activeChoice": palette_suggestions[0] if palette_suggestions else None,
        },
        "design": {
            "styleTheme": selected_theme,
            "catalog": FURNITURE_CATALOG,
            "beforeAfter": {
                "beforeLabel": "Original",
                "afterLabel": f"After - {selected_theme}",
            },
        },
        "frontendContracts": {
            "fabricLayers": fabric_layers,
            "shareableSummary": {
                "styleTheme": selected_theme,
                "catalogItems": FURNITURE_CATALOG,
                "implementationNote": "Backend uses notebook-aligned prototype logic: fallback segmentation, OpenCV/Numpy palette extraction, and preset-based furniture styling.",
            },
        },
    }
