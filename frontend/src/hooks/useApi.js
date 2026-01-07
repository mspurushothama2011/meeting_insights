import { useState, useCallback } from 'react';

/**
 * Custom hook for API calls with retry logic, loading states, and error handling
 * 
 * @returns {Object} API utilities
 * @returns {Function} execute - Execute an API call with retry logic
 * @returns {boolean} loading - Loading state
 * @returns {string|null} error - Error message if any
 * @returns {Function} clearError - Clear the error state
 */
export function useApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Execute an API call with automatic retry logic
   * 
   * @param {Function} apiCall - Async function that makes the API call
   * @param {Object} options - Configuration options
   * @param {number} options.retries - Number of retry attempts (default: 3)
   * @param {number} options.retryDelay - Base delay in ms between retries (default: 1000)
   * @param {boolean} options.exponentialBackoff - Use exponential backoff for retries (default: true)
   * @param {Function} options.onRetry - Callback called before each retry
   * @param {Function} options.shouldRetry - Function to determine if error should trigger retry
   * @returns {Promise} Result of the API call
   */
  const execute = useCallback(async (apiCall, options = {}) => {
    const {
      retries = 3,
      retryDelay = 1000,
      exponentialBackoff = true,
      onRetry = null,
      shouldRetry = (error) => {
        // Default: retry on network errors and 5xx server errors
        if (!error.response) return true; // Network error
        const status = error.response?.status;
        return status >= 500 && status < 600; // Server errors
      }
    } = options;

    setLoading(true);
    setError(null);

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await apiCall();
        setLoading(false);
        return result;
      } catch (err) {
        console.error(`API call attempt ${attempt + 1} failed:`, err);

        // Check if this is the last attempt or if we shouldn't retry
        const isLastAttempt = attempt === retries;
        const canRetry = !isLastAttempt && shouldRetry(err);

        if (!canRetry) {
          // Set error and stop retrying
          const errorMessage = err.response?.data?.error || 
                              err.response?.data?.message || 
                              err.message || 
                              'An unexpected error occurred';
          setError(errorMessage);
          setLoading(false);
          throw err;
        }

        // Calculate delay with exponential backoff
        const delay = exponentialBackoff 
          ? retryDelay * Math.pow(2, attempt)
          : retryDelay;

        console.log(`Retrying in ${delay}ms... (attempt ${attempt + 1}/${retries})`);

        // Call onRetry callback if provided
        if (onRetry) {
          onRetry(attempt + 1, delay, err);
        }

        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }, []);

  return { execute, loading, error, clearError };
}

/**
 * Hook for managing multiple API calls with individual loading states
 * 
 * @returns {Object} API utilities for multiple operations
 */
export function useApiMultiple() {
  const [loadingStates, setLoadingStates] = useState({});
  const [errors, setErrors] = useState({});

  /**
   * Execute an API call with a specific key for tracking
   */
  const execute = useCallback(async (key, apiCall, options = {}) => {
    setLoadingStates(prev => ({ ...prev, [key]: true }));
    setErrors(prev => ({ ...prev, [key]: null }));

    try {
      const result = await apiCall();
      setLoadingStates(prev => ({ ...prev, [key]: false }));
      return result;
    } catch (err) {
      const errorMessage = err.response?.data?.error || 
                          err.response?.data?.message || 
                          err.message || 
                          'An unexpected error occurred';
      setErrors(prev => ({ ...prev, [key]: errorMessage }));
      setLoadingStates(prev => ({ ...prev, [key]: false }));
      throw err;
    }
  }, []);

  const clearError = useCallback((key) => {
    setErrors(prev => ({ ...prev, [key]: null }));
  }, []);

  const clearAllErrors = useCallback(() => {
    setErrors({});
  }, []);

  return { 
    execute, 
    loadingStates, 
    errors, 
    clearError, 
    clearAllErrors,
    isLoading: (key) => loadingStates[key] || false,
    getError: (key) => errors[key] || null
  };
}

export default useApi;
