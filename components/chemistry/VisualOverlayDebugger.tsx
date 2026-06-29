"use client"

import { useEffect, useRef, useState } from "react"
import { Bug, ChevronDown, Download, ImageOff } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  DEFAULT_VISION_OVERLAYS,
  renderVisionOverlay,
  VISION_OVERLAY_COLORS,
  type VisionOverlayVisibility,
} from "@/lib/structure-vision/overlay-renderer"
import type { PerspectiveNormalizationResult } from "@/lib/structure-vision/perspective-normalizer"
import type { StructureVisionAnalysis } from "@/lib/structure-vision/vision-types"
import type { StructureScanResult } from "@/lib/structure-scanner/scanner-types"
import { cn } from "@/lib/utils"

const TOGGLES: Array<{ id: keyof VisionOverlayVisibility; label: string; color?: string }> = [
  { id: "rawImage", label: "Raw image" },
  { id: "originalShapeSegments", label: "Original shape fragments", color: VISION_OVERLAY_COLORS.shapeOriginal },
  { id: "mergedShapeStrokes", label: "Merged reconstructed strokes", color: VISION_OVERLAY_COLORS.shapeMerged },
  { id: "acceptedShapeEdges", label: "Accepted inferred shape edges", color: VISION_OVERLAY_COLORS.shapeAccepted },
  { id: "shapePolygons", label: "Shape polygon hypotheses", color: VISION_OVERLAY_COLORS.shapePolygon },
  { id: "rejectedShapeBridges", label: "Rejected shape bridges", color: VISION_OVERLAY_COLORS.shapeRejected },
  { id: "predictedShapeVertices", label: "Predicted shape vertices", color: VISION_OVERLAY_COLORS.shapeVertex },
  { id: "lineSegments", label: "Detected line segments", color: VISION_OVERLAY_COLORS.lineSegments },
  { id: "endpoints", label: "Endpoints", color: VISION_OVERLAY_COLORS.endpoints },
  { id: "graphNodes", label: "Merged graph nodes", color: VISION_OVERLAY_COLORS.nodes },
  { id: "graphEdges", label: "Graph edges", color: VISION_OVERLAY_COLORS.edges },
  { id: "cycles", label: "Cycle candidates", color: VISION_OVERLAY_COLORS.cycles },
  { id: "nearRings", label: "Near-ring candidates", color: VISION_OVERLAY_COLORS.cycles },
  { id: "selectedRing", label: "Selected ring candidate", color: VISION_OVERLAY_COLORS.selected },
  { id: "parallelBonds", label: "Parallel bond pairs", color: VISION_OVERLAY_COLORS.parallel },
  { id: "aromaticCues", label: "Aromatic cues", color: VISION_OVERLAY_COLORS.aromatic },
  { id: "functionalGroupCues", label: "Functional-group cues", color: VISION_OVERLAY_COLORS.aromatic },
  { id: "atomLabelCentroids", label: "Atom-label centroids", color: VISION_OVERLAY_COLORS.aromatic },
  { id: "snappedEndpoints", label: "Snapped endpoints", color: VISION_OVERLAY_COLORS.endpoints },
  { id: "bridgedGaps", label: "Bridged gaps", color: VISION_OVERLAY_COLORS.closureBridge },
  { id: "selectedClosureRing", label: "Selected ring polygon", color: VISION_OVERLAY_COLORS.selected },
  { id: "rejectedClosureRings", label: "Rejected ring polygons", color: VISION_OVERLAY_COLORS.rejectedRing },
  { id: "rejectedValidatedBonds", label: "Raw rejected bonds", color: VISION_OVERLAY_COLORS.rejectedBond },
  { id: "acceptedValidatedBonds", label: "Accepted validated bonds", color: VISION_OVERLAY_COLORS.acceptedBond },
  { id: "valenceViolations", label: "Valence violations", color: VISION_OVERLAY_COLORS.valence },
  { id: "bondOrderCorrections", label: "Bond-order corrections", color: VISION_OVERLAY_COLORS.correction },
  { id: "validatedRingCandidate", label: "Final validated ring candidate", color: VISION_OVERLAY_COLORS.validatedRing },
]

export function VisualOverlayDebugger({
  imageBlob,
  analysis,
  result,
  perspectiveResult,
}: {
  imageBlob: Blob | null
  analysis: StructureVisionAnalysis | null
  result: StructureScanResult | null
  perspectiveResult?: PerspectiveNormalizationResult | null
}) {
  const [open, setOpen] = useState(false)
  const [visibility, setVisibility] = useState<VisionOverlayVisibility>(DEFAULT_VISION_OVERLAYS)
  const [renderError, setRenderError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!open || !canvas || !analysis) return
    const context = canvas.getContext("2d")
    if (!context) {
      setRenderError("Canvas rendering is unavailable in this browser.")
      return
    }

    const scale = Math.max(2, Math.min(5, 960 / Math.max(1, analysis.width)))
    canvas.width = Math.round(analysis.width * scale)
    canvas.height = Math.round(analysis.height * scale)

    if (!imageBlob) {
      renderVisionOverlay({ context, analysis, visibility, image: null })
      return
    }

    const imageUrl = URL.createObjectURL(imageBlob)
    const image = new Image()
    image.onload = () => {
      renderVisionOverlay({ context, analysis, visibility, image })
      setRenderError(null)
      URL.revokeObjectURL(imageUrl)
    }
    image.onerror = () => {
      renderVisionOverlay({ context, analysis, visibility, image: null })
      setRenderError("The preview could not be decoded, so the overlay is shown without the raw image.")
      URL.revokeObjectURL(imageUrl)
    }
    image.src = imageUrl

    return () => {
      image.onload = null
      image.onerror = null
      URL.revokeObjectURL(imageUrl)
    }
  }, [analysis, imageBlob, open, visibility])

  const closureCandidates = analysis?.ringClosure.candidates ?? []

  const benzeneVisual = analysis?.candidates.find((candidate) => candidate.compoundId === "benzene")
  const benzeneMatch = result?.matches.find((match) => match.record.id === "benzene")
  const contributionTotal = (category: "ocr" | "manual" | "filename" | "penalty") =>
    benzeneMatch?.contributions
      .filter((contribution) => contribution.category === category)
      .reduce((sum, contribution) => sum + contribution.points, 0) ?? 0
  const ringScore = benzeneVisual?.scoreBreakdown
    .filter((entry) => /ring candidate|fuzzy ring/i.test(entry.label))
    .reduce((sum, entry) => sum + entry.points, 0) ?? 0
  const doubleBondScore = benzeneVisual?.scoreBreakdown
    .filter((entry) => /double-bond/i.test(entry.label))
    .reduce((sum, entry) => sum + entry.points, 0) ?? 0

  function updateVisibility(id: keyof VisionOverlayVisibility, checked: boolean) {
    setVisibility((current) => ({ ...current, [id]: checked }))
  }

  function exportOverlay() {
    const canvas = canvasRef.current
    if (!canvas || !analysis) return
    canvas.toBlob((blob) => {
      if (!blob) {
        setRenderError("The browser could not export this overlay.")
        return
      }
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = "arshlab-structure-overlay.png"
      anchor.click()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    }, "image/png")
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="rounded-2xl border-dashed border-cyan-500/30">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 p-5 text-left">
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
              <Bug className="h-4 w-4" />
            </span>
            <span>
              <span className="flex flex-wrap items-center gap-2 font-semibold">
                Visual Overlay Debugger
                <Badge variant="outline" className="rounded-full border-cyan-500/30">Developer Vision Tools</Badge>
              </span>
              <span className="block text-sm text-muted-foreground">Inspect perspective normalization, image-to-graph conversion, and candidate selection</span>
            </span>
          </span>
          <ChevronDown className={cn("h-5 w-5 shrink-0 transition-transform", open && "rotate-180")} />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-6 border-t border-border pt-5">
            {!analysis ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-10 text-center">
                <ImageOff className="h-7 w-7 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Run a scan to build the overlay</p>
                  <p className="mt-1 text-sm text-muted-foreground">The image and all overlay geometry remain in this browser.</p>
                </div>
              </div>
            ) : (
              <>
                {perspectiveResult && (
                  <section className="rounded-xl border border-cyan-500/25 bg-cyan-500/5 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="font-semibold">Perspective-normalization layers</h3>
                        <p className="text-sm text-muted-foreground">
                          Source-scene overlays render in the Perspective Normalization Debug Panel above before this graph canvas is built.
                        </p>
                      </div>
                      <Badge variant="outline" className="rounded-full">
                        {perspectiveResult.analysis.usedFallback ? "Fallback isolation" : `${perspectiveResult.analysis.confidence}% canvas confidence`}
                      </Badge>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <PerspectiveLayerPill
                        color="#22d3ee"
                        label="Detected screen/paper quadrilateral"
                        value={perspectiveResult.analysis.selectedQuadrilateral ? "selected" : "not found"}
                      />
                      <PerspectiveLayerPill
                        color="#f97316"
                        label="Selected normalized crop"
                        value={perspectiveResult.selectedVariantId ? perspectiveResult.selectedVariantId.replace("perspective-", "") : "fallback image"}
                      />
                      <PerspectiveLayerPill
                        color="#f59e0b"
                        label="Rejected rectangles"
                        value={`${perspectiveResult.analysis.rejectedRegions.length}`}
                      />
                      <PerspectiveLayerPill
                        color="#fef3c7"
                        label="Glare/highlight mask"
                        value={`${perspectiveResult.analysis.glareMaskCoverage}%`}
                      />
                      <PerspectiveLayerPill
                        color="#10b981"
                        label="Structure-region mask"
                        value={`${perspectiveResult.analysis.structureMaskCoverage}%`}
                      />
                    </div>
                  </section>
                )}

                {analysis.globalGraphOptimization.selectedHypothesis && (
                  <section className="rounded-xl border border-indigo-500/25 bg-indigo-500/5 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="font-semibold">Optimizer overlay layers</h3>
                        <p className="text-sm text-muted-foreground">
                          Candidate graph comparisons are summarized here; full move and score details render in the Global Graph Optimizer panel.
                        </p>
                      </div>
                      <Badge variant="outline" className="rounded-full">
                        {analysis.globalGraphOptimization.finalOptimizationScore}% optimized
                      </Badge>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <PerspectiveLayerPill color="#818cf8" label="Candidate graph #1" value={analysis.globalGraphOptimization.selectedHypothesis.label} />
                      <PerspectiveLayerPill color="#a78bfa" label="Candidate graph #2" value={analysis.globalGraphOptimization.runnerUpHypotheses[0]?.label ?? "none"} />
                      <PerspectiveLayerPill color="#c4b5fd" label="Candidate graph #3" value={analysis.globalGraphOptimization.runnerUpHypotheses[1]?.label ?? "none"} />
                      <PerspectiveLayerPill color="#10b981" label="Final optimized graph" value={`${analysis.globalGraphOptimization.selectedHypothesis.graph.bonds.length} bonds`} />
                      <PerspectiveLayerPill color="#f97316" label="Removed/added/order moves" value={`${analysis.globalGraphOptimization.acceptedMoves.length}`} />
                      <PerspectiveLayerPill color="#facc15" label="Ring template overlay" value={`${analysis.globalGraphOptimization.selectedHypothesis.ringTemplateFits.length}`} />
                    </div>
                  </section>
                )}

                {analysis.globalShapeReconstruction && (
                  <section className="rounded-xl border border-purple-500/25 bg-purple-500/5 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="font-semibold">Shape reconstruction layers</h3>
                        <p className="text-sm text-muted-foreground">
                          Original fragments are repaired into merged strokes and polygon-supported inferred edges before graph generation.
                        </p>
                      </div>
                      <Badge variant="outline" className="rounded-full">
                        {analysis.globalShapeReconstruction.shapeConfidence}% shape
                      </Badge>
                    </div>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <PerspectiveLayerPill color={VISION_OVERLAY_COLORS.shapeOriginal} label="Original fragments" value={`${analysis.globalShapeReconstruction.originalSegments.length}`} />
                      <PerspectiveLayerPill color={VISION_OVERLAY_COLORS.shapeMerged} label="Merged strokes" value={`${analysis.globalShapeReconstruction.mergedStrokes.length}`} />
                      <PerspectiveLayerPill color={VISION_OVERLAY_COLORS.shapeAccepted} label="Accepted inferred edges" value={`${analysis.globalShapeReconstruction.acceptedPolygon?.edges.length ?? 0}`} />
                      <PerspectiveLayerPill color={VISION_OVERLAY_COLORS.shapePolygon} label="Polygon hypotheses" value={`${analysis.globalShapeReconstruction.polygonHypotheses.length}`} />
                      <PerspectiveLayerPill color={VISION_OVERLAY_COLORS.shapeRejected} label="Rejected bridges" value={`${analysis.globalShapeReconstruction.bridgedGaps.filter((bridge) => !bridge.accepted).length}`} />
                      <PerspectiveLayerPill color={VISION_OVERLAY_COLORS.shapeVertex} label="Predicted vertices" value={`${analysis.globalShapeReconstruction.predictedCorners.length}`} />
                    </div>
                  </section>
                )}

                <section>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold">Overlay layers</h3>
                      <p className="text-sm text-muted-foreground">Enable several layers together to inspect graph construction.</p>
                    </div>
                    <Button type="button" variant="outline" onClick={exportOverlay}>
                      <Download className="h-4 w-4" />
                      Export Overlay
                    </Button>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {TOGGLES.map((toggle) => (
                      <label key={toggle.id} className="flex min-w-0 items-center gap-3 rounded-lg border border-border p-3 text-sm">
                        <Checkbox
                          checked={visibility[toggle.id]}
                          onCheckedChange={(checked) => updateVisibility(toggle.id, checked === true)}
                        />
                        {toggle.color && <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: toggle.color }} />}
                        <span>{toggle.label}</span>
                      </label>
                    ))}
                  </div>
                </section>

                <section className="overflow-hidden rounded-xl border border-border bg-slate-950">
                  <div className="overflow-auto">
                    <canvas
                      ref={canvasRef}
                      aria-label="Structure vision overlay showing lines, graph nodes, cycles, and candidate evidence"
                      className="block h-auto min-w-[640px] max-w-none sm:min-w-full"
                      style={{ width: "100%", aspectRatio: `${analysis.width} / ${analysis.height}` }}
                    />
                  </div>
                </section>

                {renderError && <p className="text-sm text-amber-700 dark:text-amber-300">{renderError}</p>}

                <section className="rounded-xl border border-border p-4">
                  <h3 className="font-semibold">Why this ring was selected</h3>
                  {closureCandidates.length ? (
                    <div className="mt-3 grid gap-3 lg:grid-cols-3">
                      {closureCandidates.slice(0, 3).map((candidate, index) => (
                        <div key={`${candidate.source}-${candidate.nodeIds.join("-")}-${index}`} className={cn(
                          "rounded-lg border p-3",
                          candidate.selected ? "border-orange-500/40 bg-orange-500/10" : "border-border bg-secondary/30",
                        )}>
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-semibold">Candidate {String.fromCharCode(65 + index)}</p>
                            {candidate.selected && <Badge className="rounded-full bg-orange-600">Selected</Badge>}
                          </div>
                          <p className="mt-2 text-sm">{candidate.memberCount}-member {candidate.recovered ? "near-ring" : "ring"}</p>
                          <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
                            <DiagnosticRow label="Closure" value={`${candidate.closureConfidence}%`} />
                            <DiagnosticRow label="Regularity" value={`${candidate.regularity}%`} />
                            <DiagnosticRow label="Confidence" value={`${candidate.confidence}%`} />
                            <DiagnosticRow label="Line coverage" value={`${candidate.lineCoverage}%`} />
                            <DiagnosticRow label="Aromatic support" value={`${candidate.aromaticSupport}%`} />
                          </dl>
                          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{candidate.selectedReason}</p>
                          {candidate.rejectedReasons.length ? (
                            <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">{candidate.rejectedReasons.join(" ")}</p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">No 5-8 member closure candidate survived geometric validation.</p>
                  )}
                  {closureCandidates[0] && (
                    <p className="mt-3 text-sm text-muted-foreground">
                      The selected candidate wins by combining closure quality, polygon regularity, bond-line coverage, bridge confidence, and aromatic/double-bond support after open-chain and background safeguards.
                    </p>
                  )}
                </section>

                <section className="rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold">Benzene Classification Breakdown</h3>
                    <Badge variant="outline" className="rounded-full">Local deterministic score</Badge>
                  </div>
                  {benzeneVisual ? (
                    <div className="mt-4 space-y-2 font-mono text-sm">
                      <DiagnosticRow label="Ring geometry" value={formatPoints(ringScore)} />
                      <DiagnosticRow label="Double-bond support" value={formatPoints(doubleBondScore)} />
                      <DiagnosticRow label="Aromatic cue score" value={`${analysis.graph.aromaticCueScore}%`} />
                      <DiagnosticRow label="OCR support" value={formatPoints(contributionTotal("ocr"))} />
                      <DiagnosticRow label="Manual hint support" value={formatPoints(contributionTotal("manual"))} />
                      <DiagnosticRow label="Filename support" value={formatPoints(contributionTotal("filename"))} />
                      <DiagnosticRow label="Penalty values" value={formatPoints(contributionTotal("penalty"))} />
                      <div className="mt-3 border-t border-border pt-3">
                        <DiagnosticRow label="Final visual score" value={`${benzeneVisual.score}`} strong />
                        <DiagnosticRow label="Final database confidence" value={benzeneMatch ? `${benzeneMatch.confidence}%` : "Not ranked"} strong />
                      </div>
                    </div>
                  ) : (
                    <p className="mt-2 text-sm text-muted-foreground">No benzene candidate was generated for this drawing.</p>
                  )}
                </section>

                <p className="text-xs text-muted-foreground">
                  Development overlay only. Rendering and PNG export happen locally; ARSHLAB does not upload or retain the image.
                </p>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

function DiagnosticRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-3", strong && "font-semibold text-foreground")}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  )
}

function PerspectiveLayerPill({ color, label, value }: { color: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/70 p-3 text-sm">
      <span className="flex min-w-0 items-center gap-2">
        <span className="h-3 w-3 shrink-0 rounded-sm" style={{ backgroundColor: color }} />
        <span className="truncate">{label}</span>
      </span>
      <span className="shrink-0 text-xs font-medium text-muted-foreground">{value}</span>
    </div>
  )
}

function formatPoints(value: number): string {
  return `${value > 0 ? "+" : ""}${value}`
}
