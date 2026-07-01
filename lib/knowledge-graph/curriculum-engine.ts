import { KNOWLEDGE_GRAPH } from "./knowledge-graph"
import type { ChemistryKnowledgeEdge } from "./knowledge-edge"
import type { ChemistryKnowledgeCurriculum, ChemistryKnowledgeDifficulty, ChemistryKnowledgeNode } from "./knowledge-node"

export interface CurriculumGraphFilter {
  curriculum?: ChemistryKnowledgeCurriculum | "All"
  difficulty?: ChemistryKnowledgeDifficulty | "All"
}

export interface CurriculumGraphCoverage {
  visibleNodes: number
  visibleEdges: number
  completedTopics: number
  curriculumCoverage: number
  topicsCompleted: number
  learningProgress: number
}

export function filterKnowledgeGraphByCurriculum(filter: CurriculumGraphFilter = {}): {
  nodes: ChemistryKnowledgeNode[]
  edges: ChemistryKnowledgeEdge[]
} {
  const curriculum = filter.curriculum ?? "All"
  const difficulty = filter.difficulty ?? "All"
  const nodes = KNOWLEDGE_GRAPH.nodes.filter((node) => {
    const curriculumOk = curriculum === "All" || node.curriculum.includes(curriculum)
    const difficultyOk = difficulty === "All" || node.difficulty === difficulty
    return curriculumOk && difficultyOk
  })
  const visible = new Set(nodes.map((node) => node.id))
  const edges = KNOWLEDGE_GRAPH.edges.filter((edge) => visible.has(edge.from) && visible.has(edge.to))
  return { nodes, edges }
}

export function getCurriculumCoverage(filter: CurriculumGraphFilter = {}): CurriculumGraphCoverage {
  const graph = filterKnowledgeGraphByCurriculum(filter)
  const completedTopics = graph.nodes.filter((node) => node.completed).length
  const curriculumCoverage = graph.nodes.length
    ? Math.round((graph.edges.length / Math.max(1, graph.nodes.length * 2)) * 100)
    : 0
  const learningProgress = graph.nodes.length ? Math.round((completedTopics / graph.nodes.length) * 100) : 0

  return {
    visibleNodes: graph.nodes.length,
    visibleEdges: graph.edges.length,
    completedTopics,
    curriculumCoverage: Math.min(100, curriculumCoverage),
    topicsCompleted: completedTopics,
    learningProgress,
  }
}

export function getCurriculumGraphMode(curriculum: ChemistryKnowledgeCurriculum | "All") {
  const graph = filterKnowledgeGraphByCurriculum({ curriculum })
  const coverage = getCurriculumCoverage({ curriculum })
  return {
    curriculum,
    ...graph,
    coverage,
  }
}
