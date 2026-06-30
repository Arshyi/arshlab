"use client"

import { useState } from "react"
import { CheckCircle2, ChevronDown, GitCompareArrows, RotateCcw, Timer, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { CompilerIR } from "@/lib/molecular-compiler/compiler-types"
import type { OptimizationReport } from "@/lib/molecular-compiler/optimization-report"
import { cn } from "@/lib/utils"

export function CompilerOptimizerPanel({ report }: { report: OptimizationReport | null }) {
  const [open, setOpen] = useState(false)
  return (
    <Card className="rounded-2xl border-dashed border-violet-500/30">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 p-5 text-left"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-500/10 text-violet-700 dark:text-violet-300">
            <GitCompareArrows className="h-4 w-4" />
          </span>
          <span>
            <span className="block font-semibold">Compiler Optimizer</span>
            <span className="block text-sm text-muted-foreground">Optimization passes, rollback safety, graph hashes, and IR diffs</span>
          </span>
        </span>
        <ChevronDown className={cn("h-5 w-5 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <CardContent className="space-y-5 border-t border-border pt-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="rounded-full">Deterministic optimization manager</Badge>
            <Badge variant="secondary" className="rounded-full">Rollback-safe</Badge>
            <Badge variant="secondary" className="rounded-full">No AI usage</Badge>
            {report ? <Badge className="rounded-full bg-violet-600">{report.passesExecuted} passes</Badge> : null}
          </div>

          {!report ? (
            <p className="text-sm text-muted-foreground">Run a scan with a passing compiler IR to execute optimization passes.</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Metric label="Passes executed" value={report.passesExecuted} />
                <Metric label="Successful passes" value={report.successfulPasses} />
                <Metric label="Rolled back" value={report.rolledBackPasses} />
                <Metric label="Optimization gain" value={report.optimizationGain} />
                <Metric label="Average gain" value={report.averageOptimizationGain} />
                <Metric label="Optimization time" value={`${report.totalTimeMs} ms`} />
                <Metric label="Average pass time" value={`${report.averagePassTimeMs} ms`} />
                <Metric label="Warnings" value={report.compilerWarnings.length} />
                <Metric label="Errors" value={report.compilerErrors.length} />
              </div>

              <section className="rounded-xl border border-border p-4">
                <h3 className="font-semibold">IR Before and After</h3>
                <div className="mt-3 grid gap-4 lg:grid-cols-2">
                  <GraphPreview title="Before optimization" ir={report.irBefore} hash={report.graphHashBefore} />
                  <GraphPreview title="After optimization" ir={report.irAfter} hash={report.graphHashAfter} />
                </div>
              </section>

              <section className="rounded-xl border border-border p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Timer className="h-4 w-4" />
                  Pass execution log
                </h3>
                <div className="mt-3 space-y-3">
                  {report.passes.map((pass) => (
                    <div key={pass.passId} className={cn(
                      "rounded-lg border p-3",
                      pass.status === "rolled-back" || pass.status === "failed"
                        ? "border-amber-500/30 bg-amber-500/10"
                        : pass.status === "success"
                          ? "border-emerald-500/30 bg-emerald-500/10"
                          : "border-border bg-secondary/30",
                    )}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="font-medium">{pass.passId}</p>
                          <p className="text-xs text-muted-foreground">{pass.description}</p>
                        </div>
                        <Badge variant={pass.status === "success" ? "default" : "outline"} className="rounded-full">
                          {pass.status}
                        </Badge>
                      </div>
                      <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2 lg:grid-cols-4">
                        <SmallMetric label="Nodes" value={`${pass.nodesBefore} -> ${pass.nodesAfter}`} />
                        <SmallMetric label="Edges" value={`${pass.edgesBefore} -> ${pass.edgesAfter}`} />
                        <SmallMetric label="Score" value={`${pass.scoreBefore} -> ${pass.scoreAfter}`} />
                        <SmallMetric label="Time" value={`${pass.milliseconds} ms`} />
                      </div>
                      <PassMetricList metrics={pass.metrics} />
                      {pass.warnings.length || pass.errors.length ? (
                        <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                          {[...pass.warnings, ...pass.errors].map((line) => <li key={line}>{line}</li>)}
                        </ul>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>

              {report.rolledBackPasses > 0 ? (
                <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <RotateCcw className="h-4 w-4" />
                    Rollback safety activated
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    A pass that lowered graph validity was undone. The optimized IR keeps the last validated state.
                  </p>
                </section>
              ) : (
                <section className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <CheckCircle2 className="h-4 w-4" />
                    No rollbacks required
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">Every changed optimization pass preserved semantic validity.</p>
                </section>
              )}

              {report.compilerErrors.length ? (
                <section className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <XCircle className="h-4 w-4" />
                    Compiler optimizer errors
                  </h3>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                    {report.compilerErrors.map((error) => <li key={error}>{error}</li>)}
                  </ul>
                </section>
              ) : null}
            </>
          )}
        </CardContent>
      )}
    </Card>
  )
}

function GraphPreview({ title, ir, hash }: { title: string; ir: CompilerIR; hash: string }) {
  const graph = ir.canonicalGraph
  const minX = Math.min(...graph.nodes.map((node) => node.x), 0)
  const minY = Math.min(...graph.nodes.map((node) => node.y), 0)
  const maxX = Math.max(...graph.nodes.map((node) => node.x), 120)
  const maxY = Math.max(...graph.nodes.map((node) => node.y), 90)
  const padding = 18
  return (
    <div className="rounded-xl border border-border bg-secondary/30 p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium">{title}</p>
        <Badge variant="outline" className="rounded-full">{ir.confidenceCeiling}% ceiling</Badge>
      </div>
      <div className="mt-3 overflow-hidden rounded-lg border border-border bg-slate-950 p-2">
        <svg
          viewBox={`${minX - padding} ${minY - padding} ${maxX - minX + padding * 2} ${maxY - minY + padding * 2}`}
          className="block h-52 w-full"
          role="img"
          aria-label={`${title} compiler IR graph`}
        >
          {graph.bonds.map((bond) => {
            const start = graph.nodes.find((node) => node.id === bond.startNodeId)
            const end = graph.nodes.find((node) => node.id === bond.endNodeId)
            if (!start || !end) return null
            return (
              <line
                key={bond.id}
                x1={start.x}
                y1={start.y}
                x2={end.x}
                y2={end.y}
                stroke={bond.gapBridged ? "#f59e0b" : bond.bondOrder > 1 ? "#a78bfa" : "#38bdf8"}
                strokeWidth={Math.max(1.5, bond.bondOrder * 1.1)}
                strokeDasharray={bond.gapBridged ? "4 3" : undefined}
              />
            )
          })}
          {graph.nodes.map((node) => (
            <g key={node.id}>
              <circle cx={node.x} cy={node.y} r="5" fill="#14b8a6" stroke="#ccfbf1" strokeWidth="1" />
              <text x={node.x} y={node.y + 1.8} textAnchor="middle" fill="white" fontSize="5" fontWeight="700">
                {node.inferredElement}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <p className="mt-2 break-all font-mono text-xs text-muted-foreground">{hash}</p>
    </div>
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

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-background/70 px-3 py-2">
      <p className="font-mono">{value}</p>
      <p className="text-muted-foreground">{label}</p>
    </div>
  )
}

function PassMetricList({ metrics }: { metrics: OptimizationReport["passes"][number]["metrics"] }) {
  const entries = Object.entries(metrics).filter(([, value]) => value !== undefined)
  if (!entries.length) return null
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {entries.map(([key, value]) => (
        <Badge key={key} variant="outline" className="rounded-full font-mono text-[11px]">
          {key}: {value}
        </Badge>
      ))}
    </div>
  )
}
