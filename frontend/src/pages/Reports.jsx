import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axiosInstance from '../utils/axios';
import { Card, Button, Badge, Spinner } from '../components/ui';
import Layout from '../components/Layout';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const MetricCard = ({ title, value, icon, color = "blue" }) => {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400",
    green: "bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400",
    purple: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400",
    orange: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400",
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>
    </Card>
  );
};

export default function Reports() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Data State
  const [reportType, setReportType] = useState('meetings'); // meetings, action-items
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [meetings, setMeetings] = useState([]);
  const [actionItems, setActionItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // UI State
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Redirect if not manager or admin
  useEffect(() => {
    if (user && user.role !== 'manager' && user.role !== 'admin') {
      navigate('/forbidden', { replace: true });
    }
  }, [user, navigate]);

  // Set default dates (last 30 days)
  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    setDateTo(today.toISOString().split('T')[0]);
    setDateFrom(thirtyDaysAgo.toISOString().split('T')[0]);
  }, []);

  const generateReport = async () => {
    if (!dateFrom || !dateTo) {
      setError('Please select both start and end dates');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setExpandedRows(new Set());
      setCurrentPage(1); // Reset to first page on new report

      if (reportType === 'meetings') {
        const response = await axiosInstance.get('/manager/reports/date-range', {
          params: { date_from: dateFrom, date_to: dateTo }
        });
        setMeetings(response.data.meetings || []);
        setActionItems([]);
      } else if (reportType === 'action-items') {
        const response = await axiosInstance.get('/manager/reports/action-items');
        setActionItems(response.data.action_items || []);
        setMeetings([]);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate report');
      console.error('Error generating report:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- Logic: Filter, Sort, Paginate ---

  const getSmartTitle = (meeting) => {
    if (meeting.title && meeting.title !== 'Untitled Meeting') return meeting.title;
    const date = new Date(meeting.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return `Meeting on ${date}`;
  };

  const processedData = useMemo(() => {
    let data = reportType === 'meetings' ? [...meetings] : [...actionItems];

    // 1. Filter
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      data = data.filter(item => {
        if (reportType === 'meetings') {
          return (
            (item.title || '').toLowerCase().includes(lowerQuery) ||
            (item.summary || '').toLowerCase().includes(lowerQuery)
          );
        } else {
          return (
            (item.action_item || '').toLowerCase().includes(lowerQuery) ||
            (item.meeting_title || '').toLowerCase().includes(lowerQuery)
          );
        }
      });
    }

    // 2. Sort
    if (sortConfig.key) {
      data.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        // Special handling for smart titles in sorting
        if (sortConfig.key === 'title' && reportType === 'meetings') {
          aValue = getSmartTitle(a);
          bValue = getSmartTitle(b);
        }
        // Special handling for action item count
        if (sortConfig.key === 'action_items') {
          aValue = a.action_items?.length || 0;
          bValue = b.action_items?.length || 0;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return data;
  }, [meetings, actionItems, reportType, searchQuery, sortConfig]);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return processedData.slice(startIndex, startIndex + itemsPerPage);
  }, [processedData, currentPage]);

  const totalPages = Math.ceil(processedData.length / itemsPerPage);

  const handleSort = (key) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // --- Metrics & Charts ---

  const metrics = useMemo(() => {
    if (reportType === 'meetings') {
      const totalMeetings = meetings.length;
      const totalActionItems = meetings.reduce((sum, m) => sum + (m.action_items?.length || 0), 0);

      const start = new Date(dateFrom);
      const end = new Date(dateTo);
      const days = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
      const velocity = (totalMeetings / days).toFixed(1);

      return [
        { title: 'Total Meetings', value: totalMeetings, color: 'blue', icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg> },
        { title: 'Action Items', value: totalActionItems, color: 'green', icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg> },
        { title: 'Avg Meetings/Day', value: velocity, color: 'purple', icon: <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg> },
      ];
    }
    return [];
  }, [meetings, reportType, dateFrom, dateTo]);

  const chartData = useMemo(() => {
    if (reportType !== 'meetings' || meetings.length === 0) return [];
    const data = {};
    meetings.forEach(m => {
      const date = new Date(m.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      data[date] = (data[date] || 0) + 1;
    });
    return Object.entries(data).map(([date, count]) => ({ date, count })).reverse();
  }, [meetings, reportType]);

  const toggleRow = (id) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedRows(newExpanded);
  };

  const exportToCSV = () => {
    let csvContent = '';
    const dataToExport = processedData; // Export filtered/sorted data

    if (reportType === 'meetings' && dataToExport.length > 0) {
      csvContent = 'Title,Created At,Action Items Count,Summary\n';
      dataToExport.forEach(meeting => {
        const title = `"${(meeting.title || 'Untitled').replace(/"/g, '""')}"`;
        const createdAt = new Date(meeting.created_at).toLocaleString();
        const actionCount = meeting.action_items?.length || 0;
        const summary = `"${(meeting.summary || '').replace(/"/g, '""')}"`;
        csvContent += `${title},${createdAt},${actionCount},${summary}\n`;
      });
    } else if (reportType === 'action-items' && dataToExport.length > 0) {
      csvContent = 'Action Item,Meeting Title,Created At\n';
      dataToExport.forEach(item => {
        const actionItem = `"${(item.action_item || '').replace(/"/g, '""')}"`;
        const meetingTitle = `"${(item.meeting_title || 'Untitled').replace(/"/g, '""')}"`;
        const createdAt = new Date(item.created_at).toLocaleString();
        csvContent += `${actionItem},${meetingTitle},${createdAt}\n`;
      });
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `report_${reportType}_${Date.now()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const SortIcon = ({ column }) => {
    if (sortConfig.key !== column) return <span className="text-gray-400 ml-1">↕</span>;
    return sortConfig.direction === 'asc' ? <span className="ml-1">↑</span> : <span className="ml-1">↓</span>;
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <svg className="w-8 h-8 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                </svg>
                Reports
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Generate team and project reports
              </p>
            </div>
            <Button onClick={() => navigate('/manager/dashboard')} variant="secondary">
              Back to Dashboard
            </Button>
          </div>
        </div>

        {/* Report Configuration */}
        <Card className="p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Report Configuration
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">From Date</label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">To Date</label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            <div className="flex items-end">
              <Button onClick={generateReport} disabled={loading} className="w-full">
                {loading ? (
                  <><Spinner className="w-4 h-4 mr-2" />Generating...</>
                ) : (
                  <>Generate Report</>
                )}
              </Button>
            </div>
          </div>
          {error && (
            <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
            </div>
          )}
        </Card>

        {/* Results Section */}
        {(meetings.length > 0 || actionItems.length > 0) && (
          <div className="space-y-6">

            {/* Metric Cards */}
            {reportType === 'meetings' && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {metrics.map((metric, idx) => (
                  <MetricCard key={idx} {...metric} />
                ))}
              </div>
            )}

            {/* Activity Chart */}
            {reportType === 'meetings' && chartData.length > 0 && (
              <Card className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Meeting Activity</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                      <XAxis dataKey="date" stroke="#6B7280" fontSize={12} />
                      <YAxis stroke="#6B7280" fontSize={12} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1F2937', border: 'none', borderRadius: '8px', color: '#fff' }}
                        itemStyle={{ color: '#fff' }}
                      />
                      <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#8B5CF6' : '#7C3AED'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Card>
            )}

            {/* Data Table */}
            <Card className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Detailed Report ({processedData.length} items)
                </h2>

                <div className="flex items-center gap-2 w-full md:w-auto">
                  {/* Search Input */}
                  <div className="relative flex-1 md:flex-none">
                    <input
                      type="text"
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                      className="w-full md:w-64 pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent text-sm"
                    />
                    <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>

                  <Button onClick={exportToCSV} variant="secondary" size="sm">
                    Export CSV
                  </Button>
                </div>
              </div>

              {reportType === 'meetings' && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th
                          onClick={() => handleSort('title')}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Title <SortIcon column="title" />
                        </th>
                        <th
                          onClick={() => handleSort('created_at')}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Date <SortIcon column="created_at" />
                        </th>
                        <th
                          onClick={() => handleSort('action_items')}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Action Items <SortIcon column="action_items" />
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                          Summary
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {paginatedData.map((meeting) => (
                        <tr key={meeting.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {getSmartTitle(meeting)}
                            </div>
                            {meeting.title === 'Untitled Meeting' && (
                              <div className="text-xs text-gray-500 mt-1">Original: Untitled</div>
                            )}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(meeting.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge className={`${(meeting.action_items?.length || 0) > 5 ? 'bg-red-100 text-red-800' :
                              (meeting.action_items?.length || 0) > 0 ? 'bg-blue-100 text-blue-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                              {meeting.action_items?.length || 0} items
                            </Badge>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                              {meeting.summary ? (
                                <div>
                                  <p className={expandedRows.has(meeting.id) ? '' : 'line-clamp-2'}>
                                    {meeting.summary}
                                  </p>
                                  {meeting.summary.length > 150 && (
                                    <button
                                      onClick={() => toggleRow(meeting.id)}
                                      className="text-purple-600 hover:text-purple-700 text-xs font-medium mt-1 focus:outline-none"
                                    >
                                      {expandedRows.has(meeting.id) ? 'Show Less' : 'Read More'}
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400 italic">No summary available</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {reportType === 'action-items' && (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th
                          onClick={() => handleSort('action_item')}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Action Item <SortIcon column="action_item" />
                        </th>
                        <th
                          onClick={() => handleSort('meeting_title')}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Meeting <SortIcon column="meeting_title" />
                        </th>
                        <th
                          onClick={() => handleSort('created_at')}
                          className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                        >
                          Date <SortIcon column="created_at" />
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {paginatedData.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900 dark:text-white">
                              {typeof item.action_item === 'string' ? item.action_item : item.action_item?.text || JSON.stringify(item.action_item)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {item.meeting_title || 'Untitled Meeting'}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {formatDate(item.created_at)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination Controls */}
              {processedData.length > itemsPerPage && (
                <div className="flex items-center justify-between border-t border-gray-200 dark:border-gray-700 px-4 py-3 sm:px-6 mt-4">
                  <div className="flex flex-1 justify-between sm:hidden">
                    <Button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      variant="secondary"
                      size="sm"
                    >
                      Previous
                    </Button>
                    <Button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      variant="secondary"
                      size="sm"
                    >
                      Next
                    </Button>
                  </div>
                  <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, processedData.length)}</span> of <span className="font-medium">{processedData.length}</span> results
                      </p>
                    </div>
                    <div>
                      <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                        <button
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="sr-only">Previous</span>
                          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                          </svg>
                        </button>

                        {/* Page Numbers */}
                        {[...Array(totalPages)].map((_, i) => (
                          <button
                            key={i + 1}
                            onClick={() => setCurrentPage(i + 1)}
                            className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${currentPage === i + 1
                              ? 'z-10 bg-purple-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-600'
                              : 'text-gray-900 dark:text-gray-300 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 focus:z-20 focus:outline-offset-0'
                              }`}
                          >
                            {i + 1}
                          </button>
                        ))}

                        <button
                          onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 focus:z-20 focus:outline-offset-0 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="sr-only">Next</span>
                          <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* Empty State */}
        {!loading && meetings.length === 0 && actionItems.length === 0 && (
          <Card className="p-12">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-white">No report generated yet</h3>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Select a report type and date range, then click "Generate Report"
              </p>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
