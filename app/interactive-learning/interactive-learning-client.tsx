"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Atom,
  Brain,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  MousePointer2,
  Network,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  buildHybridOrbitalPrimitives,
  buildMolecularOrbitalDiagram,
  buildOrbitalLevelPrimitives,
  buildSigmaPiModel,
  checkOrbitalQuizAnswer,
  electronCoordinateForStep,
  getBondOrderEquation,
  getHybridizationEnergySeries,
  getHybridizationModel,
  getInteractiveExample,
  listInteractiveExamples,
  listMolecularOrbitalSpecies,
  listOrbitalQuizQuestions,
  sigmaPiOverlapPrimitives,
  type DiatomicSpeciesId,
  type HybridizationMode,
  type OverlapMode,
  type SvgOrbitalPrimitive,
  type ViewerOrientation,
} from "@/lib/interactive-learning"
import { getInteractiveExampleId, interactiveLearningHref } from "@/lib/interactive-learning/learning-bridge"

const species = listMolecularOrbitalSpecies()
const examples = listInteractiveExamples()
const quizQuestions = listOrbitalQuizQuestions()
const hybridModes: HybridizationMode[] = ["sp", "sp2", "sp3", "sp3d", "sp3d2"]

interface InteractiveLearningClientProps {
  initialTopic?: string
  initialCompound?: string
  initialMolecule?: string
}

function topicToTab(topic: string | undefined): string {
  if (topic === "hybridization" || topic === "lone-pairs") return "hybrid"
  if (topic === "sigma-pi") return "overlap"
  if (topic === "examples") return "examples"
  if (topic === "quiz") return "quiz"
  return "mo"
}

function normalizeSpecies(value: string | undefined): DiatomicSpeciesId {
  const match = species.find((item) => item.id.toLowerCase() === (value ?? "").toLowerCase())
  return (match?.id ?? "O2") as DiatomicSpeciesId
}

export function InteractiveLearningClient({
  initialTopic,
  initialCompound,
  initialMolecule,
}: InteractiveLearningClientProps) {
  const [activeTab, setActiveTab] = useState(topicToTab(initialTopic))
  const [speciesId, setSpeciesId] = useState<DiatomicSpeciesId>("O2")
  const [visibleStep, setVisibleStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(800)
  const [hybridMode, setHybridMode] = useState<HybridizationMode>("sp3")
  const [overlapMode, setOverlapMode] = useState<OverlapMode>("sigma")
  const [orientation, setOrientation] = useState<ViewerOrientation>("front")
  const [rotation, setRotation] = useState(0)
  const [exampleId, setExampleId] = useState("ethene")
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizAnswer, setQuizAnswer] = useState("")

  const mo = useMemo(() => buildMolecularOrbitalDiagram(speciesId), [speciesId])
  const hybrid = useMemo(() => getHybridizationModel(hybridMode), [hybridMode])
  const overlap = useMemo(() => buildSigmaPiModel(overlapMode, orientation), [overlapMode, orientation])
  const example = useMemo(() => getInteractiveExample(exampleId), [exampleId])
  const quiz = quizQuestions[quizIndex] ?? quizQuestions[0]
  const quizResult = quizAnswer ? checkOrbitalQuizAnswer(quiz.id, quizAnswer) : null
  const visibleSteps = mo.fillingSteps.slice(0, visibleStep)

  useEffect(() => {
    setActiveTab(topicToTab(initialTopic))
    if (initialMolecule) setSpeciesId(normalizeSpecies(initialMolecule))
    if (initialCompound) setExampleId(getInteractiveExampleId({ id: initialCompound, name: initialCompound }))
    if (initialTopic === "sigma-pi") setOverlapMode("pi")
    if (initialTopic === "hybridization" || initialTopic === "lone-pairs") setHybridMode("sp3")
  }, [initialCompound, initialMolecule, initialTopic])

  useEffect(() => {
    setVisibleStep(0)
    setPlaying(false)
  }, [speciesId])

  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      setVisibleStep((current) => {
        if (current >= mo.fillingSteps.length) {
          setPlaying(false)
          return current
        }
        return current + 1
      })
    }, speed)
    return () => window.clearInterval(timer)
  }, [mo.fillingSteps.length, playing, speed])

  function stepForward() {
    setVisibleStep((current) => Math.min(mo.fillingSteps.length, current + 1))
  }

  function stepBack() {
    setVisibleStep((current) => Math.max(0, current - 1))
  }

  function resetAnimation() {
    setPlaying(false)
    setVisibleStep(0)
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge className="rounded-full">ARSHLAB v10.0.0</Badge>
              <Badge variant="outline" className="rounded-full">SVG / Canvas math</Badge>
              <Badge variant="outline" className="rounded-full">No AI usage</Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
              Interactive Molecular Orbital & Hybridization Learning Engine
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
              Build molecular orbital diagrams, animate electron filling, compare HOMO and LUMO levels,
              rotate sigma and pi overlap, and study hybridization with deterministic programmatic diagrams.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild className="rounded-xl">
                <Link href="/interactive-learning/explorer">
                  Open Molecular Explorer
                  <MousePointer2 className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/interactive-learning/mechanisms">
                  Open Mechanism Simulator
                  <FlaskConical className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/interactive-learning/conjugation">
                  Open Conjugation Learning
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/knowledge-graph">
                  Open Knowledge Graph
                  <Network className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
          <Card className="rounded-2xl border-teal-500/20 bg-teal-500/5">
            <CardContent className="grid gap-3 p-5 sm:grid-cols-2">
              <Metric label="MO species" value={String(species.length)} />
              <Metric label="Example library" value={String(examples.length)} />
              <Metric label="Hybrid modes" value="5" />
              <Metric label="Quiz prompts" value={String(quizQuestions.length)} />
            </CardContent>
          </Card>
        </section>

        <section className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <LessonCard
            title="Molecular Orbitals, HOMO/LUMO, Bond Order"
            difficulty="Intermediate"
            time="9 min"
            href={interactiveLearningHref({ topic: "mo", molecule: speciesId })}
            outcomes={["Fill MO diagrams", "Calculate bond order", "Explain magnetism"]}
            description="Animate electrons into molecular orbitals, highlight HOMO/LUMO, and watch bond order update live."
          />
          <LessonCard
            title="Hybridization, Sigma/Pi Bonds, Lone Pairs"
            difficulty="Introductory"
            time="8 min"
            href={interactiveLearningHref({ topic: "hybridization", compound: exampleId })}
            outcomes={["Place lone pairs", "Separate sigma and pi bonds", "Compare sp, sp2, sp3"]}
            description="Mix s and p orbitals, rotate sigma/pi overlap, and connect orbital shape to molecular geometry."
          />
          <LessonCard
            title="Conjugation, Resonance, Huckel Aromaticity"
            difficulty="Intermediate"
            time="10 min"
            href="/interactive-learning/conjugation?compound=benzene&focus=aromaticity"
            outcomes={["Trace p orbitals", "Count delocalized electrons", "Apply Huckel's rule"]}
            description="Move from local bonding into delocalized electrons, resonance forms, and color from HOMO-LUMO gaps."
          />
          <LessonCard
            title="Interactive Molecular Explorer"
            difficulty="Introductory"
            time="8 min"
            href={`/interactive-learning/explorer?compound=${exampleId}`}
            outcomes={["Click atoms and bonds", "Read reasoning trees", "Toggle electron overlays"]}
            description="Inspect molecular graphs directly: atom hybridization, bond order, lone pairs, functional groups, aromaticity, and HOMO/LUMO overlays."
          />
          <LessonCard
            title="Reaction Mechanism Simulator"
            difficulty="Intermediate"
            time="10 min"
            href="/interactive-learning/mechanisms?reaction=sn2"
            outcomes={["Animate curved arrows", "Track atoms and electrons", "Practice arrow placement"]}
            description="Step through deterministic mechanisms with reaction timelines, transition-state views, energy diagrams, live bond updates, and common mistakes."
          />
          <LessonCard
            title="Virtual Chemistry Laboratory"
            difficulty="Intermediate"
            time="12 min"
            href="/virtual-lab"
            outcomes={["Run guided experiments", "Interpret observations", "Connect spectra to products"]}
            description="Move from molecular reasoning into deterministic lab practice with SVG glassware, safety, observations, spectra, notebooking, and assessment."
          />
        </section>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-6">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl p-1 md:grid-cols-5">
            <TabsTrigger value="mo">MO Builder</TabsTrigger>
            <TabsTrigger value="hybrid">Hybridization</TabsTrigger>
            <TabsTrigger value="overlap">Sigma / Pi</TabsTrigger>
            <TabsTrigger value="examples">Examples</TabsTrigger>
            <TabsTrigger value="quiz">Quiz</TabsTrigger>
          </TabsList>

          <TabsContent value="mo">
            <div className="grid gap-6 lg:grid-cols-[300px_1fr_320px]">
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Atom className="h-5 w-5" />
                    MO Controls
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <label className="block text-sm font-medium">
                    Species
                    <select
                      value={speciesId}
                      onChange={(event) => setSpeciesId(event.target.value as DiatomicSpeciesId)}
                      className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                    >
                      {species.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.displayName}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="rounded-xl border border-border bg-secondary/30 p-3">
                    <p className="text-sm font-semibold">Electron Filling Animation</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Step {visibleStep} / {mo.fillingSteps.length}
                    </p>
                    <div className="mt-3 grid grid-cols-4 gap-2">
                      <Button type="button" size="icon" variant="outline" onClick={stepBack} aria-label="Step backward">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        onClick={() => setPlaying((current) => !current)}
                        aria-label={playing ? "Pause" : "Play"}
                      >
                        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                      </Button>
                      <Button type="button" size="icon" variant="outline" onClick={stepForward} aria-label="Step forward">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                      <Button type="button" size="icon" variant="outline" onClick={resetAnimation} aria-label="Reset">
                        <RotateCcw className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium">Speed</span>
                      <span className="text-muted-foreground">{speed} ms</span>
                    </div>
                    <Slider
                      min={200}
                      max={1400}
                      step={100}
                      value={[speed]}
                      onValueChange={(value) => setSpeed(value[0] ?? 800)}
                    />
                  </div>

                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Ordering:</span> {mo.ordering}</p>
                    <p><span className="font-medium">Rules:</span> Aufbau, Hund, Pauli</p>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-3 text-lg">
                    <span>{mo.displayName} Molecular Orbital Diagram</span>
                    <Badge variant="outline">{mo.electronCount} electrons</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <MODiagram result={mo} visibleSteps={visibleSteps} />
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Live Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <InfoBlock label="Bond Order" value={getBondOrderEquation(mo)} />
                  <InfoBlock label="Magnetism" value={`${mo.magnetism} (${mo.unpairedElectrons} unpaired)`} />
                  <InfoBlock label="HOMO" value={mo.homo ? `${mo.homo.label}: ${mo.homo.explanation}` : "None"} />
                  <InfoBlock label="LUMO" value={mo.lumo ? `${mo.lumo.label}: ${mo.lumo.explanation}` : "None"} />
                  <p className="rounded-xl border border-border bg-secondary/30 p-3 text-sm leading-relaxed text-muted-foreground">
                    {mo.explanation}
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="hybrid">
            <div className="grid gap-6 lg:grid-cols-[300px_1fr_320px]">
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Hybridization Mode</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {hybridModes.map((mode) => (
                    <Button
                      key={mode}
                      type="button"
                      variant={hybridMode === mode ? "default" : "outline"}
                      className="w-full justify-start rounded-xl"
                      onClick={() => setHybridMode(mode)}
                    >
                      {mode}
                    </Button>
                  ))}
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">{hybrid.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <HybridDiagram mode={hybridMode} />
                  <div className="mt-4 grid gap-3 sm:grid-cols-4">
                    {Object.entries(hybrid.stages).map(([stage, text]) => (
                      <div key={stage} className="rounded-xl border border-border bg-secondary/30 p-3">
                        <p className="text-xs font-semibold uppercase tracking-wide">{stage.replace("-", " ")}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{text}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Energy and Geometry</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <InfoBlock label="Electron geometry" value={hybrid.geometry} />
                  <InfoBlock label="Molecular geometry" value={hybrid.molecularGeometry} />
                  <InfoBlock label="Ideal angles" value={hybrid.idealAngles} />
                  <InfoBlock label="Character" value={`${hybrid.sCharacter}% s / ${hybrid.pCharacter}% p${hybrid.dCharacter ? ` / ${hybrid.dCharacter}% d` : ""}`} />
                  <EnergySeries />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="overlap">
            <div className="grid gap-6 lg:grid-cols-[300px_1fr_320px]">
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Overlap Controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-2">
                    {(["sigma", "pi"] as const).map((mode) => (
                      <Button
                        key={mode}
                        type="button"
                        variant={overlapMode === mode ? "default" : "outline"}
                        className="rounded-xl"
                        onClick={() => setOverlapMode(mode)}
                      >
                        {mode === "sigma" ? "Sigma" : "Pi"}
                      </Button>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(["front", "side", "top"] as const).map((view) => (
                      <Button
                        key={view}
                        type="button"
                        size="sm"
                        variant={orientation === view ? "default" : "outline"}
                        className="rounded-xl capitalize"
                        onClick={() => setOrientation(view)}
                      >
                        {view}
                      </Button>
                    ))}
                  </div>
                  <div>
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium">Rotation</span>
                      <span className="text-muted-foreground">{rotation}°</span>
                    </div>
                    <Slider min={0} max={180} step={5} value={[rotation]} onValueChange={(value) => setRotation(value[0] ?? 0)} />
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">{overlap.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <SigmaPiDiagram mode={overlapMode} rotation={rotation} />
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Orbital Rotation Rule</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">{overlap.constructiveOverlap}</p>
                  <p>{overlap.nodeDescription}</p>
                  <p>{overlap.rotationRule}</p>
                  <p>{overlap.explanation}</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="examples">
            <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Examples Library</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-2">
                  {examples.map((item) => (
                    <Button
                      key={item.id}
                      type="button"
                      variant={exampleId === item.id ? "default" : "outline"}
                      className="justify-start rounded-xl"
                      onClick={() => setExampleId(item.id)}
                    >
                      {item.name}
                    </Button>
                  ))}
                </CardContent>
              </Card>
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-3 text-lg">
                    <span>{example.name}</span>
                    <Badge variant="outline" className="capitalize">{example.category}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 sm:grid-cols-2">
                  <InfoBlock label="Electron configuration" value={example.electronConfiguration} />
                  <InfoBlock label="Hybridization" value={example.hybridization} />
                  <InfoBlock label="Orbital diagram" value={example.orbitalDiagram} />
                  <InfoBlock label="MO diagram" value={example.moDiagram} />
                  <InfoBlock label="Sigma/Pi" value={example.sigmaPiDecomposition} />
                  <InfoBlock label="Bond order" value={example.bondOrder} />
                  <InfoBlock label="HOMO" value={example.homo} />
                  <InfoBlock label="LUMO" value={example.lumo} />
                  <InfoBlock label="Magnetism" value={example.magnetism} />
                  <InfoBlock label="Lone pairs" value={example.lonePairs} />
                  <div className="rounded-xl border border-border bg-secondary/30 p-4 sm:col-span-2">
                    <p className="text-sm leading-relaxed text-muted-foreground">{example.explanation}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="quiz">
            <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Brain className="h-5 w-5" />
                    Quiz Mode
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-6 text-center">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Labels hidden</p>
                    <p className="mt-2 text-2xl font-bold">{quiz.hiddenLabel}</p>
                  </div>
                  <div>
                    <Badge variant="outline" className="mb-3 rounded-full">{quiz.topic}</Badge>
                    <h2 className="text-xl font-semibold">{quiz.prompt}</h2>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {quiz.choices.map((choice) => (
                      <Button
                        key={choice}
                        type="button"
                        variant={quizAnswer === choice ? "default" : "outline"}
                        className="justify-start rounded-xl"
                        onClick={() => setQuizAnswer(choice)}
                      >
                        {choice}
                      </Button>
                    ))}
                  </div>
                  {quizResult && (
                    <div className={`rounded-xl border p-4 text-sm ${quizResult.correct ? "border-teal-500/30 bg-teal-500/10" : "border-red-500/30 bg-red-500/10"}`}>
                      {quizResult.feedback}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Quiz Controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    type="button"
                    className="w-full rounded-xl"
                    onClick={() => {
                      setQuizAnswer("")
                      setQuizIndex((current) => (current + 1) % quizQuestions.length)
                    }}
                  >
                    Next Question
                    <Sparkles className="h-4 w-4" />
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Quiz prompts hide key labels and ask you to identify HOMO/LUMO levels, hybridization,
                    lone pairs, pi bonds, and bond order from the simulator context.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function MODiagram({
  result,
  visibleSteps,
}: {
  result: ReturnType<typeof buildMolecularOrbitalDiagram>
  visibleSteps: ReturnType<typeof buildMolecularOrbitalDiagram>["fillingSteps"]
}) {
  const primitives = buildOrbitalLevelPrimitives(result.orbitals)
  const counts = new Map<string, number>()

  return (
    <svg viewBox="0 0 420 340" role="img" aria-label={`${result.displayName} molecular orbital diagram`} className="h-[520px] max-h-[70vh] w-full rounded-xl border border-border bg-white">
      <rect width="420" height="340" fill="#ffffff" />
      <text x="54" y="28" className="fill-slate-700 text-[12px] font-semibold">Atomic orbitals</text>
      <text x="172" y="28" className="fill-slate-700 text-[12px] font-semibold">Molecular orbitals</text>
      <text x="314" y="28" className="fill-slate-700 text-[12px] font-semibold">Atomic orbitals</text>
      <line x1="32" y1="306" x2="32" y2="54" stroke="#94a3b8" strokeWidth="1.5" />
      <text x="16" y="48" className="fill-slate-500 text-[10px]">Energy</text>
      {result.orbitals.slice(0, Math.min(6, result.orbitals.length)).map((orbital, index) => {
        const y = 300 - index * 40
        return (
          <g key={`ao-${orbital.id}`}>
            <line x1="72" x2="116" y1={y} y2={y} stroke="#64748b" strokeWidth="2" />
            <line x1="304" x2="348" y1={y} y2={y} stroke="#64748b" strokeWidth="2" />
          </g>
        )
      })}
      {primitives.map((primitive) => (
        <Primitive key={primitive.id} primitive={primitive} />
      ))}
      {visibleSteps.map((step) => {
        const placedBefore = counts.get(step.orbitalId) ?? 0
        counts.set(step.orbitalId, placedBefore + 1)
        const point = electronCoordinateForStep(step, result.orbitals, placedBefore)
        const isLatest = step.step === visibleSteps.length
        return (
          <g key={step.step}>
            <circle cx={point.x} cy={point.y} r="5.5" fill={step.electronSpin === "up" ? "#0f766e" : "#0891b2"}>
              {isLatest && (
                <>
                  <animate attributeName="cx" from="210" to={String(point.x)} dur="360ms" fill="freeze" />
                  <animate attributeName="cy" from="38" to={String(point.y)} dur="360ms" fill="freeze" />
                </>
              )}
            </circle>
            <text x={point.x - 3.2} y={point.y + 3.4} className="fill-white text-[8px] font-bold">
              {step.electronSpin === "up" ? "↑" : "↓"}
            </text>
          </g>
        )
      })}
      {visibleSteps.length < result.fillingSteps.length && visibleSteps.length > 0 && (
        <text x="150" y="326" className="fill-teal-700 text-[11px] font-medium">
          {result.fillingSteps[visibleSteps.length - 1]?.rule}
        </text>
      )}
    </svg>
  )
}

function HybridDiagram({ mode }: { mode: HybridizationMode }) {
  const model = getHybridizationModel(mode)
  const primitives = buildHybridOrbitalPrimitives(model.orbitals)

  return (
    <svg viewBox="0 0 360 300" role="img" aria-label={`${mode} hybridization diagram`} className="h-[360px] w-full rounded-xl border border-border bg-white">
      <rect width="360" height="300" fill="#ffffff" />
      <circle cx="180" cy="150" r="18" fill="#0f172a" />
      <text x="173" y="155" className="fill-white text-[12px] font-bold">A</text>
      {primitives.map((primitive) => (
        <Primitive key={primitive.id} primitive={primitive} />
      ))}
      {primitives.map((primitive) => (
        <text key={`${primitive.id}-label`} x={primitive.x - 12} y={primitive.y + 4} className="fill-slate-900 text-[10px] font-semibold">
          {primitive.label}
        </text>
      ))}
    </svg>
  )
}

function SigmaPiDiagram({ mode, rotation }: { mode: OverlapMode; rotation: number }) {
  const primitives = sigmaPiOverlapPrimitives(mode, rotation)
  return (
    <svg viewBox="0 0 380 240" role="img" aria-label={`${mode} orbital overlap`} className="h-[340px] w-full rounded-xl border border-border bg-white">
      <rect width="380" height="240" fill="#ffffff" />
      <line x1="110" x2="270" y1="120" y2="120" stroke="#94a3b8" strokeDasharray="5 5" />
      {primitives.map((primitive) => (
        <Primitive key={primitive.id} primitive={primitive} />
      ))}
      <circle cx="145" cy="120" r="10" fill="#0f172a" />
      <circle cx="235" cy="120" r="10" fill="#0f172a" />
      <text x="156" y="212" className="fill-slate-600 text-[11px]">
        {mode === "sigma" ? "Head-on overlap creates a sigma bond" : "Side overlap creates a pi bond and nodal plane"}
      </text>
    </svg>
  )
}

function Primitive({ primitive }: { primitive: SvgOrbitalPrimitive }) {
  if (primitive.type === "line") {
    return (
      <line
        x1={primitive.x}
        x2={primitive.x + (primitive.width ?? 0)}
        y1={primitive.y}
        y2={primitive.y + (primitive.height ?? 0)}
        stroke={primitive.color}
        strokeWidth="3"
        strokeLinecap="round"
        opacity={primitive.opacity}
      />
    )
  }

  if (primitive.type === "ellipse") {
    return (
      <ellipse
        cx={primitive.x}
        cy={primitive.y}
        rx={(primitive.width ?? 40) / 2}
        ry={(primitive.height ?? 24) / 2}
        transform={`rotate(${primitive.angle ?? 0} ${primitive.x} ${primitive.y})`}
        fill={primitive.color}
        opacity={primitive.opacity}
      />
    )
  }

  if (primitive.type === "circle") {
    return <circle cx={primitive.x} cy={primitive.y} r={(primitive.width ?? 18) / 2} fill={primitive.color} opacity={primitive.opacity} />
  }

  return (
    <text x={primitive.x} y={primitive.y} className="fill-slate-700 text-[10px] font-semibold">
      {primitive.label}
    </text>
  )
}

function EnergySeries() {
  const series = getHybridizationEnergySeries()
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">2s → sp → sp2 → sp3 → 2p</p>
      {series.map((item) => (
        <div key={item.mode} className="rounded-xl border border-border bg-secondary/30 p-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">{item.mode}</span>
            <span className="text-muted-foreground">{item.sCharacter}% s / {item.pCharacter}% p</span>
          </div>
          <div className="mt-2 h-2 rounded-full bg-muted">
            <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.round(item.energy * 100)}%` }} />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">{item.explanation}</p>
        </div>
      ))}
    </div>
  )
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm leading-relaxed">{value}</p>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-card/80 p-4">
      <p className="text-2xl font-bold font-mono">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function LessonCard({
  title,
  difficulty,
  time,
  href,
  outcomes,
  description,
}: {
  title: string
  difficulty: string
  time: string
  href: string
  outcomes: string[]
  description: string
}) {
  return (
    <Card className="rounded-2xl border-teal-500/20 bg-teal-500/5">
      <CardContent className="flex h-full flex-col gap-4 p-5">
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="rounded-full">{difficulty}</Badge>
          <Badge variant="outline" className="rounded-full">{time}</Badge>
        </div>
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {outcomes.map((outcome) => (
            <Badge key={outcome} variant="outline" className="rounded-full">{outcome}</Badge>
          ))}
        </div>
        <Button asChild className="mt-auto rounded-xl">
          <Link href={href}>
            Start lesson
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
