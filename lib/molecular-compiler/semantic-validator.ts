import type { ChemicalAst, SemanticIssue, SemanticValidationResult } from "./compiler-types"

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

function orientation(a: { x: number; y: number }, b: { x: number; y: number }, c: { x: number; y: number }): number {
  return (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y)
}

function segmentsIntersect(
  a: { x: number; y: number },
  b: { x: number; y: number },
  c: { x: number; y: number },
  d: { x: number; y: number },
): boolean {
  return orientation(a, b, c) * orientation(a, b, d) < 0 && orientation(c, d, a) * orientation(c, d, b) < 0
}

function edgeKey(left: number, right: number): string {
  return [left, right].sort((a, b) => a - b).join("-")
}

export function validateChemicalSemantics(ast: ChemicalAst): SemanticValidationResult {
  const issues: SemanticIssue[] = []
  const valenceMap: Record<number, number> = {}
  const chargeMap: Record<number, number> = {}
  ast.nodes.forEach((node) => {
    valenceMap[node.id] = ast.edges
      .filter((edge) => edge.startNodeId === node.id || edge.endNodeId === node.id)
      .reduce((sum, edge) => sum + edge.bondOrder, 0)
    chargeMap[node.id] = node.charge
    const maxValence = VALENCE[node.atomType] ?? 4
    if (valenceMap[node.id] > maxValence) {
      issues.push({
        id: `valence-${node.id}`,
        severity: "error",
        explanation: `${node.atomType} atom ${node.id} exceeds allowed valence (${valenceMap[node.id]}/${maxValence}).`,
      })
    }
    if (Math.abs(node.charge) > 3) {
      issues.push({ id: `charge-${node.id}`, severity: "error", explanation: `Atom ${node.id} has an impossible charge magnitude.` })
    }
  })

  const nodeIds = new Set(ast.nodes.map((node) => node.id))
  if (nodeIds.size !== ast.nodes.length) {
    issues.push({ id: "duplicate-atom", severity: "error", explanation: "AST contains duplicate atom identifiers." })
  }

  const seenEdges = new Set<string>()
  ast.edges.forEach((edge) => {
    if (edge.startNodeId === edge.endNodeId) {
      issues.push({ id: `self-edge-${edge.id}`, severity: "error", explanation: `Bond ${edge.id} connects an atom to itself.` })
    }
    if (!nodeIds.has(edge.startNodeId) || !nodeIds.has(edge.endNodeId)) {
      issues.push({ id: `missing-node-${edge.id}`, severity: "error", explanation: `Bond ${edge.id} references a missing atom.` })
    }
    const key = edgeKey(edge.startNodeId, edge.endNodeId)
    if (seenEdges.has(key)) {
      issues.push({ id: `duplicate-bond-${edge.id}`, severity: "error", explanation: `Duplicate bond between atoms ${edge.startNodeId} and ${edge.endNodeId}.` })
    }
    seenEdges.add(key)
  })

  for (let i = 0; i < ast.edges.length; i += 1) {
    const first = ast.edges[i]
    const firstStart = ast.nodes.find((node) => node.id === first.startNodeId)
    const firstEnd = ast.nodes.find((node) => node.id === first.endNodeId)
    if (!firstStart || !firstEnd) continue
    for (let j = i + 1; j < ast.edges.length; j += 1) {
      const second = ast.edges[j]
      if ([first.startNodeId, first.endNodeId].includes(second.startNodeId) || [first.startNodeId, first.endNodeId].includes(second.endNodeId)) continue
      const secondStart = ast.nodes.find((node) => node.id === second.startNodeId)
      const secondEnd = ast.nodes.find((node) => node.id === second.endNodeId)
      if (!secondStart || !secondEnd) continue
      if (segmentsIntersect(firstStart.coordinates, firstEnd.coordinates, secondStart.coordinates, secondEnd.coordinates)) {
        issues.push({ id: `crossing-${first.id}-${second.id}`, severity: "error", explanation: `Bonds ${first.id} and ${second.id} cross without sharing an atom.` })
      }
    }
  }

  ast.cycles.forEach((cycle) => {
    if (cycle.size < 3 || cycle.size > 8) {
      issues.push({ id: `cycle-size-${cycle.id}`, severity: "error", explanation: `Cycle ${cycle.id} has chemically unsupported size ${cycle.size}.` })
    }
    if (new Set(cycle.nodeIds).size !== cycle.nodeIds.length) {
      issues.push({ id: `cycle-repeat-${cycle.id}`, severity: "error", explanation: `Cycle ${cycle.id} repeats atoms and is not a valid cycle.` })
    }
    if (!cycle.nodeIds.every((nodeId) => nodeIds.has(nodeId))) {
      issues.push({ id: `cycle-missing-${cycle.id}`, severity: "error", explanation: `Cycle ${cycle.id} references missing atoms.` })
    }
  })

  if (ast.fragments.length > 1) {
    issues.push({ id: "floating-fragments", severity: "warning", explanation: "Multiple small floating fragments were found in the AST." })
  }
  if (ast.connectedComponents.length > 1) {
    issues.push({ id: "disconnected-components", severity: "warning", explanation: "AST contains multiple disconnected components." })
  }
  if (!ast.nodes.length || !ast.edges.length) {
    issues.push({ id: "empty-ast", severity: "error", explanation: "AST does not contain enough atoms and bonds for chemistry interpretation." })
  }

  const status = issues.some((issue) => issue.severity === "error")
    ? "fail"
    : issues.some((issue) => issue.severity === "warning")
      ? "pass-with-warnings"
      : "pass"

  return {
    status,
    issues,
    valenceMap,
    chargeMap,
    explanations: issues.length
      ? issues.map((issue) => issue.explanation)
      : ["Semantic validation passed: connectivity, cycles, valence, and fragments are usable."],
  }
}
