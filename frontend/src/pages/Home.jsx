import React, { useState, useRef, useCallback, useEffect } from 'react'
import axios from 'axios'
import axiosInstance from '../utils/axios'
import toast from 'react-hot-toast'
import Layout from '../components/Layout'
import { Button, Card, CardHeader, CardBody, Badge, Spinner, SkeletonCard } from '../components/ui'

// Use axiosInstance (with baseURL + auth injection) for all API calls

export default function Home() {
  // State management
  const [file, setFile] = useState(null)
  const [pasted, setPasted] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [summary, setSummary] = useState('')
  const [actionItems, setActionItems] = useState([])
  const [decisions, setDecisions] = useState([])
  const [keyTopics, setKeyTopics] = useState([])
  const [meetings, setMeetings] = useState([])
  const [totalMeetings, setTotalMeetings] = useState(0)
  
  // Loading states
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [isExtractingActions, setIsExtractingActions] = useState(false)
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(false)
  const [deletingMeetingId, setDeletingMeetingId] = useState(null)
  
  // Title editing state
  const [editingMeetingId, setEditingMeetingId] = useState(null)
  const [editingTitle, setEditingTitle] = useState('')
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('all') // all, today, week, month
  const [sortBy, setSortBy] = useState('date_desc') // date_desc, date_asc, title
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(5)
  
  // Timing states
  const [transcribeTime, setTranscribeTime] = useState(0)
  const [summarizeTime, setSummarizeTime] = useState(0)
  const [actionItemsTime, setActionItemsTime] = useState(0)
  
  // Timer refs
  const transcribeTimerRef = useRef(null)
  const summarizeTimerRef = useRef(null)
  const actionItemsTimerRef = useRef(null)
  
  // Cancel token ref
  const cancelTokenRef = useRef(null)
  
  // File path state
  const [filePath, setFilePath] = useState('')
  
  // System status state
  const [systemStatus, setSystemStatus] = useState(null)
  const [isLoadingStatus, setIsLoadingStatus] = useState(false)
  
  // Advanced filter states
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterHasActions, setFilterHasActions] = useState(false)
  
  // Expandable meetings state
  const [expandedMeetings, setExpandedMeetings] = useState({})
  
  // Bulk operations state
  const [selectedMeetings, setSelectedMeetings] = useState(new Set())
  const [isBulkMode, setIsBulkMode] = useState(false)
  
  // Auto-refresh state
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(30)
  const autoRefreshTimerRef = useRef(null)
  
  // Error state
  const [error, setError] = useState(null)
  
  // Load meetings on mount
  useEffect(() => {
    fetchMeetings()
  }, [])
  
  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      autoRefreshTimerRef.current = setInterval(() => {
        fetchMeetings()
      }, refreshInterval * 1000)
    } else {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current)
        autoRefreshTimerRef.current = null
      }
    }
    
    return () => {
      if (autoRefreshTimerRef.current) {
        clearInterval(autoRefreshTimerRef.current)
      }
    }
  }, [autoRefresh, refreshInterval])
  
  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      stopTimer('transcribe')
      stopTimer('summarize')
      stopTimer('actionItems')
    }
  }, [])
  
  const fetchMeetings = async () => {
    setIsLoadingMeetings(true)
    try {
      const r = await axiosInstance.get('/meetings')
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
  
  // Timer utility functions
  const startTimer = (type) => {
    const startTime = Date.now()
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000)
      if (type === 'transcribe') {
        setTranscribeTime(elapsed)
      } else if (type === 'summarize') {
        setSummarizeTime(elapsed)
      } else if (type === 'actionItems') {
        setActionItemsTime(elapsed)
      }
    }, 1000)
    
    if (type === 'transcribe') {
      transcribeTimerRef.current = timer
    } else if (type === 'summarize') {
      summarizeTimerRef.current = timer
    } else if (type === 'actionItems') {
      actionItemsTimerRef.current = timer
    }
  }
  
  const stopTimer = (type) => {
    if (type === 'transcribe' && transcribeTimerRef.current) {
      clearInterval(transcribeTimerRef.current)
      transcribeTimerRef.current = null
    } else if (type === 'summarize' && summarizeTimerRef.current) {
      clearInterval(summarizeTimerRef.current)
      summarizeTimerRef.current = null
    } else if (type === 'actionItems' && actionItemsTimerRef.current) {
      clearInterval(actionItemsTimerRef.current)
      actionItemsTimerRef.current = null
    }
  }
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }
  
  const transcribeFile = async () => {
    if (!file && !pasted) {
      toast.error('Please select a file or paste text')
      return
    }
    
    setIsTranscribing(true)
    setUploadProgress(0)
    setTranscribeTime(0)
    setError(null)
    
    // Start timer
    startTimer('transcribe')
    
    // Create cancel token
    cancelTokenRef.current = axios.CancelToken.source()
    
    try {
      const form = new FormData()
      if (file) {
        form.append('file', file)
      } else if (pasted) {
        form.append('pasted', pasted)
      }
      
      const r = await axiosInstance.post('/transcribe', form, {
        cancelToken: cancelTokenRef.current.token,
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setUploadProgress(percent)
        }
      })
      
      setTranscript(r.data.text)
      setUploadProgress(100)
      toast.success(`Transcription complete! (${formatTime(transcribeTime)})`)
    } catch (err) {
      if (axios.isCancel(err)) {
        toast.error('Transcription cancelled')
        setError('Transcription cancelled by user')
      } else {
        toast.error(`Transcription failed: ${err.message}`)
        setError(`Transcription failed: ${err.response?.data?.error || err.message}`)
      }
    } finally {
      stopTimer('transcribe')
      setIsTranscribing(false)
      cancelTokenRef.current = null
    }
  }
  
  const cancelTranscription = () => {
    if (cancelTokenRef.current) {
      cancelTokenRef.current.cancel('User cancelled the transcription')
    }
  }
  
  const doSummarize = async () => {
    if (!transcript) {
      toast.error('Please transcribe something first')
      return
    }
    
    setIsSummarizing(true)
    setSummarizeTime(0)
    setError(null)
    
    // Start timer
    startTimer('summarize')
    
    try {
      const form = new URLSearchParams()
      form.append('text', transcript)
      const r = await axiosInstance.post('/summarize', form)
      setSummary(r.data.summary)
      // Only update the summary here. Action items/decisions/topics are extracted via the separate button.
      toast.success(`Summary generated! (${formatTime(summarizeTime)})`)
    } catch (err) {
      toast.error(`Summarization failed: ${err.message}`)
      setError(`Summarization failed: ${err.response?.data?.detail || err.message}`)
    } finally {
      stopTimer('summarize')
      setIsSummarizing(false)
    }
  }
  
  const extractActionItems = async () => {
    if (!transcript) {
      toast.error('Please transcribe something first')
      return
    }
    
    setIsExtractingActions(true)
    setActionItemsTime(0)
    setError(null)
    
    // Start timer
    startTimer('actionItems')
    
    try {
      const form = new URLSearchParams()
      form.append('text', transcript)
      form.append('meeting_date', new Date().toISOString())
      
      // Use summarize endpoint which includes action items extraction
      const r = await axiosInstance.post('/summarize', form)
      const result = r.data
      
      if (result && typeof result === 'object') {
        // Update summary if not already set
        if (result.summary && !summary) {
          setSummary(result.summary)
        }
        setActionItems(result.action_items || [])
        setDecisions(result.decisions || [])
        setKeyTopics(result.key_topics || [])
        toast.success(`Extracted ${(result.action_items || []).length} action items! (${formatTime(actionItemsTime)})`)
      }
    } catch (err) {
      toast.error(`Extraction failed: ${err.message}`)
      setError(`Action items extraction failed: ${err.response?.data?.detail || err.message}`)
    } finally {
      stopTimer('actionItems')
      setIsExtractingActions(false)
    }
  }
  
  const deleteMeeting = async (meetingId) => {
    if (!confirm('Are you sure you want to delete this meeting?')) return
    
    setDeletingMeetingId(meetingId)
    try {
      await axiosInstance.delete(`/meetings/${meetingId}`)
      toast.success('Meeting deleted successfully!')
      fetchMeetings()
    } catch (err) {
      toast.error(`Delete failed: ${err.message}`)
    } finally {
      setDeletingMeetingId(null)
    }
  }
  
  const startEditingTitle = (meeting) => {
    setEditingMeetingId(meeting.id)
    setEditingTitle(meeting.title || '')
  }
  
  const cancelEditingTitle = () => {
    setEditingMeetingId(null)
    setEditingTitle('')
  }
  
  const updateMeetingTitle = async (meetingId) => {
    if (!editingTitle.trim()) {
      toast.error('Title cannot be empty')
      return
    }
    
    try {
      await axios.put(`${API_ROOT}/meetings/${meetingId}`, {
        title: editingTitle.trim()
      })
      toast.success('Title updated successfully!')
      setEditingMeetingId(null)
      setEditingTitle('')
      fetchMeetings()
    } catch (err) {
      toast.error(`Update failed: ${err.message}`)
    }
  }
  
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      toast.success(`${label} copied to clipboard!`)
    }).catch(err => {
      toast.error(`Failed to copy: ${err.message}`)
    })
  }
  
  const downloadText = (filename, text) => {
    const blob = new Blob([text || ''], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
    toast.success('File downloaded!')
  }
  
  // Save Meeting
  const saveMeeting = async () => {
    const title = prompt('Enter meeting title:', 'Untitled Meeting')
    if (!title) return
    
    try {
      const form = new URLSearchParams()
      form.append('title', title)
      form.append('transcript', transcript)
      form.append('summary', summary)
      if (actionItems.length) form.append('action_items', JSON.stringify(actionItems))
      if (decisions.length) form.append('decisions', JSON.stringify(decisions))
      if (keyTopics.length) form.append('key_topics', JSON.stringify(keyTopics))
      
      const resp = await axiosInstance.post('/save', form)
      const newId = resp?.data?.id
      
      // Clear form after successful save
      setTranscript('')
      setSummary('')
      setActionItems([])
      setDecisions([])
      setKeyTopics([])
      setFile(null)
      setPasted('')
      setUploadProgress(0)
      
      await fetchMeetings()
      toast.success(`Meeting saved successfully${newId ? ' (ID: ' + newId.slice(-6) + ')' : ''}!`)
    } catch (err) {
      toast.error(`Save failed: ${err.message}`)
      setError(`Save failed: ${err.response?.data?.detail || err.message}`)
    }
  }
  
  // Transcribe from file path
  const transcribeFromPath = async () => {
    if (!filePath) {
      toast.error('Please enter a file path')
      return
    }
    
    setIsTranscribing(true)
    setTranscribeTime(0)
    setError(null)
    
    startTimer('transcribe')
    
    try {
      const form = new URLSearchParams()
      form.append('file_path', filePath)
      const r = await axiosInstance.post('/transcribe-path', form)
      setTranscript(r.data.text)
      toast.success(`Transcription complete! (${formatTime(transcribeTime)})`)
    } catch (err) {
      toast.error(`Path transcription failed: ${err.message}`)
      setError(`Path transcription failed: ${err.response?.data?.detail || err.message}`)
    } finally {
      stopTimer('transcribe')
      setIsTranscribing(false)
    }
  }
  
  // Fetch system status
  const fetchStatus = async () => {
    setIsLoadingStatus(true)
    try {
      const r = await axiosInstance.get('/status')
      setSystemStatus(r.data)
      toast.success('Status loaded')
    } catch (err) {
      toast.error(`Failed to load status: ${err.message}`)
    } finally {
      setIsLoadingStatus(false)
    }
  }
  
  // Toggle meeting expansion
  const toggleMeetingExpansion = (meetingId) => {
    setExpandedMeetings(prev => ({
      ...prev,
      [meetingId]: !prev[meetingId]
    }))
  }
  
  // Bulk operations
  const toggleMeetingSelection = (meetingId) => {
    setSelectedMeetings(prev => {
      const newSet = new Set(prev)
      if (newSet.has(meetingId)) {
        newSet.delete(meetingId)
      } else {
        newSet.add(meetingId)
      }
      return newSet
    })
  }
  
  const selectAllMeetings = () => {
    setSelectedMeetings(new Set(paginatedMeetings.map(m => m.id)))
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
      `Title: ${m.title}\nDate: ${new Date(m.created_at).toLocaleString()}\n\nTranscript:\n${m.transcript || 'N/A'}\n\nSummary:\n${m.summary || 'N/A'}\n\n${'-'.repeat(80)}\n\n`
    ).join('')
    
    downloadText('meetings-export.txt', exportText)
    toast.success(`Exported ${selectedMeetings.size} meetings`)
  }
  
  const handleDragOver = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])
  
  const handleDragLeave = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])
  
  const handleDrop = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    
    const files = Array.from(e.dataTransfer.files)
    if (files.length > 0) {
      setFile(files[0])
      setPasted('')
      toast.success(`File selected: ${files[0].name}`)
    }
  }, [])
  
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
    
    // Date filter (basic)
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
    
    // Advanced date filters (from/to)
    if (filterDateFrom) {
      const fromDate = new Date(filterDateFrom)
      filtered = filtered.filter(m => new Date(m.created_at) >= fromDate)
    }
    
    if (filterDateTo) {
      const toDate = new Date(filterDateTo)
      toDate.setHours(23, 59, 59, 999) // End of day
      filtered = filtered.filter(m => new Date(m.created_at) <= toDate)
    }
    
    // Filter by action items
    if (filterHasActions) {
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
  }, [meetings, searchQuery, dateFilter, sortBy, filterDateFrom, filterDateTo, filterHasActions])
  
  // Paginated meetings
  const paginatedMeetings = React.useMemo(() => {
    const startIdx = (currentPage - 1) * itemsPerPage
    const endIdx = startIdx + itemsPerPage
    return filteredMeetings.slice(startIdx, endIdx)
  }, [filteredMeetings, currentPage, itemsPerPage])
  
  const totalPages = Math.ceil(filteredMeetings.length / itemsPerPage)
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, dateFilter, sortBy])
  
  return (
    <Layout>
      {/* All the JSX from original App.jsx goes here, starting from line 630 */}
      {/* I'll continue with the rest of the component... */}
    </Layout>
  )
}
