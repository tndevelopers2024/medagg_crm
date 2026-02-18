import { useAuth } from "../contexts/AuthContext";

export default function PermissionGate({ permission, any, children, fallback = null }) {
  const { hasPermission } = useAuth();

  // Single permission check
  if (permission) return hasPermission(permission) ? children : fallback;

  // "any" — pass if user has at least one of the listed permissions
  if (any && any.some(hasPermission)) return children;

  return fallback;
}
