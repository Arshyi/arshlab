"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Download,
  GraduationCap,
  Loader2,
  Medal,
  RotateCcw,
  ShieldCheck,
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
import { createClient } from "@/lib/supabase/client"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import { addPracticeProgress } from "@/lib/supabase/practice-progress"
import { applyProfileReward } from "@/lib/supabase/user-profile"
import {
  calculateDiagnosticStats,
  DIAGNOSTIC_COUNTS,
  DIAGNOSTIC_CURRICULA,
  getDiagnosticBand,
  getRecommendedStudyOrder,
  percentage,
  type DiagnosticStat,
} from "@/lib/learning/diagnostic"
import {
  downloadAnswerKeyPdf,
  downloadDiagnosticReportPdf,
  downloadQuestionPdf,
  generatedDateLabel,
  type DiagnosticReportStatRow,
  type PdfQuestion,
} from "@/lib/pdf/arshlab-pdf"

const GUEST_USAGE_KEY = "arshlab-ai-guest-usage"
const GUEST_LIMIT = 3

interface GuestUsage {
  date: string
  count: number
}

interface DiagnosticQuestion {
  id: string
  questionNumber: number
  topic: string
  subtopic: string
  difficulty: string
  questionType: "Multiple Choice"
  question: string
  choices: string[]
  correctAnswer: string
  explanation: string
}

interface GeneratedDiagnostic {
  title: string
  curriculum: string
  questions: DiagnosticQuestion[]
}

interface CheckedAnswer {
  choice: string
  correct: boolean
}

type MarkStatus = "correct" | "missed"

function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}

function readGuestUsage(): GuestUsage {
  if (typeof window === "undefined") return { date: todayKey(), count: 0 }
  try {
    const parsed = JSON.parse(localStorage.getItem(GUEST_USAGE_KEY) ?? "null") as GuestUsage | null
    if (!parsed || parsed.date !== todayKey()) return { date: todayKey(), count: 0 }
    return parsed
  } catch {
    return { date: todayKey(), count: 0 }
  }
}

function writeGuestUsage(usage: GuestUsage) {
  try {
    localStorage.setItem(GUEST_USAGE_KEY, JSON.stringify(usage))
  } catch {
    // Server-side usage limits remain authoritative.
  }
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

function normalizeChoice(choice: string, index: number): string {
  const label = String.fromCharCode(65 + index)
  return /^[A-D][.)]\s*/i.test(choice) ? choice : `${label}. ${choice}`
}

function answerMatchesChoice(question: DiagnosticQuestion, choice: string, index: number): boolean {
  const label = String.fromCharCode(65 + index).toLowerCase()
  const answer = normalizeText(question.correctAnswer)
  const normalizedChoice = normalizeText(choice)
  const withoutLabel = normalizedChoice.replace(/^[a-d][.)]\s*/i, "")
  return answer === label || answer === normalizedChoice || answer === withoutLabel || answer === `${label}. ${withoutLabel}`
}

function toDiagnosticPdfQuestions(diagnostic: GeneratedDiagnostic): PdfQuestion[] {
  return diagnostic.questions.map((question) => ({
    questionNumber: question.questionNumber,
    question: question.question,
    choices: question.choices,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    topic: question.topic,
    subtopic: question.subtopic,
  }))
}

function toReportRows(stats: DiagnosticStat[]): DiagnosticReportStatRow[] {
  return stats.map((stat) => ({
    name: stat.name,
    attempted: stat.attempted,
    correct: stat.correct,
    accuracy: stat.accuracy,
    band: stat.band,
  }))
}

function statValue(stats: DiagnosticStat[], strongest = false): DiagnosticStat | null {
  if (stats.length === 0) return null
  return [...stats].sort((a, b) =>
    strongest
      ? b.accuracy - a.accuracy || b.attempted - a.attempted
      : a.accuracy - b.accuracy || b.attempted - a.attempted,
  )[0]
}

export function DiagnosticClient() {
  const [questionCount, setQuestionCount] = useState("20")
  const [curriculum, setCurriculum] = useState<(typeof DIAGNOSTIC_CURRICULA)[number]>("General First-Year Chemistry")
  const [diagnostic, setDiagnostic] = useState<GeneratedDiagnostic | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null)
  const [checkedAnswers, setCheckedAnswers] = useState<Record<string, CheckedAnswer>>({})
  const [marks, setMarks] = useState<Record<string, MarkStatus>>({})
  const [complete, setComplete] = useState(false)
  const [completionAwarded, setCompletionAwarded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [guestUsage, setGuestUsage] = useState<GuestUsage>({ date: todayKey(), count: 0 })

  useEffect(() => {
    setGuestUsage(readGuestUsage())

    if (!isSupabaseConfigured()) return
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      setIsLoggedIn(Boolean(data.user))
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session?.user))
    })

    return () => subscription.unsubscribe()
  }, [])

  const guestRemaining = useMemo(
    () => Math.max(0, GUEST_LIMIT - guestUsage.count),
    [guestUsage.count],
  )
  const currentQuestion = diagnostic?.questions[currentIndex] ?? null
  const currentChecked = currentQuestion ? checkedAnswers[currentQuestion.id] : undefined
  const currentMark = currentQuestion ? marks[currentQuestion.id] : undefined
  const totalQuestions = diagnostic?.questions.length ?? 0
  const markedCount = Object.keys(marks).length
  const correctCount = Object.values(marks).filter((mark) => mark === "correct").length
  const missedCount = Object.values(marks).filter((mark) => mark === "missed").length
  const accuracy = percentage(correctCount, markedCount)
  const completionAccuracy = percentage(correctCount, totalQuestions)
  const placementBand = getDiagnosticBand(completionAccuracy)
  const sessionProgress = totalQuestions ? Math.round((markedCount / totalQuestions) * 100) : 0
  const remainingQuestions = Math.max(0, totalQuestions - markedCount)
  const attempts = useMemo(
    () =>
      diagnostic
        ? diagnostic.questions
            .map((question) => {
              const mark = marks[question.id]
              if (!mark) return null
              return {
                topic: question.topic,
                subtopic: question.subtopic,
                correct: mark === "correct",
              }
            })
            .filter((item): item is { topic: string; subtopic: string; correct: boolean } => Boolean(item))
        : [],
    [diagnostic, marks],
  )
  const topicStats = useMemo(() => calculateDiagnosticStats(attempts, "topic"), [attempts])
  const subtopicStats = useMemo(() => calculateDiagnosticStats(attempts, "subtopic"), [attempts])
  const recommendedStudyOrder = useMemo(() => getRecommendedStudyOrder(topicStats), [topicStats])
  const weakestTopic = statValue(topicStats)
  const strongestTopic = statValue(topicStats, true)
  const weakestSubtopic = statValue(subtopicStats)
  const strongestSubtopic = statValue(subtopicStats, true)

  async function generateDiagnostic() {
    if (loading) return

    if (!isLoggedIn && guestRemaining <= 0) {
      setError("Daily guest AI assistant limit reached. Sign in for a higher limit.")
      return
    }

    setLoading(true)
    setError(null)
    setMessage(null)
    setDiagnostic(null)
    setCurrentIndex(0)
    setSelectedChoice(null)
    setCheckedAnswers({})
    setMarks({})
    setComplete(false)
    setCompletionAwarded(false)

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: "diagnostic-generator",
          questionCount: Number(questionCount),
          curriculum,
        }),
      })
      const data = await response.json()

      if (!response.ok || !data.ok || !data.diagnostic) {
        setError(data.message || "AI Assistant temporarily unavailable")
        return
      }

      setDiagnostic(data.diagnostic)
      setRemaining(typeof data.remaining === "number" ? data.remaining : null)

      if (!isLoggedIn) {
        const nextUsage = { date: todayKey(), count: guestUsage.count + 1 }
        setGuestUsage(nextUsage)
        writeGuestUsage(nextUsage)
      }
    } catch {
      setError("AI Assistant temporarily unavailable")
    } finally {
      setLoading(false)
    }
  }

  function checkAnswer() {
    if (!currentQuestion || !selectedChoice || currentChecked) return
    const index = currentQuestion.choices.findIndex((choice) => choice === selectedChoice)
    const correct = index >= 0 ? answerMatchesChoice(currentQuestion, selectedChoice, index) : false
    setCheckedAnswers((current) => ({
      ...current,
      [currentQuestion.id]: { choice: selectedChoice, correct },
    }))
    setMessage(null)
  }

  async function markQuestion(status: MarkStatus) {
    if (!currentQuestion || marks[currentQuestion.id]) return

    setMarks((current) => ({ ...current, [currentQuestion.id]: status }))
    setMessage(null)

    if (!isLoggedIn) {
      setMessage("Diagnostic score updated locally. Sign in to save progress, XP, and placement history.")
      return
    }

    const isCorrect = status === "correct"
    const progressResult = await addPracticeProgress({
      topic: currentQuestion.topic,
      subtopic: currentQuestion.subtopic,
      difficulty: currentQuestion.difficulty,
      questionType: "Diagnostic",
      correct: isCorrect,
    })

    if (!progressResult.ok) {
      setMessage(`Progress was not saved: ${progressResult.error}`)
      return
    }

    if (!isCorrect) {
      setMessage("Diagnostic progress saved.")
      return
    }

    const rewardResult = await applyProfileReward({ xp: 10 })
    setMessage(
      rewardResult.ok
        ? "Diagnostic progress saved. +10 XP awarded."
        : `Diagnostic progress saved. XP was not updated: ${rewardResult.error}`,
    )
  }

  function goToNextQuestion() {
    if (!diagnostic || currentIndex >= diagnostic.questions.length - 1) return
    setCurrentIndex((current) => current + 1)
    setSelectedChoice(null)
    setMessage(null)
  }

  async function finishDiagnostic() {
    if (!diagnostic || complete || markedCount !== totalQuestions) return
    setComplete(true)

    if (!isLoggedIn || completionAwarded) {
      setMessage("Diagnostic complete. Sign in to save completion XP and placement history.")
      return
    }

    const rewardResult = await applyProfileReward({
      xp: 25,
      completedDiagnostics: 1,
      diagnosticAccuracy: completionAccuracy,
      diagnosticCompletedAt: new Date().toISOString(),
    })
    setCompletionAwarded(true)
    setMessage(
      rewardResult.ok
        ? "Diagnostic complete. +25 XP completion bonus awarded."
        : `Diagnostic complete. Completion XP was not saved: ${rewardResult.error}`,
    )
  }

  function resetDiagnostic() {
    setDiagnostic(null)
    setCurrentIndex(0)
    setSelectedChoice(null)
    setCheckedAnswers({})
    setMarks({})
    setComplete(false)
    setCompletionAwarded(false)
    setError(null)
    setMessage(null)
  }

  function downloadDiagnosticPdf() {
    if (!diagnostic) return
    downloadQuestionPdf({
      filename: "arshlab-diagnostic-assessment.pdf",
      title: "ARSHLAB",
      subtitle: "Diagnostic Assessment",
      metadata: [
        { label: "Curriculum", value: diagnostic.curriculum },
        { label: "Difficulty", value: "Automatic" },
        { label: "Date Generated", value: generatedDateLabel() },
        { label: "Number of Questions", value: diagnostic.questions.length },
      ],
      questions: toDiagnosticPdfQuestions(diagnostic),
    })
  }

  function downloadDiagnosticAnswerKeyPdf() {
    if (!diagnostic) return
    downloadAnswerKeyPdf({
      filename: "arshlab-diagnostic-answer-key.pdf",
      title: "Diagnostic Answer Key",
      metadata: [
        { label: "Curriculum", value: diagnostic.curriculum },
        { label: "Difficulty", value: "Automatic" },
        { label: "Date Generated", value: generatedDateLabel() },
        { label: "Number of Questions", value: diagnostic.questions.length },
      ],
      questions: toDiagnosticPdfQuestions(diagnostic),
    })
  }

  function downloadReportPdf() {
    if (!diagnostic) return
    downloadDiagnosticReportPdf({
      filename: "arshlab-diagnostic-report.pdf",
      metadata: [
        { label: "Curriculum", value: diagnostic.curriculum },
        { label: "Date Generated", value: generatedDateLabel() },
        { label: "Number of Questions", value: diagnostic.questions.length },
      ],
      summary: [
        { label: "Total", value: totalQuestions },
        { label: "Correct", value: correctCount },
        { label: "Missed", value: missedCount },
        { label: "Accuracy", value: `${completionAccuracy}%` },
        { label: "Placement Band", value: placementBand },
      ],
      topicStats: toReportRows(topicStats),
      subtopicStats: toReportRows(subtopicStats),
      recommendedStudyOrder,
      recommendedActions: personalizedActions(recommendedStudyOrder, completionAccuracy),
    })
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Diagnostic Assessment</h1>
              <p className="text-muted-foreground">Placement-style chemistry checkup with guided next steps</p>
            </div>
          </div>
          <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
            Generate one mixed chemistry diagnostic, answer one question at a time, and turn your results into
            a study order, recovery plan, progress records, and printable reports.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <motion.main initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <GraduationCap className="h-5 w-5" />
                    Diagnostic Settings
                  </CardTitle>
                  <Badge variant="secondary">
                    {isLoggedIn
                      ? remaining === null
                        ? "Signed in"
                        : `${remaining} account AI requests left`
                      : `${guestRemaining} guest AI requests left today`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <Picker
                    label="Question Count"
                    value={questionCount}
                    options={DIAGNOSTIC_COUNTS.map(String)}
                    onChange={setQuestionCount}
                    suffix="questions"
                  />
                  <Picker
                    label="Curriculum"
                    value={curriculum}
                    options={[...DIAGNOSTIC_CURRICULA]}
                    onChange={(value) => setCurriculum(value as (typeof DIAGNOSTIC_CURRICULA)[number])}
                  />
                </div>

                <div className="grid gap-3 rounded-xl border border-border bg-secondary/20 p-4 sm:grid-cols-3">
                  <MiniInfo label="Difficulty" value="Automatic" />
                  <MiniInfo label="Format" value="Mixed MC" />
                  <MiniInfo label="AI Requests" value="1 per diagnostic" />
                </div>

                <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Generated questions are not saved permanently. Only self-marked progress and diagnostic score metadata are stored for signed-in users.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {diagnostic && (
                      <Button variant="outline" className="h-11 rounded-xl" onClick={resetDiagnostic}>
                        <RotateCcw className="h-4 w-4" />
                        Reset
                      </Button>
                    )}
                    <Button
                      onClick={() => void generateDiagnostic()}
                      disabled={loading || (!isLoggedIn && guestRemaining <= 0)}
                      className="h-11 rounded-xl"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                      {loading ? "Generating..." : "Generate Diagnostic"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {error && (
              <Alert className="rounded-2xl border-amber-500/30 bg-amber-500/10">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{error.includes("temporarily unavailable") ? "AI Assistant temporarily unavailable" : "Diagnostic stopped"}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {message && (
              <Alert className="rounded-2xl border-teal-500/30 bg-teal-500/10">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Diagnostic update</AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            {diagnostic && !complete && currentQuestion && (
              <>
                <div className="grid gap-3 sm:grid-cols-4">
                  <SessionStat icon={Target} label="Remaining" value={remainingQuestions} />
                  <SessionStat icon={Trophy} label="Current Score" value={`${accuracy}%`} />
                  <SessionStat icon={CheckCircle2} label="Correct" value={correctCount} />
                  <SessionStat icon={Zap} label="Progress" value={`${markedCount}/${totalQuestions}`} />
                </div>

                <Card className="rounded-2xl border-primary/20 bg-primary/5">
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <ClipboardCheck className="h-5 w-5" />
                        Question {currentQuestion.questionNumber}
                      </CardTitle>
                      <div className="flex flex-wrap gap-2">
                        <Badge>{currentQuestion.topic}</Badge>
                        <Badge variant="outline">{currentQuestion.subtopic}</Badge>
                        <Badge variant="secondary">{currentQuestion.difficulty}</Badge>
                      </div>
                    </div>
                    <Progress value={sessionProgress} className="mt-2" />
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <Alert className="rounded-2xl border-amber-500/30 bg-amber-500/10">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>AI-generated educational material</AlertTitle>
                      <AlertDescription>
                        This diagnostic is an educational estimate, not an official placement exam. Verify important answers independently.
                      </AlertDescription>
                    </Alert>

                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" className="rounded-xl" onClick={downloadDiagnosticPdf}>
                        <Download className="h-4 w-4" />
                        Download Diagnostic PDF
                      </Button>
                      <Button variant="outline" className="rounded-xl" onClick={downloadDiagnosticAnswerKeyPdf}>
                        <Download className="h-4 w-4" />
                        Download Answer Key PDF
                      </Button>
                      <Button variant="outline" className="rounded-xl" onClick={downloadReportPdf}>
                        <Download className="h-4 w-4" />
                        Download Report PDF
                      </Button>
                    </div>

                    <p className="break-words text-lg leading-relaxed text-foreground">{currentQuestion.question}</p>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {currentQuestion.choices.map((choice, index) => {
                        const normalized = normalizeChoice(choice, index)
                        const selected = selectedChoice === choice
                        const correct = answerMatchesChoice(currentQuestion, choice, index)
                        const showFeedback = Boolean(currentChecked)
                        return (
                          <button
                            key={`${currentQuestion.id}-${index}`}
                            type="button"
                            disabled={Boolean(currentChecked)}
                            onClick={() => setSelectedChoice(choice)}
                            className={[
                              "min-h-16 rounded-xl border p-4 text-left text-sm transition-all",
                              showFeedback && correct
                                ? "border-primary bg-primary/10"
                                : showFeedback && currentChecked?.choice === choice && !currentChecked.correct
                                  ? "border-destructive bg-destructive/10"
                                  : selected
                                    ? "border-primary bg-primary/5"
                                    : "border-border bg-card hover:bg-secondary/30",
                              currentChecked ? "cursor-default" : "cursor-pointer",
                            ].join(" ")}
                          >
                            {normalized}
                          </button>
                        )
                      })}
                    </div>

                    {!currentChecked ? (
                      <Button onClick={checkAnswer} disabled={!selectedChoice} className="h-12 rounded-xl">
                        Check Answer
                      </Button>
                    ) : (
                      <div className="space-y-4">
                        <Alert
                          className={
                            currentChecked.correct
                              ? "rounded-2xl border-teal-500/30 bg-teal-500/10"
                              : "rounded-2xl border-orange-500/30 bg-orange-500/10"
                          }
                        >
                          {currentChecked.correct ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                          <AlertTitle>{currentChecked.correct ? "Correct" : "Not quite"}</AlertTitle>
                          <AlertDescription>Correct answer: {currentQuestion.correctAnswer}</AlertDescription>
                        </Alert>

                        <div className="rounded-xl border border-border bg-card p-4">
                          <h3 className="mb-2 font-semibold">Explanation</h3>
                          <p className="text-sm leading-relaxed text-muted-foreground">{currentQuestion.explanation}</p>
                        </div>

                        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                          <Button
                            variant={currentMark === "correct" ? "default" : "outline"}
                            className="min-h-11 rounded-xl"
                            onClick={() => void markQuestion("correct")}
                            disabled={Boolean(currentMark)}
                          >
                            <CheckCircle2 className="h-4 w-4" />
                            I got this right
                          </Button>
                          <Button
                            variant={currentMark === "missed" ? "destructive" : "outline"}
                            className="min-h-11 rounded-xl"
                            onClick={() => void markQuestion("missed")}
                            disabled={Boolean(currentMark)}
                          >
                            <XCircle className="h-4 w-4" />
                            I missed this
                          </Button>
                        </div>

                        {currentIndex < totalQuestions - 1 ? (
                          <Button onClick={goToNextQuestion} disabled={!currentMark} className="h-12 rounded-xl">
                            Next Question
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            onClick={() => void finishDiagnostic()}
                            disabled={markedCount !== totalQuestions}
                            className="h-12 rounded-xl"
                          >
                            Finish Diagnostic
                            <Trophy className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {diagnostic && complete && (
              <Card className="rounded-2xl border-teal-500/20 bg-teal-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Trophy className="h-6 w-6" />
                    Diagnostic Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-3 sm:grid-cols-5">
                    <ScoreTile label="Questions" value={totalQuestions} />
                    <ScoreTile label="Correct" value={correctCount} />
                    <ScoreTile label="Missed" value={missedCount} />
                    <ScoreTile label="Accuracy" value={`${completionAccuracy}%`} />
                    <ScoreTile label="Placement" value={placementBand} />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <InsightCard label="Strongest Topic" stat={strongestTopic} />
                    <InsightCard label="Weakest Topic" stat={weakestTopic} />
                    <InsightCard label="Strongest Subtopic" stat={strongestSubtopic} />
                    <InsightCard label="Weakest Subtopic" stat={weakestSubtopic} />
                  </div>

                  <Card className="rounded-2xl">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Target className="h-5 w-5" />
                        Recommended Study Order
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {recommendedStudyOrder.length > 0 ? (
                        recommendedStudyOrder.slice(0, 8).map((topic, index) => (
                          <div key={topic} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
                            <span className="text-sm font-medium">{index + 1}. {topic}</span>
                            <Badge variant="outline">
                              {topicStats.find((stat) => stat.name === topic)?.accuracy ?? 0}%
                            </Badge>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No study order is available yet.</p>
                      )}
                    </CardContent>
                  </Card>

                  <div className="flex flex-wrap gap-2">
                    <Button asChild className="rounded-xl">
                      <Link href={weakestTopic ? `/study?topic=${encodeURIComponent(weakestTopic.name)}` : "/study"}>
                        Study Weakest Topic
                      </Link>
                    </Button>
                    <Button asChild variant="secondary" className="rounded-xl">
                      <Link href="/recovery">Start Recovery</Link>
                    </Button>
                    <Button asChild variant="outline" className="rounded-xl">
                      <Link href={weakestTopic ? `/practice-generator?topic=${encodeURIComponent(weakestTopic.name)}` : "/practice-generator"}>
                        Practice Set
                      </Link>
                    </Button>
                    <Button asChild variant="outline" className="rounded-xl">
                      <Link href="/exam-generator">Practice Exam</Link>
                    </Button>
                    <Button asChild variant="outline" className="rounded-xl">
                      <Link href="/progress">Progress</Link>
                    </Button>
                  </div>

                  <div className="flex flex-wrap gap-2 border-t border-border pt-4">
                    <Button variant="outline" className="rounded-xl" onClick={downloadDiagnosticPdf}>
                      <Download className="h-4 w-4" />
                      Download Diagnostic PDF
                    </Button>
                    <Button variant="outline" className="rounded-xl" onClick={downloadDiagnosticAnswerKeyPdf}>
                      <Download className="h-4 w-4" />
                      Download Answer Key PDF
                    </Button>
                    <Button variant="outline" className="rounded-xl" onClick={downloadReportPdf}>
                      <Download className="h-4 w-4" />
                      Download Report PDF
                    </Button>
                    <Button variant="outline" className="rounded-xl" onClick={resetDiagnostic}>
                      <RotateCcw className="h-4 w-4" />
                      Start Over
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </motion.main>

          <motion.aside initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BarChart3 className="h-5 w-5" />
                  Placement Bands
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  ["0-40%", "Needs Intervention"],
                  ["40-60%", "Developing"],
                  ["60-80%", "Competent"],
                  ["80-100%", "Advanced"],
                ].map(([range, label]) => (
                  <div key={label} className="flex items-center justify-between rounded-xl border border-border bg-secondary/20 px-3 py-2 text-sm">
                    <span className="font-medium">{range}</span>
                    <span className="text-muted-foreground">{label}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Medal className="h-5 w-5" />
                  Rewards
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Signed-in users earn +10 XP for each self-marked correct diagnostic answer.</p>
                <p>Completing the diagnostic awards +25 XP and updates last, best, and completed diagnostic counts.</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldCheck className="h-5 w-5" />
                  Guardrails
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Diagnostic generation uses the existing server-side OpenRouter route.</p>
                <p>Only configured free models are allowed. The browser never sends a model ID.</p>
                <p>No generated diagnostic question text is stored permanently.</p>
                <p>Not affiliated with or endorsed by the International Baccalaureate, College Board, UBC, or any examination board.</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-dashed">
              <CardContent className="space-y-3 p-5 text-sm text-muted-foreground">
                <p>
                  A diagnostic is a study planning snapshot. Use it to choose what to work on next, not as a final
                  judgment of ability.
                </p>
              </CardContent>
            </Card>
          </motion.aside>
        </div>
      </div>
    </div>
  )
}

function personalizedActions(order: string[], accuracy: number): string[] {
  if (order.length === 0) return ["Continue with mixed study and a practice exam."]
  const first = order[0]
  if (accuracy < 60) {
    return [
      `Start Recovery Mode focused on ${first}.`,
      `Run Study Mode for ${first}.`,
      "Review Progress after one recovery session.",
    ]
  }
  if (accuracy < 80) {
    return [
      `Run a targeted practice set for ${first}.`,
      "Take a 10-question practice exam after review.",
      "Use Progress to confirm whether weak subtopics are improving.",
    ]
  }
  return [
    "Use Exam Generator for advanced mixed review.",
    `Use Study Mode to polish ${first}.`,
    "Check Progress for long-term mastery trends.",
  ]
}

function Picker({
  label,
  value,
  options,
  onChange,
  suffix,
}: {
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
  suffix?: string
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 w-full rounded-xl">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {suffix ? `${option} ${suffix}` : option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}

function MiniInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  )
}

function SessionStat({
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
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function ScoreTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-card/70 p-3 text-center">
      <p className="break-words text-xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function InsightCard({ label, stat }: { label: string; stat: DiagnosticStat | null }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-2 break-words font-semibold text-foreground">{stat?.name ?? "Not enough data"}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant="outline">{stat ? `${stat.accuracy}%` : "0%"}</Badge>
        <Badge variant="secondary">{stat?.band ?? "Pending"}</Badge>
        {stat && <Badge variant="outline">{stat.correct}/{stat.attempted} correct</Badge>}
      </div>
    </div>
  )
}
