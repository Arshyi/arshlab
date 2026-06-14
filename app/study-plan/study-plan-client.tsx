"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  AlertCircle,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  GraduationCap,
  Loader2,
  Route,
  Target,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { getPracticeProgress, type PracticeProgressEntry } from "@/lib/supabase/practice-progress"
import { getUserProfile, type UserProfile } from "@/lib/supabase/user-profile"
import { syncAchievementUnlocks } from "@/lib/supabase/achievements"
import {
  generateLearningRecommendations,
  type LearningRecommendation,
  type RecommendationPriority,
} from "@/lib/learning/recommendations"
import { cn } from "@/lib/utils"

function priorityVariant(priority: RecommendationPriority): "default" | "secondary" | "destructive" {
  if (priority === "High") return "destructive"
  if (priority === "Medium") return "default"
  return "secondary"
}

function RecommendationCard({ recommendation }: { recommendation: LearningRecommendation }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="space-y-4 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-semibold text-foreground">{recommendation.title}</h3>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{recommendation.reason}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Badge variant="outline">{recommendation.topic}</Badge>
              <Badge variant="secondary">{recommendation.suggestedMode}</Badge>
              <Badge variant="outline">{recommendation.estimatedTimeMinutes} min</Badge>
            </div>
          </div>
          <Badge variant={priorityVariant(recommendation.priority)}>{recommendation.priority}</Badge>
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
            <span>Mastery signal</span>
            <span>{recommendation.mastery}%</span>
          </div>
          <Progress value={recommendation.mastery} />
        </div>
        <Button asChild className="w-full rounded-xl">
          <Link href={recommendation.href}>{recommendation.action}</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

export function StudyPlanClient() {
  const [entries, setEntries] = useState<PracticeProgressEntry[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadPlan() {
      setLoading(true)
      setError(null)

      const [progressResult, profileResult] = await Promise.all([
        getPracticeProgress(1000),
        getUserProfile(),
      ])

      if (progressResult.ok) setEntries(progressResult.data)
      else {
        setEntries([])
        setError(progressResult.error)
      }

      if (profileResult.ok) setProfile(profileResult.data)
      else setProfile(null)

      setLoading(false)
    }

    void loadPlan()
  }, [])

  const summary = useMemo(
    () => generateLearningRecommendations(entries, profile?.selectedCurriculum, { xp: profile?.xp ?? 0 }),
    [entries, profile?.selectedCurriculum, profile?.xp],
  )

  useEffect(() => {
    if (!profile) return
    void syncAchievementUnlocks(summary.achievements)
  }, [profile, summary.achievements])

  const timeline = summary.mastery.unitMastery.map((unit, index) => ({
    unit,
    step: index + 1,
    active: unit.completed || unit.unit.id === summary.nextRecommendedUnit?.unit.id,
  }))

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Route className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Personal Study Plan</h1>
              <p className="text-muted-foreground">Adaptive recommendations for today, this week, and long-term mastery</p>
            </div>
          </div>
          <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
            ARSHLAB combines diagnostic, practice, recovery, exam, and curriculum progress into a practical study path.
          </p>
        </motion.div>

        {loading ? (
          <Card className="rounded-2xl">
            <CardContent className="flex items-center justify-center gap-3 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading adaptive plan...
            </CardContent>
          </Card>
        ) : (
          <>
            {error && (
              <Alert className="mb-6 rounded-2xl border-amber-500/30 bg-amber-500/10">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Saved progress unavailable</AlertTitle>
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

            {!summary.hasUserData && (
              <Alert className="mb-6 rounded-2xl border-primary/20 bg-primary/5">
                <ClipboardList className="h-4 w-4" />
                <AlertTitle>Starter plan only</AlertTitle>
                <AlertDescription>
                  No saved progress exists yet, so this 7-day plan is a general chemistry starter path.
                  Personal weak-topic targeting will appear after you save practice, diagnostic, study, recovery,
                  or exam attempts.
                </AlertDescription>
              </Alert>
            )}

            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Overall Mastery" value={`${summary.mastery.overallMastery}%`} />
              <MetricCard label="Exam Readiness" value={`${summary.mastery.examReadiness}%`} />
              <MetricCard label="Completed Units" value={`${summary.mastery.curriculumCompletion.completedUnits}/${summary.mastery.unitMastery.length}`} />
              <MetricCard label="Study Streak" value={`${summary.mastery.studyStreak} day${summary.mastery.studyStreak === 1 ? "" : "s"}`} />
            </div>

            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <main className="space-y-6">
                <SectionCard icon={CalendarDays} title="7-Day Adaptive Plan">
                  <div className="grid gap-4 md:grid-cols-2">
                    {summary.sevenDayPlan.map((day) => (
                      <DayPlanCard key={day.day} day={day} />
                    ))}
                  </div>
                </SectionCard>

                <SectionCard icon={Target} title="Today">
                  <div className="grid gap-4 md:grid-cols-2">
                    {summary.recommendations.today.map((recommendation) => (
                      <RecommendationCard key={recommendation.id} recommendation={recommendation} />
                    ))}
                  </div>
                </SectionCard>

                <SectionCard icon={CalendarDays} title="This Week">
                  <div className="grid gap-4 md:grid-cols-2">
                    {summary.recommendations.thisWeek.map((recommendation) => (
                      <RecommendationCard key={recommendation.id} recommendation={recommendation} />
                    ))}
                  </div>
                </SectionCard>

                <SectionCard icon={GraduationCap} title="Long Term">
                  <div className="grid gap-4 md:grid-cols-2">
                    {summary.recommendations.longTerm.map((recommendation) => (
                      <RecommendationCard key={recommendation.id} recommendation={recommendation} />
                    ))}
                  </div>
                </SectionCard>
              </main>

              <aside className="space-y-6">
                <Card className="rounded-2xl border-primary/20 bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-lg">Curriculum Roadmap</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <MiniStat label="Remaining" value={summary.mastery.curriculumCompletion.unitsRemaining} />
                      <MiniStat label="Completion" value={`${summary.mastery.curriculumCompletion.estimatedCompletion}%`} />
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                        <span>Estimated graduation</span>
                        <span>{summary.mastery.curriculumCompletion.estimatedGraduation}</span>
                      </div>
                      <Progress value={summary.mastery.curriculumCompletion.estimatedCompletion} />
                    </div>
                    <div className="space-y-2">
                      {timeline.map(({ unit, step, active }) => (
                        <div
                          key={unit.unit.id}
                          className={cn(
                            "rounded-xl border p-3 text-sm",
                            active ? "border-primary/30 bg-primary/5" : "border-border bg-card",
                          )}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{step}. {unit.unit.title}</span>
                            {unit.completed ? (
                              <CheckCircle2 className="h-4 w-4 text-teal-600" />
                            ) : (
                              <Badge variant="outline">{unit.mastery}%</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-lg">Adaptive Signals</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <SignalRow label="Strongest topic" value={summary.strongestTopic?.topic ?? "Not enough data"} />
                    <SignalRow label="Weakest topic" value={summary.weakestTopic?.topic ?? "Not enough data"} />
                    <SignalRow label="Weakest unit" value={summary.weakestUnit?.unit.title ?? "Not enough data"} />
                    <SignalRow label="Next topic" value={summary.nextRecommendedTopic} />
                    <SignalRow label="Recovery target" value={summary.suggestedRecoveryTopic} />
                    <SignalRow label="Exam focus" value={summary.suggestedExamFocus} />
                  </CardContent>
                </Card>

                <Card className="rounded-2xl border-dashed">
                  <CardContent className="space-y-3 p-5 text-sm text-muted-foreground">
                    <p>
                      Recommendations are generated from saved self-marked progress. They are study guidance,
                      not official curriculum completion or exam prediction.
                    </p>
                    <p>
                      Mastery uses diagnostic 25%, practice 35%, exam 30%, and recovery 10%.
                      If a source has no attempts, ARSHLAB leaves it out instead of inventing a score.
                    </p>
                  </CardContent>
                </Card>
              </aside>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function SectionCard({
  icon: Icon,
  title,
  children,
}: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
}) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function DayPlanCard({
  day,
}: {
  day: {
    day: number
    label: string
    topics: string[]
    suggestedMode: string
    estimatedTimeMinutes: number
    reason: string
    href: string
    priority: RecommendationPriority
    fallback: boolean
  }
}) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{day.label}</p>
            <h3 className="mt-1 font-semibold text-foreground">{day.topics.join(" + ")}</h3>
          </div>
          <Badge variant={day.fallback ? "secondary" : priorityVariant(day.priority)}>
            {day.fallback ? "Starter" : day.priority}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-2">
          {day.topics.map((topic) => (
            <Badge key={topic} variant="outline">{topic}</Badge>
          ))}
          <Badge variant="secondary">{day.suggestedMode}</Badge>
          <Badge variant="outline">{day.estimatedTimeMinutes} min</Badge>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{day.reason}</p>
        <Button asChild variant="outline" className="w-full rounded-xl">
          <Link href={day.href}>Open {day.suggestedMode}</Link>
        </Button>
      </CardContent>
    </Card>
  )
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-5">
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="mt-1 text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-card/70 p-3 text-center">
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function SignalRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-secondary/20 px-3 py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="max-w-40 text-right font-medium text-foreground">{value}</span>
    </div>
  )
}
