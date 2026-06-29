import type { IsolationBoundingBox } from "./isolation-types"

export type SceneRegionType =
  | "molecule"
  | "multiple-molecule-region"
  | "reaction-arrow"
  | "reaction-conditions"
  | "chemical-text"
  | "atom-labels"
  | "charges"
  | "curved-mechanism-arrow"
  | "page-border"
  | "tablet-border"
  | "phone-border"
  | "hand"
  | "finger"
  | "reflection"
  | "shadow"
  | "watermark"
  | "noise"
  | "background"

export type SceneEdgeType = "reactant-to-arrow" | "arrow-to-product" | "condition-for-arrow" | "text-near-molecule" | "suppresses"

export interface ScenePoint {
  x: number
  y: number
}

export interface SceneComponent {
  id: number
  bounds: IsolationBoundingBox
  pixelCount: number
  density: number
  aspectRatio: number
  touchesBorder: boolean
  lineLike: boolean
  labelLike: boolean
  meanLuminance: number
}

export interface SceneGraphNode {
  id: string
  type: SceneRegionType
  label: string
  bounds: IsolationBoundingBox
  confidence: number
  selected: boolean
  componentIds: number[]
  evidence: string[]
  rejectionReasons: string[]
  role?: "reactant" | "product" | "condition" | "context" | "selected-molecule"
}

export interface SceneGraphEdge {
  id: string
  fromNodeId: string
  toNodeId: string
  type: SceneEdgeType
  confidence: number
  reason: string
}

export interface SceneReactionLayout {
  id: string
  arrowNodeId: string
  reactantNodeIds: string[]
  productNodeIds: string[]
  conditionNodeIds: string[]
  confidence: number
  explanation: string
}

export interface SceneGraph {
  width: number
  height: number
  nodes: SceneGraphNode[]
  edges: SceneGraphEdge[]
  reactions: SceneReactionLayout[]
  moleculeNodeIds: string[]
  arrowNodeIds: string[]
  textNodeIds: string[]
  rejectedNodeIds: string[]
  selectedMoleculeNodeId: string | null
  summary: string
}

export interface SceneConfidenceBreakdown {
  sceneUnderstanding: number
  segmentation: number
  graph: number
  chemistry: number
  ocr: number
  overall: number
}

export interface SceneMoleculeCrop {
  nodeId: string
  bounds: IsolationBoundingBox
  cropBounds: IsolationBoundingBox
  confidence: number
  selected: boolean
}

export interface SceneUnderstandingAnalysis {
  width: number
  height: number
  components: SceneComponent[]
  sceneGraph: SceneGraph
  moleculeCrops: SceneMoleculeCrop[]
  selectedMoleculeNodeId: string | null
  selectedMoleculeBounds: IsolationBoundingBox | null
  confidence: SceneConfidenceBreakdown
  arrowCount: number
  moleculeCount: number
  textRegionCount: number
  suppressedRegionCount: number
  reflectionMaskCoverage: number
  humanMaskCoverage: number
  borderSuppressionCount: number
  warnings: string[]
  explanation: string
}

export interface SceneUnderstandingResult {
  analysis: SceneUnderstandingAnalysis
  selectedMoleculeBlob: Blob | null
  moleculeBlobs: Array<SceneMoleculeCrop & { blob: Blob }>
  usedSceneCrop: boolean
}
