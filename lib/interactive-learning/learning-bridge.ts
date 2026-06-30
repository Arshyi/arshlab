import type { CompoundIntelligence } from "../chemistry-intelligence/types"
import type { StructureScannerRecord } from "../structure-scanner/scanner-types"

export type LearningLessonKind = "mo" | "hybridization" | "sigma-pi" | "conjugation" | "lone-pairs"

export interface LearningBridgeInput {
  id?: string
  name?: string
  formula?: string
  functionalGroups?: string[]
  aromatic?: boolean
  ringCount?: number
  bondOrderHints?: string[]
  hybridizationSummary?: string
}

export interface LearningBridgeLesson {
  id: string
  kind: LearningLessonKind
  title: string
  href: string
  reason: string
  difficulty: "Introductory" | "Intermediate" | "Advanced"
  estimatedTime: string
  outcomes: string[]
}

export interface LearningExplanationCard {
  id: string
  title: string
  body: string
  href: string
}

const MO_FORMULAS = new Map([
  ["O2", "O2"],
  ["N2", "N2"],
  ["H2", "H2"],
  ["F2", "F2"],
  ["C2", "C2"],
  ["B2", "B2"],
])

const MO_NAMES = new Map([
  ["oxygen", "O2"],
  ["dioxygen", "O2"],
  ["nitrogen", "N2"],
  ["dinitrogen", "N2"],
  ["hydrogen", "H2"],
  ["fluorine", "F2"],
])

const CONJUGATION_COMPOUND_MAP: Record<string, string> = {
  benzene: "benzene",
  phenol: "phenol",
  aniline: "aniline",
  nitrobenzene: "nitrobenzene",
  acetophenone: "acetophenone",
  styrene: "styrene",
  pyridine: "pyridine",
  pyrrole: "pyrrole",
  furan: "furan",
  thiophene: "thiophene",
  imidazole: "imidazole",
  naphthalene: "naphthalene",
  anthracene: "anthracene",
  "beta-carotene": "beta-carotene",
  lycopene: "lycopene",
  retinal: "retinal",
  acetanilide: "acetanilide",
}

const INTERACTIVE_EXAMPLE_MAP: Record<string, string> = {
  ethanol: "ethanol",
  ethene: "ethene",
  ethyne: "ethyne",
  acetone: "acetone",
  benzene: "benzene",
  phenol: "phenol",
  aniline: "aniline",
  "acetic-acid": "acetic-acid",
  "ethanoic-acid": "acetic-acid",
  "carbon-dioxide": "co2",
  ammonia: "nh3",
  water: "h2o",
  methane: "ch4",
}

function slug(value: string | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/\+/g, "plus")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function normalizedInput(input: LearningBridgeInput): Required<Pick<LearningBridgeInput, "id" | "name" | "formula" | "functionalGroups">> & LearningBridgeInput {
  return {
    ...input,
    id: slug(input.id),
    name: slug(input.name),
    formula: (input.formula ?? "").replace(/\s+/g, ""),
    functionalGroups: (input.functionalGroups ?? []).map((group) => group.toLowerCase()),
  }
}

export function interactiveLearningHref(options: {
  topic?: "mo" | "hybridization" | "sigma-pi" | "lone-pairs"
  compound?: string
  molecule?: string
}) {
  const params = new URLSearchParams()
  if (options.topic) params.set("topic", options.topic)
  if (options.compound) params.set("compound", options.compound)
  if (options.molecule) params.set("molecule", options.molecule)
  const query = params.toString()
  return query ? `/interactive-learning?${query}` : "/interactive-learning"
}

export function conjugationLearningHref(options: { compound?: string; focus?: "aromaticity" | "resonance" | "electron-counter" } = {}) {
  const params = new URLSearchParams()
  if (options.compound) params.set("compound", options.compound)
  if (options.focus) params.set("focus", options.focus)
  const query = params.toString()
  return query ? `/interactive-learning/conjugation?${query}` : "/interactive-learning/conjugation"
}

export function getInteractiveExampleId(input: LearningBridgeInput): string {
  const normalized = normalizedInput(input)
  return (
    INTERACTIVE_EXAMPLE_MAP[normalized.id] ??
    INTERACTIVE_EXAMPLE_MAP[normalized.name] ??
    (normalized.functionalGroups.includes("alcohol") ? "ethanol" : undefined) ??
    "ethene"
  )
}

export function getConjugationExampleId(input: LearningBridgeInput): string {
  const normalized = normalizedInput(input)
  return (
    CONJUGATION_COMPOUND_MAP[normalized.id] ??
    CONJUGATION_COMPOUND_MAP[normalized.name] ??
    (normalized.aromatic || normalized.functionalGroups.some((group) => ["arene", "aromatic", "phenol"].includes(group)) ? "benzene" : undefined) ??
    "butadiene"
  )
}

export function getMoMoleculeId(input: LearningBridgeInput): string | null {
  const normalized = normalizedInput(input)
  return MO_FORMULAS.get(normalized.formula) ?? MO_NAMES.get(normalized.name) ?? MO_NAMES.get(normalized.id) ?? null
}

export function getLearningBridgeLessons(input: LearningBridgeInput): LearningBridgeLesson[] {
  const normalized = normalizedInput(input)
  const lessons: LearningBridgeLesson[] = []
  const hasGroup = (names: string[]) => normalized.functionalGroups.some((group) => names.includes(group))
  const moMolecule = getMoMoleculeId(input)
  const conjugationCompound = getConjugationExampleId(input)
  const interactiveCompound = getInteractiveExampleId(input)
  const isAromatic = Boolean(normalized.aromatic || normalized.ringCount || hasGroup(["arene", "aromatic", "phenol"]))
  const hasPi = hasGroup(["alkene", "alkyne", "carbonyl", "ketone", "aldehyde", "carboxylic acid", "ester", "amide", "nitrile"])
  const hasLonePairs = hasGroup(["alcohol", "phenol", "ether", "amine", "amide", "carbonyl", "ketone", "aldehyde", "carboxylic acid", "ester"])

  if (isAromatic) {
    lessons.push({
      id: "conjugation-aromaticity",
      kind: "conjugation",
      title: "Learn why aromaticity makes this result make sense",
      href: conjugationLearningHref({ compound: conjugationCompound, focus: "aromaticity" }),
      reason: "The detected structure has aromatic or ring evidence, so conjugation and Huckel aromaticity are the next useful explanation.",
      difficulty: "Intermediate",
      estimatedTime: "10 min",
      outcomes: ["Trace the principal conjugated pathway", "Count delocalized pi electrons", "Apply Huckel's rule"],
    })
  }

  if (hasPi) {
    lessons.push({
      id: "sigma-pi",
      kind: "sigma-pi",
      title: "See where sigma and pi bonds are hiding",
      href: interactiveLearningHref({ topic: "sigma-pi", compound: interactiveCompound }),
      reason: "Double, triple, or carbonyl-like functional groups are best understood through sigma and pi overlap.",
      difficulty: "Introductory",
      estimatedTime: "7 min",
      outcomes: ["Separate sigma and pi components", "Explain pi overlap", "Connect p orbitals to reactivity"],
    })
  }

  if (hasLonePairs || hasGroup(["alcohol"]) || normalized.id === "ethanol" || normalized.name === "ethanol") {
    lessons.push({
      id: "hybridization-lone-pairs",
      kind: "lone-pairs",
      title: "Understand hybridization and lone pairs",
      href: interactiveLearningHref({ topic: "hybridization", compound: interactiveCompound }),
      reason: "Heteroatoms such as O and N often explain shape, polarity, and reactivity through hybridization and lone pairs.",
      difficulty: "Introductory",
      estimatedTime: "8 min",
      outcomes: ["Identify sp, sp2, and sp3 centers", "Place lone pairs in orbitals", "Explain molecular shape"],
    })
  }

  if (moMolecule) {
    lessons.push({
      id: "mo-builder",
      kind: "mo",
      title: "Build the molecular orbital diagram",
      href: interactiveLearningHref({ topic: "mo", molecule: moMolecule }),
      reason: `${moMolecule} is one of ARSHLAB's supported molecular orbital examples.`,
      difficulty: "Intermediate",
      estimatedTime: "9 min",
      outcomes: ["Fill MO levels", "Calculate bond order", "Explain magnetism and HOMO/LUMO"],
    })
  }

  if (!lessons.length) {
    lessons.push({
      id: "hybridization-general",
      kind: "hybridization",
      title: "Start with bonding and shape",
      href: interactiveLearningHref({ topic: "hybridization", compound: interactiveCompound }),
      reason: "No special aromatic or MO lesson was matched, so hybridization is the safest next explanation.",
      difficulty: "Introductory",
      estimatedTime: "8 min",
      outcomes: ["Connect atoms to orbital shape", "Recognize sigma bonds", "Build toward reactivity"],
    })
  }

  return lessons
}

export function getLearningExplanationCards(input: LearningBridgeInput): LearningExplanationCard[] {
  const normalized = normalizedInput(input)
  const lessons = getLearningBridgeLessons(input)
  const conjugationHref = lessons.find((lesson) => lesson.kind === "conjugation")?.href ?? conjugationLearningHref({ compound: getConjugationExampleId(input) })
  const sigmaPiHref = lessons.find((lesson) => lesson.kind === "sigma-pi")?.href ?? interactiveLearningHref({ topic: "sigma-pi", compound: getInteractiveExampleId(input) })
  const hybridHref = lessons.find((lesson) => lesson.kind === "lone-pairs" || lesson.kind === "hybridization")?.href ?? interactiveLearningHref({ topic: "hybridization", compound: getInteractiveExampleId(input) })
  const moHref = lessons.find((lesson) => lesson.kind === "mo")?.href ?? interactiveLearningHref({ topic: "mo", molecule: getMoMoleculeId(input) ?? "O2" })

  return [
    {
      id: "sigma",
      title: "Why this molecule has sigma bonds",
      body: "Every single bond is a sigma bond. Double and triple bonds still contain one sigma bond before any pi bonding is added.",
      href: sigmaPiHref,
    },
    {
      id: "pi-electrons",
      title: "Where the pi electrons are",
      body: normalized.aromatic || normalized.functionalGroups.some((group) => ["arene", "aromatic", "alkene", "alkyne", "carbonyl"].includes(group))
        ? "Pi electrons are found in double bonds, triple bonds, carbonyls, aromatic rings, and participating lone pairs."
        : "This result is mostly sigma-bonded, so pi electrons are limited or absent in the deterministic lesson match.",
      href: sigmaPiHref,
    },
    {
      id: "aromaticity",
      title: "Why this is or is not aromatic",
      body: normalized.aromatic || normalized.functionalGroups.some((group) => ["arene", "aromatic"].includes(group))
        ? "Aromaticity requires a cyclic, planar, continuous p system with a Huckel 4n+2 pi electron count."
        : "Non-aromatic molecules either lack a cyclic p system, break conjugation, or do not satisfy the electron-count requirement.",
      href: conjugationHref,
    },
    {
      id: "homo-lumo",
      title: "How HOMO/LUMO relates to reactivity",
      body: "The HOMO is where the highest-energy occupied electrons are; the LUMO is the lowest empty acceptor level. Smaller gaps often mean easier electronic excitation or reaction.",
      href: moHref,
    },
    {
      id: "hybridization",
      title: "Which atoms are sp, sp2, or sp3",
      body: "sp centers are linear, sp2 centers are trigonal planar and can hold p orbitals, and sp3 centers are tetrahedral and often interrupt conjugation.",
      href: hybridHref,
    },
  ]
}

export function bridgeInputFromScannerRecord(record: StructureScannerRecord): LearningBridgeInput {
  return {
    id: record.id,
    name: record.name,
    formula: record.formula,
    functionalGroups: record.functionalGroups,
    aromatic: record.functionalGroups.some((group) => ["arene", "aromatic", "phenol"].includes(group.toLowerCase())),
  }
}

export function bridgeInputFromIntelligence(intelligence: CompoundIntelligence | null, fallback?: LearningBridgeInput): LearningBridgeInput {
  if (!intelligence) return fallback ?? {}
  return {
    ...fallback,
    id: intelligence.identity.compoundId,
    name: intelligence.identity.name,
    formula: intelligence.identity.formula,
    functionalGroups: intelligence.functionalGroups.map((group) => group.label),
    aromatic: intelligence.properties.aromatic,
    ringCount: intelligence.properties.ringCount,
    hybridizationSummary: intelligence.properties.hybridizationSummary,
  }
}
