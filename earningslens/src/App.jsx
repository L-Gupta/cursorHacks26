import { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import SearchPage from './components/SearchPage';
import StockChart from './components/StockChart';
import TranscriptFeed from './components/TranscriptFeed';
import DeceptionGauge from './components/DeceptionGauge';
import CredibilityTimeline from './components/CredibilityTimeline';
import FindingsPanel from './components/FindingsPanel';
import { useAnalysis } from './hooks/useAnalysis';
import {
  getCompanyProfile,
  getAvailableTranscripts,
  getTranscript,
  parseTranscript,
  hasKeys,
} from './services/api';

function SetupScreen() {
  return (
    <div className="h-screen w-screen flex items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
      <div className="max-w-md text-center p-8 rounded-sm" style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)' }}>
        <h1 className="mono text-[20px] font-bold tracking-[0.2em] mb-4" style={{ color: 'var(--accent-cyan)' }}>
          EARNINGSLENS
        </h1>
        <p className="text-[13px] mb-6" style={{ color: 'var(--text-secondary)' }}>
          API keys required to run. Create a <code className="mono text-[12px]" style={{ color: 'var(--accent-cyan)' }}>.env</code> file in the project root:
        </p>
        <div className="text-left p-3 rounded-sm mono text-[11px] leading-relaxed" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
          <div style={{ color: 'var(--text-dim)' }}># .env</div>
          <div><span style={{ color: 'var(--accent-cyan)' }}>VITE_ANTHROPIC_API_KEY</span><span style={{ color: 'var(--text-secondary)' }}>=sk-ant-…</span></div>
          <div><span style={{ color: 'var(--accent-cyan)' }}>VITE_FMP_API_KEY</span><span style={{ color: 'var(--text-secondary)' }}>=your_fmp_key</span></div>
        </div>
        <p className="text-[11px] mt-4" style={{ color: 'var(--text-dim)' }}>
          Get your FMP key at <span className="mono" style={{ color: 'var(--accent-cyan)' }}>financialmodelingprep.com</span>
        </p>
        <p className="text-[11px] mt-1" style={{ color: 'var(--text-dim)' }}>
          Then restart the dev server.
        </p>
      </div>
    </div>
  );
}

function CallSelector({ calls, selected, onSelect, loading }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2">
        <div className="w-3 h-3 border-2 border-transparent rounded-full animate-spin" style={{ borderTopColor: 'var(--accent-cyan)' }} />
        <span className="mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>Loading calls…</span>
      </div>
    );
  }

  if (calls.length === 0) {
    return (
      <div className="px-3 py-2">
        <span className="mono text-[10px]" style={{ color: 'var(--text-dim)' }}>No earnings calls available</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-2 flex-wrap">
      <span className="mono text-[9px] tracking-wider shrink-0" style={{ color: 'var(--text-secondary)' }}>CALL:</span>
      <select
        value={selected ? `${selected.quarter}-${selected.year}` : ''}
        onChange={(e) => {
          const [q, y] = e.target.value.split('-');
          const call = calls.find((c) => String(c.quarter) === q && String(c.year) === y);
          if (call) onSelect(call);
        }}
        className="mono text-[11px] px-2 py-1 rounded-sm outline-none cursor-pointer"
        style={{
          background: 'var(--bg-primary)',
          color: 'var(--accent-cyan)',
          border: '1px solid var(--border)',
        }}
      >
        <option value="">Select quarter…</option>
        {calls.slice(0, 20).map((c) => (
          <option key={`${c.quarter}-${c.year}`} value={`${c.quarter}-${c.year}`}>
            Q{c.quarter} {c.year}
          </option>
        ))}
      </select>
    </div>
  );
}

function AnalysisControls({ isRunning, isPaused, speed, onStart, onStop, onTogglePause, onSpeedChange, canStart }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2 flex-wrap" style={{ borderTop: '1px solid var(--border)' }}>
      {!isRunning ? (
        <button
          onClick={onStart}
          disabled={!canStart}
          className="mono text-[10px] font-semibold tracking-wider px-3 py-1.5 rounded-sm transition-colors"
          style={{
            background: canStart ? 'var(--accent-cyan-dim)' : 'var(--bg-primary)',
            color: canStart ? 'var(--accent-cyan)' : 'var(--text-dim)',
            border: `1px solid ${canStart ? 'var(--accent-cyan)' : 'var(--border)'}`,
            cursor: canStart ? 'pointer' : 'default',
          }}
        >
          ▶ START ANALYSIS
        </button>
      ) : (
        <>
          <button
            onClick={onTogglePause}
            className="mono text-[10px] font-semibold tracking-wider px-3 py-1.5 rounded-sm transition-colors hover:bg-[var(--bg-elevated)]"
            style={{ color: 'var(--accent-amber)', border: '1px solid var(--border)' }}
          >
            {isPaused ? '▶ RESUME' : '⏸ PAUSE'}
          </button>
          <button
            onClick={onStop}
            className="mono text-[10px] font-semibold tracking-wider px-3 py-1.5 rounded-sm transition-colors hover:bg-[var(--bg-elevated)]"
            style={{ color: 'var(--accent-red)', border: '1px solid var(--border)' }}
          >
            ■ STOP
          </button>
        </>
      )}
      <div className="flex items-center gap-1 ml-auto">
        <span className="mono text-[8px] tracking-wider" style={{ color: 'var(--text-dim)' }}>SPEED:</span>
        {[1, 2, 4].map((s) => (
          <button
            key={s}
            onClick={() => onSpeedChange(s)}
            className="mono text-[9px] font-semibold px-1.5 py-0.5 rounded-sm transition-colors"
            style={{
              background: speed === s ? 'var(--accent-cyan-dim)' : 'transparent',
              color: speed === s ? 'var(--accent-cyan)' : 'var(--text-dim)',
              border: `1px solid ${speed === s ? 'var(--accent-cyan)' : 'var(--border)'}`,
            }}
          >
            {s}x
          </button>
        ))}
      </div>
    </div>
  );
}

function Dashboard({ company, onBack }) {
  const [profile, setProfile] = useState(null);
  const [availableCalls, setAvailableCalls] = useState([]);
  const [selectedCall, setSelectedCall] = useState(null);
  const [parsedTranscript, setParsedTranscript] = useState([]);
  const [loadingCalls, setLoadingCalls] = useState(true);
  const [loadingTranscript, setLoadingTranscript] = useState(false);
  const [error, setError] = useState('');

  const analysis = useAnalysis();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingCalls(true);
        const [prof, calls] = await Promise.all([
          getCompanyProfile(company.symbol),
          getAvailableTranscripts(company.symbol),
        ]);
        if (cancelled) return;
        setProfile(prof);
        setAvailableCalls(calls);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoadingCalls(false);
      }
    })();
    return () => { cancelled = true; };
  }, [company.symbol]);

  const handleSelectCall = useCallback(async (call) => {
    setSelectedCall(call);
    setLoadingTranscript(true);
    setError('');
    analysis.stopAnalysis();
    try {
      const data = await getTranscript(company.symbol, call.quarter, call.year);
      if (data && data.content) {
        const parsed = parseTranscript(data.content);
        setParsedTranscript(parsed);
      } else {
        setError('Transcript not available for this quarter');
        setParsedTranscript([]);
      }
    } catch (err) {
      setError(err.message);
      setParsedTranscript([]);
    } finally {
      setLoadingTranscript(false);
    }
  }, [company.symbol, analysis]);

  const handleStart = useCallback(() => {
    if (parsedTranscript.length > 0) {
      analysis.startAnalysis(parsedTranscript);
    }
  }, [parsedTranscript, analysis]);

  const isPanic = analysis.deceptionScore > 70;

  return (
    <div
      className={`h-screen w-screen flex flex-col ${isPanic ? 'dashboard-panic' : ''}`}
      style={{ background: 'var(--bg-primary)' }}
    >
      <Header
        company={profile || company}
        isRunning={analysis.isRunning}
        startTime={analysis.startTime}
        onBack={onBack}
        onSearch={onBack}
      />

      {error && (
        <div className="px-4 py-2 mono text-[11px]" style={{ background: 'var(--accent-red-dim)', color: 'var(--accent-red)' }}>
          {error}
          <button onClick={() => setError('')} className="ml-3 underline">dismiss</button>
        </div>
      )}

      <div
        className="flex-1 grid gap-1 p-1 min-h-0"
        style={{
          gridTemplateColumns: '1.15fr 1fr',
          gridTemplateRows: '1fr 1fr 160px',
        }}
      >
        {/* Stock Chart - top left */}
        <StockChart symbol={company.symbol} exchange={company.exchangeShortName} />

        {/* Control Panel + Gauge - top right */}
        <div className="panel flex flex-col min-h-0">
          <div className="panel-header">ANALYSIS CONTROL — {company.symbol}</div>
          <CallSelector
            calls={availableCalls}
            selected={selectedCall}
            onSelect={handleSelectCall}
            loading={loadingCalls}
          />
          {loadingTranscript && (
            <div className="flex items-center gap-2 px-3 py-2" style={{ borderTop: '1px solid var(--border)' }}>
              <div className="w-3 h-3 border-2 border-transparent rounded-full animate-spin" style={{ borderTopColor: 'var(--accent-cyan)' }} />
              <span className="mono text-[10px]" style={{ color: 'var(--text-secondary)' }}>
                Loading transcript ({company.symbol} Q{selectedCall?.quarter} {selectedCall?.year})…
              </span>
            </div>
          )}
          {!loadingTranscript && parsedTranscript.length > 0 && (
            <div className="px-3 py-1 mono text-[9px]" style={{ color: 'var(--text-dim)', borderTop: '1px solid var(--border)' }}>
              {parsedTranscript.length} speaker turns loaded
            </div>
          )}
          <AnalysisControls
            isRunning={analysis.isRunning}
            isPaused={analysis.isPaused}
            speed={analysis.speed}
            onStart={handleStart}
            onStop={analysis.stopAnalysis}
            onTogglePause={analysis.togglePause}
            onSpeedChange={analysis.changeSpeed}
            canStart={parsedTranscript.length > 0 && !analysis.isRunning}
          />
          <div className="flex-1 overflow-y-auto min-h-0 flex items-center justify-center">
            <DeceptionGauge
              deceptionScore={analysis.deceptionScore}
              signals={analysis.signals}
              currentVerdict={analysis.currentVerdict}
              currentSpeaker={analysis.currentSpeaker}
            />
          </div>
        </div>

        {/* Transcript Feed - middle left */}
        <TranscriptFeed
          transcriptLines={analysis.transcriptLines}
          currentIndex={analysis.currentIndex}
          totalLines={analysis.totalLines}
        />

        {/* Findings Panel - middle right */}
        <FindingsPanel findings={analysis.findings} signals={analysis.signals} />

        {/* Credibility Timeline - bottom, spans both columns */}
        <div className="col-span-2 min-h-0 h-full">
          <CredibilityTimeline credibilityHistory={analysis.credibilityHistory} />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [selectedCompany, setSelectedCompany] = useState(null);

  if (!hasKeys()) {
    return <SetupScreen />;
  }

  if (!selectedCompany) {
    return <SearchPage onSelect={setSelectedCompany} />;
  }

  return (
    <Dashboard
      key={selectedCompany.symbol}
      company={selectedCompany}
      onBack={() => setSelectedCompany(null)}
    />
  );
}
