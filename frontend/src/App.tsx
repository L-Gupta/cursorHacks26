/**
 * Root application layout for EarningsLens.
 *
 * Composes AudioCapture, TranscriptFeed, DeceptionDashboard, ContradictionCard
 * list, CredibilityTimeline, ReportExport, and DemoMode. State management
 * (session id, speaker scores, transcript buffer) will live in hooks or context
 * in later implementation steps.
 */
import { DemoMode } from "./components/DemoMode/DemoMode";

export default function App() {
  return (
    <div className="min-h-screen bg-el-bg p-6">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-el-accent">
          EarningsLens
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Real-time earnings call deception signals — scaffold
        </p>
      </header>
      <DemoMode />
    </div>
  );
}
