from __future__ import annotations

import hashlib
import json
from typing import Any

from flask import Flask, jsonify, request, send_from_directory
from PIL import Image

from backend.config import FURNITURE_CATALOG, OUTPUT_DIR, PREVIEW_DIR, PROJECT_ROOT, UPLOAD_DIR
from backend.services.image_service import parse_image_request, utc_stamp
from backend.services.palette_service import extract_palette, suggest_wall_palettes
from backend.services.redesign_service import apply_style_theme, build_design_payload
from backend.services.segmentation_service import build_fallback_masks, mask_to_vector_layers
from backend.services.storage_service import load_design_payload, save_design_payload


def register_routes(app: Flask) -> None:
    @app.get("/health")
    def health_check():
        return jsonify(
            {
                "status": "ok",
                "service": "ai-interior-design-visualizer-backend",
                "capabilities": {
                    "segmentation": "fallback masks (SAM-ready contract)",
                    "palette": "kmeans via OpenCV/Numpy",
                    "styleTransfer": "preset tint styling",
                    "persistence": "JSON payloads in notebooks/outputs",
                },
            }
        )

    @app.get("/uploads/<path:fname>")
    def uploaded_file(fname: str):
        return send_from_directory(str(UPLOAD_DIR), fname)

    @app.get("/previews/<path:fname>")
    def preview_file(fname: str):
        return send_from_directory(str(PREVIEW_DIR), fname)

    @app.post("/api/segment")
    def segment_endpoint():
        try:
            image_rgb, source_meta = parse_image_request(request, UPLOAD_DIR)
        except Exception as exc:
            return jsonify({"error": str(exc)}), 400

        h, w = image_rgb.shape[:2]
        masks = build_fallback_masks(h, w)
        vector_layers = {name: mask_to_vector_layers(mask, name) for name, mask in masks.items()}

        return jsonify(
            {
                "status": "ok",
                "segmentationMode": "fallback",
                "source": source_meta,
                "regions": {
                    name: {
                        "pixelCount": int(mask.sum()),
                        "coverage": round(float(mask.mean()), 4),
                        "vectorLayerCount": len(vector_layers[name]),
                    }
                    for name, mask in masks.items()
                },
                "vectorLayers": vector_layers,
            }
        )

    @app.post("/api/palette")
    def palette_endpoint():
        try:
            image_rgb, source_meta = parse_image_request(request, UPLOAD_DIR)
        except Exception as exc:
            return jsonify({"error": str(exc)}), 400

        room_palette = extract_palette(image_rgb)
        suggestions = suggest_wall_palettes(room_palette)
        return jsonify(
            {
                "status": "ok",
                "source": source_meta,
                "roomPalette": room_palette,
                "recommendations": suggestions,
            }
        )

    @app.post("/api/redesign")
    def redesign_endpoint():
        body: dict[str, Any] = request.get_json(silent=True) or {}
        selected_theme = str(body.get("styleTheme", "japandi"))
        wall_override = body.get("wallColor") if isinstance(body.get("wallColor"), str) else None

        try:
            image_rgb, source_meta = parse_image_request(request, UPLOAD_DIR)
        except Exception as exc:
            return jsonify({"error": str(exc)}), 400

        h, w = image_rgb.shape[:2]
        masks = build_fallback_masks(h, w)
        vector_layers = {name: mask_to_vector_layers(mask, name) for name, mask in masks.items()}
        room_palette = extract_palette(image_rgb)
        palette_suggestions = suggest_wall_palettes(room_palette)
        redesigned_rgb = apply_style_theme(image_rgb, masks, selected_theme, wall_override)

        design_id = hashlib.sha1(
            json.dumps(
                {
                    "theme": selected_theme,
                    "wall": wall_override,
                    "source": source_meta.get("url"),
                    "shape": [h, w],
                },
                sort_keys=True,
            ).encode("utf-8")
        ).hexdigest()[:12]

        preview_name = f"design_{design_id}.png"
        Image.fromarray(redesigned_rgb).save(PREVIEW_DIR / preview_name)

        payload = build_design_payload(
            design_id=design_id,
            image_shape=image_rgb.shape,
            image_source=source_meta,
            masks=masks,
            vector_layers=vector_layers,
            room_palette=room_palette,
            palette_suggestions=palette_suggestions,
            selected_theme=selected_theme,
        )
        saved_id, payload_path = save_design_payload(payload, OUTPUT_DIR)

        return jsonify(
            {
                "status": "ok",
                "designId": saved_id,
                "previewUrl": f"/previews/{preview_name}",
                "shareUrl": f"/api/share/{saved_id}",
                "payloadPath": str(payload_path.relative_to(PROJECT_ROOT)),
                "summary": payload["frontendContracts"]["shareableSummary"],
                "paletteRecommendations": palette_suggestions,
                "catalog": FURNITURE_CATALOG,
            }
        )

    @app.post("/api/designs/save")
    def save_design_endpoint():
        payload = request.get_json(force=True) or {}
        if not payload:
            return jsonify({"error": "Missing payload body"}), 400
        if "id" not in payload:
            payload["id"] = hashlib.sha1(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()[:12]
        design_id, payload_path = save_design_payload(payload, OUTPUT_DIR)
        return jsonify(
            {
                "status": "ok",
                "designId": design_id,
                "shareUrl": f"/api/share/{design_id}",
                "payloadPath": str(payload_path.relative_to(PROJECT_ROOT)),
            }
        )

    @app.get("/api/share/<design_id>")
    def share_endpoint(design_id: str):
        payload = load_design_payload(design_id, OUTPUT_DIR)
        if payload is None:
            return jsonify({"error": "Design not found"}), 404
        return jsonify({"status": "ok", "designId": design_id, "payload": payload})

    @app.get("/api/catalog")
    def catalog_endpoint():
        return jsonify({"status": "ok", "items": FURNITURE_CATALOG})

    # Compatibility routes for older frontend stubs
    @app.post("/upload")
    def upload_legacy():
        try:
            image_rgb, source_meta = parse_image_request(request, UPLOAD_DIR)
        except Exception as exc:
            return jsonify({"error": str(exc)}), 400
        room_palette = extract_palette(image_rgb)
        swatches = [s["hex"] for s in room_palette.get("swatches", [])[:3]]
        return jsonify({"url": source_meta.get("url"), "palette": swatches})

    @app.post("/palette")
    def palette_legacy():
        return palette_endpoint()

    @app.post("/save")
    def save_legacy():
        payload = request.get_json(silent=True) or {}
        if "id" not in payload:
            payload["id"] = utc_stamp()
        design_id, payload_path = save_design_payload(payload, OUTPUT_DIR)
        return jsonify({"id": design_id, "share_url": f"/api/share/{design_id}", "payloadPath": str(payload_path.relative_to(PROJECT_ROOT))})
