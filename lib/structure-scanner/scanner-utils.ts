import type {
  StructureScanCorrection,
  StructureScanHistoryEntry,
  StructureScanMatch,
  StructureScanStats,
} from "./scanner-types"

export const STRUCTURE_SCAN_HISTORY_STORAGE_KEY = "arshlab.structureScanner.history.v2"
const LEGACY_STRUCTURE_SCAN_HISTORY_STORAGE_KEY = "arshlab.structureScanner.history.v1"
const MAX_HISTORY = 20
const ALLOWED_IMAGE_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"]

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

export function recordStructureScan(match: StructureScanMatch): StructureScanHistoryEntry[] {
  const entry: StructureScanHistoryEntry = {
    id: `${match.record.id}-${Date.now()}`,
    compoundId: match.record.id,
    name: match.record.name,
    formula: match.record.formula,
    functionalGroups: match.record.functionalGroups,
    confidence: match.confidence,
    timestamp: new Date().toISOString(),
    corrected: false,
  }
  const next = [entry, ...readStructureScanHistory()].slice(0, MAX_HISTORY)
  writeStructureScanHistory(next)
  return next
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
  return {
    totalScans: history.length,
    correctedScans: history.filter((entry) => entry.corrected).length,
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
