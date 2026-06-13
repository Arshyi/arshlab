import { SPECTROSCOPY_QUESTION_TEMPLATES } from "./spectroscopy-templates"
import type { GenerateDatabaseQuestionsInput, Question } from "./types"
import { validateDatabaseQuestion, validateDatabaseQuestionSet } from "./validators"

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

export function generateSpectroscopyQuestions(input: GenerateDatabaseQuestionsInput): Question[] {
  const count = Math.max(1, Math.min(20, Math.floor(input.count || 1)))
  const questions: Question[] = []
  const seenPrompts = new Set<string>()
  let attempt = 0

  while (questions.length < count && attempt < count * SPECTROSCOPY_QUESTION_TEMPLATES.length * 8) {
    const template = SPECTROSCOPY_QUESTION_TEMPLATES[attempt % SPECTROSCOPY_QUESTION_TEMPLATES.length]
    const question = template.build({
      ...input,
      topic: "Spectroscopy",
      targetSubtopic: input.targetSubtopic ?? "IR Spectroscopy",
      index: attempt + questions.length,
      questionType: "Multiple choice",
    })
    attempt += 1

    if (!question) continue
    const key = normalize(question.question)
    if (seenPrompts.has(key)) continue
    const validation = validateDatabaseQuestion(question)
    if (!validation.valid) continue

    seenPrompts.add(key)
    questions.push({
      ...question,
      id: `${question.id}-${questions.length + 1}`,
    })
  }

  const validation = validateDatabaseQuestionSet(questions, count)
  if (!validation.valid) {
    throw new Error(`Spectroscopy question generation failed: ${validation.errors.join(" ")}`)
  }

  return questions
}

export { SPECTROSCOPY_QUESTION_TEMPLATES, getSpectroscopyTemplateStats } from "./spectroscopy-templates"
