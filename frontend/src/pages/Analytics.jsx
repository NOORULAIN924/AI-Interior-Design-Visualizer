import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:5000'

export default function Analytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    async function loadAnalytics() {
      try {
        const res = await fetch(`${API_BASE}/api/analytics`)
        const payload = await res.json()
        if (!alive) return
        setData(payload)
      } catch (err) {
        console.warn(err)
        if (alive) setData({ roomsRedesigned: 0, mostUsedThemes: [], mostUsedPalettes: [], favoriteFurnitureStyles: [], topFurnitureCategories: [], projectHistory: [] })
      } finally {
        if (alive) setLoading(false)
      }
    }
    loadAnalytics()
    return () => { alive = false }
  }, [])

  const roomsRedesigned = data?.roomsRedesigned ?? 0
  const themeBars = (data?.mostUsedThemes || []).slice(0, 4)
  const paletteBars = (data?.mostUsedPalettes || []).slice(0, 4)
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
            <p className="metric-v2">{loading ? '...' : roomsRedesigned}</p>
            <span>Computed from saved design payloads</span>
          </article>

          <article className="metric-card-v2">
            <h3>Most selected themes</h3>
            <div className="bar-chart-v2">
              {themeBars.map(([label, count]) => (
                <div key={label} className="bar-row-v2">
                  <span>{label}</span>
                  <div className="bar-track-v2"><div className="bar-fill-v2" style={{ width: `${Math.max(12, Math.min(100, count * 5))}%` }} /></div>
                </div>
              ))}
            </div>
            <span>{loading ? 'Loading analytics' : 'From design JSON payloads'}</span>
          </article>

          <article className="metric-card-v2">
            <h3>Favorite furniture styles</h3>
            <p className="metric-v2">{loading ? '...' : (data?.favoriteFurnitureStyles?.[0]?.[0] || 'No data')}</p>
            <span>{loading ? 'Loading analytics' : 'Most frequent catalog style tag'}</span>
          </article>

          <article className="metric-card-v2">
            <h3>Palette adoption</h3>
            <div className="bar-chart-v2">
              {paletteBars.map(([label, count]) => (
                <div key={label} className="bar-row-v2">
                  <span>{label}</span>
                  <div className="bar-track-v2"><div className="bar-fill-v2 alt" style={{ width: `${Math.max(12, Math.min(100, count * 5))}%` }} /></div>
                </div>
              ))}
            </div>
            <span>{loading ? 'Loading analytics' : 'Most reused palette selections from saved designs'}</span>
          </article>

          <article className="metric-card-v2 full">
            <h3>Project History</h3>
            <div className="project-grid-v2">
              {(data?.projectHistory || []).length > 0 ? data.projectHistory.map((project) => (
                <article key={project.id} className="project-card-v2">
                  <div className="project-thumb-v2" style={{ background: project.dominantColor || '#1b202b' }} />
                  <strong>{project.styleTheme || 'Untitled design'}</strong>
                  <span>{project.createdAt}</span>
                </article>
              )) : <p className="section-note-v2">No saved projects yet. Create a redesign to populate analytics.</p>}
            </div>
          </article>
        </div>

        <div className="section-note-v2">
          Analytics is computed from saved design JSON files and updates whenever new designs are saved.
        </div>
      </section>
    </div>
  )
}
