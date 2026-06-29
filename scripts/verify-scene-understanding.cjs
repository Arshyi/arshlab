const assert = require("node:assert/strict")
const { rmSync } = require("node:fs")
const { tmpdir } = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

const root = path.resolve(__dirname, "..")
const outputDirectory = path.join(tmpdir(), "arshlab-scene-understanding-checks")
const tscPath = require.resolve("typescript/bin/tsc")

rmSync(outputDirectory, { recursive: true, force: true })
const compile = spawnSync(process.execPath, [
  tscPath,
  "lib/structure-vision/scene-understanding.ts",
  "lib/structure-vision/scene-graph.ts",
  "lib/structure-vision/reaction-arrow-detector.ts",
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

const { analyzeSceneImageData } = require(path.join(outputDirectory, "scene-understanding.js"))

function image(width = 260, height = 160, background = [255, 255, 255]) {
  const data = new Uint8ClampedArray(width * height * 4)
  for (let pixel = 0; pixel < width * height; pixel += 1) {
    const offset = pixel * 4
    data[offset] = background[0]
    data[offset + 1] = background[1]
    data[offset + 2] = background[2]
    data[offset + 3] = 255
  }
  return { width, height, data }
}

function setPixel(frame, x, y, color = [0, 0, 0]) {
  const xx = Math.round(x)
  const yy = Math.round(y)
  if (xx < 0 || xx >= frame.width || yy < 0 || yy >= frame.height) return
  const offset = (yy * frame.width + xx) * 4
  frame.data[offset] = color[0]
  frame.data[offset + 1] = color[1]
  frame.data[offset + 2] = color[2]
  frame.data[offset + 3] = 255
}

function line(frame, start, end, thickness = 1, color = [0, 0, 0]) {
  const steps = Math.ceil(Math.hypot(end.x - start.x, end.y - start.y))
  for (let step = 0; step <= steps; step += 1) {
    const ratio = steps ? step / steps : 0
    const x = start.x + (end.x - start.x) * ratio
    const y = start.y + (end.y - start.y) * ratio
    for (let dx = -thickness; dx <= thickness; dx += 1) {
      for (let dy = -thickness; dy <= thickness; dy += 1) setPixel(frame, x + dx, y + dy, color)
    }
  }
}

function rect(frame, x, y, width, height, color = [0, 0, 0]) {
  line(frame, { x, y }, { x: x + width, y }, 1, color)
  line(frame, { x: x + width, y }, { x: x + width, y: y + height }, 1, color)
  line(frame, { x: x + width, y: y + height }, { x, y: y + height }, 1, color)
  line(frame, { x, y: y + height }, { x, y }, 1, color)
}

function fill(frame, x, y, width, height, color) {
  for (let yy = y; yy < y + height; yy += 1) {
    for (let xx = x; xx < x + width; xx += 1) setPixel(frame, xx, yy, color)
  }
}

function benzene(frame, cx, cy, radius = 28, doubleBonds = true) {
  const points = Array.from({ length: 6 }, (_, index) => ({
    x: cx + Math.cos((Math.PI / 6) + index * Math.PI / 3) * radius,
    y: cy + Math.sin((Math.PI / 6) + index * Math.PI / 3) * radius,
  }))
  points.forEach((point, index) => line(frame, point, points[(index + 1) % points.length], 1))
  if (doubleBonds) {
    ;[0, 2, 4].forEach((index) => {
      const a = points[index]
      const b = points[(index + 1) % points.length]
      line(frame, { x: a.x * 0.88 + cx * 0.12, y: a.y * 0.88 + cy * 0.12 }, { x: b.x * 0.88 + cx * 0.12, y: b.y * 0.88 + cy * 0.12 }, 1)
    })
  }
}

function arrow(frame, x1, y1, x2, y2) {
  line(frame, { x: x1, y: y1 }, { x: x2, y: y2 }, 1)
  line(frame, { x: x2, y: y2 }, { x: x2 - 10, y: y2 - 7 }, 1)
  line(frame, { x: x2, y: y2 }, { x: x2 - 10, y: y2 + 7 }, 1)
}

function textBlocks(frame, x, y, count = 4) {
  for (let index = 0; index < count; index += 1) fill(frame, x + index * 8, y + (index % 2) * 2, 4, 9, [0, 0, 0])
}

const single = image()
benzene(single, 80, 78)
let scene = analyzeSceneImageData(single)
assert.equal(scene.moleculeCount, 1, "single molecule region")
assert.equal(scene.arrowCount, 0, "single molecule has no arrow")
assert.ok(scene.confidence.segmentation >= 45, "single molecule segmentation confidence")

const two = image()
benzene(two, 60, 78)
benzene(two, 190, 78, 24, false)
scene = analyzeSceneImageData(two)
assert.ok(scene.moleculeCount >= 2, "two separate molecules are segmented")
assert.equal(scene.sceneGraph.reactions.length, 0, "two molecules without arrow is not a reaction")

const reaction = image(320, 170)
benzene(reaction, 58, 88)
arrow(reaction, 125, 88, 198, 88)
benzene(reaction, 260, 88, 26)
textBlocks(reaction, 148, 48, 5)
scene = analyzeSceneImageData(reaction)
assert.ok(scene.moleculeCount >= 2, "reaction scheme has reactant/product molecules")
assert.ok(scene.arrowCount >= 1, "reaction arrow detected")
assert.ok(scene.sceneGraph.reactions.length >= 1, "reaction layout is recognized")
assert.ok(scene.textRegionCount >= 1, "reaction conditions/text separated")
assert.ok(scene.sceneGraph.nodes.some((node) => node.type === "reaction-arrow"), "arrow node exists")

const verticalReaction = image(180, 240)
benzene(verticalReaction, 90, 48, 22)
line(verticalReaction, { x: 90, y: 85 }, { x: 90, y: 145 }, 1)
line(verticalReaction, { x: 90, y: 145 }, { x: 83, y: 133 }, 1)
line(verticalReaction, { x: 90, y: 145 }, { x: 97, y: 133 }, 1)
benzene(verticalReaction, 90, 190, 22)
scene = analyzeSceneImageData(verticalReaction)
assert.ok(scene.arrowCount >= 1, "vertical reaction arrow detected")
assert.ok(scene.sceneGraph.reactions.length >= 1, "vertical reaction layout recognized")

const bordered = image(260, 170)
rect(bordered, 3, 3, 254, 164)
benzene(bordered, 82, 88)
scene = analyzeSceneImageData(bordered)
assert.ok(scene.borderSuppressionCount >= 1, "tablet/page border suppressed")
assert.ok(scene.moleculeCount >= 1, "molecule survives border suppression")
assert.ok(scene.sceneGraph.rejectedNodeIds.some((id) => /border/.test(id)), "border is represented as rejected node")

const glare = image(260, 170, [210, 210, 210])
benzene(glare, 80, 88)
fill(glare, 150, 20, 55, 24, [255, 255, 255])
scene = analyzeSceneImageData(glare)
assert.ok(scene.reflectionMaskCoverage > 0, "screen glare/reflection detected")
assert.ok(scene.sceneGraph.nodes.some((node) => node.type === "reflection"), "reflection node exists")

const hand = image(260, 170)
benzene(hand, 80, 88)
fill(hand, 150, 30, 72, 58, [210, 142, 105])
scene = analyzeSceneImageData(hand)
assert.ok(scene.humanMaskCoverage > 0, "skin-like hand/finger region detected")
assert.ok(scene.sceneGraph.nodes.some((node) => node.type === "hand" || node.type === "finger"), "human object node exists")

const textHeavy = image(260, 170)
textBlocks(textHeavy, 28, 38, 12)
textBlocks(textHeavy, 28, 70, 10)
benzene(textHeavy, 195, 88, 20)
scene = analyzeSceneImageData(textHeavy)
assert.ok(scene.textRegionCount >= 1, "OCR-heavy page separates chemical text")
assert.ok(scene.moleculeCount >= 1, "molecule still segmented on OCR-heavy page")

const notebook = image(320, 210)
for (let y = 20; y < 200; y += 24) line(notebook, { x: 0, y }, { x: 320, y }, 1, [190, 190, 190])
benzene(notebook, 86, 82)
arrow(notebook, 132, 82, 200, 82)
benzene(notebook, 260, 82, 22)
scene = analyzeSceneImageData(notebook)
assert.ok(scene.moleculeCount >= 2, "lab notebook page segments multiple molecules")
assert.ok(scene.arrowCount >= 1, "lab notebook page detects arrow")

const slide = image(360, 220)
rect(slide, 8, 8, 344, 204)
textBlocks(slide, 32, 28, 14)
benzene(slide, 92, 124)
arrow(slide, 150, 124, 230, 124)
benzene(slide, 292, 124, 24)
scene = analyzeSceneImageData(slide)
assert.ok(scene.borderSuppressionCount >= 1, "PowerPoint/browser screenshot border suppressed")
assert.ok(scene.sceneGraph.reactions.length >= 1, "slide reaction scheme recognized")

console.log("Verified Scene Understanding Engine: single molecule, multi-molecule segmentation, horizontal/vertical reactions, conditions/text, page/tablet/slide borders, reflections, human-object suppression, notebook pages, and OCR-heavy scenes.")
rmSync(outputDirectory, { recursive: true, force: true })
