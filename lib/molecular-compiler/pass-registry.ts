import type { OptimizationPass } from "./optimization-pass"
import { bondOrderCleanupPass } from "./passes/bond-order-cleanup"
import { canonicalOrderingPass } from "./passes/canonical-ordering"
import { componentSimplificationPass } from "./passes/component-simplification"
import { confidencePropagationPass } from "./passes/confidence-propagation"
import { deadEdgeEliminationPass } from "./passes/dead-edge-elimination"
import { deadNodeEliminationPass } from "./passes/dead-node-elimination"
import { ringOptimizationPass } from "./passes/ring-optimization"
import { valenceCleanupPass } from "./passes/valence-cleanup"

export const DEFAULT_OPTIMIZATION_PASSES: OptimizationPass[] = [
  deadNodeEliminationPass,
  deadEdgeEliminationPass,
  componentSimplificationPass,
  ringOptimizationPass,
  bondOrderCleanupPass,
  valenceCleanupPass,
  confidencePropagationPass,
  canonicalOrderingPass,
]

export function listOptimizationPasses(): OptimizationPass[] {
  return DEFAULT_OPTIMIZATION_PASSES
}
