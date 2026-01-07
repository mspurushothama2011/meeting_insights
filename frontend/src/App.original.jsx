import React from 'react'
import TestPage from './components/TestPage'

// TEMPORARY: Showing TestPage to demonstrate new components
// Original App.jsx code is still here, just commented out
// Scroll down or restore from App.backup.jsx when ready

export default function App() {
  return <TestPage />
}

/* ORIGINAL APP CODE - COMMENTED OUT FOR TESTING

import React, { useState, useRef, useCallback, useEffect } from 'react'
import axios from 'axios'

const API_ROOT = import.meta.env.VITE_API_ROOT || 'http://localhost:8000'

// Axios instance with basic interceptors
const api = axios.create({ baseURL: API_ROOT, timeout: 600000 })

function OriginalApp(){
  const [file, setFile] = useState(null)
  const [pasted, setPasted] = useState('')
  const [filePath, setFilePath] = useState('')
  const [transcript, setTranscript] = useState('')
  const [summary, setSummary] = useState('')
  const [actionItems, setActionItems] = useState([])
  const [decisions, setDecisions] = useState([])
  const [keyTopics, setKeyTopics] = useState([])
  const [extractionMetadata, setExtractionMetadata] = useState({})
  const [meetings, setMeetings] = useState([])
  const [totalMeetings, setTotalMeetings] = useState(0)
  const [currentPage, setCurrentPage] = useState(0)
  const [status, setStatus] = useState(null)
  const [voskPath, setVoskPath] = useState('C:/Users/yeshw/Downloads/Compressed/vosk-model-small-en-us-0.15/vosk-model-small-en-us-0.15')
  
  // Enhanced search, sort, and filter states
  const [searchQuery, setSearchQuery] = useState('')
  const [searchDebounceTimer, setSearchDebounceTimer] = useState(null)
  const [sortBy, setSortBy] = useState('created_at') // created_at, title, id
  const [sortOrder, setSortOrder] = useState('desc') // asc, desc
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo, setFilterDateTo] = useState('')
  const [filterHasActions, setFilterHasActions] = useState(false)
  const [pageSize, setPageSize] = useState(5)
  
  // Drag and drop states
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  
  // Edit states
  const [editingMeetingId, setEditingMeetingId] = useState(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [deletingMeetingId, setDeletingMeetingId] = useState(null)
  const [expandedActionItems, setExpandedActionItems] = useState({})
  
  // Cancel token for axios
  const cancelTokenRef = useRef(null)

  // Loading states
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [isExtractingActions, setIsExtractingActions] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(false)
  const [isLoadingStatus, setIsLoadingStatus] = useState(false)
  const [isSettingVosk, setIsSettingVosk] = useState(false)

  // Timer states
  const [transcribeTime, setTranscribeTime] = useState(0)
  const [summarizeTime, setSummarizeTime] = useState(0)
  const [actionItemsTime, setActionItemsTime] = useState(0)
  
  // Timer refs for cleanup
  const transcribeTimerRef = useRef(null)
  const summarizeTimerRef = useRef(null)
  const actionItemsTimerRef = useRef(null)

  // Error states
  const [error, setError] = useState(null)
  
  // Load meetings on component mount
  useEffect(() => {
    fetchMeetings(0)
  }, []) // Empty dependency array means this runs once on mount

  // Helpers: export/download
  const downloadText = (filename, text) => {
    const blob = new Blob([text || ''], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  const startTimer = (type) => {
    // Clear any existing timer first
    if (type === 'transcribe' && transcribeTimerRef.current) {
      clearInterval(transcribeTimerRef.current)
    }
    if (type === 'summarize' && summarizeTimerRef.current) {
      clearInterval(summarizeTimerRef.current)
    }
    if (type === 'actionItems' && actionItemsTimerRef.current) {
      clearInterval(actionItemsTimerRef.current)
    }

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
    
    // Store timer reference
    if (type === 'transcribe') {
      transcribeTimerRef.current = timer
    } else if (type === 'summarize') {
      summarizeTimerRef.current = timer
    } else if (type === 'actionItems') {
      actionItemsTimerRef.current = timer
    }
    
    return timer
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

  const transcribeFile = async () => {
    setIsTranscribing(true)
    setTranscribeTime(0)
    setError(null)
    setUploadProgress(0)
    
    // Start timer
    startTimer('transcribe')
    
    // Create cancel token
    cancelTokenRef.current = axios.CancelToken.source()
    
    try {
      const form = new FormData()
      if(file) {
        form.append('file', file)
      } else if(pasted) {
        form.append('pasted', pasted)
      }
      
      const r = await axios.post(`${API_ROOT}/transcribe`, form, {
        cancelToken: cancelTokenRef.current.token,
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total)
          setUploadProgress(percentCompleted)
        }
      })
      setTranscript(r.data.text)
      setUploadProgress(100)
    } catch (err) {
      if (axios.isCancel(err)) {
        setError('Transcription cancelled')
      } else {
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

  const transcribeFromPath = async () => {
    setIsTranscribing(true)
    setTranscribeTime(0)
    setError(null)
    
    // Start timer
    startTimer('transcribe')
    
    try {
      const form = new URLSearchParams()
      form.append('file_path', filePath)
      const r = await axios.post(`${API_ROOT}/transcribe-path`, form)
      setTranscript(r.data.text)
    } catch (err) {
      setError(`Path transcription failed: ${err.response?.data?.detail || err.message}`)
    } finally {
      stopTimer('transcribe')
      setIsTranscribing(false)
    }
  }

  const doSummarize = async () => {
    setIsSummarizing(true)
    setSummarizeTime(0)
    setError(null)
    
    // Start timer
    startTimer('summarize')
    
    try {
      const form = new URLSearchParams()
      form.append('text', transcript)
      const r = await axios.post(`${API_ROOT}/summarize`, form)
      setSummary(r.data.summary)
    } catch (err) {
      setError(`Summarization failed: ${err.response?.data?.detail || err.message}`)
    } finally {
      stopTimer('summarize')
      setIsSummarizing(false)
    }
  }

  const extractActionItems = async () => {
    setIsExtractingActions(true)
    setActionItemsTime(0)
    setError(null)
    
    // Start timer
    startTimer('actionItems')
    
    try {
      const form = new URLSearchParams()
      form.append('text', transcript)
      
      // Add meeting context for better extraction
      const meetingDate = new Date().toISOString()
      form.append('meeting_date', meetingDate)
      
      // Extract potential attendees from transcript (simple heuristic)
      const namePattern = /\b([A-Z][a-z]+ ?[A-Z]?[a-z]*?)\b/g
      const potentialNames = [...new Set(transcript.match(namePattern) || [])]
        .filter(name => name.length > 2 && !['The', 'This', 'That', 'These', 'Those', 'We', 'You', 'They'].includes(name))
      
      if (potentialNames.length > 0) {
        form.append('attendees', potentialNames.join(', '))
      }
      
      const r = await axios.post(`${API_ROOT}/summarize`, form)
      const result = r.data
      console.log('Extraction result:', result)
      
      // Handle both legacy and enhanced response formats
      if (Array.isArray(result)) {
        // Legacy format: direct array of action items
        setActionItems(result)
        setDecisions([])
        setKeyTopics([])
        setExtractionMetadata({})
      } else if (result && typeof result === 'object') {
        // Enhanced format: object with action_items, decisions, key_topics
        setActionItems(result.action_items || [])
        setDecisions(result.decisions || [])
        setKeyTopics(result.key_topics || [])
        setExtractionMetadata(result.metadata || {})
      } else {
        // Fallback
        setActionItems([])
        setDecisions([])
        setKeyTopics([])
        setExtractionMetadata({})
      }
    } catch (err) {
      setError(`Action items extraction failed: ${err.response?.data?.detail || err.message}`)
    } finally {
      stopTimer('actionItems')
      setIsExtractingActions(false)
    }
  }

  const saveMeeting = async () => {
    setIsSaving(true)
    setError(null)
    try {
      const form = new URLSearchParams()
      const title = prompt('Enter meeting title:', 'Untitled Meeting')
      if (!title) return
      
      form.append('title', title)
      form.append('transcript', transcript)
      form.append('summary', summary)
      await axios.post(`${API_ROOT}/save`, form)
      await fetchMeetings(0)  // Go to first page after saving
      
      // Clear form after successful save
      setTranscript('')
      setSummary('')
      setActionItems([])
      setDecisions([])
      setKeyTopics([])
      setExtractionMetadata({})
      setFile(null)
      setPasted('')
    } catch (err) {
      setError(`Save failed: ${err.response?.data?.detail || err.message}`)
    } finally {
      setIsSaving(false)
    }
  }
  
  const updateMeetingTitle = async (meetingId, newTitle) => {
    try {
      const form = new URLSearchParams()
      form.append('title', newTitle)
      
      await axios.put(`${API_ROOT}/meetings/${meetingId}`, form)
      
      // Refresh meetings list
      await fetchMeetings(currentPage)
      setEditingMeetingId(null)
    } catch (err) {
      setError(`Update failed: ${err.response?.data?.error || err.message}`)
    }
  }
  
  const deleteMeeting = async (meetingId) => {
    if (!confirm('Are you sure you want to delete this meeting?')) return
    
    setDeletingMeetingId(meetingId)
    try {
      await axios.delete(`${API_ROOT}/meetings/${meetingId}`)
      
      // Refresh meetings list
      await fetchMeetings(currentPage)
    } catch (err) {
      setError(`Delete failed: ${err.response?.data?.error || err.message}`)
    } finally {
      setDeletingMeetingId(null)
    }
  }
  
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      // Show temporary success message
      const el = document.createElement('div')
      el.textContent = `${label} copied!`
      el.style.cssText = 'position:fixed;top:20px;right:20px;background:#4CAF50;color:white;padding:10px;border-radius:4px;z-index:9999'
      document.body.appendChild(el)
      setTimeout(() => el.remove(), 2000)
    }).catch(err => {
      setError(`Failed to copy: ${err.message}`)
    })
  }

  const toggleActionItems = (meetingId) => {
    setExpandedActionItems(prev => ({
      ...prev,
      [meetingId]: !prev[meetingId]
    }))
  }
  
  // Debounced search handler
  const handleSearchChange = (value) => {
    setSearchQuery(value)
    
    // Clear existing timer
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer)
    }
    
    // Set new timer for debounced search
    const newTimer = setTimeout(() => {
      fetchMeetings(0, true) // Reset to first page on search
    }, 500) // 500ms delay
    
    setSearchDebounceTimer(newTimer)
  }
  
  // Handle sort change
  const handleSortChange = (newSortBy) => {
    if (sortBy === newSortBy) {
      // Toggle order if same field
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(newSortBy)
      setSortOrder('desc') // Default to desc for new field
    }
    // Fetch with current page
    setTimeout(() => fetchMeetings(currentPage), 0)
  }
  
  // Handle filter changes
  const applyFilters = () => {
    fetchMeetings(0, true) // Reset to first page when filters change
  }

  const fetchMeetings = async (page = 0, resetPage = false) => {
    setIsLoadingMeetings(true)
    setError(null)
    try {
      const actualPage = resetPage ? 0 : page
      const limit = pageSize
      const offset = actualPage * limit
      
      // Build query parameters
      const params = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString()
      })
      
      // Add search query if present
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim())
      }
      
      const r = await axios.get(`${API_ROOT}/meetings?${params}`)
      
      // Sort meetings client-side (since backend doesn't support it yet)
      let sortedMeetings = [...r.data.meetings]
      
      // Apply client-side filtering
      if (filterDateFrom) {
        const fromDate = new Date(filterDateFrom)
        sortedMeetings = sortedMeetings.filter(m => new Date(m.created_at) >= fromDate)
      }
      if (filterDateTo) {
        const toDate = new Date(filterDateTo)
        toDate.setHours(23, 59, 59, 999) // Include the entire day
        sortedMeetings = sortedMeetings.filter(m => new Date(m.created_at) <= toDate)
      }
      if (filterHasActions) {
        sortedMeetings = sortedMeetings.filter(m => m.action_items && m.action_items.length > 0)
      }
      
      // Apply sorting
      sortedMeetings.sort((a, b) => {
        let compareValue = 0
        
        switch(sortBy) {
          case 'title':
            compareValue = (a.title || '').localeCompare(b.title || '')
            break
          case 'id':
            compareValue = a.id - b.id
            break
          case 'created_at':
          default:
            compareValue = new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            break
        }
        
        return sortOrder === 'asc' ? compareValue : -compareValue
      })
      
      setMeetings(sortedMeetings)
      setTotalMeetings(r.data.total)
      setCurrentPage(actualPage)
    } catch (err) {
      setError(`Failed to load meetings: ${err.response?.data?.detail || err.message}`)
    } finally {
      setIsLoadingMeetings(false)
    }
  }

  const fetchStatus = async () => {
    setIsLoadingStatus(true)
    setError(null)
    try {
      const r = await axios.get(`${API_ROOT}/status`)
      setStatus(r.data)
    } catch (err) {
      setError(`Status check failed: ${err.response?.data?.detail || err.message}`)
    } finally {
      setIsLoadingStatus(false)
    }
  }

  const setVosk = async () => {
    setIsSettingVosk(true)
    setError(null)
    try {
      const form = new URLSearchParams()
      form.append('path', voskPath)
      const r = await axios.post(`${API_ROOT}/config/vosk`, form)
      setStatus(r.data)
    } catch (err) {
      setError(`VOSK configuration failed: ${err.response?.data?.detail || err.message}`)
    } finally {
      setIsSettingVosk(false)
    }
  }

  // Drag and drop handlers
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
      const droppedFile = files[0]
      // Validate file extension
      const validExts = ['.wav', '.mp3', '.m4a', '.ogg', '.webm', '.mp4', '.avi', '.mov', '.mkv', '.flv', '.wmv', '.m4v']
      const ext = '.' + droppedFile.name.split('.').pop().toLowerCase()
      
      if (validExts.includes(ext)) {
        setFile(droppedFile)
        setPasted('')  // Clear pasted text
      } else {
        setError(`Invalid file type: ${ext}. Please upload audio or video files.`)
      }
    }
  }, [])
  
  const LoadingSpinner = ({ size = 16 }) => (
    <span style={{
      display: 'inline-block',
      width: size,
      height: size,
      border: '2px solid #f3f3f3',
      borderTop: '2px solid #3498db',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite',
      marginRight: 8
    }}></span>
  )
  
  const ProgressBar = ({ progress }) => (
    <div style={{
      width: '100%',
      height: '20px',
      backgroundColor: '#f0f0f0',
      borderRadius: '10px',
      overflow: 'hidden',
      marginTop: '10px'
    }}>
      <div style={{
        width: `${progress}%`,
        height: '100%',
        backgroundColor: '#4CAF50',
        transition: 'width 0.3s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '12px'
      }}>
        {progress > 0 && `${progress}%`}
      </div>
    </div>
  )

  return (
    <div style={{padding:20,fontFamily:'Arial'}}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      
      <h2>IMIP Frontend</h2>
      
      {/* Error Display */}
      {error && (
        <div style={{
          backgroundColor: '#ffe6e6',
          color: '#cc0000',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '20px',
          border: '1px solid #ffcccc'
        }}>
          <strong>Error:</strong> {error}
          <button 
            onClick={() => setError(null)}
            style={{
              float: 'right',
              background: 'none',
              border: 'none',
              color: '#cc0000',
              cursor: 'pointer',
              fontSize: '18px',
              fontWeight: 'bold'
            }}
          >
            ×
          </button>
          <div style={{marginTop: '8px', fontSize: '12px', color: '#a33'}}>
            Tips: check file size/type, network, and server status. Try again.
            <button onClick={() => { setError(null) }} style={{marginLeft: 10, padding:'4px 8px'}}>Retry</button>
          </div>
        </div>
      )}
      
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: isDragging ? '2px dashed #4CAF50' : '2px dashed #ccc',
          borderRadius: '8px',
          padding: '20px',
          backgroundColor: isDragging ? '#f0f8ff' : 'white',
          transition: 'all 0.3s ease'
        }}
      >
        <p style={{margin: '10px 0', color: '#666', textAlign: 'center'}}>
          📁 Drag & drop files here or click to browse
        </p>
        <p style={{margin: '5px 0', color: '#999', fontSize: '12px', textAlign: 'center'}}>
          Supported: .wav, .mp3, .m4a, .ogg, .webm, .mp4, .avi, .mov, .mkv, .flv, .wmv, .m4v
        </p>
        
        <div style={{textAlign: 'center', margin: '20px 0'}}>
          <input 
            type="file" 
            id="fileInput"
            onChange={e => {
              const selectedFile = e.target.files[0];
              setFile(selectedFile);
              setPasted(''); // Clear pasted text when file is selected
              setUploadProgress(0);
            }} 
            disabled={isTranscribing}
            accept=".wav,.mp3,.m4a,.ogg,.webm,.mp4,.avi,.mov,.mkv,.flv,.wmv,.m4v"
            title="Upload audio or video files"
            style={{display: 'none'}}
          />
          <label 
            htmlFor="fileInput" 
            style={{
              padding: '10px 20px',
              backgroundColor: '#3498db',
              color: 'white',
              borderRadius: '4px',
              cursor: isTranscribing ? 'not-allowed' : 'pointer',
              opacity: isTranscribing ? 0.5 : 1
            }}
          >
            Choose File
          </label>
        </div>
        
        {file && (
          <div style={{
            marginTop: '10px',
            padding: '10px',
            backgroundColor: '#e8f5e9',
            borderRadius: '4px'
          }}>
            <strong>Selected:</strong> {file.name}
            <span style={{marginLeft: '10px', color: '#666'}}>
              ({(file.size / 1024 / 1024).toFixed(2)} MB)
            </span>
            <button 
              onClick={() => {setFile(null); setUploadProgress(0)}}
              style={{
                marginLeft: '10px',
                padding: '2px 8px',
                fontSize: '12px',
                background: '#ff5252',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              Remove
            </button>
          </div>
        )}
        
        {uploadProgress > 0 && uploadProgress < 100 && (
          <ProgressBar progress={uploadProgress} />
        )}
        
        <div style={{marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px'}}>
          <p style={{margin: '10px 0', color: '#666'}}>
            Or paste transcript text:
          </p>
          <textarea 
            value={pasted} 
            onChange={e => {
              setPasted(e.target.value);
              setFile(null); // Clear file when text is pasted
            }} 
            placeholder="Paste transcript text here..." 
            rows={4} 
            cols={80}
            disabled={isTranscribing}
            style={{
              padding: '8px',
              fontSize: '14px',
              width: '100%',
              borderRadius: '4px',
              border: '1px solid #ddd'
            }}
          ></textarea>
        </div>
        
        <div style={{marginTop: '20px', display: 'flex', gap: '10px'}}>
          <button 
            onClick={transcribeFile} 
            disabled={isTranscribing || (!file && !pasted)}
            style={{
              padding: '10px 20px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: isTranscribing || (!file && !pasted) ? 'not-allowed' : 'pointer',
              opacity: isTranscribing || (!file && !pasted) ? 0.5 : 1
            }}
          >
            {isTranscribing && <LoadingSpinner />}
            {isTranscribing ? `Processing... (${transcribeTime}s)` : 'Transcribe'}
          </button>
          
          {isTranscribing && (
            <button 
              onClick={cancelTranscription}
              style={{
                padding: '10px 20px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          )}
        </div>
        
        <button 
          onClick={doSummarize} 
          disabled={isSummarizing || !transcript}
          style={{
            padding: '10px 20px',
            backgroundColor: '#FF9800',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isSummarizing || !transcript ? 'not-allowed' : 'pointer',
            opacity: isSummarizing || !transcript ? 0.5 : 1
          }}
        >
          {isSummarizing && <LoadingSpinner />}
          {isSummarizing ? `AI Processing... (${summarizeTime}s)` : 'Summarize'}
        </button>
        
        <button 
          onClick={extractActionItems} 
          disabled={isExtractingActions || !transcript}
          style={{
            padding: '10px 20px',
            backgroundColor: '#673AB7',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isExtractingActions || !transcript ? 'not-allowed' : 'pointer',
            opacity: isExtractingActions || !transcript ? 0.5 : 1,
            marginLeft: '10px'
          }}
        >
          {isExtractingActions && <LoadingSpinner />}
          {isExtractingActions ? `Extracting... (${actionItemsTime}s)` : 'Action Items'}
        </button>
        
        <button 
          onClick={saveMeeting} 
          disabled={isSaving || !transcript || !summary}
          style={{
            padding: '10px 20px',
            backgroundColor: '#9C27B0',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isSaving || !transcript || !summary ? 'not-allowed' : 'pointer',
            opacity: isSaving || !transcript || !summary ? 0.5 : 1
          }}
        >
          {isSaving && <LoadingSpinner />}
          {isSaving ? 'Saving...' : 'Save Meeting'}
        </button>
      </div>
      
      <hr style={{margin: '20px 0'}} />
      
      <div>
        <p style={{margin: '10px 0', color: '#666'}}>
          🎯 <strong>Direct File Path Transcription:</strong> Enter the full path to an audio/video file on your system
        </p>
        <input 
          type="text" 
          value={filePath} 
          onChange={e=>setFilePath(e.target.value)} 
          placeholder="e.g., C:\Users\yeshw\Downloads\video.mp4"
          style={{width: '600px', padding: '8px', marginRight: '10px'}}
          disabled={isTranscribing}
        />
        <button 
          onClick={transcribeFromPath} 
          disabled={isTranscribing || !filePath.trim()}
          style={{padding: '8px 16px'}}
        >
          {isTranscribing && <LoadingSpinner />}
          {isTranscribing ? `Processing File... (${transcribeTime}s)` : 'Transcribe from Path'}
        </button>
      </div>

      <h3>
        Transcript
        {transcript && (
          <>
            <button 
              onClick={() => copyToClipboard(transcript, 'Transcript')}
              style={{
                marginLeft: '10px',
                padding: '5px 10px',
                fontSize: '12px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              📋 Copy
            </button>
            <button 
              onClick={() => downloadText('transcript.txt', transcript)}
              style={{
                marginLeft: '10px',
                padding: '5px 10px',
                fontSize: '12px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              ⬇ Export
            </button>
          </>
        )}
      </h3>
      {isTranscribing ? (
        <div style={{color: '#666', fontStyle: 'italic'}}>
          <LoadingSpinner /> Processing transcription... ({transcribeTime}s)
        </div>
      ) : (
        <pre style={{
          whiteSpace:'pre-wrap',
          maxHeight:200,
          overflow:'auto',
          padding: '10px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px'
        }}>{transcript || 'No transcript yet'}</pre>
      )}

      <h3>
        Summary
        {summary && (
          <>
            <button 
              onClick={() => copyToClipboard(summary, 'Summary')}
              style={{
                marginLeft: '10px',
                padding: '5px 10px',
                fontSize: '12px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              📋 Copy
            </button>
            <button 
              onClick={() => downloadText('summary.md', `# Summary\n\n${summary}\n`)}
              style={{
                marginLeft: '10px',
                padding: '5px 10px',
                fontSize: '12px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              ⬇ Export
            </button>
          </>
        )}
      </h3>
      {isSummarizing ? (
        <div style={{color: '#666', fontStyle: 'italic'}}>
          <LoadingSpinner /> AI is generating summary... ({summarizeTime}s)
        </div>
      ) : (
        <pre style={{
          whiteSpace:'pre-wrap',
          maxHeight:200,
          overflow:'auto',
          padding: '10px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px'
        }}>{summary || 'No summary yet'}</pre>
      )}

      <h3>
        Meeting Analysis 
        <span style={{fontSize: '14px', color: '#666', fontWeight: 'normal'}}>
          ({actionItems.length} action items, {decisions.length} decisions, {keyTopics.length} topics)
        </span>
        {(actionItems.length > 0 || decisions.length > 0 || keyTopics.length > 0) && (
          <>
            <button 
              onClick={() => {
                const allContent = [
                  actionItems.length > 0 && `ACTION ITEMS:\n${actionItems.map(item => 
                    `• ${item.text}${item.assignee ? ` (${item.assignee})` : ''}${item.deadline ? ` - Due: ${item.deadline}` : ''}${item.priority ? ` [${item.priority}]` : ''}`
                  ).join('\n')}`,
                  decisions.length > 0 && `\nDECISIONS:\n${decisions.map(item => 
                    `• ${item.text}${item.owner ? ` (Owner: ${item.owner})` : ''}`
                  ).join('\n')}`,
                  keyTopics.length > 0 && `\nKEY TOPICS:\n${keyTopics.map(item => 
                    `• ${item.text}${item.category ? ` [${item.category}]` : ''}`
                  ).join('\n')}`
                ].filter(Boolean).join('\n');
                copyToClipboard(allContent, 'Meeting Analysis');
              }}
              style={{
                marginLeft: '10px',
                padding: '5px 10px',
                fontSize: '12px',
                backgroundColor: '#2196F3',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              📋 Copy All
            </button>
            <button 
              onClick={() => {
                const md = [
                  '# Meeting Analysis',
                  '',
                  '## Action Items',
                  ...actionItems.map(a => `- ${a.title || a.text} ${a.owner ? `(Owner: ${a.owner})` : ''} ${a.due_date ? `(Due: ${a.due_date})` : ''}`),
                  '',
                  '## Decisions',
                  ...decisions.map(d => `- ${d.title || d.text}`),
                  '',
                  '## Key Topics',
                  ...keyTopics.map(t => `- ${t.title || t.text}`)
                ].join('\n')
                downloadText('analysis.md', md)
              }}
              style={{
                marginLeft: '10px',
                padding: '5px 10px',
                fontSize: '12px',
                backgroundColor: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer'
              }}
            >
              ⬇ Export
            </button>
          </>
        )}
      </h3>
      {isExtractingActions ? (
        <div style={{color: '#666', fontStyle: 'italic'}}>
          <LoadingSpinner /> AI is extracting meeting insights... ({actionItemsTime}s)
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gap: '15px',
          gridTemplateColumns: '1fr',
          maxHeight: 500,
          overflow: 'auto'
        }}>
          {/* Action Items Section */}
          <div style={{
            padding: '15px',
            backgroundColor: '#f0f8ff',
            borderRadius: '4px',
            border: '1px solid #b3d9ff'
          }}>
            <h4 style={{margin: '0 0 10px 0', color: '#1976d2'}}>🎯 Action Items ({actionItems.length})</h4>
            {actionItems.length > 0 ? (
              <ul style={{
                margin: 0,
                paddingLeft: '20px',
                listStyleType: 'disc'
              }}>
                {actionItems.map((item, index) => (
                  <li key={index} style={{
                    marginBottom: '10px',
                    lineHeight: '1.4',
                    fontSize: '14px'
                  }}>
                    <div>
                      <strong style={{color: '#2c3e50'}}>{item.text}</strong>
                      <div style={{marginTop: '4px', display: 'flex', gap: '15px', flexWrap: 'wrap'}}>
                        {item.assignee && (
                          <span style={{fontSize: '12px', color: '#16a085'}}>
                            👤 {item.assignee}
                          </span>
                        )}
                        {item.deadline && (
                          <span style={{fontSize: '12px', color: '#e74c3c'}}>
                            ⏰ {item.deadline}
                          </span>
                        )}
                        {item.priority && (
                          <span style={{fontSize: '12px', color: '#ff6b35', fontWeight: 'bold'}}>
                            ⚡ {item.priority}
                          </span>
                        )}
                        {item.confidence && (
                          <span style={{fontSize: '12px', color: '#666'}}>
                            📊 {Math.round(item.confidence * 100)}% confidence
                          </span>
                        )}
                      </div>
                      {item.categories && item.categories.length > 0 && (
                        <div style={{marginTop: '4px'}}>
                          {item.categories.map((cat, i) => (
                            <span key={i} style={{
                              fontSize: '11px',
                              backgroundColor: '#e3f2fd',
                              color: '#1976d2',
                              padding: '2px 6px',
                              borderRadius: '10px',
                              marginRight: '4px'
                            }}>
                              {cat}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{color: '#666', fontStyle: 'italic', fontSize: '14px'}}>
                No action items found
              </div>
            )}
          </div>

          {/* Decisions Section */}
          <div style={{
            padding: '15px',
            backgroundColor: '#f0fff0',
            borderRadius: '4px',
            border: '1px solid #90ee90'
          }}>
            <h4 style={{margin: '0 0 10px 0', color: '#388e3c'}}>✅ Decisions ({decisions.length})</h4>
            {decisions.length > 0 ? (
              <ul style={{
                margin: 0,
                paddingLeft: '20px',
                listStyleType: 'disc'
              }}>
                {decisions.map((item, index) => (
                  <li key={index} style={{
                    marginBottom: '10px',
                    lineHeight: '1.4',
                    fontSize: '14px'
                  }}>
                    <div>
                      <strong style={{color: '#2c3e50'}}>{item.text}</strong>
                      <div style={{marginTop: '4px', display: 'flex', gap: '15px', flexWrap: 'wrap'}}>
                        {item.owner && (
                          <span style={{fontSize: '12px', color: '#16a085'}}>
                            👤 {item.owner}
                          </span>
                        )}
                        {item.date_decided && (
                          <span style={{fontSize: '12px', color: '#666'}}>
                            📅 {item.date_decided}
                          </span>
                        )}
                        {item.confidence && (
                          <span style={{fontSize: '12px', color: '#666'}}>
                            📊 {Math.round(item.confidence * 100)}% confidence
                          </span>
                        )}
                      </div>
                      {item.categories && item.categories.length > 0 && (
                        <div style={{marginTop: '4px'}}>
                          {item.categories.map((cat, i) => (
                            <span key={i} style={{
                              fontSize: '11px',
                              backgroundColor: '#e8f5e9',
                              color: '#388e3c',
                              padding: '2px 6px',
                              borderRadius: '10px',
                              marginRight: '4px'
                            }}>
                              {cat}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{color: '#666', fontStyle: 'italic', fontSize: '14px'}}>
                No decisions found
              </div>
            )}
          </div>

          {/* Key Topics Section */}
          <div style={{
            padding: '15px',
            backgroundColor: '#fff8e1',
            borderRadius: '4px',
            border: '1px solid #ffcc02'
          }}>
            <h4 style={{margin: '0 0 10px 0', color: '#f57c00'}}>📝 Key Topics ({keyTopics.length})</h4>
            {keyTopics.length > 0 ? (
              <ul style={{
                margin: 0,
                paddingLeft: '20px',
                listStyleType: 'disc'
              }}>
                {keyTopics.map((item, index) => (
                  <li key={index} style={{
                    marginBottom: '10px',
                    lineHeight: '1.4',
                    fontSize: '14px'
                  }}>
                    <div>
                      <strong style={{color: '#2c3e50'}}>{item.text}</strong>
                      <div style={{marginTop: '4px', display: 'flex', gap: '15px', flexWrap: 'wrap'}}>
                        {item.relevance_score && (
                          <span style={{fontSize: '12px', color: '#666'}}>
                            ⭐ {Math.round(item.relevance_score * 100)}% relevance
                          </span>
                        )}
                        {item.confidence && (
                          <span style={{fontSize: '12px', color: '#666'}}>
                            📊 {Math.round(item.confidence * 100)}% confidence
                          </span>
                        )}
                      </div>
                      {item.categories && item.categories.length > 0 && (
                        <div style={{marginTop: '4px'}}>
                          {item.categories.map((cat, i) => (
                            <span key={i} style={{
                              fontSize: '11px',
                              backgroundColor: '#fff3e0',
                              color: '#f57c00',
                              padding: '2px 6px',
                              borderRadius: '10px',
                              marginRight: '4px'
                            }}>
                              {cat}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div style={{color: '#666', fontStyle: 'italic', fontSize: '14px'}}>
                No key topics found
              </div>
            )}
          </div>

          {(actionItems.length === 0 && decisions.length === 0 && keyTopics.length === 0) && (
            <div style={{
              textAlign: 'center',
              color: '#666',
              fontStyle: 'italic',
              padding: '40px 20px',
              backgroundColor: '#f9f9f9',
              borderRadius: '4px',
              border: '1px solid #e0e0e0'
            }}>
              No insights extracted yet. Click "Action Items" button after transcription to analyze the meeting content.
            </div>
          )}
        </div>
      )}

      <h3>Meetings ({totalMeetings} total)</h3>
      
      {/* Enhanced Controls Section */}
      <div style={{
        backgroundColor: '#f8f9fa',
        padding: '15px',
        borderRadius: '8px',
        marginBottom: '20px',
        border: '1px solid #dee2e6'
      }}>
        {/* Search and Sort Row */}
        <div style={{display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '15px', flexWrap: 'wrap'}}>
          <button onClick={() => fetchMeetings(currentPage)} disabled={isLoadingMeetings}>
            {isLoadingMeetings && <LoadingSpinner />}
            {isLoadingMeetings ? 'Loading...' : 'Refresh'}
          </button>
          
          {/* Enhanced Search Input */}
          <div style={{flex: '1', minWidth: '200px', position: 'relative'}}>
            <input 
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search meetings..." 
              style={{
                padding: '8px 30px 8px 10px',
                width: '100%',
                border: '1px solid #ced4da',
                borderRadius: '4px'
              }}
            />
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('')
                  fetchMeetings(0, true)
                }}
                style={{
                  position: 'absolute',
                  right: '5px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: '#6c757d',
                  fontSize: '18px'
                }}
              >
                ×
              </button>
            )}
          </div>
          
          {/* Sort Controls */}
          <div style={{display: 'flex', gap: '5px', alignItems: 'center'}}>
            <span style={{fontSize: '14px', color: '#495057'}}>Sort by:</span>
            <select 
              value={sortBy} 
              onChange={(e) => {
                setSortBy(e.target.value)
                setTimeout(() => fetchMeetings(currentPage), 0)
              }}
              style={{
                padding: '6px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                backgroundColor: 'white'
              }}
            >
              <option value="created_at">Date</option>
              <option value="title">Title</option>
              <option value="id">ID</option>
            </select>
            <button 
              onClick={() => handleSortChange(sortBy)}
              style={{
                padding: '6px 10px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                backgroundColor: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center'
              }}
              title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
          
          {/* Page Size Selector */}
          <div style={{display: 'flex', gap: '5px', alignItems: 'center'}}>
            <span style={{fontSize: '14px', color: '#495057'}}>Show:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setTimeout(() => fetchMeetings(0, true), 0)
              }}
              style={{
                padding: '6px',
                border: '1px solid #ced4da',
                borderRadius: '4px',
                backgroundColor: 'white'
              }}
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="50">50</option>
            </select>
          </div>
        </div>
        
        {/* Filters Row */}
        <div style={{
          display: 'flex',
          gap: '10px',
          alignItems: 'center',
          flexWrap: 'wrap',
          paddingTop: '10px',
          borderTop: '1px solid #dee2e6'
        }}>
          <span style={{fontSize: '14px', color: '#495057', fontWeight: 'bold'}}>Filters:</span>
          
          {/* Date Range Filter */}
          <div style={{display: 'flex', gap: '5px', alignItems: 'center'}}>
            <label style={{fontSize: '14px', color: '#495057'}}>From:</label>
            <input
              type="date"
              value={filterDateFrom}
              onChange={(e) => setFilterDateFrom(e.target.value)}
              style={{
                padding: '5px',
                border: '1px solid #ced4da',
                borderRadius: '4px'
              }}
            />
          </div>
          
          <div style={{display: 'flex', gap: '5px', alignItems: 'center'}}>
            <label style={{fontSize: '14px', color: '#495057'}}>To:</label>
            <input
              type="date"
              value={filterDateTo}
              onChange={(e) => setFilterDateTo(e.target.value)}
              style={{
                padding: '5px',
                border: '1px solid #ced4da',
                borderRadius: '4px'
              }}
            />
          </div>
          
          {/* Action Items Filter */}
          <label style={{display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer'}}>
            <input
              type="checkbox"
              checked={filterHasActions}
              onChange={(e) => setFilterHasActions(e.target.checked)}
            />
            <span style={{fontSize: '14px', color: '#495057'}}>Has action items</span>
          </label>
          
          {/* Apply/Clear Filters Buttons */}
          <button
            onClick={applyFilters}
            style={{
              padding: '6px 12px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Apply Filters
          </button>
          
          {(filterDateFrom || filterDateTo || filterHasActions) && (
            <button
              onClick={() => {
                setFilterDateFrom('')
                setFilterDateTo('')
                setFilterHasActions(false)
                setTimeout(() => fetchMeetings(0, true), 0)
              }}
              style={{
                padding: '6px 12px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>
      
      {isLoadingMeetings ? (
        <div style={{color: '#666', fontStyle: 'italic', margin: '10px 0'}}>
          <LoadingSpinner /> Loading meetings...
        </div>
      ) : (
        <div style={{marginTop: '20px'}}>
          {meetings.map(m => (
            <div key={m.id} style={{
              marginBottom: '20px',
              padding: '15px',
              border: '1px solid #ddd',
              borderRadius: '8px',
              backgroundColor: '#fafafa'
            }}>
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                {editingMeetingId === m.id ? (
                  <input 
                    value={editingTitle}
                    onChange={e => setEditingTitle(e.target.value)}
                    onKeyPress={e => {
                      if (e.key === 'Enter') {
                        updateMeetingTitle(m.id, editingTitle)
                      }
                    }}
                    style={{
                      fontSize: '16px',
                      fontWeight: 'bold',
                      padding: '5px',
                      border: '1px solid #4CAF50',
                      borderRadius: '3px'
                    }}
                  />
                ) : (
                  <h4 style={{margin: 0}}>
                    #{m.id} - {m.title}
                    <button 
                      onClick={() => {
                        setEditingMeetingId(m.id)
                        setEditingTitle(m.title)
                      }}
                      style={{
                        marginLeft: '10px',
                        padding: '2px 8px',
                        fontSize: '12px',
                        background: 'transparent',
                        border: '1px solid #2196F3',
                        color: '#2196F3',
                        borderRadius: '3px',
                        cursor: 'pointer'
                      }}
                    >
                      ✏️ Rename
                    </button>
                  </h4>
                )}
                <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                  <span style={{color: '#666', fontSize: '12px'}}>
                    {new Date(m.created_at).toLocaleString()}
                  </span>
                  <button 
                    onClick={() => deleteMeeting(m.id)}
                    disabled={deletingMeetingId === m.id}
                    style={{
                      padding: '2px 8px',
                      fontSize: '12px',
                      background: deletingMeetingId === m.id ? '#ccc' : '#ff5252',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: deletingMeetingId === m.id ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {deletingMeetingId === m.id ? '...' : '🗑️ Delete'}
                  </button>
                </div>
              </div>
              
              {m.summary && (
                <div style={{
                  marginTop: '10px',
                  padding: '10px',
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  fontSize: '14px'
                }}>
                  {m.summary}
                  <button 
                    onClick={() => copyToClipboard(m.summary, 'Meeting summary')}
                    style={{
                      marginLeft: '10px',
                      padding: '2px 8px',
                      fontSize: '11px',
                      backgroundColor: '#2196F3',
                      color: 'white',
                      border: 'none',
                      borderRadius: '3px',
                      cursor: 'pointer'
                    }}
                  >
                    📋 Copy Summary
                  </button>
                </div>
              )}
              
              {/* Enhanced Meeting Analysis Section */}
              {((m.action_items && m.action_items.length > 0) || 
                (m.decisions && m.decisions.length > 0) || 
                (m.key_topics && m.key_topics.length > 0)) && (
                <div style={{marginTop: '10px'}}>
                  <div style={{display: 'flex', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '5px'}}>
                    <button 
                      onClick={() => toggleActionItems(m.id)}
                      style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        backgroundColor: '#673AB7',
                        color: 'white',
                        border: 'none',
                        borderRadius: '3px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      {expandedActionItems[m.id] ? '📋 Hide Analysis' : '📋 View Analysis'}
                      <span style={{fontSize: '10px', opacity: 0.8}}>
                        ({(m.action_items?.length || 0) + (m.decisions?.length || 0) + (m.key_topics?.length || 0)})
                      </span>
                    </button>
                    {expandedActionItems[m.id] && (
                      <button 
                        onClick={() => {
                          const content = [
                            m.action_items && m.action_items.length > 0 && `ACTION ITEMS:\n${m.action_items.map(item => 
                              `• ${item.text}${item.assignee ? ` (${item.assignee})` : ''}${item.deadline ? ` - Due: ${item.deadline}` : ''}${item.priority ? ` [${item.priority}]` : ''}`
                            ).join('\n')}`,
                            m.decisions && m.decisions.length > 0 && `\nDECISIONS:\n${m.decisions.map(item => 
                              `• ${item.text}${item.owner ? ` (Owner: ${item.owner})` : ''}`
                            ).join('\n')}`,
                            m.key_topics && m.key_topics.length > 0 && `\nKEY TOPICS:\n${m.key_topics.map(item => 
                              `• ${item.text}${item.category ? ` [${item.category}]` : ''}`
                            ).join('\n')}`
                          ].filter(Boolean).join('\n');
                          copyToClipboard(content, 'Meeting Analysis');
                        }}
                        style={{
                          padding: '2px 8px',
                          fontSize: '11px',
                          backgroundColor: '#2196F3',
                          color: 'white',
                          border: 'none',
                          borderRadius: '3px',
                          cursor: 'pointer'
                        }}
                      >
                        📋 Copy Analysis
                      </button>
                    )}
                  </div>
                  
                  {expandedActionItems[m.id] && (
                    <div style={{
                      padding: '12px',
                      backgroundColor: '#f9f9f9',
                      borderRadius: '4px',
                      border: '1px solid #e0e0e0',
                      display: 'grid',
                      gap: '12px'
                    }}>
                      {/* Action Items */}
                      {m.action_items && m.action_items.length > 0 && (
                        <div>
                          <h5 style={{margin: '0 0 8px 0', color: '#1976d2', fontSize: '13px'}}>🎯 Action Items ({m.action_items.length})</h5>
                          <ul style={{
                            margin: 0,
                            paddingLeft: '16px',
                            listStyleType: 'disc'
                          }}>
                            {m.action_items.map((item, index) => (
                              <li key={index} style={{
                                marginBottom: '6px',
                                lineHeight: '1.4',
                                fontSize: '12px'
                              }}>
                                <div>
                                  <strong style={{color: '#2c3e50'}}>{item.text}</strong>
                                  <div style={{marginTop: '2px', display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                                    {item.assignee && (
                                      <span style={{fontSize: '11px', color: '#16a085'}}>
                                        👤 {item.assignee}
                                      </span>
                                    )}
                                    {item.deadline && (
                                      <span style={{fontSize: '11px', color: '#e74c3c'}}>
                                        ⏰ {item.deadline}
                                      </span>
                                    )}
                                    {item.priority && (
                                      <span style={{fontSize: '11px', color: '#ff6b35', fontWeight: 'bold'}}>
                                        ⚡ {item.priority}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Decisions */}
                      {m.decisions && m.decisions.length > 0 && (
                        <div>
                          <h5 style={{margin: '0 0 8px 0', color: '#388e3c', fontSize: '13px'}}>✅ Decisions ({m.decisions.length})</h5>
                          <ul style={{
                            margin: 0,
                            paddingLeft: '16px',
                            listStyleType: 'disc'
                          }}>
                            {m.decisions.map((item, index) => (
                              <li key={index} style={{
                                marginBottom: '6px',
                                lineHeight: '1.4',
                                fontSize: '12px'
                              }}>
                                <div>
                                  <strong style={{color: '#2c3e50'}}>{item.text}</strong>
                                  <div style={{marginTop: '2px', display: 'flex', gap: '10px', flexWrap: 'wrap'}}>
                                    {item.owner && (
                                      <span style={{fontSize: '11px', color: '#16a085'}}>
                                        👤 {item.owner}
                                      </span>
                                    )}
                                    {item.date_decided && (
                                      <span style={{fontSize: '11px', color: '#666'}}>
                                        📅 {item.date_decided}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Key Topics */}
                      {m.key_topics && m.key_topics.length > 0 && (
                        <div>
                          <h5 style={{margin: '0 0 8px 0', color: '#f57c00', fontSize: '13px'}}>📝 Key Topics ({m.key_topics.length})</h5>
                          <ul style={{
                            margin: 0,
                            paddingLeft: '16px',
                            listStyleType: 'disc'
                          }}>
                            {m.key_topics.map((item, index) => (
                              <li key={index} style={{
                                marginBottom: '6px',
                                lineHeight: '1.4',
                                fontSize: '12px'
                              }}>
                                <div>
                                  <strong style={{color: '#2c3e50'}}>{item.text}</strong>
                                  {item.categories && item.categories.length > 0 && (
                                    <div style={{marginTop: '2px'}}>
                                      {item.categories.map((cat, i) => (
                                        <span key={i} style={{
                                          fontSize: '10px',
                                          backgroundColor: '#fff3e0',
                                          color: '#f57c00',
                                          padding: '1px 4px',
                                          borderRadius: '8px',
                                          marginRight: '3px'
                                        }}>
                                          {cat}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Pagination Controls */}
      {totalMeetings > 0 && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '10px',
          marginTop: '20px',
          marginBottom: '20px',
          padding: '15px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <button
            onClick={() => fetchMeetings(0)}
            disabled={currentPage === 0 || isLoadingMeetings}
            style={{
              padding: '6px 12px',
              backgroundColor: currentPage === 0 ? '#e9ecef' : '#007bff',
              color: currentPage === 0 ? '#6c757d' : 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
              opacity: currentPage === 0 ? 0.5 : 1
            }}
          >
            ⟨⟨ First
          </button>
          
          <button
            onClick={() => fetchMeetings(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0 || isLoadingMeetings}
            style={{
              padding: '6px 12px',
              backgroundColor: currentPage === 0 ? '#e9ecef' : '#007bff',
              color: currentPage === 0 ? '#6c757d' : 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
              opacity: currentPage === 0 ? 0.5 : 1
            }}
          >
            ← Previous
          </button>
          
          <div style={{
            display: 'flex',
            gap: '5px',
            alignItems: 'center'
          }}>
            {/* Page numbers */}
            {(() => {
              const totalPages = Math.ceil(totalMeetings / pageSize)
              const pages = []
              const maxVisible = 5
              let start = Math.max(0, currentPage - Math.floor(maxVisible / 2))
              let end = Math.min(totalPages, start + maxVisible)
              
              if (end - start < maxVisible) {
                start = Math.max(0, end - maxVisible)
              }
              
              if (start > 0) {
                pages.push(
                  <span key="dots-start" style={{color: '#6c757d'}}>...</span>
                )
              }
              
              for (let i = start; i < end; i++) {
                pages.push(
                  <button
                    key={i}
                    onClick={() => fetchMeetings(i)}
                    disabled={isLoadingMeetings}
                    style={{
                      padding: '6px 10px',
                      backgroundColor: i === currentPage ? '#007bff' : 'white',
                      color: i === currentPage ? 'white' : '#007bff',
                      border: '1px solid #007bff',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: i === currentPage ? 'bold' : 'normal'
                    }}
                  >
                    {i + 1}
                  </button>
                )
              }
              
              if (end < totalPages) {
                pages.push(
                  <span key="dots-end" style={{color: '#6c757d'}}>...</span>
                )
              }
              
              return pages
            })()}
          </div>
          
          <button
            onClick={() => fetchMeetings(Math.min(Math.ceil(totalMeetings / pageSize) - 1, currentPage + 1))}
            disabled={currentPage >= Math.ceil(totalMeetings / pageSize) - 1 || isLoadingMeetings}
            style={{
              padding: '6px 12px',
              backgroundColor: currentPage >= Math.ceil(totalMeetings / pageSize) - 1 ? '#e9ecef' : '#007bff',
              color: currentPage >= Math.ceil(totalMeetings / pageSize) - 1 ? '#6c757d' : 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: currentPage >= Math.ceil(totalMeetings / pageSize) - 1 ? 'not-allowed' : 'pointer',
              opacity: currentPage >= Math.ceil(totalMeetings / pageSize) - 1 ? 0.5 : 1
            }}
          >
            Next →
          </button>
          
          <button
            onClick={() => fetchMeetings(Math.ceil(totalMeetings / pageSize) - 1)}
            disabled={currentPage >= Math.ceil(totalMeetings / pageSize) - 1 || isLoadingMeetings}
            style={{
              padding: '6px 12px',
              backgroundColor: currentPage >= Math.ceil(totalMeetings / pageSize) - 1 ? '#e9ecef' : '#007bff',
              color: currentPage >= Math.ceil(totalMeetings / pageSize) - 1 ? '#6c757d' : 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: currentPage >= Math.ceil(totalMeetings / pageSize) - 1 ? 'not-allowed' : 'pointer',
              opacity: currentPage >= Math.ceil(totalMeetings / pageSize) - 1 ? 0.5 : 1
            }}
          >
            Last ⟩⟩
          </button>
          
          <span style={{
            marginLeft: '20px',
            fontSize: '14px',
            color: '#6c757d'
          }}>
            Page {currentPage + 1} of {Math.ceil(totalMeetings / pageSize)} ({totalMeetings} total)
          </span>
        </div>
      )}

      <h3>Admin</h3>
      <div style={{marginBottom: '10px'}}>
        <button onClick={fetchStatus} disabled={isLoadingStatus}>
          {isLoadingStatus && <LoadingSpinner />}
          {isLoadingStatus ? 'Checking...' : 'Check status'}
        </button>
      </div>
      {status && (
        <div style={{padding:'10px', border:'1px solid #eee', borderRadius:4, background:'#fafafa'}}>
          <div><strong>FFmpeg:</strong> {status?.config?.FFMPEG_BIN || 'Not found'}</div>
          <div><strong>VOSK_MODEL_PATH:</strong> {status?.config?.VOSK_MODEL_PATH || 'Unset'}</div>
          <div><strong>HF_HOME:</strong> {status?.config?.HF_HOME}</div>
          <div><strong>Whisper model:</strong> {status?.config?.WHISPER_MODEL}</div>
          <div><strong>Max upload size:</strong> {status?.config?.MAX_UPLOAD_SIZE} bytes</div>
        </div>
      )}
      
      <div>
        <input 
          style={{width:'600px'}} 
          value={voskPath} 
          onChange={e=>setVoskPath(e.target.value)}
          disabled={isSettingVosk}
        />
        <button onClick={setVosk} disabled={isSettingVosk}>
          {isSettingVosk && <LoadingSpinner />}
          {isSettingVosk ? 'Setting...' : 'Set VOSK path'}
        </button>
      </div>
    </div>
  )
} 