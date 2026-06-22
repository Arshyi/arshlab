import { STRUCTURE_SCANNER_RECORDS } from "./scanner-database"
import { scoreMolecularGraphSimilarity } from "../vision/molecular-graph"
import type {
  StructureScanInput,
  StructureScanMatch,
  StructureScanResult,
  StructureScannerRecord,
  StructureScoreContribution,
} from "./scanner-types"

const CONFIDENCE_THRESHOLD = 58

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
    const count = Number(match[2] || "1")
    if (!Number.isFinite(count) || count <= 0) return ""
    counts.set(match[1], (counts.get(match[1]) ?? 0) + count)
  }

  return Array.from(counts.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([element, count]) => `${element}${count}`)
    .join("")
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function uniqueReasons(reasons: string[]): string[] {
  return Array.from(new Set(reasons)).slice(0, 7)
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
    [input.moleculeName, input.formula, input.condensedFormula, input.functionalGroupHint, input.ocrText]
      .filter(Boolean)
      .join(" "),
  )

  if (
    !combined &&
    !fileQuery &&
    !input.ocrCompoundIds?.length &&
    !input.ocrAtomLabels?.length &&
    !input.visualAnalysis?.candidates.length
  ) return null

  const recordName = normalizeText(record.name)
  const recordFormula = normalizeFormula(record.formula)
  const recordFormulaComposition = formulaComposition(record.formula)
  const aliases = record.commonAliases.map(normalizeText)
  const functionalGroups = record.functionalGroups.map(normalizeText)
  const keywords = (record.keywords ?? []).map(normalizeText)
  const reactionTerms = record.reactionGraphLinks.map(normalizeText)
  const aromaticSource = normalizeText(
    [input.ocrText, input.fileName, input.functionalGroupHint, input.moleculeName, input.formula].filter(Boolean).join(" "),
  )
  const manualAromaticSource = normalizeText(
    [input.functionalGroupHint, input.moleculeName, input.formula, input.condensedFormula].filter(Boolean).join(" "),
  )
  const aromaticHintPattern = /\b(benzene|arene|aromatic|phenyl|c6h6|hexagon|ring)\b/

  let score = 0
  let directNameMatch = false
  const reasons: string[] = []
  const contributions: StructureScoreContribution[] = []

  function addScore(points: number, label: string, category: StructureScoreContribution["category"] = "other") {
    score += points
    reasons.push(label)
    contributions.push({ label, points, category })
  }

  const ocrNormalized = normalizeText(input.ocrText)
  const formulaEvidenceCategory = (value: string | undefined): StructureScoreContribution["category"] =>
    value && ocrNormalized.replace(/\s/g, "").includes(normalizeText(value).replace(/\s/g, "")) ? "formula" : "manual"
  const nameEvidenceCategory = (value: string | undefined): StructureScoreContribution["category"] =>
    value && ocrNormalized.includes(normalizeText(value)) ? "name" : "manual"

  if (input.ocrFormulaCompoundIds?.includes(record.id)) {
    addScore(24, "Chemistry OCR formula database hit", "formula")
  }
  if (input.ocrNameCompoundIds?.includes(record.id)) {
    addScore(26, "Chemistry OCR molecule-name database hit", "name")
  }
  if (
    !input.ocrFormulaCompoundIds?.length &&
    !input.ocrNameCompoundIds?.length &&
    input.ocrCompoundIds?.includes(record.id)
  ) {
    addScore(35, "Parsed OCR token database hit", "ocr")
  }

  if (input.ocrAtomLabels?.length) {
    const recordElements = new Set(record.formula.match(/[A-Z][a-z]?/g) ?? [])
    const labels = Array.from(new Set(input.ocrAtomLabels))
    const matchedLabels = labels.filter((label) => recordElements.has(label))
    const atomPoints = Math.min(12, matchedLabels.reduce((sum, label) => sum + (label === "C" || label === "H" ? 2 : 5), 0))
    if (atomPoints > 0) addScore(atomPoints, `Atom-label support: ${matchedLabels.join(", ")}`, "atom-label")
  }

  const visualCandidate = input.visualAnalysis?.candidates.find((candidate) => candidate.compoundId === record.id)
  if (visualCandidate) {
    const rawTotal = visualCandidate.scoreBreakdown.reduce((sum, contribution) => sum + contribution.points, 0)
    let assigned = 0
    visualCandidate.scoreBreakdown.forEach((contribution, index) => {
      const points = index === visualCandidate.scoreBreakdown.length - 1
        ? visualCandidate.score - assigned
        : Math.max(0, Math.round(contribution.points * visualCandidate.score / Math.max(1, rawTotal)))
      assigned += points
      addScore(
        points,
        contribution.label,
        /ring|aromatic/i.test(contribution.label) ? "ring" : "visual",
      )
    })
    visualCandidate.reasons.slice(0, 2).forEach((reason) => reasons.push(`Visual: ${reason}`))
  }

  const graphCandidate = input.visualAnalysis
    ? scoreMolecularGraphSimilarity(input.visualAnalysis.molecularGraph, record.id)
    : null
  if (graphCandidate) {
    addScore(graphCandidate.score, `Molecular graph similarity: ${graphCandidate.score}/62`, "graph")
    graphCandidate.reasons.slice(0, 3).forEach((reason) => reasons.push(`Graph: ${reason}`))
  }

  if (formulaQuery && formulaQuery === recordFormula) {
    addScore(
      input.ocrFormulaCorrected ? 45 : 55,
      input.ocrFormulaCorrected ? "Corrected formula match" : "Exact formula match",
      formulaEvidenceCategory(input.formula),
    )
  } else if (formulaQuery && recordFormula.includes(formulaQuery)) {
    addScore(20, "Partial formula match", formulaEvidenceCategory(input.formula))
  }

  if (condensedFormulaQuery && condensedCompositionQuery === recordFormulaComposition) {
    addScore(
      input.ocrFormulaCorrected ? 42 : 55,
      input.ocrFormulaCorrected ? "Corrected condensed formula match" : "Condensed formula match",
      formulaEvidenceCategory(input.condensedFormula),
    )
  } else if (
    formulaCompositionQuery &&
    formulaCompositionQuery === recordFormulaComposition &&
    formulaQuery !== recordFormula
  ) {
    addScore(
      input.ocrFormulaCorrected ? 30 : 38,
      input.ocrFormulaCorrected ? "Corrected formula composition match" : "Formula composition match",
      formulaEvidenceCategory(input.formula),
    )
  }

  if (nameQuery && nameQuery === recordName) {
    addScore(55, "Exact name match", nameEvidenceCategory(input.moleculeName))
    directNameMatch = true
  } else if (nameQuery && aliases.includes(nameQuery)) {
    addScore(50, "Name or alias match", nameEvidenceCategory(input.moleculeName))
    directNameMatch = true
  } else if (nameQuery && (recordName.includes(nameQuery) || nameQuery.includes(recordName))) {
    addScore(25, "Name similarity match", nameEvidenceCategory(input.moleculeName))
    directNameMatch = true
  }

  if (!directNameMatch && aliases.some((alias) => alias && combined.includes(alias))) {
    addScore(22, "Alias appears in OCR or hints", "ocr")
  }

  if (fileQuery && (fileQuery.includes(recordName) || aliases.some((alias) => fileQuery.includes(alias)))) {
    addScore(12, "Filename hint match", "filename")
  }

  for (const group of functionalGroups) {
    if (group && hintQuery.includes(group)) addScore(25, `Functional group hint match: ${group}`, "manual")
  }

  for (const keyword of keywords) {
    if (keyword && combined.includes(keyword)) addScore(8, `Structure clue match: ${keyword}`, "other")
  }

  for (const reactionTerm of reactionTerms) {
    if (reactionTerm && combined.includes(reactionTerm)) addScore(4, "Related reaction pathway match", "other")
  }

  if (record.id === "benzene" && aromaticHintPattern.test(aromaticSource)) {
    const category: StructureScoreContribution["category"] = aromaticHintPattern.test(manualAromaticSource)
      ? "manual"
      : aromaticHintPattern.test(fileQuery)
        ? "filename"
        : "ocr"
    addScore(22, "Benzene/arene name, formula, or ring hint", category)
  } else if (
    functionalGroups.some((group) => group === "arene" || group === "aromatic") &&
    /\b(aromatic|phenyl|ring)\b/.test(aromaticSource)
  ) {
    addScore(10, "Aromatic or phenyl clue", "ring")
  }

  if (input.ocrQuality !== undefined) {
    if (input.ocrQuality < 35) addScore(-24, "OCR quality penalty: very low text confidence", "penalty")
    else if (input.ocrQuality < 55) addScore(-14, "OCR quality penalty: low text confidence", "penalty")
    else if (input.ocrQuality < 70) addScore(-6, "OCR quality penalty: moderate text confidence", "penalty")
  }
  if (input.ocrNoisePenalty && input.ocrNoisePenalty > 0) {
    addScore(-Math.min(35, input.ocrNoisePenalty), "Chemistry OCR rejected-noise penalty", "penalty")
  }

  if (score <= 0) return null

  return {
    record,
    confidence: 0,
    reasons: uniqueReasons(reasons),
    score,
    contributions: contributions.slice(0, 14),
  }
}

function confidenceFromMatch(match: StructureScanMatch, nextScore: number): number {
  const margin = Math.max(0, match.score - nextScore)
  let confidence = 25 + Math.max(0, match.score) * 0.55 + Math.min(14, margin * 0.15)
  const positive = match.contributions.filter((contribution) => contribution.points > 0)
  const visualScore = positive
    .filter((contribution) => contribution.category === "visual" || contribution.category === "ring" || contribution.category === "graph")
    .reduce((sum, contribution) => sum + contribution.points, 0)
  const hasStrongEvidence = positive.some((contribution) =>
    /exact formula|corrected formula|condensed formula|exact name|name or alias|ocr token database|strong visual/i.test(contribution.label),
  ) || visualScore >= 45 || positive.some((contribution) => contribution.category === "graph" && contribution.points >= 42)
  const onlyWeakEvidence = visualScore < 45 && positive.every((contribution) =>
    /filename|structure clue|reaction pathway|aromatic|ring|visual heuristic/i.test(contribution.label),
  )

  if (!hasStrongEvidence) confidence = Math.min(confidence, 54)
  if (onlyWeakEvidence) confidence = Math.min(confidence, 42)
  if (match.contributions.some((contribution) => contribution.points <= -20)) confidence = Math.min(confidence, 57)
  if (match.contributions.some((contribution) => /corrected/i.test(contribution.label))) confidence = Math.min(confidence, 88)
  const calibratedBenzene = match.record.id === "benzene" && positive.some((contribution) =>
    /near-ring candidate|5-7 member fuzzy ring|aromatic\/double-bond support/i.test(contribution.label),
  )
  if (calibratedBenzene) {
    const hasIndependentHint = positive.some((contribution) =>
      contribution.category === "ocr" || contribution.category === "manual" || contribution.category === "filename",
    )
    confidence = Math.min(confidence, hasIndependentHint ? 85 : 68)
  }
  return clamp(Math.round(confidence), 12, 96)
}

export function scanStructure(input: StructureScanInput): StructureScanResult {
  const matches = STRUCTURE_SCANNER_RECORDS.map((record) => scoreRecord(record, input))
    .filter((match): match is StructureScanMatch => Boolean(match))
    .sort((left, right) => right.score - left.score || left.record.name.localeCompare(right.record.name))
    .slice(0, 5)

  const scoredMatches = matches.map((match, index) => ({
    ...match,
    confidence: confidenceFromMatch(match, matches[index + 1]?.score ?? 0),
  }))

  const bestMatch = scoredMatches[0] ?? null
  const isConfident = Boolean(bestMatch && bestMatch.confidence >= CONFIDENCE_THRESHOLD)
  const message = isConfident
    ? "Deterministic database match generated from local visual cues, OCR tokens, the uploaded filename, and manual chemistry hints."
    : input.visualAnalysis?.isUncertain
      ? "Visual structure recognition is uncertain. Add a formula/name hint or crop closer."
      : bestMatch
        ? "ARSHLAB could not confidently identify this structure."
        : "No readable formula or name was matched. Add a hint or improve the image crop."

  return {
    query: input,
    bestMatch,
    matches: scoredMatches,
    message,
    isConfident,
    confidenceThreshold: CONFIDENCE_THRESHOLD,
  }
}
