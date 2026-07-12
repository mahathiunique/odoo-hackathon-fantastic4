import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { canAccess } from '../../utils/constants';

export default function RoleGuard({ children }) {
  const { user } = useAuth();
  const { pathname } = useLocation();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return canAccess(user.role, pathname) ? children : <Navigate to="/unauthorized" replace />;
}
