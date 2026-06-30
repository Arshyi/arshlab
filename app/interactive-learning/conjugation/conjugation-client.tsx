"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  Eye,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Waves,
  XCircle,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  analyzeConjugation,
  buildAlgorithmPath,
  buildColorLearning,
  buildConjugationPrimitives,
  buildEnergyDiagram,
  getPracticeQuestion,
  listPracticeQuestions,
  listRealMoleculeLibrary,
  validateCurvedArrow,
  type ConjugationAnalysis,
  type ConjugationSvgPrimitive,
} from "@/lib/interactive-learning/conjugation"

const molecules = listRealMoleculeLibrary()
const practice = listPracticeQuestions()

export function ConjugationLearningClient() {
  const [moleculeId, setMoleculeId] = useState("benzene")
  const [algorithmStep, setAlgorithmStep] = useState(0)
  const [algorithmPlaying, setAlgorithmPlaying] = useState(false)
  const [resonanceForm, setResonanceForm] = useState(0)
  const [arrowSource, setArrowSource] = useState("")
  const [arrowDestination, setArrowDestination] = useState("")
  const [arrowFeedback, setArrowFeedback] = useState("")
  const [colorLength, setColorLength] = useState(8)
  const [practiceIndex, setPracticeIndex] = useState(0)
  const [practiceAnswer, setPracticeAnswer] = useState("")

  const analysis = useMemo(() => analyzeConjugation(moleculeId), [moleculeId])
  const primitives = useMemo(() => buildConjugationPrimitives(analysis), [analysis])
  const algorithm = useMemo(() => buildAlgorithmPath(analysis, algorithmStep), [algorithmStep, analysis])
  const color = useMemo(() => buildColorLearning(colorLength), [colorLength])
  const energy = useMemo(() => buildEnergyDiagram(colorLength), [colorLength])
  const currentPractice = getPracticeQuestion(practiceIndex)
  const correctPractice = practiceAnswer && practiceAnswer === currentPractice.correctAnswer

  useEffect(() => {
    setAlgorithmStep(0)
    setAlgorithmPlaying(false)
    setResonanceForm(0)
    setArrowFeedback("")
  }, [moleculeId])

  useEffect(() => {
    if (!algorithmPlaying) return
    const timer = window.setInterval(() => {
      setAlgorithmStep((current) => {
        if (current >= analysis.algorithmSteps.length - 1) {
          setAlgorithmPlaying(false)
          return current
        }
        return current + 1
      })
    }, 900)
    return () => window.clearInterval(timer)
  }, [algorithmPlaying, analysis.algorithmSteps.length])

  function checkArrow() {
    const feedback = validateCurvedArrow(moleculeId, { source: arrowSource, destination: arrowDestination })
    setArrowFeedback(feedback.message)
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge className="rounded-full">ARSHLAB v8.4.0</Badge>
              <Badge variant="outline" className="rounded-full">SVG / Canvas math</Badge>
              <Badge variant="outline" className="rounded-full">No AI usage</Badge>
              <Badge variant="outline" className="rounded-full">Why mode included</Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">
              Conjugation, Resonance & Delocalization Learning Engine
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
              Watch ARSHLAB detect p orbitals, trace the principal conjugated pathway, count pi electrons,
              apply Huckel&apos;s rule, animate resonance reasoning, and connect conjugation length to color.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button asChild className="rounded-xl">
                <Link href="/interactive-learning">
                  Orbital Learning
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/hybridization-builder">Hybridization Builder</Link>
              </Button>
            </div>
          </div>

          <Card className="rounded-2xl border-teal-500/20 bg-teal-500/5">
            <CardContent className="grid gap-3 p-5 sm:grid-cols-2">
              <Metric label="Teaching molecules" value={String(molecules.length)} />
              <Metric label="Practice prompts" value={String(practice.length)} />
              <Metric label="Conjugated systems" value={String(analysis.conjugatedSystems.length)} />
              <Metric label="Principal electrons" value={String(analysis.principalSystem?.piElectrons ?? 0)} />
            </CardContent>
          </Card>
        </section>

        <Tabs defaultValue="detector" className="gap-6">
          <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl p-1 md:grid-cols-7">
            <TabsTrigger value="detector">Detector</TabsTrigger>
            <TabsTrigger value="algorithm">Algorithm</TabsTrigger>
            <TabsTrigger value="resonance">Resonance</TabsTrigger>
            <TabsTrigger value="aromaticity">Aromaticity</TabsTrigger>
            <TabsTrigger value="uvvis">UV-Vis</TabsTrigger>
            <TabsTrigger value="library">Library</TabsTrigger>
            <TabsTrigger value="practice">Practice</TabsTrigger>
          </TabsList>

          <TabsContent value="detector">
            <div className="grid gap-6 lg:grid-cols-[320px_1fr_340px]">
              <ControlPanel moleculeId={moleculeId} setMoleculeId={setMoleculeId} />
              <GraphCard analysis={analysis} primitives={primitives} activeAtomIds={analysis.principalSystem?.atomIds ?? []} />
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Why Mode</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <InfoBlock label="Principal pathway" value={analysis.principalSystem?.explanation ?? "No continuous p pathway found."} />
                  <InfoBlock label="Longest system rule" value="The longest uninterrupted conjugated pathway is normally treated as the principal conjugated system." />
                  <InfoBlock label="Conjugation breaks" value={analysis.breakAtoms.length ? analysis.breakAtoms.map((atom) => `${atom.id}: ${atom.breakReason ?? "no aligned p orbital"}`).join("; ") : "No break atoms inside the selected pathway."} />
                  <div className="rounded-xl border border-border bg-secondary/30 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Systems found</p>
                    <div className="mt-2 space-y-2">
                      {analysis.conjugatedSystems.map((system) => (
                        <div key={system.id} className="rounded-lg bg-background p-2 text-sm">
                          <span className="font-medium">{system.principal ? "Primary" : "Secondary"}</span>
                          <span className="text-muted-foreground"> - {system.length} atoms, {system.piElectrons} electrons</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="algorithm">
            <div className="grid gap-6 lg:grid-cols-[320px_1fr_340px]">
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Conjugation Finder Animation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Step {algorithmStep + 1} / {analysis.algorithmSteps.length}
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <Button type="button" size="icon" variant="outline" onClick={() => setAlgorithmStep((step) => Math.max(0, step - 1))} aria-label="Step back">
                      <ArrowRight className="h-4 w-4 rotate-180" />
                    </Button>
                    <Button type="button" size="icon" onClick={() => setAlgorithmPlaying((value) => !value)} aria-label={algorithmPlaying ? "Pause" : "Play"}>
                      {algorithmPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button type="button" size="icon" variant="outline" onClick={() => setAlgorithmStep((step) => Math.min(analysis.algorithmSteps.length - 1, step + 1))} aria-label="Step forward">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button type="button" variant="outline" className="w-full rounded-xl" onClick={() => setAlgorithmStep(0)}>
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </Button>
                  <InfoBlock label={algorithm.step?.title ?? "Algorithm"} value={algorithm.step?.explanation ?? ""} />
                  <InfoBlock label="Check sequence" value={algorithm.step?.check ?? "hybridization -> p orbital -> adjacency"} />
                  <InfoBlock label="Result" value={algorithm.step?.result ?? ""} />
                </CardContent>
              </Card>
              <GraphCard analysis={analysis} primitives={primitives} activeAtomIds={algorithm.activeAtomIds} />
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Algorithm Explorer</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  {[
                    "Check hybridization",
                    "Ask whether a p orbital exists",
                    "Check adjacent p orbitals",
                    "Continue DFS across the p network",
                    "Select the largest connected conjugated graph",
                    "Count pi electrons and lone-pair contributions",
                    "Evaluate aromaticity and HOMO-LUMO effects",
                  ].map((step, index) => (
                    <div key={step} className={`rounded-xl border p-3 ${index <= algorithmStep ? "border-teal-500/30 bg-teal-500/10" : "border-border bg-secondary/20"}`}>
                      {step}
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="resonance">
            <div className="grid gap-6 lg:grid-cols-[320px_1fr_340px]">
              <ControlPanel moleculeId={moleculeId} setMoleculeId={setMoleculeId} />
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Resonance Explorer</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {analysis.molecule.resonance ? (
                    <>
                      <div className="grid gap-2 sm:grid-cols-3">
                        {analysis.molecule.resonance.forms.map((form, index) => (
                          <Button key={form.id} type="button" variant={resonanceForm === index ? "default" : "outline"} className="rounded-xl" onClick={() => setResonanceForm(index)}>
                            {form.title}
                          </Button>
                        ))}
                      </div>
                      <GraphCard analysis={analysis} primitives={primitives} activeAtomIds={analysis.principalSystem?.atomIds ?? []} compact />
                      <InfoBlock
                        label={analysis.molecule.resonance.forms[resonanceForm]?.title ?? "Resonance"}
                        value={analysis.molecule.resonance.forms[resonanceForm]?.description ?? ""}
                      />
                      <InfoBlock label="Resonance hybrid" value={analysis.molecule.resonance.hybridDescription} />
                    </>
                  ) : (
                    <EmptyState title="No resonance animation record" description="This molecule still shows conjugation data, but it does not have a resonance-form sequence in this teaching set." />
                  )}
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Curved Arrow Tutor</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <label className="block text-sm font-medium">
                    Electron source
                    <input value={arrowSource} onChange={(event) => setArrowSource(event.target.value)} placeholder="rb1-2 or lp1" className="mt-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm" />
                  </label>
                  <label className="block text-sm font-medium">
                    Destination
                    <input value={arrowDestination} onChange={(event) => setArrowDestination(event.target.value)} placeholder="rb2-3 or pi1" className="mt-2 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm" />
                  </label>
                  <Button type="button" className="w-full rounded-xl" onClick={checkArrow}>Verify Arrow</Button>
                  {arrowFeedback && <p className="rounded-xl border border-border bg-secondary/30 p-3 text-sm text-muted-foreground">{arrowFeedback}</p>}
                  <p className="text-xs text-muted-foreground">
                    Electron arrows move electron density. Atoms do not move between resonance forms.
                  </p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="aromaticity">
            <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Pi Electron Calculator</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <GraphCard analysis={analysis} primitives={primitives} activeAtomIds={analysis.principalSystem?.atomIds ?? []} compact />
                  <div className="grid gap-3 md:grid-cols-2">
                    {analysis.electronContributions.map((item) => (
                      <div key={item.id} className={`rounded-xl border p-3 ${item.included ? "border-teal-500/30 bg-teal-500/10" : "border-border bg-secondary/30"}`}>
                        <p className="text-sm font-semibold">{item.kind}: {item.electrons} electrons</p>
                        <p className="mt-1 text-xs text-muted-foreground">{item.explanation}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Huckel Rule</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <InfoBlock label="Decision" value={analysis.aromaticity.label} />
                  <InfoBlock label="Pi electrons" value={String(analysis.aromaticity.piElectrons)} />
                  <InfoBlock label="Rule" value={analysis.aromaticity.rule} />
                  <InfoBlock label="Explanation" value={analysis.aromaticity.explanation} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="uvvis">
            <div className="grid gap-6 lg:grid-cols-[320px_1fr_340px]">
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Color vs Conjugation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">Conjugated atoms</span>
                    <span className="text-muted-foreground">{colorLength}</span>
                  </div>
                  <Slider min={2} max={24} step={1} value={[colorLength]} onValueChange={(value) => setColorLength(value[0] ?? 8)} />
                  <InfoBlock label="Approx lambda max" value={`${color.lambdaMaxNm} nm`} />
                  <InfoBlock label="Approx gap" value={`${color.approximateGapEv} eV`} />
                  <InfoBlock label="Observed color" value={color.observedColor} />
                </CardContent>
              </Card>
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Energy Diagram</CardTitle>
                </CardHeader>
                <CardContent>
                  <svg viewBox="0 0 420 300" className="h-[340px] w-full rounded-xl border border-border bg-white" role="img" aria-label="HOMO LUMO gap diagram">
                    <rect width="420" height="300" fill="#ffffff" />
                    <line x1="110" x2="310" y1={energy.homoY} y2={energy.homoY} stroke="#0f766e" strokeWidth="4" />
                    <line x1="110" x2="310" y1={energy.lumoY} y2={energy.lumoY} stroke="#dc2626" strokeWidth="4" />
                    <line x1="330" x2="330" y1={energy.lumoY} y2={energy.homoY} stroke="#f59e0b" strokeWidth="3" markerEnd="url(#arrow)" />
                    <defs>
                      <marker id="arrow" markerWidth="8" markerHeight="8" refX="4" refY="4" orient="auto">
                        <path d="M 0 0 L 8 4 L 0 8 z" fill="#f59e0b" />
                      </marker>
                    </defs>
                    <text x="60" y={energy.homoY + 5} className="fill-slate-700 text-[12px] font-semibold">HOMO rises</text>
                    <text x="60" y={energy.lumoY + 5} className="fill-slate-700 text-[12px] font-semibold">LUMO falls</text>
                    <text x="288" y="270" className="fill-slate-500 text-[11px]">Gap shrinks as conjugation grows</text>
                  </svg>
                </CardContent>
              </Card>
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">UV-Vis Explorer</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <InfoBlock label={analysis.molecule.name} value={analysis.uvvis.explanation} />
                  <InfoBlock label="Approx lambda max" value={`${analysis.uvvis.lambdaMaxNm} nm (${analysis.uvvis.absorbedWavelength})`} />
                  <InfoBlock label="Observed color" value={analysis.uvvis.observedColor} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="library">
            <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
              <ControlPanel moleculeId={moleculeId} setMoleculeId={setMoleculeId} />
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Real Molecule Library</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2">
                  <InfoBlock label="Principal conjugated pathway" value={analysis.principalSystem ? `${analysis.principalSystem.length} atoms: ${analysis.principalSystem.atomIds.join(", ")}` : "None"} />
                  <InfoBlock label="Secondary pathways" value={analysis.conjugatedSystems.filter((system) => !system.principal).map((system) => `${system.length} atoms`).join(", ") || "None"} />
                  <InfoBlock label="Delocalized electron count" value={String(analysis.aromaticity.piElectrons)} />
                  <InfoBlock label="Pi bond count" value={String(analysis.principalSystem?.piBondCount ?? 0)} />
                  <InfoBlock label="Participating lone pairs" value={String(analysis.principalSystem?.participatingLonePairs ?? 0)} />
                  <InfoBlock label="HOMO" value={analysis.principalSystem && analysis.principalSystem.length > 10 ? "raised by extended conjugation" : "localized or moderately delocalized pi HOMO"} />
                  <InfoBlock label="LUMO" value={analysis.principalSystem && analysis.principalSystem.length > 10 ? "lowered by extended conjugation" : "pi antibonding LUMO"} />
                  <InfoBlock label="HOMO-LUMO gap" value={analysis.principalSystem && analysis.principalSystem.length > 10 ? "small / visible absorption possible" : "larger / UV absorption likely"} />
                  <InfoBlock label="Aromaticity" value={`${analysis.aromaticity.label}: ${analysis.aromaticity.explanation}`} />
                  <InfoBlock label="UV-visible explanation" value={analysis.uvvis.explanation} />
                  <InfoBlock label="Notes" value={analysis.molecule.notes} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="practice">
            <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Brain className="h-5 w-5" />
                    Practice Mode
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <Badge variant="outline" className="rounded-full">{currentPractice.topic}</Badge>
                  <h2 className="text-xl font-semibold">{currentPractice.prompt}</h2>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {currentPractice.choices.map((choice) => (
                      <Button key={choice} type="button" variant={practiceAnswer === choice ? "default" : "outline"} className="justify-start rounded-xl" onClick={() => setPracticeAnswer(choice)}>
                        {choice}
                      </Button>
                    ))}
                  </div>
                  {practiceAnswer && (
                    <div className={`rounded-xl border p-4 text-sm ${correctPractice ? "border-teal-500/30 bg-teal-500/10" : "border-red-500/30 bg-red-500/10"}`}>
                      <div className="mb-2 flex items-center gap-2 font-medium">
                        {correctPractice ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
                        {correctPractice ? "Correct" : `Correct answer: ${currentPractice.correctAnswer}`}
                      </div>
                      {currentPractice.explanation}
                    </div>
                  )}
                </CardContent>
              </Card>
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-lg">Practice Controls</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    type="button"
                    className="w-full rounded-xl"
                    onClick={() => {
                      setPracticeAnswer("")
                      setPracticeIndex((index) => (index + 1) % practice.length)
                    }}
                  >
                    Next Question
                    <Sparkles className="h-4 w-4" />
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    Practice asks about delocalized electrons, conjugation breaks, participating lone pairs,
                    principal pathways, and aromaticity with instant feedback.
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

function ControlPanel({
  moleculeId,
  setMoleculeId,
}: {
  moleculeId: string
  setMoleculeId: (id: string) => void
}) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Waves className="h-5 w-5" />
          Molecule
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="block text-sm font-medium">
          Teaching example
          <select
            value={moleculeId}
            onChange={(event) => setMoleculeId(event.target.value)}
            className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
          >
            {molecules.map((molecule) => (
              <option key={molecule.id} value={molecule.id}>
                {molecule.name}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-muted-foreground">
          These are deterministic teaching graphs for conjugation and resonance reasoning. No image or AI generation is used.
        </p>
      </CardContent>
    </Card>
  )
}

function GraphCard({
  analysis,
  primitives,
  activeAtomIds,
  compact = false,
}: {
  analysis: ConjugationAnalysis
  primitives: ConjugationSvgPrimitive[]
  activeAtomIds: string[]
  compact?: boolean
}) {
  const xs = analysis.molecule.atoms.map((atom) => atom.x)
  const ys = analysis.molecule.atoms.map((atom) => atom.y)
  const minX = Math.min(...xs, 0) - 70
  const maxX = Math.max(...xs, 440) + 70
  const minY = Math.min(...ys, 0) - 70
  const maxY = Math.max(...ys, 320) + 70
  const viewBox = `${minX} ${minY} ${maxX - minX} ${maxY - minY}`

  return (
    <Card className="rounded-2xl overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-3 text-lg">
          <span>{analysis.molecule.name}</span>
          <Badge variant="outline">{analysis.molecule.formula}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <svg viewBox={viewBox} role="img" aria-label={`${analysis.molecule.name} conjugation diagram`} className={`${compact ? "h-[300px]" : "h-[460px]"} w-full rounded-xl border border-border bg-white`}>
          <rect x={minX} y={minY} width={maxX - minX} height={maxY - minY} fill="#ffffff" />
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="3.2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {primitives.filter((primitive) => primitive.type === "bond").map((primitive) => (
            <line
              key={primitive.id}
              x1={primitive.x}
              y1={primitive.y}
              x2={primitive.x2}
              y2={primitive.y2}
              stroke={primitive.color}
              strokeWidth={primitive.width ?? 3}
              strokeLinecap="round"
              opacity={primitive.opacity}
              filter={primitive.highlight ? "url(#glow)" : undefined}
            />
          ))}
          {primitives.filter((primitive) => primitive.type === "p-orbital").map((primitive, index) => (
            <ellipse
              key={primitive.id}
              cx={primitive.x}
              cy={primitive.y}
              rx={primitive.width ?? 36}
              ry="12"
              transform={`rotate(${index % 2 === 0 ? 90 : 0} ${primitive.x} ${primitive.y})`}
              fill={primitive.color}
              opacity={primitive.opacity}
            >
              <animate attributeName="opacity" values="0.2;0.48;0.2" dur="1.8s" repeatCount="indefinite" />
            </ellipse>
          ))}
          {primitives.filter((primitive) => primitive.type === "electron").map((primitive) => (
            <g key={primitive.id}>
              <circle cx={primitive.x} cy={primitive.y} r="9" fill={primitive.color} opacity={primitive.opacity}>
                <animate attributeName="r" values="7;10;7" dur="1.4s" repeatCount="indefinite" />
              </circle>
              <text x={primitive.x - 8} y={primitive.y + 4} className="fill-white text-[8px] font-bold">{primitive.label}</text>
            </g>
          ))}
          {primitives.filter((primitive) => primitive.type === "atom").map((primitive) => {
            const active = activeAtomIds.includes(primitive.id.replace("atom-", ""))
            return (
              <g key={primitive.id}>
                <circle cx={primitive.x} cy={primitive.y} r={active ? 17 : 13} fill={primitive.color} opacity={primitive.opacity} stroke={active ? "#f59e0b" : "#ffffff"} strokeWidth="3" />
                <text x={primitive.x - 8} y={primitive.y + 5} className="fill-white text-[12px] font-bold">{primitive.label}</text>
              </g>
            )
          })}
          <text x={minX + 18} y={maxY - 24} className="fill-slate-500 text-[11px]">
            Bright path = principal conjugated system; orange atoms = conjugation breaks
          </text>
        </svg>
      </CardContent>
    </Card>
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

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-6 text-center">
      <Eye className="mx-auto h-8 w-8 text-muted-foreground" />
      <h3 className="mt-3 font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
