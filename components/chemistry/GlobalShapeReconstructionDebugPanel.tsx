"use client"

import { useState } from "react"
import { ChevronDown, GitMerge, Shapes } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { StructureVisionAnalysis } from "@/lib/structure-vision/vision-types"
import { cn } from "@/lib/utils"

export function GlobalShapeReconstructionDebugPanel({ analysis }: { analysis: StructureVisionAnalysis | null }) {
  const [open, setOpen] = useState(false)
  const shape = analysis?.globalShapeReconstruction ?? null

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="rounded-2xl border-dashed border-purple-500/30">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 p-5 text-left">
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-300">
              <GitMerge className="h-4 w-4" />
            </span>
            <span>
              <span className="block font-semibold">Global Shape Reconstruction</span>
              <span className="block text-sm text-muted-foreground">Fragments, repaired strokes, bridges, corners, polygon hypotheses, and accepted skeleton</span>
            </span>
          </span>
          <ChevronDown className={cn("h-5 w-5 shrink-0 transition-transform", open && "rotate-180")} />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-5 border-t border-border pt-5">
            {!shape ? (
              <p className="text-sm text-muted-foreground">Run the scanner to reconstruct the intended stroke skeleton.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="rounded-full">Deterministic geometry</Badge>
                  <Badge variant="secondary" className="rounded-full">No AI usage</Badge>
                  <Badge className="rounded-full">{shape.shapeConfidence}% shape confidence</Badge>
                  {shape.acceptedPolygon && <Badge variant="outline" className="rounded-full">{shape.acceptedPolygon.sides}-member polygon accepted</Badge>}
                </div>

                <p className="text-sm leading-relaxed text-muted-foreground">{shape.explanation}</p>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Metric label="Original fragments" value={shape.originalSegments.length} />
                  <Metric label="Merged strokes" value={shape.mergedStrokes.length} />
                  <Metric label="Accepted bridges" value={shape.bridgedGaps.filter((bridge) => bridge.accepted).length} />
                  <Metric label="Predicted corners" value={shape.predictedCorners.length} />
                  <Metric label="Polygon hypotheses" value={shape.polygonHypotheses.length} />
                  <Metric label="Polygon confidence" value={`${shape.polygonConfidence}%`} />
                  <Metric label="Bridge confidence" value={`${shape.bridgeConfidence}%`} />
                  <Metric label="Symmetry score" value={`${shape.symmetryScore}%`} />
                </div>

                <section className="rounded-xl border border-border p-4">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <Shapes className="h-4 w-4" />
                    Polygon hypotheses
                  </h3>
                  {shape.polygonHypotheses.length ? (
                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                      {shape.polygonHypotheses.slice(0, 6).map((polygon) => (
                        <div
                          key={polygon.id}
                          className={cn(
                            "rounded-lg border p-3",
                            polygon.accepted ? "border-purple-500/40 bg-purple-500/10" : "border-border bg-secondary/30",
                          )}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <p className="font-semibold">{polygon.sides}-member polygon</p>
                            <div className="flex flex-wrap gap-2">
                              {polygon.accepted && <Badge className="rounded-full bg-purple-600">Accepted</Badge>}
                              <Badge variant="outline" className="rounded-full">{polygon.confidence}%</Badge>
                            </div>
                          </div>
                          <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                            <span>Missing edges {polygon.missingEdges.length}</span>
                            <span>Closure error {polygon.closureError}%</span>
                            <span>Angle consistency {polygon.angleConsistency}%</span>
                            <span>Edge consistency {polygon.edgeLengthConsistency}%</span>
                            <span>Symmetry {polygon.symmetryScore}%</span>
                            <span>Fit error {polygon.fit.fitError}</span>
                          </div>
                          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{polygon.reasons.join(" ")}</p>
                          {polygon.rejectionReasons.length ? (
                            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{polygon.rejectionReasons.join(" ")}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">No polygon hypothesis was generated from the current fragments.</p>
                  )}
                </section>

                <section className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-border p-4">
                    <h3 className="font-semibold">Accepted bridges</h3>
                    {shape.bridgedGaps.filter((bridge) => bridge.accepted).length ? (
                      <div className="mt-3 space-y-2">
                        {shape.bridgedGaps.filter((bridge) => bridge.accepted).slice(0, 8).map((bridge) => (
                          <div key={bridge.id} className="rounded-lg bg-secondary/40 p-3 text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span>Stroke {bridge.fromStrokeId} {"->"} {bridge.toStrokeId}</span>
                              <Badge variant="outline" className="rounded-full">{bridge.confidence}%</Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">{bridge.gapLength}px gap. {bridge.reason}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">No gap bridge met the continuity safeguards.</p>
                    )}
                  </div>

                  <div className="rounded-xl border border-border p-4">
                    <h3 className="font-semibold">Predicted corners</h3>
                    {shape.predictedCorners.length ? (
                      <div className="mt-3 space-y-2">
                        {shape.predictedCorners.slice(0, 8).map((corner) => (
                          <div key={corner.id} className="rounded-lg bg-secondary/40 p-3 text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span>Corner at ({corner.point.x.toFixed(1)}, {corner.point.y.toFixed(1)})</span>
                              <Badge variant="outline" className="rounded-full">{corner.confidence}%</Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">{corner.angle} deg. {corner.reason}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">No missing corner was inferred.</p>
                    )}
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
