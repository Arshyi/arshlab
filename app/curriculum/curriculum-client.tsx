"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Calculator,
  CheckCircle2,
  ClipboardCheck,
  Database,
  GraduationCap,
  Map,
  RefreshCw,
  Route,
  Target,
  Trophy,
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
import {
  calculateCurriculumProgress,
  listCurricula,
  type CurriculumId,
  type CurriculumUnitProgress,
} from "@/lib/curriculum/curriculum-registry"
import { getCurriculumRoadmap, listCurriculumRoadmaps } from "@/lib/curriculum/roadmap"
import {
  getCurriculumRoadmapProgressSummary,
  markCurriculumTopicViewed,
  readCurriculumRoadmapProgress,
  setCurriculumTopicCompleted,
  type CurriculumRoadmapProgressState,
} from "@/lib/curriculum/roadmap-progress"
import { deepLinkSlug } from "@/lib/deep-links"
import { calculateStudySnapshot, getStudyTopicForCurriculum } from "@/lib/study-engine/study-engine"
import { readStudyProgress, recordStudyEvent } from "@/lib/study-engine/study-progress"
import { getPracticeProgress, type PracticeProgressEntry } from "@/lib/supabase/practice-progress"
import {
  getLevelFromXp,
  getUserProfile,
  updateSelectedCurriculum,
  type UserProfile,
} from "@/lib/supabase/user-profile"
import { cn } from "@/lib/utils"

const curricula = listCurricula()
const roadmaps = listCurriculumRoadmaps()

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  if (status === "Mastered" || status === "Strong") return "default"
  if (status === "Needs Intervention") return "destructive"
  if (status === "Not Started") return "outline"
  return "secondary"
}

function unitLink(unit: CurriculumUnitProgress | null, target: "study" | "practice" | "exam" | "diagnostic"): string {
  if (!unit) {
    if (target === "practice") return "/practice-generator"
    if (target === "exam") return "/exam-generator?source=database&mode=adaptive"
    if (target === "diagnostic") return "/diagnostic"
    return "/study"
  }
  const topic = unit.unit.topics[0] ?? ""
  const subtopic = unit.unit.subtopics[0] ?? ""
  const params = new URLSearchParams()
  params.set("unit", unit.unit.id)
  if (topic) params.set("topic", topic)
  if (subtopic) params.set("subtopic", subtopic)
  if (target === "practice") return `/practice-generator?${params.toString()}`
  if (target === "exam") {
    params.set("source", "database")
    params.set("mode", "adaptive")
    return `/exam-generator?${params.toString()}`
  }
  if (target === "diagnostic") return `/diagnostic?${params.toString()}`
  return `/study?${params.toString()}`
}

function getSpectroscopyAccuracy(entries: PracticeProgressEntry[]): { attempted: number; accuracy: number } {
  const spectroscopyEntries = entries.filter((entry) => {
    const value = `${entry.topic} ${entry.subtopic}`.toLowerCase()
    return value.includes("spectroscopy") || value.includes("carbonyl") || value.includes("stretch") || value.includes("aromatic peak")
  })
  const correct = spectroscopyEntries.filter((entry) => entry.correct).length
  return {
    attempted: spectroscopyEntries.length,
    accuracy: spectroscopyEntries.length ? Math.round((correct / spectroscopyEntries.length) * 100) : 0,
  }
}

export function CurriculumClient() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [entries, setEntries] = useState<PracticeProgressEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedRoadmapId, setSelectedRoadmapId] = useState(roadmaps[0]?.id ?? "general-chemistry")
  const [selectedTopicId, setSelectedTopicId] = useState<string | null>(roadmaps[0]?.topics[0]?.id ?? null)
  const [roadmapProgress, setRoadmapProgress] = useState<CurriculumRoadmapProgressState>({ topics: {} })
  const [studyProgress, setStudyProgress] = useState(() => readStudyProgress())

  const loadCurriculum = useCallback(async () => {
    setLoading(true)
    setError(null)
    setMessage(null)

    const [profileResult, progressResult] = await Promise.all([
      getUserProfile(),
      getPracticeProgress(800),
    ])

    if (profileResult.ok) {
      setProfile(profileResult.data)
    } else {
      setProfile(null)
      setError(profileResult.error)
    }

    if (progressResult.ok) setEntries(progressResult.data)
    else setEntries([])

    setLoading(false)
  }, [])

  useEffect(() => {
    void loadCurriculum()
  }, [loadCurriculum])

  useEffect(() => {
    const storedProgress = readCurriculumRoadmapProgress()
    const params = new URLSearchParams(window.location.search)
    const requestedTopic = params.get("topic")

    if (!requestedTopic) {
      setRoadmapProgress(storedProgress)
      return
    }

    const requestedSlug = deepLinkSlug(requestedTopic)
    const match = roadmaps
      .flatMap((roadmap) => roadmap.topics.map((topic) => ({ roadmap, topic })))
      .find(
        ({ topic }) =>
          topic.id === requestedTopic ||
          deepLinkSlug(topic.id) === requestedSlug ||
          deepLinkSlug(topic.title) === requestedSlug,
      )

    if (match) {
      setSelectedRoadmapId(match.roadmap.id)
      setSelectedTopicId(match.topic.id)
      setRoadmapProgress(markCurriculumTopicViewed(match.topic.id, storedProgress))
      return
    }

    setRoadmapProgress(storedProgress)
  }, [])

  const summary = useMemo(
    () => calculateCurriculumProgress(entries, profile?.selectedCurriculum),
    [entries, profile?.selectedCurriculum],
  )
  const selectedRoadmap = useMemo(() => getCurriculumRoadmap(selectedRoadmapId), [selectedRoadmapId])
  const roadmapSummary = useMemo(
    () => getCurriculumRoadmapProgressSummary(selectedRoadmap, roadmapProgress),
    [roadmapProgress, selectedRoadmap],
  )
  const selectedRoadmapTopic = useMemo(() => {
    return (
      selectedRoadmap.topics.find((topic) => topic.id === selectedTopicId) ??
      roadmapSummary.currentRecommendedTopic ??
      selectedRoadmap.topics[0] ??
      null
    )
  }, [roadmapSummary.currentRecommendedTopic, selectedRoadmap, selectedTopicId])
  const level = getLevelFromXp(profile?.xp ?? 0)
  const spectroscopyAccuracy = useMemo(() => getSpectroscopyAccuracy(entries), [entries])
  const studySnapshot = useMemo(
    () => calculateStudySnapshot({ events: studyProgress.events, practiceEntries: entries, curriculumProgress: roadmapProgress }),
    [entries, roadmapProgress, studyProgress.events],
  )

  useEffect(() => {
    document.getElementById("curriculum-topic")?.scrollIntoView({ block: "start" })
  }, [selectedRoadmapTopic?.id])

  function handleRoadmapChange(value: string) {
    const roadmap = getCurriculumRoadmap(value)
    const nextSummary = getCurriculumRoadmapProgressSummary(roadmap, roadmapProgress)
    setSelectedRoadmapId(roadmap.id)
    setSelectedTopicId(nextSummary.currentRecommendedTopic?.id ?? roadmap.topics[0]?.id ?? null)
  }

  function handleTopicSelect(topicId: string) {
    setSelectedTopicId(topicId)
    setRoadmapProgress(markCurriculumTopicViewed(topicId, roadmapProgress))
  }

  function handleTopicCompleted(topicId: string, completed: boolean) {
    const nextProgress = setCurriculumTopicCompleted(topicId, completed, roadmapProgress)
    setRoadmapProgress(nextProgress)

    if (completed) {
      const completedTopic = selectedRoadmap.topics.find((topic) => topic.id === topicId)
      const studyTopic = getStudyTopicForCurriculum(completedTopic?.title)
      setStudyProgress(
        recordStudyEvent({
          type: "curriculum_completed",
          topicId: studyTopic?.id,
          topic: completedTopic?.title,
          entityId: topicId,
        }),
      )
    }
  }

  async function handleCurriculumChange(value: string) {
    setUpdating(true)
    setMessage(null)
    const result = await updateSelectedCurriculum(value as CurriculumId)
    setUpdating(false)

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
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Curriculum Engine</h1>
                <p className="text-muted-foreground">Roadmaps, learning path coverage, unit mastery, and next steps</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">ARSHLAB v5.8.0</Badge>
              <Badge variant="outline">Database mode = no AI usage</Badge>
            </div>
          </div>
          <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
            Follow deterministic General Chemistry and Organic Chemistry roadmaps, then connect each topic to
            ARSHLAB&apos;s formula sheet, solver, practice, exams, molecular visualizer, reaction explorer, mechanism trainer, and reaction database.
          </p>
        </motion.div>

        {error && (
          <Alert className="mb-6 rounded-2xl border-amber-500/30 bg-amber-500/10">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Curriculum dashboard unavailable</AlertTitle>
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
            <AlertTitle>Curriculum update</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        <Card className="mb-6 rounded-2xl border-teal-500/20 bg-teal-500/5">
          <CardContent className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1fr)_320px]">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge>v5.8.0 Curriculum Roadmaps</Badge>
                <Badge variant="secondary">{selectedRoadmap.topics.length} topics</Badge>
              </div>
              <h2 className="text-2xl font-bold">{selectedRoadmap.title}</h2>
              <p className="mt-1 text-sm font-medium text-muted-foreground">{selectedRoadmap.subtitle}</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{selectedRoadmap.description}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Roadmap</label>
              <Select value={selectedRoadmap.id} onValueChange={handleRoadmapChange}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {roadmaps.map((roadmap) => (
                    <SelectItem key={roadmap.id} value={roadmap.id}>
                      {roadmap.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-3 gap-2 pt-2">
                <MiniStat label="Completed" value={`${roadmapSummary.completedTopics}/${roadmapSummary.totalTopics}`} />
                <MiniStat label="Viewed" value={roadmapSummary.viewedTopics} />
                <MiniStat label="Progress" value={`${roadmapSummary.completionPercentage}%`} />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mb-6 grid gap-6 lg:grid-cols-[minmax(280px,380px)_minmax(0,1fr)]">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Map className="h-5 w-5" />
                Roadmap Topics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {selectedRoadmap.topics.map((topic, index) => {
                const progress = roadmapProgress.topics[topic.id]
                const selected = selectedRoadmapTopic?.id === topic.id
                const studyTopic = getStudyTopicForCurriculum(topic.title)
                const studyStatus = studySnapshot.topics.find((item) => item.topic.id === studyTopic?.id)?.status
                const roadmapStatus = progress?.completed
                  ? "Completed"
                  : studyStatus === "Locked"
                    ? "Locked"
                    : selected || roadmapSummary.currentRecommendedTopic?.id === topic.id || studyStatus === "Recommended"
                      ? "Recommended"
                      : progress?.viewed
                        ? "In Progress"
                        : "In Progress"
                return (
                  <button
                    key={topic.id}
                    type="button"
                    onClick={() => handleTopicSelect(topic.id)}
                    className={cn(
                      "w-full rounded-xl border p-4 text-left transition-all",
                      selected
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border bg-card hover:border-primary/40 hover:bg-secondary/40",
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                          progress?.completed
                            ? "border-teal-500 bg-teal-500 text-white"
                            : progress?.viewed
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-border bg-secondary text-muted-foreground",
                        )}
                      >
                        {progress?.completed ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground">{topic.title}</p>
                        <div className="mt-2 flex flex-wrap gap-1">
                          <Badge variant="outline" className="rounded-full">{topic.difficulty}</Badge>
                          <Badge variant={roadmapStatus === "Completed" ? "default" : roadmapStatus === "Locked" ? "destructive" : "secondary"} className="rounded-full">
                            {roadmapStatus}
                          </Badge>
                          {progress?.viewed && <Badge variant="secondary" className="rounded-full">Viewed</Badge>}
                          {progress?.completed && <Badge className="rounded-full">Completed</Badge>}
                        </div>
                      </div>
                    </div>
                  </button>
                )
              })}
            </CardContent>
          </Card>

          <div className="space-y-6">
            {selectedRoadmapTopic && (
              <Card id="curriculum-topic" className="scroll-mt-24 rounded-2xl">
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <CardTitle className="text-2xl">{selectedRoadmapTopic.title}</CardTitle>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        {selectedRoadmapTopic.description}
                      </p>
                    </div>
                    <Badge variant="secondary" className="w-fit rounded-full">
                      {selectedRoadmapTopic.difficulty}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-3 md:grid-cols-2">
                    <TopicListCard title="Prerequisites" items={selectedRoadmapTopic.prerequisites} emptyText="Start here" />
                    <TopicListCard
                      title="Recommended Next"
                      items={selectedRoadmapTopic.recommendedNextTopics}
                      emptyText="Review and practice"
                    />
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      className="rounded-xl"
                      onClick={() =>
                        handleTopicCompleted(
                          selectedRoadmapTopic.id,
                          !roadmapProgress.topics[selectedRoadmapTopic.id]?.completed,
                        )
                      }
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {roadmapProgress.topics[selectedRoadmapTopic.id]?.completed
                        ? "Mark Not Complete"
                        : "Mark Topic Complete"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => handleTopicSelect(selectedRoadmapTopic.id)}
                    >
                      <BookOpenCheck className="h-4 w-4" />
                      Mark Viewed
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {selectedRoadmapTopic && (
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Route className="h-5 w-5" />
                    Connected ARSHLAB Tools
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  {selectedRoadmapTopic.toolLinks.map((tool) => (
                    <Link
                      key={tool.label}
                      href={tool.href}
                      className="rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:bg-secondary/40"
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <span className="font-semibold">{tool.label}</span>
                        <ArrowRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <p className="text-sm leading-relaxed text-muted-foreground">{tool.description}</p>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <RoadmapMetric icon={BookOpenCheck} label="Current Recommendation" value={roadmapSummary.currentRecommendedTopic?.title ?? "Complete"} />
              <RoadmapMetric icon={Calculator} label="Formula + Solver" value="Linked" />
              <RoadmapMetric icon={Database} label="Generation Mode" value="Database Only" />
            </div>
          </div>
        </div>

        <Card className="mb-6 rounded-2xl border-primary/20 bg-primary/5">
          <CardContent className="grid gap-5 p-5 lg:grid-cols-[1fr_320px]">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge>v5.8.0</Badge>
                <Badge variant="secondary">{summary.curriculum.level}</Badge>
              </div>
              <h2 className="text-2xl font-bold">{summary.curriculum.name}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{summary.curriculum.description}</p>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{summary.curriculum.disclaimer}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Learning Path</label>
              <Select
                value={summary.curriculum.id}
                onValueChange={(value) => void handleCurriculumChange(value)}
                disabled={loading || updating || !profile}
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
              <Button variant="outline" className="w-full rounded-xl" onClick={() => void loadCurriculum()} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
                Refresh Curriculum
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
          <StatCard icon={BarChart3} label="Progress" value={loading ? "..." : `${summary.overallProgress}%`} />
          <StatCard icon={ClipboardCheck} label="Diagnostic Coverage" value={loading ? "..." : `${summary.diagnosticCoverage}%`} />
          <StatCard icon={Trophy} label="Units Mastered" value={loading ? "..." : `${summary.unitsMastered}/${summary.units.length}`} />
          <StatCard icon={Target} label="Needs Work" value={loading ? "..." : summary.unitsNeedingWork} />
          <StatCard icon={BookOpenCheck} label="Spectroscopy" value={loading ? "..." : `${spectroscopyAccuracy.accuracy}%`} />
          <StatCard icon={Zap} label="Level / XP" value={loading ? "..." : `${level} / ${profile?.xp ?? 0}`} />
        </div>

        <div className="mb-6 grid gap-4 lg:grid-cols-3">
          <InsightCard label="Weakest Unit" unit={summary.weakestUnit} />
          <InsightCard label="Strongest Unit" unit={summary.strongestUnit} />
          <InsightCard label="Recommended Next Unit" unit={summary.recommendedNextUnit} />
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          <Button asChild className="rounded-xl">
            <Link href={unitLink(summary.recommendedNextUnit, "study")}>Start Recommended Study</Link>
          </Button>
          <Button asChild variant="secondary" className="rounded-xl">
            <Link href="/recovery">Start Recovery</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href={unitLink(summary.recommendedNextUnit, "practice")}>Generate Practice Set</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href={unitLink(summary.recommendedNextUnit, "exam")}>Generate Curriculum Exam</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link href={unitLink(summary.recommendedNextUnit, "diagnostic")}>Curriculum Diagnostic</Link>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {summary.units.map((unit) => (
            <Card key={unit.unit.id} className="rounded-2xl">
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-lg">{unit.unit.title}</CardTitle>
                  <Badge variant={statusVariant(unit.status)}>{unit.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm leading-relaxed text-muted-foreground">{unit.unit.description}</p>
                <div className="grid grid-cols-3 gap-2">
                  <MiniStat label="Mastery" value={`${unit.mastery}%`} />
                  <MiniStat label="Attempted" value={unit.attempted} />
                  <MiniStat label="Correct" value={unit.correct} />
                </div>
                <Progress value={unit.mastery} />
                <div className="flex flex-wrap gap-1">
                  {unit.unit.topics.map((topic) => (
                    <Badge key={topic} variant="outline">{topic}</Badge>
                  ))}
                </div>
                <Button asChild variant="outline" className="w-full rounded-xl">
                  <Link href={unitLink(unit, "study")}>Study This Unit</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mt-6 rounded-2xl border-dashed">
          <CardContent className="space-y-3 p-5 text-sm text-muted-foreground">
            <p>{summary.curriculum.questionStyleNotes}</p>
            <p>Curriculum progress is based on saved self-marked attempts. It is a study guide, not official syllabus coverage or exam prediction.</p>
          </CardContent>
        </Card>
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

function InsightCard({ label, unit }: { label: string; unit: CurriculumUnitProgress | null }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-5">
        <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
        <p className="mt-2 text-lg font-semibold text-foreground">{unit?.unit.title ?? "Not enough data"}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {unit ? `${unit.mastery}% mastery across ${unit.attempted} attempts` : "Start study or diagnostic attempts"}
        </p>
      </CardContent>
    </Card>
  )
}

function MiniStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/20 p-3 text-center">
      <p className="text-lg font-bold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function TopicListCard({
  title,
  items,
  emptyText,
}: {
  title: string
  items: string[]
  emptyText: string
}) {
  return (
    <div className="rounded-xl border border-border bg-secondary/20 p-4">
      <p className="text-sm font-semibold">{title}</p>
      {items.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {items.map((item) => (
            <Badge key={item} variant="outline" className="rounded-full">
              {item}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">{emptyText}</p>
      )}
    </div>
  )
}

function RoadmapMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}
