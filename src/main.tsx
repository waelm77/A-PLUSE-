import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

// Import Firebase (this initializes the connection)
import '@/lib/firebase'

// Initialize auth listener (side effect import)
import '@/store/authStore'

// Seed data synchronously before first render so subjects appear immediately
import { seedSubjects } from '@/services/firestore'
seedSubjects()
const APP_BUILD = "v2026.10.20-watermark-outline"
console.log("%cAPP_BUILD=" + APP_BUILD, "color:#22c55e;font-weight:bold;font-size:14px")

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
