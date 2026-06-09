/** Build electron configurations from atomic number (Aufbau + common teaching exceptions) */

export const ORBITAL_ORDER = [
  "1s",
  "2s",
  "2p",
  "3s",
  "3p",
  "4s",
  "3d",
  "4p",
  "5s",
  "4d",
  "5p",
  "6s",
  "4f",
  "5d",
  "6p",
  "7s",
  "5f",
  "6d",
  "7p",
] as const

export type OrbitalLabel = (typeof ORBITAL_ORDER)[number]

export const ORBITAL_CAPACITY: Record<string, number> = {
  s: 2,
  p: 6,
  d: 10,
  f: 14,
}

export const SUBSHELL_BOX_COUNT: Record<string, number> = {
  s: 1,
  p: 3,
  d: 5,
  f: 7,
}

export interface ElectronConfigurationException {
  atomicNumber: number
  expected: string
  actual: string
  reason: string
  note: string
}

export const TEACHING_CONFIGURATION_EXCEPTIONS: Record<number, ElectronConfigurationException> = {
  24: {
    atomicNumber: 24,
    expected: "[Ar] 4s² 3d⁴",
    actual: "[Ar] 4s¹ 3d⁵",
    reason: "Half-filled d subshell stability.",
    note: "Chromium promotes one 4s electron into 3d, giving a half-filled 3d subshell.",
  },
  29: {
    atomicNumber: 29,
    expected: "[Ar] 4s² 3d⁹",
    actual: "[Ar] 4s¹ 3d¹⁰",
    reason: "Filled d subshell stability.",
    note: "Copper shifts one 4s electron into 3d, making the 3d subshell completely filled.",
  },
  42: {
    atomicNumber: 42,
    expected: "[Kr] 5s² 4d⁴",
    actual: "[Kr] 5s¹ 4d⁵",
    reason: "Half-filled d subshell stability.",
    note: "Molybdenum is stabilized by a half-filled 4d subshell.",
  },
  47: {
    atomicNumber: 47,
    expected: "[Kr] 5s² 4d⁹",
    actual: "[Kr] 5s¹ 4d¹⁰",
    reason: "Filled d subshell stability.",
    note: "Silver gains extra stability by filling the 4d subshell.",
  },
  79: {
    atomicNumber: 79,
    expected: "[Xe] 6s² 4f¹⁴ 5d⁹",
    actual: "[Xe] 6s¹ 4f¹⁴ 5d¹⁰",
    reason: "Filled d subshell stability.",
    note: "Gold is stabilized by a filled 5d subshell; relativistic effects also influence this arrangement.",
  },
}

/** Noble gas shorthand exceptions for IB/AP/A-Level teaching */
const SHORTHAND_EXCEPTIONS: Record<number, string> = {
  24: "[Ar] 4s¹ 3d⁵",
  29: "[Ar] 4s¹ 3d¹⁰",
  41: "[Kr] 5s¹ 4d⁴",
  42: "[Kr] 5s¹ 4d⁵",
  44: "[Kr] 5s¹ 4d⁷",
  45: "[Kr] 5s¹ 4d⁸",
  46: "[Kr] 4d¹⁰",
  47: "[Kr] 5s¹ 4d¹⁰",
  57: "[Xe] 6s² 5d¹",
  58: "[Xe] 6s² 4f¹ 5d¹",
  64: "[Xe] 6s² 4f⁷ 5d¹",
  78: "[Xe] 6s¹ 4f¹⁴ 5d⁹",
  79: "[Xe] 6s¹ 4f¹⁴ 5d¹⁰",
}

/** Full configuration strings for common teaching exceptions */
const FULL_EXCEPTIONS: Record<number, string> = {
  24: "1s² 2s² 2p⁶ 3s² 3p⁶ 4s¹ 3d⁵",
  29: "1s² 2s² 2p⁶ 3s² 3p⁶ 4s¹ 3d¹⁰",
  41: "1s² 2s² 2p⁶ 3s² 3p⁶ 4s² 3d¹⁰ 4p⁶ 5s¹ 4d⁴",
  42: "1s² 2s² 2p⁶ 3s² 3p⁶ 4s² 3d¹⁰ 4p⁶ 5s¹ 4d⁵",
  44: "1s² 2s² 2p⁶ 3s² 3p⁶ 4s² 3d¹⁰ 4p⁶ 5s¹ 4d⁷",
  45: "1s² 2s² 2p⁶ 3s² 3p⁶ 4s² 3d¹⁰ 4p⁶ 5s¹ 4d⁸",
  46: "1s² 2s² 2p⁶ 3s² 3p⁶ 4s² 3d¹⁰ 4p⁶ 4d¹⁰",
  47: "1s² 2s² 2p⁶ 3s² 3p⁶ 4s² 3d¹⁰ 4p⁶ 5s¹ 4d¹⁰",
  57: "1s² 2s² 2p⁶ 3s² 3p⁶ 4s² 3d¹⁰ 4p⁶ 5s² 4d¹⁰ 5p⁶ 6s² 5d¹",
  58: "1s² 2s² 2p⁶ 3s² 3p⁶ 4s² 3d¹⁰ 4p⁶ 5s² 4d¹⁰ 5p⁶ 6s² 4f¹ 5d¹",
  64: "1s² 2s² 2p⁶ 3s² 3p⁶ 4s² 3d¹⁰ 4p⁶ 5s² 4d¹⁰ 5p⁶ 6s² 4f⁷ 5d¹",
  78: "1s² 2s² 2p⁶ 3s² 3p⁶ 4s² 3d¹⁰ 4p⁶ 5s² 4d¹⁰ 5p⁶ 6s¹ 4f¹⁴ 5d⁹",
  79: "1s² 2s² 2p⁶ 3s² 3p⁶ 4s² 3d¹⁰ 4p⁶ 5s² 4d¹⁰ 5p⁶ 6s¹ 4f¹⁴ 5d¹⁰",
}

const NOBLE_GASES: [number, string][] = [
  [2, "He"],
  [10, "Ne"],
  [18, "Ar"],
  [36, "Kr"],
  [54, "Xe"],
  [86, "Rn"],
  [118, "Og"],
]

function nobleGasCore(z: number): { symbol: string; atomicNumber: number } | null {
  for (let i = NOBLE_GASES.length - 1; i >= 0; i--) {
    const [nz, sym] = NOBLE_GASES[i]
    if (z > nz) return { symbol: sym, atomicNumber: nz }
  }
  return null
}

export function superscript(n: number): string {
  const map: Record<string, string> = {
    "0": "⁰",
    "1": "¹",
    "2": "²",
    "3": "³",
    "4": "⁴",
    "5": "⁵",
    "6": "⁶",
    "7": "⁷",
    "8": "⁸",
    "9": "⁹",
  }
  return String(n)
    .split("")
    .map((d) => map[d] ?? d)
    .join("")
}

function parseSuperscriptNumber(value: string): number {
  const map: Record<string, string> = {
    "⁰": "0",
    "¹": "1",
    "²": "2",
    "³": "3",
    "⁴": "4",
    "⁵": "5",
    "⁶": "6",
    "⁷": "7",
    "⁸": "8",
    "⁹": "9",
  }

  const normalized = value
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")

  return Number.parseInt(normalized, 10)
}

function parseConfigString(config: string): Map<string, number> {
  const map = new Map<string, number>()
  const parts = config.split(/\s+/).filter(Boolean)

  for (const part of parts) {
    const match = part.match(/^(\d[spdf])([⁰¹²³⁴⁵⁶⁷⁸⁹]+|\d+)$/u)
    if (!match) continue
    const orbital = match[1]
    const count = parseSuperscriptNumber(match[2])
    map.set(orbital, (map.get(orbital) ?? 0) + count)
  }

  return map
}

function buildAufbauOccupancy(z: number): Map<string, number> {
  let remaining = z
  const map = new Map<string, number>()

  for (const orbital of ORBITAL_ORDER) {
    if (remaining <= 0) break
    const type = orbital.slice(-1)
    const cap = ORBITAL_CAPACITY[type] ?? 2
    const add = Math.min(remaining, cap)
    if (add > 0) {
      map.set(orbital, add)
      remaining -= add
    }
  }

  return map
}

function mapToConfigurationString(map: Map<string, number>): string {
  const parts: string[] = []

  for (const orbital of ORBITAL_ORDER) {
    const count = map.get(orbital)
    if (count && count > 0) parts.push(`${orbital}${superscript(count)}`)
  }

  return parts.join(" ")
}

function subtractCoreOccupancy(
  occupancy: Map<string, number>,
  coreAtomicNumber: number,
): Map<string, number> {
  const core = getOrbitalOccupancy(coreAtomicNumber)
  const remainder = new Map<string, number>()

  for (const orbital of ORBITAL_ORDER) {
    const count = (occupancy.get(orbital) ?? 0) - (core.get(orbital) ?? 0)
    if (count > 0) remainder.set(orbital, count)
  }

  return remainder
}

/** Returns ordered orbital occupancy respecting Aufbau exceptions */
export function getOrbitalOccupancy(z: number): Map<string, number> {
  if (FULL_EXCEPTIONS[z]) {
    return parseConfigString(FULL_EXCEPTIONS[z])
  }
  return buildAufbauOccupancy(z)
}

export function getElectronConfigurationException(
  z: number,
): ElectronConfigurationException | null {
  return TEACHING_CONFIGURATION_EXCEPTIONS[z] ?? null
}

export function buildElectronConfiguration(z: number): {
  full: string
  shorthand: string
  valenceElectrons: number
  block: "s" | "p" | "d" | "f"
} {
  const occupancy = getOrbitalOccupancy(z)
  const full = mapToConfigurationString(occupancy)

  let shorthand: string
  if (SHORTHAND_EXCEPTIONS[z]) {
    shorthand = SHORTHAND_EXCEPTIONS[z]
  } else {
    const core = nobleGasCore(z)
    if (core) {
      const remainder = subtractCoreOccupancy(occupancy, core.atomicNumber)
      const remainderText = mapToConfigurationString(remainder)
      shorthand = remainderText ? `[${core.symbol}] ${remainderText}` : `[${core.symbol}]`
    } else {
      shorthand = full
    }
  }

  const valenceElectrons = estimateValenceFromZ(z)
  const block = getBlockFromZ(z)

  return { full, shorthand, valenceElectrons, block }
}

function getBlockFromZ(z: number): "s" | "p" | "d" | "f" {
  if (z === 1 || z === 2) return "s"
  if ((z >= 57 && z <= 71) || (z >= 89 && z <= 103)) return "f"
  if (
    (z >= 21 && z <= 30) ||
    (z >= 39 && z <= 48) ||
    (z >= 72 && z <= 80) ||
    (z >= 104 && z <= 112)
  ) {
    return "d"
  }
  return "p"
}

function estimateValenceFromZ(z: number): number {
  const group = getGroupFromZ(z)
  if (!group) return 0
  if (group === 18) return 0
  if (group === 1 || group === 2) return group
  if (group >= 13) return group - 10
  if (group >= 3 && group <= 12) return 2
  return 0
}

export function getGroupFromZ(z: number): number | null {
  if (z === 1) return 1
  if (z === 2) return 18
  if (z >= 3 && z <= 4) return z
  if (z >= 5 && z <= 10) return z - 10 + 13
  if (z >= 11 && z <= 18) return z - 10
  if (z >= 19 && z <= 20) return z - 18
  if (z >= 21 && z <= 30) return z - 18
  if (z >= 31 && z <= 36) return z - 18
  if (z >= 37 && z <= 38) return z - 36
  if (z >= 39 && z <= 48) return z - 36
  if (z >= 49 && z <= 54) return z - 36
  if (z >= 55 && z <= 56) return z - 54
  if (z >= 57 && z <= 71) return null
  if (z >= 72 && z <= 80) return z - 68
  if (z >= 81 && z <= 86) return z - 68
  if (z >= 87 && z <= 88) return z - 86
  if (z >= 89 && z <= 103) return null
  if (z >= 104 && z <= 112) return z - 100
  if (z >= 113 && z <= 118) return z - 100
  return null
}

export function getPeriodFromZ(z: number): number {
  if (z <= 2) return 1
  if (z <= 10) return 2
  if (z <= 18) return 3
  if (z <= 36) return 4
  if (z <= 54) return 5
  if (z <= 86) return 6
  return 7
}
