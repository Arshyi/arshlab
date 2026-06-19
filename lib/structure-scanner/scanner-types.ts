export type StructureScannerDifficulty = "Introductory" | "Intermediate" | "Advanced"

export interface ScannerRelatedLink {
  id: string
  label: string
}

export interface ScannerCurriculumLink {
  id: string
  label: string
}

export interface StructureScannerRecord {
  id: string
  name: string
  formula: string
  functionalGroups: string[]
  commonAliases: string[]
  difficulty: StructureScannerDifficulty
  reactionGraphLinks: string[]
  visualizerLinks: string[]
  relatedReactions?: ScannerRelatedLink[]
  relatedMechanisms?: ScannerRelatedLink[]
  formulaId?: string
  practiceTopic?: string
  examTopic?: string
  curriculumTopicId?: string
  recommendedCurriculumTopics?: ScannerCurriculumLink[]
  keywords?: string[]
}

export interface StructureScanInput {
  moleculeName?: string
  formula?: string
  functionalGroupHint?: string
  condensedFormula?: string
  /** Retained for older callers; v5 uses functionalGroupHint. */
  structureHint?: string
  fileName?: string
}

export interface StructureScanMatch {
  record: StructureScannerRecord
  confidence: number
  reasons: string[]
  score: number
}

export interface StructureScanResult {
  query: StructureScanInput
  bestMatch: StructureScanMatch | null
  matches: StructureScanMatch[]
  message: string
}

export interface StructureScanHistoryEntry {
  id: string
  compoundId: string
  name: string
  formula: string
  functionalGroups: string[]
  confidence: number
  timestamp: string
  corrected: boolean
  correctedAt?: string
  originalName?: string
  originalFormula?: string
  correction?: StructureScanCorrection
}

export interface StructureScanCorrection {
  compoundName?: string
  formula?: string
  functionalGroupHint?: string
  condensedFormula?: string
}

export interface StructureScanStats {
  totalScans: number
  correctedScans: number
  mostScannedCompounds: Array<{ name: string; count: number }>
  mostScannedFunctionalGroups: Array<{ name: string; count: number }>
  recent: StructureScanHistoryEntry[]
}
