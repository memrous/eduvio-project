import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { AppStateProvider } from './context/AppStateContext'
import { ToastProvider } from './context/ToastContext'
import { useAuth } from './context/AuthContext'
import AppLayout from './layouts/AppLayout'
import ProtectedRoute from './routes/ProtectedRoute'
import { Loader2 } from 'lucide-react'
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
 
// ── Minimal fallback shown while a page chunk loads ────────────
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-white font-inter">
    <div className="flex flex-col items-center gap-3 text-on-surface-variant">
      <Loader2 className="w-8 h-8 animate-spin text-[#004ac6]" />
      <span className="text-body-md">Loading…</span>
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

