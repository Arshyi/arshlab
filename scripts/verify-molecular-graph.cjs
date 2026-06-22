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

function atomCenteredFixture({ points, doubleEdges = [], gap = 8, jitter = 0 }) {
  const lineSegments = []
  const parallelBondPairs = []
  const edgeCount = points.closed ? points.values.length : points.values.length - 1
  for (let index = 0; index < edgeCount; index += 1) {
    const source = points.values[index]
    const target = points.values[(index + 1) % points.values.length]
    const length = Math.hypot(target.x - source.x, target.y - source.y)
    const direction = { x: (target.x - source.x) / length, y: (target.y - source.y) / length }
    const normal = { x: -direction.y, y: direction.x }
    const start = { x: source.x + direction.x * gap, y: source.y + direction.y * gap }
    const end = { x: target.x - direction.x * gap, y: target.y - direction.y * gap }
    const angle = (Math.atan2(target.y - source.y, target.x - source.x) * 180 / Math.PI + 180) % 180
    const firstIndex = lineSegments.length
    lineSegments.push({
      start,
      end,
      midpoint: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
      length: Math.hypot(end.x - start.x, end.y - start.y),
      angle,
      strength: 20,
    })
    if (doubleEdges.includes(index)) {
      const offset = 4
      const secondIndex = lineSegments.length
      const secondStart = { x: start.x + normal.x * offset, y: start.y + normal.y * offset }
      const secondEnd = { x: end.x + normal.x * offset, y: end.y + normal.y * offset }
      lineSegments.push({
        start: secondStart,
        end: secondEnd,
        midpoint: { x: (secondStart.x + secondEnd.x) / 2, y: (secondStart.y + secondEnd.y) / 2 },
        length: Math.hypot(secondEnd.x - secondStart.x, secondEnd.y - secondStart.y),
        angle,
        strength: 18,
      })
      parallelBondPairs.push({
        id: parallelBondPairs.length,
        firstSegmentIndex: firstIndex,
        secondSegmentIndex: secondIndex,
        center: { x: (source.x + target.x) / 2, y: (source.y + target.y) / 2 },
        angle,
        separation: offset,
        overlap: length - gap * 2,
      })
    }
  }
  return reconstructMolecularGraph({
    graph: {
      nodes: [], edges: [], mergedEndpointCount: 0, endpointTolerance: 12, averageLineLength: 30,
      cycleCandidates: [], nearRingCandidates: [], bestRingConfidence: 0, aromaticCueScore: 0,
      explanation: "Raw pixel graph intentionally interrupted by atom glyphs",
    },
    lineSegments,
    parallelBondPairs,
    ringCandidates: [],
    functionalGroupCues: [],
    recognizedText: "",
    atomLabels: points.values.map((point, id) => ({
      id,
      label: "C",
      bounds: { x: point.x - 5, y: point.y - 6, width: 10, height: 12 },
      centroid: { x: point.x + (id % 2 ? jitter : -jitter), y: point.y },
      confidence: 91,
    })),
  })
}

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

for (let ringSize = 3; ringSize <= 8; ringSize += 1) {
  const ring = makeFixture({ id: `ring-${ringSize}`, atoms: ringSize, formula: `C${ringSize}H${ringSize * 2}`, ringSize })
  assert.equal(ring.rings[0]?.size, ringSize, `${ringSize}-member cycle reconstruction`)
}

const labeledHexagon = {
  closed: true,
  values: [
    { x: 30, y: 60 }, { x: 50, y: 25 }, { x: 90, y: 25 },
    { x: 110, y: 60 }, { x: 90, y: 95 }, { x: 50, y: 95 },
  ],
}
const printedBenzene = atomCenteredFixture({ points: labeledHexagon, doubleEdges: [0, 2, 4], gap: 7 })
assert.equal(printedBenzene.atomCentered, true, "printed benzene uses atom-centered graph")
assert.equal(printedBenzene.estimates.carbons, 6, "printed benzene carbon centroids")
assert.equal(printedBenzene.bonds.length, 6, "printed benzene snapped ring edges")
assert.ok(printedBenzene.rings.some((ring) => ring.size === 6), "printed benzene cycle")
assert.equal(printedBenzene.aromatic, true, "printed benzene aromatic evidence")
assert.equal(rankMolecularGraphCandidates(printedBenzene)[0]?.compoundId, "benzene", "printed benzene top graph candidate without hints")

const cameraBenzene = atomCenteredFixture({ points: labeledHexagon, doubleEdges: [0, 2, 4], gap: 13, jitter: 1.5 })
assert.equal(cameraBenzene.estimates.carbons, 6, "camera benzene six carbon atoms")
assert.equal(cameraBenzene.bonds.length, 6, "camera benzene six ring edges")
assert.ok(cameraBenzene.rings.length >= 1, "camera benzene cycle candidate")
assert.equal(cameraBenzene.aromatic, true, "camera benzene aromatic support")
assert.equal(rankMolecularGraphCandidates(cameraBenzene)[0]?.compoundId, "benzene", "camera benzene top candidate without OCR hints")

const labeledCyclohexane = atomCenteredFixture({ points: labeledHexagon, gap: 9 })
assert.equal(labeledCyclohexane.rings[0]?.kind, "cyclohexane-like", "labeled cyclohexane saturated ring")
assert.equal(labeledCyclohexane.aromatic, false, "cyclohexane remains non-aromatic")
assert.equal(rankMolecularGraphCandidates(labeledCyclohexane)[0]?.compoundId, "cyclohexane", "cyclohexane top graph candidate")

const hexanePoints = {
  closed: false,
  values: [
    { x: 20, y: 70 }, { x: 45, y: 45 }, { x: 70, y: 70 },
    { x: 95, y: 45 }, { x: 120, y: 70 }, { x: 145, y: 45 },
  ],
}
const labeledHexane = atomCenteredFixture({ points: hexanePoints, gap: 8 })
assert.equal(labeledHexane.estimates.carbons, 6, "hexane carbon centroids")
assert.equal(labeledHexane.bonds.length, 5, "hexane snapped chain edges")
assert.equal(labeledHexane.rings.length, 0, "hexane does not create a false cycle")

console.log(`Verified ${fixtures.length} molecular graph extraction and similarity fixtures plus 4 atom-centered structures.`)
console.log("Verified single/double/triple bond inference and 3-8 member cycle support.")
rmSync(outputDirectory, { recursive: true, force: true })
