import type { MolecularGraph } from "../vision/molecular-graph"
import type { StructureVisionAnalysis } from "../structure-vision/vision-types"

export type CompilerStatus = "pass" | "pass-with-warnings" | "fail"

export type VisualTokenType =
  | "line"
  | "double-line"
  | "triple-line"
  | "dashed-bond"
  | "hashed-wedge"
  | "solid-wedge"
  | "arc"
  | "circle"
  | "charge"
  | "arrow"
  | "atom-label"
  | "bracket"
  | "plus"
  | "minus"
  | "electron-pair"
  | "text"

export interface CompilerBox {
  x: number
  y: number
  width: number
  height: number
}

export interface VisualToken {
  id: string
  type: VisualTokenType
  boundingBox: CompilerBox
  confidence: number
  rotation: number
  length: number
  width: number
  orientation: number
  sourcePixels: number[]
  text?: string
  metadata?: Record<string, string | number | boolean>
}

export type ChemicalPrimitiveType =
  | "carbon-atom"
  | "oxygen-atom"
  | "nitrogen-atom"
  | "unknown-atom"
  | "single-bond"
  | "double-bond"
  | "triple-bond"
  | "aromatic-hint"
  | "charge"
  | "reaction-arrow"
  | "lone-pair"
  | "fragment"

export interface ChemicalPrimitive {
  id: string
  type: ChemicalPrimitiveType
  sourceTokenIds: string[]
  confidence: number
  geometry: {
    center: { x: number; y: number }
    boundingBox: CompilerBox
    orientation: number
    length: number
  }
  neighbors: string[]
  element?: string
  bondOrder?: 1 | 2 | 3
  charge?: number
}

export interface ChemicalAstNode {
  id: number
  atomType: string
  coordinates: { x: number; y: number }
  degree: number
  charge: number
  hybridization: "unknown"
  confidence: number
  sourcePrimitiveIds: string[]
}

export interface ChemicalAstEdge {
  id: number
  startNodeId: number
  endNodeId: number
  bondOrder: 1 | 2 | 3
  length: number
  direction: number
  confidence: number
  recovered: boolean
  original: boolean
  sourcePrimitiveIds: string[]
}

export interface ChemicalAstCycle {
  id: number
  nodeIds: number[]
  size: number
  confidence: number
}

export interface ChemicalAstComponent {
  id: number
  nodeIds: number[]
  edgeIds: number[]
}

export interface ChemicalAst {
  nodes: ChemicalAstNode[]
  edges: ChemicalAstEdge[]
  connectedComponents: ChemicalAstComponent[]
  cycles: ChemicalAstCycle[]
  branches: number[]
  fragments: ChemicalAstComponent[]
  reactionParticipants: ChemicalAstComponent[]
}

export interface SemanticIssue {
  id: string
  severity: "error" | "warning"
  explanation: string
}

export interface SemanticValidationResult {
  status: CompilerStatus
  issues: SemanticIssue[]
  valenceMap: Record<number, number>
  chargeMap: Record<number, number>
  explanations: string[]
}

export interface CanonicalGraphRepresentation {
  graph: MolecularGraph
  adjacencyList: Array<{ nodeId: number; atom: string; neighbors: Array<{ nodeId: number; bondOrder: 1 | 2 | 3 }> }>
  nodeOrdering: number[]
  edgeOrdering: number[]
  fingerprint: string
  hash: string
  canonicalGraphId: string
}

export interface CompilerIR {
  nodes: ChemicalAstNode[]
  edges: ChemicalAstEdge[]
  components: ChemicalAstComponent[]
  cycles: ChemicalAstCycle[]
  valenceMap: Record<number, number>
  chargeMap: Record<number, number>
  fingerprint: string
  hash: string
  canonicalGraphId: string
  canonicalGraph: MolecularGraph
  confidenceCeiling: number
}

export interface CompilerStageTiming {
  stage: string
  milliseconds: number
}

export interface CompilerReport {
  status: CompilerStatus
  visualTokens: VisualToken[]
  chemicalPrimitives: ChemicalPrimitive[]
  ast: ChemicalAst
  semanticValidation: SemanticValidationResult
  canonical: CanonicalGraphRepresentation | null
  ir: CompilerIR | null
  timings: CompilerStageTiming[]
  confidenceFlow: Array<{ stage: string; confidence: number; ceiling: number; reason: string }>
  knowledgeEngineInput: {
    available: boolean
    reason: string
    canonicalGraphId?: string
  }
}

export interface MolecularCompilerInput {
  analysis?: StructureVisionAnalysis | null
  graph?: MolecularGraph | null
  recognizedText?: string
}
