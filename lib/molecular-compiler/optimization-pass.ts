import type { CompilerIR, SemanticValidationResult } from "./compiler-types"

export interface PassMetrics {
  nodesRemoved?: number
  edgesRemoved?: number
  fragmentsRemoved?: number
  ringsRemoved?: number
  bondOrdersChanged?: number
  valenceFixes?: number
  confidenceBefore?: number
  confidenceAfter?: number
  hashBefore?: string
  hashAfter?: string
  optimizationGain?: number
}

export interface PassResult {
  ir: CompilerIR
  changed: boolean
  valid: boolean
  metrics: PassMetrics
  warnings: string[]
  errors: string[]
  semanticValidation?: SemanticValidationResult
}

export interface OptimizationPass {
  readonly id: string
  readonly description: string
  run(ir: CompilerIR): PassResult
}
