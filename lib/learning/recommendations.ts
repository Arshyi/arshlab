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
export type RecommendedMode =
  | "Practice Generator"
  | "Recovery Mode"
  | "Study Mode"
  | "Exam Generator"
  | "Curriculum Review"
  | "Diagnostic"

export interface LearningRecommendation {
  id: string
  title: string
  topic: string
  action: string
  href: string
  priority: RecommendationPriority
  mastery: number
  reason: string
  suggestedMode: RecommendedMode
  estimatedTimeMinutes: number
}

export interface AchievementDefinition {
  id: string
  label: string
  description: string
  unlocked: boolean
  progress: number
}

export interface AdaptiveLearningSummary {
  hasUserData: boolean
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
  sevenDayPlan: SevenDayStudyPlanDay[]
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

export interface SevenDayStudyPlanDay {
  day: number
  label: string
  topics: string[]
  suggestedMode: RecommendedMode
  estimatedTimeMinutes: number
  reason: string
  href: string
  priority: RecommendationPriority
  fallback: boolean
}

function clampPercent(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.min(100, Math.round(value))) : 0
}

function percentage(correct: number, total: number): number {
  return total > 0 ? clampPercent((correct / total) * 100) : 0
}

function safeTimestamp(value: string | undefined): number {
  if (!value) return 0
  const time = new Date(value).getTime()
  return Number.isFinite(time) ? time : 0
}

function recentMissScore(entries: LearningProgressEntry[], topic: string): number {
  return [...entries]
    .sort((a, b) => safeTimestamp(b.timestamp) - safeTimestamp(a.timestamp))
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
    .sort(
      (a, b) =>
        b.score - a.score ||
        a.topic.accuracy - b.topic.accuracy ||
        b.topic.attempted - a.topic.attempted ||
        a.topic.topic.localeCompare(b.topic.topic),
    )
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

function firstCurriculumTopic(curriculum: ReturnType<typeof getCurriculum>): string {
  return curriculum.units[0]?.topics[0] ?? curriculum.topics[0] ?? "Stoichiometry"
}

function fallbackTopics(curriculum: ReturnType<typeof getCurriculum>): string[] {
  const defaults = [
    "Stoichiometry",
    "Electron Configuration",
    "Periodic Trends",
    "Bonding",
    "Thermodynamics",
    "Reaction Types",
    "Reaction Prediction",
    "Reaction Balancing",
    "Spectroscopy",
    "Acids and Bases",
  ]
  const curriculumTopics = curriculum.units.flatMap((unit) => unit.topics)
  return Array.from(new Set([...curriculumTopics, ...defaults])).slice(0, 7)
}

function buildSevenDayPlan(input: {
  hasUserData: boolean
  curriculum: ReturnType<typeof getCurriculum>
  nextRecommendedTopic: string
  suggestedRecoveryTopic: string
  suggestedExamFocus: string
  weakestTopic: TopicMasteryScore | null
  strongestTopic: TopicMasteryScore | null
  weakestUnit: CurriculumUnitProgress | null
  nextRecommendedUnit: CurriculumUnitProgress | null
  conceptStats: LearningConceptStats[]
}): SevenDayStudyPlanDay[] {
  const starterTopics = fallbackTopics(input.curriculum)
  const weakConcept = input.conceptStats.find((concept) => concept.attempted > 0)
  const reviewTopic = input.strongestTopic?.topic ?? starterTopics[5] ?? input.nextRecommendedTopic
  const weakestUnitTopic = input.weakestUnit?.unit.topics[0] ?? input.suggestedRecoveryTopic

  if (!input.hasUserData) {
    return starterTopics.map((topic, index) => ({
      day: index + 1,
      label: `Day ${index + 1}`,
      topics: [topic],
      suggestedMode: index === 6 ? "Diagnostic" : index === 5 ? "Exam Generator" : "Study Mode",
      estimatedTimeMinutes: index === 5 ? 35 : index === 6 ? 30 : 20,
      reason: "Starter plan only: no saved progress exists yet, so ARSHLAB is not personalizing this day.",
      href: index === 6
        ? "/diagnostic"
        : index === 5
          ? `/exam-generator?source=database&topic=${encodeURIComponent(topic)}`
          : `/study?topic=${encodeURIComponent(topic)}`,
      priority: index < 3 ? "Medium" : "Low",
      fallback: true,
    }))
  }

  const personalized: Array<Omit<SevenDayStudyPlanDay, "day" | "label" | "fallback">> = [
    {
      topics: [input.nextRecommendedTopic],
      suggestedMode: "Study Mode",
      estimatedTimeMinutes: 20,
      reason: input.nextRecommendedUnit
        ? `${input.nextRecommendedUnit.unit.title} is next in your selected curriculum path.`
        : "This topic is the next best step based on your saved attempts.",
      href: `/study?topic=${encodeURIComponent(input.nextRecommendedTopic)}`,
      priority: "Medium",
    },
    {
      topics: [input.suggestedRecoveryTopic],
      suggestedMode: "Recovery Mode",
      estimatedTimeMinutes: 25,
      reason: "Recovery Mode is prioritized from recent misses, diagnostic weaknesses, and low mastery.",
      href: "/recovery",
      priority: input.weakestTopic && input.weakestTopic.mastery < 60 ? "High" : "Medium",
    },
    {
      topics: [weakestUnitTopic],
      suggestedMode: "Practice Generator",
      estimatedTimeMinutes: 15,
      reason: input.weakestUnit
        ? `${input.weakestUnit.unit.title} is your weakest curriculum unit.`
        : "Practice keeps the current weak topic active before moving to exam-style work.",
      href: `/practice-generator?topic=${encodeURIComponent(weakestUnitTopic)}`,
      priority: "High",
    },
    {
      topics: [weakConcept?.subtopic ?? input.suggestedRecoveryTopic],
      suggestedMode: "Study Mode",
      estimatedTimeMinutes: 20,
      reason: weakConcept
        ? `${weakConcept.subtopic} is the weakest tracked concept in your concept analytics.`
        : "A short study session reinforces the current recovery target.",
      href: `/study?topic=${encodeURIComponent(weakConcept?.topic ?? input.suggestedRecoveryTopic)}`,
      priority: weakConcept && weakConcept.mastery < 60 ? "High" : "Medium",
    },
    {
      topics: [input.suggestedExamFocus],
      suggestedMode: "Exam Generator",
      estimatedTimeMinutes: 40,
      reason: "Exam readiness improves when weak units are tested in a mixed setting.",
      href: `/exam-generator?source=database&mode=adaptive&topic=${encodeURIComponent(input.suggestedRecoveryTopic)}`,
      priority: "Medium",
    },
    {
      topics: [reviewTopic],
      suggestedMode: "Curriculum Review",
      estimatedTimeMinutes: 15,
      reason: input.strongestTopic
        ? `${input.strongestTopic.topic} is a stronger area, so this is a quick retention review.`
        : "Retention review balances weak-topic work with broader curriculum coverage.",
      href: "/curriculum",
      priority: "Low",
    },
    {
      topics: [input.suggestedRecoveryTopic, input.nextRecommendedTopic],
      suggestedMode: "Diagnostic",
      estimatedTimeMinutes: 30,
      reason: "End the week by checking whether recovery and study work improved placement-style performance.",
      href: "/diagnostic",
      priority: "Medium",
    },
  ]

  return personalized.map((day, index) => ({
    ...day,
    day: index + 1,
    label: `Day ${index + 1}`,
    fallback: false,
  }))
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
  const reactionEntries = entries.filter((entry) => {
    const value = `${entry.topic} ${entry.subtopic ?? ""}`.toLowerCase()
    return (
      value.includes("reaction") ||
      value.includes("redox") ||
      value.includes("precipitation") ||
      value.includes("combustion") ||
      value.includes("balancing")
    )
  })
  const balancingEntries = reactionEntries.filter((entry) => `${entry.topic} ${entry.subtopic ?? ""}`.toLowerCase().includes("balanc"))
  const redoxEntries = reactionEntries.filter((entry) => `${entry.topic} ${entry.subtopic ?? ""}`.toLowerCase().includes("redox"))
  const organicReactionEntries = reactionEntries.filter((entry) =>
    `${entry.topic} ${entry.subtopic ?? ""}`.toLowerCase().includes("organic"),
  )
  const reactionCorrect = reactionEntries.filter((entry) => entry.correct).length
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
      id: "reaction-rookie",
      label: "Reaction Rookie",
      description: "Attempt ten reaction engine questions.",
      unlocked: reactionEntries.length >= 10,
      progress: clampPercent((reactionEntries.length / 10) * 100),
    },
    {
      id: "balancing-apprentice",
      label: "Balancing Apprentice",
      description: "Attempt ten balancing questions.",
      unlocked: balancingEntries.length >= 10,
      progress: clampPercent((balancingEntries.length / 10) * 100),
    },
    {
      id: "reaction-analyst",
      label: "Reaction Analyst",
      description: "Answer twenty-five reaction questions correctly.",
      unlocked: reactionCorrect >= 25,
      progress: clampPercent((reactionCorrect / 25) * 100),
    },
    {
      id: "redox-specialist",
      label: "Redox Specialist",
      description: "Attempt ten redox questions.",
      unlocked: redoxEntries.length >= 10,
      progress: clampPercent((redoxEntries.length / 10) * 100),
    },
    {
      id: "reaction-master",
      label: "Reaction Master",
      description: "Reach at least 80% accuracy across thirty reaction questions.",
      unlocked: reactionEntries.length >= 30 && percentage(reactionCorrect, reactionEntries.length) >= 80,
      progress:
        reactionEntries.length >= 30
          ? percentage(reactionCorrect, reactionEntries.length)
          : clampPercent((reactionEntries.length / 30) * 100),
    },
    {
      id: "organic-explorer",
      label: "Organic Explorer",
      description: "Attempt ten organic reaction questions.",
      unlocked: organicReactionEntries.length >= 10,
      progress: clampPercent((organicReactionEntries.length / 10) * 100),
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
    (a, b) => safeTimestamp(b.timestamp) - safeTimestamp(a.timestamp),
  )
  const hasUserData = sortedEntries.length > 0
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
    firstCurriculumTopic(curriculum) ??
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
      topic: nextRecommendedTopic,
      action: "Generate Practice",
      href: linkWithTopic("/practice-generator", nextRecommendedTopic, nextUnitId),
      priority: !hasUserData ? "Medium" : weakestTopic && weakestTopic.mastery < 60 ? "High" : "Medium",
      mastery: weakestTopic?.mastery ?? 0,
      reason: !hasUserData
        ? "Starter recommendation: no saved progress exists yet, so this begins with curriculum foundations."
        : weakestTopic
        ? `${weakestTopic.topic} is your lowest tracked topic at ${weakestTopic.mastery}% mastery.`
        : "Start with the first recommended curriculum topic to build baseline data.",
      suggestedMode: "Practice Generator",
      estimatedTimeMinutes: 15,
    },
    {
      id: "recovery-target",
      title: `Recovery: ${suggestedRecoveryTopic}`,
      topic: suggestedRecoveryTopic,
      action: "Start Recovery",
      href: "/recovery",
      priority: hasUserData ? "High" : "Low",
      mastery: prioritizedRecoveryTopics[0]?.accuracy ?? weakestTopic?.mastery ?? 0,
      reason: hasUserData
        ? "Recovery prioritizes diagnostic weaknesses, low-mastery units, recently missed questions, and exam-readiness gaps."
        : "Recovery will become personalized after at least a few saved attempts.",
      suggestedMode: "Recovery Mode",
      estimatedTimeMinutes: 25,
    },
  ]

  const thisWeek: LearningRecommendation[] = [
    {
      id: "study-next-unit",
      title: nextRecommendedUnit ? `Study ${nextRecommendedUnit.unit.title}` : "Build your first study session",
      topic: nextRecommendedTopic,
      action: "Open Study Mode",
      href: linkWithTopic("/study", nextRecommendedTopic, nextUnitId),
      priority: "Medium",
      mastery: nextRecommendedUnit?.mastery ?? 0,
      reason: nextRecommendedUnit
        ? `${nextRecommendedUnit.unit.title} is next in the curriculum roadmap.`
        : "A study session gives the adaptive engine enough data to personalize future recommendations.",
      suggestedMode: "Study Mode",
      estimatedTimeMinutes: 20,
    },
    {
      id: "review-weak-unit",
      title: curriculumSummary.weakestUnit
        ? `Review ${curriculumSummary.weakestUnit.unit.title}`
        : "Review foundational topics",
      topic: curriculumSummary.weakestUnit?.unit.topics[0] ?? nextRecommendedTopic,
      action: "Open Study Plan",
      href: "/study-plan",
      priority: curriculumSummary.weakestUnit?.mastery && curriculumSummary.weakestUnit.mastery < 60 ? "High" : "Medium",
      mastery: curriculumSummary.weakestUnit?.mastery ?? 0,
      reason: curriculumSummary.weakestUnit
        ? `${curriculumSummary.weakestUnit.unit.title} is the weakest unit in your selected curriculum.`
        : "Review starts with curriculum foundations until more progress data exists.",
      suggestedMode: "Curriculum Review",
      estimatedTimeMinutes: 20,
    },
  ]

  const longTerm: LearningRecommendation[] = [
    {
      id: "exam-readiness",
      title: `Exam readiness: ${mastery.examReadinessBand}`,
      topic: suggestedRecoveryTopic,
      action: "Generate Focused Exam",
      href: `/exam-generator?source=database&mode=adaptive&topic=${encodeURIComponent(suggestedRecoveryTopic)}`,
      priority: mastery.examReadiness < 60 ? "High" : mastery.examReadiness < 80 ? "Medium" : "Low",
      mastery: mastery.examReadiness,
      reason: `Suggested exam focus: ${examFocus}. Readiness is ${mastery.examReadiness}/100, so exam practice should close the biggest readiness gap.`,
      suggestedMode: "Exam Generator",
      estimatedTimeMinutes: 40,
    },
    {
      id: "curriculum-roadmap",
      title: "Curriculum completion roadmap",
      topic: nextRecommendedTopic,
      action: "Open Curriculum",
      href: "/curriculum",
      priority: mastery.curriculumCompletion.unitsRemaining > 0 ? "Medium" : "Low",
      mastery: mastery.curriculumCompletion.estimatedCompletion,
      reason: `${mastery.curriculumCompletion.completedUnits} units complete, ${mastery.curriculumCompletion.unitsRemaining} remaining.`,
      suggestedMode: "Curriculum Review",
      estimatedTimeMinutes: 20,
    },
  ]

  const sevenDayPlan = buildSevenDayPlan({
    hasUserData,
    curriculum,
    nextRecommendedTopic,
    suggestedRecoveryTopic,
    suggestedExamFocus: examFocus,
    weakestTopic,
    strongestTopic,
    weakestUnit: curriculumSummary.weakestUnit,
    nextRecommendedUnit,
    conceptStats,
  })
  const achievements = buildAchievementDefinitions(sortedEntries, mastery, options.xp ?? 0)
  const recommendationsGenerated = today.length + thisWeek.length + longTerm.length + sevenDayPlan.length

  return {
    hasUserData,
    strongestTopic,
    weakestTopic,
    weakestUnit: curriculumSummary.weakestUnit,
    nextRecommendedUnit,
    nextRecommendedTopic,
    suggestedRecoveryTopic: recoveryUnit ? `${suggestedRecoveryTopic}` : suggestedRecoveryTopic,
    suggestedExamFocus: examFocus,
    recommendations: { today, thisWeek, longTerm },
    sevenDayPlan,
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
