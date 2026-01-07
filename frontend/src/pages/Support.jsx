import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, Button } from '../components/ui';
import Layout from '../components/Layout';
import axiosInstance from '../utils/axios';

export default function Support() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: user?.full_name || '',
    email: user?.email || '',
    subject: '',
    message: '',
    priority: 'medium',
    category: 'general'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Redirect admins to support management page
  React.useEffect(() => {
    if (user?.role === 'admin') {
      navigate('/admin/support', { replace: true });
    }
  }, [user, navigate]);

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await axiosInstance.post('/support/tickets', {
        subject: formData.subject,
        message: formData.message,
        category: formData.category,
        priority: formData.priority,
        admin_email: formData.email  // Email to identify which admin
      });

      if (response.data.success) {
        console.log('Support ticket submitted:', response.data);
        setSubmitted(true);
      } else {
        throw new Error(response.data.message || 'Failed to submit');
      }
    } catch (error) {
      console.error('Error submitting support ticket:', error);
      const errorMsg = error.response?.data?.detail || error.message || 'Failed to submit support ticket. Please try again.';
      alert(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <Layout>
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <Card className="p-8 text-center">
              <div className="mb-6">
                <svg className="w-16 h-16 text-green-500 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                  Support Ticket Submitted!
                </h1>
                <p className="text-gray-600 dark:text-gray-400">
                  Thank you for contacting us. We'll get back to you within 24 hours.
                </p>
              </div>
              <div className="flex gap-4 justify-center">
                <Button
                  onClick={() => navigate(getReturnPath())}
                  variant="primary"
                >
                  {getReturnButtonText()}
                </Button>
                <Button
                  onClick={() => setSubmitted(false)}
                  variant="secondary"
                >
                  Submit Another Ticket
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <svg className="w-8 h-8 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-2 0c0 .993-.241 1.929-.668 2.754l-1.524-1.525a3.997 3.997 0 00.078-2.229l1.562-1.562C15.759 8.071 16 9.007 16 10zm-5.165 3.913l1.58 1.58A5.98 5.98 0 0110 16a5.976 5.976 0 01-2.516-.552l1.562-1.562a4.006 4.006 0 001.789.027zm-4.677-2.532a1 1 0 00-1.414-1.414l-.705.705a2 2 0 01-2.83-2.83l.704-.705a1 1 0 00-1.414-1.414l-.705.705a4 4 0 005.66 5.66l.705-.705zm6.435-1.484a1 1 0 00-1.414-1.414l-.705.705a2 2 0 01-2.83-2.83l.704-.705a1 1 0 00-1.414-1.414l-.705.705a4 4 0 005.66 5.66l.705-.705zM8 10a2 2 0 114 0 2 2 0 01-4 0z" clipRule="evenodd" />
                </svg>
                Support
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Get help with the Intelligent Meeting Insights Platform
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Support Form */}
          <div className="lg:col-span-2">
            <Card className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
                Submit Support Ticket
              </h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Admin Email *
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      placeholder="admin@example.com"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Enter the email of the admin who should handle this ticket
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Category
                    </label>
                    <select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="general">General Question</option>
                      <option value="technical">Technical Issue</option>
                      <option value="feature">Feature Request</option>
                      <option value="bug">Bug Report</option>
                      <option value="account">Account Issue</option>
                      <option value="billing">Billing Question</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Priority
                    </label>
                    <select
                      name="priority"
                      value={formData.priority}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Subject *
                  </label>
                  <input
                    type="text"
                    name="subject"
                    value={formData.subject}
                    onChange={handleInputChange}
                    required
                    placeholder="Brief description of your issue"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Message *
                  </label>
                  <textarea
                    name="message"
                    value={formData.message}
                    onChange={handleInputChange}
                    required
                    rows={6}
                    placeholder="Please provide detailed information about your issue..."
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div className="flex justify-end">
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    variant="primary"
                    className="flex items-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                        </svg>
                        Submitting...
                      </>
                    ) : (
                      'Submit Ticket'
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* Support Information */}
          <div className="space-y-6">
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                📞 Contact Information
              </h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                    <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                  </svg>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    support@imip.com
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Response time: 24 hours
                  </span>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                🔧 Quick Help
              </h3>
              <div className="space-y-3">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                    Common Issues
                  </h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 mt-1 space-y-1">
                    <li>• Check API Status page</li>
                    <li>• Verify file size limits</li>
                    <li>• Check browser compatibility</li>
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                    Before Submitting
                  </h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 mt-1 space-y-1">
                    <li>• Try refreshing the page</li>
                    <li>• Clear browser cache</li>
                    <li>• Check documentation</li>
                  </ul>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                📚 Resources
              </h3>
              <div className="space-y-3">
                <Button
                  onClick={() => navigate('/documentation')}
                  variant="secondary"
                  className="w-full justify-start"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                  Documentation
                </Button>
                <Button
                  onClick={() => navigate('/api-status')}
                  variant="secondary"
                  className="w-full justify-start"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  API Status
                </Button>
                <Button
                  onClick={() => navigate('/my-support')}
                  variant="secondary"
                  className="w-full justify-start"
                >
                  <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-2 0c0 .993-.241 1.929-.668 2.754l-1.524-1.525a3.997 3.997 0 00.078-2.229l1.562-1.562C15.759 8.071 16 9.007 16 10zm-5.165 3.913l1.58 1.58A5.98 5.98 0 0110 16a5.976 5.976 0 01-2.516-.552l1.562-1.562a4.006 4.006 0 001.789.027zm-4.677-2.532a1 1 0 00-1.414-1.414l-.705.705a2 2 0 01-2.83-2.83l.704-.705a1 1 0 00-1.414-1.414l-.705.705a4 4 0 005.66 5.66l.705-.705zm6.435-1.484a1 1 0 00-1.414-1.414l-.705.705a2 2 0 01-2.83-2.83l.704-.705a1 1 0 00-1.414-1.414l-.705.705a4 4 0 005.66 5.66l.705-.705zM8 10a2 2 0 114 0 2 2 0 01-4 0z" clipRule="evenodd" />
                  </svg>
                  My Support Tickets
                </Button>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
