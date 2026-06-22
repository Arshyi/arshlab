const assert = require("node:assert/strict")
const { rmSync } = require("node:fs")
const { tmpdir } = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

const root = path.resolve(__dirname, "..")
const outputDirectory = path.join(tmpdir(), "arshlab-structure-isolation-checks")
const tscPath = require.resolve("typescript/bin/tsc")

rmSync(outputDirectory, { recursive: true, force: true })
const compile = spawnSync(process.execPath, [
  tscPath,
  "lib/structure-vision/isolation-types.ts",
  "lib/structure-vision/structure-isolation.ts",
  "lib/structure-vision/vision-types.ts",
  "lib/structure-vision/shape-heuristics.ts",
  "lib/vision/molecular-graph.ts",
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

const { analyzeStructureIsolation } = require(path.join(outputDirectory, "structure-vision", "structure-isolation.js"))
const { analyzeDarkPixelMask } = require(path.join(outputDirectory, "structure-vision", "shape-heuristics.js"))

function image(width, height, value = 255) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let index = 0; index < width * height; index += 1) {
    const offset = index * 4
    data[offset] = value
    data[offset + 1] = value
    data[offset + 2] = value
    data[offset + 3] = 255
  }
  return { width, height, data }
}

function setPixel(target, x, y, value = 20) {
  const roundedX = Math.round(x)
  const roundedY = Math.round(y)
  if (roundedX < 0 || roundedX >= target.width || roundedY < 0 || roundedY >= target.height) return
  const offset = (roundedY * target.width + roundedX) * 4
  target.data[offset] = value
  target.data[offset + 1] = value
  target.data[offset + 2] = value
}

function setColorPixel(target, x, y, red, green, blue) {
  const roundedX = Math.round(x)
  const roundedY = Math.round(y)
  if (roundedX < 0 || roundedX >= target.width || roundedY < 0 || roundedY >= target.height) return
  const offset = (roundedY * target.width + roundedX) * 4
  target.data[offset] = red
  target.data[offset + 1] = green
  target.data[offset + 2] = blue
}

function line(target, start, end, thickness = 2, value = 20) {
  const steps = Math.ceil(Math.hypot(end.x - start.x, end.y - start.y))
  for (let step = 0; step <= steps; step += 1) {
    const ratio = steps ? step / steps : 0
    const x = start.x + (end.x - start.x) * ratio
    const y = start.y + (end.y - start.y) * ratio
    for (let offsetX = -thickness; offsetX <= thickness; offsetX += 1) {
      for (let offsetY = -thickness; offsetY <= thickness; offsetY += 1) setPixel(target, x + offsetX, y + offsetY, value)
    }
  }
}

function rectangle(target, x, y, width, height, value = 20, thickness = 4) {
  line(target, { x, y }, { x: x + width, y }, thickness, value)
  line(target, { x: x + width, y }, { x: x + width, y: y + height }, thickness, value)
  line(target, { x: x + width, y: y + height }, { x, y: y + height }, thickness, value)
  line(target, { x, y: y + height }, { x, y }, thickness, value)
}

function fillRectangle(target, x, y, width, height, value) {
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) setPixel(target, column, row, value)
  }
}

function fillColorRectangle(target, x, y, width, height, color) {
  for (let row = y; row < y + height; row += 1) {
    for (let column = x; column < x + width; column += 1) {
      setColorPixel(target, column, row, color[0], color[1], color[2])
    }
  }
}

function polygon(target, points, thickness = 2, value = 20) {
  points.forEach((point, index) => line(target, point, points[(index + 1) % points.length], thickness, value))
}

function hexane(target, startX, centerY, segment = 28) {
  const points = Array.from({ length: 6 }, (_, index) => ({
    x: startX + index * segment,
    y: centerY + (index % 2 ? -18 : 18),
  }))
  points.slice(0, -1).forEach((point, index) => line(target, point, points[index + 1], 2))
}

function benzene(target, centerX, centerY, radius = 45, { thickness = 2, skew = 0, printed = false } = {}) {
  const points = Array.from({ length: 6 }, (_, index) => {
    const angle = Math.PI / 6 + index * Math.PI / 3
    const y = centerY + Math.sin(angle) * radius
    return { x: centerX + Math.cos(angle) * radius + (y - centerY) * skew, y }
  })
  points.forEach((point, index) => line(target, point, points[(index + 1) % 6], thickness))
  if (printed) {
    ;[0, 2, 4].forEach((index) => {
      const start = points[index]
      const end = points[(index + 1) % 6]
      line(target, {
        x: start.x + (centerX - start.x) * 0.16,
        y: start.y + (centerY - start.y) * 0.16,
      }, {
        x: end.x + (centerX - end.x) * 0.16,
        y: end.y + (centerY - end.y) * 0.16,
      }, Math.max(1, thickness - 1))
    })
  }
}

function verify(name, target, center, maximumCoverage = 45) {
  const analysis = analyzeStructureIsolation(target)
  assert.ok(analysis.selectedBounds, `${name}: selected chemistry region`)
  assert.ok(analysis.isolationConfidence >= 38, `${name}: isolation confidence`)
  assert.ok(analysis.drawingCoverage < maximumCoverage, `${name}: ignores surrounding image area`)
  assert.ok(analysis.chemistryPixelDensity > 1, `${name}: chemistry stroke density`)
  const bounds = analysis.selectedBounds
  assert.ok(center.x >= bounds.x && center.x <= bounds.x + bounds.width, `${name}: selected box contains drawing x`)
  assert.ok(center.y >= bounds.y && center.y <= bounds.y + bounds.height, `${name}: selected box contains drawing y`)
  assert.ok(analysis.cropBounds.width >= bounds.width && analysis.cropBounds.height >= bounds.height, `${name}: crop margin expansion`)
  return analysis
}

function verifyBenzeneCandidate(name, target, analysis) {
  const bounds = analysis.selectedBounds
  assert.ok(bounds, `${name}: selected region for graph check`)
  const pixels = new Uint8Array(bounds.width * bounds.height)
  let darkPixelCount = 0
  for (let y = 0; y < bounds.height; y += 1) {
    for (let x = 0; x < bounds.width; x += 1) {
      const sourceOffset = ((bounds.y + y) * target.width + bounds.x + x) * 4
      const grayscale = target.data[sourceOffset] * 0.299 + target.data[sourceOffset + 1] * 0.587 + target.data[sourceOffset + 2] * 0.114
      if (grayscale >= 190) continue
      pixels[y * bounds.width + x] = 1
      darkPixelCount += 1
    }
  }
  const vision = analyzeDarkPixelMask({
    width: bounds.width,
    height: bounds.height,
    pixels,
    darkPixelCount,
    threshold: 190,
  }, "aromatic benzene ring")
  assert.equal(vision.candidates[0]?.compoundId, "benzene", `${name}: benzene top visual candidate`)
  return vision
}

const handwritten = image(240, 180)
benzene(handwritten, 120, 90, 48, { thickness: 2 })
verify("hand-drawn benzene", handwritten, { x: 120, y: 90 })

const printed = image(240, 180)
benzene(printed, 120, 90, 45, { thickness: 3, printed: true })
const printedResult = verify("printed benzene", printed, { x: 120, y: 90 })
verifyBenzeneCandidate("printed benzene", printed, printedResult)

const tablet = image(360, 260, 215)
fillRectangle(tablet, 18, 12, 324, 236, 25)
fillRectangle(tablet, 34, 28, 292, 204, 248)
benzene(tablet, 180, 130, 48, { thickness: 3, printed: true })
const tabletResult = verify("benzene on tablet screen", tablet, { x: 180, y: 130 }, 30)
assert.ok(tabletResult.components.some((component) => component.rejected), "tablet bezel is rejected")
verifyBenzeneCandidate("benzene on tablet screen", tablet, tabletResult)

const margins = image(520, 380)
benzene(margins, 260, 190, 42, { thickness: 2 })
verify("molecule with large white margins", margins, { x: 260, y: 190 }, 12)

const clutter = image(420, 300, 245)
benzene(clutter, 210, 150, 48, { thickness: 2, printed: true })
fillRectangle(clutter, 10, 20, 65, 75, 15)
fillRectangle(clutter, 340, 205, 60, 70, 40)
rectangle(clutter, 5, 5, 410, 290, 80, 5)
verify("molecule with surrounding clutter", clutter, { x: 210, y: 150 }, 25)

const angled = image(300, 220)
benzene(angled, 150, 110, 50, { thickness: 2, printed: true, skew: 0.38 })
verify("molecule photographed at an angle", angled, { x: 150, y: 110 })

const cleanCyclohexane = image(260, 190)
benzene(cleanCyclohexane, 130, 95, 46, { thickness: 3 })
verify("clean cyclohexane screenshot", cleanCyclohexane, { x: 130, y: 95 })

const cleanHexane = image(320, 190)
hexane(cleanHexane, 80, 95, 30)
verify("clean hexane screenshot", cleanHexane, { x: 155, y: 95 })

const reflectedScreen = image(400, 290, 210)
fillRectangle(reflectedScreen, 22, 18, 356, 254, 28)
fillRectangle(reflectedScreen, 40, 35, 320, 218, 245)
benzene(reflectedScreen, 205, 143, 52, { thickness: 3, printed: true, skew: 0.12 })
fillRectangle(reflectedScreen, 150, 45, 24, 185, 232)
const reflectedResult = verify("reflected screen benzene", reflectedScreen, { x: 205, y: 143 }, 30)
assert.ok(reflectedResult.regionProposalCount >= 1, "reflected screen retains a chemistry region proposal")

const armScene = image(460, 320, 236)
fillColorRectangle(armScene, 0, 205, 220, 115, [196, 139, 105])
benzene(armScene, 310, 135, 50, { thickness: 3, printed: true })
const armResult = verify("benzene with arm visible", armScene, { x: 310, y: 135 }, 24)
verifyBenzeneCandidate("benzene with arm visible", armScene, armResult)

const notebookScene = image(460, 320, 246)
for (let y = 28; y < 300; y += 22) line(notebookScene, { x: 12, y }, { x: 448, y }, 0, 205)
line(notebookScene, { x: 78, y: 8 }, { x: 78, y: 312 }, 1, 190)
benzene(notebookScene, 300, 150, 51, { thickness: 3, printed: true })
const notebookResult = verify("benzene with notebook visible", notebookScene, { x: 300, y: 150 }, 24)
verifyBenzeneCandidate("benzene with notebook visible", notebookScene, notebookResult)

const cupScene = image(460, 320, 242)
polygon(cupScene, [
  { x: 26, y: 72 }, { x: 112, y: 72 }, { x: 101, y: 262 }, { x: 38, y: 262 },
], 5, 45)
rectangle(cupScene, 40, 38, 58, 35, 55, 3)
benzene(cupScene, 318, 145, 50, { thickness: 3, printed: true })
const cupResult = verify("benzene with coffee cup visible", cupScene, { x: 318, y: 145 }, 24)
verifyBenzeneCandidate("benzene with coffee cup visible", cupScene, cupResult)

const glareScene = image(360, 260, 235)
fillRectangle(glareScene, 18, 15, 324, 230, 32)
fillRectangle(glareScene, 34, 30, 292, 200, 250)
benzene(glareScene, 185, 132, 50, { thickness: 3, printed: true })
fillRectangle(glareScene, 165, 75, 22, 112, 238)
verify("benzene under glare", glareScene, { x: 185, y: 132 }, 30)

const partialCrop = image(260, 210)
benzene(partialCrop, 226, 105, 58, { thickness: 3, printed: true })
verify("benzene partially cropped", partialCrop, { x: 226, y: 105 }, 28)

const extremeClutter = image(560, 380, 235)
fillColorRectangle(extremeClutter, 0, 265, 250, 115, [201, 146, 112])
rectangle(extremeClutter, 12, 14, 536, 352, 70, 6)
polygon(extremeClutter, [
  { x: 28, y: 50 }, { x: 115, y: 50 }, { x: 103, y: 225 }, { x: 42, y: 225 },
], 5, 50)
for (let y = 46; y < 330; y += 25) line(extremeClutter, { x: 400, y }, { x: 540, y }, 0, 200)
benzene(extremeClutter, 300, 160, 52, { thickness: 3, printed: true, skew: 0.22 })
const extremeResult = verify("benzene with multiple background objects", extremeClutter, { x: 300, y: 160 }, 22)
verifyBenzeneCandidate("benzene with multiple background objects", extremeClutter, extremeResult)

const strongPerspective = image(380, 280, 240)
polygon(strongPerspective, [
  { x: 24, y: 34 }, { x: 356, y: 15 }, { x: 338, y: 256 }, { x: 45, y: 270 },
], 6, 42)
benzene(strongPerspective, 195, 140, 51, { thickness: 3, printed: true, skew: 0.55 })
const perspectiveResult = verify("benzene with perspective distortion", strongPerspective, { x: 195, y: 140 }, 30)
assert.ok(perspectiveResult.perspectiveBoundary, "perspective scene produces a correction boundary")

const occluded = image(340, 250)
benzene(occluded, 170, 125, 54, { thickness: 3, printed: true })
fillColorRectangle(occluded, 148, 65, 38, 96, [205, 153, 122])
verify("benzene with 20-30 percent occlusion", occluded, { x: 170, y: 125 }, 32)

console.log("Verified 17 deterministic structure-isolation and clutter stress regressions.")
console.log("Verified benzene remains the top visual candidate in 6 clean, moderate, hard, and extreme scene crops.")
console.log("Verified multi-region proposals, adaptive thresholding, scene rejection, auto-crop margin, and isolation metrics.")
rmSync(outputDirectory, { recursive: true, force: true })
