import React, { useEffect, useState } from 'react'
import CanvasView from '../components/CanvasView'
import { Link } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:5000'

function mapThemeToApi(theme) {
  const normalized = (theme || '').toLowerCase().trim()
  const map = {
    'mid-century modern': 'modern_luxe',
    'scandinavian': 'scandinavian',
    'minimal contemporary': 'modern_luxe',
    'japandi': 'japandi',
    'industrial': 'industrial'
  }
  return map[normalized] || 'japandi'
}

export default function Results({ beforeImage, palette = [], targetColor, setTargetColor, designOptions }) {
  const [previewUrl, setPreviewUrl] = useState('')
  const [editableImage, setEditableImage] = useState('')
  const [previewFailed, setPreviewFailed] = useState(false)
  const [segmentLayers, setSegmentLayers] = useState({})
  const [designId, setDesignId] = useState('')
  const [loading, setLoading] = useState(false)
  const [roomPalette, setRoomPalette] = useState([])
  const [paletteSuggestions, setPaletteSuggestions] = useState([])

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
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageData: beforeImage,
            wallColor: targetColor,
            styleTheme: mapThemeToApi(designOptions?.designTheme),
            roomType: designOptions?.roomType
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

        // Fetch semantic vector layers separately to drive canvas mask overlays.
        const segRes = await fetch(`${API_BASE}/api/segment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageData: beforeImage })
        })
        if (segRes.ok) {
          const segPayload = await segRes.json()
          setSegmentLayers(segPayload.vectorLayers || {})
        } else {
          setSegmentLayers({})
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
  }, [beforeImage, targetColor, designOptions?.designTheme, designOptions?.roomType, designOptions?.generatedAt])

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

        <div className="results-grid-v2">
          <div className="result-pane-v2">
            <h3>Before</h3>
            {beforeImage ? <img src={beforeImage} alt="Original room" /> : <div className="img-empty-v2">Upload an image in Dashboard</div>}
          </div>
          <div className="result-pane-v2">
            <h3>After</h3>
            {loading && <div className="img-empty-v2">Generating redesign preview...</div>}
            {!loading && (
              <>
                {previewUrl && !previewFailed && <p className="result-note-v2">AI preview loaded. You can keep editing this in the canvas below.</p>}
                {previewFailed && <p className="result-note-v2">Preview image could not be loaded. Using your uploaded image for editing.</p>}
                <div style={{ marginBottom: 8 }}>
                  <button type="button" className="btn-v2" onClick={async () => {
                    // trigger backend recolor for wall
                    try {
                      const res = await fetch(`${API_BASE}/api/recolor`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ imageData: beforeImage, region: 'wall', targetColor: targetColor })
                      })
                      if (!res.ok) throw new Error('Recolor failed')
                      const payload = await res.json()
                      const preview = payload.previewUrl
                      if (preview) {
                        setPreviewUrl(preview)
                        resolveEditableImage(preview, beforeImage)
                      }
                    } catch (err) {
                      console.warn(err)
                      alert('Recolor failed — check backend logs')
                    }
                  }}>Apply AI Recolor</button>
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
                <CanvasView image={editableImage || beforeImage} targetColor={targetColor} setTargetColor={setTargetColor} segmentLayers={segmentLayers} />
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
