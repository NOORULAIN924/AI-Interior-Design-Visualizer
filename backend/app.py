from __future__ import annotations

import sys
from pathlib import Path

from flask import Flask
from flask_cors import CORS

# Allows running as: python backend/app.py
if __package__ in (None, ""):
    sys.path.append(str(Path(__file__).resolve().parents[1]))

from backend.config import ensure_storage_dirs
from backend.realtime import socketio
from backend.routes import register_routes


def create_app() -> Flask:
    ensure_storage_dirs()
    app = Flask(__name__)
    CORS(app)
    socketio.init_app(app)
    register_routes(app)
    return app


app = create_app()


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True, allow_unsafe_werkzeug=True)