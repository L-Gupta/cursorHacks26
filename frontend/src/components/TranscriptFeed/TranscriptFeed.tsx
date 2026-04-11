/**
 * TranscriptFeed — renders word-by-word transcript with speaker pills.
 *
 * Maps Deepgram diarization labels to CEO / CFO / Analyst colors, animates new
 * words with CSS transitions only (opacity/transform), and uses monospace per
 * UI spec. Buffers partial words until finalized when the API emits end-of-
 * utterance events.
 */
export function TranscriptFeed() {
  return (
    <section
      className="rounded-lg border border-slate-700 bg-el-surface p-4"
      aria-label="Live transcript"
    >
      <h2 className="text-sm font-medium text-slate-300">Transcript</h2>
      <p className="mt-2 font-mono text-xs text-slate-500">Not wired — scaffold</p>
    </section>
  );
}
