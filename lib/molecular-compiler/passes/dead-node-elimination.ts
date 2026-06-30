import type { OptimizationPass, PassResult } from "../optimization-pass"
import { cloneGraph, rebuildIrFromGraph, validateIr } from "./pass-utils"

export const deadNodeEliminationPass: OptimizationPass = {
  id: "dead-node-elimination",
  description: "Remove isolated atoms, orphan labels, and impossible empty fragments from the compiler IR.",
  run(ir): PassResult {
    const graph = cloneGraph(ir.canonicalGraph)
    const connectedNodeIds = new Set<number>()
    graph.bonds.forEach((bond) => {
      connectedNodeIds.add(bond.startNodeId)
      connectedNodeIds.add(bond.endNodeId)
    })
    const retained = graph.nodes.filter((node) => connectedNodeIds.has(node.id) || graph.nodes.length === 1)
    const nodesRemoved = graph.nodes.length - retained.length
    if (!nodesRemoved) {
      return { ir, changed: false, valid: true, metrics: {}, warnings: [], errors: [], semanticValidation: validateIr(ir) }
    }
    const retainedIds = new Set(retained.map((node) => node.id))
    graph.nodes = retained
    graph.bonds = graph.bonds.filter((bond) => retainedIds.has(bond.startNodeId) && retainedIds.has(bond.endNodeId))
    graph.rings = graph.rings.filter((ring) => ring.nodeIds.every((nodeId) => retainedIds.has(nodeId)))
    const next = rebuildIrFromGraph(ir, graph)
    const semanticValidation = validateIr(next)
    return {
      ir: next,
      changed: true,
      valid: semanticValidation.status !== "fail",
      metrics: { nodesRemoved },
      warnings: nodesRemoved ? [`Removed ${nodesRemoved} isolated compiler node${nodesRemoved === 1 ? "" : "s"}.`] : [],
      errors: semanticValidation.status === "fail" ? semanticValidation.explanations : [],
      semanticValidation,
    }
  },
}
