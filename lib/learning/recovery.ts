export const RECOVERY_TOPICS = [
  "Functional group identification",
  "Hybridization",
  "VSEPR geometry",
  "Periodic trends",
  "Electron configuration",
  "IR spectroscopy peak identification",
] as const

export type RecoveryTopic = (typeof RECOVERY_TOPICS)[number]
export type PracticeDifficulty = "Introductory" | "Intermediate" | "Advanced"

export interface ProgressLikeEntry {
  topic: string
  correct: boolean
}

export interface LearningTopicStats {
  topic: string
  attempted: number
  correct: number
  missed: number
  accuracy: number
}

export interface RecoveryPlanItem {
  topic: string
  count: number
  difficulty: PracticeDifficulty
  mastery: number
  role: "weakest" | "second-weakest" | "review"
}

export interface RecoverySessionResult {
  topic: string
  correct: boolean
}

export interface RecoveryOutcome {
  topic: string
  before: number
  after: number
  improvement: number
}

export function isRecoveryTopic(value: string): value is RecoveryTopic {
  return RECOVERY_TOPICS.includes(value as RecoveryTopic)
}

export function calculateTopicStats(entries: ProgressLikeEntry[]): LearningTopicStats[] {
  const groups = new Map<string, { attempted: number; correct: number }>()

  for (const entry of entries) {
    const current = groups.get(entry.topic) ?? { attempted: 0, correct: 0 }
    current.attempted += 1
    if (entry.correct) current.correct += 1
    groups.set(entry.topic, current)
  }

  return Array.from(groups.entries())
    .map(([topic, stats]) => ({
      topic,
      attempted: stats.attempted,
      correct: stats.correct,
      missed: stats.attempted - stats.correct,
      accuracy: stats.attempted ? Math.round((stats.correct / stats.attempted) * 100) : 0,
    }))
    .sort((a, b) => a.accuracy - b.accuracy || b.attempted - a.attempted || a.topic.localeCompare(b.topic))
}

export function detectWeakTopics(entries: ProgressLikeEntry[]): LearningTopicStats[] {
  return calculateTopicStats(entries).filter((topic) => topic.attempted >= 5 && topic.accuracy < 60)
}

export function getAdaptiveDifficulty(mastery: number): PracticeDifficulty {
  if (mastery < 40) return "Introductory"
  if (mastery < 80) return "Intermediate"
  return "Advanced"
}

function getReviewTopic(weakTopics: LearningTopicStats[], allStats: LearningTopicStats[]): LearningTopicStats {
  const excluded = new Set(weakTopics.slice(0, 2).map((topic) => topic.topic))
  const candidates = RECOVERY_TOPICS.filter((topic) => !excluded.has(topic))
  const topic = candidates[Math.floor(Math.random() * candidates.length)] ?? RECOVERY_TOPICS[0]
  const existing = allStats.find((stat) => stat.topic === topic)

  return existing ?? {
    topic,
    attempted: 0,
    correct: 0,
    missed: 0,
    accuracy: 70,
  }
}

export function buildRecoveryPlan(
  weakTopics: LearningTopicStats[],
  allStats: LearningTopicStats[],
): RecoveryPlanItem[] {
  const [weakest, secondWeakest] = weakTopics
  if (!weakest) return []

  const review = getReviewTopic(weakTopics, allStats)

  if (!secondWeakest) {
    return [
      {
        topic: weakest.topic,
        count: 9,
        difficulty: getAdaptiveDifficulty(weakest.accuracy),
        mastery: weakest.accuracy,
        role: "weakest",
      },
      {
        topic: review.topic,
        count: 1,
        difficulty: getAdaptiveDifficulty(review.accuracy),
        mastery: review.accuracy,
        role: "review",
      },
    ]
  }

  return [
    {
      topic: weakest.topic,
      count: 7,
      difficulty: getAdaptiveDifficulty(weakest.accuracy),
      mastery: weakest.accuracy,
      role: "weakest",
    },
    {
      topic: secondWeakest.topic,
      count: 2,
      difficulty: getAdaptiveDifficulty(secondWeakest.accuracy),
      mastery: secondWeakest.accuracy,
      role: "second-weakest",
    },
    {
      topic: review.topic,
      count: 1,
      difficulty: getAdaptiveDifficulty(review.accuracy),
      mastery: review.accuracy,
      role: "review",
    },
  ]
}

export function calculateRecoveryOutcomes(
  baseline: LearningTopicStats[],
  sessionResults: RecoverySessionResult[],
  focusTopics: string[],
): RecoveryOutcome[] {
  return focusTopics.map((topic) => {
    const before = baseline.find((stat) => stat.topic === topic) ?? {
      topic,
      attempted: 0,
      correct: 0,
      missed: 0,
      accuracy: 0,
    }
    const sessionForTopic = sessionResults.filter((result) => result.topic === topic)
    const sessionCorrect = sessionForTopic.filter((result) => result.correct).length
    const attempted = before.attempted + sessionForTopic.length
    const correct = before.correct + sessionCorrect
    const after = attempted ? Math.round((correct / attempted) * 100) : before.accuracy

    return {
      topic,
      before: before.accuracy,
      after,
      improvement: after - before.accuracy,
    }
  })
}
