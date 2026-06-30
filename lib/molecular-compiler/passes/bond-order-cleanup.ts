import type { MolecularGraphBond } from "../../vision/molecular-graph"
import type { OptimizationPass, PassResult } from "../optimization-pass"
import { cloneGraph, rebuildIrFromGraph, validateIr } from "./pass-utils"

function isRingBond(bond: MolecularGraphBond, ringNodeIds: number[]): boolean {
  return ringNodeIds.includes(bond.startNodeId) && ringNodeIds.includes(bond.endNodeId)
}

export const bondOrderCleanupPass: OptimizationPass = {
  id: "bond-order-cleanup",
  description: "Normalize unsupported multiple bonds using deterministic legality without adding new bonds.",
  run(ir): PassResult {
    const graph = cloneGraph(ir.canonicalGraph)
    let bondOrdersChanged = 0
    const ringNodeSets = graph.rings.map((ring) => ring.nodeIds)
    graph.bonds = graph.bonds.map((bond) => {
      const inRing = ringNodeSets.some((ringNodeIds) => isRingBond(bond, ringNodeIds))
      if (bond.bondOrder === 3 && inRing) {
        bondOrdersChanged += 1
        return { ...bond, bondOrder: 2 as const, parallelPairCount: Math.min(bond.parallelPairCount, 1), confidence: Math.min(bond.confidence, 72) }
      }
      if (bond.bondOrder > 1 && bond.parallelPairCount === 0 && bond.confidence < 58) {
        bondOrdersChanged += 1
        return { ...bond, bondOrder: 1 as const, confidence: Math.min(bond.confidence, 62) }
      }
      return bond
    })
    if (!bondOrdersChanged) {
      return { ir, changed: false, valid: true, metrics: {}, warnings: [], errors: [], semanticValidation: validateIr(ir) }
    }
    const next = rebuildIrFromGraph(ir, graph)
    const semanticValidation = validateIr(next)
    return {
      ir: next,
      changed: true,
      valid: semanticValidation.status !== "fail",
      metrics: { bondOrdersChanged },
      warnings: [`Cleaned ${bondOrdersChanged} unsupported bond-order annotation${bondOrdersChanged === 1 ? "" : "s"}.`],
      errors: semanticValidation.status === "fail" ? semanticValidation.explanations : [],
      semanticValidation,
    }
  },
}
