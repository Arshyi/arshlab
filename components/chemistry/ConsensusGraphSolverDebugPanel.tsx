"use client"

import { useState } from "react"
import { ChevronDown, GitMerge, ListChecks, Wrench } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { StructureVisionAnalysis } from "@/lib/structure-vision/vision-types"
import { cn } from "@/lib/utils"

export function ConsensusGraphSolverDebugPanel({ analysis }: { analysis: StructureVisionAnalysis | null }) {
  const [open, setOpen] = useState(false)
  const consensus = analysis?.consensusGraphSolver ?? null
  const selected = consensus?.selectedHypothesis ?? null

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="rounded-2xl border-dashed border-emerald-500/30">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 p-5 text-left">
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              <GitMerge className="h-4 w-4" />
            </span>
            <span>
              <span className="block font-semibold">Consensus Graph Solver</span>
              <span className="block text-sm text-muted-foreground">Canonical graph pooling, deterministic repairs, calibrated confidence, and final graph vote</span>
            </span>
          </span>
          <ChevronDown className={cn("h-5 w-5 shrink-0 transition-transform", open && "rotate-180")} />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-5 border-t border-border pt-5">
            {!consensus || !selected ? (
              <p className="text-sm text-muted-foreground">Run the scanner to generate consensus graph hypotheses.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="rounded-full">Deterministic consensus</Badge>
                  <Badge variant="secondary" className="rounded-full">No AI usage</Badge>
                  <Badge className="rounded-full">{consensus.finalConsensusScore}% final score</Badge>
                  <Badge variant="outline" className="rounded-full">{consensus.confidenceCalibration.overall}% calibrated confidence</Badge>
                </div>

                <p className="text-sm leading-relaxed text-muted-foreground">{consensus.explanation}</p>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Metric label="Hypotheses" value={consensus.hypothesisCount} />
                  <Metric label="Duplicates removed" value={consensus.duplicateGraphsRemoved} />
                  <Metric label="Accepted repairs" value={consensus.repairIterations.filter((move) => move.accepted).length} />
                  <Metric label="Ring conflicts resolved" value={consensus.conflictResolutions.length} />
                  <Metric label="Selected atoms" value={selected.graph.nodes.length} />
                  <Metric label="Selected bonds" value={selected.graph.bonds.length} />
                  <Metric label="Selected rings" value={selected.graph.rings.length} />
                  <Metric label="Database match" value={selected.databaseMatches[0]?.compoundId ?? "none"} />
                </div>

                <section className="rounded-xl border border-border p-4">
                  <h3 className="font-semibold">Calibrated confidence</h3>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    <MetricRow label="Visual" value={`${consensus.confidenceCalibration.visual}%`} />
                    <MetricRow label="Graph" value={`${consensus.confidenceCalibration.graph}%`} />
                    <MetricRow label="Chemical" value={`${consensus.confidenceCalibration.chemical}%`} />
                    <MetricRow label="Database" value={`${consensus.confidenceCalibration.database}%`} />
                    <MetricRow label="OCR" value={`${consensus.confidenceCalibration.ocr}%`} />
                    <MetricRow label="Overall" value={`${consensus.confidenceCalibration.overall}%`} />
                  </div>
                </section>

                <section className="rounded-xl border border-border p-4">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <ListChecks className="h-4 w-4" />
                    Consensus score channels
                  </h3>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {selected.scoreChannels.map((channel) => (
                      <div key={channel.label} className="rounded-lg bg-secondary/40 p-3 text-sm">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-medium">{channel.label}</span>
                          <span className="font-mono font-semibold">+{channel.contribution}</span>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{channel.score}% - {channel.reason}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-border p-4">
                    <h3 className="flex items-center gap-2 font-semibold">
                      <Wrench className="h-4 w-4" />
                      Repair history
                    </h3>
                    {consensus.repairIterations.length ? (
                      <div className="mt-3 space-y-2">
                        {consensus.repairIterations.slice(0, 8).map((move, index) => (
                          <div key={`${move.graphHash}-${index}`} className="rounded-lg bg-secondary/40 p-3 text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium">{move.label}</span>
                              <Badge variant={move.accepted ? "default" : "outline"} className="rounded-full">
                                {move.accepted ? "accepted" : "rejected"}
                              </Badge>
                            </div>
                            <p className="mt-1 font-mono text-xs">{move.beforeScore} {"->"} {move.afterScore}</p>
                            <p className="mt-1 text-xs text-muted-foreground">{move.reason}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">No repair pass was needed for the winning graph.</p>
                    )}
                  </div>

                  <div className="rounded-xl border border-border p-4">
                    <h3 className="font-semibold">Runner-up graphs</h3>
                    {consensus.runnerUpHypotheses.length ? (
                      <div className="mt-3 space-y-2">
                        {consensus.runnerUpHypotheses.map((hypothesis) => (
                          <div key={hypothesis.canonicalHash} className="rounded-lg bg-secondary/40 p-3 text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium">{hypothesis.label}</span>
                              <Badge variant="outline" className="rounded-full">{hypothesis.score}%</Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {hypothesis.databaseMatches[0]?.compoundId ?? "No database match"} - hash {hypothesis.canonicalHash.slice(0, 18)}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">No runner-up graph ranked behind the selected hypothesis.</p>
                    )}
                  </div>
                </section>

                <section className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-border p-4">
                    <h3 className="font-semibold">Ring conflict resolver</h3>
                    {consensus.conflictResolutions.length ? (
                      <div className="mt-3 space-y-2">
                        {consensus.conflictResolutions.map((conflict) => (
                          <div key={`${conflict.issue}-${conflict.winner}`} className="rounded-lg bg-secondary/40 p-3 text-sm">
                            <div className="font-medium">{conflict.issue}</div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Winner: {conflict.winner}; rejected: {conflict.rejected}. {conflict.reason}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">No ring conflict needed a tie-break.</p>
                    )}
                  </div>

                  <div className="rounded-xl border border-border p-4">
                    <h3 className="font-semibold">Graph history</h3>
                    <div className="mt-3 space-y-2">
                      {consensus.graphHistory.slice(0, 5).map((entry) => (
                        <div key={entry.canonicalHash} className="rounded-lg bg-secondary/40 p-3 text-sm">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium">{entry.label}</span>
                            <Badge variant="outline" className="rounded-full">{entry.score}%</Badge>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {entry.nodes} atoms, {entry.bonds} bonds, {entry.rings} rings{entry.aromatic ? ", aromatic" : ""}
                          </p>
                        </div>
                      ))}
                    </div>
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
    <div className="flex items-center justify-between gap-3 rounded-lg bg-secondary/40 p-2 text-sm">
      <span>{label}</span>
      <span className="font-mono font-semibold">{value}</span>
    </div>
  )
}
