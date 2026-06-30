import type { MolecularGraphBond } from "../../vision/molecular-graph"
import type { OptimizationPass, PassResult } from "../optimization-pass"
import { cloneGraph, maxValence, rebuildIrFromGraph, valenceForNode, validateIr } from "./pass-utils"

function incidentBonds(bonds: MolecularGraphBond[], nodeId: number): MolecularGraphBond[] {
  return bonds.filter((bond) => bond.startNodeId === nodeId || bond.endNodeId === nodeId)
}

export const valenceCleanupPass: OptimizationPass = {
  id: "valence-cleanup",
  description: "Repair obvious valence inconsistencies only when a single legal correction exists.",
  run(ir): PassResult {
    const graph = cloneGraph(ir.canonicalGraph)
    let valenceFixes = 0

    for (const node of graph.nodes) {
      const maximum = maxValence(node.inferredElement)
      const observed = valenceForNode(graph, node.id)
      if (observed <= maximum) continue
      const excess = observed - maximum
      const incident = incidentBonds(graph.bonds, node.id).sort((left, right) => {
        const leftScore = (left.gapBridged ? -20 : 0) + left.confidence
        const rightScore = (right.gapBridged ? -20 : 0) + right.confidence
        return leftScore - rightScore
      })
      const removable = incident.filter((bond) => bond.gapBridged || bond.confidence < 46)
      if (removable.length === 1 && removable[0].bondOrder === excess) {
        graph.bonds = graph.bonds.filter((bond) => bond.id !== removable[0].id)
        valenceFixes += 1
        continue
      }
      const reducible = incident.filter((bond) => bond.bondOrder > 1 && bond.bondOrder - excess >= 1)
      if (reducible.length === 1) {
        graph.bonds = graph.bonds.map((bond) =>
          bond.id === reducible[0].id
            ? { ...bond, bondOrder: (bond.bondOrder - excess) as 1 | 2 | 3, confidence: Math.min(bond.confidence, 70) }
            : bond,
        )
        valenceFixes += 1
      }
    }

    if (!valenceFixes) {
      return { ir, changed: false, valid: true, metrics: {}, warnings: [], errors: [], semanticValidation: validateIr(ir) }
    }
    const next = rebuildIrFromGraph(ir, graph)
    const semanticValidation = validateIr(next)
    return {
      ir: next,
      changed: true,
      valid: semanticValidation.status !== "fail",
      metrics: { valenceFixes },
      warnings: [`Applied ${valenceFixes} unique legal valence cleanup${valenceFixes === 1 ? "" : "s"}.`],
      errors: semanticValidation.status === "fail" ? semanticValidation.explanations : [],
      semanticValidation,
    }
  },
}
