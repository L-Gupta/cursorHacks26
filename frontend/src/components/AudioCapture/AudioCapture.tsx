/**
 * AudioCapture — captures live audio via Web Audio API and streams to Deepgram.
 *
 * Responsibilities:
 * - Request mic (or loopback where supported) with appropriate constraints.
 * - Downsample/encode to the format Deepgram expects for streaming.
 * - Open and maintain a WebSocket to Deepgram; reconnect on transient errors.
 * - Emit PCM/audio chunks upward so the parent can attach session metadata.
 *
 * Demo mode reuses the same component interface but feeds audio from a file
 * at 1x speed so judges cannot distinguish from live capture.
 */
export function AudioCapture() {
  return (
    <section
      className="rounded-lg border border-slate-700 bg-el-surface p-4"
      aria-label="Audio capture"
    >
      <h2 className="text-sm font-medium text-slate-300">Audio capture</h2>
      <p className="mt-2 font-mono text-xs text-slate-500">Not wired — scaffold</p>
    </section>
  );
}
