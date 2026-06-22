import { parseChemistryText, type OCRChemistryParseResult } from "./chemistry-parser"

export interface OCRProgressUpdate {
  status: string
  progress: number
}

export interface ChemistryOCRResult {
  rawText: string
  ocrConfidence: number
  durationMs: number
  parsed: OCRChemistryParseResult
  attempts: number
  fallbackUsed: boolean
  atomLabels: OCRAtomLabelPosition[]
}

export interface OCRAtomLabelPosition {
  label: "H" | "C" | "N" | "O" | "S" | "P" | "F" | "Cl" | "Br" | "I"
  bounds: { x: number; y: number; width: number; height: number }
  centroid: { x: number; y: number }
  confidence: number
}

interface OCRBlockLike {
  paragraphs?: Array<{
    lines?: Array<{
      words?: Array<{
        text?: string
        confidence?: number
        bbox?: { x0: number; y0: number; x1: number; y1: number }
      }>
    }>
  }>
}

const POSITIONED_ATOM_LABELS = new Map<string, OCRAtomLabelPosition["label"]>([
  ["h", "H"], ["c", "C"], ["n", "N"], ["o", "O"], ["s", "S"], ["p", "P"], ["f", "F"],
  ["cl", "Cl"], ["br", "Br"], ["i", "I"],
])

export function extractPositionedAtomLabels(blocks: OCRBlockLike[] | null | undefined): OCRAtomLabelPosition[] {
  const labels: OCRAtomLabelPosition[] = []
  for (const block of blocks ?? []) {
    for (const paragraph of block.paragraphs ?? []) {
      for (const line of paragraph.lines ?? []) {
        for (const word of line.words ?? []) {
          const normalized = (word.text ?? "").trim().replace(/[^A-Za-z]/g, "").toLowerCase()
          const label = POSITIONED_ATOM_LABELS.get(normalized)
          const bbox = word.bbox
          if (!label || !bbox || (word.confidence ?? 0) < 20) continue
          const bounds = {
            x: bbox.x0,
            y: bbox.y0,
            width: Math.max(1, bbox.x1 - bbox.x0),
            height: Math.max(1, bbox.y1 - bbox.y0),
          }
          const centroid = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
          const duplicate = labels.some((existing) =>
            existing.label === label && Math.hypot(existing.centroid.x - centroid.x, existing.centroid.y - centroid.y) <= 3,
          )
          if (!duplicate) labels.push({ label, bounds, centroid, confidence: Math.round(word.confidence ?? 0) })
        }
      }
    }
  }
  return labels.sort((left, right) => left.centroid.y - right.centroid.y || left.centroid.x - right.centroid.x)
}

export async function recognizeChemistryImage(
  image: File | Blob,
  onProgress?: (update: OCRProgressUpdate) => void,
): Promise<ChemistryOCRResult> {
  if (typeof window === "undefined") {
    throw new Error("OCR is available only in the browser.")
  }

  const startedAt = performance.now()
  const { createWorker, OEM, PSM } = await import("tesseract.js")
  const worker = await createWorker("eng", OEM.LSTM_ONLY, {
    logger: (message) => {
      onProgress?.({
        status: message.status,
        progress: Math.max(0, Math.min(1, message.progress ?? 0)),
      })
    },
  })

  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.SPARSE_TEXT,
      preserve_interword_spaces: "1",
      user_defined_dpi: "300",
    })
    const outputFormats = { text: true, blocks: true }
    const firstPass = await worker.recognize(image, { rotateAuto: true }, outputFormats)
    let selectedData = firstPass.data
    let selectedParsed = parseChemistryText(selectedData.text?.trim() ?? "")
    let attempts = 1

    const substantiveTokenCount = selectedParsed.tokens.filter((token) => token.type !== "atom-label").length
    if (substantiveTokenCount === 0 || selectedParsed.chemistryConfidence < 35 || selectedData.confidence < 45) {
      onProgress?.({ status: "Retrying with dense text layout", progress: 0 })
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK })
      const fallbackPass = await worker.recognize(image, { rotateAuto: true }, outputFormats)
      const fallbackText = fallbackPass.data.text?.trim() ?? ""
      const fallbackParsed = parseChemistryText(fallbackText)
      const firstSubstantive = selectedParsed.tokens.filter((token) => token.type !== "atom-label").length
      const fallbackSubstantive = fallbackParsed.tokens.filter((token) => token.type !== "atom-label").length
      const firstRank = firstSubstantive * 140 + selectedParsed.chemistryConfidence * 2 + selectedData.confidence
      const fallbackRank = fallbackSubstantive * 140 + fallbackParsed.chemistryConfidence * 2 + fallbackPass.data.confidence
      if (fallbackRank > firstRank) {
        selectedData = fallbackPass.data
        selectedParsed = fallbackParsed
      }
      attempts = 2
    }

    const rawText = selectedData.text?.trim() ?? ""
    return {
      rawText,
      ocrConfidence: Math.round(Math.max(0, Math.min(100, selectedData.confidence ?? 0))),
      durationMs: Math.round(performance.now() - startedAt),
      parsed: selectedParsed,
      attempts,
      fallbackUsed: attempts > 1,
      atomLabels: extractPositionedAtomLabels(selectedData.blocks),
    }
  } finally {
    await worker.terminate()
  }
}
