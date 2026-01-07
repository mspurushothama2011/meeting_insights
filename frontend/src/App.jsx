import React, { useState, useRef, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import axiosInstance from './utils/axios'
import toast from 'react-hot-toast'
import Layout from './components/Layout'
import { Button, Card, CardHeader, CardBody, Badge, Spinner, SkeletonCard } from './components/ui'


// Get API URL from environment variable or use default
const getApiUrl = () => {
  return (
    import.meta.env.VITE_API_ROOT ||
    import.meta.env.VITE_API_URL ||
    (window.location.origin.includes('5173') ? 'http://localhost:8080' : window.location.origin) ||
    'http://localhost:8080'
  );
};

const API_ROOT = getApiUrl();
console.log('[App] Using API URL:', API_ROOT);

export default function App() {
  const navigate = useNavigate()
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

  // ---------- Auto-save state ----------
  const [autosaveEnabled, setAutosaveEnabled] = useState(true)
  const [savedMeetingId, setSavedMeetingId] = useState(null)
  const [isAutoSaving, setIsAutoSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const autosaveTimerRef = useRef(null)

  // Draft recovery state
  const [showDraftBanner, setShowDraftBanner] = useState(false)
  const [draftData, setDraftData] = useState(null)

  // Tabbed interface state
  const [activeTab, setActiveTab] = useState('transcript')

  // Modal state
  const [showTranscriptModal, setShowTranscriptModal] = useState(false)
  const [showSummaryModal, setShowSummaryModal] = useState(false)
  const [showAnalysisModal, setShowAnalysisModal] = useState(false)

  // Process All state
  const [isProcessingAll, setIsProcessingAll] = useState(false)
  const [processingStep, setProcessingStep] = useState('') // 'transcribe', 'summarize', 'extract', 'complete'
  const [showAdvancedButtons, setShowAdvancedButtons] = useState(false)

  // Skip to content ref
  const skipToContentRef = useRef(null)

  // Load meetings on mount and check for drafts
  useEffect(() => {
    fetchMeetings()
    checkForDraft()
  }, [])

  // Check for unsaved draft in localStorage
  const checkForDraft = () => {
    try {
      const draft = localStorage.getItem('meeting_draft')
      if (draft) {
        const parsed = JSON.parse(draft)
        const draftAge = Date.now() - (parsed.timestamp || 0)
        // Show banner if draft is less than 24 hours old
        if (draftAge < 24 * 60 * 60 * 1000) {
          setDraftData(parsed)
          setShowDraftBanner(true)
        } else {
          // Clear old drafts
          localStorage.removeItem('meeting_draft')
        }
      }
    } catch (err) {
      console.error('Failed to load draft:', err)
    }
  }

  // Restore draft from localStorage
  const restoreDraft = () => {
    if (draftData) {
      setEditingTitle(draftData.title || '')
      setTranscript(draftData.transcript || '')
      setSummary(draftData.summary || '')
      setActionItems(draftData.actionItems || [])
      setDecisions(draftData.decisions || [])
      setKeyTopics(draftData.keyTopics || [])
      toast.success('Draft restored successfully')
    }
    setShowDraftBanner(false)
    localStorage.removeItem('meeting_draft')
  }

  // Discard draft
  const discardDraft = () => {
    setShowDraftBanner(false)
    localStorage.removeItem('meeting_draft')
    toast.success('Draft discarded')
  }

  // Debounced search effect - re-fetch meetings when search query changes
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      fetchMeetings()
    }, 300) // 300ms debounce

    return () => clearTimeout(debounceTimer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery])

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
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    }
  }, [])

  // Save draft to localStorage as offline fallback
  const saveDraftToLocalStorage = () => {
    try {
      const draft = {
        title: editingTitle,
        transcript,
        summary,
        actionItems,
        decisions,
        keyTopics,
        timestamp: Date.now()
      }
      localStorage.setItem('meeting_draft', JSON.stringify(draft))
    } catch (err) {
      console.error('Failed to save draft to localStorage:', err)
    }
  }

  // Debounced auto-save when content changes
  const scheduleAutosave = (reason = 'change') => {
    if (!autosaveEnabled) return
    if (!transcript && !summary && actionItems.length === 0 && decisions.length === 0 && keyTopics.length === 0) return

    // Save to localStorage as backup
    saveDraftToLocalStorage()

    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = setTimeout(() => {
      void performAutoSave(reason)
    }, 1500)
  }

  const performAutoSave = async (reason = 'change') => {
    if (!autosaveEnabled) return
    if (!transcript && !summary) return
    setIsAutoSaving(true)
    try {
      if (savedMeetingId) {
        // Update existing meeting
        await axiosInstance.put(`/meetings/${savedMeetingId}`, {
          title: editingTitle || undefined,
          transcript: transcript || undefined,
          summary: summary || undefined,
        })
      } else {
        // Create new meeting
        const form = new URLSearchParams()
        form.append('title', editingTitle || 'Untitled Meeting')
        form.append('transcript', transcript || '')
        form.append('summary', summary || '')
        const resp = await axiosInstance.post('/save', form)
        const newId = resp?.data?.id
        if (newId) setSavedMeetingId(newId)
      }
      setLastSavedAt(new Date())
      setError(null)
      // Clear localStorage draft on successful save
      localStorage.removeItem('meeting_draft')
    } catch (err) {
      setError(`Autosave failed: ${err.response?.data?.detail || err.message}`)
      // Keep localStorage draft on failure as backup
    } finally {
      setIsAutoSaving(false)
    }
  }

  useEffect(() => {
    scheduleAutosave('content-change')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingTitle, transcript, summary, actionItems, decisions, keyTopics])

  const fetchMeetings = async () => {
    setIsLoadingMeetings(true)
    console.log('Fetching meetings from:', `${API_ROOT}/meetings`)
    try {
      // Include search query parameter if present
      const params = {}
      if (searchQuery && searchQuery.trim()) {
        params.search = searchQuery.trim()
      }

      const r = await axiosInstance.get('/meetings', { params })
      setMeetings(r.data.meetings || [])
      setTotalMeetings(r.data.total || 0)
      toast.success('Meetings loaded')
    } catch (err) {
      console.error('Failed to load meetings:', err)
      console.error('API URL was:', `${API_ROOT}/meetings`)
      toast.error(`Failed to load meetings: ${err.message}`)
    } finally {
      setIsLoadingMeetings(false)
    }
  }

  // Clear all content when a new file is selected
  const clearAllContent = () => {
    setTranscript('')
    setSummary('')
    setActionItems([])
    setDecisions([])
    setKeyTopics([])
    setUploadProgress(0)
    setError(null)
    setSavedMeetingId(null)
    setEditingTitle('')
    setLastSavedAt(null)
    // Clear localStorage draft
    localStorage.removeItem('meeting_draft')
    setShowDraftBanner(false)
    setDraftData(null)
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
      // Auto-save is handled by useEffect watching transcript changes
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
      // Auto-save is handled by useEffect watching summary changes
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
        scheduleAutosave('analysis')
      }
    } catch (err) {
      toast.error(`Extraction failed: ${err.message}`)
      setError(`Action items extraction failed: ${err.response?.data?.detail || err.message}`)
    } finally {
      stopTimer('actionItems')
      setIsExtractingActions(false)
    }
  }

  // Process All - run transcribe, summarize, and extract sequentially
  const processAll = async () => {
    if (!file && !pasted) {
      toast.error('Please upload a file or paste transcript')
      return
    }

    setIsProcessingAll(true)
    let currentTranscript = transcript // Keep track of current transcript value

    try {
      // Step 1: Transcribe (only if we don't already have a transcript)
      if (!transcript || transcript.trim() === '') {
        setProcessingStep('transcribe')

        // Run transcription inline to capture the result
        if (!file && !pasted) {
          throw new Error('No file or pasted text available')
        }

        setIsTranscribing(true)
        setUploadProgress(0)
        setTranscribeTime(0)
        setError(null)
        startTimer('transcribe')
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

          currentTranscript = r.data.text // Store the transcript value
          setTranscript(currentTranscript)
          setUploadProgress(100)
          scheduleAutosave('transcription')
        } catch (err) {
          if (axios.isCancel(err)) {
            throw new Error('Transcription cancelled')
          } else {
            throw new Error(`Transcription failed: ${err.response?.data?.error || err.message}`)
          }
        } finally {
          stopTimer('transcribe')
          setIsTranscribing(false)
          cancelTokenRef.current = null
        }
      } else {
        // Use existing transcript
        currentTranscript = transcript
      }

      // Wait a moment for state to settle
      await new Promise(resolve => setTimeout(resolve, 300))

      // Step 2: Summarize
      if (currentTranscript && currentTranscript.trim()) {
        setProcessingStep('summarize')

        setIsSummarizing(true)
        setSummarizeTime(0)
        startTimer('summarize')

        try {
          const form = new URLSearchParams()
          form.append('text', currentTranscript)
          const r = await axiosInstance.post('/summarize', form)
          setSummary(r.data.summary)
          scheduleAutosave('summarization')
        } catch (err) {
          console.error('Summarization error:', err)
          // Continue even if summarization fails
        } finally {
          stopTimer('summarize')
          setIsSummarizing(false)
        }
      }

      // Wait a moment for state to settle
      await new Promise(resolve => setTimeout(resolve, 300))

      // Step 3: Extract Actions
      if (currentTranscript && currentTranscript.trim()) {
        setProcessingStep('extract')

        setIsExtractingActions(true)
        setActionItemsTime(0)
        startTimer('actionItems')

        try {
          const form = new URLSearchParams()
          form.append('text', currentTranscript)
          form.append('meeting_date', new Date().toISOString())
          const r = await axiosInstance.post('/summarize', form)
          const result = r.data

          if (result && typeof result === 'object') {
            setActionItems(result.action_items || [])
            setDecisions(result.decisions || [])
            setKeyTopics(result.key_topics || [])
            scheduleAutosave('action_extraction')
          }
        } catch (err) {
          console.error('Action extraction error:', err)
          // Continue even if extraction fails
        } finally {
          stopTimer('actionItems')
          setIsExtractingActions(false)
        }
      }

      setProcessingStep('complete')
      toast.success('✅ All processing complete!')

    } catch (error) {
      console.error('Error in processAll:', error)
      const stepName = processingStep === 'transcribe' ? 'transcription' :
        processingStep === 'summarize' ? 'summarization' :
          processingStep === 'extract' ? 'action extraction' : 'processing'
      toast.error(`Failed during ${stepName}: ${error.message}`)
      setError(`Processing failed: ${error.message}`)
    } finally {
      setIsProcessingAll(false)
      setProcessingStep('')
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
      await axiosInstance.put(`/meetings/${meetingId}`, {
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
      `Title: ${m.title}
Date: ${new Date(m.created_at).toLocaleString()}

Transcript:
${m.transcript || 'N/A'}

Summary:
${m.summary || 'N/A'}

${'-'.repeat(80)}

`
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
      clearAllContent()  // Clear old content
      setFile(files[0])
      setPasted('')
      toast.success(`File selected: ${files[0].name}`)
    }
  }, [])

  // Filter and sort meetings (search is now handled by backend)
  const filteredMeetings = React.useMemo(() => {
    let filtered = [...meetings]

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

  // Focus skip link on keyboard navigation
  useEffect(() => {
    const handleTabKey = (e) => {
      if (e.key === 'Tab') {
        if (skipToContentRef.current) {
          skipToContentRef.current.classList.remove('sr-only')
        }
      }
    }

    document.addEventListener('keydown', handleTabKey)
    return () => document.removeEventListener('keydown', handleTabKey)
  }, [])

  return (
    <Layout hideFooter={showTranscriptModal || showSummaryModal || showAnalysisModal}>
      {/* Skip to content link for accessibility */}
      <a
        href="#main-content"
        ref={skipToContentRef}
        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 z-50 bg-primary-600 text-white px-4 py-2 rounded-lg"
      >
        Skip to main content
      </a>

      <div id="main-content" className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8 space-y-6">
          {/* Error Display Panel */}
          {error && (
            <div className="animate-shake">
              <Card
                aria-label="Error notification"
                className="border-danger-500/30 shadow-lg shadow-danger-500/10"
              >
                <CardBody className="bg-danger-500/10">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 bg-danger-500/20 rounded-lg">
                        <svg className="w-6 h-6 text-danger-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-lg">Error</h4>
                        <p className="text-danger-200 mt-1">{error}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setError(null)}
                      className="text-danger-400 hover:text-white transition-colors p-1 hover:bg-danger-500/20 rounded-lg"
                      aria-label="Close error message"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </CardBody>
              </Card>
            </div>
          )}

          {/* Draft Recovery Banner */}
          {showDraftBanner && draftData && (
            <div className="animate-slide-up-fade">
              <Card
                aria-label="Draft recovery notification"
                className="border-primary-500/30 shadow-lg shadow-primary-500/10"
              >
                <CardBody className="bg-primary-500/10">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-2 bg-primary-500/20 rounded-lg">
                        <svg className="w-6 h-6 text-primary-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                        </svg>
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-white text-lg">Unsaved Draft Found</h4>
                        <p className="text-primary-200 mt-1">
                          You have an unsaved draft from {new Date(draftData.timestamp).toLocaleString()}. Would you like to restore it?
                        </p>
                        {draftData.title && (
                          <p className="text-sm text-primary-300 mt-2 font-mono bg-primary-500/10 inline-block px-2 py-1 rounded">
                            Title: {draftData.title}
                          </p>
                        )}
                        <div className="flex gap-3 mt-4">
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={restoreDraft}
                            aria-label="Restore draft"
                          >
                            Restore Draft
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={discardDraft}
                            className="text-primary-300 hover:text-white hover:bg-primary-500/20"
                            aria-label="Discard draft"
                          >
                            Discard
                          </Button>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={discardDraft}
                      className="text-primary-400 hover:text-white transition-colors p-1 hover:bg-primary-500/20 rounded-lg"
                      aria-label="Close draft banner"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </CardBody>
              </Card>
            </div>
          )}

          {/* System Status Panel */}
          {systemStatus && (
            <Card
              aria-label="System status information"
              className="animate-scale-in"
            >
              <CardHeader>
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-success-500 animate-pulse"></div>
                    System Status
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSystemStatus(null)}
                    aria-label="Close system status"
                  >
                    ✕
                  </Button>
                </div>
              </CardHeader>
              <CardBody>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                    <span className="text-gray-400 block mb-1">Status</span>
                    <span className="font-medium text-success-400 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Online
                    </span>
                  </div>
                  <div className="p-3 bg-white/5 rounded-lg border border-white/5">
                    <span className="text-gray-400 block mb-1">API Version</span>
                    <span className="font-medium text-white font-mono">{systemStatus.version || 'N/A'}</span>
                  </div>
                  {systemStatus.config && Object.entries(systemStatus.config).map(([key, value]) => (
                    <div key={key} className="p-3 bg-white/5 rounded-lg border border-white/5 col-span-2">
                      <span className="text-gray-400 block mb-1">{key}</span>
                      <span className="font-medium text-white text-xs font-mono break-all">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          )}

          {/* Upload Section */}
          <Card
            aria-label="Upload meeting recording"
            className="relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

            <CardHeader>
              <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-lg shadow-lg shadow-primary-500/20">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                Upload Meeting Recording
              </h2>
              <p className="text-gray-400 mt-2 ml-1">
                Upload an audio/video file or paste transcript text to get started
              </p>
            </CardHeader>
            <CardBody className="space-y-6">
              {/* Drag & Drop Zone */}
              <div
                onClick={() => document.getElementById('fileInput').click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-300 group
                ${isDragging
                    ? 'border-primary-500 bg-primary-500/10 scale-[1.02] shadow-xl shadow-primary-500/10'
                    : 'border-white/10 hover:border-primary-500/50 hover:bg-white/5'
                  }
              `}
                aria-label="Drag and drop file upload area"
                tabIndex="0"
                role="button"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    document.getElementById('fileInput').click()
                  }
                }}
              >
                <div className="flex flex-col items-center relative z-10">
                  <div className={`w-20 h-20 mb-6 rounded-full flex items-center justify-center transition-all duration-300 ${isDragging ? 'bg-primary-500/20 text-primary-400' : 'bg-white/5 text-gray-400 group-hover:bg-primary-500/10 group-hover:text-primary-400'
                    }`}>
                    <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                  </div>
                  <p className="text-lg font-medium text-white mb-2">
                    {isDragging ? (
                      <span className="text-primary-400">Drop file here</span>
                    ) : (
                      <>
                        <span className="text-primary-400">Click to upload</span> or drag and drop
                      </>
                    )}
                  </p>
                  <p className="text-sm text-gray-400 mb-1">
                    Audio/Video files (WAV, MP3, MP4, AVI, MOV, MKV, OGG, WEBM)
                  </p>
                  <p className="text-xs text-gray-500">
                    Max file size: 500MB
                  </p>
                </div>
                <input
                  type="file"
                  onChange={e => {
                    clearAllContent()  // Clear old content
                    setFile(e.target.files[0])
                    setPasted('')
                  }}
                  accept=".wav,.mp3,.m4a,.ogg,.webm,.mp4,.avi,.mov,.mkv"
                  className="hidden"
                  id="fileInput"
                  aria-label="File input"
                />
              </div>

              {/* Selected File Display */}
              {file && (
                <div className="flex items-center justify-between p-4 bg-success-500/10 rounded-xl border border-success-500/20 animate-slide-up-fade">
                  <div className="flex items-center space-x-4">
                    <div className="p-2 bg-success-500/20 rounded-lg text-success-400">
                      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 3-2 3 2zm0 0v-8" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-white">{file.name}</p>
                      <p className="text-xs text-success-300 font-mono mt-0.5">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setFile(null)
                      setUploadProgress(0)
                    }}
                    className="text-gray-400 hover:text-danger-400 hover:bg-danger-500/10"
                    aria-label="Remove selected file"
                  >
                    Remove
                  </Button>
                </div>
              )}

              {/* Upload Progress Bar */}
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="space-y-2 animate-pulse">
                  <div className="flex justify-between text-sm">
                    <span className="text-primary-300">Uploading...</span>
                    <span className="font-medium text-white">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-primary-600 to-secondary-500 h-2 rounded-full transition-all duration-300 ease-out shadow-[0_0_10px_rgba(99,102,241,0.5)]"
                      style={{ width: `${uploadProgress}%` }}
                      role="progressbar"
                      aria-valuenow={uploadProgress}
                      aria-valuemin="0"
                      aria-valuemax="100"
                      aria-label="Upload progress"
                    />
                  </div>
                </div>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center" aria-hidden="true">
                  <div className="w-full border-t border-white/10"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-dark-800 text-sm text-gray-500">OR</span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Paste Transcript
                  </label>
                  <textarea
                    value={pasted}
                    onChange={e => {
                      if (e.target.value && !pasted) {
                        clearAllContent()  // Clear old content when starting to paste
                      }
                      setPasted(e.target.value)
                      setFile(null)
                    }}
                    rows={4}
                    placeholder="Paste transcript text here..."
                    className="w-full px-4 py-3 border border-white/10 rounded-xl 
                           bg-white/5 text-white placeholder-gray-500
                           focus:ring-2 focus:ring-primary-500 focus:border-transparent
                           transition-all resize-none"
                    aria-label="Paste transcript text"
                  />
                  {pasted && (
                    <p className="text-xs text-gray-400 mt-2 text-right">
                      {pasted.length} chars, {pasted.split(/\s+/).filter(w => w).length} words
                    </p>
                  )}
                </div>

                {/* File Path Input */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Server File Path
                  </label>
                  <div className="flex flex-col gap-3">
                    <input
                      type="text"
                      value={filePath}
                      onChange={e => setFilePath(e.target.value)}
                      placeholder="/path/to/audio/file.wav"
                      className="w-full px-4 py-3 border border-white/10 rounded-xl 
                             bg-white/5 text-white placeholder-gray-500
                             focus:ring-2 focus:ring-primary-500 focus:border-transparent
                             transition-all"
                      aria-label="Server file path"
                    />
                    <Button
                      variant="secondary"
                      onClick={transcribeFromPath}
                      loading={isTranscribing}
                      disabled={!filePath || isTranscribing}
                      className="w-full justify-center"
                      aria-label="Transcribe from file path"
                    >
                      Transcribe Path
                    </Button>
                  </div>
                </div>
              </div>

              {/* Timing Display */}
              {(isTranscribing || isSummarizing || isExtractingActions) && (
                <div className="flex gap-4 p-4 bg-primary-500/10 rounded-xl border border-primary-500/20 animate-pulse">
                  {isTranscribing && transcribeTime > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce"></div>
                      <span className="font-medium text-white">Transcribing: {formatTime(transcribeTime)}</span>
                    </div>
                  )}
                  {isSummarizing && summarizeTime > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-secondary-400 rounded-full animate-bounce delay-75"></div>
                      <span className="font-medium text-white">Summarizing: {formatTime(summarizeTime)}</span>
                    </div>
                  )}
                  {isExtractingActions && actionItemsTime > 0 && (
                    <div className="flex items-center gap-2 text-sm">
                      <div className="w-2 h-2 bg-accent-400 rounded-full animate-bounce delay-150"></div>
                      <span className="font-medium text-white">Extracting: {formatTime(actionItemsTime)}</span>
                    </div>
                  )}
                </div>
              )}


              {/* Process All Progress Indicator */}
              {isProcessingAll && (
                <div className="flex items-center justify-between p-4 bg-primary-500/10 rounded-xl border border-primary-500/20 animate-pulse mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    {processingStep === 'transcribe' && (
                      <>
                        <div className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" />
                        <span className="font-medium text-white">Transcribing...</span>
                      </>
                    )}
                    {processingStep === 'summarize' && (
                      <>
                        <div className="w-2 h-2 bg-secondary-400 rounded-full animate-bounce" />
                        <span className="font-medium text-white">Summarizing...</span>
                      </>
                    )}
                    {processingStep === 'extract' && (
                      <>
                        <div className="w-2 h-2 bg-accent-400 rounded-full animate-bounce" />
                        <span className="font-medium text-white">Extracting actions...</span>
                      </>
                    )}
                  </div>

                  {/* Progress Dots */}
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full transition-colors ${processingStep === 'transcribe' || processingStep === 'summarize' || processingStep === 'extract' || processingStep === 'complete' ? 'bg-primary-500' : 'bg-gray-600'}`} />
                    <div className={`w-2 h-2 rounded-full transition-colors ${processingStep === 'summarize' || processingStep === 'extract' || processingStep === 'complete' ? 'bg-secondary-500' : 'bg-gray-600'}`} />
                    <div className={`w-2 h-2 rounded-full transition-colors ${processingStep === 'extract' || processingStep === 'complete' ? 'bg-accent-500' : 'bg-gray-600'}`} />
                  </div>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3 pt-2">
                {/* Process All Button */}
                <Button
                  variant="primary"
                  size="xs"
                  onClick={processAll}
                  loading={isProcessingAll}
                  disabled={(!file && !pasted) || isProcessingAll || isTranscribing || isSummarizing || isExtractingActions}
                  className="font-bold shadow-lg shadow-primary-500/30"
                  aria-label="Process all: transcribe, summarize, and extract"
                >
                  🚀 Process All
                </Button>

                {/* Advanced Toggle */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAdvancedButtons(!showAdvancedButtons)}
                  className="text-gray-400 hover:text-white"
                  aria-label={showAdvancedButtons ? "Hide advanced options" : "Show advanced options"}
                >
                  ⚙️ Advanced {showAdvancedButtons ? '▲' : '▼'}
                </Button>

                {/* Individual Buttons (Collapsible) */}
                {showAdvancedButtons && (
                  <>
                    <div className="w-px h-8 bg-white/10" />
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={transcribeFile}
                      loading={isTranscribing}
                      disabled={(!file && !pasted) || isTranscribing || isProcessingAll}
                      aria-label="Transcribe only"
                    >
                      {isTranscribing ? 'Transcribing...' : 'Transcribe'}
                    </Button>

                    {isTranscribing && (
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={cancelTranscription}
                        aria-label="Cancel transcription"
                      >
                        Cancel
                      </Button>
                    )}

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={doSummarize}
                      loading={isSummarizing}
                      disabled={!transcript || isSummarizing || isProcessingAll}
                      aria-label="Summarize only"
                    >
                      {isSummarizing ? 'Summarizing...' : 'Summarize'}
                    </Button>

                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={extractActionItems}
                      loading={isExtractingActions}
                      disabled={!transcript || isExtractingActions || isProcessingAll}
                      aria-label="Extract actions only"
                    >
                      {isExtractingActions ? 'Extracting...' : 'Extract'}
                    </Button>
                  </>
                )}

                <div className="w-px h-8 bg-white/10" />

                {/* Save Button */}
                <Button
                  variant="success"
                  size="sm"
                  onClick={saveMeeting}
                  disabled={!transcript}
                  aria-label="Save meeting"
                >
                  💾 Save
                </Button>

                {/* Auto-save toggle/status */}
                <div className="flex items-center gap-2 ml-auto px-3 py-1.5 bg-white/5 rounded-lg border border-white/5">
                  <label className="flex items-center gap-1.5 text-xs text-gray-300 cursor-pointer select-none">
                    <div className="relative inline-block w-8 mr-1 align-middle select-none transition duration-200 ease-in">
                      <input
                        type="checkbox"
                        checked={autosaveEnabled}
                        onChange={e => setAutosaveEnabled(e.target.checked)}
                        className="toggle-checkbox absolute block w-4 h-4 rounded-full bg-white border-4 appearance-none cursor-pointer"
                        style={{ right: autosaveEnabled ? '0' : 'auto', left: autosaveEnabled ? 'auto' : '0', borderColor: autosaveEnabled ? '#6366f1' : '#4b5563' }}
                        aria-label="Toggle auto-save"
                      />
                      <label className={`toggle-label block overflow-hidden h-4 rounded-full cursor-pointer ${autosaveEnabled ? 'bg-primary-500' : 'bg-gray-700'}`}></label>
                    </div>
                    Auto
                  </label>
                  <span className="text-[10px] text-gray-500 font-mono border-l border-white/10 pl-2" aria-live="polite">
                    {isAutoSaving ? 'Saving…' : lastSavedAt ? lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : savedMeetingId ? 'Saved' : 'Not saved'}
                  </span>
                </div>
              </div>

            </CardBody>
          </Card>

          {/* Compact Meeting Content Card with Modal Triggers */}
          {(transcript || summary || actionItems.length > 0 || decisions.length > 0 || keyTopics.length > 0) && (
            <>
              <Card
                aria-label="Meeting content"
                className="animate-slide-up-fade"
              >
                <CardHeader>
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <div className="p-1.5 bg-primary-500/20 rounded-lg">
                      <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    Meeting Content
                  </h3>
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {transcript && (
                      <Badge variant="primary">{transcript.split(/\s+/).length} words</Badge>
                    )}
                    {summary && (
                      <Badge variant="secondary">Summary available</Badge>
                    )}
                    {(actionItems.length + decisions.length) > 0 && (
                      <Badge variant="accent">{actionItems.length + decisions.length} items</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardBody>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {/* Transcript Button */}
                    {transcript && (
                      <button
                        onClick={() => setShowTranscriptModal(true)}
                        className="p-4 bg-primary-500/10 hover:bg-primary-500/20 border border-primary-500/20 hover:border-primary-500/40 rounded-xl transition-all duration-300 group text-left"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-primary-500/20 rounded-lg group-hover:scale-110 transition-transform">
                            <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                          <span className="font-bold text-white">Transcript</span>
                        </div>
                        <div className="text-xs text-gray-400 font-mono">
                          {transcript.split(/\s+/).length} words • {transcript.length} chars
                        </div>
                      </button>
                    )}

                    {/* Summary Button */}
                    {summary && (
                      <button
                        onClick={() => setShowSummaryModal(true)}
                        className="p-4 bg-secondary-500/10 hover:bg-secondary-500/20 border border-secondary-500/20 hover:border-secondary-500/40 rounded-xl transition-all duration-300 group text-left"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-secondary-500/20 rounded-lg group-hover:scale-110 transition-transform">
                            <svg className="w-5 h-5 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                          <span className="font-bold text-white">Summary</span>
                        </div>
                        <div className="text-xs text-gray-400">
                          AI-generated overview
                        </div>
                      </button>
                    )}

                    {/* Analysis Button */}
                    {(actionItems.length > 0 || decisions.length > 0 || keyTopics.length > 0) && (
                      <button
                        onClick={() => setShowAnalysisModal(true)}
                        className="p-4 bg-accent-500/10 hover:bg-accent-500/20 border border-accent-500/20 hover:border-accent-500/40 rounded-xl transition-all duration-300 group text-left"
                      >
                        <div className="flex items-center gap-3 mb-2">
                          <div className="p-2 bg-accent-500/20 rounded-lg group-hover:scale-110 transition-transform">
                            <svg className="w-5 h-5 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                            </svg>
                          </div>
                          <span className="font-bold text-white">Analysis</span>
                        </div>
                        <div className="text-xs text-gray-400">
                          {actionItems.length} actions • {decisions.length} decisions
                        </div>
                      </button>
                    )}
                  </div>
                </CardBody>
              </Card>

              {/* Transcript Modal */}
              {showTranscriptModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
                  <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={() => setShowTranscriptModal(false)}
                  />
                  <div className="relative max-w-6xl w-full max-h-[90vh] glass-panel rounded-2xl shadow-2xl animate-scale-in overflow-hidden">
                    <div className="border-b border-white/5 bg-white/5 px-6 py-4 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-primary-500/20 rounded-lg">
                          <svg className="w-5 h-5 text-primary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white">Transcript</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-gray-500 font-mono">{transcript.split(/\s+/).length} words</span>
                            <span className="text-gray-600">•</span>
                            <span className="text-xs text-gray-500 font-mono">{transcript.length} chars</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(transcript, 'Transcript')}
                          className="text-gray-400 hover:text-white"
                          title="Copy"
                        >
                          📋
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadText('transcript.txt', transcript)}
                          className="text-gray-400 hover:text-white"
                          title="Export"
                        >
                          ⬇
                        </Button>
                        <button
                          onClick={() => setShowTranscriptModal(false)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                          title="Close (Esc)"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="overflow-y-auto max-h-[calc(90vh-100px)] bg-black/20">
                      <div className="relative group">
                        <div className="absolute top-0 left-0 w-full h-4 bg-gradient-to-b from-black/20 to-transparent pointer-events-none z-10" />
                        <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed text-gray-300 p-6">
                          {transcript}
                        </pre>
                        <div className="absolute bottom-0 left-0 w-full h-4 bg-gradient-to-t from-black/20 to-transparent pointer-events-none z-10" />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Summary Modal */}
              {showSummaryModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
                  <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={() => setShowSummaryModal(false)}
                  />
                  <div className="relative max-w-4xl w-full max-h-[90vh] glass-panel rounded-2xl shadow-2xl animate-scale-in overflow-hidden">
                    <div className="border-b border-white/5 bg-white/5 px-6 py-4 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-secondary-500/20 rounded-lg">
                          <svg className="w-5 h-5 text-secondary-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <h3 className="text-xl font-bold text-white">Summary</h3>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(summary, 'Summary')}
                          className="text-gray-400 hover:text-white"
                          title="Copy"
                        >
                          📋
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => downloadText('summary.md', `# Summary\n\n${summary}`)}
                          className="text-gray-400 hover:text-white"
                          title="Export"
                        >
                          ⬇
                        </Button>
                        <button
                          onClick={() => setShowSummaryModal(false)}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                          title="Close (Esc)"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="overflow-y-auto max-h-[calc(90vh-100px)] p-6">
                      <div className="bg-white/5 rounded-xl p-6 border border-white/5">
                        <p className="text-gray-300 leading-relaxed text-lg">
                          {summary}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Analysis Modal */}
              {showAnalysisModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in">
                  <div
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={() => setShowAnalysisModal(false)}
                  />
                  <div className="relative max-w-5xl w-full max-h-[90vh] glass-panel rounded-2xl shadow-2xl animate-scale-in overflow-hidden">
                    <div className="border-b border-white/5 bg-white/5 px-6 py-4 flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-accent-500/20 rounded-lg">
                          <svg className="w-5 h-5 text-accent-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white">Meeting Analysis</h3>
                          <div className="flex gap-2 mt-1">
                            {actionItems.length > 0 && (
                              <Badge variant="primary" className="text-[10px] px-1.5 py-0.5">{actionItems.length} Actions</Badge>
                            )}
                            {decisions.length > 0 && (
                              <Badge variant="success" className="text-[10px] px-1.5 py-0.5">{decisions.length} Decisions</Badge>
                            )}
                            {keyTopics.length > 0 && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0.5">{keyTopics.length} Topics</Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowAnalysisModal(false)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
                        title="Close (Esc)"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <div className="overflow-y-auto max-h-[calc(90vh-100px)] p-6 space-y-6">
                      {/* Action Items */}
                      {actionItems.length > 0 && (
                        <div>
                          <h4 className="font-bold text-white mb-3 flex items-center">
                            <span className="w-2 h-2 bg-primary-500 rounded-full mr-2 shadow-[0_0_10px_rgba(99,102,241,0.5)]"></span>
                            Action Items
                          </h4>
                          <div className="space-y-2">
                            {actionItems.map((item, idx) => (
                              <div key={idx} className="p-4 bg-primary-500/5 rounded-xl border border-primary-500/10 hover:bg-primary-500/10 transition-colors">
                                <p className="text-sm font-medium text-gray-200">
                                  {item.text || item.task}
                                </p>
                                <div className="flex flex-wrap gap-2 mt-3">
                                  {item.owner && (
                                    <span className="text-xs px-2.5 py-1 bg-white/5 rounded-lg text-gray-400 border border-white/5 flex items-center gap-1">
                                      👤 {item.owner}
                                    </span>
                                  )}
                                  {item.due_date && (
                                    <span className="text-xs px-2.5 py-1 bg-white/5 rounded-lg text-gray-400 border border-white/5 flex items-center gap-1">
                                      ⏰ {item.due_date}
                                    </span>
                                  )}
                                  {item.priority && (
                                    <Badge variant="warning" size="sm">{item.priority}</Badge>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Decisions */}
                      {decisions.length > 0 && (
                        <div>
                          <h4 className="font-bold text-white mb-3 flex items-center">
                            <span className="w-2 h-2 bg-success-500 rounded-full mr-2 shadow-[0_0_10px_rgba(34,197,94,0.5)]"></span>
                            Decisions Made
                          </h4>
                          <div className="space-y-2">
                            {decisions.map((item, idx) => (
                              <div key={idx} className="p-4 bg-success-500/5 rounded-xl border border-success-500/10 hover:bg-success-500/10 transition-colors">
                                <p className="text-sm text-gray-200">
                                  {item.text || item.decision}
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Key Topics */}
                      {keyTopics.length > 0 && (
                        <div>
                          <h4 className="font-bold text-white mb-3 flex items-center">
                            <span className="w-2 h-2 bg-secondary-500 rounded-full mr-2 shadow-[0_0_10px_rgba(236,72,153,0.5)]"></span>
                            Key Topics
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {keyTopics.map((item, idx) => (
                              <Badge key={idx} variant="secondary">
                                {item.text || item.topic}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>

          )}
        </div >

        <div className="lg:col-span-4">
          <div className="sticky top-24 space-y-6">
            {/* Meetings Summary Card */}
            <Card
              aria-label="Recent meetings summary"
              className="animate-slide-up-fade hover-card cursor-pointer group"
              style={{ animationDelay: '300ms' }}
              onClick={() => navigate('/meetings')}
            >
              <CardBody className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-primary-500/10 rounded-xl group-hover:bg-primary-500/20 transition-colors">
                      <svg className="w-8 h-8 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white group-hover:text-primary-400 transition-colors">
                        Recent Meetings
                      </h3>
                      <p className="text-gray-400 mt-1">
                        {totalMeetings} meetings saved • View and manage all
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" className="group-hover:translate-x-1 transition-transform">
                    View All →
                  </Button>
                </div>
              </CardBody>
            </Card>
          </div >
        </div >
      </div >
    </Layout >
  )
}

