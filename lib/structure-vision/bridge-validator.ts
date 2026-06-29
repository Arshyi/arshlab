import type { MolecularGraph } from "../vision/molecular-graph"
import type { EdgeValidationResult } from "./edge-validator"

export type BridgeSafety = "guaranteed" | "likely" | "possible" | "unsafe"

export interface BridgeValidation {
  bondId: number
  classification: BridgeSafety
  confidence: number
  reason: string
}

export interface BridgeValidationResult {
  bridges: BridgeValidation[]
  guaranteed: number
  likely: number
  possible: number
  unsafe: number
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length)
}

export function validateBridges(graph: MolecularGraph, edges: EdgeValidationResult): BridgeValidationResult {
  const edgeMap = new Map(edges.edges.map((edge) => [edge.bondId, edge]))
  const meanLength = average(edges.edges.map((edge) => edge.length).filter((value) => value > 0))
  const bridges = graph.bonds
    .filter((bond) => bond.gapBridged || edgeMap.get(bond.id)?.status === "recovered")
    .map((bond): BridgeValidation => {
      const edge = edgeMap.get(bond.id)
      if (!edge || edge.status === "rejected") {
        return { bondId: bond.id, classification: "unsafe", confidence: 0, reason: "Recovered bridge failed edge validation." }
      }
      const lengthRatio = meanLength > 0 ? edge.length / meanLength : 1
      if (edge.confidence >= 82 && lengthRatio <= 1.18 && bond.sourceSegmentIndexes.length >= 2) {
        return { bondId: bond.id, classification: "guaranteed", confidence: edge.confidence, reason: "Short recovered gap has strong segment support." }
      }
      if (edge.confidence >= 66 && lengthRatio <= 1.35) {
        return { bondId: bond.id, classification: "likely", confidence: edge.confidence, reason: "Recovered bridge is near the local bond-length scale." }
      }
      if (edge.confidence >= 48 && lengthRatio <= 1.65) {
        return { bondId: bond.id, classification: "possible", confidence: edge.confidence, reason: "Recovered bridge is plausible but should remain a warning." }
      }
      return { bondId: bond.id, classification: "unsafe", confidence: edge.confidence, reason: "Recovered bridge is too long or too weak to insert safely." }
    })

  return {
    bridges,
    guaranteed: bridges.filter((bridge) => bridge.classification === "guaranteed").length,
    likely: bridges.filter((bridge) => bridge.classification === "likely").length,
    possible: bridges.filter((bridge) => bridge.classification === "possible").length,
    unsafe: bridges.filter((bridge) => bridge.classification === "unsafe").length,
  }
}
