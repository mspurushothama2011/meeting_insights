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
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

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
    setReplyMessage('');
    setShowModal(true);
  };

  const handleReply = async () => {
    if (!selectedTicket || !replyMessage.trim()) return;

    setSendingReply(true);
    try {
      const params = new URLSearchParams();
      params.append('message', replyMessage.trim());

      await axiosInstance.post(`/support/tickets/${selectedTicket.id}/messages`, params);

      // Refresh tickets to show new message
      await fetchTickets();

      // Update selected ticket with new message
      const updatedTickets = await axiosInstance.get('/support/tickets', { params: { user_email: user?.email } });
      const updatedTicket = updatedTickets.data.tickets.find(t => t.id === selectedTicket.id);
      if (updatedTicket) {
        setSelectedTicket(updatedTicket);
      }

      setReplyMessage('');
    } catch (error) {
      console.error('Error sending reply:', error);
      if (error.response) {
        console.error('Error response:', error.response.data);
        alert(`Failed to send reply: ${error.response.data.detail || 'Unknown error'}`);
      } else {
        alert('Failed to send reply. Please try again.');
      }
    } finally {
      setSendingReply(false);
    }
  };

  // Get messages array with backward compatibility
  const getMessages = (ticket) => {
    if (ticket.messages && ticket.messages.length > 0) {
      return ticket.messages;
    }

    // Backward compatibility: convert old format to messages array
    const messages = [];
    if (ticket.message) {
      messages.push({
        sender_type: 'member',
        sender_name: ticket.user_name,
        text: ticket.message,
        timestamp: ticket.created_at
      });
    }
    if (ticket.admin_response) {
      messages.push({
        sender_type: 'admin',
        sender_name: 'Admin',
        text: ticket.admin_response,
        timestamp: ticket.updated_at || ticket.created_at
      });
    }
    return messages;
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
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-gray-100 dark:border-gray-700">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <span className="text-2xl">{getCategoryIcon(selectedTicket.category)}</span>
                    {selectedTicket.subject}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-2">
                    <span>Ticket #{selectedTicket.id.slice(-6)}</span>
                    <span>•</span>
                    <span>{new Date(selectedTicket.created_at).toLocaleDateString()}</span>
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowModal(false);
                    setSelectedTicket(null);
                    setReplyMessage('');
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                {/* Ticket Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 bg-gray-50 dark:bg-gray-700/30 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Status</p>
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(selectedTicket.status)}`}>
                        {selectedTicket.status.replace('_', ' ')}
                      </span>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${getPriorityColor(selectedTicket.priority)}`}>
                        {selectedTicket.priority}
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Details</p>
                    <div className="space-y-1">
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        <span className="opacity-70">Category:</span> <span className="font-medium capitalize">{selectedTicket.category}</span>
                      </p>
                      {selectedTicket.resolved_at && (
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <span className="opacity-70">Resolved:</span> <span className="font-medium">{new Date(selectedTicket.resolved_at).toLocaleDateString()}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">Support</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Our team typically responds within 24 hours.
                    </p>
                  </div>
                </div>

                {/* Conversation Thread */}
                <div className="mb-8">
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                    Conversation History
                  </h4>
                  <div className="space-y-4 bg-white dark:bg-gray-800 rounded-xl">
                    {getMessages(selectedTicket).map((msg, idx) => {
                      const isMember = msg.sender_type === 'member';
                      return (
                        <div key={idx} className={`flex ${isMember ? 'justify-end' : 'justify-start'}`}>
                          <div className={`flex max-w-[80%] ${isMember ? 'flex-row-reverse' : 'flex-row'} gap-3`}>
                            {/* Avatar */}
                            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold shadow-sm ${isMember
                              ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
                              : 'bg-gradient-to-br from-green-500 to-green-600 text-white'
                              }`}>
                              {isMember ? 'U' : 'A'}
                            </div>

                            {/* Message Bubble */}
                            <div className={`p-4 rounded-2xl shadow-sm ${isMember
                              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-900 dark:text-blue-100 rounded-tr-none border border-blue-100 dark:border-blue-800'
                              : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-tl-none border border-gray-100 dark:border-gray-600'
                              }`}>
                              <div className={`flex items-center gap-2 mb-1 text-xs ${isMember ? 'justify-end' : 'justify-start'} opacity-70`}>
                                <span className="font-semibold">{msg.sender_name || (isMember ? 'You' : 'Admin')}</span>
                                <span>•</span>
                                <span>{new Date(msg.timestamp).toLocaleString()}</span>
                              </div>
                              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                {msg.text}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Reply Section - Only show for open/in_progress tickets */}
                {(selectedTicket.status === 'open' || selectedTicket.status === 'in_progress') && (
                  <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-6 border border-gray-100 dark:border-gray-700">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Write a Reply
                      </label>
                      <textarea
                        value={replyMessage}
                        onChange={(e) => setReplyMessage(e.target.value)}
                        rows={3}
                        placeholder="Type your response here..."
                        className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:text-white transition-all resize-none"
                      />
                    </div>

                    <div className="flex justify-end gap-3">
                      <Button
                        onClick={handleReply}
                        disabled={!replyMessage.trim() || sendingReply}
                        variant="primary"
                        className="flex items-center gap-2 shadow-lg shadow-blue-500/20"
                      >
                        {sendingReply ? (
                          <>
                            <svg className="w-4 h-4 animate-spin" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                            </svg>
                            Sending...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                            </svg>
                            Send Reply
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}


