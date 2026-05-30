from __future__ import annotations

from typing import Any

import numpy as np

try:
    import cv2  # type: ignore
except Exception:
    cv2 = None


def build_fallback_masks(height: int, width: int) -> dict[str, np.ndarray]:
    masks: dict[str, np.ndarray] = {}
    yy, xx = np.mgrid[0:height, 0:width]

    wall = yy < int(height * 0.58)
    floor = yy > int(height * 0.70)
    sofa = (
        (yy > int(height * 0.56))
        & (yy < int(height * 0.82))
        & (xx > int(width * 0.20))
        & (xx < int(width * 0.52))
    )
    table = (
        (yy > int(height * 0.56))
        & (yy < int(height * 0.72))
        & (xx > int(width * 0.54))
        & (xx < int(width * 0.74))
    )
    lamp = (
        (yy > int(height * 0.20))
        & (yy < int(height * 0.54))
        & (xx > int(width * 0.76))
        & (xx < int(width * 0.90))
    )
    furniture = sofa | table | lamp

    masks["wall"] = wall
    masks["floor"] = floor
    masks["sofa"] = sofa
    masks["table"] = table
    masks["lamp"] = lamp
    masks["furniture"] = furniture
    return masks


def mask_to_vector_layers(mask: np.ndarray, name: str) -> list[dict[str, Any]]:
    if mask.dtype != np.uint8:
        mask_u8 = (mask.astype(np.uint8) * 255)
    else:
        mask_u8 = mask

    layers: list[dict[str, Any]] = []
    if cv2 is not None:
        contours, _ = cv2.findContours(mask_u8, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for idx, contour in enumerate(contours):
            area = float(cv2.contourArea(contour))
            if area < 120:
                continue
            points = contour.reshape(-1, 2).tolist()
            layers.append(
                {
                    "id": f"{name}-{idx}",
                    "name": name,
                    "type": "polygon",
                    "points": points,
                    "area": area,
                }
            )
        if layers:
            return layers

    ys, xs = np.where(mask_u8 > 0)
    if len(xs) == 0:
        return []
    x0, x1 = int(xs.min()), int(xs.max())
    y0, y1 = int(ys.min()), int(ys.max())
    return [
        {
            "id": f"{name}-0",
            "name": name,
            "type": "polygon",
            "points": [[x0, y0], [x1, y0], [x1, y1], [x0, y1]],
            "area": float((x1 - x0) * (y1 - y0)),
        }
    ]
