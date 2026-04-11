/**
 * useDeepgram — manages Deepgram WebSocket lifecycle and transcript events.
 *
 * Exposes connection state, partial/final transcripts, speaker labels, and
 * errors. Buffers audio from AudioCapture or DemoMode at the cadence required
 * for streaming STT + diarization.
 *
 * Implementation deferred; scaffold returns inert placeholders.
 */
export function useDeepgram() {
  return {
    status: "idle" as const,
    connect: async () => {},
    disconnect: () => {},
  };
}
