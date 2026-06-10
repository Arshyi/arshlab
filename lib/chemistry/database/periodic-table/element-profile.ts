import type { ElementRecord, TransitionMetalColorEntry } from "../types"

export type ElementProfileCompleteness = "complete" | "partial" | "basic-only"

export type ElementProfileValueSource = "catalogued" | "estimated" | "unavailable"

export interface ElementProfileNumberValue {
  value: number | null
  unit: string
  source: ElementProfileValueSource
  note?: string
}

export interface IonizationEnergyPoint {
  step: number
  label: string
  energy: number
  source: Exclude<ElementProfileValueSource, "unavailable">
  largeJump: boolean
  jumpExplanation?: string
}

export interface IonizationSeries {
  points: IonizationEnergyPoint[]
  dataIncomplete: boolean
  note: string
}

export interface ElementExplorerProfile {
  completeness: ElementProfileCompleteness
  missingFields: string[]
  stateLabel: string
  meltingPoint: ElementProfileNumberValue
  boilingPoint: ElementProfileNumberValue
  density: ElementProfileNumberValue
  electronAffinity: ElementProfileNumberValue
  electronAffinityExplanation: string
  transitionMetalColors: TransitionMetalColorEntry[]
}

export interface PropertyComparisonMetric {
  key:
    | "atomicRadius"
    | "electronegativity"
    | "ionizationEnergy"
    | "electronAffinity"
    | "meltingPoint"
    | "boilingPoint"
  label: string
  unit: string
  values: {
    element: ElementRecord
    value: number | null
    source: ElementProfileValueSource
  }[]
  note?: string
}

const SUCCESSIVE_IE_DATA: Record<number, number[]> = {
  1: [1312],
  2: [2372, 5250],
  3: [520, 7298, 11815],
  4: [900, 1757, 14849, 21007],
  5: [801, 2427, 3659, 25025, 32826],
  6: [1086, 2352, 4621, 6223, 37831, 47277],
  7: [1402, 2856, 4578, 7475, 9445, 53266, 64360],
  8: [1314, 3388, 5301, 7469, 10990, 13327, 71330, 84078],
  9: [1681, 3374, 6050, 8408, 11023, 15164, 17868, 92038, 106434],
  10: [2081, 3952, 6122, 9371, 12177, 15238, 19999, 23069, 115379, 131432],
  11: [496, 4562, 6910, 9543, 13354, 16613, 20117, 25496],
  12: [738, 1451, 7733, 10542, 13630, 18020, 21711, 25661],
  13: [578, 1817, 2745, 11578, 14831, 18379, 23326, 27465],
  14: [787, 1577, 3232, 4356, 16091, 19805, 23780, 29287],
  15: [1012, 1907, 2914, 4964, 6274, 21267, 25431, 29872],
  16: [1000, 2252, 3357, 4556, 7004, 8496, 27107, 31719],
  17: [1251, 2298, 3822, 5158, 6542, 9362, 11018, 33604],
  18: [1521, 2666, 3931, 5771, 7238, 8781, 11995, 13842],
  19: [419, 3052, 4420, 5877, 7975, 9590, 11343, 14944],
  20: [590, 1145, 4912, 6491, 8153, 10496, 12270, 14206],
  24: [653, 1591, 2987, 4743, 6702, 8744],
  26: [763, 1561, 2957, 5290, 7240, 9560],
  29: [746, 1958, 3555, 5536, 7700, 9900],
}

const PHYSICAL_DATA: Record<
  number,
  Partial<Record<"meltingPoint" | "boilingPoint" | "density", number>>
> = {
  1: { meltingPoint: -259, boilingPoint: -253, density: 0.00009 },
  2: { meltingPoint: -272, boilingPoint: -269, density: 0.00018 },
  6: { meltingPoint: 3550, boilingPoint: 4827, density: 2.26 },
  7: { meltingPoint: -210, boilingPoint: -196, density: 0.00125 },
  8: { meltingPoint: -219, boilingPoint: -183, density: 0.00143 },
  9: { meltingPoint: -220, boilingPoint: -188, density: 0.0017 },
  10: { meltingPoint: -249, boilingPoint: -246, density: 0.0009 },
  11: { meltingPoint: 98, boilingPoint: 883, density: 0.97 },
  12: { meltingPoint: 650, boilingPoint: 1091, density: 1.74 },
  13: { meltingPoint: 660, boilingPoint: 2470, density: 2.7 },
  14: { meltingPoint: 1414, boilingPoint: 3265, density: 2.33 },
  15: { meltingPoint: 44, boilingPoint: 280, density: 1.82 },
  16: { meltingPoint: 115, boilingPoint: 445, density: 2.07 },
  17: { meltingPoint: -101, boilingPoint: -34, density: 0.0032 },
  18: { meltingPoint: -189, boilingPoint: -186, density: 0.00178 },
  24: { meltingPoint: 1907, boilingPoint: 2671, density: 7.19 },
  25: { meltingPoint: 1246, boilingPoint: 2061, density: 7.3 },
  26: { meltingPoint: 1538, boilingPoint: 2862, density: 7.87 },
  27: { meltingPoint: 1495, boilingPoint: 2927, density: 8.9 },
  28: { meltingPoint: 1455, boilingPoint: 2913, density: 8.91 },
  29: { meltingPoint: 1085, boilingPoint: 2562, density: 8.96 },
  35: { meltingPoint: -7, boilingPoint: 59, density: 3.11 },
  53: { meltingPoint: 114, boilingPoint: 184, density: 4.93 },
  54: { meltingPoint: -112, boilingPoint: -108, density: 0.0059 },
  79: { meltingPoint: 1064, boilingPoint: 2856, density: 19.3 },
  80: { meltingPoint: -39, boilingPoint: 357, density: 13.53 },
  82: { meltingPoint: 327, boilingPoint: 1749, density: 11.34 },
  92: { meltingPoint: 1132, boilingPoint: 4131, density: 19.1 },
}

const EXTRA_TRANSITION_COLORS: Record<string, TransitionMetalColorEntry[]> = {
  Cr: [
    {
      species: "Cr3+",
      color: "Green/violet",
      wavelengthRange: "495-570 nm observed green; violet complexes also occur",
      notes: "Ligands and geometry change the observed color.",
    },
    {
      species: "Cr2O7^2-",
      color: "Orange",
      wavelengthRange: "590-620 nm observed orange range",
      notes: "Dichromate is favored in acidic solution.",
    },
    {
      species: "CrO4^2-",
      color: "Yellow",
      wavelengthRange: "570-590 nm observed yellow range",
      notes: "Chromate is favored in basic solution.",
    },
  ],
  Mn: [
    {
      species: "MnO4-",
      color: "Purple",
      wavelengthRange: "380-450 nm observed violet/purple range",
      notes: "Permanganate absorbs complementary green/yellow light strongly.",
    },
  ],
  Fe: [
    {
      species: "Fe2+",
      color: "Pale green",
      wavelengthRange: "495-570 nm observed green range",
      notes: "Common aqueous iron(II) color.",
    },
    {
      species: "Fe3+",
      color: "Yellow-brown",
      wavelengthRange: "570-620 nm observed yellow/orange-brown range",
      notes: "Hydrolyzed iron(III) solutions often look brown.",
    },
  ],
  Co: [
    {
      species: "Co2+",
      color: "Pink",
      wavelengthRange: "620-750 nm observed red/pink range",
      notes: "Hydrated cobalt(II) is commonly pink.",
    },
    {
      species: "CoCl4^2-",
      color: "Blue",
      wavelengthRange: "450-495 nm observed blue range",
      notes: "Tetrahedral cobalt(II) chloride complex.",
    },
  ],
  Ni: [
    {
      species: "Ni2+",
      color: "Green",
      wavelengthRange: "495-570 nm observed green range",
      notes: "Often observed for hydrated nickel(II).",
    },
  ],
  Cu: [
    {
      species: "Cu2+",
      color: "Blue",
      wavelengthRange: "450-495 nm observed blue range",
      notes: "The observed color is transmitted/reflected; absorbed light is often complementary orange/red.",
    },
  ],
}

function roundTo(value: number, nearest: number): number {
  return Math.round(value / nearest) * nearest
}

function estimatePhysicalValue(
  element: ElementRecord,
  property: "meltingPoint" | "boilingPoint",
): number | null {
  if (element.nuclear.isSynthetic && element.atomicNumber >= 104) return null

  const period = element.period
  const group = element.group ?? 3

  if (element.category === "noble-gas") {
    return property === "meltingPoint" ? roundTo(-275 + period * 22, 5) : roundTo(-270 + period * 25, 5)
  }
  if (element.category === "halogen") {
    return property === "meltingPoint" ? roundTo(-230 + period * 48, 5) : roundTo(-200 + period * 55, 5)
  }
  if (element.category === "alkali-metal") {
    return property === "meltingPoint" ? roundTo(210 - period * 22, 5) : roundTo(1150 - period * 80, 10)
  }
  if (element.category === "alkaline-earth-metal") {
    return property === "meltingPoint" ? roundTo(550 + period * 55, 10) : roundTo(1200 + period * 120, 25)
  }
  if (element.category === "transition-metal") {
    return property === "meltingPoint"
      ? roundTo(1050 + group * 35 - period * 25, 25)
      : roundTo(2350 + group * 70 - period * 35, 25)
  }
  if (element.category === "lanthanide") {
    return property === "meltingPoint" ? 950 : 3100
  }
  if (element.category === "actinide") {
    return property === "meltingPoint" ? 1050 : 3400
  }
  if (element.category === "post-transition-metal") {
    return property === "meltingPoint"
      ? roundTo(230 + period * 45, 10)
      : roundTo(1100 + period * 170, 25)
  }
  if (element.category === "metalloid") {
    return property === "meltingPoint" ? roundTo(800 + period * 120, 25) : roundTo(2300 + period * 120, 25)
  }

  return property === "meltingPoint" ? roundTo(-120 + period * 90, 10) : roundTo(80 + period * 160, 25)
}

export function getElementProfilePhysicalValue(
  element: ElementRecord,
  property: "meltingPoint" | "boilingPoint" | "density",
): ElementProfileNumberValue {
  if (property === "meltingPoint" && element.meltingPointC !== null) {
    return { value: element.meltingPointC, unit: "deg C", source: "catalogued" }
  }
  if (property === "boilingPoint" && element.boilingPointC !== null) {
    return { value: element.boilingPointC, unit: "deg C", source: "catalogued" }
  }
  if (property === "density" && element.densityGcm3 !== null) {
    return { value: element.densityGcm3, unit: "g/cm3", source: "catalogued" }
  }

  const override = PHYSICAL_DATA[element.atomicNumber]?.[property]
  if (override !== undefined) {
    return {
      value: override,
      unit: property === "density" ? "g/cm3" : "deg C",
      source: "catalogued",
    }
  }

  if (property === "density") {
    return {
      value: null,
      unit: "g/cm3",
      source: "unavailable",
      note: "Density is not catalogued in this educational dataset.",
    }
  }

  const estimate = estimatePhysicalValue(element, property)
  return {
    value: estimate,
    unit: "deg C",
    source: estimate === null ? "unavailable" : "estimated",
    note:
      estimate === null
        ? "Bulk phase-change data is not reliable for this element in this dataset."
        : "Educational estimate; do not treat as a precise reference value.",
  }
}

function estimateSuccessiveIonizationSeries(element: ElementRecord): number[] {
  const first = Math.max(350, element.ionizationEnergyKjMol ?? 700)
  const valence = Math.max(1, Math.min(8, element.valenceElectrons || 1))
  const length = Math.min(8, element.atomicNumber)

  return Array.from({ length }, (_, index) => {
    const step = index + 1
    const beforeCore = step <= valence
    const multiplier = beforeCore
      ? 1 + index * 0.78 + index * index * 0.12
      : 4.4 + (step - valence) * 2.7 + index * 0.45
    return roundTo(first * multiplier, 10)
  })
}

export function getSuccessiveIonizationSeries(element: ElementRecord): IonizationSeries {
  const catalogued = SUCCESSIVE_IE_DATA[element.atomicNumber]
  const source: Exclude<ElementProfileValueSource, "unavailable"> = catalogued ? "catalogued" : "estimated"
  const values = catalogued ?? estimateSuccessiveIonizationSeries(element)
  const valence = Math.max(1, Math.min(8, element.valenceElectrons || 1))

  const points = values.map((energy, index) => {
    const previous = index > 0 ? values[index - 1] : null
    const ratio = previous ? energy / previous : 1
    const largeJump = ratio >= 2.5 || index === valence

    return {
      step: index + 1,
      label: `IE${index + 1}`,
      energy,
      source,
      largeJump,
      jumpExplanation: largeJump
        ? "Large jump: the next electron is likely closer to the nucleus or in an inner shell/core level."
        : undefined,
    }
  })

  return {
    points,
    dataIncomplete: !catalogued || values.length < element.atomicNumber,
    note: catalogued
      ? "Catalogued values are shown where available; later ionizations may be omitted."
      : "Successive ionization energies are estimated for teaching because full values are not catalogued here.",
  }
}

export function getElectronAffinityValue(element: ElementRecord): ElementProfileNumberValue {
  if (element.electronAffinityKjMol === null) {
    return {
      value: null,
      unit: "kJ/mol",
      source: "unavailable",
      note: "Electron affinity is not available in this profile.",
    }
  }

  return {
    value: element.electronAffinityKjMol,
    unit: "kJ/mol",
    source: "catalogued",
  }
}

export function explainElectronAffinity(value: number | null): string {
  if (value === null) return "Electron affinity data is unavailable for this element."
  if (value > 10) {
    return "Positive electron affinity means energy is released when an electron is added, using the ARSHLAB convention."
  }
  if (value < 0) {
    return "A negative value indicates adding an electron is unfavorable or requires energy in this convention."
  }
  return "A value near zero means there is little energetic benefit to gaining an electron."
}

export function getNeighborElements(element: ElementRecord, elements: ElementRecord[]): ElementRecord[] {
  return elements
    .filter((candidate) => Math.abs(candidate.atomicNumber - element.atomicNumber) <= 2)
    .sort((a, b) => a.atomicNumber - b.atomicNumber)
}

export function getPropertyComparisonMetrics(
  element: ElementRecord,
  elements: ElementRecord[],
): PropertyComparisonMetric[] {
  const neighbors = getNeighborElements(element, elements)

  return [
    {
      key: "atomicRadius",
      label: "Atomic radius",
      unit: "pm",
      values: neighbors.map((neighbor) => ({
        element: neighbor,
        value: neighbor.atomicRadiusPm,
        source: neighbor.atomicRadiusPm === null ? "unavailable" : "catalogued",
      })),
    },
    {
      key: "electronegativity",
      label: "Electronegativity",
      unit: "",
      values: neighbors.map((neighbor) => ({
        element: neighbor,
        value: neighbor.electronegativity,
        source: neighbor.electronegativity === null ? "unavailable" : "catalogued",
      })),
    },
    {
      key: "ionizationEnergy",
      label: "First ionization energy",
      unit: "kJ/mol",
      values: neighbors.map((neighbor) => ({
        element: neighbor,
        value: neighbor.ionizationEnergyKjMol,
        source: neighbor.ionizationEnergyKjMol === null ? "unavailable" : "catalogued",
      })),
    },
    {
      key: "electronAffinity",
      label: "Electron affinity",
      unit: "kJ/mol",
      values: neighbors.map((neighbor) => ({
        element: neighbor,
        value: neighbor.electronAffinityKjMol,
        source: neighbor.electronAffinityKjMol === null ? "unavailable" : "catalogued",
      })),
    },
    {
      key: "meltingPoint",
      label: "Melting point",
      unit: "deg C",
      values: neighbors.map((neighbor) => {
        const value = getElementProfilePhysicalValue(neighbor, "meltingPoint")
        return { element: neighbor, value: value.value, source: value.source }
      }),
      note: "Estimated values are rounded teaching approximations where exact data is not catalogued.",
    },
    {
      key: "boilingPoint",
      label: "Boiling point",
      unit: "deg C",
      values: neighbors.map((neighbor) => {
        const value = getElementProfilePhysicalValue(neighbor, "boilingPoint")
        return { element: neighbor, value: value.value, source: value.source }
      }),
      note: "Estimated values are rounded teaching approximations where exact data is not catalogued.",
    },
  ]
}

export function getExpandedTransitionMetalColors(element: ElementRecord): TransitionMetalColorEntry[] {
  const bySpecies = new Map<string, TransitionMetalColorEntry>()
  for (const entry of [...element.transitionMetalColors, ...(EXTRA_TRANSITION_COLORS[element.symbol] ?? [])]) {
    bySpecies.set(entry.species, entry)
  }
  return [...bySpecies.values()]
}

export function getElementExplorerProfile(element: ElementRecord): ElementExplorerProfile {
  const meltingPoint = getElementProfilePhysicalValue(element, "meltingPoint")
  const boilingPoint = getElementProfilePhysicalValue(element, "boilingPoint")
  const density = getElementProfilePhysicalValue(element, "density")
  const electronAffinity = getElectronAffinityValue(element)
  const missingFields: string[] = []

  if (element.electronegativity === null) missingFields.push("electronegativity")
  if (element.atomicRadiusPm === null) missingFields.push("atomic radius")
  if (element.ionizationEnergyKjMol === null) missingFields.push("first ionization energy")
  if (electronAffinity.source === "unavailable") missingFields.push("electron affinity")
  if (meltingPoint.source !== "catalogued") missingFields.push("catalogued melting point")
  if (boilingPoint.source !== "catalogued") missingFields.push("catalogued boiling point")
  if (density.source !== "catalogued") missingFields.push("density")
  if (!element.naturalForm) missingFields.push("natural form")
  if (!element.exampleCompounds.length && element.category !== "noble-gas") missingFields.push("example compounds")

  let completeness: ElementProfileCompleteness = "complete"
  if (missingFields.length >= 7 || element.nuclear.isSynthetic) completeness = "basic-only"
  else if (missingFields.length >= 3 || element.nuclear.isRadioactive) completeness = "partial"

  return {
    completeness,
    missingFields,
    stateLabel: element.stateAtRoomTemperature,
    meltingPoint,
    boilingPoint,
    density,
    electronAffinity,
    electronAffinityExplanation: explainElectronAffinity(electronAffinity.value),
    transitionMetalColors: getExpandedTransitionMetalColors(element),
  }
}
