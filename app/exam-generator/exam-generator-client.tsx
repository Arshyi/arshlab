"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  AlertCircle,
  BookOpenCheck,
  CheckCircle2,
  ClipboardList,
  Copy,
  Eye,
  EyeOff,
  FileQuestion,
  GraduationCap,
  Loader2,
  ShieldCheck,
  Target,
  Trophy,
  XCircle,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createClient } from "@/lib/supabase/client"
import { isSupabaseConfigured } from "@/lib/supabase/env"
import {
  addPracticeProgress,
  getPracticeProgress,
  type PracticeProgressEntry,
} from "@/lib/supabase/practice-progress"
import { applyProfileReward } from "@/lib/supabase/user-profile"

const GUEST_USAGE_KEY = "arshlab-ai-guest-usage"
const GUEST_LIMIT = 3

const curricula = [
  "CHEM 121",
  "IB Chemistry Style",
  "AP Chemistry Style",
  "A-Level Chemistry Style",
  "General First-Year Chemistry",
]

const examLengths = ["10", "20", "30", "50"]
const difficulties = ["Introductory", "Intermediate", "Advanced"]
const questionTypes = ["Multiple Choice Only", "Mixed Exam", "Short Answer Only"]

interface GuestUsage {
  date: string
  count: number
}

interface ExamQuestion {
  questionNumber: number
  type: "multiple_choice" | "short_answer"
  topic: string
  question: string
  choices: string[]
  correctAnswer: string
  explanation: string
}

interface GeneratedExam {
  title: string
  questions: ExamQuestion[]
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

function normalizeChoice(choice: string, index: number): string {
  const label = String.fromCharCode(65 + index)
  return /^[A-D][.)]\s*/i.test(choice) ? choice : `${label}. ${choice}`
}

function answerMatchesChoice(question: ExamQuestion, choice: string, index: number): boolean {
  const label = String.fromCharCode(65 + index).toLowerCase()
  const answer = question.correctAnswer.trim().toLowerCase()
  const normalizedChoice = choice.trim().toLowerCase()
  const withoutLabel = normalizedChoice.replace(/^[a-d][.)]\s*/i, "")
  return answer === label || answer === normalizedChoice || answer === withoutLabel || answer === `${label}. ${withoutLabel}`
}

function formatQuestion(question: ExamQuestion): string {
  const choices = question.choices.length
    ? `\n${question.choices.map((choice, index) => normalizeChoice(choice, index)).join("\n")}`
    : ""
  return `Question ${question.questionNumber}: ${question.question}${choices}`
}

function formatSolution(question: ExamQuestion): string {
  return [
    formatQuestion(question),
    `Answer: ${question.correctAnswer}`,
    `Explanation: ${question.explanation}`,
  ].join("\n\n")
}

function formatEntireExam(exam: GeneratedExam): string {
  return [`${exam.title}`, ...exam.questions.map(formatSolution)].join("\n\n---\n\n")
}

function formatAnswerKey(exam: GeneratedExam): string {
  return exam.questions
    .map((question) => `Question ${question.questionNumber}: ${question.correctAnswer}\nExplanation: ${question.explanation}`)
    .join("\n\n")
}

function getWeakTopic(entries: PracticeProgressEntry[]): string | null {
  const recent = entries.slice(0, 20)
  const stats = new Map<string, { total: number; correct: number }>()

  for (const entry of recent) {
    const current = stats.get(entry.topic) ?? { total: 0, correct: 0 }
    current.total += 1
    if (entry.correct) current.correct += 1
    stats.set(entry.topic, current)
  }

  const weak = Array.from(stats.entries())
    .map(([topic, value]) => ({
      topic,
      total: value.total,
      accuracy: value.total ? value.correct / value.total : 1,
    }))
    .filter((item) => item.total >= 3 && item.accuracy < 0.6)
    .sort((a, b) => a.accuracy - b.accuracy || b.total - a.total)[0]

  return weak?.topic ?? null
}

export function ExamGeneratorClient() {
  const [curriculum, setCurriculum] = useState(curricula[0])
  const [examLength, setExamLength] = useState("10")
  const [difficulty, setDifficulty] = useState(difficulties[1])
  const [questionType, setQuestionType] = useState(questionTypes[1])
  const [exam, setExam] = useState<GeneratedExam | null>(null)
  const [recoveryTopic, setRecoveryTopic] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [revealedAnswers, setRevealedAnswers] = useState<Record<number, boolean>>({})
  const [revealedExplanations, setRevealedExplanations] = useState<Record<number, boolean>>({})
  const [marks, setMarks] = useState<Record<number, MarkStatus>>({})
  const [examCompletionAwarded, setExamCompletionAwarded] = useState(false)
  const [progressMessage, setProgressMessage] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [guestUsage, setGuestUsage] = useState<GuestUsage>({ date: todayKey(), count: 0 })
  const [progressEntries, setProgressEntries] = useState<PracticeProgressEntry[]>([])

  useEffect(() => {
    setGuestUsage(readGuestUsage())

    if (!isSupabaseConfigured()) return
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      const signedIn = Boolean(data.user)
      setIsLoggedIn(signedIn)
      if (signedIn) void loadProgress()
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const signedIn = Boolean(session?.user)
      setIsLoggedIn(signedIn)
      if (signedIn) void loadProgress()
      else setProgressEntries([])
    })

    return () => subscription.unsubscribe()
  }, [])

  const guestRemaining = useMemo(
    () => Math.max(0, GUEST_LIMIT - guestUsage.count),
    [guestUsage.count],
  )

  const weakTopic = useMemo(() => getWeakTopic(progressEntries), [progressEntries])

  const score = useMemo(() => {
    const total = exam?.questions.length ?? 0
    const correct = Object.values(marks).filter((value) => value === "correct").length
    const missed = Object.values(marks).filter((value) => value === "missed").length
    const attempted = correct + missed
    const percentage = attempted ? Math.round((correct / attempted) * 100) : 0
    return { total, correct, missed, attempted, unmarked: Math.max(0, total - attempted), percentage }
  }, [exam, marks])

  useEffect(() => {
    if (
      !isLoggedIn ||
      !exam ||
      examCompletionAwarded ||
      score.total === 0 ||
      score.attempted !== score.total
    ) {
      return
    }

    let cancelled = false
    applyProfileReward({ xp: 25, completedExams: 1 }).then((result) => {
      if (cancelled) return
      setExamCompletionAwarded(true)
      setProgressMessage(
        result.ok
          ? "Exam complete. +25 XP completion bonus awarded."
          : `Exam complete. Completion XP was not saved: ${result.error}`,
      )
    })

    return () => {
      cancelled = true
    }
  }, [exam, examCompletionAwarded, isLoggedIn, score.attempted, score.total])

  async function loadProgress() {
    const result = await getPracticeProgress(200)
    if (result.ok) setProgressEntries(result.data)
  }

  async function generateExam(targetTopic?: string) {
    if (loading) return

    if (!isLoggedIn && guestRemaining <= 0) {
      setError("Daily guest AI assistant limit reached. Sign in for a higher limit.")
      return
    }

    setLoading(true)
    setError(null)
    setProgressMessage(null)
    setExam(null)
    setCopied(null)
    setRevealedAnswers({})
    setRevealedExplanations({})
    setMarks({})
    setExamCompletionAwarded(false)
    setRecoveryTopic(targetTopic ?? null)

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: "exam-generator",
          curriculum,
          examLength: targetTopic ? 10 : Number(examLength),
          difficulty,
          questionType: targetTopic ? "Mixed Exam" : questionType,
          targetTopic,
        }),
      })
      const data = await response.json()

      if (!response.ok || !data.ok || !data.exam) {
        setError(data.message || "AI Assistant temporarily unavailable")
        return
      }

      setExam(data.exam)
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

  async function copyText(label: string, text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      window.setTimeout(() => setCopied(null), 1600)
    } catch {
      setError("Copy failed. You can still select the text manually.")
    }
  }

  async function markQuestion(question: ExamQuestion, status: MarkStatus) {
    if (marks[question.questionNumber]) return

    setMarks((current) => ({ ...current, [question.questionNumber]: status }))
    setProgressMessage(null)

    if (!isLoggedIn) {
      setProgressMessage("Local exam score updated. Sign in to save progress permanently.")
      return
    }

    const isCorrect = status === "correct"
    const result = await addPracticeProgress({
      topic: question.topic || recoveryTopic || "Exam Generator",
      difficulty,
      correct: isCorrect,
    })

    if (result.ok) {
      if (isCorrect) {
        const rewardResult = await applyProfileReward({ xp: 10 })
        setProgressMessage(
          rewardResult.ok
            ? "Progress saved. +10 XP awarded."
            : `Progress saved. XP was not updated: ${rewardResult.error}`,
        )
      } else {
        setProgressMessage("Progress saved.")
      }
      void loadProgress()
    } else {
      setProgressMessage(`Progress was not saved: ${result.error}`)
    }
  }

  function toggleAnswer(questionNumber: number) {
    setRevealedAnswers((current) => ({ ...current, [questionNumber]: !current[questionNumber] }))
  }

  function toggleExplanation(questionNumber: number) {
    setRevealedExplanations((current) => ({ ...current, [questionNumber]: !current[questionNumber] }))
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <FileQuestion className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Exam Generator</h1>
              <p className="text-muted-foreground">Complete AI-generated chemistry practice exams with free-model guardrails</p>
            </div>
          </div>
          <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
            Build a full practice exam, reveal answers one question at a time, and save self-marked progress to your account.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <motion.main initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <GraduationCap className="h-5 w-5" />
                    Exam Settings
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
                  <Picker label="Curriculum" value={curriculum} options={curricula} onChange={setCurriculum} />
                  <Picker label="Exam Length" value={examLength} options={examLengths} onChange={setExamLength} suffix="Questions" />
                  <Picker label="Difficulty" value={difficulty} options={difficulties} onChange={setDifficulty} />
                  <Picker label="Question Types" value={questionType} options={questionTypes} onChange={setQuestionType} />
                </div>

                <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    One generated exam counts as one AI request. No exam text is stored by ARSHLAB.
                  </p>
                  <Button
                    onClick={() => void generateExam()}
                    disabled={loading || (!isLoggedIn && guestRemaining <= 0)}
                    className="h-11 rounded-xl"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileQuestion className="h-4 w-4" />}
                    {loading ? "Generating..." : "Generate Exam"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {error && (
              <Alert className="rounded-2xl border-amber-500/30 bg-amber-500/10">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{error.includes("temporarily unavailable") ? "AI Assistant temporarily unavailable" : "Exam stopped"}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {progressMessage && (
              <Alert className="rounded-2xl border-teal-500/30 bg-teal-500/10">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Progress</AlertTitle>
                <AlertDescription>{progressMessage}</AlertDescription>
              </Alert>
            )}

            {exam && (
              <>
                <Card className="rounded-2xl border-primary/20 bg-primary/5">
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-xl">
                          <BookOpenCheck className="h-5 w-5" />
                          {exam.title}
                        </CardTitle>
                        {recoveryTopic && (
                          <p className="mt-1 text-sm text-muted-foreground">Recovery exam for {recoveryTopic}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge>{exam.questions.length} questions</Badge>
                        <Badge variant="secondary">{difficulty}</Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <ExamDisclaimer />
                    <ExamCopyActions
                      exam={exam}
                      copied={copied}
                      onCopyEntire={() => copyText("entire-exam-top", formatEntireExam(exam))}
                      onCopyKey={() => copyText("answer-key-top", formatAnswerKey(exam))}
                      top
                    />

                    <div className="space-y-4">
                      {exam.questions.map((question) => (
                        <ExamQuestionCard
                          key={question.questionNumber}
                          question={question}
                          answerVisible={Boolean(revealedAnswers[question.questionNumber])}
                          explanationVisible={Boolean(revealedExplanations[question.questionNumber])}
                          mark={marks[question.questionNumber]}
                          copied={copied}
                          onToggleAnswer={() => toggleAnswer(question.questionNumber)}
                          onToggleExplanation={() => toggleExplanation(question.questionNumber)}
                          onMark={(status) => void markQuestion(question, status)}
                          onCopyQuestion={() => copyText(`question-${question.questionNumber}`, formatQuestion(question))}
                          onCopySolution={() => copyText(`solution-${question.questionNumber}`, formatSolution(question))}
                        />
                      ))}
                    </div>

                    <ExamCopyActions
                      exam={exam}
                      copied={copied}
                      onCopyEntire={() => copyText("entire-exam-bottom", formatEntireExam(exam))}
                      onCopyKey={() => copyText("answer-key-bottom", formatAnswerKey(exam))}
                    />
                  </CardContent>
                </Card>

                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Trophy className="h-5 w-5" />
                      Exam Score Summary
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-5">
                      <ScoreTile label="Correct" value={score.correct} />
                      <ScoreTile label="Missed" value={score.missed} />
                      <ScoreTile label="Unmarked" value={score.unmarked} />
                      <ScoreTile label="Attempted" value={score.attempted} />
                      <ScoreTile label="Percentage" value={`${score.percentage}%`} />
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </motion.main>

          <motion.aside initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            {weakTopic && (
              <Card className="rounded-2xl border-orange-500/30 bg-orange-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="h-5 w-5" />
                    Recovery Exam
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p>Your recent accuracy is below 60% for {weakTopic}.</p>
                  <Button
                    onClick={() => void generateExam(weakTopic)}
                    disabled={loading || (!isLoggedIn && guestRemaining <= 0)}
                    className="w-full rounded-xl"
                  >
                    Generate Recovery Exam
                  </Button>
                </CardContent>
              </Card>
            )}

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldCheck className="h-5 w-5" />
                  Safety Rules
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>All AI calls go through the server-side OpenRouter route.</p>
                <p>Only configured free models are allowed, and the page never sends a model ID.</p>
                <p>No paid fallback, file uploads, image generation, or chat history.</p>
                <p>Existing daily usage limits stay unchanged.</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-dashed">
              <CardContent className="space-y-3 p-5 text-sm text-muted-foreground">
                <p>
                  Questions are AI-generated educational material.
                </p>
                <p>
                  Not affiliated with or endorsed by the International Baccalaureate, College Board, UBC,
                  or any examination board.
                </p>
                <p>Verify important answers independently.</p>
              </CardContent>
            </Card>
          </motion.aside>
        </div>
      </div>
    </div>
  )
}

function ExamQuestionCard({
  question,
  answerVisible,
  explanationVisible,
  mark,
  copied,
  onToggleAnswer,
  onToggleExplanation,
  onMark,
  onCopyQuestion,
  onCopySolution,
}: {
  question: ExamQuestion
  answerVisible: boolean
  explanationVisible: boolean
  mark?: MarkStatus
  copied: string | null
  onToggleAnswer: () => void
  onToggleExplanation: () => void
  onMark: (status: MarkStatus) => void
  onCopyQuestion: () => void
  onCopySolution: () => void
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>Question {question.questionNumber}</Badge>
          <Badge variant="secondary">{question.type === "multiple_choice" ? "Multiple choice" : "Short answer"}</Badge>
          <Badge variant="outline">{question.topic}</Badge>
        </div>
        {mark && (
          <Badge variant={mark === "correct" ? "default" : "destructive"}>
            {mark === "correct" ? "Marked right" : "Marked missed"}
          </Badge>
        )}
      </div>

      <p className="break-words text-base leading-relaxed text-foreground">{question.question}</p>

      {question.choices.length > 0 && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {question.choices.map((choice, index) => (
            <div
              key={`${question.questionNumber}-${choice}`}
              className={
                answerVisible && answerMatchesChoice(question, choice, index)
                  ? "rounded-xl border border-primary bg-primary/10 p-4 text-sm"
                  : "rounded-xl border border-border bg-secondary/20 p-4 text-sm"
              }
            >
              {normalizeChoice(choice, index)}
            </div>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" className="min-h-11 rounded-xl" onClick={onToggleAnswer}>
          {answerVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {answerVisible ? "Hide Answer" : "Reveal Answer"}
        </Button>
        <Button variant="outline" className="min-h-11 rounded-xl" onClick={onToggleExplanation}>
          {explanationVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          {explanationVisible ? "Hide Explanation" : "Reveal Explanation"}
        </Button>
        <Button variant="secondary" className="min-h-11 rounded-xl" onClick={onCopyQuestion}>
          <Copy className="h-4 w-4" />
          {copied === `question-${question.questionNumber}` ? "Copied" : "Copy Question"}
        </Button>
        <Button variant="secondary" className="min-h-11 rounded-xl" onClick={onCopySolution}>
          <Copy className="h-4 w-4" />
          {copied === `solution-${question.questionNumber}` ? "Copied" : "Copy Full Solution"}
        </Button>
      </div>

      {(answerVisible || explanationVisible) && (
        <div className="mt-4 space-y-3">
          {answerVisible && (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
              <h3 className="mb-2 font-semibold">Answer</h3>
              <p className="break-words text-sm leading-relaxed text-muted-foreground">{question.correctAnswer}</p>
            </div>
          )}
          {explanationVisible && (
            <div className="rounded-xl border border-border bg-secondary/20 p-4">
              <h3 className="mb-2 font-semibold">Explanation</h3>
              <p className="break-words text-sm leading-relaxed text-muted-foreground">{question.explanation}</p>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
        <Button
          variant={mark === "correct" ? "default" : "outline"}
          className="min-h-11 rounded-xl"
          onClick={() => onMark("correct")}
        >
          <CheckCircle2 className="h-4 w-4" />
          I got this right
        </Button>
        <Button
          variant={mark === "missed" ? "destructive" : "outline"}
          className="min-h-11 rounded-xl"
          onClick={() => onMark("missed")}
        >
          <XCircle className="h-4 w-4" />
          I missed this
        </Button>
      </div>
    </div>
  )
}

function ExamCopyActions({
  exam,
  copied,
  onCopyEntire,
  onCopyKey,
  top = false,
}: {
  exam: GeneratedExam
  copied: string | null
  onCopyEntire: () => void
  onCopyKey: () => void
  top?: boolean
}) {
  return (
    <div className={top ? "flex flex-wrap gap-2" : "flex flex-wrap gap-2 border-t border-border pt-4"}>
      <Button variant="secondary" className="rounded-xl" onClick={onCopyEntire}>
        <Copy className="h-4 w-4" />
        {copied?.startsWith("entire-exam") ? "Copied" : "Copy Entire Exam"}
      </Button>
      <Button variant="secondary" className="rounded-xl" onClick={onCopyKey}>
        <Copy className="h-4 w-4" />
        {copied?.startsWith("answer-key") ? "Copied" : "Copy Answer Key"}
      </Button>
      <span className="sr-only">{exam.title}</span>
    </div>
  )
}

function ExamDisclaimer() {
  return (
    <Alert className="rounded-2xl border-amber-500/30 bg-amber-500/10">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>AI-generated educational material</AlertTitle>
      <AlertDescription>
        Questions are AI-generated educational material. Not affiliated with or endorsed by the International
        Baccalaureate, College Board, UBC, or any examination board. Verify important answers independently.
      </AlertDescription>
    </Alert>
  )
}

function ScoreTile({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/20 p-4 text-center">
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  )
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
