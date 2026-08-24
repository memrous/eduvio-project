import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Loader2 } from 'lucide-react'

/**
 * ProtectedRoute
 *
 * Guards routes that require authentication.
 *
 * - isLoading  → show full-screen spinner while session restores from localStorage
 * - !isAuthenticated → redirect to /login
 * - authenticated  → render children via <Outlet />
 *
 * Future: add role checks here, e.g.:
 *   if (requiredRole && authUser.role !== requiredRole) return <Navigate to="/403" />
 */
const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white font-inter">
        <div className="flex flex-col items-center gap-3 text-on-surface-variant">
          <Loader2 className="w-8 h-8 animate-spin text-[#004ac6]" />
          <span className="text-body-md">Loading your session…</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
