import { loadRealWorldBenchmarkSamples, DEFAULT_REAL_WORLD_BENCHMARK_DIR } from "./image-loader"
import {
  classifyRealWorldFailure,
  compareRealWorldReports,
  containsExpectedGroups,
  formulaCounts,
  sameCounts,
  summarizeRealWorldBenchmark,
} from "./real-world-metrics"
import type {
  LoadedRealWorldBenchmarkSample,
  RealWorldBenchmarkReport,
  RealWorldBenchmarkResult,
} from "./real-world-benchmark-types"
import { scanStructure } from "../structure-scanner/scanner-engine"
import type { StructureScannerRecord } from "../structure-scanner/scanner-types"

export const REAL_WORLD_BENCHMARK_VERSION = "11.5.0" as const

function now(): number {
  return globalThis.performance?.now?.() ?? Date.now()
}

function normalize(text: string): string {
  return text.trim().toLowerCase()
}

function inferRingCount(record: StructureScannerRecord | null): number {
  if (!record) return 0
  if (record.id === "naphthalene" || record.id === "caffeine") return 2
  const haystack = [
    record.id,
    record.name,
    record.formula,
    ...record.functionalGroups,
    ...record.commonAliases,
    ...(record.keywords ?? []),
  ].join(" ").toLowerCase()
  if (/(arene|aromatic|benzene|phenol|aniline|cyclo|ring|pyridine)/.test(haystack)) return 1
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
  return /(arene|aromatic|benzene|phenol|aniline|naphthalene|pyridine|caffeine|xanthine)/.test(haystack)
}

function evaluateSample(sample: LoadedRealWorldBenchmarkSample): RealWorldBenchmarkResult {
  const started = now()
  const scannerResult = sample.scannerInput ? scanStructure(sample.scannerInput) : null
  const runtimeMs = Math.round((now() - started) * 10) / 10
  const topRecord = scannerResult?.bestMatch?.record ?? null
  const topCandidateId = topRecord?.id ?? null
  const topCandidateName = topRecord?.name ?? null
  const topCandidates = scannerResult?.matches.slice(0, 3).map((match) => ({
    id: match.record.id,
    name: match.record.name,
    confidence: match.confidence,
  })) ?? []
  const expectedAtomCounts = sample.expectedAtomCounts ?? formulaCounts(sample.expectedFormula)
  const baseResult: Omit<RealWorldBenchmarkResult, "failureCauses" | "failureReasons"> = {
    sample,
    scannerResult,
    topCandidateId,
    topCandidateName,
    topCandidates,
    confidence: scannerResult?.bestMatch?.confidence ?? 0,
    runtimeMs,
    top1Correct: normalize(topCandidateName ?? "") === normalize(sample.expectedName) ||
      normalize(topCandidateId ?? "") === normalize(sample.id) ||
      normalize(topCandidateId ?? "") === normalize(sample.expectedName),
    top3Correct: Boolean(scannerResult?.matches.slice(0, 3).some((match) =>
      normalize(match.record.name) === normalize(sample.expectedName) ||
      normalize(match.record.id) === normalize(sample.id) ||
      normalize(match.record.formula) === normalize(sample.expectedFormula),
    )),
    formulaCorrect: sameCounts(formulaCounts(topRecord?.formula), formulaCounts(sample.expectedFormula)),
    functionalGroupsCorrect: containsExpectedGroups(topRecord?.functionalGroups ?? [], sample.expectedFunctionalGroups),
    ringCountCorrect: inferRingCount(topRecord) === sample.expectedRingCount,
    aromaticityCorrect: inferAromaticity(topRecord) === sample.expectedAromaticity,
    atomCountsCorrect: sameCounts(formulaCounts(topRecord?.formula), expectedAtomCounts),
    failedCompilation: !scannerResult?.bestMatch,
  }
  const failure = classifyRealWorldFailure(baseResult)
  return {
    ...baseResult,
    failureCauses: failure.causes,
    failureReasons: failure.reasons,
  }
}

export function runRealWorldBenchmark(options: {
  datasetDirectory?: string
  baselineReport?: RealWorldBenchmarkReport
  includeImageData?: boolean
  generatedAt?: string
} = {}): RealWorldBenchmarkReport {
  const datasetDirectory = options.datasetDirectory ?? DEFAULT_REAL_WORLD_BENCHMARK_DIR
  const samples = loadRealWorldBenchmarkSamples({
    datasetDirectory,
    includeImageData: options.includeImageData ?? false,
  })
  const results = samples.map(evaluateSample)
  const report: RealWorldBenchmarkReport = {
    version: REAL_WORLD_BENCHMARK_VERSION,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    datasetDirectory,
    summary: summarizeRealWorldBenchmark(results),
    results,
  }
  return options.baselineReport
    ? { ...report, comparison: compareRealWorldReports(report, options.baselineReport) }
    : report
}

export function formatRealWorldBenchmarkTable(report: RealWorldBenchmarkReport): string {
  const rows = report.results.map((result) => ({
    sample: result.sample.id,
    difficulty: result.sample.difficulty,
    expected: result.sample.expectedName,
    top: result.topCandidateName ?? "No match",
    confidence: `${result.confidence}%`,
    top1: result.top1Correct ? "yes" : "no",
    top3: result.top3Correct ? "yes" : "no",
    causes: result.failureCauses.join("; ") || "-",
    runtime: `${result.runtimeMs}ms`,
  }))
  return [
    `ARSHLAB Real-World Scanner Benchmark v${report.version}`,
    `Samples: ${report.summary.sampleCount}`,
    `Top-1: ${report.summary.top1Accuracy}% | Top-3: ${report.summary.top3Accuracy}% | Avg confidence: ${report.summary.averageConfidence}% | Avg runtime: ${report.summary.averageRuntimeMs}ms`,
    report.comparison
      ? `Baseline delta: ${report.comparison.accuracyDelta >= 0 ? "+" : ""}${report.comparison.accuracyDelta}% accuracy, ${report.comparison.regressionCount} regressions, ${report.comparison.improvementCount} improvements`
      : "Baseline delta: no baseline comparison",
    "",
    consoleTable(rows),
  ].join("\n")
}

function consoleTable(rows: Array<Record<string, string>>): string {
  if (!rows.length) return "(no real-world samples found)"
  const headers = Object.keys(rows[0])
  const widths = headers.map((header) => Math.max(header.length, ...rows.map((row) => row[header].length)))
  const line = (cells: string[]) => cells.map((cell, index) => cell.padEnd(widths[index])).join("  ")
  const divider = widths.map((width) => "-".repeat(width)).join("  ")
  return [line(headers), divider, ...rows.map((row) => line(headers.map((header) => row[header])))].join("\n")
}

export function toSerializableRealWorldBenchmarkReport(report: RealWorldBenchmarkReport) {
  return {
    ...report,
    results: report.results.map(({ scannerResult, ...rest }) => ({
      ...rest,
      scannerResult: scannerResult ? {
        message: scannerResult.message,
        isConfident: scannerResult.isConfident,
        confidenceBreakdown: scannerResult.confidenceBreakdown,
        evidenceFusion: {
          winningCompoundId: scannerResult.evidenceFusion.winningCompoundId,
          runnerUpCompoundIds: scannerResult.evidenceFusion.runnerUpCompoundIds,
          whyWinnerBeatRunnerUp: scannerResult.evidenceFusion.whyWinnerBeatRunnerUp,
          strongestEvidence: scannerResult.evidenceFusion.strongestEvidence,
          weakestEvidence: scannerResult.evidenceFusion.weakestEvidence,
        },
      } : null,
    })),
  }
}
