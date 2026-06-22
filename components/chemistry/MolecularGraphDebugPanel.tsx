"use client"

import { useMemo, useState } from "react"
import { Atom, ChevronDown, FlaskConical, GitFork, Hexagon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { StructureVisionAnalysis } from "@/lib/structure-vision/vision-types"
import { rankMolecularGraphCandidates } from "@/lib/vision/molecular-graph"
import { cn } from "@/lib/utils"

export function MolecularGraphDebugPanel({ analysis }: { analysis: StructureVisionAnalysis | null }) {
  const [open, setOpen] = useState(false)
  const graph = analysis?.molecularGraph ?? null
  const candidates = useMemo(() => graph ? rankMolecularGraphCandidates(graph).slice(0, 3) : [], [graph])

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="rounded-2xl border-dashed border-teal-500/30">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 p-5 text-left">
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300">
              <Atom className="h-4 w-4" />
            </span>
            <span>
              <span className="block font-semibold">Molecular Graph Debug Panel</span>
              <span className="block text-sm text-muted-foreground">Reconstructed atoms, bond orders, rings, formula, and graph similarity</span>
            </span>
          </span>
          <ChevronDown className={cn("h-5 w-5 shrink-0 transition-transform", open && "rotate-180")} />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-5 border-t border-border pt-5">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="rounded-full">Browser-local reconstruction</Badge>
              <Badge variant="secondary" className="rounded-full">No AI usage</Badge>
              {graph?.atomCentered && <Badge variant="outline" className="rounded-full">Atom-centered graph</Badge>}
              {graph?.aromatic && <Badge className="rounded-full">Aromatic ring reconstructed</Badge>}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Detected atom labels" value={analysis?.atomLabels.length ?? 0} />
              <Metric label="Snapped bonds" value={graph?.atomCentered ? graph.bonds.length : 0} />
              <Metric label="Reconstructed cycles" value={graph?.rings.length ?? 0} />
              <Metric label="Aromatic candidates" value={graph?.aromaticRingIds.length ?? 0} />
              <Metric label="Estimated atoms" value={graph?.estimates.atoms ?? 0} />
              <Metric label="Estimated carbons" value={graph?.estimates.carbons ?? 0} />
              <Metric label="Estimated bonds" value={graph?.estimates.bonds ?? 0} />
              <Metric label="Estimated rings" value={graph?.estimates.rings ?? 0} />
              <Metric label="Single bonds" value={graph?.estimates.singleBonds ?? 0} />
              <Metric label="Double bonds" value={graph?.estimates.doubleBonds ?? 0} />
              <Metric label="Triple bonds" value={graph?.estimates.tripleBonds ?? 0} />
              <Metric label="Graph confidence" value={`${graph?.estimates.confidence ?? 0}%`} />
              <Metric label="Endpoint snap radius" value={graph?.atomCentered ? `${graph.snapRadius}px` : "Fallback"} />
            </div>

            <section className="rounded-xl border border-border p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <FlaskConical className="h-4 w-4" />
                Estimated molecular summary
              </h3>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <span className="text-sm text-muted-foreground">Estimated formula</span>
                <code className="rounded-lg bg-secondary px-3 py-1.5 text-base font-semibold">
                  {graph?.estimates.estimatedFormula ?? "Unavailable"}
                </code>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Unlabelled line-angle vertices are treated as carbon. Heteroatoms are inferred only when local OCR or functional-group evidence supports them.
              </p>
            </section>

            {analysis && graph?.atomCentered && graph.nodes.length > 0 && (
              <section className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">Atom-centered graph map</h3>
                  <span className="text-xs text-muted-foreground">Centroids, snapped bonds, and bridged glyph gaps</span>
                </div>
                <div className="mt-3 overflow-hidden rounded-lg border border-border bg-slate-950 p-2">
                  <svg
                    viewBox={`0 0 ${analysis.width} ${analysis.height}`}
                    role="img"
                    aria-label="Atom-centered molecular graph reconstruction"
                    className="block max-h-80 w-full"
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
                          stroke={bond.gapBridged ? "#f59e0b" : bond.bondOrder > 1 ? "#a855f7" : "#38bdf8"}
                          strokeWidth={Math.max(1.5, bond.bondOrder * 1.25)}
                          strokeDasharray={bond.gapBridged ? "4 3" : undefined}
                        />
                      )
                    })}
                    {graph.nodes.map((node) => (
                      <g key={node.id}>
                        <circle cx={node.x} cy={node.y} r={Math.max(4, analysis.width * 0.018)} fill="#14b8a6" stroke="#ccfbf1" strokeWidth="1" />
                        <text x={node.x} y={node.y + 1.8} textAnchor="middle" fill="white" fontSize={Math.max(5, analysis.width * 0.018)} fontWeight="700">
                          {node.inferredElement}
                        </text>
                      </g>
                    ))}
                  </svg>
                </div>
              </section>
            )}

            {analysis?.sceneVariants?.length ? (
              <section className="rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-semibold">Scene variant graph selection</h3>
                  <Badge variant="outline" className="rounded-full">Strongest graph wins</Badge>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {analysis.sceneVariants.map((variant) => (
                    <div key={variant.id} className={cn("rounded-lg border p-3", variant.selected ? "border-teal-500 bg-teal-500/10" : "border-border bg-secondary/30")}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-medium capitalize">{variant.kind.replaceAll("-", " ")}</p>
                        <Badge variant={variant.selected ? "default" : "secondary"} className="rounded-full">{variant.score}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">Region {variant.candidateId + 1} - graph {variant.graphConfidence}% - chemistry {variant.chemistryConfidence}%</p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            <div className="grid gap-5 lg:grid-cols-2">
              <section className="min-w-0 rounded-xl border border-border p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <GitFork className="h-4 w-4" />
                  Atom centroids and reconstructed nodes
                </h3>
                {graph?.nodes.length ? (
                  <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-border">
                    <table className="w-full min-w-[620px] text-left text-xs">
                      <thead className="sticky top-0 bg-secondary">
                        <tr><th className="p-2">Node</th><th className="p-2">Element</th><th className="p-2">Source</th><th className="p-2">Degree</th><th className="p-2">Centroid</th><th className="p-2">Snapped</th><th className="p-2">Confidence</th></tr>
                      </thead>
                      <tbody>
                        {graph.nodes.map((node) => (
                          <tr key={node.id} className="border-t border-border">
                            <td className="p-2 font-mono">{node.id}</td>
                            <td className="p-2 font-semibold">{node.inferredElement}</td>
                            <td className="p-2">{node.source === "atom-label" ? "Label" : "Stroke"}</td>
                            <td className="p-2">{node.degree}</td>
                            <td className="p-2 font-mono">({node.x.toFixed(1)}, {node.y.toFixed(1)})</td>
                            <td className="p-2">{node.snappedSegmentIndexes.length}</td>
                            <td className="p-2">{node.confidence}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <EmptyState text="No molecular nodes reconstructed yet." />}
              </section>

              <section className="min-w-0 rounded-xl border border-border p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <GitFork className="h-4 w-4" />
                  Reconstructed bonds
                </h3>
                {graph?.bonds.length ? (
                  <div className="mt-3 max-h-64 overflow-auto rounded-lg border border-border">
                    <table className="w-full min-w-[520px] text-left text-xs">
                      <thead className="sticky top-0 bg-secondary">
                        <tr><th className="p-2">Bond</th><th className="p-2">Atoms</th><th className="p-2">Order</th><th className="p-2">Parallel pairs</th><th className="p-2">Gap bridge</th><th className="p-2">Confidence</th></tr>
                      </thead>
                      <tbody>
                        {graph.bonds.map((bond) => (
                          <tr key={bond.id} className="border-t border-border">
                            <td className="p-2 font-mono">{bond.id}</td>
                            <td className="p-2 font-mono">{bond.startNodeId}-{bond.endNodeId}</td>
                            <td className="p-2 font-semibold">{bond.bondOrder}</td>
                            <td className="p-2">{bond.parallelPairCount}</td>
                            <td className="p-2">{bond.gapBridged ? "Yes" : "No"}</td>
                            <td className="p-2">{bond.confidence}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <EmptyState text="No molecular bonds reconstructed yet." />}
              </section>
            </div>

            <section className="rounded-xl border border-border p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Hexagon className="h-4 w-4" />
                Ring reconstruction
              </h3>
              {graph?.rings.length ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {graph.rings.map((ring) => (
                    <div key={ring.id} className="rounded-lg bg-secondary/40 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold">{ring.kind}</p>
                        <Badge variant="outline" className="rounded-full">{ring.confidence}%</Badge>
                      </div>
                      <p className="mt-2 text-xs text-muted-foreground">{ring.size} members - {ring.closed ? "closed cycle" : "inferred near-ring"}</p>
                      <p className="mt-1 font-mono text-xs text-muted-foreground">Nodes {ring.nodeIds.join(" - ")}</p>
                    </div>
                  ))}
                </div>
              ) : <EmptyState text="No 3-8 member molecular ring reconstructed." />}
            </section>

            <section className="rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold">Graph similarity candidates</h3>
              {candidates.length ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {candidates.map((candidate) => (
                    <div key={candidate.compoundId} className="rounded-lg bg-secondary/40 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold capitalize">{candidate.compoundId.replaceAll("-", " ")}</p>
                        <Badge variant="secondary" className="rounded-full">{candidate.score}/62</Badge>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{candidate.reasons.join("; ")}</p>
                    </div>
                  ))}
                </div>
              ) : <EmptyState text="The graph is not complete enough for a local similarity candidate." />}
            </section>

            {graph?.warnings.length ? (
              <ul className="space-y-1 text-xs text-amber-700 dark:text-amber-300">
                {graph.warnings.map((warning) => <li key={warning}>{warning}</li>)}
              </ul>
            ) : null}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
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

function EmptyState({ text }: { text: string }) {
  return <p className="mt-3 text-sm text-muted-foreground">{text}</p>
}
