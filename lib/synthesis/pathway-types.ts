import type { KnowledgeGraphEdge, KnowledgeGraphNode } from "@/lib/knowledge-graph/graph-types"

export type SynthesisDifficulty = "Introductory" | "Intermediate" | "Advanced"

export interface SynthesisPathwayStep {
  index: number
  from: KnowledgeGraphNode
  to: KnowledgeGraphNode
  edge: KnowledgeGraphEdge
  reactionName: string
}

export interface SynthesisPathwayResult {
  start: KnowledgeGraphNode
  target: KnowledgeGraphNode
  nodes: KnowledgeGraphNode[]
  edges: KnowledgeGraphEdge[]
  steps: SynthesisPathwayStep[]
  intermediateCompounds: KnowledgeGraphNode[]
  totalSteps: number
  difficulty: SynthesisDifficulty
}

export interface SynthesisPathwayHistoryEntry {
  id: string
  startId: string
  startLabel: string
  targetId: string
  targetLabel: string
  totalSteps: number
  difficulty: SynthesisDifficulty
  timestamp: string
}

export interface SynthesisExplorerStats {
  pathwaysExplored: number
  mostSearchedCompounds: Array<{ name: string; count: number }>
  longestPathwayCompleted: number
  recent: SynthesisPathwayHistoryEntry[]
}
