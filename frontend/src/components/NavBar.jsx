import React from 'react'
import { Link } from 'react-router-dom'

export default function NavBar(){
  return (
    <nav className="navbar">
      <div className="nav-left">
        <Link to="/" className="brand">AI Interior Visualizer</Link>
      </div>
      <div className="nav-right">
        <Link to="/dashboard">Dashboard</Link>
        <Link to="/results">Results</Link>
        <Link to="/analytics">Analytics</Link>
        <Link to="/about">About</Link>
      </div>
    </nav>
  )
}
