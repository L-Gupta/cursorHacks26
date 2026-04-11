/**
 * ReportExport — builds a downloadable PDF via jsPDF.
 *
 * Includes flagged statements, contradiction pairs, final per-speaker scores,
 * and session metadata. Fetches ``GET /report/{session_id}`` when needed to
 * mirror server-side truth for the export.
 */
export function ReportExport() {
  return (
    <section
      className="rounded-lg border border-slate-700 bg-el-surface p-4"
      aria-label="Export report"
    >
      <h2 className="text-sm font-medium text-slate-300">Export report</h2>
      <p className="mt-2 font-mono text-xs text-slate-500">Not wired — scaffold</p>
    </section>
  );
}
