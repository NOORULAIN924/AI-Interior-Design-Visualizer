import React from 'react'
import CanvasView from '../components/CanvasView'

export default function Results({beforeImage, targetColor}){
  return (
    <div className="page results">
      <h2>Design Results</h2>
      <p>Here is the redesign preview generated from your workspace. Use the download button to save a high-resolution image, or copy the design JSON to share.</p>
      <div className="results-canvas">
        <CanvasView image={beforeImage} />
      </div>
    </div>
  )
}
