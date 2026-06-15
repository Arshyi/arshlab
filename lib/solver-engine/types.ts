export type SolverModuleId =
  | "molarity"
  | "dilution"
  | "percent-yield"
  | "empirical-formula"
  | "ideal-gas-law"
  | "calorimetry"
  | "ph"
  | "stoichiometry"

export interface SolverModuleMeta {
  id: SolverModuleId
  title: string
  formula: string
  difficulty: "Introductory" | "Intermediate" | "Advanced"
  topic: string
  commonMistakes: string[]
  unitReminders: string[]
}

export interface SolverStep {
  label: "Given" | "Formula" | "Substitution" | "Calculation" | "Answer" | "Unit Check"
  expression: string
  detail: string
}

export interface SolverResult {
  moduleId: SolverModuleId
  title: string
  difficulty: SolverModuleMeta["difficulty"]
  topic: string
  commonMistakes: string[]
  unitReminders: string[]
  steps: SolverStep[]
  answer: string
}

export interface EmpiricalFormulaInput {
  element: string
  mass: number
}

export interface StoichiometryInput {
  reactionId: string
  knownFormula: string
  knownMoles: number
  targetFormula: string
}

export interface SolverPracticeExample {
  id: string
  moduleId: SolverModuleId
  question: string
  correctAnswer: string
  explanation: string
  distractors: string[]
}
