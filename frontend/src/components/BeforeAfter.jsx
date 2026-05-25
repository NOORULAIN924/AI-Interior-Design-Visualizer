import React, {useEffect, useRef, useState} from 'react'
import CanvasView from './CanvasView'

export default function BeforeAfter({before, targetColor, setTargetColor}){
  const [afterSrc, setAfterSrc] = useState(null)

  useEffect(()=>{
    setAfterSrc(null)
  },[before])

  return (
    <div className="before-after">
      <div className="pane before">
        <h4>Before</h4>
        {before ? <img src={before} alt="before" /> : <div className="placeholder">No image</div>}
      </div>
      <div className="pane after">
        <h4>After</h4>
        <CanvasView image={before} targetColor={targetColor} setTargetColor={setTargetColor} />
      </div>
    </div>
  )
}
