import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, Button } from '../components/ui';
import Layout from '../components/Layout';
import { AXIOS_API_ROOT } from '../utils/axios';

export default function ApiStatus() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState({
    api: 'checking',
    database: 'checking',
    transcription: 'checking',
    ai: 'checking'
  });
  const [lastChecked, setLastChecked] = useState(null);
  const [isChecking, setIsChecking] = useState(false);

  const getReturnPath = () => {
    if (!user) return '/';
    switch (user.role) {
      case 'admin':
        return '/admin/dashboard';
      case 'manager':
        return '/manager/dashboard';
      default:
        return '/';
    }
  };

  const getReturnButtonText = () => {
    if (!user) return 'Back to Home';
    switch (user.role) {
      case 'admin':
        return 'Back to Admin Dashboard';
      case 'manager':
        return 'Back to Manager Dashboard';
      default:
        return 'Back to Home';
    }
  };

  const checkApiStatus = async () => {
    setIsChecking(true);

    try {
      // Simple status check using configured API URL
      const response = await fetch(`${AXIOS_API_ROOT}/status`);
      const data = await response.json();

      // Parse status from backend response
      setStatus({
        api: 'ok',
        database: data.db || 'error',
        transcription: data.faster_whisper ? 'ok' : 'error',
        ai: (data.nlp?.openai_enabled || data.nlp?.gemini_enabled) ? 'ok' : 'offline'
      });

      setLastChecked(new Date().toLocaleTimeString());
    } catch (error) {
      console.error('Status check failed:', error);
      setStatus({
        api: 'error',
        database: 'error',
        transcription: 'error',
        ai: 'offline'
      });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkApiStatus();
    // Auto-refresh every 30 seconds
    const interval = setInterval(checkApiStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'ok': return 'text-green-500';
      case 'error': return 'text-red-500';
      case 'offline': return 'text-yellow-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ok': return '✅';
      case 'error': return '❌';
      case 'offline': return '⚠️';
      default: return '⏳';
    }
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                API Status
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Real-time status of all system components
              </p>
            </div>
            <Button
              onClick={checkApiStatus}
              disabled={isChecking}
              className="flex items-center gap-2"
            >
              {isChecking ? '⏳' : '🔄'}
              {isChecking ? 'Checking...' : 'Refresh'}
            </Button>
          </div>

          {/* Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    API Server
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Backend Services
                  </p>
                </div>
                <div className={`text-2xl ${getStatusColor(status.api)}`}>
                  {getStatusIcon(status.api)}
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Database
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    MongoDB Connection
                  </p>
                </div>
                <div className={`text-2xl ${getStatusColor(status.database)}`}>
                  {getStatusIcon(status.database)}
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Transcription
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Speech-to-Text
                  </p>
                </div>
                <div className={`text-2xl ${getStatusColor(status.transcription)}`}>
                  {getStatusIcon(status.transcription)}
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                    AI Services
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Gemini/OpenAI
                  </p>
                </div>
                <div className={`text-2xl ${getStatusColor(status.ai)}`}>
                  {getStatusIcon(status.ai)}
                </div>
              </div>
            </Card>
          </div>

          {/* System Information */}
          <Card className="p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              System Information
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Last Checked: {lastChecked || 'Never'}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Auto-refresh: Every 30 seconds
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Backend URL: http://127.0.0.1:8000
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Frontend URL: http://localhost:5173
                </p>
              </div>
            </div>
          </Card>

          {/* Back Button */}
          <div className="flex justify-center">
            <Button
              onClick={() => navigate(getReturnPath())}
              variant="outline"
              className="flex items-center gap-2"
            >
              ← {getReturnButtonText()}
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
}