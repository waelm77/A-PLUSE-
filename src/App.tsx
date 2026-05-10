import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import SubjectPage from './pages/SubjectPage'
import AdminPage from './pages/AdminPage'
import Login from './pages/Login'
import NotFound from './pages/NotFound'

import { Toaster } from 'react-hot-toast'

export default function App() {
  return (
    <>
      <Toaster position="top-center" />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/subject/:id" element={<SubjectPage />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  )
}
