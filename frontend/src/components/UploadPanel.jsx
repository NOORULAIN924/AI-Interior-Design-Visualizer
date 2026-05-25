import React, {useRef, useState} from 'react'
import { extractPalette } from '../utils/palette'

export default function UploadPanel({onUpload, setPalette}){
  const fileRef = useRef()
  const [loading, setLoading] = useState(false)

  async function handleFile(e){
    const file = e.target.files[0]
    if(!file) return
    setLoading(true)
    try{
      const reader = new FileReader()
      reader.onload = async (ev) => {
        const dataUrl = ev.target.result
        onUpload && onUpload(dataUrl)
        if(setPalette){
          const palette = await extractPalette(dataUrl, 6)
          setPalette(palette)
        }
      }
      reader.readAsDataURL(file)
    }catch(err){
      console.error(err)
      alert('Failed to read image')
    }finally{setLoading(false)}
  }

  return (
    <div className="panel upload-panel">
      <h3>Upload Room Photo</h3>
      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} />
      {loading && <div className="muted">Processing image...</div>}
      <div className="help">Tip: Use a wide-angle photo standing in the doorway.</div>
    </div>
  )
}
