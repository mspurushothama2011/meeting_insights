import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, Button } from '../components/ui';
import Layout from '../components/Layout';

export default function Documentation() {
  const { user } = useAuth();
  const navigate = useNavigate();

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

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
                Documentation
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Complete guide to using the Intelligent Meeting Insights Platform
              </p>
            </div>
            <Button
              onClick={() => navigate(getReturnPath())}
              variant="secondary"
            >
              {getReturnButtonText()}
            </Button>
          </div>
        </div>

        {/* Quick Start */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            🚀 Quick Start Guide
          </h2>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-medium">1</span>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Upload or Transcribe</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Upload audio/video files or paste text directly to get started with transcription.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-medium">2</span>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">AI Analysis</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Use AI to extract action items, decisions, and key topics from your meetings.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center text-sm font-medium">3</span>
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white">Save & Manage</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Save your meetings and access them anytime from your dashboard.</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
              Transcription Features
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>• Support for audio and video files</li>
              <li>• Multiple ASR backends (Whisper, Vosk)</li>
              <li>• Real-time transcription</li>
              <li>• Text paste support</li>
              <li>• File size limit: 500MB</li>
              <li>• Duration limit: 60 minutes</li>
            </ul>
          </Card>

          <Card className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              AI Analysis
            </h3>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>• Automatic action item extraction</li>
              <li>• Decision identification</li>
              <li>• Key topic detection</li>
              <li>• Meeting summarization</li>
              <li>• Keyword extraction</li>
              <li>• Priority and deadline detection</li>
            </ul>
          </Card>
        </div>

        {/* User Roles */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            👥 User Roles & Permissions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">👤 Member</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Create and manage meetings</li>
                <li>• View own meeting history</li>
                <li>• Export meeting data</li>
              </ul>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">👨‍💼 Manager</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• All Member features</li>
                <li>• Team overview dashboard</li>
                <li>• Team activity reports</li>
                <li>• Action items tracking</li>
              </ul>
            </div>
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">👑 Admin</h3>
              <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <li>• All Manager features</li>
                <li>• User management</li>
                <li>• System administration</li>
                <li>• All meetings access</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* API Information */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            🔌 API Information
          </h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">Base URL</h3>
              <code className="block p-3 bg-gray-100 dark:bg-gray-800 rounded text-sm font-mono">
                http://127.0.0.1:8000
              </code>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white mb-2">API Documentation</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Interactive API documentation is available at:
              </p>
              <a 
                href="http://127.0.0.1:8000/docs" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                http://127.0.0.1:8000/docs
              </a>
            </div>
          </div>
        </Card>

        {/* Support */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
            🆘 Need Help?
          </h2>
          <div className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400">
              If you need assistance or have questions about using the platform, please:
            </p>
            <div className="flex gap-4">
              <Button
                onClick={() => navigate('/support')}
                variant="primary"
              >
                Contact Support
              </Button>
              <Button
                onClick={() => navigate('/api-status')}
                variant="secondary"
              >
                Check API Status
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </Layout>
  );
}


