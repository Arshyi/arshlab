"use client"

import { useState } from "react"
import { ChevronDown, GitBranch, LineChart, MoveRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { StructureVisionAnalysis } from "@/lib/structure-vision/vision-types"
import { cn } from "@/lib/utils"

export function GlobalGraphOptimizerDebugPanel({ analysis }: { analysis: StructureVisionAnalysis | null }) {
  const [open, setOpen] = useState(false)
  const optimization = analysis?.globalGraphOptimization ?? null
  const selected = optimization?.selectedHypothesis ?? null

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="rounded-2xl border-dashed border-indigo-500/30">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 p-5 text-left">
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
              <GitBranch className="h-4 w-4" />
            </span>
            <span>
              <span className="block font-semibold">Global Graph Optimizer</span>
              <span className="block text-sm text-muted-foreground">Candidate graph hypotheses, legal moves, whole-molecule scoring, and canonical hash</span>
            </span>
          </span>
          <ChevronDown className={cn("h-5 w-5 shrink-0 transition-transform", open && "rotate-180")} />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-5 border-t border-border pt-5">
            {!optimization || !selected ? (
              <p className="text-sm text-muted-foreground">Run the scanner to generate optimized graph hypotheses.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="rounded-full">Deterministic graph search</Badge>
                  <Badge variant="secondary" className="rounded-full">No AI usage</Badge>
                  <Badge className="rounded-full">{optimization.finalOptimizationScore}% final score</Badge>
                  {optimization.canonicalHash && <Badge variant="outline" className="rounded-full">Hash {optimization.canonicalHash.slice(0, 18)}</Badge>}
                </div>

                <p className="text-sm leading-relaxed text-muted-foreground">{optimization.explanation}</p>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Metric label="Candidate graphs" value={optimization.candidateGraphCount} />
                  <Metric label="Optimizer iterations" value={optimization.optimizerIterations} />
                  <Metric label="Accepted moves" value={optimization.acceptedMoves.length} />
                  <Metric label="Rejected moves" value={optimization.rejectedMoves.length} />
                  <Metric label="Selected atoms" value={selected.graph.nodes.length} />
                  <Metric label="Selected bonds" value={selected.graph.bonds.length} />
                  <Metric label="Selected rings" value={selected.graph.rings.length} />
                  <Metric label="Graph confidence" value={`${selected.graph.estimates.confidence}%`} />
                </div>

                <section className="rounded-xl border border-border p-4">
                  <h3 className="font-semibold">Score breakdown</h3>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {optimization.scoreBreakdown.map((entry) => (
                      <div key={entry.label} className="flex items-center justify-between gap-3 rounded-lg bg-secondary/40 p-3 text-sm">
                        <span>{entry.label}</span>
                        <span className={cn("font-mono font-semibold", entry.points < 0 && "text-amber-700 dark:text-amber-300")}>
                          {entry.points > 0 ? "+" : ""}{entry.points}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-border p-4">
                    <h3 className="flex items-center gap-2 font-semibold">
                      <MoveRight className="h-4 w-4" />
                      Accepted moves
                    </h3>
                    {optimization.acceptedMoves.length ? (
                      <div className="mt-3 space-y-2">
                        {optimization.acceptedMoves.slice(0, 8).map((move, index) => (
                          <MoveRow key={`${move.label}-${index}`} move={move} />
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">The best seed graph already satisfied the optimizer constraints.</p>
                    )}
                  </div>

                  <div className="rounded-xl border border-border p-4">
                    <h3 className="font-semibold">Runner-up hypotheses</h3>
                    {optimization.runnerUpHypotheses.length ? (
                      <div className="mt-3 space-y-2">
                        {optimization.runnerUpHypotheses.map((hypothesis) => (
                          <div key={hypothesis.canonicalHash} className="rounded-lg bg-secondary/40 p-3 text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium">{hypothesis.label}</span>
                              <Badge variant="outline" className="rounded-full">{hypothesis.score}%</Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">Hash {hypothesis.canonicalHash.slice(0, 18)}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">Only one graph hypothesis was strong enough to rank.</p>
                    )}
                  </div>
                </section>

                <section className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-border p-4">
                    <h3 className="font-semibold">Bond angle statistics</h3>
                    <div className="mt-3 grid gap-2 text-sm">
                      <MetricRow label="Average angle" value={`${selected.angleAnalysis.averageAngle} deg`} />
                      <MetricRow label="Angle variance" value={`${selected.angleAnalysis.variance}`} />
                      <MetricRow label="Ideal geometry support" value={`${selected.angleAnalysis.idealGeometrySupport}%`} />
                      <MetricRow label="Impossible geometry penalty" value={`${selected.angleAnalysis.impossibleGeometryPenalty}`} />
                    </div>
                    <p className="mt-3 text-xs text-muted-foreground">{selected.angleAnalysis.explanation}</p>
                  </div>

                  <div className="rounded-xl border border-border p-4">
                    <h3 className="font-semibold">Ring template statistics</h3>
                    {selected.ringTemplateFits.length ? (
                      <div className="mt-3 space-y-2">
                        {selected.ringTemplateFits.map((fit) => (
                          <div key={fit.ringId} className="rounded-lg bg-secondary/40 p-3 text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span>{fit.size}-member template {fit.aromatic ? "(aromatic)" : ""}</span>
                              <Badge variant="outline" className="rounded-full">{fit.confidence}%</Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">RMS error {fit.rmsError}px</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">No ring template was fitted for this graph.</p>
                    )}
                  </div>
                </section>

                <section className="rounded-xl border border-border p-4">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <LineChart className="h-4 w-4" />
                    Optimization convergence
                  </h3>
                  <div className="mt-4 flex min-h-20 items-end gap-2">
                    {optimization.convergenceScores.map((score, index) => (
                      <div key={`${score}-${index}`} className="flex flex-1 flex-col items-center gap-2">
                        <div className="w-full rounded-t bg-indigo-500/70" style={{ height: `${Math.max(8, score)}px` }} />
                        <span className="text-xs text-muted-foreground">{score}</span>
                      </div>
                    ))}
                  </div>
                </section>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-secondary/40 p-2">
      <span>{label}</span>
      <span className="font-mono font-semibold">{value}</span>
    </div>
  )
}

function MoveRow({ move }: { move: { label: string; beforeScore: number; afterScore: number; reason: string } }) {
  return (
    <div className="rounded-lg bg-secondary/40 p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">{move.label}</span>
        <span className="font-mono">{move.beforeScore} {"->"} {move.afterScore}</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{move.reason}</p>
    </div>
  )
}
