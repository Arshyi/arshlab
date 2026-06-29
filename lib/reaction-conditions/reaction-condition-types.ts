import type { ReactionDifficulty } from "../chemistry/reaction-types"

export interface ReactionConditionRecord {
  reactionId: string
  reactionName: string
  reagents: string[]
  catalysts: string[]
  solvents: string[]
  temperature: string
  pressure: string
  reactionCategory: string
  typicalYield: string
  commonSideReactions: string[]
  commonMistakes: string[]
  safetyNotes: string[]
  mechanismFamily: string
  difficulty: ReactionDifficulty
  expectedProducts: string[]
  typicalExamClues: string[]
}

export interface ReactionConditionMetrics {
  records: number
  mechanismFamilies: number
  reagentSets: number
  safetyNotes: number
}
