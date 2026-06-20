export interface VisionPoint {
  x: number
  y: number
}

export interface DarkPixelMask {
  width: number
  height: number
  pixels: Uint8Array
  darkPixelCount: number
  threshold: number
}

export interface VisionLineSegment {
  start: VisionPoint
  end: VisionPoint
  midpoint: VisionPoint
  length: number
  angle: number
  strength: number
}

export interface VisionClosedLoop {
  bounds: { x: number; y: number; width: number; height: number }
  center: VisionPoint
  holeArea: number
  aspectRatio: number
}

export interface VisionRingCandidate {
  center: VisionPoint
  width: number
  height: number
  sidesEstimate: number
  confidence: number
  benzeneLike: boolean
}

export type VisionFunctionalGroupCueKind =
  | "aromatic"
  | "carbonyl"
  | "hydroxyl"
  | "carboxyl"
  | "double-bond"
  | "simple-chain"

export interface VisionFunctionalGroupCue {
  kind: VisionFunctionalGroupCueKind
  label: string
  confidence: number
  evidence: string
}

export interface VisionCompoundCandidate {
  compoundId: string
  label: string
  score: number
  reasons: string[]
}

export interface StructureVisionAnalysis {
  width: number
  height: number
  darkPixelCount: number
  darkPixelRatio: number
  threshold: number
  lineSegments: VisionLineSegment[]
  closedLoops: VisionClosedLoop[]
  ringCandidates: VisionRingCandidate[]
  parallelLinePairs: number
  simpleChainLength: number
  functionalGroupCues: VisionFunctionalGroupCue[]
  candidates: VisionCompoundCandidate[]
  visualConfidence: number
  isUncertain: boolean
  warnings: string[]
}

export interface StructureVisionOptions {
  recognizedText?: string
  maxDimension?: number
}
