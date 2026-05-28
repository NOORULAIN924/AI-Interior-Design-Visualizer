import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { extractPalette } from '../utils/palette'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:5000'

export default function Dashboard({ beforeImage, setBeforeImage, palette, setPalette, targetColor, setTargetColor, designOptions, setDesignOptions }) {
  const navigate = useNavigate()
  const [designTheme, setDesignTheme] = useState(designOptions?.designTheme || 'Mid-Century Modern')
  const [roomType, setRoomType] = useState(designOptions?.roomType || 'Kitchen')
  const [paletteSuggestions, setPaletteSuggestions] = useState([])

  async function handleUpload(e) {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result
      setBeforeImage && setBeforeImage(dataUrl)
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
            setPaletteSuggestions(payload.recommendations || [])
          } else {
            const p = await extractPalette(dataUrl, 6)
            setPalette(p)
            setPaletteSuggestions([])
          }
        } catch (err) {
          console.warn(err)
          try {
            const p = await extractPalette(dataUrl, 6)
            setPalette(p)
            setPaletteSuggestions([])
          } catch (innerErr) {
            console.warn(innerErr)
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
          <h3>Upload a room photo, segment the space, swap furniture, and preview the redesign in the browser</h3>

          <div className="dash-row-v2">
            <label className="dash-field-v2">
              <span>Design Theme</span>
              <select value={designTheme} onChange={(e) => setDesignTheme(e.target.value)}>
                <option>Mid-Century Modern</option>
                <option>Scandinavian</option>
                <option>Minimal Contemporary</option>
                <option>Japandi</option>
                <option>Industrial</option>
              </select>
            </label>
            <label className="dash-field-v2">
              <span>Room Type</span>
              <select value={roomType} onChange={(e) => setRoomType(e.target.value)}>
                <option>Kitchen</option>
                <option>Living Room</option>
                <option>Bedroom</option>
                <option>Bathroom</option>
                <option>Office</option>
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
              {beforeImage ? <img src={beforeImage} alt="Before" /> : <div className="img-empty-v2">Upload a room photo</div>}
              <div className="pane-label-v2">Before</div>
            </div>
            <div className="compare-pane-v2 after">
              {beforeImage ? <img src={beforeImage} alt="After" /> : <div className="img-empty-v2">Generated design preview</div>}
              <div className="pane-label-v2">After · {designTheme}</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
