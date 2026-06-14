"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  AlertCircle,
  BookOpenCheck,
  CheckCircle2,
  Copy,
  Database,
  Download,
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
import { applyProfileReward, getUserProfile } from "@/lib/supabase/user-profile"
import {
  DEFAULT_CURRICULUM_ID,
  getCurriculum,
  getSubtopicsForCurriculumTopic,
  getTopicsForUnit,
  listCurricula,
  type CurriculumId,
} from "@/lib/curriculum/curriculum-registry"
import {
  downloadAnswerKeyPdf,
  downloadQuestionPdf,
  generatedDateLabel,
  type PdfQuestion,
} from "@/lib/pdf/arshlab-pdf"
import {
  buildGeneratedExamFromQuestions,
  generateAdaptiveDatabaseExam,
  generateDatabaseExam,
  getHybridSplit,
  mergeExamQuestions,
  type ExamEngineQuestion,
  type GeneratedEngineExam,
} from "@/lib/exam-engine/generator"

const GUEST_USAGE_KEY = "arshlab-ai-guest-usage"
const GUEST_LIMIT = 3

const curricula = [
  "CHEM 121",
  "CHEM 121 Style",
  "IB Chemistry Style",
  "AP Chemistry Style",
  "A-Level Chemistry Style",
  "General First-Year Chemistry",
]

const examLengths = ["10", "20", "30", "50"]
const difficulties = ["Introductory", "Intermediate", "Advanced"]
const questionTypes = ["Multiple Choice Only", "Mixed Exam", "Short Answer Only"]
const examSources = ["Hybrid", "Database Only", "AI Only"] as const
const examModes = ["Blueprint Exam", "Adaptive Exam"] as const
const curriculumOptions = listCurricula()

type ExamQuestion = ExamEngineQuestion
type GeneratedExam = GeneratedEngineExam
type ExamSourceSelection = (typeof examSources)[number]
type ExamModeSelection = (typeof examModes)[number]
type MarkStatus = "correct" | "missed"

interface GuestUsage {
  date: string
  count: number
}

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

function toExamPdfQuestions(exam: GeneratedExam): PdfQuestion[] {
  return exam.questions.map((question) => ({
    questionNumber: question.questionNumber,
    question: question.question,
    choices: question.choices,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    topic: question.topic,
    subtopic: question.subtopic,
  }))
}

function getExamSourceMode(selection: ExamSourceSelection): "database" | "ai" | "hybrid" {
  if (selection === "Database Only") return "database"
  if (selection === "AI Only") return "ai"
  return "hybrid"
}

function needsAiForExam(selection: ExamSourceSelection): boolean {
  return selection === "AI Only" || selection === "Hybrid"
}

function toAiExamQuestion(question: Partial<ExamQuestion>, index: number): ExamQuestion {
  const rawChoices = Array.isArray(question.choices) ? question.choices : []
  return {
    questionNumber: index + 1,
    type: question.type === "short_answer" ? "short_answer" : "multiple_choice",
    topic: question.topic || "Exam Generator",
    subtopic: question.subtopic || "Mixed Review",
    question: question.question || "Question unavailable.",
    choices: rawChoices.map((choice, choiceIndex) => normalizeChoice(String(choice), choiceIndex)),
    correctAnswer: question.correctAnswer || "Answer unavailable.",
    explanation: question.explanation || "Explanation unavailable.",
    source: "ai",
    curriculumUnit: question.curriculumUnit,
    blueprintSection: question.blueprintSection || question.topic || "AI Generated",
  }
}

function convertAiExam(
  aiExam: { title?: string; questions?: Partial<ExamQuestion>[] },
  source: "ai" | "hybrid",
  databaseQuestions: ExamQuestion[] = [],
): GeneratedExam {
  const aiQuestions = (aiExam.questions ?? []).map(toAiExamQuestion)
  const questions =
    source === "hybrid"
      ? mergeExamQuestions(databaseQuestions, aiQuestions)
      : aiQuestions.map((question, index) => ({ ...question, questionNumber: index + 1 }))

  return buildGeneratedExamFromQuestions({
    title: aiExam.title || (source === "hybrid" ? "Hybrid Practice Exam" : "AI Practice Exam"),
    source,
    questions,
  })
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
  const [curriculumId, setCurriculumId] = useState<CurriculumId>(DEFAULT_CURRICULUM_ID)
  const [curriculumUnit, setCurriculumUnit] = useState("all")
  const [examTopic, setExamTopic] = useState("all")
  const [targetSubtopic, setTargetSubtopic] = useState("all")
  const [examLength, setExamLength] = useState("10")
  const [difficulty, setDifficulty] = useState(difficulties[1])
  const [questionType, setQuestionType] = useState(questionTypes[1])
  const [examSource, setExamSource] = useState<ExamSourceSelection>("Hybrid")
  const [examMode, setExamMode] = useState<ExamModeSelection>("Blueprint Exam")
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

    const params = new URLSearchParams(window.location.search)
    const requestedUnit = params.get("unit")
    if (requestedUnit) setCurriculumUnit(requestedUnit)
    const requestedTopic = params.get("topic")
    if (requestedTopic) setExamTopic(requestedTopic)
    const requestedSubtopic = params.get("subtopic")
    if (requestedSubtopic) setTargetSubtopic(requestedSubtopic)
    const requestedSource = params.get("source")
    if (requestedSource === "database") setExamSource("Database Only")
    if (requestedSource === "ai") setExamSource("AI Only")
    if (requestedSource === "hybrid") setExamSource("Hybrid")
    if (params.get("mode") === "adaptive") setExamMode("Adaptive Exam")

    if (!isSupabaseConfigured()) return
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      const signedIn = Boolean(data.user)
      setIsLoggedIn(signedIn)
      if (signedIn) {
        void loadProgress()
        getUserProfile().then((result) => {
          if (result.ok) {
            setCurriculumId(result.data.selectedCurriculum)
            setCurriculum(getCurriculum(result.data.selectedCurriculum).name)
          }
        })
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const signedIn = Boolean(session?.user)
      setIsLoggedIn(signedIn)
      if (signedIn) {
        void loadProgress()
        getUserProfile().then((result) => {
          if (result.ok) {
            setCurriculumId(result.data.selectedCurriculum)
            setCurriculum(getCurriculum(result.data.selectedCurriculum).name)
          }
        })
      } else {
        setProgressEntries([])
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const guestRemaining = useMemo(
    () => Math.max(0, GUEST_LIMIT - guestUsage.count),
    [guestUsage.count],
  )
  const examNeedsAi = needsAiForExam(examSource)
  const weakTopic = useMemo(() => getWeakTopic(progressEntries), [progressEntries])
  const selectedCurriculum = useMemo(() => getCurriculum(curriculumId), [curriculumId])
  const topicOptions = useMemo(
    () => getTopicsForUnit(selectedCurriculum, curriculumUnit),
    [selectedCurriculum, curriculumUnit],
  )
  const subtopicOptions = useMemo(
    () => getSubtopicsForCurriculumTopic(selectedCurriculum, examTopic, curriculumUnit),
    [curriculumUnit, examTopic, selectedCurriculum],
  )

  const score = useMemo(() => {
    const total = exam?.questions.length ?? 0
    const correct = Object.values(marks).filter((value) => value === "correct").length
    const missed = Object.values(marks).filter((value) => value === "missed").length
    const attempted = correct + missed
    const percentage = attempted ? Math.round((correct / attempted) * 100) : 0
    return { total, correct, missed, attempted, unmarked: Math.max(0, total - attempted), percentage }
  }, [exam, marks])

  useEffect(() => {
    if (examTopic !== "all" && topicOptions.length > 0 && !topicOptions.includes(examTopic)) {
      setExamTopic("all")
    }
  }, [examTopic, topicOptions])

  useEffect(() => {
    if (targetSubtopic !== "all" && !subtopicOptions.includes(targetSubtopic)) {
      setTargetSubtopic("all")
    }
  }, [subtopicOptions, targetSubtopic])

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

    const totalCount = targetTopic ? 10 : Number(examLength)
    const sourceMode = getExamSourceMode(examSource)
    const adaptive = examMode === "Adaptive Exam" || Boolean(targetTopic)
    const aiRequired = sourceMode === "ai" || sourceMode === "hybrid"

    if (!isLoggedIn && aiRequired && guestRemaining <= 0) {
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
      const engineInput = {
        curriculum,
        curriculumId,
        unit: curriculumUnit === "all" ? undefined : curriculumUnit,
        topic: targetTopic ?? (examTopic === "all" ? undefined : examTopic),
        subtopic: targetSubtopic === "all" ? undefined : targetSubtopic,
        difficulty,
        count: totalCount,
        questionType: targetTopic ? "Mixed Exam" : questionType,
      }

      const requestAiExam = async (count: number, aiTargetTopic?: string) => {
        const response = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task: "exam-generator",
            curriculum,
            examLength: count,
            difficulty,
            questionType: targetTopic ? "Mixed Exam" : questionType,
            targetTopic:
              aiTargetTopic ??
              targetTopic ??
              (adaptive ? weakTopic ?? undefined : examTopic === "all" ? undefined : examTopic),
            curriculumId,
            curriculumUnit: curriculumUnit === "all" ? undefined : curriculumUnit,
            targetSubtopic: targetSubtopic === "all" ? undefined : targetSubtopic,
          }),
        })
        const data = await response.json()

        if (!response.ok || !data.ok || !data.exam) {
          throw new Error(data.message || "AI Assistant temporarily unavailable")
        }

        setRemaining(typeof data.remaining === "number" ? data.remaining : null)
        return data.exam as { title?: string; questions?: Partial<ExamQuestion>[] }
      }

      let nextExam: GeneratedExam

      if (sourceMode === "database") {
        nextExam = adaptive
          ? generateAdaptiveDatabaseExam(engineInput, progressEntries)
          : generateDatabaseExam(engineInput)
      } else if (sourceMode === "hybrid") {
        const split = getHybridSplit(totalCount)
        const databaseInput = { ...engineInput, count: split.databaseCount }
        const databaseExam = adaptive
          ? generateAdaptiveDatabaseExam(databaseInput, progressEntries)
          : generateDatabaseExam(databaseInput)
        const aiExam = await requestAiExam(split.aiCount)
        const hybridExam = convertAiExam(aiExam, "hybrid", databaseExam.questions)
        nextExam = {
          ...hybridExam,
          title: targetTopic
            ? `Hybrid Recovery Exam: ${targetTopic}`
            : adaptive
              ? `Adaptive Hybrid Practice Exam: ${curriculum}`
              : `Hybrid Practice Exam: ${curriculum}`,
        }
      } else {
        const aiExam = await requestAiExam(totalCount)
        nextExam = {
          ...convertAiExam(aiExam, "ai"),
          title: targetTopic
            ? `AI Recovery Exam: ${targetTopic}`
            : adaptive
              ? `Adaptive AI Practice Exam: ${curriculum}`
              : aiExam.title || `AI Practice Exam: ${curriculum}`,
        }
      }

      setExam(nextExam)

      if (!isLoggedIn && aiRequired) {
        const nextUsage = { date: todayKey(), count: guestUsage.count + 1 }
        setGuestUsage(nextUsage)
        writeGuestUsage(nextUsage)
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "AI Assistant temporarily unavailable")
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

  function downloadExamPdf() {
    if (!exam) return
    downloadQuestionPdf({
      filename: "arshlab-practice-exam.pdf",
      title: "ARSHLAB",
      subtitle: "Generated Practice Exam",
      metadata: [
        { label: "Curriculum", value: curriculum },
        { label: "Curriculum Unit", value: curriculumUnit === "all" ? "Recommended / All" : selectedCurriculum.units.find((unit) => unit.id === curriculumUnit)?.title ?? curriculumUnit },
        { label: "Topic", value: recoveryTopic ?? (examTopic === "all" ? "Balanced curriculum spread" : examTopic) },
        { label: "Subtopic", value: targetSubtopic === "all" ? "Any supported subtopic" : targetSubtopic },
        { label: "Difficulty", value: difficulty },
        { label: "Date Generated", value: generatedDateLabel() },
        { label: "Number of Questions", value: exam.questions.length },
        { label: "Question Format", value: recoveryTopic ? "Recovery Exam" : questionType },
        { label: "Exam Source", value: exam.source },
        { label: "Coverage Summary", value: exam.coverageSummary || "Mixed review" },
        { label: "Curriculum Units Tested", value: exam.curriculumUnitsTested.join(", ") || "Mixed review" },
        { label: "Question Breakdown", value: exam.questionBreakdown.map((item) => `${item.label}: ${item.count}`).join(", ") || "Mixed" },
        { label: "Database / AI", value: `${exam.metrics.databasePercent}% database, ${exam.metrics.aiPercent}% AI` },
        { label: "Estimated Time", value: `${exam.metrics.estimatedMinutes} minutes` },
      ],
      questions: toExamPdfQuestions(exam),
    })
  }

  function downloadExamAnswerKeyPdf() {
    if (!exam) return
    downloadAnswerKeyPdf({
      filename: "arshlab-exam-answer-key.pdf",
      title: "Practice Exam Answer Key",
      metadata: [
        { label: "Curriculum", value: curriculum },
        { label: "Curriculum Unit", value: curriculumUnit === "all" ? "Recommended / All" : selectedCurriculum.units.find((unit) => unit.id === curriculumUnit)?.title ?? curriculumUnit },
        { label: "Difficulty", value: difficulty },
        { label: "Date Generated", value: generatedDateLabel() },
        { label: "Number of Questions", value: exam.questions.length },
        { label: "Exam Source", value: exam.source },
        { label: "Coverage Summary", value: exam.coverageSummary || "Mixed review" },
        { label: "Question Breakdown", value: exam.questionBreakdown.map((item) => `${item.label}: ${item.count}`).join(", ") || "Mixed" },
      ],
      questions: toExamPdfQuestions(exam),
    })
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
      subtopic: question.subtopic,
      difficulty,
      questionType: question.type === "multiple_choice" ? "Multiple choice exam" : "Short answer exam",
      source: question.source,
      examSource: exam?.source,
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
              <p className="text-muted-foreground">Complete chemistry practice exams from the Question Engine, AI, or both</p>
            </div>
          </div>
          <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
            Build a full practice exam, reveal answers one question at a time, and save self-marked progress to your account.
          </p>
        </motion.div>

        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
          <motion.main initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="min-w-0 space-y-6">
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <GraduationCap className="h-5 w-5" />
                    Exam Settings
                  </CardTitle>
                  <Badge variant="secondary">
                    {!examNeedsAi
                      ? "Database mode = no AI usage"
                      : isLoggedIn
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
                  <Picker
                    label="Learning Path"
                    value={curriculumId}
                    options={curriculumOptions.map((item) => item.id)}
                    optionLabels={Object.fromEntries(curriculumOptions.map((item) => [item.id, item.name]))}
                    onChange={(value) => {
                      const next = value as CurriculumId
                      setCurriculumId(next)
                      setCurriculum(getCurriculum(next).name)
                    }}
                  />
                  <Picker
                    label="Curriculum Unit"
                    value={curriculumUnit}
                    options={["all", ...selectedCurriculum.units.map((unit) => unit.id)]}
                    optionLabels={{
                      all: "Recommended / All Units",
                      ...Object.fromEntries(selectedCurriculum.units.map((unit) => [unit.id, unit.title])),
                    }}
                    onChange={setCurriculumUnit}
                  />
                  <Picker
                    label="Topic"
                    value={examTopic}
                    options={["all", ...topicOptions]}
                    optionLabels={{ all: "Balanced curriculum spread" }}
                    onChange={setExamTopic}
                  />
                  <Picker
                    label="Subtopic"
                    value={targetSubtopic}
                    options={["all", ...subtopicOptions]}
                    optionLabels={{ all: "Any supported subtopic" }}
                    onChange={setTargetSubtopic}
                  />
                  <Picker label="Exam Length" value={examLength} options={examLengths} onChange={setExamLength} suffix="Questions" />
                  <Picker label="Difficulty" value={difficulty} options={difficulties} onChange={setDifficulty} />
                  <Picker label="Question Types" value={questionType} options={questionTypes} onChange={setQuestionType} />
                  <Picker label="Exam Source" value={examSource} options={[...examSources]} onChange={(value) => setExamSource(value as ExamSourceSelection)} />
                  <Picker label="Exam Mode" value={examMode} options={[...examModes]} onChange={(value) => setExamMode(value as ExamModeSelection)} />
                </div>

                <div className="grid gap-3 rounded-2xl border border-border bg-secondary/20 p-4 text-sm text-muted-foreground md:grid-cols-4">
                  <SourceMetric label="Database %" value={examSource === "AI Only" ? "0%" : examSource === "Database Only" ? "100%" : "70%"} />
                  <SourceMetric label="AI %" value={examSource === "AI Only" ? "100%" : examSource === "Database Only" ? "0%" : "30%"} />
                  <SourceMetric label="Estimated Time" value={`${Math.round(Number(examLength) * 1.5)} min`} />
                  <SourceMetric label="Mode" value={examMode === "Adaptive Exam" ? "Personalized" : "Blueprint"} />
                </div>

                <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Database exams use local chemistry records and do not consume AI requests. AI-containing exams still use the free-model-only server route.
                  </p>
                  <Button
                    onClick={() => void generateExam()}
                    disabled={loading || (examNeedsAi && !isLoggedIn && guestRemaining <= 0)}
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
                        <Badge variant={exam.source === "database" || exam.source === "adaptive" ? "default" : "outline"}>
                          {exam.source}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <ExamDisclaimer />
                    <ExamMetricsPanel exam={exam} />
                    <ExamCopyActions
                      exam={exam}
                      copied={copied}
                      onCopyEntire={() => copyText("entire-exam-top", formatEntireExam(exam))}
                      onCopyKey={() => copyText("answer-key-top", formatAnswerKey(exam))}
                      onDownloadPdf={downloadExamPdf}
                      onDownloadKeyPdf={downloadExamAnswerKeyPdf}
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
                      onDownloadPdf={downloadExamPdf}
                      onDownloadKeyPdf={downloadExamAnswerKeyPdf}
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

          <motion.aside initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="min-w-0 space-y-4">
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
                    disabled={loading || (examNeedsAi && !isLoggedIn && guestRemaining <= 0)}
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
                  <Database className="h-5 w-5" />
                  Deterministic Engine
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Database Only exams are generated locally from the Chemistry Knowledge Core and Question Engine.</p>
                <p>Hybrid exams use about 70% database questions and 30% AI questions.</p>
                <Button asChild variant="outline" className="w-full rounded-xl">
                  <Link href="/exam-engine">View Exam Engine</Link>
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldCheck className="h-5 w-5" />
                  Safety Rules
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>AI calls go through the server-side OpenRouter route only when AI mode is selected.</p>
                <p>Only configured free models are allowed, and the page never sends a model ID.</p>
                <p>No paid fallback, file uploads, image generation, or chat history.</p>
                <p>Existing daily usage limits stay unchanged.</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-dashed">
              <CardContent className="space-y-3 p-5 text-sm text-muted-foreground">
                <p>Questions are generated educational material.</p>
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
          <Badge variant={question.source === "database" ? "default" : "outline"}>
            {question.source === "database" ? "Database Generated" : "AI Generated"}
          </Badge>
          <Badge variant="outline">{question.topic}</Badge>
          <Badge variant="outline">{question.subtopic}</Badge>
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

function ExamMetricsPanel({ exam }: { exam: GeneratedExam }) {
  return (
    <div className="grid gap-3 rounded-2xl border border-border bg-background/70 p-4 sm:grid-cols-2 lg:grid-cols-4">
      <SourceMetric label="Questions generated" value={exam.metrics.questionsGenerated} />
      <SourceMetric label="Database / AI" value={`${exam.metrics.databasePercent}% / ${exam.metrics.aiPercent}%`} />
      <SourceMetric label="Coverage" value={`${exam.metrics.coveragePercent}%`} />
      <SourceMetric label="Estimated time" value={`${exam.metrics.estimatedMinutes} min`} />
      <div className="sm:col-span-2 lg:col-span-4">
        <p className="text-xs font-medium uppercase text-muted-foreground">Question breakdown</p>
        <p className="mt-1 text-sm text-muted-foreground">{exam.coverageSummary || "Mixed review"}</p>
      </div>
    </div>
  )
}

function SourceMetric({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold text-foreground">{value}</p>
    </div>
  )
}

function ExamCopyActions({
  exam,
  copied,
  onCopyEntire,
  onCopyKey,
  onDownloadPdf,
  onDownloadKeyPdf,
  top = false,
}: {
  exam: GeneratedExam
  copied: string | null
  onCopyEntire: () => void
  onCopyKey: () => void
  onDownloadPdf: () => void
  onDownloadKeyPdf: () => void
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
      <Button variant="outline" className="rounded-xl" onClick={onDownloadPdf}>
        <Download className="h-4 w-4" />
        Download PDF
      </Button>
      <Button variant="outline" className="rounded-xl" onClick={onDownloadKeyPdf}>
        <Download className="h-4 w-4" />
        Download Answer Key PDF
      </Button>
      <span className="sr-only">{exam.title}</span>
    </div>
  )
}

function ExamDisclaimer() {
  return (
    <Alert className="rounded-2xl border-amber-500/30 bg-amber-500/10">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Generated educational material</AlertTitle>
      <AlertDescription>
        Questions may be database-generated, AI-generated, or hybrid. ARSHLAB is not affiliated with or endorsed by
        the International Baccalaureate, College Board, UBC, or any examination board. Verify important answers independently.
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
  optionLabels,
  onChange,
  suffix,
}: {
  label: string
  value: string
  options: string[]
  optionLabels?: Record<string, string>
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
              {suffix ? `${optionLabels?.[option] ?? option} ${suffix}` : optionLabels?.[option] ?? option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}
