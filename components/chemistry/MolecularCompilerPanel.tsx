"use client"

import { useState } from "react"
import { Braces, CheckCircle2, ChevronDown, Code2, Timer, TriangleAlert, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { CompilerReport } from "@/lib/molecular-compiler/compiler-types"
import { cn } from "@/lib/utils"

export function MolecularCompilerPanel({ report }: { report: CompilerReport | null }) {
  const [open, setOpen] = useState(false)
  const statusClass = report?.status === "pass"
    ? "border-emerald-500/30"
    : report?.status === "pass-with-warnings"
      ? "border-amber-500/30"
      : "border-red-500/30"

  return (
    <Card className={cn("rounded-2xl border-dashed", statusClass)}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 p-5 text-left"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-700 dark:text-indigo-300">
            <Code2 className="h-4 w-4" />
          </span>
          <span>
            <span className="block font-semibold">Molecular Compiler</span>
            <span className="block text-sm text-muted-foreground">Tokens to primitives to AST to canonical compiler IR</span>
          </span>
        </span>
        <ChevronDown className={cn("h-5 w-5 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <CardContent className="space-y-5 border-t border-border pt-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="rounded-full">Deterministic compiler architecture</Badge>
            <Badge variant="secondary" className="rounded-full">No AI usage</Badge>
            <Badge className={cn("rounded-full", report?.status === "pass" ? "bg-emerald-600" : report?.status === "pass-with-warnings" ? "bg-amber-600" : "bg-red-600")}>
              {report?.status ?? "not run"}
            </Badge>
            {report?.knowledgeEngineInput.available ? (
              <Badge className="rounded-full bg-emerald-600">IR ready for knowledge engine</Badge>
            ) : (
              <Badge className="rounded-full bg-red-600">Knowledge gate closed</Badge>
            )}
          </div>

          {!report ? (
            <p className="text-sm text-muted-foreground">Run a scan to compile visual evidence into a canonical molecular IR.</p>
          ) : (
            <>
              <section className={cn(
                "rounded-xl border p-4",
                report.status === "fail" ? "border-red-500/30 bg-red-500/10" : report.status === "pass-with-warnings" ? "border-amber-500/30 bg-amber-500/10" : "border-emerald-500/30 bg-emerald-500/10",
              )}>
                <h3 className="flex items-center gap-2 font-semibold">
                  {report.status === "fail" ? <XCircle className="h-4 w-4" /> : report.status === "pass-with-warnings" ? <TriangleAlert className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                  {report.knowledgeEngineInput.reason}
                </h3>
                {report.ir ? (
                  <p className="mt-2 font-mono text-xs text-muted-foreground break-all">{report.ir.canonicalGraphId}</p>
                ) : null}
              </section>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Metric label="Visual tokens" value={report.visualTokens.length} />
                <Metric label="Primitives" value={report.chemicalPrimitives.length} />
                <Metric label="AST nodes" value={report.ast.nodes.length} />
                <Metric label="AST edges" value={report.ast.edges.length} />
                <Metric label="Components" value={report.ast.connectedComponents.length} />
                <Metric label="Cycles" value={report.ast.cycles.length} />
                <Metric label="Semantic issues" value={report.semanticValidation.issues.length} />
                <Metric label="Confidence ceiling" value={`${report.ir?.confidenceCeiling ?? 0}%`} />
              </div>

              <section className="rounded-xl border border-border p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Braces className="h-4 w-4" />
                  Compiler pipeline
                </h3>
                <div className="mt-3 grid gap-2 md:grid-cols-5">
                  {["Visual Tokens", "Chemical Primitives", "Chemical AST", "Semantic Validation", "Canonical IR"].map((stage, index) => (
                    <div key={stage} className="rounded-lg border border-border bg-secondary/30 p-3">
                      <p className="text-xs text-muted-foreground">Stage {index + 1}</p>
                      <p className="mt-1 font-semibold">{stage}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-border p-4">
                <h3 className="font-semibold">Confidence propagation</h3>
                <div className="mt-3 space-y-2">
                  {report.confidenceFlow.map((flow) => (
                    <div key={flow.stage} className="rounded-lg bg-secondary/40 p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium">{flow.stage}</p>
                        <Badge variant="outline" className="rounded-full">{flow.confidence}% / ceiling {flow.ceiling}%</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{flow.reason}</p>
                    </div>
                  ))}
                </div>
              </section>

              {report.ir ? (
                <section className="rounded-xl border border-border p-4">
                  <h3 className="font-semibold">Compiler IR</h3>
                  <div className="mt-3 grid gap-3 lg:grid-cols-2">
                    <div className="rounded-lg bg-secondary/40 p-3">
                      <p className="text-xs text-muted-foreground">Fingerprint</p>
                      <p className="mt-1 font-mono text-xs break-all">{report.ir.fingerprint}</p>
                    </div>
                    <div className="rounded-lg bg-secondary/40 p-3">
                      <p className="text-xs text-muted-foreground">Hash</p>
                      <p className="mt-1 font-mono text-xs break-all">{report.ir.hash}</p>
                    </div>
                  </div>
                  <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-border">
                    <table className="w-full min-w-[520px] text-left text-xs">
                      <thead className="sticky top-0 bg-secondary">
                        <tr><th className="p-2">Node</th><th className="p-2">Atom</th><th className="p-2">Neighbors</th></tr>
                      </thead>
                      <tbody>
                        {report.canonical?.adjacencyList.map((item) => (
                          <tr key={item.nodeId} className="border-t border-border">
                            <td className="p-2 font-mono">{item.nodeId}</td>
                            <td className="p-2 font-semibold">{item.atom}</td>
                            <td className="p-2 font-mono">{item.neighbors.map((neighbor) => `${neighbor.nodeId}(${neighbor.bondOrder})`).join(", ") || "none"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              ) : null}

              <div className="grid gap-5 lg:grid-cols-2">
                <section className="rounded-xl border border-border p-4">
                  <h3 className="text-sm font-semibold">Semantic validation</h3>
                  {report.semanticValidation.issues.length ? (
                    <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                      {report.semanticValidation.issues.map((issue) => <li key={issue.id}>{issue.explanation}</li>)}
                    </ul>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">{report.semanticValidation.explanations[0]}</p>
                  )}
                </section>

                <section className="rounded-xl border border-border p-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold">
                    <Timer className="h-4 w-4" />
                    Stage timing
                  </h3>
                  <div className="mt-3 space-y-2">
                    {report.timings.map((timing) => (
                      <div key={timing.stage} className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2 text-sm">
                        <span>{timing.stage}</span>
                        <span className="font-mono">{timing.milliseconds} ms</span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </>
          )}
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
