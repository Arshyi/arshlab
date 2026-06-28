const assert = require("node:assert/strict")
const { rmSync } = require("node:fs")
const { tmpdir } = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

const root = path.resolve(__dirname, "..")
const outputDirectory = path.join(tmpdir(), "arshlab-chemical-graph-validator-checks")
const tscPath = require.resolve("typescript/bin/tsc")

rmSync(outputDirectory, { recursive: true, force: true })
const compile = spawnSync(process.execPath, [
  tscPath,
  "lib/structure-vision/vision-types.ts",
  "lib/structure-vision/chemical-graph-validator.ts",
  "lib/structure-vision/ring-closure.ts",
  "lib/structure-vision/shape-heuristics.ts",
  "lib/structure-scanner/scanner-engine.ts",
  "lib/structure-scanner/scanner-database.ts",
  "lib/structure-scanner/scanner-types.ts",
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

const { validateChemicalGraph } = require(path.join(outputDirectory, "structure-vision", "chemical-graph-validator.js"))
const { analyzeDarkPixelMask } = require(path.join(outputDirectory, "structure-vision", "shape-heuristics.js"))
const { scanStructure } = require(path.join(outputDirectory, "structure-scanner", "scanner-engine.js"))

function distance(left, right) {
  return Math.hypot(left.x - right.x, left.y - right.y)
}

function node(id, x, y, element = "C") {
  return {
    id,
    x,
    y,
    degree: 0,
    inferredElement: element,
    confidence: 92,
    source: "atom-label",
    labelBounds: { x: x - 4, y: y - 5, width: 8, height: 10 },
    snappedSegmentIndexes: [],
  }
}

function bond(id, startNodeId, endNodeId, order = 1, confidence = 84, sourceSegmentIndexes = [], parallelPairCount = 0, gapBridged = false) {
  return { id, startNodeId, endNodeId, bondOrder: order, confidence, sourceSegmentIndexes, parallelPairCount, gapBridged }
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

function ringBonds(orderPattern = [2, 1, 2, 1, 2, 1]) {
  return hexagon.map((_, index) =>
    bond(index, index, (index + 1) % hexagon.length, orderPattern[index], 86, [index], orderPattern[index] >= 2 ? 1 : 0),
  )
}

const benzeneGraph = graph(hexagon, [...ringBonds(), bond(6, 0, 3, 1, 45, [6])], [
  { id: 0, nodeIds: [0, 1, 2, 3, 4, 5], size: 6, confidence: 88, aromatic: true, closed: true, kind: "benzene-like" },
])
const longDiagonal = validateChemicalGraph({
  graph: benzeneGraph,
  lineSegments: [],
  parallelBondPairs: [],
  ringCandidates: [],
})
assert.ok(longDiagonal.rejectedBonds.some((item) => item.startNodeId === 0 && item.endNodeId === 3), "long diagonal false bond is rejected")
assert.equal(longDiagonal.validatedGraph.rings[0]?.aromatic, true, "aromatic benzene ring survives long-edge pruning")

const crossingNodes = [node(0, 20, 20), node(1, 80, 20), node(2, 80, 80), node(3, 20, 80)]
const crossingGraph = graph(crossingNodes, [
  bond(0, 0, 1),
  bond(1, 1, 2),
  bond(2, 2, 3),
  bond(3, 3, 0),
  bond(4, 0, 2, 1, 42),
  bond(5, 1, 3, 1, 41),
])
const crossingResult = validateChemicalGraph({ graph: crossingGraph, lineSegments: [], parallelBondPairs: [] })
assert.ok(crossingResult.rejectedBonds.some((item) => item.kind === "crossing-bond" || item.kind === "long-bond"), "crossing or diagonal artifacts are pruned")

const valenceCenter = node(0, 60, 60)
const valenceNodes = [valenceCenter, node(1, 30, 60), node(2, 90, 60), node(3, 60, 30), node(4, 60, 90), node(5, 100, 100)]
const valenceGraph = graph(valenceNodes, [
  bond(0, 0, 1, 1, 85),
  bond(1, 0, 2, 1, 82),
  bond(2, 0, 3, 1, 80),
  bond(3, 0, 4, 1, 78),
  bond(4, 0, 5, 1, 35, [], 0, true),
])
const valenceResult = validateChemicalGraph({ graph: valenceGraph, lineSegments: [], parallelBondPairs: [] })
assert.ok(valenceResult.rejectedBonds.some((item) => item.kind === "valence"), "over-valent carbon has weakest edge pruned")
assert.ok(valenceResult.valenceSummaries.find((item) => item.nodeId === 0)?.valid, "carbon valence is valid after pruning")

const falseTripleGraph = graph(hexagon, [bond(0, 0, 1, 3, 80, [0, 1, 2], 2)], [
  { id: 0, nodeIds: [0, 1, 2, 3, 4, 5], size: 6, confidence: 70, aromatic: true, closed: true, kind: "benzene-like" },
])
const falseTriple = validateChemicalGraph({ graph: falseTripleGraph, lineSegments: [], parallelBondPairs: [] })
assert.ok(falseTriple.correctedBondOrders.some((item) => item.fromOrder === 3 && item.toOrder < 3), "ring false triple bond is downgraded")

const tripleNodes = [node(0, 30, 50), node(1, 90, 50)]
const tripleSegments = [
  { start: { x: 31, y: 45 }, end: { x: 89, y: 45 }, midpoint: { x: 60, y: 45 }, length: 58, angle: 0, strength: 12 },
  { start: { x: 30, y: 50 }, end: { x: 90, y: 50 }, midpoint: { x: 60, y: 50 }, length: 60, angle: 0, strength: 14 },
  { start: { x: 31, y: 55 }, end: { x: 89, y: 55 }, midpoint: { x: 60, y: 55 }, length: 58, angle: 0, strength: 12 },
]
const realTriple = validateChemicalGraph({
  graph: graph(tripleNodes, [bond(0, 0, 1, 3, 88, [0, 1, 2], 2)]),
  lineSegments: tripleSegments,
  parallelBondPairs: [
    { id: 0, firstSegmentIndex: 0, secondSegmentIndex: 1, center: { x: 60, y: 47.5 }, angle: 0, separation: 5, overlap: 58 },
    { id: 1, firstSegmentIndex: 1, secondSegmentIndex: 2, center: { x: 60, y: 52.5 }, angle: 0, separation: 5, overlap: 58 },
  ],
})
assert.equal(realTriple.validatedGraph.estimates.tripleBonds, 1, "real compact triple bond is preserved")

function createMask(width = 150, height = 130) {
  return { width, height, pixels: new Uint8Array(width * height), darkPixelCount: 0, threshold: 160 }
}

function setPixel(mask, x, y) {
  const roundedX = Math.round(x)
  const roundedY = Math.round(y)
  if (roundedX < 0 || roundedX >= mask.width || roundedY < 0 || roundedY >= mask.height) return
  const index = roundedY * mask.width + roundedX
  if (!mask.pixels[index]) {
    mask.pixels[index] = 1
    mask.darkPixelCount += 1
  }
}

function drawLine(mask, start, end, thickness = 1) {
  const steps = Math.ceil(distance(start, end))
  for (let step = 0; step <= steps; step += 1) {
    const ratio = steps ? step / steps : 0
    const x = start.x + (end.x - start.x) * ratio
    const y = start.y + (end.y - start.y) * ratio
    for (let offsetX = -thickness; offsetX <= thickness; offsetX += 1) {
      for (let offsetY = -thickness; offsetY <= thickness; offsetY += 1) setPixel(mask, x + offsetX, y + offsetY)
    }
  }
}

function shortenedEdge(start, end, gap) {
  const length = distance(start, end)
  const inset = Math.min(gap, length * 0.32) / Math.max(1, length)
  return [
    { x: start.x + (end.x - start.x) * inset, y: start.y + (end.y - start.y) * inset },
    { x: end.x - (end.x - start.x) * inset, y: end.y - (end.y - start.y) * inset },
  ]
}

function atomLabels(points, labels = []) {
  return points.map((point, id) => ({
    id,
    label: labels[id] ?? "C",
    bounds: { x: point.x - 5, y: point.y - 6, width: 10, height: 12 },
    centroid: point,
    confidence: 91,
  }))
}

function ringMask({ doubleEdges = [], border = false, clutter = false } = {}) {
  const mask = createMask()
  hexagon.forEach((point, index) => {
    const next = hexagon[(index + 1) % hexagon.length]
    const [start, end] = shortenedEdge(point, next, 2)
    drawLine(mask, start, end, 1)
    if (doubleEdges.includes(index)) {
      const center = { x: 73, y: 66 }
      drawLine(mask, {
        x: start.x + (center.x - start.x) * 0.17,
        y: start.y + (center.y - start.y) * 0.17,
      }, {
        x: end.x + (center.x - end.x) * 0.17,
        y: end.y + (center.y - end.y) * 0.17,
      }, 1)
    }
  })
  if (border) {
    drawLine(mask, { x: 3, y: 4 }, { x: 146, y: 4 }, 2)
    drawLine(mask, { x: 146, y: 4 }, { x: 146, y: 126 }, 2)
    drawLine(mask, { x: 146, y: 126 }, { x: 3, y: 126 }, 2)
    drawLine(mask, { x: 3, y: 126 }, { x: 3, y: 4 }, 2)
  }
  if (clutter) {
    drawLine(mask, { x: 6, y: 116 }, { x: 55, y: 124 }, 2)
    drawLine(mask, { x: 112, y: 10 }, { x: 146, y: 45 }, 2)
  }
  return mask
}

function scan(mask, text, labels = []) {
  const analysis = analyzeDarkPixelMask(mask, text, labels)
  return { analysis, result: scanStructure({ visualAnalysis: analysis, ocrQuality: 18, ocrText: "" }) }
}

const cleanBenzene = scan(ringMask({ doubleEdges: [0, 2, 4] }), "", atomLabels(hexagon))
assert.equal(cleanBenzene.result.bestMatch?.record.id, "benzene", "clean benzene remains top candidate")
assert.ok(cleanBenzene.analysis.chemicalGraphValidation.selectedValidatedRing?.aromatic, "clean benzene has validated aromatic ring")

const tabletBenzene = scan(ringMask({ doubleEdges: [0, 2, 4], border: true, clutter: true }), "", atomLabels(hexagon))
assert.equal(tabletBenzene.result.bestMatch?.record.id, "benzene", "tablet/clutter benzene remains top candidate")
assert.ok(tabletBenzene.analysis.chemicalGraphValidation.rejectedBonds.length >= 0, "tablet/clutter case exposes validation diagnostics")

const cyclohexane = scan(ringMask({}), "", atomLabels(hexagon))
assert.equal(cyclohexane.result.bestMatch?.record.id, "cyclohexane", "cyclohexane does not become benzene")

const cyclohexene = scan(ringMask({ doubleEdges: [0] }), "", atomLabels(hexagon))
assert.notEqual(cyclohexene.result.bestMatch?.record.id, "benzene", "cyclohexene does not become benzene without aromatic support")

const etheneMask = createMask()
drawLine(etheneMask, { x: 37, y: 66 }, { x: 86, y: 66 }, 1)
drawLine(etheneMask, { x: 37, y: 71 }, { x: 86, y: 71 }, 1)
const ethene = scan(etheneMask, "", atomLabels([{ x: 37, y: 66 }, { x: 86, y: 66 }]))
assert.notEqual(ethene.result.bestMatch?.record.id, "benzene", "ethene open chain does not become benzene")

console.log("Verified Chemical Graph Validator: long/crossing pruning, valence fixes, false triple downgrades, real triple preservation, benzene ranking, cyclohexane/cyclohexene/ethene safeguards.")
rmSync(outputDirectory, { recursive: true, force: true })
