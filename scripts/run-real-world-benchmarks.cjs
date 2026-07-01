const assert = require("node:assert/strict")
const { existsSync, mkdirSync, rmSync, readFileSync, writeFileSync } = require("node:fs")
const { tmpdir } = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

const mode = process.argv[2] ?? "benchmark"
const root = path.resolve(__dirname, "..")
const outputDirectory = path.join(tmpdir(), "arshlab-real-world-benchmark-checks")
const tscPath = require.resolve("typescript/bin/tsc")

rmSync(outputDirectory, { recursive: true, force: true })
const compile = spawnSync(process.execPath, [
  tscPath,
  "lib/benchmarks/real-world-benchmark-runner.ts",
  "lib/benchmarks/real-world-benchmark-types.ts",
  "lib/benchmarks/real-world-manifest.ts",
  "lib/benchmarks/real-world-metrics.ts",
  "lib/benchmarks/image-loader.ts",
  "lib/structure-scanner/scanner-engine.ts",
  "lib/structure-scanner/evidence-engines.ts",
  "lib/structure-scanner/evidence-fusion.ts",
  "lib/structure-scanner/evidence-types.ts",
  "lib/structure-scanner/scanner-database.ts",
  "lib/structure-scanner/scanner-types.ts",
  "lib/vision/molecular-graph.ts",
  "lib/structure-vision/vision-types.ts",
  "lib/molecular-compiler/compiler-types.ts",
  "--module", "commonjs",
  "--target", "es2020",
  "--outDir", outputDirectory,
  "--esModuleInterop",
  "--skipLibCheck",
], { cwd: root, encoding: "utf8" })

if (compile.status !== 0) {
  process.stderr.write(compile.stdout)
  process.stderr.write(compile.stderr)
  process.exit(compile.status ?? 1)
}

const runner = require(path.join(outputDirectory, "benchmarks", "real-world-benchmark-runner.js"))
const metrics = require(path.join(outputDirectory, "benchmarks", "real-world-metrics.js"))
const manifest = require(path.join(outputDirectory, "benchmarks", "real-world-manifest.js"))
const loader = require(path.join(outputDirectory, "benchmarks", "image-loader.js"))

function scannerInput(id, name, formula, groupHint, quality = 90) {
  return {
    moleculeName: name,
    formula,
    condensedFormula: formula,
    functionalGroupHint: groupHint,
    fileName: `${id}.jpg`,
    ocrCompoundIds: [id],
    ocrFormulaCompoundIds: [id],
    ocrNameCompoundIds: [id],
    ocrText: `${name} ${formula} ${groupHint}`,
    ocrQuality: quality,
    ocrChemistryConfidence: quality,
  }
}

function createTestDataset() {
  const directory = path.join(tmpdir(), "arshlab-real-world-benchmark-fixtures")
  rmSync(directory, { recursive: true, force: true })
  mkdirSync(directory, { recursive: true })
  writeFileSync(path.join(directory, "benzene.jpg"), "fake image bytes")
  writeFileSync(path.join(directory, "mistaken_benzene.jpg"), "fake image bytes")
  writeFileSync(path.join(directory, "raw_ethanol.jpg"), "fake image bytes")
  writeFileSync(path.join(directory, "manifest.json"), JSON.stringify({
    version: "test",
    samples: [
      {
        id: "camera_benzene_001",
        image: "benzene.jpg",
        expectedName: "Benzene",
        expectedFormula: "C6H6",
        expectedFunctionalGroups: ["arene"],
        expectedRingCount: 1,
        expectedAromaticity: true,
        expectedAtomCounts: { C: 6, H: 6 },
        difficulty: "camera_photo",
        tags: ["phone", "handwritten", "slight_glare"],
        notes: "Synthetic test manifest entry representing a real-world benzene photo.",
        scannerInput: scannerInput("benzene", "Benzene", "C6H6", "arene aromatic ring", 90),
      },
      {
        id: "camera_benzene_misranked",
        image: "mistaken_benzene.jpg",
        expectedName: "Benzene",
        expectedFormula: "C6H6",
        expectedFunctionalGroups: ["arene"],
        expectedRingCount: 1,
        expectedAromaticity: true,
        expectedAtomCounts: { C: 6, H: 6 },
        difficulty: "glare",
        tags: ["camera_photo", "glare"],
        notes: "Synthetic failure entry used to verify failure classification.",
        scannerInput: scannerInput("cyclohexane", "Cyclohexane", "C6H12", "cycloalkane saturated ring", 70),
      },
      {
        id: "raw_ethanol_without_export",
        image: "raw_ethanol.jpg",
        expectedName: "Ethanol",
        expectedFormula: "C2H6O",
        expectedFunctionalGroups: ["alcohol"],
        expectedRingCount: 0,
        expectedAromaticity: false,
        expectedAtomCounts: { C: 2, H: 6, O: 1 },
        difficulty: "handwritten",
        tags: ["phone"],
        notes: "Synthetic raw-image-only entry used to verify honest unevaluated handling.",
      },
    ],
  }, null, 2))
  return directory
}

function loadBaseline(reportDirectory) {
  const baselinePath = path.join(reportDirectory, "baseline.json")
  if (!existsSync(baselinePath)) return undefined
  return JSON.parse(readFileSync(baselinePath, "utf8"))
}

function writeReports(report, reportDirectory) {
  mkdirSync(reportDirectory, { recursive: true })
  const serializable = runner.toSerializableRealWorldBenchmarkReport(report)
  const timestamp = report.generatedAt.replace(/[:.]/g, "-")
  const latestJson = path.join(reportDirectory, "real-world-benchmark-report.json")
  const timestampJson = path.join(reportDirectory, `real-world-benchmark-${timestamp}.json`)
  writeFileSync(latestJson, JSON.stringify(serializable, null, 2))
  writeFileSync(timestampJson, JSON.stringify(serializable, null, 2))
  writeFileSync(path.join(reportDirectory, "real-world-benchmark-report.csv"), metrics.exportRealWorldBenchmarkCsv(report))
  writeFileSync(path.join(reportDirectory, "real-world-benchmark-report.md"), metrics.exportRealWorldBenchmarkMarkdown(report))

  const historyPath = path.join(reportDirectory, "history.json")
  const existingHistory = existsSync(historyPath) ? JSON.parse(readFileSync(historyPath, "utf8")) : []
  const historyEntry = {
    version: report.version,
    generatedAt: report.generatedAt,
    sampleCount: report.summary.sampleCount,
    top1Accuracy: report.summary.top1Accuracy,
    top3Accuracy: report.summary.top3Accuracy,
    averageConfidence: report.summary.averageConfidence,
    averageRuntimeMs: report.summary.averageRuntimeMs,
  }
  writeFileSync(historyPath, JSON.stringify([...existingHistory, historyEntry], null, 2))
  return latestJson
}

if (mode === "benchmark" || mode === "save-baseline") {
  const reportDirectory = path.join(root, ".next", "benchmark-reports", "real-world")
  const baselineReport = loadBaseline(reportDirectory)
  const report = runner.runRealWorldBenchmark({ baselineReport })
  console.log(runner.formatRealWorldBenchmarkTable(report))
  const latestJson = writeReports(report, reportDirectory)
  if (mode === "save-baseline") {
    writeFileSync(path.join(reportDirectory, "baseline.json"), JSON.stringify(runner.toSerializableRealWorldBenchmarkReport(report), null, 2))
    console.log(`\nBaseline saved to ${path.relative(root, path.join(reportDirectory, "baseline.json"))}`)
  }
  console.log(`\nJSON report written to ${path.relative(root, latestJson)}`)
  process.exit(0)
}

const datasetDirectory = createTestDataset()
const report = runner.runRealWorldBenchmark({
  datasetDirectory,
  includeImageData: true,
  generatedAt: "2026-07-01T00:00:00.000Z",
})
console.log(runner.formatRealWorldBenchmarkTable(report))

if (mode === "test" || mode === "real-world-benchmark") {
  assert.equal(report.version, "11.5.0")
  assert.equal(report.summary.sampleCount, 3)
  assert.equal(report.results[0].sample.imageExists, true)
  assert.ok(report.summary.top1Accuracy < 100, "real-world harness should allow failures")
  assert.ok(report.summary.categoryMetrics.camera_photo.sampleCount >= 1)
  assert.ok(report.summary.failureHistogram.Unknown >= 1)
  console.log("\nReal-world benchmark assertions passed.")
} else if (mode === "loader") {
  const samples = loader.loadRealWorldBenchmarkSamples({ datasetDirectory, includeImageData: true })
  assert.equal(samples.length, 3)
  assert.ok(samples[0].imageDataUrl.startsWith("data:image/jpeg;base64,"))
  console.log("\nBenchmark loader assertions passed.")
} else if (mode === "manifest") {
  const valid = manifest.parseRealWorldBenchmarkManifest(readFileSync(path.join(datasetDirectory, "manifest.json"), "utf8"))
  assert.equal(valid.issues.length, 0)
  const invalid = manifest.parseRealWorldBenchmarkManifest(JSON.stringify({ id: "bad" }))
  assert.ok(invalid.issues.length > 0)
  console.log("\nBenchmark manifest assertions passed.")
} else if (mode === "report") {
  assert.ok(runner.formatRealWorldBenchmarkTable(report).includes("ARSHLAB Real-World Scanner Benchmark"))
  assert.ok(report.summary.confidenceHistogram["60-80%"] >= 1)
  console.log("\nBenchmark report assertions passed.")
} else if (mode === "comparison") {
  const baseline = { ...report, generatedAt: "2026-06-30T00:00:00.000Z", summary: { ...report.summary, top1Accuracy: 0, averageConfidence: 10, averageRuntimeMs: 20 } }
  const compared = runner.runRealWorldBenchmark({ datasetDirectory, baselineReport: baseline, generatedAt: "2026-07-01T00:00:00.000Z" })
  assert.ok(compared.comparison)
  assert.ok(compared.comparison.accuracyDelta > 0)
  console.log("\nBenchmark comparison assertions passed.")
} else if (mode === "failure-classification") {
  const failed = report.results.filter((result) => !result.top1Correct)
  assert.ok(failed.length >= 1)
  assert.ok(failed.some((result) => result.failureCauses.includes("Unknown") || result.failureCauses.includes("Reference coverage failure")))
  console.log("\nFailure classification assertions passed.")
} else if (mode === "export") {
  const csv = metrics.exportRealWorldBenchmarkCsv(report)
  const markdown = metrics.exportRealWorldBenchmarkMarkdown(report)
  const serializable = runner.toSerializableRealWorldBenchmarkReport(report)
  assert.ok(csv.includes("camera_benzene_001"))
  assert.ok(markdown.includes("# ARSHLAB Real-World Scanner Benchmark"))
  assert.equal(serializable.version, "11.5.0")
  console.log("\nBenchmark export assertions passed.")
} else {
  console.error(`Unknown real-world benchmark mode: ${mode}`)
  process.exit(1)
}
