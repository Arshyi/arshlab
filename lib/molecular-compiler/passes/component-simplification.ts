import type { OptimizationPass, PassResult } from "../optimization-pass"
import { cloneGraph, rebuildIrFromGraph, validateIr } from "./pass-utils"

export const componentSimplificationPass: OptimizationPass = {
  id: "component-simplification",
  description: "Remove small accidental fragments while preserving the primary connected molecular component.",
  run(ir): PassResult {
    if (ir.components.length <= 1) {
      return { ir, changed: false, valid: true, metrics: {}, warnings: [], errors: [], semanticValidation: validateIr(ir) }
    }
    const primary = [...ir.components].sort((left, right) =>
      right.edgeIds.length - left.edgeIds.length || right.nodeIds.length - left.nodeIds.length,
    )[0]
    if (!primary || primary.edgeIds.length === 0) {
      return { ir, changed: false, valid: true, metrics: {}, warnings: ["No primary molecular component was strong enough to simplify."], errors: [], semanticValidation: validateIr(ir) }
    }
    const removedComponents = ir.components.filter((component) => component.id !== primary.id && component.edgeIds.length <= 1)
    if (!removedComponents.length) {
      return { ir, changed: false, valid: true, metrics: {}, warnings: [], errors: [], semanticValidation: validateIr(ir) }
    }
    const retainedNodeIds = new Set(primary.nodeIds)
    const graph = cloneGraph(ir.canonicalGraph)
    graph.nodes = graph.nodes.filter((node) => retainedNodeIds.has(node.id))
    graph.bonds = graph.bonds.filter((bond) => retainedNodeIds.has(bond.startNodeId) && retainedNodeIds.has(bond.endNodeId))
    graph.rings = graph.rings.filter((ring) => ring.nodeIds.every((nodeId) => retainedNodeIds.has(nodeId)))
    const next = rebuildIrFromGraph(ir, graph)
    const semanticValidation = validateIr(next)
    return {
      ir: next,
      changed: true,
      valid: semanticValidation.status !== "fail",
      metrics: { fragmentsRemoved: removedComponents.length },
      warnings: [`Removed ${removedComponents.length} small accidental fragment${removedComponents.length === 1 ? "" : "s"} outside the primary component.`],
      errors: semanticValidation.status === "fail" ? semanticValidation.explanations : [],
      semanticValidation,
    }
  },
}
