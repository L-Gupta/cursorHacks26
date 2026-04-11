import { useEffect, useRef } from 'react'

const SPEAKER_COLORS = {
  CEO: 'bg-blue-600 text-blue-100',
  CFO: 'bg-purple-600 text-purple-100',
  Analyst: 'bg-green-600 text-green-100',
}

const SIGNAL_COLORS = {
  hedging_language: 'bg-yellow-900 text-yellow-300',
  vague_metrics: 'bg-orange-900 text-orange-300',
  past_contradiction: 'bg-red-900 text-red-300',
  deflection: 'bg-pink-900 text-pink-300',
  overpromising: 'bg-red-900 text-red-300',
  inconsistent_tone: 'bg-amber-900 text-amber-300',
  selective_disclosure: 'bg-rose-900 text-rose-300',
}

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  } catch {
    return iso
  }
}

export default function TranscriptFeed({ transcript }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [transcript])

  return (
    <div className="flex-1 overflow-y-auto p-3 space-y-3">
      {transcript.length === 0 ? (
        <p className="text-gray-600 text-sm text-center mt-8">
          Transcript will appear here when recording starts
        </p>
      ) : (
        transcript.map((entry, i) => (
          <div key={i} className="bg-gray-800 rounded-lg p-3 space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded ${SPEAKER_COLORS[entry.speaker] || 'bg-gray-600 text-gray-200'}`}>
                {entry.speaker}
              </span>
              <div className="flex items-center gap-2">
                {entry.score_delta !== 0 && (
                  <span className={`text-xs font-bold ${entry.score_delta < 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {entry.score_delta > 0 ? '+' : ''}{entry.score_delta}
                  </span>
                )}
                <span className="text-xs text-gray-500">{formatTime(entry.timestamp)}</span>
              </div>
            </div>
            <p className="text-sm text-gray-200 leading-relaxed">{entry.text}</p>
            {entry.signals && entry.signals.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {entry.signals.map((sig, j) => (
                  <span
                    key={j}
                    className={`text-xs px-1.5 py-0.5 rounded ${SIGNAL_COLORS[sig] || 'bg-gray-700 text-gray-400'}`}
                  >
                    {sig.replace(/_/g, ' ')}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  )
}
