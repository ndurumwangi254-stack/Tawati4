import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

/**
 * Wrap a route element. If `ownerOnly` is true, a logged-in Dispenser
 * is redirected away — this mirrors the backend's @owner_required guard
 * so the UI never even offers an action the API would reject.
 */
export default function ProtectedRoute({ children, ownerOnly = false }) {
  const { user, loading, isOwner } = useAuth();

  if (loading) return <div className="page-loading">Loading…</div>;
  if (!user) return <Navigate to="/" replace />;
  if (ownerOnly && !isOwner) return <Navigate to="/dashboard" replace />;

  return children;
}