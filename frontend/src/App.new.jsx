import React from 'react'
import { Button, Card, CardHeader, CardBody, Badge, Spinner, SkeletonCard } from './components/ui'

const API_ROOT = import.meta.env.VITE_API_ROOT || 'http://localhost:8000'

export default function App() {
  // State management
  const [file, setFile] = useState(null)
  const [pasted, setPasted] = useState('')
  const [transcript, setTranscript] = useState('')
  const [summary, setSummary] = useState('')
  const [actionItems, setActionItems] = useState([])
  const [meetings, setMeetings] = useState([])
  const [totalMeetings, setTotalMeetings] = useState(0)
  
  // Loading states
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [isLoadingMeetings, setIsLoadingMeetings] = useState(false)
  
  // Load meetings on mount
  useEffect(() => {
    fetchMeetings()
  }, [])
  
  const fetchMeetings = async () => {
    setIsLoadingMeetings(true)
    try {
      const r = await axios.get(`${API_ROOT}/meetings`)
      setMeetings(r.data.meetings || [])
      setTotalMeetings(r.data.total || 0)
      toast.success('Meetings loaded')
    } catch (err) {
      toast.error(`Failed to load meetings: ${err.message}`)
    } finally {
      setIsLoadingMeetings(false)
    }
  }
  
  const transcribeFile = async () => {
    if (!file && !pasted) {
      toast.error('Please select a file or paste text')
      return
    }
    
    setIsTranscribing(true)
    try {
      const form = new FormData()
      if (file) {
        form.append('file', file)
      } else if (pasted) {
        form.append('pasted', pasted)
      }
      
      const r = await axios.post(`${API_ROOT}/transcribe`, form)
      setTranscript(r.data.text)
      toast.success('Transcription complete!')
    } catch (err) {
      toast.error(`Transcription failed: ${err.message}`)
    } finally {
      setIsTranscribing(false)
    }
  }
  
  const doSummarize = async () => {
    if (!transcript) {
      toast.error('Please transcribe something first')
      return
    }
    
    setIsSummarizing(true)
    try {
      const form = new URLSearchParams()
      form.append('text', transcript)
      const r = await axios.post(`${API_ROOT}/summarize`, form)
      setSummary(r.data.summary)
      toast.success('Summary generated!')
    } catch (err) {
      toast.error(`Summarization failed: ${err.message}`)
    } finally {
      setIsSummarizing(false)
    }
  }
  
  return (
    <Layout>
      <div className="space-y-6">
        {/* Upload Section */}
        <Card>
          <CardHeader>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Upload Meeting Recording
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Upload an audio/video file or paste transcript text
            </p>
          </CardHeader>
          <CardBody className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Choose File
              </label>
              <input
                type="file"
                onChange={e => setFile(e.target.files[0])}
                accept=".wav,.mp3,.m4a,.ogg,.webm,.mp4,.avi,.mov"
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                         focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {file && (
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Or Paste Transcript
              </label>
              <textarea
                value={pasted}
                onChange={e => setPasted(e.target.value)}
                rows={4}
                placeholder="Paste transcript text here..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg 
                         bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100
                         focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
            
            <div className="flex gap-3">
              <Button
                variant="primary"
                onClick={transcribeFile}
                loading={isTranscribing}
                disabled={!file && !pasted}
              >
                {isTranscribing ? 'Transcribing...' : 'Transcribe'}
              </Button>
              
              <Button
                variant="secondary"
                onClick={doSummarize}
                loading={isSummarizing}
                disabled={!transcript}
              >
                {isSummarizing ? 'Summarizing...' : 'Summarize'}
              </Button>
            </div>
          </CardBody>
        </Card>
        
        {/* Transcript Section */}
        {transcript && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Transcript
                </h3>
                <Badge variant="success">{transcript.length} chars</Badge>
              </div>
            </CardHeader>
            <CardBody>
              <div className="prose dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap text-sm bg-gray-50 dark:bg-gray-900 p-4 rounded-lg overflow-auto max-h-96">
                  {transcript}
                </pre>
              </div>
            </CardBody>
          </Card>
        )}
        
        {/* Summary Section */}
        {summary && (
          <Card>
            <CardHeader>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Summary
              </h3>
            </CardHeader>
            <CardBody>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
                {summary}
              </p>
            </CardBody>
          </Card>
        )}
        
        {/* Meetings List */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Recent Meetings
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {totalMeetings} meetings total
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchMeetings}>
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardBody>
            {isLoadingMeetings ? (
              <div className="space-y-4">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            ) : meetings.length > 0 ? (
              <div className="space-y-3">
                {meetings.map(meeting => (
                  <div
                    key={meeting.id}
                    className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">
                          {meeting.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {new Date(meeting.created_at).toLocaleString()}
                        </p>
                      </div>
                      {meeting.action_items?.length > 0 && (
                        <Badge variant="primary">
                          {meeting.action_items.length} actions
                        </Badge>
                      )}
                    </div>
                    {meeting.summary && (
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-2 line-clamp-2">
                        {meeting.summary}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <p>No meetings yet. Upload a recording to get started!</p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </Layout>
  )
}
