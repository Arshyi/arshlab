"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  AlertCircle,
  ArrowRight,
  BookOpenCheck,
  CheckCircle2,
  Download,
  Flame,
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
import {
  addPracticeProgress,
  getPracticeProgress,
  type PracticeProgressEntry,
} from "@/lib/supabase/practice-progress"
import {
  applyProfileReward,
  getLevelFromXp,
  getUserProfile,
  type UserProfile,
} from "@/lib/supabase/user-profile"
import { detectWeakTopics } from "@/lib/learning/recovery"
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

const GUEST_USAGE_KEY = "arshlab-ai-guest-usage"
const GUEST_LIMIT = 3

const topics = [
  "Functional Group Identification",
  "Hybridization",
  "VSEPR Geometry",
  "Periodic Trends",
  "Spectroscopy",
  "NMR Spectroscopy",
  "Mass Spectrometry",
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

const difficulties = ["Introductory", "Intermediate", "Advanced"]
const questionCounts = ["1", "5", "10", "20"]
const curricula = listCurricula()

interface GuestUsage {
  date: string
  count: number
}

interface PracticeChoice {
  label: string
  text: string
}

interface StudyQuestion {
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
}

interface StudySet {
  questions: StudyQuestion[]
}

function isSpectroscopyTopic(value: string): boolean {
  const normalized = value.toLowerCase()
  return normalized.includes("spectroscopy") || normalized.includes("ir")
}

function isReactionTopic(value: string): boolean {
  const normalized = value.toLowerCase()
  return (
    normalized.includes("reaction") ||
    normalized.includes("redox") ||
    normalized.includes("precipitation") ||
    normalized.includes("combustion")
  )
}

function isDatabaseStudyTopic(value: string): boolean {
  return isSpectroscopyTopic(value) || isReactionTopic(value)
}

interface AnswerRecord {
  choice: PracticeChoice
  correct: boolean
}

interface TopicMastery {
  topic: string
  attempted: number
  correct: number
  mastery: number
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

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ")
}

function answerMatchesChoice(question: StudyQuestion, choice: PracticeChoice): boolean {
  const answer = normalizeText(question.correctAnswer)
  const label = normalizeText(choice.label)
  const text = normalizeText(choice.text)
  return answer === label || answer === text || answer === `${label}. ${text}`
}

function toStudyPdfQuestions(set: StudySet): PdfQuestion[] {
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

function getDailyAttempted(entries: PracticeProgressEntry[]): number {
  const today = todayKey()
  return entries.filter((entry) => {
    const date = new Date(entry.timestamp)
    if (Number.isNaN(date.getTime())) return false
    return date.toISOString().slice(0, 10) === today
  }).length
}

function getTopicMastery(entries: PracticeProgressEntry[]): TopicMastery[] {
  const grouped = new Map<string, PracticeProgressEntry[]>()

  for (const entry of entries) {
    const group = grouped.get(entry.topic) ?? []
    group.push(entry)
    grouped.set(entry.topic, group)
  }

  return Array.from(grouped.entries())
    .map(([topic, topicEntries]) => {
      let weightedTotal = 0
      let weightedCorrect = 0
      for (const [index, entry] of topicEntries.entries()) {
        const weight = Math.max(0.35, 1 - index * 0.04)
        weightedTotal += weight
        if (entry.correct) weightedCorrect += weight
      }
      const correct = topicEntries.filter((entry) => entry.correct).length
      return {
        topic,
        attempted: topicEntries.length,
        correct,
        mastery: weightedTotal ? Math.round((weightedCorrect / weightedTotal) * 100) : 0,
      }
    })
    .sort((a, b) => a.mastery - b.mastery || b.attempted - a.attempted)
}

export function StudyClient() {
  const [topic, setTopic] = useState(topics[0])
  const [curriculumId, setCurriculumId] = useState<CurriculumId>(DEFAULT_CURRICULUM_ID)
  const [curriculumUnit, setCurriculumUnit] = useState("all")
  const [targetSubtopic, setTargetSubtopic] = useState("all")
  const [difficulty, setDifficulty] = useState(difficulties[0])
  const [questionCount, setQuestionCount] = useState("5")
  const [studySet, setStudySet] = useState<StudySet | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedChoice, setSelectedChoice] = useState<PracticeChoice | null>(null)
  const [answers, setAnswers] = useState<Record<string, AnswerRecord>>({})
  const [sessionComplete, setSessionComplete] = useState(false)
  const [completionAwarded, setCompletionAwarded] = useState(false)
  const [currentStreak, setCurrentStreak] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [remaining, setRemaining] = useState<number | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [guestUsage, setGuestUsage] = useState<GuestUsage>({ date: todayKey(), count: 0 })
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [progressEntries, setProgressEntries] = useState<PracticeProgressEntry[]>([])

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

    if (!isSupabaseConfigured()) return
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      const signedIn = Boolean(data.user)
      setIsLoggedIn(signedIn)
      if (signedIn) void refreshLearningData()
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const signedIn = Boolean(session?.user)
      setIsLoggedIn(signedIn)
      if (signedIn) void refreshLearningData()
      else {
        setProfile(null)
        setProgressEntries([])
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const guestRemaining = useMemo(
    () => Math.max(0, GUEST_LIMIT - guestUsage.count),
    [guestUsage.count],
  )

  const currentQuestion = studySet?.questions[currentIndex] ?? null
  const currentAnswer = currentQuestion ? answers[currentQuestion.id] : undefined
  const totalQuestions = studySet?.questions.length ?? 0
  const answeredCount = Object.keys(answers).length
  const correctCount = Object.values(answers).filter((answer) => answer.correct).length
  const accuracy = answeredCount ? Math.round((correctCount / answeredCount) * 100) : 0
  const questionsRemaining = studySet ? Math.max(0, totalQuestions - answeredCount) : 0
  const sessionProgress = totalQuestions ? Math.round((answeredCount / totalQuestions) * 100) : 0
  const dailyAttempted = useMemo(() => getDailyAttempted(progressEntries), [progressEntries])
  const dailyGoal = profile?.dailyGoal ?? 10
  const dailyProgress = Math.min(100, Math.round((dailyAttempted / dailyGoal) * 100))
  const level = getLevelFromXp(profile?.xp ?? 0)
  const weakTopics = useMemo(() => detectWeakTopics(progressEntries).slice(0, 3), [progressEntries])
  const curriculum = useMemo(() => getCurriculum(curriculumId), [curriculumId])
  const topicOptions = useMemo(
    () => getTopicsForUnit(curriculum, curriculumUnit),
    [curriculum, curriculumUnit],
  )
  const subtopicOptions = useMemo(
    () => getSubtopicsForCurriculumTopic(curriculum, topic, curriculumUnit),
    [curriculum, curriculumUnit, topic],
  )

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

  async function refreshLearningData() {
    const [profileResult, progressResult] = await Promise.all([
      getUserProfile(),
      getPracticeProgress(500),
    ])

    if (profileResult.ok) setProfile(profileResult.data)
    if (profileResult.ok) setCurriculumId(profileResult.data.selectedCurriculum)
    if (progressResult.ok) setProgressEntries(progressResult.data)
  }

  async function generateSession(targetTopic?: string) {
    if (loading) return

    const nextTopic = targetTopic ?? topic
    const useDatabaseTopic = isDatabaseStudyTopic(nextTopic)

    if (!isLoggedIn && !useDatabaseTopic && guestRemaining <= 0) {
      setError("Daily guest AI assistant limit reached. Sign in for a higher limit.")
      return
    }

    if (targetTopic) setTopic(targetTopic)

    setLoading(true)
    setError(null)
    setMessage(null)
    setStudySet(null)
    setCurrentIndex(0)
    setSelectedChoice(null)
    setAnswers({})
    setSessionComplete(false)
    setCompletionAwarded(false)
    setCurrentStreak(0)

    try {
      if (useDatabaseTopic) {
        const databaseTopic = isSpectroscopyTopic(nextTopic) ? "Spectroscopy" : nextTopic
        const databaseSubtopic =
          targetSubtopic === "all"
            ? isSpectroscopyTopic(nextTopic)
              ? "IR Spectroscopy"
              : undefined
            : targetSubtopic
        const questions = generateDatabaseQuestions({
          topic: databaseTopic,
          targetSubtopic: databaseSubtopic,
          difficulty,
          count: Number(questionCount),
          curriculum: curriculumId,
          unit: curriculumUnit === "all" ? undefined : curriculumUnit,
        })
        setStudySet({
          questions: questions.map((question) => ({
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
          })),
        })
        setRemaining(null)
        return
      }

      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task: "practice-generator",
          topic: nextTopic,
          questionType: "Multiple choice",
          difficulty,
          curriculumStyle: "High School",
          questionCount: Number(questionCount),
          curriculumId,
          curriculumUnit: curriculumUnit === "all" ? undefined : curriculumUnit,
          targetSubtopic: targetSubtopic === "all" ? undefined : targetSubtopic,
        }),
      })
      const data = await response.json()

      if (!response.ok || !data.ok || !data.practiceSet) {
        setError(data.message || "AI Assistant temporarily unavailable")
        return
      }

      setStudySet(data.practiceSet)
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

  async function answerCurrentQuestion() {
    if (!currentQuestion || !selectedChoice || currentAnswer) return

    const correct = answerMatchesChoice(currentQuestion, selectedChoice)
    setAnswers((current) => ({
      ...current,
      [currentQuestion.id]: { choice: selectedChoice, correct },
    }))
    setCurrentStreak((current) => (correct ? current + 1 : 0))
    setMessage(null)

    if (!isLoggedIn) {
      setMessage("Answer recorded locally. Sign in to save XP, mastery, and daily-goal progress.")
      return
    }

    const progressResult = await addPracticeProgress({
      topic: currentQuestion.topic,
      subtopic: currentQuestion.subtopic,
      difficulty: currentQuestion.difficulty,
      questionType: "Study Mode",
      correct,
    })

    if (!progressResult.ok) {
      setMessage(`Progress was not saved: ${progressResult.error}`)
      return
    }

    let nextMessage = correct ? "Correct. Progress saved." : "Progress saved."
    if (correct) {
      const rewardResult = await applyProfileReward({ xp: 10 })
      if (rewardResult.ok) {
        setProfile(rewardResult.data)
        nextMessage = "Correct. +10 XP awarded."
      }
    }

    setMessage(nextMessage)
    void refreshLearningData()
  }

  function goToNextQuestion() {
    if (!studySet || currentIndex >= studySet.questions.length - 1) return
    setCurrentIndex((current) => current + 1)
    setSelectedChoice(null)
    setMessage(null)
  }

  async function finishSession() {
    if (!studySet || sessionComplete) return
    setSessionComplete(true)

    if (!isLoggedIn || completionAwarded) {
      setMessage("Session complete. Sign in to save completion XP.")
      return
    }

    const rewardResult = await applyProfileReward({ xp: 5, completedSessions: 1 })
    setCompletionAwarded(true)
    if (rewardResult.ok) {
      setProfile(rewardResult.data)
      setMessage("Session complete. +5 XP completion bonus awarded.")
    } else {
      setMessage(`Session complete. Completion XP was not saved: ${rewardResult.error}`)
    }
  }

  function resetSession() {
    setStudySet(null)
    setCurrentIndex(0)
    setSelectedChoice(null)
    setAnswers({})
    setSessionComplete(false)
    setCompletionAwarded(false)
    setCurrentStreak(0)
    setError(null)
    setMessage(null)
  }

  function downloadStudySessionPdf() {
    if (!studySet) return
    downloadQuestionPdf({
      filename: "arshlab-study-session.pdf",
      title: "ARSHLAB",
      subtitle: "Study Session",
      metadata: [
        { label: "Topic", value: topic },
        { label: "Curriculum", value: curriculum.name },
        { label: "Unit", value: curriculumUnit === "all" ? "Recommended / All" : curriculum.units.find((unit) => unit.id === curriculumUnit)?.title ?? curriculumUnit },
        { label: "Subtopic", value: targetSubtopic === "all" ? "Any supported subtopic" : targetSubtopic },
        { label: "Difficulty", value: difficulty },
        { label: "Date Generated", value: generatedDateLabel() },
        { label: "Number of Questions", value: studySet.questions.length },
      ],
      questions: toStudyPdfQuestions(studySet),
      includeSolutions: true,
    })
  }

  function downloadStudyAnswerKeyPdf() {
    if (!studySet) return
    downloadAnswerKeyPdf({
      filename: "arshlab-study-answer-key.pdf",
      title: "Study Session Answer Key",
      metadata: [
        { label: "Topic", value: topic },
        { label: "Curriculum", value: curriculum.name },
        { label: "Difficulty", value: difficulty },
        { label: "Date Generated", value: generatedDateLabel() },
        { label: "Number of Questions", value: studySet.questions.length },
      ],
      questions: toStudyPdfQuestions(studySet),
    })
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <BookOpenCheck className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Study Mode</h1>
              <p className="text-muted-foreground">Guided adaptive chemistry practice with immediate feedback</p>
            </div>
          </div>
          <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
            Choose a topic and difficulty, then work through one question at a time while ARSHLAB tracks streaks,
            accuracy, XP, daily goals, and topic/concept mastery.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
          <motion.main initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <GraduationCap className="h-5 w-5" />
                    Study Session Setup
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
                <div className="grid gap-4 md:grid-cols-3">
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
                  <Picker label="Difficulty" value={difficulty} options={difficulties} onChange={setDifficulty} />
                  <Picker
                    label="Number of Questions"
                    value={questionCount}
                    options={questionCounts}
                    onChange={setQuestionCount}
                    suffix="questions"
                  />
                </div>
                <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-sm text-muted-foreground">
                    Study Mode uses the existing free-model-only practice generator and never sends a client-selected model.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {studySet && (
                      <Button variant="outline" className="h-11 rounded-xl" onClick={resetSession}>
                        <RotateCcw className="h-4 w-4" />
                        Reset
                      </Button>
                    )}
                    <Button
                      onClick={() => void generateSession()}
                      disabled={loading || (!isLoggedIn && guestRemaining <= 0)}
                      className="h-11 rounded-xl"
                    >
                      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                      {loading ? "Generating..." : "Start Study Session"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {error && (
              <Alert className="rounded-2xl border-amber-500/30 bg-amber-500/10">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>{error.includes("temporarily unavailable") ? "AI Assistant temporarily unavailable" : "Study session stopped"}</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {message && (
              <Alert className="rounded-2xl border-teal-500/30 bg-teal-500/10">
                <CheckCircle2 className="h-4 w-4" />
                <AlertTitle>Study update</AlertTitle>
                <AlertDescription>{message}</AlertDescription>
              </Alert>
            )}

            {studySet && currentQuestion && !sessionComplete && (
              <>
                <div className="grid gap-3 sm:grid-cols-4">
                  <SessionStat icon={Flame} label="Current Streak" value={currentStreak} />
                  <SessionStat icon={Target} label="Remaining" value={questionsRemaining} />
                  <SessionStat icon={Trophy} label="Accuracy" value={`${accuracy}%`} />
                  <SessionStat icon={Zap} label="Progress" value={`${answeredCount}/${totalQuestions}`} />
                </div>

                <Card className="rounded-2xl border-primary/20 bg-primary/5">
                  <CardHeader>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <CardTitle className="flex items-center gap-2 text-xl">
                        <BookOpenCheck className="h-5 w-5" />
                        Question {currentIndex + 1}
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
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" className="rounded-xl" onClick={downloadStudySessionPdf}>
                        <Download className="h-4 w-4" />
                        Download PDF
                      </Button>
                      <Button variant="outline" className="rounded-xl" onClick={downloadStudyAnswerKeyPdf}>
                        <Download className="h-4 w-4" />
                        Download Answer Key PDF
                      </Button>
                    </div>

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
                          <AlertDescription>
                            Correct answer: {currentQuestion.correctAnswer}
                          </AlertDescription>
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
                            Finish Session
                            <Trophy className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {studySet && sessionComplete && (
              <Card className="rounded-2xl border-teal-500/20 bg-teal-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Trophy className="h-6 w-6" />
                    Session Complete
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-4">
                    <ScoreTile label="Questions" value={totalQuestions} />
                    <ScoreTile label="Correct" value={correctCount} />
                    <ScoreTile label="Accuracy" value={`${accuracy}%`} />
                    <ScoreTile label="XP Earned" value={isLoggedIn ? `${correctCount * 10 + 5}` : "Sign in"} />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={() => void generateSession()} className="rounded-xl">
                      Start Another Session
                    </Button>
                    <Button variant="outline" className="rounded-xl" onClick={downloadStudySessionPdf}>
                      <Download className="h-4 w-4" />
                      Download PDF
                    </Button>
                    <Button variant="outline" className="rounded-xl" onClick={downloadStudyAnswerKeyPdf}>
                      <Download className="h-4 w-4" />
                      Download Answer Key PDF
                    </Button>
                    <Button asChild variant="outline" className="rounded-xl">
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
                  <Medal className="h-5 w-5" />
                  Level And XP
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isLoggedIn ? (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <ScoreTile label="Level" value={level} />
                      <ScoreTile label="XP" value={profile?.xp ?? 0} />
                    </div>
                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="font-medium">Next level</span>
                        <span className="text-muted-foreground">{(profile?.xp ?? 0) % 100}/100 XP</span>
                      </div>
                      <Progress value={(profile?.xp ?? 0) % 100} />
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Sign in to save XP, levels, topic/concept mastery, and achievements.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5" />
                  Daily Goal
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span>{dailyAttempted} / {dailyGoal} complete</span>
                  <span className="text-muted-foreground">{dailyProgress}%</span>
                </div>
                <Progress value={dailyProgress} />
                <p className="text-xs text-muted-foreground">
                  Daily goal settings are managed from My Progress.
                </p>
              </CardContent>
            </Card>

            {weakTopics.length > 0 && (
              <Card className="rounded-2xl border-orange-500/30 bg-orange-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Target className="h-5 w-5" />
                    Recommended Practice
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">You are struggling with:</p>
                  {weakTopics.map((item) => (
                    <div key={item.topic} className="rounded-xl border border-border bg-card p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-sm font-medium">{item.topic}</span>
                        <Badge variant="secondary">{item.accuracy}%</Badge>
                      </div>
                      <Button asChild variant="outline" className="w-full rounded-xl">
                        <Link href="/recovery">Start Recovery</Link>
                      </Button>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ShieldCheck className="h-5 w-5" />
                  Guardrails
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Study Mode uses the server-side OpenRouter route already protected by free-model-only checks.</p>
                <p>No model ID is accepted from the browser, and no paid fallback exists.</p>
                <p>Generated question text is not stored; only self-marked progress is saved.</p>
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
    <div className="rounded-xl border border-border bg-card/70 p-4 text-center">
      <p className="text-2xl font-bold text-foreground">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
