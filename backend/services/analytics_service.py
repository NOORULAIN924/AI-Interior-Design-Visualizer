from __future__ import annotations

import json
from collections import Counter
from datetime import datetime
from pathlib import Path
from typing import Any


def _safe_json_load(path: Path) -> dict[str, Any] | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def _first_non_empty(values: list[Any]) -> Any | None:
    for value in values:
        if value not in (None, "", [], {}):
            return value
    return None


def compute_analytics(output_dir: Path) -> dict[str, Any]:
    designs: list[dict[str, Any]] = []
    for path in sorted(output_dir.glob("design_*.json")):
        payload = _safe_json_load(path)
        if not payload:
            continue
        created_at = datetime.fromtimestamp(path.stat().st_mtime).isoformat(timespec="seconds")
        designs.append({"path": path, "payload": payload, "createdAt": created_at})

    theme_counts = Counter()
    palette_counts = Counter()
    style_counts = Counter()
    category_counts = Counter()
    history: list[dict[str, Any]] = []

    for item in designs:
        payload = item["payload"]
        theme = _first_non_empty([
            payload.get("design", {}).get("styleTheme"),
            payload.get("selected_theme"),
            payload.get("styleTheme"),
        ])
        if theme:
            theme_counts[str(theme)] += 1

        palette = payload.get("palette", {})
        active_choice = palette.get("activeChoice", {}) or {}
        palette_label = _first_non_empty([
            active_choice.get("name"),
            active_choice.get("wall"),
        ])
        if palette_label:
            palette_counts[str(palette_label)] += 1

        catalog = payload.get("design", {}).get("catalog", []) or []
        for entry in catalog:
            style = entry.get("style")
            category = entry.get("category")
            if style:
                style_counts[str(style)] += 1
            if category:
                category_counts[str(category)] += 1

        swatches = payload.get("palette", {}).get("roomPalette", {}).get("swatches", []) or []
        dominant_color = swatches[0].get("hex") if swatches and isinstance(swatches[0], dict) else None

        history.append({
            "id": payload.get("id") or item["path"].stem.replace("design_", ""),
            "styleTheme": theme,
            "previewUrl": payload.get("previewUrl"),
            "createdAt": item["createdAt"],
            "dominantColor": dominant_color,
        })

    history = list(reversed(history))[:8]

    return {
        "roomsRedesigned": len(designs),
        "mostUsedThemes": theme_counts.most_common(4),
        "mostUsedPalettes": palette_counts.most_common(4),
        "favoriteFurnitureStyles": style_counts.most_common(4),
        "topFurnitureCategories": category_counts.most_common(4),
        "projectHistory": history,
    }