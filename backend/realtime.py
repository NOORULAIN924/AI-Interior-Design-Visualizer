from __future__ import annotations

from flask_socketio import SocketIO, join_room


socketio = SocketIO(cors_allowed_origins="*", async_mode="threading", logger=False, engineio_logger=False)


def client_room(client_id: str | None) -> str | None:
    if not client_id:
        return None
    return f"client:{client_id}"


def emit_to_client(event: str, payload: dict, client_id: str | None = None) -> None:
    room = client_room(client_id)
    if room:
        socketio.emit(event, payload, to=room)
    else:
        socketio.emit(event, payload)


@socketio.on("join")
def on_join(data):
    client_id = (data or {}).get("clientId")
    room = client_room(client_id)
    if room:
        join_room(room)
    return {"ok": True, "room": room}