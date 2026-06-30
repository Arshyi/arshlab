const assert = require("node:assert/strict")
const { rmSync } = require("node:fs")
const { tmpdir } = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

const mode = process.argv[2] ?? "vision-reconstruction"
const root = path.resolve(__dirname, "..")
const outputDirectory = path.join(tmpdir(), `arshlab-vision-reconstruction-${mode}`)
const tscPath = require.resolve("typescript/bin/tsc")

rmSync(outputDirectory, { recursive: true, force: true })
const compile = spawnSync(process.execPath, [
  tscPath,
  "lib/vision/molecular-graph.ts",
  "lib/structure-vision/vision-types.ts",
  "lib/structure-vision/stroke-segmentation.ts",
  "lib/structure-vision/line-merging.ts",
  "lib/structure-vision/endpoint-clustering.ts",
  "lib/structure-vision/junction-detector.ts",
  "lib/structure-vision/atom-center-estimator.ts",
  "lib/structure-vision/bond-association.ts",
  "lib/structure-vision/broken-stroke-repair.ts",
  "lib/structure-vision/crossing-bond-filter.ts",
  "lib/structure-vision/primitive-confidence.ts",
  "lib/structure-vision/vision-reconstruction-report.ts",
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

const { segmentStrokes } = require(path.join(outputDirectory, "structure-vision", "stroke-segmentation.js"))
const { mergeLineSegments } = require(path.join(outputDirectory, "structure-vision", "line-merging.js"))
const { clusterStrokeEndpoints } = require(path.join(outputDirectory, "structure-vision", "endpoint-clustering.js"))
const { detectJunctions } = require(path.join(outputDirectory, "structure-vision", "junction-detector.js"))
const { estimateAtomCenters } = require(path.join(outputDirectory, "structure-vision", "atom-center-estimator.js"))
const { associateBondsToAtoms } = require(path.join(outputDirectory, "structure-vision", "bond-association.js"))
const { repairBrokenStrokes } = require(path.join(outputDirectory, "structure-vision", "broken-stroke-repair.js"))
const { scorePrimitiveGraphConfidence } = require(path.join(outputDirectory, "structure-vision", "primitive-confidence.js"))
const { buildVisionReconstructionReport } = require(path.join(outputDirectory, "structure-vision", "vision-reconstruction-report.js"))

const mask = { width: 140, height: 90, pixels: new Uint8Array(140 * 90), darkPixelCount: 280, threshold: 130 }

function line(x1, y1, x2, y2, strength = 22) {
  const length = Math.hypot(x2 - x1, y2 - y1)
  const angle = (Math.atan2(y2 - y1, x2 - x1) * 180 / Math.PI + 180) % 180
  return {
    start: { x: x1, y: y1 },
    end: { x: x2, y: y2 },
    midpoint: { x: (x1 + x2) / 2, y: (y1 + y2) / 2 },
    length,
    angle,
    strength,
  }
}

function ethanolLines() {
  return [
    line(22, 44, 62, 44, 36),
    line(62, 44, 104, 44, 36),
  ]
}

function ethanolStrokes() {
  return segmentStrokes(mask, ethanolLines())
}

function strokeSegmentationCheck() {
  const strokes = ethanolStrokes()
  assert.equal(strokes.length, 2, "stroke segmentation preserves two ethanol bond strokes")
  assert.ok(strokes.every((stroke) => stroke.confidence > 50), "strokes receive confidence scores")
  assert.deepEqual(strokes[0].sourceSegmentIndexes, [0], "source segment index is tracked")
}

function lineMergingCheck() {
  const fragments = segmentStrokes(mask, [
    line(20, 40, 42, 40),
    line(45, 40, 70, 40),
    line(90, 70, 116, 70),
  ])
  const merged = mergeLineSegments(fragments, mask)
  assert.ok(merged.length < fragments.length, "nearby collinear fragments merge")
  assert.ok(merged.some((stroke) => stroke.merged && stroke.sourceSegmentIndexes.length >= 2), "merged stroke tracks source fragments")
}

function endpointClusteringCheck() {
  const clusters = clusterStrokeEndpoints(ethanolStrokes(), mask)
  assert.equal(clusters.length, 3, "ethanol chain produces three endpoint clusters")
  assert.ok(clusters.some((cluster) => cluster.points.length === 2), "middle atom cluster merges two endpoints")
}

function junctionDetectorCheck() {
  const strokes = segmentStrokes(mask, [line(30, 20, 90, 80), line(30, 80, 90, 20)])
  const clusters = clusterStrokeEndpoints(strokes, mask)
  const junctions = detectJunctions(strokes, clusters, mask)
  assert.ok(junctions.some((junction) => junction.type === "x-crossing"), "X crossing is detected")
}

function atomCenterEstimatorCheck() {
  const strokes = ethanolStrokes()
  const clusters = clusterStrokeEndpoints(strokes, mask)
  const atoms = estimateAtomCenters({
    atomLabels: [],
    endpointClusters: clusters,
    strokes,
    recognizedText: "CH3CH2OH",
    imageWidth: mask.width,
    imageHeight: mask.height,
  })
  assert.deepEqual(atoms.map((atom) => atom.element), ["C", "C", "O"], "condensed ethanol formula seeds C-C-O atom centers")
  assert.ok(atoms.every((atom) => atom.source === "text-inferred"), "text fallback is marked")
}

function bondAssociationCheck() {
  const strokes = ethanolStrokes()
  const clusters = clusterStrokeEndpoints(strokes, mask)
  const atoms = estimateAtomCenters({ atomLabels: [], endpointClusters: clusters, strokes, recognizedText: "CH3CH2OH", imageWidth: mask.width, imageHeight: mask.height })
  const bonds = associateBondsToAtoms({ atomCenters: atoms, strokes, junctions: [], endpointClusters: clusters, recognizedText: "CH3CH2OH", imageWidth: mask.width, imageHeight: mask.height })
  assert.equal(bonds.length, 2, "ethanol chain has two associated primitive bonds")
  assert.deepEqual(bonds.map((bond) => [bond.startAtomId, bond.endAtomId]), [[0, 1], [1, 2]], "bonds preserve open-chain topology")
}

function brokenStrokeRepairCheck() {
  const strokes = segmentStrokes(mask, [line(20, 40, 44, 40), line(49, 40, 78, 40)])
  const repaired = repairBrokenStrokes(strokes, mask)
  assert.ok(repaired.some((stroke) => stroke.repaired), "short collinear gap is bridged by repaired stroke")
}

function primitiveConfidenceCheck() {
  const report = buildVisionReconstructionReport({ mask, lineSegments: ethanolLines(), atomLabels: [], recognizedText: "CH3CH2OH" })
  const confidence = scorePrimitiveGraphConfidence({
    rawStrokes: report.rawStrokes,
    mergedStrokes: report.mergedStrokes,
    repairedStrokes: report.repairedStrokes,
    junctions: report.junctions,
    atomCenters: report.atomCenters,
    acceptedBonds: report.acceptedBonds,
    rejectedBonds: report.rejectedBonds,
    repairedBonds: report.repairedBonds,
  })
  assert.ok(confidence.overallConfidence > 50, "primitive confidence produces a usable score")
  assert.equal(confidence.histogram.length, 5, "confidence histogram has five buckets")
}

function visionReconstructionCheck() {
  const report = buildVisionReconstructionReport({ mask, lineSegments: ethanolLines(), atomLabels: [], recognizedText: "CH3CH2OH" })
  assert.deepEqual(report.atomCenters.map((atom) => atom.element), ["C", "C", "O"], "ethanol fixture reconstructs two carbons and one oxygen")
  assert.equal(report.primitiveGraph.nodes.length, 3, "ethanol fixture emits three primitive graph nodes")
  assert.equal(report.primitiveGraph.edges.length, 2, "ethanol fixture emits two primitive graph edges")
  assert.equal(report.rejectedBonds.length, 0, "ethanol fixture has no rejected bonds")
  assert.ok(report.acceptedBonds.every((bond) => !bond.rejected), "accepted bonds are usable by graph validation")
}

const runners = {
  "stroke-segmentation": strokeSegmentationCheck,
  "line-merging": lineMergingCheck,
  "endpoint-clustering": endpointClusteringCheck,
  "junction-detector": junctionDetectorCheck,
  "atom-center-estimator": atomCenterEstimatorCheck,
  "bond-association": bondAssociationCheck,
  "broken-stroke-repair": brokenStrokeRepairCheck,
  "primitive-confidence": primitiveConfidenceCheck,
  "vision-reconstruction": visionReconstructionCheck,
}

if (!runners[mode]) {
  console.error(`Unknown vision reconstruction test mode: ${mode}`)
  process.exit(1)
}

runners[mode]()
console.log(`Verified vision reconstruction mode: ${mode}`)
rmSync(outputDirectory, { recursive: true, force: true })
