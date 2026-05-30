import React, { useEffect, useState } from 'react'
import CanvasView from '../components/CanvasView'
import { Link } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:5000'

export default function Results({ uiConfig, socket, clientId, beforeImage, palette = [], targetColor, setTargetColor, designOptions }) {
  const [previewUrl, setPreviewUrl] = useState('')
  const [editableImage, setEditableImage] = useState('')
  const [previewFailed, setPreviewFailed] = useState(false)
  const [segmentLayers, setSegmentLayers] = useState({})
  const [designId, setDesignId] = useState('')
  const [loading, setLoading] = useState(false)
  const [roomPalette, setRoomPalette] = useState([])
  const [paletteSuggestions, setPaletteSuggestions] = useState([])
  const [streamStatus, setStreamStatus] = useState('')
  const [streamProgress, setStreamProgress] = useState(0)

  const topPalette = [...new Set([
    ...palette,
    ...roomPalette,
    ...paletteSuggestions.map((suggestion) => suggestion.wall)
  ])].filter(Boolean).slice(0, 8)

  async function resolveEditableImage(preview, fallback) {
    if (!preview) {
      setEditableImage(fallback || '')
      setPreviewFailed(false)
      return
    }
    const img = new Image()
    img.onload = () => {
      setEditableImage(preview)
      setPreviewFailed(false)
    }
    img.onerror = () => {
      setEditableImage(fallback || '')
      setPreviewFailed(true)
    }
    img.src = preview
  }

  useEffect(() => {
    setEditableImage(beforeImage || '')
    setPreviewFailed(false)
  }, [beforeImage])

  useEffect(() => {
    if (!socket) return undefined
    const matchesClient = (payload) => !clientId || payload?.clientId === clientId

    const onSegStart = (payload) => {
      if (!matchesClient(payload)) return
      setStreamStatus('Segmenting room...')
      setStreamProgress(payload?.progress ?? 0)
    }
    const onSegProgress = (payload) => {
      if (!matchesClient(payload)) return
      setStreamStatus('Segmenting room...')
      setStreamProgress(payload?.progress ?? 0)
    }
    const onSegDone = (payload) => {
      if (!matchesClient(payload)) return
      if (payload?.vectorLayers) setSegmentLayers(payload.vectorLayers)
      if (payload?.previewPartial) {
        setEditableImage(payload.previewPartial)
      }
      setStreamStatus('Segmentation complete')
      setStreamProgress(70)
    }
    const onRecolorStart = (payload) => {
      if (!matchesClient(payload)) return
      setStreamStatus('Applying recolor...')
      setStreamProgress(payload?.progress ?? 0)
    }
    const onRecolorDone = (payload) => {
      if (!matchesClient(payload)) return
      if (payload?.previewUrl) {
        setPreviewUrl(payload.previewUrl)
        resolveEditableImage(payload.previewUrl, beforeImage)
      }
      setStreamStatus('Recolor complete')
      setStreamProgress(100)
    }

    socket.on('segmentation_started', onSegStart)
    socket.on('segmentation_progress', onSegProgress)
    socket.on('segmentation_done', onSegDone)
    socket.on('recolor_started', onRecolorStart)
    socket.on('recolor_done', onRecolorDone)

    return () => {
      socket.off('segmentation_started', onSegStart)
      socket.off('segmentation_progress', onSegProgress)
      socket.off('segmentation_done', onSegDone)
      socket.off('recolor_started', onRecolorStart)
      socket.off('recolor_done', onRecolorDone)
    }
  }, [socket, clientId, beforeImage])

  useEffect(() => {
    async function runRedesign() {
      if (!beforeImage) {
        setPreviewUrl('')
        setEditableImage('')
        setPreviewFailed(false)
        setSegmentLayers({})
        setDesignId('')
        return
      }
      setLoading(true)
      try {
        const res = await fetch(`${API_BASE}/api/redesign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Client-ID': clientId || '' },
          body: JSON.stringify({
            imageData: beforeImage,
            wallColor: targetColor,
            styleTheme: designOptions?.designTheme || uiConfig?.defaultTheme,
            roomType: designOptions?.roomType,
            clientId
          })
        })
        if (!res.ok) throw new Error('Failed to generate redesign preview')
        const payload = await res.json()
        setDesignId(payload.designId || '')
        setRoomPalette((payload.roomPalette?.swatches || []).slice(0, 6).map((sw) => sw.hex))
        setPaletteSuggestions(payload.recommendations || [])
        const absPreview = payload.previewUrl ? `${API_BASE}${payload.previewUrl}` : ''
        setPreviewUrl(absPreview)
        resolveEditableImage(absPreview, beforeImage)
        if (payload.vectorLayers) {
          setSegmentLayers(payload.vectorLayers)
        }
      } catch (err) {
        console.warn(err)
        setPreviewUrl('')
        setEditableImage(beforeImage || '')
        setPreviewFailed(true)
        setSegmentLayers({})
        setRoomPalette([])
        setPaletteSuggestions([])
      } finally {
        setLoading(false)
      }
    }

    runRedesign()
  }, [beforeImage, targetColor, designOptions?.designTheme, designOptions?.roomType, designOptions?.generatedAt, clientId, uiConfig?.defaultTheme])

  async function handleShare() {
    const payload = {
      timestamp: new Date().toISOString(),
      hasSourceImage: Boolean(beforeImage),
      targetColor,
      beforeImage,
      designId,
      designOptions
    }
    try {
      const res = await fetch(`${API_BASE}/api/designs/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error('Save failed')
      const data = await res.json()
      const share = `${API_BASE}${data.shareUrl}`
      await navigator.clipboard.writeText(share)
      alert('Share link copied to clipboard.')
    } catch (err) {
      console.warn(err)
      navigator.clipboard.writeText(JSON.stringify(payload)).then(() => {
        alert('Fallback JSON copied to clipboard.')
      }).catch(() => {
        alert('Unable to access clipboard in this browser session.')
      })
    }
  }

  return (
    <div className="page page-v2">
      <section className="section-card-v2">
        <div className="section-head-v2">
          <div>
            <h2>Results</h2>
            <p>Compare the source room and redesigned output, then export or share your current design state.</p>
          </div>
          <div className="section-actions-v2">
            <Link to="/dashboard" className="btn-v2">Back to Dashboard</Link>
            <button type="button" className="btn-v2 primary" onClick={handleShare}>Copy Share Payload</button>
          </div>
        </div>

        <div className="palette-rail-v2">
          <div className="style-head-v2">Suggested wall colors</div>
          <div className="palette-strip-v2">
            {topPalette.length > 0 ? topPalette.map((color) => (
              <button
                key={color}
                type="button"
                className="palette-dot-v2"
                style={{ background: color }}
                title={color}
                onClick={() => setTargetColor && setTargetColor(color)}
              />
            )) : (
              <span className="palette-hint-v2">Upload a room photo to generate palette suggestions</span>
            )}
          </div>
        </div>

        <div className="results-preview-v2">
          <div className="results-preview-head-v2">
            <h3>AI preview</h3>
            <span>{loading ? 'Generating...' : 'Ready to edit'}</span>
          </div>
          <div className="results-preview-grid-v2">
            <div className="results-preview-pane-v2">
              <div className="results-preview-label-v2">Before</div>
              {beforeImage ? <img src={beforeImage} alt="Original room" /> : <div className="img-empty-v2">Upload an image in Dashboard</div>}
            </div>
            <div className="results-preview-pane-v2 after">
              <div className="results-preview-label-v2">After</div>
              {loading && <div className="img-empty-v2">Generating redesign preview...</div>}
              {!loading && previewUrl && !previewFailed && <img src={previewUrl} alt="AI generated redesign preview" />}
              {!loading && (!previewUrl || previewFailed) && <div className="img-empty-v2">Waiting for preview</div>}
            </div>
          </div>
        </div>

        <div className="results-grid-v2">
          <div className="result-pane-v2 before-pane-v2">
            <h3>Before · uploaded photo</h3>
            {beforeImage ? <img src={beforeImage} alt="Original room" /> : <div className="img-empty-v2">Upload an image in Dashboard</div>}
            <div className="before-catalog-v2">
              <div className="layers-help-v2" style={{ marginTop: 12 }}>Furniture catalog</div>
              <div className="catalog-list-v2 catalog-list-before-v2">
                {(uiConfig?.catalog || []).length > 0 ? (uiConfig.catalog.map((item) => (
                  <div key={item.id} className="catalog-item catalog-item-v2" draggable onDragStart={(e) => e.dataTransfer.setData('text/plain', JSON.stringify(item))} title={`Drag ${item.label || item.name || item.category}`}>
                    <div className="catalog-thumb catalog-thumb-swatch" style={{ background: item.previewColor || '#6b7280' }} />
                    <div className="variant-label">{item.label || item.name || item.category}</div>
                  </div>
                ))) : <div className="layers-empty-v2">No catalog data loaded.</div>}
              </div>
            </div>
          </div>
          <div className="result-pane-v2">
            <h3>Fine-tune in canvas</h3>
            {loading && <div className="img-empty-v2">Generating redesign preview...</div>}
            {!loading && (
              <>
                {previewUrl && !previewFailed && <p className="result-note-v2">AI preview loaded. You can keep editing this in the canvas below.</p>}
                {previewFailed && <p className="result-note-v2">Preview image could not be loaded. Using your uploaded image for editing.</p>}
                {streamStatus && <p className="result-note-v2">{streamStatus} ({streamProgress}%)</p>}
                <div style={{ marginBottom: 8 }}>
                  <button type="button" className="btn-v2" onClick={async () => {
                    if (!targetColor) { alert('Pick a color first'); return }
                    try {
                      const res = await fetch(`${API_BASE}/api/recommend`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ baseColor: targetColor }) })
                      if (!res.ok) throw new Error('Recommend failed')
                      const data = await res.json()
                      const p = []
                      if (data?.palettes) {
                        // flatten top choices
                        p.push(data.palettes.complementary[0])
                        p.push(data.palettes.analogous[0])
                        p.push(data.palettes.triadic[0])
                      }
                      setPaletteSuggestions && setPaletteSuggestions(p)
                    } catch (err) {
                      console.warn(err)
                      alert('Palette recommendation failed')
                    }
                  }}>Get Palettes</button>
                </div>
                <CanvasView image={editableImage || beforeImage} targetColor={targetColor} setTargetColor={setTargetColor} clientId={clientId} segmentLayers={segmentLayers} />
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
