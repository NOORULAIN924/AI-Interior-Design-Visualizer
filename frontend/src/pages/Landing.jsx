import React from 'react'
import { Link } from 'react-router-dom'

export default function Landing(){
  return (
    <div className="page landing">
      <section className="hero">
        <div>
          <h2>Redecorate Your Room Before You Buy</h2>
          <p>Upload a photo of your room, swap furniture, test color palettes, and preview a realistic redesign right in your browser.</p>
          <div className="hero-cta">
            <Link to="/dashboard" className="btn primary">Try the Visualizer</Link>
            <Link to="/about" className="btn">Learn More</Link>
          </div>
        </div>
        <div className="hero-image">
          <img src="/placeholder-hero.jpg" alt="room example" />
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
