import { ORGANIC_MECHANISMS } from "@/lib/chemistry/mechanisms"
import type { MechanismRecord, MechanismStep } from "@/lib/chemistry/mechanism-types"
import type { Question, QuestionChoice, QuestionTemplate, QuestionTemplateContext } from "./types"

const choiceLabels = ["A", "B", "C", "D"]

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

function pick<T>(items: T[], index: number): T | null {
  if (!items.length) return null
  return items[Math.abs(index) % items.length]
}

function unique(values: string[]): string[] {
  const seen = new Set<string>()
  const output: string[] = []
  for (const value of values) {
    const key = normalize(value)
    if (!seen.has(key)) {
      seen.add(key)
      output.push(value)
    }
  }
  return output
}

function labeledChoices(correctText: string, wrongTexts: string[], seed: number): {
  choices: QuestionChoice[]
  correctAnswer: string
} | null {
  const wrongs = unique(wrongTexts.filter((text) => normalize(text) !== normalize(correctText))).slice(0, 3)
  if (wrongs.length < 3) return null

  const correctIndex = Math.abs(seed) % 4
  const texts = [...wrongs]
  texts.splice(correctIndex, 0, correctText)
  const choices = texts.map((text, index) => ({ label: choiceLabels[index], text }))
  return {
    choices,
    correctAnswer: `${choiceLabels[correctIndex]}. ${correctText}`,
  }
}

function mechanismFromContext(context: QuestionTemplateContext): MechanismRecord | null {
  const requested = normalize(context.targetSubtopic ?? "")
  const exact =
    ORGANIC_MECHANISMS.find(
      (mechanism) =>
        normalize(mechanism.name) === requested ||
        normalize(mechanism.category) === requested ||
        normalize(mechanism.id) === requested,
    ) ?? null
  return exact ?? pick(ORGANIC_MECHANISMS, context.index)
}

function mechanismStep(mechanism: MechanismRecord, index: number, needsNextAction = false): MechanismStep | null {
  const steps = needsNextAction ? mechanism.steps.filter((step) => step.nextAction) : mechanism.steps
  return pick(steps, index)
}

function buildMechanismQuestion(input: {
  id: string
  context: QuestionTemplateContext
  mechanism: MechanismRecord
  subtopic: string
  questionType: string
  question: string
  correctText: string
  wrongTexts: string[]
  explanation: string
  misconceptionNote?: string
}): Question | null {
  const labeled = labeledChoices(input.correctText, input.wrongTexts, input.context.index)
  if (!labeled) return null
  return {
    id: `db-mechanism-${input.id}-${input.context.index}`,
    topic: "Organic Mechanisms",
    subtopic: input.subtopic,
    questionType: input.questionType,
    difficulty: input.context.difficulty,
    curriculumStyle: input.context.curriculum ?? "Database Generated",
    question: input.question,
    choices: labeled.choices,
    correctAnswer: labeled.correctAnswer,
    explanation: input.explanation,
    misconceptionNote: input.misconceptionNote,
    source: "database",
    sourceEntry: {
      kind: "mechanism",
      id: input.mechanism.id,
      name: input.mechanism.name,
    },
  }
}

function buildNextStepQuestion(context: QuestionTemplateContext): Question | null {
  const mechanism = mechanismFromContext(context)
  if (!mechanism) return null
  const step = mechanismStep(mechanism, context.index, true)
  if (!step?.nextAction) return null

  return buildMechanismQuestion({
    id: `next-step-${mechanism.id}-${step.id}`,
    context,
    mechanism,
    subtopic: mechanism.name,
    questionType: "Next step prediction",
    question: `In ${mechanism.name}, after "${step.title}", what is the best next action?`,
    correctText: step.nextAction.label,
    wrongTexts: step.distractorActions.map((action) => action.label),
    explanation: `${step.nextAction.explanation} This follows the current highlighted atoms and bonds in the ${mechanism.name} pathway.`,
    misconceptionNote: "Mechanism steps follow electron-rich to electron-poor interactions, not just memorized product names.",
  })
}

function buildIntermediateQuestion(context: QuestionTemplateContext): Question | null {
  const mechanism = mechanismFromContext(context)
  if (!mechanism) return null
  const step = mechanismStep(mechanism, context.index + 1)
  if (!step) return null

  const wrongTexts = ORGANIC_MECHANISMS.flatMap((item) => item.steps.map((candidate) => candidate.title))

  return buildMechanismQuestion({
    id: `intermediate-${mechanism.id}-${step.id}`,
    context,
    mechanism,
    subtopic: mechanism.name,
    questionType: "Identify intermediate",
    question: `Which intermediate or stage appears in ${mechanism.name} at this point: "${step.description}"?`,
    correctText: step.title,
    wrongTexts,
    explanation: `${step.title} matches this stage because ${step.explanation}`,
    misconceptionNote: "Intermediates are real local minima or useful teaching stages; transition states are not isolated products.",
  })
}

function buildMechanismTypeQuestion(context: QuestionTemplateContext): Question | null {
  const mechanism = mechanismFromContext(context)
  if (!mechanism) return null

  return buildMechanismQuestion({
    id: `type-${mechanism.id}`,
    context,
    mechanism,
    subtopic: mechanism.category,
    questionType: "Identify mechanism type",
    question: `Which named mechanism best matches this description: ${mechanism.summary}`,
    correctText: mechanism.name,
    wrongTexts: ORGANIC_MECHANISMS.filter((item) => item.id !== mechanism.id).map((item) => item.name),
    explanation: `${mechanism.name} is a ${mechanism.category.toLowerCase()} mechanism: ${mechanism.summary}`,
    misconceptionNote: "Classify the sequence of steps, not only the final product functional group.",
  })
}

function buildProductQuestion(context: QuestionTemplateContext): Question | null {
  const mechanism = mechanismFromContext(context)
  if (!mechanism) return null
  const product = mechanism.products.join(" + ")

  return buildMechanismQuestion({
    id: `product-${mechanism.id}`,
    context,
    mechanism,
    subtopic: mechanism.name,
    questionType: "Determine product",
    question: `What product class is formed by ${mechanism.name}?`,
    correctText: product,
    wrongTexts: ORGANIC_MECHANISMS.filter((item) => item.id !== mechanism.id).map((item) => item.products.join(" + ")),
    explanation: `${mechanism.name} converts ${mechanism.reactants.join(" + ")} into ${product}.`,
    misconceptionNote: "Use the mechanism pathway to predict products instead of matching reagent names only.",
  })
}

function buildReagentQuestion(context: QuestionTemplateContext): Question | null {
  const mechanism = mechanismFromContext(context)
  if (!mechanism) return null
  const reagent = mechanism.reagents.join(" + ")

  return buildMechanismQuestion({
    id: `reagent-${mechanism.id}`,
    context,
    mechanism,
    subtopic: mechanism.name,
    questionType: "Determine reagent",
    question: `Which reagent set is most associated with ${mechanism.name}?`,
    correctText: reagent,
    wrongTexts: ORGANIC_MECHANISMS.filter((item) => item.id !== mechanism.id).map((item) => item.reagents.join(" + ")),
    explanation: `${reagent} is used because ${mechanism.summary}`,
    misconceptionNote: "Reagents imply mechanism conditions, but substrate structure still matters.",
  })
}

export const MECHANISM_QUESTION_TEMPLATES: QuestionTemplate[] = [
  {
    id: "mechanism-next-step",
    name: "Organic Mechanism Next Step",
    description: "Ask students to predict the next electron-flow action in a mechanism.",
    supportedTopics: ["Organic Mechanisms", "Organic Reactions"],
    supportedSubtopics: ORGANIC_MECHANISMS.flatMap((mechanism) => [mechanism.name, mechanism.category]),
    estimatedCombinations: ORGANIC_MECHANISMS.reduce((sum, mechanism) => sum + mechanism.steps.length, 0),
    build: buildNextStepQuestion,
  },
  {
    id: "mechanism-intermediate",
    name: "Organic Mechanism Intermediate",
    description: "Ask students to identify the intermediate or stage in a mechanism.",
    supportedTopics: ["Organic Mechanisms", "Organic Reactions"],
    supportedSubtopics: ORGANIC_MECHANISMS.map((mechanism) => mechanism.name),
    estimatedCombinations: ORGANIC_MECHANISMS.reduce((sum, mechanism) => sum + mechanism.steps.length, 0),
    build: buildIntermediateQuestion,
  },
  {
    id: "mechanism-type",
    name: "Organic Mechanism Type",
    description: "Ask students to identify a named mechanism from a description.",
    supportedTopics: ["Organic Mechanisms", "Organic Reactions"],
    supportedSubtopics: ORGANIC_MECHANISMS.map((mechanism) => mechanism.name),
    estimatedCombinations: ORGANIC_MECHANISMS.length,
    build: buildMechanismTypeQuestion,
  },
  {
    id: "mechanism-product",
    name: "Organic Mechanism Product",
    description: "Ask students to determine product classes from mechanism records.",
    supportedTopics: ["Organic Mechanisms", "Organic Reactions"],
    supportedSubtopics: ORGANIC_MECHANISMS.map((mechanism) => mechanism.name),
    estimatedCombinations: ORGANIC_MECHANISMS.length,
    build: buildProductQuestion,
  },
  {
    id: "mechanism-reagent",
    name: "Organic Mechanism Reagent",
    description: "Ask students to match a mechanism to the appropriate reagent set.",
    supportedTopics: ["Organic Mechanisms", "Organic Reactions"],
    supportedSubtopics: ORGANIC_MECHANISMS.map((mechanism) => mechanism.name),
    estimatedCombinations: ORGANIC_MECHANISMS.length,
    build: buildReagentQuestion,
  },
]
