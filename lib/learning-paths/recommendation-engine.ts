import type { LearningLesson, LearningModuleType } from "./curriculum"
import { getLearningLesson, learningPathHref, listLearningLessons, listLearningPaths } from "./curriculum"
import { getPrerequisiteStatus, getUnlockedLessons } from "./prerequisites"
import { normalizeLearningPathProgress, type LearningPathProgressState } from "./progress-engine"

export interface LearningRecommendation {
  id: string
  title: string
  reason: string
  href: string
  type: LearningModuleType | "review"
  lessonId?: string
}

export interface LearningRecommendationSummary {
  nextLesson: LearningRecommendation
  relatedVirtualLab?: LearningRecommendation
  relatedMechanism?: LearningRecommendation
  relatedScannerExercise?: LearningRecommendation
  relatedKnowledgeGraph?: LearningRecommendation
  reviewRecommendations: LearningRecommendation[]
}

function recommendationFromLesson(lesson: LearningLesson, reason: string): LearningRecommendation {
  return {
    id: `lesson-${lesson.id}`,
    title: lesson.title,
    reason,
    href: learningPathHref(lesson.pathId, lesson.id),
    type: "lesson",
    lessonId: lesson.id,
  }
}

function relatedLink(lesson: LearningLesson | undefined, kind: LearningModuleType, title: string, reason: string): LearningRecommendation | undefined {
  const link = lesson?.links.find((item) => item.kind === kind)
  if (!link) return undefined
  return {
    id: `${kind}-${lesson.id}`,
    title,
    reason,
    href: link.href,
    type: kind,
    lessonId: lesson.id,
  }
}

export function getRecommendedNextLesson(
  state: Partial<LearningPathProgressState> = {},
  currentLessonId?: string,
): LearningLesson {
  const progress = normalizeLearningPathProgress(state)
  const current = getLearningLesson(currentLessonId)
  if (current) {
    const samePathNext = listLearningPaths()
      .find((path) => path.id === current.pathId)
      ?.lessons
      .filter((lesson) => lesson.order > current.order)
      .find((lesson) => {
        const status = progress.lessons[lesson.id]?.status ?? "not-started"
        return status !== "completed" && getPrerequisiteStatus(lesson.id, progress).unlocked
      })
    if (samePathNext) return samePathNext
  }

  return (
    getUnlockedLessons(progress).find((lesson) => (progress.lessons[lesson.id]?.status ?? "not-started") !== "completed") ??
    listLearningLessons()[0]
  )
}

export function getReviewRecommendations(
  state: Partial<LearningPathProgressState> = {},
  now = new Date(),
): LearningRecommendation[] {
  const progress = normalizeLearningPathProgress(state)
  return listLearningLessons()
    .filter((lesson) => {
      const record = progress.lessons[lesson.id]
      if (!record || record.status === "not-started") return false
      const lastVisited = record.lastVisitedAt ?? record.completedAt ?? record.startedAt
      if (!lastVisited) return true
      const ageMs = now.getTime() - new Date(lastVisited).getTime()
      const ageDays = ageMs / (1000 * 60 * 60 * 24)
      return ageDays >= lesson.reviewAfterDays
    })
    .slice(0, 5)
    .map((lesson) => ({
      id: `review-${lesson.id}`,
      title: `Review ${lesson.title}`,
      reason: `This topic has not been visited recently. ARSHLAB recommends a short review before moving on.`,
      href: learningPathHref(lesson.pathId, lesson.id),
      type: "review",
      lessonId: lesson.id,
    }))
}

export function generateLearningPathRecommendations(
  state: Partial<LearningPathProgressState> = {},
  currentLessonId?: string,
): LearningRecommendationSummary {
  const currentLesson = getLearningLesson(currentLessonId)
  const nextLesson = getRecommendedNextLesson(state, currentLessonId)
  const relatedLesson = currentLesson ?? nextLesson

  return {
    nextLesson: recommendationFromLesson(
      nextLesson,
      currentLesson
        ? `Next in sequence after ${currentLesson.title}.`
        : "First available lesson based on prerequisite completion.",
    ),
    relatedVirtualLab: relatedLink(relatedLesson, "virtual-lab", "Related Virtual Lab", "Run a deterministic lab connected to this lesson."),
    relatedMechanism: relatedLink(relatedLesson, "mechanism", "Related Mechanism", "Practice the mechanism background for this topic."),
    relatedScannerExercise: relatedLesson.relatedScannerExercise
      ? {
          id: `scanner-${relatedLesson.id}`,
          title: "Related Scanner Exercise",
          reason: `Try scanning or exploring ${relatedLesson.relatedScannerExercise} to connect recognition with learning.`,
          href: `/structure-scanner?compound=${encodeURIComponent(relatedLesson.relatedScannerExercise)}`,
          type: "scanner",
          lessonId: relatedLesson.id,
        }
      : undefined,
    relatedKnowledgeGraph: relatedLesson.relatedKnowledgeNode
      ? {
          id: `graph-${relatedLesson.id}`,
          title: "Related Knowledge Graph Topic",
          reason: "Open this concept in the ARSHLAB chemistry map.",
          href: `/knowledge-graph?focus=${encodeURIComponent(relatedLesson.relatedKnowledgeNode)}`,
          type: "knowledge-graph",
          lessonId: relatedLesson.id,
        }
      : relatedLink(relatedLesson, "knowledge-graph", "Related Knowledge Graph Topic", "Open this topic in the ARSHLAB chemistry map."),
    reviewRecommendations: getReviewRecommendations(state),
  }
}

export function learningPathPlacementHref(focus: string | null | undefined): string {
  if (!focus) return "/learning-paths"
  const normalized = focus.toLowerCase()
  const lesson = listLearningLessons().find((item) =>
    [
      item.id,
      item.title.toLowerCase(),
      item.relatedKnowledgeNode?.toLowerCase() ?? "",
      item.relatedScannerExercise?.toLowerCase() ?? "",
      ...item.outcomes.map((outcome) => outcome.toLowerCase()),
    ].some((value) => value && normalized.includes(value.replace(/^compound:/, ""))),
  )
  return lesson ? learningPathHref(lesson.pathId, lesson.id) : `/learning-paths?focus=${encodeURIComponent(focus)}`
}
