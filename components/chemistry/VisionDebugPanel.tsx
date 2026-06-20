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
              <span className="block text-sm text-muted-foreground">Lines, loops, rings, visual cues, and local candidates</span>
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
              <Metric label="Closed loops" value={analysis?.closedLoops.length ?? 0} />
              <Metric label="Ring candidates" value={analysis?.ringCandidates.length ?? 0} />
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
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No compound candidate was supported by the visual evidence.</p>
              )}
            </section>

            <p className="text-xs text-muted-foreground">
              Shape detection is an educational local heuristic, not a chemical drawing parser. OCR, manual hints, filenames, and visual evidence are scored separately before database matching.
            </p>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
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
