const SIGNAL_COLORS = {
  HEDGING: '#ffab00',
  'PASSIVE VOICE': '#ff6d00',
  DEFLECTION: '#ff1744',
  OVERCLAIMING: '#ff1744',
  'VAGUE QUANTIFIER': '#ffab00',
  'NON-ANSWER': '#ff5252',
  'TOPIC SWITCH': '#ff9100',
  MINIMIZING: '#ff6d00',
  ABSOLUTISM: '#ff1744',
};

const getScoreColor = (score) => {
  if (score < 25) return '#00e676';
  if (score < 50) return '#ffab00';
  if (score < 75) return '#ff6d00';
  return '#ff1744';
};

const getThreatLevel = (score) => {
  if (score < 25) return { label: 'LOW', color: '#00e676' };
  if (score < 50) return { label: 'ELEVATED', color: '#ffab00' };
  if (score < 75) return { label: 'HIGH', color: '#ff6d00' };
  return { label: 'CRITICAL', color: '#ff1744' };
};

export default function DeceptionGauge({ deceptionScore, signals, currentVerdict, currentSpeaker }) {
  const score = deceptionScore;
  const color = getScoreColor(score);
  const threat = getThreatLevel(score);

  const cx = 100, cy = 105, r = 75;
  const startAngle = Math.PI;
  const scoreAngle = startAngle - (score / 100) * Math.PI;

  const arcPath = (sA, eA) => {
    const x1 = cx + r * Math.cos(sA);
    const y1 = cy - r * Math.sin(sA);
    const x2 = cx + r * Math.cos(eA);
    const y2 = cy - r * Math.sin(eA);
    const large = Math.abs(sA - eA) > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
  };

  const needleLen = r - 10;
  const nx = cx + needleLen * Math.cos(scoreAngle);
  const ny = cy - needleLen * Math.sin(scoreAngle);

  const uniqueSignals = [...new Set(signals)];

  return (
    <div className="flex flex-col items-center gap-2 p-3">
      <svg width="200" height="115" viewBox="0 0 200 115">
        <path d={arcPath(startAngle, 0)} fill="none" stroke="var(--text-dim)" strokeWidth="5" strokeLinecap="round" />
        {score > 0 && (
          <path
            d={arcPath(startAngle, scoreAngle)}
            fill="none"
            stroke={color}
            strokeWidth="5"
            strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 4px ${color}50)`, transition: 'all 0.6s ease-out' }}
          />
        )}
        {[0, 25, 50, 75, 100].map((t) => {
          const angle = startAngle - (t / 100) * Math.PI;
          const oR = r + 8, iR = r + 2, lR = r + 17;
          return (
            <g key={t}>
              <line
                x1={cx + iR * Math.cos(angle)} y1={cy - iR * Math.sin(angle)}
                x2={cx + oR * Math.cos(angle)} y2={cy - oR * Math.sin(angle)}
                stroke="var(--text-secondary)" strokeWidth="1"
              />
              <text
                x={cx + lR * Math.cos(angle)} y={cy - lR * Math.sin(angle)}
                textAnchor="middle" dominantBaseline="middle"
                fontFamily='"IBM Plex Mono", monospace' fontSize="7" fill="var(--text-secondary)"
              >{t}</text>
            </g>
          );
        })}
        <line
          x1={cx} y1={cy} x2={nx} y2={ny}
          stroke={color} strokeWidth="2" strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 3px ${color})`, transition: 'all 0.6s ease-out' }}
        />
        <circle cx={cx} cy={cy} r="3.5" fill={color} style={{ transition: 'fill 0.6s ease-out' }} />
      </svg>

      <div className="text-center -mt-2">
        <div className="mono text-[32px] font-bold leading-none" style={{ color, transition: 'color 0.6s ease-out' }}>
          {score}
        </div>
        <div className="mono text-[8px] tracking-[0.2em] mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          DECEPTION INDEX
        </div>
      </div>

      {currentVerdict && (
        <div className="mono text-[10px] italic text-center" style={{ color: 'var(--text-secondary)' }}>
          "{currentVerdict}"
        </div>
      )}

      <div className="flex items-center gap-2">
        <span className="mono text-[8px] tracking-wider" style={{ color: 'var(--text-dim)' }}>THREAT:</span>
        <span
          className="mono text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded-sm"
          style={{ color: threat.color, background: `${threat.color}12`, border: `1px solid ${threat.color}25` }}
        >
          {threat.label}
        </span>
      </div>

      {uniqueSignals.length > 0 && (
        <div className="flex flex-wrap gap-1 justify-center max-w-[220px]">
          {uniqueSignals.map((s, i) => (
            <span
              key={i}
              className="mono text-[7px] px-1 py-0.5 rounded-sm font-semibold"
              style={{ background: `${SIGNAL_COLORS[s] || '#ffab00'}12`, color: SIGNAL_COLORS[s] || '#ffab00' }}
            >
              {s}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
