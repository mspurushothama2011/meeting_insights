import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axiosInstance from '../utils/axios';
import { Card, Button, Badge, Spinner } from '../components/ui';
import Layout from '../components/Layout';

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [meetings, setMeetings] = useState([]);
  const [supportTickets, setSupportTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // Redirect if not admin
  useEffect(() => {
    if (user && user.role !== 'admin') {
      navigate('/forbidden', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, meetingsRes, ticketsRes] = await Promise.all([
        axiosInstance.get('/admin/users'),
        axiosInstance.get('/admin/meetings/all'),
        axiosInstance.get('/admin/support/tickets')
      ]);

      setUsers(usersRes.data.users || []);
      setMeetings(meetingsRes.data.meetings || []);
      setSupportTickets(ticketsRes.data.tickets || []);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async (userId) => {
    try {
      await axiosInstance.delete(`/admin/users/${userId}`);
      setUsers(users.filter(u => u.id !== userId));
      setDeleteConfirm(null);
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to delete user');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await axiosInstance.put(`/admin/users/${userId}/role`, { role: newRole });

      // Update local state
      setUsers(users.map(u =>
        u.id === userId ? { ...u, role: newRole } : u
      ));
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update role');
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-danger-500/10 text-danger-400 border border-danger-500/20';
      case 'manager': return 'bg-accent-500/10 text-accent-400 border border-accent-500/20';
      case 'member': return 'bg-primary-500/10 text-primary-400 border border-primary-500/20';
      default: return 'bg-white/5 text-gray-400 border border-white/10';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Spinner size="lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <div className="p-2 bg-danger-500/20 rounded-lg border border-danger-500/30">
                <svg className="w-8 h-8 text-danger-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                </svg>
              </div>
              Admin Dashboard
            </h1>
            <p className="text-gray-400 mt-2 ml-1">
              System management and user administration
            </p>
          </div>
          <Button
            onClick={() => navigate('/')}
            variant="secondary"
            icon={
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            }
          >
            Back to Home
          </Button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-danger-500/10 border border-danger-500/20 rounded-xl text-danger-200 flex items-center gap-3 animate-shake">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        <Card className="p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-success-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all duration-500 group-hover:bg-success-500/20"></div>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-sm font-medium text-gray-400">Total Meetings</p>
              <p className="text-4xl font-bold text-white mt-1">{meetings.length}</p>
            </div>
            <div className="p-3 bg-success-500/20 rounded-xl border border-success-500/30 text-success-400">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="p-6 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-danger-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all duration-500 group-hover:bg-danger-500/20"></div>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-sm font-medium text-gray-400">Active Admins</p>
              <p className="text-4xl font-bold text-white mt-1">
                {users.filter(u => u.role === 'admin' && u.is_active).length}
              </p>
            </div>
            <div className="p-3 bg-danger-500/20 rounded-xl border border-danger-500/30 text-danger-400">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
          </div>
        </Card>

        <Card className="p-6 relative overflow-hidden group cursor-pointer hover:bg-white/5 transition-colors" onClick={() => navigate('/admin/support')}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-warning-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all duration-500 group-hover:bg-warning-500/20"></div>
          <div className="flex items-center justify-between relative z-10">
            <div>
              <p className="text-sm font-medium text-gray-400">Support Tickets</p>
              <p className="text-4xl font-bold text-white mt-1">{supportTickets.length}</p>
              <p className="text-xs text-gray-500 mt-1">
                {supportTickets.filter(t => t.status === 'open').length} open
              </p>
            </div>
            <div className="p-3 bg-warning-500/20 rounded-xl border border-warning-500/30 text-warning-400">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
          </div>
        </Card>

        {/* User Management Table */}
        <Card className="overflow-hidden">
          <div className="px-6 py-5 border-b border-white/5 bg-white/5">
            <h2 className="text-xl font-bold text-white">
              User Management
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/5 border-b border-white/5">
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">User</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Role</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="text-left py-4 px-6 text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-xs font-bold text-white mr-3">
                          {u.full_name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-white">{u.full_name}</div>
                          <div className="text-xs text-gray-500 font-mono">{u.id.substring(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-gray-300">{u.email}</td>
                    <td className="py-4 px-6">
                      <select
                        value={u.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        disabled={u.id === user.id}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border-0 focus:ring-2 focus:ring-primary-500 cursor-pointer transition-all ${getRoleBadgeColor(u.role)} ${u.id === user.id ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <option value="guest" className="bg-dark-800 text-gray-300">Guest</option>
                        <option value="member" className="bg-dark-800 text-gray-300">Member</option>
                        <option value="manager" className="bg-dark-800 text-gray-300">Manager</option>
                        <option value="admin" className="bg-dark-800 text-gray-300">Admin</option>
                      </select>
                    </td>
                    <td className="py-4 px-6">
                      <Badge variant={u.is_active ? 'success' : 'secondary'}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="py-4 px-6">
                      {u.id !== user.id ? (
                        deleteConfirm === u.id ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="text-xs px-3 py-1 bg-red-500/20 text-red-400 border border-red-500/30 rounded hover:bg-red-500/30 transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="text-xs px-3 py-1 bg-gray-700 text-gray-300 rounded hover:bg-gray-600 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(u.id)}
                            className="text-gray-400 hover:text-red-400 transition-colors"
                            title="Delete User"
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )
                      ) : (
                        <span className="text-xs font-medium text-primary-400 bg-primary-500/10 px-2 py-1 rounded">Current User</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
