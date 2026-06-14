import { REACTION_RECORDS } from "@/lib/chemistry/reactions"
import type { ReactionCategory, ReactionClassificationResult, ReactionRecord } from "@/lib/chemistry/reaction-types"

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "").replace(/\((aq|s|l|g)\)/g, "")
}

function parseEquation(input: string): { reactants: string[]; products: string[] } {
  const [left = "", right = ""] = input.split("->")
  return {
    reactants: left.split("+").map((item) => item.trim()).filter(Boolean),
    products: right.split("+").map((item) => item.trim()).filter(Boolean),
  }
}

function sameSet(a: string[], b: string[]): boolean {
  const left = a.map(normalize).sort()
  const right = b.map(normalize).sort()
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function findExact(input: string): ReactionRecord | null {
  const parsed = parseEquation(input)
  return (
    REACTION_RECORDS.find(
      (record) => sameSet(record.reactants, parsed.reactants) && (!parsed.products.length || sameSet(record.products, parsed.products)),
    ) ?? null
  )
}

function hasFormula(values: string[], formula: string): boolean {
  return values.some((value) => normalize(value) === normalize(formula))
}

function classifyHeuristic(input: string): ReactionClassificationResult {
  const parsed = parseEquation(input)
  const text = normalize(input)

  if (hasFormula(parsed.reactants, "O2") && hasFormula(parsed.products, "CO2") && hasFormula(parsed.products, "H2O")) {
    return {
      category: "Combustion",
      reactionType: "complete combustion",
      confidence: 0.78,
      explanation: "The pattern fuel + O2 -> CO2 + H2O is characteristic of complete combustion.",
    }
  }

  if (text.includes("agcl") || text.includes("baso4") || text.includes("pbii") || text.includes("caCO3".toLowerCase())) {
    return {
      category: "Precipitation",
      reactionType: "precipitation",
      confidence: 0.72,
      explanation: "A low-solubility ionic solid appears among the products, suggesting precipitation.",
    }
  }

  if (hasFormula(parsed.products, "H2O") && parsed.reactants.some((value) => normalize(value).startsWith("h"))) {
    return {
      category: "Acid-Base",
      reactionType: "neutralization",
      confidence: 0.66,
      explanation: "Water formation from an acid/base pattern suggests a neutralization reaction.",
    }
  }

  if (parsed.reactants.length === 2 && parsed.products.length === 1) {
    return {
      category: "Synthesis",
      reactionType: "synthesis",
      confidence: 0.62,
      explanation: "Multiple reactants combining into one product is the common synthesis pattern.",
    }
  }

  if (parsed.reactants.length === 1 && parsed.products.length >= 2) {
    return {
      category: "Decomposition",
      reactionType: "decomposition",
      confidence: 0.62,
      explanation: "One reactant splitting into multiple products is the common decomposition pattern.",
    }
  }

  if (parsed.reactants.length === 2 && parsed.products.length === 2) {
    return {
      category: "Double Displacement",
      reactionType: "metathesis",
      confidence: 0.52,
      explanation: "Two compounds exchanging partners often indicates a double displacement reaction.",
    }
  }

  return {
    category: "Unknown",
    reactionType: "unknown",
    confidence: 0,
    explanation: "The reaction does not match a deterministic record or a safe classroom heuristic yet.",
  }
}

export function classifyReaction(input: string): ReactionClassificationResult {
  const exact = findExact(input)
  if (exact) {
    return {
      category: exact.category,
      reactionType: exact.reactionType,
      confidence: 1,
      matchedReactionId: exact.id,
      explanation: `${exact.name} is classified as ${exact.reactionType}. ${exact.explanation}`,
    }
  }

  return classifyHeuristic(input)
}

export function listReactionCategories(): ReactionCategory[] {
  return Array.from(new Set(REACTION_RECORDS.map((record) => record.category))).sort()
}
