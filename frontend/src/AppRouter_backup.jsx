import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import App from './App';
import Login from './pages/Login';
import Register from './pages/Register';
import AdminDashboard from './pages/AdminDashboard';
import ManagerDashboard from './pages/ManagerDashboard';
import TeamOverview from './pages/TeamOverview';
import Reports from './pages/Reports';
import Documentation from './pages/Documentation';
import ApiStatus from './pages/ApiStatus';
import Support from './pages/Support';
import AdminSupportManagement from './pages/AdminSupportManagement';
import UserSupportHistory from './pages/UserSupportHistory';
import Forbidden from './pages/Forbidden';
import ComponentDemo from './pages/ComponentDemo';
import ComponentShowcase from './pages/ComponentShowcase';
import { RequireAdmin, RequireManagerOrAdmin } from './components/RequireRole';

// Loading Spinner Component
function LoadingGate({ message = 'Loading...' }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400"></div>
        <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">{message}</p>
      </div>
    </div>
  );
}

// Protected Route component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const [showContent, setShowContent] = React.useState(false);
  
  // Prevent flash of content by adding small delay
  React.useEffect(() => {
    if (!loading && user) {
      const timer = setTimeout(() => setShowContent(true), 50);
      return () => clearTimeout(timer);
    }
  }, [loading, user]);
  
  if (loading) {
    return <LoadingGate message="Authenticating..." />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  if (!showContent) {
    return <LoadingGate message="Loading content..." />;
  }
  
  return children;
}

// Public Route component (redirect to home if already logged in)
function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  const [showContent, setShowContent] = React.useState(false);
  
  // Prevent flash of content
  React.useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setShowContent(true), 50);
      return () => clearTimeout(timer);
    }
  }, [loading]);
  
  if (loading) {
    return <LoadingGate message="Checking authentication..." />;
  }
  
  if (user) {
    return <Navigate to="/" replace />;
  }
  
  if (!showContent) {
    return null; // Brief blank screen to prevent flash
  }
  
  return children;
}

export default function AppRouter() {
  return (
    <Routes>
      {/* Public routes */}
      <Route 
        path="/login" 
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        } 
      />
      <Route 
        path="/register" 
        element={
          <PublicRoute>
            <Register />
          </PublicRoute>
        } 
      />
      
      {/* Admin-only routes */}
      <Route 
        path="/admin/dashboard" 
        element={
          <ErrorBoundary>
            <RequireAdmin>
              <AdminDashboard />
            </RequireAdmin>
          </ErrorBoundary>
        } 
      />
      
      {/* Manager-only routes */}
      <Route 
        path="/manager/dashboard" 
        element={
          <ErrorBoundary>
            <RequireManagerOrAdmin>
              <ManagerDashboard />
            </RequireManagerOrAdmin>
          </ErrorBoundary>
        } 
      />
      <Route 
        path="/manager/team" 
        element={
          <ErrorBoundary>
            <RequireManagerOrAdmin>
              <TeamOverview />
            </RequireManagerOrAdmin>
          </ErrorBoundary>
        } 
      />
      <Route 
        path="/manager/reports" 
        element={
          <ErrorBoundary>
            <RequireManagerOrAdmin>
              <Reports />
            </RequireManagerOrAdmin>
          </ErrorBoundary>
        } 
      />
      
      {/* Component Demo route */}
      <Route 
        path="/demo" 
        element={
          <ErrorBoundary>
            <ProtectedRoute>
              <ComponentDemo />
            </ProtectedRoute>
          </ErrorBoundary>
        } 
      />
      
      {/* Component Showcase route */}
      <Route 
        path="/showcase" 
        element={
          <ErrorBoundary>
            <ProtectedRoute>
              <ComponentShowcase />
            </ProtectedRoute>
          </ErrorBoundary>
        } 
      />
      
      {/* Documentation route */}
      <Route 
        path="/documentation" 
        element={
          <ErrorBoundary>
            <ProtectedRoute>
              <Documentation />
            </ProtectedRoute>
          </ErrorBoundary>
        } 
      />
      
      {/* API Status route */}
      <Route 
        path="/status-page" 
        element={
          <ErrorBoundary>
            <ProtectedRoute>
              <ApiStatus />
            </ProtectedRoute>
          </ErrorBoundary>
        } 
      />
      
      {/* Support route */}
      <Route 
        path="/support" 
        element={
          <ErrorBoundary>
            <ProtectedRoute>
              <Support />
            </ProtectedRoute>
          </ErrorBoundary>
        } 
      />
      
      {/* User Support History route */}
      <Route 
        path="/my-support" 
        element={
          <ErrorBoundary>
            <ProtectedRoute>
              <UserSupportHistory />
            </ProtectedRoute>
          </ErrorBoundary>
        } 
      />
      
      {/* Admin Support Management route */}
      <Route 
        path="/admin/support" 
        element={
          <ErrorBoundary>
            <RequireAdmin>
              <AdminSupportManagement />
            </RequireAdmin>
          </ErrorBoundary>
        } 
      />
      
      {/* Forbidden page */}
      <Route path="/forbidden" element={<Forbidden />} />
      
      {/* Main app route (protected) */}
      <Route 
        path="/" 
        element={
          <ErrorBoundary>
            <ProtectedRoute>
              <App />
            </ProtectedRoute>
          </ErrorBoundary>
        } 
      />
      
      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}