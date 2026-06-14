export const REACTION_CATEGORIES = [
  "Acid-Base",
  "Precipitation",
  "Combustion",
  "Single Displacement",
  "Double Displacement",
  "Redox",
  "Synthesis",
  "Decomposition",
  "Hydrocarbon Reactions",
  "Organic Reactions",
  "Electrochemistry",
  "Equilibrium",
] as const

export const REACTION_DIFFICULTIES = ["Introductory", "Intermediate", "Advanced"] as const

export type ReactionCategory = (typeof REACTION_CATEGORIES)[number]
export type ReactionDifficulty = (typeof REACTION_DIFFICULTIES)[number]

export interface ReactionRecord {
  id: string
  name: string
  reactionType: string
  category: ReactionCategory
  difficulty: ReactionDifficulty
  reactants: string[]
  products: string[]
  balancedEquation: string
  unbalancedEquation: string
  curriculum: string[]
  explanation: string
}

export interface ReactionClassificationResult {
  category: ReactionCategory | "Unknown"
  reactionType: string
  confidence: number
  matchedReactionId?: string
  explanation: string
}

export interface ReactionPredictionResult {
  recognized: boolean
  reactants: string[]
  products: string[]
  balancedEquation?: string
  reactionType?: string
  category?: ReactionCategory
  confidence: number
  explanation: string
  matchedReactionId?: string
}

export interface BalancingExercise {
  id: string
  reactionId: string
  reactionType: string
  category: ReactionCategory
  difficulty: ReactionDifficulty
  reactants: string[]
  products: string[]
  unbalancedEquation: string
  balancedEquation: string
  explanation: string
}
