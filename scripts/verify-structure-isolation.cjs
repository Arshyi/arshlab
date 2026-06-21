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

const { analyzeStructureIsolation } = require(path.join(outputDirectory, "structure-isolation.js"))

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

const handwritten = image(240, 180)
benzene(handwritten, 120, 90, 48, { thickness: 2 })
verify("hand-drawn benzene", handwritten, { x: 120, y: 90 })

const printed = image(240, 180)
benzene(printed, 120, 90, 45, { thickness: 3, printed: true })
verify("printed benzene", printed, { x: 120, y: 90 })

const tablet = image(360, 260, 215)
fillRectangle(tablet, 18, 12, 324, 236, 25)
fillRectangle(tablet, 34, 28, 292, 204, 248)
benzene(tablet, 180, 130, 48, { thickness: 3, printed: true })
const tabletResult = verify("benzene on tablet screen", tablet, { x: 180, y: 130 }, 30)
assert.ok(tabletResult.components.some((component) => component.rejected), "tablet bezel is rejected")

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

console.log("Verified 6 deterministic structure-isolation regressions.")
console.log("Verified adaptive thresholding, component rejection, auto-crop margin, and isolation metrics.")
rmSync(outputDirectory, { recursive: true, force: true })
