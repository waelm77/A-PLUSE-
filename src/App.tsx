import { lazy, Suspense, type ReactNode } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Home from './pages/Home'
import ErrorBoundary from './components/ErrorBoundary'
import { ConfirmDialogProvider } from './components/ConfirmDialogProvider'
import { Toaster } from 'react-hot-toast'

const SubjectPage = lazy(() => import('./pages/SubjectPage'))
const AdminPage = lazy(() => import('./pages/AdminPage'))
const Login = lazy(() => import('./pages/Login'))
const NotFound = lazy(() => import('./pages/NotFound'))

function PageLoader() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
}

function ErrorBoundaryReset({ children }: { children: ReactNode }) {
  const location = useLocation();
  return <ErrorBoundary key={location.pathname}>{children}</ErrorBoundary>;
}

export default function App() {
  return (
    <>
      <Toaster
        position="top-center"
        // An error that vanishes in the default 4s is an error nobody reads: a
        // failed save looked like it had worked. Errors linger, successes don't.
        toastOptions={{ error: { duration: 9000 } }}
      />
      <ConfirmDialogProvider>
        <Suspense fallback={<PageLoader />}>
          <ErrorBoundaryReset>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/subject/:id" element={<SubjectPage />} />
              <Route path="/admin" element={<AdminPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </ErrorBoundaryReset>
        </Suspense>
      </ConfirmDialogProvider>
    </>
  )
}
