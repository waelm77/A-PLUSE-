import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

// Import Firebase (this initializes the connection)
import '@/lib/firebase'

// Seed data synchronously before first render so subjects appear immediately
import { seedSubjects } from '@/services/firestore'
seedSubjects()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
