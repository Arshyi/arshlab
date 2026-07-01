"use client"

import { useMemo, useState } from "react"
import type { ElementType, ReactNode } from "react"
import Link from "next/link"
import { useReducedMotion } from "framer-motion"
import {
  AlertCircle,
  Beaker,
  BookOpenCheck,
  Clipboard,
  Clock,
  Download,
  FlaskConical,
  Gauge,
  Printer,
} from "lucide-react"
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
  unsupportedVirtualLabMessage,
  virtualLabMetrics,
  virtualLabControlGroups,
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
  const reduceMotion = useReducedMotion()
  const [selectedId, setSelectedId] = useState(pickInitialExperiment(initialExperiment, initialCompound).id)
  const [category, setCategory] = useState<string>("All")
  const [mode, setMode] = useState<VirtualLabMode>(initialMode === "free" ? "free" : "guided")
  const selected = getVirtualLabExperiment(selectedId) ?? experiments[0]
  const [state, setState] = useState<ExperimentRunState>(() => createExperimentState(selected, mode))
  const [activePeak, setActivePeak] = useState<SpectralPeak | null>(selected.spectra[0] ?? null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle")

  const filtered = experiments.filter((experiment) => category === "All" || experiment.category === category)
  const report = useMemo(() => buildPrintableLabReport(selected, state), [selected, state])
  const controlGroups = useMemo(() => virtualLabControlGroups(selected), [selected])
  const unsupportedCompound =
    initialCompound && experimentsForCompound(initialCompound).length === 0 ? initialCompound : null
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

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(report)
      setCopyStatus("copied")
    } catch {
      setCopyStatus("failed")
    }
  }

  function printReport() {
    window.print()
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
              <p className="text-sm font-medium text-primary">ARSHLAB v12.1.0</p>
              <h1 className="text-3xl font-bold tracking-tight">Virtual Chemistry Laboratory</h1>
              <p className="text-muted-foreground">
                Deterministic undergraduate lab simulations with SVG glassware, guided and free lab modes,
                spectroscopy, observations, safety, notebooking, bridges, and printable reports.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>SVG-first</Badge>
            <Badge>No AI</Badge>
            <Badge>No external APIs</Badge>
            <Badge>Educational simulation</Badge>
            {reduceMotion && <Badge>Reduced motion</Badge>}
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard icon={FlaskConical} label="Experiments" value={metrics.experiments} detail="Starter deterministic labs" />
          <MetricCard icon={Beaker} label="Compounds" value={metrics.coveredCompounds} detail="Initial library coverage" />
          <MetricCard icon={Gauge} label="Spectral Peaks" value={metrics.spectra} detail="Interactive assignments" />
          <MetricCard icon={BookOpenCheck} label="Assessments" value={metrics.assessments} detail="Prediction and theory checks" />
        </section>

        {unsupportedCompound && (
          <Card className="rounded-2xl border-amber-500/30 bg-amber-500/5">
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div>
                  <p className="font-semibold">No direct lab experiment for this compound yet</p>
                  <p className="mt-1 text-sm text-muted-foreground">{unsupportedVirtualLabMessage(unsupportedCompound)}</p>
                </div>
              </div>
              <Button asChild variant="outline" className="w-full rounded-xl sm:w-auto">
                <Link href={`/knowledge-graph?focus=compound:${unsupportedCompound}`}>Open Knowledge Graph</Link>
              </Button>
            </CardContent>
          </Card>
        )}

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
                      aria-label={`Filter virtual lab experiments by ${item}`}
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
                      aria-label={`Open ${experiment.title}`}
                      onClick={() => selectExperiment(experiment.id)}
                      className={
                        selected.id === experiment.id
                          ? "w-full rounded-xl border border-primary bg-primary/10 p-3 text-left"
                          : "w-full rounded-xl border border-border p-3 text-left hover:bg-secondary"
                      }
                    >
                      <p className="font-medium">{experiment.title}</p>
                      <p className="text-xs text-muted-foreground">{experiment.category} - {experiment.difficulty}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{experiment.estimatedMinutes} min - {experiment.concepts.slice(0, 2).join(", ")}</p>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-teal-500/20 bg-teal-500/5">
              <CardContent className="space-y-3 p-5 text-sm">
                <p className="font-semibold">Mode</p>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={mode === "guided" ? "default" : "outline"}
                    onClick={() => changeMode("guided")}
                    aria-label="Use guided virtual lab mode"
                  >
                    Guided
                  </Button>
                  <Button
                    variant={mode === "free" ? "default" : "outline"}
                    onClick={() => changeMode("free")}
                    aria-label="Use free virtual lab mode"
                  >
                    Free Lab
                  </Button>
                </div>
                <div className="grid gap-2 text-xs text-muted-foreground">
                  <p><span className="font-semibold text-foreground">Guided:</span> follow the procedure one step at a time with unsafe or impossible actions blocked.</p>
                  <p><span className="font-semibold text-foreground">Free Lab:</span> choose actions out of order and let mistakes affect yield, purity, and warnings.</p>
                </div>
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
                            aria-label={`${done ? "Completed" : "Run"} ${step.title}`}
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
                      <div className="mt-3 grid gap-3">
                        {controlGroups.map((group) => (
                          <div key={group.id} className="rounded-lg border border-border bg-background/70 p-3">
                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">{group.label}</p>
                            <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                              {group.actions.map((action) => (
                                <Button
                                  key={action}
                                  size="sm"
                                  variant="outline"
                                  onClick={() => runAction(action)}
                                  aria-label={`Run free lab action ${action}`}
                                >
                                  {action}
                                </Button>
                              ))}
                            </div>
                          </div>
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

              <div className="space-y-6 xl:sticky xl:top-20 xl:self-start">
                <CurrentStepCard
                  completed={completed}
                  nextStep={nextStep}
                  currentStepIndex={state.currentStepIndex}
                  totalSteps={selected.steps.length}
                  mode={mode}
                  progress={reactionProgressLabel(state)}
                />
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
                              aria-label={`Inspect ${technique} peak ${peak.position}`}
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
                              aria-label={`Choose assessment answer ${choice}`}
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
                <div className="flex flex-wrap gap-2 print:hidden">
                  <Button type="button" variant="outline" className="rounded-xl" onClick={copyReport}>
                    <Clipboard className="h-4 w-4" />
                    {copyStatus === "copied" ? "Copied" : copyStatus === "failed" ? "Copy failed" : "Copy summary"}
                  </Button>
                  <Button type="button" className="rounded-xl" onClick={printReport}>
                    <Printer className="h-4 w-4" />
                    Print report
                  </Button>
                </div>
                <pre id="lab-report-printable" className="max-h-72 overflow-auto rounded-xl bg-secondary p-4 text-xs whitespace-pre-wrap print:max-h-none print:overflow-visible print:bg-white print:text-black">{report}</pre>
                <div className="flex flex-wrap gap-2">
                  <Button asChild variant="outline" className="rounded-xl">
                    <Link href={`/knowledge-graph?focus=compound:${selected.compoundId}`}>Open Knowledge Graph</Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-xl">
                    <Link href={`/interactive-learning/explorer?compound=${selected.compoundId}`}>Open Molecular Explorer</Link>
                  </Button>
                  <Button asChild variant="outline" className="rounded-xl">
                    <Link href={`/practice-generator?topic=${encodeURIComponent(selected.concepts[0] ?? "lab techniques")}`}>Practice This</Link>
                  </Button>
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

function CurrentStepCard({
  completed,
  nextStep,
  currentStepIndex,
  totalSteps,
  mode,
  progress,
}: {
  completed: boolean
  nextStep: VirtualLabExperiment["steps"][number] | undefined
  currentStepIndex: number
  totalSteps: number
  mode: VirtualLabMode
  progress: string
}) {
  return (
    <Card className="rounded-2xl border-teal-500/20 bg-teal-500/5">
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current progress</p>
            <p className="mt-1 font-semibold">{completed ? "Experiment complete" : nextStep?.title ?? "Ready to begin"}</p>
          </div>
          <Badge>{mode === "guided" ? "Guided" : "Free Lab"}</Badge>
        </div>
        <div className="h-2 rounded-full bg-background">
          <div
            className="h-2 rounded-full bg-primary"
            style={{ width: `${Math.min(100, Math.round((Math.min(currentStepIndex, totalSteps) / Math.max(1, totalSteps)) * 100))}%` }}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          {completed
            ? "All required procedure steps have been completed."
            : nextStep
              ? `Next: ${nextStep.instruction}`
              : "Select an experiment or run the first action."}
        </p>
        <p className="text-xs text-muted-foreground">Reaction state: {progress}</p>
      </CardContent>
    </Card>
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
