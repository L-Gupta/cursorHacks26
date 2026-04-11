import { useState, useEffect, useRef, useCallback } from 'react';
import { searchCompanies } from '../services/api';

export default function SearchPage({ onSelect }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  const doSearch = useCallback(async (q) => {
    if (!q || q.length < 1) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await searchCompanies(q);
      setResults(data.slice(0, 8));
    } catch (err) {
      setError(err.message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(query), 300);
    return () => clearTimeout(debounceRef.current);
  }, [query, doSearch]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const showDropdown = focused && (results.length > 0 || loading || error);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center relative" style={{ background: 'var(--bg-primary)' }}>
      <div className="text-center mb-10">
        <h1 className="mono font-bold tracking-[0.35em]" style={{ fontSize: 42, color: 'var(--accent-cyan)', lineHeight: 1.1 }}>
          EARNINGSLENS
        </h1>
        <p className="mono text-[11px] tracking-[0.25em] mt-3" style={{ color: 'var(--text-secondary)' }}>
          REAL-TIME EARNINGS CALL DECEPTION ANALYSIS
        </p>
      </div>

      <div className="relative w-[520px]">
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-sm transition-all duration-200"
          style={{
            background: 'var(--bg-surface)',
            border: `1px solid ${focused ? 'var(--accent-cyan)' : 'var(--border)'}`,
            boxShadow: focused ? '0 0 20px rgba(0, 212, 255, 0.08)' : 'none',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="7" cy="7" r="5.5" stroke="var(--text-secondary)" strokeWidth="1.5" />
            <line x1="11" y1="11" x2="14.5" y2="14.5" stroke="var(--text-secondary)" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
            placeholder="Search company name or ticker…"
            className="flex-1 bg-transparent outline-none mono text-[14px]"
            style={{ color: 'var(--text-primary)', caretColor: 'var(--accent-cyan)' }}
          />
          {loading && (
            <div className="w-4 h-4 border-2 border-transparent rounded-full animate-spin" style={{ borderTopColor: 'var(--accent-cyan)' }} />
          )}
        </div>

        {showDropdown && (
          <div
            className="absolute top-full left-0 right-0 mt-1 rounded-sm overflow-hidden z-50"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-bright)' }}
          >
            {error && (
              <div className="px-4 py-3 mono text-[11px]" style={{ color: 'var(--accent-red)' }}>
                {error}
              </div>
            )}
            {results.map((r) => (
              <button
                key={`${r.symbol}-${r.exchangeShortName}`}
                onClick={() => onSelect(r)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors duration-100 hover:bg-[var(--bg-elevated)]"
                style={{ borderBottom: '1px solid var(--border)' }}
              >
                <span className="mono text-[13px] font-bold w-16" style={{ color: 'var(--accent-cyan)' }}>
                  {r.symbol}
                </span>
                <span className="flex-1 text-[13px] truncate" style={{ color: 'var(--text-primary)' }}>
                  {r.name}
                </span>
                <span
                  className="mono text-[9px] px-1.5 py-0.5 rounded-sm"
                  style={{ background: 'var(--accent-cyan-dim)', color: 'var(--accent-cyan)' }}
                >
                  {r.exchangeShortName}
                </span>
              </button>
            ))}
            {!loading && !error && results.length === 0 && query.length > 0 && (
              <div className="px-4 py-3 mono text-[11px]" style={{ color: 'var(--text-dim)' }}>
                No results found
              </div>
            )}
          </div>
        )}
      </div>

      <div className="mt-12 text-center">
        <p className="mono text-[9px] tracking-widest" style={{ color: 'var(--text-dim)' }}>
          POWERED BY FINANCIAL MODELING PREP & CLAUDE AI
        </p>
      </div>

      <div className="absolute bottom-6 left-0 right-0 text-center">
        <p className="mono text-[9px]" style={{ color: 'var(--text-dim)' }}>
          Search any publicly traded company to analyze their earnings calls for deception patterns
        </p>
      </div>
    </div>
  );
}
