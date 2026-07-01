"use client"

import { useMemo, useState } from "react"
import type { ElementType, ReactNode } from "react"
import Link from "next/link"
import { Beaker, BookOpenCheck, CheckCircle2, Clock, Download, FlaskConical, Gauge, ShieldAlert, Sparkles } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  applyLabAction,
  buildPrintableLabReport,
  createExperimentState,
  equipmentSvgPath,
  experimentsForCompound,
  getLabEquipment,
  getVirtualLabExperiment,
  listVirtualLabExperiments,
  observationTimeline,
  peaksByTechnique,
  reactionProgressLabel,
  safetyChecklist,
  scoreAssessment,
  virtualLabMetrics,
  type ExperimentRunState,
  type LabActionId,
  type SpectralPeak,
  type VirtualLabExperiment,
  type VirtualLabMode,
} from "@/lib/virtual-lab"

interface VirtualLabClientProps {
  initialExperiment?: string
  initialCompound?: string
  initialMode?: string
}

const categories = [
  "Organic Chemistry",
  "General Chemistry",
  "Spectroscopy",
  "Analytical Chemistry",
  "Laboratory Techniques",
  "Reaction Mechanisms",
]

function pickInitialExperiment(initialExperiment?: string, initialCompound?: string): VirtualLabExperiment {
  if (initialExperiment) {
    const direct = getVirtualLabExperiment(initialExperiment)
    if (direct) return direct
  }
  if (initialCompound) {
    const linked = experimentsForCompound(initialCompound)
    if (linked[0]) return linked[0]
  }
  return listVirtualLabExperiments()[0]
}

export function VirtualLabClient({ initialExperiment, initialCompound, initialMode }: VirtualLabClientProps) {
  const experiments = listVirtualLabExperiments()
  const metrics = virtualLabMetrics()
  const [selectedId, setSelectedId] = useState(pickInitialExperiment(initialExperiment, initialCompound).id)
  const [category, setCategory] = useState<string>("All")
  const [mode, setMode] = useState<VirtualLabMode>(initialMode === "free" ? "free" : "guided")
  const selected = getVirtualLabExperiment(selectedId) ?? experiments[0]
  const [state, setState] = useState<ExperimentRunState>(() => createExperimentState(selected, mode))
  const [activePeak, setActivePeak] = useState<SpectralPeak | null>(selected.spectra[0] ?? null)
  const [answers, setAnswers] = useState<Record<string, string>>({})

  const filtered = experiments.filter((experiment) => category === "All" || experiment.category === category)
  const report = useMemo(() => buildPrintableLabReport(selected, state), [selected, state])
  const theoryScore = scoreAssessment(selected, answers)
  const nextStep = selected.steps[state.currentStepIndex]
  const completed = state.currentStepIndex >= selected.steps.length

  function selectExperiment(id: string) {
    const experiment = getVirtualLabExperiment(id) ?? selected
    setSelectedId(experiment.id)
    setState(createExperimentState(experiment, mode))
    setAnswers({})
    setActivePeak(experiment.spectra[0] ?? null)
  }

  function changeMode(nextMode: VirtualLabMode) {
    setMode(nextMode)
    setState(createExperimentState(selected, nextMode))
  }

  function runAction(action: LabActionId) {
    setState((current) => applyLabAction(selected, current, action))
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <FlaskConical className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-primary">ARSHLAB v12.0.0</p>
              <h1 className="text-3xl font-bold tracking-tight">Virtual Chemistry Laboratory</h1>
              <p className="text-muted-foreground">
                Deterministic undergraduate lab simulations with SVG glassware, guided and free lab modes,
                spectroscopy, observations, safety, notebooking, and assessment.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>SVG-first</Badge>
            <Badge>No AI</Badge>
            <Badge>No external APIs</Badge>
            <Badge>Educational simulation</Badge>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard icon={FlaskConical} label="Experiments" value={metrics.experiments} detail="Starter deterministic labs" />
          <MetricCard icon={Beaker} label="Compounds" value={metrics.coveredCompounds} detail="Initial library coverage" />
          <MetricCard icon={Gauge} label="Spectral Peaks" value={metrics.spectra} detail="Interactive assignments" />
          <MetricCard icon={BookOpenCheck} label="Assessments" value={metrics.assessments} detail="Prediction and theory checks" />
        </section>

        <section className="grid gap-6 lg:grid-cols-[330px_1fr]">
          <aside className="space-y-4">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Experiment Library</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {["All", ...categories].map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setCategory(item)}
                      className={
                        category === item
                          ? "rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground"
                          : "rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground"
                      }
                    >
                      {item}
                    </button>
                  ))}
                </div>
                <div className="space-y-2">
                  {filtered.map((experiment) => (
                    <button
                      key={experiment.id}
                      type="button"
                      onClick={() => selectExperiment(experiment.id)}
                      className={
                        selected.id === experiment.id
                          ? "w-full rounded-xl border border-primary bg-primary/10 p-3 text-left"
                          : "w-full rounded-xl border border-border p-3 text-left hover:bg-secondary"
                      }
                    >
                      <p className="font-medium">{experiment.title}</p>
                      <p className="text-xs text-muted-foreground">{experiment.category} · {experiment.difficulty}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{experiment.estimatedMinutes} min · {experiment.concepts.slice(0, 2).join(", ")}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-teal-500/20 bg-teal-500/5">
              <CardContent className="space-y-3 p-5 text-sm">
                <p className="font-semibold">Mode</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant={mode === "guided" ? "default" : "outline"} onClick={() => changeMode("guided")}>Guided</Button>
                  <Button variant={mode === "free" ? "default" : "outline"} onClick={() => changeMode("free")}>Free Lab</Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Guided Lab Mode walks through the procedure and blocks impossible actions. Free Lab Mode lets mistakes affect yield and purity.
                </p>
              </CardContent>
            </Card>
          </aside>

          <div className="space-y-6">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex flex-wrap items-center justify-between gap-3">
                  <span>{selected.title}</span>
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
                    <Clock className="mr-1 inline h-3 w-3" />
                    {selected.estimatedMinutes} min
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-6 xl:grid-cols-[1fr_300px]">
                <div className="space-y-4">
                  <LabBench experiment={selected} activePeak={activePeak} />
                  <div className="grid gap-3 sm:grid-cols-3">
                    <ProgressCard label="Reaction" value={reactionProgressLabel(state)} />
                    <ProgressCard label="Yield" value={`${state.yieldPercent}%`} />
                    <ProgressCard label="Purity" value={`${state.purityPercent}%`} />
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Concepts learned</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selected.concepts.map((concept) => <Badge key={concept}>{concept}</Badge>)}
                    </div>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Prerequisites</p>
                    <p className="mt-1 text-sm text-muted-foreground">{selected.prerequisites.join(", ")}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Safety</p>
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {safetyChecklist(selected).slice(0, 5).map((item) => <li key={item}>{item}</li>)}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            <section className="grid gap-6 xl:grid-cols-[1fr_360px]">
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle>{completed ? "Experiment Complete" : "Procedure"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selected.steps.map((step, index) => {
                    const isCurrent = index === state.currentStepIndex
                    const done = index < state.currentStepIndex || state.completedActions.includes(step.action)
                    return (
                      <div key={step.id} className={`rounded-xl border p-4 ${isCurrent ? "border-primary bg-primary/5" : "border-border"}`}>
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="font-medium">{index + 1}. {step.title}</p>
                            <p className="text-sm text-muted-foreground">{step.instruction}</p>
                            <p className="mt-1 text-xs text-muted-foreground">Why: {step.why}</p>
                          </div>
                          <Button
                            size="sm"
                            disabled={mode === "guided" ? !isCurrent || done : done}
                            onClick={() => runAction(step.action)}
                          >
                            {done ? "Done" : step.action}
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                  {mode === "free" && (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                      <p className="text-sm font-medium">Free Lab Actions</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {Array.from(new Set(selected.steps.map((step) => step.action))).map((action) => (
                          <Button key={action} size="sm" variant="outline" onClick={() => runAction(action)}>
                            {action}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  {state.warnings.length > 0 && (
                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 text-sm text-amber-700 dark:text-amber-300">
                      {state.warnings[state.warnings.length - 1]}
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="space-y-6">
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle>Observations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    {(state.observations.length ? state.observations : observationTimeline(selected).slice(0, 3)).map((observation) => (
                      <div key={`${observation.id}-${observation.timeMinutes}`} className="rounded-xl border border-border p-3">
                        <p className="font-medium">{observation.timeMinutes} min · {observation.kind}</p>
                        <p className="text-muted-foreground">{observation.text}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle>Scores</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm">
                    <ScoreLine label="Completion" value={state.completionScore} />
                    <ScoreLine label="Technique" value={state.techniqueScore} />
                    <ScoreLine label="Theory" value={theoryScore} />
                  </CardContent>
                </Card>
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle>Interactive Spectroscopy</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {(["IR", "1H NMR", "13C NMR", "Mass Spec", "UV-Visible"] as const).map((technique) => {
                    const peaks = peaksByTechnique(selected, technique)
                    if (!peaks.length) return null
                    return (
                      <div key={technique}>
                        <p className="mb-2 text-sm font-medium">{technique}</p>
                        <div className="flex flex-wrap gap-2">
                          {peaks.map((peak) => (
                            <button
                              key={peak.id}
                              type="button"
                              onMouseEnter={() => setActivePeak(peak)}
                              onFocus={() => setActivePeak(peak)}
                              onClick={() => setActivePeak(peak)}
                              className={
                                activePeak?.id === peak.id
                                  ? "rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"
                                  : "rounded-lg bg-secondary px-3 py-2 text-xs font-medium text-muted-foreground"
                              }
                            >
                              {peak.position}
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                  {activePeak && (
                    <div className="rounded-xl border border-border p-4 text-sm">
                      <p className="font-medium">{activePeak.assignment}</p>
                      <p className="text-muted-foreground">{activePeak.explanation}</p>
                      <p className="mt-2 text-xs text-muted-foreground">Linked atoms/bonds: {[...activePeak.linkedAtoms, ...activePeak.linkedBonds].join(", ") || "whole spectrum"}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle>Experiment Assessment</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selected.assessment.map((question) => (
                    <div key={question.id} className="rounded-xl border border-border p-4">
                      <p className="text-sm font-medium">{question.prompt}</p>
                      <div className="mt-3 grid gap-2">
                        {question.choices.map((choice) => {
                          const chosen = answers[question.id] === choice
                          const correct = question.answer === choice
                          return (
                            <button
                              key={choice}
                              type="button"
                              onClick={() => setAnswers((current) => ({ ...current, [question.id]: choice }))}
                              className={`rounded-lg border px-3 py-2 text-left text-sm ${chosen ? (correct ? "border-green-500 bg-green-500/10" : "border-amber-500 bg-amber-500/10") : "border-border hover:bg-secondary"}`}
                            >
                              {choice}
                            </button>
                          )
                        })}
                      </div>
                      {answers[question.id] && (
                        <p className="mt-3 text-xs text-muted-foreground">{question.explanation}</p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </section>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3">
                  <span>Lab Notebook</span>
                  <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
                    <Download className="mr-1 inline h-3 w-3" />
                    Printable report
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <pre className="max-h-72 overflow-auto rounded-xl bg-secondary p-4 text-xs whitespace-pre-wrap">{report}</pre>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/knowledge-graph?focus=compound:${selected.compoundId}`} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">
                    Open Knowledge Graph
                  </Link>
                  <Link href={`/interactive-learning/explorer?compound=${selected.compoundId}`} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">
                    Open Molecular Explorer
                  </Link>
                  <Link href={`/practice-generator?topic=${encodeURIComponent(selected.concepts[0] ?? "lab techniques")}`} className="rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-secondary">
                    Practice This
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  )
}

function LabBench({ experiment, activePeak }: { experiment: VirtualLabExperiment; activePeak: SpectralPeak | null }) {
  const equipment = experiment.equipmentIds.map(getLabEquipment).filter(Boolean)
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-gradient-to-b from-background to-secondary/40 p-4">
      <svg viewBox="0 0 720 300" role="img" aria-label={`${experiment.title} virtual lab bench`} className="h-[280px] w-full">
        <rect x="20" y="235" width="680" height="24" rx="10" className="fill-muted" />
        {equipment.slice(0, 6).map((item, index) => {
          if (!item) return null
          const x = 40 + index * 108
          const active = activePeak?.linkedAtoms.some((atom) => item.purpose.toLowerCase().includes(atom)) || activePeak?.linkedBonds.length
          return (
            <g key={item.id} transform={`translate(${x} 64)`}>
              <path
                d={equipmentSvgPath(item.svgKind)}
                fill={active ? "rgba(20,184,166,0.18)" : "rgba(148,163,184,0.12)"}
                stroke={active ? "rgb(20,184,166)" : "currentColor"}
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <text x="80" y="160" textAnchor="middle" className="fill-current text-[13px] font-medium">{item.name}</text>
            </g>
          )
        })}
        <g transform="translate(560 30)">
          <rect x="0" y="0" width="130" height="54" rx="12" className="fill-primary/10 stroke-primary" strokeWidth="2" />
          <text x="65" y="22" textAnchor="middle" className="fill-current text-[12px] font-semibold">Simulation</text>
          <text x="65" y="40" textAnchor="middle" className="fill-current text-[11px]">{experiment.difficulty}</text>
        </g>
      </svg>
    </div>
  )
}

function Badge({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">{children}</span>
}

function MetricCard({ icon: Icon, label, value, detail }: { icon: ElementType; label: string; value: number; detail: string }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="flex items-start gap-4 p-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-xs text-muted-foreground">{detail}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function ProgressCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">{value}</p>
    </div>
  )
}

function ScoreLine({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between gap-3">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value}%</span>
      </div>
      <div className="h-2 rounded-full bg-secondary">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  )
}
