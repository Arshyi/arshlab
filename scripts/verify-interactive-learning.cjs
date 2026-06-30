const assert = require("node:assert/strict")
const { rmSync } = require("node:fs")
const { tmpdir } = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

const mode = process.argv[2] ?? "interactive-learning"
const root = path.resolve(__dirname, "..")
const outputDirectory = path.join(tmpdir(), `arshlab-interactive-learning-${mode}`)
const tscPath = require.resolve("typescript/bin/tsc")

rmSync(outputDirectory, { recursive: true, force: true })
const compile = spawnSync(process.execPath, [
  tscPath,
  "lib/interactive-learning/types.ts",
  "lib/interactive-learning/mo-engine.ts",
  "lib/interactive-learning/hybridization-engine.ts",
  "lib/interactive-learning/orbital-renderer.ts",
  "lib/interactive-learning/examples.ts",
  "lib/interactive-learning/quiz-engine.ts",
  "lib/interactive-learning/index.ts",
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

const learning = require(path.join(outputDirectory, "index.js"))

function testMoBuilder() {
  const o2 = learning.buildMolecularOrbitalDiagram("O2")
  assert.equal(o2.electronCount, 16)
  assert.ok(o2.orbitals.some((orbital) => orbital.label === "π*2p"))
  assert.equal(o2.bondOrder, 2)
  assert.equal(o2.magnetism, "Paramagnetic")
  assert.equal(o2.unpairedElectrons, 2)
  assert.equal(o2.fillingSteps.length, 16)
}

function testHybridization() {
  const sp3 = learning.getHybridizationModel("sp3")
  const sp2 = learning.getHybridizationModel("sp2")
  const sp = learning.getHybridizationModel("sp")
  assert.equal(sp3.sCharacter, 25)
  assert.equal(sp3.pCharacter, 75)
  assert.equal(sp3.geometry, "Tetrahedral electron geometry")
  assert.equal(sp2.orbitals.length, 3)
  assert.equal(sp.idealAngles, "180 degrees")
}

function testHomoLumo() {
  const o2 = learning.buildMolecularOrbitalDiagram("O2")
  const o2Plus = learning.buildMolecularOrbitalDiagram("O2+")
  const n2 = learning.buildMolecularOrbitalDiagram("N2")
  assert.equal(o2.homo.label, "π*2p")
  assert.equal(o2.lumo.label, "σ*2p")
  assert.ok(o2Plus.bondOrder > o2.bondOrder)
  assert.equal(n2.homo.label, "σ2p")
  assert.ok(learning.HOMO_LUMO_EXAMPLES.some((example) => example.id === "ethylene"))
}

function testSigmaPi() {
  const sigma = learning.buildSigmaPiModel("sigma", "front")
  const pi = learning.buildSigmaPiModel("pi", "side")
  assert.match(sigma.rotationRule, /can rotate/)
  assert.match(pi.rotationRule, /breaks side-by-side overlap/)
  assert.equal(learning.sigmaPiOverlapPrimitives("pi", 45).length, 5)
}

function testLonePairs() {
  const water = learning.LONE_PAIR_EXAMPLES.find((example) => example.id === "h2o")
  const ammonia = learning.LONE_PAIR_EXAMPLES.find((example) => example.id === "nh3")
  const acetone = learning.LONE_PAIR_EXAMPLES.find((example) => example.id === "acetone")
  assert.equal(water.lonePairs, 2)
  assert.equal(ammonia.lonePairs, 1)
  assert.ok(acetone.lonePairOrbitals.join(" ").includes("oxygen"))
}

function testBondOrder() {
  const n2 = learning.buildMolecularOrbitalDiagram("N2")
  const he2 = learning.buildMolecularOrbitalDiagram("He2")
  const o2Minus = learning.buildMolecularOrbitalDiagram("O2-")
  assert.equal(n2.bondOrder, 3)
  assert.equal(he2.bondOrder, 0)
  assert.equal(o2Minus.bondOrder, 1.5)
  assert.equal(learning.getBondOrderEquation(n2), "(10 - 4) / 2 = 3")
}

function testOrbitalRenderer() {
  const o2 = learning.buildMolecularOrbitalDiagram("O2")
  const primitives = learning.buildOrbitalLevelPrimitives(o2.orbitals)
  const pathData = learning.lobePath(100, 100, 45)
  assert.ok(primitives.length >= o2.orbitals.length)
  assert.match(pathData, /^M /)
  assert.match(pathData, / Q /)
}

function testOrbitalAnimation() {
  const b2 = learning.buildMolecularOrbitalDiagram("B2")
  const firstPiStep = b2.fillingSteps.find((step) => step.orbitalLabel === "π2p")
  assert.equal(b2.fillingSteps.length, b2.electronCount)
  assert.ok(firstPiStep)
  assert.equal(firstPiStep.rule, "Aufbau Principle")
  const coord = learning.electronCoordinateForStep(firstPiStep, b2.orbitals, 0)
  assert.equal(typeof coord.x, "number")
  assert.equal(typeof coord.y, "number")
}

function testInteractiveLearning() {
  const ids = learning.listInteractiveExamples().map((example) => example.id)
  for (const id of ["ch4", "nh3", "h2o", "co2", "o2", "n2", "benzene", "ethanol", "ethene", "ethyne", "acetone", "acetic-acid", "aniline", "phenol", "acetonitrile"]) {
    assert.ok(ids.includes(id), `${id} example is missing`)
  }
  const answer = learning.checkOrbitalQuizAnswer("o2-homo", "π*2p")
  assert.equal(answer.correct, true)
}

const tests = {
  "mo-builder": testMoBuilder,
  hybridization: testHybridization,
  "lumo-homo": testHomoLumo,
  "sigma-pi": testSigmaPi,
  "lone-pairs": testLonePairs,
  "bond-order": testBondOrder,
  "orbital-renderer": testOrbitalRenderer,
  "orbital-animation": testOrbitalAnimation,
  "interactive-learning": testInteractiveLearning,
}

if (mode === "interactive-learning") {
  Object.values(tests).forEach((test) => test())
} else if (tests[mode]) {
  tests[mode]()
} else {
  throw new Error(`Unknown interactive learning verification mode: ${mode}`)
}

console.log(`interactive learning verification passed: ${mode}`)
