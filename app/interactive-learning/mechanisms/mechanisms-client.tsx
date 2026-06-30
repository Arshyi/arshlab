"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, type KeyboardEvent } from "react"
import {
  ArrowLeft,
  ArrowRight,
  Atom,
  BookOpenCheck,
  CheckCircle2,
  FlaskConical,
  MousePointer2,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  XCircle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  buildAtomTrackingPaths,
  buildCurvedArrowPrimitives,
  classifyArrowKind,
  computeBondTransitions,
  describeArrowMotion,
  evaluatePracticePrompt,
  explainArrow,
  explainAtom,
  explainBond,
  getCurrentStep,
  getElectronTracking,
  getEnergyDiagramPoints,
  getEnergyExtrema,
  getMechanismByReaction,
  getMechanismLibraryMetrics,
  listReactionMechanisms,
  mechanismSimulatorHref,
  type CurvedArrow,
  type MechanismAtom,
  type MechanismBond,
  type MechanismPracticeStatus,
  type MechanismStep,
  type ReactionMechanism,
} from "@/lib/interactive-learning/mechanisms"

interface MechanismSimulatorClientProps {
  initialReaction?: string
  initialCompound?: string
}

type Selected =
  | { type: "atom"; id: string }
  | { type: "bond"; id: string }
  | { type: "arrow"; id: string }
  | null

const atomColors: Record<string, string> = {
  C: "#172033",
  H: "#e5e7eb",
  O: "#ef4444",
  N: "#2563eb",
  Br: "#7f1d1d",
  Cl: "#22c55e",
}

export function MechanismSimulatorClient({ initialReaction, initialCompound }: MechanismSimulatorClientProps) {
  const library = useMemo(() => listReactionMechanisms(), [])
  const [reactionId, setReactionId] = useState(getMechanismByReaction(initialReaction).id)
  const [stepIndex, setStepIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(900)
  const [showElectronOrigin, setShowElectronOrigin] = useState(true)
  const [showStationaryElectrons, setShowStationaryElectrons] = useState(true)
  const [practiceMode, setPracticeMode] = useState(false)
  const [selected, setSelected] = useState<Selected>(null)
  const [selectedPracticeChoice, setSelectedPracticeChoice] = useState<string | null>(null)

  const mechanism = useMemo(() => getMechanismByReaction(reactionId), [reactionId])
  const step = getCurrentStep(mechanism, stepIndex)
  const nextStep = mechanism.steps[Math.min(mechanism.steps.length - 1, stepIndex + 1)]
  const previousStep = mechanism.steps[Math.max(0, stepIndex - 1)]
  const energyPoints = getEnergyDiagramPoints(mechanism)
  const energyExtrema = getEnergyExtrema(mechanism)
  const metrics = getMechanismLibraryMetrics()
  const atomPaths = useMemo(() => buildAtomTrackingPaths(mechanism), [mechanism])
  const electronTracking = useMemo(() => getElectronTracking(step), [step])
  const transitions = useMemo(
    () => (nextStep && nextStep.id !== step.id ? computeBondTransitions(step, nextStep) : computeBondTransitions(previousStep, step)),
    [nextStep, previousStep, step],
  )
  const practicePrompt = mechanism.practicePrompts.find((prompt) => prompt.stepId === step.id) ?? mechanism.practicePrompts[0]
  const chosenChoice = practicePrompt?.choices.find((choice) => choice.id === selectedPracticeChoice)
  const practiceEvaluation = practicePrompt && chosenChoice
    ? evaluatePracticePrompt(mechanism, practicePrompt.id, chosenChoice.arrowIds)
    : null

  useEffect(() => {
    const resolved = getMechanismByReaction(initialReaction)
    setReactionId(resolved.id)
    setStepIndex(0)
  }, [initialReaction])

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      setStepIndex((current) => {
        if (current >= mechanism.steps.length - 1) {
          setPlaying(false)
          return current
        }
        return current + 1
      })
    }, speed)
    return () => window.clearInterval(timer)
  }, [mechanism.steps.length, playing, speed])

  useEffect(() => {
    setSelectedPracticeChoice(null)
    setSelected(null)
  }, [mechanism.id, step.id])

  function chooseMechanism(id: string) {
    setReactionId(id)
    setStepIndex(0)
    setPlaying(false)
    window.history.replaceState(null, "", mechanismSimulatorHref({ reaction: id, compound: initialCompound }))
  }

  function move(delta: number) {
    setPlaying(false)
    setStepIndex((current) => Math.max(0, Math.min(mechanism.steps.length - 1, current + delta)))
  }

  function restart() {
    setPlaying(false)
    setStepIndex(0)
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 grid gap-6 lg:grid-cols-[1fr_380px] lg:items-end">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge className="rounded-full">ARSHLAB v10.0.0</Badge>
              <Badge variant="outline" className="rounded-full">SVG only</Badge>
              <Badge variant="outline" className="rounded-full">Database mode = no AI usage</Badge>
              <Badge variant="outline" className="rounded-full">Deterministic mechanism states</Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Interactive Reaction Mechanism Simulator</h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
              Animate elementary organic mechanisms with curved arrows, atom tracking, electron tracking,
              live bond-order changes, energy diagrams, reasoning panels, common mistakes, and practice mode.
            </p>
          </div>
          <Card className="rounded-2xl border-teal-500/20 bg-teal-500/5">
            <CardContent className="grid grid-cols-2 gap-3 p-5">
              <Metric label="Mechanisms" value={String(metrics.mechanisms)} />
              <Metric label="Mechanism states" value={String(metrics.steps)} />
              <Metric label="Curved arrows" value={String(metrics.curvedArrows)} />
              <Metric label="Practice prompts" value={String(metrics.practicePrompts)} />
            </CardContent>
          </Card>
        </section>

        <div className="grid gap-6 xl:grid-cols-[300px_minmax(0,1fr)_360px]">
          <aside className="space-y-4">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <FlaskConical className="h-5 w-5" />
                  Mechanism Library
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {library.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => chooseMechanism(item.id)}
                    className={`w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                      item.id === mechanism.id ? "border-primary bg-primary/10" : "border-border bg-secondary/20 hover:bg-secondary"
                    }`}
                  >
                    <span className="block text-sm font-semibold">{item.name}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {item.category} | {item.difficulty}
                    </span>
                  </button>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">Simulator Controls</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-4 gap-2">
                  <Button type="button" size="icon" variant="outline" onClick={() => move(-1)} disabled={stepIndex === 0} aria-label="Step back">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="icon" onClick={() => setPlaying((value) => !value)} aria-label={playing ? "Pause" : "Play"}>
                    {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button type="button" size="icon" variant="outline" onClick={() => move(1)} disabled={stepIndex === mechanism.steps.length - 1} aria-label="Step forward">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button type="button" size="icon" variant="outline" onClick={restart} aria-label="Restart">
                    <RotateCcw className="h-4 w-4" />
                  </Button>
                </div>
                <label className="block text-sm font-medium">
                  Animation speed
                  <select
                    value={speed}
                    onChange={(event) => setSpeed(Number(event.target.value))}
                    className="mt-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm"
                  >
                    <option value={1400}>Slow</option>
                    <option value={900}>Normal</option>
                    <option value={450}>Fast</option>
                  </select>
                </label>
                <label className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm">
                  <span>Practice mode hides arrows</span>
                  <input type="checkbox" className="h-4 w-4 accent-teal-600" checked={practiceMode} onChange={() => setPracticeMode((value) => !value)} />
                </label>
                <label className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm">
                  <span>Show electron origin</span>
                  <input type="checkbox" className="h-4 w-4 accent-teal-600" checked={showElectronOrigin} onChange={() => setShowElectronOrigin((value) => !value)} />
                </label>
                <label className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm">
                  <span>Show stationary electrons</span>
                  <input type="checkbox" className="h-4 w-4 accent-teal-600" checked={showStationaryElectrons} onChange={() => setShowStationaryElectrons((value) => !value)} />
                </label>
              </CardContent>
            </Card>
          </aside>

          <main className="space-y-4">
            <Card className="rounded-2xl">
              <CardHeader>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <CardTitle className="text-xl">{mechanism.name}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{mechanism.summary}</p>
                  </div>
                  <Badge variant="outline" className="w-fit rounded-full">
                    Step {stepIndex + 1} / {mechanism.steps.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Timeline mechanism={mechanism} activeStepId={step.id} onSelect={(id) => setStepIndex(mechanism.steps.findIndex((item) => item.id === id))} />
                <MechanismCanvas
                  step={step}
                  hideArrows={practiceMode}
                  showElectronOrigin={showElectronOrigin}
                  showStationaryElectrons={showStationaryElectrons}
                  selected={selected}
                  onSelect={setSelected}
                />
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <EnergyDiagram points={energyPoints} activeStepId={step.id} highestStepId={energyExtrema.highest.stepId} />
              <PracticeModeCard
                prompt={practicePrompt}
                selectedChoiceId={selectedPracticeChoice}
                status={practiceEvaluation?.status ?? "idle"}
                message={practiceEvaluation?.message ?? "Choose an arrow placement to check your mechanism reasoning."}
                score={practiceEvaluation?.score ?? 0}
                onChoose={setSelectedPracticeChoice}
              />
            </div>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">Reasoning Panel</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {step.reasoning.map((line) => (
                  <div key={line} className="rounded-xl border border-border bg-background/80 p-3 text-sm text-muted-foreground">
                    {line}
                  </div>
                ))}
                <div className="rounded-xl border border-teal-500/20 bg-teal-500/5 p-3 text-sm">
                  <p className="font-semibold">Electron origin</p>
                  <p className="mt-1 text-muted-foreground">{step.electronOrigin}</p>
                </div>
                <div className="rounded-xl border border-orange-500/20 bg-orange-500/5 p-3 text-sm">
                  <p className="font-semibold">Electron destination</p>
                  <p className="mt-1 text-muted-foreground">{step.electronDestination}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">Educational Cards</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {mechanism.learningCards.map((card) => (
                  <div key={card.id} className="rounded-xl border border-border bg-background/80 p-3">
                    <p className="flex items-center gap-2 text-sm font-semibold">
                      <BookOpenCheck className="h-4 w-4" />
                      {card.title}
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{card.body}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </main>

          <aside className="space-y-4">
            <Inspector step={step} selected={selected} />
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">Live Bond Updates</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {transitions.slice(0, 6).map((transition) => (
                  <div key={transition.bondTrackingId} className="rounded-xl border border-border bg-background/80 p-3 text-sm">
                    <p className="font-semibold">{transition.change}</p>
                    <p className="text-muted-foreground">{transition.explanation}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">Atom Tracking</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {atomPaths.slice(0, 5).map((path) => (
                  <div key={path.trackingId} className="rounded-xl border border-border bg-background/80 p-3 text-sm">
                    <p className="font-semibold">{path.element} {path.trackingId}</p>
                    <p className="text-muted-foreground">{path.appearances.length} stage appearance(s)</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">Electron Tracking</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {electronTracking.length ? electronTracking.map((item) => (
                  <div key={item.arrowId} className="rounded-xl border border-border bg-background/80 p-3 text-sm">
                    <p className="font-semibold">{classifyArrowKind(item.kind)}</p>
                    <p className="text-muted-foreground">{item.origin} {"->"} {item.destination}</p>
                  </div>
                )) : (
                  <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                    This stage has no moving curved arrow; compare it with adjacent stages.
                  </p>
                )}
              </CardContent>
            </Card>
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">Common Mistakes</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {mechanism.commonMistakes.map((item) => (
                  <div key={item.id} className="rounded-xl border border-border bg-background/80 p-3 text-sm">
                    <p className="font-semibold">{item.title}</p>
                    <p className="mt-1 text-muted-foreground">{item.explanation}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card className="rounded-2xl border-primary/20 bg-primary/5">
              <CardContent className="space-y-3 p-4">
                <p className="flex items-center gap-2 font-semibold">
                  <MousePointer2 className="h-4 w-4" />
                  Explorer bridge
                </p>
                <p className="text-sm text-muted-foreground">
                  Use the molecular explorer first, then open possible mechanisms for supported compounds.
                </p>
                <Button asChild variant="outline" className="w-full justify-between rounded-xl">
                  <Link href="/interactive-learning/explorer">
                    Open Molecular Explorer
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/80 p-3">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function Timeline({ mechanism, activeStepId, onSelect }: { mechanism: ReactionMechanism; activeStepId: string; onSelect: (id: string) => void }) {
  return (
    <div className="overflow-x-auto pb-1">
      <div className="flex min-w-max items-center gap-2">
        {mechanism.steps.map((step, index) => (
          <div key={step.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSelect(step.id)}
              className={`rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                step.id === activeStepId ? "border-primary bg-primary/10" : "border-border bg-secondary/20 hover:bg-secondary"
              }`}
            >
              <span className="block font-semibold">{step.label}</span>
              <span className="block text-xs text-muted-foreground">{step.stageKind}</span>
            </button>
            {index < mechanism.steps.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground" />}
          </div>
        ))}
      </div>
    </div>
  )
}

function MechanismCanvas({
  step,
  hideArrows,
  showElectronOrigin,
  showStationaryElectrons,
  selected,
  onSelect,
}: {
  step: MechanismStep
  hideArrows: boolean
  showElectronOrigin: boolean
  showStationaryElectrons: boolean
  selected: Selected
  onSelect: (selected: Selected) => void
}) {
  const arrows = useMemo(() => buildCurvedArrowPrimitives(step.arrows), [step.arrows])
  return (
    <svg viewBox="0 0 560 360" className="h-[420px] w-full rounded-2xl border border-border bg-card" role="img" aria-label={`${step.label} mechanism state`}>
      <defs>
        <filter id="mechanism-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <text x="24" y="32" className="fill-muted-foreground text-[15px] font-bold">
        {step.graph.title}
      </text>
      {step.graph.bonds.map((bond) => (
        <BondGlyph key={bond.id} step={step} bond={bond} selected={selected?.type === "bond" && selected.id === bond.id} onSelect={() => onSelect({ type: "bond", id: bond.id })} />
      ))}
      {!hideArrows && arrows.map((primitive) => (
        <g
          key={primitive.id}
          role="button"
          tabIndex={0}
          aria-label={`Curved arrow ${primitive.id}`}
          onClick={() => onSelect({ type: "arrow", id: primitive.id })}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") onSelect({ type: "arrow", id: primitive.id })
          }}
          className="cursor-pointer"
        >
          <path d={primitive.path} fill="none" stroke={selected?.type === "arrow" && selected.id === primitive.id ? "#14b8a6" : primitive.color} strokeWidth="4" strokeLinecap="round" />
          <path d={primitive.headPath} fill={selected?.type === "arrow" && selected.id === primitive.id ? "#14b8a6" : primitive.color} />
          <rect x={primitive.labelX - 18} y={primitive.labelY - 14} width="36" height="20" rx="8" fill="hsl(var(--background))" stroke={primitive.color} />
          <text x={primitive.labelX} y={primitive.labelY} textAnchor="middle" className="fill-foreground text-[10px] font-bold">
            {primitive.label}
          </text>
          <title>{primitive.explanation}</title>
        </g>
      ))}
      {step.graph.atoms.map((atom) => (
        <AtomGlyph key={atom.id} atom={atom} highlighted={step.highlightAtoms.includes(atom.id)} selected={selected?.type === "atom" && selected.id === atom.id} onSelect={() => onSelect({ type: "atom", id: atom.id })} />
      ))}
      {showElectronOrigin && step.arrows.map((arrow) => (
        <text key={`origin-${arrow.id}`} x={arrow.from.x} y={arrow.from.y - 18} textAnchor="middle" className="fill-teal-600 text-[10px] font-bold">
          origin
        </text>
      ))}
      {showStationaryElectrons && step.graph.atoms.filter((atom) => atom.lonePairs > 0 && !step.highlightAtoms.includes(atom.id)).map((atom) => (
        <text key={`stationary-${atom.id}`} x={atom.x} y={atom.y - 28} textAnchor="middle" className="fill-cyan-600 text-[12px] font-bold">
          ..
        </text>
      ))}
      <text x="24" y="334" className="fill-muted-foreground text-[12px]">
        {hideArrows ? "Practice mode: arrows hidden." : "Curved arrows are programmatic SVG paths."}
      </text>
    </svg>
  )
}

function AtomGlyph({ atom, highlighted, selected, onSelect }: { atom: MechanismAtom; highlighted: boolean; selected: boolean; onSelect: () => void }) {
  const fill = atom.aromatic ? "#f59e0b" : atomColors[atom.element] ?? "#f8fafc"
  const text = ["C", "O", "N", "Br", "Cl"].includes(atom.element) ? "#ffffff" : "#0f172a"
  function handleKey(event: KeyboardEvent<SVGGElement>) {
    if (event.key === "Enter" || event.key === " ") onSelect()
  }
  return (
    <g role="button" tabIndex={0} className="cursor-pointer" aria-label={`${atom.element} atom ${atom.id}`} onClick={onSelect} onKeyDown={handleKey}>
      <circle cx={atom.x} cy={atom.y} r={selected ? 25 : 21} fill={fill} stroke={selected ? "#14b8a6" : highlighted ? "#f97316" : "#ffffff"} strokeWidth={selected ? 5 : highlighted ? 4 : 2} filter={highlighted ? "url(#mechanism-glow)" : undefined} />
      <text x={atom.x} y={atom.y + 5} textAnchor="middle" className="pointer-events-none text-sm font-black" style={{ fill: text }}>
        {atom.element}
      </text>
      {atom.formalCharge !== 0 && (
        <text x={atom.x + 20} y={atom.y - 20} textAnchor="middle" className="fill-red-500 text-[12px] font-black">
          {atom.formalCharge > 0 ? "+" : "-"}
        </text>
      )}
      <title>{atom.explanation}</title>
    </g>
  )
}

function BondGlyph({ step, bond, selected, onSelect }: { step: MechanismStep; bond: MechanismBond; selected: boolean; onSelect: () => void }) {
  const from = step.graph.atoms.find((atom) => atom.id === bond.from)
  const to = step.graph.atoms.find((atom) => atom.id === bond.to)
  if (!from || !to || bond.order === 0) return null
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.max(1, Math.hypot(dx, dy))
  const normal = (distance: number) => ({ x: (-dy / length) * distance, y: (dx / length) * distance })
  const offsets = bond.order === 3 ? [-7, 0, 7] : bond.order === 2 ? [-4, 4] : [0]
  const color = selected ? "#14b8a6" : bond.breaking ? "#ef4444" : bond.forming ? "#22c55e" : bond.aromatic ? "#f59e0b" : "#64748b"
  return (
    <g role="button" tabIndex={0} className="cursor-pointer" aria-label={`${bond.order} bond ${bond.id}`} onClick={onSelect}>
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="transparent" strokeWidth="24" />
      {offsets.map((distance) => {
        const offset = normal(distance)
        return (
          <line
            key={`${bond.id}-${distance}`}
            x1={from.x + offset.x}
            y1={from.y + offset.y}
            x2={to.x + offset.x}
            y2={to.y + offset.y}
            stroke={color}
            strokeWidth={selected ? 7 : 4}
            strokeLinecap="round"
            strokeDasharray={bond.aromatic ? "10 7" : undefined}
          />
        )
      })}
      <title>{bond.explanation}</title>
    </g>
  )
}

function EnergyDiagram({ points, activeStepId, highestStepId }: { points: ReturnType<typeof getEnergyDiagramPoints>; activeStepId: string; highestStepId: string }) {
  const maxEnergy = Math.max(...points.map((point) => point.energy), 100)
  function x(progress: number) {
    return 42 + progress * 3.9
  }
  function y(energy: number) {
    return 170 - (energy / maxEnergy) * 125
  }
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${x(point.reactionProgress).toFixed(1)} ${y(point.energy).toFixed(1)}`).join(" ")
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg">Reaction Energy Diagram</CardTitle>
      </CardHeader>
      <CardContent>
        <svg viewBox="0 0 460 210" className="h-56 w-full rounded-xl border border-border bg-background">
          <line x1="36" y1="178" x2="430" y2="178" stroke="currentColor" className="text-muted-foreground" />
          <line x1="36" y1="178" x2="36" y2="28" stroke="currentColor" className="text-muted-foreground" />
          <text x="12" y="24" className="fill-muted-foreground text-[11px]">Energy</text>
          <text x="345" y="202" className="fill-muted-foreground text-[11px]">Reaction progress</text>
          <path d={path} fill="none" stroke="#14b8a6" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((point) => (
            <g key={point.stepId}>
              <circle cx={x(point.reactionProgress)} cy={y(point.energy)} r={point.stepId === activeStepId ? 8 : 5} fill={point.stepId === highestStepId ? "#f97316" : point.stepId === activeStepId ? "#14b8a6" : "#64748b"} />
              <text x={x(point.reactionProgress)} y={y(point.energy) - 12} textAnchor="middle" className="fill-foreground text-[10px] font-semibold">
                {point.label}
              </text>
            </g>
          ))}
        </svg>
      </CardContent>
    </Card>
  )
}

function PracticeModeCard({
  prompt,
  selectedChoiceId,
  status,
  message,
  score,
  onChoose,
}: {
  prompt: ReactionMechanism["practicePrompts"][number] | undefined
  selectedChoiceId: string | null
  status: MechanismPracticeStatus
  message: string
  score: number
  onChoose: (id: string) => void
}) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg">Practice Mode</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {prompt ? (
          <>
            <p className="text-sm text-muted-foreground">{prompt.prompt}</p>
            <div className="grid gap-2">
              {prompt.choices.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => onChoose(choice.id)}
                  className={`rounded-xl border px-3 py-2 text-left text-sm ${
                    selectedChoiceId === choice.id ? "border-primary bg-primary/10" : "border-border bg-secondary/20 hover:bg-secondary"
                  }`}
                >
                  {choice.label}
                </button>
              ))}
            </div>
            <div className={`rounded-xl border p-3 text-sm ${status === "correct" ? "border-teal-500/30 bg-teal-500/10" : status === "incorrect" ? "border-destructive/30 bg-destructive/10" : "border-border bg-background/80"}`}>
              <p className="flex items-center gap-2 font-semibold">
                {status === "correct" ? <CheckCircle2 className="h-4 w-4" /> : status === "incorrect" ? <XCircle className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                Score: {score}
              </p>
              <p className="mt-1 text-muted-foreground">{message}</p>
            </div>
          </>
        ) : (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">No prompt for this step.</p>
        )}
      </CardContent>
    </Card>
  )
}

function Inspector({ step, selected }: { step: MechanismStep; selected: Selected }) {
  let title = "Interactive Inspector"
  let body = "Click an atom, bond, or curved arrow to explain why it reacts."
  if (selected?.type === "atom") {
    title = "Atom Inspector"
    body = explainAtom(step, selected.id)
  } else if (selected?.type === "bond") {
    title = "Bond Inspector"
    body = explainBond(step, selected.id)
  } else if (selected?.type === "arrow") {
    const arrow = step.arrows.find((item) => item.id === selected.id)
    title = "Curved Arrow Inspector"
    body = arrow ? `${explainArrow(step, selected.id)} ${describeArrowMotion(arrow as CurvedArrow)}` : explainArrow(step, selected.id)
  }
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Atom className="h-5 w-5" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="rounded-xl border border-border bg-background/80 p-4 text-sm leading-relaxed text-muted-foreground">{body}</p>
      </CardContent>
    </Card>
  )
}
