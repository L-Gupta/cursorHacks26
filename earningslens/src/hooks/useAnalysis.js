import { useState, useRef, useCallback } from 'react';

const analyzeStatement = async (line, keyClaims) => {
  const claimsContext =
    keyClaims.length > 0
      ? `\nKey claims made earlier in this call:\n${keyClaims
          .slice(-12)
          .map((c, i) => `${i + 1}. [${c.role}] "${c.text.slice(0, 150)}"`)
          .join('\n')}\n`
      : '';

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': import.meta.env.VITE_ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 250,
        system: `You are a financial deception analyst reviewing an earnings call transcript. Respond ONLY with raw JSON, no markdown, no backticks.
Format:
{
  "score_delta": <integer -5 to 25, positive = more deceptive>,
  "signals": [<only include DETECTED signals from: "HEDGING","PASSIVE VOICE","DEFLECTION","OVERCLAIMING","VAGUE QUANTIFIER","NON-ANSWER","TOPIC SWITCH","MINIMIZING","ABSOLUTISM">],
  "verdict": "<max 8 words>",
  "is_key_claim": <boolean, true if this is a significant factual/financial claim worth tracking>,
  "contradiction": null or {"prior_claim_index": <1-based index from the key claims list>, "explanation": "<one sentence>", "severity": "critical"|"high"|"medium"}
}
Be aggressive in detecting deception patterns. Analysts asking questions should get score_delta 0 or negative.`,
        messages: [
          {
            role: 'user',
            content: `${claimsContext}\nNow analyze this statement:\nSpeaker: ${line.speaker} (${line.role})\n"${line.text}"`,
          },
        ],
      }),
    });
    const data = await res.json();
    return JSON.parse(data.content[0].text);
  } catch {
    return { score_delta: 0, signals: [], verdict: 'Analysis pending', is_key_claim: false, contradiction: null };
  }
};

export function useAnalysis() {
  const [transcriptLines, setTranscriptLines] = useState([]);
  const [deceptionScore, setDeceptionScore] = useState(0);
  const [signals, setSignals] = useState([]);
  const [credibilityHistory, setCredibilityHistory] = useState([]);
  const [findings, setFindings] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [currentVerdict, setCurrentVerdict] = useState('');
  const [currentSpeaker, setCurrentSpeaker] = useState('');
  const [totalLines, setTotalLines] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [startTime, setStartTime] = useState(0);

  const intervalRef = useRef(null);
  const indexRef = useRef(0);
  const scoreRef = useRef(0);
  const roleScoresRef = useRef({});
  const keyClaimsRef = useRef([]);
  const transcriptRef = useRef([]);
  const pausedRef = useRef(false);
  const speedRef = useRef(1);
  const startTimeRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const tick = useCallback(async () => {
    if (pausedRef.current) return;

    const idx = indexRef.current;
    const transcript = transcriptRef.current;
    if (idx >= transcript.length) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      return;
    }

    const line = transcript[idx];
    setCurrentIndex(idx);
    setCurrentSpeaker(line.role);
    setTranscriptLines((prev) => [...prev, { ...line, analyzing: true, signals: [], verdict: '' }]);

    const result = await analyzeStatement(line, keyClaimsRef.current);

    const newScore = Math.max(0, Math.min(100, scoreRef.current + result.score_delta));
    scoreRef.current = newScore;
    setDeceptionScore(newScore);
    setCurrentVerdict(result.verdict);

    if (result.signals && result.signals.length > 0) {
      setSignals((prev) => [...prev, ...result.signals]);
    }

    setTranscriptLines((prev) =>
      prev.map((l) =>
        l.id === line.id ? { ...l, analyzing: false, signals: result.signals || [], verdict: result.verdict } : l
      )
    );

    if (result.is_key_claim) {
      keyClaimsRef.current = [...keyClaimsRef.current, { role: line.role, speaker: line.speaker, text: line.text }];
    }

    const roleKey = line.role;
    if (roleKey === 'CEO' || roleKey === 'CFO') {
      const prev = roleScoresRef.current[roleKey] || 0;
      const updated = Math.max(0, Math.min(100, prev + result.score_delta));
      roleScoresRef.current = { ...roleScoresRef.current, [roleKey]: updated };
    }

    const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
    setCredibilityHistory((prev) => [
      ...prev,
      {
        time: elapsed,
        ceoScore: Math.max(0, 100 - (roleScoresRef.current['CEO'] || 0)),
        cfoScore: Math.max(0, 100 - (roleScoresRef.current['CFO'] || 0)),
      },
    ]);

    if (result.contradiction) {
      const priorClaim = keyClaimsRef.current[result.contradiction.prior_claim_index - 1];
      setFindings((prev) => [
        ...prev,
        {
          type: 'contradiction',
          severity: result.contradiction.severity,
          current: line.text.slice(0, 200),
          currentSpeaker: line.speaker,
          prior: priorClaim ? priorClaim.text.slice(0, 200) : 'Earlier statement',
          priorSpeaker: priorClaim?.speaker || 'Unknown',
          explanation: result.contradiction.explanation,
          timestamp: new Date().toLocaleTimeString(),
          id: Date.now(),
        },
      ]);
    }

    if (result.score_delta >= 15) {
      setFindings((prev) => [
        ...prev,
        {
          type: 'high_signal',
          signals: result.signals,
          text: line.text.slice(0, 200),
          speaker: line.speaker,
          role: line.role,
          verdict: result.verdict,
          scoreDelta: result.score_delta,
          timestamp: new Date().toLocaleTimeString(),
          id: Date.now() + 1,
        },
      ]);
    }

    indexRef.current = idx + 1;
  }, []);

  const startAnalysis = useCallback(
    (parsedTranscript) => {
      clearTimer();

      transcriptRef.current = parsedTranscript;
      indexRef.current = 0;
      scoreRef.current = 0;
      roleScoresRef.current = {};
      keyClaimsRef.current = [];
      pausedRef.current = false;
      const now = Date.now();
      startTimeRef.current = now;

      setTranscriptLines([]);
      setDeceptionScore(0);
      setSignals([]);
      setCredibilityHistory([]);
      setFindings([]);
      setCurrentIndex(-1);
      setCurrentVerdict('');
      setCurrentSpeaker('');
      setTotalLines(parsedTranscript.length);
      setIsRunning(true);
      setIsPaused(false);
      setStartTime(now);

      tick();
      intervalRef.current = setInterval(tick, 2500 / speedRef.current);
    },
    [tick, clearTimer]
  );

  const stopAnalysis = useCallback(() => {
    clearTimer();
    setIsRunning(false);
    setIsPaused(false);
  }, [clearTimer]);

  const togglePause = useCallback(() => {
    pausedRef.current = !pausedRef.current;
    setIsPaused(pausedRef.current);
  }, []);

  const changeSpeed = useCallback(
    (newSpeed) => {
      speedRef.current = newSpeed;
      setSpeed(newSpeed);
      if (isRunning && !isPaused) {
        clearTimer();
        intervalRef.current = setInterval(tick, 2500 / newSpeed);
      }
    },
    [isRunning, isPaused, tick, clearTimer]
  );

  return {
    transcriptLines,
    deceptionScore,
    signals,
    credibilityHistory,
    findings,
    isRunning,
    isPaused,
    currentIndex,
    currentVerdict,
    currentSpeaker,
    totalLines,
    speed,
    startTime,
    startAnalysis,
    stopAnalysis,
    togglePause,
    changeSpeed,
  };
}
