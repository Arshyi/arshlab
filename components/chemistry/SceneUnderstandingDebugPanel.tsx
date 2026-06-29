"use client"

import { useEffect, useState } from "react"
import { ChevronDown, Network, ScanLine } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { SceneGraphNode, SceneRegionType, SceneUnderstandingResult } from "@/lib/structure-vision/scene-graph"
import { cn } from "@/lib/utils"

const REGION_COLORS: Record<SceneRegionType, string> = {
  molecule: "#22c55e",
  "multiple-molecule-region": "#16a34a",
  "reaction-arrow": "#f97316",
  "curved-mechanism-arrow": "#fb923c",
  "reaction-conditions": "#a855f7",
  "chemical-text": "#3b82f6",
  "atom-labels": "#60a5fa",
  charges: "#38bdf8",
  "page-border": "#94a3b8",
  "tablet-border": "#64748b",
  "phone-border": "#475569",
  hand: "#ef4444",
  finger: "#f87171",
  reflection: "#facc15",
  shadow: "#78716c",
  watermark: "#a3a3a3",
  noise: "#dc2626",
  background: "#6b7280",
}

function useObjectUrl(blob: Blob | null): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!blob) {
      setUrl(null)
      return
    }
    const next = URL.createObjectURL(blob)
    setUrl(next)
    return () => URL.revokeObjectURL(next)
  }, [blob])
  return url
}

export function SceneUnderstandingDebugPanel({
  sourceBlob,
  result,
  error,
}: {
  sourceBlob: Blob | null
  result: SceneUnderstandingResult | null
  error?: string | null
}) {
  const [open, setOpen] = useState(false)
  const sourceUrl = useObjectUrl(sourceBlob)
  const selectedCropUrl = useObjectUrl(result?.selectedMoleculeBlob ?? null)
  const analysis = result?.analysis ?? null
  const nodes = analysis?.sceneGraph.nodes ?? []

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="rounded-2xl border-dashed border-lime-500/30">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 p-5 text-left">
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-lime-500/10 text-lime-700 dark:text-lime-300">
              <Network className="h-4 w-4" />
            </span>
            <span>
              <span className="block font-semibold">Scene Understanding Debug Panel</span>
              <span className="block text-sm text-muted-foreground">Semantic regions, molecule segmentation, arrows, text, borders, reflections, and suppressed clutter</span>
            </span>
          </span>
          <ChevronDown className={cn("h-5 w-5 shrink-0 transition-transform", open && "rotate-180")} />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-5 border-t border-border pt-5">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="rounded-full">Scene first</Badge>
              <Badge variant="secondary" className="rounded-full">No AI usage</Badge>
              {result?.usedSceneCrop && <Badge className="rounded-full">Molecule crop selected</Badge>}
              {analysis?.sceneGraph.reactions.length ? <Badge variant="outline" className="rounded-full">Reaction layout detected</Badge> : null}
            </div>

            {error && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
                Scene understanding error: {error} The scanner will use the previous full-image fallback.
              </div>
            )}

            {!analysis ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-10 text-center">
                <ScanLine className="h-7 w-7 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Run a scan to parse the scene</p>
                  <p className="mt-1 text-sm text-muted-foreground">Molecule regions, arrows, text, and rejected clutter will appear here.</p>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm leading-relaxed text-muted-foreground">{analysis.explanation}</p>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                  <Metric label="Scene Understanding" value={`${analysis.confidence.sceneUnderstanding}%`} />
                  <Metric label="Segmentation" value={`${analysis.confidence.segmentation}%`} />
                  <Metric label="Graph" value={`${analysis.confidence.graph}%`} />
                  <Metric label="Chemistry" value={`${analysis.confidence.chemistry}%`} />
                  <Metric label="OCR" value={`${analysis.confidence.ocr}%`} />
                  <Metric label="Overall" value={`${analysis.confidence.overall}%`} />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <Metric label="Molecules" value={analysis.moleculeCount} />
                  <Metric label="Arrows" value={analysis.arrowCount} />
                  <Metric label="Text regions" value={analysis.textRegionCount} />
                  <Metric label="Suppressed" value={analysis.suppressedRegionCount} />
                  <Metric label="Borders" value={analysis.borderSuppressionCount} />
                </div>

                <section className="grid gap-5 lg:grid-cols-2">
                  <div className="rounded-xl border border-border p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-semibold">Semantic scene overlay</h3>
                      <span className="text-xs text-muted-foreground">Green molecules, blue text, orange arrows, purple conditions, yellow reflections, red rejected noise</span>
                    </div>
                    <div className="relative mt-3 overflow-hidden rounded-lg border border-border bg-white">
                      {sourceUrl ? (
                        <img src={sourceUrl} alt="Scene understanding source" className="block h-auto w-full" />
                      ) : (
                        <div className="p-8 text-center text-sm text-muted-foreground">Scene source unavailable.</div>
                      )}
                      {nodes.slice(0, 24).map((node) => (
                        <NodeBox key={node.id} node={node} width={analysis.width} height={analysis.height} />
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border p-4">
                    <h3 className="font-semibold">Selected molecule crop</h3>
                    <p className="mt-1 text-xs text-muted-foreground">This crop feeds perspective normalization, isolation, OCR, graph reconstruction, consensus solving, and evidence fusion.</p>
                    <div className="mt-3 overflow-hidden rounded-lg border border-border bg-white">
                      {selectedCropUrl ? (
                        <img src={selectedCropUrl} alt="Selected molecule crop" className="block h-auto max-h-80 w-full object-contain" />
                      ) : (
                        <div className="p-8 text-center text-sm text-muted-foreground">No molecule crop was selected; fallback pipeline remains active.</div>
                      )}
                    </div>
                  </div>
                </section>

                <section className="grid gap-4 lg:grid-cols-2">
                  <div className="rounded-xl border border-border p-4">
                    <h3 className="font-semibold">Detected regions</h3>
                    <div className="mt-3 space-y-2">
                      {nodes.slice(0, 10).map((node) => (
                        <RegionRow key={node.id} node={node} />
                      ))}
                    </div>
                  </div>

                  <div className="rounded-xl border border-border p-4">
                    <h3 className="font-semibold">Scene graph</h3>
                    {analysis.sceneGraph.reactions.length ? (
                      <div className="mt-3 space-y-2">
                        {analysis.sceneGraph.reactions.map((reaction) => (
                          <div key={reaction.id} className="rounded-lg bg-secondary/40 p-3 text-sm">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-medium">{reaction.id}</span>
                              <Badge variant="outline" className="rounded-full">{reaction.confidence}%</Badge>
                            </div>
                            <p className="mt-1 text-xs text-muted-foreground">{reaction.explanation}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">No complete reaction layout was detected. Single-molecule scanning remains available.</p>
                    )}
                    <div className="mt-4 grid gap-2 text-sm">
                      <MetricRow label="Scene edges" value={`${analysis.sceneGraph.edges.length}`} />
                      <MetricRow label="Reflection mask" value={`${analysis.reflectionMaskCoverage}%`} />
                      <MetricRow label="Human mask" value={`${analysis.humanMaskCoverage}%`} />
                    </div>
                  </div>
                </section>

                {analysis.warnings.length ? (
                  <section className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                    <h3 className="font-semibold text-amber-900 dark:text-amber-100">Scene warnings</h3>
                    <ul className="mt-2 space-y-1 text-sm text-amber-900 dark:text-amber-100">
                      {analysis.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                    </ul>
                  </section>
                ) : null}
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

function NodeBox({ node, width, height }: { node: SceneGraphNode; width: number; height: number }) {
  const color = REGION_COLORS[node.type]
  return (
    <div
      className="pointer-events-none absolute border-2"
      style={{
        borderColor: color,
        left: `${node.bounds.x / width * 100}%`,
        top: `${node.bounds.y / height * 100}%`,
        width: `${node.bounds.width / width * 100}%`,
        height: `${node.bounds.height / height * 100}%`,
        boxShadow: node.selected ? `0 0 0 2px ${color}66` : undefined,
      }}
      title={`${node.label}: ${node.confidence}%`}
    >
      <span className="absolute left-0 top-0 px-1 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: color }}>
        {node.selected ? "Selected " : ""}{node.label} {node.confidence}%
      </span>
    </div>
  )
}

function RegionRow({ node }: { node: SceneGraphNode }) {
  const color = REGION_COLORS[node.type]
  return (
    <div className="rounded-lg bg-secondary/40 p-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 font-medium">
          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
          {node.label}
        </span>
        <Badge variant={node.selected ? "default" : "outline"} className="rounded-full">{node.confidence}%</Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {node.evidence[0] ?? node.rejectionReasons[0] ?? "Deterministic scene classification"}
      </p>
    </div>
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
    <div className="flex items-center justify-between gap-3 rounded-lg bg-secondary/40 p-2">
      <span>{label}</span>
      <span className="font-mono font-semibold">{value}</span>
    </div>
  )
}
