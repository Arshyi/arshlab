import type {
  CanonicalGraphRepresentation,
  ChemicalAst,
  ChemicalPrimitive,
  CompilerIR,
  CompilerReport,
  CompilerStageTiming,
  SemanticValidationResult,
  VisualToken,
} from "./compiler-types"

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length)
}

function ceiling(previous: number, current: number): number {
  return Math.round(Math.min(previous, current || previous))
}

export function createCompilerReport({
  visualTokens,
  chemicalPrimitives,
  ast,
  semanticValidation,
  canonical,
  ir,
  timings,
}: {
  visualTokens: VisualToken[]
  chemicalPrimitives: ChemicalPrimitive[]
  ast: ChemicalAst
  semanticValidation: SemanticValidationResult
  canonical: CanonicalGraphRepresentation | null
  ir: CompilerIR | null
  timings: CompilerStageTiming[]
}): CompilerReport {
  const tokenConfidence = Math.round(average(visualTokens.map((token) => token.confidence)))
  const primitiveConfidence = ceiling(tokenConfidence, average(chemicalPrimitives.map((primitive) => primitive.confidence)))
  const astConfidence = ceiling(primitiveConfidence, average([...ast.nodes.map((node) => node.confidence), ...ast.edges.map((edge) => edge.confidence)]))
  const semanticConfidence = semanticValidation.status === "fail"
    ? 0
    : semanticValidation.status === "pass-with-warnings"
      ? ceiling(astConfidence, astConfidence - 12)
      : astConfidence
  const canonicalConfidence = ir ? ceiling(semanticConfidence, ir.confidenceCeiling) : 0

  return {
    status: semanticValidation.status,
    visualTokens,
    chemicalPrimitives,
    ast,
    semanticValidation,
    canonical,
    ir,
    timings,
    confidenceFlow: [
      { stage: "Visual Tokens", confidence: tokenConfidence, ceiling: tokenConfidence, reason: "Average confidence of visual marks." },
      { stage: "Chemical Primitives", confidence: primitiveConfidence, ceiling: tokenConfidence, reason: "Primitive confidence cannot exceed token confidence." },
      { stage: "Chemical AST", confidence: astConfidence, ceiling: primitiveConfidence, reason: "AST confidence cannot exceed primitive confidence." },
      { stage: "Semantic Validation", confidence: semanticConfidence, ceiling: astConfidence, reason: semanticValidation.status === "fail" ? "Semantic errors close the compiler gate." : "Semantic warnings reduce the confidence ceiling." },
      { stage: "Canonical Graph", confidence: canonicalConfidence, ceiling: semanticConfidence, reason: "Canonical graph confidence is bounded by validated AST confidence." },
    ],
    knowledgeEngineInput: ir
      ? {
        available: true,
        reason: "Semantic validation passed; downstream chemistry receives the canonical compiler IR graph.",
        canonicalGraphId: ir.canonicalGraphId,
      }
      : {
        available: false,
        reason: "Semantic validation failed; downstream chemistry must not use image-derived graph evidence.",
      },
  }
}
