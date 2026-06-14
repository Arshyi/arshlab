import { REACTION_RECORDS } from "@/lib/chemistry/reactions"
import type { BalancingExercise, ReactionDifficulty } from "@/lib/chemistry/reaction-types"

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "").replace(/\((aq|s|l|g)\)/g, "")
}

export const BALANCING_EXERCISES: BalancingExercise[] = REACTION_RECORDS.map((record) => ({
  id: `balance-${record.id}`,
  reactionId: record.id,
  reactionType: record.reactionType,
  category: record.category,
  difficulty: record.difficulty,
  reactants: record.reactants,
  products: record.products,
  unbalancedEquation: record.unbalancedEquation,
  balancedEquation: record.balancedEquation,
  explanation: `Balance atoms and charge to obtain: ${record.balancedEquation}. ${record.explanation}`,
}))

export function listBalancingExercises(difficulty?: ReactionDifficulty): BalancingExercise[] {
  return difficulty ? BALANCING_EXERCISES.filter((exercise) => exercise.difficulty === difficulty) : BALANCING_EXERCISES
}

export function getBalancingExercise(id: string): BalancingExercise | undefined {
  return BALANCING_EXERCISES.find((exercise) => exercise.id === id || exercise.reactionId === id)
}

export function balanceReaction(input: string): BalancingExercise | null {
  const normalized = normalize(input)
  return (
    BALANCING_EXERCISES.find(
      (exercise) =>
        normalize(exercise.unbalancedEquation) === normalized ||
        normalize(exercise.balancedEquation) === normalized ||
        normalize(exercise.reactants.join("+")) === normalized,
    ) ?? null
  )
}

export function getBalancingMetrics() {
  return {
    exercises: BALANCING_EXERCISES.length,
    introductory: BALANCING_EXERCISES.filter((exercise) => exercise.difficulty === "Introductory").length,
    intermediate: BALANCING_EXERCISES.filter((exercise) => exercise.difficulty === "Intermediate").length,
    advanced: BALANCING_EXERCISES.filter((exercise) => exercise.difficulty === "Advanced").length,
  }
}
