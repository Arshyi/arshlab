const assert = require("node:assert/strict")
const { rmSync } = require("node:fs")
const { tmpdir } = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

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

const { analyzeDarkPixelMask } = require(path.join(outputDirectory, "shape-heuristics.js"))

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

console.log(`Benzene: ${benzene.lineSegments.length} lines, ${benzene.closedLoops.length} loop, score ${benzene.candidates[0].score}`)
console.log(`Methanal: ${methanal.parallelLinePairs} parallel pair(s), score ${methanal.candidates[0].score}`)
console.log(`Ethanol: ${ethanol.simpleChainLength}-atom chain, score ${ethanol.candidates[0].score}`)
console.log("Verified 3 synthetic structure drawings and the uncertain-image fallback.")
rmSync(outputDirectory, { recursive: true, force: true })
