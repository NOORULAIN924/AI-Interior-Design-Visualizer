# AI Interior Design Visualizer

Upload a room photo, let the backend segment the scene, generate an AI redesign preview, and keep refining it in the browser.

## What It Does

This project turns a single room photo into an interactive redesign workflow:

1. Upload a room photo.
2. Extract room palettes from the image.
3. Segment walls, floor, and furniture.
4. Generate a redesign preview automatically.
5. Edit wall color, layer overlays, and furniture placement in the canvas.
6. Download or share the final result.

## Pipeline

### 1) Upload
- The user uploads a room photo in the [Dashboard](frontend/src/pages/Dashboard.jsx "Upload a room photo and open the redesign flow").
- The app stores the source image in shared state for the rest of the flow.
- A palette scan runs from the uploaded image so the UI can suggest colors.

### 2) Palette extraction
- The frontend sends the image to `/api/palette`.
- The backend returns the dominant room palette and recommendation sets.
- Suggested swatches appear in the dashboard and results views.

### 3) Segmentation
- The backend runs room segmentation through `/api/segment` and the redesign pipeline.
- Regions such as wall, floor, sofa, table, lamp, and furniture are converted into vector layers.
- Those layers power drag/drop and region-based recoloring in the canvas.

### 4) Redesign generation
- The app calls `/api/redesign` automatically after upload.
- The backend creates the first AI preview and returns the design payload.
- The [Results page](frontend/src/pages/Results.jsx "View the generated preview and continue editing") opens with the source image and the generated output.

### 5) Canvas editing
- The [Canvas editor](frontend/src/components/CanvasView.jsx "Edit colors, overlays, and layers in-browser") lets the user:
  - change wall colors,
  - tweak overlay opacity,
  - drag catalog items into the room,
  - brush mask regions,
  - export the final composite image.

### 6) Share and export
- The app can save a design payload through `/api/designs/save`.
- Download exports use the visible composite, not just the raw Fabric layer.

## Core Pages

- [Landing](frontend/src/pages/Landing.jsx "Project overview and feature summary")
- [Dashboard](frontend/src/pages/Dashboard.jsx "Upload, theme selection, and automatic generation entry point")
- [Results](frontend/src/pages/Results.jsx "Before/after view plus the interactive editor")
- [Analytics](frontend/src/pages/Analytics.jsx "Usage and summary view")
- [About](frontend/src/pages/About.jsx "Project goals and implementation notes")

## Backend Endpoints

- `GET /api/ui-config` — loads themes, room types, and catalog data.
- `POST /api/palette` — extracts palettes from an uploaded room image.
- `POST /api/segment` — builds masks and region layers.
- `POST /api/redesign` — generates the redesign preview.
- `POST /api/recolor` — recolors a selected region.
- `POST /api/recommend` — returns palette suggestions.
- `POST /api/designs/save` — stores a shareable design payload.

## Realtime Events

The app uses Socket.IO to stream progress updates:

- `segmentation_started`
- `segmentation_progress`
- `segmentation_done`
- `recolor_started`
- `recolor_done`

## Tech Stack

- Frontend: React, Vite, Fabric.js, Socket.IO client
- Backend: Flask, Flask-SocketIO, OpenCV
- State flow: shared React state across dashboard/results pages

## Quick Start

### Backend

```powershell
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python backend/app.py
```

### Frontend

```powershell
cd frontend
npm install
npm run dev
```

## Project Files

- [frontend/package.json](frontend/package.json "Frontend dependencies and scripts")
- [frontend/src/App.jsx](frontend/src/App.jsx "App routing and shared state")
- [backend/routes.py](backend/routes.py "API routes and pipeline orchestration")
- [backend/services/segmentation_service.py](backend/services/segmentation_service.py "Room mask generation")
- [backend/services/redesign_service.py](backend/services/redesign_service.py "Recolor and design generation")

## Notes

- The uploaded photo is the source image for segmentation and redesign.
- The generated preview is the AI-processed version used for editing.
- Furniture replacement is shown through catalog-based canvas interaction and region overlays.
