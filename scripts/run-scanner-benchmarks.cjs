const assert = require("node:assert/strict")
const { existsSync, mkdirSync, rmSync, writeFileSync } = require("node:fs")
const { tmpdir } = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

const mode = process.argv[2] ?? "benchmark"
const root = path.resolve(__dirname, "..")
const outputDirectory = path.join(tmpdir(), "arshlab-scanner-benchmark-checks")
const tscPath = require.resolve("typescript/bin/tsc")

rmSync(outputDirectory, { recursive: true, force: true })
const compile = spawnSync(process.execPath, [
  tscPath,
  "lib/benchmarks/scanner-benchmark-runner.ts",
  "lib/benchmarks/scanner-benchmark-fixtures.ts",
  "lib/benchmarks/scanner-benchmark-types.ts",
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

const {
  formatScannerBenchmarkTable,
  runScannerBenchmark,
  toSerializableBenchmarkReport,
} = require(path.join(outputDirectory, "benchmarks", "scanner-benchmark-runner.js"))
const { SCANNER_BENCHMARK_FIXTURE_COUNT } = require(path.join(outputDirectory, "benchmarks", "scanner-benchmark-fixtures.js"))

const report = runScannerBenchmark()
console.log(formatScannerBenchmarkTable(report))

if (mode === "test") {
  assert.equal(SCANNER_BENCHMARK_FIXTURE_COUNT, 26, "expected 26 scanner benchmark fixtures")
  assert.equal(report.summary.fixtureCount, 26, "expected report to include all fixtures")
  assert.ok(report.summary.top3Accuracy >= report.summary.top1Accuracy, "top-3 accuracy should be at least top-1 accuracy")
  assert.ok(Number.isFinite(report.summary.averageConfidence), "average confidence should be numeric")
  assert.ok(Number.isFinite(report.summary.averageRuntimeMs), "average runtime should be numeric")
  assert.ok(Object.keys(report.summary.coverageFamilies).length >= 8, "coverage-family summaries should be populated")
  for (const id of [
    "benzene-clean",
    "ethanol-clean",
    "acetone-clean",
    "pyridine-clean",
    "naphthalene-camera",
    "ethyl-ethanoate-ester-clean",
    "alanine-amino-acid-clean",
    "caffeine-heterocycle-clean",
  ]) {
    assert.ok(report.results.some((result) => result.fixture.id === id), `${id} fixture should exist`)
  }
  const v113BaselineFixtureIds = new Set([
    "benzene-clean",
    "cyclohexane-camera",
    "cyclohexene-handwritten",
    "ethanol-clean",
    "methanol-low-light",
    "ethene-clean",
    "ethyne-perspective",
    "acetone-clean",
    "acetic-acid-clutter",
    "phenol-handwritten",
    "aniline-perspective",
    "pyridine-clean",
    "naphthalene-camera",
  ])
  const failedBaseline = report.results
    .filter((result) => v113BaselineFixtureIds.has(result.fixture.id) && !result.top1Correct)
    .map((result) => result.fixture.id)
  assert.deepEqual(failedBaseline, [], "original v11.3 scanner benchmark fixtures should remain top-1 passing")
  console.log("\nScanner benchmark assertions passed.")
} else {
  const reportDirectory = path.join(root, ".next", "benchmark-reports")
  if (!existsSync(reportDirectory)) mkdirSync(reportDirectory, { recursive: true })
  const reportPath = path.join(reportDirectory, "scanner-benchmark-report.json")
  writeFileSync(reportPath, JSON.stringify(toSerializableBenchmarkReport(report), null, 2))
  console.log(`\nJSON report written to ${path.relative(root, reportPath)}`)
}
