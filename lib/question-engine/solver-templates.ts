import { SOLVER_MODULES, SOLVER_PRACTICE_EXAMPLES } from "@/lib/solver-engine"
import { getFormulaForSolverModule } from "@/lib/formula-sheet"
import type { Question, QuestionChoice, QuestionTemplate, QuestionTemplateContext } from "./types"

const choiceLabels = ["A", "B", "C", "D"]

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

function pick<T>(items: T[], index: number): T | null {
  if (!items.length) return null
  return items[Math.abs(index) % items.length]
}

function moduleForContext(context: QuestionTemplateContext) {
  const requested = normalize(`${context.targetSubtopic ?? ""} ${context.questionType ?? ""}`)
  return (
    SOLVER_MODULES.find((module) => normalize(module.title).includes(requested) || requested.includes(normalize(module.title))) ??
    SOLVER_MODULES.find((module) => normalize(module.id).includes(requested) || requested.includes(normalize(module.id))) ??
    pick(SOLVER_MODULES, context.index)
  )
}

function labeledChoices(correctText: string, wrongTexts: string[], seed: number): {
  choices: QuestionChoice[]
  correctAnswer: string
} | null {
  const wrongs = wrongTexts
    .filter((text) => normalize(text) !== normalize(correctText))
    .filter((text, index, all) => all.findIndex((candidate) => normalize(candidate) === normalize(text)) === index)
    .slice(0, 3)
  if (wrongs.length < 3) return null

  const correctIndex = Math.abs(seed) % 4
  const texts = [...wrongs]
  texts.splice(correctIndex, 0, correctText)
  return {
    choices: texts.map((text, index) => ({ label: choiceLabels[index], text })),
    correctAnswer: `${choiceLabels[correctIndex]}. ${correctText}`,
  }
}

function buildSolverQuestion(context: QuestionTemplateContext): Question | null {
  const module = moduleForContext(context)
  if (!module) return null
  const examples = SOLVER_PRACTICE_EXAMPLES.filter((example) => example.moduleId === module.id)
  const example = pick(examples.length ? examples : SOLVER_PRACTICE_EXAMPLES, context.index)
  if (!example) return null
  const labeled = labeledChoices(example.correctAnswer, example.distractors, context.index)
  if (!labeled) return null
  const formula = getFormulaForSolverModule(module.id)

  return {
    id: `db-solver-${example.id}-${context.index}`,
    topic: "Chemistry Calculations",
    subtopic: module.title,
    questionType: context.questionType ?? "Calculation question",
    difficulty: context.difficulty,
    curriculumStyle: context.curriculum ?? "Database Generated",
    question: example.question,
    choices: labeled.choices,
    correctAnswer: labeled.correctAnswer,
    explanation: example.explanation,
    misconceptionNote: `Common mistake: ${module.commonMistakes[context.index % module.commonMistakes.length]}`,
    source: "database",
    sourceEntry: {
      kind: "solver-module",
      id: module.id,
      name: module.title,
    },
    relevantFormulaId: formula?.id,
  }
}

function buildWorkedExampleQuestion(context: QuestionTemplateContext): Question | null {
  const module = moduleForContext(context)
  if (!module) return null
  const example = pick(SOLVER_PRACTICE_EXAMPLES.filter((item) => item.moduleId === module.id), context.index)
  if (!example) return buildSolverQuestion(context)
  const labeled = labeledChoices(module.formula, SOLVER_MODULES.filter((item) => item.id !== module.id).map((item) => item.formula), context.index)
  if (!labeled) return null
  const formula = getFormulaForSolverModule(module.id)

  return {
    id: `db-solver-worked-${example.id}-${context.index}`,
    topic: "Chemistry Calculations",
    subtopic: module.title,
    questionType: "Worked example",
    difficulty: context.difficulty,
    curriculumStyle: context.curriculum ?? "Database Generated",
    question: `Which formula starts the worked example for this problem? ${example.question}`,
    choices: labeled.choices,
    correctAnswer: labeled.correctAnswer,
    explanation: `${module.title} starts from ${module.formula}. ${example.explanation}`,
    misconceptionNote: `Unit reminder: ${module.unitReminders[context.index % module.unitReminders.length]}`,
    source: "database",
    sourceEntry: {
      kind: "solver-module",
      id: module.id,
      name: module.title,
    },
    relevantFormulaId: formula?.id,
  }
}

export const SOLVER_QUESTION_TEMPLATES: QuestionTemplate[] = [
  {
    id: "solver-calculation",
    name: "Solver Calculation Question",
    description: "Generate deterministic chemistry calculation questions with answer keys.",
    supportedTopics: ["Chemistry Calculations", "Stoichiometry", "Thermodynamics", "Acids and Bases"],
    supportedSubtopics: SOLVER_MODULES.map((module) => module.title),
    estimatedCombinations: SOLVER_PRACTICE_EXAMPLES.length * 4,
    build: buildSolverQuestion,
  },
  {
    id: "solver-worked-example",
    name: "Solver Worked Example",
    description: "Ask which formula anchors a worked chemistry calculation.",
    supportedTopics: ["Chemistry Calculations", "Stoichiometry", "Thermodynamics", "Acids and Bases"],
    supportedSubtopics: SOLVER_MODULES.map((module) => module.title),
    estimatedCombinations: SOLVER_PRACTICE_EXAMPLES.length * SOLVER_MODULES.length,
    build: buildWorkedExampleQuestion,
  },
]
