import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function RequireAuth({ children }) {
  const { user } = useAuth();
  const loc = useLocation();
  if (user === undefined) return <p className="empty">Checking your session…</p>;
  if (!user) return <Navigate to="/login" replace state={{ from: `${loc.pathname}${loc.search}` }} />;   // come back here after signing in
  return children;
}
