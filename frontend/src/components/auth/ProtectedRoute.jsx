import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export default function ProtectedRoute({ children, allowedRole }) {
  const { user, loading } = useAuth();

  // Wait for AuthContext to determine user state
  if (loading) {
    return <div className="flex items-center justify-center min-h-screen text-gray-500">Chargement...</div>;
  }

  // If not logged in, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If a specific role is required and user doesn't match
  if (allowedRole && user.role !== allowedRole) {
    // Redirect to their respective dashboard
    return <Navigate to={user.role === 'doctor' ? '/doctor/dashboard' : '/dashboard'} replace />;
  }

  return children;
}
