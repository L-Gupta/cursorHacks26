import { jsPDF } from 'jspdf'

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleString()
  } catch {
    return iso
  }
}

export default function ReportExport({ sessionId, transcript, scores, contradictions, ticker }) {
  const handleExport = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
    const W = doc.internal.pageSize.getWidth()
    const H = doc.internal.pageSize.getHeight()
    const margin = 20
    let y = margin

    const addPage = () => {
      doc.addPage()
      y = margin
    }

    const checkPage = (needed = 20) => {
      if (y + needed > H - margin) addPage()
    }

    const heading = (text, size = 16) => {
      checkPage(12)
      doc.setFontSize(size)
      doc.setTextColor(30, 30, 30)
      doc.setFont('helvetica', 'bold')
      doc.text(text, margin, y)
      y += size * 0.5
    }

    const body = (text, size = 10) => {
      doc.setFontSize(size)
      doc.setTextColor(60, 60, 60)
      doc.setFont('helvetica', 'normal')
      const lines = doc.splitTextToSize(text, W - 2 * margin)
      checkPage(lines.length * size * 0.45 + 4)
      doc.text(lines, margin, y)
      y += lines.length * size * 0.45 + 3
    }

    const divider = () => {
      checkPage(6)
      doc.setDrawColor(200, 200, 200)
      doc.line(margin, y, W - margin, y)
      y += 5
    }

    // Title page header
    doc.setFillColor(15, 23, 42)
    doc.rect(0, 0, W, 60, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(28)
    doc.setFont('helvetica', 'bold')
    doc.text('EarningsLens', margin, 28)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'normal')
    doc.text(`Earnings Call Analysis Report — ${ticker.toUpperCase()}`, margin, 40)
    doc.setFontSize(10)
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, 52)
    doc.text(`Session ID: ${sessionId}`, margin, 57)

    y = 75

    // Executive Summary
    heading('Executive Summary', 14)
    y += 3
    body(`This report analyzes ${transcript.length} transcript segments from the ${ticker.toUpperCase()} earnings call.`)
    body(`${contradictions.length} potential contradictions were identified.`)
    y += 4

    heading('Credibility Scores', 12)
    y += 2
    Object.entries(scores).forEach(([speaker, score]) => {
      const status = score <= 40 ? 'LOW CREDIBILITY' : score <= 70 ? 'MODERATE' : 'HIGH CREDIBILITY'
      body(`${speaker}: ${score}/100 — ${status}`)
    })

    divider()

    // Contradictions
    if (contradictions.length > 0) {
      heading('Flagged Contradictions', 14)
      y += 3
      contradictions.forEach((c, i) => {
        checkPage(40)
        heading(`Contradiction #${i + 1} — ${c.speaker}`, 11)
        body(`Source: ${c.source} | Similarity: ${Math.round(c.similarity_score * 100)}%`)
        body(`Current: "${c.current_quote}"`)
        body(`Prior: "${c.prior_quote}"`)
        y += 4
      })
      divider()
    }

    // Full Transcript
    heading('Full Transcript', 14)
    y += 3
    transcript.forEach((entry) => {
      checkPage(20)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(80, 80, 80)
      const header = `[${formatTime(entry.timestamp)}] ${entry.speaker}${entry.score_delta !== 0 ? ` (${entry.score_delta > 0 ? '+' : ''}${entry.score_delta})` : ''}${entry.signals.length ? ` — ${entry.signals.join(', ')}` : ''}`
      const hLines = doc.splitTextToSize(header, W - 2 * margin)
      doc.text(hLines, margin, y)
      y += hLines.length * 4 + 1
      body(entry.text, 9)
      y += 2
    })

    doc.save(`EarningsLens_${ticker.toUpperCase()}_${Date.now()}.pdf`)
  }

  return (
    <button
      onClick={handleExport}
      disabled={transcript.length === 0}
      className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 disabled:text-gray-500 text-white px-4 py-2 rounded font-medium text-sm transition-colors"
    >
      <span>📄</span>
      Export PDF Report
    </button>
  )
}
