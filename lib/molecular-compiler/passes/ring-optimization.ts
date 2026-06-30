import type { OptimizationPass, PassResult } from "../optimization-pass"
import { cloneGraph, edgeKey, rebuildIrFromGraph, validateIr } from "./pass-utils"

export const ringOptimizationPass: OptimizationPass = {
  id: "ring-optimization",
  description: "Keep only rings backed by existing edges and remove duplicate or unsupported ring annotations without creating new rings.",
  run(ir): PassResult {
    const graph = cloneGraph(ir.canonicalGraph)
    const edgeKeys = new Set(graph.bonds.map(edgeKey))
    const seen = new Set<string>()
    const retained = graph.rings.filter((ring) => {
      const key = [...ring.nodeIds].sort((a, b) => a - b).join("-")
      if (seen.has(key)) return false
      seen.add(key)
      if (ring.size < 3 || ring.size > 8 || ring.confidence < 40) return false
      return ring.nodeIds.every((nodeId, index) => {
        const next = ring.nodeIds[(index + 1) % ring.nodeIds.length]
        return edgeKeys.has([nodeId, next].sort((a, b) => a - b).join("-"))
      })
    })
    const ringsRemoved = graph.rings.length - retained.length
    if (!ringsRemoved) {
      return { ir, changed: false, valid: true, metrics: {}, warnings: [], errors: [], semanticValidation: validateIr(ir) }
    }
    graph.rings = retained
    const next = rebuildIrFromGraph(ir, graph)
    const semanticValidation = validateIr(next)
    return {
      ir: next,
      changed: true,
      valid: semanticValidation.status !== "fail",
      metrics: { ringsRemoved },
      warnings: [`Removed ${ringsRemoved} unsupported ring annotation${ringsRemoved === 1 ? "" : "s"}.`],
      errors: semanticValidation.status === "fail" ? semanticValidation.explanations : [],
      semanticValidation,
    }
  },
}
