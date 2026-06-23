export interface IsolationBoundingBox {
  x: number
  y: number
  width: number
  height: number
}

export interface StructureIsolationComponent {
  id: number
  bounds: IsolationBoundingBox
  pixelCount: number
  density: number
  touchesBorder: boolean
  rejected: boolean
  rejectionReason?: string
  corners: PerspectiveQuadrilateral
}

export interface IsolationPoint {
  x: number
  y: number
}

export interface PerspectiveQuadrilateral {
  topLeft: IsolationPoint
  topRight: IsolationPoint
  bottomRight: IsolationPoint
  bottomLeft: IsolationPoint
  confidence: number
}

export type StructureVariantKind = "original" | "grayscale" | "adaptive-threshold" | "high-contrast" | "inverted" | "perspective"

export interface StructureImageVariant {
  id: string
  candidateId: number
  kind: StructureVariantKind
  blob: Blob
  primary: boolean
  perspectiveCorrected: boolean
}

export interface StructureIsolationCandidate {
  id: number
  bounds: IsolationBoundingBox
  componentIds: number[]
  pixelCount: number
  drawingCoverage: number
  chemistryPixelDensity: number
  score: number
  selected: boolean
  reason: string
  lineLikeComponents: number
  labelLikeComponents: number
  repeatedGeometryScore: number
  ringGeometryScore: number
  skinLikeRatio: number
  backgroundPenalty: number
  quadrilateral: PerspectiveQuadrilateral
  proposalSources: string[]
  bondSegmentCount: number
  parallelBondPairs: number
  ringCueCount: number
  aromaticCueScore: number
  meanBondLength: number
  bondLengthVariance: number
  bondLengthRegularity: number
  longEdgeCount: number
  rectangularFrameDetected: boolean
  positiveEvidence: string[]
  suppressionReasons: string[]
}

export interface IsolationCandidateEvaluation {
  candidateId: number
  variantId: string
  ocrAtomLabelCount: number
  ocrConfidence: number
  graphConfidence: number
  visualConfidence: number
  ringConfidence: number
  chemistryEvidenceScore: number
  selected: boolean
  reasoning: string[]
}

export interface StructureIsolationAnalysis {
  width: number
  height: number
  grayscaleMean: number
  adaptiveThresholdMean: number
  components: StructureIsolationComponent[]
  candidates: StructureIsolationCandidate[]
  selectedBounds: IsolationBoundingBox | null
  cropBounds: IsolationBoundingBox
  drawingCoverage: number
  chemistryPixelDensity: number
  isolationConfidence: number
  usedFullImage: boolean
  perspectiveBoundary: PerspectiveQuadrilateral | null
  regionProposalCount: number
  selectedCandidateId: number | null
  candidateScoreMargin: number
  requiresMultiCropFallback: boolean
  warnings: string[]
}

export interface StructureIsolationResult {
  isolatedBlob: Blob
  analysis: StructureIsolationAnalysis
  variants: StructureImageVariant[]
  primaryVariantId: string
  candidateEvaluations: IsolationCandidateEvaluation[]
  multiCropFallbackUsed: boolean
}

export interface StructureIsolationOptions {
  marginRatio?: number
  maxAnalysisDimension?: number
  minimumConfidence?: number
  maximumCandidates?: number
}
