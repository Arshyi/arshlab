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
    const firstPass = await worker.recognize(image, { rotateAuto: true })
    let selectedData = firstPass.data
    let selectedParsed = parseChemistryText(selectedData.text?.trim() ?? "")
    let attempts = 1

    const substantiveTokenCount = selectedParsed.tokens.filter((token) => token.type !== "atom-label").length
    if (substantiveTokenCount === 0 || selectedParsed.chemistryConfidence < 35 || selectedData.confidence < 45) {
      onProgress?.({ status: "Retrying with dense text layout", progress: 0 })
      await worker.setParameters({ tessedit_pageseg_mode: PSM.SINGLE_BLOCK })
      const fallbackPass = await worker.recognize(image, { rotateAuto: true })
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
    }
  } finally {
    await worker.terminate()
  }
}
