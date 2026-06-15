import { inferSubtopicForTopic } from "./subtopic-registry"

export const RECOVERY_TOPICS = [
  "Functional group identification",
  "Functional Group Identification",
  "Hybridization",
  "VSEPR geometry",
  "VSEPR Geometry",
  "Periodic trends",
  "Periodic Trends",
  "Thermodynamics",
  "Electron configuration",
  "Electron Configuration",
  "IR spectroscopy peak identification",
  "IR Spectroscopy",
  "Kinetics",
  "Equilibrium",
  "Acids and Bases",
  "Bonding",
  "Stoichiometry",
  "Reaction Types",
  "Reaction Prediction",
  "Reaction Balancing",
  "Reaction Classification",
  "Redox",
  "Precipitation",
  "Combustion",
  "Organic Reactions",
  "Organic Mechanisms",
] as const

export type RecoveryTopic = (typeof RECOVERY_TOPICS)[number]
export type PracticeDifficulty = "Introductory" | "Intermediate" | "Advanced"

export interface ProgressLikeEntry {
  topic: string
  subtopic?: string
  correct: boolean
}

export interface LearningTopicStats {
  topic: string
  attempted: number
  correct: number
  missed: number
  accuracy: number
}

export interface LearningConceptStats {
  topic: string
  subtopic: string
  attempted: number
  correct: number
  missed: number
  mastery: number
}

export interface RecoveryPlanItem {
  topic: string
  count: number
  difficulty: PracticeDifficulty
  mastery: number
  role: "weakest" | "second-weakest" | "review"
  weaknesses: string[]
}

export interface RecoverySessionResult {
  topic: string
  subtopic?: string
  correct: boolean
}

export interface RecoveryOutcome {
  topic: string
  subtopic?: string
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

export function calculateConceptStats(entries: ProgressLikeEntry[]): LearningConceptStats[] {
  const groups = new Map<string, { topic: string; subtopic: string; attempted: number; correct: number }>()

  for (const entry of entries) {
    const subtopic = inferSubtopicForTopic(entry.topic, "", entry.subtopic)
    const key = `${entry.topic}::${subtopic}`
    const current = groups.get(key) ?? {
      topic: entry.topic,
      subtopic,
      attempted: 0,
      correct: 0,
    }
    current.attempted += 1
    if (entry.correct) current.correct += 1
    groups.set(key, current)
  }

  return Array.from(groups.values())
    .map((stats) => ({
      ...stats,
      missed: stats.attempted - stats.correct,
      mastery: stats.attempted ? Math.round((stats.correct / stats.attempted) * 100) : 0,
    }))
    .sort((a, b) => a.mastery - b.mastery || b.attempted - a.attempted || a.subtopic.localeCompare(b.subtopic))
}

export function detectWeakConcepts(entries: ProgressLikeEntry[]): LearningConceptStats[] {
  return calculateConceptStats(entries).filter((concept) => concept.attempted >= 5 && concept.mastery < 60)
}

export function getMasteryBand(mastery: number): "Weak" | "Developing" | "Strong" | "Mastered" {
  if (mastery < 40) return "Weak"
  if (mastery < 70) return "Developing"
  if (mastery < 90) return "Strong"
  return "Mastered"
}

export function getAdaptiveDifficulty(mastery: number): PracticeDifficulty {
  if (mastery < 40) return "Introductory"
  if (mastery < 80) return "Intermediate"
  return "Advanced"
}

function getReviewTopic(weakTopics: LearningTopicStats[], allStats: LearningTopicStats[]): LearningTopicStats {
  const excluded = new Set(weakTopics.slice(0, 2).map((topic) => topic.topic))
  const existing = [...allStats]
    .filter((stat) => !excluded.has(stat.topic))
    .sort((a, b) => b.attempted - a.attempted || b.accuracy - a.accuracy || a.topic.localeCompare(b.topic))[0]

  if (existing) return existing

  const topic = RECOVERY_TOPICS.find((candidate) => !excluded.has(candidate)) ?? RECOVERY_TOPICS[0]

  return {
    topic,
    attempted: 0,
    correct: 0,
    missed: 0,
    accuracy: 70,
  }
}

function getWeaknessesForTopic(topic: string, weakConcepts: LearningConceptStats[]): string[] {
  const weaknesses = weakConcepts
    .filter((concept) => concept.topic === topic)
    .sort((a, b) => a.mastery - b.mastery || b.attempted - a.attempted)
    .map((concept) => concept.subtopic)

  return weaknesses.length > 0 ? weaknesses.slice(0, 4) : [topic]
}

export function buildRecoveryPlan(
  weakTopics: LearningTopicStats[],
  allStats: LearningTopicStats[],
  weakConcepts: LearningConceptStats[] = [],
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
        weaknesses: getWeaknessesForTopic(weakest.topic, weakConcepts),
      },
      {
        topic: review.topic,
        count: 1,
        difficulty: getAdaptiveDifficulty(review.accuracy),
        mastery: review.accuracy,
        role: "review",
        weaknesses: getWeaknessesForTopic(review.topic, weakConcepts),
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
      weaknesses: getWeaknessesForTopic(weakest.topic, weakConcepts),
    },
    {
      topic: secondWeakest.topic,
      count: 2,
      difficulty: getAdaptiveDifficulty(secondWeakest.accuracy),
      mastery: secondWeakest.accuracy,
      role: "second-weakest",
      weaknesses: getWeaknessesForTopic(secondWeakest.topic, weakConcepts),
    },
    {
      topic: review.topic,
      count: 1,
      difficulty: getAdaptiveDifficulty(review.accuracy),
      mastery: review.accuracy,
      role: "review",
      weaknesses: getWeaknessesForTopic(review.topic, weakConcepts),
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

export function calculateConceptRecoveryOutcomes(
  baseline: LearningConceptStats[],
  sessionResults: RecoverySessionResult[],
  focusSubtopics: string[],
): RecoveryOutcome[] {
  return focusSubtopics.map((subtopic) => {
    const before = baseline.find((stat) => stat.subtopic === subtopic) ?? {
      topic: "Recovery",
      subtopic,
      attempted: 0,
      correct: 0,
      missed: 0,
      mastery: 0,
    }
    const sessionForConcept = sessionResults.filter((result) => result.subtopic === subtopic)
    const sessionCorrect = sessionForConcept.filter((result) => result.correct).length
    const attempted = before.attempted + sessionForConcept.length
    const correct = before.correct + sessionCorrect
    const after = attempted ? Math.round((correct / attempted) * 100) : before.mastery

    return {
      topic: before.topic,
      subtopic,
      before: before.mastery,
      after,
      improvement: after - before.mastery,
    }
  })
}
