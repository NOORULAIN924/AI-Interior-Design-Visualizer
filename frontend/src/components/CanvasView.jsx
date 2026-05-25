import React, {useEffect, useRef, useState} from 'react'
import { fabric } from 'fabric'

export default function CanvasView({image}){
  const canvasRef = useRef(null)
  const fabricRef = useRef(null)
  const [targetColor, setTargetColor] = useState('#dba')
  const [picking, setPicking] = useState(false)

  useEffect(()=>{
    const c = new fabric.Canvas(canvasRef.current, {backgroundColor:'#fff', preserveObjectStacking:true})
    fabricRef.current = c
    c.setHeight(540)
    c.setWidth(720)

    // accept drops from catalog
    const el = canvasRef.current
    function onDrop(e){
      e.preventDefault()
      const data = e.dataTransfer.getData('text/plain')
      try{
        const item = JSON.parse(data)
        if(item.src){
          fabric.Image.fromURL(item.src, img=>{
            img.set({left:50,top:50,scaleX:1,scaleY:1})
            img.scaleToWidth(200)
            c.add(img)
            c.setActiveObject(img)
            c.requestRenderAll()
          },{crossOrigin:'anonymous'})
        }else{
          const rect = new fabric.Rect({width:120,height:80,fill:'#ddd'})
          const txt = new fabric.Text(item.name,{left:10,top:30})
          const group = new fabric.Group([rect,txt],{left:50,top:50})
          c.add(group)
        }
      }catch(err){console.warn(err)}
    }
    function onDragOver(e){e.preventDefault()}
    el.addEventListener('drop', onDrop)
    el.addEventListener('dragover', onDragOver)

    // click handler for picking source color on background image
    function onCanvasClick(opt){
      if(!picking) return
      const pointer = c.getPointer(opt.e)
      const bg = getBackgroundImage(c)
      if(!bg) return
      samplePixelFromFabricImage(bg, pointer.x, pointer.y).then(srcColor=>{
        // perform recolor
        applyColorReplaceToBackground(c, bg, srcColor, hexToRgb(targetColor))
        setPicking(false)
      })
    }
    c.on('mouse:down', onCanvasClick)

    return ()=>{
      el.removeEventListener('drop', onDrop)
      el.removeEventListener('dragover', onDragOver)
      c.off('mouse:down', onCanvasClick)
      c.dispose()
    }
  },[picking, targetColor])

  useEffect(()=>{
    if(!image) return
    const c = fabricRef.current
    fabric.Image.fromURL(image, img=>{
      img.scaleToWidth(c.getWidth())
      img.set({left:0,top:0,selectable:false})
      const objs = c.getObjects().filter(o=>o._isBackgroundImage)
      objs.forEach(o=>c.remove(o))
      img._isBackgroundImage = true
      c.add(img)
      img.sendToBack()
      c.requestRenderAll()
    },{crossOrigin:'anonymous'})
  },[image])

  function getBackgroundImage(c){
    return c.getObjects().find(o=>o._isBackgroundImage && o.type==='image')
  }

  async function samplePixelFromFabricImage(fabricImg, x, y){
    return new Promise((resolve)=>{
      const imgEl = fabricImg.getElement()
      const tmp = document.createElement('canvas')
      tmp.width = imgEl.width; tmp.height = imgEl.height
      const ctx = tmp.getContext('2d')
      ctx.drawImage(imgEl,0,0)
      // map x,y from canvas coords to image coords (assumes image placed at 0,0)
      const ix = Math.floor(x * (imgEl.width / fabricRef.current.getWidth()))
      const iy = Math.floor(y * (imgEl.height / fabricRef.current.getHeight()))
      const d = ctx.getImageData(Math.max(0,ix), Math.max(0,iy), 1,1).data
      resolve([d[0],d[1],d[2]])
    })
  }

  function hexToRgb(hex){
    hex = hex.replace('#','')
    const bigint = parseInt(hex,16)
    return [(bigint>>16)&255, (bigint>>8)&255, bigint&255]
  }

  function colorDistance2(a,b){
    return (a[0]-b[0])**2 + (a[1]-b[1])**2 + (a[2]-b[2])**2
  }

  async function applyColorReplaceToBackground(c, fabricImg, sourceRgb, targetRgb){
    const imgEl = fabricImg.getElement()
    const tmp = document.createElement('canvas')
    tmp.width = imgEl.width; tmp.height = imgEl.height
    const ctx = tmp.getContext('2d')
    ctx.drawImage(imgEl,0,0)
    const data = ctx.getImageData(0,0,tmp.width,tmp.height)
    const pixels = data.data
    const threshold = 1800 // squared distance threshold
    for(let i=0;i<pixels.length;i+=4){
      const r=pixels[i], g=pixels[i+1], b=pixels[i+2]
      if(colorDistance2([r,g,b], sourceRgb) < threshold){
        // simple blend towards target
        pixels[i] = Math.round((pixels[i]*0.2) + (targetRgb[0]*0.8))
        pixels[i+1] = Math.round((pixels[i+1]*0.2) + (targetRgb[1]*0.8))
        pixels[i+2] = Math.round((pixels[i+2]*0.2) + (targetRgb[2]*0.8))
      }
    }
    ctx.putImageData(data,0,0)
    const newDataUrl = tmp.toDataURL('image/png')
    // replace fabric image
    fabric.Image.fromURL(newDataUrl, img=>{
      img.set({left:0,top:0,selectable:false})
      img._isBackgroundImage = true
      // remove old and add new
      c.remove(fabricImg)
      c.add(img)
      img.sendToBack()
      c.requestRenderAll()
    },{crossOrigin:'anonymous'})
  }

  function exportImage(){
    const c = fabricRef.current
    const data = c.toDataURL({format:'png'})
    const a = document.createElement('a')
    a.href = data
    a.download = 'redesign.png'
    a.click()
  }

  function copyShareCode(){
    const c = fabricRef.current
    const json = c.toJSON(['_isBackgroundImage'])
    const blob = new Blob([JSON.stringify(json)],{type:'application/json'})
    const reader = new FileReader()
    reader.onload = ()=>{
      navigator.clipboard.writeText(reader.result).then(()=>alert('Design JSON copied to clipboard'))
    }
    reader.readAsText(blob)
  }

  return (
    <div className="canvas-wrap">
      <div style={{display:'flex',gap:8,marginBottom:8}}>
        <label>Target color: <input type="color" value={targetColor} onChange={(e)=>setTargetColor(e.target.value)} /></label>
        <button onClick={()=>setPicking(true)}>Pick area to recolor</button>
        <button onClick={exportImage}>Download PNG</button>
        <button onClick={copyShareCode}>Copy Share JSON</button>
      </div>
      <canvas ref={canvasRef} />
      <div className="canvas-actions" />
    </div>
  )
}
