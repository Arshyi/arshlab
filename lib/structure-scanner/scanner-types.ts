import type { StructureVisionAnalysis } from "../structure-vision/vision-types"

export type StructureScannerDifficulty = "Introductory" | "Intermediate" | "Advanced"
export type StructureScanSource = "upload" | "camera" | "manual-correction" | "ocr" | "manual"

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
  ocrCompoundIds?: string[]
  ocrFormulaCompoundIds?: string[]
  ocrNameCompoundIds?: string[]
  ocrAtomLabels?: string[]
  ocrText?: string
  ocrQuality?: number
  ocrChemistryConfidence?: number
  ocrNoisePenalty?: number
  ocrFormulaCorrected?: boolean
  visualAnalysis?: StructureVisionAnalysis
}

export interface StructureScanMatch {
  record: StructureScannerRecord
  confidence: number
  reasons: string[]
  score: number
  contributions: StructureScoreContribution[]
}

export interface StructureScoreContribution {
  label: string
  points: number
  category: "ocr" | "atom-label" | "formula" | "name" | "manual" | "filename" | "visual" | "ring" | "graph" | "penalty" | "other"
}

export interface StructureScanResult {
  query: StructureScanInput
  bestMatch: StructureScanMatch | null
  matches: StructureScanMatch[]
  message: string
  isConfident: boolean
  confidenceThreshold: number
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
  source?: StructureScanSource
  captureSource?: "upload" | "camera"
  visualMatched?: boolean
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
  uploadScans: number
  cameraScans: number
  visualMatches: number
  ocrScansPerformed: number
  ocrMatchesFound: number
  ocrCorrectionRate: number
  mostRecognizedCompounds: Array<{ name: string; count: number }>
  mostScannedCompounds: Array<{ name: string; count: number }>
  mostScannedFunctionalGroups: Array<{ name: string; count: number }>
  recent: StructureScanHistoryEntry[]
}
