"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  AlertCircle,
  BarChart3,
  BookOpenCheck,
  CheckCircle2,
  ClipboardCheck,
  GraduationCap,
  Medal,
  RefreshCw,
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
import { getPracticeProgress, type PracticeProgressEntry } from "@/lib/supabase/practice-progress"
import {
  getLevelFromXp,
  getUserProfile,
  updateSelectedCurriculum,
  type UserProfile,
} from "@/lib/supabase/user-profile"
import { cn } from "@/lib/utils"

const curricula = listCurricula()

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

  const summary = useMemo(
    () => calculateCurriculumProgress(entries, profile?.selectedCurriculum),
    [entries, profile?.selectedCurriculum],
  )
  const level = getLevelFromXp(profile?.xp ?? 0)
  const spectroscopyAccuracy = useMemo(() => getSpectroscopyAccuracy(entries), [entries])

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
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Curriculum Engine</h1>
              <p className="text-muted-foreground">Learning path coverage, unit mastery, and recommended next steps</p>
            </div>
          </div>
          <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
            Choose a curriculum style, then ARSHLAB maps your saved practice progress, diagnostic performance,
            recovery needs, and XP into a unit-by-unit learning plan.
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

        <Card className="mb-6 rounded-2xl border-primary/20 bg-primary/5">
          <CardContent className="grid gap-5 p-5 lg:grid-cols-[1fr_320px]">
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge>v3.0.0</Badge>
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
