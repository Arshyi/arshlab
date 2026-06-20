import type {
  StructureScanCorrection,
  StructureScanHistoryEntry,
  StructureScanMatch,
  StructureScanStats,
} from "./scanner-types"

export const STRUCTURE_SCAN_HISTORY_STORAGE_KEY = "arshlab.structureScanner.history.v2"
export const STRUCTURE_OCR_METRICS_STORAGE_KEY = "arshlab.structureScanner.ocrMetrics.v1"
const LEGACY_STRUCTURE_SCAN_HISTORY_STORAGE_KEY = "arshlab.structureScanner.history.v1"
const MAX_HISTORY = 20
const MAX_OCR_METRICS = 100
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"]

interface StructureOCRMetricEntry {
  id: string
  timestamp: string
  matched: boolean
  compoundName?: string
  historyEntryId?: string
  corrected: boolean
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

export function isAllowedStructureImage(file: File): boolean {
  return ALLOWED_IMAGE_TYPES.includes(file.type)
}

export function readStructureScanHistory(): StructureScanHistoryEntry[] {
  if (!canUseStorage()) return []

  try {
    const raw =
      window.localStorage.getItem(STRUCTURE_SCAN_HISTORY_STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_STRUCTURE_SCAN_HISTORY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.flatMap((entry): StructureScanHistoryEntry[] => {
      const valid =
        typeof entry?.id === "string" &&
        typeof entry?.compoundId === "string" &&
        typeof entry?.name === "string" &&
        typeof entry?.formula === "string" &&
        Array.isArray(entry?.functionalGroups) &&
        typeof entry?.timestamp === "string"
      if (!valid) return []
      return [{ ...entry, corrected: entry.corrected === true } as StructureScanHistoryEntry]
    })
  } catch {
    return []
  }
}

export function writeStructureScanHistory(entries: StructureScanHistoryEntry[]): void {
  if (!canUseStorage()) return
  window.localStorage.setItem(STRUCTURE_SCAN_HISTORY_STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)))
}

export function recordStructureScan(
  match: StructureScanMatch,
  source: "ocr" | "manual" = "manual",
): StructureScanHistoryEntry[] {
  const entry: StructureScanHistoryEntry = {
    id: `${match.record.id}-${Date.now()}`,
    compoundId: match.record.id,
    name: match.record.name,
    formula: match.record.formula,
    functionalGroups: match.record.functionalGroups,
    confidence: match.confidence,
    timestamp: new Date().toISOString(),
    corrected: false,
    source,
  }
  const next = [entry, ...readStructureScanHistory()].slice(0, MAX_HISTORY)
  writeStructureScanHistory(next)
  return next
}

function readStructureOCRMetrics(): StructureOCRMetricEntry[] {
  if (!canUseStorage()) return []
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STRUCTURE_OCR_METRICS_STORAGE_KEY) ?? "[]")
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (entry): entry is StructureOCRMetricEntry =>
        typeof entry?.id === "string" &&
        typeof entry?.timestamp === "string" &&
        typeof entry?.matched === "boolean" &&
        typeof entry?.corrected === "boolean",
    )
  } catch {
    return []
  }
}

function writeStructureOCRMetrics(entries: StructureOCRMetricEntry[]): void {
  if (!canUseStorage()) return
  window.localStorage.setItem(
    STRUCTURE_OCR_METRICS_STORAGE_KEY,
    JSON.stringify(entries.slice(0, MAX_OCR_METRICS)),
  )
}

export function recordStructureOCRScan(
  match?: StructureScanMatch | null,
  historyEntryId?: string,
): void {
  const entry: StructureOCRMetricEntry = {
    id: `ocr-${Date.now()}`,
    timestamp: new Date().toISOString(),
    matched: Boolean(match),
    compoundName: match?.record.name,
    historyEntryId,
    corrected: false,
  }
  writeStructureOCRMetrics([entry, ...readStructureOCRMetrics()])
}

function splitFunctionalGroups(value: string | undefined, fallback: string[]): string[] {
  const groups = (value ?? "")
    .split(/[,;|]/)
    .map((group) => group.trim())
    .filter(Boolean)
  return groups.length > 0 ? groups : fallback
}

export function correctStructureScan(
  entryId: string,
  correction: StructureScanCorrection,
): StructureScanHistoryEntry[] {
  const history = readStructureScanHistory()
  const next = history.map((entry) => {
    if (entry.id !== entryId) return entry

    const compoundName = correction.compoundName?.trim()
    const molecularFormula = correction.formula?.trim()
    const condensedFormula = correction.condensedFormula?.trim()
    return {
      ...entry,
      name: compoundName || entry.name,
      formula: molecularFormula || condensedFormula || entry.formula,
      functionalGroups: splitFunctionalGroups(correction.functionalGroupHint, entry.functionalGroups),
      corrected: true,
      correctedAt: new Date().toISOString(),
      originalName: entry.originalName ?? entry.name,
      originalFormula: entry.originalFormula ?? entry.formula,
      correction: {
        compoundName: compoundName || undefined,
        formula: molecularFormula || undefined,
        functionalGroupHint: correction.functionalGroupHint?.trim() || undefined,
        condensedFormula: condensedFormula || undefined,
      },
    }
  })
  writeStructureScanHistory(next)
  const ocrMetrics = readStructureOCRMetrics().map((entry) =>
    entry.historyEntryId === entryId ? { ...entry, corrected: true } : entry,
  )
  writeStructureOCRMetrics(ocrMetrics)
  return next
}

function topCounts(values: string[], limit = 4): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>()
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1)
  }
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit)
}

export function getStructureScanStats(history = readStructureScanHistory()): StructureScanStats {
  const ocrMetrics = readStructureOCRMetrics()
  const ocrMatches = ocrMetrics.filter((entry) => entry.matched)
  const correctedOCRMatches = ocrMatches.filter((entry) => entry.corrected).length
  return {
    totalScans: history.length,
    correctedScans: history.filter((entry) => entry.corrected).length,
    ocrScansPerformed: ocrMetrics.length,
    ocrMatchesFound: ocrMatches.length,
    ocrCorrectionRate: ocrMatches.length ? Math.round((correctedOCRMatches / ocrMatches.length) * 100) : 0,
    mostRecognizedCompounds: topCounts(
      ocrMatches.flatMap((entry) => (entry.compoundName ? [entry.compoundName] : [])),
    ),
    mostScannedCompounds: topCounts(history.map((entry) => entry.name)),
    mostScannedFunctionalGroups: topCounts(history.flatMap((entry) => entry.functionalGroups)),
    recent: history.slice(0, MAX_HISTORY),
  }
}

export function formatStructureScanTimestamp(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return "Recently"

  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)
  if (diffMinutes < 1) return "Just now"
  if (diffMinutes < 60) return `${diffMinutes} min ago`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hr ago`
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
}
