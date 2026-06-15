export interface FormulaVariable {
  symbol: string
  meaning: string
  unit: string
}

export interface WorkedFormulaStep {
  label: string
  expression: string
  explanation: string
}

export interface FormulaRecord {
  id: string
  category: string
  name: string
  formula: string
  variables: FormulaVariable[]
  units: string[]
  description: string
  whenToUse: string
  commonMistakes: string[]
  workedExample: WorkedFormulaStep[]
  keywords: string[]
}

export interface FormulaViewStats {
  totalViews: number
  formulaViews: Record<string, number>
  categoryViews: Record<string, number>
  lastViewedFormulaIds: string[]
}
