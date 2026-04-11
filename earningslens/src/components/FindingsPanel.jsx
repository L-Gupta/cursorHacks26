const SEVERITY_COLORS = {
  critical: '#ff1744',
  high: '#ffab00',
  medium: '#ffd600',
};

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

function SignalBreakdown({ signals }) {
  const counts = {};
  for (const s of signals) {
    counts[s] = (counts[s] || 0) + 1;
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const max = sorted.length > 0 ? sorted[0][1] : 1;

  if (sorted.length === 0) {
    return (
      <div className="mono text-[10px] py-2" style={{ color: 'var(--text-dim)' }}>
        No signals detected yet
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      {sorted.map(([signal, count]) => {
        const color = SIGNAL_COLORS[signal] || '#ffab00';
        const pct = (count / max) * 100;
        return (
          <div key={signal} className="flex items-center gap-2">
            <span className="mono text-[9px] w-28 truncate" style={{ color }}>{signal}</span>
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-primary)' }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${pct}%`, background: color, opacity: 0.7 }}
              />
            </div>
            <span className="mono text-[9px] w-5 text-right" style={{ color: 'var(--text-secondary)' }}>{count}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function FindingsPanel({ findings, signals }) {
  const contradictions = findings.filter((f) => f.type === 'contradiction');
  const flagged = findings.filter((f) => f.type === 'high_signal');

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header flex items-center justify-between">
        <span>FINDINGS</span>
        {findings.length > 0 && (
          <span
            className="mono text-[9px] px-1.5 py-0.5 rounded-sm"
            style={{ background: 'var(--accent-red-dim)', color: 'var(--accent-red)' }}
          >
            {findings.length}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        <div>
          <div className="mono text-[9px] font-semibold tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
            SIGNAL BREAKDOWN
          </div>
          <SignalBreakdown signals={signals} />
        </div>

        {contradictions.length > 0 && (
          <div>
            <div className="mono text-[9px] font-semibold tracking-wider mb-2 flex items-center gap-2" style={{ color: 'var(--accent-red)' }}>
              CONTRADICTIONS
              <span
                className="px-1 py-0.5 rounded-sm text-[8px]"
                style={{ background: 'var(--accent-red-dim)' }}
              >
                {contradictions.length}
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {contradictions.map((c) => {
                const color = SEVERITY_COLORS[c.severity] || '#ffab00';
                return (
                  <div
                    key={c.id}
                    className="p-2 rounded-sm"
                    style={{ background: 'var(--bg-primary)', border: `1px solid ${color}30`, borderLeft: `3px solid ${color}` }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
                        <span className="mono text-[8px] font-bold tracking-wider" style={{ color }}>
                          {c.severity.toUpperCase()}
                        </span>
                      </div>
                      <span className="mono text-[8px]" style={{ color: 'var(--text-dim)' }}>{c.timestamp}</span>
                    </div>
                    <p className="text-[10px] italic leading-snug mb-1" style={{ color: 'var(--text-primary)' }}>
                      [{c.currentSpeaker}] "{c.current}"
                    </p>
                    <p className="text-[10px] leading-snug" style={{ color: `${color}bb` }}>
                      ↳ {c.explanation}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {flagged.length > 0 && (
          <div>
            <div className="mono text-[9px] font-semibold tracking-wider mb-2" style={{ color: 'var(--accent-amber)' }}>
              FLAGGED STATEMENTS
            </div>
            <div className="flex flex-col gap-1.5">
              {flagged.map((f) => (
                <div
                  key={f.id}
                  className="p-2 rounded-sm"
                  style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="mono text-[9px] font-semibold" style={{ color: 'var(--accent-amber)' }}>
                      +{f.scoreDelta} DECEPTION
                    </span>
                    <span className="mono text-[8px]" style={{ color: 'var(--text-dim)' }}>{f.timestamp}</span>
                  </div>
                  <p className="text-[10px] italic leading-snug" style={{ color: 'var(--text-primary)' }}>
                    [{f.speaker}] "{f.text}"
                  </p>
                  {f.signals && f.signals.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {f.signals.map((s, i) => (
                        <span
                          key={i}
                          className="mono text-[7px] px-1 py-0.5 rounded-sm"
                          style={{ background: `${SIGNAL_COLORS[s] || '#ffab00'}15`, color: SIGNAL_COLORS[s] || '#ffab00' }}
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {findings.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <span className="mono text-[10px]" style={{ color: 'var(--text-dim)' }}>
              Findings will appear here during analysis
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
