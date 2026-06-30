const assert = require("node:assert/strict")
const { rmSync } = require("node:fs")
const { tmpdir } = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

const mode = process.argv[2] ?? "molecular-explorer"
const root = path.resolve(__dirname, "..")
const outputDirectory = path.join(tmpdir(), `arshlab-molecular-explorer-${mode}`)
const tscPath = require.resolve("typescript/bin/tsc")

rmSync(outputDirectory, { recursive: true, force: true })
const compile = spawnSync(process.execPath, [
  tscPath,
  "lib/interactive-learning/molecular-explorer/types.ts",
  "lib/interactive-learning/molecular-explorer/examples.ts",
  "lib/interactive-learning/molecular-explorer/explorer-engine.ts",
  "lib/interactive-learning/molecular-explorer/explorer-renderer.ts",
  "lib/interactive-learning/molecular-explorer/index.ts",
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

const explorer = require(path.join(outputDirectory, "index.js"))

function testMolecularExplorer() {
  const ids = explorer.listExplorerMolecules().map((molecule) => molecule.id)
  for (const id of [
    "methane",
    "ethane",
    "ethene",
    "ethyne",
    "ethanol",
    "water",
    "ammonia",
    "carbon-dioxide",
    "acetone",
    "acetic-acid",
    "benzene",
    "phenol",
    "pyridine",
    "aniline",
    "naphthalene",
    "cyclohexane",
    "cyclohexene",
  ]) {
    assert.ok(ids.includes(id), `${id} missing from explorer library`)
  }
  assert.equal(explorer.molecularExplorerHref({ compound: "benzene" }), "/interactive-learning/explorer?compound=benzene")
  const graph = explorer.buildExplorerFromSerializedGraph({
    name: "Imported Ethene",
    atoms: [{ id: "c1", element: "C" }, { id: "c2", element: "C" }],
    bonds: [{ from: "c1", to: "c2", order: 2 }],
  })
  assert.equal(graph.source, "scanner-graph")
  assert.equal(graph.bonds[0].piBonds, 1)
}

function testAtomInspector() {
  const benzene = explorer.getExplorerMoleculeById("benzene")
  const benzeneAtom = explorer.inspectAtom(benzene, "c1")
  assert.equal(benzeneAtom.atom.hybridization, "sp2")
  assert.equal(benzeneAtom.atom.aromatic, true)
  assert.ok(benzeneAtom.reasoning.some((node) => node.id === "hybridization"))

  const ethanol = explorer.getExplorerMoleculeById("ethanol")
  const oxygen = explorer.inspectAtom(ethanol, "o1")
  assert.equal(oxygen.atom.hybridization, "sp3")
  assert.equal(oxygen.atom.lonePairs, 2)
  assert.equal(oxygen.elementInfo.atomicNumber, 8)
}

function testBondInspector() {
  const ethene = explorer.getExplorerMoleculeById("ethene")
  const etheneBond = explorer.inspectBond(ethene, "b1")
  assert.equal(etheneBond.bond.order, 2)
  assert.equal(etheneBond.bond.piBonds, 1)
  assert.equal(etheneBond.bond.rotatable, false)
  assert.ok(etheneBond.cards.some((card) => card.title.includes("pi electrons")))

  const ethane = explorer.getExplorerMoleculeById("ethane")
  const ethaneBond = explorer.inspectBond(ethane, "b1")
  assert.equal(ethaneBond.bond.order, 1)
  assert.equal(ethaneBond.bond.rotatable, true)
}

function testOverlayRenderer() {
  const benzene = explorer.getExplorerMoleculeById("benzene")
  const primitives = explorer.buildExplorerSvgPrimitives(benzene)
  for (const layer of [
    "atom-labels",
    "bond-order",
    "sigma-framework",
    "pi-framework",
    "lone-pairs",
    "formal-charges",
    "hybridization",
    "aromatic-atoms",
    "conjugated-atoms",
    "delocalized-electrons",
    "homo",
    "lumo",
    "ring-system",
    "functional-groups",
    "electron-domains",
    "orbital-orientation",
  ]) {
    assert.ok(explorer.EXPLORER_LAYER_IDS.includes(layer), `${layer} missing from layer registry`)
  }
  assert.ok(primitives.some((primitive) => primitive.type === "atom"))
  assert.ok(primitives.some((primitive) => primitive.type === "bond"))
  assert.ok(primitives.some((primitive) => primitive.type === "orbital"))
  assert.ok(primitives.some((primitive) => primitive.layer === "delocalized-electrons"))
}

function testReasoningTree() {
  const acetone = explorer.getExplorerMoleculeById("acetone")
  const carbonylCarbon = explorer.inspectAtom(acetone, "c2")
  assert.ok(carbonylCarbon.reasoning.some((node) => node.title.includes("sp2")))
  const carbonyl = explorer.inspectBond(acetone, "b2")
  assert.ok(carbonyl.reasoning.some((node) => node.id === "rotation" && node.title.includes("restricted")))
}

function testFunctionalGroups() {
  assert.ok(explorer.getExplorerMoleculeById("ethanol").functionalGroups.some((group) => group.id === "alcohol"))
  assert.ok(explorer.getExplorerMoleculeById("acetone").functionalGroups.some((group) => group.id === "ketone"))
  assert.ok(explorer.getExplorerMoleculeById("phenol").functionalGroups.some((group) => group.id === "phenol"))
}

function testScannerExplorerBridge() {
  assert.equal(explorer.molecularExplorerHref({ compound: "ethanol" }), "/interactive-learning/explorer?compound=ethanol")
  const parsed = explorer.parseSerializedExplorerGraph(JSON.stringify({
    atoms: [{ id: "c1", element: "C" }, { id: "o1", element: "O" }],
    bonds: [{ from: "c1", to: "o1", order: 1 }],
  }))
  assert.ok(parsed)
  const imported = explorer.resolveExplorerMolecule({ graph: JSON.stringify(parsed) })
  assert.equal(imported.source, "scanner-graph")
}

function testElectronExplorer() {
  const benzene = explorer.getExplorerMoleculeById("benzene")
  const benzeneElectrons = explorer.summarizeElectronExplorer(benzene)
  assert.ok(benzeneElectrons.delocalizedElectronSets.length >= 1)
  assert.ok(benzeneElectrons.piElectrons > 0)
  const water = explorer.getExplorerMoleculeById("water")
  assert.equal(explorer.summarizeElectronExplorer(water).lonePairElectrons, 4)
}

function testOrbitalOverlay() {
  const examples = ["ethyne", "ethene", "ethanol"].map((id) => explorer.getExplorerMoleculeById(id))
  const hybridizations = examples.flatMap((molecule) => molecule.atoms.map((atom) => atom.hybridization))
  assert.ok(hybridizations.includes("sp"))
  assert.ok(hybridizations.includes("sp2"))
  assert.ok(hybridizations.includes("sp3"))
  assert.ok(explorer.buildExplorerSvgPrimitives(explorer.getExplorerMoleculeById("ethene")).some((primitive) => primitive.layer === "orbital-orientation"))
}

function testLearningCards() {
  const benzeneCards = explorer.getMoleculeLearningCards(explorer.getExplorerMoleculeById("benzene"))
  assert.ok(benzeneCards.some((card) => card.title === "Why this is or is not aromatic"))
  assert.ok(benzeneCards.some((card) => card.title === "How HOMO/LUMO relates to reactivity"))
  const atomCards = explorer.inspectAtom(explorer.getExplorerMoleculeById("ethene"), "c1").cards
  assert.ok(atomCards.some((card) => card.title === "Why this atom is sp2"))
  const bondCards = explorer.inspectBond(explorer.getExplorerMoleculeById("ethene"), "b1").cards
  assert.ok(bondCards.some((card) => card.title === "Why this bond cannot freely rotate"))
}

const tests = {
  "molecular-explorer": testMolecularExplorer,
  "atom-inspector": testAtomInspector,
  "bond-inspector": testBondInspector,
  "overlay-renderer": testOverlayRenderer,
  "reasoning-tree": testReasoningTree,
  "functional-groups": testFunctionalGroups,
  "scanner-explorer-bridge": testScannerExplorerBridge,
  "electron-explorer": testElectronExplorer,
  "orbital-overlay": testOrbitalOverlay,
  "learning-cards": testLearningCards,
}

if (!tests[mode]) throw new Error(`Unknown molecular explorer verification mode: ${mode}`)
tests[mode]()
console.log(`molecular explorer verification passed: ${mode}`)
