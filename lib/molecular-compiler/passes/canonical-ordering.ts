import type { OptimizationPass, PassResult } from "../optimization-pass"
import { rebuildIrFromGraph, validateIr } from "./pass-utils"

export const canonicalOrderingPass: OptimizationPass = {
  id: "canonical-ordering",
  description: "Normalize node, edge, component, and ring ordering to guarantee deterministic hashes.",
  run(ir): PassResult {
    const before = ir.hash
    const next = rebuildIrFromGraph(ir, ir.canonicalGraph)
    const semanticValidation = validateIr(next)
    return {
      ir: next,
      changed: before !== next.hash,
      valid: semanticValidation.status !== "fail",
      metrics: { hashBefore: before, hashAfter: next.hash },
      warnings: before !== next.hash ? ["Canonical ordering changed the deterministic graph hash."] : [],
      errors: semanticValidation.status === "fail" ? semanticValidation.explanations : [],
      semanticValidation,
    }
  },
}
