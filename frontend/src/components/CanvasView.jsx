import React, { useEffect, useRef, useState } from 'react'

export default function CanvasView({ image, targetColor: propTargetColor, setTargetColor: propSetTargetColor }) {
  const canvasRef = useRef(null)
  const fabricRef = useRef(null)
  const fabricLibRef = useRef(null)
  const canvasIdRef = useRef(`canvas-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`)
  const [targetColor, setTargetColor] = useState(propTargetColor || '#dba')
  const [picking, setPicking] = useState(false)

  useEffect(() => {
    if (propTargetColor) setTargetColor(propTargetColor)
  }, [propTargetColor])

  useEffect(() => {
    let c = null
    let mounted = true
    const el = canvasRef.current

    async function init() {
      if (!fabricLibRef.current) {
        const mod = await import('fabric')
        fabricLibRef.current = mod.fabric || mod.default || mod
      }
      if (!mounted) return
      const fabricLib = fabricLibRef.current

      c = new fabricLib.Canvas(canvasRef.current, { backgroundColor: '#fff', preserveObjectStacking: true })
      fabricRef.current = c

      // responsive sizing: fit to container width with 4:3 ratio
      function resize() {
        const wrap = canvasRef.current.parentElement
        const w = Math.min(960, wrap.clientWidth)
        const h = Math.round(w * 0.75)
        c.setWidth(w)
        c.setHeight(h)
        c.calcOffset()
        c.requestRenderAll()
      }
      resize()
      window.addEventListener('resize', resize)

      // accept drops from catalog
      function onDrop(e) {
        e.preventDefault()
        const data = e.dataTransfer.getData('text/plain')
        try {
          const item = JSON.parse(data)
          if (item.src) {
            fabricLib.Image.fromURL(item.src, img => {
              img.set({ left: 50, top: 50, scaleX: 1, scaleY: 1 })
              img.scaleToWidth(200)
              c.add(img)
              c.setActiveObject(img)
              c.requestRenderAll()
            }, { crossOrigin: 'anonymous' })
          } else {
            const rect = new fabricLib.Rect({ width: 120, height: 80, fill: '#ddd' })
            const txt = new fabricLib.Text(item.name, { left: 10, top: 30 })
            const group = new fabricLib.Group([rect, txt], { left: 50, top: 50 })
            c.add(group)
          }
        } catch (err) { console.warn(err) }
      }
      function onDragOver(e) { e.preventDefault() }
      el.addEventListener('drop', onDrop)
      el.addEventListener('dragover', onDragOver)

      // click handler for picking source color on background image
      function onCanvasClick(opt) {
        if (!picking) return
        const pointer = c.getPointer(opt.e)
        const bg = getBackgroundImage(c)
        if (!bg) return
        samplePixelFromFabricImage(bg, pointer.x, pointer.y).then(srcColor => {
          // perform recolor (if mask present, use mask)
          const maskObjects = c.getObjects().filter(o => o.isMask)
          if (maskObjects.length > 0) {
            applyColorReplaceWithMask(c, bg, srcColor, hexToRgb(targetColor), maskObjects)
          } else {
            applyColorReplaceToBackground(c, bg, srcColor, hexToRgb(targetColor))
          }
          setPicking(false)
        })
      }

      // listen for free-draw paths to mark as mask objects
      c.on('path:created', (e) => {
        const p = e.path
        p.isMask = true
        p.selectable = false
        p.opacity = 0.9
      })
      c.on('mouse:down', onCanvasClick)

      // cleanup will remove listeners and dispose canvas
      const cleanup = () => {
        el.removeEventListener('drop', onDrop)
        el.removeEventListener('dragover', onDragOver)
        if (c) {
          c.off('mouse:down', onCanvasClick)
          c.dispose()
          c = null
          fabricRef.current = null
        }
        window.removeEventListener('resize', resize)
      }

      // attach cleanup to outer scope
      return cleanup
    }

    let disposer = null
    init().then(cleanupFn => { disposer = cleanupFn }).catch(err => console.warn(err))

    return () => {
      mounted = false
      if (disposer) disposer()
    }
  }, [picking, targetColor])

  useEffect(() => {
    if (!image) return
    const c = fabricRef.current
    if (!fabricLibRef.current) return
    fabricLibRef.current.Image.fromURL(image, img => {
      img.scaleToWidth(c.getWidth())
      img.set({ left: 0, top: 0, selectable: false })
      const objs = c.getObjects().filter(o => o._isBackgroundImage)
      objs.forEach(o => c.remove(o))
      img._isBackgroundImage = true
      c.add(img)
      img.sendToBack()
      c.requestRenderAll()
    }, { crossOrigin: 'anonymous' })
  }, [image])

  function getBackgroundImage(c) {
    return c.getObjects().find(o => o._isBackgroundImage && o.type === 'image')
  }

  async function samplePixelFromFabricImage(fabricImg, x, y) {
    return new Promise((resolve) => {
      const imgEl = fabricImg.getElement()
      const tmp = document.createElement('canvas')
      tmp.width = imgEl.width; tmp.height = imgEl.height
      const ctx = tmp.getContext('2d')
      ctx.drawImage(imgEl, 0, 0)
      // map x,y from canvas coords to image coords (assumes image placed at 0,0)
      const ix = Math.floor(x * (imgEl.width / fabricRef.current.getWidth()))
      const iy = Math.floor(y * (imgEl.height / fabricRef.current.getHeight()))
      const d = ctx.getImageData(Math.max(0, ix), Math.max(0, iy), 1, 1).data
      resolve([d[0], d[1], d[2]])
    })
  }

  function hexToRgb(hex) {
    hex = hex.replace('#', '')
    const bigint = parseInt(hex, 16)
    return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255]
  }

  function colorDistance2(a, b) {
    return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2
  }

  async function applyColorReplaceToBackground(c, fabricImg, sourceRgb, targetRgb) {
    const imgEl = fabricImg.getElement()
    const tmp = document.createElement('canvas')
    tmp.width = imgEl.width; tmp.height = imgEl.height
    const ctx = tmp.getContext('2d')
    ctx.drawImage(imgEl, 0, 0)
    const data = ctx.getImageData(0, 0, tmp.width, tmp.height)
    const pixels = data.data
    const threshold = 1800 // squared distance threshold
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i], g = pixels[i + 1], b = pixels[i + 2]
      if (colorDistance2([r, g, b], sourceRgb) < threshold) {
        // simple blend towards target
        pixels[i] = Math.round((pixels[i] * 0.2) + (targetRgb[0] * 0.8))
        pixels[i + 1] = Math.round((pixels[i + 1] * 0.2) + (targetRgb[1] * 0.8))
        pixels[i + 2] = Math.round((pixels[i + 2] * 0.2) + (targetRgb[2] * 0.8))
      }
    }
    ctx.putImageData(data, 0, 0)
    const newDataUrl = tmp.toDataURL('image/png')
    // replace fabric image
    if (!fabricLibRef.current) return
    fabricLibRef.current.Image.fromURL(newDataUrl, img => {
      img.set({ left: 0, top: 0, selectable: false })
      img._isBackgroundImage = true
      // remove old and add new
      c.remove(fabricImg)
      c.add(img)
      img.sendToBack()
      c.requestRenderAll()
    }, { crossOrigin: 'anonymous' })
  }

  async function applyColorReplaceWithMask(c, fabricImg, sourceRgb, targetRgb, maskObjects) {
    // build offscreen mask canvas at image resolution
    const imgEl = fabricImg.getElement()
    const maskCanvas = document.createElement('canvas')
    maskCanvas.width = imgEl.width
    maskCanvas.height = imgEl.height
    const mctx = maskCanvas.getContext('2d')
    mctx.fillStyle = 'black'
    mctx.fillRect(0, 0, maskCanvas.width, maskCanvas.height)

    // render each mask object onto the mask canvas by cloning and scaling
    if (!fabricLibRef.current) return
    const tmp = new fabricLibRef.current.Canvas(document.createElement('canvas'))
    tmp.setWidth(c.getWidth())
    tmp.setHeight(c.getHeight())
    for (const mo of maskObjects) {
      const clone = fabricLibRef.current.util.object.clone(mo)
      // add to tmp and render
      tmp.add(clone)
    }
    // use tmp toDataURL then draw into mask at image size
    const maskDataUrl = tmp.toDataURL({ format: 'png' })
    const maskImg = new Image()
    await new Promise((res, rej) => { maskImg.onload = res; maskImg.onerror = rej; maskImg.src = maskDataUrl })
    // draw scaled to image size
    mctx.drawImage(maskImg, 0, 0, maskCanvas.width, maskCanvas.height)

    // now apply recolor only where mask is non-black
    const btmp = document.createElement('canvas')
    btmp.width = imgEl.width; btmp.height = imgEl.height
    const bctx = btmp.getContext('2d')
    bctx.drawImage(imgEl, 0, 0)
    const bdata = bctx.getImageData(0, 0, btmp.width, btmp.height)
    const mdata = mctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height).data
    const threshold = 10
    for (let i = 0; i < bdata.data.length; i += 4) {
      const ma = mdata[i + 3]
      if (ma > threshold) {
        // pixel is within mask; apply replacement if close to sourceRgb
        const r = bdata.data[i], g = bdata.data[i + 1], b = bdata.data[i + 2]
        if (colorDistance2([r, g, b], sourceRgb) < 1800) {
          bdata.data[i] = Math.round((bdata.data[i] * 0.2) + (targetRgb[0] * 0.8))
          bdata.data[i + 1] = Math.round((bdata.data[i + 1] * 0.2) + (targetRgb[1] * 0.8))
          bdata.data[i + 2] = Math.round((bdata.data[i + 2] * 0.2) + (targetRgb[2] * 0.8))
        }
      }
    }
    bctx.putImageData(bdata, 0, 0)
    const newDataUrl = btmp.toDataURL('image/png')
    if (!fabricLibRef.current) return
    fabricLibRef.current.Image.fromURL(newDataUrl, img => {
      img.set({ left: 0, top: 0, selectable: false })
      img._isBackgroundImage = true
      c.remove(fabricImg)
      c.add(img)
      img.sendToBack()
      c.requestRenderAll()
    }, { crossOrigin: 'anonymous' })
    tmp.dispose()
  }

  function exportImage() {
    const c = fabricRef.current
    const data = c.toDataURL({ format: 'png' })
    const a = document.createElement('a')
    a.href = data
    a.download = 'redesign.png'
    a.click()
  }

  function enableBrushMode(enable) {
    const c = fabricRef.current
    c.isDrawingMode = !!enable
    if (enable) {
      c.freeDrawingBrush.width = 18
      c.freeDrawingBrush.color = 'white'
    }
  }

  function clearMask() {
    const c = fabricRef.current
    const masks = c.getObjects().filter(o => o.isMask)
    masks.forEach(m => c.remove(m))
    c.requestRenderAll()
  }

  function copyShareCode() {
    const c = fabricRef.current
    const json = c.toJSON(['_isBackgroundImage'])
    const blob = new Blob([JSON.stringify(json)], { type: 'application/json' })
    const reader = new FileReader()
    reader.onload = () => {
      navigator.clipboard.writeText(reader.result).then(() => alert('Design JSON copied to clipboard'))
    }
    reader.readAsText(blob)
  }

  return (
    <div className="canvas-wrap">
      <div className="canvas-controls" style={{ marginBottom: 8 }}>
        <label>Target color: <input type="color" value={targetColor} onChange={(e) => { setTargetColor(e.target.value); propSetTargetColor && propSetTargetColor(e.target.value) }} /></label>
        <button onClick={() => setPicking(true)}>Pick area to recolor</button>
        <button onClick={() => { enableBrushMode(true); setTimeout(() => enableBrushMode(true), 50) }}>Brush Mask</button>
        <label>Brush size: <input type="range" min="4" max="48" defaultValue={18} onChange={(e) => { const c = fabricRef.current; if (c) { c.freeDrawingBrush.width = parseInt(e.target.value, 10) } }} /></label>
        <button onClick={clearMask}>Clear Mask</button>
        <button onClick={exportImage}>Download PNG</button>
        <button onClick={copyShareCode}>Copy Share JSON</button>
      </div>
      <canvas id={canvasIdRef.current} ref={canvasRef} />
      <div className="canvas-actions" />
    </div>
  )
}
