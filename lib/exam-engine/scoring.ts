import type { ExamCoverageItem, ExamEngineMetrics, ExamEngineQuestion, ExamSourceMode } from "./types"

export function estimateExamCompletionMinutes(count: number): number {
  return Math.max(5, Math.round(count * 1.5))
}

export function getExamSourceBreakdown(questions: ExamEngineQuestion[]): {
  databaseCount: number
  aiCount: number
  databasePercent: number
  aiPercent: number
} {
  const databaseCount = questions.filter((question) => question.source === "database").length
  const aiCount = questions.filter((question) => question.source === "ai").length
  const total = questions.length || 1
  return {
    databaseCount,
    aiCount,
    databasePercent: Math.round((databaseCount / total) * 100),
    aiPercent: Math.round((aiCount / total) * 100),
  }
}

export function summarizeCoverage(questions: ExamEngineQuestion[]): ExamCoverageItem[] {
  const groups = new Map<string, number>()

  for (const question of questions) {
    const label = question.blueprintSection ?? question.topic
    groups.set(label, (groups.get(label) ?? 0) + 1)
  }

  return Array.from(groups.entries())
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

export function getCurriculumUnitsTested(questions: ExamEngineQuestion[]): string[] {
  return Array.from(
    new Set(
      questions
        .map((question) => question.curriculumUnit ?? question.blueprintSection ?? question.topic)
        .filter(Boolean),
    ),
  ).sort()
}

export function getCoveragePercent(questions: ExamEngineQuestion[], expectedSections: number): number {
  if (!questions.length || expectedSections <= 0) return 0
  const tested = new Set(questions.map((question) => question.blueprintSection ?? question.topic)).size
  return Math.min(100, Math.round((tested / expectedSections) * 100))
}

export function buildExamMetrics(
  questions: ExamEngineQuestion[],
  expectedSections: number,
): ExamEngineMetrics {
  const breakdown = getExamSourceBreakdown(questions)
  return {
    questionsGenerated: questions.length,
    ...breakdown,
    estimatedMinutes: estimateExamCompletionMinutes(questions.length),
    coveragePercent: getCoveragePercent(questions, expectedSections),
  }
}

export function getExamSourceLabel(source: ExamSourceMode): string {
  if (source === "database") return "Database Only"
  if (source === "ai") return "AI Only"
  if (source === "adaptive") return "Adaptive Database"
  return "Hybrid"
}
