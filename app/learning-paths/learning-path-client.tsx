"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useReducedMotion } from "framer-motion"
import {
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Clock,
  FlaskConical,
  Gauge,
  GraduationCap,
  Layers,
  Network,
  RotateCcw,
  ScanSearch,
  Sparkles,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import {
  calculateLearningMastery,
  generateLearningPathRecommendations,
  getLearningPath,
  getLearningPathMetrics,
  getLearningTimeline,
  getPrerequisiteChain,
  learningPathPlacementHref,
  listLearningPaths,
  normalizeLearningPathProgress,
  readLearningPathProgress,
  recordQuizScore,
  recordLessonView,
  sequenceLearningPath,
  setLessonStatus,
  summarizeLearningPathProgress,
  type LearningLesson,
  type LearningPathProgressState,
} from "@/lib/learning-paths"
import { cn } from "@/lib/utils"

interface LearningPathClientProps {
  initialPath?: string
  initialLesson?: string
  initialFocus?: string
}

export function LearningPathClient({ initialPath, initialLesson, initialFocus }: LearningPathClientProps) {
  const paths = listLearningPaths()
  const metrics = getLearningPathMetrics()
  const reduceMotion = useReducedMotion()
  const placementHref = learningPathPlacementHref(initialFocus)
  const placementParams = new URLSearchParams(placementHref.split("?")[1] ?? "")
  const resolvedPath = getLearningPath(initialPath ?? placementParams.get("path"))
  const [selectedPathId, setSelectedPathId] = useState(resolvedPath.id)
  const [selectedLessonId, setSelectedLessonId] = useState(initialLesson ?? placementParams.get("lesson") ?? resolvedPath.lessons[0]?.id)
  const [progress, setProgress] = useState<LearningPathProgressState>(() => normalizeLearningPathProgress({}))

  useEffect(() => {
    const stored = readLearningPathProgress()
    setProgress(stored)
    if (selectedLessonId) setProgress(recordLessonView(selectedLessonId, stored))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const sequence = useMemo(() => sequenceLearningPath(selectedPathId, progress), [progress, selectedPathId])
  const selectedLesson =
    sequence.path.lessons.find((lesson) => lesson.id === selectedLessonId) ??
    sequence.currentLesson ??
    sequence.path.lessons[0]
  const mastery = useMemo(() => calculateLearningMastery(progress), [progress])
  const dashboard = useMemo(() => summarizeLearningPathProgress(progress), [progress])
  const recommendations = useMemo(
    () => generateLearningPathRecommendations(progress, selectedLesson?.id),
    [progress, selectedLesson?.id],
  )
  const timeline = useMemo(() => getLearningTimeline(progress), [progress])
  const prerequisiteChain = selectedLesson ? getPrerequisiteChain(selectedLesson.id) : []

  function choosePath(pathId: string) {
    const path = getLearningPath(pathId)
    const nextSequence = sequenceLearningPath(path.id, progress)
    setSelectedPathId(path.id)
    setSelectedLessonId(nextSequence.currentLesson.id)
  }

  function chooseLesson(lesson: LearningLesson) {
    setSelectedLessonId(lesson.id)
    setProgress(recordLessonView(lesson.id, progress))
  }

  function updateLesson(status: "in-progress" | "completed") {
    if (!selectedLesson) return
    setProgress(setLessonStatus(selectedLesson.id, status, progress))
  }

  function scoreQuiz(score: number) {
    if (!selectedLesson) return
    setProgress(recordQuizScore(selectedLesson.id, score, progress))
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge className="rounded-full">ARSHLAB v13.0.0</Badge>
              <Badge variant="outline" className="rounded-full">Local progress</Badge>
              <Badge variant="outline" className="rounded-full">Database mode = no AI usage</Badge>
              {reduceMotion && <Badge variant="outline" className="rounded-full">Reduced motion</Badge>}
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Learning Paths</h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
              Follow structured chemistry tracks that connect the scanner, molecular explorer, Knowledge Graph,
              virtual labs, mechanism simulator, spectroscopy tools, and quizzes into one guided learning system.
            </p>
          </div>
          <Card className="rounded-2xl border-teal-500/20 bg-teal-500/5">
            <CardContent className="grid grid-cols-2 gap-3 p-5">
              <Metric label="Paths" value={metrics.paths} />
              <Metric label="Lessons" value={metrics.lessons} />
              <Metric label="Tool Links" value={metrics.links} />
              <Metric label="Completion" value={`${dashboard.overallCompletion}%`} />
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {paths.map((path) => {
            const track = dashboard.perTrack.find((item) => item.pathId === path.id)
            const selected = path.id === selectedPathId
            return (
              <button
                key={path.id}
                type="button"
                onClick={() => choosePath(path.id)}
                className={cn(
                  "rounded-2xl border p-4 text-left transition-colors",
                  selected ? "border-primary bg-primary/10" : "border-border bg-card hover:bg-secondary/40",
                )}
                aria-label={`Open ${path.title} learning path`}
              >
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{path.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{path.subtitle}</p>
                  </div>
                  <Badge variant={selected ? "default" : "outline"}>{track?.completion ?? 0}%</Badge>
                </div>
                <Progress value={track?.completion ?? 0} />
              </button>
            )
          })}
        </section>

        <section className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)_340px]">
          <Card className="h-fit rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Layers className="h-5 w-5" />
                {sequence.path.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {sequence.lessons.map((item) => (
                <button
                  key={item.lesson.id}
                  type="button"
                  onClick={() => chooseLesson(item.lesson)}
                  disabled={!item.unlocked}
                  className={cn(
                    "w-full rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60",
                    selectedLesson?.id === item.lesson.id ? "border-primary bg-primary/10" : "border-border bg-secondary/20 hover:bg-secondary",
                  )}
                  aria-label={`Open lesson ${item.lesson.title}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold">{item.lesson.order}. {item.lesson.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{item.lesson.estimatedMinutes} min - {item.lesson.difficulty}</p>
                    </div>
                    <StatusBadge status={item.status} unlocked={item.unlocked} />
                  </div>
                  {!item.unlocked && (
                    <p className="mt-2 text-xs text-muted-foreground">Locked until: {item.missingPrerequisites.join(", ")}</p>
                  )}
                </button>
              ))}
            </CardContent>
          </Card>

          {selectedLesson && (
            <div className="space-y-6">
              <Card className="rounded-2xl border-primary/20 bg-primary/5">
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle className="text-2xl">{selectedLesson.title}</CardTitle>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{selectedLesson.summary}</p>
                    </div>
                    <Badge variant="outline" className="w-fit rounded-full">
                      {selectedLesson.moduleType}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <Info label="Difficulty" value={selectedLesson.difficulty} />
                    <Info label="Time" value={`${selectedLesson.estimatedMinutes} min`} />
                    <Info label="Review after" value={`${selectedLesson.reviewAfterDays} days`} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Learning outcomes</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selectedLesson.outcomes.map((outcome) => (
                        <Badge key={outcome} variant="secondary" className="rounded-full">{outcome}</Badge>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild className="rounded-xl">
                      <Link href={selectedLesson.href}>
                        Open lesson tool
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                    <Button type="button" variant="outline" className="rounded-xl" onClick={() => updateLesson("in-progress")}>
                      Mark in progress
                    </Button>
                    <Button type="button" variant="outline" className="rounded-xl" onClick={() => updateLesson("completed")}>
                      Mark completed
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Connected ARSHLAB Modules</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2 sm:grid-cols-2">
                  {selectedLesson.links.map((item) => (
                    <Button key={`${selectedLesson.id}-${item.href}`} asChild variant="outline" className="h-auto justify-between rounded-xl px-3 py-3 text-left">
                      <Link href={item.href}>
                        <span>
                          <span className="block font-medium">{item.label}</span>
                          <span className="block text-xs text-muted-foreground">{item.kind}</span>
                        </span>
                        <ArrowRight className="h-4 w-4 shrink-0" />
                      </Link>
                    </Button>
                  ))}
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Prerequisite Graph</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {prerequisiteChain.length > 0 ? prerequisiteChain.map((item, index) => (
                    <div key={item.lessonId} className="flex items-center gap-3 rounded-xl border border-border bg-secondary/20 p-3">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{index + 1}</span>
                      <span className="font-medium">{item.title}</span>
                    </div>
                  )) : (
                    <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">This lesson starts a prerequisite chain.</p>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <aside className="space-y-6">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Gauge className="h-5 w-5" />
                  Curriculum Dashboard
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Mini label="Overall completion" value={`${dashboard.overallCompletion}%`} />
                <Mini label="Lessons completed" value={`${dashboard.completedLessons}/${dashboard.totalLessons}`} />
                <Mini label="Quiz average" value={`${dashboard.quizAverage}%`} />
                <Mini label="Mastery" value={mastery.overallLevel} />
              </CardContent>
            </Card>

            <RecommendationCard title="Suggested Next Lesson" recommendation={recommendations.nextLesson} icon={Sparkles} />
            {recommendations.relatedVirtualLab && <RecommendationCard title="Related Virtual Lab" recommendation={recommendations.relatedVirtualLab} icon={FlaskConical} />}
            {recommendations.relatedMechanism && <RecommendationCard title="Related Mechanism" recommendation={recommendations.relatedMechanism} icon={BookOpenCheck} />}
            {recommendations.relatedScannerExercise && <RecommendationCard title="Related Scanner Exercise" recommendation={recommendations.relatedScannerExercise} icon={ScanSearch} />}
            {recommendations.relatedKnowledgeGraph && <RecommendationCard title="Related Knowledge Graph" recommendation={recommendations.relatedKnowledgeGraph} icon={Network} />}

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <RotateCcw className="h-5 w-5" />
                  Review Mode
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {recommendations.reviewRecommendations.length ? recommendations.reviewRecommendations.map((item) => (
                  <Button key={item.id} asChild variant="outline" className="h-auto w-full justify-between rounded-xl px-3 py-3 text-left">
                    <Link href={item.href}>
                      <span>{item.title}</span>
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                )) : (
                  <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                    Nothing is stale yet. Completed lessons will appear here when they are due for review.
                  </p>
                )}
              </CardContent>
            </Card>
          </aside>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <GraduationCap className="h-5 w-5" />
                Mastery Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {mastery.trackMastery.map((track) => (
                <div key={track.pathId} className="rounded-xl border border-border bg-secondary/20 p-4">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{track.title}</p>
                      <p className="text-xs text-muted-foreground">{track.completedLessons}/{track.totalLessons} complete - quiz {track.quizScore}%</p>
                    </div>
                    <Badge>{track.level}</Badge>
                  </div>
                  <Progress value={track.masteryScore} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Clock className="h-5 w-5" />
                Learning Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {timeline.length ? timeline.slice(0, 8).map((item) => (
                <Button key={`${item.lesson.id}-${item.completedAt}`} asChild variant="outline" className="h-auto w-full justify-start rounded-xl px-3 py-3 text-left">
                  <Link href={learningPathLink(item.lesson)}>
                    <CheckCircle2 className="h-4 w-4" />
                    <span>
                      <span className="block font-medium">{item.lesson.title}</span>
                      <span className="block text-xs text-muted-foreground">{new Date(item.completedAt).toLocaleDateString()}</span>
                    </span>
                  </Link>
                </Button>
              )) : (
                <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  Completed lessons will build a timeline here.
                </p>
              )}
            </CardContent>
          </Card>
        </section>

        {selectedLesson && (
          <Card className="rounded-2xl border-teal-500/20 bg-teal-500/5">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold">Quick self-check</p>
                <p className="text-sm text-muted-foreground">Record a local quiz score to update deterministic mastery. This does not use accounts or AI.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {[60, 80, 100].map((score) => (
                  <Button key={score} type="button" variant="outline" className="rounded-xl" onClick={() => scoreQuiz(score)}>
                    Score {score}%
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}

function learningPathLink(lesson: LearningLesson) {
  return `/learning-paths?path=${lesson.pathId}&lesson=${lesson.id}`
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-background/80 p-3">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/80 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  )
}

function Mini({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/20 px-3 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  )
}

function StatusBadge({ status, unlocked }: { status: string; unlocked: boolean }) {
  if (!unlocked) return <Badge variant="secondary">Locked</Badge>
  if (status === "completed") return <Badge>Completed</Badge>
  if (status === "in-progress") return <Badge variant="secondary">In Progress</Badge>
  return <Badge variant="outline">Not Started</Badge>
}

function RecommendationCard({
  title,
  recommendation,
  icon: Icon,
}: {
  title: string
  recommendation: { title: string; reason: string; href: string }
  icon: React.ElementType
}) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="space-y-3 p-4">
        <p className="flex items-center gap-2 font-semibold">
          <Icon className="h-4 w-4" />
          {title}
        </p>
        <div>
          <p className="text-sm font-medium">{recommendation.title}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{recommendation.reason}</p>
        </div>
        <Button asChild variant="outline" className="w-full justify-between rounded-xl">
          <Link href={recommendation.href}>
            Open
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
