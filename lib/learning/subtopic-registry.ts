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
  "NMR Spectroscopy": [
    "1H NMR",
    "13C NMR",
    "Chemical Shift",
    "Integration",
    "Splitting Patterns",
    "Equivalent Hydrogens",
    "Carbonyl Carbon",
    "Aromatic Carbon",
  ],
  "Mass Spectrometry": [
    "Molecular Ion",
    "Fragment Peaks",
    "Isotope Patterns",
    "Base Peak",
  ],
  Spectroscopy: [
    "IR Spectroscopy",
    "1H NMR",
    "13C NMR",
    "Mass Spectrometry",
    "Carbonyl Identification",
    "O-H Stretch",
    "N-H Stretch",
    "C triple N Stretch",
    "Aromatic Peaks",
    "Molecular Ion",
    "Fragment Peaks",
    "Isotope Patterns",
    "Base Peak",
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
  "Chemistry Calculations": [
    "Molarity Solver",
    "Dilution Solver",
    "Percent Yield",
    "Empirical Formula",
    "Ideal Gas Law",
    "Calorimetry",
    "pH Calculator",
    "Stoichiometry Solver",
  ],
  "Reaction Types": [
    "Acid-Base",
    "Precipitation",
    "Combustion",
    "Single Displacement",
    "Double Displacement",
    "Redox",
    "Synthesis",
    "Decomposition",
  ],
  "Reaction Prediction": [
    "Missing Product",
    "Precipitation Prediction",
    "Acid/Base Products",
    "Combustion Products",
    "Organic Products",
    "Single Displacement",
    "Double Displacement",
  ],
  "Reaction Balancing": [
    "Balancing",
    "Balancing Coefficients",
    "Combustion Balancing",
    "Redox Balancing",
    "Conservation of Atoms",
  ],
  "Reaction Classification": [
    "Reaction Type",
    "Reaction Classification",
    "Redox Identification",
    "Precipitation",
    "Combustion",
    "Organic Reactions",
  ],
  Redox: [
    "Redox Identification",
    "Oxidation",
    "Reduction",
    "Electron Transfer",
  ],
  Precipitation: [
    "Precipitation Prediction",
    "Solubility",
    "Net Ionic Equations",
    "Insoluble Salts",
  ],
  Combustion: [
    "Combustion Products",
    "Complete Combustion",
    "Hydrocarbon Combustion",
    "Combustion Balancing",
  ],
  "Organic Reactions": [
    "Esterification",
    "Substitution",
    "Addition",
    "Elimination",
    "Oxidation",
  ],
  "Organic Mechanisms": [
    "Alkene Bromination",
    "Alkene Hydration",
    "Alkene Hydrogenation",
    "Esterification",
    "SN1",
    "SN2",
    "E1",
    "E2",
    "Alcohol Oxidation",
    "Carboxylic Acid Formation",
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
  "nmr spectroscopy": "NMR Spectroscopy",
  "1h nmr": "NMR Spectroscopy",
  "proton nmr": "NMR Spectroscopy",
  "13c nmr": "NMR Spectroscopy",
  "carbon nmr": "NMR Spectroscopy",
  "mass spectrometry": "Mass Spectrometry",
  "mass spec": "Mass Spectrometry",
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
  "chemistry calculations": "Chemistry Calculations",
  "chemistry solver": "Chemistry Calculations",
  "solver practice": "Chemistry Calculations",
  "calculation practice": "Chemistry Calculations",
  "reaction types": "Reaction Types",
  "reaction type": "Reaction Types",
  "chemical reactions": "Reaction Types",
  "reaction prediction": "Reaction Prediction",
  "reaction balancing": "Reaction Balancing",
  "balancing": "Reaction Balancing",
  "reaction classification": "Reaction Classification",
  "redox": "Redox",
  "oxidation reduction": "Redox",
  "precipitation": "Precipitation",
  "combustion": "Combustion",
  "organic reactions": "Organic Reactions",
  "organic mechanisms": "Organic Mechanisms",
  "mechanism trainer": "Organic Mechanisms",
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
  "1H NMR": ["1h nmr", "proton nmr", "chemical shift", "integration", "splitting", "multiplicity"],
  "13C NMR": ["13c nmr", "carbon nmr", "carbon environment", "carbonyl carbon", "aromatic carbon"],
  "Chemical Shift": ["chemical shift", "ppm", "downfield", "upfield", "deshielded"],
  Integration: ["integration", "integrates", "3h", "2h", "1h", "equivalent hydrogens"],
  "Splitting Patterns": ["splitting", "singlet", "doublet", "triplet", "quartet", "multiplet"],
  "Equivalent Hydrogens": ["equivalent hydrogens", "equivalent protons", "same environment"],
  "Carbonyl Carbon": ["carbonyl carbon", "190", "200 ppm", "13c carbonyl"],
  "Aromatic Carbon": ["aromatic carbon", "benzene carbon", "120 ppm", "130 ppm"],
  "Molecular Ion": ["molecular ion", "m+", "m/z", "relative formula mass"],
  "Fragment Peaks": ["fragment", "fragmentation", "m/z", "peak"],
  "Isotope Patterns": ["isotope", "m+2", "chlorine", "bromine", "3:1", "1:1"],
  "Base Peak": ["base peak", "100% abundance", "most intense peak"],
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
  "Molarity Solver": ["molarity", "moles volume", "m = n", "concentration", "mol l"],
  "Dilution Solver": ["dilution", "m1v1", "stock solution", "final volume"],
  "Ideal Gas Law": ["ideal gas", "pv nrt", "pv=nrt", "gas law", "pressure volume"],
  "pH Calculator": ["ph", "hydrogen ion", "h+", "poh", "log"],
  "Stoichiometry Solver": ["stoichiometry", "mole ratio", "balanced equation", "coefficient ratio"],
  "Acid-Base": ["acid base", "acid-base", "neutralization", "proton transfer", "salt and water"],
  Precipitation: ["precipitation", "precipitate", "insoluble", "solid forms"],
  Combustion: ["combustion", "burning", "oxygen", "co2", "carbon dioxide"],
  "Single Displacement": ["single displacement", "displaces", "reactivity series", "metal acid"],
  "Double Displacement": ["double displacement", "metathesis", "ion exchange", "gas-forming"],
  Redox: ["redox", "oxidation", "reduction", "electron transfer"],
  Synthesis: ["synthesis", "combination", "combine to form"],
  Decomposition: ["decomposition", "breaks down", "thermal decomposition"],
  "Missing Product": ["missing product", "predict product", "products expected"],
  "Precipitation Prediction": ["precipitation prediction", "what precipitate", "insoluble product"],
  "Acid/Base Products": ["acid base products", "neutralization products", "salt water"],
  "Combustion Products": ["combustion products", "complete combustion", "co2 and h2o"],
  "Organic Products": ["organic product", "esterification", "addition", "substitution"],
  Balancing: ["balance", "balanced equation", "skeleton equation"],
  "Balancing Coefficients": ["coefficient", "coefficients", "whole number ratio"],
  "Combustion Balancing": ["combustion balancing", "balance combustion"],
  "Redox Balancing": ["redox balancing", "half reaction", "acidic solution"],
  "Conservation of Atoms": ["conservation of atoms", "atoms conserved", "mass conserved"],
  "Reaction Type": ["reaction type", "type best classifies"],
  "Reaction Classification": ["reaction category", "classification", "classify"],
  "Redox Identification": ["redox identification", "which equation is redox"],
  Solubility: ["solubility", "solubility rules"],
  "Net Ionic Equations": ["net ionic", "spectator ions"],
  "Insoluble Salts": ["insoluble salts", "low solubility"],
  Oxidation: ["oxidation", "loses electrons", "oxidation number increases"],
  Reduction: ["reduction", "gains electrons", "oxidation number decreases"],
  "Electron Transfer": ["electron transfer", "electrons move"],
  "Complete Combustion": ["complete combustion", "excess oxygen"],
  "Hydrocarbon Combustion": ["hydrocarbon combustion", "alkane combustion"],
  Esterification: ["esterification", "ester", "alcohol and carboxylic acid"],
  Substitution: ["substitution", "nucleophilic substitution", "leaving group"],
  Addition: ["addition", "alkene addition", "double bond"],
  Elimination: ["elimination", "dehydration", "forms alkene"],
  "Alkene Bromination": ["alkene bromination", "bromonium", "br2", "vicinal dibromide"],
  "Alkene Hydration": ["alkene hydration", "hydration", "markovnikov", "carbocation", "water attacks"],
  "Alkene Hydrogenation": ["alkene hydrogenation", "hydrogenation", "h2", "pd", "pt", "alkane"],
  SN1: ["sn1", "carbocation", "polar protic", "tertiary", "ionization"],
  SN2: ["sn2", "backside attack", "inversion", "concerted", "primary haloalkane"],
  E1: ["e1", "elimination", "carbocation", "weak base"],
  E2: ["e2", "anti periplanar", "strong base", "beta hydrogen", "concerted elimination"],
  "Alcohol Oxidation": ["alcohol oxidation", "primary alcohol", "aldehyde", "oxidation"],
  "Carboxylic Acid Formation": ["carboxylic acid formation", "aldehyde oxidation", "carboxylic acid", "cooh"],
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
