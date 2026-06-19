export type LabDifficulty = "Introductory" | "Intermediate" | "Advanced"

export type LabCategory =
  | "Volumetric Analysis"
  | "Measurement"
  | "Separation"
  | "Organic Techniques"
  | "Spectroscopy Prep"
  | "Thermochemistry"
  | "Safety"
  | "Glassware"

export interface LabRelatedLinks {
  formulas: string[]
  reactions: string[]
  solverModules: string[]
  practiceTopics: string[]
}

export interface LabTechniqueRecord {
  id: string
  name: string
  category: LabCategory
  difficulty: LabDifficulty
  purpose: string
  equipment: string[]
  procedure: string[]
  commonMistakes: string[]
  safetyNotes: string[]
  examClues: string[]
  labReportChecklist: string[]
  related: LabRelatedLinks
  aliases: string[]
}

export interface LabMetrics {
  techniques: number
  categories: number
  safetyRecords: number
  equipmentItems: number
  procedures: number
}

