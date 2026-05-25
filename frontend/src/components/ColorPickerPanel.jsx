import React, {useState} from 'react'
import { SketchPicker } from 'react-color'

export default function ColorPickerPanel({palette=[], onPick}){
  const [color, setColor] = useState('#ffffff')

  function handleChangeComplete(c){
    setColor(c.hex)
    onPick && onPick(c.hex)
  }

  return (
    <div className="panel color-panel">
      <h3>Color Picker</h3>
      <SketchPicker color={color} onChangeComplete={handleChangeComplete} />
      <div className="suggestions">
        <h4>AI Suggestions</h4>
        <div className="chips">
          {palette.map((p,i)=> <button key={i} className="chip" onClick={()=>{setColor(p); onPick && onPick(p)}} style={{background:p}} />)}
        </div>
      </div>
    </div>
  )
}
