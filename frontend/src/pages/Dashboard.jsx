import React from 'react'
import UploadPanel from '../components/UploadPanel'
import ColorPickerPanel from '../components/ColorPickerPanel'
import Catalog from '../components/Catalog'
import CanvasView from '../components/CanvasView'

export default function Dashboard({beforeImage, setBeforeImage, palette, setPalette, targetColor, setTargetColor}){
  return (
    <div className="page dashboard">
      <aside className="dashboard-side">
        <UploadPanel onUpload={setBeforeImage} setPalette={setPalette} />
        <ColorPickerPanel palette={palette} onPick={setTargetColor} />
        <Catalog />
      </aside>
      <section className="dashboard-main">
        <h3>Workspace</h3>
        <CanvasView image={beforeImage} targetColor={targetColor} setTargetColor={setTargetColor} />
      </section>
    </div>
  )
}
