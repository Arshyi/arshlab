"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  ArrowRight,
  BookOpenCheck,
  Calculator,
  CheckCircle2,
  Database,
  FlaskConical,
  ListChecks,
  Loader2,
  Target,
  XCircle,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { REACTION_RECORDS, parseEquation } from "@/lib/chemistry/reactions"
import { addPracticeProgress } from "@/lib/supabase/practice-progress"
import {
  SOLVER_MODULES,
  getSolverMetrics,
  solveCalorimetry,
  solveDilution,
  solveEmpiricalFormula,
  solveIdealGas,
  solveMolarity,
  solvePercentYield,
  solvePh,
  solveStoichiometry,
  type SolverModuleId,
  type SolverResult,
} from "@/lib/solver-engine"
import { formulaHref, getFormulaForSolverModule } from "@/lib/formula-sheet"
import { resolveSolverModuleDeepLink } from "@/lib/deep-links"
import { calculateStudySnapshot, getStudyTopicForSolver, getTopicMastery } from "@/lib/study-engine/study-engine"
import { readStudyProgress, recordStudyEvent } from "@/lib/study-engine/study-progress"
import { cn } from "@/lib/utils"

const LOCAL_STATS_KEY = "arshlab-solver-local-stats"

interface LocalSolverStats {
  solved: number
  correct: number
  missed: number
  workedExamples: number
}

const defaultStats: LocalSolverStats = {
  solved: 0,
  correct: 0,
  missed: 0,
  workedExamples: 0,
}

function numberOrUndefined(value: string): number | undefined {
  if (!value.trim()) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

function numberRequired(value: string, label: string): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be a number.`)
  return parsed
}

function readLocalStats(): LocalSolverStats {
  if (typeof window === "undefined") return defaultStats
  try {
    const parsed = JSON.parse(localStorage.getItem(LOCAL_STATS_KEY) ?? "null") as Partial<LocalSolverStats> | null
    return {
      solved: parsed?.solved ?? 0,
      correct: parsed?.correct ?? 0,
      missed: parsed?.missed ?? 0,
      workedExamples: parsed?.workedExamples ?? 0,
    }
  } catch {
    return defaultStats
  }
}

function writeLocalStats(stats: LocalSolverStats) {
  try {
    localStorage.setItem(LOCAL_STATS_KEY, JSON.stringify(stats))
  } catch {
    // Local counters are a convenience; saved Supabase progress is handled separately.
  }
}

export function ChemistrySolverClient() {
  const solverMetrics = getSolverMetrics()
  const [moduleId, setModuleId] = useState<SolverModuleId>("molarity")
  const [result, setResult] = useState<SolverResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [trackingMessage, setTrackingMessage] = useState<string | null>(null)
  const [tracking, setTracking] = useState<"correct" | "missed" | null>(null)
  const [stats, setStats] = useState<LocalSolverStats>(defaultStats)
  const [studyProgress, setStudyProgress] = useState(() => readStudyProgress())

  const [molarity, setMolarity] = useState({ moles: "0.250", volume: "0.500" })
  const [dilution, setDilution] = useState({ m1: "2.0", v1: "0.100", m2: "0.500", v2: "" })
  const [yieldInputs, setYieldInputs] = useState({ actual: "8.0", theoretical: "10.0" })
  const [empiricalRows, setEmpiricalRows] = useState([
    { element: "C", mass: "12.0" },
    { element: "H", mass: "3.0" },
  ])
  const [gas, setGas] = useState({ p: "1.00", v: "", n: "1.00", t: "273" })
  const [calorimetry, setCalorimetry] = useState({ mass: "50.0", c: "4.184", deltaT: "10.0" })
  const [ph, setPh] = useState({ h: "0.001" })
  const [reactionId, setReactionId] = useState(REACTION_RECORDS[0]?.id ?? "")
  const selectedReaction = useMemo(
    () => REACTION_RECORDS.find((reaction) => reaction.id === reactionId) ?? REACTION_RECORDS[0],
    [reactionId],
  )
  const parsedReaction = useMemo(
    () => (selectedReaction ? parseEquation(selectedReaction.balancedEquation) : null),
    [selectedReaction],
  )
  const [stoich, setStoich] = useState({ knownFormula: "", targetFormula: "", knownMoles: "1.00" })

  useEffect(() => {
    setStats(readLocalStats())

    const params = new URLSearchParams(window.location.search)
    const requestedModule = resolveSolverModuleDeepLink(params.get("module"))
    if (requestedModule && SOLVER_MODULES.some((module) => module.id === requestedModule)) {
      setModuleId(requestedModule as SolverModuleId)
    }
  }, [])

  useEffect(() => {
    document.getElementById("solver-module")?.scrollIntoView({ block: "start" })
  }, [moduleId])

  useEffect(() => {
    const firstReactant = parsedReaction?.reactants[0]?.formula ?? ""
    const firstProduct = parsedReaction?.products[0]?.formula ?? ""
    setStoich((current) => ({
      ...current,
      knownFormula: firstReactant,
      targetFormula: firstProduct,
    }))
  }, [parsedReaction])

  const activeModule = SOLVER_MODULES.find((module) => module.id === moduleId) ?? SOLVER_MODULES[0]
  const activeFormula = getFormulaForSolverModule(activeModule.id)
  const accuracy = stats.correct + stats.missed > 0 ? Math.round((stats.correct / (stats.correct + stats.missed)) * 100) : 0
  const studySnapshot = useMemo(
    () => calculateStudySnapshot({ events: studyProgress.events }),
    [studyProgress.events],
  )
  const activeStudyTopic = getStudyTopicForSolver(activeModule.id)
  const activeMastery = getTopicMastery(studySnapshot, activeStudyTopic?.id)

  function updateStats(patch: Partial<LocalSolverStats>) {
    setStats((current) => {
      const next = { ...current, ...patch }
      writeLocalStats(next)
      return next
    })
  }

  function solve() {
    setError(null)
    setTrackingMessage(null)
    setTracking(null)

    try {
      let nextResult: SolverResult
      if (moduleId === "molarity") {
        nextResult = solveMolarity(numberRequired(molarity.moles, "Moles"), numberRequired(molarity.volume, "Volume"))
      } else if (moduleId === "dilution") {
        nextResult = solveDilution({
          m1: numberOrUndefined(dilution.m1),
          v1: numberOrUndefined(dilution.v1),
          m2: numberOrUndefined(dilution.m2),
          v2: numberOrUndefined(dilution.v2),
        })
      } else if (moduleId === "percent-yield") {
        nextResult = solvePercentYield(
          numberRequired(yieldInputs.actual, "Actual yield"),
          numberRequired(yieldInputs.theoretical, "Theoretical yield"),
        )
      } else if (moduleId === "empirical-formula") {
        nextResult = solveEmpiricalFormula(
          empiricalRows.map((row) => ({ element: row.element, mass: numberRequired(row.mass, `${row.element} mass`) })),
        )
      } else if (moduleId === "ideal-gas-law") {
        nextResult = solveIdealGas({
          p: numberOrUndefined(gas.p),
          v: numberOrUndefined(gas.v),
          n: numberOrUndefined(gas.n),
          t: numberOrUndefined(gas.t),
        })
      } else if (moduleId === "calorimetry") {
        nextResult = solveCalorimetry(
          numberRequired(calorimetry.mass, "Mass"),
          numberRequired(calorimetry.c, "Specific heat"),
          numberRequired(calorimetry.deltaT, "Delta T"),
        )
      } else if (moduleId === "ph") {
        nextResult = solvePh(numberRequired(ph.h, "[H+]"))
      } else {
        nextResult = solveStoichiometry({
          reactionId,
          knownFormula: stoich.knownFormula,
          targetFormula: stoich.targetFormula,
          knownMoles: numberRequired(stoich.knownMoles, "Known amount"),
        })
      }

      setResult(nextResult)
      setStudyProgress(
        recordStudyEvent({
          type: "solver_used",
          entityId: activeModule.id,
          topic: activeModule.topic,
          subtopic: activeModule.title,
        }),
      )
      updateStats({ solved: stats.solved + 1, workedExamples: stats.workedExamples + 1 })
    } catch (caught) {
      setResult(null)
      setError(caught instanceof Error ? caught.message : "Could not solve this problem.")
    }
  }

  async function mark(correct: boolean) {
    if (!result) return
    setTracking(correct ? "correct" : "missed")
    setTrackingMessage(null)
    const response = await addPracticeProgress({
      topic: "Chemistry Calculations",
      subtopic: result.title,
      difficulty: result.difficulty,
      questionType: "Chemistry Solver",
      source: "database",
      correct,
    })
    setStudyProgress(
      recordStudyEvent({
        type: correct ? "practice_correct" : "practice_incorrect",
        topicId: activeStudyTopic?.id,
        topic: "Chemistry Calculations",
        subtopic: result.title,
        entityId: activeModule.id,
      }),
    )
    updateStats(correct ? { correct: stats.correct + 1 } : { missed: stats.missed + 1 })
    setTracking(null)
    setTrackingMessage(
      response.ok
        ? "Saved to your learning dashboard."
        : "Saved locally for this browser. Sign in to store solver progress permanently.",
    )
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Calculator className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">ARSHLAB v5.0.0</Badge>
                  <Badge variant="outline">Database mode = no AI usage</Badge>
                  <Badge variant="outline">Deterministic solver</Badge>
                </div>
                <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Chemistry Solver Engine</h1>
                <p className="mt-2 max-w-3xl text-muted-foreground">
                  Enter values and ARSHLAB shows the full calculation path: given values, formula, substitution,
                  calculation, answer, and unit check.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild variant="outline" className="w-full rounded-xl sm:w-auto">
                <Link href="/formula-sheet">
                  Formula Sheet
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full rounded-xl sm:w-auto">
                <Link href="/practice-generator?topic=Chemistry%20Calculations&source=database">
                  Solver Practice
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild className="w-full rounded-xl sm:w-auto">
                <Link href="/learning-dashboard">
                  Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Solver modules" value={solverMetrics.solverModules} />
            <Metric label="Problems solved" value={stats.solved} />
            <Metric label="Worked examples generated" value={stats.workedExamples} />
            <Metric label="Topics covered" value={solverMetrics.topicsCovered} />
          </div>
        </motion.section>

        <section className="grid min-w-0 gap-6 lg:grid-cols-[300px_minmax(0,1fr)_340px]">
          <Card className="h-fit rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <ListChecks className="h-5 w-5" />
                Solver Modules
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
              {SOLVER_MODULES.map((module) => (
                <div
                  key={module.id}
                  className={cn(
                    "rounded-xl border p-3 transition-colors",
                    module.id === moduleId
                      ? "border-primary bg-primary/10"
                      : "border-border bg-secondary/20 hover:bg-secondary",
                  )}
                >
                  <button
                    type="button"
                    onClick={() => {
                      setModuleId(module.id)
                      setResult(null)
                      setError(null)
                      setTrackingMessage(null)
                    }}
                    className="w-full text-left"
                  >
                    <span className="block text-sm font-semibold">{module.title}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">{module.formula}</span>
                  </button>
                  {getFormulaForSolverModule(module.id) ? (
                    <Button asChild variant="outline" size="sm" className="mt-3 w-full rounded-xl">
                      <Link href={formulaHref(getFormulaForSolverModule(module.id)!.id)}>
                        <BookOpenCheck className="h-4 w-4" />
                        View Formula
                      </Link>
                    </Button>
                  ) : null}
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="min-w-0 space-y-6">
            <Card id="solver-module" className="scroll-mt-24 rounded-2xl border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FlaskConical className="h-5 w-5" />
                  {activeModule.title}
                </CardTitle>
                {activeFormula ? (
                  <Button asChild variant="outline" size="sm" className="w-fit rounded-xl">
                    <Link href={formulaHref(activeFormula.id)}>
                      <BookOpenCheck className="h-4 w-4" />
                      View Formula
                    </Link>
                  </Button>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-5">
                <SolverInputs
                  moduleId={moduleId}
                  molarity={molarity}
                  setMolarity={setMolarity}
                  dilution={dilution}
                  setDilution={setDilution}
                  yieldInputs={yieldInputs}
                  setYieldInputs={setYieldInputs}
                  empiricalRows={empiricalRows}
                  setEmpiricalRows={setEmpiricalRows}
                  gas={gas}
                  setGas={setGas}
                  calorimetry={calorimetry}
                  setCalorimetry={setCalorimetry}
                  ph={ph}
                  setPh={setPh}
                  reactionId={reactionId}
                  setReactionId={setReactionId}
                  parsedReaction={parsedReaction}
                  stoich={stoich}
                  setStoich={setStoich}
                />

                {error ? (
                  <Alert className="rounded-2xl border-destructive/30 bg-destructive/10">
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Check your inputs</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                ) : null}

                <Button onClick={solve} className="w-full rounded-xl sm:w-auto">
                  Solve Step-by-Step
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </CardContent>
            </Card>

            {result ? (
              <Card className="rounded-2xl">
                <CardHeader>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <CardTitle className="text-lg">Worked Solution</CardTitle>
                    <Badge className="w-fit">{result.answer}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-3">
                    {result.steps.map((step, index) => (
                      <div key={`${step.label}-${index}`} className="grid gap-2 sm:grid-cols-[140px_minmax(0,1fr)]">
                        <div className="flex items-center gap-2">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                            {index + 1}
                          </div>
                          <p className="font-semibold">{step.label}</p>
                        </div>
                        <div className="rounded-xl border border-border bg-secondary/20 p-3">
                          <p className="break-words font-mono text-sm">{step.expression}</p>
                          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-sm text-muted-foreground">
                      Mark this worked example to track solver accuracy on your learning dashboard.
                    </p>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <Button variant="outline" className="rounded-xl" disabled={Boolean(tracking)} onClick={() => mark(true)}>
                        {tracking === "correct" ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        I got this right
                      </Button>
                      <Button variant="outline" className="rounded-xl" disabled={Boolean(tracking)} onClick={() => mark(false)}>
                        {tracking === "missed" ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                        I missed this
                      </Button>
                    </div>
                  </div>
                  {trackingMessage ? (
                    <p className="rounded-xl border border-border bg-secondary/20 p-3 text-sm text-muted-foreground">
                      {trackingMessage}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ) : (
              <Card className="rounded-2xl border-dashed">
                <CardContent className="p-6 text-sm text-muted-foreground">
                  Solve a module to see the full Given, Formula, Substitution, Calculation, Answer, and Unit Check pathway.
                </CardContent>
              </Card>
            )}
          </div>

          <aside className="space-y-4">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5" />
                  Learning Features
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <Info label="Difficulty" value={activeModule.difficulty} />
                <Info label="Related topic" value={activeModule.topic} />
                <Info label="Formula" value={activeModule.formula} />
                <Info label="Confidence estimate" value={`${activeMastery}% mastery`} />
                <Info label="Local accuracy" value={stats.correct + stats.missed > 0 ? `${accuracy}%` : "No marked attempts yet"} />
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">Common Mistakes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {activeModule.commonMistakes.map((mistake) => (
                  <p key={mistake} className="rounded-xl border border-border bg-secondary/20 p-3 text-sm text-muted-foreground">
                    {mistake}
                  </p>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">Unit Reminders</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {activeModule.unitReminders.map((reminder) => (
                  <p key={reminder} className="rounded-xl border border-border bg-secondary/20 p-3 text-sm text-muted-foreground">
                    {reminder}
                  </p>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-teal-500/20 bg-teal-500/5">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center gap-2">
                  <Database className="h-5 w-5 text-teal-600" />
                  <p className="font-semibold">Solver Practice</p>
                </div>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Generate calculation questions and worked examples from deterministic local templates.
                </p>
                <Button asChild className="w-full rounded-xl">
                  <Link href="/practice-generator?topic=Chemistry%20Calculations&source=database">
                    Open Practice
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </aside>
        </section>
      </div>
    </main>
  )
}

function SolverInputs(props: {
  moduleId: SolverModuleId
  molarity: { moles: string; volume: string }
  setMolarity: (value: { moles: string; volume: string }) => void
  dilution: { m1: string; v1: string; m2: string; v2: string }
  setDilution: (value: { m1: string; v1: string; m2: string; v2: string }) => void
  yieldInputs: { actual: string; theoretical: string }
  setYieldInputs: (value: { actual: string; theoretical: string }) => void
  empiricalRows: Array<{ element: string; mass: string }>
  setEmpiricalRows: (value: Array<{ element: string; mass: string }>) => void
  gas: { p: string; v: string; n: string; t: string }
  setGas: (value: { p: string; v: string; n: string; t: string }) => void
  calorimetry: { mass: string; c: string; deltaT: string }
  setCalorimetry: (value: { mass: string; c: string; deltaT: string }) => void
  ph: { h: string }
  setPh: (value: { h: string }) => void
  reactionId: string
  setReactionId: (value: string) => void
  parsedReaction: ReturnType<typeof parseEquation>
  stoich: { knownFormula: string; targetFormula: string; knownMoles: string }
  setStoich: (value: { knownFormula: string; targetFormula: string; knownMoles: string }) => void
}) {
  if (props.moduleId === "molarity") {
    return (
      <InputGrid>
        <NumberField label="Moles, n (mol)" value={props.molarity.moles} onChange={(moles) => props.setMolarity({ ...props.molarity, moles })} />
        <NumberField label="Volume, V (L)" value={props.molarity.volume} onChange={(volume) => props.setMolarity({ ...props.molarity, volume })} />
      </InputGrid>
    )
  }

  if (props.moduleId === "dilution") {
    return (
      <InputGrid>
        <NumberField label="M1" value={props.dilution.m1} onChange={(m1) => props.setDilution({ ...props.dilution, m1 })} />
        <NumberField label="V1" value={props.dilution.v1} onChange={(v1) => props.setDilution({ ...props.dilution, v1 })} />
        <NumberField label="M2" value={props.dilution.m2} onChange={(m2) => props.setDilution({ ...props.dilution, m2 })} />
        <NumberField label="V2 (leave one blank)" value={props.dilution.v2} onChange={(v2) => props.setDilution({ ...props.dilution, v2 })} />
      </InputGrid>
    )
  }

  if (props.moduleId === "percent-yield") {
    return (
      <InputGrid>
        <NumberField label="Actual yield" value={props.yieldInputs.actual} onChange={(actual) => props.setYieldInputs({ ...props.yieldInputs, actual })} />
        <NumberField label="Theoretical yield" value={props.yieldInputs.theoretical} onChange={(theoretical) => props.setYieldInputs({ ...props.yieldInputs, theoretical })} />
      </InputGrid>
    )
  }

  if (props.moduleId === "empirical-formula") {
    return (
      <div className="space-y-3">
        {props.empiricalRows.map((row, index) => (
          <div key={index} className="grid gap-3 rounded-xl border border-border bg-background/80 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <TextField
              label="Element name or symbol"
              value={row.element}
              onChange={(element) => {
                const rows = [...props.empiricalRows]
                rows[index] = { ...rows[index], element }
                props.setEmpiricalRows(rows)
              }}
            />
            <NumberField
              label="Mass (g)"
              value={row.mass}
              onChange={(mass) => {
                const rows = [...props.empiricalRows]
                rows[index] = { ...rows[index], mass }
                props.setEmpiricalRows(rows)
              }}
            />
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={props.empiricalRows.length <= 2}
              onClick={() => props.setEmpiricalRows(props.empiricalRows.filter((_row, rowIndex) => rowIndex !== index))}
            >
              Remove
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          onClick={() => props.setEmpiricalRows([...props.empiricalRows, { element: "O", mass: "16.0" }])}
        >
          Add Element
        </Button>
      </div>
    )
  }

  if (props.moduleId === "ideal-gas-law") {
    return (
      <InputGrid>
        <NumberField label="P (atm)" value={props.gas.p} onChange={(p) => props.setGas({ ...props.gas, p })} />
        <NumberField label="V (L, leave one blank)" value={props.gas.v} onChange={(v) => props.setGas({ ...props.gas, v })} />
        <NumberField label="n (mol)" value={props.gas.n} onChange={(n) => props.setGas({ ...props.gas, n })} />
        <NumberField label="T (K)" value={props.gas.t} onChange={(t) => props.setGas({ ...props.gas, t })} />
      </InputGrid>
    )
  }

  if (props.moduleId === "calorimetry") {
    return (
      <InputGrid>
        <NumberField label="m (g)" value={props.calorimetry.mass} onChange={(mass) => props.setCalorimetry({ ...props.calorimetry, mass })} />
        <NumberField label="c (J/g C)" value={props.calorimetry.c} onChange={(c) => props.setCalorimetry({ ...props.calorimetry, c })} />
        <NumberField label="delta T (C)" value={props.calorimetry.deltaT} onChange={(deltaT) => props.setCalorimetry({ ...props.calorimetry, deltaT })} />
      </InputGrid>
    )
  }

  if (props.moduleId === "ph") {
    return (
      <InputGrid>
        <NumberField label="[H+] (mol/L)" value={props.ph.h} onChange={(h) => props.setPh({ h })} />
      </InputGrid>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-2">
        <Label>Reaction</Label>
        <Select value={props.reactionId} onValueChange={props.setReactionId}>
          <SelectTrigger className="min-h-11 rounded-xl">
            <SelectValue placeholder="Select reaction" />
          </SelectTrigger>
          <SelectContent>
            {REACTION_RECORDS.slice(0, 80).map((reaction) => (
              <SelectItem key={reaction.id} value={reaction.id}>
                {reaction.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <InputGrid>
        <SelectField
          label="Known reactant"
          value={props.stoich.knownFormula}
          options={props.parsedReaction?.reactants.map((species) => species.formula) ?? []}
          onChange={(knownFormula) => props.setStoich({ ...props.stoich, knownFormula })}
        />
        <NumberField label="Known amount (mol)" value={props.stoich.knownMoles} onChange={(knownMoles) => props.setStoich({ ...props.stoich, knownMoles })} />
        <SelectField
          label="Target product"
          value={props.stoich.targetFormula}
          options={props.parsedReaction?.products.map((species) => species.formula) ?? []}
          onChange={(targetFormula) => props.setStoich({ ...props.stoich, targetFormula })}
        />
      </InputGrid>
      {props.parsedReaction ? (
        <p className="rounded-xl border border-border bg-secondary/20 p-3 font-mono text-sm">
          {props.parsedReaction.reactants.map((item) => `${item.coefficient > 1 ? item.coefficient : ""}${item.formula}`).join(" + ")}
          {" -> "}
          {props.parsedReaction.products.map((item) => `${item.coefficient > 1 ? item.coefficient : ""}${item.formula}`).join(" + ")}
        </p>
      ) : null}
    </div>
  )
}

function InputGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2">{children}</div>
}

function NumberField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} inputMode="decimal" className="h-11 rounded-xl" />
    </div>
  )
}

function TextField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Input value={value} onChange={(event) => onChange(event.target.value)} className="h-11 rounded-xl" />
    </div>
  )
}

function SelectField({
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
  const safeValue = value || options[0] || ""
  return (
    <div className="grid gap-2">
      <Label>{label}</Label>
      <Select value={safeValue} onValueChange={onChange}>
        <SelectTrigger className="h-11 rounded-xl">
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
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

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/20 px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 break-words">{value}</p>
    </div>
  )
}
