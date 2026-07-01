import type { LearningLesson, LearningPath } from "./curriculum"
import { getLearningPath, listLearningPaths } from "./curriculum"
import { getPrerequisiteStatus } from "./prerequisites"
import { normalizeLearningPathProgress, type LearningActivity, type LearningPathProgressState } from "./progress-engine"

export interface LearningTimelineItem {
  lesson: LearningLesson
  completedAt: string
}

export interface SequencedLearningPath {
  path: LearningPath
  lessons: Array<{
    lesson: LearningLesson
    status: "not-started" | "in-progress" | "completed"
    unlocked: boolean
    missingPrerequisites: string[]
    current: boolean
  }>
  currentLesson: LearningLesson
  nextLesson: LearningLesson | null
}

export function getOrderedLessonsForPath(pathId: string): LearningLesson[] {
  return [...getLearningPath(pathId).lessons].sort((a, b) => a.order - b.order)
}

export function getCurrentLessonForPath(
  pathId: string,
  state: Partial<LearningPathProgressState> = {},
): LearningLesson {
  const progress = normalizeLearningPathProgress(state)
  const lessons = getOrderedLessonsForPath(pathId)
  return (
    lessons.find((lesson) => progress.lessons[lesson.id]?.status === "in-progress") ??
    lessons.find((lesson) => (progress.lessons[lesson.id]?.status ?? "not-started") !== "completed" && getPrerequisiteStatus(lesson.id, progress).unlocked) ??
    lessons[0]
  )
}

export function getNextLessonAfter(
  lessonId: string,
  state: Partial<LearningPathProgressState> = {},
): LearningLesson | null {
  const progress = normalizeLearningPathProgress(state)
  const lesson = listLearningPaths().flatMap((path) => path.lessons).find((item) => item.id === lessonId)
  if (!lesson) return null
  const lessons = getOrderedLessonsForPath(lesson.pathId)
  return lessons
    .filter((item) => item.order > lesson.order)
    .find((item) => (progress.lessons[item.id]?.status ?? "not-started") !== "completed" && getPrerequisiteStatus(item.id, progress).unlocked) ?? null
}

export function sequenceLearningPath(pathId: string, state: Partial<LearningPathProgressState> = {}): SequencedLearningPath {
  const progress = normalizeLearningPathProgress(state)
  const path = getLearningPath(pathId)
  const currentLesson = getCurrentLessonForPath(path.id, progress)
  const lessons = getOrderedLessonsForPath(path.id).map((lesson) => {
    const unlock = getPrerequisiteStatus(lesson.id, progress)
    return {
      lesson,
      status: progress.lessons[lesson.id]?.status ?? "not-started",
      unlocked: unlock.unlocked,
      missingPrerequisites: unlock.missingPrerequisites.map((item) => item.title),
      current: lesson.id === currentLesson.id,
    }
  })
  return {
    path,
    lessons,
    currentLesson,
    nextLesson: getNextLessonAfter(currentLesson.id, progress),
  }
}

export function getLearningTimeline(state: Partial<LearningPathProgressState> = {}): LearningTimelineItem[] {
  const progress = normalizeLearningPathProgress(state)
  return listLearningPaths()
    .flatMap((path) => path.lessons)
    .map((lesson) => {
      const completedAt = progress.lessons[lesson.id]?.completedAt
      return completedAt ? { lesson, completedAt } : null
    })
    .filter((item): item is LearningTimelineItem => Boolean(item))
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())
}

export function getRecentLearningActivity(state: Partial<LearningPathProgressState> = {}, limit = 8): LearningActivity[] {
  return normalizeLearningPathProgress(state).activities.slice(0, limit)
}
