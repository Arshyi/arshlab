import { STRUCTURE_SCANNER_RECORDS } from "./scanner-database"
import type { StructureScanInput, StructureScanMatch, StructureScanResult, StructureScannerRecord } from "./scanner-types"

function normalizeText(value: string | null | undefined): string {
  return (value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeFormula(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "")
}

function formulaComposition(value: string | null | undefined): string {
  const source = (value ?? "").replace(/[\s()[\]{}+\-=#]/g, "")
  if (!source) return ""

  const counts = new Map<string, number>()
  const tokens = source.match(/[A-Z][a-z]?\d*/g)
  if (!tokens || tokens.join("") !== source) return ""

  for (const token of tokens) {
    const match = token.match(/^([A-Z][a-z]?)(\d*)$/)
    if (!match) return ""
    const element = match[1]
    const count = Number(match[2] || "1")
    counts.set(element, (counts.get(element) ?? 0) + count)
  }

  return Array.from(counts.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([element, count]) => `${element}${count}`)
    .join("")
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function uniqueReasons(reasons: string[]): string[] {
  return Array.from(new Set(reasons)).slice(0, 5)
}

function scoreRecord(record: StructureScannerRecord, input: StructureScanInput): StructureScanMatch | null {
  const nameQuery = normalizeText(input.moleculeName)
  const formulaQuery = normalizeFormula(input.formula)
  const condensedFormulaQuery = normalizeFormula(input.condensedFormula)
  const formulaCompositionQuery = formulaComposition(input.formula)
  const condensedCompositionQuery = formulaComposition(input.condensedFormula)
  const hintQuery = normalizeText(input.functionalGroupHint ?? input.structureHint)
  const fileQuery = normalizeText(input.fileName?.replace(/\.[a-z0-9]+$/i, ""))
  const combined = normalizeText(
    [input.moleculeName, input.formula, input.condensedFormula, input.functionalGroupHint, input.structureHint, input.fileName]
      .filter(Boolean)
      .join(" "),
  )
  const combinedFormula = normalizeFormula(combined)

  if (!combined && !formulaQuery) return null

  const recordName = normalizeText(record.name)
  const recordFormula = normalizeFormula(record.formula)
  const recordFormulaComposition = formulaComposition(record.formula)
  const aliases = record.commonAliases.map(normalizeText)
  const functionalGroups = record.functionalGroups.map(normalizeText)
  const keywords = (record.keywords ?? []).map(normalizeText)
  const reactionTerms = record.reactionGraphLinks.map(normalizeText)

  let score = 0
  const reasons: string[] = []

  if (formulaQuery && formulaQuery === recordFormula) {
    score += 78
    reasons.push("Exact formula match")
  } else if (formulaQuery && recordFormula.includes(formulaQuery)) {
    score += 42
    reasons.push("Partial formula match")
  } else if (combinedFormula && combinedFormula.includes(recordFormula)) {
    score += 38
    reasons.push("Formula appears in the hint")
  }

  if (
    condensedFormulaQuery &&
    condensedCompositionQuery &&
    condensedCompositionQuery === recordFormulaComposition
  ) {
    score += 68
    reasons.push("Condensed formula composition match")
  } else if (
    formulaCompositionQuery &&
    formulaCompositionQuery === recordFormulaComposition &&
    formulaQuery !== recordFormula
  ) {
    score += 58
    reasons.push("Molecular formula composition match")
  }

  if (nameQuery && nameQuery === recordName) {
    score += 82
    reasons.push("Exact molecule name match")
  } else if (nameQuery && aliases.includes(nameQuery)) {
    score += 74
    reasons.push("Common alias match")
  } else if (nameQuery && (recordName.includes(nameQuery) || nameQuery.includes(recordName))) {
    score += 46
    reasons.push("Molecule name similarity")
  }

  for (const alias of aliases) {
    if (alias && combined.includes(alias)) {
      score += 38
      reasons.push("Common alias appears in the query")
      break
    }
  }

  if (fileQuery && (fileQuery.includes(recordName) || aliases.some((alias) => fileQuery.includes(alias)))) {
    score += 36
    reasons.push("Uploaded filename resembles this compound")
  }

  for (const group of functionalGroups) {
    if (group && hintQuery.includes(group)) {
      score += 36
      reasons.push(`Functional group match: ${group}`)
    }
  }

  for (const keyword of keywords) {
    if (keyword && combined.includes(keyword)) {
      score += 14
      reasons.push(`Structure hint match: ${keyword}`)
    }
  }

  for (const reactionTerm of reactionTerms) {
    if (reactionTerm && combined.includes(reactionTerm)) {
      score += 8
      reasons.push("Related reaction pathway match")
    }
  }

  if (score <= 0) return null

  return {
    record,
    confidence: 0,
    reasons: uniqueReasons(reasons),
    score,
  }
}

function confidenceFromScore(score: number, nextScore: number): number {
  const margin = Math.max(0, score - nextScore)
  const raw = Math.round(score * 0.82 + margin * 0.18)
  return clamp(raw, 18, 99)
}

export function scanStructure(input: StructureScanInput): StructureScanResult {
  const matches = STRUCTURE_SCANNER_RECORDS.map((record) => scoreRecord(record, input))
    .filter((match): match is StructureScanMatch => Boolean(match))
    .sort((a, b) => b.score - a.score || a.record.name.localeCompare(b.record.name))
    .slice(0, 5)

  const scoredMatches = matches.map((match, index) => ({
    ...match,
    confidence: confidenceFromScore(match.score, matches[index + 1]?.score ?? 0),
  }))

  const bestMatch = scoredMatches[0] ?? null
  const message = bestMatch
    ? "Local database match generated from the uploaded filename and manual chemistry hints."
    : "No readable formula/name detected. Add a hint to improve matching."

  return {
    query: input,
    bestMatch,
    matches: scoredMatches,
    message,
  }
}
