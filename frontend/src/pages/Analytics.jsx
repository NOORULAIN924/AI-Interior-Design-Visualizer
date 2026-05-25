import React from 'react'

export default function Analytics(){
  return (
    <div className="page analytics">
      <h2>Usage Analytics</h2>
      <p>This dashboard summarizes user interactions and popular palettes. In this starter app analytics are simulated; replace with your analytics provider to gather production metrics.</p>
      <div className="analytics-grid">
        <div className="card">
          <h4>Sessions</h4>
          <p className="big">1,248</p>
          <p>Unique sessions this month</p>
        </div>
        <div className="card">
          <h4>Popular Palette</h4>
          <div style={{display:'flex',gap:6}}>
            <div style={{width:36,height:36,background:'#f2e9e4'}}></div>
            <div style={{width:36,height:36,background:'#c3d2d8'}}></div>
            <div style={{width:36,height:36,background:'#6b8e8f'}}></div>
          </div>
        </div>
        <div className="card">
          <h4>Top Item</h4>
          <p>Modern Sofa</p>
        </div>
      </div>
    </div>
  )
}
