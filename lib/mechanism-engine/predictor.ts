import type { MechanismAction, MechanismRecord, MechanismStep } from "@/lib/chemistry/mechanism-types"
import { getMechanism } from "@/lib/chemistry/mechanisms"

export interface MechanismStepExercise {
  mechanism: MechanismRecord
  step: MechanismStep
  stepIndex: number
  choices: Array<MechanismAction & { correct: boolean }>
}

export interface MechanismChoiceFeedback {
  correct: boolean
  selectedLabel: string
  selectedExplanation: string
  correctLabel: string
  correctExplanation: string
  distractorExplanations: Array<{
    label: string
    explanation: string
  }>
}

function rotate<T>(items: T[], offset: number): T[] {
  if (items.length === 0) return items
  const normalized = Math.abs(offset) % items.length
  return [...items.slice(normalized), ...items.slice(0, normalized)]
}

export function buildMechanismStepExercise(
  mechanism: MechanismRecord,
  stepIndex: number,
): MechanismStepExercise | null {
  const safeIndex = Math.max(0, Math.min(stepIndex, mechanism.steps.length - 1))
  const step = mechanism.steps[safeIndex]
  if (!step?.nextAction) return null

  const wrongChoices = step.distractorActions
    .filter((choice) => choice.label !== step.nextAction?.label)
    .slice(0, 3)

  if (wrongChoices.length < 3) return null

  const combined = [
    { ...step.nextAction, correct: true },
    ...wrongChoices.map((choice) => ({ ...choice, correct: false })),
  ]

  return {
    mechanism,
    step,
    stepIndex: safeIndex,
    choices: rotate(combined, mechanism.id.length + safeIndex),
  }
}

export function getMechanismStepExercise(
  mechanismId: string | undefined,
  stepIndex: number,
): MechanismStepExercise | null {
  const mechanism = getMechanism(mechanismId)
  if (!mechanism) return null
  return buildMechanismStepExercise(mechanism, stepIndex)
}

export function evaluateMechanismChoice(
  mechanismId: string | undefined,
  stepIndex: number,
  choiceId: string,
): MechanismChoiceFeedback {
  const exercise = getMechanismStepExercise(mechanismId, stepIndex)
  const choice = exercise?.choices.find((item) => item.id === choiceId)
  if (!exercise || !choice) {
    return {
      correct: false,
      selectedLabel: "Unavailable",
      selectedExplanation: "No deterministic mechanism exercise is available for this step.",
      correctLabel: "Unavailable",
      correctExplanation: "No deterministic mechanism exercise is available for this step.",
      distractorExplanations: [],
    }
  }

  const correctChoice = exercise.choices.find((item) => item.correct)
  const correctExplanation = exercise.step.nextAction?.explanation ?? correctChoice?.explanation ?? "This is the best next mechanism move."

  return {
    correct: choice.correct,
    selectedLabel: choice.label,
    selectedExplanation: choice.explanation,
    correctLabel: correctChoice?.label ?? exercise.step.nextAction?.label ?? "Correct next step",
    correctExplanation,
    distractorExplanations: exercise.choices
      .filter((item) => !item.correct)
      .map((item) => ({
        label: item.label,
        explanation: item.explanation,
      })),
  }
}
