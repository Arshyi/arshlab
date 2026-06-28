const assert = require("node:assert/strict")
const { rmSync } = require("node:fs")
const { tmpdir } = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

const root = path.resolve(__dirname, "..")
const outputDirectory = path.join(tmpdir(), "arshlab-bond-angle-engine-checks")
const tscPath = require.resolve("typescript/bin/tsc")

rmSync(outputDirectory, { recursive: true, force: true })
const compile = spawnSync(process.execPath, [
  tscPath,
  "lib/structure-vision/bond-angle-engine.ts",
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

const { analyzeBondAngles } = require(path.join(outputDirectory, "structure-vision", "bond-angle-engine.js"))

function node(id, x, y) {
  return { id, x, y, degree: 0, inferredElement: "C", confidence: 90, source: "atom-label", snappedSegmentIndexes: [] }
}

function bond(id, startNodeId, endNodeId) {
  return { id, startNodeId, endNodeId, bondOrder: 1, confidence: 90, sourceSegmentIndexes: [], parallelPairCount: 0, gapBridged: false }
}

function graph(nodes, bonds) {
  return {
    nodes,
    bonds,
    rings: [],
    aromatic: false,
    aromaticRingIds: [],
    estimates: { atoms: nodes.length, carbons: nodes.length, bonds: bonds.length, rings: 0, singleBonds: bonds.length, doubleBonds: 0, tripleBonds: 0, estimatedFormula: "C", confidence: 80 },
    warnings: [],
    atomCentered: true,
    snapRadius: 12,
  }
}

const trigonal = graph([node(0, 0, 0), node(1, 40, 0), node(2, -20, 34.64), node(3, -20, -34.64)], [bond(0, 0, 1), bond(1, 0, 2), bond(2, 0, 3)])
const trigonalAngles = analyzeBondAngles(trigonal)
assert.ok(trigonalAngles.idealGeometrySupport >= 82, `sp2-like geometry should score strongly, got ${trigonalAngles.idealGeometrySupport}`)

const linear = graph([node(0, 0, 0), node(1, -40, 0), node(2, 40, 0)], [bond(0, 0, 1), bond(1, 0, 2)])
const linearAngles = analyzeBondAngles(linear)
assert.equal(linearAngles.observations[0].nearestGeometry, "sp", "180 degree angle is classified as sp")

const impossible = graph([node(0, 0, 0), node(1, 40, 0), node(2, 42, 4), node(3, -5, 3)], [bond(0, 0, 1), bond(1, 0, 2), bond(2, 0, 3)])
const impossibleAngles = analyzeBondAngles(impossible)
assert.ok(impossibleAngles.impossibleGeometryPenalty > 0, "crowded impossible geometry receives a penalty")

console.log("Verified Bond Angle Engine: sp2-like, sp-like, and impossible local geometries.")
rmSync(outputDirectory, { recursive: true, force: true })
