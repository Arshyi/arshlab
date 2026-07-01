import type { LearningLessonStatus } from "./curriculum"
import { getLearningLesson, listLearningLessons, listLearningPaths } from "./curriculum"

export interface LearningLessonProgress {
  lessonId: string
  status: LearningLessonStatus
  startedAt?: string
  completedAt?: string
  lastVisitedAt?: string
  quizAttempts: number
  quizCorrect: number
  bestQuizScore: number
}

export type LearningActivityType =
  | "lesson-viewed"
  | "lesson-started"
  | "lesson-completed"
  | "lab-completed"
  | "mechanism-practiced"
  | "scanner-exercise-completed"
  | "quiz-scored"

export interface LearningActivity {
  id: string
  type: LearningActivityType
  lessonId?: string
  label: string
  score?: number
  createdAt: string
}

export interface LearningPathProgressState {
  lessons: Record<string, LearningLessonProgress>
  activities: LearningActivity[]
  updatedAt?: string
}

export interface LearningPathDashboardSummary {
  totalLessons: number
  completedLessons: number
  inProgressLessons: number
  labsCompleted: number
  mechanismsPracticed: number
  scannerExercisesCompleted: number
  quizAttempts: number
  quizAverage: number
  overallCompletion: number
  perTrack: Array<{
    pathId: string
    title: string
    completedLessons: number
    totalLessons: number
    completion: number
  }>
  recentActivity: LearningActivity[]
}

export const LEARNING_PATH_PROGRESS_STORAGE_KEY = "arshlab-learning-path-progress"
const MAX_ACTIVITIES = 500

export function emptyLearningPathProgress(): LearningPathProgressState {
  return { lessons: {}, activities: [] }
}

function canUseStorage(): boolean {
  return typeof window !== "undefined" && Boolean(window.localStorage)
}

function safeLessonProgress(lessonId: string, input: Partial<LearningLessonProgress> | undefined): LearningLessonProgress {
  const status: LearningLessonStatus =
    input?.status === "completed" || input?.status === "in-progress" || input?.status === "not-started"
      ? input.status
      : "not-started"
  return {
    lessonId,
    status,
    startedAt: typeof input?.startedAt === "string" ? input.startedAt : undefined,
    completedAt: typeof input?.completedAt === "string" ? input.completedAt : undefined,
    lastVisitedAt: typeof input?.lastVisitedAt === "string" ? input.lastVisitedAt : undefined,
    quizAttempts: Math.max(0, Number(input?.quizAttempts ?? 0)),
    quizCorrect: Math.max(0, Number(input?.quizCorrect ?? 0)),
    bestQuizScore: Math.max(0, Math.min(100, Number(input?.bestQuizScore ?? 0))),
  }
}

function safeActivity(input: Partial<LearningActivity> | undefined): LearningActivity | null {
  if (!input?.type || !input.createdAt || !input.label) return null
  return {
    id: input.id ?? `${input.type}-${input.createdAt}`,
    type: input.type,
    lessonId: typeof input.lessonId === "string" ? input.lessonId : undefined,
    label: input.label,
    score: typeof input.score === "number" ? Math.max(0, Math.min(100, input.score)) : undefined,
    createdAt: input.createdAt,
  }
}

export function normalizeLearningPathProgress(input: Partial<LearningPathProgressState> | undefined): LearningPathProgressState {
  const lessons = listLearningLessons().reduce<Record<string, LearningLessonProgress>>((records, lesson) => {
    records[lesson.id] = safeLessonProgress(lesson.id, input?.lessons?.[lesson.id])
    return records
  }, {})
  const activities = (input?.activities ?? [])
    .map(safeActivity)
    .filter((activity): activity is LearningActivity => Boolean(activity))
    .slice(0, MAX_ACTIVITIES)

  return {
    lessons,
    activities,
    updatedAt: typeof input?.updatedAt === "string" ? input.updatedAt : undefined,
  }
}

export function readLearningPathProgress(): LearningPathProgressState {
  if (!canUseStorage()) return normalizeLearningPathProgress(emptyLearningPathProgress())
  try {
    const raw = window.localStorage.getItem(LEARNING_PATH_PROGRESS_STORAGE_KEY)
    if (!raw) return normalizeLearningPathProgress(emptyLearningPathProgress())
    return normalizeLearningPathProgress(JSON.parse(raw) as Partial<LearningPathProgressState>)
  } catch {
    return normalizeLearningPathProgress(emptyLearningPathProgress())
  }
}

export function writeLearningPathProgress(state: LearningPathProgressState): LearningPathProgressState {
  const nextState = normalizeLearningPathProgress({
    ...state,
    activities: state.activities.slice(0, MAX_ACTIVITIES),
    updatedAt: new Date().toISOString(),
  })
  if (canUseStorage()) {
    window.localStorage.setItem(LEARNING_PATH_PROGRESS_STORAGE_KEY, JSON.stringify(nextState))
  }
  return nextState
}

function activity(type: LearningActivityType, label: string, lessonId?: string, score?: number): LearningActivity {
  const createdAt = new Date().toISOString()
  return {
    id: `${type}-${lessonId ?? label}-${createdAt}`,
    type,
    lessonId,
    label,
    score,
    createdAt,
  }
}

export function setLessonStatus(
  lessonId: string,
  status: LearningLessonStatus,
  state = readLearningPathProgress(),
): LearningPathProgressState {
  const lesson = getLearningLesson(lessonId)
  if (!lesson) return state
  const now = new Date().toISOString()
  const current = state.lessons[lessonId] ?? safeLessonProgress(lessonId, undefined)
  const nextLesson: LearningLessonProgress = {
    ...current,
    status,
    startedAt: current.startedAt ?? (status !== "not-started" ? now : undefined),
    completedAt: status === "completed" ? current.completedAt ?? now : current.completedAt,
    lastVisitedAt: now,
  }
  const type: LearningActivityType =
    status === "completed" ? "lesson-completed" : status === "in-progress" ? "lesson-started" : "lesson-viewed"
  return writeLearningPathProgress({
    ...state,
    lessons: { ...state.lessons, [lessonId]: nextLesson },
    activities: [activity(type, lesson.title, lessonId), ...state.activities],
  })
}

export function recordLessonView(lessonId: string, state = readLearningPathProgress()): LearningPathProgressState {
  const lesson = getLearningLesson(lessonId)
  if (!lesson) return state
  const current = state.lessons[lessonId] ?? safeLessonProgress(lessonId, undefined)
  return writeLearningPathProgress({
    ...state,
    lessons: {
      ...state.lessons,
      [lessonId]: {
        ...current,
        lastVisitedAt: new Date().toISOString(),
        status: current.status === "not-started" ? "in-progress" : current.status,
        startedAt: current.startedAt ?? new Date().toISOString(),
      },
    },
    activities: [activity("lesson-viewed", lesson.title, lessonId), ...state.activities],
  })
}

export function recordQuizScore(
  lessonId: string,
  score: number,
  state = readLearningPathProgress(),
): LearningPathProgressState {
  const lesson = getLearningLesson(lessonId)
  if (!lesson) return state
  const current = state.lessons[lessonId] ?? safeLessonProgress(lessonId, undefined)
  const clamped = Math.max(0, Math.min(100, Math.round(score)))
  return writeLearningPathProgress({
    ...state,
    lessons: {
      ...state.lessons,
      [lessonId]: {
        ...current,
        quizAttempts: current.quizAttempts + 1,
        quizCorrect: current.quizCorrect + (clamped >= 70 ? 1 : 0),
        bestQuizScore: Math.max(current.bestQuizScore, clamped),
        lastVisitedAt: new Date().toISOString(),
      },
    },
    activities: [activity("quiz-scored", `${lesson.title} quiz`, lessonId, clamped), ...state.activities],
  })
}

export function recordLearningActivity(
  type: Exclude<LearningActivityType, "lesson-started" | "lesson-completed" | "quiz-scored">,
  label: string,
  lessonId?: string,
  state = readLearningPathProgress(),
): LearningPathProgressState {
  return writeLearningPathProgress({
    ...state,
    activities: [activity(type, label, lessonId), ...state.activities],
  })
}

export function summarizeLearningPathProgress(state = readLearningPathProgress()): LearningPathDashboardSummary {
  const normalized = normalizeLearningPathProgress(state)
  const lessons = listLearningLessons()
  const completedLessons = lessons.filter((lesson) => normalized.lessons[lesson.id]?.status === "completed").length
  const inProgressLessons = lessons.filter((lesson) => normalized.lessons[lesson.id]?.status === "in-progress").length
  const quizAttempts = lessons.reduce((sum, lesson) => sum + (normalized.lessons[lesson.id]?.quizAttempts ?? 0), 0)
  const scoredLessons = lessons.filter((lesson) => (normalized.lessons[lesson.id]?.bestQuizScore ?? 0) > 0)
  const quizAverage = scoredLessons.length
    ? Math.round(scoredLessons.reduce((sum, lesson) => sum + (normalized.lessons[lesson.id]?.bestQuizScore ?? 0), 0) / scoredLessons.length)
    : 0

  return {
    totalLessons: lessons.length,
    completedLessons,
    inProgressLessons,
    labsCompleted: normalized.activities.filter((event) => event.type === "lab-completed").length,
    mechanismsPracticed: normalized.activities.filter((event) => event.type === "mechanism-practiced").length,
    scannerExercisesCompleted: normalized.activities.filter((event) => event.type === "scanner-exercise-completed").length,
    quizAttempts,
    quizAverage,
    overallCompletion: lessons.length ? Math.round((completedLessons / lessons.length) * 100) : 0,
    perTrack: listLearningPaths().map((path) => {
      const totalLessons = path.lessons.length
      const trackCompleted = path.lessons.filter((lesson) => normalized.lessons[lesson.id]?.status === "completed").length
      return {
        pathId: path.id,
        title: path.title,
        completedLessons: trackCompleted,
        totalLessons,
        completion: totalLessons ? Math.round((trackCompleted / totalLessons) * 100) : 0,
      }
    }),
    recentActivity: normalized.activities.slice(0, 8),
  }
}
