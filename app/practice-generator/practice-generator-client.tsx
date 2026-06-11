"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  FlaskConical,
  GraduationCap,
  ListChecks,
  Loader2,
  ShieldCheck,
  Sparkles,
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

interface GuestUsage {
  date: string
  count: number
}

interface PracticeChoice {
  label: string
  text: string
}

interface PracticeResult {
  topic: string
  questionType: string
  difficulty: string
  curriculumStyle: string
  question: string
  choices?: PracticeChoice[]
  correctChoice?: string
  answer: string
  explanation: string
  misconceptionNotes?: string
  markingGuidance?: string
  keyPoints?: string[]
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
    // The server route still enforces the conservative guest limit.
  }
}

function formatQuestion(result: PracticeResult): string {
  const choices = result.choices?.length
    ? `\n\n${result.choices.map((choice) => `${choice.label}. ${choice.text}`).join("\n")}`
    : ""
  return `${result.question}${choices}`
}

function formatSolution(result: PracticeResult): string {
  const sections = [
    formatQuestion(result),
    `Answer: ${result.answer}`,
    `Explanation: ${result.explanation}`,
  ]

  if (result.misconceptionNotes) sections.push(`Misconception notes: ${result.misconceptionNotes}`)
  if (result.markingGuidance) sections.push(`Marking guidance: ${result.markingGuidance}`)
  if (result.keyPoints?.length) sections.push(`Key points: ${result.keyPoints.join("; ")}`)

  return sections.join("\n\n")
}

export function PracticeGeneratorClient() {
  const [topic, setTopic] = useState(topics[0])
  const [questionType, setQuestionType] = useState(questionTypes[0])
  const [difficulty, setDifficulty] = useState(difficulties[0])
  const [curriculumStyle, setCurriculumStyle] = useState(curriculumStyles[0])
  const [result, setResult] = useState<PracticeResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [showAnswer, setShowAnswer] = useState(false)
  const [showExplanation, setShowExplanation] = useState(false)
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

  async function generateQuestion() {
    if (loading) return

    if (!isLoggedIn && guestRemaining <= 0) {
      setError("Daily guest AI assistant limit reached. Sign in for a higher limit.")
      return
    }

    setLoading(true)
    setError(null)
    setResult(null)
    setShowAnswer(false)
    setShowExplanation(false)
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
        }),
      })
      const data = await response.json()

      if (!response.ok || !data.ok || !data.practice) {
        setError(data.message || "AI Assistant temporarily unavailable")
        return
      }

      setResult(data.practice)
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
              <p className="text-muted-foreground">Original AI-assisted chemistry questions with free-model guardrails</p>
            </div>
          </div>
          <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
            Generate one focused practice question at a time, then reveal the answer and explanation when you are ready.
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
                </div>

                <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Generated practice questions are original educational materials and may contain mistakes.
                  </p>
                  <Button
                    onClick={generateQuestion}
                    disabled={loading || (!isLoggedIn && guestRemaining <= 0)}
                    className="h-11 rounded-xl"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    {loading ? "Generating..." : "Generate Question"}
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

            {result && (
              <Card className="rounded-2xl border-primary/20 bg-primary/5">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <CheckCircle2 className="h-5 w-5" />
                      Generated Practice
                    </CardTitle>
                    <div className="flex flex-wrap gap-2">
                      <Badge>{result.questionType}</Badge>
                      <Badge variant="secondary">{result.difficulty}</Badge>
                      <Badge variant="outline">{result.curriculumStyle}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{result.topic}</p>
                    <p className="text-base leading-relaxed text-foreground">{result.question}</p>
                  </div>

                  {result.choices?.length ? (
                    <div className="grid gap-3 sm:grid-cols-2">
                      {result.choices.map((choice) => (
                        <div
                          key={choice.label}
                          className={
                            showAnswer && choice.label === result.correctChoice
                              ? "rounded-xl border border-primary bg-primary/10 p-4 text-sm"
                              : "rounded-xl border border-border bg-card/80 p-4 text-sm"
                          }
                        >
                          <span className="font-semibold">{choice.label}.</span> {choice.text}
                        </div>
                      ))}
                    </div>
                  ) : null}

                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" className="rounded-xl" onClick={() => setShowAnswer((value) => !value)}>
                      {showAnswer ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {showAnswer ? "Hide Answer" : "Reveal Answer"}
                    </Button>
                    <Button variant="outline" className="rounded-xl" onClick={() => setShowExplanation((value) => !value)}>
                      {showExplanation ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {showExplanation ? "Hide Explanation" : "Reveal Explanation"}
                    </Button>
                    <Button variant="secondary" className="rounded-xl" onClick={() => copyText("question", formatQuestion(result))}>
                      <Copy className="h-4 w-4" />
                      {copied === "question" ? "Copied" : "Copy Question"}
                    </Button>
                    <Button variant="secondary" className="rounded-xl" onClick={() => copyText("solution", formatSolution(result))}>
                      <Copy className="h-4 w-4" />
                      {copied === "solution" ? "Copied" : "Copy Full Solution"}
                    </Button>
                  </div>

                  {showAnswer && (
                    <div className="rounded-2xl border border-primary/30 bg-card p-4">
                      <h3 className="mb-2 font-semibold">Answer</h3>
                      <p className="text-sm leading-relaxed text-muted-foreground">{result.answer}</p>
                    </div>
                  )}

                  {showExplanation && (
                    <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
                      <div>
                        <h3 className="mb-2 font-semibold">Explanation</h3>
                        <p className="text-sm leading-relaxed text-muted-foreground">{result.explanation}</p>
                      </div>
                      {result.misconceptionNotes && (
                        <div>
                          <h4 className="mb-1 text-sm font-semibold">Misconception Notes</h4>
                          <p className="text-sm leading-relaxed text-muted-foreground">{result.misconceptionNotes}</p>
                        </div>
                      )}
                      {result.markingGuidance && (
                        <div>
                          <h4 className="mb-1 text-sm font-semibold">Marking Guidance</h4>
                          <p className="text-sm leading-relaxed text-muted-foreground">{result.markingGuidance}</p>
                        </div>
                      )}
                      {result.keyPoints?.length ? (
                        <div>
                          <h4 className="mb-1 text-sm font-semibold">Key Points</h4>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            {result.keyPoints.map((point) => (
                              <li key={point} className="flex gap-2">
                                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                                <span>{point}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </div>
                  )}

                  <p className="border-t border-border pt-3 text-xs text-muted-foreground">
                    Generated practice questions are original educational materials and may contain mistakes. Verify important answers independently.
                  </p>
                </CardContent>
              </Card>
            )}
          </motion.main>

          <motion.aside initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldCheck className="h-5 w-5" />
                  Safety Rules
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Uses the same server-side OpenRouter route as the AI Chemistry Assistant.</p>
                <p>Only configured free models are allowed, and the page never sends a model ID.</p>
                <p>No generated questions are saved in this alpha.</p>
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
                    Curriculum labels guide tone and difficulty. The generated question is still independent ARSHLAB material.
                  </p>
                </div>
                <div className="flex items-start gap-3">
                  <BookOpen className="mt-0.5 h-5 w-5 shrink-0" />
                  <p>
                    For assessment prep, compare the explanation with your textbook, teacher notes, and course specification.
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
