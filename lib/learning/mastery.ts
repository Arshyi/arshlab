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

function percentage(correct: number, total: number): number {
  return total > 0 ? Math.round((correct / total) * 100) : 0
}

export function getMasteryBand(score: number): MasteryBand {
  if (score < 40) return "Needs Work"
  if (score < 60) return "Developing"
  if (score < 80) return "Ready"
  return "Exam Ready"
}

export function getExamReadinessBand(
  score: number,
): "Needs Preparation" | "Developing" | "Ready" | "Exam Ready" {
  if (score < 40) return "Needs Preparation"
  if (score < 60) return "Developing"
  if (score < 80) return "Ready"
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
    .reduce((sum, item) => sum + item.weight, 0)

  if (activeWeight === 0) return { mastery: 0, breakdown }

  const mastery = breakdown
    .filter((item) => item.attempted > 0)
    .reduce((sum, item) => sum + item.accuracy * (item.weight / activeWeight), 0)

  return { mastery: Math.round(mastery), breakdown }
}

function groupEntriesByTopic(entries: LearningProgressEntry[]): Map<string, LearningProgressEntry[]> {
  const groups = new Map<string, LearningProgressEntry[]>()
  for (const entry of entries) {
    const current = groups.get(entry.topic) ?? []
    current.push(entry)
    groups.set(entry.topic, current)
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
  if (unitsRemaining === 0 || estimatedCompletion >= 100) return "Curriculum complete"
  const days = Math.max(7, unitsRemaining * 5)
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
      const correct = topicEntries.filter((entry) => entry.correct).length
      const weighted = calculateWeightedMastery(topicEntries)
      return {
        topic,
        attempted: topicEntries.length,
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
  const curriculum = getCurriculum(curriculumId)
  const curriculumSummary = calculateCurriculumProgress(entries, curriculum.id)
  const topicMastery = calculateTopicMastery(entries)
  const overall = calculateWeightedMastery(entries)
  const examEntries = entries.filter((entry) => classifyLearningSource(entry) === "exam")
  const examCorrect = examEntries.filter((entry) => entry.correct).length
  const diagnosticEntries = entries.filter((entry) => classifyLearningSource(entry) === "diagnostic")
  const diagnosticCorrect = diagnosticEntries.filter((entry) => entry.correct).length
  const examAccuracy = percentage(examCorrect, examEntries.length)
  const diagnosticAccuracy = percentage(diagnosticCorrect, diagnosticEntries.length)
  const examReadiness = Math.round(
    overall.mastery * 0.5 +
      examAccuracy * 0.25 +
      diagnosticAccuracy * 0.15 +
      curriculumSummary.overallProgress * 0.1,
  )
  const unitMastery = curriculumSummary.units.map((unit) => ({
    unit: unit.unit,
    attempted: unit.attempted,
    correct: unit.correct,
    mastery: unit.mastery,
    band: getMasteryBand(unit.mastery),
    completed: unit.mastery >= 80 && unit.attempted >= 5,
  }))
  const completedUnits = unitMastery.filter((unit) => unit.completed).length
  const unitsRemaining = Math.max(0, unitMastery.length - completedUnits)
  const estimatedCompletion = unitMastery.length
    ? Math.round((completedUnits / unitMastery.length) * 100)
    : 0

  return {
    topicMastery,
    unitMastery,
    overallMastery: overall.mastery,
    overallBand: getMasteryBand(overall.mastery),
    examReadiness,
    examReadinessBand: getExamReadinessBand(examReadiness),
    curriculumCompletion: {
      completedUnits,
      unitsRemaining,
      estimatedCompletion,
      estimatedGraduation: estimateGraduation(unitsRemaining, estimatedCompletion),
    },
    diagnosticCoverage: curriculumSummary.diagnosticCoverage,
    studyStreak: getStudyStreak(entries),
    calculations: topicMastery.length + unitMastery.length + 4,
  }
}
