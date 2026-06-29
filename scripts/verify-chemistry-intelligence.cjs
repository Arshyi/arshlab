const assert = require("node:assert/strict")
const { rmSync } = require("node:fs")
const { tmpdir } = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

const root = path.resolve(__dirname, "..")
const outputDirectory = path.join(tmpdir(), "arshlab-chemistry-intelligence-checks")
const tscPath = require.resolve("typescript/bin/tsc")
const mode = process.argv[2] || "all"

rmSync(outputDirectory, { recursive: true, force: true })
const compile = spawnSync(process.execPath, [
  tscPath,
  "lib/chemistry-intelligence/intelligence-engine.ts",
  "lib/chemistry-intelligence/graph-matcher.ts",
  "lib/chemistry-intelligence/functional-group-engine.ts",
  "lib/chemistry-intelligence/chemistry-intelligence-graph.ts",
  "lib/chemistry-intelligence/types.ts",
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
const groupEngine = require(path.join(outputDirectory, "chemistry-intelligence", "functional-group-engine.js"))
const intelligenceEngine = require(path.join(outputDirectory, "chemistry-intelligence", "intelligence-engine.js"))

function getReference(id) {
  const reference = graphMatcher.REFERENCE_MOLECULAR_GRAPHS.find((item) => item.compoundId === id)
  assert.ok(reference, `missing reference graph for ${id}`)
  return reference.graph
}

function renumberGraph(graph, order) {
  const idMap = new Map(order.map((oldId, newId) => [oldId, newId]))
  const nodes = order.map((oldId, newId) => {
    const original = graph.nodes.find((node) => node.id === oldId)
    assert.ok(original, `missing node ${oldId}`)
    return {
      ...original,
      id: newId,
      x: -original.x,
      y: original.y + 25,
    }
  })
  const bonds = graph.bonds.map((bond, id) => ({
    ...bond,
    id,
    startNodeId: idMap.get(bond.startNodeId),
    endNodeId: idMap.get(bond.endNodeId),
  }))
  const rings = graph.rings.map((ring, id) => ({
    ...ring,
    id,
    nodeIds: ring.nodeIds.map((nodeId) => idMap.get(nodeId)),
  }))
  return {
    ...graph,
    nodes,
    bonds,
    rings,
    aromaticRingIds: rings.filter((ring) => ring.aromatic).map((ring) => ring.id),
  }
}

function runGraphMatcherTests() {
  const benzene = getReference("benzene")
  const mirrored = renumberGraph(benzene, [3, 2, 1, 0, 5, 4])
  assert.equal(graphMatcher.canonicalGraphId(benzene), graphMatcher.canonicalGraphId(mirrored), "rotated/mirrored benzene has identical canonical ID")
  assert.equal(graphMatcher.areGraphsIsomorphic(benzene, mirrored), true, "benzene isomorphism ignores atom numbering")
  const cyclohexane = getReference("cyclohexane")
  assert.notEqual(graphMatcher.canonicalGraphId(benzene), graphMatcher.canonicalGraphId(cyclohexane), "aromatic and saturated six-rings stay distinct")
  const matches = graphMatcher.matchCanonicalGraph(mirrored, intelligenceEngine.INTELLIGENCE_COMPOUND_RECORDS)
  assert.equal(matches[0].compoundId, "benzene", "benzene graph matches benzene first")
}

function runFunctionalGroupTests() {
  const ethanol = intelligenceEngine.analyzeChemistryIntelligence({ graph: getReference("ethanol"), preferredCompoundId: "ethanol" })
  assert.ok(ethanol)
  assert.ok(ethanol.functionalGroups.some((group) => group.label === "Primary Alcohol"), "ethanol is a primary alcohol")
  const phenol = intelligenceEngine.analyzeChemistryIntelligence({ graph: getReference("phenol"), preferredCompoundId: "phenol" })
  assert.ok(phenol.functionalGroups.some((group) => group.label === "Phenol"), "phenol is classified hierarchically")
  const acetone = intelligenceEngine.analyzeChemistryIntelligence({ graph: getReference("acetone"), preferredCompoundId: "acetone" })
  assert.ok(acetone.functionalGroups.some((group) => group.label === "Ketone"), "acetone has ketone carbonyl")
  const ethanoic = intelligenceEngine.analyzeChemistryIntelligence({ graph: getReference("ethanoic-acid"), preferredCompoundId: "ethanoic-acid" })
  assert.ok(ethanoic.functionalGroups.some((group) => group.label === "Carboxylic Acid"), "ethanoic acid has acid carbonyl hierarchy")
  const ester = intelligenceEngine.analyzeChemistryIntelligence({ graph: getReference("ethyl-ethanoate"), preferredCompoundId: "ethyl-ethanoate" })
  assert.ok(ester.functionalGroups.some((group) => group.label === "Ester"), "ethyl ethanoate is an ester")
  const benzene = getReference("benzene")
  const directGroups = groupEngine.classifyFunctionalGroups(benzene, intelligenceEngine.INTELLIGENCE_COMPOUND_RECORDS.find((record) => record.id === "benzene"))
  assert.ok(directGroups.some((group) => group.label === "Arene"), "benzene group engine returns arene")
}

function runPropertyTests() {
  const cases = [
    ["benzene", "C6H6"],
    ["phenol", "C6H5OH"],
    ["methanol", "CH3OH"],
    ["ethanol", "C2H5OH"],
    ["acetone", "C3H6O"],
    ["ethanoic-acid", "C2H4O2"],
    ["ethyl-ethanoate", "C4H8O2"],
    ["pyridine", "C5H5N"],
    ["naphthalene", "C10H8"],
    ["aspirin", "C9H8O4"],
    ["caffeine", "C8H10N4O2"],
    ["glucose", "C6H12O6"],
    ["alanine", "C3H7NO2"],
    ["glycine", "C2H5NO2"],
    ["aniline", "C6H7N"],
    ["nitrobenzene", "C6H5NO2"],
    ["cyclohexane", "C6H12"],
    ["cyclohexene", "C6H10"],
  ]
  for (const [id, formula] of cases) {
    const result = intelligenceEngine.analyzeChemistryIntelligence({ graph: getReference(id), preferredCompoundId: id })
    assert.ok(result, `intelligence result for ${id}`)
    assert.equal(result.identity.compoundId, id, `${id} identity`)
    assert.equal(result.properties.formula, formula, `${id} formula`)
    assert.ok(result.properties.molarMass === null || result.properties.molarMass > 0, `${id} molar mass`)
    assert.ok(result.properties.atomCount > 0, `${id} atom count`)
  }
}

function runKnowledgeGraphTests() {
  const benzene = intelligenceEngine.analyzeChemistryIntelligence({ graph: getReference("benzene"), preferredCompoundId: "benzene", visionConfidence: 91, graphConfidence: 94 })
  assert.ok(benzene)
  assert.ok(benzene.knowledgeGraph.nodes.some((node) => node.type === "Compound"), "knowledge graph has compound node")
  assert.ok(benzene.knowledgeGraph.nodes.some((node) => node.type === "Functional Group"), "knowledge graph has functional-group node")
  assert.ok(benzene.resources.some((link) => link.href.includes("/reaction-explorer")), "reaction explorer link present")
  assert.ok(benzene.resources.some((link) => link.href.includes("/practice-generator")), "practice link present")
  assert.ok(benzene.curriculum.length > 0, "curriculum link present")
}

function runFullIntelligenceTests() {
  const cases = [
    "benzene",
    "phenol",
    "ethanol",
    "methanol",
    "acetone",
    "ethanoic-acid",
    "ethyl-ethanoate",
    "cyclohexane",
    "cyclohexene",
    "pyridine",
    "naphthalene",
    "aspirin",
    "caffeine",
    "glucose",
    "alanine",
    "glycine",
    "aniline",
    "nitrobenzene",
  ]
  for (const id of cases) {
    const result = intelligenceEngine.analyzeChemistryIntelligence({ graph: getReference(id), preferredCompoundId: id, visionConfidence: 88, graphConfidence: 90 })
    assert.ok(result, `intelligence result for ${id}`)
    assert.equal(result.identity.compoundId, id, `${id} matched by identity`)
    assert.ok(result.confidence.overall >= 50, `${id} has usable confidence`)
    assert.ok(result.explainWhy.length >= 3, `${id} has deterministic explanation`)
    assert.ok(result.knowledgeGraph.nodes.length >= 2, `${id} has connected knowledge graph`)
  }
}

const runners = {
  all: () => {
    runGraphMatcherTests()
    runFunctionalGroupTests()
    runPropertyTests()
    runKnowledgeGraphTests()
    runFullIntelligenceTests()
  },
  "graph-matcher": runGraphMatcherTests,
  "functional-groups": runFunctionalGroupTests,
  properties: runPropertyTests,
  "knowledge-graph": runKnowledgeGraphTests,
  "chemistry-intelligence": runFullIntelligenceTests,
}

const runner = runners[mode]
if (!runner) {
  process.stderr.write(`Unknown chemistry intelligence test mode: ${mode}\n`)
  process.exit(1)
}

runner()
console.log(`Verified Chemistry Intelligence Engine (${mode}): canonical graph matching, hierarchical groups, properties, knowledge links, and deterministic compound intelligence.`)
rmSync(outputDirectory, { recursive: true, force: true })
