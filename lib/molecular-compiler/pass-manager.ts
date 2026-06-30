import type { CompilerIR } from "./compiler-types"
import type { OptimizationReport, OptimizationPassExecution } from "./optimization-report"
import type { OptimizationPass } from "./optimization-pass"
import { listOptimizationPasses } from "./pass-registry"
import { structuralScore, validateIr } from "./passes/pass-utils"

function now(): number {
  if (typeof performance !== "undefined" && performance.now) return performance.now()
  return Date.now()
}

function roundedMs(start: number): number {
  return Math.round((now() - start) * 10) / 10
}

function executionEntry({
  pass,
  status,
  changed,
  milliseconds,
  before,
  after,
  scoreBefore,
  scoreAfter,
  metrics,
  warnings,
  errors,
}: {
  pass: OptimizationPass
  status: OptimizationPassExecution["status"]
  changed: boolean
  milliseconds: number
  before: CompilerIR
  after: CompilerIR
  scoreBefore: number
  scoreAfter: number
  metrics: OptimizationPassExecution["metrics"]
  warnings: string[]
  errors: string[]
}): OptimizationPassExecution {
  return {
    passId: pass.id,
    description: pass.description,
    status,
    changed,
    milliseconds,
    hashBefore: before.hash,
    hashAfter: after.hash,
    nodesBefore: before.nodes.length,
    nodesAfter: after.nodes.length,
    edgesBefore: before.edges.length,
    edgesAfter: after.edges.length,
    scoreBefore,
    scoreAfter,
    metrics,
    warnings,
    errors,
  }
}

export function optimizeCompilerIR(ir: CompilerIR, passes: OptimizationPass[] = listOptimizationPasses()): OptimizationReport {
  const started = now()
  let current = ir
  const executions: OptimizationPassExecution[] = []

  for (const pass of passes) {
    const before = current
    const scoreBefore = structuralScore(before)
    const passStarted = now()
    try {
      const result = pass.run(before)
      const candidate = result.ir
      const semanticValidation = result.semanticValidation ?? validateIr(candidate)
      const scoreAfter = structuralScore(candidate)
      const rollback = !result.valid || semanticValidation.status === "fail" || scoreAfter < scoreBefore
      if (rollback) {
        executions.push(executionEntry({
          pass,
          status: "rolled-back",
          changed: result.changed,
          milliseconds: roundedMs(passStarted),
          before,
          after: before,
          scoreBefore,
          scoreAfter,
          metrics: result.metrics,
          warnings: result.warnings,
          errors: result.errors.length ? result.errors : semanticValidation.explanations,
        }))
        continue
      }
      current = candidate
      executions.push(executionEntry({
        pass,
        status: result.changed ? "success" : "no-op",
        changed: result.changed,
        milliseconds: roundedMs(passStarted),
        before,
        after: current,
        scoreBefore,
        scoreAfter,
        metrics: result.metrics,
        warnings: result.warnings,
        errors: result.errors,
      }))
    } catch (error) {
      executions.push(executionEntry({
        pass,
        status: "failed",
        changed: false,
        milliseconds: roundedMs(passStarted),
        before,
        after: before,
        scoreBefore,
        scoreAfter: scoreBefore,
        metrics: {},
        warnings: [],
        errors: [error instanceof Error ? error.message : "Optimization pass failed."],
      }))
    }
  }

  const totalGain = structuralScore(current) - structuralScore(ir)
  const changedPasses = executions.filter((pass) => pass.status === "success")
  const warnings = executions.flatMap((pass) => pass.warnings)
  const errors = executions.flatMap((pass) => pass.errors)
  return {
    irBefore: ir,
    irAfter: current,
    graphHashBefore: ir.hash,
    graphHashAfter: current.hash,
    passesExecuted: executions.length,
    successfulPasses: changedPasses.length,
    rolledBackPasses: executions.filter((pass) => pass.status === "rolled-back").length,
    totalTimeMs: roundedMs(started),
    averagePassTimeMs: executions.length
      ? Math.round((executions.reduce((sum, pass) => sum + pass.milliseconds, 0) / executions.length) * 10) / 10
      : 0,
    optimizationGain: totalGain,
    averageOptimizationGain: changedPasses.length ? Math.round((totalGain / changedPasses.length) * 10) / 10 : 0,
    compilerWarnings: Array.from(new Set(warnings)),
    compilerErrors: Array.from(new Set(errors)),
    passes: executions,
  }
}
