"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Copy,
  Database,
  Download,
  Eye,
  EyeOff,
  FlaskConical,
  GraduationCap,
  ListChecks,
  Loader2,
  ShieldCheck,
  Sparkles,
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
import { addPracticeProgress } from "@/lib/supabase/practice-progress"
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
import { generateDatabaseQuestions } from "@/lib/question-engine/generator"
import type { QuestionSource } from "@/lib/question-engine/types"

const GUEST_USAGE_KEY = "arshlab-ai-guest-usage"
const GUEST_LIMIT = 3

const topics = [
  "Functional Group Identification",
  "Hybridization",
  "VSEPR Geometry",
  "Periodic Trends",
  "Spectroscopy",
  "Thermodynamics",
  "Electron Configuration",
  "IR Spectroscopy",
  "Kinetics",
  "Equilibrium",
  "Acids and Bases",
  "Bonding",
  "Stoichiometry",
  "Reaction Types",
  "Reaction Prediction",
  "Reaction Balancing",
  "Reaction Classification",
  "Redox",
  "Precipitation",
  "Combustion",
  "Organic Reactions",
]

const questionTypes = [
  "Multiple choice",
  "Short answer",
  "Explanation prompt",
]

const difficulties = [
  "Introductory",
  "Intermediate",
  "Advanced",
]

const curriculumStyles = [
  "High School",
  "IB Chemistry",
  "AP Chemistry",
  "A-Level Chemistry",
  "CHEM 121 / First Year Chemistry",
]

const questionCounts = ["1", "5", "10", "20"]
const questionSources = ["Hybrid", "Database Only", "AI Only"] as const
const curricula = listCurricula()

type QuestionSourceMode = (typeof questionSources)[number]

interface GuestUsage {
  date: string
  count: number
}

interface PracticeChoice {
  label: string
  text: string
}

interface PracticeQuestion {
  id: string
  topic: string
  subtopic: string
  questionType: string
  difficulty: string
  curriculumStyle: string
  question: string
  choices?: PracticeChoice[]
  correctAnswer: string
  explanation: string
  misconceptionNote?: string
  source?: QuestionSource
  sourceEntry?: {
    kind: string
    id: string
    name: string
  }
}

interface PracticeSet {
  questions: PracticeQuestion[]
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
    // The server route still enforces the conservative guest limit.
  }
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

function answerMatchesChoice(question: PracticeQuestion, choice: PracticeChoice): boolean {
  const answer = normalizeText(question.correctAnswer)
  const label = normalizeText(choice.label)
  const text = normalizeText(choice.text)
  return answer === label || answer === text || answer === `${label}. ${text}`
}

function formatQuestion(question: PracticeQuestion, index: number): string {
  const choices = question.choices?.length
    ? `\n${question.choices.map((choice) => `${choice.label}. ${choice.text}`).join("\n")}`
    : ""
  return `Question ${index + 1}: ${question.question}${choices}`
}

function formatSolution(question: PracticeQuestion, index: number): string {
  const sections = [
    formatQuestion(question, index),
    `Answer: ${question.correctAnswer}`,
    `Explanation: ${question.explanation}`,
  ]

  if (question.misconceptionNote) {
    sections.push(`Misconception note: ${question.misconceptionNote}`)
  }

  return sections.join("\n\n")
}

function formatQuestionsOnly(set: PracticeSet): string {
  return set.questions.map((question, index) => formatQuestion(question, index)).join("\n\n")
}

function formatAnswerKey(set: PracticeSet): string {
  return set.questions
    .map((question, index) => {
      const note = question.misconceptionNote ? `\nMisconception note: ${question.misconceptionNote}` : ""
      return `Question ${index + 1}: ${question.correctAnswer}\nExplanation: ${question.explanation}${note}`
    })
    .join("\n\n")
}

function formatEntireSet(set: PracticeSet): string {
  return set.questions.map((question, index) => formatSolution(question, index)).join("\n\n---\n\n")
}

function toPracticePdfQuestions(set: PracticeSet): PdfQuestion[] {
  return set.questions.map((question, index) => ({
    questionNumber: index + 1,
    question: question.question,
    choices: question.choices ?? [],
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    topic: question.topic,
    subtopic: question.subtopic,
  }))
}

function wordCount(value: string): number {
  return value.trim().split(/\s+/).filter(Boolean).length
}

function qualityWarnings(question: PracticeQuestion, index: number): string[] {
  const warnings: string[] = []

  if (question.choices?.length) {
    const uniqueChoices = new Set(question.choices.map((choice) => normalizeText(choice.text)))
    if (uniqueChoices.size < question.choices.length) {
      warnings.push(`Question ${index + 1}: repeated or identical answer choices.`)
    }
  }

  if (wordCount(question.explanation) < 12) {
    warnings.push(`Question ${index + 1}: explanation is very short.`)
  }

  if (!question.misconceptionNote) {
    warnings.push(`Question ${index + 1}: no misconception note was provided.`)
  }

  const promptWords = wordCount(question.question)
  const genericPhrases = [
    "which of the following is correct",
    "explain this concept",
    "what is chemistry",
  ]
  if (promptWords < 8 || genericPhrases.some((phrase) => normalizeText(question.question).includes(phrase))) {
    warnings.push(`Question ${index + 1}: prompt may be too generic.`)
  }

  return warnings
}

export function PracticeGeneratorClient() {
  const [topic, setTopic] = useState(topics[0])
  const [curriculumId, setCurriculumId] = useState<CurriculumId>(DEFAULT_CURRICULUM_ID)
  const [curriculumUnit, setCurriculumUnit] = useState("all")
  const [targetSubtopic, setTargetSubtopic] = useState("all")
  const [questionType, setQuestionType] = useState(questionTypes[0])
  const [difficulty, setDifficulty] = useState(difficulties[0])
  const [curriculumStyle, setCurriculumStyle] = useState(curriculumStyles[0])
  const [questionCount, setQuestionCount] = useState("1")
  const [questionSource, setQuestionSource] = useState<QuestionSourceMode>("Hybrid")
  const [practiceSet, setPracticeSet] = useState<PracticeSet | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progressMessage, setProgressMessage] = useState<string | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({})
  const [revealedExplanations, setRevealedExplanations] = useState<Record<string, boolean>>({})
  const [marks, setMarks] = useState<Record<string, MarkStatus>>({})
  const [sessionCompletionAwarded, setSessionCompletionAwarded] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [guestUsage, setGuestUsage] = useState<GuestUsage>({ date: todayKey(), count: 0 })

  useEffect(() => {
    setGuestUsage(readGuestUsage())

    const params = new URLSearchParams(window.location.search)
    const requestedTopic = params.get("topic")
    if (requestedTopic && topics.includes(requestedTopic)) {
      setTopic(requestedTopic)
    }
    const requestedUnit = params.get("unit")
    if (requestedUnit) setCurriculumUnit(requestedUnit)
    const requestedSubtopic = params.get("subtopic")
    if (requestedSubtopic) setTargetSubtopic(requestedSubtopic)
    const requestedSource = params.get("source")
    if (requestedSource === "database") setQuestionSource("Database Only")
    if (requestedSource === "ai") setQuestionSource("AI Only")
    if (requestedSource === "hybrid") setQuestionSource("Hybrid")

    if (!isSupabaseConfigured()) return
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      const signedIn = Boolean(data.user)
      setIsLoggedIn(signedIn)
      if (signedIn) {
        getUserProfile().then((result) => {
          if (result.ok) setCurriculumId(result.data.selectedCurriculum)
        })
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const signedIn = Boolean(session?.user)
      setIsLoggedIn(signedIn)
      if (signedIn) {
        getUserProfile().then((result) => {
          if (result.ok) setCurriculumId(result.data.selectedCurriculum)
        })
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const guestRemaining = useMemo(
    () => Math.max(0, GUEST_LIMIT - guestUsage.count),
    [guestUsage.count],
  )
  const curriculum = useMemo(() => getCurriculum(curriculumId), [curriculumId])
  const topicOptions = useMemo(
    () => getTopicsForUnit(curriculum, curriculumUnit),
    [curriculum, curriculumUnit],
  )
  const subtopicOptions = useMemo(
    () => getSubtopicsForCurriculumTopic(curriculum, topic, curriculumUnit),
    [curriculum, curriculumUnit, topic],
  )

  const score = useMemo(() => {
    const total = practiceSet?.questions.length ?? 0
    const correct = Object.values(marks).filter((value) => value === "correct").length
    const missed = Object.values(marks).filter((value) => value === "missed").length
    const attempted = correct + missed
    const unmarked = Math.max(0, total - attempted)
    const percentage = attempted ? Math.round((correct / attempted) * 100) : 0
    return { total, correct, missed, attempted, unmarked, percentage }
  }, [marks, practiceSet])

  const warnings = useMemo(
    () => practiceSet?.questions.flatMap((question, index) => qualityWarnings(question, index)) ?? [],
    [practiceSet],
  )

  const needsAi = questionSource !== "Database Only" && !(questionSource === "Hybrid" && Number(questionCount) === 1)

  useEffect(() => {
    if (topicOptions.length > 0 && !topicOptions.includes(topic)) {
      setTopic(topicOptions[0])
    }
  }, [topic, topicOptions])

  useEffect(() => {
    if (targetSubtopic !== "all" && !subtopicOptions.includes(targetSubtopic)) {
      setTargetSubtopic("all")
    }
  }, [subtopicOptions, targetSubtopic])

  useEffect(() => {
    if (
      !isLoggedIn ||
      !practiceSet ||
      sessionCompletionAwarded ||
      score.total === 0 ||
      score.attempted !== score.total
    ) {
      return
    }

    let cancelled = false
    applyProfileReward({ xp: 5, completedSessions: 1 }).then((result) => {
      if (cancelled) return
      setSessionCompletionAwarded(true)
      setProgressMessage(
        result.ok
          ? "Practice set complete. +5 XP completion bonus awarded."
          : `Practice set complete. Completion XP was not saved: ${result.error}`,
      )
    })

    return () => {
      cancelled = true
    }
  }, [isLoggedIn, practiceSet, score.attempted, score.total, sessionCompletionAwarded])

  async function generateQuestionSet() {
    if (loading) return

    if (needsAi && !isLoggedIn && guestRemaining <= 0) {
      setError("Daily guest AI assistant limit reached. Sign in for a higher limit.")
      return
    }

    setLoading(true)
    setError(null)
    setPracticeSet(null)
    setRevealedAnswers({})
    setRevealedExplanations({})
    setMarks({})
    setSessionCompletionAwarded(false)
    setCopied(null)
    setProgressMessage(null)

    try {
      const totalCount = Number(questionCount)
      const databaseCount =
        questionSource === "Database Only" ? totalCount : questionSource === "Hybrid" ? Math.ceil(totalCount / 2) : 0
      const aiCount =
        questionSource === "AI Only" ? totalCount : questionSource === "Hybrid" ? Math.floor(totalCount / 2) : 0

      const databaseQuestions =
        databaseCount > 0
          ? generateDatabaseQuestions({
              topic,
              difficulty,
              count: databaseCount,
              curriculum: curriculumId,
              unit: curriculumUnit === "all" ? undefined : curriculumUnit,
              questionType,
              targetSubtopic: targetSubtopic === "all" ? undefined : targetSubtopic,
            })
          : []

      let aiQuestions: PracticeQuestion[] = []
      if (aiCount > 0) {
        const response = await fetch("/api/ai", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            task: "practice-generator",
            topic,
            questionType,
            difficulty,
            curriculumStyle,
            questionCount: aiCount,
            curriculumId,
            curriculumUnit: curriculumUnit === "all" ? undefined : curriculumUnit,
            targetSubtopic: targetSubtopic === "all" ? undefined : targetSubtopic,
          }),
        })
        const data = await response.json()

        if (!response.ok || !data.ok || !data.practiceSet) {
          if (questionSource === "Hybrid" && databaseQuestions.length > 0) {
            setPracticeSet({ questions: databaseQuestions })
            setError(data.message || "AI Assistant temporarily unavailable. Database questions were generated instead.")
            return
          }
          setError(data.message || "AI Assistant temporarily unavailable")
          return
        }

        aiQuestions = data.practiceSet.questions.map((question: PracticeQuestion) => ({
          ...question,
          source: "ai",
        }))
        setRemaining(typeof data.remaining === "number" ? data.remaining : null)
      }

      const mergedQuestions =
        questionSource === "Hybrid"
          ? Array.from({ length: totalCount }, (_unused, index) =>
              index % 2 === 0 ? databaseQuestions.shift() : aiQuestions.shift(),
            ).filter((question): question is PracticeQuestion => Boolean(question))
          : [...databaseQuestions, ...aiQuestions]

      setPracticeSet({ questions: mergedQuestions })

      if (needsAi && !isLoggedIn) {
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

  function downloadPracticeSetPdf() {
    if (!practiceSet) return
    downloadQuestionPdf({
      filename: "arshlab-practice-set.pdf",
      title: "ARSHLAB",
      subtitle: "Generated Practice Set",
      metadata: [
        { label: "Topic", value: topic },
        { label: "Curriculum", value: curriculum.name },
        { label: "Unit", value: curriculumUnit === "all" ? "Recommended / All" : curriculum.units.find((unit) => unit.id === curriculumUnit)?.title ?? curriculumUnit },
        { label: "Subtopic", value: targetSubtopic === "all" ? "Any supported subtopic" : targetSubtopic },
        { label: "Question Type", value: questionType },
        { label: "Difficulty", value: difficulty },
        { label: "Curriculum", value: curriculumStyle },
        { label: "Date Generated", value: generatedDateLabel() },
        { label: "Number of Questions", value: practiceSet.questions.length },
      ],
      questions: toPracticePdfQuestions(practiceSet),
    })
  }

  function downloadPracticeAnswerKeyPdf() {
    if (!practiceSet) return
    downloadAnswerKeyPdf({
      filename: "arshlab-practice-answer-key.pdf",
      title: "Practice Set Answer Key",
      metadata: [
        { label: "Topic", value: topic },
        { label: "Curriculum", value: curriculum.name },
        { label: "Difficulty", value: difficulty },
        { label: "Date Generated", value: generatedDateLabel() },
        { label: "Number of Questions", value: practiceSet.questions.length },
      ],
      questions: toPracticePdfQuestions(practiceSet),
    })
  }

  function toggleAnswer(id: string) {
    setRevealedAnswers((current) => ({ ...current, [id]: !current[id] }))
  }

  function toggleExplanation(id: string) {
    setRevealedExplanations((current) => ({ ...current, [id]: !current[id] }))
  }

  async function markQuestion(question: PracticeQuestion, status: MarkStatus) {
    const id = question.id
    if (marks[id]) return

    setMarks((current) => ({ ...current, [id]: status }))
    setProgressMessage(null)

    if (!isLoggedIn) {
      setProgressMessage("Local score updated. Sign in to save practice progress permanently.")
      return
    }

    const isCorrect = status === "correct"
    const result = await addPracticeProgress({
      topic: question.topic,
      subtopic: question.subtopic,
      difficulty: question.difficulty,
      questionType: question.questionType,
      source: question.source ?? "ai",
      correct: isCorrect,
    })

    if (!result.ok) {
      setProgressMessage(`Progress was not saved: ${result.error}`)
      return
    }

    if (!isCorrect) {
      setProgressMessage("Progress saved.")
      return
    }

    const rewardResult = await applyProfileReward({ xp: 10 })
    setProgressMessage(
      rewardResult.ok
        ? "Progress saved. +10 XP awarded."
        : `Progress saved. XP was not updated: ${rewardResult.error}`,
    )
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Practice Generator</h1>
              <p className="text-muted-foreground">Original chemistry study sessions from database templates, AI, or hybrid mode</p>
            </div>
          </div>
          <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
            Generate 1, 5, 10, or 20 focused practice questions, reveal answers when ready, and self-mark the session.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <motion.main initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FlaskConical className="h-5 w-5" />
                    Generator Settings
                  </CardTitle>
                  <Badge variant="secondary">
                    {isLoggedIn
                      ? !needsAi
                        ? "Database mode: no AI usage"
                        : remaining === null
                        ? "Signed in"
                        : `${remaining} account AI requests left`
                      : needsAi
                        ? `${guestRemaining} guest AI requests left today`
                        : "Database mode: no AI usage"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <Picker
                    label="Curriculum"
                    value={curriculumId}
                    options={curricula.map((item) => item.id)}
                    optionLabels={Object.fromEntries(curricula.map((item) => [item.id, item.name]))}
                    onChange={(value) => setCurriculumId(value as CurriculumId)}
                  />
                  <Picker
                    label="Curriculum Unit"
                    value={curriculumUnit}
                    options={["all", ...curriculum.units.map((unit) => unit.id)]}
                    optionLabels={{
                      all: "Recommended / All Units",
                      ...Object.fromEntries(curriculum.units.map((unit) => [unit.id, unit.title])),
                    }}
                    onChange={setCurriculumUnit}
                  />
                  <Picker label="Topic" value={topic} options={topicOptions.length ? topicOptions : topics} onChange={setTopic} />
                  <Picker
                    label="Subtopic"
                    value={targetSubtopic}
                    options={["all", ...subtopicOptions]}
                    optionLabels={{ all: "Any supported subtopic" }}
                    onChange={setTargetSubtopic}
                  />
                  <Picker label="Question Type" value={questionType} options={questionTypes} onChange={setQuestionType} />
                  <Picker label="Difficulty" value={difficulty} options={difficulties} onChange={setDifficulty} />
                  <Picker
                    label="Curriculum Style"
                    value={curriculumStyle}
                    options={curriculumStyles}
                    onChange={setCurriculumStyle}
                  />
                  <Picker
                    label="Number of Questions"
                    value={questionCount}
                    options={questionCounts}
                    onChange={setQuestionCount}
                  />
                  <Picker
                    label="Question Source"
                    value={questionSource}
                    options={[...questionSources]}
                    onChange={(value) => setQuestionSource(value as QuestionSourceMode)}
                  />
                </div>

                <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Database mode uses no AI requests. Hybrid alternates database and AI questions when AI is available.
                  </p>
                  <Button
                    onClick={generateQuestionSet}
                    disabled={loading || (needsAi && !isLoggedIn && guestRemaining <= 0)}
                    className="h-11 rounded-xl"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : questionSource === "Database Only" ? (
                      <Database className="h-4 w-4" />
                    ) : (
                      <Sparkles className="h-4 w-4" />
                    )}
                    {loading ? "Generating..." : "Generate Set"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {error && (
              <Alert className="rounded-2xl border-amber-500/30 bg-amber-500/10">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{error.includes("temporarily unavailable") ? "AI Assistant temporarily unavailable" : "Generator stopped"}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {practiceSet && (
              <>
                {progressMessage && (
                  <Alert className="rounded-2xl border-teal-500/30 bg-teal-500/10">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Progress</AlertTitle>
                    <AlertDescription>{progressMessage}</AlertDescription>
                  </Alert>
                )}

                <Card className="rounded-2xl border-primary/20 bg-primary/5">
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <ClipboardList className="h-5 w-5" />
                        Study Session
                      </CardTitle>
                      <div className="flex flex-wrap gap-2">
                      <Badge>{questionType}</Badge>
                      <Badge variant="secondary">{difficulty}</Badge>
                      <Badge variant="outline">{curriculumStyle}</Badge>
                      <Badge variant="outline">{questionSource}</Badge>
                    </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <Alert className="rounded-2xl border-amber-500/30 bg-amber-500/10">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Generated practice may contain mistakes.</AlertTitle>
                      <AlertDescription>
                        Database questions are deterministic; AI questions may vary. Verify important answers independently.
                      </AlertDescription>
                    </Alert>

                    {warnings.length > 0 && (
                      <Alert className="rounded-2xl border-orange-500/30 bg-orange-500/10">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Quality warnings</AlertTitle>
                        <AlertDescription>
                          <ul className="mt-2 space-y-1">
                            {warnings.slice(0, 6).map((warning) => (
                              <li key={warning}>{warning}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className="flex flex-wrap gap-2">
                      <Button variant="secondary" className="rounded-xl" onClick={() => copyText("entire-set", formatEntireSet(practiceSet))}>
                        <Copy className="h-4 w-4" />
                        {copied === "entire-set" ? "Copied" : "Copy Entire Set"}
                      </Button>
                      <Button variant="secondary" className="rounded-xl" onClick={() => copyText("questions-only", formatQuestionsOnly(practiceSet))}>
                        <Copy className="h-4 w-4" />
                        {copied === "questions-only" ? "Copied" : "Copy Questions Only"}
                      </Button>
                      <Button variant="secondary" className="rounded-xl" onClick={() => copyText("answer-key", formatAnswerKey(practiceSet))}>
                        <Copy className="h-4 w-4" />
                        {copied === "answer-key" ? "Copied" : "Copy Answer Key"}
                      </Button>
                      <Button variant="outline" className="rounded-xl" onClick={downloadPracticeSetPdf}>
                        <Download className="h-4 w-4" />
                        Download PDF
                      </Button>
                      <Button variant="outline" className="rounded-xl" onClick={downloadPracticeAnswerKeyPdf}>
                        <Download className="h-4 w-4" />
                        Download Answer Key PDF
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {practiceSet.questions.map((question, index) => (
                        <QuestionCard
                          key={question.id}
                          question={question}
                          index={index}
                          answerVisible={Boolean(revealedAnswers[question.id])}
                          explanationVisible={Boolean(revealedExplanations[question.id])}
                          mark={marks[question.id]}
                          copied={copied}
                          onToggleAnswer={() => toggleAnswer(question.id)}
                          onToggleExplanation={() => toggleExplanation(question.id)}
                          onMark={(status) => void markQuestion(question, status)}
                          onCopyQuestion={() => copyText(`question-${question.id}`, formatQuestion(question, index))}
                          onCopySolution={() => copyText(`solution-${question.id}`, formatSolution(question, index))}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Trophy className="h-5 w-5" />
                      Session Summary
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
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldCheck className="h-5 w-5" />
                  Safety And Usage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Uses the same server-side OpenRouter route as the AI Chemistry Assistant.</p>
                <p>Database Only mode uses local chemistry records and makes no API calls.</p>
                <p>AI Only and Hybrid keep the same free-model guardrails, and the page never sends a model ID.</p>
                <p>One AI or Hybrid generated set counts as one AI request.</p>
                <p>Curriculum unit and subtopic selectors constrain the prompt but never select the AI model.</p>
                <p>Signed-in self-marked progress is saved with Supabase RLS. Generated question text is not stored.</p>
                <p>No official exam-board or copied past-paper material.</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ListChecks className="h-5 w-5" />
                  Topics
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {topics.map((item) => (
                  <Badge key={item} variant="secondary" className="rounded-full">
                    {item}
                  </Badge>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-dashed">
              <CardContent className="space-y-3 p-5 text-sm text-muted-foreground">
                <div className="flex items-start gap-3">
                  <GraduationCap className="mt-0.5 h-5 w-5 shrink-0" />
                  <p>
                    Curriculum labels guide tone and difficulty. Generated questions are still independent ARSHLAB materials.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <BookOpen className="mt-0.5 h-5 w-5 shrink-0" />
                  <p>
                    For assessment prep, compare generated explanations with your textbook, teacher notes, and course specification.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.aside>
        </div>
      </div>
    </div>
  )
}

function QuestionCard({
  question,
  index,
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
  question: PracticeQuestion
  index: number
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
          <Badge>Question {index + 1}</Badge>
          <Badge variant="secondary">{question.topic}</Badge>
          <Badge variant="outline">{question.subtopic}</Badge>
          <Badge variant={question.source === "database" ? "default" : "secondary"}>
            {question.source === "database" ? "Database Generated" : "AI Generated"}
          </Badge>
        </div>
        {mark && (
          <Badge variant={mark === "correct" ? "default" : "destructive"}>
            {mark === "correct" ? "Marked right" : "Marked missed"}
          </Badge>
        )}
      </div>

      <p className="break-words text-base leading-relaxed text-foreground">{question.question}</p>

      {question.choices?.length ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {question.choices.map((choice) => (
            <div
              key={choice.label}
              className={
                answerVisible && answerMatchesChoice(question, choice)
                  ? "rounded-xl border border-primary bg-primary/10 p-4 text-sm"
                  : "rounded-xl border border-border bg-secondary/20 p-4 text-sm"
              }
            >
              <span className="font-semibold">{choice.label}.</span> {choice.text}
            </div>
          ))}
        </div>
      ) : null}

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
          {copied === `question-${question.id}` ? "Copied" : "Copy Question"}
        </Button>
        <Button variant="secondary" className="min-h-11 rounded-xl" onClick={onCopySolution}>
          <Copy className="h-4 w-4" />
          {copied === `solution-${question.id}` ? "Copied" : "Copy Full Solution"}
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
              {question.misconceptionNote && (
                <div className="mt-3 border-t border-border pt-3">
                  <h4 className="mb-1 text-sm font-semibold">Misconception Note</h4>
                  <p className="break-words text-sm leading-relaxed text-muted-foreground">
                    {question.misconceptionNote}
                  </p>
                </div>
              )}
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
}: {
  label: string
  value: string
  options: string[]
  optionLabels?: Record<string, string>
  onChange: (value: string) => void
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
              {optionLabels?.[option] ?? option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}
