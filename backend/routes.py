from __future__ import annotations

from datetime import UTC, datetime
from pathlib import Path
from typing import Any

import numpy as np
from flask import Blueprint, Flask, jsonify, request, send_from_directory
from PIL import Image

from backend.config import OUTPUT_DIR, PREVIEW_DIR, UPLOAD_DIR, ensure_storage_dirs
from backend.services.image_service import parse_image_request
from backend.services.palette_service import extract_palette, suggest_wall_palettes
from backend.services.redesign_service import apply_style_theme, build_design_payload
from backend.services.segmentation_service import build_fallback_masks, mask_to_vector_layers
from backend.services.storage_service import load_design_payload, save_design_payload


api = Blueprint("api", __name__, url_prefix="/api")


def make_design_id() -> str:
    return datetime.now(UTC).strftime("%Y%m%d%H%M%S")


def save_preview_image(image_rgb: np.ndarray, design_id: str) -> str:
    ensure_storage_dirs()
    filename = f"preview_{design_id}.png"
    path = PREVIEW_DIR / filename
    Image.fromarray(image_rgb).save(path)
    return filename


def add_api_prefix_to_url(url: str | None) -> str | None:
    if not url:
        return url
    if url.startswith("/api/"):
        return url
    if url.startswith("/"):
        return f"/api{url}"
    return url


@api.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "message": "Backend is running"
    })


@api.route("/palette", methods=["POST"])
def palette():
    try:
        ensure_storage_dirs()
        image_rgb, image_source = parse_image_request(request, UPLOAD_DIR)

        room_palette = extract_palette(image_rgb, k=5)
        recommendations = suggest_wall_palettes(room_palette)

        image_source["url"] = add_api_prefix_to_url(image_source.get("url"))

        return jsonify({
            "imageSource": image_source,
            "roomPalette": room_palette,
            "recommendations": recommendations,
            "palette": [swatch["hex"] for swatch in room_palette.get("swatches", [])],
        })

    except Exception as exc:
        return jsonify({
            "error": str(exc)
        }), 400


@api.route("/redesign", methods=["POST"])
def redesign():
    try:
        ensure_storage_dirs()

        body = request.get_json(silent=True) or {}
        selected_theme = body.get("styleTheme") or body.get("theme") or "japandi"
        wall_override = body.get("wallColor") or body.get("targetColor")

        image_rgb, image_source = parse_image_request(request, UPLOAD_DIR)

        height, width = image_rgb.shape[:2]
        masks = build_fallback_masks(height, width)

        vector_layers: dict[str, list[dict[str, Any]]] = {
            name: mask_to_vector_layers(mask, name)
            for name, mask in masks.items()
        }

        room_palette = extract_palette(image_rgb, k=5)
        palette_suggestions = suggest_wall_palettes(room_palette)

        redesigned_rgb = apply_style_theme(
            image_rgb=image_rgb,
            masks=masks,
            theme_name=selected_theme,
            wall_override=wall_override,
        )

        design_id = make_design_id()
        preview_filename = save_preview_image(redesigned_rgb, design_id)

        image_source["url"] = add_api_prefix_to_url(image_source.get("url"))

        payload = build_design_payload(
            design_id=design_id,
            image_shape=image_rgb.shape,
            image_source=image_source,
            masks=masks,
            vector_layers=vector_layers,
            room_palette=room_palette,
            palette_suggestions=palette_suggestions,
            selected_theme=selected_theme,
        )

        payload["previewUrl"] = f"/api/previews/{preview_filename}"

        save_design_payload(payload, OUTPUT_DIR)

        return jsonify({
            "id": design_id,
            "designId": design_id,
            "previewUrl": f"/api/previews/{preview_filename}",
            "imageUrl": image_source.get("url"),
            "roomPalette": room_palette,
            "recommendations": palette_suggestions,
            "vectorLayers": vector_layers,
            "payload": payload,
            "message": "Redesign generated successfully",
        })

    except Exception as exc:
        return jsonify({
            "error": str(exc)
        }), 400


@api.route("/segment", methods=["POST"])
def segment():
    try:
        ensure_storage_dirs()
        image_rgb, image_source = parse_image_request(request, UPLOAD_DIR)

        height, width = image_rgb.shape[:2]
        masks = build_fallback_masks(height, width)

        vector_layers: dict[str, list[dict[str, Any]]] = {
            name: mask_to_vector_layers(mask, name)
            for name, mask in masks.items()
        }

        image_source["url"] = add_api_prefix_to_url(image_source.get("url"))

        return jsonify({
            "imageSource": image_source,
            "vectorLayers": vector_layers,
            "regions": {
                name: {
                    "pixelCount": int(mask.sum()),
                    "coverage": round(float(mask.mean()), 4),
                }
                for name, mask in masks.items()
            }
        })

    except Exception as exc:
        return jsonify({
            "error": str(exc)
        }), 400


@api.route("/designs/save", methods=["POST"])
def save_design():
    ensure_storage_dirs()
    body = request.get_json(silent=True) or {}

    design_id = body.get("id") or make_design_id()
    body["id"] = design_id

    save_design_payload(body, OUTPUT_DIR)

    return jsonify({
        "id": design_id,
        "shareUrl": f"/api/designs/{design_id}",
        "share_url": f"/api/designs/{design_id}",
    })


@api.route("/designs/<design_id>", methods=["GET"])
def get_design(design_id: str):
    payload = load_design_payload(design_id, OUTPUT_DIR)

    if payload is None:
        return jsonify({
            "error": "Design not found"
        }), 404

    return jsonify(payload)


@api.route("/uploads/<path:filename>", methods=["GET"])
def serve_upload(filename: str):
    return send_from_directory(UPLOAD_DIR, filename)


@api.route("/previews/<path:filename>", methods=["GET"])
def serve_preview(filename: str):
    return send_from_directory(PREVIEW_DIR, filename)


def register_routes(app: Flask) -> None:
    ensure_storage_dirs()
    app.register_blueprint(api)