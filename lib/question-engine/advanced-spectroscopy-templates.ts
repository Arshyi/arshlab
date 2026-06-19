import {
  getSpectroscopySignal,
  listCompoundSpectroscopyProfiles,
  listSpectroscopySignals,
} from "@/lib/spectroscopy/spectroscopy-engine"
import type { SpectroscopyCategory, SpectroscopySignalRecord } from "@/lib/spectroscopy/spectroscopy-types"
import type { Question, QuestionChoice, QuestionTemplate, QuestionTemplateContext } from "./types"

const choiceLabels = ["A", "B", "C", "D"]

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

function pick<T>(items: T[], index: number): T | null {
  if (!items.length) return null
  return items[Math.abs(index) % items.length]
}

function uniqueBy<T>(items: T[], key: (item: T) => string): T[] {
  const seen = new Set<string>()
  const output: T[] = []
  for (const item of items) {
    const value = key(item)
    if (!seen.has(value)) {
      seen.add(value)
      output.push(item)
    }
  }
  return output
}

function labeledChoices(correctText: string, wrongTexts: string[], seed: number): {
  choices: QuestionChoice[]
  correctAnswer: string
} | null {
  const wrongs = uniqueBy(
    wrongTexts.filter((text) => normalize(text) !== normalize(correctText)),
    normalize,
  ).slice(0, 3)
  if (wrongs.length < 3) return null

  const correctIndex = Math.abs(seed) % 4
  const texts = [...wrongs]
  texts.splice(correctIndex, 0, correctText)
  return {
    choices: texts.map((text, index) => ({ label: choiceLabels[index], text })),
    correctAnswer: `${choiceLabels[correctIndex]}. ${correctText}`,
  }
}

function categoryFromContext(context: QuestionTemplateContext, fallback: SpectroscopyCategory): SpectroscopyCategory {
  const requested = normalize(`${context.topic} ${context.targetSubtopic ?? ""} ${context.questionType ?? ""}`)
  if (requested.includes("mass")) return "Mass Spec"
  if (requested.includes("13c") || requested.includes("carbon nmr")) return "13C NMR"
  if (requested.includes("1h") || requested.includes("proton") || requested.includes("nmr")) return "1H NMR"
  if (requested.includes("ir") || requested.includes("infrared")) return "IR"
  return fallback
}

function recordFromContext(context: QuestionTemplateContext, fallback: SpectroscopyCategory): SpectroscopySignalRecord | null {
  const requested = context.targetSubtopic && context.targetSubtopic !== "all" ? context.targetSubtopic : ""
  const direct = requested ? getSpectroscopySignal(requested) : undefined
  if (direct) return direct
  const category = categoryFromContext(context, fallback)
  return pick(listSpectroscopySignals(category), context.index * 3 + 1)
}

function wrongSignalNames(record: SpectroscopySignalRecord): string[] {
  return listSpectroscopySignals(record.category)
    .filter((item) => item.id !== record.id)
    .map((item) => item.signal)
}

function wrongFunctionalGroups(record: SpectroscopySignalRecord): string[] {
  return uniqueBy(
    listSpectroscopySignals(record.category).filter((item) => item.id !== record.id),
    (item) => item.functionalGroup,
  ).map((item) => item.functionalGroup)
}

function buildQuestion(input: {
  id: string
  context: QuestionTemplateContext
  record: SpectroscopySignalRecord
  question: string
  correctText: string
  wrongTexts: string[]
  explanation: string
  misconceptionNote?: string
}): Question | null {
  const choices = labeledChoices(input.correctText, input.wrongTexts, input.context.index)
  if (!choices) return null
  return {
    id: `db-spectroscopy-${input.id}-${input.context.index}`,
    topic: "Spectroscopy",
    subtopic: input.record.signal,
    questionType: "Multiple choice",
    difficulty: input.context.difficulty,
    curriculumStyle: input.context.curriculum ?? "Database Generated",
    question: input.question,
    choices: choices.choices,
    correctAnswer: choices.correctAnswer,
    explanation: input.explanation,
    misconceptionNote: input.misconceptionNote,
    source: "database",
    sourceEntry: { kind: "spectroscopy", id: input.record.id, name: input.record.signal },
  }
}

function buildIrFunctionalGroupQuestion(context: QuestionTemplateContext): Question | null {
  const record = recordFromContext(context, "IR")
  if (!record) return null
  return buildQuestion({
    id: `ir-group-${record.id}`,
    context,
    record,
    question: `Which functional group is most commonly associated with a ${record.signal} at ${record.range}?`,
    correctText: record.functionalGroup,
    wrongTexts: wrongFunctionalGroups(record),
    explanation: `${record.signal} at ${record.range} is associated with ${record.functionalGroup}. ${record.examClues[0] ?? record.explanation}`,
    misconceptionNote: "Use the range and shape together; one signal alone may not fully identify a molecule.",
  })
}

function buildIrExamClueQuestion(context: QuestionTemplateContext): Question | null {
  const record = recordFromContext(context, "IR")
  if (!record) return null
  const clue = pick(record.examClues, context.index) ?? record.explanation
  return buildQuestion({
    id: `ir-clue-${record.id}`,
    context,
    record,
    question: `An IR spectrum shows this exam clue: "${clue}" Which assignment best matches it?`,
    correctText: record.signal,
    wrongTexts: wrongSignalNames(record),
    explanation: `${record.signal} fits because ${record.explanation}`,
  })
}

function buildProtonNmrQuestion(context: QuestionTemplateContext): Question | null {
  const record = recordFromContext(context, "1H NMR")
  if (!record) return null
  return buildQuestion({
    id: `h-nmr-${record.id}`,
    context,
    record,
    question: `A 1H NMR signal appears at ${record.range}. Which proton environment is the best match?`,
    correctText: record.signal,
    wrongTexts: wrongSignalNames(record),
    explanation: `${record.signal} is expected around ${record.range}. ${record.explanation}`,
    misconceptionNote: "Integration tells how many equivalent hydrogens contribute; splitting reflects neighboring hydrogens.",
  })
}

function buildCarbonNmrQuestion(context: QuestionTemplateContext): Question | null {
  const record = recordFromContext(context, "13C NMR")
  if (!record) return null
  return buildQuestion({
    id: `c-nmr-${record.id}`,
    context,
    record,
    question: `A 13C NMR signal appears at ${record.range}. Which carbon environment is most likely?`,
    correctText: record.signal,
    wrongTexts: wrongSignalNames(record),
    explanation: `${record.signal} is consistent with ${record.range}. ${record.explanation}`,
    misconceptionNote: "13C NMR is usually interpreted by carbon environments, not integration ratios like 1H NMR.",
  })
}

function buildMassSpecQuestion(context: QuestionTemplateContext): Question | null {
  const record = recordFromContext(context, "Mass Spec")
  if (!record) return null
  return buildQuestion({
    id: `mass-spec-${record.id}`,
    context,
    record,
    question: `In mass spectrometry, which interpretation matches ${record.range}?`,
    correctText: record.signal,
    wrongTexts: wrongSignalNames(record),
    explanation: `${record.signal}: ${record.explanation}`,
    misconceptionNote: "The base peak is the tallest peak; it is not automatically the molecular ion.",
  })
}

function buildCompoundSpectraQuestion(context: QuestionTemplateContext): Question | null {
  const profiles = listCompoundSpectroscopyProfiles()
  const profile = pick(profiles, context.index * 5 + 2)
  if (!profile) return null
  const irSignal = getSpectroscopySignal(profile.irSignalIds[0])
  if (!irSignal) return null

  const correctText = profile.compoundName
  const wrongTexts = profiles.filter((item) => item.compoundId !== profile.compoundId).map((item) => item.compoundName)
  return buildQuestion({
    id: `compound-spectra-${profile.compoundId}`,
    context,
    record: irSignal,
    question: `Which compound best matches these expected spectroscopy clues: IR ${irSignal.signal} (${irSignal.range}); 1H NMR ${profile.protonNmr[0]?.environment ?? "known environments"}?`,
    correctText,
    wrongTexts,
    explanation: `${profile.compoundName} is a good match. ${profile.notes}`,
    misconceptionNote: "Use multiple spectra together: IR identifies functional groups, while NMR separates environments.",
  })
}

const spectroscopyTopics = [
  "Spectroscopy",
  "IR Spectroscopy",
  "NMR Spectroscopy",
  "1H NMR",
  "13C NMR",
  "Mass Spectrometry",
  "Mass Spec",
  "Structure Identification",
  "Functional Group Identification",
]

export const ADVANCED_SPECTROSCOPY_QUESTION_TEMPLATES: QuestionTemplate[] = [
  {
    id: "v480-ir-functional-group",
    name: "IR Interpretation",
    description: "Identify the functional group responsible for a diagnostic IR signal.",
    supportedTopics: spectroscopyTopics,
    supportedSubtopics: ["IR Spectroscopy", "Carbonyl", "O-H", "N-H", "C=O", "C=C", "C#C", "C#N", "Aromatic"],
    estimatedCombinations: listSpectroscopySignals("IR").length * 4,
    build: buildIrFunctionalGroupQuestion,
  },
  {
    id: "v480-ir-exam-clue",
    name: "IR Exam Clue",
    description: "Match an exam clue to the correct IR assignment.",
    supportedTopics: spectroscopyTopics,
    supportedSubtopics: ["IR Spectroscopy", "Functional Group Identification"],
    estimatedCombinations: listSpectroscopySignals("IR").reduce((sum, record) => sum + record.examClues.length, 0),
    build: buildIrExamClueQuestion,
  },
  {
    id: "v480-proton-nmr-interpretation",
    name: "1H NMR Interpretation",
    description: "Interpret proton NMR chemical shift, integration, and splitting clues.",
    supportedTopics: spectroscopyTopics,
    supportedSubtopics: ["1H NMR", "Proton NMR", "NMR Interpretation"],
    estimatedCombinations: listSpectroscopySignals("1H NMR").length * 4,
    build: buildProtonNmrQuestion,
  },
  {
    id: "v480-carbon-nmr-interpretation",
    name: "13C NMR Interpretation",
    description: "Interpret carbon NMR environments and carbonyl/aromatic/alkyl ranges.",
    supportedTopics: spectroscopyTopics,
    supportedSubtopics: ["13C NMR", "Carbon NMR", "NMR Interpretation"],
    estimatedCombinations: listSpectroscopySignals("13C NMR").length * 4,
    build: buildCarbonNmrQuestion,
  },
  {
    id: "v480-mass-spec-interpretation",
    name: "Mass Spec Interpretation",
    description: "Interpret molecular ion, base peak, fragments, and isotope patterns.",
    supportedTopics: spectroscopyTopics,
    supportedSubtopics: ["Mass Spectrometry", "Mass Spec", "Molecular Ion", "Base Peak", "Isotope Patterns"],
    estimatedCombinations: listSpectroscopySignals("Mass Spec").length * 4,
    build: buildMassSpecQuestion,
  },
  {
    id: "v480-compound-spectra-matching",
    name: "Expected Compound Spectra",
    description: "Match a compound to combined IR, NMR, and mass spectrometry clues.",
    supportedTopics: spectroscopyTopics,
    supportedSubtopics: ["Compound Spectra", "Structure Identification", "Spectroscopy"],
    estimatedCombinations: listCompoundSpectroscopyProfiles().length * 4,
    build: buildCompoundSpectraQuestion,
  },
]

