const assert = require("node:assert/strict")
const { rmSync } = require("node:fs")
const { tmpdir } = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

const mode = process.argv[2] ?? "conjugation"
const root = path.resolve(__dirname, "..")
const outputDirectory = path.join(tmpdir(), `arshlab-conjugation-learning-${mode}`)
const tscPath = require.resolve("typescript/bin/tsc")

rmSync(outputDirectory, { recursive: true, force: true })
const compile = spawnSync(process.execPath, [
  tscPath,
  "lib/interactive-learning/conjugation/types.ts",
  "lib/interactive-learning/conjugation/examples.ts",
  "lib/interactive-learning/conjugation/conjugation-engine.ts",
  "lib/interactive-learning/conjugation/conjugation-renderer.ts",
  "lib/interactive-learning/conjugation/index.ts",
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

function includedElectronTotal(analysis) {
  return analysis.electronContributions
    .filter((item) => item.included)
    .reduce((sum, item) => sum + item.electrons, 0)
}

function testConjugation() {
  const butadiene = learning.analyzeConjugation("butadiene")
  const broken = learning.analyzeConjugation("broken-pentadiene")
  assert.equal(butadiene.principalSystem.length, 4)
  assert.equal(butadiene.principalSystem.piElectrons, 4)
  assert.equal(broken.principalSystem.length, 2)
  assert.ok(broken.conjugatedSystems.length >= 2)
  assert.ok(broken.breakAtoms.some((atom) => atom.id === "c3"))
}

function testResonance() {
  const benzene = learning.analyzeConjugation("benzene")
  const carbonate = learning.analyzeConjugation("carbonate")
  assert.ok(benzene.molecule.resonance.forms.length >= 3)
  assert.ok(carbonate.molecule.resonance.forms.length >= 3)
  assert.equal(learning.validateCurvedArrow("benzene", { source: "rb1-2", destination: "rb2-3" }).correct, true)
  assert.equal(learning.validateCurvedArrow("benzene", { source: "r1", destination: "r4" }).correct, false)
}

function testAromaticity() {
  assert.equal(learning.analyzeConjugation("benzene").aromaticity.label, "Aromatic")
  assert.equal(learning.analyzeConjugation("cyclobutadiene").aromaticity.label, "Antiaromatic")
  assert.equal(learning.analyzeConjugation("phenol").aromaticity.label, "Aromatic")
  assert.equal(learning.analyzeConjugation("broken-pentadiene").aromaticity.label, "Non-aromatic")
}

function testElectronCounter() {
  const benzene = learning.analyzeConjugation("benzene")
  const pyridine = learning.analyzeConjugation("pyridine")
  const pyrrole = learning.analyzeConjugation("pyrrole")
  assert.equal(includedElectronTotal(benzene), 6)
  assert.equal(pyridine.aromaticity.piElectrons, 6)
  assert.ok(pyridine.electronContributions.some((item) => item.included === false && item.kind === "lone-pair"))
  assert.equal(includedElectronTotal(pyrrole), 6)
  assert.ok(pyrrole.electronContributions.some((item) => item.kind === "lone-pair" && item.included))
}

function testHuckel() {
  const benzene = learning.evaluateAromaticity(learning.getConjugationMolecule("benzene"))
  const cyclobutadiene = learning.evaluateAromaticity(learning.getConjugationMolecule("cyclobutadiene"))
  assert.equal(benzene.rule, "4n + 2 = 6; n = 1")
  assert.equal(cyclobutadiene.rule, "4n = 4; n = 1")
}

function testPiSystem() {
  const retinal = learning.analyzeConjugation("retinal")
  const butadiene = learning.analyzeConjugation("butadiene")
  assert.ok(retinal.principalSystem.length > butadiene.principalSystem.length)
  assert.ok(retinal.principalSystem.piBondCount >= 6)
}

function testDelocalization() {
  const carotene = learning.analyzeConjugation("beta-carotene")
  const color = learning.buildColorLearning(carotene.principalSystem.length)
  assert.ok(carotene.principalSystem.piElectrons >= 18)
  assert.ok(color.lambdaMaxNm > 400)
  assert.ok(color.approximateGapEv < 5)
}

function testPrincipalPath() {
  const library = learning.listRealMoleculeLibrary().map((molecule) => molecule.id)
  for (const id of ["benzene", "naphthalene", "anthracene", "phenanthrene", "pyridine", "pyrrole", "furan", "thiophene", "imidazole", "retinal", "beta-carotene", "lycopene", "chlorophyll", "graphene-fragment", "acetophenone", "acetanilide", "phenol", "aniline", "nitrobenzene", "styrene", "polyacetylene"]) {
    assert.ok(library.includes(id), `${id} missing from real molecule library`)
  }
  const lycopene = learning.analyzeConjugation("lycopene")
  assert.equal(lycopene.principalSystem.principal, true)
  assert.equal(lycopene.principalSystem.length, 20)
}

function testCurvedArrows() {
  const correct = learning.validateCurvedArrow("amide", { source: "lp1", destination: "pi1" })
  const wrong = learning.validateCurvedArrow("amide", { source: "sigma", destination: "atom" })
  assert.equal(correct.correct, true)
  assert.equal(wrong.correct, false)
  assert.match(correct.message, /Correct/)
}

function testUvVis() {
  const beta = learning.analyzeConjugation("beta-carotene")
  const lycopene = learning.analyzeConjugation("lycopene")
  assert.equal(beta.uvvis.observedColor, "orange")
  assert.equal(lycopene.uvvis.observedColor, "red")
  assert.ok(lycopene.uvvis.lambdaMaxNm > beta.uvvis.lambdaMaxNm)
  assert.ok(learning.buildEnergyDiagram(18).gap < learning.buildEnergyDiagram(4).gap)
}

const tests = {
  conjugation: testConjugation,
  resonance: testResonance,
  aromaticity: testAromaticity,
  "electron-counter": testElectronCounter,
  huckel: testHuckel,
  "pi-system": testPiSystem,
  delocalization: testDelocalization,
  "principal-conjugated-path": testPrincipalPath,
  "curved-arrows": testCurvedArrows,
  "uvvis-learning": testUvVis,
}

if (!tests[mode]) throw new Error(`Unknown conjugation learning verification mode: ${mode}`)
tests[mode]()
console.log(`conjugation learning verification passed: ${mode}`)
