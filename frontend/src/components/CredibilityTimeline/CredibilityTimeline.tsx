/**
 * CredibilityTimeline — Recharts AreaChart with semi-transparent fills.
 *
 * One series per speaker; X axis is elapsed call time, Y axis is credibility
 * (0–100 inverted or raw per product decision). Feeds from accumulated
 * analyze results; uses only CSS-friendly chart props to stay performant.
 */
export function CredibilityTimeline() {
  return (
    <section
      className="rounded-lg border border-slate-700 bg-el-surface p-4"
      aria-label="Credibility timeline"
    >
      <h2 className="text-sm font-medium text-slate-300">Credibility timeline</h2>
      <p className="mt-2 font-mono text-xs text-slate-500">Not wired — scaffold</p>
    </section>
  );
}
