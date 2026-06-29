import type { MolecularGraph, MolecularGraphBond, MolecularGraphNode } from "../vision/molecular-graph"
import type { EdgeValidationResult } from "./edge-validator"
import type { CycleValidationResult } from "./cycle-validator"

export interface GraphComponentFingerprint {
  id: number
  atoms: number
  edges: number
  terminalAtoms: number
  degreeHistogram: Record<number, number>
  cycleCount: number
  branchCount: number
  maximumPathLength: number
  averageBondLength: number
}

export interface GraphFingerprint {
  connectedComponents: number
  nodes: number
  edges: number
  cycles: number
  branches: number
  terminalAtoms: number
  averageDegree: number
  maximumPathLength: number
  averageBondLength: number
  candidateTopology: string
  components: GraphComponentFingerprint[]
}

export interface GraphSanityIssue {
  id: string
  severity: "error" | "warning"
  explanation: string
}

export interface GraphSanityResult {
  passed: boolean
  issues: GraphSanityIssue[]
  fingerprint: GraphFingerprint
}

const VALENCE: Record<string, number> = {
  C: 4,
  H: 1,
  O: 2,
  N: 3,
  S: 6,
  P: 5,
  F: 1,
  Cl: 1,
  Br: 1,
  I: 1,
  Unknown: 4,
}

function nodeById(graph: MolecularGraph, id: number): MolecularGraphNode | undefined {
  return graph.nodes.find((node) => node.id === id)
}

function bondLength(graph: MolecularGraph, bond: MolecularGraphBond): number {
  const start = nodeById(graph, bond.startNodeId)
  const end = nodeById(graph, bond.endNodeId)
  return start && end ? Math.hypot(end.x - start.x, end.y - start.y) : 0
}

function buildAdjacency(graph: MolecularGraph): Map<number, number[]> {
  const adjacency = new Map<number, number[]>()
  graph.nodes.forEach((node) => adjacency.set(node.id, []))
  graph.bonds.forEach((bond) => {
    adjacency.get(bond.startNodeId)?.push(bond.endNodeId)
    adjacency.get(bond.endNodeId)?.push(bond.startNodeId)
  })
  return adjacency
}

function connectedComponents(graph: MolecularGraph): number[][] {
  const adjacency = buildAdjacency(graph)
  const seen = new Set<number>()
  const components: number[][] = []
  graph.nodes.forEach((node) => {
    if (seen.has(node.id)) return
    const component: number[] = []
    const stack = [node.id]
    seen.add(node.id)
    while (stack.length) {
      const current = stack.pop()
      if (current === undefined) continue
      component.push(current)
      adjacency.get(current)?.forEach((next) => {
        if (!seen.has(next)) {
          seen.add(next)
          stack.push(next)
        }
      })
    }
    components.push(component)
  })
  return components
}

function longestPath(component: number[], adjacency: Map<number, number[]>): number {
  let longest = 0
  const walk = (current: number, visited: Set<number>) => {
    longest = Math.max(longest, visited.size - 1)
    adjacency.get(current)?.forEach((next) => {
      if (visited.has(next) || !component.includes(next)) return
      const nextVisited = new Set(visited)
      nextVisited.add(next)
      walk(next, nextVisited)
    })
  }
  component.forEach((nodeId) => walk(nodeId, new Set([nodeId])))
  return longest
}

function topologyLabel(graph: MolecularGraph, fingerprint: Omit<GraphFingerprint, "candidateTopology">): string {
  if (fingerprint.connectedComponents > 1) return "Disconnected fragments"
  if (fingerprint.cycles > 0 && graph.aromatic) return "Aromatic ring topology"
  if (fingerprint.cycles > 0) return `${fingerprint.cycles}-ring cyclic topology`
  if (graph.estimates.tripleBonds > 0) return "Open chain alkyne"
  if (graph.estimates.doubleBonds > 0) return "Open chain alkene/carbonyl topology"
  if (graph.nodes.some((node) => node.inferredElement === "O")) return "Open chain alcohol/ether-like topology"
  return "Open chain hydrocarbon topology"
}

export function analyzeGraphSanity(
  graph: MolecularGraph,
  edgeValidation: EdgeValidationResult,
  cycleValidation: CycleValidationResult,
): GraphSanityResult {
  const issues: GraphSanityIssue[] = []
  const duplicateNodes = graph.nodes.length - new Set(graph.nodes.map((node) => node.id)).size
  if (duplicateNodes > 0) issues.push({ id: "duplicate-nodes", severity: "error", explanation: "Graph contains duplicate node identifiers." })
  const loops = graph.bonds.filter((bond) => bond.startNodeId === bond.endNodeId)
  if (loops.length) issues.push({ id: "edge-loops", severity: "error", explanation: "Graph contains edge loops." })
  if (edgeValidation.duplicatePairs.length) issues.push({ id: "duplicate-bonds", severity: "error", explanation: "Graph contains duplicate bonds between the same endpoints." })
  if (edgeValidation.crossingPairs.length) issues.push({ id: "crossing-bonds", severity: "error", explanation: "Graph contains crossing bonds that do not share an atom." })
  const adjacency = buildAdjacency(graph)
  const components = connectedComponents(graph)
  if (components.length > 1) issues.push({ id: "graph-islands", severity: "warning", explanation: "Graph has multiple disconnected components." })
  graph.nodes.forEach((node) => {
    const degree = adjacency.get(node.id)?.length ?? 0
    if (degree === 0) issues.push({ id: `floating-${node.id}`, severity: "warning", explanation: `Node ${node.id} is a floating atom.` })
    const valence = graph.bonds
      .filter((bond) => bond.startNodeId === node.id || bond.endNodeId === node.id)
      .reduce((sum, bond) => sum + bond.bondOrder, 0)
    if (valence > (VALENCE[node.inferredElement] ?? 4)) {
      issues.push({ id: `valence-${node.id}`, severity: "error", explanation: `${node.inferredElement} node ${node.id} exceeds valence.` })
    }
  })
  graph.bonds.forEach((bond) => {
    const startDegree = adjacency.get(bond.startNodeId)?.length ?? 0
    const endDegree = adjacency.get(bond.endNodeId)?.length ?? 0
    if (startDegree === 1 && endDegree === 1 && graph.bonds.length > 1) {
      issues.push({ id: `isolated-bond-${bond.id}`, severity: "warning", explanation: `Bond ${bond.id} forms a small isolated branch.` })
    }
  })
  if (cycleValidation.rejected > 0) issues.push({ id: "rejected-cycles", severity: "warning", explanation: "One or more detected cycles failed ring validation." })
  const aromaticComponents = components.filter((component) =>
    graph.rings.some((ring) => ring.aromatic && ring.nodeIds.some((nodeId) => component.includes(nodeId))),
  )
  if (aromaticComponents.length > 1) {
    issues.push({ id: "disconnected-aromatics", severity: "error", explanation: "Multiple disconnected aromatic systems were detected." })
  }

  const componentFingerprints = components.map((component, id): GraphComponentFingerprint => {
    const componentEdges = graph.bonds.filter((bond) => component.includes(bond.startNodeId) && component.includes(bond.endNodeId))
    const degrees = component.map((nodeId) => adjacency.get(nodeId)?.length ?? 0)
    const degreeHistogram: Record<number, number> = {}
    degrees.forEach((degree) => { degreeHistogram[degree] = (degreeHistogram[degree] ?? 0) + 1 })
    const lengths = componentEdges.map((bond) => bondLength(graph, bond)).filter((length) => length > 0)
    return {
      id,
      atoms: component.length,
      edges: componentEdges.length,
      terminalAtoms: degrees.filter((degree) => degree <= 1).length,
      degreeHistogram,
      cycleCount: graph.rings.filter((ring) => ring.nodeIds.every((nodeId) => component.includes(nodeId))).length,
      branchCount: degrees.filter((degree) => degree >= 3).length,
      maximumPathLength: longestPath(component, adjacency),
      averageBondLength: Math.round((lengths.reduce((sum, length) => sum + length, 0) / Math.max(1, lengths.length)) * 10) / 10,
    }
  })
  const allDegrees = graph.nodes.map((node) => adjacency.get(node.id)?.length ?? 0)
  const baseFingerprint = {
    connectedComponents: components.length,
    nodes: graph.nodes.length,
    edges: graph.bonds.length,
    cycles: graph.rings.length,
    branches: allDegrees.filter((degree) => degree >= 3).length,
    terminalAtoms: allDegrees.filter((degree) => degree <= 1).length,
    averageDegree: Math.round((allDegrees.reduce((sum, degree) => sum + degree, 0) / Math.max(1, allDegrees.length)) * 100) / 100,
    maximumPathLength: Math.max(0, ...componentFingerprints.map((component) => component.maximumPathLength)),
    averageBondLength: Math.round((graph.bonds.map((bond) => bondLength(graph, bond)).reduce((sum, length) => sum + length, 0) / Math.max(1, graph.bonds.length)) * 10) / 10,
    components: componentFingerprints,
  }
  return {
    passed: !issues.some((issue) => issue.severity === "error"),
    issues,
    fingerprint: {
      ...baseFingerprint,
      candidateTopology: topologyLabel(graph, baseFingerprint),
    },
  }
}
