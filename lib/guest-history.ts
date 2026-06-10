const STORAGE_KEY = "arshlab-guest-history"
export const GUEST_HISTORY_UPDATED_EVENT = "arshlab-guest-history-updated"

export interface MoleculeHistoryEntry {
  id: string
  type: "molecule"
  query: string
  resolvedName: string
  formula: string
  family: string
  timestamp: string
}

export interface ReactionHistoryEntry {
  id: string
  type: "reaction"
  query: string
  reactionType: string
  predictedProducts: string[]
  timestamp: string
}

export type GuestHistoryEntry = MoleculeHistoryEntry | ReactionHistoryEntry
export type GuestHistoryFilter = "all" | "molecule" | "reaction"

function isBrowser(): boolean {
  return typeof window !== "undefined"
}

function createId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

function readEntries(): GuestHistoryEntry[] {
  if (!isBrowser()) return []
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as GuestHistoryEntry[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function notifyHistoryUpdated(): void {
  try {
    window.dispatchEvent(new CustomEvent(GUEST_HISTORY_UPDATED_EVENT))
  } catch {
    // Ignore browser event failures; history should never block chemistry tools.
  }
}

function writeEntries(entries: GuestHistoryEntry[]): void {
  if (!isBrowser()) return
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
    notifyHistoryUpdated()
  } catch {
    notifyHistoryUpdated()
  }
}

export function getGuestHistory(): GuestHistoryEntry[] {
  return readEntries()
}

export function getGuestHistoryByType(
  filter: GuestHistoryFilter
): GuestHistoryEntry[] {
  const entries = readEntries()
  if (filter === "all") return entries
  return entries.filter((entry) => entry.type === filter)
}

export function addMoleculeHistory(data: {
  query: string
  resolvedName: string
  formula: string
  family: string
}): MoleculeHistoryEntry {
  const entry: MoleculeHistoryEntry = {
    id: createId(),
    type: "molecule",
    query: data.query.trim(),
    resolvedName: data.resolvedName,
    formula: data.formula,
    family: data.family,
    timestamp: new Date().toISOString(),
  }

  const entries = readEntries()
  writeEntries([entry, ...entries])
  return entry
}

export function addReactionHistory(data: {
  query: string
  reactionType: string
  predictedProducts: string[]
}): ReactionHistoryEntry {
  const entry: ReactionHistoryEntry = {
    id: createId(),
    type: "reaction",
    query: data.query.trim(),
    reactionType: data.reactionType,
    predictedProducts: data.predictedProducts,
    timestamp: new Date().toISOString(),
  }

  const entries = readEntries()
  writeEntries([entry, ...entries])
  return entry
}

export function clearMoleculeHistory(): void {
  writeEntries(readEntries().filter((entry) => entry.type !== "molecule"))
}

export function clearReactionHistory(): void {
  writeEntries(readEntries().filter((entry) => entry.type !== "reaction"))
}

export function clearAllGuestHistory(): void {
  if (!isBrowser()) return
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // Some browsers block sessionStorage; clearing should fail quietly.
  }
  notifyHistoryUpdated()
}

export function getMoleculeSummary(entry: MoleculeHistoryEntry): string {
  return `${entry.resolvedName} (${entry.formula}) · ${entry.family}`
}

export function getReactionSummary(entry: ReactionHistoryEntry): string {
  const products =
    entry.predictedProducts.length > 0
      ? entry.predictedProducts.join(", ")
      : "No products identified"
  return `${entry.reactionType} → ${products}`
}

export function formatHistoryTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    })
  } catch {
    return iso
  }
}
