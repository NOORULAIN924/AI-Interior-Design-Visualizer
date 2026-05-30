import React from 'react'

export default function Catalog({ items = [] }) {
  function onDragStart(e, item) {
    e.dataTransfer.setData('text/plain', JSON.stringify(item))
  }

  return (
    <div className="panel catalog">
      <h3>Furniture Catalog</h3>
      <div className="items-scroll">
        {items.length > 0 ? items.map((item) => (
          <div key={item.id} className="catalog-row">
            <div className="catalog-meta">
              <div className="thumb-label">{item.label}</div>
              <div className="variant-label">{item.category} · {item.style}</div>
            </div>
            <div className="catalog-variants">
              <div
                className="catalog-item"
                draggable
                onDragStart={(e) => onDragStart(e, item)}
                title={`${item.label} (${item.style})`}
              >
                <div className="catalog-thumb catalog-thumb-swatch" style={{ background: item.previewColor || '#6b7280' }} />
                <div className="variant-label">Drag to canvas</div>
              </div>
            </div>
          </div>
        )) : <div className="layers-empty-v2">Loading catalog...</div>}
      </div>
    </div>
  )
}
