export const DIAGNOSTIC_TOPICS = [
  "Functional Group Identification",
  "Hybridization",
  "VSEPR Geometry",
  "Periodic Trends",
  "Spectroscopy",
  "Electron Configuration",
  "IR Spectroscopy",
  "Thermodynamics",
  "Kinetics",
  "Equilibrium",
  "Acids and Bases",
  "Bonding",
  "Stoichiometry",
  "Reaction Types",
  "Reaction Prediction",
  "Reaction Balancing",
  "Reaction Classification",
  "Redox",
  "Precipitation",
  "Combustion",
] as const

export const DIAGNOSTIC_COUNTS = [20, 40, 60] as const

export const DIAGNOSTIC_CURRICULA = [
  "General First-Year Chemistry",
  "CHEM 121 Style",
  "IB Chemistry Style",
  "AP Chemistry Style",
  "A-Level Chemistry Style",
] as const

export type DiagnosticTopic = (typeof DIAGNOSTIC_TOPICS)[number]
export type DiagnosticCount = (typeof DIAGNOSTIC_COUNTS)[number]
export type DiagnosticCurriculum = (typeof DIAGNOSTIC_CURRICULA)[number]
export type DiagnosticBand = "Needs Intervention" | "Developing" | "Competent" | "Advanced"

export interface DiagnosticAttemptLike {
  topic: string
  subtopic: string
  correct: boolean
}

export interface DiagnosticStat {
  name: string
  attempted: number
  correct: number
  missed: number
  accuracy: number
  band: DiagnosticBand
}

export function getDiagnosticBand(accuracy: number): DiagnosticBand {
  if (accuracy < 40) return "Needs Intervention"
  if (accuracy < 60) return "Developing"
  if (accuracy < 80) return "Competent"
  return "Advanced"
}

export function percentage(correct: number, total: number): number {
  return total > 0 ? Math.round((correct / total) * 100) : 0
}

export function calculateDiagnosticStats(
  attempts: DiagnosticAttemptLike[],
  key: "topic" | "subtopic",
): DiagnosticStat[] {
  const groups = new Map<string, { attempted: number; correct: number }>()

  for (const attempt of attempts) {
    const name = key === "topic" ? attempt.topic : attempt.subtopic
    const current = groups.get(name) ?? { attempted: 0, correct: 0 }
    current.attempted += 1
    if (attempt.correct) current.correct += 1
    groups.set(name, current)
  }

  return Array.from(groups.entries())
    .map(([name, stats]) => {
      const accuracy = percentage(stats.correct, stats.attempted)
      return {
        name,
        attempted: stats.attempted,
        correct: stats.correct,
        missed: stats.attempted - stats.correct,
        accuracy,
        band: getDiagnosticBand(accuracy),
      }
    })
    .sort((a, b) => a.accuracy - b.accuracy || b.attempted - a.attempted || a.name.localeCompare(b.name))
}

export function getRecommendedStudyOrder(topicStats: DiagnosticStat[]): string[] {
  return [...topicStats]
    .sort((a, b) => a.accuracy - b.accuracy || b.attempted - a.attempted || a.name.localeCompare(b.name))
    .map((stat) => stat.name)
}
