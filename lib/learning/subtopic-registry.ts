export const TOPIC_SUBTOPIC_REGISTRY = {
  "Periodic Trends": [
    "Atomic Radius",
    "Ionic Radius",
    "Ionization Energy",
    "Electron Affinity",
    "Shielding",
    "Effective Nuclear Charge",
  ],
  Thermodynamics: [
    "Enthalpy",
    "Entropy",
    "Gibbs Free Energy",
    "Hess Law",
    "Calorimetry",
  ],
  "Functional Group Identification": [
    "Alcohols",
    "Aldehydes",
    "Ketones",
    "Carboxylic Acids",
    "Esters",
    "Amides",
    "Amines",
    "Haloalkanes",
  ],
  "IR Spectroscopy": [
    "Carbonyl Identification",
    "O-H Stretch",
    "N-H Stretch",
    "C triple N Stretch",
    "Aromatic Peaks",
  ],
  Spectroscopy: [
    "IR Spectroscopy",
    "Carbonyl Identification",
    "O-H Stretch",
    "N-H Stretch",
    "C triple N Stretch",
    "Aromatic Peaks",
  ],
  Hybridization: [
    "sp",
    "sp2",
    "sp3",
    "Expanded Octet",
  ],
  "VSEPR Geometry": [
    "Electron Domains",
    "Molecular Geometry",
    "Lone Pair Repulsion",
    "Bond Angles",
  ],
  "Electron Configuration": [
    "Aufbau Principle",
    "Hund's Rule",
    "Noble Gas Shorthand",
    "d-block Exceptions",
  ],
  Kinetics: [
    "Rate Laws",
    "Activation Energy",
    "Reaction Mechanisms",
    "Collision Theory",
  ],
  Equilibrium: [
    "Equilibrium Constant",
    "Le Chatelier Principle",
    "ICE Tables",
    "Reaction Quotient",
  ],
  "Acids and Bases": [
    "pH",
    "pKa",
    "Strong and Weak Acids",
    "Buffers",
    "Titrations",
  ],
  Bonding: [
    "Ionic Bonding",
    "Covalent Bonding",
    "Polarity",
    "Lewis Structures",
    "Sigma and Pi Bonds",
  ],
  Stoichiometry: [
    "Mole Calculations",
    "Limiting Reagent",
    "Percent Yield",
    "Empirical Formula",
  ],
} as const

export type LearningTopic = keyof typeof TOPIC_SUBTOPIC_REGISTRY

const TOPIC_ALIASES: Record<string, LearningTopic> = {
  "periodic trends": "Periodic Trends",
  "periodic trend": "Periodic Trends",
  "thermodynamics": "Thermodynamics",
  "functional group identification": "Functional Group Identification",
  "functional groups": "Functional Group Identification",
  "ir spectroscopy": "IR Spectroscopy",
  "ir spectroscopy peak identification": "IR Spectroscopy",
  "spectroscopy": "Spectroscopy",
  "hybridization": "Hybridization",
  "vsepr geometry": "VSEPR Geometry",
  "vsepr": "VSEPR Geometry",
  "electron configuration": "Electron Configuration",
  "electron configurations": "Electron Configuration",
  "kinetics": "Kinetics",
  "equilibrium": "Equilibrium",
  "acids and bases": "Acids and Bases",
  "acid base": "Acids and Bases",
  "acid base chemistry": "Acids and Bases",
  "bonding": "Bonding",
  "chemical bonding": "Bonding",
  "stoichiometry": "Stoichiometry",
}

const SUBTOPIC_KEYWORDS: Record<string, string[]> = {
  "Atomic Radius": ["atomic radius", "larger atom", "smaller atom", "radius", "radii", "size"],
  "Ionic Radius": ["ionic radius", "ion size", "cation radius", "anion radius", "isoelectronic"],
  "Ionization Energy": ["ionization energy", "ionisation energy", "remove an electron", "first ie"],
  "Electron Affinity": ["electron affinity", "gains an electron", "gain an electron"],
  Shielding: ["shielding", "shielded", "inner electrons", "screening"],
  "Effective Nuclear Charge": ["effective nuclear charge", "zeff", "nuclear charge"],
  Enthalpy: ["enthalpy", "delta h", "heat of reaction", "exothermic", "endothermic"],
  Entropy: ["entropy", "delta s", "disorder", "microstates"],
  "Gibbs Free Energy": ["gibbs", "free energy", "delta g", "spontaneous"],
  "Hess Law": ["hess", "reaction pathway", "enthalpy cycle"],
  Calorimetry: ["calorimetry", "calorimeter", "specific heat", "q=mc", "q = mc"],
  Alcohols: ["alcohol", "hydroxyl", "oh group", "o-h"],
  Aldehydes: ["aldehyde", "terminal carbonyl", "cho"],
  Ketones: ["ketone", "internal carbonyl"],
  "Carboxylic Acids": ["carboxylic acid", "carboxyl", "cooh"],
  Esters: ["ester", "coo", "fruity"],
  Amides: ["amide", "conh", "peptide"],
  Amines: ["amine", "amino", "nh2"],
  Haloalkanes: ["haloalkane", "halogenoalkane", "alkyl halide", "c-cl", "c-br"],
  "IR Spectroscopy": ["ir spectroscopy", "infrared", "ir spectrum", "absorption", "wavenumber", "cm-1"],
  "Carbonyl Identification": ["carbonyl", "c=o", "c = o", "1650", "1700", "1750"],
  "O-H Stretch": ["o-h stretch", "o h stretch", "broad", "3200", "3600", "hydrogen bonded"],
  "N-H Stretch": ["n-h stretch", "n h stretch", "3300", "amine peak"],
  "C triple N Stretch": ["c n stretch", "c triple n", "nitrile", "2250", "2260"],
  "Aromatic Peaks": ["aromatic", "benzene", "ring peak", "1600", "3030"],
  sp: ["sp hybrid", "linear", "180", "alkyne"],
  sp2: ["sp2", "trigonal planar", "120", "alkene"],
  sp3: ["sp3", "tetrahedral", "109.5", "methane"],
  "Expanded Octet": ["expanded octet", "sp3d", "sp3d2", "octahedral", "trigonal bipyramidal"],
  "Electron Domains": ["electron domain", "domain count", "steric number"],
  "Molecular Geometry": ["molecular geometry", "shape", "linear", "bent", "pyramidal"],
  "Lone Pair Repulsion": ["lone pair", "repulsion", "compressed angle"],
  "Bond Angles": ["bond angle", "angle", "109.5", "120", "180"],
  "Aufbau Principle": ["aufbau", "filling order"],
  "Hund's Rule": ["hund", "unpaired", "parallel spins"],
  "Noble Gas Shorthand": ["noble gas", "shorthand", "[ar]", "[ne]", "[kr]"],
  "d-block Exceptions": ["chromium", "copper", "cr", "cu", "exception", "half-filled", "filled d"],
  "Rate Laws": ["rate law", "rate laws", "order of reaction", "rate constant"],
  "Activation Energy": ["activation energy", "arrhenius", "energy barrier"],
  "Reaction Mechanisms": ["mechanism", "elementary step", "rate determining", "intermediate"],
  "Collision Theory": ["collision", "orientation", "frequency factor"],
  "Equilibrium Constant": ["equilibrium constant", "k eq", "keq", "kc", "kp"],
  "Le Chatelier Principle": ["le chatelier", "shift left", "shift right", "stress"],
  "ICE Tables": ["ice table", "initial change equilibrium"],
  "Reaction Quotient": ["reaction quotient", "q value", "compare q", "q vs k"],
  pH: ["ph", "hydronium", "hydrogen ion", "h+"],
  pKa: ["pka", "acid strength", "conjugate base"],
  "Strong and Weak Acids": ["strong acid", "weak acid", "strong base", "weak base", "dissociation"],
  Buffers: ["buffer", "henderson", "resists ph"],
  Titrations: ["titration", "equivalence point", "endpoint", "neutralization"],
  "Ionic Bonding": ["ionic", "lattice", "cation", "anion"],
  "Covalent Bonding": ["covalent", "shared electrons", "single bond", "double bond", "triple bond"],
  Polarity: ["polar", "dipole", "electronegativity difference"],
  "Lewis Structures": ["lewis", "formal charge", "resonance", "octet"],
  "Sigma and Pi Bonds": ["sigma", "pi bond", "overlap", "single bond", "double bond"],
  "Mole Calculations": ["mole", "molar mass", "avogadro", "particles"],
  "Limiting Reagent": ["limiting reagent", "limiting reactant", "excess reactant"],
  "Percent Yield": ["percent yield", "actual yield", "theoretical yield"],
  "Empirical Formula": ["empirical formula", "molecular formula", "percent composition"],
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

export function normalizeLearningTopic(topic: string): LearningTopic | null {
  const normalized = normalize(topic)
  return TOPIC_ALIASES[normalized] ?? null
}

export function getSubtopicsForTopic(topic: string): readonly string[] {
  const canonical = normalizeLearningTopic(topic)
  return canonical ? TOPIC_SUBTOPIC_REGISTRY[canonical] : []
}

export function normalizeSubtopicForTopic(topic: string, subtopic?: string): string | null {
  const options = getSubtopicsForTopic(topic)
  if (options.length === 0) return subtopic?.trim() || null

  const normalizedSubtopic = normalize(subtopic ?? "")
  if (!normalizedSubtopic) return null

  const compactSubtopic = normalizeSubtopicText(normalizedSubtopic)
  return options.find((option) => normalize(option) === normalizedSubtopic || normalizeSubtopicText(option).includes(compactSubtopic)) ?? null
}

export function inferSubtopicForTopic(topic: string, questionText = "", providedSubtopic?: string): string {
  const normalizedProvided = normalizeSubtopicForTopic(topic, providedSubtopic)
  if (normalizedProvided) return normalizedProvided

  const haystack = normalize(`${providedSubtopic ?? ""} ${questionText}`)
  const options = getSubtopicsForTopic(topic)
  if (options.length === 0) {
    const globalMatch = Object.values(TOPIC_SUBTOPIC_REGISTRY)
      .flat()
      .find((option) =>
        (SUBTOPIC_KEYWORDS[option] ?? [option]).some((keyword) => haystack.includes(normalize(keyword))),
      )
    return globalMatch ?? providedSubtopic?.trim() ?? "General"
  }

  const keywordMatch = options.find((option) =>
    (SUBTOPIC_KEYWORDS[option] ?? [option]).some((keyword) => haystack.includes(normalize(keyword))),
  )

  return keywordMatch ?? options[0]
}

function normalizeSubtopicText(value: string): string {
  return normalize(value).replace(/\s+/g, "")
}
