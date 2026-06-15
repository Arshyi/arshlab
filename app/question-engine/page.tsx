import type { Metadata } from "next"
import Link from "next/link"
import { ArrowRight, CheckCircle2, Database, Gauge, Layers, ListChecks } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DATABASE_QUESTION_TEMPLATES, generateDatabaseQuestions, getQuestionEngineStats } from "@/lib/question-engine/generator"

export const metadata: Metadata = {
  title: "Question Engine | ARSHLAB",
  description: "Explore ARSHLAB's deterministic database-generated chemistry question engine.",
}

export default function QuestionEnginePage() {
  const stats = getQuestionEngineStats()
  const start = performance.now()
  const sampleQuestions = generateDatabaseQuestions({
    topic: "Reaction Prediction",
    targetSubtopic: "Missing Product",
    difficulty: "Introductory",
    count: 4,
    curriculum: "general-first-year",
    unit: "chemical-reactions",
  })
  const generationMs = Math.max(1, Math.round(performance.now() - start))

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Question Engine</h1>
              <p className="max-w-3xl text-muted-foreground">
                Deterministic chemistry questions generated from ARSHLAB&apos;s local knowledge core with no OpenRouter calls,
                no token usage, and no external APIs.
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="w-fit rounded-full px-3 py-1">
            ARSHLAB v3.8.1
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <MetricCard label="Compounds" value={stats.databaseCounts.compounds} />
          <MetricCard label="Ions" value={stats.databaseCounts.ions} />
          <MetricCard label="Functional Groups" value={stats.databaseCounts.functionalGroups} />
          <MetricCard label="Reaction Records" value={stats.databaseCounts.reactionRecords} />
          <MetricCard label="Spectroscopy" value={stats.databaseCounts.spectroscopy} />
          <MetricCard label="2D Structures" value={stats.databaseCounts.molecularStructures} />
          <MetricCard label="Visual Highlights" value={stats.databaseCounts.visualHighlights} />
          <MetricCard label="Balancing Exercises" value={stats.databaseCounts.balancingExercises} />
          <MetricCard label="IR Peaks" value={stats.databaseCounts.irPeaks} />
          <MetricCard label="Reaction Templates" value={stats.databaseCounts.reactions} />
          <MetricCard label="Mechanisms" value={stats.databaseCounts.mechanisms} />
          <MetricCard label="Mechanism Steps" value={stats.databaseCounts.mechanismSteps} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Layers className="h-5 w-5" />
                Templates
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {DATABASE_QUESTION_TEMPLATES.map((template) => (
                <div key={template.id} className="rounded-xl border border-border bg-secondary/20 p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                    <p className="font-medium">{template.name}</p>
                    <Badge variant="outline">{template.estimatedCombinations.toLocaleString()} combos</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {template.supportedTopics.map((topic) => (
                      <Badge key={topic} variant="secondary" className="rounded-full">
                        {topic}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="rounded-2xl border-teal-500/20 bg-teal-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Gauge className="h-5 w-5" />
                  Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <MetricRow label="Current template coverage" value={`${stats.templateCoveragePercent}%`} />
                <MetricRow label="Templates" value={stats.templates} />
                <MetricRow label="Estimated combinations" value={stats.estimatedCombinations.toLocaleString()} />
                <MetricRow label="Sample generation time" value={`${generationMs} ms`} />
                <div className="rounded-xl border border-border bg-background/80 p-3 text-xs text-muted-foreground">
                  Database questions are generated locally in the browser or server bundle. They do not call OpenRouter.
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ListChecks className="h-5 w-5" />
                  Supported Topics
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {stats.supportedTopics.map((topic) => (
                  <Badge key={topic} variant="secondary" className="rounded-full">
                    {topic}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="rounded-2xl border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle2 className="h-5 w-5" />
              Sample Database Questions
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            {sampleQuestions.map((question, index) => (
              <div key={question.id} className="rounded-xl border border-border bg-card p-4">
                <div className="mb-3 flex flex-wrap gap-2">
                  <Badge>Question {index + 1}</Badge>
                  <Badge variant="secondary">Database Generated</Badge>
                  <Badge variant="outline">{question.subtopic}</Badge>
                </div>
                <p className="font-medium">{question.question}</p>
                <div className="mt-3 grid gap-2">
                  {question.choices.map((choice) => (
                    <p key={choice.label} className="rounded-lg border border-border bg-secondary/20 px-3 py-2 text-sm">
                      <span className="font-semibold">{choice.label}.</span> {choice.text}
                    </p>
                  ))}
                </div>
                <p className="mt-3 text-xs text-muted-foreground">{question.explanation}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">Try it in Practice Generator</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Choose Database Only for fully deterministic local questions, or Hybrid to alternate local and AI questions.
              </p>
            </div>
            <Button asChild className="rounded-xl">
              <Link href="/practice-generator">
                Open Practice Generator
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-5">
        <p className="font-mono text-3xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}

function MetricRow({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-background/80 px-3 py-2">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-mono text-sm font-semibold">{value}</span>
    </div>
  )
}
