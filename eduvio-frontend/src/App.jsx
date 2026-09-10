import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { AppStateProvider } from './context/AppStateContext'
import { ToastProvider } from './context/ToastContext'
import { useAuth } from './context/AuthContext'
import AppLayout from './layouts/AppLayout'
import ProtectedRoute from './routes/ProtectedRoute'
import NotFoundPage from './pages/NotFoundPage'

// ── Lazy-loaded page components ────────────────────────────────
const DashboardPage     = lazy(() => import('./pages/DashboardPage'))
const SubjectsPage      = lazy(() => import('./pages/SubjectsPage'))
const SubjectDetailPage = lazy(() => import('./pages/SubjectDetailPage'))
const CalendarPage      = lazy(() => import('./pages/CalendarPage'))
const MaterialsPage     = lazy(() => import('./pages/MaterialsPage'))
const ProfilePage       = lazy(() => import('./pages/ProfilePage'))
const LoginPage         = lazy(() => import('./pages/LoginPage'))
const RegisterPage      = lazy(() => import('./pages/RegisterPage'))

// ── Minimal, subtle progress bar fallback for lazy JS chunk loading ──
const PageLoader = () => (
  <div className="min-h-screen bg-background relative">
    <div className="fixed top-0 left-0 right-0 h-0.5 z-50 overflow-hidden bg-primary/20">
      <div className="h-full bg-primary animate-pulse w-full" />
    </div>
  </div>
)

/**
 * PublicRoute
 *
 * Wraps public-only pages (Login, Register).
 * If the user is already authenticated, redirect them to /dashboard
 * so they don't see the auth forms unnecessarily.
 */
const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth()
  if (isLoading) return <PageLoader />
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return children
}

const AppRoutes = () => (
  <Suspense fallback={<PageLoader />}>
    <Routes>
      {/* Redirect root to dashboard */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* ── Public routes ── */}
      <Route
        path="/login"
        element={<PublicRoute><LoginPage /></PublicRoute>}
      />
      <Route
        path="/register"
        element={<PublicRoute><RegisterPage /></PublicRoute>}
      />

      {/* ── Protected routes (require auth) ── */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard"          element={<DashboardPage />} />
          <Route path="/subjects"           element={<SubjectsPage />} />
          <Route path="/subjects/:subjectId" element={<SubjectDetailPage />} />
          <Route path="/calendar"           element={<CalendarPage />} />
          <Route path="/materials"          element={<MaterialsPage />} />
          <Route path="/profile"            element={<ProfilePage />} />
        </Route>
      </Route>

      {/* Catch-all: render a dedicated 404 page */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  </Suspense>
)

const App = () => (
  <ToastProvider>
    <AuthProvider>
      <AppStateProvider>
        <AppRoutes />
      </AppStateProvider>
    </AuthProvider>
  </ToastProvider>
)

export default App
