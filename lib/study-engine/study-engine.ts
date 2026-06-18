import type { PracticeProgressEntry } from "@/lib/supabase/practice-progress"
import type { FormulaViewStats } from "@/lib/formula-sheet"
import type { CurriculumRoadmapProgressState } from "@/lib/curriculum/roadmap-progress"
import type {
  StudyEngineSnapshot,
  StudyProgressEvent,
  StudyRecommendation,
  StudyTopicDefinition,
  StudyTopicMastery,
  StudyTopicStatus,
} from "./study-types"

export const STUDY_TOPICS: StudyTopicDefinition[] = [
  {
    id: "molarity",
    title: "Molarity",
    category: "Solutions",
    order: 10,
    prerequisites: [],
    formulaIds: ["solutions-molarity"],
    solverModuleIds: ["molarity"],
    practiceTopics: ["Chemistry Calculations", "Stoichiometry"],
    curriculumTopics: ["Solutions", "Stoichiometry"],
  },
  {
    id: "dilution",
    title: "Dilution",
    category: "Solutions",
    order: 20,
    prerequisites: ["molarity"],
    formulaIds: ["solutions-dilution"],
    solverModuleIds: ["dilution"],
    practiceTopics: ["Chemistry Calculations"],
    curriculumTopics: ["Solutions"],
  },
  {
    id: "stoichiometry",
    title: "Stoichiometry",
    category: "General Chemistry",
    order: 30,
    prerequisites: ["molarity"],
    formulaIds: ["stoichiometry-moles-from-mass", "stoichiometry-percent-yield", "stoichiometry-limiting-reagent"],
    solverModuleIds: ["stoichiometry", "percent-yield", "empirical-formula"],
    practiceTopics: ["Stoichiometry", "Reaction Balancing", "Chemistry Calculations"],
    curriculumTopics: ["Stoichiometry"],
  },
  {
    id: "gas-laws",
    title: "Gas Laws",
    category: "General Chemistry",
    order: 40,
    prerequisites: ["stoichiometry"],
    formulaIds: ["gases-ideal-gas-law", "gases-boyles-law", "gases-charles-law", "gases-combined-gas-law"],
    solverModuleIds: ["ideal-gas-law"],
    practiceTopics: ["Chemistry Calculations"],
    curriculumTopics: ["Gas Laws"],
  },
  {
    id: "thermochemistry",
    title: "Thermochemistry",
    category: "General Chemistry",
    order: 50,
    prerequisites: ["stoichiometry"],
    formulaIds: ["thermochemistry-calorimetry", "thermochemistry-enthalpy-per-mole"],
    solverModuleIds: ["calorimetry"],
    practiceTopics: ["Thermodynamics", "Chemistry Calculations"],
    curriculumTopics: ["Thermochemistry"],
  },
  {
    id: "acids-bases",
    title: "Acids and Bases",
    category: "General Chemistry",
    order: 60,
    prerequisites: ["molarity"],
    formulaIds: ["acids-bases-ph", "acids-bases-poh", "acids-bases-ph-poh", "acids-bases-ka", "acids-bases-kb"],
    solverModuleIds: ["ph"],
    practiceTopics: ["Acids and Bases", "Chemistry Calculations"],
    curriculumTopics: ["Acids and Bases"],
  },
  {
    id: "periodic-trends",
    title: "Periodic Trends",
    category: "General Chemistry",
    order: 70,
    prerequisites: [],
    formulaIds: [],
    solverModuleIds: [],
    practiceTopics: ["Periodic Trends"],
    curriculumTopics: ["Periodic Trends"],
  },
  {
    id: "functional-groups",
    title: "Functional Groups",
    category: "Organic Chemistry",
    order: 80,
    prerequisites: [],
    formulaIds: ["organic-homologous-series"],
    solverModuleIds: [],
    practiceTopics: ["Functional Group Identification", "IR Spectroscopy"],
    curriculumTopics: ["Functional Groups"],
  },
  {
    id: "organic-mechanisms",
    title: "Organic Mechanisms",
    category: "Organic Chemistry",
    order: 90,
    prerequisites: ["functional-groups"],
    formulaIds: ["organic-degree-unsaturation"],
    solverModuleIds: [],
    practiceTopics: ["Organic Mechanisms", "Organic Reactions"],
    curriculumTopics: ["Organic Mechanisms", "Alkenes", "Alcohols", "Esters"],
  },
]

const SCORE_BY_EVENT = {
  formula_view: 5,
  solver_used: 10,
  practice_correct: 10,
  practice_incorrect: -5,
  mechanism_correct: 10,
  mechanism_incorrect: -5,
  exam_generated: 5,
  curriculum_completed: 15,
} satisfies Record<StudyProgressEvent["type"], number>

function clampMastery(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, Math.round(value)))
}

function slug(value: string | undefined): string {
  return (value ?? "").toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

export function getStudyTopicById(topicId: string | undefined): StudyTopicDefinition | undefined {
  if (!topicId) return undefined
  return STUDY_TOPICS.find((topic) => topic.id === topicId)
}

export function getStudyTopicForFormula(formulaId: string | undefined): StudyTopicDefinition | undefined {
  if (!formulaId) return undefined
  return STUDY_TOPICS.find((topic) => topic.formulaIds.includes(formulaId))
}

export function getStudyTopicForSolver(moduleId: string | undefined): StudyTopicDefinition | undefined {
  if (!moduleId) return undefined
  return STUDY_TOPICS.find((topic) => topic.solverModuleIds.includes(moduleId))
}

export function getStudyTopicForPractice(topic: string | undefined, subtopic?: string): StudyTopicDefinition | undefined {
  const topicSlug = slug(topic)
  const subtopicSlug = slug(subtopic)
  return STUDY_TOPICS.find((entry) =>
    entry.practiceTopics.some((practiceTopic) => slug(practiceTopic) === topicSlug) ||
    entry.curriculumTopics.some((curriculumTopic) => slug(curriculumTopic) === topicSlug || slug(curriculumTopic) === subtopicSlug) ||
    slug(entry.title) === topicSlug ||
    slug(entry.title) === subtopicSlug,
  )
}

export function getStudyTopicForCurriculum(title: string | undefined): StudyTopicDefinition | undefined {
  const titleSlug = slug(title)
  return STUDY_TOPICS.find((topic) =>
    topic.curriculumTopics.some((curriculumTopic) => slug(curriculumTopic) === titleSlug) || slug(topic.title) === titleSlug,
  )
}

function eventTopic(event: StudyProgressEvent): StudyTopicDefinition | undefined {
  return (
    getStudyTopicById(event.topicId) ??
    (event.type === "formula_view" ? getStudyTopicForFormula(event.entityId) : undefined) ??
    (event.type === "solver_used" ? getStudyTopicForSolver(event.entityId) : undefined) ??
    getStudyTopicForPractice(event.topic, event.subtopic)
  )
}

function addScore(scores: Map<string, { score: number; reasons: string[] }>, topic: StudyTopicDefinition, score: number, reason: string) {
  const current = scores.get(topic.id) ?? { score: 0, reasons: [] }
  scores.set(topic.id, {
    score: current.score + score,
    reasons: [...current.reasons, reason],
  })
}

function buildRecommendation(topics: StudyTopicMastery[]): StudyRecommendation {
  const byId = new Map(topics.map((topic) => [topic.topic.id, topic]))
  const currentTopic =
    topics.find((topic) => topic.mastery > 0 && topic.mastery < 70 && topic.status !== "Locked") ?? null
  const recommendedTopic =
    topics.find((topic) => topic.status === "Recommended") ??
    topics.find((topic) => topic.status === "In Progress" && topic.mastery < 70) ??
    topics.find((topic) => topic.status !== "Locked" && topic.mastery < 70) ??
    null

  if (!recommendedTopic) {
    return {
      currentTopic,
      recommendedTopic: null,
      why: "All tracked study topics are currently above the recommendation threshold.",
      action: "Open Learning Dashboard",
      href: "/learning-dashboard",
    }
  }

  const missingPrerequisite = recommendedTopic.topic.prerequisites
    .map((id) => byId.get(id))
    .find((topic) => topic && topic.mastery < 50)

  const action = recommendedTopic.mastery < 15 && recommendedTopic.topic.formulaIds[0]
    ? `Open Formula Sheet for ${recommendedTopic.title}`
    : recommendedTopic.topic.solverModuleIds[0]
      ? `Review ${recommendedTopic.title} Solver`
      : `Practice ${recommendedTopic.title}`
  const href = recommendedTopic.mastery < 15 && recommendedTopic.topic.formulaIds[0]
    ? `/formula-sheet?formula=${encodeURIComponent(recommendedTopic.topic.formulaIds[0])}#formula-${recommendedTopic.topic.formulaIds[0]}`
    : recommendedTopic.topic.solverModuleIds[0]
      ? `/chemistry-solver?module=${encodeURIComponent(recommendedTopic.topic.solverModuleIds[0])}#solver-module`
      : `/practice-generator?topic=${encodeURIComponent(recommendedTopic.topic.practiceTopics[0] ?? recommendedTopic.title)}&source=database`

  return {
    currentTopic,
    recommendedTopic,
    why: missingPrerequisite
      ? `${recommendedTopic.title} depends on ${missingPrerequisite.title}, so ARSHLAB recommends strengthening that chain first.`
      : `${recommendedTopic.title} is the next unlocked topic with mastery below 70% in the deterministic roadmap.`,
    action,
    href,
  }
}

function studyStreak(events: StudyProgressEvent[]): number {
  const days = new Set(events.map((event) => event.createdAt.slice(0, 10)))
  let streak = 0
  const cursor = new Date()
  while (days.has(cursor.toISOString().slice(0, 10))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

export function calculateStudySnapshot(input: {
  events?: StudyProgressEvent[]
  practiceEntries?: PracticeProgressEntry[]
  formulaStats?: FormulaViewStats | null
  curriculumProgress?: CurriculumRoadmapProgressState | null
}): StudyEngineSnapshot {
  const scores = new Map<string, { score: number; reasons: string[] }>()
  const events = input.events ?? []

  for (const event of events) {
    const topic = eventTopic(event)
    if (!topic) continue
    addScore(scores, topic, SCORE_BY_EVENT[event.type], event.type.replace(/_/g, " "))
  }

  for (const [formulaId, views] of Object.entries(input.formulaStats?.formulaViews ?? {})) {
    const topic = getStudyTopicForFormula(formulaId)
    if (topic) addScore(scores, topic, Math.min(views, 3) * 5, "formula viewed")
  }

  for (const entry of input.practiceEntries ?? []) {
    const topic = getStudyTopicForPractice(entry.topic, entry.subtopic)
    if (!topic) continue
    const mechanism = topic.id === "organic-mechanisms"
    addScore(scores, topic, entry.correct ? 10 : -5, mechanism ? "mechanism practice" : "practice attempt")
  }

  for (const [topicId, progress] of Object.entries(input.curriculumProgress?.topics ?? {})) {
    if (!progress.completed) continue
    const topic = getStudyTopicForCurriculum(topicId) ?? getStudyTopicForCurriculum(topicId.replace(/^(general|organic)-/, ""))
    if (topic) addScore(scores, topic, 15, "curriculum completed")
  }

  const topics = STUDY_TOPICS
    .map((topic): StudyTopicMastery => {
      const score = clampMastery(scores.get(topic.id)?.score ?? 0)
      const reasons = scores.get(topic.id)?.reasons ?? []
      const prereqsMet = topic.prerequisites.every((id) => clampMastery(scores.get(id)?.score ?? 0) >= 50)
      let status: StudyTopicStatus = "In Progress"
      if (!prereqsMet) status = "Locked"
      else if (score >= 80) status = "Completed"
      else if (score === 0) status = "Recommended"
      else status = "In Progress"
      return { topic, mastery: score, status, reasons }
    })
    .sort((a, b) => a.topic.order - b.topic.order)

  const firstRecommended = topics.find((topic) => topic.status === "Recommended")
  const normalizedTopics = topics.map((topic) => ({
    ...topic,
    status: topic.status === "Recommended" && topic.topic.id !== firstRecommended?.topic.id ? "In Progress" as StudyTopicStatus : topic.status,
  }))
  const attemptedTopics = normalizedTopics.filter((topic) => topic.mastery > 0)
  const overallMastery = normalizedTopics.length
    ? clampMastery(normalizedTopics.reduce((sum, topic) => sum + topic.mastery, 0) / normalizedTopics.length)
    : 0

  return {
    topics: normalizedTopics,
    overallMastery,
    studyStreak: studyStreak(events),
    topicsMastered: normalizedTopics.filter((topic) => topic.mastery >= 80).length,
    weakestTopics: (attemptedTopics.length ? attemptedTopics : normalizedTopics)
      .filter((topic) => topic.status !== "Locked")
      .sort((a, b) => a.mastery - b.mastery || a.topic.order - b.topic.order)
      .slice(0, 4),
    recommendation: buildRecommendation(normalizedTopics),
  }
}

export function getTopicMastery(snapshot: StudyEngineSnapshot, topicId: string | undefined): number {
  if (!topicId) return 0
  return snapshot.topics.find((topic) => topic.topic.id === topicId)?.mastery ?? 0
}

export function previewMasteryAfter(
  snapshot: StudyEngineSnapshot,
  topicId: string | undefined,
  correct: boolean,
): number {
  return clampMastery(getTopicMastery(snapshot, topicId) + (correct ? 10 : -5))
}
