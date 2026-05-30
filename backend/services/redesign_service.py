from __future__ import annotations

from typing import Any

import numpy as np

from backend.config import FURNITURE_CATALOG, STYLE_THEMES
from backend.services.palette_service import hex_to_rgb
import cv2


def recolor_region_preserve_lighting(image_rgb: np.ndarray, mask: np.ndarray, target_rgb: list[int] | np.ndarray, strength: float = 1.0) -> np.ndarray:
    """Recolor the masked region by shifting hue/saturation towards target while preserving value (lighting).

    strength: 0..1 interpolation toward target H/S. 1 applies full target hue/sat.
    """
    if mask.dtype != np.bool_:  # allow boolean mask
        mask_bool = mask.astype(bool)
    else:
        mask_bool = mask

    # Convert to HSV (cv2 uses H:0-179, S:0-255, V:0-255)
    img_bgr = cv2.cvtColor(image_rgb, cv2.COLOR_RGB2BGR)
    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV).astype(np.float32)

    # target HSV
    t_rgb = np.array(target_rgb, dtype=np.uint8).reshape(1, 1, 3)
    t_hsv = cv2.cvtColor(cv2.cvtColor(t_rgb, cv2.COLOR_RGB2BGR), cv2.COLOR_BGR2HSV).astype(np.float32)[0, 0]

    # Normalize H to 0-1 for interpolation; but we will operate on 0-179 space
    h_t, s_t = t_hsv[0], t_hsv[1]

    # apply interpolation only on masked pixels
    hs = hsv[..., :2]
    v = hsv[..., 2]

    # interpolate hue circularly
    h = hs[..., 0]
    dh = (h_t - h + 180) % 180 - 180 * (h_t < h)
    h_new = (h + dh * strength) % 180
    s_new = hs[..., 1] * (1.0 - strength) + s_t * strength

    hsv[..., 0] = np.where(mask_bool, h_new, h)
    hsv[..., 1] = np.where(mask_bool, s_new, hs[..., 1])

    # convert back
    hsv = np.clip(hsv, 0, 255).astype(np.uint8)
    bgr2 = cv2.cvtColor(hsv, cv2.COLOR_HSV2BGR)
    result_rgb = cv2.cvtColor(bgr2, cv2.COLOR_BGR2RGB)

    # blend with original to allow partial strength (preserve edges)
    out = image_rgb.copy().astype(np.float32)
    mask3 = np.stack([mask_bool]*3, axis=-1)
    out[mask3] = out[mask3] * (1.0 - strength) + result_rgb[mask3] * strength
    return np.clip(out, 0, 255).astype(np.uint8)


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
