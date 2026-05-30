# AI Interior Design Visualizer (Frontend + Backend Stubs)

This workspace contains a structured prototype React frontend (Vite + Fabric.js) and a minimal Flask backend with API stubs for upload, palette suggestion and save/share. The current build implements:

- Side-by-side before/after view
- Upload panel that posts to the backend
- Fabric.js canvas for semantic overlay editing and live color exploration
- Color palette suggestions near the main control area
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
- The AI parts (SAM segmentation, style transfer) are stubs here — integrate PyTorch models behind the `/upload`, `/palette`, and `/redesign` endpoints.
- Furniture drag-and-drop is intentionally deferred until the core segmentation and redesign flow is stable.
# AI Interior Design Visualizer

