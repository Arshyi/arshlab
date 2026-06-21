"use client"

import { useState } from "react"
import { ChevronDown, CircleDotDashed, GitBranch, ScanLine, Shapes } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { StructureVisionAnalysis } from "@/lib/structure-vision/vision-types"
import { cn } from "@/lib/utils"

export function VisionDebugPanel({ analysis, error }: { analysis: StructureVisionAnalysis | null; error?: string | null }) {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="rounded-2xl border-dashed">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 p-5 text-left">
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
              <ScanLine className="h-4 w-4" />
            </span>
            <span>
              <span className="block font-semibold">Vision Debug Panel</span>
              <span className="block text-sm text-muted-foreground">Line graph, fuzzy cycles, aromatic evidence, and local candidates</span>
            </span>
          </span>
          <ChevronDown className={cn("h-5 w-5 shrink-0 transition-transform", open && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-5 border-t border-border pt-5">
            {error && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
                Shape detection error: {error}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Detected lines" value={analysis?.lineSegments.length ?? 0} />
              <Metric label="Graph nodes" value={analysis?.graph.nodes.length ?? 0} />
              <Metric label="Merged endpoints" value={analysis?.graph.mergedEndpointCount ?? 0} />
              <Metric label="Graph edges" value={analysis?.graph.edges.length ?? 0} />
              <Metric label="Pixel closed loops" value={analysis?.closedLoops.length ?? 0} />
              <Metric label="Cycle candidates" value={analysis?.graph.cycleCandidates.length ?? 0} />
              <Metric label="Near-ring candidates" value={analysis?.graph.nearRingCandidates.length ?? 0} />
              <Metric label="Parallel line pairs" value={analysis?.parallelLinePairs ?? 0} />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <section className="rounded-xl border border-border p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Shapes className="h-4 w-4" />
                  Functional-group visual cues
                </h3>
                {analysis?.functionalGroupCues.length ? (
                  <div className="mt-3 space-y-2">
                    {analysis.functionalGroupCues.map((cue) => (
                      <div key={cue.kind} className="rounded-lg bg-secondary/40 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-medium">{cue.label}</p>
                          <Badge variant="outline" className="rounded-full">{cue.confidence}% cue</Badge>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{cue.evidence}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">No stable functional-group visual cues detected.</p>
                )}
              </section>

              <section className="rounded-xl border border-border p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <GitBranch className="h-4 w-4" />
                  Shape summary
                </h3>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <p>Simple chain estimate: <span className="font-semibold text-foreground">{analysis?.simpleChainLength || "Not detected"}</span></p>
                  <p>Endpoint merge tolerance: <span className="font-semibold text-foreground">{analysis ? `${analysis.graph.endpointTolerance.toFixed(1)} px` : "Not analyzed"}</span></p>
                  <p>Average line length: <span className="font-semibold text-foreground">{analysis ? `${analysis.graph.averageLineLength.toFixed(1)} px` : "Not analyzed"}</span></p>
                  <p>Best ring confidence: <span className="font-semibold text-foreground">{analysis ? `${analysis.graph.bestRingConfidence}%` : "Not analyzed"}</span></p>
                  <p>Aromatic cue score: <span className="font-semibold text-foreground">{analysis ? `${analysis.graph.aromaticCueScore}%` : "Not analyzed"}</span></p>
                  <p>Dark stroke pixels: <span className="font-semibold text-foreground">{analysis?.darkPixelCount.toLocaleString() ?? 0}</span></p>
                  <p>Dark pixel coverage: <span className="font-semibold text-foreground">{analysis ? `${(analysis.darkPixelRatio * 100).toFixed(1)}%` : "Not analyzed"}</span></p>
                  <p>Adaptive darkness threshold: <span className="font-semibold text-foreground">{analysis?.threshold ?? "Not analyzed"}</span></p>
                </div>
                {analysis?.warnings.length ? (
                  <ul className="mt-3 space-y-1 text-xs text-amber-700 dark:text-amber-300">
                    {analysis.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                  </ul>
                ) : null}
              </section>
            </div>

            <section className="rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold">Why fuzzy ring detection succeeded or failed</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {analysis?.graph.explanation ?? "Run the scanner to build an endpoint graph."}
              </p>
              {analysis && analysis.ringCandidates.length > 0 && (
                <p className={cn(
                  "mt-3 rounded-lg border p-3 text-sm",
                  analysis.graph.aromaticCueScore >= 50 || analysis.parallelLinePairs >= 3
                    ? "border-teal-500/30 bg-teal-500/10 text-teal-800 dark:text-teal-200"
                    : "border-amber-500/30 bg-amber-500/10 text-amber-800 dark:text-amber-200",
                )}>
                  {analysis.graph.aromaticCueScore >= 50 || analysis.parallelLinePairs >= 3
                    ? "Aromatic support detected from parallel/double-bond strokes."
                    : "Ring geometry was detected, but aromatic double-bond support remains limited."}
                </p>
              )}
              {analysis?.ringCandidates[0] && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <RingValue label="Member count" value={`${analysis.ringCandidates[0].sidesEstimate}`} />
                  <RingValue label="Closure" value={`${analysis.ringCandidates[0].closureQuality}%`} />
                  <RingValue label="Regularity" value={`${analysis.ringCandidates[0].polygonRegularity}%`} />
                  <RingValue label="Line coverage" value={`${analysis.ringCandidates[0].lineCoverage}%`} />
                </div>
              )}
            </section>

            <section className="rounded-xl border border-border p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <CircleDotDashed className="h-4 w-4" />
                Top visual candidates
              </h3>
              {analysis?.candidates.length ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {analysis.candidates.slice(0, 3).map((candidate, index) => (
                    <div key={candidate.compoundId} className="rounded-lg bg-secondary/40 p-3">
                      <p className="text-xs text-muted-foreground">Visual candidate {index + 1}</p>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="font-semibold">{candidate.label}</p>
                        <Badge variant="secondary" className="rounded-full">{candidate.score}</Badge>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{candidate.reasons.join("; ")}</p>
                      <div className="mt-3 space-y-1 border-t border-border pt-2">
                        {candidate.scoreBreakdown.map((entry) => (
                          <div key={entry.label} className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                            <span>{entry.label}</span>
                            <span className="font-mono">+{Math.round(entry.points)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No compound candidate was supported by the visual evidence.</p>
              )}
            </section>

            <p className="text-xs text-muted-foreground">
              These local line, ring, and functional-group heuristics feed the Molecular Graph Reconstruction Engine. Inferred atoms and bonds remain educational estimates.
            </p>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

function RingValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/40 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-sm font-semibold">{value}</p>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}
