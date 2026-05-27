import React from 'react'
import { Link } from 'react-router-dom'

export default function Analytics() {
  return (
    <div className="page page-v2">
      <section className="section-card-v2">
        <div className="section-head-v2">
          <div>
            <h2>Analytics</h2>
            <p>Track redesign activity, feature adoption, and conversion signals across your interior visualization workflow.</p>
          </div>
          <Link to="/dashboard" className="btn-v2">Run New Design</Link>
        </div>

        <div className="analytics-grid-v2">
          <article className="metric-card-v2">
            <h3>Total redesign sessions</h3>
            <p className="metric-v2">1,248</p>
            <span>Last 30 days across all room types</span>
          </article>

          <article className="metric-card-v2">
            <h3>Most selected theme</h3>
            <p className="metric-v2">Mid-Century Modern</p>
            <span>Used in 31% of generated designs</span>
          </article>

          <article className="metric-card-v2">
            <h3>Top room category</h3>
            <p className="metric-v2">Kitchen</p>
            <span>Highest completion-to-export rate</span>
          </article>

          <article className="metric-card-v2">
            <h3>Palette adoption</h3>
            <div className="palette-strip-v2">
              <span className="palette-dot-v2" style={{ background: '#e6dccf' }}></span>
              <span className="palette-dot-v2" style={{ background: '#c2d0d3' }}></span>
              <span className="palette-dot-v2" style={{ background: '#667f83' }}></span>
              <span className="palette-dot-v2" style={{ background: '#354248' }}></span>
            </div>
            <span>Most reused palette from successful redesigns</span>
          </article>

          <article className="metric-card-v2 full">
            <h3>Pipeline readiness checklist</h3>
            <ul className="checklist-v2">
              <li>Frontend upload, preview, and comparison flow</li>
              <li>Interactive recolor + palette assisted controls</li>
              <li>Share payload export path</li>
              <li>Backend segmentation and style-transfer integration pending</li>
            </ul>
          </article>
        </div>

        <div className="section-note-v2">
          Connect this page to real telemetry events once Flask endpoints are integrated.
        </div>
      </section>
    </div>
  )
}
