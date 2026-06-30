"use client"

import { useState } from "react"
import { ChevronDown, Network, ScanLine } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { StructureVisionAnalysis } from "@/lib/structure-vision/vision-types"
import { cn } from "@/lib/utils"

export function VisionReconstructionPanel({ analysis }: { analysis: StructureVisionAnalysis | null }) {
  const [open, setOpen] = useState(false)
  const report = analysis?.visionReconstruction ?? null

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="rounded-2xl border-dashed border-cyan-500/30">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 p-5 text-left">
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
              <Network className="h-4 w-4" />
            </span>
            <span>
              <span className="block font-semibold">Vision Reconstruction Pipeline</span>
              <span className="block text-sm text-muted-foreground">Strokes, junctions, atom centers, primitive bonds, repairs, and confidence</span>
            </span>
          </span>
          <ChevronDown className={cn("h-5 w-5 shrink-0 transition-transform", open && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-5 border-t border-border pt-5">
            {!report ? (
              <p className="text-sm text-muted-foreground">Run a scan to reconstruct a primitive molecular graph before validation.</p>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" className="rounded-full">Deterministic vision pass</Badge>
                  <Badge variant="secondary" className="rounded-full">Before graph validation</Badge>
                  <Badge className="rounded-full bg-cyan-600">{report.confidence.overallConfidence}% overall</Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Metric label="Raw strokes" value={report.rawStrokes.length} />
                  <Metric label="Merged strokes" value={report.mergedStrokes.length} />
                  <Metric label="Repaired strokes" value={report.repairedStrokes.filter((stroke) => stroke.repaired).length} />
                  <Metric label="Junctions" value={report.junctions.length} />
                  <Metric label="Atom centers" value={report.atomCenters.length} />
                  <Metric label="Accepted bonds" value={report.acceptedBonds.length} />
                  <Metric label="Rejected bonds" value={report.rejectedBonds.length} />
                  <Metric label="Primitive edges" value={report.primitiveGraph.edges.length} />
                </div>

                <section className="rounded-xl border border-border p-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <ScanLine className="h-4 w-4" />
                    Confidence histogram
                  </h3>
                  <div className="mt-3 grid gap-2 sm:grid-cols-5">
                    {report.confidence.histogram.map((bucket) => (
                      <div key={bucket.label} className="rounded-lg bg-secondary/40 p-3">
                        <p className="font-mono text-lg font-bold">{bucket.count}</p>
                        <p className="text-xs text-muted-foreground">{bucket.label}</p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                    <SmallMetric label="Stroke" value={`${report.confidence.strokeConfidence}%`} />
                    <SmallMetric label="Junction" value={`${report.confidence.junctionConfidence}%`} />
                    <SmallMetric label="Atom" value={`${report.confidence.atomConfidence}%`} />
                    <SmallMetric label="Bond" value={`${report.confidence.bondConfidence}%`} />
                    <SmallMetric label="Repair" value={`${report.confidence.repairConfidence}%`} />
                  </div>
                </section>

                <div className="grid gap-5 lg:grid-cols-2">
                  <section className="rounded-xl border border-border p-4">
                    <h3 className="text-sm font-semibold">Atom centers</h3>
                    <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-border">
                      <table className="w-full min-w-[420px] text-left text-xs">
                        <thead className="sticky top-0 bg-secondary">
                          <tr><th className="p-2">Atom</th><th className="p-2">Source</th><th className="p-2">Point</th><th className="p-2">Confidence</th></tr>
                        </thead>
                        <tbody>
                          {report.atomCenters.map((atom) => (
                            <tr key={atom.id} className="border-t border-border">
                              <td className="p-2 font-semibold">{atom.element}{atom.id}</td>
                              <td className="p-2">{atom.source}</td>
                              <td className="p-2 font-mono">{Math.round(atom.point.x)}, {Math.round(atom.point.y)}</td>
                              <td className="p-2">{atom.confidence}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <section className="rounded-xl border border-border p-4">
                    <h3 className="text-sm font-semibold">Accepted primitive bonds</h3>
                    <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-border">
                      <table className="w-full min-w-[420px] text-left text-xs">
                        <thead className="sticky top-0 bg-secondary">
                          <tr><th className="p-2">Bond</th><th className="p-2">Order</th><th className="p-2">Length</th><th className="p-2">Confidence</th></tr>
                        </thead>
                        <tbody>
                          {report.acceptedBonds.map((bond) => (
                            <tr key={bond.id} className="border-t border-border">
                              <td className="p-2 font-mono">{bond.startAtomId}-{bond.endAtomId}</td>
                              <td className="p-2">{bond.bondOrder}</td>
                              <td className="p-2">{Math.round(bond.length * 10) / 10}</td>
                              <td className="p-2">{bond.confidence}%{bond.repaired ? " repaired" : ""}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>

                {report.rejectedBonds.length ? (
                  <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                    <h3 className="text-sm font-semibold">Rejected primitive bonds</h3>
                    <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                      {report.rejectedBonds.map((bond) => (
                        <p key={bond.id}>
                          {bond.startAtomId}-{bond.endAtomId}: {bond.rejectionReason ?? "Rejected by primitive geometry filter."}
                        </p>
                      ))}
                    </div>
                  </section>
                ) : null}

                <p className="text-sm leading-relaxed text-muted-foreground">{report.explanation}</p>
              </>
            )}
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

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/40 p-3">
      <p className="font-mono text-sm font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
