const assert = require("node:assert/strict")
const { rmSync } = require("node:fs")
const { tmpdir } = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

const root = path.resolve(__dirname, "..")
const outputDirectory = path.join(tmpdir(), "arshlab-consensus-graph-solver-checks")
const tscPath = require.resolve("typescript/bin/tsc")

rmSync(outputDirectory, { recursive: true, force: true })
const compile = spawnSync(process.execPath, [
  tscPath,
  "lib/structure-vision/consensus-graph-solver.ts",
  "lib/structure-vision/candidate-graph-generator.ts",
  "lib/structure-vision/global-graph-optimizer.ts",
  "lib/structure-vision/chemical-graph-validator.ts",
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
const { validateChemicalGraph } = require(path.join(outputDirectory, "structure-vision", "chemical-graph-validator.js"))
const { solveConsensusGraph } = require(path.join(outputDirectory, "structure-vision", "consensus-graph-solver.js"))

function node(id, x, y, element = "C") {
  return { id, x, y, degree: 0, inferredElement: element, confidence: 92, source: "atom-label", snappedSegmentIndexes: [] }
}

function bond(id, startNodeId, endNodeId, order = 1, confidence = 88, parallelPairCount = order > 1 ? 1 : 0, gapBridged = false) {
  return { id, startNodeId, endNodeId, bondOrder: order, confidence, sourceSegmentIndexes: [id], parallelPairCount, gapBridged }
}

function graph(nodes, bonds, rings = [], confidence = 86, formula = "C6H6") {
  const nextNodes = nodes.map((item) => ({
    ...item,
    degree: bonds.filter((candidate) => candidate.startNodeId === item.id || candidate.endNodeId === item.id).length,
  }))
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
      estimatedFormula: formula,
      confidence,
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

function ringClosure({ aromaticSupport = 84, confidence = 86, memberCount = 6, selected = true } = {}) {
  const nodeIds = hexagon.slice(0, memberCount).map((item) => item.id)
  return {
    candidates: [{
      id: 1,
      memberCount,
      nodeIds,
      points: hexagon.slice(0, memberCount).map((item) => ({ x: item.x, y: item.y })),
      center: { x: 73, y: 66 },
      width: 86,
      height: 72,
      closed: false,
      recovered: true,
      selected,
      confidence,
      closureConfidence: confidence - 4,
      regularity: 82,
      lineCoverage: 78,
      aromaticSupport,
      doubleBondCount: aromaticSupport >= 55 ? 3 : 0,
      closureGaps: [{ fromNodeId: 5, toNodeId: 0, gapLength: 8, confidence: 72, accepted: true, reason: "fixture gap" }],
      source: "atom-centroid",
      selectedReason: "fixture selected",
      rejectedReasons: [],
      scoreBreakdown: [],
    }],
    selectedCandidateId: selected ? 1 : null,
    detectedRingSizes: selected ? [memberCount] : [],
    snapEvents: [],
    bridgeEvents: [],
    aromaticSupportScore: aromaticSupport,
    ringVoteContribution: confidence,
    explanation: "fixture ring closure",
  }
}

function shape() {
  return {
    originalSegments: [],
    mergedStrokes: [],
    acceptedPolygon: { sides: 6, edges: [], confidence: 82 },
    polygonHypotheses: [],
    bridgedGaps: [],
    predictedCorners: [],
    shapeConfidence: 84,
    polygonConfidence: 82,
    closureScore: 82,
    symmetryScore: 80,
    explanation: "fixture shape",
  }
}

function solve(baseGraph, { text = "", closure = ringClosure(), ringCandidates = [] } = {}) {
  const hypotheses = generateCandidateGraphs({
    baseGraph,
    lineSegments: [],
    parallelBondPairs: [],
    ringClosure: closure,
    ringCandidates,
    recognizedText: text,
  })
  const optimization = optimizeMolecularGraphHypotheses(hypotheses)
  const validation = validateChemicalGraph({
    graph: optimization.selectedHypothesis?.graph ?? baseGraph,
    lineSegments: [],
    parallelBondPairs: [],
    ringClosure: closure,
    ringCandidates,
    recognizedText: text,
  })
  return solveConsensusGraph({
    rawGraph: baseGraph,
    candidateGraphHypotheses: hypotheses,
    globalGraphOptimization: optimization,
    chemicalGraphValidation: validation,
    ringClosure: closure,
    ringCandidates,
    globalShapeReconstruction: shape(),
    lineSegments: [],
    parallelBondPairs: [],
    recognizedText: text,
  })
}

function topMatch(result) {
  return result.selectedHypothesis?.databaseMatches[0]?.compoundId
}

const benzeneBonds = [0, 1, 2, 3, 4, 5].map((id) => bond(id, id, (id + 1) % 6, id % 2 === 0 ? 2 : 1, 90, id % 2 === 0 ? 1 : 0))
const benzene = graph(hexagon, benzeneBonds, [{ id: 0, nodeIds: [0, 1, 2, 3, 4, 5], size: 6, confidence: 90, aromatic: true, closed: true, kind: "benzene-like" }])
const benzeneResult = solve(benzene, { text: "NG HH BC" })
assert.equal(topMatch(benzeneResult), "benzene", "benzene remains top candidate despite noisy OCR")
assert.ok(benzeneResult.finalConsensusScore >= 70, "benzene receives a strong consensus score")
assert.ok(benzeneResult.duplicateGraphsRemoved > 0, "canonical duplicate graphs are deduplicated")

const cyclohexane = graph(hexagon, [0, 1, 2, 3, 4, 5].map((id) => bond(id, id, (id + 1) % 6, 1)), [
  { id: 0, nodeIds: [0, 1, 2, 3, 4, 5], size: 6, confidence: 82, aromatic: false, closed: true, kind: "cyclohexane-like" },
], 84, "C6H12")
const cyclohexaneResult = solve(cyclohexane, { closure: ringClosure({ aromaticSupport: 0, confidence: 78 }) })
assert.equal(topMatch(cyclohexaneResult), "cyclohexane", "saturated six-member ring does not become benzene")
assert.ok(cyclohexaneResult.conflictResolutions.some((item) => /Saturated/.test(item.issue)), "saturated ring conflict is explained")

const partialBenzene = graph(hexagon, benzeneBonds.filter((item) => item.id !== 5), [], 76)
const repairedBenzene = solve(partialBenzene, { closure: ringClosure({ aromaticSupport: 78, confidence: 80 }), text: "benzene ring" })
assert.equal(topMatch(repairedBenzene), "benzene", "one missing benzene edge is recovered")
assert.ok(repairedBenzene.selectedGraph.rings.some((ring) => ring.size === 6 && ring.aromatic), "repaired graph has a six-member aromatic ring")
assert.ok(repairedBenzene.repairIterations.some((item) => item.accepted), "repair history records accepted move")

const cyclohexene = graph(hexagon, [0, 1, 2, 3, 4, 5].map((id) => bond(id, id, (id + 1) % 6, id === 0 ? 2 : 1, 88, id === 0 ? 1 : 0)), [
  { id: 0, nodeIds: [0, 1, 2, 3, 4, 5], size: 6, confidence: 78, aromatic: false, closed: true, kind: "cyclohexane-like" },
], 80, "C6H10")
const cyclohexeneResult = solve(cyclohexene, { closure: ringClosure({ aromaticSupport: 22, confidence: 76 }) })
assert.notEqual(topMatch(cyclohexeneResult), "benzene", "one double bond is not enough for benzene")

const pyridineNodes = hexagon.map((item, index) => index === 2 ? { ...item, inferredElement: "N" } : item)
const pyridineLike = graph(pyridineNodes, benzeneBonds, [{ id: 0, nodeIds: [0, 1, 2, 3, 4, 5], size: 6, confidence: 84, aromatic: true, closed: true, kind: "benzene-like" }], 80, "C5H5N")
const pyridineResult = solve(pyridineLike, { text: "pyridine" })
assert.ok((pyridineResult.selectedHypothesis?.rejectionReasons.length ?? 0) > 0 || pyridineResult.finalConsensusScore < benzeneResult.finalConsensusScore, "heteroatom aromatic ring is penalized instead of overclaiming benzene")

const fusedNodes = [
  ...hexagon,
  node(6, 136, 30),
  node(7, 158, 66),
  node(8, 136, 101),
  node(9, 116, 66),
]
const fusedBonds = [
  ...benzeneBonds,
  bond(6, 2, 6, 2, 82, 1),
  bond(7, 6, 7, 1),
  bond(8, 7, 8, 2, 82, 1),
  bond(9, 8, 4, 1),
  bond(10, 3, 9, 1),
]
const naphthalenePlaceholder = graph(fusedNodes, fusedBonds, [
  { id: 0, nodeIds: [0, 1, 2, 3, 4, 5], size: 6, confidence: 80, aromatic: true, closed: true, kind: "benzene-like" },
  { id: 1, nodeIds: [2, 6, 7, 8, 4, 3], size: 6, confidence: 72, aromatic: true, closed: true, kind: "benzene-like" },
], 76, "C10H8")
const fusedResult = solve(naphthalenePlaceholder, { text: "naphthalene" })
assert.ok(fusedResult.selectedGraph.rings.length >= 1, "fused-ring placeholder remains a graph hypothesis without crashing")
assert.ok(fusedResult.graphHistory.length > 0, "graph history is reported")

console.log("Verified Consensus Graph Solver: canonical dedupe, benzene consensus, cyclohexane safeguard, partial-ring repair, cyclohexene suppression, heteroatom penalty, noisy OCR resistance, and fused-ring readiness.")
rmSync(outputDirectory, { recursive: true, force: true })
