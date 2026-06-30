const assert = require("node:assert/strict")
const { rmSync } = require("node:fs")
const { tmpdir } = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

const mode = process.argv[2] ?? "mechanism-engine"
const root = path.resolve(__dirname, "..")
const outputDirectory = path.join(tmpdir(), `arshlab-mechanism-simulator-${mode}`)
const tscPath = require.resolve("typescript/bin/tsc")

rmSync(outputDirectory, { recursive: true, force: true })
const compile = spawnSync(process.execPath, [
  tscPath,
  "lib/interactive-learning/mechanisms/types.ts",
  "lib/interactive-learning/mechanisms/examples.ts",
  "lib/interactive-learning/mechanisms/mechanism-engine.ts",
  "lib/interactive-learning/mechanisms/arrow-engine.ts",
  "lib/interactive-learning/mechanisms/index.ts",
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

const simulator = require(path.join(outputDirectory, "index.js"))

function testMechanismEngine() {
  const ids = simulator.listReactionMechanisms().map((mechanism) => mechanism.id)
  for (const id of [
    "sn1",
    "sn2",
    "e1",
    "e2",
    "electrophilic-aromatic-substitution",
    "benzene-bromination",
    "carbonyl-addition",
    "acetal-formation",
    "alkene-hydration",
    "hydrogenation",
    "halogenation",
    "free-radical-substitution",
  ]) {
    assert.ok(ids.includes(id), `${id} mechanism missing`)
  }
  const metrics = simulator.getMechanismLibraryMetrics()
  assert.ok(metrics.mechanisms >= 12)
  assert.ok(metrics.steps >= 30)
  assert.equal(simulator.getMechanismByReaction("benzene-bromination").id, "benzene-bromination")
  assert.equal(simulator.mechanismSimulatorHref({ reaction: "sn2" }), "/interactive-learning/mechanisms?reaction=sn2")
  assert.equal(simulator.legacyMechanismsHref({ reaction: "sn2" }), "/mechanisms?reaction=sn2")
}

function testArrowEngine() {
  const sn2 = simulator.getMechanismByReaction("sn2")
  const arrow = sn2.steps[0].arrows[0]
  const primitive = simulator.buildCurvedArrowPrimitive(arrow, 0.5)
  assert.match(primitive.path, /^M /)
  assert.match(primitive.path, / Q /)
  assert.match(primitive.headPath, /^M /)
  assert.match(simulator.describeArrowMotion(arrow), /move from/)
}

function testBondTransition() {
  const sn2 = simulator.getMechanismByReaction("sn2")
  const transitions = simulator.computeBondTransitions(sn2.steps[0], sn2.steps[1])
  assert.ok(transitions.some((transition) => transition.change === "formed" || transition.bondTrackingId.includes("o-c")))
  assert.ok(transitions.some((transition) => transition.change === "unchanged" || transition.change === "broken" || transition.change === "formed"))
}

function testReactionTimeline() {
  const sn2 = simulator.getMechanismByReaction("sn2")
  const timeline = simulator.getReactionTimeline(sn2)
  assert.equal(timeline[0].stageKind, "reactants")
  assert.ok(timeline.some((step) => step.transitionState))
  assert.equal(timeline.at(-1).stageKind, "products")
}

function testEnergyDiagram() {
  const sn2 = simulator.getMechanismByReaction("sn2")
  const points = simulator.getEnergyDiagramPoints(sn2)
  const extrema = simulator.getEnergyExtrema(sn2)
  assert.equal(points.length, sn2.energyProfile.length)
  assert.equal(extrema.highest.stepId, "sn2-ts")
  assert.ok(extrema.max > extrema.min)
}

function testPracticeMode() {
  const sn2 = simulator.getMechanismByReaction("sn2")
  const prompt = sn2.practicePrompts[0]
  const correct = simulator.evaluatePracticePrompt(sn2, prompt.id, prompt.expectedArrowIds)
  const wrong = simulator.evaluatePracticePrompt(sn2, prompt.id, ["bad-arrow"])
  assert.equal(correct.status, "correct")
  assert.equal(correct.score, 100)
  assert.equal(wrong.status, "incorrect")
}

function testAtomTracking() {
  const sn2 = simulator.getMechanismByReaction("sn2")
  const paths = simulator.buildAtomTrackingPaths(sn2)
  assert.ok(paths.some((path) => path.trackingId === "c"))
  const carbonPath = simulator.traceAtom(sn2, "c")
  assert.ok(carbonPath)
  assert.ok(carbonPath.appearances.length >= 3)
}

function testElectronTracking() {
  const sn2 = simulator.getMechanismByReaction("sn2")
  const tracking = simulator.getElectronTracking(sn2.steps[0])
  assert.ok(tracking.some((item) => item.kind === "lone-pair-donation"))
  assert.ok(tracking.some((item) => item.destination.includes("bromide") || item.destination.includes("carbon")))
}

function testMechanismLearning() {
  const benzene = simulator.getMechanismByReaction("benzene-bromination")
  assert.ok(benzene.learningCards.some((card) => card.title === "Rate-determining step"))
  assert.ok(benzene.commonMistakes.some((mistake) => mistake.title.includes("Incorrect arrow")))
  assert.match(simulator.explainAtom(benzene.steps[0], "a"), /highlighted|stationary/)
  assert.match(simulator.explainArrow(benzene.steps[0], benzene.steps[0].arrows[0].id), /Origin/)
}

function testScannerMechanismBridge() {
  const benzeneMatches = simulator.recommendedMechanismsForCompound("benzene")
  const ethanolMatches = simulator.recommendedMechanismsForCompound("alkene")
  assert.ok(benzeneMatches.some((mechanism) => mechanism.id === "benzene-bromination"))
  assert.ok(ethanolMatches.some((mechanism) => mechanism.id === "alkene-hydration"))
  assert.equal(simulator.getMechanismBridgeHref("benzene"), "/interactive-learning/mechanisms?reaction=benzene-bromination&compound=benzene")
}

const tests = {
  "mechanism-engine": testMechanismEngine,
  "arrow-engine": testArrowEngine,
  "bond-transition": testBondTransition,
  "reaction-timeline": testReactionTimeline,
  "energy-diagram": testEnergyDiagram,
  "practice-mode": testPracticeMode,
  "atom-tracking": testAtomTracking,
  "electron-tracking": testElectronTracking,
  "mechanism-learning": testMechanismLearning,
  "scanner-mechanism-bridge": testScannerMechanismBridge,
}

if (!tests[mode]) throw new Error(`Unknown mechanism simulator verification mode: ${mode}`)
tests[mode]()
console.log(`mechanism simulator verification passed: ${mode}`)
