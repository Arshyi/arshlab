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

export interface VisionParallelBondPair {
  id: number
  firstSegmentIndex: number
  secondSegmentIndex: number
  center: VisionPoint
  angle: number
  separation: number
  overlap: number
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
  nearRing: boolean
  source: "pixel-loop" | "graph-cycle" | "graph-near-cycle"
  nodeIds: number[]
  closureQuality: number
  endpointMergeQuality: number
  polygonRegularity: number
  lineCoverage: number
  doubleBondCue: number
  aromaticCueScore: number
  reason: string
  scoreBreakdown: VisionScoreBreakdown[]
}

export interface VisionGraphNode {
  id: number
  point: VisionPoint
  endpointCount: number
  mergeRadius: number
  mergeQuality: number
}

export interface VisionGraphEdge {
  id: number
  startNodeId: number
  endNodeId: number
  length: number
  sourceSegmentIndexes: number[]
}

export interface VisionScoreBreakdown {
  label: string
  points: number
  maximum: number
}

export interface VisionGraphAnalysis {
  nodes: VisionGraphNode[]
  edges: VisionGraphEdge[]
  mergedEndpointCount: number
  endpointTolerance: number
  averageLineLength: number
  cycleCandidates: VisionRingCandidate[]
  nearRingCandidates: VisionRingCandidate[]
  bestRingConfidence: number
  aromaticCueScore: number
  explanation: string
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
  scoreBreakdown: VisionScoreBreakdown[]
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
  graph: VisionGraphAnalysis
  molecularGraph: MolecularGraph
  parallelBondPairs: VisionParallelBondPair[]
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
import type { MolecularGraph } from "../vision/molecular-graph"
