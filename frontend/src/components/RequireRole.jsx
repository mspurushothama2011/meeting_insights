import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * RequireRole - Route guard component that restricts access based on user role
 * 
 * @param {Array} allowedRoles - Array of role strings that are allowed to access the route
 * @param {React.Element} children - The protected component/route to render if authorized
 * @param {string} redirectTo - Path to redirect to if unauthorized (default: '/forbidden')
 */
export default function RequireRole({ allowedRoles, children, redirectTo = '/forbidden' }) {
  const { user, loading } = useAuth();

  // Show nothing while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, redirect to login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has required role
  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={redirectTo} replace />;
  }

  // User is authenticated and has required role
  return children;
}

/**
 * Convenience components for specific role requirements
 */

export function RequireAdmin({ children }) {
  return <RequireRole allowedRoles={['admin']}>{children}</RequireRole>;
}

export function RequireManagerOrAdmin({ children }) {
  return <RequireRole allowedRoles={['manager', 'admin']}>{children}</RequireRole>;
}

export function RequireMemberOrAbove({ children }) {
  return <RequireRole allowedRoles={['member', 'manager', 'admin']}>{children}</RequireRole>;
}

export function RequireAuthenticated({ children }) {
  return <RequireRole allowedRoles={['guest', 'member', 'manager', 'admin']}>{children}</RequireRole>;
}
