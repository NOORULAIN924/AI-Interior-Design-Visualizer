import React, { useEffect, useRef, useState } from 'react'

export default function CanvasView({ image, targetColor: propTargetColor, setTargetColor: propSetTargetColor, segmentLayers }) {
  const canvasRef = useRef(null)
  const fabricRef = useRef(null)
  const fabricLibRef = useRef(null)
  const canvasIdRef = useRef(`canvas-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`)
  const [targetColor, setTargetColor] = useState(propTargetColor || '#dba')
  const [picking, setPicking] = useState(false)
  const [overlayVisible, setOverlayVisible] = useState(true)
  const [overlayOpacity, setOverlayOpacity] = useState(0.6)
  const [layers, setLayers] = useState([])
  const [hue, setHue] = useState(0)
  const [saturate, setSaturate] = useState(1)
  const [lightness, setLightness] = useState(1)
  const [fabricReady, setFabricReady] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

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
      // create the fabric canvas instance
      if (!mounted) return
      const fabricLib = fabricLibRef.current

      c = new fabricLib.Canvas(canvasRef.current, { backgroundColor: '#fff', preserveObjectStacking: true })
      fabricRef.current = c
      setFabricReady(true)

      function refreshLayers() {
        if (!c) return
        const objs = c.getObjects().map((o, idx) => {
          return {
            id: o._maskId || (`o-${idx}`),
            type: o.isSegOverlay ? 'mask' : (o._isBackgroundImage ? 'background' : (o.type || 'object')),
            name: o.isSegOverlay ? 'Segment' : (o._isBackgroundImage ? 'Background' : (o.name || o.type || 'Object')),
            refIndex: idx
          }
        }).filter(l => l.type !== 'background')
        setLayers(objs)
      }
      c.on('object:added', refreshLayers)
      c.on('object:removed', refreshLayers)
      // initial layers
      setTimeout(refreshLayers, 120)

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

      // listen for free-draw paths to mark as mask objects and create overlay fills
      c.on('path:created', (e) => {
        const p = e.path
        p.isMask = true
        p.selectable = false
        p.opacity = 0.9

        // create a colored overlay path matching the mask
        try {
          const color = randomSegColor()
          const overlay = new fabricLib.Path(p.path, {
            left: p.left || 0,
            top: p.top || 0,
            scaleX: p.scaleX || 1,
            scaleY: p.scaleY || 1,
            fill: color,
            selectable: false,
            evented: false,
            opacity: overlayOpacity,
            strokeWidth: 0
          })
          overlay.isSegOverlay = true
          // link ids so we can remove overlay when mask cleared
          const id = `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`
          p._maskId = id
          overlay._maskId = id
          c.add(overlay)
          overlay.moveTo(c.getObjects().length - 1)
          c.requestRenderAll()
        } catch (err) {
          console.warn('Overlay creation failed', err)
        }
      })
      c.on('mouse:down', onCanvasClick)

      // cleanup will remove listeners and dispose canvas
      const cleanup = () => {
        el.removeEventListener('drop', onDrop)
        el.removeEventListener('dragover', onDragOver)
        if (c) {
          try { c.off('mouse:down', onCanvasClick) } catch (e) { }
          try { c.off('path:created') } catch (e) { }
          try { c.off('object:added') } catch (e) { }
          try { c.off('object:removed') } catch (e) { }
          try { c.dispose() } catch (e) { }
          c = null
          fabricRef.current = null
          setFabricReady(false)
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
    if (!fabricReady) return
    const c = fabricRef.current
    if (!fabricLibRef.current || !c) return
    // Load image once fabric is ready
    fabricLibRef.current.Image.fromURL(image, img => {
      // ensure canvas has a valid width/height
      const w = c.getWidth() || Math.min(960, c.upperCanvasEl.parentElement?.clientWidth || 640)
      img.scaleToWidth(w)
      img.set({ left: 0, top: 0, selectable: false })
      const objs = c.getObjects().filter(o => o._isBackgroundImage)
      objs.forEach(o => c.remove(o))
      img._isBackgroundImage = true
      c.add(img)
      img.sendToBack()
      c.requestRenderAll()
    }, { crossOrigin: 'anonymous' })
  }, [image, fabricReady])

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
    masks.forEach(m => {
      // remove linked overlay(s)
      if (m._maskId) {
        const overlays = c.getObjects().filter(o => o.isSegOverlay && o._maskId === m._maskId)
        overlays.forEach(o => c.remove(o))
      }
      c.remove(m)
    })
    // also remove any stray overlays
    const overlaysLeft = c.getObjects().filter(o => o.isSegOverlay)
    overlaysLeft.forEach(o => c.remove(o))
    c.requestRenderAll()
  }

  function updateOverlayOpacity(val) {
    const c = fabricRef.current
    if (!c) return
    const overlays = c.getObjects().filter(o => o.isSegOverlay)
    overlays.forEach(o => o.set({ opacity: val }))
    c.requestRenderAll()
  }

  function toggleOverlay(show) {
    const c = fabricRef.current
    if (!c) return
    const overlays = c.getObjects().filter(o => o.isSegOverlay)
    overlays.forEach(o => o.set({ visible: !!show }))
    c.requestRenderAll()
  }

  function randomSegColor() {
    // pleasant pastel palette
    const palette = ['#ff7b7b', '#ffd57a', '#8dd3c7', '#b39df8', '#ffa8d5', '#9fd3ff']
    return palette[Math.floor(Math.random() * palette.length)]
  }

  function getRegionColor(regionName) {
    const colorMap = {
      wall: '#9fd3ff',
      floor: '#ffd57a',
      furniture: '#ffa8d5',
      sofa: '#ff7b7b',
      table: '#8dd3c7',
      lamp: '#b39df8'
    }
    return colorMap[regionName] || randomSegColor()
  }

  function drawBackendSegmentLayers(layersByRegion) {
    const c = fabricRef.current
    const fabricLib = fabricLibRef.current
    if (!c || !fabricLib || !layersByRegion || typeof layersByRegion !== 'object') return

    const existing = c.getObjects().filter((o) => o.isBackendSegment || o.isBackendMask)
    existing.forEach((o) => c.remove(o))

    const allLayers = []
    Object.entries(layersByRegion).forEach(([region, regionLayers]) => {
      if (Array.isArray(regionLayers)) {
        regionLayers.forEach((layer, idx) => {
          if (Array.isArray(layer?.points) && layer.points.length >= 3) {
            allLayers.push({ region, layer, idx })
          }
        })
      }
    })

    if (allLayers.length === 0) {
      c.requestRenderAll()
      return
    }

    let maxX = 1
    let maxY = 1
    allLayers.forEach(({ layer }) => {
      layer.points.forEach((pt) => {
        const x = Number(pt[0])
        const y = Number(pt[1])
        if (Number.isFinite(x)) maxX = Math.max(maxX, x)
        if (Number.isFinite(y)) maxY = Math.max(maxY, y)
      })
    })

    const scaleX = c.getWidth() / maxX
    const scaleY = c.getHeight() / maxY

    allLayers.forEach(({ region, layer, idx }) => {
      const points = layer.points.map((pt) => ({ x: Number(pt[0]) * scaleX, y: Number(pt[1]) * scaleY }))
      const maskId = `${region}-${layer.id || idx}`

      const maskPoly = new fabricLib.Polygon(points, {
        fill: 'white',
        opacity: 0,
        selectable: false,
        evented: false,
        strokeWidth: 0
      })
      maskPoly.isMask = true
      maskPoly.isBackendMask = true
      maskPoly._maskId = maskId
      c.add(maskPoly)

      const overlayPoly = new fabricLib.Polygon(points, {
        fill: getRegionColor(region),
        opacity: overlayOpacity,
        selectable: false,
        evented: false,
        strokeWidth: 0,
        visible: overlayVisible
      })
      overlayPoly.isSegOverlay = true
      overlayPoly.isBackendSegment = true
      overlayPoly._maskId = maskId
      overlayPoly.regionName = region
      c.add(overlayPoly)
    })

    c.requestRenderAll()
  }

  useEffect(() => {
    if (!fabricReady) return
    drawBackendSegmentLayers(segmentLayers)
  }, [segmentLayers, fabricReady])

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

  // Layer controls
  function applyOverlayColor(maskId, color) {
    const c = fabricRef.current
    if (!c) return
    const overlays = c.getObjects().filter(o => o.isSegOverlay && o._maskId === maskId)
    overlays.forEach(o => {
      o.set({ fill: color })
    })
    c.requestRenderAll()
  }

  async function replaceActiveFurniture(url) {
    const c = fabricRef.current
    if (!c) return
    const active = c.getActiveObject()
    if (!active || active._isBackgroundImage) {
      alert('Select a furniture object to replace')
      return
    }
    try {
      const left = active.left, top = active.top, scaleX = active.scaleX || 1, scaleY = active.scaleY || 1, angle = active.angle || 0
      c.remove(active)
      if (!fabricLibRef.current) return
      fabricLibRef.current.Image.fromURL(url, img => {
        img.set({ left, top, scaleX, scaleY, angle })
        c.add(img)
        c.setActiveObject(img)
        c.requestRenderAll()
      }, { crossOrigin: 'anonymous' })
    } catch (err) {
      console.warn(err)
      alert('Failed to replace furniture')
    }
  }

  function applyGlobalHSL() {
    // Use CSS filter for live preview only
    const el = canvasRef.current
    if (!el) return
    el.style.filter = `hue-rotate(${hue}deg) saturate(${saturate}) brightness(${lightness})`
  }

  return (
    <div className="canvas-wrap">
      <div className="canvas-controls canvas-controls-v2" style={{ marginBottom: 8 }}>
        <div className="primary-controls-v2">
          <label>Target color: <input type="color" value={targetColor} onChange={(e) => { setTargetColor(e.target.value); propSetTargetColor && propSetTargetColor(e.target.value) }} /></label>
          <button type="button" onClick={() => setPicking(true)}>Pick area to recolor</button>
          <button type="button" onClick={() => { enableBrushMode(true); setTimeout(() => enableBrushMode(true), 50) }}>Brush Mask</button>
          <button type="button" onClick={exportImage}>Download PNG</button>
          <button type="button" onClick={copyShareCode}>Copy Share JSON</button>
        </div>

        <details className="advanced-controls-v2" open={showAdvanced} onToggle={(e) => setShowAdvanced(e.currentTarget.open)}>
          <summary>Customization</summary>
          <div className="advanced-controls-grid-v2">
            <label className="toggle-row-v2">Segmentation overlay: <input type="checkbox" checked={overlayVisible} onChange={(e) => { setOverlayVisible(e.target.checked); toggleOverlay(e.target.checked) }} /></label>
            <label>Overlay opacity: <input type="range" min="0" max="1" step="0.05" value={overlayOpacity} onChange={(e) => { const v = parseFloat(e.target.value); setOverlayOpacity(v); updateOverlayOpacity(v) }} /></label>
            <label>Brush size: <input type="range" min="4" max="48" defaultValue={18} onChange={(e) => { const c = fabricRef.current; if (c) { c.freeDrawingBrush.width = parseInt(e.target.value, 10) } }} /></label>
            <label>Hue <input type="range" min="-180" max="180" value={hue} onChange={(e) => { setHue(parseInt(e.target.value, 10)); setTimeout(applyGlobalHSL, 0) }} /></label>
            <label>Saturation <input type="range" min="0" max="2" step="0.05" value={saturate} onChange={(e) => { setSaturate(parseFloat(e.target.value)); setTimeout(applyGlobalHSL, 0) }} /></label>
            <label>Brightness <input type="range" min="0.5" max="1.8" step="0.05" value={lightness} onChange={(e) => { setLightness(parseFloat(e.target.value)); setTimeout(applyGlobalHSL, 0) }} /></label>
            <button type="button" onClick={clearMask}>Clear Mask</button>
          </div>
        </details>
      </div>
      <div className="canvas-stage-v2">
        {image && <img src={image} alt="Uploaded room preview" className="canvas-underlay-v2" />}
        <canvas id={canvasIdRef.current} ref={canvasRef} className="canvas-overlay-v2" />
      </div>
      <div className="layers-panel-v2">
        <h4>Layers</h4>
        <div className="layers-list-v2">
          {layers.length === 0 ? (
            <div className="layers-empty-v2">No segments or furniture have been added yet.</div>
          ) : (
            layers.map((l) => (
              <div key={l.id} className="layer-row-v2">
                <div className="layer-name-v2">{l.name} ({l.type})</div>
                {l.type === 'mask' && <input type="color" onChange={(e) => applyOverlayColor(l.id, e.target.value)} />}
                {l.type !== 'mask' && <button type="button" onClick={() => { const url = prompt('Replace furniture image URL'); if (url) replaceActiveFurniture(url) }}>Replace</button>}
              </div>
            ))
          )}
        </div>
      </div>
      <div className="canvas-actions" />
    </div>
  )
}
