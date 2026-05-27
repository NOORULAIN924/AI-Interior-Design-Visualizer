import React, { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { extractPalette } from '../utils/palette'

export default function Dashboard({ beforeImage, setBeforeImage, palette, setPalette, targetColor, setTargetColor }) {
  const [designTheme, setDesignTheme] = useState('Mid-Century Modern')
  const [roomType, setRoomType] = useState('Kitchen')
  const [styleStrength, setStyleStrength] = useState('Balanced')

  const styleOptions = useMemo(() => [
    { key: 'Faithful', title: 'Faithful', desc: "Keeps your room's layout intact" },
    { key: 'Balanced', title: 'Balanced', desc: 'A blend of your space and the style' },
    { key: 'Creative', title: 'Creative', desc: 'More AI freedom with the design' },
    { key: 'Bold', title: 'Bold', desc: 'Full AI reimagining of your space' }
  ], [])

  async function handleUpload(e) {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result
      setBeforeImage && setBeforeImage(dataUrl)
      if (setPalette) {
        try {
          const p = await extractPalette(dataUrl, 6)
          setPalette(p)
        } catch (err) {
          console.warn(err)
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
  }

  return (
    <div className="page dashboard-v2">
      <aside className="dash-sidebar-v2">
        <div className="dash-brand-v2">Interior Designer</div>
        <nav className="dash-nav-v2" aria-label="Dashboard">
          <Link className="nav-item-v2 active" to="/dashboard">Design</Link>
          <Link className="nav-item-v2" to="/results">Gallery</Link>
          <Link className="nav-item-v2" to="/analytics">Settings</Link>
          <Link className="nav-item-v2" to="/about">Help</Link>
        </nav>
      </aside>

      <section className="dash-main-v2">
        <div className="dash-top-card-v2">
          <h3>Upload a photo of your room and let AI reimagine it with a new design style</h3>

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

          <div className="style-block-v2">
            <div className="style-head-v2">Style Strength</div>
            <p>How freely the AI reimagines your space</p>
            <div className="style-grid-v2">
              {styleOptions.map(opt => (
                <button
                  key={opt.key}
                  className={`style-card-v2 ${styleStrength === opt.key ? 'selected' : ''}`}
                  type="button"
                  onClick={() => setStyleStrength(opt.key)}
                >
                  <strong>{opt.title}</strong>
                  <span>{opt.desc}</span>
                </button>
              ))}
            </div>
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
