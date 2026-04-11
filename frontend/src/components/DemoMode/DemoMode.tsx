/**
 * DemoMode — plays a bundled MP3 at 1x speed through the same pipeline as live.
 *
 * Loads audio from ``/public/demo/``, uses Web Audio to stream chunks to
 * Deepgram, and relies on pre-indexed Chroma data for that ticker so
 * contradictions surface during the demo. Toggle is UI-identical to live mode.
 */
export function DemoMode() {
  return (
    <section
      className="rounded-lg border border-dashed border-el-warning/50 bg-el-surface p-4"
      aria-label="Demo mode"
    >
      <h2 className="text-sm font-medium text-el-warning">Demo mode</h2>
      <p className="mt-2 font-mono text-xs text-slate-500">
        Place MP3 under public/demo — scaffold
      </p>
    </section>
  );
}
