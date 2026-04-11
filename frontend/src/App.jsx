import { useState, useCallback, useRef } from 'react'
import AudioCapture from './components/AudioCapture'
import TranscriptFeed from './components/TranscriptFeed'
import DeceptionDashboard from './components/DeceptionDashboard'
import ContradictionCard from './components/ContradictionCard'
import CredibilityTimeline from './components/CredibilityTimeline'
import ReportExport from './components/ReportExport'

const SESSION_ID = crypto.randomUUID()

export default function App() {
  const [ticker, setTicker] = useState('AAPL')
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState([])
  const [scores, setScores] = useState({})
  const [contradictions, setContradictions] = useState([])
  const [scoreHistory, setScoreHistory] = useState({})
  const [isIngesting, setIsIngesting] = useState(false)
  const [ingestStatus, setIngestStatus] = useState(null)
  const startTimeRef = useRef(Date.now())
  const scoresRef = useRef({})

  const getElapsedTime = () => {
    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000)
    const h = Math.floor(elapsed / 3600).toString().padStart(2, '0')
    const m = Math.floor((elapsed % 3600) / 60).toString().padStart(2, '0')
    const s = (elapsed % 60).toString().padStart(2, '0')
    return `${h}:${m}:${s}`
  }

  const handleSegment = useCallback(async ({ speaker, text }) => {
    if (!text?.trim()) return
    try {
      const resp = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: SESSION_ID,
          speaker,
          text,
          ticker: ticker.toUpperCase(),
        }),
      })
      if (!resp.ok) return
      const data = await resp.json()
      const timestamp = new Date().toISOString()
      const timeLabel = getElapsedTime()

      setTranscript(prev => [...prev, {
        timestamp,
        speaker,
        text,
        score_delta: data.score_delta,
        signals: data.signals,
      }])

      setScores(prev => {
        const current = prev[speaker] ?? 100
        const next = Math.max(0, Math.min(100, current + data.score_delta))
        scoresRef.current = { ...prev, [speaker]: next }
        return scoresRef.current
      })

      setScoreHistory(prev => {
        const speakerHistory = prev[speaker] ?? []
        const currentScore = (scoresRef.current[speaker] ?? 100)
        return {
          ...prev,
          [speaker]: [...speakerHistory, { time: timeLabel, score: currentScore }],
        }
      })

      if (data.contradiction) {
        setContradictions(prev => [...prev, {
          ...data.contradiction,
          speaker,
          timestamp,
        }])
      }
    } catch (err) {
      console.error('Analyze error:', err)
    }
  }, [ticker])

  const handleIngest = async () => {
    if (!ticker) return
    setIsIngesting(true)
    setIngestStatus(null)
    try {
      const resp = await fetch(`/api/ingest/${ticker.toUpperCase()}`, { method: 'POST' })
      const data = await resp.json()
      setIngestStatus(data)
    } catch (err) {
      setIngestStatus({ error: err.message })
    } finally {
      setIsIngesting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-3 flex items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🔍</span>
          <h1 className="text-xl font-bold text-white">EarningsLens</h1>
          <span className="text-xs text-gray-500 ml-1">Real-Time Deception Detector</span>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <input
            className="bg-gray-800 border border-gray-700 text-white px-3 py-1.5 rounded text-sm w-24 uppercase"
            value={ticker}
            onChange={e => setTicker(e.target.value.toUpperCase())}
            placeholder="TICKER"
          />
          <button
            onClick={handleIngest}
            disabled={isIngesting}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-900 text-white px-3 py-1.5 rounded text-sm font-medium"
          >
            {isIngesting ? 'Ingesting…' : 'Ingest SEC Filings'}
          </button>
          {ingestStatus && (
            <span className="text-xs text-green-400">
              {ingestStatus.error
                ? `Error: ${ingestStatus.error}`
                : `✓ ${ingestStatus.documents_indexed} chunks indexed${ingestStatus.note ? ` (${ingestStatus.note})` : ''}`}
            </span>
          )}
        </div>
        <div className="ml-auto flex items-center gap-4">
          <span className="text-xs text-gray-500">
            Session: <code className="text-gray-400">{SESSION_ID.slice(0, 8)}…</code>
          </span>
          <AudioCapture
            isRecording={isRecording}
            onToggle={setIsRecording}
            onSegment={handleSegment}
          />
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Transcript */}
        <div className="w-80 flex-shrink-0 border-r border-gray-800 flex flex-col overflow-hidden">
          <div className="px-4 py-2 bg-gray-900 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Live Transcript</h2>
          </div>
          <TranscriptFeed transcript={transcript} />
        </div>

        {/* Center: Dashboard + Timeline */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-shrink-0 p-4 border-b border-gray-800">
            <DeceptionDashboard scores={scores} />
          </div>
          <div className="flex-1 p-4 overflow-auto">
            <CredibilityTimeline scoreHistory={scoreHistory} />
          </div>
        </div>

        {/* Right: Contradictions */}
        <div className="w-96 flex-shrink-0 border-l border-gray-800 flex flex-col overflow-hidden">
          <div className="px-4 py-2 bg-gray-900 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">Contradictions</h2>
            <span className="text-xs bg-red-900 text-red-300 px-2 py-0.5 rounded-full">{contradictions.length}</span>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {contradictions.length === 0 ? (
              <p className="text-gray-600 text-sm text-center mt-8">No contradictions detected yet</p>
            ) : (
              [...contradictions].reverse().map((c, i) => (
                <ContradictionCard
                  key={i}
                  contradiction={c}
                  speaker={c.speaker}
                  timestamp={c.timestamp}
                />
              ))
            )}
          </div>
        </div>
      </div>

      {/* Footer: Export */}
      <footer className="bg-gray-900 border-t border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="text-xs text-gray-600">
          {transcript.length} segments analyzed • {Object.keys(scores).length} speakers tracked
        </div>
        <ReportExport
          sessionId={SESSION_ID}
          transcript={transcript}
          scores={scores}
          contradictions={contradictions}
          ticker={ticker}
        />
      </footer>
    </div>
  )
}
