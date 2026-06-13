import { getBlueprintForCurriculum, getExamBlueprint, listExamBlueprints } from "./blueprints"
import {
  buildExamMetrics,
  getCurriculumUnitsTested,
  summarizeCoverage,
} from "./scoring"
import type {
  AdaptiveProgressEntry,
  ExamBlueprintSection,
  ExamEngineInput,
  ExamEngineQuestion,
  ExamEngineStats,
  GeneratedEngineExam,
} from "./types"
import { generateDatabaseQuestions, getQuestionEngineStats } from "@/lib/question-engine/generator"
import type { Question } from "@/lib/question-engine/types"

const REVIEW_TOPICS = [
  "Periodic Trends",
  "Functional Group Identification",
  "Hybridization",
  "Stoichiometry",
  "Electron Configuration",
  "IR Spectroscopy",
]

function clampQuestionCount(count: number): number {
  return Math.max(1, Math.min(50, Math.floor(count || 10)))
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

function scaleSections(sections: ExamBlueprintSection[], totalQuestions: number): ExamBlueprintSection[] {
  const totalWeight = sections.reduce((sum, section) => sum + section.count, 0) || 1
  const scaled = sections.map((section) => {
    const exact = (section.count / totalWeight) * totalQuestions
    return {
      ...section,
      count: Math.max(1, Math.floor(exact)),
      remainder: exact - Math.floor(exact),
    }
  })

  let assigned = scaled.reduce((sum, section) => sum + section.count, 0)

  while (assigned < totalQuestions) {
    const next = [...scaled].sort((a, b) => b.remainder - a.remainder || b.count - a.count)[
      assigned % scaled.length
    ]
    next.count += 1
    assigned += 1
  }

  while (assigned > totalQuestions) {
    const next = [...scaled].sort((a, b) => b.count - a.count || a.remainder - b.remainder)[0]
    if (!next || next.count <= 1) break
    next.count -= 1
    assigned -= 1
  }

  return scaled.map(({ remainder: _remainder, ...section }) => section)
}

function questionToExamQuestion(
  question: Question,
  questionNumber: number,
  section?: ExamBlueprintSection,
): ExamEngineQuestion {
  return {
    questionNumber,
    type: "multiple_choice",
    topic: question.topic,
    subtopic: question.subtopic,
    question: question.question,
    choices: question.choices.map((choice) => `${choice.label}. ${choice.text}`),
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    source: "database",
    sourceEntry: question.sourceEntry,
    curriculumUnit: section?.unit,
    blueprintSection: section?.label,
  }
}

function buildTitle(input: ExamEngineInput, adaptive = false): string {
  const prefix = adaptive ? "Adaptive Practice Exam" : "Database Practice Exam"
  const curriculum = input.curriculum || "Chemistry"
  return `${prefix}: ${curriculum}`
}

function getEffectiveSections(input: ExamEngineInput): ExamBlueprintSection[] {
  if (input.topic && input.topic !== "all") {
    return [
      {
        id: `target-${normalize(input.topic)}`,
        label: input.topic,
        topic: input.topic,
        subtopic: input.subtopic === "all" ? undefined : input.subtopic,
        unit: input.unit === "all" ? undefined : input.unit,
        count: clampQuestionCount(input.count),
      },
    ]
  }

  const blueprint =
    getExamBlueprint(input.blueprintId) ?? getBlueprintForCurriculum(input.curriculum, input.count)
  return scaleSections(blueprint.sections, clampQuestionCount(input.count))
}

function generateQuestionsForSections(input: ExamEngineInput, sections: ExamBlueprintSection[]): ExamEngineQuestion[] {
  const questions: ExamEngineQuestion[] = []
  const targetCount = clampQuestionCount(input.count)

  for (const section of sections) {
    const generated = generateDatabaseQuestions({
      topic: section.topic,
      targetSubtopic: section.subtopic ?? input.subtopic,
      difficulty: input.difficulty,
      count: section.count,
      curriculum: input.curriculumId,
      unit: section.unit ?? input.unit,
    })

    for (const question of generated) {
      questions.push(questionToExamQuestion(question, questions.length + 1, section))
    }
  }

  let fillAttempt = 0
  while (questions.length < targetCount && fillAttempt < targetCount * 4) {
    const topic = REVIEW_TOPICS[fillAttempt % REVIEW_TOPICS.length]
    const generated = generateDatabaseQuestions({
      topic,
      difficulty: input.difficulty,
      count: 1,
      curriculum: input.curriculumId,
      unit: input.unit,
    })
    const section: ExamBlueprintSection = {
      id: `fill-${fillAttempt}`,
      label: "Mixed Review",
      topic,
      unit: input.unit,
      count: 1,
    }
    for (const question of generated) {
      questions.push(questionToExamQuestion(question, questions.length + 1, section))
      if (questions.length >= targetCount) break
    }
    fillAttempt += 1
  }

  return questions.slice(0, targetCount).map((question, index) => ({
    ...question,
    questionNumber: index + 1,
  }))
}

export function generateDatabaseExam(input: ExamEngineInput): GeneratedEngineExam {
  const sections = getEffectiveSections(input)
  const questions = generateQuestionsForSections(input, sections)
  const blueprint =
    getExamBlueprint(input.blueprintId) ?? getBlueprintForCurriculum(input.curriculum, input.count)
  const questionBreakdown = summarizeCoverage(questions)
  const curriculumUnitsTested = getCurriculumUnitsTested(questions)

  return {
    title: buildTitle(input),
    source: "database",
    questions,
    coverageSummary: questionBreakdown.map((item) => `${item.label}: ${item.count}`).join(", "),
    curriculumUnitsTested,
    questionBreakdown,
    metrics: buildExamMetrics(questions, sections.length),
    blueprintId: input.topic && input.topic !== "all" ? undefined : blueprint.id,
  }
}

function buildAdaptiveSections(
  entries: AdaptiveProgressEntry[],
  count: number,
  unit?: string,
): ExamBlueprintSection[] {
  const byTopic = new Map<string, { total: number; correct: number; subtopics: Map<string, { total: number; correct: number }> }>()
  const recent = [...entries]
    .sort((a, b) => new Date(b.timestamp ?? 0).getTime() - new Date(a.timestamp ?? 0).getTime())
    .slice(0, 100)

  for (const entry of recent) {
    const topic = entry.topic || "Periodic Trends"
    const subtopic = entry.subtopic || ""
    const current = byTopic.get(topic) ?? { total: 0, correct: 0, subtopics: new Map() }
    current.total += 1
    if (entry.correct) current.correct += 1
    const subtopicStats = current.subtopics.get(subtopic) ?? { total: 0, correct: 0 }
    subtopicStats.total += 1
    if (entry.correct) subtopicStats.correct += 1
    current.subtopics.set(subtopic, subtopicStats)
    byTopic.set(topic, current)
  }

  const weakTopics = Array.from(byTopic.entries())
    .map(([topic, stats]) => ({
      topic,
      total: stats.total,
      accuracy: stats.total ? stats.correct / stats.total : 1,
      subtopic: Array.from(stats.subtopics.entries())
        .filter(([subtopic]) => Boolean(subtopic))
        .sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total || b[1].total - a[1].total)[0]?.[0],
    }))
    .filter((stats) => stats.total >= 3)
    .sort((a, b) => a.accuracy - b.accuracy || b.total - a.total)

  const firstWeak = weakTopics[0]
  const secondWeak = weakTopics[1]

  if (!firstWeak) {
    return scaleSections(
      REVIEW_TOPICS.map((topic, index) => ({
        id: `review-${index}`,
        label: topic,
        topic,
        unit,
        count: 1,
      })),
      count,
    )
  }

  const reviewTopic = REVIEW_TOPICS.find(
    (topic) => normalize(topic) !== normalize(firstWeak.topic) && normalize(topic) !== normalize(secondWeak?.topic ?? ""),
  ) ?? "Functional Group Identification"

  const weakCount = secondWeak ? Math.round(count * 0.6) : Math.round(count * 0.85)
  const secondCount = secondWeak ? Math.max(1, Math.round(count * 0.25)) : 0
  const reviewCount = Math.max(1, count - weakCount - secondCount)

  return [
    {
      id: "adaptive-primary",
      label: firstWeak.subtopic ? `${firstWeak.topic}: ${firstWeak.subtopic}` : firstWeak.topic,
      topic: firstWeak.topic,
      subtopic: firstWeak.subtopic,
      unit,
      count: weakCount,
    },
    ...(secondWeak
      ? [
          {
            id: "adaptive-secondary",
            label: secondWeak.subtopic ? `${secondWeak.topic}: ${secondWeak.subtopic}` : secondWeak.topic,
            topic: secondWeak.topic,
            subtopic: secondWeak.subtopic,
            unit,
            count: secondCount,
          },
        ]
      : []),
    {
      id: "adaptive-review",
      label: "Mixed Review",
      topic: reviewTopic,
      unit,
      count: reviewCount,
    },
  ]
}

export function generateAdaptiveDatabaseExam(
  input: ExamEngineInput,
  entries: AdaptiveProgressEntry[],
): GeneratedEngineExam {
  const count = clampQuestionCount(input.count)
  const sections = buildAdaptiveSections(entries, count, input.unit)
  const questions = generateQuestionsForSections(input, sections)
  const questionBreakdown = summarizeCoverage(questions)
  const curriculumUnitsTested = getCurriculumUnitsTested(questions)

  return {
    title: buildTitle(input, true),
    source: "adaptive",
    questions,
    coverageSummary: questionBreakdown.map((item) => `${item.label}: ${item.count}`).join(", "),
    curriculumUnitsTested,
    questionBreakdown,
    metrics: buildExamMetrics(questions, sections.length),
  }
}

export function getHybridSplit(count: number): { databaseCount: number; aiCount: number } {
  const total = clampQuestionCount(count)
  const aiCount = total <= 1 ? 0 : Math.max(1, Math.round(total * 0.3))
  return {
    databaseCount: total - aiCount,
    aiCount,
  }
}

export function mergeExamQuestions(
  databaseQuestions: ExamEngineQuestion[],
  aiQuestions: ExamEngineQuestion[],
): ExamEngineQuestion[] {
  return [...databaseQuestions, ...aiQuestions].map((question, index) => ({
    ...question,
    questionNumber: index + 1,
  }))
}

export function buildGeneratedExamFromQuestions(input: {
  title: string
  source: "ai" | "hybrid"
  questions: ExamEngineQuestion[]
  expectedSections?: number
  blueprintId?: string
}): GeneratedEngineExam {
  const questionBreakdown = summarizeCoverage(input.questions)
  return {
    title: input.title,
    source: input.source,
    questions: input.questions,
    coverageSummary: questionBreakdown.map((item) => `${item.label}: ${item.count}`).join(", "),
    curriculumUnitsTested: getCurriculumUnitsTested(input.questions),
    questionBreakdown,
    metrics: buildExamMetrics(input.questions, input.expectedSections ?? (questionBreakdown.length || 1)),
    blueprintId: input.blueprintId,
  }
}

export function getExamEngineStats(): ExamEngineStats {
  const questionStats = getQuestionEngineStats()
  const blueprints = listExamBlueprints()
  return {
    blueprintCount: blueprints.length,
    supportedCurricula: blueprints.map((blueprint) => blueprint.curriculum),
    supportedLengths: Array.from(new Set([10, 20, 25, 30, 50])).sort((a, b) => a - b),
    supportedTopics: questionStats.supportedTopics,
    estimatedExamCombinations: questionStats.estimatedCombinations * blueprints.length * 4,
  }
}

export { listExamBlueprints, getExamBlueprint, getBlueprintForCurriculum } from "./blueprints"
export type {
  AdaptiveProgressEntry,
  ExamBlueprint,
  ExamBlueprintSection,
  ExamEngineInput,
  ExamEngineQuestion,
  GeneratedEngineExam,
} from "./types"
