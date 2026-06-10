import type {
  ElementCategory,
  ElementNuclearInfo,
  OctetRuleCategory,
  RoomTemperatureState,
  TransitionMetalColorEntry,
} from "../types"

export interface ElementProfileSeed {
  naturalForm?: string | null
  octetRuleCategory?: OctetRuleCategory
  octetRuleExamples?: string[]
  exampleCompounds?: string[]
  transitionMetalColors?: TransitionMetalColorEntry[]
  electronAffinityKjMol?: number | null
  atomicRadiusPm?: number | null
  ionizationEnergyKjMol?: number | null
  electronegativity?: number | null
  oxidationStates?: number[]
  commonIons?: string[]
  meltingPointC?: number | null
  boilingPointC?: number | null
  densityGcm3?: number | null
  stateAtRoomTemperature?: RoomTemperatureState
  notes?: string[]
  nuclear?: Partial<ElementNuclearInfo>
}

const DIATOMIC = new Set([1, 7, 8, 9, 17, 35, 53])

const NOBLE_GASES = new Set([2, 10, 18, 36, 54, 86, 118])

const ROOM_TEMPERATURE_GASES = new Set([1, 2, 7, 8, 9, 10, 17, 18, 36, 54, 86])

const ROOM_TEMPERATURE_LIQUIDS = new Set([35, 80])

const SYNTHETIC_ELEMENTS = new Set([
  43, 61, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108,
  109, 110, 111, 112, 113, 114, 115, 116, 117, 118,
])

const RADIOACTIVE_ELEMENTS = new Set([
  43, 61, 84, 85, 86, 87, 88, 89, 90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101,
  102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117,
  118,
])

const NUCLEAR_OVERRIDES: Partial<Record<number, Partial<ElementNuclearInfo>>> = {
  43: { mostStableIsotope: "Tc-98", halfLife: "about 4.2 million years", decayModes: ["beta decay"] },
  61: { mostStableIsotope: "Pm-145", halfLife: "about 17.7 years", decayModes: ["electron capture"] },
  84: { mostStableIsotope: "Po-209", halfLife: "about 125 years", decayModes: ["alpha decay"] },
  85: { mostStableIsotope: "At-210", halfLife: "about 8.1 hours", decayModes: ["alpha decay"] },
  86: { mostStableIsotope: "Rn-222", halfLife: "about 3.8 days", decayModes: ["alpha decay"] },
  87: { mostStableIsotope: "Fr-223", halfLife: "about 22 minutes", decayModes: ["beta decay"] },
  88: { mostStableIsotope: "Ra-226", halfLife: "about 1600 years", decayModes: ["alpha decay"] },
  89: { mostStableIsotope: "Ac-227", halfLife: "about 21.8 years", decayModes: ["beta decay", "alpha decay"] },
  90: { mostStableIsotope: "Th-232", halfLife: "about 14 billion years", decayModes: ["alpha decay"] },
  91: { mostStableIsotope: "Pa-231", halfLife: "about 32,760 years", decayModes: ["alpha decay"] },
  92: { mostStableIsotope: "U-238", halfLife: "about 4.47 billion years", decayModes: ["alpha decay"] },
  93: { mostStableIsotope: "Np-237", halfLife: "about 2.14 million years", decayModes: ["alpha decay"] },
  94: { mostStableIsotope: "Pu-244", halfLife: "about 80 million years", decayModes: ["alpha decay"] },
  95: { mostStableIsotope: "Am-243", halfLife: "about 7370 years", decayModes: ["alpha decay"] },
  96: { mostStableIsotope: "Cm-247", halfLife: "about 15.6 million years", decayModes: ["alpha decay"] },
}

/** Rich profile overrides keyed by atomic number */
export const ELEMENT_PROFILES: Partial<Record<number, ElementProfileSeed>> = {
  1: {
    naturalForm: "H₂ (diatomic gas)",
    exampleCompounds: ["H₂O", "HCl", "CH₄", "NH₃"],
    electronAffinityKjMol: 73,
    atomicRadiusPm: 53,
    ionizationEnergyKjMol: 1312,
  },
  4: {
    naturalForm: "Be (solid metal)",
    octetRuleCategory: "incomplete-octet",
    octetRuleExamples: ["BeCl₂"],
    exampleCompounds: ["BeCl₂", "BeO"],
    atomicRadiusPm: 112,
    ionizationEnergyKjMol: 900,
  },
  5: {
    naturalForm: "B (solid metalloid)",
    octetRuleCategory: "incomplete-octet",
    octetRuleExamples: ["BF₃", "BCl₃"],
    exampleCompounds: ["BF₃", "BCl₃", "H₃BO₃"],
    atomicRadiusPm: 87,
    ionizationEnergyKjMol: 801,
  },
  6: {
    naturalForm: "C — diamond, graphite, graphene (allotropes)",
    exampleCompounds: ["CO₂", "CH₄", "C₆H₁₂O₆", "CaCO₃"],
    electronAffinityKjMol: 122,
    atomicRadiusPm: 67,
    ionizationEnergyKjMol: 1086,
  },
  7: {
    naturalForm: "N₂ (diatomic gas)",
    octetRuleCategory: "odd-electron",
    octetRuleExamples: ["NO", "NO₂"],
    exampleCompounds: ["NH₃", "HNO₃", "N₂O", "NO₂"],
    electronAffinityKjMol: -7,
    atomicRadiusPm: 56,
    ionizationEnergyKjMol: 1402,
  },
  8: {
    naturalForm: "O₂ (diatomic gas)",
    octetRuleCategory: "odd-electron",
    octetRuleExamples: ["NO", "NO₂"],
    exampleCompounds: ["H₂O", "CO₂", "O₃", "Fe₂O₃"],
    electronAffinityKjMol: 141,
    atomicRadiusPm: 48,
    ionizationEnergyKjMol: 1314,
  },
  9: {
    naturalForm: "F₂ (diatomic gas)",
    exampleCompounds: ["HF", "NaF", "SF₆", "CaF₂"],
    electronAffinityKjMol: 328,
    atomicRadiusPm: 42,
    ionizationEnergyKjMol: 1681,
  },
  13: {
    naturalForm: "Al (solid metal)",
    octetRuleCategory: "incomplete-octet",
    octetRuleExamples: ["AlCl₃", "Al₂Cl₆"],
    exampleCompounds: ["Al₂O₃", "AlCl₃", "Al₂(SO₄)₃"],
    electronAffinityKjMol: 42,
    atomicRadiusPm: 143,
    ionizationEnergyKjMol: 578,
    oxidationStates: [3],
    commonIons: ["Al³⁺"],
  },
  15: {
    naturalForm: "P₄ (tetrahedral allotrope)",
    octetRuleCategory: "expanded-octet",
    octetRuleExamples: ["PCl₅"],
    exampleCompounds: ["PCl₃", "PCl₅", "H₃PO₄", "Ca₃(PO₄)₂"],
    atomicRadiusPm: 107,
    ionizationEnergyKjMol: 1012,
  },
  16: {
    naturalForm: "S₈ (crown ring allotrope)",
    octetRuleCategory: "expanded-octet",
    octetRuleExamples: ["SF₆", "SF₄"],
    exampleCompounds: ["H₂SO₄", "SO₂", "SF₆", "Na₂S"],
    electronAffinityKjMol: 200,
    atomicRadiusPm: 105,
    ionizationEnergyKjMol: 1000,
  },
  17: {
    naturalForm: "Cl₂ (diatomic gas)",
    octetRuleCategory: "expanded-octet",
    octetRuleExamples: ["ClF₃"],
    exampleCompounds: ["NaCl", "HCl", "ClO₂", "KClO₃"],
    electronAffinityKjMol: 349,
    atomicRadiusPm: 102,
    ionizationEnergyKjMol: 1251,
  },
  24: {
    naturalForm: "Cr (solid metal)",
    exampleCompounds: ["Cr₂O₃", "K₂Cr₂O₇", "CrCl₃"],
    electronAffinityKjMol: 64,
    atomicRadiusPm: 128,
    ionizationEnergyKjMol: 653,
    oxidationStates: [-2, -1, 0, 1, 2, 3, 4, 5, 6],
    commonIons: ["Cr³⁺", "Cr₂O₇²⁻"],
    transitionMetalColors: [
      { species: "Cr³⁺", color: "Green", wavelengthRange: "495–570 nm observed green range" },
      { species: "Cr₂O₇²⁻", color: "Orange", notes: "Dichromate ion in acidic solution" },
    ],
  },
  25: {
    naturalForm: "Mn (solid metal)",
    exampleCompounds: ["MnO₂", "KMnO₄", "MnCl₂"],
    electronAffinityKjMol: 0,
    atomicRadiusPm: 127,
    ionizationEnergyKjMol: 717,
    oxidationStates: [-3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7],
    commonIons: ["Mn²⁺", "MnO₄⁻"],
    transitionMetalColors: [
      {
        species: "MnO₄⁻",
        color: "Purple",
        wavelengthRange: "380–450 nm observed violet/purple range",
      },
    ],
  },
  26: {
    naturalForm: "Fe (solid metal)",
    exampleCompounds: ["Fe₂O₃", "FeCl₃", "FeSO₄", "Fe(CO)₅"],
    electronAffinityKjMol: 16,
    atomicRadiusPm: 126,
    ionizationEnergyKjMol: 763,
    transitionMetalColors: [
      { species: "Fe²⁺", color: "Pale green", notes: "Common in aqueous solution" },
      { species: "Fe³⁺", color: "Yellow/brown", notes: "Hydrolyzed Fe³⁺ often appears brown" },
    ],
  },
  27: {
    naturalForm: "Co (solid metal)",
    exampleCompounds: ["CoCl₂", "Co(OH)₂", "Co₂O₃"],
    transitionMetalColors: [
      {
        species: "Co²⁺",
        color: "Pink",
        wavelengthRange: "Approximate red/pink visible region",
      },
      { species: "CoCl₄²⁻", color: "Blue", notes: "Tetrahedral cobalt(II) complex" },
    ],
  },
  28: {
    naturalForm: "Ni (solid metal)",
    exampleCompounds: ["NiCl₂", "Ni(CO)₄", "NiO"],
    transitionMetalColors: [
      {
        species: "Ni²⁺",
        color: "Green",
        wavelengthRange: "495–570 nm observed green range",
      },
    ],
  },
  29: {
    naturalForm: "Cu (solid metal)",
    exampleCompounds: ["CuSO₄", "CuCl₂", "Cu₂O", "Cu(OH)₂"],
    transitionMetalColors: [
      {
        species: "Cu²⁺",
        color: "Blue",
        wavelengthRange: "450–495 nm observed blue range",
      },
    ],
  },
  35: {
    naturalForm: "Br₂ (diatomic liquid)",
    octetRuleCategory: "expanded-octet",
    octetRuleExamples: ["BrF₅"],
    exampleCompounds: ["NaBr", "HBr", "Br₂"],
  },
  53: {
    naturalForm: "I₂ (diatomic solid)",
    octetRuleCategory: "expanded-octet",
    octetRuleExamples: ["I₃⁻"],
    exampleCompounds: ["NaI", "HI", "I₂", "KI"],
  },
  54: {
    naturalForm: "Xe (monatomic gas)",
    octetRuleCategory: "noble-gas-compounds",
    octetRuleExamples: ["XeF₂", "XeF₄", "XeF₆"],
    exampleCompounds: ["XeF₂", "XeF₄", "XeF₆", "XeO₃"],
  },
}

export function inferDefaultNaturalForm(z: number, category: ElementCategory): string | null {
  const profile = ELEMENT_PROFILES[z]
  if (profile?.naturalForm) return profile.naturalForm
  if (DIATOMIC.has(z)) {
    const symbols: Record<number, string> = {
      1: "H₂",
      7: "N₂",
      8: "O₂",
      9: "F₂",
      17: "Cl₂",
      35: "Br₂",
      53: "I₂",
    }
    return `${symbols[z]} (diatomic)`
  }
  if (NOBLE_GASES.has(z)) return "Monatomic gas"
  if (z === 15) return "P₄ (allotrope)"
  if (z === 16) return "S₈ (allotrope)"
  if (
    category === "transition-metal" ||
    category === "alkali-metal" ||
    category === "alkaline-earth-metal" ||
    category === "post-transition-metal" ||
    category === "lanthanide" ||
    category === "actinide"
  )
    return z === 80 ? "Hg (liquid metallic lattice)" : "Metallic lattice"
  if (category === "halogen") return "Diatomic molecule"
  if (category === "nonmetal" || category === "metalloid") return "Varies by allotrope"
  return null
}

export function inferDefaultStateAtRoomTemperature(z: number): RoomTemperatureState {
  const profile = ELEMENT_PROFILES[z]
  if (profile?.stateAtRoomTemperature) return profile.stateAtRoomTemperature
  if (ROOM_TEMPERATURE_LIQUIDS.has(z)) return "liquid"
  if (ROOM_TEMPERATURE_GASES.has(z)) return "gas"
  if (z >= 104) return "unknown"
  return "solid"
}

export function inferDefaultNotes(
  z: number,
  symbol: string,
  category: ElementCategory,
): string[] {
  const notes = [...(ELEMENT_PROFILES[z]?.notes ?? [])]

  if (RADIOACTIVE_ELEMENTS.has(z)) {
    notes.push("Radioactive element; nuclear data is shown for educational purposes.")
  }
  if (SYNTHETIC_ELEMENTS.has(z)) {
    notes.push("Synthetic or mostly synthetic element; bulk chemistry data may be limited.")
  }
  if (category === "lanthanide") notes.push("Lanthanide chemistry commonly features +3 ions.")
  if (category === "actinide") notes.push("Actinide chemistry often includes multiple oxidation states.")
  if (category === "noble-gas") notes.push(`${symbol} is monatomic under ordinary conditions.`)

  return notes
}

export function getDefaultNuclearInfo(
  z: number,
  symbol: string,
  mass: number,
): ElementNuclearInfo {
  const override = NUCLEAR_OVERRIDES[z] ?? {}
  const isRadioactive = Boolean(override.isRadioactive ?? RADIOACTIVE_ELEMENTS.has(z))
  const isSynthetic = Boolean(override.isSynthetic ?? SYNTHETIC_ELEMENTS.has(z))

  return {
    isRadioactive,
    isSynthetic,
    mostStableIsotope:
      override.mostStableIsotope ?? (isRadioactive ? `${symbol}-${Math.round(mass)}` : null),
    halfLife: override.halfLife ?? (isRadioactive ? "varies by isotope" : null),
    decayModes: override.decayModes ?? (isRadioactive ? ["radioactive decay"] : []),
  }
}

export function inferDefaultOxidationStates(
  z: number,
  group: number | null,
  category: ElementCategory,
): number[] {
  const profile = ELEMENT_PROFILES[z]
  if (profile?.oxidationStates) return profile.oxidationStates

  if (category === "noble-gas") return [0]
  if (category === "alkali-metal") return [1]
  if (category === "alkaline-earth-metal") return [2]
  if (category === "halogen") return z === 9 ? [-1] : [-1, 1, 3, 5, 7]
  if (category === "lanthanide") return [3]
  if (category === "actinide") return [3, 4, 5, 6]
  if (category === "transition-metal") return [2, 3]
  if (group === 13) return [3]
  if (group === 14) return [-4, 2, 4]
  if (group === 15) return [-3, 3, 5]
  if (group === 16) return [-2, 4, 6]

  return []
}

export function inferDefaultCommonIons(
  symbol: string,
  group: number | null,
  category: ElementCategory,
): string[] {
  if (category === "noble-gas") return []
  if (category === "alkali-metal") return [`${symbol}+`]
  if (category === "alkaline-earth-metal") return [`${symbol}2+`]
  if (category === "halogen") return [`${symbol}-`]
  if (category === "lanthanide") return [`${symbol}3+`]
  if (category === "actinide") return [`${symbol}3+`, `${symbol}4+`]
  if (category === "transition-metal") return [`${symbol}2+`, `${symbol}3+`]
  if (group === 13) return [`${symbol}3+`]
  if (group === 16) return [`${symbol}2-`]
  return []
}

export function inferDefaultExampleCompounds(
  z: number,
  symbol: string,
  category: ElementCategory,
): string[] {
  const profile = ELEMENT_PROFILES[z]
  if (profile?.exampleCompounds?.length) return profile.exampleCompounds

  if (category === "alkali-metal") return [`${symbol}Cl`, `${symbol}₂O`, `${symbol}OH`]
  if (category === "alkaline-earth-metal") return [`${symbol}O`, `${symbol}Cl₂`, `${symbol}(OH)₂`]
  if (category === "halogen") return [`${symbol}₂`, `Na${symbol}`, `H${symbol}`]
  if (category === "noble-gas") return []
  if (category === "transition-metal") return [`${symbol}Cl₂`, `${symbol}O`, `${symbol}SO₄`]
  return [`${symbol}O`, `${symbol}Cl`]
}

export function getElementProfileSeed(z: number): ElementProfileSeed {
  return ELEMENT_PROFILES[z] ?? {}
}

export function getOctetRuleDefaults(
  z: number,
  category: ElementCategory,
): { category: OctetRuleCategory; examples: string[] } {
  const profile = ELEMENT_PROFILES[z]
  if (profile?.octetRuleCategory) {
    return {
      category: profile.octetRuleCategory,
      examples: profile.octetRuleExamples ?? [],
    }
  }
  if (category === "noble-gas" && z !== 54) {
    return { category: "normal-octet", examples: [] }
  }
  return { category: "normal-octet", examples: [] }
}

export const TRANSITION_METAL_COLOR_DISCLAIMER =
  "Transition metal colors are educational approximations. The observed color often corresponds to transmitted or reflected light and may relate to absorption of complementary wavelengths, not direct emission."
