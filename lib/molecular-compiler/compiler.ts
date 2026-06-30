import { buildCompilerIR, canonicalizeCompilerGraph } from "./canonicalizer"
import { buildChemicalAst } from "./chemical-ast"
import { createCompilerReport } from "./compiler-report"
import type { CompilerReport, CompilerStageTiming, MolecularCompilerInput } from "./compiler-types"
import { buildChemicalPrimitives } from "./primitive-builder"
import { optimizeCompilerIR } from "./pass-manager"
import { validateChemicalSemantics } from "./semantic-validator"
import { tokenizeVisualInput } from "./visual-tokenizer"

function now(): number {
  if (typeof performance !== "undefined" && performance.now) return performance.now()
  return Date.now()
}

function timed<T>(timings: CompilerStageTiming[], stage: string, fn: () => T): T {
  const start = now()
  const output = fn()
  timings.push({ stage, milliseconds: Math.round((now() - start) * 10) / 10 })
  return output
}

export function compileMolecularInput(input: MolecularCompilerInput): CompilerReport {
  const timings: CompilerStageTiming[] = []
  const graph = input.analysis?.graphValidation?.selectedGraph ?? input.analysis?.molecularGraph ?? input.graph ?? null
  const visualTokens = timed(timings, "Visual Tokenizer", () => tokenizeVisualInput(input.analysis, graph))
  const chemicalPrimitives = timed(timings, "Primitive Builder", () => buildChemicalPrimitives(visualTokens, graph))
  const ast = timed(timings, "Chemical AST", () =>
    buildChemicalAst(chemicalPrimitives, graph ?? {
      nodes: [],
      bonds: [],
      rings: [],
      aromatic: false,
      aromaticRingIds: [],
      estimates: { atoms: 0, carbons: 0, bonds: 0, rings: 0, singleBonds: 0, doubleBonds: 0, tripleBonds: 0, estimatedFormula: "Unavailable", confidence: 0 },
      warnings: [],
      atomCentered: false,
      snapRadius: 0,
    }),
  )
  const semanticValidation = timed(timings, "Semantic Validation", () => validateChemicalSemantics(ast))
  const canonical = semanticValidation.status === "fail" || !graph
    ? null
    : timed(timings, "Canonicalizer", () => canonicalizeCompilerGraph(graph))
  const ir = canonical
    ? timed(timings, "Compiler IR", () => buildCompilerIR(ast, semanticValidation, canonical))
    : null
  const optimizationReport = ir
    ? timed(timings, "Optimization Pass Manager", () => optimizeCompilerIR(ir))
    : null

  return createCompilerReport({
    visualTokens,
    chemicalPrimitives,
    ast,
    semanticValidation,
    canonical,
    ir,
    optimizationReport,
    timings,
  })
}
