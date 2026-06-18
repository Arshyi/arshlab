import {
  CHEMISTRY_GRAPH_EDGES,
  CHEMISTRY_GRAPH_NODES,
  getKnowledgeGraphNode,
} from "@/lib/knowledge-graph/chemistry-graph"
import { deepLinkSlug } from "@/lib/deep-links"
import type { KnowledgeGraphEdge, KnowledgeGraphNode } from "@/lib/knowledge-graph/graph-types"
import type {
  SynthesisDifficulty,
  SynthesisExplorerStats,
  SynthesisPathwayHistoryEntry,
  SynthesisPathwayResult,
  SynthesisPathwayStep,
} from "./pathway-types"

export const SYNTHESIS_HISTORY_STORAGE_KEY = "arshlab.synthesisExplorer.history.v1"
const MAX_SYNTHESIS_HISTORY = 10

const ADJACENCY = CHEMISTRY_GRAPH_EDGES.reduce((map, edge) => {
  const current = map.get(edge.from) ?? []
  current.push(edge)
  map.set(edge.from, current)
  return map
}, new Map<string, KnowledgeGraphEdge[]>())

export function listSynthesisCompoundNodes(): KnowledgeGraphNode[] {
  return CHEMISTRY_GRAPH_NODES.filter((node) => node.type === "compound").sort((a, b) =>
    a.label.localeCompare(b.label),
  )
}

export function resolveSynthesisCompound(value: string | null | undefined): KnowledgeGraphNode | undefined {
  if (!value) return undefined
  const direct = getKnowledgeGraphNode(value)
  if (direct?.type === "compound") return direct

  const slug = deepLinkSlug(value)
  return listSynthesisCompoundNodes().find(
    (node) =>
      deepLinkSlug(node.id.replace(/^compound:/, "")) === slug ||
      deepLinkSlug(node.label) === slug ||
      deepLinkSlug(node.subtitle ?? "") === slug,
  )
}

function estimateDifficulty(nodes: KnowledgeGraphNode[], totalSteps: number): SynthesisDifficulty {
  const mechanisms = nodes.filter((node) => node.type === "mechanism").length
  if (totalSteps <= 1 && mechanisms === 0) return "Introductory"
  if (totalSteps <= 2 && mechanisms <= 1) return "Intermediate"
  return "Advanced"
}

function reactionNameForStep(edge: KnowledgeGraphEdge, from: KnowledgeGraphNode, to: KnowledgeGraphNode): string {
  if (from.type === "reaction" || from.type === "mechanism") return from.label
  if (to.type === "reaction" || to.type === "mechanism") return to.label
  return edge.label
}

function buildResult(pathNodeIds: string[], edgeIds: string[]): SynthesisPathwayResult | null {
  const nodes = pathNodeIds
    .map((id) => CHEMISTRY_GRAPH_NODES.find((node) => node.id === id))
    .filter((node): node is KnowledgeGraphNode => Boolean(node))
  const edges = edgeIds
    .map((id) => CHEMISTRY_GRAPH_EDGES.find((edge) => edge.id === id))
    .filter((edge): edge is KnowledgeGraphEdge => Boolean(edge))

  if (nodes.length < 2 || nodes.length !== edges.length + 1) return null

  const steps: SynthesisPathwayStep[] = edges.map((edge, index) => {
    const from = nodes[index]
    const to = nodes[index + 1]
    return {
      index: index + 1,
      from,
      to,
      edge,
      reactionName: reactionNameForStep(edge, from, to),
    }
  })

  const totalSteps = nodes.filter((node) => node.type === "reaction" || node.type === "mechanism").length
  const start = nodes[0]
  const target = nodes[nodes.length - 1]

  return {
    start,
    target,
    nodes,
    edges,
    steps,
    intermediateCompounds: nodes.filter((node) => node.type === "compound" && node.id !== start.id && node.id !== target.id),
    totalSteps,
    difficulty: estimateDifficulty(nodes, totalSteps),
  }
}

export function findSynthesisPathway(
  startValue: string | null | undefined,
  targetValue: string | null | undefined,
): SynthesisPathwayResult | null {
  const start = resolveSynthesisCompound(startValue)
  const target = resolveSynthesisCompound(targetValue)

  if (!start || !target || start.id === target.id) return null

  const queue: Array<{ nodeId: string; pathNodeIds: string[]; edgeIds: string[] }> = [
    { nodeId: start.id, pathNodeIds: [start.id], edgeIds: [] },
  ]
  const visited = new Set<string>([start.id])

  while (queue.length > 0) {
    const current = queue.shift()
    if (!current) break

    for (const edge of ADJACENCY.get(current.nodeId) ?? []) {
      if (visited.has(edge.to)) continue

      const nextPathNodeIds = [...current.pathNodeIds, edge.to]
      const nextEdgeIds = [...current.edgeIds, edge.id]

      if (edge.to === target.id) {
        return buildResult(nextPathNodeIds, nextEdgeIds)
      }

      visited.add(edge.to)
      queue.push({ nodeId: edge.to, pathNodeIds: nextPathNodeIds, edgeIds: nextEdgeIds })
    }
  }

  return null
}

export function synthesisExplorerHref(startId?: string, targetId?: string): string {
  const params = new URLSearchParams()
  if (startId) params.set("start", startId.replace(/^compound:/, ""))
  if (targetId) params.set("target", targetId.replace(/^compound:/, ""))
  return `/synthesis-explorer${params.toString() ? `?${params.toString()}` : ""}#synthesis-pathway`
}

export function getSynthesisPathfinderMetrics() {
  return {
    compounds: listSynthesisCompoundNodes().length,
    graphEdges: CHEMISTRY_GRAPH_EDGES.length,
    graphNodes: CHEMISTRY_GRAPH_NODES.length,
  }
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined"
}

export function readSynthesisHistory(): SynthesisPathwayHistoryEntry[] {
  if (!canUseStorage()) return []
  try {
    const raw = window.localStorage.getItem(SYNTHESIS_HISTORY_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((entry): entry is SynthesisPathwayHistoryEntry => {
      return (
        typeof entry?.id === "string" &&
        typeof entry?.startId === "string" &&
        typeof entry?.startLabel === "string" &&
        typeof entry?.targetId === "string" &&
        typeof entry?.targetLabel === "string" &&
        typeof entry?.totalSteps === "number" &&
        typeof entry?.timestamp === "string"
      )
    })
  } catch {
    return []
  }
}

export function writeSynthesisHistory(entries: SynthesisPathwayHistoryEntry[]): void {
  if (!canUseStorage()) return
  window.localStorage.setItem(SYNTHESIS_HISTORY_STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_SYNTHESIS_HISTORY)))
}

export function recordSynthesisPathway(result: SynthesisPathwayResult): SynthesisPathwayHistoryEntry[] {
  const entry: SynthesisPathwayHistoryEntry = {
    id: `${result.start.id}-${result.target.id}-${Date.now()}`,
    startId: result.start.id,
    startLabel: result.start.label,
    targetId: result.target.id,
    targetLabel: result.target.label,
    totalSteps: result.totalSteps,
    difficulty: result.difficulty,
    timestamp: new Date().toISOString(),
  }
  const next = [entry, ...readSynthesisHistory()].slice(0, MAX_SYNTHESIS_HISTORY)
  writeSynthesisHistory(next)
  return next
}

function topCounts(values: string[], limit = 4): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>()
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1))
  return Array.from(counts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, limit)
}

export function getSynthesisExplorerStats(history = readSynthesisHistory()): SynthesisExplorerStats {
  return {
    pathwaysExplored: history.length,
    mostSearchedCompounds: topCounts(history.flatMap((entry) => [entry.startLabel, entry.targetLabel])),
    longestPathwayCompleted: history.reduce((max, entry) => Math.max(max, entry.totalSteps), 0),
    recent: history.slice(0, MAX_SYNTHESIS_HISTORY),
  }
}
