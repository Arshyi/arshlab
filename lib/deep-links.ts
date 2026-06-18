export interface TopicDeepLinkTargets {
  formulaId: string
  solverModuleId: string
  practiceTopic: string
  examTopic: string
  mechanismId?: string
  reactionId?: string
  compoundId?: string
}

export function deepLinkSlug(value: string | null | undefined): string {
  return decodeURIComponent(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

const FORMULA_ALIASES: Record<string, string> = {
  molarity: "solutions-molarity",
  dilution: "solutions-dilution",
  "percent-yield": "stoichiometry-percent-yield",
  "empirical-formula": "stoichiometry-moles-from-mass",
  "ideal-gas": "gases-ideal-gas-law",
  "ideal-gas-law": "gases-ideal-gas-law",
  gas: "gases-ideal-gas-law",
  gases: "gases-ideal-gas-law",
  calorimetry: "thermochemistry-calorimetry",
  enthalpy: "thermochemistry-enthalpy-per-mole",
  ph: "acids-bases-ph",
  poh: "acids-bases-poh",
  equilibrium: "equilibrium-kc",
  electrochemistry: "electrochemistry-ecell",
  faraday: "electrochemistry-faraday",
  "degree-unsaturation": "organic-degree-unsaturation",
  "degree-of-unsaturation": "organic-degree-unsaturation",
  homologous: "organic-homologous-series",
  "homologous-series": "organic-homologous-series",
}

const SOLVER_ALIASES: Record<string, string> = {
  molarity: "molarity",
  "molarity-solver": "molarity",
  concentration: "molarity",
  dilution: "dilution",
  "dilution-solver": "dilution",
  "percent-yield": "percent-yield",
  yield: "percent-yield",
  "empirical-formula": "empirical-formula",
  "ideal-gas": "ideal-gas-law",
  "ideal-gas-law": "ideal-gas-law",
  "gas-laws": "ideal-gas-law",
  calorimetry: "calorimetry",
  thermochemistry: "calorimetry",
  ph: "ph",
  "ph-calculator": "ph",
  stoichiometry: "stoichiometry",
  "stoichiometry-solver": "stoichiometry",
}

const FORMULA_TO_SOLVER_MODULE: Record<string, string> = {
  "solutions-molarity": "molarity",
  "solutions-dilution": "dilution",
  "stoichiometry-percent-yield": "percent-yield",
  "stoichiometry-moles-from-mass": "empirical-formula",
  "gases-ideal-gas-law": "ideal-gas-law",
  "thermochemistry-calorimetry": "calorimetry",
  "acids-bases-ph": "ph",
  "acids-bases-poh": "ph",
  "acids-bases-ph-poh": "ph",
  "stoichiometry-limiting-reagent": "stoichiometry",
}

const TOPIC_ALIASES: Record<string, string> = {
  stoichiometry: "Stoichiometry",
  "chemistry-calculations": "Chemistry Calculations",
  calculations: "Chemistry Calculations",
  "functional-groups": "Functional Group Identification",
  "functional-group-identification": "Functional Group Identification",
  hybridization: "Hybridization",
  vsepr: "VSEPR Geometry",
  "vsepr-geometry": "VSEPR Geometry",
  "molecular-geometry": "VSEPR Geometry",
  "periodic-trends": "Periodic Trends",
  periodicity: "Periodic Trends",
  spectroscopy: "Spectroscopy",
  "ir-spectroscopy": "IR Spectroscopy",
  thermodynamics: "Thermodynamics",
  thermochemistry: "Thermodynamics",
  "electron-configuration": "Electron Configuration",
  kinetics: "Kinetics",
  equilibrium: "Equilibrium",
  "acids-and-bases": "Acids and Bases",
  "acid-base": "Acids and Bases",
  bonding: "Bonding",
  "reaction-types": "Reaction Types",
  "reaction-prediction": "Reaction Prediction",
  "reaction-balancing": "Reaction Balancing",
  "reaction-classification": "Reaction Classification",
  redox: "Redox",
  precipitation: "Precipitation",
  combustion: "Combustion",
  "organic-reactions": "Organic Reactions",
  "organic-mechanisms": "Organic Mechanisms",
}

const MECHANISM_ALIASES: Record<string, string> = {
  sn1: "sn1-substitution",
  "sn1-substitution": "sn1-substitution",
  sn2: "sn2-substitution",
  "sn2-substitution": "sn2-substitution",
  e1: "e1-elimination",
  "e1-elimination": "e1-elimination",
  e2: "e2-elimination",
  "e2-elimination": "e2-elimination",
  "alkene-bromination": "alkene-bromination",
  "alkene-hydration": "alkene-hydration",
  "alkene-hydrogenation": "alkene-hydrogenation",
  esterification: "esterification",
  "alcohol-oxidation": "alcohol-oxidation",
  "carboxylic-acid-formation": "carboxylic-acid-formation",
}

const REACTION_ALIASES: Record<string, string> = {
  "alkene-bromination": "rxn-organic-ethene-bromine",
  bromination: "rxn-organic-ethene-bromine",
  "ethene-bromination": "rxn-organic-ethene-bromine",
  "alkene-hydrogenation": "rxn-organic-ethene-hydrogen",
  hydrogenation: "rxn-organic-ethene-hydrogen",
  "alkene-hydration": "rxn-organic-propene-hydration",
  hydration: "rxn-organic-propene-hydration",
  esterification: "rxn-organic-ethanol-ethanoic-acid",
  "alcohol-oxidation": "rxn-organic-ethanol-oxidation",
  oxidation: "rxn-organic-ethanol-oxidation",
  neutralization: "rxn-neutralization-hcl-naoh",
  precipitation: "rxn-precip-agcl",
  combustion: "rxn-combustion-methane",
  redox: "rxn-displacement-zn-cuso4",
}

const COMPOUND_ALIASES: Record<string, string> = {
  ethanol: "ethanol",
  alcohol: "ethanol",
  water: "water",
  ammonia: "ammonia",
  benzene: "benzene",
  aspirin: "aspirin",
  acetone: "acetone",
  propanol: "propan-1-ol",
  "propan-1-ol": "propan-1-ol",
  "ethyl-ethanoate": "ethyl-ethanoate",
  "ethanoic-acid": "ethanoic-acid",
  "sodium-chloride": "sodium-chloride",
  "hydrochloric-acid": "hydrochloric-acid",
  "carbon-dioxide": "carbon-dioxide",
  methane: "methane",
  ethene: "ethene",
  propene: "propene",
  ethyne: "ethyne",
}

const CURRICULUM_TOPIC_TARGETS: Record<string, TopicDeepLinkTargets> = {
  "atomic-structure": {
    formulaId: "stoichiometry-moles-from-mass",
    solverModuleId: "stoichiometry",
    practiceTopic: "Electron Configuration",
    examTopic: "Electron Configuration",
    compoundId: "water",
  },
  "electron-configuration": {
    formulaId: "stoichiometry-moles-from-mass",
    solverModuleId: "stoichiometry",
    practiceTopic: "Electron Configuration",
    examTopic: "Electron Configuration",
    compoundId: "water",
  },
  "periodic-trends": {
    formulaId: "stoichiometry-percent-composition",
    solverModuleId: "stoichiometry",
    practiceTopic: "Periodic Trends",
    examTopic: "Periodic Trends",
    compoundId: "sodium-chloride",
  },
  bonding: {
    formulaId: "organic-degree-unsaturation",
    solverModuleId: "stoichiometry",
    practiceTopic: "Bonding",
    examTopic: "Bonding",
    compoundId: "water",
  },
  "molecular-geometry": {
    formulaId: "organic-degree-unsaturation",
    solverModuleId: "stoichiometry",
    practiceTopic: "VSEPR Geometry",
    examTopic: "VSEPR Geometry",
    compoundId: "ammonia",
  },
  "intermolecular-forces": {
    formulaId: "solutions-molarity",
    solverModuleId: "molarity",
    practiceTopic: "Bonding",
    examTopic: "Bonding",
    compoundId: "ethanol",
  },
  stoichiometry: {
    formulaId: "stoichiometry-limiting-reagent",
    solverModuleId: "stoichiometry",
    practiceTopic: "Stoichiometry",
    examTopic: "Stoichiometry",
    reactionId: "rxn-synthesis-water",
    compoundId: "water",
  },
  solutions: {
    formulaId: "solutions-molarity",
    solverModuleId: "molarity",
    practiceTopic: "Chemistry Calculations",
    examTopic: "Chemistry Calculations",
    reactionId: "rxn-neutralization-hcl-naoh",
    compoundId: "sodium-chloride",
  },
  "gas-laws": {
    formulaId: "gases-ideal-gas-law",
    solverModuleId: "ideal-gas-law",
    practiceTopic: "Chemistry Calculations",
    examTopic: "Chemistry Calculations",
    reactionId: "rxn-combustion-methane",
    compoundId: "carbon-dioxide",
  },
  thermochemistry: {
    formulaId: "thermochemistry-calorimetry",
    solverModuleId: "calorimetry",
    practiceTopic: "Thermodynamics",
    examTopic: "Thermodynamics",
    reactionId: "rxn-combustion-methane",
    compoundId: "methane",
  },
  equilibrium: {
    formulaId: "equilibrium-kc",
    solverModuleId: "stoichiometry",
    practiceTopic: "Equilibrium",
    examTopic: "Equilibrium",
    reactionId: "rxn-equilibrium-haber",
    compoundId: "ammonia",
  },
  "acids-and-bases": {
    formulaId: "acids-bases-ph",
    solverModuleId: "ph",
    practiceTopic: "Acids and Bases",
    examTopic: "Acids and Bases",
    reactionId: "rxn-neutralization-hcl-naoh",
    compoundId: "hydrochloric-acid",
  },
  electrochemistry: {
    formulaId: "electrochemistry-ecell",
    solverModuleId: "stoichiometry",
    practiceTopic: "Redox",
    examTopic: "Redox",
    reactionId: "rxn-displacement-zn-cuso4",
    compoundId: "sodium-chloride",
  },
  "functional-groups": {
    formulaId: "organic-homologous-series",
    solverModuleId: "stoichiometry",
    practiceTopic: "Functional Group Identification",
    examTopic: "Functional Group Identification",
    compoundId: "ethanol",
  },
  nomenclature: {
    formulaId: "organic-homologous-series",
    solverModuleId: "stoichiometry",
    practiceTopic: "Functional Group Identification",
    examTopic: "Functional Group Identification",
    compoundId: "propan-1-ol",
  },
  isomerism: {
    formulaId: "organic-degree-unsaturation",
    solverModuleId: "stoichiometry",
    practiceTopic: "Functional Group Identification",
    examTopic: "Functional Group Identification",
    compoundId: "propan-2-ol",
  },
  alkanes: {
    formulaId: "organic-homologous-series",
    solverModuleId: "stoichiometry",
    practiceTopic: "Organic Reactions",
    examTopic: "Organic Reactions",
    reactionId: "rxn-organic-alkane-chlorination",
    compoundId: "ethane",
  },
  alkenes: {
    formulaId: "organic-homologous-series",
    solverModuleId: "stoichiometry",
    practiceTopic: "Organic Reactions",
    examTopic: "Organic Reactions",
    mechanismId: "alkene-bromination",
    reactionId: "rxn-organic-ethene-bromine",
    compoundId: "ethene",
  },
  alkynes: {
    formulaId: "organic-homologous-series",
    solverModuleId: "stoichiometry",
    practiceTopic: "Organic Reactions",
    examTopic: "Organic Reactions",
    reactionId: "rxn-hydrocarbon-ethyne-hydrogen",
    compoundId: "ethyne",
  },
  aromatics: {
    formulaId: "organic-degree-unsaturation",
    solverModuleId: "stoichiometry",
    practiceTopic: "Spectroscopy",
    examTopic: "Spectroscopy",
    reactionId: "rxn-organic-benzene-nitration",
    compoundId: "benzene",
  },
  alcohols: {
    formulaId: "organic-homologous-series",
    solverModuleId: "stoichiometry",
    practiceTopic: "Organic Reactions",
    examTopic: "Organic Reactions",
    mechanismId: "alcohol-oxidation",
    reactionId: "rxn-organic-ethanol-oxidation",
    compoundId: "ethanol",
  },
  "carbonyl-chemistry": {
    formulaId: "organic-degree-unsaturation",
    solverModuleId: "stoichiometry",
    practiceTopic: "IR Spectroscopy",
    examTopic: "IR Spectroscopy",
    reactionId: "rxn-organic-ethanal-oxidation",
    compoundId: "acetone",
  },
  "carboxylic-acids": {
    formulaId: "organic-degree-unsaturation",
    solverModuleId: "stoichiometry",
    practiceTopic: "Organic Reactions",
    examTopic: "Organic Reactions",
    mechanismId: "esterification",
    reactionId: "rxn-organic-ethanol-ethanoic-acid",
    compoundId: "ethanoic-acid",
  },
  esters: {
    formulaId: "organic-degree-unsaturation",
    solverModuleId: "stoichiometry",
    practiceTopic: "Organic Reactions",
    examTopic: "Organic Reactions",
    mechanismId: "esterification",
    reactionId: "rxn-organic-ethanol-ethanoic-acid",
    compoundId: "ethyl-ethanoate",
  },
  "organic-mechanisms": {
    formulaId: "organic-degree-unsaturation",
    solverModuleId: "stoichiometry",
    practiceTopic: "Organic Mechanisms",
    examTopic: "Organic Mechanisms",
    mechanismId: "sn1-substitution",
    reactionId: "rxn-organic-bromoethane-oh",
    compoundId: "ethanol",
  },
}

export function resolveFormulaDeepLink(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  const slug = deepLinkSlug(value)
  return FORMULA_ALIASES[slug] ?? value
}

export function resolveSolverModuleDeepLink(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  const slug = deepLinkSlug(value)
  return SOLVER_ALIASES[slug] ?? value
}

export function getSolverModuleForFormulaDeepLink(formulaId: string): string | undefined {
  return FORMULA_TO_SOLVER_MODULE[formulaId]
}

export function resolveTopicDeepLink(value: string | null | undefined, options: string[]): string | undefined {
  if (!value) return undefined
  if (options.includes(value)) return value

  const slug = deepLinkSlug(value)
  const alias = TOPIC_ALIASES[slug]
  if (alias && options.includes(alias)) return alias

  return options.find((option) => deepLinkSlug(option) === slug)
}

export function resolveMechanismDeepLink(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  const slug = deepLinkSlug(value)
  return MECHANISM_ALIASES[slug] ?? value
}

export function resolveReactionDeepLink(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  const slug = deepLinkSlug(value)
  return REACTION_ALIASES[slug] ?? value
}

export function resolveCompoundDeepLink(value: string | null | undefined): string | undefined {
  if (!value) return undefined
  const slug = deepLinkSlug(value)
  return COMPOUND_ALIASES[slug] ?? value
}

export function getTopicDeepLinkTargets(topic: string): TopicDeepLinkTargets {
  return (
    CURRICULUM_TOPIC_TARGETS[deepLinkSlug(topic)] ?? {
      formulaId: "stoichiometry-moles-from-mass",
      solverModuleId: "stoichiometry",
      practiceTopic: resolveTopicDeepLink(topic, Object.values(TOPIC_ALIASES)) ?? topic,
      examTopic: resolveTopicDeepLink(topic, Object.values(TOPIC_ALIASES)) ?? topic,
      compoundId: "water",
    }
  )
}

export function curriculumTopicHref(topicId: string): string {
  return `/curriculum?topic=${encodeURIComponent(topicId)}#curriculum-topic`
}

export function solverModuleHref(moduleId: string): string {
  return `/chemistry-solver?module=${encodeURIComponent(moduleId)}#solver-module`
}

export function mechanismHref(mechanismId: string): string {
  return `/mechanism-trainer?mechanism=${encodeURIComponent(mechanismId)}#mechanism-viewer`
}

export function reactionHref(reactionId: string): string {
  return `/reaction-database?reaction=${encodeURIComponent(reactionId)}#reaction-viewer`
}

export function molecularVisualizerHref(compoundId: string): string {
  return `/molecular-visualizer?compound=${encodeURIComponent(compoundId)}#molecule-viewer`
}
