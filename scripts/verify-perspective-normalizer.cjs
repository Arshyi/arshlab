const assert = require("node:assert/strict")
const { rmSync } = require("node:fs")
const { tmpdir } = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

const root = path.resolve(__dirname, "..")
const outputDirectory = path.join(tmpdir(), "arshlab-perspective-normalizer-checks")
const tscPath = require.resolve("typescript/bin/tsc")

rmSync(outputDirectory, { recursive: true, force: true })
const compile = spawnSync(process.execPath, [
  tscPath,
  "lib/structure-vision/perspective-normalizer.ts",
  "lib/structure-vision/isolation-types.ts",
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

const { analyzePerspectiveNormalization } = require(path.join(outputDirectory, "perspective-normalizer.js"))

function image(width = 220, height = 160, color = [132, 132, 132]) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let i = 0; i < width * height; i += 1) {
    data[i * 4] = color[0]
    data[i * 4 + 1] = color[1]
    data[i * 4 + 2] = color[2]
    data[i * 4 + 3] = 255
  }
  return { width, height, data }
}

function setPixel(img, x, y, color) {
  x = Math.round(x)
  y = Math.round(y)
  if (x < 0 || x >= img.width || y < 0 || y >= img.height) return
  const offset = (y * img.width + x) * 4
  img.data[offset] = color[0]
  img.data[offset + 1] = color[1]
  img.data[offset + 2] = color[2]
  img.data[offset + 3] = 255
}

function pointInPolygon(point, polygon) {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const pi = polygon[i]
    const pj = polygon[j]
    const denominator = pj.y - pi.y || 1e-6
    const intersects = ((pi.y > point.y) !== (pj.y > point.y)) &&
      point.x < ((pj.x - pi.x) * (point.y - pi.y)) / denominator + pi.x
    if (intersects) inside = !inside
  }
  return inside
}

function fillPolygon(img, polygon, color) {
  const minX = Math.max(0, Math.floor(Math.min(...polygon.map((point) => point.x))))
  const maxX = Math.min(img.width - 1, Math.ceil(Math.max(...polygon.map((point) => point.x))))
  const minY = Math.max(0, Math.floor(Math.min(...polygon.map((point) => point.y))))
  const maxY = Math.min(img.height - 1, Math.ceil(Math.max(...polygon.map((point) => point.y))))
  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      if (pointInPolygon({ x, y }, polygon)) setPixel(img, x, y, color)
    }
  }
}

function drawLine(img, start, end, color = [20, 20, 20], thickness = 1) {
  const steps = Math.ceil(Math.hypot(end.x - start.x, end.y - start.y))
  for (let step = 0; step <= steps; step += 1) {
    const ratio = steps ? step / steps : 0
    const x = start.x + (end.x - start.x) * ratio
    const y = start.y + (end.y - start.y) * ratio
    for (let ox = -thickness; ox <= thickness; ox += 1) {
      for (let oy = -thickness; oy <= thickness; oy += 1) setPixel(img, x + ox, y + oy, color)
    }
  }
}

function addBenzene(img, center = { x: 110, y: 78 }, radius = 30) {
  const points = Array.from({ length: 6 }, (_, index) => {
    const angle = Math.PI / 6 + index * Math.PI / 3
    return { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius }
  })
  points.forEach((point, index) => drawLine(img, point, points[(index + 1) % points.length]))
  ;[0, 2, 4].forEach((index) => {
    const start = points[index]
    const end = points[(index + 1) % points.length]
    drawLine(img, {
      x: start.x + (center.x - start.x) * 0.16,
      y: start.y + (center.y - start.y) * 0.16,
    }, {
      x: end.x + (center.x - end.x) * 0.16,
      y: end.y + (center.y - end.y) * 0.16,
    })
  })
}

function addSimpleChain(img, start = { x: 72, y: 78 }) {
  drawLine(img, start, { x: start.x + 38, y: start.y - 18 })
  drawLine(img, { x: start.x + 38, y: start.y - 18 }, { x: start.x + 75, y: start.y + 5 })
  drawLine(img, { x: start.x + 75, y: start.y + 5 }, { x: start.x + 104, y: start.y - 15 })
}

function scene({ tilted = false, hand = false, glare = false, bezel = false, partial = false, chemistry = "benzene" } = {}) {
  const img = image()
  if (hand) fillPolygon(img, [{ x: 0, y: 110 }, { x: 88, y: 100 }, { x: 102, y: 160 }, { x: 0, y: 160 }], [194, 135, 105])
  const paper = partial
    ? [{ x: 0, y: 30 }, { x: 172, y: 20 }, { x: 185, y: 135 }, { x: 0, y: 145 }]
    : tilted
      ? [{ x: 42, y: 24 }, { x: 184, y: 38 }, { x: 170, y: 132 }, { x: 28, y: 118 }]
      : [{ x: 40, y: 25 }, { x: 180, y: 25 }, { x: 180, y: 132 }, { x: 40, y: 132 }]
  if (bezel) fillPolygon(img, paper.map((point) => ({ x: point.x + (point.x < 110 ? -7 : 7), y: point.y + (point.y < 80 ? -7 : 7) })), [20, 20, 24])
  fillPolygon(img, paper, [238, 239, 235])
  if (chemistry === "benzene") addBenzene(img)
  if (chemistry === "ethanol") addSimpleChain(img)
  if (chemistry === "methanal") {
    drawLine(img, { x: 82, y: 78 }, { x: 136, y: 78 })
    drawLine(img, { x: 82, y: 84 }, { x: 136, y: 84 })
    drawLine(img, { x: 82, y: 80 }, { x: 58, y: 58 })
    drawLine(img, { x: 82, y: 80 }, { x: 58, y: 104 })
  }
  if (glare) fillPolygon(img, [{ x: 124, y: 34 }, { x: 170, y: 42 }, { x: 154, y: 62 }, { x: 116, y: 55 }], [255, 255, 255])
  return img
}

function assertCanvasDetected(label, img) {
  const analysis = analyzePerspectiveNormalization(img)
  assert.ok(analysis.confidence >= 46, `${label}: perspective confidence ${analysis.confidence}; ${JSON.stringify(analysis.candidates.slice(0, 2))}`)
  assert.ok(analysis.selectedQuadrilateral, `${label}: selected quadrilateral`)
  assert.equal(analysis.usedFallback, false, `${label}: no fallback`)
  return analysis
}

assertCanvasDetected("clean benzene screenshot", scene())
assertCanvasDetected("tilted tablet benzene", scene({ tilted: true, bezel: true }))
assertCanvasDetected("tablet benzene with hand/arm", scene({ tilted: true, bezel: true, hand: true }))
assertCanvasDetected("tablet benzene with glare", scene({ tilted: true, glare: true, bezel: true }))
assertCanvasDetected("tablet benzene with dark bezel", scene({ bezel: true }))
assertCanvasDetected("partially cut-off tablet benzene", scene({ partial: true, bezel: true }))
assertCanvasDetected("screenshot ethanol", scene({ chemistry: "ethanol" }))
assertCanvasDetected("screenshot methanal", scene({ chemistry: "methanal" }))
assertCanvasDetected("simple paper/photo structure", scene({ tilted: true, chemistry: "ethanol" }))

const clutter = image(220, 160, [122, 122, 122])
for (let x = 0; x < clutter.width; x += 14) drawLine(clutter, { x, y: 0 }, { x: clutter.width - x / 4, y: clutter.height }, [72, 72, 88])
for (let y = 0; y < clutter.height; y += 16) drawLine(clutter, { x: 0, y }, { x: clutter.width, y: y + 8 }, [88, 72, 72])
const clutterAnalysis = analyzePerspectiveNormalization(clutter)
assert.ok(clutterAnalysis.usedFallback || clutterAnalysis.confidence < 46, "background clutter without chemistry is not a confident canvas")

const plaid = image(220, 160, [160, 150, 155])
for (let x = 0; x < plaid.width; x += 18) drawLine(plaid, { x, y: 0 }, { x, y: plaid.height }, [42, 42, 42])
for (let y = 0; y < plaid.height; y += 18) drawLine(plaid, { x: 0, y }, { x: plaid.width, y }, [42, 42, 42])
const plaidAnalysis = analyzePerspectiveNormalization(plaid)
assert.ok(plaidAnalysis.usedFallback || plaidAnalysis.confidence < 46, "clothing/plaid lines are rejected as background")

console.log("Verified Perspective Normalizer: clean screenshots, tilted tablet, hand/arm, glare, bezel, partial crop, ethanol, methanal, paper/photo, clutter-only, and plaid background safeguards.")
rmSync(outputDirectory, { recursive: true, force: true })
