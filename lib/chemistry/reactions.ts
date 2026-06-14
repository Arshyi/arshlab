import type { ReactionDifficulty, ReactionRecord } from "./reaction-types"

// Reaction Engine for ARSHLAB
// Rule-based IB-level reaction templates

export interface ReactionResult {
  recognized: boolean
  type: string
  reactants: string[]
  products: string[]
  balanced: boolean
  explanation: string
  functionalGroups: string[]
  structurePreview?: string
}

export interface ParsedEquation {
  reactants: ParsedCompound[]
  products: ParsedCompound[]
  arrow: string
  isReversible: boolean
}

export interface ParsedCompound {
  raw: string
  coefficient: number
  formula: string
  state: string | null
  name?: string
}

// Parse a chemical equation string
export function parseEquation(input: string): ParsedEquation | null {
  // Normalize arrows
  const normalized = input
    .replace(/->|→/g, "→")
    .replace(/<->|<=>|⇋|↔/g, "⇌")
  
  // Find the arrow
  let arrow = "→"
  let isReversible = false
  let parts: string[]
  
  if (normalized.includes("⇌")) {
    arrow = "⇌"
    isReversible = true
    parts = normalized.split("⇌")
  } else if (normalized.includes("→")) {
    parts = normalized.split("→")
  } else {
    return null
  }
  
  if (parts.length !== 2) return null
  
  const reactantStrings = parts[0].split("+").map((s) => s.trim()).filter(Boolean)
  const productStrings = parts[1].split("+").map((s) => s.trim()).filter(Boolean)
  
  if (reactantStrings.length === 0) return null
  
  const reactants = reactantStrings.map(parseCompound)
  const products = productStrings.map(parseCompound)
  
  return { reactants, products, arrow, isReversible }
}

// Parse individual compound with coefficient and state
function parseCompound(str: string): ParsedCompound {
  const raw = str.trim()
  
  // Extract state symbol (aq), (l), (s), (g)
  const stateMatch = raw.match(/\((aq|l|s|g)\)$/i)
  const state = stateMatch ? stateMatch[1].toLowerCase() : null
  const withoutState = stateMatch ? raw.slice(0, -stateMatch[0].length).trim() : raw
  
  // Extract coefficient
  const coeffMatch = withoutState.match(/^(\d+)\s*(.+)$/)
  const coefficient = coeffMatch ? parseInt(coeffMatch[1], 10) : 1
  const formula = coeffMatch ? coeffMatch[2].trim() : withoutState
  
  return { raw, coefficient, formula, state }
}

// Reaction templates and pattern matchers
type ReactionMatcher = (parsed: ParsedEquation) => ReactionResult | null

// Check if formula looks like a hydrocarbon
function isHydrocarbon(formula: string): boolean {
  const normalized = formula.toUpperCase().replace(/[^A-Z0-9]/g, "")
  return /^C\d*H\d+$/.test(normalized) || /^CH\d+$/.test(normalized)
}

// Check if formula looks like an alcohol
function isAlcohol(formula: string): boolean {
  const normalized = formula.toLowerCase()
  return normalized.includes("oh") || normalized.includes("ol") || normalized.includes("alcohol")
}

// Check if formula looks like an alkene
function isAlkene(formula: string): boolean {
  const normalized = formula.toLowerCase()
  if (normalized.includes("ene")) return true
  // CnH2n pattern (not CnH2n+2 which is alkane)
  const match = normalized.match(/c(\d+)h(\d+)/i)
  if (match) {
    const c = parseInt(match[1])
    const h = parseInt(match[2])
    return h === 2 * c && c >= 2
  }
  return false
}

// Check if formula looks like a carboxylic acid
function isCarboxylicAcid(formula: string): boolean {
  const normalized = formula.toLowerCase()
  return normalized.includes("cooh") || normalized.includes("oic acid") || normalized.includes("anoic")
}

// Combustion of hydrocarbons: hydrocarbon + O2 → CO2 + H2O
const combustionMatcher: ReactionMatcher = (parsed) => {
  const { reactants, products } = parsed
  
  // Check for hydrocarbon + oxygen
  const hasHydrocarbon = reactants.some((r) => isHydrocarbon(r.formula) || isAlcohol(r.formula))
  const hasOxygen = reactants.some((r) => r.formula.toUpperCase() === "O2")
  
  if (!hasHydrocarbon || !hasOxygen) return null
  
  const fuelCompound = reactants.find((r) => isHydrocarbon(r.formula) || isAlcohol(r.formula))
  const fuelName = fuelCompound?.formula || "fuel"
  const isAlcoholFuel = isAlcohol(fuelCompound?.formula || "")
  
  return {
    recognized: true,
    type: isAlcoholFuel ? "Combustion of Alcohol" : "Combustion of Hydrocarbon",
    reactants: reactants.map((r) => r.formula),
    products: ["CO2", "H2O"],
    balanced: products.length === 2,
    explanation: `Complete combustion of ${fuelName} with oxygen produces carbon dioxide and water. This is an exothermic reaction that releases energy.`,
    functionalGroups: isAlcoholFuel ? ["—OH (hydroxyl)"] : ["C—H bonds"],
    structurePreview: `${fuelName} + O2 → CO2 + H2O + Energy`,
  }
}

// Alkene + H2 → Alkane (hydrogenation)
const hydrogenationMatcher: ReactionMatcher = (parsed) => {
  const { reactants } = parsed
  
  const hasAlkene = reactants.some((r) => isAlkene(r.formula))
  const hasHydrogen = reactants.some((r) => r.formula.toUpperCase() === "H2")
  
  if (!hasAlkene || !hasHydrogen) return null
  
  const alkene = reactants.find((r) => isAlkene(r.formula))
  
  return {
    recognized: true,
    type: "Hydrogenation (Addition)",
    reactants: reactants.map((r) => r.formula),
    products: ["Alkane"],
    balanced: true,
    explanation: `Hydrogenation is an addition reaction where hydrogen (H2) adds across the C═C double bond of ${alkene?.formula}, converting it to a saturated alkane. Requires a catalyst (Ni, Pt, or Pd).`,
    functionalGroups: ["C═C (double bond)"],
    structurePreview: `   H  H
    \\ /
C═C  +  H—H  →  C—C
    / \\           / \\
             H  H`,
  }
}

// Alkene + Br2 → Dibromoalkane (bromination)
const brominationMatcher: ReactionMatcher = (parsed) => {
  const { reactants } = parsed
  
  const hasAlkene = reactants.some((r) => isAlkene(r.formula))
  const hasBromine = reactants.some((r) => r.formula.toUpperCase() === "BR2")
  
  if (!hasAlkene || !hasBromine) return null
  
  const alkene = reactants.find((r) => isAlkene(r.formula))
  
  return {
    recognized: true,
    type: "Bromination (Addition)",
    reactants: reactants.map((r) => r.formula),
    products: ["Dibromoalkane"],
    balanced: true,
    explanation: `Bromination is an addition reaction where Br2 adds across the C═C double bond of ${alkene?.formula}. The orange/brown bromine color disappears, which is a test for unsaturation.`,
    functionalGroups: ["C═C (double bond)", "C—Br bonds formed"],
    structurePreview: `C═C  +  Br—Br  →  C—C
                  |   |
                 Br  Br`,
  }
}

// Alcohol + Carboxylic acid ⇌ Ester + Water (esterification)
const esterificationMatcher: ReactionMatcher = (parsed) => {
  const { reactants, isReversible } = parsed
  
  const hasAlcohol = reactants.some((r) => isAlcohol(r.formula))
  const hasAcid = reactants.some((r) => isCarboxylicAcid(r.formula))
  
  if (!hasAlcohol || !hasAcid) return null
  
  const alcohol = reactants.find((r) => isAlcohol(r.formula))
  const acid = reactants.find((r) => isCarboxylicAcid(r.formula))
  
  return {
    recognized: true,
    type: "Esterification (Condensation)",
    reactants: reactants.map((r) => r.formula),
    products: ["Ester", "H2O"],
    balanced: true,
    explanation: `Esterification is a reversible condensation reaction between ${alcohol?.formula} and ${acid?.formula}. An acid catalyst (H2SO4) is required. The reaction produces an ester with a characteristic fruity smell and water.`,
    functionalGroups: ["—OH (alcohol)", "—COOH (carboxylic acid)", "—COO— (ester)"],
    structurePreview: `R—OH  +  R'—COOH  ⇌  R'—COO—R  +  H2O
(alcohol)  (acid)       (ester)    (water)`,
  }
}

// Acid + Base → Salt + Water (neutralization)
const neutralizationMatcher: ReactionMatcher = (parsed) => {
  const { reactants } = parsed
  
  // Simple check for common acids and bases
  const acidPatterns = ["hcl", "h2so4", "hno3", "h3po4", "acid"]
  const basePatterns = ["naoh", "koh", "nh3", "oh"]
  
  const hasAcid = reactants.some((r) => 
    acidPatterns.some((p) => r.formula.toLowerCase().includes(p)) || isCarboxylicAcid(r.formula)
  )
  const hasBase = reactants.some((r) => 
    basePatterns.some((p) => r.formula.toLowerCase().includes(p))
  )
  
  if (!hasAcid || !hasBase) return null
  
  return {
    recognized: true,
    type: "Neutralization",
    reactants: reactants.map((r) => r.formula),
    products: ["Salt", "H2O"],
    balanced: true,
    explanation: "Neutralization is an exothermic reaction between an acid and a base producing a salt and water. The H⁺ from the acid combines with OH⁻ from the base.",
    functionalGroups: ["H⁺ (acid)", "OH⁻ (base)"],
    structurePreview: "Acid + Base → Salt + H2O",
  }
}

// Acid + Carbonate → Salt + Water + CO2
const carbonateMatcher: ReactionMatcher = (parsed) => {
  const { reactants } = parsed
  
  const acidPatterns = ["hcl", "h2so4", "hno3", "acid"]
  const carbonatePatterns = ["co3", "carbonate", "hco3", "bicarbonate"]
  
  const hasAcid = reactants.some((r) => 
    acidPatterns.some((p) => r.formula.toLowerCase().includes(p))
  )
  const hasCarbonate = reactants.some((r) => 
    carbonatePatterns.some((p) => r.formula.toLowerCase().includes(p))
  )
  
  if (!hasAcid || !hasCarbonate) return null
  
  return {
    recognized: true,
    type: "Acid + Carbonate",
    reactants: reactants.map((r) => r.formula),
    products: ["Salt", "H2O", "CO2"],
    balanced: true,
    explanation: "When an acid reacts with a carbonate, it produces a salt, water, and carbon dioxide gas. The fizzing/effervescence is due to CO2 being released.",
    functionalGroups: ["CO3²⁻ (carbonate ion)"],
    structurePreview: "Acid + Carbonate → Salt + H2O + CO2↑",
  }
}

// Metal + Acid → Salt + H2
const metalAcidMatcher: ReactionMatcher = (parsed) => {
  const { reactants } = parsed
  
  const metals = ["mg", "zn", "fe", "al", "na", "k", "ca", "li"]
  const acidPatterns = ["hcl", "h2so4", "hno3"]
  
  const hasMetal = reactants.some((r) => 
    metals.includes(r.formula.toLowerCase())
  )
  const hasAcid = reactants.some((r) => 
    acidPatterns.some((p) => r.formula.toLowerCase().includes(p))
  )
  
  if (!hasMetal || !hasAcid) return null
  
  const metal = reactants.find((r) => metals.includes(r.formula.toLowerCase()))
  
  return {
    recognized: true,
    type: "Metal + Acid",
    reactants: reactants.map((r) => r.formula),
    products: ["Salt", "H2"],
    balanced: true,
    explanation: `Reactive metals like ${metal?.formula} displace hydrogen from acids. The metal is oxidized (loses electrons) while H⁺ is reduced to H2 gas.`,
    functionalGroups: ["Metal", "H⁺ (acid)"],
    structurePreview: `Metal + Acid → Salt + H2↑`,
  }
}

// All matchers in priority order
const reactionMatchers: ReactionMatcher[] = [
  combustionMatcher,
  hydrogenationMatcher,
  brominationMatcher,
  esterificationMatcher,
  neutralizationMatcher,
  carbonateMatcher,
  metalAcidMatcher,
]

// Main function to analyze a reaction
export function analyzeReaction(input: string): ReactionResult {
  const parsed = parseEquation(input)
  
  if (!parsed) {
    return {
      recognized: false,
      type: "Unknown",
      reactants: [],
      products: [],
      balanced: false,
      explanation: "Could not parse the equation. Make sure to use → or ⇌ between reactants and products, and + between compounds.",
      functionalGroups: [],
    }
  }
  
  // Try each matcher
  for (const matcher of reactionMatchers) {
    const result = matcher(parsed)
    if (result) return result
  }
  
  // No match found
  return {
    recognized: false,
    type: "Not Recognized",
    reactants: parsed.reactants.map((r) => r.formula),
    products: parsed.products.map((r) => r.formula),
    balanced: false,
    explanation: "ARSHLAB does not support this reaction yet. Check Patch Notes for the list of supported reactions.",
    functionalGroups: [],
  }
}

// Get list of supported reaction types
export function getSupportedReactions(): { type: string; example: string }[] {
  return [
    { type: "Combustion", example: "CH4 + O2 → CO2 + H2O" },
    { type: "Hydrogenation", example: "C2H4 + H2 → C2H6" },
    { type: "Bromination", example: "C2H4 + Br2 → C2H4Br2" },
    { type: "Esterification", example: "ethanol + ethanoic acid ⇌ ester + water" },
    { type: "Neutralization", example: "HCl + NaOH → NaCl + H2O" },
    { type: "Acid + Carbonate", example: "HCl + CaCO3 → CaCl2 + H2O + CO2" },
    { type: "Metal + Acid", example: "Mg + HCl → MgCl2 + H2" },
  ]
}

export const REACTION_TEMPLATES_KNOWLEDGE: import("./types").ReactionTemplate[] = [
  {
    id: "template-acid-base",
    type: "acid-base",
    reactants: ["acid", "base"],
    products: ["conjugate base", "conjugate acid"],
    generalForm: "HA + B -> A- + HB+",
    description: "A proton is transferred from an acid to a base.",
    examples: ["HCl + NH3 -> Cl- + NH4+"],
  },
  {
    id: "template-neutralization",
    type: "neutralization",
    reactants: ["acid", "metal hydroxide"],
    products: ["salt", "water"],
    generalForm: "acid + base -> salt + water",
    description: "Hydrogen ions and hydroxide ions form water while spectator ions form a salt.",
    examples: ["HCl + NaOH -> NaCl + H2O"],
  },
  {
    id: "template-combustion",
    type: "combustion",
    reactants: ["fuel", "oxygen"],
    products: ["carbon dioxide", "water"],
    generalForm: "hydrocarbon + O2 -> CO2 + H2O",
    description: "A fuel reacts with oxygen, releasing energy; complete combustion produces carbon dioxide and water.",
    examples: ["CH4 + 2O2 -> CO2 + 2H2O"],
  },
  {
    id: "template-addition",
    type: "addition",
    reactants: ["alkene or alkyne", "small molecule"],
    products: ["saturated product"],
    generalForm: "C=C + X-Y -> X-C-C-Y",
    description: "Atoms add across an unsaturated bond, reducing pi bonding.",
    examples: ["CH2=CH2 + Br2 -> BrCH2CH2Br"],
  },
  {
    id: "template-elimination",
    type: "elimination",
    reactants: ["haloalkane or alcohol"],
    products: ["alkene", "small molecule"],
    generalForm: "substrate -> alkene + HX or H2O",
    description: "A small molecule is removed, often forming a carbon-carbon double bond.",
    examples: ["CH3CH2Br + OH- -> CH2=CH2 + Br- + H2O"],
  },
  {
    id: "template-substitution",
    type: "substitution",
    reactants: ["substrate", "nucleophile or electrophile"],
    products: ["substituted product", "leaving group"],
    generalForm: "R-X + Nu- -> R-Nu + X-",
    description: "One atom or group is replaced by another.",
    examples: ["CH3CH2Br + OH- -> CH3CH2OH + Br-"],
  },
  {
    id: "template-esterification",
    type: "esterification",
    reactants: ["carboxylic acid", "alcohol"],
    products: ["ester", "water"],
    generalForm: "RCOOH + R'OH <-> RCOOR' + H2O",
    description: "A carboxylic acid and alcohol form an ester under acidic conditions.",
    examples: ["CH3COOH + CH3CH2OH <-> CH3COOCH2CH3 + H2O"],
  },
  {
    id: "template-hydrolysis",
    type: "hydrolysis",
    reactants: ["ester, amide, or salt", "water"],
    products: ["cleavage products"],
    generalForm: "compound + H2O -> smaller products",
    description: "Water breaks a bond; common for esters, amides, salts, and biological polymers.",
    examples: ["CH3COOCH3 + H2O -> CH3COOH + CH3OH"],
  },
  {
    id: "template-redox",
    type: "redox",
    reactants: ["reducing agent", "oxidizing agent"],
    products: ["oxidized species", "reduced species"],
    generalForm: "electron donor + electron acceptor -> oxidized donor + reduced acceptor",
    description: "Electrons are transferred; oxidation and reduction occur together.",
    examples: ["Zn + Cu2+ -> Zn2+ + Cu"],
  },
  {
    id: "template-precipitation",
    type: "precipitation",
    reactants: ["aqueous ions"],
    products: ["insoluble solid", "spectator ions"],
    generalForm: "A+(aq) + B-(aq) -> AB(s)",
    description: "A low-solubility ionic compound forms a solid from aqueous ions.",
    examples: ["Ag+(aq) + Cl-(aq) -> AgCl(s)"],
  },
]

type ReactionSeed = Omit<ReactionRecord, "unbalancedEquation" | "curriculum">

const standardCurriculum = [
  "High School",
  "General First-Year Chemistry",
  "CHEM 121",
  "IB Chemistry Style",
  "AP Chemistry Style",
  "A-Level Chemistry Style",
]

function unbalanceEquation(equation: string): string {
  return equation
    .split(" -> ")
    .map((side) =>
      side
        .split(" + ")
        .map((part) => part.replace(/^(\d+)(?=[A-Z([])/, ""))
        .join(" + "),
    )
    .join(" -> ")
}

function reaction(input: ReactionSeed): ReactionRecord {
  return {
    ...input,
    curriculum: standardCurriculum,
    unbalancedEquation: unbalanceEquation(input.balancedEquation),
  }
}

const acidBaseReactions: ReactionRecord[] = [
  reaction({
    id: "rxn-neutralization-hcl-naoh",
    name: "Hydrochloric acid and sodium hydroxide",
    reactionType: "neutralization",
    category: "Acid-Base",
    difficulty: "Introductory",
    reactants: ["HCl", "NaOH"],
    products: ["NaCl", "H2O"],
    balancedEquation: "HCl + NaOH -> NaCl + H2O",
    explanation: "A strong acid and strong base form water and an ionic salt.",
  }),
  reaction({
    id: "rxn-neutralization-hcl-koh",
    name: "Hydrochloric acid and potassium hydroxide",
    reactionType: "neutralization",
    category: "Acid-Base",
    difficulty: "Introductory",
    reactants: ["HCl", "KOH"],
    products: ["KCl", "H2O"],
    balancedEquation: "HCl + KOH -> KCl + H2O",
    explanation: "H+ and OH- combine to form water; K+ and Cl- remain as the salt.",
  }),
  reaction({
    id: "rxn-neutralization-hno3-naoh",
    name: "Nitric acid and sodium hydroxide",
    reactionType: "neutralization",
    category: "Acid-Base",
    difficulty: "Introductory",
    reactants: ["HNO3", "NaOH"],
    products: ["NaNO3", "H2O"],
    balancedEquation: "HNO3 + NaOH -> NaNO3 + H2O",
    explanation: "Nitrate is a spectator ion while hydrogen and hydroxide produce water.",
  }),
  reaction({
    id: "rxn-neutralization-hno3-koh",
    name: "Nitric acid and potassium hydroxide",
    reactionType: "neutralization",
    category: "Acid-Base",
    difficulty: "Introductory",
    reactants: ["HNO3", "KOH"],
    products: ["KNO3", "H2O"],
    balancedEquation: "HNO3 + KOH -> KNO3 + H2O",
    explanation: "A strong acid-base reaction goes essentially to completion in water.",
  }),
  reaction({
    id: "rxn-neutralization-h2so4-naoh",
    name: "Sulfuric acid and sodium hydroxide",
    reactionType: "neutralization",
    category: "Acid-Base",
    difficulty: "Intermediate",
    reactants: ["H2SO4", "NaOH"],
    products: ["Na2SO4", "H2O"],
    balancedEquation: "H2SO4 + 2NaOH -> Na2SO4 + 2H2O",
    explanation: "Sulfuric acid is diprotic, so two hydroxide ions are needed per acid molecule.",
  }),
  reaction({
    id: "rxn-neutralization-h2so4-koh",
    name: "Sulfuric acid and potassium hydroxide",
    reactionType: "neutralization",
    category: "Acid-Base",
    difficulty: "Intermediate",
    reactants: ["H2SO4", "KOH"],
    products: ["K2SO4", "H2O"],
    balancedEquation: "H2SO4 + 2KOH -> K2SO4 + 2H2O",
    explanation: "The two acidic protons in H2SO4 require two equivalents of strong base.",
  }),
  reaction({
    id: "rxn-neutralization-h3po4-naoh",
    name: "Phosphoric acid and sodium hydroxide",
    reactionType: "neutralization",
    category: "Acid-Base",
    difficulty: "Intermediate",
    reactants: ["H3PO4", "NaOH"],
    products: ["Na3PO4", "H2O"],
    balancedEquation: "H3PO4 + 3NaOH -> Na3PO4 + 3H2O",
    explanation: "Complete neutralization of triprotic phosphoric acid needs three hydroxide ions.",
  }),
  reaction({
    id: "rxn-neutralization-acetic-naoh",
    name: "Acetic acid and sodium hydroxide",
    reactionType: "neutralization",
    category: "Acid-Base",
    difficulty: "Introductory",
    reactants: ["CH3COOH", "NaOH"],
    products: ["CH3COONa", "H2O"],
    balancedEquation: "CH3COOH + NaOH -> CH3COONa + H2O",
    explanation: "A weak carboxylic acid still neutralizes a strong base to form acetate and water.",
  }),
  reaction({
    id: "rxn-neutralization-formic-koh",
    name: "Formic acid and potassium hydroxide",
    reactionType: "neutralization",
    category: "Acid-Base",
    difficulty: "Introductory",
    reactants: ["HCOOH", "KOH"],
    products: ["HCOOK", "H2O"],
    balancedEquation: "HCOOH + KOH -> HCOOK + H2O",
    explanation: "The acidic proton from formic acid is transferred to hydroxide.",
  }),
  reaction({
    id: "rxn-neutralization-hcl-caoh2",
    name: "Hydrochloric acid and calcium hydroxide",
    reactionType: "neutralization",
    category: "Acid-Base",
    difficulty: "Intermediate",
    reactants: ["HCl", "Ca(OH)2"],
    products: ["CaCl2", "H2O"],
    balancedEquation: "2HCl + Ca(OH)2 -> CaCl2 + 2H2O",
    explanation: "Calcium hydroxide supplies two hydroxide ions, requiring two acid equivalents.",
  }),
  reaction({
    id: "rxn-neutralization-hno3-caoh2",
    name: "Nitric acid and calcium hydroxide",
    reactionType: "neutralization",
    category: "Acid-Base",
    difficulty: "Intermediate",
    reactants: ["HNO3", "Ca(OH)2"],
    products: ["Ca(NO3)2", "H2O"],
    balancedEquation: "2HNO3 + Ca(OH)2 -> Ca(NO3)2 + 2H2O",
    explanation: "Charge balance gives calcium nitrate plus water.",
  }),
  reaction({
    id: "rxn-acid-base-ammonia-hcl",
    name: "Ammonia and hydrochloric acid",
    reactionType: "acid-base proton transfer",
    category: "Acid-Base",
    difficulty: "Introductory",
    reactants: ["NH3", "HCl"],
    products: ["NH4Cl"],
    balancedEquation: "NH3 + HCl -> NH4Cl",
    explanation: "Ammonia accepts a proton to form ammonium chloride.",
  }),
  reaction({
    id: "rxn-acid-base-ammonia-hno3",
    name: "Ammonia and nitric acid",
    reactionType: "acid-base proton transfer",
    category: "Acid-Base",
    difficulty: "Introductory",
    reactants: ["NH3", "HNO3"],
    products: ["NH4NO3"],
    balancedEquation: "NH3 + HNO3 -> NH4NO3",
    explanation: "The base NH3 becomes NH4+ while nitrate is the counterion.",
  }),
  reaction({
    id: "rxn-neutralization-h2co3-naoh",
    name: "Carbonic acid and sodium hydroxide",
    reactionType: "neutralization",
    category: "Acid-Base",
    difficulty: "Intermediate",
    reactants: ["H2CO3", "NaOH"],
    products: ["Na2CO3", "H2O"],
    balancedEquation: "H2CO3 + 2NaOH -> Na2CO3 + 2H2O",
    explanation: "Full neutralization of carbonic acid forms carbonate and water.",
  }),
]

const precipitationReactions: ReactionRecord[] = [
  reaction({
    id: "rxn-precip-agcl",
    name: "Silver chloride precipitation",
    reactionType: "precipitation",
    category: "Precipitation",
    difficulty: "Introductory",
    reactants: ["AgNO3", "NaCl"],
    products: ["AgCl", "NaNO3"],
    balancedEquation: "AgNO3 + NaCl -> AgCl + NaNO3",
    explanation: "AgCl is insoluble, so a white precipitate forms from aqueous silver and chloride ions.",
  }),
  reaction({
    id: "rxn-precip-baso4",
    name: "Barium sulfate precipitation",
    reactionType: "precipitation",
    category: "Precipitation",
    difficulty: "Introductory",
    reactants: ["BaCl2", "Na2SO4"],
    products: ["BaSO4", "NaCl"],
    balancedEquation: "BaCl2 + Na2SO4 -> BaSO4 + 2NaCl",
    explanation: "Barium sulfate is very insoluble and forms a white solid.",
  }),
  reaction({
    id: "rxn-precip-pbi2",
    name: "Lead iodide precipitation",
    reactionType: "precipitation",
    category: "Precipitation",
    difficulty: "Introductory",
    reactants: ["Pb(NO3)2", "KI"],
    products: ["PbI2", "KNO3"],
    balancedEquation: "Pb(NO3)2 + 2KI -> PbI2 + 2KNO3",
    explanation: "PbI2 forms a bright yellow precipitate; nitrate and potassium are spectators.",
  }),
  reaction({
    id: "rxn-precip-caco3",
    name: "Calcium carbonate precipitation",
    reactionType: "precipitation",
    category: "Precipitation",
    difficulty: "Introductory",
    reactants: ["CaCl2", "Na2CO3"],
    products: ["CaCO3", "NaCl"],
    balancedEquation: "CaCl2 + Na2CO3 -> CaCO3 + 2NaCl",
    explanation: "Calcium carbonate is sparingly soluble, producing a cloudy white precipitate.",
  }),
  reaction({
    id: "rxn-precip-feoh3",
    name: "Iron(III) hydroxide precipitation",
    reactionType: "precipitation",
    category: "Precipitation",
    difficulty: "Intermediate",
    reactants: ["FeCl3", "NaOH"],
    products: ["Fe(OH)3", "NaCl"],
    balancedEquation: "FeCl3 + 3NaOH -> Fe(OH)3 + 3NaCl",
    explanation: "Fe3+ and OH- form insoluble iron(III) hydroxide.",
  }),
  reaction({
    id: "rxn-precip-cuoh2",
    name: "Copper(II) hydroxide precipitation",
    reactionType: "precipitation",
    category: "Precipitation",
    difficulty: "Intermediate",
    reactants: ["CuSO4", "NaOH"],
    products: ["Cu(OH)2", "Na2SO4"],
    balancedEquation: "CuSO4 + 2NaOH -> Cu(OH)2 + Na2SO4",
    explanation: "Blue copper(II) hydroxide precipitates when hydroxide is added to Cu2+.",
  }),
  reaction({
    id: "rxn-precip-mgoh2",
    name: "Magnesium hydroxide precipitation",
    reactionType: "precipitation",
    category: "Precipitation",
    difficulty: "Intermediate",
    reactants: ["MgCl2", "NaOH"],
    products: ["Mg(OH)2", "NaCl"],
    balancedEquation: "MgCl2 + 2NaOH -> Mg(OH)2 + 2NaCl",
    explanation: "Magnesium hydroxide has low solubility and forms a white solid.",
  }),
  reaction({
    id: "rxn-precip-aloh3",
    name: "Aluminium hydroxide precipitation",
    reactionType: "precipitation",
    category: "Precipitation",
    difficulty: "Intermediate",
    reactants: ["AlCl3", "NaOH"],
    products: ["Al(OH)3", "NaCl"],
    balancedEquation: "AlCl3 + 3NaOH -> Al(OH)3 + 3NaCl",
    explanation: "Al3+ forms gelatinous aluminium hydroxide with hydroxide ions.",
  }),
  reaction({
    id: "rxn-precip-agbr",
    name: "Silver bromide precipitation",
    reactionType: "precipitation",
    category: "Precipitation",
    difficulty: "Introductory",
    reactants: ["AgNO3", "KBr"],
    products: ["AgBr", "KNO3"],
    balancedEquation: "AgNO3 + KBr -> AgBr + KNO3",
    explanation: "Silver bromide is insoluble and often appears cream colored.",
  }),
  reaction({
    id: "rxn-precip-srso4",
    name: "Strontium sulfate precipitation",
    reactionType: "precipitation",
    category: "Precipitation",
    difficulty: "Intermediate",
    reactants: ["Sr(NO3)2", "Na2SO4"],
    products: ["SrSO4", "NaNO3"],
    balancedEquation: "Sr(NO3)2 + Na2SO4 -> SrSO4 + 2NaNO3",
    explanation: "Sulfates of heavier group 2 metals have lower solubility.",
  }),
  reaction({
    id: "rxn-precip-pbso4",
    name: "Lead sulfate precipitation",
    reactionType: "precipitation",
    category: "Precipitation",
    difficulty: "Intermediate",
    reactants: ["Pb(NO3)2", "Na2SO4"],
    products: ["PbSO4", "NaNO3"],
    balancedEquation: "Pb(NO3)2 + Na2SO4 -> PbSO4 + 2NaNO3",
    explanation: "PbSO4 is insoluble, so sulfate can remove Pb2+ from solution.",
  }),
  reaction({
    id: "rxn-precip-baco3",
    name: "Barium carbonate precipitation",
    reactionType: "precipitation",
    category: "Precipitation",
    difficulty: "Intermediate",
    reactants: ["Ba(NO3)2", "K2CO3"],
    products: ["BaCO3", "KNO3"],
    balancedEquation: "Ba(NO3)2 + K2CO3 -> BaCO3 + 2KNO3",
    explanation: "Most carbonates except group 1 and ammonium carbonates are poorly soluble.",
  }),
  reaction({
    id: "rxn-precip-caoxalate",
    name: "Calcium oxalate precipitation",
    reactionType: "precipitation",
    category: "Precipitation",
    difficulty: "Advanced",
    reactants: ["Ca(NO3)2", "Na2C2O4"],
    products: ["CaC2O4", "NaNO3"],
    balancedEquation: "Ca(NO3)2 + Na2C2O4 -> CaC2O4 + 2NaNO3",
    explanation: "Calcium oxalate is a low-solubility salt used in qualitative precipitation examples.",
  }),
  reaction({
    id: "rxn-precip-znco3",
    name: "Zinc carbonate precipitation",
    reactionType: "precipitation",
    category: "Precipitation",
    difficulty: "Intermediate",
    reactants: ["ZnSO4", "Na2CO3"],
    products: ["ZnCO3", "Na2SO4"],
    balancedEquation: "ZnSO4 + Na2CO3 -> ZnCO3 + Na2SO4",
    explanation: "Zinc carbonate forms as a white precipitate from Zn2+ and carbonate ions.",
  }),
  reaction({
    id: "rxn-precip-cooh2",
    name: "Cobalt(II) hydroxide precipitation",
    reactionType: "precipitation",
    category: "Precipitation",
    difficulty: "Intermediate",
    reactants: ["CoCl2", "NaOH"],
    products: ["Co(OH)2", "NaCl"],
    balancedEquation: "CoCl2 + 2NaOH -> Co(OH)2 + 2NaCl",
    explanation: "Cobalt(II) hydroxide is a colored hydroxide precipitate of a transition metal ion.",
  }),
]

const combustionReactions: ReactionRecord[] = [
  reaction({
    id: "rxn-combustion-methane",
    name: "Methane combustion",
    reactionType: "complete combustion",
    category: "Combustion",
    difficulty: "Introductory",
    reactants: ["CH4", "O2"],
    products: ["CO2", "H2O"],
    balancedEquation: "CH4 + 2O2 -> CO2 + 2H2O",
    explanation: "Complete combustion of a hydrocarbon produces carbon dioxide and water.",
  }),
  reaction({
    id: "rxn-combustion-ethane",
    name: "Ethane combustion",
    reactionType: "complete combustion",
    category: "Combustion",
    difficulty: "Intermediate",
    reactants: ["C2H6", "O2"],
    products: ["CO2", "H2O"],
    balancedEquation: "2C2H6 + 7O2 -> 4CO2 + 6H2O",
    explanation: "Carbon atoms balance to CO2 and hydrogen atoms balance to H2O before oxygen is adjusted.",
  }),
  reaction({
    id: "rxn-combustion-propane",
    name: "Propane combustion",
    reactionType: "complete combustion",
    category: "Combustion",
    difficulty: "Intermediate",
    reactants: ["C3H8", "O2"],
    products: ["CO2", "H2O"],
    balancedEquation: "C3H8 + 5O2 -> 3CO2 + 4H2O",
    explanation: "Propane combustion is a common fuel reaction and a classic balancing example.",
  }),
  reaction({
    id: "rxn-combustion-butane",
    name: "Butane combustion",
    reactionType: "complete combustion",
    category: "Combustion",
    difficulty: "Intermediate",
    reactants: ["C4H10", "O2"],
    products: ["CO2", "H2O"],
    balancedEquation: "2C4H10 + 13O2 -> 8CO2 + 10H2O",
    explanation: "The fractional oxygen step is often doubled to give whole-number coefficients.",
  }),
  reaction({
    id: "rxn-combustion-ethene",
    name: "Ethene combustion",
    reactionType: "complete combustion",
    category: "Combustion",
    difficulty: "Intermediate",
    reactants: ["C2H4", "O2"],
    products: ["CO2", "H2O"],
    balancedEquation: "C2H4 + 3O2 -> 2CO2 + 2H2O",
    explanation: "Alkenes also burn completely to carbon dioxide and water under excess oxygen.",
  }),
  reaction({
    id: "rxn-combustion-ethyne",
    name: "Ethyne combustion",
    reactionType: "complete combustion",
    category: "Combustion",
    difficulty: "Intermediate",
    reactants: ["C2H2", "O2"],
    products: ["CO2", "H2O"],
    balancedEquation: "2C2H2 + 5O2 -> 4CO2 + 2H2O",
    explanation: "Ethyne has a high carbon-to-hydrogen ratio and needs careful oxygen balancing.",
  }),
  reaction({
    id: "rxn-combustion-benzene",
    name: "Benzene combustion",
    reactionType: "complete combustion",
    category: "Combustion",
    difficulty: "Advanced",
    reactants: ["C6H6", "O2"],
    products: ["CO2", "H2O"],
    balancedEquation: "2C6H6 + 15O2 -> 12CO2 + 6H2O",
    explanation: "Aromatic hydrocarbons combust to CO2 and H2O when oxygen is abundant.",
  }),
  reaction({
    id: "rxn-combustion-methanol",
    name: "Methanol combustion",
    reactionType: "alcohol combustion",
    category: "Combustion",
    difficulty: "Intermediate",
    reactants: ["CH3OH", "O2"],
    products: ["CO2", "H2O"],
    balancedEquation: "2CH3OH + 3O2 -> 2CO2 + 4H2O",
    explanation: "Alcohol fuels already contain oxygen, so less O2 is required than a comparable hydrocarbon.",
  }),
  reaction({
    id: "rxn-combustion-ethanol",
    name: "Ethanol combustion",
    reactionType: "alcohol combustion",
    category: "Combustion",
    difficulty: "Intermediate",
    reactants: ["C2H5OH", "O2"],
    products: ["CO2", "H2O"],
    balancedEquation: "C2H5OH + 3O2 -> 2CO2 + 3H2O",
    explanation: "Ethanol combustion is exothermic and produces carbon dioxide and water.",
  }),
  reaction({
    id: "rxn-combustion-propanol",
    name: "Propanol combustion",
    reactionType: "alcohol combustion",
    category: "Combustion",
    difficulty: "Intermediate",
    reactants: ["C3H7OH", "O2"],
    products: ["CO2", "H2O"],
    balancedEquation: "2C3H7OH + 9O2 -> 6CO2 + 8H2O",
    explanation: "Alcohol combustion balances C and H first, then oxygen last.",
  }),
  reaction({
    id: "rxn-combustion-glucose",
    name: "Glucose combustion",
    reactionType: "biomolecule combustion",
    category: "Combustion",
    difficulty: "Intermediate",
    reactants: ["C6H12O6", "O2"],
    products: ["CO2", "H2O"],
    balancedEquation: "C6H12O6 + 6O2 -> 6CO2 + 6H2O",
    explanation: "Cellular respiration uses the same overall stoichiometry as complete glucose oxidation.",
  }),
  reaction({
    id: "rxn-combustion-toluene",
    name: "Toluene combustion",
    reactionType: "complete combustion",
    category: "Combustion",
    difficulty: "Advanced",
    reactants: ["C7H8", "O2"],
    products: ["CO2", "H2O"],
    balancedEquation: "C7H8 + 9O2 -> 7CO2 + 4H2O",
    explanation: "Toluene is an aromatic hydrocarbon; complete combustion oxidizes all carbon to CO2.",
  }),
  reaction({
    id: "rxn-combustion-octane",
    name: "Octane combustion",
    reactionType: "complete combustion",
    category: "Combustion",
    difficulty: "Advanced",
    reactants: ["C8H18", "O2"],
    products: ["CO2", "H2O"],
    balancedEquation: "2C8H18 + 25O2 -> 16CO2 + 18H2O",
    explanation: "Octane is a gasoline model compound and needs large stoichiometric coefficients.",
  }),
  reaction({
    id: "rxn-combustion-propene",
    name: "Propene combustion",
    reactionType: "complete combustion",
    category: "Combustion",
    difficulty: "Intermediate",
    reactants: ["C3H6", "O2"],
    products: ["CO2", "H2O"],
    balancedEquation: "2C3H6 + 9O2 -> 6CO2 + 6H2O",
    explanation: "Unsaturated hydrocarbons follow the same complete-combustion product pattern.",
  }),
  reaction({
    id: "rxn-combustion-acetone",
    name: "Acetone combustion",
    reactionType: "oxygenated organic combustion",
    category: "Combustion",
    difficulty: "Advanced",
    reactants: ["C3H6O", "O2"],
    products: ["CO2", "H2O"],
    balancedEquation: "C3H6O + 4O2 -> 3CO2 + 3H2O",
    explanation: "Oxygenated organic compounds still form CO2 and H2O on complete combustion.",
  }),
]

const singleDisplacementReactions: ReactionRecord[] = [
  reaction({
    id: "rxn-displacement-zn-cuso4",
    name: "Zinc displaces copper",
    reactionType: "single displacement",
    category: "Single Displacement",
    difficulty: "Introductory",
    reactants: ["Zn", "CuSO4"],
    products: ["ZnSO4", "Cu"],
    balancedEquation: "Zn + CuSO4 -> ZnSO4 + Cu",
    explanation: "More reactive zinc displaces copper from copper(II) sulfate.",
  }),
  reaction({
    id: "rxn-displacement-fe-cuso4",
    name: "Iron displaces copper",
    reactionType: "single displacement",
    category: "Single Displacement",
    difficulty: "Introductory",
    reactants: ["Fe", "CuSO4"],
    products: ["FeSO4", "Cu"],
    balancedEquation: "Fe + CuSO4 -> FeSO4 + Cu",
    explanation: "Iron is above copper in the reactivity series and can reduce Cu2+ to copper metal.",
  }),
  reaction({
    id: "rxn-displacement-mg-hcl",
    name: "Magnesium and hydrochloric acid",
    reactionType: "metal acid displacement",
    category: "Single Displacement",
    difficulty: "Introductory",
    reactants: ["Mg", "HCl"],
    products: ["MgCl2", "H2"],
    balancedEquation: "Mg + 2HCl -> MgCl2 + H2",
    explanation: "Magnesium displaces hydrogen from acid, producing hydrogen gas.",
  }),
  reaction({
    id: "rxn-displacement-zn-hcl",
    name: "Zinc and hydrochloric acid",
    reactionType: "metal acid displacement",
    category: "Single Displacement",
    difficulty: "Introductory",
    reactants: ["Zn", "HCl"],
    products: ["ZnCl2", "H2"],
    balancedEquation: "Zn + 2HCl -> ZnCl2 + H2",
    explanation: "Zinc is oxidized while hydrogen ions are reduced to hydrogen gas.",
  }),
  reaction({
    id: "rxn-displacement-al-cucl2",
    name: "Aluminium displaces copper",
    reactionType: "single displacement",
    category: "Single Displacement",
    difficulty: "Intermediate",
    reactants: ["Al", "CuCl2"],
    products: ["AlCl3", "Cu"],
    balancedEquation: "2Al + 3CuCl2 -> 2AlCl3 + 3Cu",
    explanation: "Aluminium forms Al3+, requiring coefficient balancing with Cu2+.",
  }),
  reaction({
    id: "rxn-displacement-cl2-kbr",
    name: "Chlorine displaces bromide",
    reactionType: "halogen displacement",
    category: "Single Displacement",
    difficulty: "Intermediate",
    reactants: ["Cl2", "KBr"],
    products: ["KCl", "Br2"],
    balancedEquation: "Cl2 + 2KBr -> 2KCl + Br2",
    explanation: "Chlorine is a stronger oxidizing halogen and displaces bromide.",
  }),
  reaction({
    id: "rxn-displacement-br2-ki",
    name: "Bromine displaces iodide",
    reactionType: "halogen displacement",
    category: "Single Displacement",
    difficulty: "Intermediate",
    reactants: ["Br2", "KI"],
    products: ["KBr", "I2"],
    balancedEquation: "Br2 + 2KI -> 2KBr + I2",
    explanation: "Bromine oxidizes iodide to iodine because bromine is more reactive than iodine.",
  }),
  reaction({
    id: "rxn-displacement-na-water",
    name: "Sodium and water",
    reactionType: "metal water displacement",
    category: "Single Displacement",
    difficulty: "Introductory",
    reactants: ["Na", "H2O"],
    products: ["NaOH", "H2"],
    balancedEquation: "2Na + 2H2O -> 2NaOH + H2",
    explanation: "Alkali metals displace hydrogen from water and form alkaline solutions.",
  }),
  reaction({
    id: "rxn-displacement-ca-water",
    name: "Calcium and water",
    reactionType: "metal water displacement",
    category: "Single Displacement",
    difficulty: "Introductory",
    reactants: ["Ca", "H2O"],
    products: ["Ca(OH)2", "H2"],
    balancedEquation: "Ca + 2H2O -> Ca(OH)2 + H2",
    explanation: "Calcium reacts with water to form calcium hydroxide and hydrogen.",
  }),
  reaction({
    id: "rxn-displacement-fe-hcl",
    name: "Iron and hydrochloric acid",
    reactionType: "metal acid displacement",
    category: "Single Displacement",
    difficulty: "Introductory",
    reactants: ["Fe", "HCl"],
    products: ["FeCl2", "H2"],
    balancedEquation: "Fe + 2HCl -> FeCl2 + H2",
    explanation: "Iron forms iron(II) chloride under simple acid displacement conditions.",
  }),
  reaction({
    id: "rxn-displacement-cu-agno3",
    name: "Copper displaces silver",
    reactionType: "single displacement",
    category: "Single Displacement",
    difficulty: "Intermediate",
    reactants: ["Cu", "AgNO3"],
    products: ["Cu(NO3)2", "Ag"],
    balancedEquation: "Cu + 2AgNO3 -> Cu(NO3)2 + 2Ag",
    explanation: "Copper reduces Ag+ to silver metal and is oxidized to Cu2+.",
  }),
  reaction({
    id: "rxn-displacement-mg-cunitrate",
    name: "Magnesium displaces copper",
    reactionType: "single displacement",
    category: "Single Displacement",
    difficulty: "Introductory",
    reactants: ["Mg", "Cu(NO3)2"],
    products: ["Mg(NO3)2", "Cu"],
    balancedEquation: "Mg + Cu(NO3)2 -> Mg(NO3)2 + Cu",
    explanation: "Magnesium is more reactive than copper and displaces it from solution.",
  }),
]

const doubleDisplacementReactions: ReactionRecord[] = [
  reaction({
    id: "rxn-gas-carbonate-hcl",
    name: "Sodium carbonate and hydrochloric acid",
    reactionType: "gas-forming double displacement",
    category: "Double Displacement",
    difficulty: "Intermediate",
    reactants: ["Na2CO3", "HCl"],
    products: ["NaCl", "H2O", "CO2"],
    balancedEquation: "Na2CO3 + 2HCl -> 2NaCl + H2O + CO2",
    explanation: "Carbonates react with acids to form carbon dioxide gas, water, and a salt.",
  }),
  reaction({
    id: "rxn-gas-bicarbonate-hcl",
    name: "Sodium bicarbonate and hydrochloric acid",
    reactionType: "gas-forming double displacement",
    category: "Double Displacement",
    difficulty: "Introductory",
    reactants: ["NaHCO3", "HCl"],
    products: ["NaCl", "H2O", "CO2"],
    balancedEquation: "NaHCO3 + HCl -> NaCl + H2O + CO2",
    explanation: "Bicarbonates release CO2 when protonated by acid.",
  }),
  reaction({
    id: "rxn-gas-carbonate-hno3",
    name: "Potassium carbonate and nitric acid",
    reactionType: "gas-forming double displacement",
    category: "Double Displacement",
    difficulty: "Intermediate",
    reactants: ["K2CO3", "HNO3"],
    products: ["KNO3", "H2O", "CO2"],
    balancedEquation: "K2CO3 + 2HNO3 -> 2KNO3 + H2O + CO2",
    explanation: "Acid-carbonate reactions are identified by CO2 gas formation.",
  }),
  reaction({
    id: "rxn-gas-caco3-hcl",
    name: "Calcium carbonate and hydrochloric acid",
    reactionType: "gas-forming double displacement",
    category: "Double Displacement",
    difficulty: "Intermediate",
    reactants: ["CaCO3", "HCl"],
    products: ["CaCl2", "H2O", "CO2"],
    balancedEquation: "CaCO3 + 2HCl -> CaCl2 + H2O + CO2",
    explanation: "The fizzing in limestone-acid reactions is carbon dioxide.",
  }),
  reaction({
    id: "rxn-metathesis-nacl-agno3",
    name: "Sodium chloride and silver nitrate",
    reactionType: "double displacement",
    category: "Double Displacement",
    difficulty: "Introductory",
    reactants: ["NaCl", "AgNO3"],
    products: ["AgCl", "NaNO3"],
    balancedEquation: "NaCl + AgNO3 -> AgCl + NaNO3",
    explanation: "Ions exchange partners; the driving force is insoluble AgCl formation.",
  }),
  reaction({
    id: "rxn-metathesis-k2so4-bacl2",
    name: "Potassium sulfate and barium chloride",
    reactionType: "double displacement",
    category: "Double Displacement",
    difficulty: "Introductory",
    reactants: ["K2SO4", "BaCl2"],
    products: ["BaSO4", "KCl"],
    balancedEquation: "K2SO4 + BaCl2 -> BaSO4 + 2KCl",
    explanation: "The cations exchange anions and BaSO4 precipitates.",
  }),
  reaction({
    id: "rxn-ammonium-chloride-naoh",
    name: "Ammonium chloride and sodium hydroxide",
    reactionType: "gas-forming double displacement",
    category: "Double Displacement",
    difficulty: "Intermediate",
    reactants: ["NH4Cl", "NaOH"],
    products: ["NH3", "NaCl", "H2O"],
    balancedEquation: "NH4Cl + NaOH -> NH3 + NaCl + H2O",
    explanation: "Ammonium salts with strong base release ammonia gas.",
  }),
  reaction({
    id: "rxn-ammonium-sulfate-naoh",
    name: "Ammonium sulfate and sodium hydroxide",
    reactionType: "gas-forming double displacement",
    category: "Double Displacement",
    difficulty: "Intermediate",
    reactants: ["(NH4)2SO4", "NaOH"],
    products: ["NH3", "Na2SO4", "H2O"],
    balancedEquation: "(NH4)2SO4 + 2NaOH -> 2NH3 + Na2SO4 + 2H2O",
    explanation: "Each ammonium ion can produce ammonia when treated with hydroxide.",
  }),
]

const synthesisReactions: ReactionRecord[] = [
  reaction({
    id: "rxn-synthesis-water",
    name: "Hydrogen and oxygen form water",
    reactionType: "synthesis",
    category: "Synthesis",
    difficulty: "Introductory",
    reactants: ["H2", "O2"],
    products: ["H2O"],
    balancedEquation: "2H2 + O2 -> 2H2O",
    explanation: "Two elements combine to form a single compound.",
  }),
  reaction({
    id: "rxn-synthesis-ammonia",
    name: "Haber ammonia synthesis",
    reactionType: "synthesis",
    category: "Synthesis",
    difficulty: "Intermediate",
    reactants: ["N2", "H2"],
    products: ["NH3"],
    balancedEquation: "N2 + 3H2 -> 2NH3",
    explanation: "Nitrogen and hydrogen combine to form ammonia under catalyst and pressure.",
  }),
  reaction({
    id: "rxn-synthesis-nacl",
    name: "Sodium chloride synthesis",
    reactionType: "synthesis",
    category: "Synthesis",
    difficulty: "Introductory",
    reactants: ["Na", "Cl2"],
    products: ["NaCl"],
    balancedEquation: "2Na + Cl2 -> 2NaCl",
    explanation: "A metal and nonmetal combine to form an ionic compound.",
  }),
  reaction({
    id: "rxn-synthesis-mgo",
    name: "Magnesium oxide synthesis",
    reactionType: "synthesis",
    category: "Synthesis",
    difficulty: "Introductory",
    reactants: ["Mg", "O2"],
    products: ["MgO"],
    balancedEquation: "2Mg + O2 -> 2MgO",
    explanation: "Magnesium burns in oxygen to form magnesium oxide.",
  }),
  reaction({
    id: "rxn-synthesis-caco3",
    name: "Calcium oxide and carbon dioxide",
    reactionType: "synthesis",
    category: "Synthesis",
    difficulty: "Intermediate",
    reactants: ["CaO", "CO2"],
    products: ["CaCO3"],
    balancedEquation: "CaO + CO2 -> CaCO3",
    explanation: "A basic oxide and acidic oxide combine to form a carbonate.",
  }),
  reaction({
    id: "rxn-synthesis-sulfuric-acid-step",
    name: "Sulfur trioxide hydration",
    reactionType: "synthesis",
    category: "Synthesis",
    difficulty: "Intermediate",
    reactants: ["SO3", "H2O"],
    products: ["H2SO4"],
    balancedEquation: "SO3 + H2O -> H2SO4",
    explanation: "Sulfur trioxide combines with water to form sulfuric acid.",
  }),
  reaction({
    id: "rxn-synthesis-nh4cl",
    name: "Ammonium chloride formation",
    reactionType: "synthesis",
    category: "Synthesis",
    difficulty: "Introductory",
    reactants: ["NH3", "HCl"],
    products: ["NH4Cl"],
    balancedEquation: "NH3 + HCl -> NH4Cl",
    explanation: "Two gases combine to form solid ammonium chloride fumes.",
  }),
  reaction({
    id: "rxn-synthesis-fes",
    name: "Iron sulfide synthesis",
    reactionType: "synthesis",
    category: "Synthesis",
    difficulty: "Introductory",
    reactants: ["Fe", "S"],
    products: ["FeS"],
    balancedEquation: "Fe + S -> FeS",
    explanation: "Iron and sulfur combine to form a new compound with different properties.",
  }),
]

const decompositionReactions: ReactionRecord[] = [
  reaction({
    id: "rxn-decomp-h2o2",
    name: "Hydrogen peroxide decomposition",
    reactionType: "decomposition",
    category: "Decomposition",
    difficulty: "Introductory",
    reactants: ["H2O2"],
    products: ["H2O", "O2"],
    balancedEquation: "2H2O2 -> 2H2O + O2",
    explanation: "One compound breaks down into water and oxygen gas.",
  }),
  reaction({
    id: "rxn-decomp-caco3",
    name: "Calcium carbonate thermal decomposition",
    reactionType: "thermal decomposition",
    category: "Decomposition",
    difficulty: "Introductory",
    reactants: ["CaCO3"],
    products: ["CaO", "CO2"],
    balancedEquation: "CaCO3 -> CaO + CO2",
    explanation: "Heating limestone drives off carbon dioxide to produce calcium oxide.",
  }),
  reaction({
    id: "rxn-decomp-kclo3",
    name: "Potassium chlorate decomposition",
    reactionType: "decomposition",
    category: "Decomposition",
    difficulty: "Intermediate",
    reactants: ["KClO3"],
    products: ["KCl", "O2"],
    balancedEquation: "2KClO3 -> 2KCl + 3O2",
    explanation: "Chlorates release oxygen gas on heating, often with a catalyst.",
  }),
  reaction({
    id: "rxn-decomp-hgo",
    name: "Mercury(II) oxide decomposition",
    reactionType: "thermal decomposition",
    category: "Decomposition",
    difficulty: "Intermediate",
    reactants: ["HgO"],
    products: ["Hg", "O2"],
    balancedEquation: "2HgO -> 2Hg + O2",
    explanation: "A metal oxide breaks down into metal and oxygen when heated strongly.",
  }),
  reaction({
    id: "rxn-decomp-nan3",
    name: "Sodium azide decomposition",
    reactionType: "decomposition",
    category: "Decomposition",
    difficulty: "Advanced",
    reactants: ["NaN3"],
    products: ["Na", "N2"],
    balancedEquation: "2NaN3 -> 2Na + 3N2",
    explanation: "Rapid nitrogen gas production is the key idea in airbag chemistry examples.",
  }),
  reaction({
    id: "rxn-decomp-nh4no3",
    name: "Ammonium nitrate decomposition",
    reactionType: "decomposition",
    category: "Decomposition",
    difficulty: "Advanced",
    reactants: ["NH4NO3"],
    products: ["N2O", "H2O"],
    balancedEquation: "NH4NO3 -> N2O + 2H2O",
    explanation: "Ammonium nitrate can decompose into nitrous oxide and water under controlled heating.",
  }),
  reaction({
    id: "rxn-decomp-nahco3",
    name: "Sodium bicarbonate decomposition",
    reactionType: "thermal decomposition",
    category: "Decomposition",
    difficulty: "Intermediate",
    reactants: ["NaHCO3"],
    products: ["Na2CO3", "CO2", "H2O"],
    balancedEquation: "2NaHCO3 -> Na2CO3 + CO2 + H2O",
    explanation: "Baking soda releases carbon dioxide and water when heated.",
  }),
  reaction({
    id: "rxn-decomp-water-electrolysis",
    name: "Water electrolysis",
    reactionType: "electrolytic decomposition",
    category: "Decomposition",
    difficulty: "Intermediate",
    reactants: ["H2O"],
    products: ["H2", "O2"],
    balancedEquation: "2H2O -> 2H2 + O2",
    explanation: "Electrical energy decomposes water into hydrogen and oxygen gases.",
  }),
]

const redoxReactions: ReactionRecord[] = [
  reaction({
    id: "rxn-redox-zinc-copper-ion",
    name: "Zinc reduces copper(II)",
    reactionType: "redox",
    category: "Redox",
    difficulty: "Intermediate",
    reactants: ["Zn", "Cu2+"],
    products: ["Zn2+", "Cu"],
    balancedEquation: "Zn + Cu2+ -> Zn2+ + Cu",
    explanation: "Zinc loses electrons and copper(II) gains electrons.",
  }),
  reaction({
    id: "rxn-redox-iron-chlorine",
    name: "Iron(II) oxidized by chlorine",
    reactionType: "redox",
    category: "Redox",
    difficulty: "Advanced",
    reactants: ["Fe2+", "Cl2"],
    products: ["Fe3+", "Cl-"],
    balancedEquation: "2Fe2+ + Cl2 -> 2Fe3+ + 2Cl-",
    explanation: "Chlorine is reduced to chloride while Fe2+ is oxidized to Fe3+.",
  }),
  reaction({
    id: "rxn-redox-mg-o2",
    name: "Magnesium oxidation",
    reactionType: "redox",
    category: "Redox",
    difficulty: "Introductory",
    reactants: ["Mg", "O2"],
    products: ["MgO"],
    balancedEquation: "2Mg + O2 -> 2MgO",
    explanation: "Magnesium is oxidized and oxygen is reduced in forming MgO.",
  }),
  reaction({
    id: "rxn-redox-al-iron-oxide",
    name: "Thermite reaction",
    reactionType: "redox",
    category: "Redox",
    difficulty: "Advanced",
    reactants: ["Al", "Fe2O3"],
    products: ["Al2O3", "Fe"],
    balancedEquation: "2Al + Fe2O3 -> Al2O3 + 2Fe",
    explanation: "Aluminium reduces iron(III) oxide to iron and is oxidized to aluminium oxide.",
  }),
  reaction({
    id: "rxn-redox-cu-ag",
    name: "Copper and silver ions",
    reactionType: "redox",
    category: "Redox",
    difficulty: "Intermediate",
    reactants: ["Cu", "Ag+"],
    products: ["Cu2+", "Ag"],
    balancedEquation: "Cu + 2Ag+ -> Cu2+ + 2Ag",
    explanation: "Copper metal donates electrons to reduce silver ions.",
  }),
  reaction({
    id: "rxn-redox-hydrogen-chlorine",
    name: "Hydrogen and chlorine",
    reactionType: "redox synthesis",
    category: "Redox",
    difficulty: "Intermediate",
    reactants: ["H2", "Cl2"],
    products: ["HCl"],
    balancedEquation: "H2 + Cl2 -> 2HCl",
    explanation: "Hydrogen is oxidized and chlorine is reduced as polar H-Cl bonds form.",
  }),
  reaction({
    id: "rxn-redox-iodide-persulfate",
    name: "Iodide and persulfate",
    reactionType: "redox",
    category: "Redox",
    difficulty: "Advanced",
    reactants: ["I-", "S2O8^2-"],
    products: ["I2", "SO4^2-"],
    balancedEquation: "2I- + S2O8^2- -> I2 + 2SO4^2-",
    explanation: "Persulfate oxidizes iodide to iodine and is reduced to sulfate.",
  }),
  reaction({
    id: "rxn-redox-permanganate-iron",
    name: "Permanganate oxidizes iron(II)",
    reactionType: "redox titration",
    category: "Redox",
    difficulty: "Advanced",
    reactants: ["MnO4-", "Fe2+", "H+"],
    products: ["Mn2+", "Fe3+", "H2O"],
    balancedEquation: "MnO4- + 5Fe2+ + 8H+ -> Mn2+ + 5Fe3+ + 4H2O",
    explanation: "Acidified permanganate oxidizes Fe2+ while Mn(VII) is reduced to Mn2+.",
  }),
  reaction({
    id: "rxn-redox-dichromate-iron",
    name: "Dichromate oxidizes iron(II)",
    reactionType: "redox titration",
    category: "Redox",
    difficulty: "Advanced",
    reactants: ["Cr2O7^2-", "Fe2+", "H+"],
    products: ["Cr3+", "Fe3+", "H2O"],
    balancedEquation: "Cr2O7^2- + 6Fe2+ + 14H+ -> 2Cr3+ + 6Fe3+ + 7H2O",
    explanation: "Dichromate is reduced from Cr(VI) to Cr(III) while iron(II) is oxidized.",
  }),
  reaction({
    id: "rxn-redox-h2o2-iodide",
    name: "Hydrogen peroxide oxidizes iodide",
    reactionType: "redox",
    category: "Redox",
    difficulty: "Advanced",
    reactants: ["H2O2", "I-", "H+"],
    products: ["I2", "H2O"],
    balancedEquation: "H2O2 + 2I- + 2H+ -> I2 + 2H2O",
    explanation: "Hydrogen peroxide acts as an oxidizing agent in acidic solution.",
  }),
  reaction({
    id: "rxn-redox-sn-fe",
    name: "Tin(II) reduces iron(III)",
    reactionType: "redox",
    category: "Redox",
    difficulty: "Advanced",
    reactants: ["Sn2+", "Fe3+"],
    products: ["Sn4+", "Fe2+"],
    balancedEquation: "Sn2+ + 2Fe3+ -> Sn4+ + 2Fe2+",
    explanation: "Tin(II) is oxidized to tin(IV), reducing iron(III) to iron(II).",
  }),
  reaction({
    id: "rxn-redox-chlorine-water",
    name: "Chlorine disproportionation in water",
    reactionType: "disproportionation",
    category: "Redox",
    difficulty: "Advanced",
    reactants: ["Cl2", "H2O"],
    products: ["HCl", "HClO"],
    balancedEquation: "Cl2 + H2O -> HCl + HClO",
    explanation: "Chlorine is both oxidized and reduced, forming chloride and hypochlorous acid.",
  }),
]

const organicReactions: ReactionRecord[] = [
  reaction({
    id: "rxn-organic-ethene-bromine",
    name: "Ethene bromination",
    reactionType: "addition",
    category: "Organic Reactions",
    difficulty: "Introductory",
    reactants: ["C2H4", "Br2"],
    products: ["C2H4Br2"],
    balancedEquation: "C2H4 + Br2 -> C2H4Br2",
    explanation: "Bromine adds across the C=C bond; decolorization tests for unsaturation.",
  }),
  reaction({
    id: "rxn-organic-ethene-hydrogen",
    name: "Ethene hydrogenation",
    reactionType: "addition",
    category: "Organic Reactions",
    difficulty: "Introductory",
    reactants: ["C2H4", "H2"],
    products: ["C2H6"],
    balancedEquation: "C2H4 + H2 -> C2H6",
    explanation: "Hydrogen adds across the double bond, producing ethane.",
  }),
  reaction({
    id: "rxn-organic-ethene-hbr",
    name: "Ethene hydrohalogenation",
    reactionType: "addition",
    category: "Organic Reactions",
    difficulty: "Introductory",
    reactants: ["C2H4", "HBr"],
    products: ["C2H5Br"],
    balancedEquation: "C2H4 + HBr -> C2H5Br",
    explanation: "Hydrogen bromide adds across the alkene double bond.",
  }),
  reaction({
    id: "rxn-organic-ethanol-ethanoic-acid",
    name: "Ethanol esterification",
    reactionType: "esterification",
    category: "Organic Reactions",
    difficulty: "Intermediate",
    reactants: ["C2H5OH", "CH3COOH"],
    products: ["CH3COOC2H5", "H2O"],
    balancedEquation: "C2H5OH + CH3COOH -> CH3COOC2H5 + H2O",
    explanation: "An alcohol and carboxylic acid form an ester and water under acidic conditions.",
  }),
  reaction({
    id: "rxn-organic-ester-hydrolysis",
    name: "Ethyl ethanoate hydrolysis",
    reactionType: "hydrolysis",
    category: "Organic Reactions",
    difficulty: "Intermediate",
    reactants: ["CH3COOC2H5", "H2O"],
    products: ["CH3COOH", "C2H5OH"],
    balancedEquation: "CH3COOC2H5 + H2O -> CH3COOH + C2H5OH",
    explanation: "Hydrolysis reverses esterification, breaking the ester into acid and alcohol.",
  }),
  reaction({
    id: "rxn-organic-bromoethane-oh",
    name: "Bromoethane hydrolysis",
    reactionType: "nucleophilic substitution",
    category: "Organic Reactions",
    difficulty: "Intermediate",
    reactants: ["C2H5Br", "OH-"],
    products: ["C2H5OH", "Br-"],
    balancedEquation: "C2H5Br + OH- -> C2H5OH + Br-",
    explanation: "Hydroxide substitutes for bromide to produce ethanol.",
  }),
  reaction({
    id: "rxn-organic-ethanol-oxidation",
    name: "Ethanol oxidation to ethanal",
    reactionType: "oxidation",
    category: "Organic Reactions",
    difficulty: "Intermediate",
    reactants: ["C2H5OH", "[O]"],
    products: ["CH3CHO", "H2O"],
    balancedEquation: "C2H5OH + [O] -> CH3CHO + H2O",
    explanation: "A primary alcohol can be oxidized to an aldehyde under controlled conditions.",
  }),
  reaction({
    id: "rxn-organic-ethanal-oxidation",
    name: "Ethanal oxidation",
    reactionType: "oxidation",
    category: "Organic Reactions",
    difficulty: "Intermediate",
    reactants: ["CH3CHO", "[O]"],
    products: ["CH3COOH"],
    balancedEquation: "CH3CHO + [O] -> CH3COOH",
    explanation: "Aldehydes oxidize further to carboxylic acids.",
  }),
  reaction({
    id: "rxn-organic-propene-hydration",
    name: "Propene hydration",
    reactionType: "addition",
    category: "Organic Reactions",
    difficulty: "Intermediate",
    reactants: ["C3H6", "H2O"],
    products: ["C3H7OH"],
    balancedEquation: "C3H6 + H2O -> C3H7OH",
    explanation: "Water adds across an alkene double bond to produce an alcohol.",
  }),
  reaction({
    id: "rxn-organic-benzene-nitration",
    name: "Benzene nitration",
    reactionType: "electrophilic substitution",
    category: "Organic Reactions",
    difficulty: "Advanced",
    reactants: ["C6H6", "HNO3"],
    products: ["C6H5NO2", "H2O"],
    balancedEquation: "C6H6 + HNO3 -> C6H5NO2 + H2O",
    explanation: "A nitro group replaces a hydrogen on benzene under nitrating conditions.",
  }),
  reaction({
    id: "rxn-organic-alkane-chlorination",
    name: "Methane chlorination",
    reactionType: "free radical substitution",
    category: "Organic Reactions",
    difficulty: "Intermediate",
    reactants: ["CH4", "Cl2"],
    products: ["CH3Cl", "HCl"],
    balancedEquation: "CH4 + Cl2 -> CH3Cl + HCl",
    explanation: "UV light can initiate radical substitution of methane by chlorine.",
  }),
  reaction({
    id: "rxn-organic-dehydration-ethanol",
    name: "Ethanol dehydration",
    reactionType: "elimination",
    category: "Organic Reactions",
    difficulty: "Intermediate",
    reactants: ["C2H5OH"],
    products: ["C2H4", "H2O"],
    balancedEquation: "C2H5OH -> C2H4 + H2O",
    explanation: "Eliminating water from ethanol forms ethene.",
  }),
]

const hydrocarbonReactions: ReactionRecord[] = [
  reaction({
    id: "rxn-hydrocarbon-ethyne-hydrogen",
    name: "Ethyne hydrogenation",
    reactionType: "hydrogenation",
    category: "Hydrocarbon Reactions",
    difficulty: "Intermediate",
    reactants: ["C2H2", "H2"],
    products: ["C2H6"],
    balancedEquation: "C2H2 + 2H2 -> C2H6",
    explanation: "Two equivalents of hydrogen fully saturate a carbon-carbon triple bond.",
  }),
  reaction({
    id: "rxn-hydrocarbon-propene-bromine",
    name: "Propene bromination",
    reactionType: "addition",
    category: "Hydrocarbon Reactions",
    difficulty: "Introductory",
    reactants: ["C3H6", "Br2"],
    products: ["C3H6Br2"],
    balancedEquation: "C3H6 + Br2 -> C3H6Br2",
    explanation: "Bromine adds across the alkene double bond.",
  }),
  reaction({
    id: "rxn-hydrocarbon-cracking-decane",
    name: "Decane cracking",
    reactionType: "cracking",
    category: "Hydrocarbon Reactions",
    difficulty: "Intermediate",
    reactants: ["C10H22"],
    products: ["C8H18", "C2H4"],
    balancedEquation: "C10H22 -> C8H18 + C2H4",
    explanation: "Cracking breaks a long alkane into a shorter alkane and an alkene.",
  }),
  reaction({
    id: "rxn-hydrocarbon-ethene-polymerization",
    name: "Ethene polymerization",
    reactionType: "addition polymerization",
    category: "Hydrocarbon Reactions",
    difficulty: "Intermediate",
    reactants: ["nC2H4"],
    products: ["(C2H4)n"],
    balancedEquation: "nC2H4 -> (C2H4)n",
    explanation: "Alkene monomers join by opening their pi bonds to form polyethene.",
  }),
  reaction({
    id: "rxn-hydrocarbon-propene-polymerization",
    name: "Propene polymerization",
    reactionType: "addition polymerization",
    category: "Hydrocarbon Reactions",
    difficulty: "Intermediate",
    reactants: ["nC3H6"],
    products: ["(C3H6)n"],
    balancedEquation: "nC3H6 -> (C3H6)n",
    explanation: "Propene can polymerize into polypropene by addition polymerization.",
  }),
]

const electrochemistryReactions: ReactionRecord[] = [
  reaction({
    id: "rxn-electrochem-daniell",
    name: "Daniell cell overall reaction",
    reactionType: "galvanic cell",
    category: "Electrochemistry",
    difficulty: "Intermediate",
    reactants: ["Zn", "Cu2+"],
    products: ["Zn2+", "Cu"],
    balancedEquation: "Zn + Cu2+ -> Zn2+ + Cu",
    explanation: "A spontaneous galvanic cell transfers electrons from zinc to copper(II).",
  }),
  reaction({
    id: "rxn-electrochem-silver-copper",
    name: "Copper silver cell",
    reactionType: "galvanic cell",
    category: "Electrochemistry",
    difficulty: "Intermediate",
    reactants: ["Cu", "Ag+"],
    products: ["Cu2+", "Ag"],
    balancedEquation: "Cu + 2Ag+ -> Cu2+ + 2Ag",
    explanation: "Silver ions are reduced at the cathode while copper is oxidized.",
  }),
  reaction({
    id: "rxn-electrochem-brine",
    name: "Brine electrolysis overall",
    reactionType: "electrolysis",
    category: "Electrochemistry",
    difficulty: "Advanced",
    reactants: ["NaCl", "H2O"],
    products: ["NaOH", "Cl2", "H2"],
    balancedEquation: "2NaCl + 2H2O -> 2NaOH + Cl2 + H2",
    explanation: "Electrolysis of brine produces chlorine, hydrogen, and sodium hydroxide.",
  }),
  reaction({
    id: "rxn-electrochem-water",
    name: "Water electrolysis overall",
    reactionType: "electrolysis",
    category: "Electrochemistry",
    difficulty: "Intermediate",
    reactants: ["H2O"],
    products: ["H2", "O2"],
    balancedEquation: "2H2O -> 2H2 + O2",
    explanation: "Nonspontaneous decomposition of water requires electrical energy.",
  }),
  reaction({
    id: "rxn-electrochem-lead-acid",
    name: "Lead-acid battery discharge",
    reactionType: "battery discharge",
    category: "Electrochemistry",
    difficulty: "Advanced",
    reactants: ["Pb", "PbO2", "H2SO4"],
    products: ["PbSO4", "H2O"],
    balancedEquation: "Pb + PbO2 + 2H2SO4 -> 2PbSO4 + 2H2O",
    explanation: "Lead and lead dioxide both become lead sulfate during discharge.",
  }),
]

const equilibriumReactions: ReactionRecord[] = [
  reaction({
    id: "rxn-equilibrium-haber",
    name: "Haber equilibrium",
    reactionType: "dynamic equilibrium",
    category: "Equilibrium",
    difficulty: "Intermediate",
    reactants: ["N2", "H2"],
    products: ["NH3"],
    balancedEquation: "N2 + 3H2 -> 2NH3",
    explanation: "Ammonia synthesis is reversible and pressure-sensitive because gas moles decrease.",
  }),
  reaction({
    id: "rxn-equilibrium-contact",
    name: "Sulfur dioxide oxidation equilibrium",
    reactionType: "dynamic equilibrium",
    category: "Equilibrium",
    difficulty: "Intermediate",
    reactants: ["SO2", "O2"],
    products: ["SO3"],
    balancedEquation: "2SO2 + O2 -> 2SO3",
    explanation: "The Contact Process uses this reversible oxidation step to make SO3.",
  }),
  reaction({
    id: "rxn-equilibrium-n2o4-no2",
    name: "Dinitrogen tetroxide equilibrium",
    reactionType: "dynamic equilibrium",
    category: "Equilibrium",
    difficulty: "Intermediate",
    reactants: ["N2O4"],
    products: ["NO2"],
    balancedEquation: "N2O4 -> 2NO2",
    explanation: "This equilibrium shifts with temperature and is visible through color intensity.",
  }),
  reaction({
    id: "rxn-equilibrium-acetic-dissociation",
    name: "Acetic acid dissociation",
    reactionType: "acid equilibrium",
    category: "Equilibrium",
    difficulty: "Intermediate",
    reactants: ["CH3COOH"],
    products: ["H+", "CH3COO-"],
    balancedEquation: "CH3COOH -> H+ + CH3COO-",
    explanation: "Weak acids partially dissociate, so equilibrium ideas apply.",
  }),
  reaction({
    id: "rxn-equilibrium-carbonic-acid",
    name: "Carbonic acid dissociation",
    reactionType: "acid equilibrium",
    category: "Equilibrium",
    difficulty: "Advanced",
    reactants: ["H2CO3"],
    products: ["H+", "HCO3-"],
    balancedEquation: "H2CO3 -> H+ + HCO3-",
    explanation: "Carbonate buffering begins with the reversible dissociation of carbonic acid.",
  }),
]

export const REACTION_RECORDS: ReactionRecord[] = [
  ...acidBaseReactions,
  ...precipitationReactions,
  ...combustionReactions,
  ...singleDisplacementReactions,
  ...doubleDisplacementReactions,
  ...synthesisReactions,
  ...decompositionReactions,
  ...redoxReactions,
  ...organicReactions,
  ...hydrocarbonReactions,
  ...electrochemistryReactions,
  ...equilibriumReactions,
].sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))

export function listReactionRecords(): ReactionRecord[] {
  return REACTION_RECORDS
}

export function getReactionRecord(id: string): ReactionRecord | undefined {
  return REACTION_RECORDS.find((record) => record.id === id)
}

export function getReactionRecordsByCategory(category: string): ReactionRecord[] {
  const normalized = category.toLowerCase()
  return REACTION_RECORDS.filter((record) => record.category.toLowerCase() === normalized)
}

export function getReactionRecordsByDifficulty(difficulty: ReactionDifficulty): ReactionRecord[] {
  return REACTION_RECORDS.filter((record) => record.difficulty === difficulty)
}

export function searchReactionRecords(query: string): ReactionRecord[] {
  const normalized = query.toLowerCase().trim()
  if (!normalized) return REACTION_RECORDS
  return REACTION_RECORDS.filter((record) =>
    [
      record.name,
      record.reactionType,
      record.category,
      record.difficulty,
      record.balancedEquation,
      record.unbalancedEquation,
      record.explanation,
      ...record.reactants,
      ...record.products,
      ...record.curriculum,
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalized),
  )
}

export function getReactionKnowledgeMetrics() {
  return {
    reactionRecords: REACTION_RECORDS.length,
    categories: new Set(REACTION_RECORDS.map((record) => record.category)).size,
    reactionTypes: new Set(REACTION_RECORDS.map((record) => record.reactionType)).size,
    balancingExercises: REACTION_RECORDS.length,
    predictionTemplates: REACTION_RECORDS.length,
  }
}
