"use client"

import { FormEvent, useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  Atom,
  BadgeInfo,
  BookOpen,
  Boxes,
  Play,
  RotateCcw,
  Search,
  Sparkles,
} from "lucide-react"
import {
  ALL_ELEMENTS,
  getElectronConfigurationException,
} from "@/lib/chemistry/database/periodic-table"
import type { ElementRecord, OrbitalSubshellDiagram } from "@/lib/chemistry/database/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

const QUICK_CHIPS = ["H", "O", "Na", "Fe", "Cu", "Cr", "Xe"]
const EXCEPTION_CHIPS = ["Cr", "Cu", "Mo", "Ag", "Au"]

const PRINCIPLE_CARDS = [
  {
    title: "Aufbau Principle",
    body: "Electrons occupy the lowest available energy orbitals before moving into higher-energy subshells.",
  },
  {
    title: "Hund's Rule",
    body: "Orbitals with the same energy fill singly first, with parallel spins, before electrons pair up.",
  },
  {
    title: "Pauli Exclusion Principle",
    body: "A single orbital can hold at most two electrons, and paired electrons must have opposite spins.",
  },
]

interface ElectronStep {
  label: string
  boxIndex: number
  spin: "↑" | "↓"
  electronNumber: number
}

function normalizeTerm(value: string): string {
  return value.trim().toLowerCase()
}

function findElement(value: string): ElementRecord | undefined {
  const term = normalizeTerm(value)
  if (!term) return undefined

  return ALL_ELEMENTS.find(
    (element) =>
      element.symbol.toLowerCase() === term ||
      element.name.toLowerCase() === term ||
      String(element.atomicNumber) === term,
  )
}

function categoryLabel(category: string): string {
  return category.replace(/-/g, " ")
}

function electronCount(box: string): number {
  return (box.includes("↑") ? 1 : 0) + (box.includes("↓") ? 1 : 0)
}

function buildElectronSteps(diagram: OrbitalSubshellDiagram[]): ElectronStep[] {
  const steps: ElectronStep[] = []

  for (const subshell of diagram) {
    const count = subshell.boxes.reduce((total, box) => total + electronCount(box), 0)
    let remaining = count

    for (let i = 0; i < subshell.boxes.length && remaining > 0; i++) {
      steps.push({
        label: subshell.label,
        boxIndex: i,
        spin: "↑",
        electronNumber: steps.length + 1,
      })
      remaining--
    }

    for (let i = 0; i < subshell.boxes.length && remaining > 0; i++) {
      steps.push({
        label: subshell.label,
        boxIndex: i,
        spin: "↓",
        electronNumber: steps.length + 1,
      })
      remaining--
    }
  }

  return steps
}

function buildAnimatedDiagram(
  diagram: OrbitalSubshellDiagram[],
  steps: ElectronStep[],
  visibleSteps: number,
): OrbitalSubshellDiagram[] {
  const state = diagram.map((subshell) => ({
    label: subshell.label,
    boxes: Array<string>(subshell.boxes.length).fill(""),
  }))
  const byLabel = new Map(state.map((subshell) => [subshell.label, subshell]))

  for (const step of steps.slice(0, visibleSteps)) {
    const subshell = byLabel.get(step.label)
    if (!subshell) continue
    const current = subshell.boxes[step.boxIndex]
    subshell.boxes[step.boxIndex] = current ? `${current}${step.spin}` : step.spin
  }

  return state
}

function formatOxidationStates(states: number[]): string {
  if (!states.length) return "Common states vary"
  return states.map((state) => (state > 0 ? `+${state}` : String(state))).join(", ")
}

export default function ElectronConfigurationsPage() {
  const [query, setQuery] = useState("O")
  const [selected, setSelected] = useState<ElementRecord>(() => findElement("O") ?? ALL_ELEMENTS[7])
  const [animationStep, setAnimationStep] = useState<number | null>(null)

  const matches = useMemo(() => {
    const term = normalizeTerm(query)
    if (!term) return []

    return ALL_ELEMENTS.filter(
      (element) =>
        element.symbol.toLowerCase().startsWith(term) ||
        element.name.toLowerCase().includes(term) ||
        String(element.atomicNumber) === term,
    ).slice(0, 8)
  }, [query])

  const exception = getElectronConfigurationException(selected.atomicNumber)
  const electronSteps = useMemo(() => buildElectronSteps(selected.orbitalDiagram), [selected])
  const isAnimating = animationStep !== null && animationStep < electronSteps.length
  const visibleStepCount = animationStep ?? electronSteps.length
  const diagram = useMemo(
    () => buildAnimatedDiagram(selected.orbitalDiagram, electronSteps, visibleStepCount),
    [selected.orbitalDiagram, electronSteps, visibleStepCount],
  )
  const currentStep =
    animationStep !== null && animationStep > 0 ? electronSteps[animationStep - 1] : null

  useEffect(() => {
    setAnimationStep(null)
  }, [selected.atomicNumber])

  useEffect(() => {
    if (animationStep === null) return
    if (animationStep >= electronSteps.length) return

    const timeout = window.setTimeout(() => {
      setAnimationStep((step) => (step === null ? null : step + 1))
    }, 220)

    return () => window.clearTimeout(timeout)
  }, [animationStep, electronSteps.length])

  function chooseElement(element: ElementRecord) {
    setSelected(element)
    setQuery(element.symbol)
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const direct = findElement(query)
    const next = direct ?? matches[0]
    if (next) chooseElement(next)
  }

  function startAnimation() {
    setAnimationStep(0)
  }

  function resetAnimation() {
    setAnimationStep(null)
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Atom className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Electron Configuration Builder</h1>
              <p className="text-muted-foreground">
                Aufbau filling, Hund's rule, Pauli exclusion, and key d-block exceptions
              </p>
            </div>
          </div>
          <p className="text-lg text-muted-foreground max-w-3xl mt-4">
            Search an element, watch its electrons enter orbitals, and compare expected versus
            actual configurations for the classic exception cases.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <div className="space-y-6">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Search className="h-5 w-5" />
                  Element Search
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleSearch} className="flex gap-2">
                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Name, symbol, or atomic number"
                    className="h-11 rounded-xl"
                  />
                  <Button type="submit" className="h-11 rounded-xl">
                    Search
                  </Button>
                </form>

                <div className="flex flex-wrap gap-2">
                  {QUICK_CHIPS.map((symbol) => {
                    const element = findElement(symbol)
                    if (!element) return null

                    return (
                      <button
                        key={symbol}
                        type="button"
                        onClick={() => chooseElement(element)}
                        className={cn(
                          "rounded-lg border px-3 py-1.5 font-mono text-sm font-medium transition-all",
                          selected.symbol === symbol
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border bg-secondary/30 text-foreground hover:bg-secondary",
                        )}
                      >
                        {symbol}
                      </button>
                    )
                  })}
                </div>

                {matches.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium uppercase text-muted-foreground">Matches</p>
                    <div className="grid gap-2">
                      {matches.map((element) => (
                        <button
                          key={element.id}
                          type="button"
                          onClick={() => chooseElement(element)}
                          className={cn(
                            "flex items-center justify-between rounded-xl border px-3 py-2 text-left transition-colors hover:bg-secondary/60",
                            selected.id === element.id
                              ? "border-primary bg-primary/5"
                              : "border-border bg-secondary/20",
                          )}
                        >
                          <span>
                            <span className="font-medium">{element.name}</span>
                            <span className="ml-2 font-mono text-sm text-muted-foreground">
                              {element.symbol}
                            </span>
                          </span>
                          <Badge variant="outline" className="font-mono">
                            {element.atomicNumber}
                          </Badge>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <BadgeInfo className="h-5 w-5" />
                  Basic Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3">
                <InfoRow label="Name" value={selected.name} />
                <InfoRow label="Symbol" value={selected.symbol} mono />
                <InfoRow label="Atomic Number" value={String(selected.atomicNumber)} mono />
                <InfoRow label="Category" value={categoryLabel(selected.category)} />
                <InfoRow label="Oxidation States" value={formatOxidationStates(selected.oxidationStates)} />
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <div className="grid gap-4 xl:grid-cols-2">
              <ConfigCard title="Full Electron Configuration" value={selected.electronConfiguration} />
              <ConfigCard
                title="Noble Gas Shorthand"
                value={selected.shorthandConfiguration ?? selected.electronConfiguration}
              />
            </div>

            <Card className="rounded-2xl">
              <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Boxes className="h-5 w-5" />
                    Orbital Box Diagram
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    Degenerate orbitals fill singly first, then pair with opposite spin.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={startAnimation} className="rounded-xl" disabled={isAnimating}>
                    <Play className="h-4 w-4" />
                    Animate Electron Filling
                  </Button>
                  <Button onClick={resetAnimation} variant="outline" className="rounded-xl">
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="secondary" className="font-mono">
                    {visibleStepCount}/{electronSteps.length} electrons
                  </Badge>
                  {currentStep && (
                    <span>
                      Electron {currentStep.electronNumber} entering {currentStep.label}
                    </span>
                  )}
                </div>
                <OrbitalDiagram diagram={diagram} currentStep={currentStep} />
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5" />
                  Teaching Exceptions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {EXCEPTION_CHIPS.map((symbol) => {
                    const element = findElement(symbol)
                    if (!element) return null

                    return (
                      <Button
                        key={symbol}
                        type="button"
                        variant={selected.symbol === symbol ? "default" : "outline"}
                        size="sm"
                        className="rounded-lg font-mono"
                        onClick={() => chooseElement(element)}
                      >
                        {symbol}
                      </Button>
                    )
                  })}
                </div>

                {exception ? (
                  <div className="grid gap-3 md:grid-cols-3">
                    <ExceptionTile label="Expected" value={exception.expected} />
                    <ExceptionTile label="Actual" value={exception.actual} accent />
                    <ExceptionTile label="Reason" value={exception.reason} />
                    <div className="md:col-span-3 rounded-xl border border-border bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
                      {exception.note}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
                    {selected.name} follows the standard Aufbau filling pattern at this teaching
                    level. Use the exception chips to compare Cr, Cu, Mo, Ag, and Au.
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-3">
              {PRINCIPLE_CARDS.map((card) => (
                <Card key={card.title} className="rounded-2xl">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      {card.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-muted-foreground">{card.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function InfoRow({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card/70 px-3 py-2">
      <span className="text-xs uppercase text-muted-foreground">{label}</span>
      <span className={cn("text-sm font-medium capitalize text-right", mono && "font-mono normal-case")}>
        {value}
      </span>
    </div>
  )
}

function ConfigCard({ title, value }: { title: string; value: string }) {
  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-mono text-lg leading-relaxed text-primary">{value}</p>
      </CardContent>
    </Card>
  )
}

function ExceptionTile({
  label,
  value,
  accent = false,
}: {
  label: string
  value: string
  accent?: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-xl border px-4 py-3",
        accent ? "border-primary/30 bg-primary/5" : "border-border bg-secondary/20",
      )}
    >
      <p className="text-[10px] uppercase text-muted-foreground mb-1">{label}</p>
      <p className="font-mono text-sm leading-relaxed">{value}</p>
    </div>
  )
}

function OrbitalDiagram({
  diagram,
  currentStep,
}: {
  diagram: OrbitalSubshellDiagram[]
  currentStep: ElectronStep | null
}) {
  return (
    <div className="space-y-3 overflow-x-auto">
      {diagram.map((subshell) => (
        <div key={subshell.label} className="flex min-w-max items-center gap-3">
          <span className="w-10 shrink-0 font-mono text-sm font-medium text-muted-foreground">
            {subshell.label}
          </span>
          <div className="flex gap-1.5">
            {subshell.boxes.map((box, index) => {
              const isActive =
                currentStep?.label === subshell.label && currentStep.boxIndex === index

              return (
                <div
                  key={`${subshell.label}-${index}`}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-secondary/30 font-mono text-base transition-all",
                    box && "border-accent/50 bg-accent/10",
                    isActive && "scale-110 border-primary bg-primary text-primary-foreground shadow-sm",
                  )}
                >
                  {box}
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
