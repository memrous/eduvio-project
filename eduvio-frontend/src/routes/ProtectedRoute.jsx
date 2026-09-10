import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/**
 * ProtectedRoute
 *
 * Guards routes that require authentication.
 *
 * - isLoading  → smooth theme-matched background while initial check resolves
 * - !isAuthenticated → redirect to /login
 * - authenticated  → render children via <Outlet />
 */
const ProtectedRoute = () => {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) {
    return <div className="min-h-screen bg-background" />
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
