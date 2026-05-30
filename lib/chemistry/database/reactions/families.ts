import type { ReactionFamily, ReactionTemplateRecord } from "../types"

const boards = ["ib-sl", "ib-hl", "ap", "a-level", "high-school", "university-intro"] as const

function reaction(
  partial: Omit<ReactionTemplateRecord, "kind" | "examBoards" | "topics" | "subtopics" | "tags"> &
    Partial<Pick<ReactionTemplateRecord, "topics" | "subtopics" | "tags">>,
): ReactionTemplateRecord {
  return {
    kind: "reaction",
    examBoards: [...boards],
    topics: partial.topics ?? ["reactions"],
    subtopics: [partial.family],
    tags: [partial.family, ...partial.reactants, ...partial.products],
    ...partial,
  }
}

export const REACTION_TEMPLATES: ReactionTemplateRecord[] = [
  reaction({
    id: "reaction-alkane-combustion",
    name: "Alkane combustion",
    family: "combustion",
    reactants: ["alkane", "O2"],
    products: ["CO2", "H2O"],
    conditions: ["heat", "spark"],
    catalysts: [],
    exampleEquation: "CₙH₂ₙ₊₂ + (3n+1)/2 O₂ → n CO₂ + (n+1) H₂O",
    explanation: "Complete combustion produces CO₂ and H₂O.",
    aliases: ["combustion", "burning"],
    mechanism: "Free-radical chain mechanism at high temperature.",
  }),
  reaction({
    id: "reaction-alkene-hydrogenation",
    name: "Alkene hydrogenation",
    family: "addition",
    reactants: ["alkene", "H2"],
    products: ["alkane"],
    conditions: ["Ni/Pt/Pd catalyst", "room temperature"],
    catalysts: ["Ni", "Pt", "Pd"],
    exampleEquation: "RCH=CH2 + H₂ → RCH₂CH₃",
    explanation: "Syn addition of H₂ across C=C double bond.",
    aliases: ["hydrogenation"],
    mechanism: "Surface catalysis on metal.",
  }),
  reaction({
    id: "reaction-alkene-bromination",
    name: "Alkene bromination",
    family: "addition",
    reactants: ["alkene", "Br2"],
    products: ["dibromoalkane"],
    conditions: ["CCl4 or aqueous"],
    catalysts: [],
    exampleEquation: "RCH=CH2 + Br₂ → RCHBrCH₂Br",
    explanation: "Electrophilic addition; bromonium ion intermediate.",
    aliases: ["bromination"],
  }),
  reaction({
    id: "reaction-esterification",
    name: "Esterification",
    family: "esterification",
    reactants: ["carboxylic acid", "alcohol"],
    products: ["ester", "water"],
    conditions: ["acid catalyst", "heat"],
    catalysts: ["H2SO4", "HCl"],
    exampleEquation: "RCOOH + R'OH ⇌ RCOOR' + H₂O",
    explanation: "Fischer esterification — reversible equilibrium.",
    aliases: ["ester formation"],
  }),
  reaction({
    id: "reaction-hydrolysis-ester",
    name: "Ester hydrolysis",
    family: "hydrolysis",
    reactants: ["ester", "water"],
    products: ["carboxylic acid", "alcohol"],
    conditions: ["acid or base catalyst"],
    catalysts: ["H+", "OH-"],
    exampleEquation: "RCOOR' + H₂O → RCOOH + R'OH",
    explanation: "Reverse of esterification; base hydrolysis (saponification) is irreversible.",
  }),
  reaction({
    id: "reaction-sn2-halogenoalkane",
    name: "SN2 substitution",
    family: "substitution",
    reactants: ["primary halogenoalkane", "nucleophile"],
    products: ["substituted product", "halide"],
    conditions: ["polar aprotic solvent"],
    catalysts: [],
    exampleEquation: "CH₃CH₂Br + OH⁻ → CH₃CH₂OH + Br⁻",
    explanation: "Bimolecular nucleophilic substitution — one step, inversion.",
    mechanism: "SN2 — backside attack, transition state.",
  }),
  reaction({
    id: "reaction-e1-elimination",
    name: "E1 elimination",
    family: "elimination",
    reactants: ["tertiary halogenoalkane"],
    products: ["alkene", "HX"],
    conditions: ["heat", "ethanolic base"],
    catalysts: [],
    exampleEquation: "(CH₃)₃CBr → (CH₃)₂C=CH₂ + HBr",
    explanation: "Unimolecular elimination via carbocation intermediate.",
    mechanism: "E1 — slow ionization, then loss of H+.",
  }),
  reaction({
    id: "reaction-acid-base-neutralization",
    name: "Neutralization",
    family: "acid-base",
    reactants: ["acid", "base"],
    products: ["salt", "water"],
    conditions: ["aqueous"],
    catalysts: [],
    exampleEquation: "HCl + NaOH → NaCl + H₂O",
    explanation: "H⁺ + OH⁻ → H₂O",
    aliases: ["neutralization"],
  }),
  reaction({
    id: "reaction-precipitation-agcl",
    name: "Precipitation (AgCl)",
    family: "precipitation",
    reactants: ["AgNO3", "NaCl"],
    products: ["AgCl", "NaNO3"],
    conditions: ["aqueous"],
    catalysts: [],
    exampleEquation: "Ag⁺(aq) + Cl⁻(aq) → AgCl(s)",
    explanation: "White precipitate of silver chloride.",
  }),
  reaction({
    id: "reaction-redox-mno4-fe2",
    name: "Redox (permanganate)",
    family: "redox",
    reactants: ["MnO4-", "Fe2+"],
    products: ["Mn2+", "Fe3+"],
    conditions: ["acidic solution"],
    catalysts: [],
    exampleEquation: "MnO₄⁻ + 5Fe²⁺ + 8H⁺ → Mn²⁺ + 5Fe³⁺ + 4H₂O",
    explanation: "Purple MnO₄⁻ reduced to pale pink Mn²⁺.",
  }),
  reaction({
    id: "reaction-alcohol-oxidation",
    name: "Alcohol oxidation",
    family: "oxidation",
    reactants: ["primary alcohol"],
    products: ["aldehyde", "carboxylic acid"],
    conditions: ["K2Cr2O7/H+", "distillation"],
    catalysts: ["K2Cr2O7"],
    exampleEquation: "RCH₂OH → RCHO → RCOOH",
    explanation: "Primary alcohols oxidize to aldehydes then acids.",
  }),
]

export function getReactionsByFamily(family: ReactionFamily): ReactionTemplateRecord[] {
  return REACTION_TEMPLATES.filter((r) => r.family === family)
}

export function getReactionById(id: string): ReactionTemplateRecord | undefined {
  return REACTION_TEMPLATES.find((r) => r.id === id)
}
