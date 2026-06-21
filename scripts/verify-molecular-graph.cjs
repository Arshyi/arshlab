const assert = require("node:assert/strict")
const { rmSync } = require("node:fs")
const { tmpdir } = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

const root = path.resolve(__dirname, "..")
const outputDirectory = path.join(tmpdir(), "arshlab-molecular-graph-checks")
const tscPath = require.resolve("typescript/bin/tsc")

rmSync(outputDirectory, { recursive: true, force: true })
const compile = spawnSync(
  process.execPath,
  [
    tscPath,
    "lib/vision/molecular-graph.ts",
    "lib/structure-vision/vision-types.ts",
    "--module",
    "commonjs",
    "--target",
    "es2020",
    "--outDir",
    outputDirectory,
    "--esModuleInterop",
    "--skipLibCheck",
  ],
  { cwd: root, encoding: "utf8" },
)

if (compile.status !== 0) {
  process.stderr.write(compile.stdout)
  process.stderr.write(compile.stderr)
  process.exit(compile.status ?? 1)
}

const {
  rankMolecularGraphCandidates,
  reconstructMolecularGraph,
} = require(path.join(outputDirectory, "vision", "molecular-graph.js"))

function makeFixture({ id, atoms, formula, doubleEdges = [], tripleEdges = [], ringSize = 0, aromatic = false, cue }) {
  const nodes = Array.from({ length: atoms }, (_, index) => {
    const angle = ringSize ? (Math.PI * 2 * index) / ringSize : 0
    return {
      id: index,
      point: ringSize
        ? { x: 60 + Math.cos(angle) * 35, y: 50 + Math.sin(angle) * 35 }
        : { x: 15 + index * 25, y: 50 + (index % 2) * 12 },
      endpointCount: 2,
      mergeRadius: 1,
      mergeQuality: 90,
    }
  })
  const edgeCount = ringSize || Math.max(0, atoms - 1)
  const edges = []
  const parallelBondPairs = []
  let segmentIndex = 0
  for (let index = 0; index < edgeCount; index += 1) {
    const order = tripleEdges.includes(index) ? 3 : doubleEdges.includes(index) ? 2 : 1
    const sourceSegmentIndexes = Array.from({ length: order }, () => segmentIndex++)
    edges.push({
      id: index,
      startNodeId: index,
      endNodeId: ringSize ? (index + 1) % ringSize : index + 1,
      length: 25,
      sourceSegmentIndexes,
    })
    for (let pairIndex = 0; pairIndex < order - 1; pairIndex += 1) {
      parallelBondPairs.push({
        id: parallelBondPairs.length,
        firstSegmentIndex: sourceSegmentIndexes[pairIndex],
        secondSegmentIndex: sourceSegmentIndexes[pairIndex + 1],
        center: { x: 0, y: 0 },
        angle: 0,
        separation: 4,
        overlap: 20,
      })
    }
  }
  const ringCandidates = ringSize ? [{
    center: { x: 60, y: 50 },
    width: 70,
    height: 70,
    sidesEstimate: ringSize,
    confidence: 88,
    benzeneLike: aromatic,
    nearRing: false,
    source: "graph-cycle",
    nodeIds: nodes.map((node) => node.id),
    closureQuality: 100,
    endpointMergeQuality: 90,
    polygonRegularity: 90,
    lineCoverage: 100,
    doubleBondCue: aromatic ? 100 : 0,
    aromaticCueScore: aromatic ? 100 : 0,
    reason: "Deterministic graph fixture",
    scoreBreakdown: [],
  }] : []
  const functionalGroupCues = cue ? [{ kind: cue, label: cue, confidence: 90, evidence: "fixture" }] : []
  const graph = reconstructMolecularGraph({
    graph: {
      nodes,
      edges,
      mergedEndpointCount: edgeCount,
      endpointTolerance: 12,
      averageLineLength: 25,
      cycleCandidates: ringCandidates,
      nearRingCandidates: [],
      bestRingConfidence: ringSize ? 88 : 0,
      aromaticCueScore: aromatic ? 100 : 0,
      explanation: "Deterministic graph fixture",
    },
    lineSegments: [],
    parallelBondPairs,
    ringCandidates,
    functionalGroupCues,
    recognizedText: `${formula} ${id}`,
  })
  return graph
}

const fixtures = [
  { id: "benzene", atoms: 6, formula: "C6H6", ringSize: 6, aromatic: true, doubleEdges: [0, 2, 4], expectedCarbons: 6 },
  { id: "cyclohexane", atoms: 6, formula: "C6H12", ringSize: 6, expectedCarbons: 6 },
  { id: "ethanol", atoms: 3, formula: "C2H6O", cue: "hydroxyl", expectedCarbons: 2 },
  { id: "methanal", atoms: 2, formula: "CH2O", doubleEdges: [0], cue: "carbonyl", expectedCarbons: 1 },
  { id: "ethanal", atoms: 3, formula: "C2H4O", doubleEdges: [1], cue: "carbonyl", expectedCarbons: 2 },
  { id: "ethanoic-acid", atoms: 4, formula: "C2H4O2", doubleEdges: [2], cue: "carboxyl", expectedCarbons: 2 },
  { id: "acetone", atoms: 4, formula: "C3H6O", doubleEdges: [2], cue: "carbonyl", expectedCarbons: 3 },
  { id: "ethene", atoms: 2, formula: "C2H4", doubleEdges: [0], expectedCarbons: 2 },
  { id: "ethyne", atoms: 2, formula: "C2H2", tripleEdges: [0], expectedCarbons: 2 },
]

for (const fixture of fixtures) {
  const graph = makeFixture(fixture)
  assert.equal(graph.estimates.carbons, fixture.expectedCarbons, `${fixture.id}: carbon skeleton estimate`)
  assert.notEqual(graph.estimates.estimatedFormula, "Unavailable", `${fixture.id}: formula estimate`)
  assert.equal(rankMolecularGraphCandidates(graph)[0]?.compoundId, fixture.id, `${fixture.id}: top graph match`)
  if (fixture.ringSize) assert.equal(graph.rings[0]?.size, fixture.ringSize, `${fixture.id}: ring reconstruction`)
  if (fixture.doubleEdges?.length) assert.ok(graph.estimates.doubleBonds >= fixture.doubleEdges.length, `${fixture.id}: double bonds`)
  if (fixture.tripleEdges?.length) assert.equal(graph.estimates.tripleBonds, fixture.tripleEdges.length, `${fixture.id}: triple bonds`)
}

const benzene = makeFixture(fixtures[0])
assert.equal(benzene.rings[0].kind, "benzene-like", "benzene aromatic classification")
assert.equal(benzene.aromatic, true, "benzene aromatic flag")
const cyclohexane = makeFixture(fixtures[1])
assert.equal(cyclohexane.rings[0].kind, "cyclohexane-like", "cyclohexane saturated classification")
assert.equal(cyclohexane.aromatic, false, "cyclohexane aromatic safeguard")

for (let ringSize = 3; ringSize <= 7; ringSize += 1) {
  const ring = makeFixture({ id: `ring-${ringSize}`, atoms: ringSize, formula: `C${ringSize}H${ringSize * 2}`, ringSize })
  assert.equal(ring.rings[0]?.size, ringSize, `${ringSize}-member cycle reconstruction`)
}

console.log(`Verified ${fixtures.length} molecular graph extraction and similarity fixtures.`)
console.log("Verified single/double/triple bond inference and 3-7 member cycle support.")
rmSync(outputDirectory, { recursive: true, force: true })
