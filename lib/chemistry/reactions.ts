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
