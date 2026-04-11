import { useRef, useEffect, useCallback } from 'react'

const SIMULATION_SEGMENTS = [
  { speaker: 'CEO', text: "We're seeing tremendous momentum across all our business segments. Revenue grew approximately 18% year-over-year, which we believe reflects strong underlying demand." },
  { speaker: 'CFO', text: "Operating margins came in at around 21%, roughly in line with our guidance. We expect this to improve significantly going forward as we scale our operations." },
  { speaker: 'Analyst', text: "Can you provide more specific guidance on the margin expansion timeline? You mentioned double-digit growth earlier but the numbers seem to suggest otherwise." },
  { speaker: 'CEO', text: "Going forward, we're confident we'll achieve our targets. The supply chain headwinds have been fully resolved and we don't anticipate any further disruption to speak of." },
  { speaker: 'CFO', text: "Cash flow from operations was solid at approximately $2.1 billion. We believe this demonstrates our robust financial position and commitment to shareholder value creation." },
  { speaker: 'CEO', text: "Our AI initiatives are showing substantial progress. We should see significant contributions to revenue in the coming quarters, though I can't provide specific numbers at this time." },
  { speaker: 'CFO', text: "R&D spend increased roughly 30% as we continue to invest in future growth. This is broadly consistent with our long-term strategic roadmap." },
  { speaker: 'Analyst', text: "The debt levels seem elevated versus peers. How do you plan to address the balance sheet concerns that multiple analysts have raised?" },
  { speaker: 'CEO', text: "We're very comfortable with our capital structure. Our strong cash generation provides ample coverage, and we expect leverage to decline naturally over the next few years." },
  { speaker: 'CFO', text: "Inventory levels were approximately 15% higher than last year, but we believe this positions us well to meet anticipated demand in the back half." },
]

export default function AudioCapture({ isRecording, onToggle, onSegment }) {
  const mediaRecorderRef = useRef(null)
  const socketRef = useRef(null)
  const streamRef = useRef(null)
  const simulationRef = useRef(null)
  const segmentIndexRef = useRef(0)

  const apiKey = import.meta.env.VITE_DEEPGRAM_API_KEY

  const stopAll = useCallback(() => {
    if (simulationRef.current) {
      clearInterval(simulationRef.current)
      simulationRef.current = null
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop()
    }
    if (socketRef.current) {
      socketRef.current.close()
      socketRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
  }, [])

  const startSimulation = useCallback(() => {
    segmentIndexRef.current = 0
    simulationRef.current = setInterval(() => {
      const segment = SIMULATION_SEGMENTS[segmentIndexRef.current % SIMULATION_SEGMENTS.length]
      onSegment(segment)
      segmentIndexRef.current++
    }, 3500)
  }, [onSegment])

  const startDeepgram = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const socket = new WebSocket(
        `wss://api.deepgram.com/v1/listen?model=nova-2&diarize=true&smart_format=true`,
        ['token', apiKey]
      )
      socketRef.current = socket

      socket.onopen = () => {
        const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' })
        mediaRecorderRef.current = mediaRecorder
        mediaRecorder.ondataavailable = e => {
          if (e.data.size > 0 && socket.readyState === WebSocket.OPEN) {
            socket.send(e.data)
          }
        }
        mediaRecorder.start(250)
      }

      socket.onmessage = e => {
        try {
          const data = JSON.parse(e.data)
          if (data.type === 'Results' && data.is_final) {
            const alt = data.channel?.alternatives?.[0]
            if (!alt?.transcript) return
            const text = alt.transcript.trim()
            if (!text) return
            const words = alt.words || []
            const speakerNum = words[0]?.speaker ?? 0
            const speakerMap = ['CEO', 'CFO', 'Analyst', 'Unknown']
            const speaker = speakerMap[speakerNum] || `Speaker ${speakerNum}`
            onSegment({ speaker, text })
          }
        } catch {
          // Ignore parse errors
        }
      }

      socket.onerror = () => {
        // Fallback to simulation on error
        stopAll()
        startSimulation()
      }
    } catch {
      // Fallback to simulation if mic unavailable
      startSimulation()
    }
  }, [apiKey, onSegment, startSimulation, stopAll])

  const handleToggle = useCallback(() => {
    if (isRecording) {
      stopAll()
      onToggle(false)
    } else {
      onToggle(true)
      if (apiKey && apiKey !== 'your_deepgram_api_key_here') {
        startDeepgram()
      } else {
        startSimulation()
      }
    }
  }, [isRecording, apiKey, onToggle, stopAll, startSimulation, startDeepgram])

  useEffect(() => {
    return () => stopAll()
  }, [stopAll])

  const isSimMode = !apiKey || apiKey === 'your_deepgram_api_key_here'

  return (
    <div className="flex items-center gap-3">
      {isSimMode && (
        <span className="text-xs text-yellow-500 bg-yellow-900/30 px-2 py-0.5 rounded">
          DEMO MODE
        </span>
      )}
      <button
        onClick={handleToggle}
        className={`flex items-center gap-2 px-4 py-1.5 rounded font-medium text-sm transition-colors ${
          isRecording
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-green-600 hover:bg-green-700 text-white'
        }`}
      >
        {isRecording ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-200" />
            </span>
            Stop Recording
          </>
        ) : (
          <>
            <span className="h-2 w-2 rounded-full bg-green-300" />
            {isSimMode ? 'Start Demo' : 'Start Recording'}
          </>
        )}
      </button>
    </div>
  )
}
