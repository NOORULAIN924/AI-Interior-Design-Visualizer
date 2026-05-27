import React from 'react'
import CanvasView from '../components/CanvasView'
import { Link } from 'react-router-dom'

export default function Results({ beforeImage, targetColor }) {
  function handleShare() {
    const payload = {
      timestamp: new Date().toISOString(),
      hasSourceImage: Boolean(beforeImage),
      targetColor
    }
    navigator.clipboard.writeText(JSON.stringify(payload)).then(() => {
      alert('Design summary copied to clipboard.')
    }).catch(() => {
      alert('Unable to access clipboard in this browser session.')
    })
  }

  return (
    <div className="page page-v2">
      <section className="section-card-v2">
        <div className="section-head-v2">
          <div>
            <h2>Results</h2>
            <p>Compare your source room and redesigned output, then export or share your current design state.</p>
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
            <CanvasView image={beforeImage} targetColor={targetColor} />
          </div>
        </div>
      </section>
    </div>
  )
}
