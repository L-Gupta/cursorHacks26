function ScoreGauge({ speaker, score }) {
  const color = score <= 40 ? '#ef4444' : score <= 70 ? '#f97316' : '#22c55e'
  const bgColor = score <= 40 ? 'bg-red-950' : score <= 70 ? 'bg-orange-950' : 'bg-green-950'
  const textColor = score <= 40 ? 'text-red-400' : score <= 70 ? 'text-orange-400' : 'text-green-400'
  const borderColor = score <= 40 ? 'border-red-800' : score <= 70 ? 'border-orange-800' : 'border-green-800'

  const SPEAKER_ICONS = { CEO: '👔', CFO: '📊', Analyst: '🔬' }

  const circumference = 2 * Math.PI * 36
  const dash = (score / 100) * circumference

  return (
    <div className={`${bgColor} border ${borderColor} rounded-xl p-4 flex flex-col items-center gap-2 min-w-[120px]`}>
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" stroke="#374151" strokeWidth="7" fill="none" />
          <circle
            cx="40" cy="40" r="36"
            stroke={color}
            strokeWidth="7"
            fill="none"
            strokeDasharray={`${dash} ${circumference}`}
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 0.5s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-white">{score}</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <span>{SPEAKER_ICONS[speaker] || '🎙️'}</span>
        <span className="text-sm font-semibold text-white">{speaker}</span>
      </div>
      <span className={`text-xs font-medium ${textColor}`}>
        {score <= 40 ? 'Low Credibility' : score <= 70 ? 'Moderate' : 'High Credibility'}
      </span>
    </div>
  )
}

export default function DeceptionDashboard({ scores }) {
  const entries = Object.entries(scores)

  return (
    <div>
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
        Credibility Scores
      </h2>
      {entries.length === 0 ? (
        <p className="text-gray-600 text-sm">Scores will appear once analysis begins</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {entries.map(([speaker, score]) => (
            <ScoreGauge key={speaker} speaker={speaker} score={score} />
          ))}
        </div>
      )}
    </div>
  )
}
