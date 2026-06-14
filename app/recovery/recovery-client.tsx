"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Download,
  Flame,
  Loader2,
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
  getUnitForTopic,
  type CurriculumId,
} from "@/lib/curriculum/curriculum-registry"
import {
  buildRecoveryPlan,
  calculateConceptRecoveryOutcomes,
  calculateConceptStats,
  calculateRecoveryOutcomes,
  calculateTopicStats,
  detectWeakConcepts,
  detectWeakTopics,
  type LearningConceptStats,
  type LearningTopicStats,
  type RecoveryOutcome,
  type RecoveryPlanItem,
} from "@/lib/learning/recovery"
import { prioritizeRecoveryTopics } from "@/lib/learning/recommendations"
import {
  downloadAnswerKeyPdf,
  downloadQuestionPdf,
  generatedDateLabel,
  type PdfQuestion,
  type RecoverySummaryRow,
} from "@/lib/pdf/arshlab-pdf"
import { generateDatabaseQuestions } from "@/lib/question-engine/generator"

interface PracticeChoice {
  label: string
  text: string
}

interface RecoveryQuestion {
  id: string
  topic: string
  subtopic: string
  questionType: string
  difficulty: string
  curriculumStyle: string
  question: string
  choices: PracticeChoice[]
  correctAnswer: string
  explanation: string
  misconceptionNote?: string
  source?: "ai" | "database"
}

interface RecoverySet {
  questions: RecoveryQuestion[]
}

interface AnswerRecord {
  choice: PracticeChoice
  correct: boolean
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

function isDatabaseRecoveryPlan(plan: RecoveryPlanItem[]): boolean {
  return plan.some((item) =>
    [item.topic, ...item.weaknesses].some((value) => {
      const normalized = normalizeText(value)
      return (
        normalized.includes("spectroscopy") ||
        normalized.includes("carbonyl") ||
        normalized.includes("stretch") ||
        normalized.includes("reaction") ||
        normalized.includes("redox") ||
        normalized.includes("precipitation") ||
        normalized.includes("combustion") ||
        normalized.includes("balancing")
      )
    }),
  )
}

function generateDatabaseRecoverySet(plan: RecoveryPlanItem[]): RecoverySet {
  const questions = plan.flatMap((item) =>
    generateDatabaseQuestions({
      topic: item.topic === "IR Spectroscopy" ? "Spectroscopy" : item.topic,
      targetSubtopic: item.weaknesses[0] ?? (item.topic === "IR Spectroscopy" ? "IR Spectroscopy" : undefined),
      difficulty: item.difficulty,
      count: item.count,
      curriculum: "general-first-year",
    }).map((question) => ({
      id: question.id,
      topic: question.topic,
      subtopic: question.subtopic,
      questionType: question.questionType,
      difficulty: question.difficulty,
      curriculumStyle: question.curriculumStyle,
      question: question.question,
      choices: question.choices,
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
      misconceptionNote: question.misconceptionNote,
      source: question.source,
    })),
  )
  return { questions: questions.slice(0, 10) }
}

function answerMatchesChoice(question: RecoveryQuestion, choice: PracticeChoice): boolean {
  const answer = normalizeText(question.correctAnswer)
  const label = normalizeText(choice.label)
  const text = normalizeText(choice.text)
  return answer === label || answer === text || answer === `${label}. ${text}`
}

function toRecoveryPdfQuestions(set: RecoverySet): PdfQuestion[] {
  return set.questions.map((question, index) => ({
    questionNumber: index + 1,
    question: question.question,
    choices: question.choices,
    correctAnswer: question.correctAnswer,
    explanation: question.explanation,
    topic: question.topic,
    subtopic: question.subtopic,
  }))
}

function roleLabel(role: RecoveryPlanItem["role"]): string {
  switch (role) {
    case "weakest":
      return "Weakest topic"
    case "second-weakest":
      return "Second weakest"
    case "review":
      return "Random review"
    default:
      return "Recovery"
  }
}

export function RecoveryClient() {
  const [entries, setEntries] = useState<PracticeProgressEntry[]>([])
  const [curriculumId, setCurriculumId] = useState<CurriculumId>(DEFAULT_CURRICULUM_ID)
  const [loadingData, setLoadingData] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [recoverySet, setRecoverySet] = useState<RecoverySet | null>(null)
  const [plan, setPlan] = useState<RecoveryPlanItem[]>([])
  const [baselineStats, setBaselineStats] = useState<LearningTopicStats[]>([])
  const [baselineConceptStats, setBaselineConceptStats] = useState<LearningConceptStats[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedChoice, setSelectedChoice] = useState<PracticeChoice | null>(null)
  const [answers, setAnswers] = useState<Record<string, AnswerRecord>>({})
  const [currentStreak, setCurrentStreak] = useState(0)
  const [sessionComplete, setSessionComplete] = useState(false)
  const [completionAwarded, setCompletionAwarded] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)

  const loadProgress = useCallback(async () => {
    setLoadingData(true)
    setError(null)

    if (!isSupabaseConfigured()) {
      setEntries([])
      setIsLoggedIn(false)
      setError("Supabase is not configured, so Recovery Mode cannot read saved practice progress.")
      setLoadingData(false)
      return
    }

    const supabase = createClient()
    const { data } = await supabase.auth.getUser()
    const signedIn = Boolean(data.user)
    setIsLoggedIn(signedIn)

    if (!signedIn) {
      setEntries([])
      setLoadingData(false)
      return
    }

    const result = await getPracticeProgress(800)
    const profileResult = await getUserProfile()
    if (profileResult.ok) setCurriculumId(profileResult.data.selectedCurriculum)
    if (result.ok) {
      setEntries(result.data)
    } else {
      setEntries([])
      setError(result.error)
    }
    setLoadingData(false)
  }, [])

  useEffect(() => {
    void loadProgress()

    if (!isSupabaseConfigured()) return
    const supabase = createClient()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session?.user))
      void loadProgress()
    })

    return () => subscription.unsubscribe()
  }, [loadProgress])

  const allStats = useMemo(() => calculateTopicStats(entries), [entries])
  const selectedCurriculum = useMemo(() => getCurriculum(curriculumId), [curriculumId])
  const conceptStats = useMemo(() => calculateConceptStats(entries), [entries])
  const weakTopics = useMemo(() => detectWeakTopics(entries), [entries])
  const weakConcepts = useMemo(() => detectWeakConcepts(entries), [entries])
  const prioritizedRecoveryTopics = useMemo(
    () => prioritizeRecoveryTopics(entries, curriculumId),
    [curriculumId, entries],
  )
  const weakAreaTopics = useMemo(() => {
    const adaptiveTopics = prioritizedRecoveryTopics.filter(
      (topic) => topic.accuracy < 70 || topic.missed > 0,
    )
    if (adaptiveTopics.length > 0) return adaptiveTopics
    if (weakTopics.length > 0) return weakTopics

    const groups = new Map<string, { attempted: number; correct: number }>()
    for (const concept of weakConcepts) {
      const current = groups.get(concept.topic) ?? { attempted: 0, correct: 0 }
      current.attempted += concept.attempted
      current.correct += concept.correct
      groups.set(concept.topic, current)
    }

    return Array.from(groups.entries())
      .map(([topic, stats]) => ({
        topic,
        attempted: stats.attempted,
        correct: stats.correct,
        missed: stats.attempted - stats.correct,
        accuracy: stats.attempted ? Math.round((stats.correct / stats.attempted) * 100) : 0,
      }))
      .sort((a, b) => a.accuracy - b.accuracy || b.attempted - a.attempted)
  }, [prioritizedRecoveryTopics, weakConcepts, weakTopics])
  const currentQuestion = recoverySet?.questions[currentIndex] ?? null
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined
  const totalQuestions = recoverySet?.questions.length ?? 0
  const answeredCount = Object.keys(answers).length
  const correctCount = Object.values(answers).filter((answer) => answer.correct).length
  const accuracy = answeredCount ? Math.round((correctCount / answeredCount) * 100) : 0
  const questionsRemaining = recoverySet ? Math.max(0, totalQuestions - answeredCount) : 0
  const sessionProgress = totalQuestions ? Math.round((answeredCount / totalQuestions) * 100) : 0
  const focusTopics = useMemo(
    () => plan.filter((item) => item.role !== "review").map((item) => item.topic),
    [plan],
  )
  const focusSubtopics = useMemo(
    () => Array.from(new Set(plan.filter((item) => item.role !== "review").flatMap((item) => item.weaknesses))),
    [plan],
  )
  const outcomes: RecoveryOutcome[] = useMemo(() => {
    if (!recoverySet || !sessionComplete) return []
    const sessionResults = recoverySet.questions
      .map((question) => {
        const answer = answers[question.id]
        if (!answer) return null
        return { topic: question.topic, subtopic: question.subtopic, correct: answer.correct }
      })
      .filter((result): result is { topic: string; subtopic: string; correct: boolean } => Boolean(result))

    if (focusSubtopics.length > 0) {
      return calculateConceptRecoveryOutcomes(baselineConceptStats, sessionResults, focusSubtopics)
    }

    return calculateRecoveryOutcomes(baselineStats, sessionResults, focusTopics)
  }, [answers, baselineConceptStats, baselineStats, focusSubtopics, focusTopics, recoverySet, sessionComplete])

  async function generateRecoverySession() {
    if (generating || weakAreaTopics.length === 0) return

    const nextPlan = buildRecoveryPlan(weakAreaTopics, allStats, weakConcepts)
    if (nextPlan.length === 0) {
      setError("No weak topics or concepts are ready for Recovery Mode yet.")
      return
    }

    setGenerating(true)
    setError(null)
    setMessage(null)
    setRecoverySet(null)
    setPlan(nextPlan)
    setBaselineStats(allStats)
    setBaselineConceptStats(conceptStats)
    setCurrentIndex(0)
    setSelectedChoice(null)
    setAnswers({})
    setCurrentStreak(0)
    setSessionComplete(false)
    setCompletionAwarded(false)

    try {
      if (isDatabaseRecoveryPlan(nextPlan)) {
        setRecoverySet(generateDatabaseRecoverySet(nextPlan))
        setRemaining(null)
        return
      }

      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: "recovery-generator",
          plan: nextPlan.map((item) => ({
            topic: item.topic,
            count: item.count,
            difficulty: item.difficulty,
            weaknesses: item.weaknesses,
            unit: getUnitForTopic(selectedCurriculum, item.topic, item.weaknesses[0])?.title,
          })),
        }),
      })
      const data = await response.json()

      if (!response.ok || !data.ok || !data.practiceSet) {
        setError(data.message || "AI Assistant temporarily unavailable")
        return
      }

      setRecoverySet(data.practiceSet)
      setRemaining(typeof data.remaining === "number" ? data.remaining : null)
    } catch {
      setError("AI Assistant temporarily unavailable")
    } finally {
      setGenerating(false)
    }
  }

  async function answerCurrentQuestion() {
    if (!currentQuestion || !selectedChoice || currentAnswer) return

    const correct = answerMatchesChoice(currentQuestion, selectedChoice)
    setAnswers((current) => ({
      ...current,
      [currentQuestion.id]: { choice: selectedChoice, correct },
    }))
    setCurrentStreak((current) => (correct ? current + 1 : 0))
    setMessage(null)

    const progressResult = await addPracticeProgress({
      topic: currentQuestion.topic,
      subtopic: currentQuestion.subtopic,
      difficulty: currentQuestion.difficulty,
      questionType: "Recovery Mode",
      source: currentQuestion.source,
      correct,
    })

    if (!progressResult.ok) {
      setMessage(`Progress was not saved: ${progressResult.error}`)
      return
    }

    if (!correct) {
      setMessage("Recovery progress saved.")
      return
    }

    const rewardResult = await applyProfileReward({ xp: 10 })
    setMessage(
      rewardResult.ok
        ? "Correct. Recovery progress saved and +10 XP awarded."
        : `Recovery progress saved. XP was not updated: ${rewardResult.error}`,
    )
  }

  function goToNextQuestion() {
    if (!recoverySet || currentIndex >= recoverySet.questions.length - 1) return
    setCurrentIndex((current) => current + 1)
    setSelectedChoice(null)
    setMessage(null)
  }

  async function finishSession() {
    if (!recoverySet || sessionComplete) return
    setSessionComplete(true)

    if (!completionAwarded) {
      const rewardResult = await applyProfileReward({ xp: 5, completedSessions: 1 })
      setCompletionAwarded(true)
      setMessage(
        rewardResult.ok
          ? "Recovery session complete. +5 XP completion bonus awarded."
          : `Recovery session complete. Completion XP was not saved: ${rewardResult.error}`,
      )
    }

    void loadProgress()
  }

  function resetSession() {
    setRecoverySet(null)
    setPlan([])
    setBaselineStats([])
    setBaselineConceptStats([])
    setCurrentIndex(0)
    setSelectedChoice(null)
    setAnswers({})
    setCurrentStreak(0)
    setSessionComplete(false)
    setCompletionAwarded(false)
    setError(null)
    setMessage(null)
  }

  function recoverySummaryRows(): RecoverySummaryRow[] {
    const outcomeBySubtopic = new Map(outcomes.map((outcome) => [outcome.subtopic ?? outcome.topic, outcome]))
    return plan
      .filter((item) => item.role !== "review")
      .flatMap((item) =>
        item.weaknesses.map((weakness) => {
          const outcome = outcomeBySubtopic.get(weakness)
          return {
            concept: weakness,
            startingMastery: outcome ? `${outcome.before}%` : `${item.mastery}%`,
            endingMastery: outcome ? `${outcome.after}%` : "Complete session to calculate",
          }
        }),
      )
  }

  function downloadRecoverySessionPdf() {
    if (!recoverySet) return
    downloadQuestionPdf({
      filename: "arshlab-recovery-session.pdf",
      title: "ARSHLAB",
      subtitle: "Recovery Session",
      metadata: [
        { label: "Date Generated", value: generatedDateLabel() },
        { label: "Number of Questions", value: recoverySet.questions.length },
        { label: "Session Accuracy", value: `${accuracy}%` },
      ],
      recoverySummary: recoverySummaryRows(),
      questions: toRecoveryPdfQuestions(recoverySet),
      includeSolutions: true,
    })
  }

  function downloadRecoveryAnswerKeyPdf() {
    if (!recoverySet) return
    downloadAnswerKeyPdf({
      filename: "arshlab-recovery-answer-key.pdf",
      title: "Recovery Session Answer Key",
      metadata: [
        { label: "Date Generated", value: generatedDateLabel() },
        { label: "Number of Questions", value: recoverySet.questions.length },
        { label: "Session Accuracy", value: `${accuracy}%` },
      ],
      questions: toRecoveryPdfQuestions(recoverySet),
    })
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Target className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Recovery Mode</h1>
              <p className="text-muted-foreground">Targeted study sessions generated from weak concepts</p>
            </div>
          </div>
          <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
            ARSHLAB scans saved practice progress, finds topics and concepts with at least five attempts and under
            60% accuracy, then builds a 10-question recovery set with adaptive difficulty.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <motion.main initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {error && (
              <Alert className="rounded-2xl border-amber-500/30 bg-amber-500/10">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{error.includes("temporarily unavailable") ? "AI Assistant temporarily unavailable" : "Recovery stopped"}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {message && (
              <Alert className="rounded-2xl border-teal-500/30 bg-teal-500/10">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Recovery update</AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            {!isLoggedIn && !loadingData ? (
              <Card className="rounded-2xl">
                <CardContent className="py-12 text-center">
                  <Target className="mx-auto mb-4 h-10 w-10 text-muted-foreground/50" />
                  <p className="font-medium text-foreground">Sign in to use Recovery Mode.</p>
                  <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
                    Recovery Mode needs your saved practice_progress rows to detect weak topics and concepts.
                  </p>
                  <Button asChild className="mt-5 rounded-xl">
                    <Link href="/account">Sign in / Account</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-2xl">
                <CardHeader>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Target className="h-5 w-5" />
                      Weak Concepts
                    </CardTitle>
                    {remaining !== null && <Badge variant="secondary">{remaining} account AI requests left</Badge>}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-xl border border-border bg-secondary/20 p-4">
                    <p className="font-medium">Recommended Recovery for {selectedCurriculum.name}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Prioritizes weak required topics, prerequisite-style foundations, high-frequency chemistry skills,
                      and recently missed concepts from your saved progress.
                    </p>
                  </div>
                  {loadingData ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">Loading practice progress...</p>
                  ) : weakAreaTopics.length === 0 ? (
                    <div className="rounded-xl border border-border bg-secondary/20 p-5">
                      <p className="font-medium">No weak topics or concepts detected yet.</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Recovery Mode starts when a topic or concept has at least five attempts and accuracy below 60%.
                      </p>
                      <Button asChild className="mt-4 rounded-xl">
                        <Link href="/study">Build more study data</Link>
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="grid gap-3 md:grid-cols-2">
                        {weakAreaTopics.map((topic) => (
                          <div key={topic.topic} className="rounded-xl border border-border bg-card p-4">
                            <div className="mb-2 flex items-center justify-between gap-2">
                              <p className="font-medium">{topic.topic}</p>
                              <Badge variant="destructive">{topic.accuracy}%</Badge>
                            </div>
                            <Progress value={topic.accuracy} />
                            <p className="mt-2 text-xs text-muted-foreground">
                              {topic.correct} correct, {topic.missed} missed, {topic.attempted} attempted
                            </p>
                            <div className="mt-3 flex flex-wrap gap-1">
                              {weakConcepts
                                .filter((concept) => concept.topic === topic.topic)
                                .slice(0, 3)
                                .map((concept) => (
                                  <Badge key={`${topic.topic}-${concept.subtopic}`} variant="outline">
                                    {concept.subtopic} {concept.mastery}%
                                  </Badge>
                                ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <Button
                        onClick={() => void generateRecoverySession()}
                        disabled={generating}
                        className="h-12 rounded-xl"
                      >
                        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                        {generating ? "Generating..." : "Generate Recovery Session"}
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {plan.length > 0 && (
              <Card className="rounded-2xl border-primary/20 bg-primary/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Flame className="h-5 w-5" />
                    Recovery Session Builder
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-3">
                  {plan.map((item) => (
                    <div key={`${item.role}-${item.topic}`} className="rounded-xl border border-border bg-card p-4">
                      <Badge variant={item.role === "review" ? "secondary" : "default"}>{roleLabel(item.role)}</Badge>
                      <p className="mt-3 font-medium">{item.topic}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Unit: {getUnitForTopic(selectedCurriculum, item.topic, item.weaknesses[0])?.title ?? "Mixed curriculum review"}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {item.weaknesses.map((weakness) => (
                          <Badge key={weakness} variant="outline">
                            {weakness}
                          </Badge>
                        ))}
                      </div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {item.count} question{item.count === 1 ? "" : "s"} • {item.difficulty}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">Starting mastery: {item.mastery}%</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {recoverySet && currentQuestion && !sessionComplete && (
              <>
                <div className="grid gap-3 sm:grid-cols-4">
                  <SessionStat icon={Flame} label="Current Streak" value={currentStreak} />
                  <SessionStat icon={Target} label="Remaining" value={questionsRemaining} />
                  <SessionStat icon={Trophy} label="Accuracy" value={`${accuracy}%`} />
                  <SessionStat icon={Zap} label="Progress" value={`${answeredCount}/${totalQuestions}`} />
                </div>

                <Card className="rounded-2xl">
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <Target className="h-5 w-5" />
                        Recovery Question {currentIndex + 1}
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
                      <AlertTitle>AI-generated practice may contain mistakes.</AlertTitle>
                      <AlertDescription>Verify important chemistry answers independently.</AlertDescription>
                    </Alert>

                    <p className="break-words text-lg leading-relaxed text-foreground">{currentQuestion.question}</p>

                    <div className="grid gap-3 sm:grid-cols-2">
                      {currentQuestion.choices.map((choice) => {
                        const isSelected = selectedChoice?.label === choice.label
                        const isCorrect = answerMatchesChoice(currentQuestion, choice)
                        const showFeedback = Boolean(currentAnswer)
                        return (
                          <button
                            key={choice.label}
                            type="button"
                            disabled={Boolean(currentAnswer)}
                            onClick={() => setSelectedChoice(choice)}
                            className={[
                              "min-h-16 rounded-xl border p-4 text-left text-sm transition-all",
                              showFeedback && isCorrect
                                ? "border-primary bg-primary/10"
                                : showFeedback && currentAnswer?.choice.label === choice.label && !currentAnswer.correct
                                  ? "border-destructive bg-destructive/10"
                                  : isSelected
                                    ? "border-primary bg-primary/5"
                                    : "border-border bg-card hover:bg-secondary/30",
                              currentAnswer ? "cursor-default" : "cursor-pointer",
                            ].join(" ")}
                          >
                            <span className="font-semibold">{choice.label}.</span> {choice.text}
                          </button>
                        )
                      })}
                    </div>

                    {!currentAnswer ? (
                      <Button
                        onClick={() => void answerCurrentQuestion()}
                        disabled={!selectedChoice}
                        className="h-12 rounded-xl"
                      >
                        Check Answer
                      </Button>
                    ) : (
                      <div className="space-y-4">
                        <Alert
                          className={
                            currentAnswer.correct
                              ? "rounded-2xl border-teal-500/30 bg-teal-500/10"
                              : "rounded-2xl border-orange-500/30 bg-orange-500/10"
                          }
                        >
                          {currentAnswer.correct ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                          <AlertTitle>{currentAnswer.correct ? "Correct" : "Not quite"}</AlertTitle>
                          <AlertDescription>Correct answer: {currentQuestion.correctAnswer}</AlertDescription>
                        </Alert>

                        <div className="rounded-xl border border-border bg-card p-4">
                          <h3 className="mb-2 font-semibold">Explanation</h3>
                          <p className="text-sm leading-relaxed text-muted-foreground">{currentQuestion.explanation}</p>
                          {currentQuestion.misconceptionNote && (
                            <p className="mt-3 border-t border-border pt-3 text-sm leading-relaxed text-muted-foreground">
                              Misconception note: {currentQuestion.misconceptionNote}
                            </p>
                          )}
                        </div>

                        {currentIndex < totalQuestions - 1 ? (
                          <Button onClick={goToNextQuestion} className="h-12 rounded-xl">
                            Next Question
                            <ArrowRight className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button onClick={() => void finishSession()} className="h-12 rounded-xl">
                            Finish Recovery Session
                            <Trophy className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {recoverySet && sessionComplete && (
              <Card className="rounded-2xl border-teal-500/20 bg-teal-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Trophy className="h-6 w-6" />
                    Recovery Complete
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-4">
                    <ScoreTile label="Questions" value={totalQuestions} />
                    <ScoreTile label="Correct" value={correctCount} />
                    <ScoreTile label="Accuracy" value={`${accuracy}%`} />
                    <ScoreTile label="XP Earned" value={`${correctCount * 10 + 5}`} />
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    {outcomes.map((outcome) => (
                      <div key={`${outcome.topic}-${outcome.subtopic ?? "topic"}`} className="rounded-xl border border-border bg-card p-4">
                        <p className="font-medium">{outcome.subtopic ?? outcome.topic}</p>
                        {outcome.subtopic && <p className="text-xs text-muted-foreground">{outcome.topic}</p>}
                        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                          <ScoreTile label="Before" value={`${outcome.before}%`} />
                          <ScoreTile label="After" value={`${outcome.after}%`} />
                          <ScoreTile
                            label="Improvement"
                            value={`${outcome.improvement >= 0 ? "+" : ""}${outcome.improvement}%`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => void generateRecoverySession()} className="rounded-xl">
                      Generate Another Recovery Session
                    </Button>
                    <Button variant="outline" className="rounded-xl" onClick={downloadRecoverySessionPdf}>
                      <Download className="h-4 w-4" />
                      Download PDF
                    </Button>
                    <Button variant="outline" className="rounded-xl" onClick={downloadRecoveryAnswerKeyPdf}>
                      <Download className="h-4 w-4" />
                      Download Answer Key PDF
                    </Button>
                    <Button variant="outline" className="rounded-xl" onClick={resetSession}>
                      <RotateCcw className="h-4 w-4" />
                      Reset
                    </Button>
                    <Button asChild variant="secondary" className="rounded-xl">
                      <Link href="/progress">View Progress</Link>
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
                  <Target className="h-5 w-5" />
                  Recovery Rules
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Weak topics and concepts require at least five attempts and less than 60% accuracy.</p>
                <p>Two weak areas: 70% weakest, 20% second weakest, 10% random review.</p>
                <p>One weak area: 90% weak area and 10% random review.</p>
                <p>Difficulty is selected from mastery: 0-40% introductory, 40-80% intermediate, 80%+ advanced.</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldCheck className="h-5 w-5" />
                  Safety
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Recovery Mode uses the existing server-side AI route and free-model-only guardrails.</p>
                <p>No model ID, API key, or provider setting is accepted from the browser.</p>
                <p>Generated question text is not stored permanently. Only self-marked progress is saved.</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-dashed">
              <CardContent className="space-y-3 p-5 text-sm text-muted-foreground">
                <p>
                  A recovery set is a study scaffold, not a diagnosis. Use the before/after numbers as a directional
                  check and keep practicing until the topic stabilizes above 60%.
                </p>
              </CardContent>
            </Card>
          </motion.aside>
        </div>
      </div>
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
      <p className="text-xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
