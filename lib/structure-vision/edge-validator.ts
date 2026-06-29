import type { MolecularGraph, MolecularGraphBond, MolecularGraphNode } from "../vision/molecular-graph"

export type EdgeValidationStatus = "accepted" | "rejected" | "weak" | "recovered"

export interface ValidatedEdge {
  bondId: number
  startNodeId: number
  endNodeId: number
  status: EdgeValidationStatus
  confidence: number
  length: number
  angle: number
  reasons: string[]
}

export interface EdgeValidationResult {
  edges: ValidatedEdge[]
  accepted: number
  rejected: number
  weak: number
  recovered: number
  crossingPairs: Array<[number, number]>
  duplicatePairs: Array<[number, number]>
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

function distance(left: { x: number; y: number }, right: { x: number; y: number }): number {
  return Math.hypot(left.x - right.x, left.y - right.y)
}

function angle(start: { x: number; y: number }, end: { x: number; y: number }): number {
  return (Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI + 180) % 180
}

function angleDifference(left: number, right: number): number {
  const difference = Math.abs(left - right) % 180
  return Math.min(difference, 180 - difference)
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
  const first = orientation(a, b, c)
  const second = orientation(a, b, d)
  const third = orientation(c, d, a)
  const fourth = orientation(c, d, b)
  return first * second < 0 && third * fourth < 0
}

function edgeKey(bond: MolecularGraphBond): string {
  return [bond.startNodeId, bond.endNodeId].sort((a, b) => a - b).join("-")
}

function nearestIdealAngle(value: number): number {
  const ideals = [0, 30, 45, 60, 90, 120, 135, 150]
  return Math.min(...ideals.map((ideal) => angleDifference(value, ideal)))
}

function nodeValences(graph: MolecularGraph): Map<number, number> {
  const values = new Map<number, number>()
  graph.nodes.forEach((node) => values.set(node.id, 0))
  graph.bonds.forEach((bond) => {
    values.set(bond.startNodeId, (values.get(bond.startNodeId) ?? 0) + bond.bondOrder)
    values.set(bond.endNodeId, (values.get(bond.endNodeId) ?? 0) + bond.bondOrder)
  })
  return values
}

function branchAngles(graph: MolecularGraph, nodeId: number): number[] {
  const node = nodeById(graph, nodeId)
  if (!node) return []
  return graph.bonds
    .filter((bond) => bond.startNodeId === nodeId || bond.endNodeId === nodeId)
    .map((bond) => {
      const other = nodeById(graph, bond.startNodeId === nodeId ? bond.endNodeId : bond.startNodeId)
      return other ? angle(node, other) : 0
    })
}

export function validateEdges(graph: MolecularGraph): EdgeValidationResult {
  const lengths = graph.bonds.map((bond) => {
    const start = nodeById(graph, bond.startNodeId)
    const end = nodeById(graph, bond.endNodeId)
    return start && end ? distance(start, end) : 0
  }).filter((value) => value > 0)
  const meanLength = lengths.reduce((sum, value) => sum + value, 0) / Math.max(1, lengths.length)
  const valences = nodeValences(graph)
  const seen = new Map<string, number>()
  const crossingPairs: Array<[number, number]> = []
  const duplicatePairs: Array<[number, number]> = []

  graph.bonds.forEach((bond, index) => {
    const key = edgeKey(bond)
    const existing = seen.get(key)
    if (existing !== undefined) duplicatePairs.push([existing, bond.id])
    else seen.set(key, bond.id)
    const start = nodeById(graph, bond.startNodeId)
    const end = nodeById(graph, bond.endNodeId)
    if (!start || !end) return
    graph.bonds.slice(index + 1).forEach((other) => {
      if ([bond.startNodeId, bond.endNodeId].includes(other.startNodeId) || [bond.startNodeId, bond.endNodeId].includes(other.endNodeId)) return
      const otherStart = nodeById(graph, other.startNodeId)
      const otherEnd = nodeById(graph, other.endNodeId)
      if (otherStart && otherEnd && segmentsIntersect(start, end, otherStart, otherEnd)) {
        crossingPairs.push([bond.id, other.id])
      }
    })
  })

  const edges = graph.bonds.map((bond): ValidatedEdge => {
    const reasons: string[] = []
    const start = nodeById(graph, bond.startNodeId)
    const end = nodeById(graph, bond.endNodeId)
    const length = start && end ? distance(start, end) : 0
    const edgeAngle = start && end ? angle(start, end) : 0
    let status: EdgeValidationStatus = bond.gapBridged ? "recovered" : "accepted"
    let confidence = bond.confidence

    if (!start || !end) {
      status = "rejected"
      confidence = 0
      reasons.push("Edge references a missing endpoint node.")
    }
    if (bond.startNodeId === bond.endNodeId) {
      status = "rejected"
      confidence = 0
      reasons.push("Edge loop connects a node to itself.")
    }
    if (duplicatePairs.some((pair) => pair.includes(bond.id))) {
      status = "rejected"
      confidence = Math.min(confidence, 20)
      reasons.push("Duplicate bond between the same two graph nodes.")
    }
    if (crossingPairs.some((pair) => pair.includes(bond.id))) {
      status = "rejected"
      confidence = Math.min(confidence, 25)
      reasons.push("Bond crosses another bond without a shared atom.")
    }
    if (length > 0 && meanLength > 0 && (length > meanLength * 2.15 || length < meanLength * 0.28)) {
      status = "rejected"
      confidence = Math.min(confidence, 32)
      reasons.push("Endpoint distance is inconsistent with the molecular bond-length scale.")
    }
    if (nearestIdealAngle(edgeAngle) > 28) {
      if (status === "accepted") status = "weak"
      confidence = Math.min(confidence, 62)
      reasons.push("Bond angle deviates from common drawing directions.")
    }
    ;[start, end].filter(Boolean).forEach((node) => {
      if (!node) return
      const maximum = VALENCE[node.inferredElement] ?? 4
      if ((valences.get(node.id) ?? 0) > maximum) {
        status = "rejected"
        confidence = Math.min(confidence, 24)
        reasons.push(`${node.inferredElement} atom exceeds valence allowance.`)
      }
      const angles = branchAngles(graph, node.id).sort((left, right) => left - right)
      if (angles.length >= 3) {
        const minimumSeparation = Math.min(...angles.map((value, index) => angleDifference(value, angles[(index + 1) % angles.length] ?? value)))
        if (minimumSeparation < 14) {
          if (status === "accepted") status = "weak"
          confidence = Math.min(confidence, 58)
          reasons.push("Branch geometry has compressed angles.")
        }
      }
    })
    if (bond.confidence < 38 && status !== "rejected") {
      status = "weak"
      reasons.push("Low edge confidence from upstream reconstruction.")
    }
    if (bond.gapBridged && status !== "rejected") {
      status = "recovered"
      reasons.push("Recovered edge came from a bridged gap and needs bridge validation.")
    }
    if (!reasons.length) reasons.push("Edge geometry is consistent with the local molecular graph.")
    return {
      bondId: bond.id,
      startNodeId: bond.startNodeId,
      endNodeId: bond.endNodeId,
      status,
      confidence: Math.round(confidence),
      length: Math.round(length * 10) / 10,
      angle: Math.round(edgeAngle),
      reasons,
    }
  })

  return {
    edges,
    accepted: edges.filter((edge) => edge.status === "accepted").length,
    rejected: edges.filter((edge) => edge.status === "rejected").length,
    weak: edges.filter((edge) => edge.status === "weak").length,
    recovered: edges.filter((edge) => edge.status === "recovered").length,
    crossingPairs,
    duplicatePairs,
  }
}
