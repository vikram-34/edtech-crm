import { Navigate, useLocation } from 'react-router-dom';
import { LOGIN_PATH, isAuthenticated } from '../api/client.js';

// Renders its children only when a (non-expired) admin token is stored;
// otherwise redirects to the login page and remembers where the user was going.
export default function ProtectedRoute({ children }) {
  const location = useLocation();

  if (!isAuthenticated()) {
    return <Navigate to={LOGIN_PATH} replace state={{ from: location }} />;
  }

  return children;
}
