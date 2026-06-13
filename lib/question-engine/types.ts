export type QuestionSource = "ai" | "database"

export interface QuestionChoice {
  label: string
  text: string
}

export interface QuestionSourceEntry {
  kind: string
  id: string
  name: string
}

export interface Question {
  id: string
  topic: string
  subtopic: string
  questionType: string
  difficulty: string
  curriculumStyle: string
  question: string
  choices: QuestionChoice[]
  correctAnswer: string
  explanation: string
  misconceptionNote?: string
  source: QuestionSource
  sourceEntry: QuestionSourceEntry
}

export interface GenerateDatabaseQuestionsInput {
  topic: string
  difficulty: string
  count: number
  curriculum?: string
  unit?: string
  questionType?: string
  targetSubtopic?: string
}

export interface QuestionTemplateContext extends GenerateDatabaseQuestionsInput {
  index: number
}

export interface QuestionTemplate {
  id: string
  name: string
  description: string
  supportedTopics: string[]
  supportedSubtopics?: string[]
  estimatedCombinations: number
  build(context: QuestionTemplateContext): Question | null
}

export interface QuestionEngineStats {
  templates: number
  supportedTopics: string[]
  estimatedCombinations: number
  templateCoveragePercent: number
  databaseCounts: {
    compounds: number
    ions: number
    functionalGroups: number
    reactions: number
    spectroscopy: number
    irPeaks: number
  }
}
