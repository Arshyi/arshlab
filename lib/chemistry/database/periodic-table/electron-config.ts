/** Build electron configurations from atomic number (Aufbau + exceptions for common teaching) */

const ORBITAL_ORDER = [
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

const ORBITAL_CAPACITY: Record<string, number> = {
  s: 2,
  p: 6,
  d: 10,
  f: 14,
}

/** Known exceptions for IB/AP/A-Level teaching */
const CONFIG_EXCEPTIONS: Record<number, string> = {
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

function nobleGasCore(z: number): { core: string; remaining: number } | null {
  const nobleGases: [number, string][] = [
    [2, "He"],
    [10, "Ne"],
    [18, "Ar"],
    [36, "Kr"],
    [54, "Xe"],
    [86, "Rn"],
    [118, "Og"],
  ]
  for (let i = nobleGases.length - 1; i >= 0; i--) {
    const [nz, sym] = nobleGases[i]
    if (z > nz) return { core: sym, remaining: z - nz }
  }
  return null
}

export function buildElectronConfiguration(z: number): {
  full: string
  shorthand: string
  valenceElectrons: number
  block: "s" | "p" | "d" | "f"
} {
  if (CONFIG_EXCEPTIONS[z]) {
    const shorthand = CONFIG_EXCEPTIONS[z]
    const valence = estimateValenceFromConfig(z)
    const block = getBlockFromZ(z)
    return { full: shorthand, shorthand, valenceElectrons: valence, block }
  }

  let remaining = z
  const filled: string[] = []

  for (const orbital of ORBITAL_ORDER) {
    if (remaining <= 0) break
    const type = orbital.slice(-1)
    const cap = ORBITAL_CAPACITY[type] ?? 2
    const add = Math.min(remaining, cap)
    if (add > 0) {
      filled.push(`${orbital}${superscript(add)}`)
      remaining -= add
    }
  }

  const full = filled.join(" ")
  const core = nobleGasCore(z)
  const shorthand = core ? `[${core.core}] ${buildElectronConfiguration(core.remaining).full}` : full
  const valenceElectrons = estimateValenceFromZ(z)
  const block = getBlockFromZ(z)

  return { full, shorthand, valenceElectrons, block }
}

function superscript(n: number): string {
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

function getBlockFromZ(z: number): "s" | "p" | "d" | "f" {
  if (z === 1 || z === 2) return "s"
  if ((z >= 57 && z <= 71) || (z >= 89 && z <= 103)) return "f"
  if ((z >= 21 && z <= 30) || (z >= 39 && z <= 48) || (z >= 72 && z <= 80) || (z >= 104 && z <= 112))
    return "d"
  return "p"
}

function estimateValenceFromZ(z: number): number {
  const group = getGroupFromZ(z)
  if (!group) return 0
  if (group === 18) return 0
  if (group === 1 || group === 2) return group
  if (group >= 13) return group - 10
  if (group >= 3 && group <= 12) return 2 // simplified for transition metals
  return 0
}

function estimateValenceFromConfig(z: number): number {
  return estimateValenceFromZ(z)
}

export function getGroupFromZ(z: number): number | null {
  if (z === 1) return 1
  if (z === 2) return 18
  if (z >= 3 && z <= 4) return z
  if (z >= 5 && z <= 10) return z - 10 + 13 // B-Ne -> 13-18
  if (z >= 11 && z <= 12) return z - 10
  if (z >= 13 && z <= 18) return z - 10
  if (z >= 19 && z <= 36) {
    if (z <= 20) return z - 18
    if (z <= 30) return z - 18 // transition - simplified
    return z - 18
  }
  // Use standard layout for higher periods
  const periodRow = getPeriodFromZ(z)
  if (periodRow >= 4) {
    if (z >= 57 && z <= 71) return null // f-block
    if (z >= 89 && z <= 103) return null
  }
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
