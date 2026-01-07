import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, Button } from '../components/ui';
import Layout from '../components/Layout';
import axiosInstance from '../utils/axios';

export default function UserSupportHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showModal, setShowModal] = useState(false);

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

  const fetchTickets = async () => {
    try {
      // Use axios instance so auth headers/cookies are handled automatically
      const params = { user_email: user?.email };
      const res = await axiosInstance.get('/support/tickets', { params });
      setTickets(res.data.tickets || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const openTicketModal = (ticket) => {
    setSelectedTicket(ticket);
    setShowModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'resolved':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'closed':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'technical':
        return '🔧';
      case 'feature':
        return '✨';
      case 'bug':
        return '🐛';
      case 'account':
        return '👤';
      case 'billing':
        return '💳';
      default:
        return '📝';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open':
        return (
          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
          </svg>
        );
      case 'in_progress':
        return (
          <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
          </svg>
        );
      case 'resolved':
        return (
          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'closed':
        return (
          <svg className="w-5 h-5 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
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
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-2 0c0 .993-.241 1.929-.668 2.754l-1.524-1.525a3.997 3.997 0 00.078-2.229l1.562-1.562C15.759 8.071 16 9.007 16 10zm-5.165 3.913l1.58 1.58A5.98 5.98 0 0110 16a5.976 5.976 0 01-2.516-.552l1.562-1.562a4.006 4.006 0 001.789.027zm-4.677-2.532a1 1 0 00-1.414-1.414l-.705.705a2 2 0 01-2.83-2.83l.704-.705a1 1 0 00-1.414-1.414l-.705.705a4 4 0 005.66 5.66l.705-.705zm6.435-1.484a1 1 0 00-1.414-1.414l-.705.705a2 2 0 01-2.83-2.83l.704-.705a1 1 0 00-1.414-1.414l-.705.705a4 4 0 005.66 5.66l.705-.705zM8 10a2 2 0 114 0 2 2 0 01-4 0z" clipRule="evenodd" />
                </svg>
                My Support Tickets
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                View and track your support ticket history
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => navigate('/support')}
                variant="primary"
              >
                Submit New Ticket
              </Button>
              <Button
                onClick={() => navigate(getReturnPath())}
                variant="secondary"
              >
                {getReturnButtonText()}
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Open</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {tickets.filter(t => t.status === 'open').length}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">In Progress</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {tickets.filter(t => t.status === 'in_progress').length}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Resolved</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {tickets.filter(t => t.status === 'resolved').length}
                </p>
              </div>
            </div>
          </Card>
          
          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg className="w-8 h-8 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Closed</p>
                <p className="text-lg font-semibold text-gray-900 dark:text-white">
                  {tickets.filter(t => t.status === 'closed').length}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {/* Tickets List */}
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : tickets.length === 0 ? (
          <Card className="p-8 text-center">
            <svg className="w-16 h-16 text-gray-400 mx-auto mb-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-2 0c0 .993-.241 1.929-.668 2.754l-1.524-1.525a3.997 3.997 0 00.078-2.229l1.562-1.562C15.759 8.071 16 9.007 16 10zm-5.165 3.913l1.58 1.58A5.98 5.98 0 0110 16a5.976 5.976 0 01-2.516-.552l1.562-1.562a4.006 4.006 0 001.789.027zm-4.677-2.532a1 1 0 00-1.414-1.414l-.705.705a2 2 0 01-2.83-2.83l.704-.705a1 1 0 00-1.414-1.414l-.705.705a4 4 0 005.66 5.66l.705-.705zm6.435-1.484a1 1 0 00-1.414-1.414l-.705.705a2 2 0 01-2.83-2.83l.704-.705a1 1 0 00-1.414-1.414l-.705.705a4 4 0 005.66 5.66l.705-.705zM8 10a2 2 0 114 0 2 2 0 01-4 0z" clipRule="evenodd" />
            </svg>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No support tickets</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              You haven't submitted any support tickets yet.
            </p>
            <Button
              onClick={() => navigate('/support')}
              variant="primary"
            >
              Submit Your First Ticket
            </Button>
          </Card>
        ) : (
          <div className="space-y-4">
            {tickets.map((ticket) => (
              <Card key={ticket.id} className="p-6 hover:shadow-lg transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-2xl">{getCategoryIcon(ticket.category)}</span>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {ticket.subject}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}>
                        {ticket.status.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(ticket.priority)}`}>
                        {ticket.priority}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                      <p><strong>Category:</strong> {ticket.category}</p>
                      <p><strong>Submitted:</strong> {new Date(ticket.created_at).toLocaleString()}</p>
                      {ticket.resolved_at && (
                        <p><strong>Resolved:</strong> {new Date(ticket.resolved_at).toLocaleString()}</p>
                      )}
                    </div>
                    
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-3">
                      <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                        {ticket.message.length > 200 
                          ? `${ticket.message.substring(0, 200)}...` 
                          : ticket.message
                        }
                      </p>
                    </div>
                    
                    {ticket.admin_response && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                        <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-2 0c0 .993-.241 1.929-.668 2.754l-1.524-1.525a3.997 3.997 0 00.078-2.229l1.562-1.562C15.759 8.071 16 9.007 16 10zm-5.165 3.913l1.58 1.58A5.98 5.98 0 0110 16a5.976 5.976 0 01-2.516-.552l1.562-1.562a4.006 4.006 0 001.789.027zm-4.677-2.532a1 1 0 00-1.414-1.414l-.705.705a2 2 0 01-2.83-2.83l.704-.705a1 1 0 00-1.414-1.414l-.705.705a4 4 0 005.66 5.66l.705-.705zm6.435-1.484a1 1 0 00-1.414-1.414l-.705.705a2 2 0 01-2.83-2.83l.704-.705a1 1 0 00-1.414-1.414l-.705.705a4 4 0 005.66 5.66l.705-.705zM8 10a2 2 0 114 0 2 2 0 01-4 0z" clipRule="evenodd" />
                          </svg>
                          Admin Response
                        </h4>
                        <p className="text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
                          {ticket.admin_response}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className="ml-4 flex flex-col gap-2">
                    <Button
                      onClick={() => openTicketModal(ticket)}
                      variant="secondary"
                      className="flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                        <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                      </svg>
                      View Details
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {/* Ticket Details Modal */}
        {showModal && selectedTicket && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                Ticket Details
              </h2>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getCategoryIcon(selectedTicket.category)}</span>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {selectedTicket.subject}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedTicket.status)}`}>
                        {selectedTicket.status.replace('_', ' ')}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(selectedTicket.priority)}`}>
                        {selectedTicket.priority}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <p><strong>Category:</strong> {selectedTicket.category}</p>
                  <p><strong>Submitted:</strong> {new Date(selectedTicket.created_at).toLocaleString()}</p>
                  {selectedTicket.resolved_at && (
                    <p><strong>Resolved:</strong> {new Date(selectedTicket.resolved_at).toLocaleString()}</p>
                  )}
                </div>
                
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white mb-2">Your Message:</h4>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                    <p className="text-gray-900 dark:text-white whitespace-pre-wrap">
                      {selectedTicket.message}
                    </p>
                  </div>
                </div>
                
                {selectedTicket.admin_response && (
                  <div>
                    <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-2 0c0 .993-.241 1.929-.668 2.754l-1.524-1.525a3.997 3.997 0 00.078-2.229l1.562-1.562C15.759 8.071 16 9.007 16 10zm-5.165 3.913l1.58 1.58A5.98 5.98 0 0110 16a5.976 5.976 0 01-2.516-.552l1.562-1.562a4.006 4.006 0 001.789.027zm-4.677-2.532a1 1 0 00-1.414-1.414l-.705.705a2 2 0 01-2.83-2.83l.704-.705a1 1 0 00-1.414-1.414l-.705.705a4 4 0 005.66 5.66l.705-.705zm6.435-1.484a1 1 0 00-1.414-1.414l-.705.705a2 2 0 01-2.83-2.83l.704-.705a1 1 0 00-1.414-1.414l-.705.705a4 4 0 005.66 5.66l.705-.705zM8 10a2 2 0 114 0 2 2 0 01-4 0z" clipRule="evenodd" />
                      </svg>
                      Admin Response:
                    </h4>
                    <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                      <p className="text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
                        {selectedTicket.admin_response}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end gap-3 mt-6">
                <Button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedTicket(null);
                  }}
                  variant="secondary"
                >
                  Close
                </Button>
                <Button
                  onClick={() => navigate('/support')}
                  variant="primary"
                >
                  Submit New Ticket
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}


