"use client"

import { useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, ChevronDown, GitBranch, ShieldCheck, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { StructureVisionAnalysis } from "@/lib/structure-vision/vision-types"
import { cn } from "@/lib/utils"

export function GraphValidationPanel({ analysis }: { analysis: StructureVisionAnalysis | null }) {
  const [open, setOpen] = useState(false)
  const validation = analysis?.graphValidation ?? null
  const graph = validation?.selectedGraph ?? analysis?.molecularGraph ?? null
  const statusTone = validation?.status === "passed"
    ? "border-emerald-500/30"
    : validation?.status === "passed-with-warnings"
      ? "border-amber-500/30"
      : "border-red-500/30"
  const statusBadge = validation?.status === "passed"
    ? "bg-emerald-600"
    : validation?.status === "passed-with-warnings"
      ? "bg-amber-600"
      : "bg-red-600"

  const edgeMap = useMemo(() => {
    return new Map(validation?.edgeValidation.edges.map((edge) => [edge.bondId, edge.status]) ?? [])
  }, [validation])

  return (
    <Card className={cn("rounded-2xl border-dashed", statusTone)}>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 p-5 text-left"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <span>
            <span className="block font-semibold">Graph Validation</span>
            <span className="block text-sm text-muted-foreground">Primitive graph checks, topology variants, and candidate gate</span>
          </span>
        </span>
        <ChevronDown className={cn("h-5 w-5 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <CardContent className="space-y-5 border-t border-border pt-5">
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="rounded-full">Deterministic CAD-style validation</Badge>
            <Badge variant="secondary" className="rounded-full">No AI usage</Badge>
            <Badge className={cn("rounded-full", statusBadge)}>
              {validation ? validation.status.replaceAll("-", " ") : "not run"}
            </Badge>
            {validation?.candidateGateOpen ? (
              <Badge className="rounded-full bg-emerald-600">Candidate gate open</Badge>
            ) : (
              <Badge className="rounded-full bg-red-600">Candidate gate closed</Badge>
            )}
          </div>

          {validation ? (
            <section className={cn(
              "rounded-xl border p-4",
              validation.status === "failed" ? "border-red-500/30 bg-red-500/10" : "border-border bg-secondary/30",
            )}>
              <h3 className="flex items-center gap-2 font-semibold">
                {validation.status === "failed" ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                {validation.message}
              </h3>
              {validation.status === "failed" ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Graph reconstruction unreliable. Chemistry interpretation intentionally skipped. ARSHLAB will not hallucinate a molecule from this visual graph.
                </p>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  Chemistry engines may use the selected topology. Warnings remain visible below when reconstruction was imperfect.
                </p>
              )}
            </section>
          ) : (
            <p className="text-sm text-muted-foreground">Run a scan to validate the molecular graph before chemistry interpretation.</p>
          )}

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Primitive nodes" value={validation?.metrics.primitiveNodes ?? 0} />
            <Metric label="Primitive edges" value={validation?.metrics.primitiveEdges ?? 0} />
            <Metric label="Accepted edges" value={validation?.metrics.acceptedEdges ?? 0} />
            <Metric label="Rejected edges" value={validation?.metrics.rejectedEdges ?? 0} />
            <Metric label="Weak edges" value={validation?.metrics.weakEdges ?? 0} />
            <Metric label="Recovered edges" value={validation?.metrics.recoveredEdges ?? 0} />
            <Metric label="Safe bridges" value={validation?.metrics.safeBridges ?? 0} />
            <Metric label="Unsafe bridges" value={validation?.metrics.unsafeBridges ?? 0} />
            <Metric label="Accepted cycles" value={validation?.metrics.acceptedCycles ?? 0} />
            <Metric label="Rejected cycles" value={validation?.metrics.rejectedCycles ?? 0} />
            <Metric label="Components" value={validation?.metrics.connectedComponents ?? 0} />
            <Metric label="Topology score" value={`${validation?.metrics.topologyScore ?? 0}%`} />
          </div>

          {graph && analysis ? (
            <section className="rounded-xl border border-border p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 font-semibold">
                  <GitBranch className="h-4 w-4" />
                  Final graph map
                </h3>
                <span className="text-xs text-muted-foreground">Green accepted, red rejected, orange recovered, purple weak</span>
              </div>
              <div className="mt-3 overflow-hidden rounded-lg border border-border bg-slate-950 p-2">
                <svg
                  viewBox={`0 0 ${analysis.width} ${analysis.height}`}
                  role="img"
                  aria-label="Graph validation overlay"
                  className="block max-h-80 w-full"
                >
                  {graph.bonds.map((bond) => {
                    const start = graph.nodes.find((node) => node.id === bond.startNodeId)
                    const end = graph.nodes.find((node) => node.id === bond.endNodeId)
                    if (!start || !end) return null
                    const status = edgeMap.get(bond.id)
                    const stroke = status === "rejected"
                      ? "#ef4444"
                      : status === "recovered"
                        ? "#f97316"
                        : status === "weak"
                          ? "#a855f7"
                          : "#22c55e"
                    return (
                      <g key={bond.id}>
                        <line
                          x1={start.x}
                          y1={start.y}
                          x2={end.x}
                          y2={end.y}
                          stroke={stroke}
                          strokeWidth={Math.max(1.8, bond.bondOrder * 1.25)}
                          strokeDasharray={status === "weak" || status === "recovered" ? "4 3" : undefined}
                        />
                        <text x={(start.x + end.x) / 2} y={(start.y + end.y) / 2 - 2} textAnchor="middle" fill="white" fontSize="5">
                          {bond.id}
                        </text>
                      </g>
                    )
                  })}
                  {graph.nodes.map((node) => (
                    <g key={node.id}>
                      <circle cx={node.x} cy={node.y} r={Math.max(4, analysis.width * 0.016)} fill="#0f766e" stroke="#ccfbf1" strokeWidth="1" />
                      <text x={node.x} y={node.y + 1.8} textAnchor="middle" fill="white" fontSize={Math.max(5, analysis.width * 0.017)} fontWeight="700">
                        {node.inferredElement}
                      </text>
                    </g>
                  ))}
                </svg>
              </div>
            </section>
          ) : null}

          {validation?.sanity.fingerprint ? (
            <section className="rounded-xl border border-border p-4">
              <h3 className="font-semibold">Graph fingerprint</h3>
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Metric label="Nodes" value={validation.sanity.fingerprint.nodes} />
                <Metric label="Edges" value={validation.sanity.fingerprint.edges} />
                <Metric label="Cycles" value={validation.sanity.fingerprint.cycles} />
                <Metric label="Terminal atoms" value={validation.sanity.fingerprint.terminalAtoms} />
                <Metric label="Average degree" value={validation.sanity.fingerprint.averageDegree} />
                <Metric label="Longest path" value={validation.sanity.fingerprint.maximumPathLength} />
                <Metric label="Average bond length" value={`${validation.sanity.fingerprint.averageBondLength}px`} />
                <Metric label="Branches" value={validation.sanity.fingerprint.branches} />
              </div>
              <p className="mt-3 rounded-lg bg-secondary/40 p-3 text-sm text-muted-foreground">
                Candidate topology: <span className="font-semibold text-foreground">{validation.sanity.fingerprint.candidateTopology}</span>
              </p>
            </section>
          ) : null}

          {validation?.topology.variants.length ? (
            <section className="rounded-xl border border-border p-4">
              <h3 className="font-semibold">Topology reconstruction variants</h3>
              <div className="mt-3 grid gap-3 lg:grid-cols-2">
                {validation.topology.variants.map((variant) => (
                  <div key={variant.id} className={cn(
                    "rounded-lg border p-3",
                    variant.id === validation.topology.selectedVariantId ? "border-emerald-500 bg-emerald-500/10" : "border-border bg-secondary/30",
                  )}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{variant.label}</p>
                      <Badge variant={variant.accepted ? "default" : "outline"} className="rounded-full">{variant.topologyScore}%</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Legality {variant.chemicalLegality}% - visual agreement {variant.visualAgreement}% - {variant.graph.bonds.length} bonds
                    </p>
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {variant.reasons.map((reason) => <li key={reason}>{reason}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <div className="grid gap-5 lg:grid-cols-2">
            <ReasonList title="Blocking reasons" tone="error" items={validation?.blockingReasons ?? []} />
            <ReasonList title="Warnings" tone="warning" items={validation?.warningReasons ?? []} />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="min-w-0 rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold">Edge decisions</h3>
              {validation?.edgeValidation.edges.length ? (
                <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-border">
                  <table className="w-full min-w-[620px] text-left text-xs">
                    <thead className="sticky top-0 bg-secondary">
                      <tr><th className="p-2">Bond</th><th className="p-2">Atoms</th><th className="p-2">Status</th><th className="p-2">Length</th><th className="p-2">Confidence</th><th className="p-2">Reason</th></tr>
                    </thead>
                    <tbody>
                      {validation.edgeValidation.edges.map((edge) => (
                        <tr key={edge.bondId} className="border-t border-border">
                          <td className="p-2 font-mono">{edge.bondId}</td>
                          <td className="p-2 font-mono">{edge.startNodeId}-{edge.endNodeId}</td>
                          <td className="p-2 capitalize">{edge.status}</td>
                          <td className="p-2">{edge.length}px</td>
                          <td className="p-2">{edge.confidence}%</td>
                          <td className="p-2 text-muted-foreground">{edge.reasons[0]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <EmptyState text="No edge decisions are available yet." />}
            </section>

            <section className="min-w-0 rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold">Cycle decisions</h3>
              {validation?.cycleValidation.cycles.length ? (
                <div className="mt-3 space-y-2">
                  {validation.cycleValidation.cycles.map((cycle) => (
                    <div key={cycle.ringId} className={cn("rounded-lg border p-3", cycle.status === "rejected" ? "border-red-500/30 bg-red-500/10" : "border-border bg-secondary/30")}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium">{cycle.size}-member {cycle.aromatic ? "aromatic" : cycle.kind} cycle</p>
                        <Badge variant={cycle.status === "accepted" ? "default" : "outline"} className="rounded-full">{cycle.status}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{cycle.reasons.join(" ")}</p>
                    </div>
                  ))}
                </div>
              ) : <EmptyState text="No cycle decisions are available yet." />}
            </section>
          </div>
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

function ReasonList({ title, tone, items }: { title: string; tone: "error" | "warning"; items: string[] }) {
  const Icon = tone === "error" ? AlertTriangle : AlertTriangle
  return (
    <section className={cn(
      "rounded-xl border p-4",
      tone === "error" ? "border-red-500/30 bg-red-500/10" : "border-amber-500/30 bg-amber-500/10",
    )}>
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <Icon className="h-4 w-4" />
        {title}
      </h3>
      {items.length ? (
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          {items.map((item) => <li key={item}>{item}</li>)}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">None.</p>
      )}
    </section>
  )
}

function EmptyState({ text }: { text: string }) {
  return <p className="mt-3 text-sm text-muted-foreground">{text}</p>
}
