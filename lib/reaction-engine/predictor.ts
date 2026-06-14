import { REACTION_RECORDS } from "@/lib/chemistry/reactions"
import type { ReactionPredictionResult, ReactionRecord } from "@/lib/chemistry/reaction-types"

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "").replace(/\((aq|s|l|g)\)/g, "")
}

function normalizeSet(values: string[]): string[] {
  return values.map(normalize).sort()
}

function sameFormulaSet(a: string[], b: string[]): boolean {
  const left = normalizeSet(a)
  const right = normalizeSet(b)
  return left.length === right.length && left.every((value, index) => value === right[index])
}

function parseReactants(input: string | string[]): string[] {
  if (Array.isArray(input)) return input.map((item) => item.trim()).filter(Boolean)
  const leftSide = input.includes("->") ? input.split("->")[0] : input
  return leftSide.split("+").map((item) => item.trim()).filter(Boolean)
}

export function findReactionByReactants(input: string | string[]): ReactionRecord | null {
  const reactants = parseReactants(input)
  return REACTION_RECORDS.find((record) => sameFormulaSet(record.reactants, reactants)) ?? null
}

export function predictReaction(input: string | string[]): ReactionPredictionResult {
  const reactants = parseReactants(input)
  const exact = findReactionByReactants(reactants)

  if (exact) {
    return {
      recognized: true,
      reactants,
      products: exact.products,
      balancedEquation: exact.balancedEquation,
      reactionType: exact.reactionType,
      category: exact.category,
      confidence: 1,
      explanation: exact.explanation,
      matchedReactionId: exact.id,
    }
  }

  return {
    recognized: false,
    reactants,
    products: [],
    confidence: 0,
    explanation:
      "No exact deterministic match exists yet. Try common classroom reactants such as HCl + NaOH, AgNO3 + NaCl, CH4 + O2, Zn + CuSO4, or C2H4 + Br2.",
  }
}

export function listPredictableReactions(): ReactionRecord[] {
  return REACTION_RECORDS
}
