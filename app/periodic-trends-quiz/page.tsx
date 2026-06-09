"use client"

import Link from "next/link"
import { useCallback, useEffect, useState } from "react"
import { motion } from "framer-motion"
import { ArrowLeft, CheckCircle2, GraduationCap, RotateCcw, XCircle } from "lucide-react"
import {
  formatTrendValue,
  getElementBySymbol,
  getElementTrendValue,
  PERIODIC_TREND_METRICS,
} from "@/lib/chemistry/database"
import type { TrendMode } from "@/lib/chemistry/database"
import type { ElementRecord } from "@/lib/chemistry/database/types"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface QuestionTemplate {
  prompt: string
  mode: TrendMode
  symbols: string[]
}

interface QuizQuestion {
  prompt: string
  mode: TrendMode
  options: ElementRecord[]
  correct: ElementRecord
  explanation: string
}

const QUESTION_BANK: QuestionTemplate[] = [
  { prompt: "Which element has the larger atomic radius?", mode: "atomicRadius", symbols: ["Na", "Cl"] },
  { prompt: "Which element has the larger atomic radius?", mode: "atomicRadius", symbols: ["K", "Mg"] },
  { prompt: "Which element has the larger atomic radius?", mode: "atomicRadius", symbols: ["Cl", "I"] },
  { prompt: "Which element has the higher first ionization energy?", mode: "ionizationEnergy", symbols: ["Mg", "K"] },
  { prompt: "Which element has the higher first ionization energy?", mode: "ionizationEnergy", symbols: ["Na", "Al"] },
  { prompt: "Which element has the higher first ionization energy?", mode: "ionizationEnergy", symbols: ["O", "F"] },
  { prompt: "Which element is most electronegative?", mode: "electronegativity", symbols: ["F", "O", "N"] },
  { prompt: "Which element is most electronegative?", mode: "electronegativity", symbols: ["Cl", "Br", "I"] },
  { prompt: "Which element is most electronegative?", mode: "electronegativity", symbols: ["C", "N", "O"] },
  { prompt: "Which element has the higher electron affinity?", mode: "electronAffinity", symbols: ["Cl", "Br"] },
  { prompt: "Which element has the higher electron affinity?", mode: "electronAffinity", symbols: ["Na", "Mg"] },
  { prompt: "Which element has the higher electron affinity?", mode: "electronAffinity", symbols: ["O", "F"] },
]

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5)
}

function createQuestion(): QuizQuestion {
  const template = QUESTION_BANK[Math.floor(Math.random() * QUESTION_BANK.length)]
  const options = template.symbols
    .map((symbol) => getElementBySymbol(symbol))
    .filter((element): element is ElementRecord => Boolean(element))
  const correct = options.reduce((best, element) =>
    getElementTrendValue(element, template.mode) > getElementTrendValue(best, template.mode)
      ? element
      : best,
  )
  const metric = PERIODIC_TREND_METRICS[template.mode]
  const correctValue = formatTrendValue(template.mode, getElementTrendValue(correct, template.mode))

  return {
    prompt: template.prompt,
    mode: template.mode,
    options: shuffle(options),
    correct,
    explanation: `${correct.symbol} is correct: ${metric.label.toLowerCase()} is ${correctValue}. ${metric.educationalNote}`,
  }
}

export default function PeriodicTrendsQuizPage() {
  const [question, setQuestion] = useState<QuizQuestion | null>(null)
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null)
  const [score, setScore] = useState(0)
  const [answered, setAnswered] = useState(0)

  const nextQuestion = useCallback(() => {
    setQuestion(createQuestion())
    setSelectedSymbol(null)
  }, [])

  useEffect(() => {
    nextQuestion()
  }, [nextQuestion])

  function answer(symbol: string) {
    if (!question || selectedSymbol) return
    setSelectedSymbol(symbol)
    setAnswered((value) => value + 1)
    if (symbol === question.correct.symbol) {
      setScore((value) => value + 1)
    }
  }

  function resetQuiz() {
    setScore(0)
    setAnswered(0)
    nextQuestion()
  }

  const isCorrect = question && selectedSymbol === question.correct.symbol

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <Button asChild variant="ghost" className="mb-4 rounded-xl">
            <Link href="/periodic-table">
              <ArrowLeft className="h-4 w-4" />
              Periodic Table
            </Link>
          </Button>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <GraduationCap className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Periodic Trends Quiz</h1>
              <p className="text-muted-foreground">
                Quick comparisons for radius, electronegativity, ionization energy, and affinity
              </p>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          <Card className="rounded-2xl">
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="text-xl">
                  {question ? question.prompt : "Preparing question..."}
                </CardTitle>
                {question && (
                  <Badge variant="secondary">{PERIODIC_TREND_METRICS[question.mode].label}</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {question && (
                <>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {question.options.map((element) => {
                      const chosen = selectedSymbol === element.symbol
                      const correct = question.correct.symbol === element.symbol
                      const revealed = Boolean(selectedSymbol)

                      return (
                        <button
                          key={element.id}
                          type="button"
                          onClick={() => answer(element.symbol)}
                          className={cn(
                            "rounded-2xl border border-border bg-secondary/20 p-5 text-left transition-all hover:bg-secondary/60",
                            chosen && "border-primary bg-primary/5 ring-2 ring-primary",
                            revealed && correct && "border-green-500/50 bg-green-500/10",
                            revealed && chosen && !correct && "border-destructive/50 bg-destructive/10",
                          )}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-2xl font-bold">{element.symbol}</p>
                              <p className="text-sm text-muted-foreground">{element.name}</p>
                            </div>
                            <Badge variant="outline" className="font-mono">
                              Z={element.atomicNumber}
                            </Badge>
                          </div>
                          {revealed && (
                            <p className="mt-4 font-mono text-sm">
                              {formatTrendValue(
                                question.mode,
                                getElementTrendValue(element, question.mode),
                              )}
                            </p>
                          )}
                        </button>
                      )
                    })}
                  </div>

                  {selectedSymbol && (
                    <div
                      className={cn(
                        "rounded-2xl border p-4",
                        isCorrect
                          ? "border-green-500/40 bg-green-500/10"
                          : "border-destructive/40 bg-destructive/10",
                      )}
                    >
                      <div className="mb-2 flex items-center gap-2 font-medium">
                        {isCorrect ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-destructive" />
                        )}
                        {isCorrect ? "Correct" : "Not quite"}
                      </div>
                      <p className="text-sm leading-relaxed text-muted-foreground">
                        {question.explanation}
                      </p>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      className="rounded-xl"
                      onClick={nextQuestion}
                      disabled={!selectedSymbol}
                    >
                      Next Question
                    </Button>
                    <Button type="button" variant="outline" className="rounded-xl" onClick={resetQuiz}>
                      <RotateCcw className="h-4 w-4" />
                      Reset
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="rounded-2xl border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="text-lg">Score</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-mono text-4xl font-bold">
                  {score}/{answered}
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
                  {answered === 0
                    ? "Answer a question to start tracking."
                    : `${Math.round((score / answered) * 100)}% accuracy`}
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">Trend Reminders</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.values(PERIODIC_TREND_METRICS).map((metric) => (
                  <div key={metric.mode} className="rounded-xl border border-border bg-secondary/20 px-3 py-2">
                    <p className="text-sm font-medium">{metric.label}</p>
                    <p className="text-xs text-muted-foreground">{metric.educationalNote}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
