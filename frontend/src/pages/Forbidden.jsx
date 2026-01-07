import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card } from '../components/ui';

export default function Forbidden() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="mb-6">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/20">
            <svg
              className="h-8 w-8 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
        </div>
        
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          403 - Access Denied
        </h1>
        
        <p className="text-gray-600 dark:text-gray-400 mb-2">
          You don't have permission to access this page.
        </p>
        
        {user && (
          <p className="text-sm text-gray-500 dark:text-gray-500 mb-6">
            Your current role: <span className="font-semibold">{user.role}</span>
          </p>
        )}
        
        {user && (
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-300 mb-2">
              💡 <strong>Need access to a different portal?</strong>
            </p>
            <p className="text-xs text-blue-700 dark:text-blue-400">
              {user.role === 'admin' && 'Go to the Admin Portal to manage users and system settings.'}
              {user.role === 'manager' && 'Go to the Manager Portal to manage meetings and team members.'}
              {user.role === 'member' && 'Go to the Member Portal to view and create your own meetings.'}
              {user.role === 'guest' && 'Contact an administrator to upgrade your access level.'}
            </p>
          </div>
        )}
        
        <div className="space-y-3">
          {user && (
            <Link
              to={user.role === 'admin' ? '/admin/dashboard' : user.role === 'manager' ? '/manager/dashboard' : '/dashboard'}
              className="block w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
            >
              Go to {user.role === 'admin' ? 'Admin' : user.role === 'manager' ? 'Manager' : 'Member'} Portal
            </Link>
          )}
          
          <button
            onClick={() => navigate(-1)}
            className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
          >
            Go Back
          </button>
          
          <Link
            to="/"
            className="block w-full px-4 py-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            Go to Home
          </Link>
        </div>
        
        <p className="mt-6 text-xs text-gray-500 dark:text-gray-500">
          If you believe this is an error, please contact your administrator.
        </p>
      </Card>
    </div>
  );
}
