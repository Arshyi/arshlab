import type { ChemicalGraphValidationResult } from "./chemical-graph-validator"
import type { GlobalShapeReconstructionResult } from "./global-shape-reconstruction"
import type { GlobalGraphOptimizationResult } from "./global-graph-optimizer"
import type { ConsensusGraphSolverResult } from "./consensus-graph-solver"
import type { MolecularGraph } from "../vision/molecular-graph"

export interface VisionPoint {
  x: number
  y: number
}

export interface VisionAtomLabel {
  id: number
  label: "H" | "C" | "N" | "O" | "S" | "P" | "F" | "Cl" | "Br" | "I"
  bounds: { x: number; y: number; width: number; height: number }
  centroid: VisionPoint
  confidence: number
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
  source: "pixel-loop" | "graph-cycle" | "graph-near-cycle" | "ring-closure" | "global-shape"
  nodeIds: number[]
  closureQuality: number
  endpointMergeQuality: number
  polygonRegularity: number
  lineCoverage: number
  doubleBondCue: number
  aromaticCueScore: number
  reason: string
  scoreBreakdown: VisionScoreBreakdown[]
  selectedReason?: string
  rejectedReasons?: string[]
  closureGapCount?: number
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

export interface VisionRingClosureSnapEvent {
  segmentIndex: number
  endpoint: "start" | "end"
  nodeId: number
  atomLabelId?: number
  distance: number
  accepted: boolean
  reason: string
}

export interface VisionRingClosureBridgeEvent {
  fromNodeId: number
  toNodeId: number
  gapLength: number
  confidence: number
  accepted: boolean
  reason: string
}

export interface VisionRingClosureCandidate {
  id: number
  memberCount: number
  nodeIds: number[]
  points: VisionPoint[]
  center: VisionPoint
  width: number
  height: number
  closed: boolean
  recovered: boolean
  selected: boolean
  confidence: number
  closureConfidence: number
  regularity: number
  lineCoverage: number
  aromaticSupport: number
  doubleBondCount: number
  closureGaps: VisionRingClosureBridgeEvent[]
  source: "atom-centroid" | "endpoint-graph" | "hybrid"
  selectedReason: string
  rejectedReasons: string[]
  scoreBreakdown: VisionScoreBreakdown[]
}

export interface VisionRingClosureAnalysis {
  candidates: VisionRingClosureCandidate[]
  selectedCandidateId: number | null
  detectedRingSizes: number[]
  snapEvents: VisionRingClosureSnapEvent[]
  bridgeEvents: VisionRingClosureBridgeEvent[]
  aromaticSupportScore: number
  ringVoteContribution: number
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
  atomLabels: VisionAtomLabel[]
  lineSegments: VisionLineSegment[]
  globalShapeReconstruction: GlobalShapeReconstructionResult
  closedLoops: VisionClosedLoop[]
  ringCandidates: VisionRingCandidate[]
  ringClosure: VisionRingClosureAnalysis
  graph: VisionGraphAnalysis
  molecularGraph: MolecularGraph
  globalGraphOptimization: GlobalGraphOptimizationResult
  consensusGraphSolver: ConsensusGraphSolverResult
  chemicalGraphValidation: ChemicalGraphValidationResult
  parallelBondPairs: VisionParallelBondPair[]
  parallelLinePairs: number
  simpleChainLength: number
  functionalGroupCues: VisionFunctionalGroupCue[]
  candidates: VisionCompoundCandidate[]
  visualConfidence: number
  isUncertain: boolean
  warnings: string[]
  sceneVariants?: SceneVariantEvaluation[]
  selectedSceneVariantId?: string
}

export interface SceneVariantEvaluation {
  id: string
  candidateId: number
  kind: string
  score: number
  graphConfidence: number
  chemistryConfidence: number
  selected: boolean
  perspectiveCorrected: boolean
}

export interface StructureVisionOptions {
  recognizedText?: string
  maxDimension?: number
  atomLabels?: Array<{
    label: VisionAtomLabel["label"]
    bounds: { x: number; y: number; width: number; height: number }
    centroid: VisionPoint
    confidence: number
  }>
}
