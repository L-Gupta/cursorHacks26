import { useRef, useEffect } from 'react';

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

const ROLE_STYLES = {
  CEO: { bg: 'rgba(0, 212, 255, 0.15)', color: '#00d4ff' },
  CFO: { bg: 'rgba(255, 171, 0, 0.15)', color: '#ffab00' },
  COO: { bg: 'rgba(0, 230, 118, 0.15)', color: '#00e676' },
  ANALYST: { bg: 'rgba(74, 122, 155, 0.15)', color: '#4a7a9b' },
  EXECUTIVE: { bg: 'rgba(179, 136, 255, 0.15)', color: '#b388ff' },
  OTHER: { bg: 'rgba(74, 122, 155, 0.1)', color: '#4a7a9b' },
};

export default function TranscriptFeed({ transcriptLines, currentIndex, totalLines }) {
  const containerRef = useRef(null);
  const visibleLines = transcriptLines.slice(-10);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [transcriptLines.length]);

  const progress = totalLines > 0 ? ((currentIndex + 1) / totalLines) * 100 : 0;

  return (
    <div className="panel h-full flex flex-col">
      <div className="panel-header flex items-center justify-between">
        <span>TRANSCRIPT FEED</span>
        {totalLines > 0 && (
          <span className="mono text-[9px]" style={{ color: 'var(--text-secondary)' }}>
            {Math.min(currentIndex + 1, totalLines)} / {totalLines}
          </span>
        )}
      </div>

      {totalLines > 0 && (
        <div className="h-0.5 shrink-0" style={{ background: 'var(--bg-primary)' }}>
          <div
            className="h-full transition-all duration-500"
            style={{ width: `${progress}%`, background: 'var(--accent-cyan)' }}
          />
        </div>
      )}

      <div ref={containerRef} className="flex-1 overflow-y-auto p-3 flex flex-col gap-1.5">
        {visibleLines.length === 0 && (
          <div className="flex-1 flex items-center justify-center">
            <span className="mono text-[10px]" style={{ color: 'var(--text-dim)' }}>
              Select an earnings call to begin
            </span>
          </div>
        )}
        {visibleLines.map((line, i) => {
          const style = ROLE_STYLES[line.role] || ROLE_STYLES.OTHER;
          const isLast = i === visibleLines.length - 1;
          const opacity = 0.4 + (i / Math.max(visibleLines.length - 1, 1)) * 0.6;

          return (
            <div
              key={line.id}
              className={`fade-in-up ${line.analyzing ? 'analyzing-pulse' : ''}`}
              style={{
                opacity: line.analyzing ? 1 : opacity,
                borderLeft: line.analyzing ? '2px solid var(--accent-cyan)' : '2px solid transparent',
                background: line.analyzing ? 'rgba(0, 212, 255, 0.04)' : 'transparent',
                padding: '6px 8px',
                borderRadius: '2px',
                transition: 'background 0.3s ease',
              }}
            >
              <div className="flex items-start gap-2">
                <span
                  className="mono text-[8px] uppercase font-semibold px-1.5 py-0.5 rounded-sm shrink-0 mt-0.5"
                  style={{ background: style.bg, color: style.color }}
                >
                  {line.role}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] block mb-0.5 truncate" style={{ color: 'var(--text-dim)' }}>
                    {line.speaker}{line.title ? ` — ${line.title}` : ''}
                  </span>
                  <p className="text-[12px] leading-[1.55]" style={{ color: 'var(--text-primary)' }}>
                    {line.text.length > 300 ? line.text.slice(0, 300) + '…' : line.text}
                  </p>
                  {!line.analyzing && line.signals && line.signals.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {line.signals.map((s, si) => (
                        <span
                          key={si}
                          className="mono text-[7px] px-1 py-0.5 rounded-sm font-semibold"
                          style={{
                            background: `${SIGNAL_COLORS[s] || '#ffab00'}15`,
                            color: SIGNAL_COLORS[s] || '#ffab00',
                            border: `1px solid ${SIGNAL_COLORS[s] || '#ffab00'}25`,
                          }}
                        >
                          {s}
                        </span>
                      ))}
                      {line.verdict && (
                        <span className="mono text-[7px] px-1 py-0.5 italic" style={{ color: 'var(--text-dim)' }}>
                          — {line.verdict}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
