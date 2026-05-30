from __future__ import annotations

import base64
import hashlib
from datetime import UTC, datetime
from io import BytesIO
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image


def utc_stamp() -> str:
    return datetime.now(UTC).strftime("%Y%m%d%H%M%S")


def safe_name(raw: str) -> str:
    keep = "._-"
    return "".join(ch for ch in raw if ch.isalnum() or ch in keep) or "image.png"


def decode_data_url(data_url: str) -> bytes:
    header, payload = data_url.split(",", 1)
    if "base64" not in header:
        return payload.encode("utf-8")
    return base64.b64decode(payload)


def parse_image_request(req: Any, upload_dir: Path) -> tuple[np.ndarray, dict[str, Any]]:
    # Supports multipart form upload, base64 data URL, or image URL from this backend.
    if req.files.get("image"):
        file_obj = req.files["image"]
        raw = file_obj.read()
        image = Image.open(BytesIO(raw)).convert("RGB")
        arr = np.array(image)
        filename = f"{utc_stamp()}_{safe_name(file_obj.filename or 'upload.png')}"
        image.save(upload_dir / filename)
        return arr, {
            "source": "multipart",
            "filename": filename,
            "url": f"/uploads/{filename}",
        }

    body = req.get_json(silent=True) or {}
    if isinstance(body.get("imageData"), str) and body["imageData"].startswith("data:image"):
        raw = decode_data_url(body["imageData"])
        image = Image.open(BytesIO(raw)).convert("RGB")
        arr = np.array(image)
        digest = hashlib.sha1(raw).hexdigest()[:10]
        filename = f"{utc_stamp()}_{digest}.png"
        image.save(upload_dir / filename)
        return arr, {
            "source": "data_url",
            "filename": filename,
            "url": f"/uploads/{filename}",
        }

    image_url = body.get("imageUrl")
    if isinstance(image_url, str) and image_url.startswith("/uploads/"):
        filename = image_url.replace("/uploads/", "", 1)
        path = upload_dir / filename
        if not path.exists():
            raise ValueError("Referenced upload does not exist")
        image = Image.open(path).convert("RGB")
        return np.array(image), {
            "source": "uploaded_url",
            "filename": filename,
            "url": image_url,
        }

    raise ValueError("Provide an image as multipart field 'image', JSON 'imageData', or JSON 'imageUrl'")
