import { SPECTROSCOPY_RECORDS } from "@/lib/chemistry/spectroscopy"
import { getSpectroscopyMapping } from "@/lib/chemistry/structures"
import type { IRPeak, SpectroscopyRecord } from "@/lib/chemistry/spectroscopy-types"
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

function recordFromContext(context: QuestionTemplateContext): SpectroscopyRecord | null {
  const requested = context.targetSubtopic && context.targetSubtopic !== "all" ? normalize(context.targetSubtopic) : ""
  const direct =
    SPECTROSCOPY_RECORDS.find((record) =>
      [record.name, record.functionalGroup, ...record.aliases].some((value) => normalize(value).includes(requested)),
    ) ?? null
  return direct ?? pick(SPECTROSCOPY_RECORDS, context.index * 3 + 1)
}

function buildSpectroscopyQuestion(input: {
  id: string
  context: QuestionTemplateContext
  record: SpectroscopyRecord
  question: string
  correctText: string
  wrongTexts: string[]
  explanation: string
  misconceptionNote?: string
}): Question | null {
  const choices = labeledChoices(input.correctText, input.wrongTexts, input.context.index)
  if (!choices) return null
  const visualMapping = getSpectroscopyMapping(input.record.id)

  return {
    id: `db-ir-${input.id}-${input.context.index}`,
    topic: "Spectroscopy",
    subtopic: "IR Spectroscopy",
    questionType: "Multiple choice",
    difficulty: input.context.difficulty,
    curriculumStyle: input.context.curriculum ?? "Database Generated",
    question: input.question,
    choices: choices.choices,
    correctAnswer: choices.correctAnswer,
    explanation: input.explanation,
    misconceptionNote: input.misconceptionNote,
    source: "database",
    sourceEntry: { kind: "spectroscopy", id: input.record.id, name: input.record.name },
    visualCompoundId: visualMapping?.exampleCompoundId,
    visualHighlightGroup: visualMapping?.highlightGroup,
  }
}

function allRecordNamesExcept(record: SpectroscopyRecord): string[] {
  return SPECTROSCOPY_RECORDS.filter((item) => item.id !== record.id).map((item) => item.name)
}

function allAssignmentsExcept(peak: IRPeak): string[] {
  return uniqueBy(
    SPECTROSCOPY_RECORDS.flatMap((record) => record.irPeaks).filter((item) => item.id !== peak.id),
    (item) => item.assignment,
  ).map((item) => item.assignment)
}

function formatPeak(peak: IRPeak): string {
  return `${peak.range}, ${peak.shape}, ${peak.strength}`
}

function buildIrPeakRecognitionQuestion(context: QuestionTemplateContext): Question | null {
  const record = recordFromContext(context)
  if (!record) return null
  const peak = pick(record.irPeaks, context.index)
  if (!peak) return null

  return buildSpectroscopyQuestion({
    id: `peak-recognition-${record.id}-${peak.id}`,
    context,
    record,
    question: `An IR spectrum has a ${formatPeak(peak)} absorption assigned to ${peak.assignment}. Which functional group is most consistent with this clue?`,
    correctText: record.name,
    wrongTexts: allRecordNamesExcept(record),
    explanation: `${record.name} commonly show ${peak.assignment} near ${peak.range}. ${record.notes}`,
    misconceptionNote: "Use both the range and the shape; broad O-H and sharp carbonyl peaks can be easy to mix up.",
  })
}

function buildFunctionalGroupIdentificationQuestion(context: QuestionTemplateContext): Question | null {
  const record = recordFromContext(context)
  if (!record) return null
  const peakSummary = record.irPeaks.slice(0, 2).map(formatPeak).join(" and ")

  return buildSpectroscopyQuestion({
    id: `group-identification-${record.id}`,
    context,
    record,
    question: `An unknown compound shows IR absorptions at ${peakSummary}. Which functional group is the best match?`,
    correctText: record.name,
    wrongTexts: allRecordNamesExcept(record),
    explanation: `${record.name} are best matched because their characteristic absorptions include ${record.irPeaks.map((peak) => peak.assignment).join(" and ")}.`,
  })
}

function buildPeakAssignmentQuestion(context: QuestionTemplateContext): Question | null {
  const record = recordFromContext(context)
  if (!record) return null
  const peak = pick(record.irPeaks, context.index * 2)
  if (!peak) return null

  return buildSpectroscopyQuestion({
    id: `peak-assignment-${record.id}-${peak.id}`,
    context,
    record,
    question: `What is the most likely assignment for an IR peak at ${peak.range} that is ${peak.shape} and ${peak.strength}?`,
    correctText: peak.assignment,
    wrongTexts: allAssignmentsExcept(peak),
    explanation: `${peak.range} with a ${peak.shape} ${peak.strength} peak is characteristic of ${peak.assignment} in ${record.name.toLowerCase()}.`,
  })
}

function buildCompoundEliminationQuestion(context: QuestionTemplateContext): Question | null {
  const record = recordFromContext(context)
  if (!record) return null
  const absent = pick(SPECTROSCOPY_RECORDS.filter((item) => item.id !== record.id), context.index + 5)
  if (!absent) return null
  const strongest = record.irPeaks[0]
  if (!strongest) return null

  return buildSpectroscopyQuestion({
    id: `compound-elimination-${record.id}-${absent.id}`,
    context,
    record,
    question: `An unknown has ${formatPeak(strongest)} and does not show the key ${absent.peakRange} signal expected for ${absent.name.toLowerCase()}. Which classification is most reasonable?`,
    correctText: record.name,
    wrongTexts: allRecordNamesExcept(record),
    explanation: `The observed ${strongest.assignment} supports ${record.name.toLowerCase()}, while the missing ${absent.peakRange} feature makes ${absent.name.toLowerCase()} less likely.`,
  })
}

function buildSpectralMatchingQuestion(context: QuestionTemplateContext): Question | null {
  const record = recordFromContext(context)
  if (!record) return null
  const example = pick(record.exampleCompounds, context.index)
  if (!example) return null
  const correctText = `${record.peakRange}; ${record.peakShape}; ${record.irPeaks[0]?.assignment ?? record.functionalGroup}`
  const wrongTexts = SPECTROSCOPY_RECORDS.filter((item) => item.id !== record.id).map(
    (item) => `${item.peakRange}; ${item.peakShape}; ${item.irPeaks[0]?.assignment ?? item.functionalGroup}`,
  )

  return buildSpectroscopyQuestion({
    id: `spectral-matching-${record.id}-${example}`,
    context,
    record,
    question: `Which simplified IR spectrum best matches ${example}, treated as a representative ${record.functionalGroup}?`,
    correctText,
    wrongTexts,
    explanation: `${example} is represented by ${record.name.toLowerCase()}, whose key IR clue is ${record.peakRange} (${record.peakShape}, ${record.peakStrength}).`,
  })
}

export const SPECTROSCOPY_QUESTION_TEMPLATES: QuestionTemplate[] = [
  {
    id: "ir-peak-recognition",
    name: "IR Peak Recognition",
    description: "Identify a functional group from an IR range, shape, strength, and assignment.",
    supportedTopics: ["Spectroscopy", "IR Spectroscopy"],
    supportedSubtopics: ["IR Spectroscopy", "Carbonyl Identification", "O-H Stretch", "N-H Stretch", "C triple N Stretch", "Aromatic Peaks"],
    estimatedCombinations: SPECTROSCOPY_RECORDS.reduce((sum, record) => sum + record.irPeaks.length, 0) * 2,
    build: buildIrPeakRecognitionQuestion,
  },
  {
    id: "ir-functional-group-identification",
    name: "Functional Group Identification",
    description: "Classify an unknown from characteristic IR absorptions.",
    supportedTopics: ["Spectroscopy", "IR Spectroscopy", "Functional Group Identification"],
    supportedSubtopics: ["IR Spectroscopy", "Carbonyl Identification", "Alcohols", "Aldehydes", "Ketones", "Esters", "Amines", "Amides"],
    estimatedCombinations: SPECTROSCOPY_RECORDS.length * 4,
    build: buildFunctionalGroupIdentificationQuestion,
  },
  {
    id: "ir-peak-assignment",
    name: "Peak Assignment",
    description: "Match an IR peak to the bond vibration or functional group assignment.",
    supportedTopics: ["Spectroscopy", "IR Spectroscopy"],
    supportedSubtopics: ["IR Spectroscopy", "Carbonyl Identification", "O-H Stretch", "N-H Stretch", "C triple N Stretch", "Aromatic Peaks"],
    estimatedCombinations: SPECTROSCOPY_RECORDS.reduce((sum, record) => sum + record.irPeaks.length, 0),
    build: buildPeakAssignmentQuestion,
  },
  {
    id: "ir-compound-elimination",
    name: "Compound Elimination",
    description: "Use present and absent IR clues to rule out a functional group.",
    supportedTopics: ["Spectroscopy", "IR Spectroscopy"],
    supportedSubtopics: ["IR Spectroscopy", "Carbonyl Identification", "O-H Stretch", "N-H Stretch"],
    estimatedCombinations: SPECTROSCOPY_RECORDS.length * (SPECTROSCOPY_RECORDS.length - 1),
    build: buildCompoundEliminationQuestion,
  },
  {
    id: "ir-spectral-matching",
    name: "Spectral Matching",
    description: "Choose the simplified IR spectrum that best matches a representative compound.",
    supportedTopics: ["Spectroscopy", "IR Spectroscopy", "Functional Group Identification"],
    supportedSubtopics: ["IR Spectroscopy", "Aromatic Peaks", "Carbonyl Identification"],
    estimatedCombinations: SPECTROSCOPY_RECORDS.reduce((sum, record) => sum + record.exampleCompounds.length, 0),
    build: buildSpectralMatchingQuestion,
  },
]

export function getSpectroscopyTemplateStats() {
  return {
    templates: SPECTROSCOPY_QUESTION_TEMPLATES.length,
    estimatedCombinations: SPECTROSCOPY_QUESTION_TEMPLATES.reduce(
      (sum, template) => sum + template.estimatedCombinations,
      0,
    ),
  }
}
