const assert = require("node:assert/strict")
const { rmSync } = require("node:fs")
const { tmpdir } = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

const root = path.resolve(__dirname, "..")
const outputDirectory = path.join(tmpdir(), "arshlab-ring-closure-checks")
const tscPath = require.resolve("typescript/bin/tsc")

rmSync(outputDirectory, { recursive: true, force: true })
const compile = spawnSync(process.execPath, [
  tscPath,
  "lib/structure-vision/vision-types.ts",
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

const { analyzeDarkPixelMask } = require(path.join(outputDirectory, "structure-vision", "shape-heuristics.js"))
const { scanStructure } = require(path.join(outputDirectory, "structure-scanner", "scanner-engine.js"))

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
  const inset = Math.min(gap, length * 0.32) / Math.max(1, length)
  return [
    { x: start.x + (end.x - start.x) * inset, y: start.y + (end.y - start.y) * inset },
    { x: end.x - (end.x - start.x) * inset, y: end.y - (end.y - start.y) * inset },
  ]
}

const hexagon = [
  { x: 30, y: 66 },
  { x: 51, y: 30 },
  { x: 93, y: 30 },
  { x: 116, y: 66 },
  { x: 94, y: 101 },
  { x: 52, y: 101 },
]

function atomLabels(points, labels = []) {
  return points.map((point, id) => ({
    id,
    label: labels[id] ?? "C",
    bounds: { x: point.x - 5, y: point.y - 6, width: 10, height: 12 },
    centroid: point,
    confidence: 91,
  }))
}

function ringMask({ points = hexagon, gap = 2, missingEdge = -1, doubleEdges = [], clutter = false, border = false } = {}) {
  const mask = createMask()
  points.forEach((point, index) => {
    if (index === missingEdge) return
    const next = points[(index + 1) % points.length]
    const [start, end] = shortenedEdge(point, next, gap)
    drawLine(mask, start, end, 1)
    if (doubleEdges.includes(index)) {
      const center = { x: 73, y: 66 }
      const offsetScale = 0.17
      drawLine(mask, {
        x: start.x + (center.x - start.x) * offsetScale,
        y: start.y + (center.y - start.y) * offsetScale,
      }, {
        x: end.x + (center.x - end.x) * offsetScale,
        y: end.y + (center.y - end.y) * offsetScale,
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
    drawLine(mask, { x: 7, y: 112 }, { x: 44, y: 120 }, 2)
    drawLine(mask, { x: 115, y: 14 }, { x: 145, y: 42 }, 2)
    drawLine(mask, { x: 12, y: 16 }, { x: 23, y: 43 }, 2)
  }
  return mask
}

function openChainMask(points, doubleFirst = true) {
  const mask = createMask()
  for (let index = 0; index < points.length - 1; index += 1) {
    drawLine(mask, points[index], points[index + 1], 1)
    if (doubleFirst && index === 0) drawLine(mask, { x: points[index].x, y: points[index].y + 5 }, { x: points[index + 1].x, y: points[index + 1].y + 5 }, 1)
  }
  return mask
}

function scan(mask, text, labels = []) {
  const analysis = analyzeDarkPixelMask(mask, text, labels)
  return { analysis, result: scanStructure({ visualAnalysis: analysis, ocrQuality: 18, ocrText: "" }) }
}

const cleanBenzene = scan(ringMask({ doubleEdges: [0, 2, 4] }), "", atomLabels(hexagon))
assert.ok(cleanBenzene.analysis.ringClosure.candidates.some((candidate) => candidate.memberCount === 6), "clean benzene closure candidate")
assert.equal(cleanBenzene.result.bestMatch?.record.id, "benzene", "clean benzene ranks benzene")
assert.ok(cleanBenzene.result.confidenceBreakdown.ring > 0, "clean benzene has nonzero ring confidence")

const glareBenzene = scan(ringMask({ doubleEdges: [0, 2, 4], clutter: true }), "", atomLabels(hexagon))
assert.equal(glareBenzene.result.bestMatch?.record.id, "benzene", "camera benzene with glare/clutter ranks benzene")

const tabletBenzene = scan(ringMask({ doubleEdges: [0, 2, 4], border: true }), "", atomLabels(hexagon))
assert.equal(tabletBenzene.result.bestMatch?.record.id, "benzene", "tablet-border benzene ranks benzene")

const missingEdgeBenzene = scan(ringMask({ doubleEdges: [0, 2, 4], missingEdge: 5 }), "", atomLabels(hexagon))
const recovered = missingEdgeBenzene.analysis.ringClosure.candidates.find((candidate) => candidate.selected)
const shapeRecoveredGap = (missingEdgeBenzene.analysis.globalShapeReconstruction.acceptedPolygon?.missingEdges.length ?? 0) > 0
assert.ok(recovered?.recovered || recovered?.closureGaps.length || shapeRecoveredGap, "missing-edge benzene recovers or pre-fills a closure gap")
assert.equal(missingEdgeBenzene.result.bestMatch?.record.id, "benzene", "missing-edge benzene ranks benzene")

const handClutterBenzene = scan(ringMask({ doubleEdges: [0, 2, 4], missingEdge: 5, clutter: true, border: true }), "", atomLabels(hexagon))
assert.equal(handClutterBenzene.result.bestMatch?.record.id, "benzene", "hand/arm clutter benzene ranks benzene")

const cyclohexane = scan(ringMask({}), "", atomLabels(hexagon))
assert.equal(cyclohexane.result.bestMatch?.record.id, "cyclohexane", "cyclohexane remains saturated ring")

const cyclohexene = scan(ringMask({ doubleEdges: [0] }), "", atomLabels(hexagon))
assert.notEqual(cyclohexene.result.bestMatch?.record.id, "benzene", "cyclohexene-like one-double-bond ring is not benzene")

const ethene = scan(openChainMask([{ x: 37, y: 66 }, { x: 86, y: 66 }]), "", atomLabels([{ x: 37, y: 66 }, { x: 86, y: 66 }]))
assert.equal(ethene.analysis.ringClosure.candidates.length, 0, "ethene open chain has no ring closure")
assert.notEqual(ethene.result.bestMatch?.record.id, "benzene", "ethene does not become benzene")

const propene = scan(openChainMask([{ x: 28, y: 70 }, { x: 72, y: 45 }, { x: 112, y: 72 }]), "", atomLabels([{ x: 28, y: 70 }, { x: 72, y: 45 }, { x: 112, y: 72 }]))
assert.equal(propene.analysis.ringClosure.candidates.length, 0, "propene open chain has no ring closure")
assert.notEqual(propene.result.bestMatch?.record.id, "benzene", "propene does not become benzene")

const pyridineLabels = ["N", "C", "C", "C", "C", "C"]
const pyridine = scan(ringMask({ doubleEdges: [0, 2, 4] }), "", atomLabels(hexagon, pyridineLabels))
assert.ok(pyridine.analysis.ringClosure.candidates.some((candidate) => candidate.memberCount === 6), "pyridine-like ring closes")
assert.notEqual(pyridine.result.bestMatch?.record.id, "benzene", "pyridine heteroatom safeguard prevents benzene overmatch")

const fused = createMask(200, 135)
const secondHexagon = hexagon.map((point) => ({ x: point.x + 55, y: point.y }))
for (const points of [hexagon, secondHexagon]) {
  points.forEach((point, index) => {
    const next = points[(index + 1) % points.length]
    const [start, end] = shortenedEdge(point, next, 2)
    drawLine(fused, start, end, 1)
    if ([0, 2, 4].includes(index)) {
      const center = { x: average(points.map((item) => item.x)), y: average(points.map((item) => item.y)) }
      drawLine(fused, {
        x: start.x + (center.x - start.x) * 0.16,
        y: start.y + (center.y - start.y) * 0.16,
      }, {
        x: end.x + (center.x - end.x) * 0.16,
        y: end.y + (center.y - end.y) * 0.16,
      }, 1)
    }
  })
}
const fusedAnalysis = analyzeDarkPixelMask(fused, "fused aromatic placeholder", atomLabels([...hexagon, ...secondHexagon]))
assert.ok(fusedAnalysis.ringClosure.candidates.length >= 1, "naphthalene/fused-ring preparation detects at least one closure candidate")

function average(values) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length)
}

console.log("Verified Ring Closure Engine regressions: clean benzene, camera glare, tablet border, missing edge, hand clutter, cyclohexane, cyclohexene, ethene, propene, pyridine, and fused-ring prep.")
rmSync(outputDirectory, { recursive: true, force: true })
