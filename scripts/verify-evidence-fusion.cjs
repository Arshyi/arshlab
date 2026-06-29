const assert = require("node:assert/strict")
const { rmSync } = require("node:fs")
const { tmpdir } = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

const root = path.resolve(__dirname, "..")
const outputDirectory = path.join(tmpdir(), "arshlab-evidence-fusion-checks")
const tscPath = require.resolve("typescript/bin/tsc")

rmSync(outputDirectory, { recursive: true, force: true })
const compile = spawnSync(process.execPath, [
  tscPath,
  "lib/structure-scanner/scanner-engine.ts",
  "lib/structure-scanner/evidence-engines.ts",
  "lib/structure-scanner/evidence-fusion.ts",
  "lib/structure-scanner/evidence-types.ts",
  "lib/structure-scanner/scanner-database.ts",
  "lib/structure-scanner/scanner-types.ts",
  "lib/vision/molecular-graph.ts",
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

const { scanStructure } = require(path.join(outputDirectory, "structure-scanner", "scanner-engine.js"))

function ringVision({ aromatic, nearRing = false, graphConfidence = 90, sceneKind = "original" }) {
  const nodes = Array.from({ length: 6 }, (_, id) => ({
    id,
    x: 70 + Math.cos(id * Math.PI / 3) * 38,
    y: 60 + Math.sin(id * Math.PI / 3) * 38,
    degree: 2,
    inferredElement: "C",
    confidence: 90,
    source: "atom-label",
    snappedSegmentIndexes: [],
  }))
  const bonds = Array.from({ length: 6 }, (_, id) => ({
    id,
    startNodeId: id,
    endNodeId: (id + 1) % 6,
    bondOrder: aromatic && id % 2 === 0 ? 2 : 1,
    confidence: nearRing && id === 5 ? 58 : 90,
    sourceSegmentIndexes: [id],
    parallelPairCount: aromatic && id % 2 === 0 ? 1 : 0,
    gapBridged: nearRing && id === 5,
  }))
  const ringCandidate = {
    center: { x: 70, y: 60 }, width: 76, height: 70, sidesEstimate: 6,
    confidence: nearRing ? 68 : 91, benzeneLike: aromatic, nearRing,
    source: nearRing ? "graph-near-cycle" : "graph-cycle", nodeIds: nodes.map((node) => node.id),
    closureQuality: nearRing ? 62 : 94, endpointMergeQuality: 88, polygonRegularity: 90,
    lineCoverage: nearRing ? 76 : 96, doubleBondCue: aromatic ? 90 : 0,
    aromaticCueScore: aromatic ? 88 : 0, reason: "Evidence fusion fixture", scoreBreakdown: [],
  }
  const molecularGraph = {
    nodes,
    bonds,
    rings: [{
      id: 0, nodeIds: nodes.map((node) => node.id), size: 6,
      confidence: nearRing ? 72 : 92, aromatic, closed: !nearRing,
      kind: aromatic ? "benzene-like" : "cyclohexane-like",
    }],
    aromatic,
    aromaticRingIds: aromatic ? [0] : [],
    estimates: {
      atoms: 6, carbons: 6, bonds: 6, rings: 1,
      singleBonds: aromatic ? 3 : 6, doubleBonds: aromatic ? 3 : 0, tripleBonds: 0,
      estimatedFormula: aromatic ? "C6H6" : "C6H12", confidence: graphConfidence,
    },
    warnings: nearRing ? ["One bond gap was bridged."] : [], atomCentered: true, snapRadius: 12,
  }
  return {
    width: 140, height: 120, darkPixelCount: 900, darkPixelRatio: 0.05, threshold: 150,
    atomLabels: nodes.map((node) => ({
      id: node.id, label: "C", bounds: { x: node.x - 5, y: node.y - 6, width: 10, height: 12 },
      centroid: { x: node.x, y: node.y }, confidence: 90,
    })),
    lineSegments: [], closedLoops: nearRing ? [] : [{ bounds: { x: 32, y: 25, width: 76, height: 70 }, center: { x: 70, y: 60 }, holeArea: 2000, aspectRatio: 1.08 }],
    ringCandidates: [ringCandidate],
    graph: {
      nodes: [], edges: [], mergedEndpointCount: 6, endpointTolerance: 12, averageLineLength: 38,
      cycleCandidates: nearRing ? [] : [ringCandidate], nearRingCandidates: nearRing ? [ringCandidate] : [],
      bestRingConfidence: ringCandidate.confidence, aromaticCueScore: aromatic ? 88 : 0,
      explanation: aromatic ? "Six-member aromatic cycle" : "Six-member saturated cycle",
    },
    molecularGraph,
    parallelBondPairs: [], parallelLinePairs: aromatic ? 3 : 0, simpleChainLength: 0,
    functionalGroupCues: aromatic ? [{ kind: "aromatic", label: "Aromatic ring", confidence: 90, evidence: "Alternating double bonds" }] : [],
    candidates: [{
      compoundId: aromatic ? "benzene" : "cyclohexane",
      label: aromatic ? "Benzene" : "Cyclohexane", score: 90,
      reasons: [aromatic ? "Aromatic six-member ring" : "Saturated six-member ring"], scoreBreakdown: [],
    }],
    visualConfidence: 90, isUncertain: false, warnings: [],
    sceneVariants: [{ id: sceneKind, candidateId: 0, kind: sceneKind, score: 90, graphConfidence, chemistryConfidence: 90, selected: true, perspectiveCorrected: sceneKind === "perspective" }],
    selectedSceneVariantId: sceneKind,
  }
}

function carbonylVision() {
  const nodes = ["C", "C", "C", "O"].map((element, id) => ({
    id, x: 20 + id * 25, y: 50, degree: id === 1 ? 3 : 1,
    inferredElement: element, confidence: 88, source: "atom-label", snappedSegmentIndexes: [],
  }))
  const bonds = [
    { id: 0, startNodeId: 0, endNodeId: 1, bondOrder: 1 },
    { id: 1, startNodeId: 1, endNodeId: 2, bondOrder: 1 },
    { id: 2, startNodeId: 1, endNodeId: 3, bondOrder: 2 },
  ].map((bond) => ({ ...bond, confidence: 88, sourceSegmentIndexes: [bond.id], parallelPairCount: bond.bondOrder - 1, gapBridged: false }))
  return {
    width: 130, height: 100, darkPixelCount: 420, darkPixelRatio: 0.04, threshold: 150,
    atomLabels: [], lineSegments: [], closedLoops: [], ringCandidates: [],
    graph: { nodes: [], edges: [], mergedEndpointCount: 4, endpointTolerance: 10, averageLineLength: 25, cycleCandidates: [], nearRingCandidates: [], bestRingConfidence: 0, aromaticCueScore: 0, explanation: "Carbonyl chain" },
    molecularGraph: {
      nodes, bonds, rings: [], aromatic: false, aromaticRingIds: [],
      estimates: { atoms: 4, carbons: 3, bonds: 3, rings: 0, singleBonds: 2, doubleBonds: 1, tripleBonds: 0, estimatedFormula: "C3H6O", confidence: 88 },
      warnings: [], atomCentered: true, snapRadius: 10,
    },
    parallelBondPairs: [], parallelLinePairs: 1, simpleChainLength: 3,
    functionalGroupCues: [{ kind: "carbonyl", label: "Carbonyl-like C=O", confidence: 90, evidence: "C=O double bond" }],
    candidates: [{ compoundId: "acetone", label: "Acetone", score: 82, reasons: ["Three-carbon ketone graph"], scoreBreakdown: [] }],
    visualConfidence: 86, isUncertain: false, warnings: [],
  }
}

function scanVisual(visualAnalysis, extra = {}) {
  return scanStructure({ visualAnalysis, manualHints: {}, ...extra })
}

const cleanBenzene = scanVisual(ringVision({ aromatic: true }))
assert.equal(cleanBenzene.bestMatch?.record.id, "benzene", "clean benzene screenshot")
assert.ok(cleanBenzene.confidenceBreakdown.ring >= 75, "clean benzene ring confidence")

const cameraBenzene = scanVisual(ringVision({ aromatic: true, graphConfidence: 86, sceneKind: "camera-clutter" }), { ocrQuality: 18, ocrText: "HH NG" })
assert.equal(cameraBenzene.bestMatch?.record.id, "benzene", "camera benzene with hands and background")
assert.ok(cameraBenzene.bestMatch.confidence >= 80, "camera benzene remains high confidence")
assert.ok(
  !cameraBenzene.matches.slice(0, 3).some((match) => ["ammonia", "aniline", "ethylamine"].includes(match.record.id)),
  "isolated benzene topology suppresses false amine classifications",
)

const tabletBenzene = scanVisual(ringVision({ aromatic: true, graphConfidence: 84, sceneKind: "perspective" }), { ocrQuality: 24 })
assert.equal(tabletBenzene.bestMatch?.record.id, "benzene", "tilted tablet benzene")

const occludedBenzene = scanVisual(ringVision({ aromatic: true, nearRing: true, graphConfidence: 78 }), { ocrQuality: 12 })
assert.equal(occludedBenzene.bestMatch?.record.id, "benzene", "partially occluded benzene")

const cleanCyclohexane = scanVisual(ringVision({ aromatic: false }))
assert.equal(cleanCyclohexane.bestMatch?.record.id, "cyclohexane", "clean cyclohexane screenshot")
assert.ok(cleanCyclohexane.bestMatch.confidence >= 75, "cyclohexane confidence")

const cameraCyclohexane = scanVisual(ringVision({ aromatic: false, graphConfidence: 78, sceneKind: "camera-clutter" }), { ocrQuality: 16 })
assert.equal(cameraCyclohexane.bestMatch?.record.id, "cyclohexane", "cyclohexane camera photo")
assert.ok(cameraCyclohexane.matches.findIndex((match) => match.record.id === "benzene") !== 0, "benzene does not beat saturated ring")

const ethanol = scanStructure({
  formula: "CH3CH2OH", condensedFormula: "CH3CH2OH", ocrFormulaCompoundIds: ["ethanol"],
  ocrCompoundIds: ["ethanol"], ocrText: "CH3CH2OH", ocrQuality: 84, ocrChemistryConfidence: 90, manualHints: {},
})
assert.equal(ethanol.bestMatch?.record.id, "ethanol", "ethanol displayed formula")
assert.ok(ethanol.bestMatch.confidence <= 64, "OCR-only result stays capped")

const methanal = scanStructure({
  formula: "H2CO", ocrFormulaCompoundIds: ["methanal"], ocrCompoundIds: ["methanal"],
  ocrText: "H2C=O", ocrQuality: 80, ocrChemistryConfidence: 84, manualHints: {},
})
assert.equal(methanal.bestMatch?.record.id, "methanal", "methanal displayed formula")

const acetone = scanVisual(carbonylVision(), { ocrQuality: 22 })
assert.equal(acetone.bestMatch?.record.id, "acetone", "acetone carbonyl structure")
assert.ok(acetone.evidenceFusion.candidates[0].engineVotes.length >= 2, "carbonyl result fuses graph and functional-group engines")

const noisy = scanStructure({
  ocrText: "NG HH BC BCC SN5", ocrQuality: 88, ocrChemistryConfidence: 5,
  ocrNoisePenalty: 35, ocrCompoundIds: [], ocrFormulaCompoundIds: [], ocrNameCompoundIds: [], manualHints: {},
})
assert.equal(noisy.bestMatch, null, "invalid OCR-only tokens produce no candidate")
assert.equal(noisy.evidenceFusion.engines.find((engine) => engine.id === "ocr-formula").candidates.length, 0, "noise does not dominate OCR engine")

assert.equal(cleanBenzene.evidenceFusion.engines.length, 10, "all ten evidence engines report")
assert.ok(cleanBenzene.evidenceFusion.whyWinnerBeatRunnerUp.includes("engine"), "winner versus runner-up is explained")
assert.ok(cleanBenzene.evidenceFusion.strongestEvidence.length > 0, "strongest evidence is reported")
assert.ok(cleanBenzene.evidenceFusion.weakestEvidence.length > 0, "weakest evidence is reported")

console.log("Verified 10 multi-engine fusion regressions across aromatic rings, saturated rings, formulas, carbonyls, clutter, perspective, occlusion, and OCR noise.")
console.log("Verified ten independent engine reports, OCR-only confidence caps, topology priority, and winner-versus-runner-up explanations.")
rmSync(outputDirectory, { recursive: true, force: true })
