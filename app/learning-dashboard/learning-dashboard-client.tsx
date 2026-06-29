"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  AlertCircle,
  Award,
  BarChart3,
  Beaker,
  BookOpenCheck,
  Calculator,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Database,
  FlaskConical,
  Gauge,
  GraduationCap,
  Loader2,
  Medal,
  Network,
  Route,
  ScanSearch,
  Target,
  Trophy,
  Waves,
  Zap,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { getPracticeProgress, type PracticeProgressEntry } from "@/lib/supabase/practice-progress"
import { getUserProfile, type UserProfile } from "@/lib/supabase/user-profile"
import {
  getStoredAchievements,
  syncAchievementUnlocks,
  type StoredAchievement,
} from "@/lib/supabase/achievements"
import { generateLearningRecommendations } from "@/lib/learning/recommendations"
import {
  formulaHref,
  formulaMasteryProgress,
  getFormulaById,
  mostViewedFormulaIds,
  readFormulaViewStats,
  type FormulaViewStats,
} from "@/lib/formula-sheet"
import {
  getAllCurriculumRoadmapProgressSummaries,
  readCurriculumRoadmapProgress,
  type CurriculumRoadmapProgressState,
  type CurriculumRoadmapProgressSummary,
} from "@/lib/curriculum/roadmap-progress"
import {
  curriculumTopicHref,
  mechanismHref,
  resolveMechanismDeepLink,
  resolveSolverModuleDeepLink,
  solverModuleHref,
} from "@/lib/deep-links"
import { calculateStudySnapshot } from "@/lib/study-engine/study-engine"
import { readStudyProgress, type StudyProgressState } from "@/lib/study-engine/study-progress"
import {
  getStructureScanStats,
  readStructureScanHistory,
} from "@/lib/structure-scanner/scanner-utils"
import type { StructureScanStats } from "@/lib/structure-scanner/scanner-types"
import {
  getSynthesisExplorerStats,
  readSynthesisHistory,
} from "@/lib/synthesis/pathfinder"
import type { SynthesisExplorerStats } from "@/lib/synthesis/pathway-types"
import { getLabTechnique } from "@/lib/lab/lab-engine"
import { cn } from "@/lib/utils"

function readinessVariant(score: number): "default" | "secondary" | "destructive" {
  if (score < 40) return "destructive"
  if (score < 60) return "secondary"
  return "default"
}

export function LearningDashboardClient() {
  const [entries, setEntries] = useState<PracticeProgressEntry[]>([])
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [storedAchievements, setStoredAchievements] = useState<StoredAchievement[]>([])
  const [formulaStats, setFormulaStats] = useState<FormulaViewStats | null>(null)
  const [roadmapStats, setRoadmapStats] = useState<CurriculumRoadmapProgressSummary[]>([])
  const [roadmapProgress, setRoadmapProgress] = useState<CurriculumRoadmapProgressState>({ topics: {} })
  const [studyProgress, setStudyProgress] = useState<StudyProgressState>({ events: [] })
  const [scannerStats, setScannerStats] = useState<StructureScanStats>(getStructureScanStats([]))
  const [synthesisStats, setSynthesisStats] = useState<SynthesisExplorerStats>(getSynthesisExplorerStats([]))
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true)
      setError(null)

      const [progressResult, profileResult, achievementResult] = await Promise.all([
        getPracticeProgress(1200),
        getUserProfile(),
        getStoredAchievements(),
      ])

      if (progressResult.ok) setEntries(progressResult.data)
      else {
        setEntries([])
        setError(progressResult.error)
      }

      if (profileResult.ok) setProfile(profileResult.data)
      else setProfile(null)

      if (achievementResult.ok) setStoredAchievements(achievementResult.data)
      else setStoredAchievements([])

      setLoading(false)
      setFormulaStats(readFormulaViewStats())
      const nextRoadmapProgress = readCurriculumRoadmapProgress()
      setRoadmapProgress(nextRoadmapProgress)
      setRoadmapStats(getAllCurriculumRoadmapProgressSummaries(nextRoadmapProgress))
      setStudyProgress(readStudyProgress())
      setScannerStats(getStructureScanStats(readStructureScanHistory()))
      setSynthesisStats(getSynthesisExplorerStats(readSynthesisHistory()))
    }

    void loadDashboard()
  }, [])

  const summary = useMemo(
    () => generateLearningRecommendations(entries, profile?.selectedCurriculum, { xp: profile?.xp ?? 0 }),
    [entries, profile?.selectedCurriculum, profile?.xp],
  )
  const studySnapshot = useMemo(
    () =>
      calculateStudySnapshot({
        events: studyProgress.events,
        practiceEntries: entries,
        formulaStats,
        curriculumProgress: roadmapProgress,
      }),
    [entries, formulaStats, roadmapProgress, studyProgress.events],
  )

  useEffect(() => {
    if (!profile) return
    syncAchievementUnlocks(summary.achievements).then((result) => {
      if (result.ok && result.data.length > 0) {
        setStoredAchievements((current) => {
          const existing = new Set(current.map((achievement) => achievement.achievementId))
          return [...result.data.filter((achievement) => !existing.has(achievement.achievementId)), ...current]
        })
      }
    })
  }, [profile, summary.achievements])

  const weakAreas = summary.mastery.topicMastery.filter((topic) => topic.attempted > 0).slice(0, 5)
  const strongAreas = [...summary.mastery.topicMastery]
    .filter((topic) => topic.attempted > 0)
    .sort((a, b) => b.mastery - a.mastery || b.attempted - a.attempted)
    .slice(0, 5)
  const nextAction = summary.recommendations.today[0]
  const unlockedIds = new Set(storedAchievements.map((achievement) => achievement.achievementId))
  const mechanismStats = summary.topicStats.find((topic) => topic.topic === "Organic Mechanisms")
  const missedMechanisms = summary.conceptStats
    .filter((concept) => concept.topic === "Organic Mechanisms" && concept.missed > 0)
    .slice(0, 4)
  const solverStats = summary.topicStats.find((topic) => topic.topic === "Chemistry Calculations")
  const missedSolverConcepts = summary.conceptStats
    .filter((concept) => concept.topic === "Chemistry Calculations" && concept.missed > 0)
    .slice(0, 4)
  const reagentEntries = entries.filter(
    (entry) =>
      entry.topic === "Reaction Conditions" ||
      entry.subtopic === "Reagent Selection" ||
      /reagent/i.test(entry.questionType ?? ""),
  )
  const reagentCorrect = reagentEntries.filter((entry) => entry.correct).length
  const reagentAccuracy = reagentEntries.length ? Math.round((reagentCorrect / reagentEntries.length) * 100) : 0
  const missedReagents = summary.conceptStats
    .filter((concept) => concept.topic === "Reaction Conditions" && concept.missed > 0)
    .slice(0, 4)
  const spectroscopyTopics = new Set(["Spectroscopy", "IR Spectroscopy", "NMR Spectroscopy", "Mass Spectrometry"])
  const spectroscopyEntries = entries.filter(
    (entry) =>
      spectroscopyTopics.has(entry.topic) ||
      /spectroscopy|nmr|mass spec|molecular ion|base peak|carbonyl/i.test(`${entry.topic} ${entry.subtopic} ${entry.questionType ?? ""}`),
  )
  const spectroscopyCorrect = spectroscopyEntries.filter((entry) => entry.correct).length
  const spectroscopyAccuracy = spectroscopyEntries.length
    ? Math.round((spectroscopyCorrect / spectroscopyEntries.length) * 100)
    : 0
  const missedSpectroscopySignals = summary.conceptStats
    .filter(
      (concept) =>
        spectroscopyTopics.has(concept.topic) ||
        /nmr|mass|spectroscopy|carbonyl|base peak|molecular ion|isotope/i.test(`${concept.topic} ${concept.subtopic}`),
    )
    .filter((concept) => concept.missed > 0)
    .slice(0, 4)
  const spectroscopyCategoryCounts = spectroscopyEntries.reduce<Record<string, number>>((counts, entry) => {
    const key =
      entry.topic === "IR Spectroscopy"
        ? "IR"
        : entry.topic === "NMR Spectroscopy"
          ? "NMR"
          : entry.topic === "Mass Spectrometry"
            ? "Mass Spec"
            : /mass/i.test(entry.subtopic)
              ? "Mass Spec"
              : /nmr|ppm|proton|carbon/i.test(entry.subtopic)
                ? "NMR"
                : "Spectroscopy"
    counts[key] = (counts[key] ?? 0) + 1
    return counts
  }, {})
  const mostStudiedSpectroscopyCategory =
    Object.entries(spectroscopyCategoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "No attempts yet"
  const labEntries = entries.filter(
    (entry) =>
      entry.topic === "Lab Skills" ||
      /lab|laboratory|glassware|titration|meniscus|burette|pipette|tlc|safety|waste|ppe|error/i.test(
        `${entry.topic} ${entry.subtopic} ${entry.questionType ?? ""}`,
      ),
  )
  const labCorrect = labEntries.filter((entry) => entry.correct).length
  const labAccuracy = labEntries.length ? Math.round((labCorrect / labEntries.length) * 100) : 0
  const weakestLabTechniques = summary.conceptStats
    .filter(
      (concept) =>
        concept.topic === "Lab Skills" ||
        /lab|titration|meniscus|burette|pipette|tlc|safety|waste|glassware|error/i.test(concept.subtopic),
    )
    .filter((concept) => concept.missed > 0)
    .slice(0, 4)
  const labCategoryCounts = labEntries.reduce<Record<string, number>>((counts, entry) => {
    const category = getLabTechnique(entry.subtopic)?.category ?? "Lab Skills"
    counts[category] = (counts[category] ?? 0) + 1
    return counts
  }, {})
  const mostStudiedLabCategory = Object.entries(labCategoryCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ?? "No attempts yet"
  const formulaMastery = formulaStats ? formulaMasteryProgress(formulaStats) : 0
  const formulaCategoriesStudied = formulaStats ? Object.keys(formulaStats.categoryViews).length : 0
  const topFormulaIds = formulaStats ? mostViewedFormulaIds(formulaStats, 4) : []
  const roadmapTotalTopics = roadmapStats.reduce((sum, roadmap) => sum + roadmap.totalTopics, 0)
  const roadmapCompletedTopics = roadmapStats.reduce((sum, roadmap) => sum + roadmap.completedTopics, 0)
  const roadmapViewedTopics = roadmapStats.reduce((sum, roadmap) => sum + roadmap.viewedTopics, 0)
  const roadmapCompletion = roadmapTotalTopics
    ? Math.round((roadmapCompletedTopics / roadmapTotalTopics) * 100)
    : 0
  const nextRoadmapTopic =
    roadmapStats.find((roadmap) => roadmap.currentRecommendedTopic)?.currentRecommendedTopic ?? null
  const firstMissedMechanismId = resolveMechanismDeepLink(missedMechanisms[0]?.subtopic)
  const firstMissedSolverModuleId = resolveSolverModuleDeepLink(missedSolverConcepts[0]?.subtopic)
  const topScannedCompound = scannerStats.mostScannedCompounds[0]
  const topScannedGroup = scannerStats.mostScannedFunctionalGroups[0]
  const topOCRCompound = scannerStats.mostRecognizedCompounds[0]
  const topSynthesisCompound = synthesisStats.mostSearchedCompounds[0]

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Gauge className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Learning Health Dashboard</h1>
              <p className="text-muted-foreground">Mastery, readiness, streaks, weak areas, and next actions</p>
            </div>
            </div>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              Database mode = no AI usage
            </Badge>
          </div>
          <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
            ARSHLAB v6.1.0 connects diagnostics, curriculum roadmaps, practice, recovery, study, exams, formula views, solver mastery, mechanism mastery, reaction conditions mastery, spectroscopy mastery, lab skills mastery, adaptive study mode, perspective-normalized structure extraction, global shape reconstruction, candidate graph generation, global molecular graph optimization, canonical graph hashes, chemistry-first structure isolation, ring-closure recovery, chemical graph validation, edge pruning, multi-engine evidence fusion, atom-centered graph reconstruction, and visual debugging, plus Synthesis Explorer and the Reaction Explorer knowledge graph.
          </p>
        </motion.div>

        {loading ? (
          <Card className="rounded-2xl">
            <CardContent className="flex items-center justify-center gap-3 py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading learning dashboard...
            </CardContent>
          </Card>
        ) : (
          <>
            {error && (
              <Alert className="mb-6 rounded-2xl border-amber-500/30 bg-amber-500/10">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Saved learning data unavailable</AlertTitle>
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
              <Card className="mb-6 rounded-2xl border-dashed">
                <CardContent className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <h2 className="text-lg font-semibold">No saved learning data yet</h2>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      The dashboard is showing starter guidance only. ARSHLAB will personalize mastery,
                      recovery, and exam readiness after you save practice, diagnostic, study, recovery,
                      or exam attempts.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild className="rounded-xl">
                      <Link href="/study">Start Study Mode</Link>
                    </Button>
                    <Button asChild variant="outline" className="rounded-xl">
                      <Link href="/diagnostic">Take Diagnostic</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <HealthMetric icon={BarChart3} label="Overall Mastery" value={`${summary.mastery.overallMastery}%`} detail={summary.mastery.overallBand} />
              <HealthMetric icon={GraduationCap} label="Curriculum Progress" value={`${summary.mastery.curriculumCompletion.estimatedCompletion}%`} detail={`${summary.mastery.curriculumCompletion.unitsRemaining} units left`} />
              <HealthMetric icon={ClipboardCheck} label="Diagnostic Coverage" value={`${summary.mastery.diagnosticCoverage}%`} detail="Unit coverage" />
              <HealthMetric icon={BookOpenCheck} label="Study Streak" value={summary.mastery.studyStreak} detail="days active" />
            </div>

            <Card className="mb-6 rounded-2xl border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BookOpenCheck className="h-5 w-5" />
                  Adaptive Study Mode
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-4">
                  <MiniStat label="Study Streak" value={studySnapshot.studyStreak} />
                  <MiniStat label="Topics Mastered" value={studySnapshot.topicsMastered} />
                  <MiniStat label="Study Mastery" value={`${studySnapshot.overallMastery}%`} />
                  <MiniStat label="Tracked Topics" value={studySnapshot.topics.length} />
                </div>
                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="rounded-xl border border-border bg-background/80 p-4">
                    <p className="font-semibold">Weakest Topics</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {studySnapshot.weakestTopics.map((topic) => (
                        <Badge key={topic.topic.id} variant="outline" className="rounded-full">
                          {topic.topic.title}: {topic.mastery}%
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="rounded-xl border border-border bg-background/80 p-4">
                    <p className="font-semibold">Recommended Next Action</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {studySnapshot.recommendation.why}
                    </p>
                    <Button asChild className="mt-3 w-full rounded-xl">
                      <Link href={studySnapshot.recommendation.href}>{studySnapshot.recommendation.action}</Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="mb-6 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <Card id="exam-readiness" className="min-w-0 rounded-2xl border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Trophy className="h-5 w-5" />
                    Exam Readiness Index
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <p className="text-5xl font-black text-foreground">{summary.mastery.examReadiness}</p>
                      <p className="mt-1 text-sm text-muted-foreground">out of 100</p>
                    </div>
                    <Badge variant={readinessVariant(summary.mastery.examReadiness)} className="text-sm">
                      {summary.mastery.examReadinessBand}
                    </Badge>
                  </div>
                  <Progress value={summary.mastery.examReadiness} />
                  <div className="grid gap-3 md:grid-cols-3">
                    <Insight label="Strongest Topic" value={summary.strongestTopic?.topic ?? "Not enough data"} />
                    <Insight label="Weakest Topic" value={summary.weakestTopic?.topic ?? "Not enough data"} />
                    <Insight label="Exam Focus" value={summary.suggestedExamFocus} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild className="rounded-xl">
                      <Link href="/exam-generator?source=database&mode=adaptive">Generate Adaptive Exam</Link>
                    </Button>
                    <Button asChild variant="outline" className="rounded-xl">
                      <Link href="/study-plan">Open Study Plan</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="min-w-0 rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="h-5 w-5" />
                    Recommended Next Action
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl border border-border bg-secondary/20 p-4">
                    <p className="font-semibold">{nextAction?.title ?? "Start a study session"}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {nextAction?.reason ?? "Generate a few tracked questions so ARSHLAB can personalize recommendations."}
                    </p>
                    {nextAction && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="outline">{nextAction.topic}</Badge>
                        <Badge variant="secondary">{nextAction.suggestedMode}</Badge>
                        <Badge variant="outline">{nextAction.estimatedTimeMinutes} min</Badge>
                      </div>
                    )}
                  </div>
                  <Button asChild className="w-full rounded-xl">
                    <Link href={nextAction?.href ?? "/study"}>{nextAction?.action ?? "Open Study Mode"}</Link>
                  </Button>
                  <Button asChild variant="outline" className="w-full rounded-xl">
                    <Link href="/recovery">Start Recovery</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="mb-6 grid gap-4 lg:grid-cols-2">
              <ExplanationCard
                title="How mastery is calculated"
                body="ARSHLAB combines diagnostic, practice, exam, and recovery progress with fixed weights: diagnostic 25%, practice 35%, exam 30%, and recovery 10%. Missing sources are ignored until attempts exist, then active weights are re-normalized and clamped from 0 to 100."
              />
              <ExplanationCard
                title="Why this recommendation appears"
                body="Recommendations rank recent misses, low topic mastery, diagnostic weaknesses, weak curriculum units, and exam-readiness gaps. If there is no saved data yet, ARSHLAB shows a starter path instead of pretending it knows your weaknesses."
              />
            </div>

            <Card className="mb-6 rounded-2xl border-teal-500/20 bg-teal-500/5">
              <CardContent className="grid gap-4 p-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <Network className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="font-semibold">Reaction Explorer</h2>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      Open the connected chemistry map to see how weak topics relate to compounds,
                      mechanisms, formulas, solvers, practice, and exams.
                    </p>
                  </div>
                </div>
                <Button asChild className="rounded-xl">
                  <Link href="/reaction-explorer">Open Reaction Explorer</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="mb-6 rounded-2xl border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ScanSearch className="h-5 w-5" />
                  Structure Scanner
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-[520px_minmax(0,1fr)_auto] lg:items-center">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border bg-background/80 p-4">
                    <p className="text-3xl font-bold">{scannerStats.uploadScans}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Upload scans</p>
                  </div>
                  <div className="rounded-xl border border-border bg-background/80 p-4">
                    <p className="text-3xl font-bold">{scannerStats.cameraScans}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Camera scans</p>
                  </div>
                  <div className="rounded-xl border border-border bg-background/80 p-4">
                    <p className="text-3xl font-bold">{scannerStats.ocrScansPerformed}</p>
                    <p className="mt-1 text-sm text-muted-foreground">OCR scans</p>
                  </div>
                  <div className="rounded-xl border border-border bg-background/80 p-4">
                    <p className="text-3xl font-bold">{scannerStats.visualMatches}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Visual matches</p>
                  </div>
                  <div className="rounded-xl border border-border bg-background/80 p-4">
                    <p className="text-3xl font-bold">{scannerStats.correctedScans}</p>
                    <p className="mt-1 text-sm text-muted-foreground">Corrected scans</p>
                  </div>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold">Most scanned chemistry</p>
                  {scannerStats.totalScans > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {topScannedCompound && (
                        <Badge variant="outline" className="rounded-full">
                          {topScannedCompound.name}: {topScannedCompound.count}
                        </Badge>
                      )}
                      {topScannedGroup && (
                        <Badge variant="secondary" className="rounded-full">
                          {topScannedGroup.name}: {topScannedGroup.count}
                        </Badge>
                      )}
                      {topOCRCompound && (
                        <Badge className="rounded-full">
                          OCR: {topOCRCompound.name} ({topOCRCompound.count})
                        </Badge>
                      )}
                      <Badge variant="outline" className="rounded-full">
                        Scanner mode = local chemistry database
                      </Badge>
                      <Badge variant="outline" className="rounded-full">
                        OCR correction rate: {scannerStats.ocrCorrectionRate}%
                      </Badge>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Upload or capture a structure image to start private browser-local history.
                    </p>
                  )}
                </div>
                <Button asChild className="rounded-xl">
                  <Link href="/structure-scanner">Open Scanner</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="mb-6 rounded-2xl border-teal-500/20 bg-teal-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Route className="h-5 w-5" />
                  Synthesis Explorer
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_auto] lg:items-center">
                <div className="rounded-xl border border-border bg-background/80 p-4">
                  <p className="text-3xl font-bold">{synthesisStats.pathwaysExplored}</p>
                  <p className="mt-1 text-sm text-muted-foreground">pathways explored in this browser</p>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold">Pathway metrics</p>
                  {synthesisStats.pathwaysExplored > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {topSynthesisCompound && (
                        <Badge variant="outline" className="rounded-full">
                          {topSynthesisCompound.name}: {topSynthesisCompound.count}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="rounded-full">
                        Longest: {synthesisStats.longestPathwayCompleted} steps
                      </Badge>
                      <Badge variant="outline" className="rounded-full">
                        Database mode = no AI usage
                      </Badge>
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Explore a path such as ethene to ethanoic acid to start local synthesis metrics.
                    </p>
                  )}
                </div>
                <Button asChild className="rounded-xl">
                  <Link href="/synthesis-explorer">Open Explorer</Link>
                </Button>
              </CardContent>
            </Card>

            <div className="mb-6 grid gap-6 lg:grid-cols-2">
              <AreaCard title="Weak Areas" icon={AlertCircle} topics={weakAreas} />
              <AreaCard title="Strong Areas" icon={Medal} topics={strongAreas} strong />
            </div>

            <Card className="mb-6 rounded-2xl border-teal-500/20 bg-teal-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FlaskConical className="h-5 w-5" />
                  Mechanism Mastery
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_auto] lg:items-center">
                <div className="rounded-xl border border-border bg-background/80 p-4">
                  <p className="text-3xl font-bold">{mechanismStats?.accuracy ?? 0}%</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {mechanismStats ? `${mechanismStats.correct}/${mechanismStats.attempted} correct` : "No attempts yet"}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold">Most missed mechanisms</p>
                  {missedMechanisms.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {missedMechanisms.map((concept) => {
                        const mechanismId = resolveMechanismDeepLink(concept.subtopic)
                        return (
                          <Button key={`${concept.topic}-${concept.subtopic}`} asChild variant="outline" size="sm" className="rounded-full">
                            <Link href={mechanismId ? mechanismHref(mechanismId) : "/mechanism-trainer"}>
                              {concept.subtopic}: {concept.correct}/{concept.attempted}
                            </Link>
                          </Button>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Self-mark Organic Mechanisms questions to reveal missed pathways here.
                    </p>
                  )}
                </div>
                <Button asChild className="rounded-xl">
                  <Link href={firstMissedMechanismId ? mechanismHref(firstMissedMechanismId) : "/mechanism-trainer"}>Review Mechanisms</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="mb-6 rounded-2xl border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calculator className="h-5 w-5" />
                  Solver Mastery
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_auto] lg:items-center">
                <div className="rounded-xl border border-border bg-background/80 p-4">
                  <p className="text-3xl font-bold">{solverStats?.accuracy ?? 0}%</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {solverStats ? `${solverStats.correct}/${solverStats.attempted} correct` : "No attempts yet"}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold">Most missed calculations</p>
                  {missedSolverConcepts.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {missedSolverConcepts.map((concept) => {
                        const moduleId = resolveSolverModuleDeepLink(concept.subtopic)
                        return (
                          <Button key={`${concept.topic}-${concept.subtopic}`} asChild variant="outline" size="sm" className="rounded-full">
                            <Link href={moduleId ? solverModuleHref(moduleId) : "/chemistry-solver"}>
                              {concept.subtopic}: {concept.correct}/{concept.attempted}
                            </Link>
                          </Button>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Solve and mark chemistry calculations to reveal missed modules here.
                    </p>
                  )}
                </div>
                <Button asChild className="rounded-xl">
                  <Link href={firstMissedSolverModuleId ? solverModuleHref(firstMissedSolverModuleId) : "/chemistry-solver"}>Open Solver</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="mb-6 rounded-2xl border-teal-500/20 bg-teal-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Beaker className="h-5 w-5" />
                  Reaction Conditions Mastery
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_auto] lg:items-center">
                <div className="rounded-xl border border-border bg-background/80 p-4">
                  <p className="text-3xl font-bold">{reagentAccuracy}%</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {reagentCorrect}/{reagentEntries.length} reagent questions correct
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold">Most missed reagents</p>
                  {missedReagents.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {missedReagents.map((concept) => (
                        <Badge key={`${concept.topic}-${concept.subtopic}`} variant="outline" className="rounded-full">
                          {concept.subtopic}: {concept.correct}/{concept.attempted}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Generate Reaction Conditions practice to track reagent-selection mastery.
                    </p>
                  )}
                </div>
                <Button asChild className="rounded-xl">
                  <Link href="/practice-generator?topic=Reaction%20Conditions&subtopic=Reagent%20Selection&source=database">
                    Practice Reagents
                  </Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="mb-6 rounded-2xl border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Waves className="h-5 w-5" />
                  Spectroscopy Mastery
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_auto] lg:items-center">
                <div className="rounded-xl border border-border bg-background/80 p-4">
                  <p className="text-3xl font-bold">{spectroscopyAccuracy}%</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {spectroscopyCorrect}/{spectroscopyEntries.length} spectroscopy questions correct
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold">Most missed signal types</p>
                  {missedSpectroscopySignals.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {missedSpectroscopySignals.map((concept) => (
                        <Badge key={`${concept.topic}-${concept.subtopic}`} variant="outline" className="rounded-full">
                          {concept.subtopic}: {concept.correct}/{concept.attempted}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Generate deterministic spectroscopy practice to track missed IR, NMR, and mass spec signals.
                    </p>
                  )}
                  <p className="mt-3 text-sm text-muted-foreground">
                    Most studied category: {mostStudiedSpectroscopyCategory}
                  </p>
                </div>
                <Button asChild className="rounded-xl">
                  <Link href="/spectroscopy-explorer">Open Spectroscopy Explorer</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="mb-6 rounded-2xl border-teal-500/20 bg-teal-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ClipboardList className="h-5 w-5" />
                  Lab Skills Mastery
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_auto] lg:items-center">
                <div className="rounded-xl border border-border bg-background/80 p-4">
                  <p className="text-3xl font-bold">{labAccuracy}%</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {labCorrect}/{labEntries.length} lab questions correct
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold">Weakest lab techniques</p>
                  {weakestLabTechniques.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {weakestLabTechniques.map((concept) => (
                        <Badge key={`${concept.topic}-${concept.subtopic}`} variant="outline" className="rounded-full">
                          {concept.subtopic}: {concept.correct}/{concept.attempted}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Generate deterministic lab skills practice to track safety, glassware, technique, and error-analysis mastery.
                    </p>
                  )}
                  <p className="mt-3 text-sm text-muted-foreground">
                    Most studied lab category: {mostStudiedLabCategory}
                  </p>
                </div>
                <Button asChild className="rounded-xl">
                  <Link href="/lab-explorer">Open Lab Explorer</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="mb-6 rounded-2xl border-teal-500/20 bg-teal-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Database className="h-5 w-5" />
                  Formula Sheet Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_auto] lg:items-center">
                <div className="rounded-xl border border-border bg-background/80 p-4">
                  <p className="text-3xl font-bold">{formulaMastery}%</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formulaStats?.totalViews ?? 0} formula views
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold">Most viewed formulas</p>
                  {topFormulaIds.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {topFormulaIds.map((id) => {
                        const formula = getFormulaById(id)
                        if (!formula) return null
                        return (
                          <Button key={id} asChild variant="outline" size="sm" className="rounded-full">
                            <Link href={formulaHref(id)}>
                              {formula.name}: {formulaStats?.formulaViews[id] ?? 0}
                            </Link>
                          </Button>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="mt-1 text-sm text-muted-foreground">
                      Open formulas from the Formula Sheet or Solver to build local formula-view history.
                    </p>
                  )}
                  <p className="mt-3 text-sm text-muted-foreground">
                    Categories studied: {formulaCategoriesStudied}
                  </p>
                </div>
                <Button asChild className="rounded-xl">
                  <Link href="/formula-sheet">Open Formula Sheet</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="mb-6 rounded-2xl border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Route className="h-5 w-5" />
                  Curriculum Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)_auto] lg:items-center">
                <div className="rounded-xl border border-border bg-background/80 p-4">
                  <p className="text-3xl font-bold">{roadmapCompletion}%</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {roadmapCompletedTopics}/{roadmapTotalTopics} roadmap topics complete
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="font-semibold">Current recommended topic</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {nextRoadmapTopic
                      ? `${nextRoadmapTopic.title} - ${nextRoadmapTopic.description}`
                      : "Open the Curriculum Engine to start a deterministic roadmap."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Badge variant="outline" className="rounded-full">
                      {roadmapViewedTopics} viewed
                    </Badge>
                    <Badge variant="secondary" className="rounded-full">
                      General + Organic Roadmaps
                    </Badge>
                    <Badge variant="outline" className="rounded-full">
                      Database mode = no AI usage
                    </Badge>
                  </div>
                </div>
                <Button asChild className="rounded-xl">
                  <Link href={nextRoadmapTopic ? curriculumTopicHref(nextRoadmapTopic.id) : "/curriculum"}>Open Curriculum</Link>
                </Button>
              </CardContent>
            </Card>

            <div className="mb-6 grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <Card className="min-w-0 rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Route className="h-5 w-5" />
                    Curriculum Completion Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-4">
                    <MiniStat label="Completed Units" value={summary.mastery.curriculumCompletion.completedUnits} />
                    <MiniStat label="Units Remaining" value={summary.mastery.curriculumCompletion.unitsRemaining} />
                    <MiniStat label="Completion" value={`${summary.mastery.curriculumCompletion.estimatedCompletion}%`} />
                    <MiniStat label="Est. Graduation" value={summary.mastery.curriculumCompletion.estimatedGraduation} />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {summary.mastery.unitMastery.length > 0 ? summary.mastery.unitMastery.map((unit, index) => (
                      <div key={unit.unit.id} className="rounded-xl border border-border bg-card p-4">
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="break-words font-medium">{index + 1}. {unit.unit.title}</p>
                            <p className="text-xs text-muted-foreground">{unit.correct}/{unit.attempted} correct</p>
                          </div>
                          <Badge variant={unit.completed ? "default" : "secondary"}>
                            {unit.completed ? "Complete" : unit.band}
                          </Badge>
                        </div>
                        <Progress value={unit.mastery} />
                      </div>
                    )) : (
                      <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-4 text-sm text-muted-foreground md:col-span-2">
                        Curriculum unit tracking appears after saved practice, diagnostic, recovery, or exam attempts.
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="min-w-0 rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Zap className="h-5 w-5" />
                    Adaptive Engine Metrics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <MetricRow label="Topics tracked" value={summary.metrics.topicsTracked} />
                  <MetricRow label="Units tracked" value={summary.metrics.unitsTracked} />
                  <MetricRow label="Mastery calculations" value={summary.metrics.masteryCalculations} />
                  <MetricRow label="Recommendations generated" value={summary.metrics.recommendationsGenerated} />
                  <MetricRow label="Achievements available" value={summary.metrics.achievementsAvailable} />
                  <MetricRow label="Stored unlocks" value={storedAchievements.length} />
                </CardContent>
              </Card>
            </div>

            <Card id="achievements" className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Award className="h-5 w-5" />
                  Achievements
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {summary.achievements.map((achievement) => {
                  const persisted = unlockedIds.has(achievement.id)
                  return (
                    <Card
                      key={achievement.id}
                      className={cn(
                        "rounded-2xl",
                        achievement.unlocked ? "border-teal-500/30 bg-teal-500/5" : "border-border",
                      )}
                    >
                      <CardContent className="space-y-4 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            {achievement.unlocked ? <CheckCircle2 className="h-5 w-5" /> : <Award className="h-5 w-5" />}
                          </div>
                          <Badge variant={achievement.unlocked ? "default" : "secondary"}>
                            {persisted ? "Stored" : achievement.unlocked ? "Unlocked" : "In progress"}
                          </Badge>
                        </div>
                        <div>
                          <p className="font-semibold">{achievement.label}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{achievement.description}</p>
                        </div>
                        <Progress value={achievement.progress} />
                      </CardContent>
                    </Card>
                  )
                })}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}

function HealthMetric({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: React.ElementType
  label: string
  value: number | string
  detail: string
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
          <p className="text-xs text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function Insight({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/80 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-semibold text-foreground">{value}</p>
    </div>
  )
}

function ExplanationCard({ title, body }: { title: string; body: string }) {
  return (
    <Card className="rounded-2xl border-primary/20 bg-primary/5">
      <CardContent className="p-5">
        <p className="font-semibold text-foreground">{title}</p>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  )
}

function AreaCard({
  title,
  icon: Icon,
  topics,
  strong = false,
}: {
  title: string
  icon: React.ElementType
  topics: Array<{ topic: string; attempted: number; mastery: number; band: string }>
  strong?: boolean
}) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {topics.length > 0 ? (
          topics.map((topic) => (
            <div key={topic.topic} className="rounded-xl border border-border bg-card p-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{topic.topic}</p>
                  <p className="text-xs text-muted-foreground">{topic.attempted} attempts</p>
                </div>
                <Badge variant={strong ? "default" : topic.mastery < 40 ? "destructive" : "secondary"}>
                  {topic.band}
                </Badge>
              </div>
              <Progress value={topic.mastery} />
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">
              {strong ? "No strong areas identified yet" : "No weak areas identified yet"}
            </p>
            <p className="mt-1">
              Save a few practice or diagnostic attempts and this section will turn into a ranked topic list.
            </p>
          </div>
        )}
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

function MetricRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-secondary/20 px-4 py-3 text-sm">
      <span className="min-w-0 text-muted-foreground">{label}</span>
      <span className="shrink-0 font-semibold text-foreground">{value}</span>
    </div>
  )
}
