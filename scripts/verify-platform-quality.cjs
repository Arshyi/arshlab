const assert = require("node:assert/strict")
const { existsSync, readdirSync, readFileSync, rmSync, statSync } = require("node:fs")
const { tmpdir } = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

const mode = process.argv[2] ?? "platform-smoke"
const root = path.resolve(__dirname, "..")

const requiredRoutes = [
  "/",
  "/chemistry-hub",
  "/structure-scanner",
  "/interactive-learning",
  "/interactive-learning/explorer",
  "/interactive-learning/conjugation",
  "/interactive-learning/mechanisms",
  "/knowledge-graph",
  "/chemistry-database",
  "/reaction-database",
  "/spectroscopy-explorer",
  "/lab-explorer",
  "/learning-dashboard",
  "/roadmap",
  "/patch-notes",
  "/privacy",
]

function read(relativePath) {
  return readFileSync(path.join(root, relativePath), "utf8")
}

function routeFile(route) {
  if (route === "/") return path.join(root, "app", "page.tsx")
  const parts = route.split("/").filter(Boolean)
  return path.join(root, "app", ...parts, "page.tsx")
}

function routeExists(route) {
  const normalized = route.split(/[?#]/)[0].replace(/\/$/, "") || "/"
  if (normalized.startsWith("/api/")) {
    const parts = normalized.split("/").filter(Boolean)
    return existsSync(path.join(root, "app", ...parts, "route.ts"))
  }
  return existsSync(routeFile(normalized))
}

function walk(directory, files = []) {
  for (const entry of readdirSync(directory)) {
    const fullPath = path.join(directory, entry)
    const relative = path.relative(root, fullPath).replace(/\\/g, "/")
    if (relative.startsWith(".next/") || relative.startsWith("node_modules/") || relative.startsWith(".git/")) continue
    if (statSync(fullPath).isDirectory()) walk(fullPath, files)
    else if (/\.(tsx?|jsx?)$/.test(entry)) files.push(fullPath)
  }
  return files
}

function collectStaticInternalLinks() {
  const files = [...walk(path.join(root, "app")), ...walk(path.join(root, "components"))]
  const links = []
  const patterns = [
    /href\s*=\s*["'](\/[^"']+)["']/g,
    /href\s*:\s*["'](\/[^"']+)["']/g,
  ]

  for (const file of files) {
    const source = readFileSync(file, "utf8")
    for (const pattern of patterns) {
      for (const match of source.matchAll(pattern)) {
        const href = match[1]
        if (!href || href.startsWith("//")) continue
        links.push({
          href,
          file: path.relative(root, file).replace(/\\/g, "/"),
        })
      }
    }
  }

  return links
}

function normalizeHref(href) {
  return href.split(/[?#]/)[0].replace(/\/$/, "") || "/"
}

function testRouteLinks() {
  const links = collectStaticInternalLinks()
  assert.ok(links.length > 50, "expected to find static internal links")

  const broken = links
    .map((link) => ({ ...link, route: normalizeHref(link.href) }))
    .filter((link) => !routeExists(link.route))
    .filter((link) => !link.route.includes("${"))

  assert.deepEqual(broken, [])
}

function testNavigation() {
  const navbar = read("components/navbar.tsx")
  const footer = read("components/site-footer.tsx")
  const home = read("app/page.tsx")
  const hub = read("app/chemistry-hub/page.tsx")

  for (const route of requiredRoutes) {
    assert.ok(routeExists(route), `${route} route should exist`)
  }

  for (const route of [
    "/knowledge-graph",
    "/structure-scanner",
    "/interactive-learning",
    "/interactive-learning/explorer",
    "/interactive-learning/mechanisms",
    "/chemistry-hub",
    "/privacy",
    "/terms",
  ]) {
    assert.ok(navbar.includes(route), `navbar should include ${route}`)
  }

  for (const route of ["/privacy", "/terms", "/roadmap", "/patch-notes", "/chemistry-hub"]) {
    assert.ok(footer.includes(route), `footer should include ${route}`)
  }

  assert.ok(home.includes("/knowledge-graph"), "homepage should link to Knowledge Graph")
  assert.ok(hub.includes("/knowledge-graph"), "Chemistry Hub should link to Knowledge Graph")
}

function testAccessibilitySmoke() {
  const layout = read("app/layout.tsx")
  const navbar = read("components/navbar.tsx")
  const graph = read("app/knowledge-graph/knowledge-graph-client.tsx")

  assert.ok(layout.includes("Skip to main content"), "layout should include skip link")
  assert.ok(layout.includes('id="main-content"'), "main landmark should be targetable")
  assert.ok(navbar.includes("aria-label"), "navbar should include aria labels")
  assert.ok(navbar.includes("useReducedMotion"), "navbar should respect reduced motion")
  assert.ok(graph.includes('role="img"'), "knowledge graph SVG should have an image role")
  assert.ok(graph.includes('role="button"'), "graph nodes should expose button semantics")
  assert.ok(graph.includes("onKeyDown"), "graph nodes should support keyboard activation")
  assert.ok(graph.includes("aria-live"), "graph should announce fallback messages")
  assert.ok(graph.includes("No graph node matched"), "graph should include no-result empty state")
}

function compileKnowledgeGraph() {
  const outputDirectory = path.join(tmpdir(), "arshlab-platform-quality-knowledge-graph")
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

  return {
    engine: require(path.join(outputDirectory, "knowledge-graph", "knowledge-engine.js")),
    search: require(path.join(outputDirectory, "knowledge-graph", "knowledge-search.js")),
    curriculum: require(path.join(outputDirectory, "knowledge-graph", "curriculum-engine.js")),
  }
}

function testQueryParamFallbacks() {
  const { engine, search, curriculum } = compileKnowledgeGraph()
  assert.equal(search.resolveKnowledgeNodeId("not-a-real-node"), undefined)
  assert.equal(search.resolveKnowledgeNodeId("compound:benzene"), "compound:benzene")
  assert.equal(search.searchKnowledgeGraph("zzzzzz-no-match").length, 0)
  assert.ok(engine.getInteractiveKnowledgeGraph({ curriculum: "All", difficulty: "All" }).nodes.length > 0)
  assert.equal(curriculum.filterKnowledgeGraphByCurriculum({ difficulty: "Graduate" }).nodes.length, 0)

  const graphClient = read("app/knowledge-graph/knowledge-graph-client.tsx")
  assert.ok(graphClient.includes("safeCurriculum"), "knowledge graph should sanitize curriculum query params")
  assert.ok(graphClient.includes("safeDifficulty"), "knowledge graph should sanitize difficulty query params")
  assert.ok(graphClient.includes("invalidInitialFocus"), "knowledge graph should detect invalid focus query params")
}

function testPlatformSmoke() {
  const packageJson = JSON.parse(read("package.json"))
  const patchNotes = read("app/patch-notes/page.tsx")
  const roadmap = read("app/roadmap/page.tsx")
  const graph = read("app/knowledge-graph/knowledge-graph-client.tsx")

  assert.equal(packageJson.version, "13.2.0")
  assert.ok(patchNotes.includes('version: "13.2.0"'), "patch notes should include v13.2.0")
  assert.ok(roadmap.includes("Optional Creator Support Link"), "roadmap should mention v13.2.0")
  assert.ok(graph.includes("MAX_RENDERED_NODES"), "knowledge graph should include render safeguard")

  for (const route of requiredRoutes) {
    assert.ok(routeExists(route), `${route} route should exist`)
  }
}

const tests = {
  "route-links": testRouteLinks,
  navigation: testNavigation,
  "accessibility-smoke": testAccessibilitySmoke,
  "query-param-fallbacks": testQueryParamFallbacks,
  "platform-smoke": testPlatformSmoke,
}

if (!tests[mode]) throw new Error(`Unknown platform quality verification mode: ${mode}`)
tests[mode]()
console.log(`platform quality verification passed: ${mode}`)
