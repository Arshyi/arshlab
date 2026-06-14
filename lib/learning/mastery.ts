import {
  calculateCurriculumProgress,
  getCurriculum,
  type CurriculumId,
  type CurriculumProgressEntry,
  type CurriculumUnit,
} from "@/lib/curriculum/curriculum-registry"

export type LearningSource = "diagnostic" | "practice" | "exam" | "recovery"
export type MasteryBand = "Needs Work" | "Developing" | "Ready" | "Exam Ready"

export interface LearningProgressEntry extends CurriculumProgressEntry {
  id?: string
  difficulty?: string
  source?: "ai" | "database"
  examSource?: "ai" | "database" | "hybrid" | "adaptive"
  timestamp?: string
}

export interface SourceMasteryBreakdown {
  source: LearningSource
  attempted: number
  correct: number
  accuracy: number
  /**
   * Fixed v3.5 mastery weight.
   * Active sources are re-normalized when one source has no attempts yet.
   */
  weight: number
}

export interface TopicMasteryScore {
  topic: string
  attempted: number
  correct: number
  mastery: number
  band: MasteryBand
  breakdown: SourceMasteryBreakdown[]
}

export interface UnitMasteryScore {
  unit: CurriculumUnit
  attempted: number
  correct: number
  mastery: number
  band: MasteryBand
  completed: boolean
}

export interface ChemistryMasteryProfile {
  topicMastery: TopicMasteryScore[]
  unitMastery: UnitMasteryScore[]
  overallMastery: number
  overallBand: MasteryBand
  examReadiness: number
  examReadinessBand: "Needs Preparation" | "Developing" | "Ready" | "Exam Ready"
  curriculumCompletion: {
    completedUnits: number
    unitsRemaining: number
    estimatedCompletion: number
    estimatedGraduation: string
  }
  diagnosticCoverage: number
  studyStreak: number
  calculations: number
}

export const MASTERY_WEIGHTS: Record<LearningSource, number> = {
  diagnostic: 0.25,
  practice: 0.35,
  exam: 0.3,
  recovery: 0.1,
}

export function clampPercent(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0
}

function safeCount(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
}

function percentage(correct: number, total: number): number {
  const safeTotal = safeCount(total)
  if (safeTotal === 0) return 0
  return clampPercent((safeCount(correct) / safeTotal) * 100)
}

function normalizeTopic(topic: string | null | undefined): string {
  const trimmed = topic?.trim()
  return trimmed ? trimmed.slice(0, 120) : "General Chemistry"
}

function safeTimestamp(value: string | undefined): number {
  if (!value) return 0
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : 0
}

export function getMasteryBand(score: number): MasteryBand {
  const safeScore = clampPercent(score)
  if (safeScore < 40) return "Needs Work"
  if (safeScore < 60) return "Developing"
  if (safeScore < 80) return "Ready"
  return "Exam Ready"
}

export function getExamReadinessBand(
  score: number,
): "Needs Preparation" | "Developing" | "Ready" | "Exam Ready" {
  const safeScore = clampPercent(score)
  if (safeScore < 40) return "Needs Preparation"
  if (safeScore < 60) return "Developing"
  if (safeScore < 80) return "Ready"
  return "Exam Ready"
}

export function classifyLearningSource(entry: LearningProgressEntry): LearningSource {
  const questionType = entry.questionType?.toLowerCase() ?? ""
  if (questionType.includes("diagnostic")) return "diagnostic"
  if (questionType.includes("recovery")) return "recovery"
  if (questionType.includes("exam") || entry.examSource) return "exam"
  return "practice"
}

function calculateWeightedMastery(entries: LearningProgressEntry[]): {
  mastery: number
  breakdown: SourceMasteryBreakdown[]
} {
  const breakdown = (Object.keys(MASTERY_WEIGHTS) as LearningSource[]).map((source) => {
    const sourceEntries = entries.filter((entry) => classifyLearningSource(entry) === source)
    const correct = sourceEntries.filter((entry) => entry.correct).length
    return {
      source,
      attempted: sourceEntries.length,
      correct,
      accuracy: percentage(correct, sourceEntries.length),
      weight: MASTERY_WEIGHTS[source],
    }
  })

  const activeWeight = breakdown
    .filter((item) => item.attempted > 0)
    .reduce((sum, item) => sum + (Number.isFinite(item.weight) ? item.weight : 0), 0)

  if (activeWeight === 0) return { mastery: 0, breakdown }

  const mastery = breakdown
    .filter((item) => item.attempted > 0)
    .reduce((sum, item) => sum + item.accuracy * (item.weight / activeWeight), 0)

  return { mastery: clampPercent(mastery), breakdown }
}

function groupEntriesByTopic(entries: LearningProgressEntry[]): Map<string, LearningProgressEntry[]> {
  const groups = new Map<string, LearningProgressEntry[]>()
  for (const entry of entries) {
    const topic = normalizeTopic(entry.topic)
    const current = groups.get(topic) ?? []
    current.push(entry)
    groups.set(topic, current)
  }
  return groups
}

function getStudyStreak(entries: LearningProgressEntry[]): number {
  const days = new Set(
    entries
      .map((entry) => entry.timestamp)
      .filter((value): value is string => Boolean(value))
      .map((value) => new Date(value))
      .filter((date) => !Number.isNaN(date.getTime()))
      .map((date) => date.toISOString().slice(0, 10)),
  )
  if (days.size === 0) return 0

  let streak = 0
  const cursor = new Date()
  for (;;) {
    const key = cursor.toISOString().slice(0, 10)
    if (!days.has(key)) break
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

function estimateGraduation(unitsRemaining: number, estimatedCompletion: number): string {
  const safeRemaining = safeCount(unitsRemaining)
  if (safeRemaining === 0 || clampPercent(estimatedCompletion) >= 100) return "Curriculum complete"
  const days = Math.max(7, safeRemaining * 5)
  const date = new Date()
  date.setDate(date.getDate() + days)
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

export function calculateTopicMastery(entries: LearningProgressEntry[]): TopicMasteryScore[] {
  return Array.from(groupEntriesByTopic(entries).entries())
    .map(([topic, topicEntries]) => {
      const attempted = safeCount(topicEntries.length)
      const correct = safeCount(topicEntries.filter((entry) => entry.correct).length)
      const weighted = calculateWeightedMastery(topicEntries)
      return {
        topic,
        attempted,
        correct,
        mastery: weighted.mastery,
        band: getMasteryBand(weighted.mastery),
        breakdown: weighted.breakdown,
      }
    })
    .sort((a, b) => a.mastery - b.mastery || b.attempted - a.attempted || a.topic.localeCompare(b.topic))
}

export function calculateChemistryMasteryProfile(
  entries: LearningProgressEntry[],
  curriculumId?: CurriculumId | string | null,
): ChemistryMasteryProfile {
  const safeEntries = entries
    .filter((entry) => Boolean(entry))
    .map((entry) => ({
      ...entry,
      topic: normalizeTopic(entry.topic),
      correct: Boolean(entry.correct),
    }))
    .sort((a, b) => safeTimestamp(b.timestamp) - safeTimestamp(a.timestamp))
  const curriculum = getCurriculum(curriculumId)
  const curriculumSummary = calculateCurriculumProgress(safeEntries, curriculum.id)
  const topicMastery = calculateTopicMastery(safeEntries)
  const overall = calculateWeightedMastery(safeEntries)
  const examEntries = safeEntries.filter((entry) => classifyLearningSource(entry) === "exam")
  const examCorrect = examEntries.filter((entry) => entry.correct).length
  const diagnosticEntries = safeEntries.filter((entry) => classifyLearningSource(entry) === "diagnostic")
  const diagnosticCorrect = diagnosticEntries.filter((entry) => entry.correct).length
  const examAccuracy = percentage(examCorrect, examEntries.length)
  const diagnosticAccuracy = percentage(diagnosticCorrect, diagnosticEntries.length)
  const examReadiness = clampPercent(
    overall.mastery * 0.5 +
      examAccuracy * 0.25 +
      diagnosticAccuracy * 0.15 +
      curriculumSummary.overallProgress * 0.1,
  )
  const unitMastery = curriculumSummary.units.map((unit) => ({
    unit: unit.unit,
    attempted: safeCount(unit.attempted),
    correct: safeCount(unit.correct),
    mastery: clampPercent(unit.mastery),
    band: getMasteryBand(clampPercent(unit.mastery)),
    completed: clampPercent(unit.mastery) >= 80 && safeCount(unit.attempted) >= 5,
  }))
  const completedUnits = unitMastery.filter((unit) => unit.completed).length
  const unitsRemaining = Math.max(0, unitMastery.length - completedUnits)
  const estimatedCompletion = unitMastery.length
    ? clampPercent((completedUnits / unitMastery.length) * 100)
    : 0

  return {
    topicMastery,
    unitMastery,
    overallMastery: clampPercent(overall.mastery),
    overallBand: getMasteryBand(overall.mastery),
    examReadiness,
    examReadinessBand: getExamReadinessBand(examReadiness),
    curriculumCompletion: {
      completedUnits,
      unitsRemaining,
      estimatedCompletion,
      estimatedGraduation: estimateGraduation(unitsRemaining, estimatedCompletion),
    },
    diagnosticCoverage: clampPercent(curriculumSummary.diagnosticCoverage),
    studyStreak: safeCount(getStudyStreak(safeEntries)),
    calculations: topicMastery.length + unitMastery.length + 4,
  }
}
