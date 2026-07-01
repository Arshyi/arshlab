const assert = require("node:assert/strict")
const { rmSync } = require("node:fs")
const { tmpdir } = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

const mode = process.argv[2] ?? "knowledge-graph"
const root = path.resolve(__dirname, "..")
const outputDirectory = path.join(tmpdir(), `arshlab-knowledge-graph-${mode}`)
const tscPath = require.resolve("typescript/bin/tsc")

rmSync(outputDirectory, { recursive: true, force: true })
const compile = spawnSync(process.execPath, [
  tscPath,
  "lib/knowledge-graph/knowledge-node.ts",
  "lib/knowledge-graph/knowledge-edge.ts",
  "lib/knowledge-graph/knowledge-graph.ts",
  "lib/knowledge-graph/graph-layout.ts",
  "lib/knowledge-graph/knowledge-search.ts",
  "lib/knowledge-graph/curriculum-engine.ts",
  "lib/knowledge-graph/knowledge-engine.ts",
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

const engine = require(path.join(outputDirectory, "knowledge-graph", "knowledge-engine.js"))
const search = require(path.join(outputDirectory, "knowledge-graph", "knowledge-search.js"))
const layout = require(path.join(outputDirectory, "knowledge-graph", "graph-layout.js"))
const curriculum = require(path.join(outputDirectory, "knowledge-graph", "curriculum-engine.js"))
const graphData = require(path.join(outputDirectory, "knowledge-graph", "knowledge-graph.js"))

function testKnowledgeGraph() {
  const graph = engine.getInteractiveKnowledgeGraph()
  assert.ok(graph.nodes.length >= 25, "expected a meaningful node library")
  assert.ok(graph.edges.length >= 25, "expected connected educational edges")
  assert.ok(engine.getKnowledgeNode("compound:benzene"))
  assert.ok(engine.getKnowledgeNode("functional-group:carbonyl"))
  assert.ok(engine.getKnowledgeNode("concept:aromaticity"))
  assert.ok(engine.getKnowledgeNode("mechanism:benzene-bromination"))
  assert.ok(engine.getKnowledgeNode("spectroscopy:ir-carbonyl"))
  assert.ok(graph.metrics.averageDegree > 1)
}

function testGraphLayout() {
  const graph = engine.getInteractiveKnowledgeGraph()
  const laidOut = layout.layoutKnowledgeGraph(graph.nodes, graph.edges)
  assert.ok(laidOut.bounds.width > 500)
  assert.ok(laidOut.bounds.height > 500)
  for (const node of laidOut.nodes) {
    assert.equal(Number.isFinite(node.x), true, `${node.id} x should be finite`)
    assert.equal(Number.isFinite(node.y), true, `${node.id} y should be finite`)
    assert.ok(node.radius > 20)
  }
  const benzene = laidOut.nodes.find((node) => node.id === "compound:benzene")
  const aromaticity = laidOut.nodes.find((node) => node.id === "concept:aromaticity")
  assert.notDeepEqual([benzene.x, benzene.y], [aromaticity.x, aromaticity.y])
}

function testKnowledgeSearch() {
  assert.equal(search.searchKnowledgeGraph("benzene")[0].id, "compound:benzene")
  assert.equal(search.searchKnowledgeGraph("SN2")[0].id, "mechanism:sn2")
  assert.equal(search.searchKnowledgeGraph("carbonyl")[0].id, "functional-group:carbonyl")
  assert.equal(search.searchKnowledgeGraph("HOMO")[0].id, "mo:homo")
  assert.equal(search.searchKnowledgeGraph("sp2")[0].id, "hybridization:sp2")
}

function testCurriculumEngine() {
  const organic = curriculum.getCurriculumGraphMode("Organic Chemistry I")
  assert.ok(organic.nodes.some((node) => node.id === "compound:benzene"))
  assert.ok(organic.nodes.some((node) => node.id === "mechanism:sn2"))
  assert.ok(!organic.nodes.some((node) => node.id === "formula:ph"))
  assert.ok(organic.coverage.visibleNodes > 10)

  const beginner = curriculum.filterKnowledgeGraphByCurriculum({ difficulty: "Beginner" })
  assert.ok(beginner.nodes.every((node) => node.difficulty === "Beginner"))
}

function testGraphNavigation() {
  const pathToAromaticity = engine.findShortestEducationalPath("compound:benzene", "concept:aromaticity")
  assert.equal(pathToAromaticity[0].id, "compound:benzene")
  assert.equal(pathToAromaticity[pathToAromaticity.length - 1].id, "concept:aromaticity")
  assert.ok(pathToAromaticity.length >= 2)

  const learningPath = engine.getAromaticityLearningPath()
  assert.equal(learningPath[0].id, "hybridization:sp2")
  assert.equal(learningPath[learningPath.length - 1].id, "practice:aromaticity")
  assert.ok(learningPath.some((node) => node.id === "concept:huckel-rule"))
}

function testScannerKnowledgeBridge() {
  const href = engine.scannerKnowledgeGraphHref("benzene")
  assert.equal(href, "/knowledge-graph?focus=compound%3Abenzene")
  assert.equal(search.resolveKnowledgeNodeId("compound:benzene"), "compound:benzene")
  assert.equal(search.resolveKnowledgeNodeId("benzene"), "compound:benzene")
}

function testMechanismKnowledgeBridge() {
  const href = engine.mechanismKnowledgeGraphHref("benzene-bromination")
  assert.equal(href, "/knowledge-graph?focus=mechanism%3Abenzene-bromination")
  const highlighted = engine.getHighlightedSubgraph("mechanism:benzene-bromination")
  assert.ok(highlighted.neighbors.some((node) => node.id === "compound:benzene"))
  assert.ok(highlighted.neighbors.some((node) => node.id === "concept:aromaticity"))
  assert.ok(graphData.KNOWLEDGE_GRAPH_EDGES.some((edge) => edge.type === "usesMechanism"))
}

const tests = {
  "knowledge-graph": testKnowledgeGraph,
  "graph-layout": testGraphLayout,
  "knowledge-search": testKnowledgeSearch,
  "curriculum-engine": testCurriculumEngine,
  "graph-navigation": testGraphNavigation,
  "scanner-knowledge-bridge": testScannerKnowledgeBridge,
  "mechanism-knowledge-bridge": testMechanismKnowledgeBridge,
}

if (!tests[mode]) throw new Error(`Unknown knowledge graph verification mode: ${mode}`)
tests[mode]()
console.log(`knowledge graph verification passed: ${mode}`)
