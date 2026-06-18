export type StudyEventType =
  | "formula_view"
  | "solver_used"
  | "practice_correct"
  | "practice_incorrect"
  | "mechanism_correct"
  | "mechanism_incorrect"
  | "exam_generated"
  | "curriculum_completed"

export interface StudyProgressEvent {
  id: string
  type: StudyEventType
  topicId?: string
  topic?: string
  subtopic?: string
  entityId?: string
  createdAt: string
}

export interface StudyProgressState {
  events: StudyProgressEvent[]
  updatedAt?: string
}

export type StudyTopicStatus = "Completed" | "In Progress" | "Recommended" | "Locked"

export interface StudyTopicDefinition {
  id: string
  title: string
  category: string
  order: number
  prerequisites: string[]
  formulaIds: string[]
  solverModuleIds: string[]
  practiceTopics: string[]
  curriculumTopics: string[]
}

export interface StudyTopicMastery {
  topic: StudyTopicDefinition
  mastery: number
  status: StudyTopicStatus
  reasons: string[]
}

export interface StudyRecommendation {
  currentTopic: StudyTopicMastery | null
  recommendedTopic: StudyTopicMastery | null
  why: string
  action: string
  href: string
}

export interface StudyEngineSnapshot {
  topics: StudyTopicMastery[]
  overallMastery: number
  studyStreak: number
  topicsMastered: number
  weakestTopics: StudyTopicMastery[]
  recommendation: StudyRecommendation
}
