import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import ImageProcessor from './ImageProcessor.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ImageProcessor />
  </StrictMode>,
)
