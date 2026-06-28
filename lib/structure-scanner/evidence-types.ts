export type EvidenceEngineId =
  | "ocr-formula"
  | "atom-label"
  | "bond-geometry"
  | "ring-closure"
  | "ring-aromatic"
  | "global-graph-optimizer"
  | "molecular-graph"
  | "functional-group"
  | "filename-manual"

export type EvidenceStrength = "weak" | "moderate" | "strong"

export type ScannerEvidenceType =
  | "ocr"
  | "atom-label"
  | "bond"
  | "ring-closure"
  | "ring"
  | "graph"
  | "functional-group"
  | "filename"
  | "manual"

export interface EvidencePenalty {
  reason: string
  points: number
}

export interface EvidenceEngineCandidate {
  compoundId: string
  confidence: number
  evidenceType: ScannerEvidenceType
  strength: EvidenceStrength
  reasoning: string[]
  penalties: EvidencePenalty[]
}

export interface EvidenceEngineResult {
  id: EvidenceEngineId
  label: string
  description: string
  candidates: EvidenceEngineCandidate[]
  reasoning: string[]
  penalties: EvidencePenalty[]
}

export interface FusedEngineVote extends EvidenceEngineCandidate {
  engineId: EvidenceEngineId
  engineLabel: string
  weightedContribution: number
}

export interface FusedEvidenceCandidate {
  compoundId: string
  score: number
  confidence: number
  engineVotes: FusedEngineVote[]
  reasoning: string[]
  penalties: EvidencePenalty[]
  strongestEvidence: string
}

export interface EvidenceFusionResult {
  engines: EvidenceEngineResult[]
  candidates: FusedEvidenceCandidate[]
  winningCompoundId: string | null
  runnerUpCompoundIds: string[]
  whyWinnerBeatRunnerUp: string
  strongestEvidence: string
  weakestEvidence: string
}
