import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts'

const SPEAKER_LINE_COLORS = {
  CEO: '#3b82f6',
  CFO: '#a855f7',
  Analyst: '#22c55e',
}

function buildChartData(scoreHistory) {
  const allTimes = new Set()
  Object.values(scoreHistory).forEach(hist => hist.forEach(p => allTimes.add(p.time)))
  const sortedTimes = [...allTimes].sort()

  return sortedTimes.map(time => {
    const point = { time }
    Object.entries(scoreHistory).forEach(([speaker, hist]) => {
      const match = hist.findLast
        ? hist.findLast(p => p.time <= time)
        : [...hist].reverse().find(p => p.time <= time)
      if (match) point[speaker] = match.score
    })
    return point
  })
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs shadow-xl">
      <p className="text-gray-400 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-medium">
          {p.dataKey}: {p.value}
        </p>
      ))}
    </div>
  )
}

export default function CredibilityTimeline({ scoreHistory }) {
  const speakers = Object.keys(scoreHistory)
  const hasData = speakers.some(s => scoreHistory[s].length > 0)

  if (!hasData) {
    return (
      <div className="h-full flex items-center justify-center">
        <p className="text-gray-600 text-sm">Timeline will appear as segments are analyzed</p>
      </div>
    )
  }

  const data = buildChartData(scoreHistory)

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
        Credibility Timeline
      </h2>
      <div className="flex-1 min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#374151' }}
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: '#6b7280' }}
              tickLine={false}
              axisLine={{ stroke: '#374151' }}
              width={30}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 12, color: '#9ca3af', paddingTop: 8 }}
            />
            <ReferenceLine y={70} stroke="#374151" strokeDasharray="4 4" />
            <ReferenceLine y={40} stroke="#374151" strokeDasharray="4 4" />
            {speakers.map(speaker => (
              <Line
                key={speaker}
                type="monotone"
                dataKey={speaker}
                stroke={SPEAKER_LINE_COLORS[speaker] || '#94a3b8'}
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
