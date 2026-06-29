const assert = require("node:assert/strict")
const { rmSync } = require("node:fs")
const { tmpdir } = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

const mode = process.argv[2] ?? "all"
const root = path.resolve(__dirname, "..")
const outputDirectory = path.join(tmpdir(), `arshlab-graph-validation-checks-${mode}`)
const tscPath = require.resolve("typescript/bin/tsc")

rmSync(outputDirectory, { recursive: true, force: true })
const compile = spawnSync(process.execPath, [
  tscPath,
  "lib/vision/molecular-graph.ts",
  "lib/structure-vision/vision-types.ts",
  "lib/structure-vision/edge-validator.ts",
  "lib/structure-vision/bridge-validator.ts",
  "lib/structure-vision/cycle-validator.ts",
  "lib/structure-vision/graph-sanity.ts",
  "lib/structure-vision/topology-reconstructor.ts",
  "lib/structure-vision/graph-validator.ts",
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

const { validateEdges } = require(path.join(outputDirectory, "structure-vision", "edge-validator.js"))
const { validateBridges } = require(path.join(outputDirectory, "structure-vision", "bridge-validator.js"))
const { validateCycles } = require(path.join(outputDirectory, "structure-vision", "cycle-validator.js"))
const { analyzeGraphSanity } = require(path.join(outputDirectory, "structure-vision", "graph-sanity.js"))
const { reconstructTopologyVariants } = require(path.join(outputDirectory, "structure-vision", "topology-reconstructor.js"))
const { validateGraphTopology } = require(path.join(outputDirectory, "structure-vision", "graph-validator.js"))

function node(id, x, y, element = "C", confidence = 92) {
  return {
    id,
    x,
    y,
    degree: 0,
    inferredElement: element,
    confidence,
    source: "atom-label",
    labelBounds: { x: x - 4, y: y - 5, width: 8, height: 10 },
    snappedSegmentIndexes: [],
  }
}

function bond(id, startNodeId, endNodeId, order = 1, confidence = 86, gapBridged = false, parallelPairCount = 0) {
  return { id, startNodeId, endNodeId, bondOrder: order, confidence, sourceSegmentIndexes: [id], parallelPairCount, gapBridged }
}

function graph(nodes, bonds, rings = []) {
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
      estimatedFormula: "C",
      confidence: 84,
    },
    warnings: [],
    atomCentered: true,
    snapRadius: 12,
  }
}

const hexagonNodes = [
  node(0, 40, 70),
  node(1, 60, 35),
  node(2, 100, 35),
  node(3, 120, 70),
  node(4, 100, 105),
  node(5, 60, 105),
]
const benzeneBonds = hexagonNodes.map((_, index) =>
  bond(index, index, (index + 1) % hexagonNodes.length, index % 2 === 0 ? 2 : 1, 88, false, index % 2 === 0 ? 1 : 0),
)
const benzeneRing = { id: 0, nodeIds: [0, 1, 2, 3, 4, 5], size: 6, confidence: 88, aromatic: true, closed: true, kind: "benzene-like" }

function runEdgeChecks() {
  const crossing = graph(
    [node(0, 20, 20), node(1, 100, 20), node(2, 100, 100), node(3, 20, 100)],
    [bond(0, 0, 2), bond(1, 1, 3), bond(2, 0, 1), bond(3, 2, 3), bond(4, 2, 3)],
  )
  const result = validateEdges(crossing)
  assert.ok(result.crossingPairs.length > 0, "crossing edges are reported")
  assert.ok(result.duplicatePairs.length > 0, "duplicate bonds are reported")
  assert.ok(result.edges.some((edge) => edge.status === "rejected" && edge.reasons.some((reason) => /Duplicate/.test(reason))), "duplicate edge is rejected")
  assert.ok(result.edges.some((edge) => edge.status === "rejected" && edge.reasons.some((reason) => /crosses/.test(reason))), "crossing edge is rejected")
}

function runBridgeChecks() {
  const recovered = graph(
    [node(0, 20, 50), node(1, 70, 50), node(2, 122, 50)],
    [bond(0, 0, 1, 1, 88, true), bond(1, 1, 2, 1, 42, true)],
  )
  const edges = validateEdges(recovered)
  const result = validateBridges(recovered, edges)
  assert.ok(result.bridges.some((bridge) => bridge.classification === "guaranteed" || bridge.classification === "likely"), "strong bridge is classified as safe")
  assert.ok(result.bridges.some((bridge) => bridge.classification === "possible" || bridge.classification === "unsafe"), "weak bridge remains cautious")
}

function runCycleChecks() {
  const accepted = graph(hexagonNodes, benzeneBonds, [benzeneRing])
  const acceptedCycles = validateCycles(accepted, validateEdges(accepted))
  assert.equal(acceptedCycles.accepted, 1, "valid benzene-like cycle is accepted")

  const missingEdge = graph(hexagonNodes, benzeneBonds.slice(0, 5), [benzeneRing])
  const rejectedCycles = validateCycles(missingEdge, validateEdges(missingEdge))
  assert.equal(rejectedCycles.rejected, 1, "cycle without all graph edges is rejected")
}

function runTopologyChecks() {
  const noisy = graph(hexagonNodes, [...benzeneBonds, bond(99, 0, 3, 1, 18, true)], [benzeneRing])
  const edges = validateEdges(noisy)
  const bridges = validateBridges(noisy, edges)
  const cycles = validateCycles(noisy, edges)
  const sanity = analyzeGraphSanity(noisy, edges, cycles)
  const topology = reconstructTopologyVariants(noisy, edges, bridges, cycles, sanity)
  assert.ok(topology.selectedGraph, "topology reconstruction selects a graph")
  assert.equal(topology.selectedGraph.bonds.some((item) => item.id === 99), false, "unsafe long bridge is removed from selected topology")
  assert.ok(topology.variants.length >= 3, "multiple topology variants are scored")
}

function runGraphValidatorChecks() {
  const benzene = graph(hexagonNodes, benzeneBonds, [benzeneRing])
  const passed = validateGraphTopology(benzene)
  assert.notEqual(passed.status, "failed", "clean graph opens candidate gate")
  assert.equal(passed.candidateGateOpen, true, "candidate gate opens for valid graph")
  assert.match(passed.sanity.fingerprint.candidateTopology, /Aromatic|ring/i, "fingerprint identifies cyclic topology")

  const impossible = graph([node(0, 50, 50)], [])
  const failed = validateGraphTopology(impossible)
  assert.equal(failed.status, "failed", "empty graph fails validation")
  assert.equal(failed.candidateGateOpen, false, "candidate gate closes for unreliable graph")

  const openAlcohol = graph(
    [node(0, 20, 50), node(1, 65, 50), node(2, 105, 50, "O")],
    [bond(0, 0, 1), bond(1, 1, 2)],
  )
  const openResult = validateGraphTopology(openAlcohol)
  assert.equal(openResult.sanity.fingerprint.cycles, 0, "open-chain fingerprint has no cycles")
  assert.match(openResult.sanity.fingerprint.candidateTopology, /alcohol|ether|open chain/i, "open chain cannot be benzene before database matching")
}

const runners = {
  "edge-validator": runEdgeChecks,
  "bridge-validator": runBridgeChecks,
  "cycle-validator": runCycleChecks,
  topology: runTopologyChecks,
  "graph-validator": runGraphValidatorChecks,
  all() {
    runEdgeChecks()
    runBridgeChecks()
    runCycleChecks()
    runTopologyChecks()
    runGraphValidatorChecks()
  },
}

if (!runners[mode]) {
  console.error(`Unknown graph validation test mode: ${mode}`)
  process.exit(1)
}

runners[mode]()
console.log(`Verified graph validation mode: ${mode}`)
rmSync(outputDirectory, { recursive: true, force: true })
