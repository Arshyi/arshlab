import type { Question } from "@/lib/question-engine/types"

export type ExamSourceMode = "database" | "ai" | "hybrid" | "adaptive"

export interface ExamBlueprintSection {
  id: string
  label: string
  topic: string
  unit?: string
  subtopic?: string
  count: number
}

export interface ExamBlueprint {
  id: string
  name: string
  curriculum: string
  questionCount: number
  difficulty: string
  description: string
  sections: ExamBlueprintSection[]
}

export interface ExamEngineInput {
  curriculum: string
  curriculumId?: string
  unit?: string
  topic?: string
  subtopic?: string
  difficulty: string
  count: number
  questionType?: string
  blueprintId?: string
}

export interface AdaptiveProgressEntry {
  topic: string
  subtopic?: string
  difficulty?: string
  correct: boolean
  timestamp?: string
}

export interface ExamEngineQuestion {
  questionNumber: number
  type: "multiple_choice" | "short_answer"
  topic: string
  subtopic: string
  question: string
  choices: string[]
  correctAnswer: string
  explanation: string
  source: "database" | "ai"
  sourceEntry?: Question["sourceEntry"]
  curriculumUnit?: string
  blueprintSection?: string
}

export interface ExamEngineMetrics {
  questionsGenerated: number
  databaseCount: number
  aiCount: number
  databasePercent: number
  aiPercent: number
  estimatedMinutes: number
  coveragePercent: number
}

export interface ExamCoverageItem {
  label: string
  count: number
}

export interface GeneratedEngineExam {
  title: string
  source: ExamSourceMode
  questions: ExamEngineQuestion[]
  coverageSummary: string
  curriculumUnitsTested: string[]
  questionBreakdown: ExamCoverageItem[]
  metrics: ExamEngineMetrics
  blueprintId?: string
}

export interface ExamEngineStats {
  blueprintCount: number
  supportedCurricula: string[]
  supportedLengths: number[]
  supportedTopics: string[]
  estimatedExamCombinations: number
}
