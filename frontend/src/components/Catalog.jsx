import React from 'react'

function svgDataUrl(svg){
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg)
}

const sampleItems = [
  {id:1, name:'Modern Sofa', src: svgDataUrl(`<svg xmlns='http://www.w3.org/2000/svg' width='240' height='120'><rect x='10' y='50' width='220' height='50' rx='10' fill='%23c66' /><rect x='20' y='30' width='40' height='40' rx='6' fill='%23555' /><rect x='180' y='30' width='40' height='40' rx='6' fill='%23555' /></svg>`)},
  {id:2, name:'Round Table', src: svgDataUrl(`<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><ellipse cx='60' cy='50' rx='50' ry='30' fill='%23b87' /><rect x='55' y='50' width='10' height='50' fill='%23666' /></svg>`)},
  {id:3, name:'Armchair', src: svgDataUrl(`<svg xmlns='http://www.w3.org/2000/svg' width='160' height='120'><rect x='10' y='40' width='140' height='60' rx='14' fill='%2388c' /><rect x='20' y='20' width='40' height='40' rx='8' fill='%23222' /></svg>`)},
]

export default function Catalog(){
  function onDragStart(e,item){
    e.dataTransfer.setData('text/plain', JSON.stringify(item))
  }

  return (
    <div className="panel catalog">
      <h3>Furniture Catalog</h3>
      <div className="items">
        {sampleItems.map(it=> (
          <div key={it.id} className="catalog-item" draggable onDragStart={(e)=>onDragStart(e,it)}>
            <img src={it.src} alt={it.name} style={{width:80,height:40}} />
            <div className="thumb">{it.name}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
