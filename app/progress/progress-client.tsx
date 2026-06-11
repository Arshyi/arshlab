"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  AlertCircle,
  BarChart3,
  CheckCircle2,
  ClipboardList,
  RefreshCw,
  Target,
  Trophy,
  XCircle,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  getPracticeProgress,
  type PracticeProgressEntry,
} from "@/lib/supabase/practice-progress"

interface TopicStats {
  topic: string
  total: number
  correct: number
  missed: number
  accuracy: number
}

function accuracy(correct: number, total: number): number {
  return total > 0 ? Math.round((correct / total) * 100) : 0
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

function getTopicStats(entries: PracticeProgressEntry[]): TopicStats[] {
  const groups = new Map<string, { total: number; correct: number }>()

  for (const entry of entries) {
    const current = groups.get(entry.topic) ?? { total: 0, correct: 0 }
    current.total += 1
    if (entry.correct) current.correct += 1
    groups.set(entry.topic, current)
  }

  return Array.from(groups.entries())
    .map(([topic, stats]) => ({
      topic,
      total: stats.total,
      correct: stats.correct,
      missed: stats.total - stats.correct,
      accuracy: accuracy(stats.correct, stats.total),
    }))
    .sort((a, b) => b.total - a.total || a.topic.localeCompare(b.topic))
}

function getWeakTopic(entries: PracticeProgressEntry[]): string | null {
  const recent = entries.slice(0, 20)
  const misses = new Map<string, number>()

  for (const entry of recent) {
    if (!entry.correct) {
      misses.set(entry.topic, (misses.get(entry.topic) ?? 0) + 1)
    }
  }

  const weak = Array.from(misses.entries())
    .filter(([, count]) => count >= 3)
    .sort((a, b) => b[1] - a[1])[0]

  return weak?.[0] ?? null
}

export function ProgressClient() {
  const [entries, setEntries] = useState<PracticeProgressEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadProgress = useCallback(async () => {
    setLoading(true)
    setError(null)

    const result = await getPracticeProgress(200)

    if (!result.ok) {
      setEntries([])
      setError(result.error)
      setLoading(false)
      return
    }

    setEntries(result.data)
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadProgress()
  }, [loadProgress])

  const total = entries.length
  const correct = entries.filter((entry) => entry.correct).length
  const missed = total - correct
  const overallAccuracy = accuracy(correct, total)
  const topicStats = useMemo(() => getTopicStats(entries), [entries])
  const weakTopic = useMemo(() => getWeakTopic(entries), [entries])
  const recent = entries.slice(0, 12)

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">My Progress</h1>
              <p className="text-muted-foreground">Practice accuracy and recent self-marked attempts</p>
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

        {weakTopic && (
          <Alert className="mb-6 rounded-2xl border-orange-500/30 bg-orange-500/10">
            <Target className="h-4 w-4" />
            <AlertTitle>You seem to be struggling with {weakTopic}.</AlertTitle>
            <AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <span>Generate a targeted practice set?</span>
              <Button asChild className="w-fit rounded-xl">
                <Link href={`/practice-generator?topic=${encodeURIComponent(weakTopic)}`}>
                  Practice {weakTopic}
                </Link>
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard icon={ClipboardList} label="Attempted" value={loading ? "..." : total} />
          <StatCard icon={Trophy} label="Overall Accuracy" value={loading ? "..." : `${overallAccuracy}%`} />
          <StatCard icon={CheckCircle2} label="Correct" value={loading ? "..." : correct} />
          <StatCard icon={XCircle} label="Missed" value={loading ? "..." : missed} />
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <Button variant="outline" className="rounded-xl" onClick={() => void loadProgress()} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            Refresh Progress
          </Button>
          <Button asChild className="rounded-xl">
            <Link href="/practice-generator">Generate Practice</Link>
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
              <p className="mt-2 text-sm text-muted-foreground">
                Generate a practice set, reveal answers, and self-mark questions to start tracking progress.
              </p>
              <Button asChild className="mt-5 rounded-xl">
                <Link href="/practice-generator">Open Practice Generator</Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5" />
                  Accuracy By Topic
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {topicStats.map((stat) => (
                  <div key={stat.topic} className="rounded-xl border border-border bg-secondary/20 p-4">
                    <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium text-foreground">{stat.topic}</p>
                      <Badge variant={stat.accuracy >= 70 ? "default" : "secondary"}>
                        {stat.accuracy}% accuracy
                      </Badge>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-primary" style={{ width: `${stat.accuracy}%` }} />
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {stat.correct} correct, {stat.missed} missed, {stat.total} attempted
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
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
          </div>
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
