import React from 'react'

// Placeholder PNGs - replace with your own files in frontend/public/catalog/ if desired
const sampleItems = [
  {
    id: 1,
    name: 'Modern Sofa',
    variants: [
      {label: 'Blue Sofa', src: 'https://placehold.co/240x120/60a5fa/0b0f14.png?text=Sofa+Blue'},
      {label: 'Warm Sofa', src: 'https://placehold.co/240x120/f97316/0b0f14.png?text=Sofa+Warm'}
    ]
  },
  {
    id: 2,
    name: 'Round Table',
    variants: [
      {label: 'Oak Table', src: 'https://placehold.co/160x120/8b5e3c/ffffff.png?text=Table+Oak'},
      {label: 'White Table', src: 'https://placehold.co/160x120/ffffff/0b0f14.png?text=Table+White'}
    ]
  },
  {
    id: 3,
    name: 'Armchair',
    variants: [
      {label: 'Charcoal Chair', src: 'https://placehold.co/200x120/334155/ffffff.png?text=Chair+Charcoal'},
      {label: 'Velvet Chair', src: 'https://placehold.co/200x120/7c3aed/ffffff.png?text=Chair+Velvet'}
    ]
  }
]

export default function Catalog(){
  function onDragStart(e, item){
    e.dataTransfer.setData('text/plain', JSON.stringify(item))
  }

  return (
    <div className="panel catalog">
      <h3>Furniture Catalog</h3>
      <div className="items-scroll">
        {sampleItems.map(it => (
          <div key={it.id} className="catalog-row">
            <div className="catalog-meta">
              <div className="thumb-label">{it.name}</div>
            </div>
            <div className="catalog-variants">
              {it.variants.map((v, idx) => (
                <div key={idx} className={`catalog-item variant-${idx}`} draggable onDragStart={(e)=>onDragStart(e, {id: it.id, name: it.name, src: v.src})}>
                  <img src={v.src} alt={v.label} className="catalog-thumb" onError={(ev)=>{ev.currentTarget.src='https://placehold.co/200x120/111827/ffffff.png?text=Missing'}} />
                  <div className="variant-label">{v.label}</div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
