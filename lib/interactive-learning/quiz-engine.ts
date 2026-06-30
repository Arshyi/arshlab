import type { OrbitalQuizQuestion } from "./types"
import { QUIZ_QUESTIONS } from "./examples"

export function listOrbitalQuizQuestions(): OrbitalQuizQuestion[] {
  return QUIZ_QUESTIONS
}

export function getOrbitalQuizQuestion(index: number): OrbitalQuizQuestion {
  const safeIndex = Math.abs(index) % QUIZ_QUESTIONS.length
  return QUIZ_QUESTIONS[safeIndex]
}

export function checkOrbitalQuizAnswer(questionId: string, answer: string) {
  const question = QUIZ_QUESTIONS.find((item) => item.id === questionId) ?? QUIZ_QUESTIONS[0]
  const correct = question.correctAnswer === answer

  return {
    question,
    correct,
    feedback: correct
      ? `Correct. ${question.explanation}`
      : `Not quite. The correct answer is ${question.correctAnswer}. ${question.explanation}`,
  }
}
