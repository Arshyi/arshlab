import { LAB_TECHNIQUES } from "@/lib/lab/lab-database"
import { LAB_CATEGORIES, getLabMetrics } from "@/lib/lab/lab-engine"
import type { LabTechniqueRecord } from "@/lib/lab/lab-types"
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

function recordFromContext(context: QuestionTemplateContext): LabTechniqueRecord | null {
  const requested = normalize(`${context.targetSubtopic ?? ""} ${context.questionType ?? ""}`)
  const direct = requested
    ? LAB_TECHNIQUES.find((record) =>
        [record.id, record.name, record.category, ...record.aliases].some((value) =>
          normalize(value).includes(requested),
        ),
      )
    : undefined
  if (direct) return direct

  const byCategory = LAB_CATEGORIES.find((category) => requested.includes(normalize(category)))
  const records = byCategory ? LAB_TECHNIQUES.filter((record) => record.category === byCategory) : LAB_TECHNIQUES
  return pick(records, context.index * 3 + 1)
}

function buildLabQuestion(input: {
  id: string
  context: QuestionTemplateContext
  record: LabTechniqueRecord
  question: string
  correctText: string
  wrongTexts: string[]
  explanation: string
  misconceptionNote?: string
}): Question | null {
  const choices = labeledChoices(input.correctText, input.wrongTexts, input.context.index)
  if (!choices) return null
  return {
    id: `db-lab-${input.id}-${input.context.index}`,
    topic: "Lab Skills",
    subtopic: input.record.name,
    questionType: "Multiple choice",
    difficulty: input.context.difficulty,
    curriculumStyle: input.context.curriculum ?? "Database Generated",
    question: input.question,
    choices: choices.choices,
    correctAnswer: choices.correctAnswer,
    explanation: input.explanation,
    misconceptionNote: input.misconceptionNote,
    source: "database",
    sourceEntry: { kind: "lab-technique", id: input.record.id, name: input.record.name },
  }
}

function allTechniqueNamesExcept(record: LabTechniqueRecord): string[] {
  return LAB_TECHNIQUES.filter((item) => item.id !== record.id).map((item) => item.name)
}

function allSafetyNotesExcept(record: LabTechniqueRecord): string[] {
  return uniqueBy(
    LAB_TECHNIQUES.flatMap((item) => item.safetyNotes).filter((note) => !record.safetyNotes.includes(note)),
    normalize,
  )
}

function allMistakesExcept(record: LabTechniqueRecord): string[] {
  return uniqueBy(
    LAB_TECHNIQUES.flatMap((item) => item.commonMistakes).filter((mistake) => !record.commonMistakes.includes(mistake)),
    normalize,
  )
}

function allEquipmentExcept(record: LabTechniqueRecord): string[] {
  return uniqueBy(
    LAB_TECHNIQUES.flatMap((item) => item.equipment).filter((item) => !record.equipment.includes(item)),
    normalize,
  )
}

function buildTechniqueSelectionQuestion(context: QuestionTemplateContext): Question | null {
  const record = recordFromContext(context)
  if (!record) return null
  return buildLabQuestion({
    id: `technique-selection-${record.id}`,
    context,
    record,
    question: `Which lab technique is best suited for this purpose: ${record.purpose}`,
    correctText: record.name,
    wrongTexts: allTechniqueNamesExcept(record),
    explanation: `${record.name} is used because: ${record.purpose}`,
    misconceptionNote: "Choose the technique from the lab goal, not only from one piece of equipment.",
  })
}

function buildSafetyQuestion(context: QuestionTemplateContext): Question | null {
  const safetyRecords = LAB_TECHNIQUES.filter((record) => record.safetyNotes.length > 0)
  const record = pick(safetyRecords, context.index * 5 + 2)
  const correctText = pick(record?.safetyNotes ?? [], context.index)
  if (!record || !correctText) return null
  return buildLabQuestion({
    id: `safety-${record.id}`,
    context,
    record,
    question: `Which safety note is most relevant when performing ${record.name}?`,
    correctText,
    wrongTexts: allSafetyNotesExcept(record),
    explanation: `${record.name} involves ${record.equipment.slice(0, 3).join(", ")}, so the relevant safety control is: ${correctText}.`,
    misconceptionNote: "Lab safety questions usually ask for a control that matches the specific hazard.",
  })
}

function buildGlasswareQuestion(context: QuestionTemplateContext): Question | null {
  const record = recordFromContext(context)
  if (!record) return null
  const correctText = pick(record.equipment, context.index)
  if (!correctText) return null
  return buildLabQuestion({
    id: `glassware-${record.id}-${correctText}`,
    context,
    record,
    question: `Which piece of equipment is commonly used for ${record.name}?`,
    correctText,
    wrongTexts: allEquipmentExcept(record),
    explanation: `${correctText} appears in the standard equipment list for ${record.name}.`,
    misconceptionNote: "Precise-volume work uses volumetric glassware; mixing vessels are usually less precise.",
  })
}

function buildErrorAnalysisQuestion(context: QuestionTemplateContext): Question | null {
  const record = recordFromContext(context)
  if (!record) return null
  const correctText = pick(record.commonMistakes, context.index)
  if (!correctText) return null
  return buildLabQuestion({
    id: `error-analysis-${record.id}`,
    context,
    record,
    question: `Which mistake would most likely reduce accuracy or reliability in ${record.name}?`,
    correctText,
    wrongTexts: allMistakesExcept(record),
    explanation: `${correctText} is a known mistake for ${record.name}. It can bias measurements, reduce yield, or make observations unreliable.`,
    misconceptionNote: "Error analysis is about how the procedure changes the measured result, not just whether the work looks tidy.",
  })
}

function buildMeniscusTitrationQuestion(context: QuestionTemplateContext): Question | null {
  const concepts = [
    {
      record: LAB_TECHNIQUES.find((record) => record.id === "meniscus-reading"),
      question: "When reading an aqueous meniscus in a burette or measuring cylinder, what should be read?",
      correctText: "The bottom of the meniscus at eye level",
      wrongTexts: ["The top of the meniscus from above", "The side of the liquid curve", "The nearest whole-number mark"],
      explanation: "Reading the bottom of the meniscus at eye level reduces parallax error for most aqueous solutions.",
    },
    {
      record: LAB_TECHNIQUES.find((record) => record.id === "titration"),
      question: "Why are concordant titres used in a titration calculation?",
      correctText: "They show repeatable measurements close enough to average",
      wrongTexts: ["They are always the first rough titre", "They remove the need for a balanced equation", "They make the indicator unnecessary"],
      explanation: "Concordant titres show that the endpoint was reached reproducibly, so their mean is more reliable.",
    },
    {
      record: LAB_TECHNIQUES.find((record) => record.id === "burette-reading"),
      question: "How is the volume delivered from a burette calculated?",
      correctText: "Final reading minus initial reading",
      wrongTexts: ["Initial reading minus final reading", "Initial reading plus final reading", "Only the final reading is used"],
      explanation: "A burette reading increases as liquid is delivered, so titre equals final reading minus initial reading.",
    },
  ]
  const concept = concepts[Math.abs(context.index) % concepts.length]
  if (!concept.record) return null
  return buildLabQuestion({
    id: `meniscus-titration-${concept.record.id}`,
    context,
    record: concept.record,
    question: concept.question,
    correctText: concept.correctText,
    wrongTexts: concept.wrongTexts,
    explanation: concept.explanation,
    misconceptionNote: "Most volumetric errors come from parallax, endpoint overshoot, rinsing, or incorrect subtraction.",
  })
}

const labTopics = [
  "Lab Skills",
  "Laboratory Skills",
  "Laboratory Techniques",
  "Lab Safety",
  "Chemistry Lab",
  "Measurement and Data Processing",
  "Acids and Bases",
  "Stoichiometry",
  "Spectroscopy",
  "Organic Reactions",
]

export const LAB_QUESTION_TEMPLATES: QuestionTemplate[] = [
  {
    id: "lab-technique-selection",
    name: "Technique Selection",
    description: "Choose the best laboratory technique for a stated purpose.",
    supportedTopics: labTopics,
    supportedSubtopics: ["Technique Selection", ...LAB_TECHNIQUES.map((record) => record.name), ...LAB_CATEGORIES],
    estimatedCombinations: LAB_TECHNIQUES.length * 4,
    build: buildTechniqueSelectionQuestion,
  },
  {
    id: "lab-safety",
    name: "Lab Safety",
    description: "Choose a safety control that matches a lab technique hazard.",
    supportedTopics: labTopics,
    supportedSubtopics: ["Lab Safety", "Safety Symbols", "PPE", "Waste Disposal", "Safety"],
    estimatedCombinations: getLabMetrics().safetyRecords * 4,
    build: buildSafetyQuestion,
  },
  {
    id: "lab-glassware-identification",
    name: "Glassware Identification",
    description: "Identify common glassware and equipment for a technique.",
    supportedTopics: labTopics,
    supportedSubtopics: ["Glassware", "Common Lab Glassware", "Equipment"],
    estimatedCombinations: getLabMetrics().equipmentItems * 2,
    build: buildGlasswareQuestion,
  },
  {
    id: "lab-error-analysis",
    name: "Error Analysis",
    description: "Identify common procedural mistakes and their impact.",
    supportedTopics: labTopics,
    supportedSubtopics: ["Error Analysis", "Common Mistakes", ...LAB_TECHNIQUES.map((record) => record.name)],
    estimatedCombinations: LAB_TECHNIQUES.reduce((sum, record) => sum + record.commonMistakes.length, 0),
    build: buildErrorAnalysisQuestion,
  },
  {
    id: "lab-meniscus-titration",
    name: "Meniscus and Titration Concepts",
    description: "Ask core conceptual questions about meniscus reading, burettes, and titres.",
    supportedTopics: labTopics,
    supportedSubtopics: ["Titration", "Burette Reading", "Meniscus Reading", "Volumetric Analysis"],
    estimatedCombinations: 24,
    build: buildMeniscusTitrationQuestion,
  },
]
