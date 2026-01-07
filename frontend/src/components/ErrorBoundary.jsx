import React from 'react';
import { Button } from './ui';

/**
 * Error Boundary Component
 * Catches JavaScript errors anywhere in the component tree and displays a fallback UI
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details to console
    console.error('Error Boundary caught an error:', error);
    console.error('Error Info:', errorInfo);
    
    // You can also log the error to an error reporting service here
    // logErrorToService(error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">⚠️</div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                Oops! Something went wrong
              </h1>
              <p className="text-gray-600 dark:text-gray-400">
                The application encountered an unexpected error. Don't worry, this has been logged.
              </p>
            </div>

            {/* Error Details (collapsible) */}
            <details className="mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
              <summary className="cursor-pointer font-semibold text-gray-900 dark:text-white mb-2">
                Show Error Details
              </summary>
              <div className="mt-4 space-y-4">
                <div>
                  <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">
                    Error Message:
                  </h3>
                  <pre className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 p-3 rounded text-sm overflow-x-auto">
                    {this.state.error?.toString() || 'Unknown error'}
                  </pre>
                </div>
                
                {this.state.errorInfo && (
                  <div>
                    <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-300 mb-2">
                      Component Stack:
                    </h3>
                    <pre className="bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 p-3 rounded text-xs overflow-x-auto max-h-64">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </div>
                )}
              </div>
            </details>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button 
                onClick={this.handleReset}
                variant="outline"
                className="flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Try Again
              </Button>
              
              <Button 
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reload Page
              </Button>
              
              <Button 
                onClick={() => window.location.href = '/'}
                variant="outline"
                className="flex items-center justify-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Go Home
              </Button>
            </div>

            {/* Help Text */}
            <p className="text-sm text-center text-gray-500 dark:text-gray-400 mt-6">
              If this problem persists, please contact support or check the browser console for more details.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
