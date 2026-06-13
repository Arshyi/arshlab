"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Database,
  Flame,
  GraduationCap,
  Medal,
  RefreshCw,
  Sparkles,
  Target,
  Trophy,
  XCircle,
  Zap,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import {
  getConceptProgress,
  getPracticeProgress,
  type ConceptProgressEntry,
  type PracticeProgressEntry,
} from "@/lib/supabase/practice-progress"
import {
  getLevelFromXp,
  getUserProfile,
  updateDailyGoal,
  updateSelectedCurriculum,
  type UserProfile,
} from "@/lib/supabase/user-profile"
import {
  calculateCurriculumProgress,
  listCurricula,
  type CurriculumId,
  type CurriculumProgressSummary,
} from "@/lib/curriculum/curriculum-registry"
import {
  calculateConceptStats,
  detectWeakTopics,
  getMasteryBand,
  type LearningConceptStats,
} from "@/lib/learning/recovery"

interface TopicStats {
  topic: string
  total: number
  correct: number
  missed: number
  accuracy: number
  mastery: number
}

interface SourceStats {
  attempted: number
  correct: number
  accuracy: number
}

interface Achievement {
  label: string
  description: string
  unlocked: boolean
  progress: number
  icon: React.ElementType
}

function percentage(correct: number, total: number): number {
  return total > 0 ? Math.round((correct / total) * 100) : 0
}

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function friendlyTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso

  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000))
  const diffHours = Math.floor(diffMinutes / 60)

  if (diffMinutes < 1) return "Just now"
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? "" : "s"} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`

  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date)
}

function getDailyAttempted(entries: PracticeProgressEntry[]): number {
  const today = todayKey()
  return entries.filter((entry) => {
    const date = new Date(entry.timestamp)
    if (Number.isNaN(date.getTime())) return false
    return date.toISOString().slice(0, 10) === today
  }).length
}

function getTopicStats(entries: PracticeProgressEntry[]): TopicStats[] {
  const groups = new Map<string, PracticeProgressEntry[]>()

  for (const entry of entries) {
    const group = groups.get(entry.topic) ?? []
    group.push(entry)
    groups.set(entry.topic, group)
  }

  return Array.from(groups.entries())
    .map(([topic, topicEntries]) => {
      let weightedTotal = 0
      let weightedCorrect = 0

      for (const [index, entry] of topicEntries.entries()) {
        const weight = Math.max(0.35, 1 - index * 0.04)
        weightedTotal += weight
        if (entry.correct) weightedCorrect += weight
      }

      const correct = topicEntries.filter((entry) => entry.correct).length
      const total = topicEntries.length

      return {
        topic,
        total,
        correct,
        missed: total - correct,
        accuracy: percentage(correct, total),
        mastery: weightedTotal ? Math.round((weightedCorrect / weightedTotal) * 100) : 0,
      }
    })
    .sort((a, b) => a.mastery - b.mastery || b.total - a.total || a.topic.localeCompare(b.topic))
}

function getLongestCorrectStreak(entries: PracticeProgressEntry[]): number {
  const chronological = [...entries].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
  )
  let current = 0
  let longest = 0

  for (const entry of chronological) {
    current = entry.correct ? current + 1 : 0
    longest = Math.max(longest, current)
  }

  return longest
}

function getMostImprovedTopic(entries: PracticeProgressEntry[]): { topic: string; improvement: number } | null {
  const topics = new Map<string, PracticeProgressEntry[]>()
  for (const entry of entries) {
    const topicEntries = topics.get(entry.topic) ?? []
    topicEntries.push(entry)
    topics.set(entry.topic, topicEntries)
  }

  const improvements = Array.from(topics.entries())
    .map(([topic, topicEntries]) => {
      const chronological = [...topicEntries].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      )
      const windowSize = Math.min(10, Math.floor(chronological.length / 2))
      if (windowSize < 2) return null
      const previous = chronological.slice(-windowSize * 2, -windowSize)
      const recent = chronological.slice(-windowSize)
      const previousAccuracy = percentage(previous.filter((entry) => entry.correct).length, previous.length)
      const recentAccuracy = percentage(recent.filter((entry) => entry.correct).length, recent.length)
      return { topic, improvement: recentAccuracy - previousAccuracy }
    })
    .filter((item): item is { topic: string; improvement: number } => Boolean(item))
    .sort((a, b) => b.improvement - a.improvement)

  return improvements[0] ?? null
}

function getSourceStats(entries: PracticeProgressEntry[], source: "ai" | "database"): SourceStats {
  const sourceEntries = entries.filter((entry) => entry.source === source)
  const correct = sourceEntries.filter((entry) => entry.correct).length
  return {
    attempted: sourceEntries.length,
    correct,
    accuracy: percentage(correct, sourceEntries.length),
  }
}

function getExamSourceStats(
  entries: PracticeProgressEntry[],
  source: "ai" | "database" | "hybrid" | "adaptive",
): SourceStats {
  const sourceEntries = entries.filter((entry) => entry.examSource === source)
  const correct = sourceEntries.filter((entry) => entry.correct).length
  return {
    attempted: sourceEntries.length,
    correct,
    accuracy: percentage(correct, sourceEntries.length),
  }
}

function conceptRowsToStats(rows: ConceptProgressEntry[]): LearningConceptStats[] {
  const groups = new Map<string, { topic: string; subtopic: string; attempted: number; correct: number }>()

  for (const row of rows) {
    const key = `${row.topic}::${row.subtopic}`
    const current = groups.get(key) ?? {
      topic: row.topic,
      subtopic: row.subtopic,
      attempted: 0,
      correct: 0,
    }
    current.attempted += row.attempted
    current.correct += row.correct
    groups.set(key, current)
  }

  return Array.from(groups.values()).map((row) => ({
    topic: row.topic,
    subtopic: row.subtopic,
    attempted: row.attempted,
    correct: row.correct,
    missed: row.attempted - row.correct,
    mastery: percentage(row.correct, row.attempted),
  }))
}

function getAchievements(
  entries: PracticeProgressEntry[],
  profile: UserProfile | null,
  topicStats: TopicStats[],
  curriculumSummary: CurriculumProgressSummary,
): Achievement[] {
  const total = entries.length
  const correct = entries.filter((entry) => entry.correct).length
  const completedExams = profile?.completedExams ?? 0
  const completedDiagnostics = profile?.completedDiagnostics ?? 0
  const xp = profile?.xp ?? 0
  const firstRecovery = entries.some((entry) => entry.questionType === "Recovery Mode")
  const masteredTopic = topicStats.some((stat) => stat.total >= 5 && stat.mastery >= 90)
  const longestStreak = getLongestCorrectStreak(entries)
  const bestDiagnosticAccuracy = profile?.bestDiagnosticAccuracy ?? 0
  const previousDiagnosticAccuracy = profile?.previousDiagnosticAccuracy
  const lastDiagnosticAccuracy = profile?.lastDiagnosticAccuracy ?? 0
  const diagnosticImproved =
    typeof previousDiagnosticAccuracy === "number" &&
    lastDiagnosticAccuracy > previousDiagnosticAccuracy
  const firstCurriculumSelected = Boolean(profile?.curriculumStartedAt || profile?.selectedCurriculum)
  const unitsMastered = curriculumSummary.unitsMastered
  const curriculumProgress = curriculumSummary.overallProgress

  return [
    {
      label: "First Question",
      description: "Attempt one self-marked practice question.",
      unlocked: total >= 1,
      progress: Math.min(100, total * 100),
      icon: ClipboardList,
    },
    {
      label: "First Exam",
      description: "Complete one full exam in Exam Generator.",
      unlocked: completedExams >= 1,
      progress: Math.min(100, completedExams * 100),
      icon: Trophy,
    },
    {
      label: "10 Correct Answers",
      description: "Mark ten answers correct.",
      unlocked: correct >= 10,
      progress: Math.min(100, Math.round((correct / 10) * 100)),
      icon: CheckCircle2,
    },
    {
      label: "50 Correct Answers",
      description: "Build a longer streak of correct work.",
      unlocked: correct >= 50,
      progress: Math.min(100, Math.round((correct / 50) * 100)),
      icon: Medal,
    },
    {
      label: "First Recovery Session",
      description: "Record progress from Recovery Mode.",
      unlocked: firstRecovery,
      progress: firstRecovery ? 100 : 0,
      icon: Flame,
    },
    {
      label: "Mastered Topic",
      description: "Reach 90% mastery on a topic with at least five attempts.",
      unlocked: masteredTopic,
      progress: masteredTopic ? 100 : Math.min(100, Math.max(0, ...topicStats.map((stat) => stat.mastery))),
      icon: Medal,
    },
    {
      label: "10 Correct In A Row",
      description: "Build a streak of ten correct tracked answers.",
      unlocked: longestStreak >= 10,
      progress: Math.min(100, Math.round((longestStreak / 10) * 100)),
      icon: CheckCircle2,
    },
    {
      label: "100 Questions Attempted",
      description: "Reach one hundred tracked attempts.",
      unlocked: total >= 100,
      progress: Math.min(100, Math.round((total / 100) * 100)),
      icon: Target,
    },
    {
      label: "500 XP Earned",
      description: "Earn five hundred XP from saved learning actions.",
      unlocked: xp >= 500,
      progress: Math.min(100, Math.round((xp / 500) * 100)),
      icon: Zap,
    },
    {
      label: "First Diagnostic",
      description: "Start placement tracking with one diagnostic.",
      unlocked: completedDiagnostics >= 1,
      progress: Math.min(100, completedDiagnostics * 100),
      icon: ClipboardCheck,
    },
    {
      label: "Diagnostic Complete",
      description: "Complete a full diagnostic assessment.",
      unlocked: completedDiagnostics >= 1,
      progress: Math.min(100, completedDiagnostics * 100),
      icon: Trophy,
    },
    {
      label: "70% Diagnostic",
      description: "Reach at least 70% on a diagnostic.",
      unlocked: bestDiagnosticAccuracy >= 70,
      progress: Math.min(100, Math.round((bestDiagnosticAccuracy / 70) * 100)),
      icon: Medal,
    },
    {
      label: "90% Diagnostic",
      description: "Reach advanced diagnostic placement.",
      unlocked: bestDiagnosticAccuracy >= 90,
      progress: Math.min(100, Math.round((bestDiagnosticAccuracy / 90) * 100)),
      icon: Medal,
    },
    {
      label: "Diagnostic Improvement",
      description: "Improve your latest diagnostic score.",
      unlocked: diagnosticImproved,
      progress: diagnosticImproved ? 100 : 0,
      icon: BarChart3,
    },
    {
      label: "Placement Ready",
      description: "Complete a diagnostic and review your progress dashboard.",
      unlocked: completedDiagnostics >= 1,
      progress: Math.min(100, completedDiagnostics * 100),
      icon: Target,
    },
    {
      label: "First Curriculum Selected",
      description: "Choose a learning path for curriculum-aware study.",
      unlocked: firstCurriculumSelected,
      progress: firstCurriculumSelected ? 100 : 0,
      icon: GraduationCap,
    },
    {
      label: "First Unit Mastered",
      description: "Master one curriculum unit.",
      unlocked: unitsMastered >= 1,
      progress: Math.min(100, unitsMastered * 100),
      icon: Medal,
    },
    {
      label: "25% Curriculum Complete",
      description: "Reach 25% overall curriculum mastery.",
      unlocked: curriculumProgress >= 25,
      progress: Math.min(100, Math.round((curriculumProgress / 25) * 100)),
      icon: BarChart3,
    },
    {
      label: "50% Curriculum Complete",
      description: "Reach 50% overall curriculum mastery.",
      unlocked: curriculumProgress >= 50,
      progress: Math.min(100, Math.round((curriculumProgress / 50) * 100)),
      icon: BarChart3,
    },
    {
      label: "75% Curriculum Complete",
      description: "Reach 75% overall curriculum mastery.",
      unlocked: curriculumProgress >= 75,
      progress: Math.min(100, Math.round((curriculumProgress / 75) * 100)),
      icon: Trophy,
    },
    {
      label: "Curriculum Mastery",
      description: "Reach 90% overall curriculum mastery.",
      unlocked: curriculumProgress >= 90,
      progress: Math.min(100, Math.round((curriculumProgress / 90) * 100)),
      icon: Trophy,
    },
  ]
}

export function ProgressClient() {
  const [entries, setEntries] = useState<PracticeProgressEntry[]>([])
  const [conceptEntries, setConceptEntries] = useState<ConceptProgressEntry[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [updatingGoal, setUpdatingGoal] = useState(false)
  const [updatingCurriculum, setUpdatingCurriculum] = useState(false)

  const loadProgress = useCallback(async () => {
    setLoading(true)
    setError(null)
    setMessage(null)

    const [progressResult, profileResult, conceptResult] = await Promise.all([
      getPracticeProgress(500),
      getUserProfile(),
      getConceptProgress(500),
    ])

    if (!progressResult.ok) {
      setEntries([])
      setError(progressResult.error)
    } else {
      setEntries(progressResult.data)
    }

    if (conceptResult.ok) {
      setConceptEntries(conceptResult.data)
    } else {
      setConceptEntries([])
    }

    if (profileResult.ok) {
      setProfile(profileResult.data)
    } else {
      setProfile(null)
      if (progressResult.ok) setError(profileResult.error)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    void loadProgress()
  }, [loadProgress])

  const total = entries.length
  const correct = entries.filter((entry) => entry.correct).length
  const missed = total - correct
  const overallAccuracy = percentage(correct, total)
  const topicStats = useMemo(() => getTopicStats(entries), [entries])
  const databaseStats = useMemo(() => getSourceStats(entries, "database"), [entries])
  const aiStats = useMemo(() => getSourceStats(entries, "ai"), [entries])
  const databaseExamStats = useMemo(() => getExamSourceStats(entries, "database"), [entries])
  const aiExamStats = useMemo(() => getExamSourceStats(entries, "ai"), [entries])
  const hybridExamStats = useMemo(() => getExamSourceStats(entries, "hybrid"), [entries])
  const adaptiveExamStats = useMemo(() => getExamSourceStats(entries, "adaptive"), [entries])
  const conceptStats = useMemo(
    () => (conceptEntries.length > 0 ? conceptRowsToStats(conceptEntries) : calculateConceptStats(entries)),
    [conceptEntries, entries],
  )
  const mostMissedConcepts = useMemo(
    () =>
      [...conceptStats]
        .filter((concept) => concept.attempted > 0)
        .sort((a, b) => a.mastery - b.mastery || b.attempted - a.attempted)
        .slice(0, 8),
    [conceptStats],
  )
  const recoveryConcepts = useMemo(
    () => mostMissedConcepts.filter((concept) => concept.attempted >= 5 && concept.mastery < 60).slice(0, 3),
    [mostMissedConcepts],
  )
  const recoveryTopics = useMemo(() => detectWeakTopics(entries).slice(0, 3), [entries])
  const recent = entries.slice(0, 16)
  const curriculumSummary = useMemo(
    () => calculateCurriculumProgress(entries, profile?.selectedCurriculum),
    [entries, profile?.selectedCurriculum],
  )
  const curricula = useMemo(() => listCurricula(), [])
  const achievements = useMemo(
    () => getAchievements(entries, profile, topicStats, curriculumSummary),
    [curriculumSummary, entries, profile, topicStats],
  )
  const unlockedAchievements = achievements.filter((achievement) => achievement.unlocked).length
  const dailyGoal = profile?.dailyGoal ?? 10
  const dailyAttempted = useMemo(() => getDailyAttempted(entries), [entries])
  const dailyProgress = Math.min(100, Math.round((dailyAttempted / dailyGoal) * 100))
  const xp = profile?.xp ?? 0
  const level = getLevelFromXp(xp)
  const weakestTopic = topicStats[0] ?? null
  const strongestTopic = [...topicStats].sort((a, b) => b.mastery - a.mastery || b.total - a.total)[0] ?? null
  const mostAttemptedTopic = [...topicStats].sort((a, b) => b.total - a.total || b.mastery - a.mastery)[0] ?? null
  const mostImprovedTopic = useMemo(() => getMostImprovedTopic(entries), [entries])
  const previousDiagnosticAccuracy = profile?.previousDiagnosticAccuracy
  const diagnosticImprovement =
    typeof previousDiagnosticAccuracy === "number"
      ? (profile?.lastDiagnosticAccuracy ?? 0) - previousDiagnosticAccuracy
      : null
  const diagnosticScore = profile?.completedDiagnostics
    ? `${profile.lastDiagnosticAccuracy}%`
    : "No diagnostic"
  const lastDiagnosticDate = profile?.lastDiagnosticAt ? friendlyTime(profile.lastDiagnosticAt) : "Not taken"

  async function handleDailyGoalChange(value: string) {
    const goal = Number(value)
    if (goal !== 5 && goal !== 10 && goal !== 20) return

    setUpdatingGoal(true)
    setMessage(null)
    const result = await updateDailyGoal(goal)
    setUpdatingGoal(false)

    if (result.ok) {
      setProfile(result.data)
      setMessage("Daily goal updated.")
    } else {
      setMessage(`Daily goal was not updated: ${result.error}`)
    }
  }

  async function handleCurriculumChange(value: string) {
    setUpdatingCurriculum(true)
    setMessage(null)
    const result = await updateSelectedCurriculum(value as CurriculumId)
    setUpdatingCurriculum(false)

    if (result.ok) {
      setProfile(result.data)
      setMessage("Learning path updated. Existing progress was preserved.")
    } else {
      setMessage(`Learning path was not updated: ${result.error}`)
    }
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">My Progress</h1>
              <p className="text-muted-foreground">Study dashboard, topic mastery, concept analytics, XP, and achievements</p>
            </div>
          </div>
        </motion.div>

        {error && (
          <Alert className="mb-6 rounded-2xl border-amber-500/30 bg-amber-500/10">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Progress unavailable</AlertTitle>
            <AlertDescription>
              {error}
              <div className="mt-3">
                <Button asChild className="rounded-xl">
                  <Link href="/account">Sign in / Account</Link>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {message && (
          <Alert className="mb-6 rounded-2xl border-teal-500/30 bg-teal-500/10">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Progress update</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {(recoveryConcepts.length > 0 || recoveryTopics.length > 0) && (
          <Alert className="mb-6 rounded-2xl border-orange-500/30 bg-orange-500/10">
            <Target className="h-4 w-4" />
            <AlertTitle>Recommended Recovery</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>
                Weak areas detected:{" "}
                {(recoveryConcepts.length > 0
                  ? recoveryConcepts.map((concept) => `${concept.subtopic} (${concept.mastery}%)`)
                  : recoveryTopics.map((topic) => `${topic.topic} (${topic.accuracy}%)`)
                ).join(", ")}.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild className="rounded-xl">
                  <Link href="/recovery">Start Recovery</Link>
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard icon={Zap} label="Level" value={loading ? "..." : level} />
          <StatCard icon={Flame} label="XP" value={loading ? "..." : xp} />
          <StatCard icon={ClipboardList} label="Attempted" value={loading ? "..." : total} />
          <StatCard icon={Trophy} label="Accuracy" value={loading ? "..." : `${overallAccuracy}%`} />
          <StatCard icon={Medal} label="Achievements" value={loading ? "..." : `${unlockedAchievements}/${achievements.length}`} />
        </div>

        {!loading && (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InsightCard
              label="Diagnostic Score"
              value={diagnosticScore}
              detail={profile?.completedDiagnostics ? `${profile.completedDiagnostics} completed` : "Take the diagnostic to set a baseline"}
            />
            <InsightCard
              label="Last Diagnostic Date"
              value={lastDiagnosticDate}
              detail={profile?.lastDiagnosticAt ?? "No saved diagnostic yet"}
            />
            <InsightCard
              label="Best Diagnostic Accuracy"
              value={profile?.completedDiagnostics ? `${profile.bestDiagnosticAccuracy}%` : "No diagnostic"}
              detail="Best saved placement score"
            />
            <InsightCard
              label="Diagnostic Improvement"
              value={
                diagnosticImprovement === null
                  ? "After 2 diagnostics"
                  : `${diagnosticImprovement >= 0 ? "+" : ""}${diagnosticImprovement}%`
              }
              detail="Latest score compared with previous"
            />
          </div>
        )}

        {!loading && total > 0 && (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <InsightCard
              label="Database Questions"
              value={`${databaseStats.attempted} attempted`}
              detail={`${databaseStats.accuracy}% accuracy from local generated questions`}
            />
            <InsightCard
              label="AI Questions"
              value={`${aiStats.attempted} attempted`}
              detail={`${aiStats.accuracy}% accuracy from AI-generated questions`}
            />
            <InsightCard
              label="Database Exam Score"
              value={`${databaseExamStats.attempted} marked`}
              detail={`${databaseExamStats.accuracy}% accuracy from database exams`}
            />
            <InsightCard
              label="AI Exam Score"
              value={`${aiExamStats.attempted} marked`}
              detail={`${aiExamStats.accuracy}% accuracy from AI exams`}
            />
            <InsightCard
              label="Hybrid Exam Score"
              value={`${hybridExamStats.attempted} marked`}
              detail={`${hybridExamStats.accuracy}% accuracy from hybrid exams`}
            />
            <InsightCard
              label="Adaptive Exam Score"
              value={`${adaptiveExamStats.attempted} marked`}
              detail={`${adaptiveExamStats.accuracy}% accuracy from adaptive exams`}
            />
            <InsightCard
              label="Weakest Topic"
              value={weakestTopic ? weakestTopic.topic : "Not enough data"}
              detail={weakestTopic ? `${weakestTopic.mastery}% mastery` : "Self-mark more questions"}
            />
            <InsightCard
              label="Strongest Topic"
              value={strongestTopic ? strongestTopic.topic : "Not enough data"}
              detail={strongestTopic ? `${strongestTopic.mastery}% mastery` : "Self-mark more questions"}
            />
            <InsightCard
              label="Most Improved Topic"
              value={mostImprovedTopic ? mostImprovedTopic.topic : "Not enough data"}
              detail={
                mostImprovedTopic
                  ? `${mostImprovedTopic.improvement >= 0 ? "+" : ""}${mostImprovedTopic.improvement}% recent gain`
                  : "Needs more attempts"
              }
            />
            <InsightCard
              label="Most Attempted Topic"
              value={mostAttemptedTopic ? mostAttemptedTopic.topic : "Not enough data"}
              detail={mostAttemptedTopic ? `${mostAttemptedTopic.total} attempts` : "Self-mark more questions"}
            />
          </div>
        )}

        <div className="mb-6 flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => void loadProgress()} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh Progress
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/curriculum">Curriculum Dashboard</Link>
          </Button>
          <Button asChild className="rounded-xl">
            <Link href="/study">Start Study Mode</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/diagnostic">Take Diagnostic</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/question-engine">Question Engine</Link>
          </Button>
          <Button asChild variant="secondary" className="rounded-xl">
            <Link href="/exam-generator">Open Exam Generator</Link>
          </Button>
        </div>

        {loading ? (
          <Card className="rounded-2xl">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              Loading progress...
            </CardContent>
          </Card>
        ) : total === 0 && !error ? (
          <Card className="rounded-2xl">
            <CardContent className="py-12 text-center">
              <BarChart3 className="mx-auto mb-4 h-10 w-10 text-muted-foreground/50" />
              <p className="font-medium text-foreground">No practice progress yet.</p>
              <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
                Start Study Mode or generate a practice set, then self-mark questions to build mastery, XP,
                and achievements.
              </p>
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Button asChild className="rounded-xl">
                  <Link href="/study">Start Study Mode</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-xl">
                  <Link href="/diagnostic">Take Diagnostic</Link>
                </Button>
                <Button asChild variant="outline" className="rounded-xl">
                  <Link href="/practice-generator">Open Practice Generator</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="overview" className="space-y-5">
            <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl sm:grid-cols-5">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
              <TabsTrigger value="topics">Topics</TabsTrigger>
              <TabsTrigger value="achievements">Achievements</TabsTrigger>
              <TabsTrigger value="recent">Recent Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Target className="h-5 w-5" />
                      Daily Goal
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-2xl font-bold">{dailyAttempted} / {dailyGoal} complete</p>
                        <p className="text-sm text-muted-foreground">
                          Questions attempted today from Study Mode, Practice Generator, and Exam Generator.
                        </p>
                      </div>
                      <Select
                        value={String(dailyGoal)}
                        onValueChange={(value) => void handleDailyGoalChange(value)}
                        disabled={updatingGoal || !profile}
                      >
                        <SelectTrigger className="h-11 w-44 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="5">5 questions/day</SelectItem>
                          <SelectItem value="10">10 questions/day</SelectItem>
                          <SelectItem value="20">20 questions/day</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Progress value={dailyProgress} />
                  </CardContent>
                </Card>

                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Zap className="h-5 w-5" />
                      XP Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <MiniStat label="Level" value={level} />
                      <MiniStat label="XP" value={xp} />
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-medium">Next level</span>
                        <span className="text-muted-foreground">{xp % 100}/100 XP</span>
                      </div>
                      <Progress value={xp % 100} />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      XP is awarded locally from saved self-marked actions: +10 for correct answers,
                      +5 for completed study sessions, +25 for completed exams.
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card className="rounded-2xl border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <GraduationCap className="h-5 w-5" />
                    Current Learning Path
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 lg:grid-cols-[1fr_280px]">
                  <div>
                    <h3 className="text-xl font-semibold">{curriculumSummary.curriculum.name}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{curriculumSummary.curriculum.description}</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-4">
                      <MiniStat label="Progress" value={`${curriculumSummary.overallProgress}%`} />
                      <MiniStat label="Units Mastered" value={`${curriculumSummary.unitsMastered}/${curriculumSummary.units.length}`} />
                      <MiniStat label="Needs Work" value={curriculumSummary.unitsNeedingWork} />
                      <MiniStat label="Diagnostic Coverage" value={`${curriculumSummary.diagnosticCoverage}%`} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Select
                      value={curriculumSummary.curriculum.id}
                      onValueChange={(value) => void handleCurriculumChange(value)}
                      disabled={updatingCurriculum || !profile}
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {curricula.map((curriculum) => (
                          <SelectItem key={curriculum.id} value={curriculum.id}>
                            {curriculum.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button asChild variant="outline" className="w-full rounded-xl">
                      <Link href="/curriculum">Open Curriculum Dashboard</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <XCircle className="h-5 w-5" />
                    Most Missed Concepts
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mostMissedConcepts.length > 0 ? (
                    mostMissedConcepts.map((concept) => (
                      <div key={`${concept.topic}-${concept.subtopic}`} className="rounded-xl border border-border bg-card p-4">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-medium text-foreground">{concept.subtopic}</p>
                            <p className="text-xs text-muted-foreground">{concept.topic}</p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant={concept.mastery < 40 ? "destructive" : concept.mastery < 70 ? "secondary" : "default"}>
                              {getMasteryBand(concept.mastery)}
                            </Badge>
                            <Badge variant="outline">{concept.correct}/{concept.attempted} correct</Badge>
                            <Badge variant="outline">{concept.mastery}% mastery</Badge>
                          </div>
                        </div>
                        <Progress value={concept.mastery} />
                      </div>
                    ))
                  ) : (
                    <p className="rounded-xl border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
                      Concept analytics will appear after you self-mark practice questions with subtopic metadata.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="h-5 w-5" />
                    Adaptive Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {recoveryConcepts.length > 0 || recoveryTopics.length > 0 ? (
                    (recoveryConcepts.length > 0 ? recoveryConcepts : recoveryTopics).map((stat) => (
                      <div
                        key={"subtopic" in stat ? `${stat.topic}-${stat.subtopic}` : stat.topic}
                        className="rounded-xl border border-border bg-secondary/20 p-4"
                      >
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-medium">
                              You seem to be struggling with {"subtopic" in stat ? stat.subtopic : stat.topic}.
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Accuracy is {"subtopic" in stat ? stat.mastery : stat.accuracy}% across {stat.attempted} attempts.
                            </p>
                          </div>
                          <Button asChild className="rounded-xl">
                            <Link href="/recovery">Start Recovery</Link>
                          </Button>
                        </div>
                        <Progress value={"subtopic" in stat ? stat.mastery : stat.accuracy} />
                      </div>
                    ))
                  ) : (
                    <p className="rounded-xl border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
                      No weak areas detected yet. ARSHLAB will recommend Recovery Mode when a topic or concept has at least five attempts and accuracy below 60%.
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="curriculum">
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <GraduationCap className="h-5 w-5" />
                    Curriculum Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 md:grid-cols-3">
                    <InsightCard
                      label="Weakest Unit"
                      value={curriculumSummary.weakestUnit?.unit.title ?? "Not enough data"}
                      detail={curriculumSummary.weakestUnit ? `${curriculumSummary.weakestUnit.mastery}% mastery` : "Take a diagnostic or study session"}
                    />
                    <InsightCard
                      label="Strongest Unit"
                      value={curriculumSummary.strongestUnit?.unit.title ?? "Not enough data"}
                      detail={curriculumSummary.strongestUnit ? `${curriculumSummary.strongestUnit.mastery}% mastery` : "Take a diagnostic or study session"}
                    />
                    <InsightCard
                      label="Next Recommended Unit"
                      value={curriculumSummary.recommendedNextUnit?.unit.title ?? "Not enough data"}
                      detail={curriculumSummary.recommendedNextUnit ? curriculumSummary.recommendedNextUnit.status : "Choose a learning path"}
                    />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {curriculumSummary.units.map((unit) => (
                      <div key={unit.unit.id} className="rounded-xl border border-border bg-card p-4">
                        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <p className="font-medium text-foreground">{unit.unit.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {unit.correct} correct, {unit.missed} missed, {unit.attempted} attempted
                            </p>
                          </div>
                          <Badge variant={unit.status === "Needs Intervention" ? "destructive" : unit.status === "Not Started" ? "outline" : unit.status === "Mastered" || unit.status === "Strong" ? "default" : "secondary"}>
                            {unit.status}
                          </Badge>
                        </div>
                        <Progress value={unit.mastery} />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="topics">
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="h-5 w-5" />
                    Topic Mastery
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {topicStats.map((stat) => (
                    <div key={stat.topic} className="rounded-xl border border-border bg-card p-4">
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium text-foreground">{stat.topic}</p>
                          <p className="text-xs text-muted-foreground">
                            {stat.correct} correct, {stat.missed} missed, {stat.total} attempted
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={stat.mastery < 40 ? "destructive" : stat.mastery < 70 ? "secondary" : "default"}>
                            {getMasteryBand(stat.mastery)}
                          </Badge>
                          <Badge variant="outline">{stat.mastery}% mastery</Badge>
                          <Badge variant="outline">{stat.accuracy}% overall</Badge>
                        </div>
                      </div>
                      <Progress value={stat.mastery} />
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="achievements">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {achievements.map((achievement) => {
                  const Icon = achievement.icon
                  return (
                    <Card
                      key={achievement.label}
                      className={cn(
                        "rounded-2xl",
                        achievement.unlocked ? "border-teal-500/30 bg-teal-500/5" : "border-border",
                      )}
                    >
                      <CardContent className="space-y-4 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Icon className="h-5 w-5" />
                          </div>
                          <Badge variant={achievement.unlocked ? "default" : "secondary"}>
                            {achievement.unlocked ? "Unlocked" : "In progress"}
                          </Badge>
                        </div>
                        <div>
                          <h3 className="font-semibold">{achievement.label}</h3>
                          <p className="mt-1 text-sm text-muted-foreground">{achievement.description}</p>
                        </div>
                        <Progress value={achievement.progress} />
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </TabsContent>

            <TabsContent value="recent">
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  {recent.map((entry) => (
                    <div key={entry.id} className="rounded-xl border border-border bg-card p-3">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={entry.correct ? "default" : "destructive"}>
                            {entry.correct ? "Correct" : "Missed"}
                          </Badge>
                          <Badge variant={entry.source === "database" ? "default" : "secondary"}>
                            {entry.source === "database" ? (
                              <Database className="mr-1 h-3 w-3" />
                            ) : (
                              <Sparkles className="mr-1 h-3 w-3" />
                            )}
                            {entry.source === "database" ? "Database" : "AI"}
                          </Badge>
                        </div>
                        <span className="text-xs text-muted-foreground" title={entry.timestamp}>
                          {friendlyTime(entry.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground">{entry.topic}</p>
                      <p className="text-xs text-muted-foreground">
                        {entry.subtopic} - {entry.difficulty} - {entry.questionType}
                      </p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: number | string
}) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function InsightCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-2 break-words text-lg font-semibold text-foreground">{value}</p>
        <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  )
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/20 p-4 text-center">
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
