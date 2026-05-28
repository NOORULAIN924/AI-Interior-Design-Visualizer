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

export default function Results({ beforeImage, targetColor, designOptions }) {
  const [previewUrl, setPreviewUrl] = useState('')
  const [editableImage, setEditableImage] = useState('')
  const [previewFailed, setPreviewFailed] = useState(false)
  const [segmentLayers, setSegmentLayers] = useState({})
  const [designId, setDesignId] = useState('')
  const [loading, setLoading] = useState(false)

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
                <CanvasView image={editableImage || beforeImage} targetColor={targetColor} segmentLayers={segmentLayers} />
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}
