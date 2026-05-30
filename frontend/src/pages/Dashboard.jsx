import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Catalog from '../components/Catalog'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:5000'

export default function Dashboard({ uiConfig, beforeImage, setBeforeImage, palette, setPalette, targetColor, setTargetColor, designOptions, setDesignOptions }) {
  const navigate = useNavigate()
  const isMountedRef = useRef(true)
  const [designTheme, setDesignTheme] = useState(designOptions?.designTheme || '')
  const [roomType, setRoomType] = useState(designOptions?.roomType || '')
  const [paletteSuggestions, setPaletteSuggestions] = useState([])

  useEffect(() => {
    return () => {
      isMountedRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!uiConfig) return
    setDesignTheme((prev) => prev || uiConfig.defaultTheme || '')
    setRoomType((prev) => prev || uiConfig.roomTypes?.[0] || '')
  }, [uiConfig])

  async function handleUpload(e) {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result
      setBeforeImage && setBeforeImage(dataUrl)
      setDesignOptions && setDesignOptions({
        designTheme,
        roomType,
        generatedAt: Date.now()
      })
      navigate('/results')
      if (setPalette) {
        try {
          const res = await fetch(`${API_BASE}/api/palette`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageData: dataUrl })
          })
          if (res.ok) {
            const payload = await res.json()
            const p = (payload.roomPalette?.swatches || []).slice(0, 6).map((sw) => sw.hex)
            setPalette(p)
            if (isMountedRef.current) {
              setPaletteSuggestions(payload.recommendations || [])
            }
          } else {
            if (isMountedRef.current) {
              setPaletteSuggestions([])
            }
          }
        } catch (err) {
          console.warn(err)
          if (isMountedRef.current) {
            setPaletteSuggestions([])
          }
        }
      }
    }
    reader.readAsDataURL(file)
  }

  function handleGenerate() {
    if (!beforeImage) {
      alert('Upload a room photo first to generate a redesign preview.')
      return
    }

    setDesignOptions && setDesignOptions({
      designTheme,
      roomType,
      generatedAt: Date.now()
    })
    navigate('/results')
  }

  return (
    <div className="page page-v2">
      <section className="dash-main-v2">
        <div className="dash-top-card-v2">
          <h3>Upload a room photo and the app will open Results automatically with a generated redesign preview</h3>
          <p className="result-note-v2">Your uploaded photo is the source image for segmentation, palette extraction, and the AI redesign preview.</p>

          <div className="dash-row-v2">
            <label className="dash-field-v2">
              <span>Design Theme</span>
              <select value={designTheme} onChange={(e) => setDesignTheme(e.target.value)}>
                {(uiConfig?.styleThemes || []).map((theme) => (
                  <option key={theme.key} value={theme.key}>{theme.label}</option>
                ))}
              </select>
            </label>
            <label className="dash-field-v2">
              <span>Room Type</span>
              <select value={roomType} onChange={(e) => setRoomType(e.target.value)}>
                {(uiConfig?.roomTypes || []).map((room) => (
                  <option key={room} value={room}>{room}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="dash-actions-v2">
            <label className="upload-btn-v2" htmlFor="room-upload">Upload Photo</label>
            <input id="room-upload" type="file" accept="image/*" onChange={handleUpload} hidden />
            <button className="generate-btn-v2" type="button" onClick={handleGenerate}>Generate Design</button>
          </div>

          {palette && palette.length > 0 && (
            <div className="palette-strip-v2">
              {palette.slice(0, 6).map((p, i) => (
                <button key={i} type="button" className="palette-dot-v2" style={{ background: p }} onClick={() => setTargetColor && setTargetColor(p)} title={p} />
              ))}
            </div>
          )}

          <div className="palette-presets-v2">
            <div className="style-head-v2">AI-suggested palette combos</div>
            <div className="palette-preset-row-v2">
              {paletteSuggestions.length > 0 ? (
                paletteSuggestions.map((suggestion) => (
                  <button
                    key={suggestion.name}
                    type="button"
                    className="palette-dot-v2"
                    style={{ background: suggestion.wall }}
                    onClick={() => setTargetColor && setTargetColor(suggestion.wall)}
                    title={`${suggestion.name}: ${suggestion.wall}`}
                  />
                ))
              ) : (
                <span className="palette-hint-v2">Upload a photo to get AI palette suggestions</span>
              )}
            </div>
          </div>

          <div className="style-block-v2">
            <div className="style-head-v2">Furniture catalog</div>
            <p>Drag catalog items into the canvas once the workspace is loaded.</p>
            <Catalog items={uiConfig?.catalog || []} />
          </div>
        </div>

        <div className="compare-wrap-v2">
          <div className="compare-head-v2">
            <h4>Compare Results</h4>
            <div className="compare-icons-v2">
              <button type="button" title="Refresh">↻</button>
              <button type="button" title="Download">↓</button>
              <button type="button" title="Save">⎘</button>
            </div>
          </div>

          <div className="compare-grid-v2">
            <div className="compare-pane-v2">
              {beforeImage ? <img src={beforeImage} alt="Before image" /> : <div className="img-empty-v2">Upload a room photo</div>}
              <div className="pane-label-v2">Before · uploaded photo</div>
            </div>
            <div className="compare-pane-v2 after">
              <div className="img-empty-v2">Generated design preview will open on the Results page</div>
              <div className="pane-label-v2">After · AI preview · {designTheme}</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
