import type { CompilerIR } from "./compiler-types"
import type { PassMetrics } from "./optimization-pass"

export type OptimizationPassStatus = "success" | "no-op" | "rolled-back" | "failed"

export interface OptimizationPassExecution {
  passId: string
  description: string
  status: OptimizationPassStatus
  changed: boolean
  milliseconds: number
  hashBefore: string
  hashAfter: string
  nodesBefore: number
  nodesAfter: number
  edgesBefore: number
  edgesAfter: number
  scoreBefore: number
  scoreAfter: number
  metrics: PassMetrics
  warnings: string[]
  errors: string[]
}

export interface OptimizationReport {
  irBefore: CompilerIR
  irAfter: CompilerIR
  graphHashBefore: string
  graphHashAfter: string
  passesExecuted: number
  successfulPasses: number
  rolledBackPasses: number
  totalTimeMs: number
  averagePassTimeMs: number
  optimizationGain: number
  averageOptimizationGain: number
  compilerWarnings: string[]
  compilerErrors: string[]
  passes: OptimizationPassExecution[]
}
