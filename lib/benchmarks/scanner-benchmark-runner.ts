import { scanStructure } from "../structure-scanner/scanner-engine"
import type { StructureScannerRecord } from "../structure-scanner/scanner-types"
import { SCANNER_BENCHMARK_FIXTURES } from "./scanner-benchmark-fixtures"
import type {
  ScannerBenchmarkFixture,
  ScannerBenchmarkFamilySummary,
  ScannerBenchmarkFixtureResult,
  ScannerBenchmarkReport,
  ScannerBenchmarkSummary,
} from "./scanner-benchmark-types"

function now(): number {
  return globalThis.performance?.now?.() ?? Date.now()
}

function percent(part: number, total: number): number {
  if (!total) return 0
  return Math.round((part / total) * 1000) / 10
}

function average(values: number[]): number {
  if (!values.length) return 0
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
}

function normalize(text: string): string {
  return text.trim().toLowerCase()
}

function parseFormula(formula: string | undefined): Record<string, number> {
  if (!formula) return {}
  const counts: Record<string, number> = {}
  const compact = formula.replace(/[\s()[\]{}+-]/g, "")
  for (const match of compact.matchAll(/([A-Z][a-z]?)(\d*)/g)) {
    const element = match[1]
    const amount = match[2] ? Number(match[2]) : 1
    if (!Number.isFinite(amount)) continue
    counts[element] = (counts[element] ?? 0) + amount
  }
  return counts
}

function sameCounts(left: Record<string, number>, right: Record<string, number>): boolean {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)])
  for (const key of keys) {
    if ((left[key] ?? 0) !== (right[key] ?? 0)) return false
  }
  return true
}

function containsAllGroups(record: StructureScannerRecord | null, expectedGroups: string[]): boolean {
  if (!record) return false
  const actual = new Set(record.functionalGroups.map(normalize))
  return expectedGroups.every((group) => actual.has(normalize(group)))
}

function inferRingCount(record: StructureScannerRecord | null): number {
  if (!record) return 0
  if (record.id === "naphthalene") return 2
  if (record.id === "caffeine") return 2
  const haystack = [
    record.id,
    record.name,
    record.formula,
    ...record.functionalGroups,
    ...record.commonAliases,
    ...(record.keywords ?? []),
  ].join(" ").toLowerCase()
  if (/(arene|aromatic|benzene|phenol|aniline|cyclo|ring)/.test(haystack)) return 1
  return 0
}

function inferAromaticity(record: StructureScannerRecord | null): boolean {
  if (!record) return false
  const haystack = [
    record.id,
    record.name,
    ...record.functionalGroups,
    ...record.commonAliases,
    ...(record.keywords ?? []),
  ].join(" ").toLowerCase()
  return /(arene|aromatic|benzene|phenol|aniline|naphthalene|pyridine)/.test(haystack)
}

function collectFailureReasons(result: ScannerBenchmarkFixtureResult): string[] {
  const reasons: string[] = []
  if (!result.result.bestMatch) reasons.push("No database-valid candidate returned")
  if (!result.top1Correct) {
    reasons.push(
      result.topCandidateName
        ? `Expected ${result.fixture.expectedName}; top candidate was ${result.topCandidateName}`
        : `Expected ${result.fixture.expectedName}; no top candidate`,
    )
  }
  if (!result.formulaCorrect) reasons.push("Formula mismatch")
  if (!result.functionalGroupsCorrect) reasons.push("Functional-group mismatch")
  if (!result.ringCountCorrect) reasons.push("Ring-count mismatch")
  if (!result.aromaticityCorrect) reasons.push("Aromaticity mismatch")
  if (!result.atomCountsCorrect) reasons.push("Atom-count mismatch")
  if (result.falseAromatic) reasons.push("False aromatic classification")
  if (result.falseRing) reasons.push("False ring classification")
  if (!reasons.length && result.result.evidenceFusion.whyWinnerBeatRunnerUp) {
    reasons.push(result.result.evidenceFusion.whyWinnerBeatRunnerUp)
  }
  return reasons
}

export function runScannerBenchmark(
  fixtures: ScannerBenchmarkFixture[] = SCANNER_BENCHMARK_FIXTURES,
): ScannerBenchmarkReport {
  const results: ScannerBenchmarkFixtureResult[] = fixtures.map((fixture) => {
    const started = now()
    const result = scanStructure(fixture.input)
    const runtimeMs = Math.round((now() - started) * 10) / 10
    const topRecord = result.bestMatch?.record ?? null
    const topCandidateId = topRecord?.id ?? null
    const topCandidateName = topRecord?.name ?? null
    const topCandidates = result.matches.slice(0, 3).map((match) => ({
      id: match.record.id,
      name: match.record.name,
      confidence: match.confidence,
    }))
    const inferredRingCount = inferRingCount(topRecord)
    const inferredAromaticity = inferAromaticity(topRecord)
    const formulaCorrect = sameCounts(parseFormula(topRecord?.formula), parseFormula(fixture.expectedFormula))
    const fixtureResult: ScannerBenchmarkFixtureResult = {
      fixture,
      result,
      topCandidateId,
      topCandidateName,
      topCandidates,
      confidence: result.bestMatch?.confidence ?? 0,
      runtimeMs,
      top1Correct: topCandidateId === fixture.compoundId,
      top3Correct: result.matches.slice(0, 3).some((match) => match.record.id === fixture.compoundId),
      formulaCorrect,
      functionalGroupsCorrect: containsAllGroups(topRecord, fixture.expectedFunctionalGroups),
      ringCountCorrect: inferredRingCount === fixture.expectedRingCount,
      aromaticityCorrect: inferredAromaticity === fixture.expectedAromaticity,
      atomCountsCorrect: sameCounts(parseFormula(topRecord?.formula), fixture.expectedAtomCounts),
      falseAromatic: !fixture.expectedAromaticity && inferredAromaticity,
      falseRing: fixture.expectedRingCount === 0 && inferredRingCount > 0,
      failedCompilation: !result.bestMatch,
      validationFailureReasons: [],
    }
    fixtureResult.validationFailureReasons = collectFailureReasons(fixtureResult)
    return fixtureResult
  })

  const summary = summarizeScannerBenchmark(results)
  return {
    version: "11.4.0",
    generatedAt: new Date().toISOString(),
    summary,
    results,
  }
}

function summarizeFamily(results: ScannerBenchmarkFixtureResult[]): ScannerBenchmarkFamilySummary {
  const fixtureCount = results.length
  return {
    fixtureCount,
    top1Accuracy: percent(results.filter((result) => result.top1Correct).length, fixtureCount),
    top3Accuracy: percent(results.filter((result) => result.top3Correct).length, fixtureCount),
    formulaAccuracy: percent(results.filter((result) => result.formulaCorrect).length, fixtureCount),
    functionalGroupAccuracy: percent(results.filter((result) => result.functionalGroupsCorrect).length, fixtureCount),
    averageConfidence: average(results.map((result) => result.confidence)),
  }
}

export function summarizeScannerBenchmark(results: ScannerBenchmarkFixtureResult[]): ScannerBenchmarkSummary {
  const fixtureCount = results.length
  const validationFailureReasons: Record<string, number> = {}
  for (const result of results) {
    for (const reason of result.validationFailureReasons) {
      validationFailureReasons[reason] = (validationFailureReasons[reason] ?? 0) + 1
    }
  }
  const familyBuckets = new Map<string, ScannerBenchmarkFixtureResult[]>()
  for (const result of results) {
    const family = result.fixture.coverageFamily
    familyBuckets.set(family, [...(familyBuckets.get(family) ?? []), result])
  }
  const coverageFamilies = Object.fromEntries(
    Array.from(familyBuckets)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([family, familyResults]) => [family, summarizeFamily(familyResults)]),
  )

  return {
    fixtureCount,
    top1Accuracy: percent(results.filter((result) => result.top1Correct).length, fixtureCount),
    top3Accuracy: percent(results.filter((result) => result.top3Correct).length, fixtureCount),
    formulaAccuracy: percent(results.filter((result) => result.formulaCorrect).length, fixtureCount),
    functionalGroupAccuracy: percent(results.filter((result) => result.functionalGroupsCorrect).length, fixtureCount),
    ringCountAccuracy: percent(results.filter((result) => result.ringCountCorrect).length, fixtureCount),
    aromaticityAccuracy: percent(results.filter((result) => result.aromaticityCorrect).length, fixtureCount),
    atomCountAccuracy: percent(results.filter((result) => result.atomCountsCorrect).length, fixtureCount),
    averageConfidence: average(results.map((result) => result.confidence)),
    falseAromaticRate: percent(results.filter((result) => result.falseAromatic).length, fixtureCount),
    falseRingRate: percent(results.filter((result) => result.falseRing).length, fixtureCount),
    averageRuntimeMs: average(results.map((result) => result.runtimeMs)),
    failedCompilationRate: percent(results.filter((result) => result.failedCompilation).length, fixtureCount),
    validationFailureReasons,
    coverageFamilies,
  }
}

export function formatScannerBenchmarkTable(report: ScannerBenchmarkReport): string {
  const rows = report.results.map((result) => ({
    fixture: result.fixture.id,
    family: result.fixture.coverageFamily,
    expected: result.fixture.expectedName,
    top: result.topCandidateName ?? "No match",
    confidence: `${result.confidence}%`,
    top1: result.top1Correct ? "yes" : "no",
    top3: result.top3Correct ? "yes" : "no",
    formula: result.formulaCorrect ? "yes" : "no",
    groups: result.functionalGroupsCorrect ? "yes" : "no",
    rings: result.ringCountCorrect ? "yes" : "no",
    aromatic: result.aromaticityCorrect ? "yes" : "no",
    runtime: `${result.runtimeMs}ms`,
  }))

  const lines = [
    `ARSHLAB Structure Scanner Benchmark v${report.version}`,
    `Fixtures: ${report.summary.fixtureCount}`,
    `Top-1: ${report.summary.top1Accuracy}% | Top-3: ${report.summary.top3Accuracy}% | Avg confidence: ${report.summary.averageConfidence}% | Avg runtime: ${report.summary.averageRuntimeMs}ms`,
    "",
    consoleTable(rows),
  ]
  return lines.join("\n")
}

function consoleTable(rows: Array<Record<string, string>>): string {
  if (!rows.length) return "(no fixtures)"
  const headers = Object.keys(rows[0])
  const widths = headers.map((header) => Math.max(header.length, ...rows.map((row) => row[header].length)))
  const line = (cells: string[]) => cells.map((cell, index) => cell.padEnd(widths[index])).join("  ")
  const divider = widths.map((width) => "-".repeat(width)).join("  ")
  return [line(headers), divider, ...rows.map((row) => line(headers.map((header) => row[header])))].join("\n")
}

export function toSerializableBenchmarkReport(report: ScannerBenchmarkReport) {
  return {
    ...report,
    results: report.results.map(({ result, ...rest }) => ({
      ...rest,
      result: {
        message: result.message,
        isConfident: result.isConfident,
        confidenceBreakdown: result.confidenceBreakdown,
        evidenceFusion: {
          winningCompoundId: result.evidenceFusion.winningCompoundId,
          runnerUpCompoundIds: result.evidenceFusion.runnerUpCompoundIds,
          whyWinnerBeatRunnerUp: result.evidenceFusion.whyWinnerBeatRunnerUp,
          strongestEvidence: result.evidenceFusion.strongestEvidence,
          weakestEvidence: result.evidenceFusion.weakestEvidence,
        },
      },
    })),
  }
}
