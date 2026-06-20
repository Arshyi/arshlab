import { STRUCTURE_SCANNER_RECORDS } from "../structure-scanner/scanner-database"

export type OCRChemistryTokenType = "molecular-formula" | "condensed-formula" | "chemical-name"
export type OCRFormulaMatchKind = "exact-formula" | "condensed-formula" | "composition" | "unmatched"

export interface OCRCorrection {
  from: string
  to: string
  reason: string
}

export interface OCRChemistryToken {
  type: OCRChemistryTokenType
  value: string
  sourceValue: string
  normalized: string
  confidence: number
  matchedCompoundIds: string[]
  matchKind: OCRFormulaMatchKind | "name"
  corrections: OCRCorrection[]
}

export interface OCRChemistryParseResult {
  normalizedText: string
  cleanedText: string
  tokens: OCRChemistryToken[]
  parsedFormulas: string[]
  parsedNames: string[]
  corrections: OCRCorrection[]
  detectedFormula: string | null
  detectedCondensedFormula: string | null
  detectedName: string | null
  detectedFormulaWasCorrected: boolean
  matchedCompoundIds: string[]
}

interface FormulaVariant {
  sourceValue: string
  value: string
  corrections: OCRCorrection[]
}

const SUBSCRIPT_DIGITS: Record<string, string> = {
  "\u2080": "0",
  "\u2081": "1",
  "\u2082": "2",
  "\u2083": "3",
  "\u2084": "4",
  "\u2085": "5",
  "\u2086": "6",
  "\u2087": "7",
  "\u2088": "8",
  "\u2089": "9",
}

const COMMON_ELEMENT_SYMBOLS = new Set([
  "H", "He", "Li", "Be", "B", "C", "N", "O", "F", "Ne", "Na", "Mg", "Al", "Si", "P", "S", "Cl", "Ar",
  "K", "Ca", "Cr", "Mn", "Fe", "Co", "Ni", "Cu", "Zn", "Br", "Kr", "Ag", "I", "Xe", "Ba", "Pt", "Au", "Hg", "Pb",
])

const KNOWN_CONDENSED_FORMULAS: Record<string, string> = {
  ch3oh: "methanol",
  ch3ch2oh: "ethanol",
  hcooh: "methanoic-acid",
  ch3cooh: "ethanoic-acid",
  ch3cho: "ethanal",
  ch3coch3: "acetone",
  ch3cooch2ch3: "ethyl-ethanoate",
  c6h5oh: "phenol",
  c6h5ch3: "toluene",
  hcho: "methanal",
  h2co: "methanal",
  och2: "methanal",
}

const GENERIC_NAME_ALIASES = new Set(["alcohol", "acid", "base", "ring"])

function normalizeFormula(value: string): string {
  return value.replace(/[^A-Za-z0-9]/g, "").toLowerCase()
}

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function replaceSubscripts(value: string): { value: string; corrections: OCRCorrection[] } {
  const corrections: OCRCorrection[] = []
  const next = value.replace(/[\u2080-\u2089]/g, (digit) => {
    const replacement = SUBSCRIPT_DIGITS[digit] ?? digit
    if (replacement !== digit) {
      corrections.push({ from: digit, to: replacement, reason: "Converted Unicode subscript digit" })
    }
    return replacement
  })
  return { value: next, corrections }
}

function addCorrection(
  variant: FormulaVariant,
  nextValue: string,
  reason: string,
): FormulaVariant | null {
  if (!nextValue || nextValue === variant.value) return null
  return {
    sourceValue: variant.sourceValue,
    value: nextValue,
    corrections: [...variant.corrections, { from: variant.value, to: nextValue, reason }],
  }
}

function normalizeFormulaSpacing(sourceValue: string): FormulaVariant {
  const subscriptResult = replaceSubscripts(sourceValue)
  let value = subscriptResult.value.trim()
  const corrections = [...subscriptResult.corrections]

  const joinedSymbols = value
    .replace(/B\s+r\b/g, "Br")
    .replace(/N\s+a\b/g, "Na")
    .replace(/C\s+[Il1]\b/g, "Cl")
  if (joinedSymbols !== value) {
    corrections.push({ from: value, to: joinedSymbols, reason: "Joined a split or misread element symbol" })
    value = joinedSymbols
  }

  const compact = value.replace(/\s+/g, "").replace(/[\-=#\u2013\u2014]/g, "")
  if (compact !== value) {
    corrections.push({ from: value, to: compact, reason: "Removed spacing and displayed bond separators" })
    value = compact
  }

  return { sourceValue, value, corrections }
}

function likelyFormulaVariants(sourceValue: string): FormulaVariant[] {
  const base = normalizeFormulaSpacing(sourceValue)
  const variants: FormulaVariant[] = [base]
  const correctionRules: Array<{ pattern: RegExp; replacement: string; reason: string }> = [
    { pattern: /CI/g, replacement: "Cl", reason: "Corrected uppercase I to lowercase l in chlorine" },
    { pattern: /C1/g, replacement: "Cl", reason: "Corrected digit 1 to lowercase l in chlorine" },
    { pattern: /5(?=[A-Z0-9]|$)/g, replacement: "S", reason: "Corrected digit 5 to sulfur" },
    { pattern: /8(?=[A-Z0-9]|$)/g, replacement: "B", reason: "Corrected digit 8 to boron" },
    { pattern: /1(?=[A-Z]|$)/g, replacement: "I", reason: "Corrected digit 1 to iodine" },
    { pattern: /0H/g, replacement: "OH", reason: "Corrected zero to oxygen before hydrogen" },
    { pattern: /0(?=[A-Z]|$)/g, replacement: "O", reason: "Corrected zero to oxygen in a formula" },
    { pattern: /G(?=$|[A-Z])/g, replacement: "6", reason: "Corrected G to the digit 6" },
    { pattern: /Z(?=$|[A-Z])/g, replacement: "2", reason: "Corrected Z to the digit 2" },
    { pattern: /(?<=[A-Z])I(?=[A-Z]|$)/g, replacement: "1", reason: "Corrected uppercase I to the digit 1" },
    { pattern: /(?<=[A-Z])l(?=[A-Z]|$)/g, replacement: "1", reason: "Corrected lowercase l to the digit 1" },
    { pattern: /(?<=[A-Z])S(?=[A-Z]|$)/g, replacement: "5", reason: "Corrected S to the digit 5" },
    { pattern: /(?<=[A-Z])B(?=[A-Z]|$)/g, replacement: "8", reason: "Corrected B to the digit 8" },
    { pattern: /O(?=\d)/g, replacement: "0", reason: "Corrected oxygen to the digit 0 in a numeric position" },
  ]

  for (const rule of correctionRules) {
    for (const variant of variants.slice(0, 48)) {
      const corrected = addCorrection(variant, variant.value.replace(rule.pattern, rule.replacement), rule.reason)
      if (corrected && variants.length < 96) variants.push(corrected)
    }
  }

  const unique = new Map<string, FormulaVariant>()
  for (const variant of variants) {
    const existing = unique.get(variant.value)
    if (!existing || variant.corrections.length < existing.corrections.length) unique.set(variant.value, variant)
  }
  return Array.from(unique.values()).slice(0, 32)
}

function formulaComposition(value: string): string | null {
  const source = value.replace(/[\s()[\]{}+\-=#]/g, "")
  if (!source) return null

  const tokens = source.match(/[A-Z][a-z]?\d*/g)
  if (!tokens || tokens.join("") !== source) return null

  const counts = new Map<string, number>()
  for (const token of tokens) {
    const match = token.match(/^([A-Z][a-z]?)(\d*)$/)
    if (!match || !COMMON_ELEMENT_SYMBOLS.has(match[1])) return null
    const count = Number(match[2] || "1")
    if (!Number.isFinite(count) || count <= 0) return null
    counts.set(match[1], (counts.get(match[1]) ?? 0) + count)
  }

  return Array.from(counts.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([element, count]) => `${element}${count}`)
    .join("")
}

function rawFormulaCandidates(rawText: string): string[] {
  const normalized = replaceSubscripts(rawText).value
  const candidates = normalized.match(/\b[A-Z0-9][A-Za-z0-9]{1,31}\b/g) ?? []
  const displayed = normalized.match(/\b[A-Z][A-Za-z0-9]*(?:\s*[-=#\u2013\u2014]\s*[A-Z][A-Za-z0-9]*)+\b/g) ?? []
  const splitSymbols = normalized.match(/\b(?:B\s+r|N\s+a|C\s+[Il1])(?:\d*[A-Z][A-Za-z0-9]*)?\b/g) ?? []
  return Array.from(new Set([...candidates, ...displayed, ...splitSymbols]))
}

function formulaMatch(candidate: string): {
  exactIds: string[]
  compositionIds: string[]
  knownCondensedId?: string
} {
  const normalizedCandidate = normalizeFormula(candidate)
  const knownCondensedId = KNOWN_CONDENSED_FORMULAS[normalizedCandidate]
  const composition = formulaComposition(candidate)
  const exactIds = STRUCTURE_SCANNER_RECORDS.filter(
    (record) => normalizeFormula(record.formula) === normalizedCandidate,
  ).map((record) => record.id)
  const compositionIds = composition
    ? STRUCTURE_SCANNER_RECORDS.filter((record) => formulaComposition(record.formula) === composition).map(
        (record) => record.id,
      )
    : []
  return { exactIds, compositionIds, knownCondensedId }
}

function tokenForVariant(variant: FormulaVariant): OCRChemistryToken | null {
  const composition = formulaComposition(variant.value)
  if (!composition) return null

  const match = formulaMatch(variant.value)
  const corrected = variant.corrections.length > 0
  if (match.knownCondensedId) {
    return {
      type: "condensed-formula",
      value: variant.value,
      sourceValue: variant.sourceValue,
      normalized: normalizeFormula(variant.value),
      confidence: corrected ? 84 : 94,
      matchedCompoundIds: [match.knownCondensedId],
      matchKind: "condensed-formula",
      corrections: variant.corrections,
    }
  }

  const matchedCompoundIds = Array.from(new Set([...match.exactIds, ...match.compositionIds]))
  const exact = match.exactIds.length > 0
  const elementSymbols = variant.value.match(/[A-Z][a-z]?/g) ?? []
  const looksMolecular = exact || new Set(elementSymbols).size === elementSymbols.length
  return {
    type: looksMolecular ? "molecular-formula" : "condensed-formula",
    value: variant.value,
    sourceValue: variant.sourceValue,
    normalized: normalizeFormula(variant.value),
    confidence: exact ? (corrected ? 82 : 94) : matchedCompoundIds.length > 0 ? (corrected ? 76 : 84) : corrected ? 64 : 58,
    matchedCompoundIds,
    matchKind: exact ? "exact-formula" : matchedCompoundIds.length > 0 ? "composition" : "unmatched",
    corrections: variant.corrections,
  }
}

function extractFormulaTokens(rawText: string): OCRChemistryToken[] {
  const tokens = rawFormulaCandidates(rawText).flatMap((candidate) => {
    const candidateTokens = likelyFormulaVariants(candidate).flatMap((variant) => {
      const token = tokenForVariant(variant)
      return token ? [token] : []
    })
    const matched = candidateTokens
      .filter((token) => token.matchedCompoundIds.length > 0)
      .sort((left, right) => right.confidence - left.confidence || left.corrections.length - right.corrections.length)
    if (matched[0]) return [matched[0]]

    const base = candidateTokens.find((token) => token.corrections.length === 0) ?? candidateTokens[0]
    if (base && /^[A-Z][a-z]?$/.test(base.value) && COMMON_ELEMENT_SYMBOLS.has(base.value)) return [base]

    const corrected = candidateTokens
      .filter((token) => token.corrections.length > 0)
      .sort((left, right) => right.confidence - left.confidence || left.corrections.length - right.corrections.length)[0]
    return corrected ? [corrected] : base ? [base] : []
  })

  const unique = new Map<string, OCRChemistryToken>()
  for (const token of tokens) {
    const key = `${token.type}:${token.normalized}`
    const existing = unique.get(key)
    const tokenRank = Number(token.matchedCompoundIds.length > 0) * 100 + token.confidence
    const existingRank = existing ? Number(existing.matchedCompoundIds.length > 0) * 100 + existing.confidence : -1
    if (!existing || tokenRank > existingRank) unique.set(key, token)
  }

  return Array.from(unique.values()).sort(
    (left, right) =>
      Number(right.matchedCompoundIds.length > 0) - Number(left.matchedCompoundIds.length > 0) ||
      right.confidence - left.confidence ||
      left.corrections.length - right.corrections.length,
  )
}

function extractNameTokens(rawText: string): OCRChemistryToken[] {
  const normalizedText = normalizeName(rawText)
  const found = new Map<string, OCRChemistryToken>()

  for (const record of STRUCTURE_SCANNER_RECORDS) {
    const candidates = [record.name, ...record.commonAliases]
      .map((value) => ({ value, normalized: normalizeName(value) }))
      .filter(({ normalized }) => normalized.length >= 4 && !GENERIC_NAME_ALIASES.has(normalized))

    for (const candidate of candidates) {
      const escaped = candidate.normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
      if (!new RegExp(`(?:^|\\s)${escaped}(?:$|\\s)`, "i").test(normalizedText)) continue

      const existing = found.get(candidate.normalized)
      const ids = Array.from(new Set([...(existing?.matchedCompoundIds ?? []), record.id]))
      found.set(candidate.normalized, {
        type: "chemical-name",
        value: candidate.value,
        sourceValue: candidate.value,
        normalized: candidate.normalized,
        confidence: candidate.normalized === normalizeName(record.name) ? 97 : 90,
        matchedCompoundIds: ids,
        matchKind: "name",
        corrections: [],
      })
    }
  }

  return Array.from(found.values()).sort(
    (left, right) => right.normalized.length - left.normalized.length || right.confidence - left.confidence,
  )
}

function uniqueCorrections(tokens: OCRChemistryToken[]): OCRCorrection[] {
  const seen = new Set<string>()
  return tokens.flatMap((token) => token.corrections).filter((correction) => {
    const key = `${correction.from}|${correction.to}|${correction.reason}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function cleanedTextFromTokens(rawText: string, tokens: OCRChemistryToken[]): string {
  let cleaned = replaceSubscripts(rawText).value.replace(/\r\n/g, "\n").trim()
  for (const token of tokens) {
    if (!token.corrections.length || token.sourceValue === token.value) continue
    cleaned = cleaned.replace(token.sourceValue, token.value)
  }
  return cleaned
}

export function parseChemistryText(rawText: string): OCRChemistryParseResult {
  const normalizedText = replaceSubscripts(rawText).value.replace(/\r\n/g, "\n").trim()
  const formulaTokens = extractFormulaTokens(normalizedText)
  const nameTokens = extractNameTokens(normalizedText)
  const tokens = [...formulaTokens, ...nameTokens]
  const preferredFormulaTokens = formulaTokens.some((token) => token.matchedCompoundIds.length > 0)
    ? formulaTokens.filter((token) => token.matchedCompoundIds.length > 0)
    : formulaTokens
  const detectedFormulaToken = preferredFormulaTokens.find((token) => token.type === "molecular-formula")
  const detectedCondensedToken = preferredFormulaTokens.find((token) => token.type === "condensed-formula")
  const detectedToken = detectedFormulaToken ?? detectedCondensedToken
  const detectedName = nameTokens[0]?.value ?? null

  return {
    normalizedText,
    cleanedText: cleanedTextFromTokens(normalizedText, tokens),
    tokens,
    parsedFormulas: formulaTokens.map((token) => token.value),
    parsedNames: nameTokens.map((token) => token.value),
    corrections: uniqueCorrections(tokens),
    detectedFormula: detectedFormulaToken?.value ?? null,
    detectedCondensedFormula: detectedCondensedToken?.value ?? null,
    detectedName,
    detectedFormulaWasCorrected: Boolean(detectedToken?.corrections.length),
    matchedCompoundIds: Array.from(new Set(tokens.flatMap((token) => token.matchedCompoundIds))),
  }
}
