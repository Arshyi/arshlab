const assert = require("node:assert/strict")
const { rmSync } = require("node:fs")
const { tmpdir } = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")
const expectedOverlaySnapshots = require("./fixtures/vision-overlay-snapshots.json")

const root = path.resolve(__dirname, "..")
const outputDirectory = path.join(tmpdir(), "arshlab-structure-vision-checks")
const tscPath = require.resolve("typescript/bin/tsc")

rmSync(outputDirectory, { recursive: true, force: true })
const compile = spawnSync(
  process.execPath,
  [
    tscPath,
    "lib/structure-vision/vision-types.ts",
    "lib/structure-vision/shape-heuristics.ts",
    "lib/structure-scanner/scanner-engine.ts",
    "lib/structure-scanner/scanner-database.ts",
    "lib/structure-scanner/scanner-types.ts",
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

const { analyzeDarkPixelMask, calibrateBenzeneCandidate } = require(path.join(outputDirectory, "structure-vision", "shape-heuristics.js"))
const { scanStructure } = require(path.join(outputDirectory, "structure-scanner", "scanner-engine.js"))

function createMask(width = 120, height = 100) {
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

function drawLine(mask, start, end, thickness = 2) {
  const steps = Math.ceil(Math.hypot(end.x - start.x, end.y - start.y))
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
  const length = Math.hypot(end.x - start.x, end.y - start.y)
  const inset = Math.min(gap, length * 0.3) / Math.max(1, length)
  return [
    { x: start.x + (end.x - start.x) * inset, y: start.y + (end.y - start.y) * inset },
    { x: end.x - (end.x - start.x) * inset, y: end.y - (end.y - start.y) * inset },
  ]
}

function polygonMask(points, { gap = 0, missingEdge = -1, doubleEdges = [] } = {}) {
  const mask = createMask()
  points.forEach((point, index) => {
    if (index === missingEdge) return
    const next = points[(index + 1) % points.length]
    const [start, end] = shortenedEdge(point, next, gap)
    drawLine(mask, start, end, 1)
    if (doubleEdges.includes(index)) {
      const center = { x: 60, y: 50 }
      const offsetScale = 0.16
      drawLine(mask, {
        x: start.x + (center.x - start.x) * offsetScale,
        y: start.y + (center.y - start.y) * offsetScale,
      }, {
        x: end.x + (center.x - end.x) * offsetScale,
        y: end.y + (center.y - end.y) * offsetScale,
      }, 1)
    }
  })
  return mask
}

const hexagonPoints = [
  { x: 26, y: 50 }, { x: 44, y: 20 }, { x: 80, y: 18 },
  { x: 102, y: 49 }, { x: 82, y: 81 }, { x: 46, y: 79 },
]

const pentagonPoints = [
  { x: 60, y: 16 }, { x: 101, y: 46 }, { x: 85, y: 86 },
  { x: 36, y: 84 }, { x: 19, y: 45 },
]

function benzeneMask() {
  const mask = createMask()
  const points = [
    { x: 28, y: 50 }, { x: 47, y: 20 }, { x: 82, y: 20 },
    { x: 101, y: 50 }, { x: 82, y: 80 }, { x: 47, y: 80 },
  ]
  points.forEach((point, index) => drawLine(mask, point, points[(index + 1) % points.length], 1))
  drawLine(mask, { x: 50, y: 25 }, { x: 79, y: 25 }, 1)
  drawLine(mask, { x: 94, y: 51 }, { x: 79, y: 75 }, 1)
  drawLine(mask, { x: 45, y: 74 }, { x: 31, y: 52 }, 1)
  return mask
}

function formaldehydeMask() {
  const mask = createMask()
  drawLine(mask, { x: 42, y: 47 }, { x: 86, y: 47 }, 1)
  drawLine(mask, { x: 42, y: 54 }, { x: 86, y: 54 }, 1)
  drawLine(mask, { x: 42, y: 50 }, { x: 20, y: 30 }, 1)
  drawLine(mask, { x: 42, y: 50 }, { x: 20, y: 72 }, 1)
  return mask
}

function ethanolMask() {
  const mask = createMask()
  drawLine(mask, { x: 18, y: 62 }, { x: 45, y: 36 }, 1)
  drawLine(mask, { x: 45, y: 36 }, { x: 75, y: 62 }, 1)
  drawLine(mask, { x: 75, y: 62 }, { x: 103, y: 62 }, 1)
  return mask
}

const benzene = analyzeDarkPixelMask(benzeneMask(), "C6H6 aromatic benzene")
assert.ok(benzene.lineSegments.length >= 5, "benzene lines detected")
assert.ok(benzene.closedLoops.length >= 1, "benzene loop detected")
assert.equal(benzene.candidates[0]?.compoundId, "benzene", "benzene visual candidate")

const methanal = analyzeDarkPixelMask(formaldehydeMask(), "H2C=O formaldehyde")
assert.ok(methanal.parallelLinePairs >= 1, "formaldehyde double line detected")
assert.equal(methanal.candidates[0]?.compoundId, "methanal", "methanal visual candidate")

const ethanol = analyzeDarkPixelMask(ethanolMask(), "CH3CH2OH C-C-O-H")
assert.ok(ethanol.simpleChainLength >= 2, "ethanol chain detected")
assert.equal(ethanol.candidates[0]?.compoundId, "ethanol", "ethanol visual candidate")

const empty = analyzeDarkPixelMask(createMask(), "")
assert.equal(empty.isUncertain, true, "empty image remains uncertain")
assert.equal(empty.candidates.length, 0, "empty image has no candidate")

const imperfectBenzene = analyzeDarkPixelMask(polygonMask(hexagonPoints, { gap: 4 }), "C6H6 benzene")
assert.equal(imperfectBenzene.closedLoops.length, 0, "gapped benzene does not require a pixel loop")
assert.ok(imperfectBenzene.graph.cycleCandidates.length + imperfectBenzene.graph.nearRingCandidates.length >= 1, "gapped benzene graph ring")
assert.equal(imperfectBenzene.candidates[0]?.compoundId, "benzene", "gapped benzene candidate")

const alternatingBenzene = analyzeDarkPixelMask(
  polygonMask(hexagonPoints, { gap: 2, doubleEdges: [0, 2, 4] }),
  "aromatic",
)
assert.ok(alternatingBenzene.parallelLinePairs >= 2, "alternating double-bond cues")
assert.equal(alternatingBenzene.candidates[0]?.compoundId, "benzene", "alternating benzene candidate")

const atomCenteredCameraBenzene = analyzeDarkPixelMask(
  polygonMask(hexagonPoints, { gap: 2, doubleEdges: [0, 2, 4] }),
  "",
  hexagonPoints.map((point, id) => ({
    id,
    label: "C",
    bounds: { x: point.x - 5, y: point.y - 6, width: 10, height: 12 },
    centroid: point,
    confidence: 90,
  })),
)
assert.equal(atomCenteredCameraBenzene.molecularGraph.atomCentered, true, "camera benzene atom-centered mode")
assert.equal(atomCenteredCameraBenzene.molecularGraph.estimates.carbons, 6, "camera benzene carbon atoms")
assert.equal(atomCenteredCameraBenzene.molecularGraph.bonds.length, 6, "camera benzene ring edges")
assert.ok(atomCenteredCameraBenzene.graph.cycleCandidates.length >= 1, "camera benzene promoted cycle candidate")
assert.ok(atomCenteredCameraBenzene.graph.aromaticCueScore > 0, "camera benzene aromatic evidence")
assert.equal(atomCenteredCameraBenzene.candidates[0]?.compoundId, "benzene", "camera benzene top visual candidate without hints")

const cyclohexane = analyzeDarkPixelMask(polygonMask(hexagonPoints, { gap: 3 }), "")
assert.ok(cyclohexane.ringCandidates.some((ring) => ring.sidesEstimate === 6), "cyclohexane ring detected")
assert.equal(cyclohexane.candidates[0]?.compoundId, "cyclohexane", "saturated ring prefers cyclohexane")
const cyclohexaneBenzene = cyclohexane.candidates.find((candidate) => candidate.compoundId === "benzene")
assert.ok(!cyclohexaneBenzene || cyclohexaneBenzene.score < 45, "saturated ring does not overclaim benzene")

const fiveMemberRing = analyzeDarkPixelMask(polygonMask(pentagonPoints, { gap: 3 }), "")
assert.ok(fiveMemberRing.ringCandidates.some((ring) => ring.sidesEstimate === 5), "five-membered ring detected")

const incompleteBenzene = analyzeDarkPixelMask(
  polygonMask(hexagonPoints, { gap: 3, missingEdge: 5, doubleEdges: [0, 2, 4] }),
  "benzene aromatic C6H6",
)
assert.ok(incompleteBenzene.graph.nearRingCandidates.length >= 1, "missing-edge near-ring detected")
assert.equal(incompleteBenzene.candidates[0]?.compoundId, "benzene", "missing-edge benzene candidate")

const openChain = createMask()
drawLine(openChain, { x: 12, y: 54 }, { x: 45, y: 30 }, 1)
drawLine(openChain, { x: 14, y: 60 }, { x: 47, y: 36 }, 1)
drawLine(openChain, { x: 45, y: 30 }, { x: 78, y: 55 }, 1)
drawLine(openChain, { x: 78, y: 55 }, { x: 108, y: 30 }, 1)
const nonRing = analyzeDarkPixelMask(openChain, "alkene chain")
assert.equal(nonRing.ringCandidates.length, 0, "parallel open chain is not a ring")
assert.ok(!nonRing.candidates.some((candidate) => candidate.compoundId === "benzene"), "parallel open chain is not benzene")

const observedRing = {
  ...incompleteBenzene.ringCandidates[0],
  sidesEstimate: 7,
  confidence: 66,
  nearRing: true,
  source: "graph-near-cycle",
  doubleBondCue: 100,
  aromaticCueScore: 0,
}
const observedCandidate = calibrateBenzeneCandidate(observedRing, 7, 65, "benzene C6H6 ring")
assert.ok(observedCandidate, "observed debug case produces a benzene candidate")
assert.equal(observedCandidate.compoundId, "benzene", "observed debug case prefers benzene")
assert.equal(observedCandidate.label, "Likely benzene / aromatic ring", "moderate aromatic ring label")
assert.ok(observedCandidate.score > 33, "observed visual score improves above 33")
assert.ok(
  observedCandidate.reasons.includes("Aromatic support detected from parallel/double-bond strokes."),
  "observed case explains aromatic support",
)
assert.ok(!observedCandidate.scoreBreakdown.some((entry) => entry.label === "Aromatic support missing"), "debug reason is calibrated")

const observedAnalysis = {
  ...incompleteBenzene,
  lineSegments: benzene.lineSegments.slice(0, 28),
  parallelLinePairs: 7,
  ringCandidates: [observedRing],
  candidates: [observedCandidate],
  visualConfidence: observedCandidate.score,
  graph: {
    ...incompleteBenzene.graph,
    nodes: Array.from({ length: 7 }, (_, id) => ({ id })),
    edges: Array.from({ length: 9 }, (_, id) => ({ id })),
    nearRingCandidates: [observedRing, { ...observedRing, nodeIds: [...observedRing.nodeIds].reverse() }],
    cycleCandidates: [],
    bestRingConfidence: 66,
    aromaticCueScore: 65,
  },
}
assert.equal(observedAnalysis.lineSegments.length, 28, "observed line count")
assert.equal(observedAnalysis.graph.nodes.length, 7, "observed graph node count")
assert.equal(observedAnalysis.graph.edges.length, 9, "observed graph edge count")
assert.equal(observedAnalysis.graph.nearRingCandidates.length, 2, "observed near-ring count")
const observedScan = scanStructure({ moleculeName: "benzene", visualAnalysis: observedAnalysis })
assert.equal(observedScan.bestMatch?.record.id, "benzene", "combined scan prefers benzene")
assert.ok(observedScan.bestMatch.confidence >= 70 && observedScan.bestMatch.confidence <= 85, "visual plus hint reaches calibrated confidence")

function overlaySnapshot(analysis) {
  return {
    lines: analysis.lineSegments.length,
    endpoints: analysis.lineSegments.length * 2,
    graphNodes: analysis.graph.nodes.length,
    graphEdges: analysis.graph.edges.length,
    cycles: analysis.graph.cycleCandidates.length,
    nearRings: analysis.graph.nearRingCandidates.length,
    selectedRingMembers: analysis.ringCandidates[0]?.sidesEstimate ?? 0,
    selectedRingConfidence: analysis.ringCandidates[0]?.confidence ?? 0,
    parallelPairs: analysis.parallelBondPairs.length,
    aromaticCueScore: analysis.graph.aromaticCueScore,
    functionalCues: analysis.functionalGroupCues.map((cue) => cue.kind),
    topCandidate: analysis.candidates[0]?.compoundId ?? null,
    topVisualScore: analysis.candidates[0]?.score ?? 0,
  }
}

const overlaySnapshots = {
  handDrawnBenzene: overlaySnapshot(benzene),
  imperfectBenzene: overlaySnapshot(imperfectBenzene),
  cyclohexane: overlaySnapshot(cyclohexane),
  pentagonalRing: overlaySnapshot(fiveMemberRing),
  incompleteBenzene: overlaySnapshot(incompleteBenzene),
  ethanolSkeleton: overlaySnapshot(ethanol),
  carbonylExample: overlaySnapshot(methanal),
}
assert.deepEqual(overlaySnapshots, expectedOverlaySnapshots, "visual overlay metric snapshots")

console.log(`Benzene: ${benzene.lineSegments.length} lines, ${benzene.closedLoops.length} loop, score ${benzene.candidates[0].score}`)
console.log(`Methanal: ${methanal.parallelLinePairs} parallel pair(s), score ${methanal.candidates[0].score}`)
console.log(`Ethanol: ${ethanol.simpleChainLength}-atom chain, score ${ethanol.candidates[0].score}`)
console.log(`Fuzzy rings: ${imperfectBenzene.graph.cycleCandidates.length} cycles, ${incompleteBenzene.graph.nearRingCandidates.length} near-rings`)
console.log(`Observed calibration: ${observedCandidate.score} visual / ${observedScan.bestMatch.confidence}% final confidence`)
console.log(`Verified ${Object.keys(overlaySnapshots).length} visual overlay snapshots.`)
console.log("Verified 7 ring-calibration cases, 3 structure drawings, and the uncertain-image fallback.")
rmSync(outputDirectory, { recursive: true, force: true })
