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
from backend.services import segmentation_service
from backend.services.storage_service import load_design_payload, save_design_payload
from backend.services.palette_service import generate_recommendation_palettes
from backend.services.redesign_service import recolor_region_preserve_lighting
import cv2


api = Blueprint("api", __name__, url_prefix="/api")


def make_design_id() -> str:
    return datetime.now(UTC).strftime("%Y%m%d%H%M%S")


def save_preview_image(image_rgb: np.ndarray, design_id: str) -> str:
    ensure_storage_dirs()
    from io import BytesIO
    import base64

    # If configured to persist previews, save to PREVIEW_DIR and return filename.
    if getattr(__import__('backend.config'), 'SAVE_PREVIEWS', False):
        filename = f"preview_{design_id}.png"
        path = PREVIEW_DIR / filename
        Image.fromarray(image_rgb).save(path)
        return filename

    # Otherwise, return a data URL so frontend can load without touching disk.
    buff = BytesIO()
    Image.fromarray(image_rgb).save(buff, format='PNG')
    b64 = base64.b64encode(buff.getvalue()).decode('ascii')
    return f"data:image/png;base64,{b64}"


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
        # segmentation: attempt model-backed masks, fall back to deterministic masks
        try:
            masks = segmentation_service.build_room_masks_from_model(image_rgb)
            if masks is None:
                masks = segmentation_service.build_fallback_masks(height, width)
        except Exception:
            masks = segmentation_service.build_fallback_masks(height, width)

        vector_layers: dict[str, list[dict[str, Any]]] = {
            name: segmentation_service.mask_to_vector_layers(mask, name)
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
        preview_ref = save_preview_image(redesigned_rgb, design_id)

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
        # preview_ref may be a filename or a data URL depending on config
        if isinstance(preview_ref, str) and preview_ref.startswith("data:image"):
            preview_url = preview_ref
            payload["previewUrl"] = preview_url
        else:
            preview_url = f"/api/previews/{preview_ref}"
            payload["previewUrl"] = preview_url

        save_design_payload(payload, OUTPUT_DIR)

        return jsonify({
            "id": design_id,
            "designId": design_id,
            "previewUrl": preview_url,
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
        try:
            masks = segmentation_service.build_room_masks_from_model(image_rgb)
            if masks is None:
                masks = segmentation_service.build_fallback_masks(height, width)
        except Exception:
            masks = segmentation_service.build_fallback_masks(height, width)

        vector_layers: dict[str, list[dict[str, Any]]] = {
            name: segmentation_service.mask_to_vector_layers(mask, name)
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


@api.route("/recolor", methods=["POST"])
def recolor():
    try:
        ensure_storage_dirs()
        # accepts multipart 'image' or JSON 'imageData' and params: region (wall/floor/etc), targetColor
        image_rgb, image_source = parse_image_request(request, UPLOAD_DIR)
        body = request.get_json(silent=True) or {}
        region = body.get('region') or request.form.get('region') or 'wall'
        target = body.get('targetColor') or request.form.get('targetColor')
        if not target:
            raise ValueError('Provide targetColor as hex string like #aabbcc')

        # Ensure we have segmentation masks for region
        try:
            masks = segmentation_service.build_room_masks_from_model(image_rgb)
            if masks is None:
                masks = segmentation_service.build_fallback_masks(image_rgb.shape[0], image_rgb.shape[1])
        except Exception:
            masks = segmentation_service.build_fallback_masks(image_rgb.shape[0], image_rgb.shape[1])

        if region not in masks:
            raise ValueError(f'Region "{region}" not found in segmentation masks')

        mask = masks[region]
        from backend.services.palette_service import hex_to_rgb
        tgt_rgb = hex_to_rgb(target)

        recolored = recolor_region_preserve_lighting(image_rgb, mask, tgt_rgb.tolist(), strength=1.0)

        # return data URL (do not persist unless configured)
        from io import BytesIO
        import base64
        buff = BytesIO()
        Image.fromarray(recolored).save(buff, format='PNG')
        b64 = base64.b64encode(buff.getvalue()).decode('ascii')
        return jsonify({
            'previewUrl': f'data:image/png;base64,{b64}',
            'region': region
        })
    except Exception as exc:
        return jsonify({'error': str(exc)}), 400


@api.route('/recommend', methods=['POST'])
def recommend():
    try:
        body = request.get_json(silent=True) or {}
        base = body.get('baseColor') or body.get('color')
        if not base:
            return jsonify({'error': 'Provide baseColor hex in JSON body'}), 400
        palettes = generate_recommendation_palettes(base)
        return jsonify({'base': base, 'palettes': palettes})
    except Exception as exc:
        return jsonify({'error': str(exc)}), 400


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