import React, { useRef, useState } from 'react'
import { extractPalette } from '../utils/palette'

export default function UploadPanel({ onUpload, setPalette }) {
  const fileRef = useRef()
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  async function handleFile(e) {
    const file = e.target.files[0]
    if (!file) return
    setLoading(true)
    setProgress(0)
    try {
      const reader = new FileReader()
      reader.onprogress = (ev) => {
        if (ev.lengthComputable) {
          const pct = Math.round((ev.loaded / ev.total) * 100)
          setProgress(pct)
        }
      }
      reader.onload = async (ev) => {
        const dataUrl = ev.target.result
        onUpload && onUpload(dataUrl)
        if (setPalette) {
          try {
            const palette = await extractPalette(dataUrl, 6)
            setPalette(palette)
          } catch (err) {
            console.warn('Palette extraction failed', err)
          }
        }
        setProgress(100)
        setLoading(false)
      }
      reader.onerror = (err) => {
        console.error(err)
        alert('Failed to read image')
        setLoading(false)
      }
      reader.readAsDataURL(file)
    } catch (err) {
      console.error(err)
      alert('Failed to read image')
      setLoading(false)
    }
  }

  return (
    <div className="panel upload-panel">
      <h3>Upload Room Photo</h3>
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} />
      {loading && (
        <div style={{ marginTop: 8 }}>
          <div className="upload-progress-v2" aria-hidden>
            <div className="upload-progress-bar-v2" style={{ width: `${progress}%` }} />
          </div>
          <div className="muted">Processing image... {progress}%</div>
        </div>
      )}
      <div className="help">Tip: Use a wide-angle photo standing in the doorway.</div>
    </div>
  )
}
