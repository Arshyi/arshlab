import type { OptimizationPass, PassResult } from "../optimization-pass"
import { cloneGraph, edgeKey, rebuildIrFromGraph, validateIr } from "./pass-utils"

export const deadEdgeEliminationPass: OptimizationPass = {
  id: "dead-edge-elimination",
  description: "Remove self edges, duplicate bonds, and unsupported low-confidence bridge repairs.",
  run(ir): PassResult {
    const graph = cloneGraph(ir.canonicalGraph)
    const seen = new Set<string>()
    const retained = graph.bonds.filter((bond) => {
      if (bond.startNodeId === bond.endNodeId) return false
      const key = edgeKey(bond)
      if (seen.has(key)) return false
      seen.add(key)
      if (bond.gapBridged && bond.confidence < 46) return false
      return true
    })
    const edgesRemoved = graph.bonds.length - retained.length
    if (!edgesRemoved) {
      return { ir, changed: false, valid: true, metrics: {}, warnings: [], errors: [], semanticValidation: validateIr(ir) }
    }
    graph.bonds = retained
    const next = rebuildIrFromGraph(ir, graph)
    const semanticValidation = validateIr(next)
    return {
      ir: next,
      changed: true,
      valid: semanticValidation.status !== "fail",
      metrics: { edgesRemoved },
      warnings: [`Removed ${edgesRemoved} dead or unsupported edge${edgesRemoved === 1 ? "" : "s"}.`],
      errors: semanticValidation.status === "fail" ? semanticValidation.explanations : [],
      semanticValidation,
    }
  },
}
