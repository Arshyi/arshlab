const assert = require("node:assert/strict")
const { rmSync } = require("node:fs")
const { tmpdir } = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

const mode = process.argv[2] ?? "scanner-learning-bridge"
const root = path.resolve(__dirname, "..")
const outputDirectory = path.join(tmpdir(), `arshlab-scanner-learning-bridge-${mode}`)
const tscPath = require.resolve("typescript/bin/tsc")

rmSync(outputDirectory, { recursive: true, force: true })
const compile = spawnSync(process.execPath, [
  tscPath,
  "lib/interactive-learning/learning-bridge.ts",
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

const bridge = require(path.join(outputDirectory, "interactive-learning", "learning-bridge.js"))

function record(id, name, formula, functionalGroups) {
  return { id, name, formula, functionalGroups, commonAliases: [], difficulty: "Introductory", reactionGraphLinks: [], visualizerLinks: [] }
}

function firstLesson(input) {
  return bridge.getLearningBridgeLessons(input)[0]
}

function testScannerLearningBridge() {
  const benzene = firstLesson(bridge.bridgeInputFromScannerRecord(record("benzene", "Benzene", "C6H6", ["arene"])))
  const ethanol = firstLesson(bridge.bridgeInputFromScannerRecord(record("ethanol", "Ethanol", "C2H6O", ["alcohol"])))
  const ethene = firstLesson(bridge.bridgeInputFromScannerRecord(record("ethene", "Ethene", "C2H4", ["alkene"])))
  const oxygen = firstLesson(record("oxygen", "Oxygen", "O2", []))
  const nitrogen = firstLesson(record("nitrogen", "Nitrogen", "N2", []))

  assert.equal(benzene.kind, "conjugation")
  assert.match(benzene.href, /conjugation/)
  assert.match(benzene.href, /aromaticity/)
  assert.equal(ethanol.kind, "lone-pairs")
  assert.match(ethanol.href, /topic=hybridization/)
  assert.equal(ethene.kind, "sigma-pi")
  assert.match(ethene.href, /topic=sigma-pi/)
  assert.equal(oxygen.kind, "mo")
  assert.match(oxygen.href, /molecule=O2/)
  assert.equal(nitrogen.kind, "mo")
  assert.match(nitrogen.href, /molecule=N2/)
}

function testInteractiveLearningRouting() {
  assert.equal(
    bridge.interactiveLearningHref({ topic: "hybridization", compound: "ethanol" }),
    "/interactive-learning?topic=hybridization&compound=ethanol",
  )
  assert.equal(
    bridge.interactiveLearningHref({ topic: "mo", molecule: "O2" }),
    "/interactive-learning?topic=mo&molecule=O2",
  )
  assert.equal(
    bridge.conjugationLearningHref({ compound: "benzene", focus: "aromaticity" }),
    "/interactive-learning/conjugation?compound=benzene&focus=aromaticity",
  )
  assert.equal(bridge.getInteractiveExampleId({ id: "ethanol", functionalGroups: ["alcohol"] }), "ethanol")
  assert.equal(bridge.getConjugationExampleId({ id: "benzene", functionalGroups: ["arene"] }), "benzene")
}

function testLessonLinks() {
  const cards = bridge.getLearningExplanationCards({ id: "benzene", name: "Benzene", formula: "C6H6", functionalGroups: ["arene"], aromatic: true, ringCount: 1 })
  assert.equal(cards.length, 6)
  assert.ok(cards.some((card) => card.title === "Open the interactive molecular map" && card.href.includes("/interactive-learning/explorer")))
  assert.ok(cards.some((card) => card.title === "Why this molecule has sigma bonds"))
  assert.ok(cards.some((card) => card.title === "Where the pi electrons are"))
  assert.ok(cards.some((card) => card.title === "Why this is or is not aromatic" && card.href.includes("conjugation")))
  assert.ok(cards.some((card) => card.title === "How HOMO/LUMO relates to reactivity"))
  assert.ok(cards.some((card) => card.title === "Which atoms are sp, sp2, or sp3"))
}

const tests = {
  "scanner-learning-bridge": testScannerLearningBridge,
  "interactive-learning-routing": testInteractiveLearningRouting,
  "lesson-links": testLessonLinks,
}

if (!tests[mode]) throw new Error(`Unknown scanner learning bridge verification mode: ${mode}`)
tests[mode]()
console.log(`scanner learning bridge verification passed: ${mode}`)
