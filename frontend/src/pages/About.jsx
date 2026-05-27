import React from 'react'
import { Link } from 'react-router-dom'

export default function About() {
  return (
    <div className="page page-v2">
      <section className="section-card-v2">
        <div className="section-head-v2">
          <div>
            <h2>About</h2>
            <p>AI Interior Design Visualizer helps you redesign confidently before buying paint, furniture, or decor.</p>
          </div>
          <Link to="/dashboard" className="btn-v2 primary">Open Dashboard</Link>
        </div>

        <div className="about-grid-v2">
          <article>
            <h3>Core workflow</h3>
            <ul>
              <li>Upload a room photo directly in the browser.</li>
              <li>Use segmentation-aware design controls for walls and furniture zones.</li>
              <li>Apply style strength and room context to guide redesign outputs.</li>
              <li>Compare before and after visuals side-by-side.</li>
              <li>Save or share design payloads for collaboration.</li>
            </ul>
          </article>

          <article>
            <h3>Technology stack</h3>
            <ul>
              <li>Frontend: React.js + Fabric.js canvas interactions</li>
              <li>Backend target: Flask + Python inference services</li>
              <li>Vision models target: SAM / DeepLab + style-transfer pipeline</li>
              <li>Image operations: OpenCV preprocessing and mask utilities</li>
              <li>Model runtime: PyTorch-based serving</li>
            </ul>
          </article>

          <article>
            <h3>Privacy and control</h3>
            <p>
              The interface is designed so users can iterate quickly in-browser. Server-based AI processing can be
              enabled per deployment based on privacy and performance requirements.
            </p>
          </article>
        </div>
      </section>
    </div>
  )
}
