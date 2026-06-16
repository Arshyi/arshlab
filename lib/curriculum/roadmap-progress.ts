import type { CurriculumRoadmap, CurriculumRoadmapTopic } from "./roadmap"
import { listCurriculumRoadmaps } from "./roadmap"

export interface CurriculumTopicProgress {
  viewed: boolean
  completed: boolean
  viewedAt?: string
  completedAt?: string
}

export interface CurriculumRoadmapProgressState {
  topics: Record<string, CurriculumTopicProgress>
  updatedAt?: string
}

export interface CurriculumRoadmapProgressSummary {
  roadmapId: string
  title: string
  totalTopics: number
  viewedTopics: number
  completedTopics: number
  completionPercentage: number
  currentRecommendedTopic: CurriculumRoadmapTopic | null
}

const STORAGE_KEY = "arshlab-curriculum-roadmap-progress"

function emptyProgressState(): CurriculumRoadmapProgressState {
  return { topics: {} }
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage)
}

function safeTopicProgress(value: unknown): CurriculumTopicProgress {
  if (!value || typeof value !== "object") return { viewed: false, completed: false }
  const entry = value as Partial<CurriculumTopicProgress>
  return {
    viewed: Boolean(entry.viewed),
    completed: Boolean(entry.completed),
    viewedAt: typeof entry.viewedAt === "string" ? entry.viewedAt : undefined,
    completedAt: typeof entry.completedAt === "string" ? entry.completedAt : undefined,
  }
}

export function readCurriculumRoadmapProgress(): CurriculumRoadmapProgressState {
  if (!canUseStorage()) return emptyProgressState()

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return emptyProgressState()
    const parsed = JSON.parse(raw) as Partial<CurriculumRoadmapProgressState>
    const topics = Object.fromEntries(
      Object.entries(parsed.topics ?? {}).map(([topicId, value]) => [topicId, safeTopicProgress(value)]),
    )

    return {
      topics,
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : undefined,
    }
  } catch {
    return emptyProgressState()
  }
}

export function writeCurriculumRoadmapProgress(
  state: CurriculumRoadmapProgressState,
): CurriculumRoadmapProgressState {
  const nextState = {
    topics: state.topics,
    updatedAt: new Date().toISOString(),
  }

  if (canUseStorage()) {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState))
  }

  return nextState
}

export function markCurriculumTopicViewed(
  topicId: string,
  state = readCurriculumRoadmapProgress(),
): CurriculumRoadmapProgressState {
  const current = state.topics[topicId] ?? { viewed: false, completed: false }
  return writeCurriculumRoadmapProgress({
    topics: {
      ...state.topics,
      [topicId]: {
        ...current,
        viewed: true,
        viewedAt: current.viewedAt ?? new Date().toISOString(),
      },
    },
  })
}

export function setCurriculumTopicCompleted(
  topicId: string,
  completed: boolean,
  state = readCurriculumRoadmapProgress(),
): CurriculumRoadmapProgressState {
  const current = state.topics[topicId] ?? { viewed: false, completed: false }
  return writeCurriculumRoadmapProgress({
    topics: {
      ...state.topics,
      [topicId]: {
        ...current,
        viewed: true,
        completed,
        viewedAt: current.viewedAt ?? new Date().toISOString(),
        completedAt: completed ? new Date().toISOString() : undefined,
      },
    },
  })
}

export function getCurriculumRoadmapProgressSummary(
  roadmap: CurriculumRoadmap,
  state: CurriculumRoadmapProgressState,
): CurriculumRoadmapProgressSummary {
  const totalTopics = roadmap.topics.length
  const viewedTopics = roadmap.topics.filter((topic) => state.topics[topic.id]?.viewed).length
  const completedTopics = roadmap.topics.filter((topic) => state.topics[topic.id]?.completed).length
  const currentRecommendedTopic = roadmap.topics.find((topic) => !state.topics[topic.id]?.completed) ?? null

  return {
    roadmapId: roadmap.id,
    title: roadmap.title,
    totalTopics,
    viewedTopics,
    completedTopics,
    completionPercentage: totalTopics ? Math.round((completedTopics / totalTopics) * 100) : 0,
    currentRecommendedTopic,
  }
}

export function getAllCurriculumRoadmapProgressSummaries(
  state = readCurriculumRoadmapProgress(),
): CurriculumRoadmapProgressSummary[] {
  return listCurriculumRoadmaps().map((roadmap) => getCurriculumRoadmapProgressSummary(roadmap, state))
}
