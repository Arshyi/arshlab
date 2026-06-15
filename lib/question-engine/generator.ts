import {
  DATABASE_QUESTION_TEMPLATES,
  getQuestionEngineDatabaseCounts,
  getQuestionEngineTemplateCoverage,
} from "./templates"
import type { GenerateDatabaseQuestionsInput, Question, QuestionEngineStats, QuestionTemplate } from "./types"
import { validateDatabaseQuestion, validateDatabaseQuestionSet } from "./validators"
import { findUnit, getCurriculum, isCurriculumId } from "@/lib/curriculum/curriculum-registry"

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

function getUnitTopics(input: GenerateDatabaseQuestionsInput): string[] {
  if (!input.curriculum || !isCurriculumId(input.curriculum)) return []
  const curriculum = getCurriculum(input.curriculum)
  const unit = findUnit(curriculum, input.unit)
  return unit?.topics ?? []
}

function templateMatchesInput(template: QuestionTemplate, input: GenerateDatabaseQuestionsInput): boolean {
  const topic = normalize(input.topic)
  const unitTopics = getUnitTopics(input).map(normalize)
  const supportedTopics = template.supportedTopics.map(normalize)
  const targetSubtopic = normalize(input.targetSubtopic ?? "")
  const supportedSubtopics = template.supportedSubtopics?.map(normalize) ?? []

  const topicMatches = supportedTopics.includes(topic) || unitTopics.some((unitTopic) => supportedTopics.includes(unitTopic))
  const subtopicMatches =
    !targetSubtopic ||
    input.targetSubtopic === "all" ||
    supportedSubtopics.length === 0 ||
    supportedSubtopics.some((subtopic) => subtopic.includes(targetSubtopic) || targetSubtopic.includes(subtopic))

  return topicMatches && subtopicMatches
}

function getTemplatesForInput(input: GenerateDatabaseQuestionsInput): QuestionTemplate[] {
  const matching = DATABASE_QUESTION_TEMPLATES.filter((template) => templateMatchesInput(template, input))
  if (matching.length) return matching

  const unitTopics = getUnitTopics(input)
  if (unitTopics.length) {
    const unitMatching = DATABASE_QUESTION_TEMPLATES.filter((template) =>
      template.supportedTopics.some((topic) => unitTopics.includes(topic)),
    )
    if (unitMatching.length) return unitMatching
  }

  return DATABASE_QUESTION_TEMPLATES
}

export function generateDatabaseQuestions(input: GenerateDatabaseQuestionsInput): Question[] {
  const count = Math.max(1, Math.min(20, Math.floor(input.count || 1)))
  const templates = getTemplatesForInput(input)
  const questions: Question[] = []
  const seenPrompts = new Set<string>()
  let attempt = 0

  while (questions.length < count && attempt < count * templates.length * 8) {
    const template = templates[attempt % templates.length]
    const question = template.build({
      ...input,
      index: attempt + questions.length,
      questionType: input.questionType ?? "Multiple choice",
    })
    attempt += 1

    if (!question) continue
    const promptKey = normalize(question.question)
    if (seenPrompts.has(promptKey)) continue

    const validation = validateDatabaseQuestion(question)
    if (!validation.valid) continue

    seenPrompts.add(promptKey)
    questions.push({
      ...question,
      id: `${question.id}-${questions.length + 1}`,
    })
  }

  const setValidation = validateDatabaseQuestionSet(questions, count)
  if (!setValidation.valid) {
    throw new Error(`Database question generation failed: ${setValidation.errors.join(" ")}`)
  }

  return questions
}

export function getQuestionEngineStats(): QuestionEngineStats {
  return {
    templates: DATABASE_QUESTION_TEMPLATES.length,
    supportedTopics: Array.from(new Set(DATABASE_QUESTION_TEMPLATES.flatMap((template) => template.supportedTopics))).sort(),
    estimatedCombinations: DATABASE_QUESTION_TEMPLATES.reduce(
      (sum, template) => sum + template.estimatedCombinations,
      0,
    ),
    templateCoveragePercent: getQuestionEngineTemplateCoverage(),
    databaseCounts: getQuestionEngineDatabaseCounts(),
  }
}

export { DATABASE_QUESTION_TEMPLATES } from "./templates"
export type { GenerateDatabaseQuestionsInput, Question, QuestionChoice, QuestionSource } from "./types"
