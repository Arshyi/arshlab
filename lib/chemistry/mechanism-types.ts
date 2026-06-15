import type { MolecularStructure2D } from "./visualization-types"

export type MechanismCategory =
  | "Addition"
  | "Substitution"
  | "Elimination"
  | "Oxidation"
  | "Condensation"

export type MechanismDifficulty = "Introductory" | "Intermediate" | "Advanced"

export interface MechanismAction {
  id: string
  label: string
  explanation: string
}

export interface MechanismStep {
  id: string
  title: string
  description: string
  intermediateStructure: MolecularStructure2D
  highlightAtoms: string[]
  highlightBonds: string[]
  electronFlow: string
  explanation: string
  nextAction?: MechanismAction
  distractorActions: MechanismAction[]
}

export interface MechanismRecord {
  id: string
  name: string
  category: MechanismCategory
  difficulty: MechanismDifficulty
  reactants: string[]
  products: string[]
  reagents: string[]
  conditions?: string
  summary: string
  steps: MechanismStep[]
}

export interface MechanismMetrics {
  mechanismsAvailable: number
  mechanismSteps: number
  interactiveExercises: number
  coverageLevel: string
  categories: number
}
