import type {
  RealWorldBenchmarkComparison,
  RealWorldBenchmarkReport,
  RealWorldBenchmarkResult,
  RealWorldBenchmarkSummary,
  RealWorldFailureCause,
  RealWorldMetricSummary,
} from "./real-world-benchmark-types"

export function percent(part: number, total: number): number {
  if (!total) return 0
  return Math.round((part / total) * 1000) / 10
}

export function average(values: number[]): number {
  if (!values.length) return 0
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 10) / 10
}

export function formulaCounts(formula: string | undefined): Record<string, number> {
  if (!formula) return {}
  const counts: Record<string, number> = {}
  const compact = formula.replace(/[\s()[\]{}+\-=#]/g, "")
  for (const match of compact.matchAll(/([A-Z][a-z]?)(\d*)/g)) {
    const element = match[1]
    const amount = match[2] ? Number(match[2]) : 1
    if (!Number.isFinite(amount)) continue
    counts[element] = (counts[element] ?? 0) + amount
  }
  return counts
}

export function sameCounts(left: Record<string, number>, right: Record<string, number>): boolean {
  const keys = new Set([...Object.keys(left), ...Object.keys(right)])
  for (const key of keys) {
    if ((left[key] ?? 0) !== (right[key] ?? 0)) return false
  }
  return true
}

function normalize(text: string): string {
  return text.trim().toLowerCase()
}

export function containsExpectedGroups(actualGroups: string[], expectedGroups: string[]): boolean {
  const actual = new Set(actualGroups.map(normalize))
  return expectedGroups.every((group) => actual.has(normalize(group)))
}

function histogram(values: number[], bins: Array<{ label: string; min: number; max: number }>): Record<string, number> {
  const output = Object.fromEntries(bins.map((bin) => [bin.label, 0]))
  for (const value of values) {
    const bin = bins.find((candidate) => value >= candidate.min && value <= candidate.max)
    if (bin) output[bin.label] += 1
  }
  return output
}

export function classifyRealWorldFailure(result: Omit<RealWorldBenchmarkResult, "failureCauses" | "failureReasons">): {
  causes: RealWorldFailureCause[]
  reasons: string[]
} {
  const causes = new Set<RealWorldFailureCause>()
  const reasons: string[] = []
  const scannerResult = result.scannerResult

  if (result.top1Correct) {
    return { causes: [], reasons: [] }
  }

  if (!result.sample.imageExists) {
    causes.add("Unknown")
    reasons.push("Image file is missing from the local real-world benchmark dataset.")
  }
  if (!result.sample.scannerInput) {
    causes.add("Unknown")
    reasons.push("No scanner export input was provided for this raw image sample.")
  }
  if (!scannerResult?.bestMatch) {
    causes.add("Compiler failure")
    reasons.push("No database-valid scanner candidate was returned.")
  }
  if (scannerResult && !scannerResult.isConfident) {
    causes.add("Low confidence")
    reasons.push("Top candidate did not meet the scanner confidence threshold.")
  }
  if (!result.top1Correct && result.top3Correct) {
    causes.add("Candidate ranking failure")
    reasons.push("Expected compound appeared in the top three but was not ranked first.")
  }
  if (!result.top3Correct && scannerResult?.matches.length) {
    causes.add("Reference coverage failure")
    reasons.push("Expected compound did not appear in the top three candidates.")
  }
  if (!result.formulaCorrect && scannerResult) {
    causes.add("OCR failure")
    reasons.push("Predicted formula did not match the expected formula.")
  }
  if (!result.atomCountsCorrect && scannerResult) {
    causes.add("Atom-label failure")
    reasons.push("Predicted atom counts did not match expected atom counts.")
  }
  if (!result.ringCountCorrect && result.sample.expectedRingCount > 0) {
    causes.add("Ring reconstruction failure")
    reasons.push("Expected ring count was not recovered.")
  }
  if (!result.aromaticityCorrect && result.sample.expectedAromaticity) {
    causes.add("Ring reconstruction failure")
    reasons.push("Expected aromaticity was not recovered.")
  }
  if ((scannerResult?.confidenceBreakdown.graph ?? 0) < 35 && result.sample.expectedRingCount > 0) {
    causes.add("Graph validation failure")
    reasons.push("Graph confidence was low for a structure that requires ring/topology evidence.")
  }
  if (result.sample.difficulty === "perspective" || result.sample.tags.includes("perspective")) {
    if (!result.top1Correct || (scannerResult?.confidenceBreakdown.graph ?? 0) < 45) {
      causes.add("Perspective failure")
      reasons.push("Perspective-tagged sample had weak or incorrect graph evidence.")
    }
  }
  if (!causes.size && !result.top1Correct) {
    causes.add("Unknown")
    reasons.push("Result failed without a specific deterministic classification.")
  }

  return {
    causes: Array.from(causes),
    reasons,
  }
}

function summarizeMetric(results: RealWorldBenchmarkResult[]): RealWorldMetricSummary {
  const sampleCount = results.length
  const passCount = results.filter((result) => result.top1Correct).length
  return {
    sampleCount,
    passCount,
    failureCount: sampleCount - passCount,
    top1Accuracy: percent(passCount, sampleCount),
    top3Accuracy: percent(results.filter((result) => result.top3Correct).length, sampleCount),
    formulaAccuracy: percent(results.filter((result) => result.formulaCorrect).length, sampleCount),
    functionalGroupAccuracy: percent(results.filter((result) => result.functionalGroupsCorrect).length, sampleCount),
    ringAccuracy: percent(results.filter((result) => result.ringCountCorrect).length, sampleCount),
    aromaticityAccuracy: percent(results.filter((result) => result.aromaticityCorrect).length, sampleCount),
    atomCountAccuracy: percent(results.filter((result) => result.atomCountsCorrect).length, sampleCount),
    averageConfidence: average(results.map((result) => result.confidence)),
    averageRuntimeMs: average(results.map((result) => result.runtimeMs)),
  }
}

export function summarizeRealWorldBenchmark(results: RealWorldBenchmarkResult[]): RealWorldBenchmarkSummary {
  const categories = new Map<string, RealWorldBenchmarkResult[]>()
  for (const result of results) {
    for (const category of [result.sample.difficulty, ...result.sample.tags]) {
      categories.set(category, [...(categories.get(category) ?? []), result])
    }
  }
  const failureHistogram = Object.fromEntries([
    "OCR failure",
    "Atom-label failure",
    "Perspective failure",
    "Ring reconstruction failure",
    "Graph validation failure",
    "Compiler failure",
    "Candidate ranking failure",
    "Reference coverage failure",
    "Low confidence",
    "Unknown",
  ].map((cause) => [cause, 0])) as Record<RealWorldFailureCause, number>
  for (const result of results) {
    result.failureCauses.forEach((cause) => {
      failureHistogram[cause] += 1
    })
  }
  return {
    ...summarizeMetric(results),
    categoryMetrics: Object.fromEntries(
      Array.from(categories)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([category, categoryResults]) => [category, summarizeMetric(categoryResults)]),
    ),
    failureHistogram,
    runtimeHistogram: histogram(results.map((result) => result.runtimeMs), [
      { label: "0-10ms", min: 0, max: 10 },
      { label: "10-50ms", min: 10.0001, max: 50 },
      { label: "50-100ms", min: 50.0001, max: 100 },
      { label: "100-250ms", min: 100.0001, max: 250 },
      { label: "250ms+", min: 250.0001, max: Number.POSITIVE_INFINITY },
    ]),
    confidenceHistogram: histogram(results.map((result) => result.confidence), [
      { label: "0-20%", min: 0, max: 20 },
      { label: "20-40%", min: 20.0001, max: 40 },
      { label: "40-60%", min: 40.0001, max: 60 },
      { label: "60-80%", min: 60.0001, max: 80 },
      { label: "80-100%", min: 80.0001, max: 100 },
    ]),
  }
}

export function compareRealWorldReports(
  current: RealWorldBenchmarkReport,
  baseline: RealWorldBenchmarkReport,
): RealWorldBenchmarkComparison {
  const baselineById = new Map(baseline.results.map((result) => [result.sample.id, result]))
  let regressionCount = 0
  let improvementCount = 0
  for (const currentResult of current.results) {
    const previous = baselineById.get(currentResult.sample.id)
    if (!previous) continue
    if (previous.top1Correct && !currentResult.top1Correct) regressionCount += 1
    if (!previous.top1Correct && currentResult.top1Correct) improvementCount += 1
  }
  return {
    baselineVersion: baseline.version,
    currentVersion: current.version,
    baselineGeneratedAt: baseline.generatedAt,
    currentGeneratedAt: current.generatedAt,
    accuracyDelta: Math.round((current.summary.top1Accuracy - baseline.summary.top1Accuracy) * 10) / 10,
    confidenceDelta: Math.round((current.summary.averageConfidence - baseline.summary.averageConfidence) * 10) / 10,
    runtimeDelta: Math.round((current.summary.averageRuntimeMs - baseline.summary.averageRuntimeMs) * 10) / 10,
    regressionCount,
    improvementCount,
  }
}

function csvCell(value: unknown): string {
  const text = String(value ?? "")
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function exportRealWorldBenchmarkCsv(report: RealWorldBenchmarkReport): string {
  const header = [
    "id",
    "difficulty",
    "tags",
    "expected",
    "predicted",
    "confidence",
    "top1",
    "top3",
    "runtimeMs",
    "failureCauses",
  ]
  const rows = report.results.map((result) => [
    result.sample.id,
    result.sample.difficulty,
    result.sample.tags.join("|"),
    result.sample.expectedName,
    result.topCandidateName ?? "",
    result.confidence,
    result.top1Correct,
    result.top3Correct,
    result.runtimeMs,
    result.failureCauses.join("|"),
  ])
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n")
}

export function exportRealWorldBenchmarkMarkdown(report: RealWorldBenchmarkReport): string {
  const lines = [
    `# ARSHLAB Real-World Scanner Benchmark v${report.version}`,
    "",
    `Generated: ${report.generatedAt}`,
    `Dataset: ${report.datasetDirectory}`,
    "",
    `Top-1 accuracy: ${report.summary.top1Accuracy}%`,
    `Top-3 accuracy: ${report.summary.top3Accuracy}%`,
    `Average confidence: ${report.summary.averageConfidence}%`,
    `Average runtime: ${report.summary.averageRuntimeMs} ms`,
    "",
    "| Sample | Expected | Predicted | Confidence | Top-1 | Causes |",
    "| --- | --- | --- | ---: | --- | --- |",
    ...report.results.map((result) =>
      `| ${result.sample.id} | ${result.sample.expectedName} | ${result.topCandidateName ?? "No match"} | ${result.confidence}% | ${result.top1Correct ? "Pass" : "Fail"} | ${result.failureCauses.join(", ") || "-"} |`,
    ),
  ]
  return lines.join("\n")
}
