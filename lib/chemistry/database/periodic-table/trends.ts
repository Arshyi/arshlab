import type { ElementCategory, ElementRecord } from "../types"

export type TrendMode =
  | "atomicRadius"
  | "electronegativity"
  | "ionizationEnergy"
  | "electronAffinity"

export interface PeriodicTrendMetric {
  mode: TrendMode
  label: string
  unit: string
  lowLabel: string
  highLabel: string
  educationalNote: string
}

export const TREND_MODE_ORDER: TrendMode[] = [
  "atomicRadius",
  "electronegativity",
  "ionizationEnergy",
  "electronAffinity",
]

export const PERIODIC_TREND_METRICS: Record<TrendMode, PeriodicTrendMetric> = {
  atomicRadius: {
    mode: "atomicRadius",
    label: "Atomic Radius",
    unit: "pm",
    lowLabel: "Smaller atoms",
    highLabel: "Larger atoms",
    educationalNote: "Larger atoms have more electron shells and greater shielding.",
  },
  electronegativity: {
    mode: "electronegativity",
    label: "Electronegativity",
    unit: "",
    lowLabel: "Lower attraction",
    highLabel: "Higher attraction",
    educationalNote: "Electronegativity measures attraction for bonding electrons.",
  },
  ionizationEnergy: {
    mode: "ionizationEnergy",
    label: "First Ionization Energy",
    unit: "kJ/mol",
    lowLabel: "Easier to remove",
    highLabel: "Harder to remove",
    educationalNote: "Ionization energy is the energy required to remove an electron.",
  },
  electronAffinity: {
    mode: "electronAffinity",
    label: "Electron Affinity",
    unit: "kJ/mol",
    lowLabel: "Lower energy change",
    highLabel: "Higher energy change",
    educationalNote: "Electron affinity measures energy change when an atom gains an electron.",
  },
}

const CATALOGUED_TREND_VALUES: Record<number, Partial<Record<TrendMode, number>>> = {
  1: { atomicRadius: 53, electronegativity: 2.2, ionizationEnergy: 1312, electronAffinity: 73 },
  2: { atomicRadius: 31, ionizationEnergy: 2372, electronAffinity: 0 },
  3: { atomicRadius: 167, electronegativity: 0.98, ionizationEnergy: 520, electronAffinity: 60 },
  4: { atomicRadius: 112, electronegativity: 1.57, ionizationEnergy: 900, electronAffinity: 0 },
  5: { atomicRadius: 87, electronegativity: 2.04, ionizationEnergy: 801, electronAffinity: 27 },
  6: { atomicRadius: 67, electronegativity: 2.55, ionizationEnergy: 1086, electronAffinity: 122 },
  7: { atomicRadius: 56, electronegativity: 3.04, ionizationEnergy: 1402, electronAffinity: -7 },
  8: { atomicRadius: 48, electronegativity: 3.44, ionizationEnergy: 1314, electronAffinity: 141 },
  9: { atomicRadius: 42, electronegativity: 3.98, ionizationEnergy: 1681, electronAffinity: 328 },
  10: { atomicRadius: 38, ionizationEnergy: 2081, electronAffinity: 0 },
  11: { atomicRadius: 190, electronegativity: 0.93, ionizationEnergy: 496, electronAffinity: 53 },
  12: { atomicRadius: 145, electronegativity: 1.31, ionizationEnergy: 738, electronAffinity: 0 },
  13: { atomicRadius: 143, electronegativity: 1.61, ionizationEnergy: 578, electronAffinity: 42 },
  14: { atomicRadius: 111, electronegativity: 1.9, ionizationEnergy: 787, electronAffinity: 134 },
  15: { atomicRadius: 107, electronegativity: 2.19, ionizationEnergy: 1012, electronAffinity: 72 },
  16: { atomicRadius: 105, electronegativity: 2.58, ionizationEnergy: 1000, electronAffinity: 200 },
  17: { atomicRadius: 102, electronegativity: 3.16, ionizationEnergy: 1251, electronAffinity: 349 },
  18: { atomicRadius: 71, ionizationEnergy: 1521, electronAffinity: 0 },
  19: { atomicRadius: 243, electronegativity: 0.82, ionizationEnergy: 419, electronAffinity: 48 },
  20: { atomicRadius: 194, electronegativity: 1, ionizationEnergy: 590, electronAffinity: 2 },
  21: { atomicRadius: 184, electronegativity: 1.36, ionizationEnergy: 633, electronAffinity: 18 },
  22: { atomicRadius: 176, electronegativity: 1.54, ionizationEnergy: 659, electronAffinity: 8 },
  23: { atomicRadius: 171, electronegativity: 1.63, ionizationEnergy: 651, electronAffinity: 51 },
  24: { atomicRadius: 128, electronegativity: 1.66, ionizationEnergy: 653, electronAffinity: 64 },
  25: { atomicRadius: 127, electronegativity: 1.55, ionizationEnergy: 717, electronAffinity: 0 },
  26: { atomicRadius: 126, electronegativity: 1.83, ionizationEnergy: 763, electronAffinity: 16 },
  27: { atomicRadius: 125, electronegativity: 1.88, ionizationEnergy: 760, electronAffinity: 64 },
  28: { atomicRadius: 124, electronegativity: 1.91, ionizationEnergy: 737, electronAffinity: 112 },
  29: { atomicRadius: 128, electronegativity: 1.9, ionizationEnergy: 746, electronAffinity: 119 },
  30: { atomicRadius: 134, electronegativity: 1.65, ionizationEnergy: 906, electronAffinity: 0 },
  31: { atomicRadius: 135, electronegativity: 1.81, ionizationEnergy: 579, electronAffinity: 29 },
  32: { atomicRadius: 125, electronegativity: 2.01, ionizationEnergy: 762, electronAffinity: 119 },
  33: { atomicRadius: 114, electronegativity: 2.18, ionizationEnergy: 947, electronAffinity: 78 },
  34: { atomicRadius: 103, electronegativity: 2.55, ionizationEnergy: 941, electronAffinity: 195 },
  35: { atomicRadius: 94, electronegativity: 2.96, ionizationEnergy: 1140, electronAffinity: 325 },
  36: { atomicRadius: 88, electronegativity: 3, ionizationEnergy: 1351, electronAffinity: 0 },
  37: { atomicRadius: 265, electronegativity: 0.82, ionizationEnergy: 403, electronAffinity: 47 },
  38: { atomicRadius: 219, electronegativity: 0.95, ionizationEnergy: 550, electronAffinity: 5 },
  39: { atomicRadius: 212, electronegativity: 1.22, ionizationEnergy: 600, electronAffinity: 30 },
  40: { atomicRadius: 206, electronegativity: 1.33, ionizationEnergy: 640, electronAffinity: 41 },
  41: { atomicRadius: 198, electronegativity: 1.6, ionizationEnergy: 652, electronAffinity: 86 },
  42: { atomicRadius: 190, electronegativity: 2.16, ionizationEnergy: 684, electronAffinity: 72 },
  47: { atomicRadius: 144, electronegativity: 1.93, ionizationEnergy: 731, electronAffinity: 126 },
  53: { atomicRadius: 115, electronegativity: 2.66, ionizationEnergy: 1008, electronAffinity: 295 },
  54: { atomicRadius: 108, electronegativity: 2.6, ionizationEnergy: 1170, electronAffinity: 0 },
  79: { atomicRadius: 144, electronegativity: 2.54, ionizationEnergy: 890, electronAffinity: 223 },
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function rounded(value: number, digits = 0): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function estimateAtomicRadius(group: number | null, period: number, category: ElementCategory): number {
  const trendGroup = group ?? 3
  let value = 34 + period * 32 + (18 - trendGroup) * 6.4

  if (category === "lanthanide") value = 188 - (period - 6) * 4
  if (category === "actinide") value = 195
  if (category === "transition-metal") value -= 24
  if (category === "noble-gas") value -= 32

  return Math.round(clamp(value, 32, 290))
}

function estimateElectronegativity(
  group: number | null,
  period: number,
  category: ElementCategory,
): number {
  if (category === "noble-gas") return rounded(clamp(3.1 - period * 0.1, 0.7, 3.1), 2)

  const trendGroup = group ?? 3
  let value = 0.65 + trendGroup * 0.16 - (period - 2) * 0.12

  if (category === "transition-metal") value = 1.35 + (trendGroup - 3) * 0.07 - period * 0.02
  if (category === "lanthanide" || category === "actinide") value = 1.15

  return rounded(clamp(value, 0.7, 4), 2)
}

function estimateIonizationEnergy(
  group: number | null,
  period: number,
  category: ElementCategory,
): number {
  const trendGroup = group ?? 3
  let value = 360 + trendGroup * 58 - (period - 1) * 52

  if (category === "noble-gas") value += 380
  if (trendGroup === 13) value -= 130
  if (trendGroup === 16) value -= 80
  if (category === "transition-metal") value = 610 + trendGroup * 12 - period * 5
  if (category === "lanthanide" || category === "actinide") value = 590

  return Math.round(clamp(value, 350, 2400))
}

function estimateElectronAffinity(
  group: number | null,
  period: number,
  category: ElementCategory,
): number {
  const trendGroup = group ?? 3

  if (category === "noble-gas") return 0
  if (trendGroup === 2) return 0
  if (trendGroup === 15) return Math.round(clamp(55 - period * 9, -10, 75))
  if (trendGroup === 17) return Math.round(clamp(365 - period * 18, 210, 360))

  let value = 10 + trendGroup * 13 - period * 5
  if (category === "transition-metal") value = 20 + (trendGroup - 3) * 11
  if (category === "lanthanide" || category === "actinide") value = 45

  return Math.round(clamp(value, -10, 350))
}

export function getEducationalTrendDefaults(
  z: number,
  group: number | null,
  period: number,
  category: ElementCategory,
): {
  atomicRadiusPm: number
  electronegativity: number
  ionizationEnergyKjMol: number
  electronAffinityKjMol: number
} {
  const exact = CATALOGUED_TREND_VALUES[z] ?? {}

  return {
    atomicRadiusPm: exact.atomicRadius ?? estimateAtomicRadius(group, period, category),
    electronegativity: exact.electronegativity ?? estimateElectronegativity(group, period, category),
    ionizationEnergyKjMol:
      exact.ionizationEnergy ?? estimateIonizationEnergy(group, period, category),
    electronAffinityKjMol:
      exact.electronAffinity ?? estimateElectronAffinity(group, period, category),
  }
}

export function getElementTrendValue(element: ElementRecord, mode: TrendMode): number {
  switch (mode) {
    case "atomicRadius":
      return element.atomicRadiusPm ?? 0
    case "electronegativity":
      return element.electronegativity ?? 0
    case "ionizationEnergy":
      return element.ionizationEnergyKjMol ?? 0
    case "electronAffinity":
      return element.electronAffinityKjMol ?? 0
  }
}

export function getTrendRange(elements: ElementRecord[], mode: TrendMode): { min: number; max: number } {
  const values = elements.map((element) => getElementTrendValue(element, mode))
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  }
}

export function formatTrendValue(mode: TrendMode, value: number | null): string {
  if (value === null) return "Estimate unavailable"

  const metric = PERIODIC_TREND_METRICS[mode]
  if (mode === "electronegativity") return value.toFixed(2)
  return `${Math.round(value)} ${metric.unit}`
}
