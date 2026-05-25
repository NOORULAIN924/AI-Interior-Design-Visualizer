import React, {useState} from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import NavBar from './components/NavBar'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import Results from './pages/Results'
import About from './pages/About'
import Analytics from './pages/Analytics'

export default function App(){
  // shared state for dashboard/results preview
  const [beforeImage, setBeforeImage] = useState(null)
  const [palette, setPalette] = useState([])
  const [targetColor, setTargetColor] = useState('#d6cfc6')

  return (
    <BrowserRouter>
      <div className="app">
        <NavBar />
        <main className="page-container">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/dashboard" element={<Dashboard beforeImage={beforeImage} setBeforeImage={setBeforeImage} palette={palette} setPalette={setPalette} targetColor={targetColor} setTargetColor={setTargetColor} />} />
            <Route path="/results" element={<Results beforeImage={beforeImage} targetColor={targetColor} />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/about" element={<About />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
