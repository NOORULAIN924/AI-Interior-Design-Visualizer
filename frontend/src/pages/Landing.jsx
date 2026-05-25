import React from 'react'
import { Link } from 'react-router-dom'

export default function Landing(){
  return (
    <div className="page landing">
      <section className="hero">
        <div className="hero-copy">
          <h2>Redecorate Your Room Before You Buy</h2>
          <p>Upload a photo of your room, swap furniture, test color palettes, and preview a realistic redesign right in your browser.</p>
          <div className="hero-cta">
            <Link to="/dashboard" className="btn primary">Try the Visualizer</Link>
            <Link to="/about" className="btn">Learn More</Link>
          </div>
        </div>
        <div className="hero-visual">
          <svg width="420" height="300" viewBox="0 0 420 300" fill="none" xmlns="http://www.w3.org/2000/svg" className="hero-svg">
            <rect x="0" y="0" width="420" height="300" rx="12" fill="url(#g)" />
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#e6f7ff"/>
                <stop offset="1" stopColor="#f0f9f4"/>
              </linearGradient>
            </defs>
            <g transform="translate(28,22)">
              <rect x="0" y="60" width="280" height="160" rx="8" fill="#fff" opacity="0.8" />
              <rect x="16" y="40" width="120" height="60" rx="8" fill="#0f62fe" opacity="0.95" />
              <rect x="172" y="64" width="80" height="40" rx="6" fill="#00b894" opacity="0.95" />
            </g>
          </svg>
        </div>
      </section>
      <section className="features">
        <div className="feature">
          <h4>Smart Palette Suggestions</h4>
          <p>AI extracts a harmonious color palette from your photo and suggests complementary combinations.</p>
        </div>
        <div className="feature">
          <h4>Drag-and-Drop Catalog</h4>
          <p>Place furniture from our curated catalog, move and resize items, and experiment with layouts.</p>
        </div>
        <div className="feature">
          <h4>Share & Export</h4>
          <p>Download high-resolution redesigns or copy a shareable JSON representation of your scene.</p>
        </div>
      </section>
    </div>
  )
}
