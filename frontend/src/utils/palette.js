export async function extractPalette(dataUrl, k=5, sample=1000){
  return new Promise((resolve,reject)=>{
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = ()=>{
      const w = Math.min(300, img.width)
      const h = Math.min(300, img.height)
      const c = document.createElement('canvas')
      c.width = w; c.height = h
      const ctx = c.getContext('2d')
      ctx.drawImage(img,0,0,w,h)
      const imageData = ctx.getImageData(0,0,w,h).data
      const pixels = []
      for(let i=0;i<imageData.length;i+=4){
        const r=imageData[i], g=imageData[i+1], b=imageData[i+2], a=imageData[i+3]
        if(a<128) continue
        pixels.push([r,g,b])
      }
      // sample pixels
      const sampled = []
      const step = Math.max(1, Math.floor(pixels.length / sample))
      for(let i=0;i<pixels.length;i+=step) sampled.push(pixels[i])

      // k-means
      const centroids = []
      for(let i=0;i<k;i++) centroids.push(sampled[Math.floor(Math.random()*sampled.length)])
      for(let iter=0;iter<10;iter++){
        const groups = Array.from({length:k},()=>[])
        for(const p of sampled){
          let best=0, bd=Infinity
          for(let j=0;j<k;j++){
            const c0=centroids[j]
            const d=(p[0]-c0[0])**2+(p[1]-c0[1])**2+(p[2]-c0[2])**2
            if(d<bd){bd=d;best=j}
          }
          groups[best].push(p)
        }
        for(let j=0;j<k;j++){
          if(groups[j].length===0) continue
          const sum=[0,0,0]
          for(const p of groups[j]){sum[0]+=p[0];sum[1]+=p[1];sum[2]+=p[2]}
          centroids[j]=[Math.round(sum[0]/groups[j].length),Math.round(sum[1]/groups[j].length),Math.round(sum[2]/groups[j].length)]
        }
      }
      const hex = centroids.map(c=>rgbToHex(c[0],c[1],c[2]))
      resolve(hex)
    }
    img.onerror = reject
    img.src = dataUrl
  })
}

function rgbToHex(r,g,b){
  return '#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('')
}
