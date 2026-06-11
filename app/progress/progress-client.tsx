"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  Flame,
  Medal,
  RefreshCw,
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
  getPracticeProgress,
  type PracticeProgressEntry,
} from "@/lib/supabase/practice-progress"
import {
  getLevelFromXp,
  getUserProfile,
  updateDailyGoal,
  type UserProfile,
} from "@/lib/supabase/user-profile"

interface TopicStats {
  topic: string
  total: number
  correct: number
  missed: number
  accuracy: number
  mastery: number
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

function getAchievements(entries: PracticeProgressEntry[], profile: UserProfile | null): Achievement[] {
  const total = entries.length
  const correct = entries.filter((entry) => entry.correct).length
  const completedExams = profile?.completedExams ?? 0

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
      label: "100 Questions Attempted",
      description: "Reach one hundred tracked attempts.",
      unlocked: total >= 100,
      progress: Math.min(100, Math.round((total / 100) * 100)),
      icon: Target,
    },
  ]
}

export function ProgressClient() {
  const [entries, setEntries] = useState<PracticeProgressEntry[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [updatingGoal, setUpdatingGoal] = useState(false)

  const loadProgress = useCallback(async () => {
    setLoading(true)
    setError(null)
    setMessage(null)

    const [progressResult, profileResult] = await Promise.all([
      getPracticeProgress(500),
      getUserProfile(),
    ])

    if (!progressResult.ok) {
      setEntries([])
      setError(progressResult.error)
    } else {
      setEntries(progressResult.data)
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
  const weakTopics = topicStats.filter((stat) => stat.total >= 3 && stat.mastery < 60).slice(0, 3)
  const recent = entries.slice(0, 16)
  const achievements = useMemo(() => getAchievements(entries, profile), [entries, profile])
  const unlockedAchievements = achievements.filter((achievement) => achievement.unlocked).length
  const dailyGoal = profile?.dailyGoal ?? 10
  const dailyAttempted = useMemo(() => getDailyAttempted(entries), [entries])
  const dailyProgress = Math.min(100, Math.round((dailyAttempted / dailyGoal) * 100))
  const xp = profile?.xp ?? 0
  const level = getLevelFromXp(xp)

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
              <p className="text-muted-foreground">Study dashboard, topic mastery, XP, and achievements</p>
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

        {weakTopics.length > 0 && (
          <Alert className="mb-6 rounded-2xl border-orange-500/30 bg-orange-500/10">
            <Target className="h-4 w-4" />
            <AlertTitle>Recommended Practice</AlertTitle>
            <AlertDescription className="space-y-3">
              <p>
                You are struggling with: {weakTopics.map((topic) => topic.topic).join(", ")}.
              </p>
              <div className="flex flex-wrap gap-2">
                {weakTopics.map((topic) => (
                  <Button key={topic.topic} asChild className="rounded-xl">
                    <Link href={`/study?topic=${encodeURIComponent(topic.topic)}`}>
                      Generate targeted recovery set
                    </Link>
                  </Button>
                ))}
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

        <div className="mb-6 flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => void loadProgress()} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh Progress
          </Button>
          <Button asChild className="rounded-xl">
            <Link href="/study">Start Study Mode</Link>
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
                  <Link href="/practice-generator">Open Practice Generator</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="overview" className="space-y-5">
            <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl sm:grid-cols-4">
              <TabsTrigger value="overview">Overview</TabsTrigger>
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

              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="h-5 w-5" />
                    Adaptive Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {weakTopics.length > 0 ? (
                    weakTopics.map((stat) => (
                      <div key={stat.topic} className="rounded-xl border border-border bg-secondary/20 p-4">
                        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-medium">You seem to be struggling with {stat.topic}.</p>
                            <p className="text-sm text-muted-foreground">
                              Mastery is {stat.mastery}% across recent weighted attempts.
                            </p>
                          </div>
                          <Button asChild className="rounded-xl">
                            <Link href={`/study?topic=${encodeURIComponent(stat.topic)}`}>
                              Generate targeted recovery set
                            </Link>
                          </Button>
                        </div>
                        <Progress value={stat.mastery} />
                      </div>
                    ))
                  ) : (
                    <p className="rounded-xl border border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
                      No weak topics detected yet. ARSHLAB will recommend recovery practice when mastery drops below 60%.
                    </p>
                  )}
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
                          <Badge variant={stat.mastery >= 70 ? "default" : stat.mastery < 60 ? "destructive" : "secondary"}>
                            {stat.mastery}% mastery
                          </Badge>
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
                        <Badge variant={entry.correct ? "default" : "destructive"}>
                          {entry.correct ? "Correct" : "Missed"}
                        </Badge>
                        <span className="text-xs text-muted-foreground" title={entry.timestamp}>
                          {friendlyTime(entry.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground">{entry.topic}</p>
                      <p className="text-xs text-muted-foreground">{entry.difficulty}</p>
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

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/20 p-4 text-center">
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
