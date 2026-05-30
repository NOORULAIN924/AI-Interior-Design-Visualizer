from __future__ import annotations

import json
import time
from pathlib import Path

import requests
import socketio


API_BASE = "http://127.0.0.1:5000"
IMG = Path(__file__).parent / "storage" / "uploads" / "20260530123334_e5da2cae98.png"


events: list[tuple[str, dict]] = []
client_id = f"test-client-{int(time.time())}"


def record(event_name: str):
    def _handler(payload):
        events.append((event_name, payload))
        print(event_name, json.dumps(payload)[:240])
    return _handler


def main():
    sio = socketio.Client(reconnection=False)
    for event_name in [
        "segmentation_started",
        "segmentation_progress",
        "segmentation_done",
        "recolor_started",
        "recolor_done",
    ]:
        sio.on(event_name, record(event_name))

    sio.connect(API_BASE, transports=["websocket", "polling"])
    sio.emit("join", {"clientId": client_id})

    with open(IMG, "rb") as f:
        files = {"image": ("room.png", f, "image/png")}
        r = requests.post(
            API_BASE + "/api/redesign",
            files=files,
            data={"styleTheme": "japandi", "clientId": client_id},
            headers={"X-Client-ID": client_id},
            timeout=120,
        )
        print("redesign-status", r.status_code)
        print(r.json().get("designId"))

    time.sleep(2)
    sio.disconnect()
    print("events-count", len(events))


if __name__ == "__main__":
    main()