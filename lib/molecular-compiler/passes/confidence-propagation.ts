import type { OptimizationPass, PassResult } from "../optimization-pass"
import { cloneGraph, rebuildIrFromGraph, validateIr } from "./pass-utils"

export const confidencePropagationPass: OptimizationPass = {
  id: "confidence-propagation",
  description: "Propagate uncertainty so downstream graph confidence never exceeds upstream compiler inputs.",
  run(ir): PassResult {
    const graph = cloneGraph(ir.canonicalGraph)
    const before = ir.confidenceCeiling
    graph.nodes = graph.nodes.map((node) => ({ ...node, confidence: Math.min(node.confidence, before) }))
    graph.bonds = graph.bonds.map((bond) => {
      const start = graph.nodes.find((node) => node.id === bond.startNodeId)
      const end = graph.nodes.find((node) => node.id === bond.endNodeId)
      const atomCeiling = Math.min(start?.confidence ?? before, end?.confidence ?? before, before)
      return { ...bond, confidence: Math.min(bond.confidence, atomCeiling) }
    })
    graph.rings = graph.rings.map((ring) => {
      const ringCeiling = Math.min(
        before,
        ...ring.nodeIds.map((nodeId) => graph.nodes.find((node) => node.id === nodeId)?.confidence ?? before),
      )
      return { ...ring, confidence: Math.min(ring.confidence, ringCeiling) }
    })
    graph.estimates = { ...graph.estimates, confidence: Math.min(graph.estimates.confidence, before) }
    const next = rebuildIrFromGraph(ir, graph)
    next.confidenceCeiling = Math.min(before, next.confidenceCeiling)
    const after = next.confidenceCeiling
    const semanticValidation = validateIr(next)
    return {
      ir: next,
      changed: after !== before || graph.estimates.confidence !== ir.canonicalGraph.estimates.confidence,
      valid: semanticValidation.status !== "fail",
      metrics: { confidenceBefore: before, confidenceAfter: after, optimizationGain: before - after },
      warnings: after < before ? [`Confidence ceiling reduced from ${before}% to ${after}%.`] : [],
      errors: semanticValidation.status === "fail" ? semanticValidation.explanations : [],
      semanticValidation,
    }
  },
}
