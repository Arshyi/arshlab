import Link from "next/link"
import { BarChart3, Database, FileQuestion, Gauge, GraduationCap } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getExamEngineStats, listExamBlueprints } from "@/lib/exam-engine/generator"

export const metadata = {
  title: "Exam Engine | ARSHLAB",
  description: "Explore ARSHLAB's deterministic chemistry exam engine.",
}

export default function ExamEnginePage() {
  const stats = getExamEngineStats()
  const blueprints = listExamBlueprints()

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="rounded-3xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <FileQuestion className="h-6 w-6" />
            </div>
            <div>
              <Badge variant="secondary">ARSHLAB v3.3.0</Badge>
              <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Deterministic Exam Engine</h1>
            </div>
          </div>
          <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
            ARSHLAB can now build full chemistry practice exams from the local Chemistry Knowledge Core and
            Question Engine without using AI tokens. AI and hybrid exams remain available in Exam Generator.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild className="rounded-xl">
              <Link href="/exam-generator?source=database">Generate Database Exam</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/exam-generator?source=hybrid">Generate Hybrid Exam</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-xl">
              <Link href="/question-engine">Question Engine</Link>
            </Button>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <MetricCard icon={Database} label="Blueprints" value={stats.blueprintCount} detail="predefined exam structures" />
          <MetricCard icon={GraduationCap} label="Curricula" value={stats.supportedCurricula.length} detail="supported styles" />
          <MetricCard icon={BarChart3} label="Topics" value={stats.supportedTopics.length} detail="question-engine topics" />
          <MetricCard icon={Gauge} label="Combinations" value={stats.estimatedExamCombinations.toLocaleString()} detail="estimated database exam variants" />
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Exam Blueprints</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {blueprints.map((blueprint) => (
                <div key={blueprint.id} className="rounded-2xl border border-border bg-secondary/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="font-semibold">{blueprint.name}</h2>
                      <p className="text-sm text-muted-foreground">{blueprint.description}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary">{blueprint.questionCount} questions</Badge>
                      <Badge variant="outline">{blueprint.difficulty}</Badge>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {blueprint.sections.map((section) => (
                      <Badge key={section.id} variant="outline">
                        {section.label}: {section.count}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-4">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Coverage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Database exams reuse the same validated local templates as Practice Generator Database Mode.</p>
                <p>Hybrid exams use 70% database questions and 30% AI questions.</p>
                <p>Adaptive exams weight weak topics from diagnostic, recovery, study, curriculum, and practice progress.</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Performance Target</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>20 database questions: under 100 ms target.</p>
                <p>50 database questions: under 250 ms target.</p>
                <p>No OpenRouter request, no token consumption, and no generated content storage in Database Only mode.</p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Supported Lengths</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {stats.supportedLengths.map((length) => (
                  <Badge key={length} variant="secondary">
                    {length} questions
                  </Badge>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  )
}

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: React.ElementType
  label: string
  value: number | string
  detail: string
}) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-5">
        <Icon className="mb-3 h-5 w-5 text-primary" />
        <p className="text-2xl font-bold">{value}</p>
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
      </CardContent>
    </Card>
  )
}
