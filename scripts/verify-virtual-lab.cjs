const assert = require("node:assert/strict")
const { rmSync } = require("node:fs")
const { tmpdir } = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

const mode = process.argv[2] ?? "virtual-lab"
const root = path.resolve(__dirname, "..")
const outputDirectory = path.join(tmpdir(), `arshlab-virtual-lab-${mode}`)
const tscPath = require.resolve("typescript/bin/tsc")

rmSync(outputDirectory, { recursive: true, force: true })
const compile = spawnSync(process.execPath, [
  tscPath,
  "lib/virtual-lab/experiment-types.ts",
  "lib/virtual-lab/lab-equipment.ts",
  "lib/virtual-lab/experiment-library.ts",
  "lib/virtual-lab/experiment-engine.ts",
  "lib/virtual-lab/spectroscopy-engine.ts",
  "lib/virtual-lab/reaction-engine.ts",
  "lib/virtual-lab/observation-engine.ts",
  "lib/virtual-lab/measurement-engine.ts",
  "lib/virtual-lab/safety-engine.ts",
  "lib/virtual-lab/index.ts",
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

const lab = require(path.join(outputDirectory, "index.js"))

function firstExperiment() {
  return lab.getVirtualLabExperiment("esterification-ethyl-acetate")
}

function testExperimentLibrary() {
  const experiments = lab.listVirtualLabExperiments()
  assert.ok(experiments.length >= 5)
  const covered = lab.virtualLabCoveredCompounds()
  for (const id of ["acetone", "ethanol", "acetic-acid", "benzene", "phenol", "aniline", "cyclohexane", "cyclohexene", "ethene", "ethyne", "aspirin", "caffeine", "glucose", "water", "ammonia"]) {
    assert.ok(covered.includes(id), `${id} should be covered by the virtual lab library`)
  }
  assert.ok(lab.experimentsForCompound("caffeine").some((experiment) => experiment.id === "caffeine-spectroscopy"))
}

function testGlassware() {
  const equipment = lab.LAB_EQUIPMENT
  for (const id of ["beaker", "round-bottom-flask", "separatory-funnel", "burette", "condenser", "ir-spectrometer", "nmr-spectrometer", "mass-spectrometer"]) {
    assert.ok(equipment.some((item) => item.id === id), `${id} equipment is missing`)
    assert.match(lab.equipmentSvgPath(lab.getLabEquipment(id).svgKind), /^M/)
  }
  assert.ok(lab.listEquipmentByCategory("glassware").length >= 10)
}

function testSpectroscopy() {
  const caffeine = lab.getVirtualLabExperiment("caffeine-spectroscopy")
  assert.ok(lab.peaksByTechnique(caffeine, "IR").length >= 2)
  assert.ok(lab.peaksByTechnique(caffeine, "Mass Spec").some((peak) => peak.position.includes("194")))
  assert.match(lab.explainPeak(caffeine.spectra[0]), /IR|NMR|Mass|UV/)
  assert.equal(lab.buildUvVisibleBand(5).technique, "UV-Visible")
}

function testLabTechniques() {
  const aspirin = lab.getVirtualLabExperiment("aspirin-recrystallization")
  assert.ok(aspirin.techniques.includes("recrystallization"))
  assert.ok(aspirin.steps.some((step) => step.action === "filter"))
  assert.ok(aspirin.steps.some((step) => step.action === "record-temperature"))
}

function testReactionLab() {
  const experiment = firstExperiment()
  let state = lab.createExperimentState(experiment, "guided")
  assert.deepEqual(lab.allowedActions(experiment, state), ["weigh"])
  state = lab.applyLabAction(experiment, state, "weigh")
  state = lab.applyLabAction(experiment, state, "add-reagent")
  assert.equal(state.currentStepIndex, 2)
  assert.equal(lab.reactionProgressLabel(state), "Reactants combined")
  const freeState = lab.applyLabAction(experiment, lab.createExperimentState(experiment, "free"), "heat")
  assert.ok(freeState.warnings.length > 0)
  assert.ok(freeState.yieldPercent < experiment.yieldPercent)
}

function testLabNotebook() {
  const experiment = firstExperiment()
  let state = lab.createExperimentState(experiment, "guided")
  state = lab.applyLabAction(experiment, state, "weigh")
  const report = lab.buildPrintableLabReport(experiment, state)
  assert.ok(state.notebook.length >= 1)
  assert.match(report, /Virtual Lab Report/)
  assert.match(report, /Procedure and Observations/)
}

function testSafety() {
  const experiment = firstExperiment()
  const checklist = lab.safetyChecklist(experiment)
  assert.ok(checklist.some((item) => /PPE/.test(item)))
  assert.ok(checklist.some((item) => /corrosive|flammable|oxidizer/i.test(item)))
}

function testObservations() {
  const experiment = firstExperiment()
  assert.ok(lab.observationsAfterAction(experiment, "heat").length >= 1)
  const timeline = lab.observationTimeline(experiment)
  assert.ok(timeline[0].timeMinutes <= timeline[timeline.length - 1].timeMinutes)
  assert.match(lab.observationSentence(timeline[0]), /min:/)
}

function testMeasurementEngine() {
  assert.equal(lab.calculateYield(5, 10), 50)
  assert.ok(lab.calculatePurity(134, 136) < 100)
  const experiment = firstExperiment()
  assert.ok(lab.measurementsForAction(experiment, ["mass-acid"]).length === 1)
  assert.ok(lab.estimateCompletionTime(experiment, 1) > 0)
}

function testVirtualLabRouting() {
  assert.ok(lab.getVirtualLabExperiment("esterification-ethyl-acetate"))
  assert.ok(lab.experimentsForCompound("ethanol").length >= 1)
  assert.ok(lab.virtualLabMetrics().coveredCompounds >= 15)
}

function testVirtualLab() {
  testExperimentLibrary()
  testGlassware()
  testSpectroscopy()
  testLabTechniques()
  testReactionLab()
  testLabNotebook()
  testSafety()
  testObservations()
  testMeasurementEngine()
  testVirtualLabRouting()
}

const tests = {
  "virtual-lab": testVirtualLab,
  glassware: testGlassware,
  spectroscopy: testSpectroscopy,
  "lab-techniques": testLabTechniques,
  "reaction-lab": testReactionLab,
  "lab-notebook": testLabNotebook,
  safety: testSafety,
  observations: testObservations,
  "measurement-engine": testMeasurementEngine,
  "experiment-library": testExperimentLibrary,
  "virtual-lab-routing": testVirtualLabRouting,
}

if (!tests[mode]) throw new Error(`Unknown virtual lab verification mode: ${mode}`)
tests[mode]()
console.log(`virtual lab verification passed: ${mode}`)
