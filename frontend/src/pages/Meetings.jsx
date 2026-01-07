import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axiosInstance from '../utils/axios'
import toast from 'react-hot-toast'
import Layout from '../components/Layout'
import { Button, Card, CardHeader, CardBody, Badge, SkeletonCard } from '../components/ui'

export default function Meetings() {
    const navigate = useNavigate()

    // State
    const [meetings, setMeetings] = useState([])
    const [totalMeetings, setTotalMeetings] = useState(0)
    const [isLoadingMeetings, setIsLoadingMeetings] = useState(false)

    // Filters
    const [searchQuery, setSearchQuery] = useState('')
    const [dateFilter, setDateFilter] = useState('all')
    const [filterDateFrom, setFilterDateFrom] = useState('')
    const [filterDateTo, setFilterDateTo] = useState('')
    const [filterActionItemsOnly, setFilterActionItemsOnly] = useState(false)
    const [sortBy, setSortBy] = useState('date_desc')

    // Bulk mode
    const [isBulkMode, setIsBulkMode] = useState(false)
    const [selectedMeetings, setSelectedMeetings] = useState(new Set())

    // Pagination
    const [currentPage, setCurrentPage] = useState(1)
    const [pageSize, setPageSize] = useState(10)

    // Meeting editing
    const [editingMeetingId, setEditingMeetingId] = useState(null)
    const [editingTitle, setEditingTitle] = useState('')
    const [expandedMeetings, setExpandedMeetings] = useState({})

    // Fetch meetings
    useEffect(() => {
        fetchMeetings()
    }, [])

    const fetchMeetings = async () => {
        setIsLoadingMeetings(true)
        try {
            // Fetch all meetings with a high limit to avoid pagination issues
            const r = await axiosInstance.get('/meetings', {
                params: { limit: 1000 }  // High limit to get all meetings
            })
            setMeetings(r.data.meetings || [])
            setTotalMeetings(r.data.total || 0)
            toast.success('Meetings loaded')
        } catch (err) {
            console.error('Failed to load meetings:', err)
            toast.error(`Failed to load meetings: ${err.message}`)
        } finally {
            setIsLoadingMeetings(false)
        }
    }

    // Filter and sort meetings
    const filteredMeetings = React.useMemo(() => {
        let filtered = [...meetings]

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase()
            filtered = filtered.filter(m =>
                m.title?.toLowerCase().includes(query) ||
                m.summary?.toLowerCase().includes(query) ||
                m.transcript?.toLowerCase().includes(query)
            )
        }

        // Date filter
        if (dateFilter !== 'all') {
            const now = new Date()
            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

            filtered = filtered.filter(m => {
                const meetingDate = new Date(m.created_at)

                if (dateFilter === 'today') {
                    return meetingDate >= today
                } else if (dateFilter === 'week') {
                    const weekAgo = new Date(today)
                    weekAgo.setDate(weekAgo.getDate() - 7)
                    return meetingDate >= weekAgo
                } else if (dateFilter === 'month') {
                    const monthAgo = new Date(today)
                    monthAgo.setMonth(monthAgo.getMonth() - 1)
                    return meetingDate >= monthAgo
                }
                return true
            })
        }

        // Advanced date filters
        if (filterDateFrom) {
            const fromDate = new Date(filterDateFrom)
            filtered = filtered.filter(m => new Date(m.created_at) >= fromDate)
        }

        if (filterDateTo) {
            const toDate = new Date(filterDateTo)
            toDate.setHours(23, 59, 59, 999)
            filtered = filtered.filter(m => new Date(m.created_at) <= toDate)
        }

        // Action items filter
        if (filterActionItemsOnly) {
            filtered = filtered.filter(m => m.action_items && m.action_items.length > 0)
        }

        // Sort
        filtered.sort((a, b) => {
            if (sortBy === 'date_desc') {
                return new Date(b.created_at) - new Date(a.created_at)
            } else if (sortBy === 'date_asc') {
                return new Date(a.created_at) - new Date(b.created_at)
            } else if (sortBy === 'title') {
                return (a.title || '').localeCompare(b.title || '')
            }
            return 0
        })

        return filtered
    }, [meetings, searchQuery, dateFilter, filterDateFrom, filterDateTo, filterActionItemsOnly, sortBy])

    // Pagination
    const totalPages = Math.ceil(filteredMeetings.length / pageSize)
    const paginatedMeetings = filteredMeetings.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    )

    // Bulk actions
    const toggleMeetingSelection = (id) => {
        setSelectedMeetings(prev => {
            const newSet = new Set(prev)
            if (newSet.has(id)) {
                newSet.delete(id)
            } else {
                newSet.add(id)
            }
            return newSet
        })
    }

    const selectAllMeetings = () => {
        if (selectedMeetings.size === paginatedMeetings.length) {
            setSelectedMeetings(new Set())
        } else {
            setSelectedMeetings(new Set(paginatedMeetings.map(m => m.id)))
        }
    }

    const clearSelection = () => {
        setSelectedMeetings(new Set())
    }

    const bulkDelete = async () => {
        if (selectedMeetings.size === 0) {
            toast.error('No meetings selected')
            return
        }

        if (!confirm(`Delete ${selectedMeetings.size} meetings?`)) return

        try {
            await Promise.all(
                Array.from(selectedMeetings).map(id =>
                    axiosInstance.delete(`/meetings/${id}`)
                )
            )
            toast.success(`Deleted ${selectedMeetings.size} meetings`)
            clearSelection()
            fetchMeetings()
        } catch (err) {
            toast.error(`Bulk delete failed: ${err.message}`)
        }
    }

    const bulkExport = () => {
        if (selectedMeetings.size === 0) {
            toast.error('No meetings selected')
            return
        }

        const selectedData = meetings.filter(m => selectedMeetings.has(m.id))
        const exportText = selectedData.map(m =>
            `Title: ${m.title}\\nDate: ${new Date(m.created_at).toLocaleString()}\\n\\nTranscript:\\n${m.transcript || 'N/A'}\\n\\nSummary:\\n${m.summary || 'N/A'}\\n\\n${'-'.repeat(80)}\\n\\n`
        ).join('')

        const blob = new Blob([exportText], { type: 'text/plain' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'meetings-export.txt'
        a.click()
        URL.revokeObjectURL(url)

        toast.success(`Exported ${selectedMeetings.size} meetings`)
    }

    // Meeting actions
    const deleteMeeting = async (id) => {
        if (!confirm('Delete this meeting?')) return

        try {
            await axiosInstance.delete(`/meetings/${id}`)
            toast.success('Meeting deleted')
            fetchMeetings()
        } catch (err) {
            toast.error(`Delete failed: ${err.message}`)
        }
    }

    const startEditingTitle = (meeting) => {
        setEditingMeetingId(meeting.id)
        setEditingTitle(meeting.title)
    }

    const cancelEditingTitle = () => {
        setEditingMeetingId(null)
        setEditingTitle('')
    }

    const updateMeetingTitle = async (id) => {
        try {
            await axiosInstance.patch(`/meetings/${id}`, { title: editingTitle })
            toast.success('Title updated')
            setEditingMeetingId(null)
            fetchMeetings()
        } catch (err) {
            toast.error(`Update failed: ${err.message}`)
        }
    }

    const toggleMeetingExpansion = (id) => {
        setExpandedMeetings(prev => ({
            ...prev,
            [id]: !prev[id]
        }))
    }

    return (
        <Layout>
            <div className="container mx-auto px-4 py-8">
                <div className="max-w-7xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                                    <div className="p-2 bg-primary-500/20 rounded-xl">
                                        <svg className="w-8 h-8 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                        </svg>
                                    </div>
                                    All Meetings
                                </h1>
                                <p className="text-gray-400 mt-2">
                                    {filteredMeetings.length} of {totalMeetings} meetings
                                </p>
                            </div>
                            <Button
                                variant="ghost"
                                onClick={() => navigate('/')}
                                className="text-gray-400 hover:text-white"
                            >
                                ← Back to Home
                            </Button>
                        </div>
                    </div>

                    {/* Meetings Card */}
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={fetchMeetings}
                                        className="text-gray-400 hover:text-white"
                                    >
                                        🔄 Refresh
                                    </Button>
                                    <Button
                                        variant={isBulkMode ? "primary" : "secondary"}
                                        size="sm"
                                        onClick={() => {
                                            setIsBulkMode(!isBulkMode)
                                            if (isBulkMode) clearSelection()
                                        }}
                                    >
                                        {isBulkMode ? '✅ Bulk Mode' : '☑️ Select'}
                                    </Button>
                                </div>
                            </div>

                            {/* Bulk Actions Toolbar */}
                            {isBulkMode && (
                                <div className="sticky top-0 z-10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between p-4 bg-primary-500/20 rounded-xl border border-primary-500/30 mt-4 shadow-lg shadow-primary-500/10 animate-scale-in gap-3">
                                    <div className="flex items-center gap-3">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={selectAllMeetings}
                                            className="text-primary-300 hover:text-white hover:bg-primary-500/20"
                                        >
                                            ☑️ Select All
                                        </Button>
                                        <span className="text-base font-semibold text-white bg-primary-500/30 px-4 py-1.5 rounded-lg border border-primary-500/40 shadow-sm">
                                            {selectedMeetings.size} of {filteredMeetings.length} selected
                                        </span>
                                    </div>
                                    <div className="flex gap-2 w-full sm:w-auto">
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={bulkDelete}
                                            disabled={selectedMeetings.size === 0}
                                            className="flex-1 sm:flex-none"
                                        >
                                            🗑️ Delete
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={bulkExport}
                                            disabled={selectedMeetings.size === 0}
                                            className="flex-1 sm:flex-none"
                                        >
                                            📥 Export
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={clearSelection}
                                            className="text-gray-400 hover:text-white"
                                        >
                                            Clear
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Advanced Filters */}
                            <details className="group mt-4">
                                <summary className="cursor-pointer text-sm font-medium text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-2 select-none">
                                    <svg className="w-4 h-4 transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                    Advanced Filters
                                </summary>
                                <div className="mt-3 p-4 bg-white/5 rounded-xl border border-white/5 space-y-4">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-400 mb-1.5">From Date</label>
                                            <input
                                                type="date"
                                                value={filterDateFrom}
                                                onChange={(e) => setFilterDateFrom(e.target.value)}
                                                className="w-full px-3 py-2 border border-white/10 rounded-lg bg-dark-800 text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-400 mb-1.5">To Date</label>
                                            <input
                                                type="date"
                                                value={filterDateTo}
                                                onChange={(e) => setFilterDateTo(e.target.value)}
                                                className="w-full px-3 py-2 border border-white/10 rounded-lg bg-dark-800 text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="flex items-center gap-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={filterActionItemsOnly}
                                                onChange={(e) => setFilterActionItemsOnly(e.target.checked)}
                                                className="w-5 h-5 rounded border-gray-500 text-primary-500 focus:ring-primary-500 bg-dark-800"
                                            />
                                            <span className="text-sm text-gray-300">Only meetings with action items</span>
                                        </label>
                                    </div>
                                </div>
                            </details>

                            {/* Search and Sort */}
                            <div className="mt-6 space-y-4">
                                <div className="relative">
                                    <input
                                        type="text"
                                        placeholder="Search meetings by title, summary, or transcript..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                    />
                                    <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Date:</label>
                                        <select
                                            value={dateFilter}
                                            onChange={(e) => setDateFilter(e.target.value)}
                                            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        >
                                            <option value="all">All Time</option>
                                            <option value="today">Today</option>
                                            <option value="week">Past Week</option>
                                            <option value="month">Past Month</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort:</label>
                                        <select
                                            value={sortBy}
                                            onChange={(e) => setSortBy(e.target.value)}
                                            className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        >
                                            <option value="date_desc">Newest First</option>
                                            <option value="date_asc">Oldest First</option>
                                            <option value="title">Title A-Z</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </CardHeader>

                        <CardBody>
                            {isLoadingMeetings ? (
                                <div className="space-y-4">
                                    <SkeletonCard />
                                    <SkeletonCard />
                                    <SkeletonCard />
                                </div>
                            ) : paginatedMeetings.length > 0 ? (
                                <>
                                    <div className="grid grid-cols-1 gap-4">
                                        {paginatedMeetings.map(meeting => (
                                            <div
                                                key={meeting.id}
                                                className="p-5 bg-white/5 rounded-xl border border-white/5 hover:bg-white/10 transition-all duration-300 hover:shadow-lg hover:shadow-primary-500/5 group"
                                            >
                                                <div className="flex justify-between items-start gap-4">
                                                    {/* Bulk Select Checkbox */}
                                                    {isBulkMode && (
                                                        <div className="pt-1">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedMeetings.has(meeting.id)}
                                                                onChange={() => toggleMeetingSelection(meeting.id)}
                                                                className="w-5 h-5 rounded border-gray-500 text-primary-500 focus:ring-primary-500 bg-dark-800"
                                                            />
                                                        </div>
                                                    )}

                                                    <div className="flex-1 min-w-0">
                                                        {editingMeetingId === meeting.id ? (
                                                            <div className="flex gap-2 items-center">
                                                                <input
                                                                    type="text"
                                                                    value={editingTitle}
                                                                    onChange={(e) => setEditingTitle(e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                        if (e.key === 'Enter') updateMeetingTitle(meeting.id)
                                                                        if (e.key === 'Escape') cancelEditingTitle()
                                                                    }}
                                                                    className="flex-1 px-3 py-2 border border-primary-500/50 rounded-lg bg-dark-800 text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                                                                    autoFocus
                                                                />
                                                                <Button variant="primary" size="sm" onClick={() => updateMeetingTitle(meeting.id)}>
                                                                    Save
                                                                </Button>
                                                                <Button variant="ghost" size="sm" onClick={cancelEditingTitle}>
                                                                    Cancel
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex items-center gap-2 group/title">
                                                                <h4 className="font-bold text-lg text-white truncate group-hover/title:text-primary-400 transition-colors">
                                                                    {meeting.title}
                                                                </h4>
                                                                <button
                                                                    onClick={() => startEditingTitle(meeting)}
                                                                    className="opacity-0 group-hover/title:opacity-100 transition-all duration-200 text-gray-500 hover:text-primary-400 p-1 hover:bg-primary-500/10 rounded"
                                                                    title="Edit title"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                                    </svg>
                                                                </button>
                                                            </div>
                                                        )}
                                                        <div className="flex items-center gap-3 mt-1.5">
                                                            <p className="text-sm text-gray-400 flex items-center gap-1.5">
                                                                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                                </svg>
                                                                {new Date(meeting.created_at).toLocaleDateString()}
                                                            </p>
                                                            <span className="text-gray-600">•</span>
                                                            <p className="text-sm text-gray-400 flex items-center gap-1.5">
                                                                <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                                </svg>
                                                                {new Date(meeting.created_at).toLocaleTimeString()}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    <div className="flex gap-2 items-start">
                                                        {meeting.action_items && meeting.action_items.length > 0 && (
                                                            <Badge variant="primary" className="hidden sm:flex">
                                                                {meeting.action_items.length} actions
                                                            </Badge>
                                                        )}
                                                        {!isBulkMode && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => deleteMeeting(meeting.id)}
                                                                className="text-gray-400 hover:text-danger-400 hover:bg-danger-500/10"
                                                            >
                                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>

                                                {meeting.summary && (
                                                    <p className="text-sm text-gray-300 mt-3 line-clamp-2 pl-1 border-l-2 border-white/10">
                                                        {meeting.summary}
                                                    </p>
                                                )}

                                                {meeting.action_items && meeting.action_items.length > 0 && (
                                                    <div className="mt-4 pt-3 border-t border-white/5">
                                                        <button
                                                            onClick={() => toggleMeetingExpansion(meeting.id)}
                                                            className="text-sm font-medium text-primary-400 hover:text-primary-300 flex items-center gap-2 transition-colors w-full group/expand"
                                                        >
                                                            <div className="p-1 rounded bg-primary-500/10 group-hover/expand:bg-primary-500/20 transition-colors">
                                                                <svg className={`w-3 h-3 transition-transform duration-200 ${expandedMeetings[meeting.id] ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                                                </svg>
                                                            </div>
                                                            {expandedMeetings[meeting.id] ? 'Hide' : 'Show'} Action Items ({meeting.action_items.length})
                                                        </button>
                                                        {expandedMeetings[meeting.id] && (
                                                            <div className="mt-3 space-y-2">
                                                                {meeting.action_items.map((item, idx) => (
                                                                    <div key={idx} className="flex items-start gap-2 text-sm text-gray-300 bg-white/5 p-2 rounded">
                                                                        <span className="text-primary-400 mt-0.5">•</span>
                                                                        <span>{typeof item === 'string' ? item : item.text || JSON.stringify(item)}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                    {/* Pagination */}
                                    {totalPages > 1 && (
                                        <div className="flex flex-col sm:flex-row items-center justify-between pt-4 mt-4 border-t border-white/5 gap-4">
                                            <div className="flex items-center gap-3 text-xs text-gray-400">
                                                <span>
                                                    Showing <span className="text-white font-medium">{(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, filteredMeetings.length)}</span> of <span className="text-white font-medium">{filteredMeetings.length}</span>
                                                </span>
                                                <div className="h-4 w-px bg-white/10"></div>
                                                <select
                                                    value={pageSize}
                                                    onChange={(e) => {
                                                        setPageSize(Number(e.target.value))
                                                        setCurrentPage(1)
                                                    }}
                                                    className="bg-transparent border-none text-gray-400 focus:ring-0 cursor-pointer hover:text-white transition-colors p-0 text-xs"
                                                >
                                                    <option value="5" className="bg-dark-800">5 / page</option>
                                                    <option value="10" className="bg-dark-800">10 / page</option>
                                                    <option value="20" className="bg-dark-800">20 / page</option>
                                                    <option value="50" className="bg-dark-800">50 / page</option>
                                                </select>
                                            </div>
                                            <div className="flex items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/5">
                                                <button
                                                    onClick={() => setCurrentPage(1)}
                                                    disabled={currentPage === 1}
                                                    className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 disabled:opacity-30 transition-colors"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                    disabled={currentPage === 1}
                                                    className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 disabled:opacity-30 transition-colors"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                                    </svg>
                                                </button>
                                                <div className="flex gap-1 px-1">
                                                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                                        let page
                                                        if (totalPages <= 5) {
                                                            page = i + 1
                                                        } else if (currentPage <= 3) {
                                                            page = i + 1
                                                        } else if (currentPage >= totalPages - 2) {
                                                            page = totalPages - 4 + i
                                                        } else {
                                                            page = currentPage - 2 + i
                                                        }
                                                        return (
                                                            <button
                                                                key={page}
                                                                onClick={() => setCurrentPage(page)}
                                                                className={`w-6 h-6 flex items-center justify-center rounded-lg text-xs font-medium transition-all duration-200 ${page === currentPage
                                                                    ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/25 font-bold'
                                                                    : 'text-gray-400 hover:bg-white/10 hover:text-white'
                                                                    }`}
                                                            >
                                                                {page}
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                                <button
                                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                    disabled={currentPage === totalPages}
                                                    className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 disabled:opacity-30 transition-colors"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => setCurrentPage(totalPages)}
                                                    disabled={currentPage === totalPages}
                                                    className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 disabled:opacity-30 transition-colors"
                                                >
                                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="text-center py-16 text-gray-500">
                                    {searchQuery || dateFilter !== 'all' || filterActionItemsOnly ? (
                                        <div>
                                            <p className="text-xl font-bold text-white">No meetings found</p>
                                            <p className="text-gray-400 mt-2">Try adjusting your filters</p>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setSearchQuery('')
                                                    setDateFilter('all')
                                                    setFilterActionItemsOnly(false)
                                                    setFilterDateFrom('')
                                                    setFilterDateTo('')
                                                }}
                                                className="mt-4"
                                            >
                                                Clear Filters
                                            </Button>
                                        </div>
                                    ) : (
                                        <div>
                                            <p className="text-xl font-bold text-white">No meetings yet</p>
                                            <p className="text-gray-400 mt-2">Upload an audio or video file to get started</p>
                                            <Button
                                                variant="primary"
                                                onClick={() => navigate('/')}
                                                className="mt-4"
                                            >
                                                Upload Meeting →
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardBody>
                    </Card>
                </div>
            </div>
        </Layout>
    )
}
