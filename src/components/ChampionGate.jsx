import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const allowedPaths = new Set(['/champion-pick', '/login', '/register', '/forgot-password', '/reset-password']);

export function ChampionGate() {
  const { championPrediction, isAdmin, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading || !isAuthenticated || isAdmin || championPrediction || allowedPaths.has(location.pathname)) {
    return null;
  }

  return <Navigate to="/champion-pick" replace state={{ from: location.pathname }} />;
}
