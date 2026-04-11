/**
 * ContradictionCard — flagged contradiction with evidence pairing.
 *
 * Layout: slide-in from the right (CSS transform + transition), border-left
 * accent in danger red. Shows PRIOR STATEMENT (filing date, doc type) vs CURRENT
 * STATEMENT (timestamp, quote). Receives a structured prop from session state
 * populated by Chroma + Claude pipeline.
 */
export function ContradictionCard() {
  return (
    <article
      className="border-l-4 border-el-danger bg-el-surface p-4 transition-transform duration-300"
      style={{ borderLeftColor: "#ef4444" }}
    >
      <h3 className="text-xs font-semibold uppercase tracking-wide text-el-danger">
        Contradiction
      </h3>
      <p className="mt-2 font-mono text-xs text-slate-500">Not wired — scaffold</p>
    </article>
  );
}
