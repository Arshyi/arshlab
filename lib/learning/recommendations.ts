import {
  calculateCurriculumProgress,
  getCurriculum,
  getUnitForTopic,
  type CurriculumId,
  type CurriculumUnitProgress,
} from "@/lib/curriculum/curriculum-registry"
import {
  calculateChemistryMasteryProfile,
  classifyLearningSource,
  type ChemistryMasteryProfile,
  type LearningProgressEntry,
  type TopicMasteryScore,
} from "./mastery"
import {
  calculateConceptStats,
  calculateTopicStats,
  type LearningConceptStats,
  type LearningTopicStats,
} from "./recovery"

export type RecommendationPriority = "High" | "Medium" | "Low"

export interface LearningRecommendation {
  id: string
  title: string
  action: string
  href: string
  priority: RecommendationPriority
  mastery: number
  reason: string
}

export interface AchievementDefinition {
  id: string
  label: string
  description: string
  unlocked: boolean
  progress: number
}

export interface AdaptiveLearningSummary {
  strongestTopic: TopicMasteryScore | null
  weakestTopic: TopicMasteryScore | null
  weakestUnit: CurriculumUnitProgress | null
  nextRecommendedUnit: CurriculumUnitProgress | null
  nextRecommendedTopic: string
  suggestedRecoveryTopic: string
  suggestedExamFocus: string
  recommendations: {
    today: LearningRecommendation[]
    thisWeek: LearningRecommendation[]
    longTerm: LearningRecommendation[]
  }
  mastery: ChemistryMasteryProfile
  topicStats: LearningTopicStats[]
  conceptStats: LearningConceptStats[]
  metrics: {
    topicsTracked: number
    unitsTracked: number
    masteryCalculations: number
    recommendationsGenerated: number
    achievementsAvailable: number
  }
  achievements: AchievementDefinition[]
}

function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function percentage(correct: number, total: number): number {
  return total > 0 ? Math.round((correct / total) * 100) : 0
}

function recentMissScore(entries: LearningProgressEntry[], topic: string): number {
  return entries
    .slice(0, 30)
    .filter((entry) => entry.topic === topic && !entry.correct)
    .length
}

function diagnosticWeaknessScore(entries: LearningProgressEntry[], topic: string): number {
  const diagnostic = entries.filter(
    (entry) => entry.topic === topic && classifyLearningSource(entry) === "diagnostic",
  )
  if (diagnostic.length === 0) return 0
  return 100 - percentage(diagnostic.filter((entry) => entry.correct).length, diagnostic.length)
}

function recoveryHistoryScore(entries: LearningProgressEntry[], topic: string): number {
  const recovery = entries.filter(
    (entry) => entry.topic === topic && classifyLearningSource(entry) === "recovery",
  )
  if (recovery.length === 0) return 15
  return 100 - percentage(recovery.filter((entry) => entry.correct).length, recovery.length)
}

export function prioritizeRecoveryTopics(
  entries: LearningProgressEntry[],
  curriculumId?: CurriculumId | string | null,
): LearningTopicStats[] {
  const curriculum = getCurriculum(curriculumId)
  const topicStats = calculateTopicStats(entries)
  const curriculumSummary = calculateCurriculumProgress(entries, curriculum.id)
  const unitPenaltyByTopic = new Map<string, number>()

  for (const unit of curriculumSummary.units) {
    const penalty = unit.attempted === 0 ? 20 : Math.max(0, 100 - unit.mastery)
    for (const topic of unit.unit.topics) {
      unitPenaltyByTopic.set(topic, Math.max(unitPenaltyByTopic.get(topic) ?? 0, penalty))
    }
  }

  return [...topicStats]
    .filter((topic) => topic.attempted >= 3 || (unitPenaltyByTopic.get(topic.topic) ?? 0) >= 50)
    .map((topic) => {
      const score =
        (100 - topic.accuracy) * 0.35 +
        diagnosticWeaknessScore(entries, topic.topic) * 0.25 +
        (unitPenaltyByTopic.get(topic.topic) ?? 0) * 0.25 +
        recentMissScore(entries, topic.topic) * 8 +
        recoveryHistoryScore(entries, topic.topic) * 0.05
      return { topic, score }
    })
    .sort((a, b) => b.score - a.score || a.topic.accuracy - b.topic.accuracy || b.topic.attempted - a.topic.attempted)
    .map(({ topic }) => topic)
}

function linkWithTopic(base: string, topic: string, unitId?: string): string {
  const params = new URLSearchParams()
  if (topic) params.set("topic", topic)
  if (unitId) params.set("unit", unitId)
  const query = params.toString()
  return query ? `${base}?${query}` : base
}

function topTopicByMastery(topics: TopicMasteryScore[], strongest: boolean): TopicMasteryScore | null {
  const attempted = topics.filter((topic) => topic.attempted > 0)
  if (attempted.length === 0) return null
  return [...attempted].sort((a, b) =>
    strongest
      ? b.mastery - a.mastery || b.attempted - a.attempted
      : a.mastery - b.mastery || b.attempted - a.attempted,
  )[0] ?? null
}

function getCorrectStreak(entries: LearningProgressEntry[]): number {
  let streak = 0
  for (const entry of entries) {
    if (!entry.correct) break
    streak += 1
  }
  return streak
}

function buildAchievementDefinitions(
  entries: LearningProgressEntry[],
  mastery: ChemistryMasteryProfile,
  xp = 0,
): AchievementDefinition[] {
  const total = entries.length
  const correct = entries.filter((entry) => entry.correct).length
  const exams = entries.filter((entry) => classifyLearningSource(entry) === "exam")
  const recovery = entries.filter((entry) => classifyLearningSource(entry) === "recovery")
  const diagnostics = entries.filter((entry) => classifyLearningSource(entry) === "diagnostic")
  const spectroscopy = entries.filter((entry) =>
    `${entry.topic} ${entry.subtopic ?? ""}`.toLowerCase().includes("spectroscopy"),
  )
  const database = entries.filter((entry) => entry.source === "database")
  const correctStreak = getCorrectStreak(entries)
  const masteredUnit = mastery.unitMastery.some((unit) => unit.completed)
  const masteredTopic = mastery.topicMastery.some((topic) => topic.mastery >= 90 && topic.attempted >= 5)

  return [
    {
      id: "diagnostic-explorer",
      label: "Diagnostic Explorer",
      description: "Complete diagnostic-style tracked questions.",
      unlocked: diagnostics.length >= 10,
      progress: clampPercent((diagnostics.length / 10) * 100),
    },
    {
      id: "spectroscopy-apprentice",
      label: "Spectroscopy Apprentice",
      description: "Attempt ten spectroscopy questions.",
      unlocked: spectroscopy.length >= 10,
      progress: clampPercent((spectroscopy.length / 10) * 100),
    },
    {
      id: "database-scholar",
      label: "Database Scholar",
      description: "Attempt twenty database-generated questions.",
      unlocked: database.length >= 20,
      progress: clampPercent((database.length / 20) * 100),
    },
    {
      id: "exam-veteran",
      label: "Exam Veteran",
      description: "Attempt fifty exam questions.",
      unlocked: exams.length >= 50,
      progress: clampPercent((exams.length / 50) * 100),
    },
    {
      id: "curriculum-master",
      label: "Curriculum Master",
      description: "Complete every tracked unit above the mastery threshold.",
      unlocked: mastery.curriculumCompletion.unitsRemaining === 0 && mastery.unitMastery.length > 0,
      progress: mastery.curriculumCompletion.estimatedCompletion,
    },
    {
      id: "recovery-specialist",
      label: "Recovery Specialist",
      description: "Attempt thirty recovery questions.",
      unlocked: recovery.length >= 30,
      progress: clampPercent((recovery.length / 30) * 100),
    },
    {
      id: "100-questions-completed",
      label: "100 Questions Completed",
      description: "Complete one hundred tracked chemistry questions.",
      unlocked: total >= 100,
      progress: clampPercent((total / 100) * 100),
    },
    {
      id: "1000-xp",
      label: "1000 XP",
      description: "Reach the long-term XP milestone.",
      unlocked: xp >= 1000,
      progress: clampPercent((xp / 1000) * 100),
    },
    {
      id: "mastered-topic",
      label: "Mastered Topic",
      description: "Reach 90% mastery on a topic with at least five attempts.",
      unlocked: masteredTopic,
      progress: masteredTopic ? 100 : clampPercent(Math.max(0, ...mastery.topicMastery.map((topic) => topic.mastery))),
    },
    {
      id: "10-correct-in-a-row",
      label: "10 Correct In A Row",
      description: "Build a streak of ten correct recent answers.",
      unlocked: correctStreak >= 10,
      progress: clampPercent((correctStreak / 10) * 100),
    },
    {
      id: "unit-master",
      label: "Unit Master",
      description: "Complete one curriculum unit above the mastery threshold.",
      unlocked: masteredUnit,
      progress: masteredUnit ? 100 : mastery.curriculumCompletion.estimatedCompletion,
    },
  ]
}

export function generateLearningRecommendations(
  entries: LearningProgressEntry[],
  curriculumId?: CurriculumId | string | null,
  options: { xp?: number } = {},
): AdaptiveLearningSummary {
  const sortedEntries = [...entries].sort(
    (a, b) => new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime(),
  )
  const mastery = calculateChemistryMasteryProfile(sortedEntries, curriculumId)
  const curriculum = getCurriculum(curriculumId)
  const curriculumSummary = calculateCurriculumProgress(sortedEntries, curriculum.id)
  const topicStats = calculateTopicStats(sortedEntries)
  const conceptStats = calculateConceptStats(sortedEntries)
  const strongestTopic = topTopicByMastery(mastery.topicMastery, true)
  const weakestTopic = topTopicByMastery(mastery.topicMastery, false)
  const prioritizedRecoveryTopics = prioritizeRecoveryTopics(sortedEntries, curriculum.id)
  const suggestedRecoveryTopic =
    prioritizedRecoveryTopics[0]?.topic ??
    curriculumSummary.weakestUnit?.unit.topics[0] ??
    weakestTopic?.topic ??
    curriculum.topics[0] ??
    "Periodic Trends"
  const nextRecommendedUnit = curriculumSummary.recommendedNextUnit
  const nextRecommendedTopic =
    nextRecommendedUnit?.unit.topics[0] ??
    weakestTopic?.topic ??
    curriculum.recommendedOrder[0] ??
    "Stoichiometry"
  const examFocus =
    curriculumSummary.weakestUnit?.unit.title ??
    getUnitForTopic(curriculum, suggestedRecoveryTopic)?.title ??
    suggestedRecoveryTopic
  const recoveryUnit = getUnitForTopic(curriculum, suggestedRecoveryTopic)
  const nextUnitId = nextRecommendedUnit?.unit.id

  const today: LearningRecommendation[] = [
    {
      id: "practice-next-topic",
      title: `Practice ${nextRecommendedTopic}`,
      action: "Generate Practice",
      href: linkWithTopic("/practice-generator", nextRecommendedTopic, nextUnitId),
      priority: weakestTopic && weakestTopic.mastery < 60 ? "High" : "Medium",
      mastery: weakestTopic?.mastery ?? 0,
      reason: weakestTopic
        ? `${weakestTopic.topic} is your lowest tracked topic at ${weakestTopic.mastery}% mastery.`
        : "Start with the first recommended curriculum topic to build baseline data.",
    },
    {
      id: "recovery-target",
      title: `Recovery: ${suggestedRecoveryTopic}`,
      action: "Start Recovery",
      href: "/recovery",
      priority: "High",
      mastery: prioritizedRecoveryTopics[0]?.accuracy ?? weakestTopic?.mastery ?? 0,
      reason: "Recovery prioritizes diagnostic weaknesses, low-mastery units, and recently missed questions.",
    },
  ]

  const thisWeek: LearningRecommendation[] = [
    {
      id: "study-next-unit",
      title: nextRecommendedUnit ? `Study ${nextRecommendedUnit.unit.title}` : "Build your first study session",
      action: "Open Study Mode",
      href: linkWithTopic("/study", nextRecommendedTopic, nextUnitId),
      priority: "Medium",
      mastery: nextRecommendedUnit?.mastery ?? 0,
      reason: nextRecommendedUnit
        ? `${nextRecommendedUnit.unit.title} is next in the curriculum roadmap.`
        : "A study session gives the adaptive engine enough data to personalize future recommendations.",
    },
    {
      id: "review-weak-unit",
      title: curriculumSummary.weakestUnit
        ? `Review ${curriculumSummary.weakestUnit.unit.title}`
        : "Review foundational topics",
      action: "Open Study Plan",
      href: "/study-plan",
      priority: curriculumSummary.weakestUnit?.mastery && curriculumSummary.weakestUnit.mastery < 60 ? "High" : "Medium",
      mastery: curriculumSummary.weakestUnit?.mastery ?? 0,
      reason: curriculumSummary.weakestUnit
        ? `${curriculumSummary.weakestUnit.unit.title} is the weakest unit in your selected curriculum.`
        : "Review starts with curriculum foundations until more progress data exists.",
    },
  ]

  const longTerm: LearningRecommendation[] = [
    {
      id: "exam-readiness",
      title: `Exam readiness: ${mastery.examReadinessBand}`,
      action: "Generate Focused Exam",
      href: `/exam-generator?source=database&mode=adaptive&topic=${encodeURIComponent(suggestedRecoveryTopic)}`,
      priority: mastery.examReadiness < 60 ? "High" : mastery.examReadiness < 80 ? "Medium" : "Low",
      mastery: mastery.examReadiness,
      reason: `Suggested exam focus: ${examFocus}.`,
    },
    {
      id: "curriculum-roadmap",
      title: "Curriculum completion roadmap",
      action: "Open Curriculum",
      href: "/curriculum",
      priority: mastery.curriculumCompletion.unitsRemaining > 0 ? "Medium" : "Low",
      mastery: mastery.curriculumCompletion.estimatedCompletion,
      reason: `${mastery.curriculumCompletion.completedUnits} units complete, ${mastery.curriculumCompletion.unitsRemaining} remaining.`,
    },
  ]

  const achievements = buildAchievementDefinitions(sortedEntries, mastery, options.xp ?? 0)
  const recommendationsGenerated = today.length + thisWeek.length + longTerm.length

  return {
    strongestTopic,
    weakestTopic,
    weakestUnit: curriculumSummary.weakestUnit,
    nextRecommendedUnit,
    nextRecommendedTopic,
    suggestedRecoveryTopic: recoveryUnit ? `${suggestedRecoveryTopic}` : suggestedRecoveryTopic,
    suggestedExamFocus: examFocus,
    recommendations: { today, thisWeek, longTerm },
    mastery,
    topicStats,
    conceptStats,
    metrics: {
      topicsTracked: topicStats.length,
      unitsTracked: mastery.unitMastery.length,
      masteryCalculations: mastery.calculations,
      recommendationsGenerated,
      achievementsAvailable: achievements.length,
    },
    achievements,
  }
}
