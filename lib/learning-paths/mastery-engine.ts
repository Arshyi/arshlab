import { listLearningPaths } from "./curriculum"
import { normalizeLearningPathProgress, type LearningPathProgressState } from "./progress-engine"

export type LearningMasteryLevel = "Beginner" | "Developing" | "Proficient" | "Advanced"

export interface TrackMastery {
  pathId: string
  title: string
  completedLessons: number
  totalLessons: number
  completionScore: number
  quizScore: number
  masteryScore: number
  level: LearningMasteryLevel
}

export interface LearningMasterySummary {
  overallScore: number
  overallLevel: LearningMasteryLevel
  trackMastery: TrackMastery[]
  completedLessons: number
  totalLessons: number
  quizAverage: number
}

export function masteryLevel(score: number): LearningMasteryLevel {
  if (score >= 85) return "Advanced"
  if (score >= 60) return "Proficient"
  if (score >= 30) return "Developing"
  return "Beginner"
}

function average(values: number[]): number {
  if (!values.length) return 0
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

export function calculateLearningMastery(state: Partial<LearningPathProgressState> = {}): LearningMasterySummary {
  const progress = normalizeLearningPathProgress(state)
  const trackMastery = listLearningPaths().map<TrackMastery>((path) => {
    const totalLessons = path.lessons.length
    const completedLessons = path.lessons.filter((lesson) => progress.lessons[lesson.id]?.status === "completed").length
    const completionScore = totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0
    const quizScores = path.lessons
      .map((lesson) => progress.lessons[lesson.id]?.bestQuizScore ?? 0)
      .filter((score) => score > 0)
    const quizScore = average(quizScores)
    const masteryScore = Math.max(0, Math.min(100, Math.round(completionScore * 0.7 + quizScore * 0.3)))
    return {
      pathId: path.id,
      title: path.title,
      completedLessons,
      totalLessons,
      completionScore,
      quizScore,
      masteryScore,
      level: masteryLevel(masteryScore),
    }
  })

  const totalLessons = trackMastery.reduce((sum, track) => sum + track.totalLessons, 0)
  const completedLessons = trackMastery.reduce((sum, track) => sum + track.completedLessons, 0)
  const quizAverage = average(trackMastery.map((track) => track.quizScore).filter((score) => score > 0))
  const overallScore = totalLessons
    ? Math.max(0, Math.min(100, Math.round((completedLessons / totalLessons) * 70 + quizAverage * 0.3)))
    : 0

  return {
    overallScore,
    overallLevel: masteryLevel(overallScore),
    trackMastery,
    completedLessons,
    totalLessons,
    quizAverage,
  }
}
