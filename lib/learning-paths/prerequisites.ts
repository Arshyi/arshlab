import { getLearningLesson, listLearningLessons } from "./curriculum"
import { normalizeLearningPathProgress, type LearningPathProgressState } from "./progress-engine"

export interface PrerequisiteStatus {
  lessonId: string
  title: string
  completed: boolean
}

export interface LessonUnlockStatus {
  lessonId: string
  unlocked: boolean
  missingPrerequisites: PrerequisiteStatus[]
  completedPrerequisites: PrerequisiteStatus[]
}

const conceptToLesson: Record<string, string> = {
  hybridization: "org1-hybridization",
  conjugation: "org1-conjugation",
  resonance: "org1-resonance",
  aromaticity: "org1-aromaticity",
  "electrophilic aromatic substitution": "org2-eas",
}

export const PREREQUISITE_CHAINS = [
  ["org1-hybridization", "org1-conjugation", "org1-resonance", "org1-aromaticity", "org2-eas"],
]

function resolveLessonId(value: string): string {
  const normalized = value.trim().toLowerCase()
  return conceptToLesson[normalized] ?? value
}

export function getPrerequisiteStatus(
  lessonId: string,
  state: Partial<LearningPathProgressState> = {},
): LessonUnlockStatus {
  const lesson = getLearningLesson(resolveLessonId(lessonId))
  const progress = normalizeLearningPathProgress(state)
  if (!lesson) return { lessonId, unlocked: false, missingPrerequisites: [], completedPrerequisites: [] }

  const prerequisites = lesson.prerequisites
    .map((id) => getLearningLesson(resolveLessonId(id)))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .map<PrerequisiteStatus>((item) => ({
      lessonId: item.id,
      title: item.title,
      completed: progress.lessons[item.id]?.status === "completed",
    }))

  return {
    lessonId: lesson.id,
    unlocked: prerequisites.every((item) => item.completed),
    missingPrerequisites: prerequisites.filter((item) => !item.completed),
    completedPrerequisites: prerequisites.filter((item) => item.completed),
  }
}

export function getPrerequisiteChain(lessonIdOrConcept: string): PrerequisiteStatus[] {
  const lessonId = resolveLessonId(lessonIdOrConcept)
  const chain = PREREQUISITE_CHAINS.find((items) => items.includes(lessonId))
  const ids = chain ?? buildRecursiveChain(lessonId)
  return ids
    .map((id) => getLearningLesson(id))
    .filter((lesson): lesson is NonNullable<typeof lesson> => Boolean(lesson))
    .map((lesson) => ({ lessonId: lesson.id, title: lesson.title, completed: false }))
}

function buildRecursiveChain(lessonId: string, seen = new Set<string>()): string[] {
  if (seen.has(lessonId)) return []
  seen.add(lessonId)
  const lesson = getLearningLesson(lessonId)
  if (!lesson) return []
  const prerequisites = lesson.prerequisites.flatMap((id) => buildRecursiveChain(resolveLessonId(id), seen))
  return [...prerequisites, lesson.id]
}

export function getUnlockedLessons(state: Partial<LearningPathProgressState> = {}) {
  return listLearningLessons().filter((lesson) => getPrerequisiteStatus(lesson.id, state).unlocked)
}
