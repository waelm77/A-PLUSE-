import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

// Import Firebase (this initializes the connection)
import '@/lib/firebase'

// Seed data before first render so subjects appear immediately
import { seedSubjects, migrateLocalStorageToFirestore } from '@/services/firestore'

async function init() {
  try {
    await migrateLocalStorageToFirestore();
  } catch (e) {
    console.error("Migration failed (non-fatal):", e);
  }
  try {
    await seedSubjects();
  } catch (e) {
    console.error("Seed failed (non-fatal):", e);
  }
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>,
  );
}
init();
