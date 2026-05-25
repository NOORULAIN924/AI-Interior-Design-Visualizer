# AI Interior Design Visualizer (Frontend + Backend Stubs)

This workspace contains a starter React frontend (Vite + Fabric.js) and a minimal Flask backend with API stubs for upload, palette suggestion and save/share. The frontend implements:

- Side-by-side before/after view
- Upload panel that posts to the backend
- Fabric.js canvas with drag-and-drop catalog placeholders
- Color picker with AI-suggested palette chips
- Save/export design (downloads PNG)

Files added:
- [frontend](frontend) — React app (Vite)
- [backend/app.py](backend/app.py) — Flask API stubs

Quick start

1. Backend (Python):

```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python backend/app.py
```

2. Frontend (Node.js):

```powershell
cd frontend
npm install
npm run dev
```

Notes
- The AI parts (SAM segmentation, style transfer) are stubs here — integrate PyTorch models behind the `/upload` and `/palette` endpoints.
- The catalog uses placeholder items; replace with real transparent PNGs in `frontend/public/catalog` or serve from a CDN.
# AI Interior Design Visualizer

