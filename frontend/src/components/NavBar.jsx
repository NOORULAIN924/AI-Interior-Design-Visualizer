import React, {useState} from 'react'
import { Link } from 'react-router-dom'

export default function NavBar(){
  const [open, setOpen] = useState(false)
  const [light, setLight] = useState(() => {
    try{ return localStorage.getItem('theme') === 'light' }catch(e){return false}
  })

  React.useEffect(()=>{
    const cls = light ? 'theme-light' : ''
    document.body.classList.toggle('theme-light', light)
    try{ localStorage.setItem('theme', light ? 'light' : 'dark') }catch(e){}
  },[light])
  return (
    <nav className="navbar">
      <div className="nav-left">
        <Link to="/" className="brand">AI Interior Visualizer</Link>
      </div>
      <button className="nav-toggle" onClick={()=>setOpen(o=>!o)} aria-label="Toggle navigation">{open? '✕':'☰'}</button>
      <div className={`nav-right ${open? 'open':''}`}>
        <Link to="/dashboard" onClick={()=>setOpen(false)}>Dashboard</Link>
        <Link to="/results" onClick={()=>setOpen(false)}>Results</Link>
        <Link to="/analytics" onClick={()=>setOpen(false)}>Analytics</Link>
        <Link to="/about" onClick={()=>setOpen(false)}>About</Link>
        <button className="theme-toggle" onClick={()=>setLight(l=>!l)} aria-label="Toggle theme">{light? '🌞':'🌙'}</button>
      </div>
    </nav>
  )
}

