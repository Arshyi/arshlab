const assert = require("node:assert/strict")
const { rmSync } = require("node:fs")
const { tmpdir } = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

const root = path.resolve(__dirname, "..")
const outputDirectory = path.join(tmpdir(), "arshlab-global-graph-optimizer-checks")
const tscPath = require.resolve("typescript/bin/tsc")

rmSync(outputDirectory, { recursive: true, force: true })
const compile = spawnSync(process.execPath, [
  tscPath,
  "lib/structure-vision/candidate-graph-generator.ts",
  "lib/structure-vision/global-graph-optimizer.ts",
  "lib/structure-vision/bond-angle-engine.ts",
  "lib/structure-vision/canonical-molecular-graph.ts",
  "lib/vision/molecular-graph.ts",
  "lib/structure-vision/vision-types.ts",
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

const { generateCandidateGraphs } = require(path.join(outputDirectory, "structure-vision", "candidate-graph-generator.js"))
const { optimizeMolecularGraphHypotheses } = require(path.join(outputDirectory, "structure-vision", "global-graph-optimizer.js"))
const { rankMolecularGraphCandidates } = require(path.join(outputDirectory, "vision", "molecular-graph.js"))

function node(id, x, y, element = "C") {
  return { id, x, y, degree: 0, inferredElement: element, confidence: 92, source: "atom-label", snappedSegmentIndexes: [] }
}

function bond(id, startNodeId, endNodeId, order = 1, confidence = 86, parallelPairCount = order > 1 ? 1 : 0) {
  return { id, startNodeId, endNodeId, bondOrder: order, confidence, sourceSegmentIndexes: [id], parallelPairCount, gapBridged: false }
}

function graph(nodes, bonds, rings = []) {
  const nextNodes = nodes.map((item) => ({ ...item, degree: bonds.filter((candidate) => candidate.startNodeId === item.id || candidate.endNodeId === item.id).length }))
  return {
    nodes: nextNodes,
    bonds,
    rings,
    aromatic: rings.some((ring) => ring.aromatic),
    aromaticRingIds: rings.filter((ring) => ring.aromatic).map((ring) => ring.id),
    estimates: {
      atoms: nextNodes.length,
      carbons: nextNodes.filter((item) => item.inferredElement === "C").length,
      bonds: bonds.length,
      rings: rings.length,
      singleBonds: bonds.filter((item) => item.bondOrder === 1).length,
      doubleBonds: bonds.filter((item) => item.bondOrder === 2).length,
      tripleBonds: bonds.filter((item) => item.bondOrder === 3).length,
      estimatedFormula: "C6H6",
      confidence: 82,
    },
    warnings: [],
    atomCentered: true,
    snapRadius: 12,
  }
}

const hexagon = [
  node(0, 30, 66),
  node(1, 51, 30),
  node(2, 93, 30),
  node(3, 116, 66),
  node(4, 94, 101),
  node(5, 52, 101),
]

const badBenzene = graph(hexagon, [
  bond(0, 0, 1, 3, 72, 2),
  bond(1, 1, 2, 1),
  bond(2, 2, 3, 2),
  bond(3, 3, 4, 1),
  bond(4, 4, 5, 2),
  bond(5, 5, 0, 1),
  bond(6, 0, 3, 1, 36),
], [{ id: 0, nodeIds: [0, 1, 2, 3, 4, 5], size: 6, confidence: 86, aromatic: true, closed: true, kind: "benzene-like" }])

const hypotheses = generateCandidateGraphs({ baseGraph: badBenzene, lineSegments: [], parallelBondPairs: [], ringCandidates: [] })
assert.ok(hypotheses.length >= 3, "generator creates multiple deterministic graph hypotheses")
const optimized = optimizeMolecularGraphHypotheses(hypotheses)
assert.ok(optimized.selectedHypothesis, "optimizer selects a hypothesis")
assert.ok(optimized.finalOptimizationScore >= 60, `optimized benzene score should be meaningful, got ${optimized.finalOptimizationScore}`)
assert.equal(optimized.selectedHypothesis.graph.estimates.tripleBonds, 0, "aromatic ring triple bond is not retained")
assert.ok(optimized.selectedHypothesis.graph.rings.some((ring) => ring.size === 6 && ring.aromatic), "six-member aromatic ring survives optimization")
assert.equal(rankMolecularGraphCandidates(optimized.selectedHypothesis.graph)[0]?.compoundId, "benzene", "benzene ranks first after optimization")

const cyclohexane = graph(hexagon, [0, 1, 2, 3, 4, 5].map((id) => bond(id, id, (id + 1) % 6, 1)), [
  { id: 0, nodeIds: [0, 1, 2, 3, 4, 5], size: 6, confidence: 80, aromatic: false, closed: true, kind: "cyclohexane-like" },
])
const saturated = optimizeMolecularGraphHypotheses(generateCandidateGraphs({ baseGraph: cyclohexane, lineSegments: [], parallelBondPairs: [], ringCandidates: [] }))
assert.equal(rankMolecularGraphCandidates(saturated.selectedHypothesis.graph)[0]?.compoundId, "cyclohexane", "saturated six-member ring stays cyclohexane")

const clutterGraph = graph([...hexagon, node(6, 220, 220), node(7, 245, 240)], [
  ...[0, 1, 2, 3, 4, 5].map((id) => bond(id, id, (id + 1) % 6, id % 2 === 0 ? 2 : 1)),
  bond(6, 0, 7, 1, 34),
], [{ id: 0, nodeIds: [0, 1, 2, 3, 4, 5], size: 6, confidence: 82, aromatic: true, closed: true, kind: "benzene-like" }])
const decluttered = optimizeMolecularGraphHypotheses(generateCandidateGraphs({ baseGraph: clutterGraph, lineSegments: [], parallelBondPairs: [], ringCandidates: [] }))
assert.ok(decluttered.acceptedMoves.some((move) => /remove edge/.test(move.label)) || decluttered.selectedHypothesis.graph.bonds.length < clutterGraph.bonds.length, "long background edge is removed by global optimization")

console.log("Verified Global Graph Optimizer: hypothesis generation, aromatic triple correction, saturated-ring safeguard, long-edge pruning, database ranking, and canonical selection.")
rmSync(outputDirectory, { recursive: true, force: true })
