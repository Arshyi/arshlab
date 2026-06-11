"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Copy,
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

const GUEST_USAGE_KEY = "arshlab-ai-guest-usage"
const GUEST_LIMIT = 3

const topics = [
  "Functional group identification",
  "Hybridization",
  "VSEPR geometry",
  "Periodic trends",
  "Electron configuration",
  "IR spectroscopy peak identification",
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

const questionCounts = ["1", "3", "5"]

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
  questionType: string
  difficulty: string
  curriculumStyle: string
  prompt: string
  choices?: PracticeChoice[]
  correctAnswer: string
  explanation: string
  misconceptionNote?: string
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
  return `Question ${index + 1}: ${question.prompt}${choices}`
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

  const promptWords = wordCount(question.prompt)
  const genericPhrases = [
    "which of the following is correct",
    "explain this concept",
    "what is chemistry",
  ]
  if (promptWords < 8 || genericPhrases.some((phrase) => normalizeText(question.prompt).includes(phrase))) {
    warnings.push(`Question ${index + 1}: prompt may be too generic.`)
  }

  return warnings
}

export function PracticeGeneratorClient() {
  const [topic, setTopic] = useState(topics[0])
  const [questionType, setQuestionType] = useState(questionTypes[0])
  const [difficulty, setDifficulty] = useState(difficulties[0])
  const [curriculumStyle, setCurriculumStyle] = useState(curriculumStyles[0])
  const [questionCount, setQuestionCount] = useState("1")
  const [practiceSet, setPracticeSet] = useState<PracticeSet | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [revealedAnswers, setRevealedAnswers] = useState<Record<string, boolean>>({})
  const [revealedExplanations, setRevealedExplanations] = useState<Record<string, boolean>>({})
  const [marks, setMarks] = useState<Record<string, MarkStatus>>({})
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

  async function generateQuestionSet() {
    if (loading) return

    if (!isLoggedIn && guestRemaining <= 0) {
      setError("Daily guest AI assistant limit reached. Sign in for a higher limit.")
      return
    }

    setLoading(true)
    setError(null)
    setPracticeSet(null)
    setRevealedAnswers({})
    setRevealedExplanations({})
    setMarks({})
    setCopied(null)

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: "practice-generator",
          topic,
          questionType,
          difficulty,
          curriculumStyle,
          questionCount: Number(questionCount),
        }),
      })
      const data = await response.json()

      if (!response.ok || !data.ok || !data.practiceSet) {
        setError(data.message || "AI Assistant temporarily unavailable")
        return
      }

      setPracticeSet(data.practiceSet)
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

  function toggleAnswer(id: string) {
    setRevealedAnswers((current) => ({ ...current, [id]: !current[id] }))
  }

  function toggleExplanation(id: string) {
    setRevealedExplanations((current) => ({ ...current, [id]: !current[id] }))
  }

  function markQuestion(id: string, status: MarkStatus) {
    setMarks((current) => ({ ...current, [id]: status }))
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
              <p className="text-muted-foreground">Original AI-assisted chemistry study sessions with free-model guardrails</p>
            </div>
          </div>
          <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
            Generate one, three, or five focused practice questions, reveal answers when ready, and self-mark the session.
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
                      ? remaining === null
                        ? "Signed in"
                        : `${remaining} account AI requests left`
                      : `${guestRemaining} guest AI requests left today`}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2">
                  <Picker label="Topic" value={topic} options={topics} onChange={setTopic} />
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
                </div>

                <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    One generated set counts as one AI request, even when it contains multiple questions.
                  </p>
                  <Button
                    onClick={generateQuestionSet}
                    disabled={loading || (!isLoggedIn && guestRemaining <= 0)}
                    className="h-11 rounded-xl"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
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
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-5">
                    <Alert className="rounded-2xl border-amber-500/30 bg-amber-500/10">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>AI-generated practice may contain mistakes.</AlertTitle>
                      <AlertDescription>Verify answers independently before relying on them.</AlertDescription>
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
                          onMark={(status) => markQuestion(question.id, status)}
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
                <p>Only configured free models are allowed, and the page never sends a model ID.</p>
                <p>One generated set counts as one AI request.</p>
                <p>No generated questions, answers, or scores are saved in this alpha.</p>
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
        </div>
        {mark && (
          <Badge variant={mark === "correct" ? "default" : "destructive"}>
            {mark === "correct" ? "Marked right" : "Marked missed"}
          </Badge>
        )}
      </div>

      <p className="break-words text-base leading-relaxed text-foreground">{question.prompt}</p>

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
  onChange,
}: {
  label: string
  value: string
  options: string[]
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
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </label>
  )
}
