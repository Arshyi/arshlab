"use client"

import { useState } from "react"
import { CheckCircle2, ChevronDown, GitPullRequestDraft, Scissors, TriangleAlert } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { StructureVisionAnalysis } from "@/lib/structure-vision/vision-types"
import { cn } from "@/lib/utils"

export function ChemicalGraphValidatorDebugPanel({ analysis }: { analysis: StructureVisionAnalysis | null }) {
  const [open, setOpen] = useState(false)
  const validation = analysis?.chemicalGraphValidation ?? null
  const rejectedLong = validation?.rejectedBonds.filter((bond) => bond.kind === "long-bond").length ?? 0
  const rejectedCrossing = validation?.rejectedBonds.filter((bond) => bond.kind === "crossing-bond").length ?? 0
  const valenceFixes = validation?.valenceSummaries.reduce((sum, item) => sum + item.fixes.length, 0) ?? 0

  return (
    <Card className="rounded-2xl border-dashed border-emerald-500/30">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 p-5 text-left"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
            <Scissors className="h-4 w-4" />
          </span>
          <span>
            <span className="block font-semibold">Chemical Graph Validator</span>
            <span className="block text-sm text-muted-foreground">Edge pruning, valence checks, and false triple-bond correction</span>
          </span>
        </span>
        <ChevronDown className={cn("h-5 w-5 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <CardContent className="space-y-5 border-t border-border pt-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="rounded-full">Deterministic chemistry validator</Badge>
            <Badge variant="secondary" className="rounded-full">No AI usage</Badge>
            {validation?.plausible ? (
              <Badge className="rounded-full bg-emerald-600">Chemically plausible</Badge>
            ) : (
              <Badge variant="outline" className="rounded-full border-amber-500/40 text-amber-700 dark:text-amber-300">Needs caution</Badge>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Raw bonds" value={validation?.rawBondCount ?? 0} />
            <Metric label="Accepted bonds" value={validation?.acceptedBonds.length ?? 0} />
            <Metric label="Pruned bonds" value={validation?.prunedBondCount ?? 0} />
            <Metric label="Median bond length" value={validation ? `${validation.medianBondLength}px` : "0px"} />
            <Metric label="Rejected long bonds" value={rejectedLong} />
            <Metric label="Rejected crossings" value={rejectedCrossing} />
            <Metric label="Valence fixes" value={valenceFixes} />
            <Metric label="Validated score" value={`${validation?.graphValidityScore ?? 0}%`} />
          </div>

          <section className="rounded-xl border border-border p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              {validation?.plausible ? <CheckCircle2 className="h-4 w-4" /> : <TriangleAlert className="h-4 w-4" />}
              Why this graph is {validation?.plausible ? "chemically plausible" : "chemically uncertain"}
            </h3>
            {validation?.diagnostics.length ? (
              <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                {validation.diagnostics.map((line) => <li key={line}>{line}</li>)}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">Run a scan to validate reconstructed bonds.</p>
            )}
          </section>

          {validation?.selectedValidatedRing ? (
            <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold">Final validated ring candidate</h3>
                <Badge className="rounded-full bg-emerald-600">{validation.selectedValidatedRing.confidence}%</Badge>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {validation.selectedValidatedRing.size}-member {validation.selectedValidatedRing.aromatic ? "aromatic" : "non-aromatic"} ring.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{validation.selectedValidatedRing.reason}</p>
            </section>
          ) : null}

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="min-w-0 rounded-xl border border-border p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <GitPullRequestDraft className="h-4 w-4" />
                Rejected bonds
              </h3>
              {validation?.rejectedBonds.length ? (
                <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-border">
                  <table className="w-full min-w-[620px] text-left text-xs">
                    <thead className="sticky top-0 bg-secondary">
                      <tr><th className="p-2">Bond</th><th className="p-2">Atoms</th><th className="p-2">Kind</th><th className="p-2">Length</th><th className="p-2">Reason</th></tr>
                    </thead>
                    <tbody>
                      {validation.rejectedBonds.map((bond) => (
                        <tr key={`${bond.id}-${bond.kind}-${bond.reason}`} className="border-t border-border">
                          <td className="p-2 font-mono">{bond.id}</td>
                          <td className="p-2 font-mono">{bond.startNodeId}-{bond.endNodeId}</td>
                          <td className="p-2">{bond.kind}</td>
                          <td className="p-2">{bond.length}px</td>
                          <td className="p-2 text-muted-foreground">{bond.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No bonds were rejected by the chemical validator.</p>
              )}
            </section>

            <section className="min-w-0 rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold">Bond-order corrections</h3>
              {validation?.correctedBondOrders.length ? (
                <div className="mt-3 space-y-2">
                  {validation.correctedBondOrders.map((correction) => (
                    <div key={`${correction.bondId}-${correction.fromOrder}-${correction.toOrder}`} className="rounded-lg bg-secondary/40 p-3 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono">Bond {correction.bondId}: {correction.fromOrder}{" -> "}{correction.toOrder}</span>
                        <Badge variant="outline" className="rounded-full">{correction.startNodeId}-{correction.endNodeId}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{correction.reason}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No unsupported triple or multiple bonds required correction.</p>
              )}
            </section>
          </div>

          <section className="rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold">Valence summaries</h3>
            {validation?.valenceSummaries.length ? (
              <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {validation.valenceSummaries.map((summary) => (
                  <div key={summary.nodeId} className={cn("rounded-lg border p-3", summary.valid ? "border-border bg-secondary/30" : "border-amber-500/30 bg-amber-500/10")}>
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-mono">Node {summary.nodeId} {summary.element}</p>
                      <Badge variant={summary.valid ? "secondary" : "outline"} className="rounded-full">
                        {summary.observedValence}/{summary.maxValence}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">Degree {summary.observedDegree}</p>
                    {summary.fixes.length ? <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{summary.fixes.join(" ")}</p> : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted-foreground">No atom valence summaries are available yet.</p>
            )}
          </section>
        </CardContent>
      )}
    </Card>
  )
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}
