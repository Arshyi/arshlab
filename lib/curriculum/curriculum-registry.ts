export type CurriculumId =
  | "general-first-year"
  | "chem-121"
  | "ib-chemistry"
  | "ap-chemistry"
  | "a-level-chemistry"

export type CurriculumUnitStatus =
  | "Not Started"
  | "Needs Intervention"
  | "Developing"
  | "Competent"
  | "Strong"
  | "Mastered"

export interface CurriculumUnit {
  id: string
  title: string
  description: string
  topics: string[]
  subtopics: string[]
  suggestedQuestionTypes: string[]
}

export interface Curriculum {
  id: CurriculumId
  name: string
  description: string
  level: string
  units: CurriculumUnit[]
  topics: string[]
  subtopics: string[]
  recommendedOrder: string[]
  questionStyleNotes: string
  disclaimer: string
}

export interface CurriculumProgressEntry {
  topic: string
  subtopic?: string
  correct: boolean
  questionType?: string
}

export interface CurriculumUnitProgress {
  unit: CurriculumUnit
  attempted: number
  correct: number
  missed: number
  mastery: number
  status: CurriculumUnitStatus
}

export interface CurriculumProgressSummary {
  curriculum: Curriculum
  overallProgress: number
  totalAttempted: number
  totalCorrect: number
  units: CurriculumUnitProgress[]
  weakestUnit: CurriculumUnitProgress | null
  strongestUnit: CurriculumUnitProgress | null
  recommendedNextUnit: CurriculumUnitProgress | null
  unitsMastered: number
  unitsNeedingWork: number
  diagnosticCoverage: number
}

export const DEFAULT_CURRICULUM_ID: CurriculumId = "general-first-year"

const DISCLAIMER =
  "Curriculum labels describe study style and topic alignment. ARSHLAB is not affiliated with or endorsed by IB, College Board, Cambridge, UBC, or any examination board."

const CORE_UNITS: CurriculumUnit[] = [
  {
    id: "stoichiometry",
    title: "Stoichiometry",
    description: "Moles, formulas, balanced equations, limiting reagents, and yield.",
    topics: ["Stoichiometry"],
    subtopics: ["Mole Calculations", "Limiting Reagent", "Percent Yield", "Empirical Formula"],
    suggestedQuestionTypes: ["Multiple choice", "Short answer"],
  },
  {
    id: "chemical-reactions",
    title: "Chemical Reactions",
    description: "Reaction types, product prediction, balancing, precipitation, combustion, redox, and acid/base products.",
    topics: [
      "Reaction Types",
      "Reaction Prediction",
      "Reaction Balancing",
      "Reaction Classification",
      "Redox",
      "Precipitation",
      "Combustion",
    ],
    subtopics: [
      "Reaction Type",
      "Reaction Classification",
      "Missing Product",
      "Precipitation Prediction",
      "Acid/Base Products",
      "Combustion Products",
      "Balancing",
      "Redox Identification",
      "Single Displacement",
      "Double Displacement",
      "Synthesis",
      "Decomposition",
    ],
    suggestedQuestionTypes: ["Multiple choice", "Short answer", "Explanation prompt"],
  },
  {
    id: "atomic-structure",
    title: "Atomic Structure",
    description: "Electron configuration, orbital filling, atomic structure, and periodic foundations.",
    topics: ["Electron Configuration"],
    subtopics: ["Aufbau Principle", "Hund's Rule", "Noble Gas Shorthand", "d-block Exceptions"],
    suggestedQuestionTypes: ["Multiple choice", "Explanation prompt"],
  },
  {
    id: "periodicity",
    title: "Periodicity",
    description: "Periodic trends, shielding, effective nuclear charge, and comparative reasoning.",
    topics: ["Periodic Trends"],
    subtopics: [
      "Atomic Radius",
      "Ionic Radius",
      "Ionization Energy",
      "Electron Affinity",
      "Shielding",
      "Effective Nuclear Charge",
    ],
    suggestedQuestionTypes: ["Multiple choice", "Explanation prompt"],
  },
  {
    id: "bonding-structure",
    title: "Bonding and Structure",
    description: "Lewis structures, bond polarity, VSEPR geometry, and hybridization.",
    topics: ["Bonding", "VSEPR Geometry", "Hybridization"],
    subtopics: [
      "Ionic Bonding",
      "Covalent Bonding",
      "Polarity",
      "Lewis Structures",
      "Sigma and Pi Bonds",
      "Electron Domains",
      "Molecular Geometry",
      "Lone Pair Repulsion",
      "Bond Angles",
      "sp",
      "sp2",
      "sp3",
      "Expanded Octet",
    ],
    suggestedQuestionTypes: ["Multiple choice", "Short answer", "Explanation prompt"],
  },
  {
    id: "energetics",
    title: "Energetics and Thermochemistry",
    description: "Heat, enthalpy, entropy, Gibbs free energy, Hess Law, and calorimetry.",
    topics: ["Thermodynamics"],
    subtopics: ["Enthalpy", "Entropy", "Gibbs Free Energy", "Hess Law", "Calorimetry"],
    suggestedQuestionTypes: ["Short answer", "Explanation prompt"],
  },
  {
    id: "kinetics",
    title: "Kinetics",
    description: "Rates, mechanisms, activation energy, and collision theory.",
    topics: ["Kinetics"],
    subtopics: ["Rate Laws", "Activation Energy", "Reaction Mechanisms", "Collision Theory"],
    suggestedQuestionTypes: ["Multiple choice", "Short answer"],
  },
  {
    id: "equilibrium",
    title: "Equilibrium",
    description: "Equilibrium constants, reaction quotient, ICE tables, and Le Chatelier reasoning.",
    topics: ["Equilibrium"],
    subtopics: ["Equilibrium Constant", "Le Chatelier Principle", "ICE Tables", "Reaction Quotient"],
    suggestedQuestionTypes: ["Multiple choice", "Short answer"],
  },
  {
    id: "acids-bases",
    title: "Acids and Bases",
    description: "pH, pKa, strong/weak acids and bases, buffers, and titrations.",
    topics: ["Acids and Bases"],
    subtopics: ["pH", "pKa", "Strong and Weak Acids", "Buffers", "Titrations"],
    suggestedQuestionTypes: ["Multiple choice", "Short answer"],
  },
  {
    id: "organic-chemistry",
    title: "Organic Chemistry",
    description: "Functional groups, IR identification, organic reactions, mechanisms, and organic structure interpretation.",
    topics: ["Functional Group Identification", "Spectroscopy", "IR Spectroscopy", "Organic Reactions", "Organic Mechanisms"],
    subtopics: [
      "IR Spectroscopy",
      "Alcohols",
      "Aldehydes",
      "Ketones",
      "Carboxylic Acids",
      "Esters",
      "Amides",
      "Amines",
      "Haloalkanes",
      "Carbonyl Identification",
      "O-H Stretch",
      "N-H Stretch",
      "C triple N Stretch",
      "Aromatic Peaks",
      "Esterification",
      "Substitution",
      "Addition",
      "Elimination",
      "Oxidation",
      "Alkene Bromination",
      "Alkene Hydration",
      "Alkene Hydrogenation",
      "SN1",
      "SN2",
      "E1",
      "E2",
      "Alcohol Oxidation",
      "Carboxylic Acid Formation",
    ],
    suggestedQuestionTypes: ["Multiple choice", "Explanation prompt", "Next step prediction"],
  },
  {
    id: "measurement-data",
    title: "Measurement and Data Processing",
    description: "Graph interpretation, data quality, and evidence-based chemistry reasoning.",
    topics: ["Thermodynamics", "Kinetics", "Spectroscopy", "IR Spectroscopy"],
    subtopics: ["Calorimetry", "Rate Laws", "IR Spectroscopy", "Carbonyl Identification", "Aromatic Peaks"],
    suggestedQuestionTypes: ["Short answer", "Explanation prompt"],
  },
]

function unitById(id: string): CurriculumUnit {
  const unit = CORE_UNITS.find((item) => item.id === id)
  if (!unit) throw new Error(`Unknown curriculum unit: ${id}`)
  return unit
}

function makeCurriculum(input: {
  id: CurriculumId
  name: string
  description: string
  level: string
  unitIds: string[]
  questionStyleNotes: string
}): Curriculum {
  const units = input.unitIds.map(unitById)
  const topics = Array.from(new Set(units.flatMap((unit) => unit.topics)))
  const subtopics = Array.from(new Set(units.flatMap((unit) => unit.subtopics)))

  return {
    id: input.id,
    name: input.name,
    description: input.description,
    level: input.level,
    units,
    topics,
    subtopics,
    recommendedOrder: units.map((unit) => unit.id),
    questionStyleNotes: input.questionStyleNotes,
    disclaimer: DISCLAIMER,
  }
}

export const CURRICULA: Curriculum[] = [
  makeCurriculum({
    id: "general-first-year",
    name: "General First-Year Chemistry",
    description: "A broad first-year chemistry path focused on foundations, trends, bonding, energy, and reactions.",
    level: "High school to first-year university",
    unitIds: [
      "stoichiometry",
      "chemical-reactions",
      "atomic-structure",
      "periodicity",
      "bonding-structure",
      "energetics",
      "kinetics",
      "equilibrium",
      "acids-bases",
      "organic-chemistry",
    ],
    questionStyleNotes: "Use clear conceptual questions mixed with light calculation and explanation prompts.",
  }),
  makeCurriculum({
    id: "chem-121",
    name: "CHEM 121 Style",
    description: "First-year university chemistry emphasis for structure, bonding, energy, equilibrium, and data.",
    level: "First-year university",
    unitIds: [
      "stoichiometry",
      "chemical-reactions",
      "atomic-structure",
      "periodicity",
      "bonding-structure",
      "energetics",
      "kinetics",
      "equilibrium",
      "acids-bases",
      "measurement-data",
    ],
    questionStyleNotes: "Use university-style conceptual reasoning, calculations, and structured short answers.",
  }),
  makeCurriculum({
    id: "ib-chemistry",
    name: "IB Chemistry Style",
    description: "IB-style chemistry alignment with stoichiometry, structure, bonding, energetics, kinetics, equilibrium, acids/bases, organic chemistry, and data processing.",
    level: "IB SL/HL style",
    unitIds: [
      "stoichiometry",
      "chemical-reactions",
      "atomic-structure",
      "periodicity",
      "bonding-structure",
      "energetics",
      "kinetics",
      "equilibrium",
      "acids-bases",
      "organic-chemistry",
      "measurement-data",
    ],
    questionStyleNotes: "Use command-term style explanations without claiming official IB syllabus or exam status.",
  }),
  makeCurriculum({
    id: "ap-chemistry",
    name: "AP Chemistry Style",
    description: "AP-style chemistry alignment with models, representations, calculations, and evidence-based reasoning.",
    level: "AP Chemistry style",
    unitIds: [
      "atomic-structure",
      "periodicity",
      "bonding-structure",
      "stoichiometry",
      "chemical-reactions",
      "energetics",
      "kinetics",
      "equilibrium",
      "acids-bases",
      "measurement-data",
    ],
    questionStyleNotes: "Use model-based multiple choice and short-response reasoning without claiming official College Board material.",
  }),
  makeCurriculum({
    id: "a-level-chemistry",
    name: "A-Level Chemistry Style",
    description: "A-Level style chemistry path with core physical, inorganic, analytical, and organic chemistry foundations.",
    level: "A-Level style",
    unitIds: [
      "stoichiometry",
      "chemical-reactions",
      "atomic-structure",
      "bonding-structure",
      "periodicity",
      "energetics",
      "kinetics",
      "equilibrium",
      "acids-bases",
      "organic-chemistry",
    ],
    questionStyleNotes: "Use concise structured questions with calculation and explanation prompts without claiming official Cambridge or exam-board coverage.",
  }),
]

export function listCurricula(): Curriculum[] {
  return CURRICULA
}

export function isCurriculumId(value: string): value is CurriculumId {
  return CURRICULA.some((curriculum) => curriculum.id === value)
}

export function getCurriculum(id: string | null | undefined): Curriculum {
  return CURRICULA.find((curriculum) => curriculum.id === id) ?? CURRICULA[0]
}

export function findUnit(curriculum: Curriculum, unitId: string | null | undefined): CurriculumUnit | null {
  if (!unitId || unitId === "all") return null
  return curriculum.units.find((unit) => unit.id === unitId) ?? null
}

export function getUnitForTopic(curriculum: Curriculum, topic: string, subtopic?: string): CurriculumUnit | null {
  return curriculum.units.find((unit) => {
    const topicMatch = unit.topics.includes(topic)
    const subtopicMatch = subtopic ? unit.subtopics.includes(subtopic) : false
    return topicMatch || subtopicMatch
  }) ?? null
}

export function getTopicsForUnit(curriculum: Curriculum, unitId: string | null | undefined): string[] {
  const unit = findUnit(curriculum, unitId)
  return unit ? unit.topics : curriculum.topics
}

export function getSubtopicsForCurriculumTopic(
  curriculum: Curriculum,
  topic: string | null | undefined,
  unitId?: string | null,
): string[] {
  const unit = findUnit(curriculum, unitId)
  if (!topic || topic === "all") return unit ? unit.subtopics : curriculum.subtopics
  const units = unit ? [unit] : curriculum.units
  return Array.from(
    new Set(
      units
        .filter((item) => item.topics.includes(topic))
        .flatMap((item) => item.subtopics),
    ),
  )
}

export function getUnitStatus(mastery: number, attempted: number): CurriculumUnitStatus {
  if (attempted === 0) return "Not Started"
  if (mastery < 40) return "Needs Intervention"
  if (mastery < 60) return "Developing"
  if (mastery < 80) return "Competent"
  if (mastery < 90) return "Strong"
  return "Mastered"
}

export function calculateCurriculumProgress(
  entries: CurriculumProgressEntry[],
  curriculumId: string | null | undefined,
): CurriculumProgressSummary {
  const curriculum = getCurriculum(curriculumId)
  const units = curriculum.units.map((unit) => {
    const unitEntries = entries.filter((entry) => {
      const subtopic = entry.subtopic ?? ""
      return unit.topics.includes(entry.topic) || unit.subtopics.includes(subtopic)
    })
    const attempted = unitEntries.length
    const correct = unitEntries.filter((entry) => entry.correct).length
    const mastery = attempted ? Math.round((correct / attempted) * 100) : 0

    return {
      unit,
      attempted,
      correct,
      missed: attempted - correct,
      mastery,
      status: getUnitStatus(mastery, attempted),
    }
  })

  const totalAttempted = units.reduce((sum, unit) => sum + unit.attempted, 0)
  const totalCorrect = units.reduce((sum, unit) => sum + unit.correct, 0)
  const overallProgress = totalAttempted ? Math.round((totalCorrect / totalAttempted) * 100) : 0
  const attemptedUnits = units.filter((unit) => unit.attempted > 0)
  const weakestUnit = [...attemptedUnits].sort((a, b) => a.mastery - b.mastery || b.attempted - a.attempted)[0] ?? null
  const strongestUnit = [...attemptedUnits].sort((a, b) => b.mastery - a.mastery || b.attempted - a.attempted)[0] ?? null
  const recommendedNextUnit =
    units.find((unit) => unit.attempted === 0) ??
    [...units].sort((a, b) => a.mastery - b.mastery || b.attempted - a.attempted)[0] ??
    null
  const diagnosticEntries = entries.filter((entry) => entry.questionType === "Diagnostic")
  const diagnosticCoveredUnitIds = new Set(
    diagnosticEntries
      .map((entry) => getUnitForTopic(curriculum, entry.topic, entry.subtopic)?.id)
      .filter((value): value is string => Boolean(value)),
  )

  return {
    curriculum,
    overallProgress,
    totalAttempted,
    totalCorrect,
    units,
    weakestUnit,
    strongestUnit,
    recommendedNextUnit,
    unitsMastered: units.filter((unit) => unit.status === "Mastered").length,
    unitsNeedingWork: units.filter((unit) =>
      ["Needs Intervention", "Developing"].includes(unit.status),
    ).length,
    diagnosticCoverage: curriculum.units.length
      ? Math.round((diagnosticCoveredUnitIds.size / curriculum.units.length) * 100)
      : 0,
  }
}
