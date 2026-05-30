from __future__ import annotations

import hashlib
import json
from pathlib import Path
from typing import Any


def save_design_payload(payload: dict[str, Any], output_dir: Path) -> tuple[str, Path]:
    payload_text = json.dumps(payload, indent=2, sort_keys=True)
    design_id = payload.get("id") or hashlib.sha1(payload_text.encode("utf-8")).hexdigest()[:12]
    payload_path = output_dir / f"design_{design_id}.json"
    payload_path.write_text(payload_text, encoding="utf-8")
    return str(design_id), payload_path


def load_design_payload(design_id: str, output_dir: Path) -> dict[str, Any] | None:
    path = output_dir / f"design_{design_id}.json"
    if not path.exists():
        return None
    return json.loads(path.read_text(encoding="utf-8"))
