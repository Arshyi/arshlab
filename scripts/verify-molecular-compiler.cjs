const assert = require("node:assert/strict")
const { rmSync } = require("node:fs")
const { tmpdir } = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

const mode = process.argv[2] ?? "compiler"
const root = path.resolve(__dirname, "..")
const outputDirectory = path.join(tmpdir(), `arshlab-molecular-compiler-${mode}`)
const tscPath = require.resolve("typescript/bin/tsc")

rmSync(outputDirectory, { recursive: true, force: true })
const compile = spawnSync(process.execPath, [
  tscPath,
  "lib/vision/molecular-graph.ts",
  "lib/structure-vision/canonical-molecular-graph.ts",
  "lib/structure-vision/vision-types.ts",
  "lib/molecular-compiler/compiler-types.ts",
  "lib/molecular-compiler/visual-tokenizer.ts",
  "lib/molecular-compiler/primitive-builder.ts",
  "lib/molecular-compiler/chemical-ast.ts",
  "lib/molecular-compiler/semantic-validator.ts",
  "lib/molecular-compiler/canonicalizer.ts",
  "lib/molecular-compiler/optimization-pass.ts",
  "lib/molecular-compiler/optimization-report.ts",
  "lib/molecular-compiler/passes/pass-utils.ts",
  "lib/molecular-compiler/passes/dead-node-elimination.ts",
  "lib/molecular-compiler/passes/dead-edge-elimination.ts",
  "lib/molecular-compiler/passes/component-simplification.ts",
  "lib/molecular-compiler/passes/ring-optimization.ts",
  "lib/molecular-compiler/passes/bond-order-cleanup.ts",
  "lib/molecular-compiler/passes/valence-cleanup.ts",
  "lib/molecular-compiler/passes/confidence-propagation.ts",
  "lib/molecular-compiler/passes/canonical-ordering.ts",
  "lib/molecular-compiler/pass-registry.ts",
  "lib/molecular-compiler/pass-manager.ts",
  "lib/molecular-compiler/compiler-report.ts",
  "lib/molecular-compiler/compiler.ts",
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

const { tokenizeVisualInput } = require(path.join(outputDirectory, "molecular-compiler", "visual-tokenizer.js"))
const { buildChemicalPrimitives } = require(path.join(outputDirectory, "molecular-compiler", "primitive-builder.js"))
const { buildChemicalAst } = require(path.join(outputDirectory, "molecular-compiler", "chemical-ast.js"))
const { validateChemicalSemantics } = require(path.join(outputDirectory, "molecular-compiler", "semantic-validator.js"))
const { canonicalizeCompilerGraph, buildCompilerIR } = require(path.join(outputDirectory, "molecular-compiler", "canonicalizer.js"))
const { compileMolecularInput } = require(path.join(outputDirectory, "molecular-compiler", "compiler.js"))
const { optimizeCompilerIR } = require(path.join(outputDirectory, "molecular-compiler", "pass-manager.js"))
const { listOptimizationPasses } = require(path.join(outputDirectory, "molecular-compiler", "pass-registry.js"))

function node(id, x, y, element = "C", confidence = 92) {
  return { id, x, y, degree: 0, inferredElement: element, confidence, source: "atom-label", snappedSegmentIndexes: [] }
}

function bond(id, startNodeId, endNodeId, order = 1, confidence = 88, gapBridged = false) {
  return { id, startNodeId, endNodeId, bondOrder: order, confidence, sourceSegmentIndexes: [id], parallelPairCount: order > 1 ? order - 1 : 0, gapBridged }
}

function graph(nodes, bonds, rings = [], confidence = 86, formula = "C6H6") {
  const nextNodes = nodes.map((item) => ({
    ...item,
    degree: bonds.filter((candidate) => candidate.startNodeId === item.id || candidate.endNodeId === item.id).length,
  }))
  return {
    nodes: nextNodes,
    bonds,
    rings,
    aromatic: rings.some((ring) => ring.aromatic),
    aromaticRingIds: rings.filter((ring) => ring.aromatic).map((ring) => ring.id),
    estimates: {
      atoms: nextNodes.length,
      carbons: nextNodes.filter((item) => item.inferredElement === "C").length,
      bonds: bonds.length,
      rings: rings.length,
      singleBonds: bonds.filter((item) => item.bondOrder === 1).length,
      doubleBonds: bonds.filter((item) => item.bondOrder === 2).length,
      tripleBonds: bonds.filter((item) => item.bondOrder === 3).length,
      estimatedFormula: formula,
      confidence,
    },
    warnings: [],
    atomCentered: true,
    snapRadius: 12,
  }
}

const hexagon = [
  node(0, 30, 66),
  node(1, 51, 30),
  node(2, 93, 30),
  node(3, 116, 66),
  node(4, 94, 101),
  node(5, 52, 101),
]
const benzeneBonds = hexagon.map((_, index) => bond(index, index, (index + 1) % hexagon.length, index % 2 === 0 ? 2 : 1, 90))
const benzeneRing = { id: 0, nodeIds: [0, 1, 2, 3, 4, 5], size: 6, confidence: 92, aromatic: true, closed: true, kind: "benzene-like" }
const benzeneGraph = graph(hexagon, benzeneBonds, [benzeneRing], 91, "C6H6")

function irFromGraph(inputGraph) {
  const primitives = buildChemicalPrimitives(tokenizeVisualInput(null, inputGraph), inputGraph)
  const ast = buildChemicalAst(primitives, inputGraph)
  const validation = validateChemicalSemantics(ast)
  const canonical = canonicalizeCompilerGraph(inputGraph)
  return buildCompilerIR(ast, validation, canonical)
}

function tokenizerCheck() {
  const tokens = tokenizeVisualInput(null, benzeneGraph)
  assert.ok(tokens.some((token) => token.type === "atom-label" && token.text === "C"), "atom-label tokens are emitted")
  assert.ok(tokens.some((token) => token.type === "double-line"), "double-line tokens are emitted")
  assert.ok(tokens.some((token) => token.type === "circle"), "ring/circle token is emitted")
  assert.equal(tokens.every((token) => typeof token.boundingBox.x === "number" && token.confidence >= 0), true, "tokens carry geometry and confidence")
}

function primitiveCheck() {
  const tokens = tokenizeVisualInput(null, benzeneGraph)
  const primitives = buildChemicalPrimitives(tokens, benzeneGraph)
  assert.equal(primitives.filter((primitive) => primitive.type === "carbon-atom").length, 6, "six carbon primitives are emitted")
  assert.equal(primitives.filter((primitive) => primitive.type === "double-bond").length, 3, "three double-bond primitives are emitted")
  assert.ok(primitives.some((primitive) => primitive.type === "aromatic-hint"), "aromatic primitive is emitted")
}

function astCheck() {
  const primitives = buildChemicalPrimitives(tokenizeVisualInput(null, benzeneGraph), benzeneGraph)
  const ast = buildChemicalAst(primitives, benzeneGraph)
  assert.equal(ast.nodes.length, 6, "AST has six atom nodes")
  assert.equal(ast.edges.length, 6, "AST has six edges")
  assert.equal(ast.connectedComponents.length, 1, "AST has one connected component")
  assert.equal(ast.cycles[0].size, 6, "AST has a six-member cycle")
}

function semanticCheck() {
  const primitives = buildChemicalPrimitives(tokenizeVisualInput(null, benzeneGraph), benzeneGraph)
  const ast = buildChemicalAst(primitives, benzeneGraph)
  assert.equal(validateChemicalSemantics(ast).status, "pass", "benzene AST passes semantics")
  const impossible = graph([node(0, 50, 50), node(1, 20, 50), node(2, 80, 50), node(3, 50, 20), node(4, 50, 80), node(5, 90, 90)], [
    bond(0, 0, 1),
    bond(1, 0, 2),
    bond(2, 0, 3),
    bond(3, 0, 4),
    bond(4, 0, 5),
  ], [], 80, "C6H6")
  const badAst = buildChemicalAst(buildChemicalPrimitives(tokenizeVisualInput(null, impossible), impossible), impossible)
  assert.equal(validateChemicalSemantics(badAst).status, "fail", "over-valent carbon fails semantics")
}

function canonicalizerCheck() {
  const canonical = canonicalizeCompilerGraph(benzeneGraph)
  assert.ok(canonical.hash.includes("::"), "canonical hash is deterministic graph hash")
  assert.ok(canonical.canonicalGraphId.startsWith("arshlab:"), "canonical graph id is namespaced")
  assert.equal(canonical.adjacencyList.length, 6, "adjacency list is emitted")
}

function irCheck() {
  const primitives = buildChemicalPrimitives(tokenizeVisualInput(null, benzeneGraph), benzeneGraph)
  const ast = buildChemicalAst(primitives, benzeneGraph)
  const validation = validateChemicalSemantics(ast)
  const canonical = canonicalizeCompilerGraph(benzeneGraph)
  const ir = buildCompilerIR(ast, validation, canonical)
  assert.equal(ir.nodes.length, 6, "IR stores nodes")
  assert.equal(ir.cycles.length, 1, "IR stores cycles")
  assert.equal(ir.canonicalGraph.nodes.length, 6, "IR stores canonical graph")
  assert.ok(ir.confidenceCeiling <= benzeneGraph.estimates.confidence, "IR confidence ceiling does not exceed graph confidence")
}

function compilerCheck() {
  const report = compileMolecularInput({ graph: benzeneGraph })
  assert.equal(report.status, "pass", "compiler passes valid benzene graph")
  assert.ok(report.ir, "compiler emits IR")
  assert.ok(report.unoptimizedIr, "compiler preserves the pre-optimization IR")
  assert.ok(report.optimizationReport, "compiler emits an optimization report")
  assert.equal(report.optimizationReport.passesExecuted, listOptimizationPasses().length, "all registered optimization passes execute")
  assert.equal(report.knowledgeEngineInput.available, true, "knowledge engine input is available after semantic pass")
  assert.ok(report.confidenceFlow.every((entry, index, list) => index === 0 || entry.confidence <= list[index - 1].confidence), "confidence never increases downstream")
  const empty = compileMolecularInput({ graph: graph([], [], [], 0, "Unavailable") })
  assert.equal(empty.status, "fail", "compiler fails empty graph")
  assert.equal(empty.knowledgeEngineInput.available, false, "knowledge engine gate closes on failure")
}

function optimizationCheck() {
  const dirtyNodes = [...hexagon, node(6, 230, 230, "C", 42)]
  const dirtyBonds = [
    ...benzeneBonds,
    bond(6, 0, 2, 1, 31, true),
  ]
  const dirtyGraph = graph(dirtyNodes, dirtyBonds, [benzeneRing], 74, "C6H6")
  const report = optimizeCompilerIR(irFromGraph(dirtyGraph))
  assert.equal(report.passesExecuted, listOptimizationPasses().length, "optimizer executes every registered pass")
  assert.ok(report.irAfter.canonicalGraph.nodes.length < report.irBefore.canonicalGraph.nodes.length, "dead nodes are eliminated")
  assert.ok(report.irAfter.canonicalGraph.bonds.length < report.irBefore.canonicalGraph.bonds.length, "dead or duplicate edges are eliminated")
  assert.ok(report.passes.some((pass) => pass.passId === "dead-node-elimination" && pass.status === "success"), "dead-node pass succeeds")
  assert.ok(report.passes.some((pass) => pass.passId === "dead-edge-elimination" && pass.status === "success"), "dead-edge pass succeeds")
  assert.ok(report.graphHashAfter !== report.graphHashBefore, "cleanup produces a new deterministic graph hash")
}

function passManagerCheck() {
  const ids = listOptimizationPasses().map((pass) => pass.id)
  assert.deepEqual(ids, [
    "dead-node-elimination",
    "dead-edge-elimination",
    "component-simplification",
    "ring-optimization",
    "bond-order-cleanup",
    "valence-cleanup",
    "confidence-propagation",
    "canonical-ordering",
  ], "pass registry exposes deterministic default ordering")
  const report = optimizeCompilerIR(irFromGraph(benzeneGraph))
  assert.equal(report.passes.length, ids.length, "manager records one execution per pass")
  assert.equal(report.rolledBackPasses, 0, "clean benzene does not require rollback")
  assert.ok(report.totalTimeMs >= 0, "manager records total optimization time")
}

function rollbackCheck() {
  const badPass = {
    id: "destructive-test-pass",
    description: "Attempts to erase the graph so rollback can be verified.",
    run(ir) {
      return {
        ir: { ...ir, nodes: [], edges: [], components: [], cycles: [], canonicalGraph: graph([], [], [], 0, "Unavailable") },
        changed: true,
        valid: false,
        metrics: { nodesRemoved: ir.nodes.length, edgesRemoved: ir.edges.length },
        warnings: [],
        errors: ["Synthetic destructive pass failed validation."],
      }
    },
  }
  const original = irFromGraph(benzeneGraph)
  const report = optimizeCompilerIR(original, [badPass])
  assert.equal(report.rolledBackPasses, 1, "invalid pass is rolled back")
  assert.equal(report.irAfter.hash, original.hash, "rollback preserves original graph hash")
  assert.equal(report.passes[0].status, "rolled-back", "execution log marks rollback")
}

function confidenceCheck() {
  const highConfidenceGraph = graph(
    hexagon.map((item) => ({ ...item, confidence: 97 })),
    benzeneBonds.map((item) => ({ ...item, confidence: 96 })),
    [{ ...benzeneRing, confidence: 96 }],
    96,
    "C6H6",
  )
  const original = { ...irFromGraph(highConfidenceGraph), confidenceCeiling: 61 }
  const report = optimizeCompilerIR(original)
  assert.ok(report.irAfter.confidenceCeiling <= original.confidenceCeiling, "optimized IR cannot exceed the original confidence ceiling")
  assert.ok(report.irAfter.canonicalGraph.estimates.confidence <= original.confidenceCeiling, "graph confidence is capped by compiler ceiling")
  assert.ok(report.irAfter.canonicalGraph.nodes.every((item) => item.confidence <= original.confidenceCeiling), "node confidence is capped")
  assert.ok(report.irAfter.canonicalGraph.bonds.every((item) => item.confidence <= original.confidenceCeiling), "bond confidence is capped")
}

const runners = {
  tokenizer: tokenizerCheck,
  primitives: primitiveCheck,
  ast: astCheck,
  semantic: semanticCheck,
  canonicalizer: canonicalizerCheck,
  "compiler-ir": irCheck,
  compiler: compilerCheck,
  optimization: optimizationCheck,
  "pass-manager": passManagerCheck,
  rollback: rollbackCheck,
  confidence: confidenceCheck,
}

if (!runners[mode]) {
  console.error(`Unknown molecular compiler test mode: ${mode}`)
  process.exit(1)
}

runners[mode]()
console.log(`Verified molecular compiler mode: ${mode}`)
rmSync(outputDirectory, { recursive: true, force: true })
