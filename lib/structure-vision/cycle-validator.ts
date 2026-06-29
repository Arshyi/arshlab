import type { MolecularGraph, MolecularGraphNode, MolecularRingKind } from "../vision/molecular-graph"
import type { EdgeValidationResult } from "./edge-validator"

export type CycleValidationStatus = "accepted" | "rejected" | "warning"

export interface ValidatedCycle {
  ringId: number
  nodeIds: number[]
  size: number
  status: CycleValidationStatus
  confidence: number
  aromatic: boolean
  kind: MolecularRingKind
  reasons: string[]
}

export interface CycleValidationResult {
  cycles: ValidatedCycle[]
  accepted: number
  rejected: number
  warnings: number
}

function nodeById(graph: MolecularGraph, id: number): MolecularGraphNode | undefined {
  return graph.nodes.find((node) => node.id === id)
}

function distance(left: MolecularGraphNode, right: MolecularGraphNode): number {
  return Math.hypot(left.x - right.x, left.y - right.y)
}

function angleBetween(previous: MolecularGraphNode, current: MolecularGraphNode, next: MolecularGraphNode): number {
  const first = Math.atan2(previous.y - current.y, previous.x - current.x)
  const second = Math.atan2(next.y - current.y, next.x - current.x)
  let value = Math.abs((second - first) * 180 / Math.PI)
  if (value > 180) value = 360 - value
  return value
}

function edgeExists(graph: MolecularGraph, left: number, right: number): boolean {
  return graph.bonds.some((bond) =>
    (bond.startNodeId === left && bond.endNodeId === right) ||
    (bond.startNodeId === right && bond.endNodeId === left),
  )
}

function segmentIntersection(a: MolecularGraphNode, b: MolecularGraphNode, c: MolecularGraphNode, d: MolecularGraphNode): boolean {
  const orientation = (p: MolecularGraphNode, q: MolecularGraphNode, r: MolecularGraphNode) =>
    (q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y)
  return orientation(a, b, c) * orientation(a, b, d) < 0 && orientation(c, d, a) * orientation(c, d, b) < 0
}

export function validateCycles(graph: MolecularGraph, edgeValidation: EdgeValidationResult): CycleValidationResult {
  const rejectedEdges = new Set(edgeValidation.edges.filter((edge) => edge.status === "rejected").map((edge) => edge.bondId))
  const cycles = graph.rings.map((ring): ValidatedCycle => {
    const reasons: string[] = []
    let status: CycleValidationStatus = "accepted"
    let confidence = ring.confidence
    const nodes = ring.nodeIds.map((id) => nodeById(graph, id))

    if (new Set(ring.nodeIds).size !== ring.nodeIds.length) {
      status = "rejected"
      confidence = Math.min(confidence, 20)
      reasons.push("Cycle repeats a node and is not a simple graph cycle.")
    }
    if (nodes.some((node) => !node)) {
      status = "rejected"
      confidence = Math.min(confidence, 20)
      reasons.push("Cycle references missing graph nodes.")
    }
    const hasAllEdges = ring.nodeIds.every((nodeId, index) => edgeExists(graph, nodeId, ring.nodeIds[(index + 1) % ring.nodeIds.length]))
    if (!hasAllEdges) {
      status = "rejected"
      confidence = Math.min(confidence, 30)
      reasons.push("Cycle is not backed by graph edges between every neighboring node.")
    }
    if (ring.nodeIds.some((nodeId, index) => {
      const next = ring.nodeIds[(index + 1) % ring.nodeIds.length]
      const bond = graph.bonds.find((candidate) =>
        (candidate.startNodeId === nodeId && candidate.endNodeId === next) ||
        (candidate.startNodeId === next && candidate.endNodeId === nodeId),
      )
      return bond ? rejectedEdges.has(bond.id) : true
    })) {
      status = "rejected"
      confidence = Math.min(confidence, 25)
      reasons.push("Cycle depends on at least one rejected edge.")
    }

    const realNodes = nodes.filter((node): node is MolecularGraphNode => Boolean(node))
    if (realNodes.length === ring.nodeIds.length && realNodes.length >= 3) {
      const lengths = realNodes.map((node, index) => distance(node, realNodes[(index + 1) % realNodes.length]))
      const meanLength = lengths.reduce((sum, value) => sum + value, 0) / lengths.length
      const variance = Math.max(...lengths.map((value) => Math.abs(value - meanLength))) / Math.max(1, meanLength)
      if (variance > 0.58) {
        status = "rejected"
        confidence = Math.min(confidence, 38)
        reasons.push("Cycle bond lengths are too inconsistent for a chemical ring.")
      } else if (variance > 0.32 && status === "accepted") {
        status = "warning"
        confidence = Math.min(confidence, 68)
        reasons.push("Cycle bond lengths are uneven but not impossible.")
      }
      const angles = realNodes.map((node, index) => angleBetween(realNodes[(index + realNodes.length - 1) % realNodes.length], node, realNodes[(index + 1) % realNodes.length]))
      if (angles.some((value) => value < 48 || value > 168)) {
        status = "rejected"
        confidence = Math.min(confidence, 35)
        reasons.push("Cycle internal angles are not chemically plausible.")
      }
      for (let i = 0; i < realNodes.length; i += 1) {
        for (let j = i + 2; j < realNodes.length; j += 1) {
          if (i === 0 && j === realNodes.length - 1) continue
          if (segmentIntersection(realNodes[i], realNodes[(i + 1) % realNodes.length], realNodes[j], realNodes[(j + 1) % realNodes.length])) {
            status = "rejected"
            confidence = Math.min(confidence, 24)
            reasons.push("Cycle self-intersects.")
          }
        }
      }
    }

    if (!reasons.length) reasons.push("Cycle is backed by graph topology and chemically plausible geometry.")
    return {
      ringId: ring.id,
      nodeIds: ring.nodeIds,
      size: ring.size,
      status,
      confidence: Math.round(confidence),
      aromatic: ring.aromatic && status !== "rejected",
      kind: ring.kind,
      reasons,
    }
  })

  return {
    cycles,
    accepted: cycles.filter((cycle) => cycle.status === "accepted").length,
    rejected: cycles.filter((cycle) => cycle.status === "rejected").length,
    warnings: cycles.filter((cycle) => cycle.status === "warning").length,
  }
}
