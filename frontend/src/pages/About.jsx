import React from 'react'

export default function About(){
  return (
    <div className="page about">
      <h2>About AI Interior Visualizer</h2>
      <p>This project helps users visualize redesigns of their rooms before purchasing items. It combines client-side image processing for palette extraction, an interactive Fabric.js canvas for layout and composition, and a curated furniture catalog for rapid experimentation.</p>
      <h3>Key Features</h3>
      <ul>
        <li>Upload and preview real room photos</li>
        <li>AI-suggested color palettes derived from your image</li>
        <li>Drag, scale and rotate catalog furniture</li>
        <li>Export images and share editable scene JSON</li>
      </ul>
      <h3>Privacy</h3>
      <p>All image processing can be done locally in the browser. No images are uploaded unless you explicitly use a server endpoint.</p>
    </div>
  )
}
