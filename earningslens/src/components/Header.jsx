import { useState, useEffect } from 'react';

export default function Header({ company, isRunning, startTime, onBack, onSearch }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!isRunning || !startTime) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  const minutes = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const seconds = String(elapsed % 60).padStart(2, '0');

  const priceChange = company?.changes || 0;
  const priceColor = priceChange >= 0 ? '#00e676' : '#ff1744';
  const arrow = priceChange >= 0 ? '▲' : '▼';
  const pctChange = company?.price ? ((priceChange / company.price) * 100).toFixed(2) : '0.00';

  return (
    <div
      className="flex items-center justify-between px-4 h-[48px] shrink-0"
      style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-bright)' }}
    >
      <div className="flex items-center gap-4">
        <button
          onClick={onBack}
          className="mono text-[11px] flex items-center gap-1 px-2 py-1 rounded-sm transition-colors hover:bg-[var(--bg-elevated)]"
          style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
        >
          ← BACK
        </button>
        <div className="flex items-center gap-3">
          {company?.image && (
            <img
              src={company.image}
              alt=""
              className="w-5 h-5 rounded-sm"
              style={{ background: 'var(--bg-elevated)' }}
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )}
          <span className="mono text-[14px] font-bold" style={{ color: 'var(--accent-cyan)' }}>
            {company?.symbol}
          </span>
          <span className="text-[13px] truncate max-w-[200px]" style={{ color: 'var(--text-primary)' }}>
            {company?.companyName}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {company?.price && (
          <>
            <span className="mono text-[14px] font-bold" style={{ color: 'var(--text-primary)' }}>
              ${company.price.toFixed(2)}
            </span>
            <span className="mono text-[12px] font-semibold" style={{ color: priceColor }}>
              {arrow} {Math.abs(priceChange).toFixed(2)} ({pctChange}%)
            </span>
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        {isRunning && (
          <span className="mono text-[12px]" style={{ color: 'var(--text-secondary)' }}>
            {minutes}:{seconds}
          </span>
        )}
        <div className="flex items-center gap-2">
          <div
            className={`w-2 h-2 rounded-full ${isRunning ? 'pulse-dot' : ''}`}
            style={{ background: isRunning ? '#00e676' : '#4a7a9b' }}
          />
          <span
            className="mono text-[10px] font-semibold tracking-wider"
            style={{ color: isRunning ? '#00e676' : '#4a7a9b' }}
          >
            {isRunning ? 'ANALYZING' : 'READY'}
          </span>
        </div>
        <button
          onClick={onSearch}
          className="p-1.5 rounded-sm transition-colors hover:bg-[var(--bg-elevated)]"
          style={{ border: '1px solid var(--border)' }}
        >
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke="var(--text-secondary)" strokeWidth="1.5" />
            <line x1="11" y1="11" x2="14.5" y2="14.5" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}
