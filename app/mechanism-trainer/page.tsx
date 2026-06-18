"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, FlaskConical, ListChecks, Search } from "lucide-react"
import { MechanismViewer } from "@/components/chemistry/MechanismViewer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { getMechanismMetrics, listMechanisms } from "@/lib/chemistry/mechanisms"
import { resolveMechanismDeepLink } from "@/lib/deep-links"
import { getReactionConditionForMechanism } from "@/lib/reaction-conditions/reaction-conditions"
import { cn } from "@/lib/utils"

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

function keyIntermediate(mechanism: ReturnType<typeof listMechanisms>[number]): string {
  const intermediate = mechanism.steps.find((step) =>
    /intermediate|carbocation|transition|bromonium|tetrahedral/i.test(step.title),
  )
  return intermediate?.title ?? mechanism.steps[1]?.title ?? "No discrete intermediate"
}

function productPattern(mechanism: ReturnType<typeof listMechanisms>[number]): string {
  return mechanism.products.join(" + ")
}

export default function MechanismTrainerPage() {
  const mechanisms = listMechanisms()
  const metrics = getMechanismMetrics()
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState(mechanisms[0]?.id ?? "")

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requestedMechanism = resolveMechanismDeepLink(params.get("mechanism"))
    if (requestedMechanism && mechanisms.some((mechanism) => mechanism.id === requestedMechanism)) {
      setSelectedId(requestedMechanism)
    }
  }, [mechanisms])

  const filteredMechanisms = useMemo(() => {
    const q = normalize(query)
    if (!q) return mechanisms
    return mechanisms.filter((mechanism) =>
      normalize(
        [
          mechanism.name,
          mechanism.category,
          mechanism.difficulty,
          mechanism.summary,
          ...mechanism.reactants,
          ...mechanism.products,
          ...mechanism.reagents,
        ].join(" "),
      ).includes(q),
    )
  }, [mechanisms, query])

  const selected = mechanisms.find((mechanism) => mechanism.id === selectedId) ?? filteredMechanisms[0] ?? mechanisms[0]
  const selectedCondition = selected ? getReactionConditionForMechanism(selected.id) : undefined

  useEffect(() => {
    document.getElementById("mechanism-viewer")?.scrollIntoView({ block: "start" })
  }, [selected?.id])

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <FlaskConical className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">ARSHLAB v4.7.0</Badge>
                  <Badge variant="outline">Database mode = no AI usage</Badge>
                </div>
                <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Organic Mechanism Trainer</h1>
                <p className="mt-2 max-w-3xl text-muted-foreground">
                  Step through deterministic organic reaction mechanisms, inspect highlighted atoms and bonds, and predict the next electron-flow move.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild variant="outline" className="w-full rounded-xl sm:w-auto">
                <Link href="/practice-generator?topic=Organic%20Mechanisms&source=database">
                  Practice
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild className="w-full rounded-xl sm:w-auto">
                <Link href="/exam-generator?topic=Organic%20Mechanisms&source=database">
                  Exam Set
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Mechanisms available" value={metrics.mechanismsAvailable} />
            <Metric label="Mechanism steps" value={metrics.mechanismSteps} />
            <Metric label="Interactive exercises" value={metrics.interactiveExercises} />
            <Metric label="Coverage level" value={metrics.coverageLevel} />
          </div>
        </motion.section>

        <section className="grid min-w-0 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Card className="h-fit min-w-0 rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Search className="h-5 w-5" />
                Mechanism Library
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search SN1, bromination, oxidation..."
                className="h-11 rounded-xl"
              />
              <div className="grid max-h-[620px] gap-2 overflow-y-auto pr-1">
                {filteredMechanisms.length > 0 ? (
                  filteredMechanisms.map((mechanism) => (
                    <button
                      key={mechanism.id}
                      type="button"
                      onClick={() => setSelectedId(mechanism.id)}
                      className={cn(
                        "rounded-xl border px-3 py-3 text-left transition-colors",
                        selected?.id === mechanism.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-secondary/20 hover:bg-secondary",
                      )}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="min-w-0">
                          <span className="block break-words text-sm font-medium">{mechanism.name}</span>
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {mechanism.steps.length} steps | {mechanism.category}
                          </span>
                        </span>
                        <Badge variant="outline" className="shrink-0">
                          {mechanism.difficulty}
                        </Badge>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">No mechanism matched that search.</p>
                    <p className="mt-1">Try SN1, SN2, alkene, esterification, or oxidation.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="min-w-0 space-y-6">
            {selected ? (
              <>
                <Card id="mechanism-viewer" className="scroll-mt-24 rounded-2xl border-primary/20 bg-primary/5">
                  <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-2xl font-bold">{selected.name}</h2>
                      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{selected.summary}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge>{selected.category}</Badge>
                        <Badge variant="secondary">{selected.difficulty}</Badge>
                        <Badge variant="outline">{selected.conditions ?? "Standard classroom conditions"}</Badge>
                      </div>
                    </div>
                    <Badge variant="outline" className="w-fit rounded-full">
                      {selected.steps.length} visual steps
                    </Badge>
                  </CardContent>
                </Card>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <SummaryTile label="Mechanism type" value={selected.category} />
                  <SummaryTile
                    label="Reagents / conditions"
                    value={`${selected.reagents.join(", ")}${selected.conditions ? ` | ${selected.conditions}` : ""}`}
                  />
                  <SummaryTile label="Key intermediate" value={keyIntermediate(selected)} />
                  <SummaryTile label="Product pattern" value={productPattern(selected)} />
                </div>

                {selectedCondition && (
                  <Card className="rounded-2xl border-teal-500/20 bg-teal-500/5">
                    <CardHeader>
                      <CardTitle className="text-lg">Reaction Context Card</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3 md:grid-cols-2">
                      <ContextTile label="Reagents" value={selectedCondition.reagents.join(", ")} />
                      <ContextTile
                        label="Conditions"
                        value={[
                          selectedCondition.catalysts.length ? `Catalyst: ${selectedCondition.catalysts.join(", ")}` : "",
                          `Temperature: ${selectedCondition.temperature}`,
                          `Pressure: ${selectedCondition.pressure}`,
                        ]
                          .filter(Boolean)
                          .join(" | ")}
                      />
                      <ContextTile label="Expected products" value={selectedCondition.expectedProducts.join(" + ")} />
                      <ContextTile label="Typical exam clues" value={selectedCondition.typicalExamClues.join(" | ")} />
                    </CardContent>
                  </Card>
                )}

                <MechanismViewer key={selected.id} mechanism={selected} />

                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <ListChecks className="h-5 w-5" />
                      Deterministic Practice Hooks
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-3 sm:grid-cols-2">
                    <InfoCard
                      title="Practice Generator"
                      body="Generate next-step, intermediate, mechanism-type, product, and reagent questions from these local records."
                      href="/practice-generator?topic=Organic%20Mechanisms&source=database"
                      action="Open Practice"
                    />
                    <InfoCard
                      title="Exam Generator"
                      body="Include Organic Mechanisms in database-only exam blueprints without OpenRouter calls."
                      href="/exam-generator?topic=Organic%20Mechanisms&source=database"
                      action="Generate Exam"
                    />
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="rounded-2xl border-dashed">
                <CardContent className="p-8 text-center text-sm text-muted-foreground">
                  Select a mechanism to begin.
                </CardContent>
              </Card>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-4">
        <p className="font-mono text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}

function SummaryTile({ label, value }: { label: string; value: string }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        <p className="mt-2 break-words text-sm font-semibold leading-relaxed">{value}</p>
      </CardContent>
    </Card>
  )
}

function ContextTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-background/80 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 break-words text-sm font-semibold leading-relaxed">{value}</p>
    </div>
  )
}

function InfoCard({
  title,
  body,
  href,
  action,
}: {
  title: string
  body: string
  href: string
  action: string
}) {
  return (
    <div className="rounded-xl border border-border bg-secondary/20 p-4">
      <p className="font-semibold">{title}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
      <Button asChild variant="outline" size="sm" className="mt-4 rounded-xl">
        <Link href={href}>
          {action}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  )
}
