import { filterKnowledgeGraphByCurriculum, getCurriculumCoverage, type CurriculumGraphFilter } from "./curriculum-engine"
import { layoutKnowledgeGraph } from "./graph-layout"
import { KNOWLEDGE_GRAPH } from "./knowledge-graph"
import { resolveKnowledgeNodeId, searchKnowledgeGraph } from "./knowledge-search"
import type { ChemistryKnowledgeEdge } from "./knowledge-edge"
import type { ChemistryKnowledgeNode } from "./knowledge-node"

export interface KnowledgeGraphMetrics {
  nodes: number
  edges: number
  connectedComponents: number
  averageDegree: number
  curriculumCoverage: number
  topicsCompleted: number
  learningProgress: number
}

export interface HighlightedKnowledgeGraph {
  selected: ChemistryKnowledgeNode | null
  neighbors: ChemistryKnowledgeNode[]
  edges: ChemistryKnowledgeEdge[]
}

function adjacency(
  edges = KNOWLEDGE_GRAPH.edges,
  includeEdge: (edge: ChemistryKnowledgeEdge) => boolean = () => true,
): Map<string, string[]> {
  const map = new Map<string, string[]>()
  for (const edge of edges) {
    if (!includeEdge(edge)) continue
    map.set(edge.from, [...(map.get(edge.from) ?? []), edge.to])
    map.set(edge.to, [...(map.get(edge.to) ?? []), edge.from])
  }
  return map
}

export function getKnowledgeNode(id: string | undefined): ChemistryKnowledgeNode | undefined {
  const resolved = resolveKnowledgeNodeId(id)
  return KNOWLEDGE_GRAPH.nodes.find((node) => node.id === resolved)
}

export function getNeighborIds(id: string): string[] {
  const neighbors = new Set<string>()
  for (const edge of KNOWLEDGE_GRAPH.edges) {
    if (edge.from === id) neighbors.add(edge.to)
    if (edge.to === id) neighbors.add(edge.from)
  }
  return [...neighbors]
}

export function getHighlightedSubgraph(id: string | undefined): HighlightedKnowledgeGraph {
  const selected = getKnowledgeNode(id) ?? null
  if (!selected) return { selected: null, neighbors: [], edges: [] }
  const neighborIds = new Set(getNeighborIds(selected.id))
  return {
    selected,
    neighbors: KNOWLEDGE_GRAPH.nodes.filter((node) => neighborIds.has(node.id)),
    edges: KNOWLEDGE_GRAPH.edges.filter((edge) => edge.from === selected.id || edge.to === selected.id),
  }
}

export function findShortestEducationalPath(from: string, to: string): ChemistryKnowledgeNode[] {
  const start = resolveKnowledgeNodeId(from)
  const target = resolveKnowledgeNodeId(to)
  if (!start || !target) return []
  if (start === target) return getKnowledgeNode(start) ? [getKnowledgeNode(start)!] : []

  const preferredEdge = (edge: ChemistryKnowledgeEdge) => edge.type !== "exampleOf" && edge.type !== "similarTo"
  const preferredPath = findPathWithAdjacency(start, target, adjacency(KNOWLEDGE_GRAPH.edges, preferredEdge))
  if (preferredPath.length) return preferredPath

  return findPathWithAdjacency(start, target, adjacency())
}

function findPathWithAdjacency(start: string, target: string, graph: Map<string, string[]>): ChemistryKnowledgeNode[] {
  const queue: string[][] = [[start]]
  const visited = new Set([start])

  while (queue.length) {
    const path = queue.shift()!
    const current = path[path.length - 1]
    for (const next of graph.get(current) ?? []) {
      if (visited.has(next)) continue
      const nextPath = [...path, next]
      if (next === target) {
        return nextPath
          .map((id) => getKnowledgeNode(id))
          .filter((node): node is ChemistryKnowledgeNode => Boolean(node))
      }
      visited.add(next)
      queue.push(nextPath)
    }
  }

  return []
}

export function getAromaticityLearningPath(): ChemistryKnowledgeNode[] {
  return [
    "hybridization:sp2",
    "orbital:p-orbital",
    "concept:conjugation",
    "concept:resonance",
    "concept:huckel-rule",
    "concept:aromaticity",
    "compound:benzene",
    "practice:aromaticity",
  ]
    .map((id) => getKnowledgeNode(id))
    .filter((node): node is ChemistryKnowledgeNode => Boolean(node))
}

export function getKnowledgeGraphMetrics(filter: CurriculumGraphFilter = {}): KnowledgeGraphMetrics {
  const graph = filterKnowledgeGraphByCurriculum(filter)
  const graphAdjacency = adjacency(graph.edges)
  const visibleIds = new Set(graph.nodes.map((node) => node.id))
  const visited = new Set<string>()
  let connectedComponents = 0

  for (const node of graph.nodes) {
    if (visited.has(node.id)) continue
    connectedComponents += 1
    const stack = [node.id]
    visited.add(node.id)
    while (stack.length) {
      const current = stack.pop()!
      for (const next of graphAdjacency.get(current) ?? []) {
        if (!visibleIds.has(next) || visited.has(next)) continue
        visited.add(next)
        stack.push(next)
      }
    }
  }

  const coverage = getCurriculumCoverage(filter)
  return {
    nodes: graph.nodes.length,
    edges: graph.edges.length,
    connectedComponents,
    averageDegree: graph.nodes.length ? Number(((graph.edges.length * 2) / graph.nodes.length).toFixed(1)) : 0,
    curriculumCoverage: coverage.curriculumCoverage,
    topicsCompleted: coverage.topicsCompleted,
    learningProgress: coverage.learningProgress,
  }
}

export function getInteractiveKnowledgeGraph(filter: CurriculumGraphFilter = {}) {
  const graph = filterKnowledgeGraphByCurriculum(filter)
  return {
    ...graph,
    layout: layoutKnowledgeGraph(graph.nodes, graph.edges),
    metrics: getKnowledgeGraphMetrics(filter),
  }
}

export function knowledgeGraphHref(input: { focus?: string; query?: string; curriculum?: string; difficulty?: string } = {}): string {
  const params = new URLSearchParams()
  if (input.focus) params.set("focus", input.focus)
  if (input.query) params.set("q", input.query)
  if (input.curriculum) params.set("curriculum", input.curriculum)
  if (input.difficulty) params.set("difficulty", input.difficulty)
  const suffix = params.toString()
  return `/knowledge-graph${suffix ? `?${suffix}` : ""}`
}

export function scannerKnowledgeGraphHref(compoundId: string): string {
  return knowledgeGraphHref({ focus: `compound:${compoundId}` })
}

export function mechanismKnowledgeGraphHref(mechanismOrReactionId: string): string {
  const mechanismFocus = `mechanism:${mechanismOrReactionId}`
  if (getKnowledgeNode(mechanismFocus)) return knowledgeGraphHref({ focus: mechanismFocus })
  const reactionFocus = `reaction:${mechanismOrReactionId}`
  return knowledgeGraphHref({ focus: reactionFocus })
}

export function searchAndFocusKnowledgeGraph(query: string) {
  const result = searchKnowledgeGraph(query, { limit: 1 })[0]
  return result ? knowledgeGraphHref({ focus: result.id, query }) : knowledgeGraphHref({ query })
}
