const assert = require("node:assert/strict")
const { rmSync } = require("node:fs")
const { tmpdir } = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

const root = path.resolve(__dirname, "..")
const outputDirectory = path.join(tmpdir(), "arshlab-global-shape-reconstruction-checks")
const tscPath = require.resolve("typescript/bin/tsc")

rmSync(outputDirectory, { recursive: true, force: true })
const compile = spawnSync(process.execPath, [
  tscPath,
  "lib/structure-vision/global-shape-reconstruction.ts",
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

const { reconstructGlobalShape } = require(path.join(outputDirectory, "structure-vision", "global-shape-reconstruction.js"))

function segment(start, end, strength = 20) {
  const length = Math.hypot(end.x - start.x, end.y - start.y)
  return {
    start,
    end,
    midpoint: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
    length,
    angle: (Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI + 180) % 180,
    strength,
  }
}

function polygonPoints(sides, center = { x: 100, y: 90 }, radius = 48, rotation = Math.PI / 6) {
  return Array.from({ length: sides }, (_, index) => ({
    x: center.x + Math.cos(rotation + Math.PI * 2 * index / sides) * radius,
    y: center.y + Math.sin(rotation + Math.PI * 2 * index / sides) * radius,
  }))
}

function polygonSegments(sides, options = {}) {
  const points = polygonPoints(sides, options.center, options.radius ?? 48, options.rotation ?? Math.PI / 6)
  const output = []
  for (let index = 0; index < sides; index += 1) {
    if ((options.missingEdges ?? []).includes(index)) continue
    const start = points[index]
    const end = points[(index + 1) % sides]
    if (options.fragmented) {
      output.push(segment(start, { x: start.x + (end.x - start.x) * 0.43, y: start.y + (end.y - start.y) * 0.43 }))
      output.push(segment({ x: start.x + (end.x - start.x) * 0.57, y: start.y + (end.y - start.y) * 0.57 }, end))
    } else if (options.gap) {
      output.push(segment({ x: start.x + (end.x - start.x) * 0.08, y: start.y + (end.y - start.y) * 0.08 }, { x: start.x + (end.x - start.x) * 0.92, y: start.y + (end.y - start.y) * 0.92 }))
    } else {
      output.push(segment(start, end))
    }
  }
  return output
}

function loopFor(center = { x: 100, y: 90 }, radius = 48) {
  return {
    bounds: { x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2 },
    center,
    holeArea: radius * radius,
    aspectRatio: 1,
  }
}

function run(label, lineSegments, closedLoops = [], width = 220, height = 180) {
  const result = reconstructGlobalShape({ lineSegments, closedLoops, imageWidth: width, imageHeight: height })
  assert.ok(result.mergedStrokes.length > 0 || lineSegments.length === 0, `${label}: merged strokes`)
  return result
}

const perfectBenzene = run("perfect benzene", polygonSegments(6), [loopFor()])
assert.equal(perfectBenzene.acceptedPolygon?.sides, 6, "perfect benzene accepts six-member polygon")
assert.ok(perfectBenzene.polygonConfidence >= 52, "perfect benzene polygon confidence")

const rotatedBenzene = run("rotated benzene", polygonSegments(6, { rotation: Math.PI / 3 }), [loopFor()])
assert.equal(rotatedBenzene.acceptedPolygon?.sides, 6, "rotated benzene accepts six-member polygon")

const perspectiveBenzene = run("perspective benzene", polygonSegments(6, { center: { x: 110, y: 88 }, radius: 44 }), [loopFor({ x: 110, y: 88 }, 44)])
assert.equal(perspectiveBenzene.acceptedPolygon?.sides, 6, "perspective benzene accepts six-member polygon")

const partial = run("partially missing edge", polygonSegments(6, { missingEdges: [2] }), [loopFor()])
assert.equal(partial.acceptedPolygon?.sides, 6, "one missing edge is recovered from polygon support")
assert.ok(partial.acceptedPolygon.missingEdges.length >= 1, "missing edge recorded")

const fragmented = run("fragmented bonds", polygonSegments(6, { fragmented: true }), [loopFor()])
assert.ok(fragmented.mergedStrokes.length < fragmented.originalSegments.length, "fragmented bonds are clustered into fewer strokes")

const smallGaps = run("small scan gaps", polygonSegments(6, { gap: true }), [loopFor()])
assert.equal(smallGaps.acceptedPolygon?.sides, 6, "small gaps still recover polygon")

const tabletBorder = run("tablet border", [
  segment({ x: 0, y: 8 }, { x: 219, y: 8 }, 60),
  segment({ x: 0, y: 172 }, { x: 219, y: 172 }, 60),
  ...polygonSegments(6),
], [loopFor()])
assert.equal(tabletBorder.acceptedPolygon?.sides, 6, "tablet borders are rejected while chemistry polygon remains")

const clutter = run("background clutter", [
  segment({ x: 5, y: 10 }, { x: 210, y: 160 }),
  segment({ x: 10, y: 155 }, { x: 210, y: 30 }),
  segment({ x: 30, y: 20 }, { x: 190, y: 24 }),
], [])
assert.equal(clutter.acceptedPolygon, null, "background clutter does not become a polygon")

const cyclohexane = run("cyclohexane", polygonSegments(6), [loopFor()])
assert.equal(cyclohexane.acceptedPolygon?.sides, 6, "cyclohexane six-member shape recovered")

const cyclopentane = run("cyclopentane", polygonSegments(5, { rotation: -Math.PI / 2 }), [loopFor()])
assert.equal(cyclopentane.acceptedPolygon?.sides, 5, "cyclopentane five-member shape recovered")

const acyclicChain = run("acyclic chain", [
  segment({ x: 40, y: 90 }, { x: 82, y: 70 }),
  segment({ x: 82, y: 70 }, { x: 126, y: 90 }),
  segment({ x: 126, y: 90 }, { x: 168, y: 72 }),
], [])
assert.equal(acyclicChain.acceptedPolygon, null, "acyclic chain remains open")

console.log("Verified Global Shape Reconstruction: perfect/rotated/perspective benzene, missing edge, fragmented bonds, scan gaps, tablet border rejection, clutter rejection, cyclohexane, cyclopentane, and acyclic chain safeguards.")
rmSync(outputDirectory, { recursive: true, force: true })
