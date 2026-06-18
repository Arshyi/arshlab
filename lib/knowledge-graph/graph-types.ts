export type KnowledgeGraphNodeType =
  | "compound"
  | "functionalGroup"
  | "reaction"
  | "mechanism"
  | "formula"
  | "solver"
  | "practiceTopic"

export type KnowledgeGraphEdgeType =
  | "contains"
  | "reactsTo"
  | "oxidizesTo"
  | "reducesTo"
  | "usesMechanism"
  | "usesFormula"
  | "solvedBy"
  | "practiceWith"
  | "visualizedBy"

export type KnowledgeGraphCurriculum = "General Chemistry" | "Organic Chemistry" | "Both"

export interface KnowledgeGraphAction {
  label:
    | "View Compound"
    | "View Reaction"
    | "View Mechanism"
    | "View Formula"
    | "Open Solver"
    | "Practice This"
    | "Generate Exam Set"
  href: string
}

export interface KnowledgeGraphNode {
  id: string
  type: KnowledgeGraphNodeType
  label: string
  subtitle?: string
  description: string
  curriculum: KnowledgeGraphCurriculum
  pathwayIds: string[]
  searchText: string
  x: number
  y: number
  actions: KnowledgeGraphAction[]
}

export interface KnowledgeGraphEdge {
  id: string
  from: string
  to: string
  type: KnowledgeGraphEdgeType
  label: string
  pathwayId: string
}

export interface KnowledgeGraphPathway {
  id: string
  title: string
  curriculum: KnowledgeGraphCurriculum
  description: string
  nodeIds: string[]
}

export interface ChemistryKnowledgeGraph {
  nodes: KnowledgeGraphNode[]
  edges: KnowledgeGraphEdge[]
  pathways: KnowledgeGraphPathway[]
}

export interface ChemistryKnowledgeGraphMetrics {
  nodes: number
  edges: number
  pathways: number
  linkedTools: number
}
