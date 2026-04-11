function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

const SPEAKER_COLORS = {
  CEO: 'text-blue-400',
  CFO: 'text-purple-400',
  Analyst: 'text-green-400',
}

export default function ContradictionCard({ contradiction, speaker, timestamp }) {
  const { current_quote, prior_quote, source, similarity_score } = contradiction
  const score = Math.round(similarity_score * 100)

  return (
    <div className="bg-gray-800 border border-red-900 rounded-xl p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-red-500">⚠️</span>
          <span className={`text-sm font-semibold ${SPEAKER_COLORS[speaker] || 'text-gray-300'}`}>
            {speaker}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-red-900 text-red-300 px-2 py-0.5 rounded-full font-medium">
            {score}% match
          </span>
          <span className="text-xs text-gray-500">{formatTime(timestamp)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-red-950/40 border border-red-800/50 rounded-lg p-2 space-y-1">
          <p className="text-xs font-semibold text-red-400 uppercase">Current Statement</p>
          <p className="text-xs text-gray-300 leading-relaxed line-clamp-4">"{current_quote}"</p>
        </div>
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-2 space-y-1">
          <p className="text-xs font-semibold text-gray-400 uppercase">Prior Statement</p>
          <p className="text-xs text-gray-400 leading-relaxed line-clamp-4">"{prior_quote}"</p>
          <p className="text-xs text-indigo-400 font-medium mt-1">{source}</p>
        </div>
      </div>
    </div>
  )
}
