/**
 * DeceptionDashboard — animated arc gauges (0–100) per speaker.
 *
 * Fills toward red as deception score increases per design tokens. Updates on
 * each ``/analyze`` response (score delta applied to rolling credibility).
 * Uses CSS transitions for needle/arc motion; no animation libraries.
 */
export function DeceptionDashboard() {
  return (
    <section
      className="rounded-lg border border-slate-700 bg-el-surface p-4"
      aria-label="Deception scores"
    >
      <h2 className="text-sm font-medium text-slate-300">Deception scores</h2>
      <p className="mt-2 font-mono text-xs text-slate-500">Not wired — scaffold</p>
    </section>
  );
}
