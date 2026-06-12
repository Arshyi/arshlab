import type { Question } from "./types"

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

export function countCorrectChoices(question: Question): number {
  const answer = normalize(question.correctAnswer)
  return question.choices.filter((choice) => {
    const label = normalize(choice.label)
    const text = normalize(choice.text)
    return answer === label || answer === text || answer === `${label}. ${text}`
  }).length
}

export function validateDatabaseQuestion(question: Question): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!question.id.trim()) errors.push("Question id is missing.")
  if (!question.question.trim()) errors.push("Question text is missing.")
  if (!question.explanation.trim()) errors.push("Explanation is missing.")
  if (!question.correctAnswer.trim()) errors.push("Correct answer is missing.")
  if (question.source !== "database") errors.push("Question source must be database.")
  if (!question.sourceEntry?.id || !question.sourceEntry?.name || !question.sourceEntry?.kind) {
    errors.push("Source database entry is missing.")
  }
  if (question.choices.length !== 4) errors.push("Question must have exactly four choices.")

  const uniqueLabels = new Set(question.choices.map((choice) => choice.label))
  const uniqueTexts = new Set(question.choices.map((choice) => normalize(choice.text)))
  if (uniqueLabels.size !== 4) errors.push("Choice labels must be unique.")
  if (uniqueTexts.size !== 4) errors.push("Choice texts must be unique.")
  if (countCorrectChoices(question) !== 1) errors.push("Question must have exactly one correct answer.")

  return { valid: errors.length === 0, errors }
}

export function validateDatabaseQuestionSet(questions: Question[], expectedCount: number): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []
  if (questions.length !== expectedCount) {
    errors.push(`Expected ${expectedCount} questions but received ${questions.length}.`)
  }

  for (const [index, question] of questions.entries()) {
    const result = validateDatabaseQuestion(question)
    if (!result.valid) {
      errors.push(`Question ${index + 1}: ${result.errors.join(" ")}`)
    }
  }

  return { valid: errors.length === 0, errors }
}
