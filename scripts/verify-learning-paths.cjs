const assert = require("node:assert/strict")
const { rmSync } = require("node:fs")
const { tmpdir } = require("node:os")
const path = require("node:path")
const { spawnSync } = require("node:child_process")

const mode = process.argv[2] ?? "learning-paths"
const root = path.resolve(__dirname, "..")
const outputDirectory = path.join(tmpdir(), `arshlab-learning-paths-${mode}`)
const tscPath = require.resolve("typescript/bin/tsc")

rmSync(outputDirectory, { recursive: true, force: true })
const compile = spawnSync(process.execPath, [
  tscPath,
  "lib/learning-paths/curriculum.ts",
  "lib/learning-paths/progress-engine.ts",
  "lib/learning-paths/mastery-engine.ts",
  "lib/learning-paths/prerequisites.ts",
  "lib/learning-paths/recommendation-engine.ts",
  "lib/learning-paths/lesson-sequencer.ts",
  "lib/learning-paths/index.ts",
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

const paths = require(path.join(outputDirectory, "index.js"))

function completedState(lessonIds, quizScore = 80) {
  const lessons = {}
  for (const id of lessonIds) {
    lessons[id] = {
      lessonId: id,
      status: "completed",
      startedAt: "2026-06-01T00:00:00.000Z",
      completedAt: "2026-06-02T00:00:00.000Z",
      lastVisitedAt: "2026-06-02T00:00:00.000Z",
      quizAttempts: 1,
      quizCorrect: quizScore >= 70 ? 1 : 0,
      bestQuizScore: quizScore,
    }
  }
  return paths.normalizeLearningPathProgress({ lessons, activities: [] })
}

function testLearningPaths() {
  const list = paths.listLearningPaths()
  assert.equal(list.length, 8)
  assert.ok(paths.listLearningLessons().length >= 30)
  for (const id of [
    "general-chemistry-i",
    "organic-chemistry-i",
    "organic-chemistry-ii",
    "analytical-chemistry",
    "spectroscopy",
    "laboratory-skills",
    "molecular-orbital-theory",
    "reaction-mechanisms",
  ]) {
    assert.ok(paths.getLearningPath(id).lessons.length > 0, `${id} should have lessons`)
  }
  assert.match(paths.learningPathHref("organic-chemistry-i", "org1-aromaticity"), /learning-paths/)
}

function testMastery() {
  const organic = paths.getLearningPath("organic-chemistry-i")
  const state = completedState(organic.lessons.map((lesson) => lesson.id), 95)
  const mastery = paths.calculateLearningMastery(state)
  const organicMastery = mastery.trackMastery.find((track) => track.pathId === "organic-chemistry-i")
  assert.equal(organicMastery.level, "Advanced")
  assert.ok(organicMastery.masteryScore >= 90)
  assert.ok(mastery.overallScore > 0)
}

function testRecommendations() {
  const state = completedState(["org1-functional-groups", "org1-hybridization", "org1-conjugation", "org1-resonance"], 85)
  const recommendations = paths.generateLearningPathRecommendations(state, "org1-resonance")
  assert.equal(recommendations.nextLesson.lessonId, "org1-aromaticity")
  assert.ok(recommendations.relatedKnowledgeGraph?.href.includes("knowledge-graph") || recommendations.nextLesson.href.includes("learning-paths"))
  const placement = paths.learningPathPlacementHref("compound:benzene")
  assert.match(placement, /learning-paths/)
}

function testProgress() {
  const blank = paths.normalizeLearningPathProgress({})
  const started = paths.setLessonStatus("gen-atomic-structure", "in-progress", blank)
  assert.equal(started.lessons["gen-atomic-structure"].status, "in-progress")
  const completed = paths.setLessonStatus("gen-atomic-structure", "completed", started)
  assert.equal(completed.lessons["gen-atomic-structure"].status, "completed")
  const scored = paths.recordQuizScore("gen-atomic-structure", 88, completed)
  assert.equal(scored.lessons["gen-atomic-structure"].bestQuizScore, 88)
  const summary = paths.summarizeLearningPathProgress(scored)
  assert.equal(summary.completedLessons, 1)
  assert.equal(summary.quizAttempts, 1)
}

function testCurriculum() {
  const metrics = paths.getLearningPathMetrics()
  assert.equal(metrics.paths, 8)
  assert.ok(metrics.links >= metrics.lessons)
  assert.ok(metrics.virtualLabs >= 3)
  assert.ok(metrics.mechanisms >= 3)
  const chain = paths.getPrerequisiteChain("aromaticity")
  assert.deepEqual(chain.map((item) => item.lessonId), [
    "org1-hybridization",
    "org1-conjugation",
    "org1-resonance",
    "org1-aromaticity",
    "org2-eas",
  ])
}

function testLearningDashboard() {
  const state = completedState(["gen-atomic-structure", "gen-electron-configuration"], 75)
  const summary = paths.summarizeLearningPathProgress({
    ...state,
    activities: [
      { id: "lab", type: "lab-completed", label: "Ammonia pH Lab", createdAt: "2026-06-10T00:00:00.000Z" },
      { id: "mech", type: "mechanism-practiced", label: "SN2", createdAt: "2026-06-11T00:00:00.000Z" },
      { id: "scan", type: "scanner-exercise-completed", label: "benzene", createdAt: "2026-06-12T00:00:00.000Z" },
    ],
  })
  assert.ok(summary.overallCompletion > 0)
  assert.equal(summary.labsCompleted, 1)
  assert.equal(summary.mechanismsPracticed, 1)
  assert.equal(summary.scannerExercisesCompleted, 1)
}

function testLessonSequencer() {
  const state = completedState(["gen-atomic-structure"], 90)
  const sequence = paths.sequenceLearningPath("general-chemistry-i", state)
  assert.equal(sequence.currentLesson.id, "gen-electron-configuration")
  assert.ok(sequence.lessons.some((item) => item.lesson.id === "gen-periodic-trends"))
  const timeline = paths.getLearningTimeline(state)
  assert.equal(timeline[0].lesson.id, "gen-atomic-structure")
  const next = paths.getNextLessonAfter("gen-atomic-structure", state)
  assert.equal(next.id, "gen-electron-configuration")
}

const tests = {
  "learning-paths": testLearningPaths,
  mastery: testMastery,
  recommendations: testRecommendations,
  progress: testProgress,
  curriculum: testCurriculum,
  "learning-dashboard": testLearningDashboard,
  "lesson-sequencer": testLessonSequencer,
}

if (!tests[mode]) throw new Error(`Unknown learning path verification mode: ${mode}`)
tests[mode]()
console.log(`learning path verification passed: ${mode}`)
