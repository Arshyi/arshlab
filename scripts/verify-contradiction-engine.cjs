const assert = require("node:assert/strict")
const { rmSync } = require("node:fs")
const { tmpdir } = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

const root = path.resolve(__dirname, "..")
const outputDirectory = path.join(tmpdir(), `arshlab-contradiction-engine-checks-${process.pid}`)
const tscPath = require.resolve("typescript/bin/tsc")

rmSync(outputDirectory, { recursive: true, force: true })
const compile = spawnSync(process.execPath, [
  tscPath,
  "lib/chemistry-intelligence/intelligence-engine.ts",
  "lib/chemistry-intelligence/graph-matcher.ts",
  "lib/chemistry-intelligence/contradiction-engine.ts",
  "lib/chemistry-intelligence/candidate-eliminator.ts",
  "lib/chemistry-intelligence/identity-validator.ts",
  "lib/chemistry-intelligence/chemical-requirements.ts",
  "lib/chemistry-intelligence/elimination-report.ts",
  "lib/chemistry-intelligence/reference-library.ts",
  "lib/vision/molecular-graph.ts",
  "lib/structure-vision/canonical-molecular-graph.ts",
  "lib/structure-vision/vision-types.ts",
  "lib/structure-scanner/scanner-database.ts",
  "lib/structure-scanner/scanner-types.ts",
  "lib/structure-scanner/evidence-types.ts",
  "lib/reaction-conditions/reaction-conditions.ts",
  "lib/reaction-conditions/reaction-condition-types.ts",
  "lib/chemistry/reactions.ts",
  "lib/chemistry/reaction-types.ts",
  "lib/spectroscopy/spectroscopy-engine.ts",
  "lib/spectroscopy/spectroscopy-database.ts",
  "lib/spectroscopy/spectroscopy-types.ts",
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

const graphMatcher = require(path.join(outputDirectory, "chemistry-intelligence", "graph-matcher.js"))
const intelligenceEngine = require(path.join(outputDirectory, "chemistry-intelligence", "intelligence-engine.js"))

function getReference(id) {
  const reference = graphMatcher.REFERENCE_MOLECULAR_GRAPHS.find((item) => item.compoundId === id)
  assert.ok(reference, `missing reference graph for ${id}`)
  return reference.graph
}

function reportFor(graph, preferred) {
  return graphMatcher.generateCandidateEliminationReport(graph, intelligenceEngine.INTELLIGENCE_COMPOUND_RECORDS, preferred)
}

function candidate(report, id) {
  const found = report.candidates.find((item) => item.compoundId === id)
  assert.ok(found, `missing candidate ${id}`)
  return found
}

function assertPassed(report, id) {
  const found = candidate(report, id)
  assert.equal(found.status, "passed", `${id} should pass contradiction checks`)
  assert.equal(found.hardFailures.length, 0, `${id} should have no hard contradictions`)
}

function assertEliminated(report, id, reasonPattern) {
  const found = candidate(report, id)
  assert.equal(found.status, "eliminated", `${id} should be eliminated`)
  assert.ok(found.hardFailures.length > 0, `${id} should have hard contradictions`)
  if (reasonPattern) {
    assert.match(found.hardFailures.map((failure) => `${failure.label} ${failure.reason}`).join(" | "), reasonPattern, `${id} contradiction reason`)
  }
}

const ethanolReport = reportFor(getReference("ethanol"), "benzene")
assertPassed(ethanolReport, "ethanol")
assertEliminated(ethanolReport, "benzene", /oxygen|Carbon count|ring|aromatic/i)
assertEliminated(ethanolReport, "aniline", /Carbon count|N atom|ring|aromatic/i)
assert.equal(graphMatcher.matchCanonicalGraph(getReference("ethanol"), intelligenceEngine.INTELLIGENCE_COMPOUND_RECORDS, "benzene")[0].compoundId, "ethanol", "ethanol outranks rejected benzene")

const benzeneReport = reportFor(getReference("benzene"), "benzene")
assertPassed(benzeneReport, "benzene")
assertEliminated(benzeneReport, "ethanol", /O atom|Ring count|aromatic/i)
assertEliminated(benzeneReport, "acetone", /O atom|Carbon count|carbonyl/i)

const cyclohexaneReport = reportFor(getReference("cyclohexane"), "cyclohexane")
assertPassed(cyclohexaneReport, "cyclohexane")
assertEliminated(cyclohexaneReport, "benzene", /aromatic|Double-bond/i)
assertEliminated(cyclohexaneReport, "cyclohexene", /Double-bond/i)

const acetoneReport = reportFor(getReference("acetone"), "acetone")
assertPassed(acetoneReport, "acetone")
assertEliminated(acetoneReport, "ethanol", /Carbon count|Terminal alcohol|carbonyl/i)
assertEliminated(acetoneReport, "benzene", /O atom|Carbon count|Ring count/i)

const acidReport = reportFor(getReference("ethanoic-acid"), "ethanoic-acid")
assertPassed(acidReport, "ethanoic-acid")
assertEliminated(acidReport, "ethanol", /O atom count|carbonyl/i)
assertEliminated(acidReport, "acetone", /Carbon count|O atom count/i)

const phenolReport = reportFor(getReference("phenol"), "phenol")
assertPassed(phenolReport, "phenol")
assertEliminated(phenolReport, "benzene", /O atom/i)

const anilineReport = reportFor(getReference("aniline"), "aniline")
assertPassed(anilineReport, "aniline")
assertEliminated(anilineReport, "phenol", /O atom|N atom/i)

const cyclohexeneReport = reportFor(getReference("cyclohexene"), "cyclohexene")
assertPassed(cyclohexeneReport, "cyclohexene")
assertEliminated(cyclohexeneReport, "cyclohexane", /Double-bond/i)
assertEliminated(cyclohexeneReport, "benzene", /aromatic|Double-bond/i)

const nitrobenzeneReport = reportFor(getReference("nitrobenzene"), "nitrobenzene")
assertPassed(nitrobenzeneReport, "nitrobenzene")
assertEliminated(nitrobenzeneReport, "benzene", /O atom|N atom/i)

console.log(`Verified Chemical Contradiction Engine: ${ethanolReport.candidatesGenerated} candidates checked, impossible substitutions eliminated, and passed candidates remain rankable.`)
rmSync(outputDirectory, { recursive: true, force: true })
