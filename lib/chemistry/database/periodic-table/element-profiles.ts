import type {
  ElementCategory,
  OctetRuleCategory,
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
}

const DIATOMIC = new Set([1, 7, 8, 9, 17, 35, 53])

const NOBLE_GASES = new Set([2, 10, 18, 36, 54, 86, 118])

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
  if (category === "transition-metal" || category === "alkali-metal" || category === "alkaline-earth-metal")
    return "Solid metal"
  if (category === "halogen") return "Diatomic molecule"
  if (category === "nonmetal" || category === "metalloid") return "Varies by allotrope"
  return null
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
