import { Navigate, useLocation } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { canAccess } from '../../utils/constants';

export default function RoleGuard({ children, allowedRoles }) {
  const { user } = useAuth();
  const { pathname } = useLocation();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const role = user.role?.name || user.role;
  const allowed = allowedRoles ? allowedRoles.includes(role) : canAccess(role, pathname);

  return allowed ? children : <Navigate to="/unauthorized" replace />;
}
