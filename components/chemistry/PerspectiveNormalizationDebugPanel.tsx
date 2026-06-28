"use client"

import { useEffect, useMemo, useState } from "react"
import { BadgeCheck, ChevronDown, ImageOff, ScanSearch } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import type { PerspectiveNormalizationResult } from "@/lib/structure-vision/perspective-normalizer"
import { cn } from "@/lib/utils"

export function PerspectiveNormalizationDebugPanel({
  sourceBlob,
  result,
  error,
}: {
  sourceBlob: Blob | null
  result: PerspectiveNormalizationResult | null
  error?: string | null
}) {
  const [open, setOpen] = useState(false)
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [normalizedUrl, setNormalizedUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!sourceBlob || !open) {
      setSourceUrl(null)
      return
    }
    const url = URL.createObjectURL(sourceBlob)
    setSourceUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [sourceBlob, open])

  useEffect(() => {
    const selected = result?.variants.find((variant) => variant.id === result.selectedVariantId)
    if (!selected || !open) {
      setNormalizedUrl(null)
      return
    }
    const url = URL.createObjectURL(selected.blob)
    setNormalizedUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [result, open])

  const selectedCandidate = useMemo(
    () => result?.analysis.candidates.find((candidate) => candidate.id === result.analysis.selectedCandidateId) ?? null,
    [result],
  )

  return (
    <Card className="rounded-2xl border-dashed border-sky-500/30">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 p-5 text-left"
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sky-500/10 text-sky-700 dark:text-sky-300">
            <ScanSearch className="h-4 w-4" />
          </span>
          <span>
            <span className="block font-semibold">Perspective Normalization Debug Panel</span>
            <span className="block text-sm text-muted-foreground">Paper/screen detection, deskewing, glare variants, and downstream crop selection</span>
          </span>
        </span>
        <ChevronDown className={cn("h-5 w-5 shrink-0 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <CardContent className="space-y-5 border-t border-border pt-5">
          {error && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
              Perspective normalization error: {error}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="rounded-full">Browser-local perspective correction</Badge>
            <Badge variant="secondary" className="rounded-full">No AI usage</Badge>
            {result?.analysis.usedFallback ? (
              <Badge variant="outline" className="rounded-full border-amber-500/40 text-amber-700 dark:text-amber-300">Fallback to isolation</Badge>
            ) : result ? (
              <Badge className="rounded-full bg-sky-600">Normalized crop selected</Badge>
            ) : null}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Canvas candidates" value={result?.analysis.candidates.length ?? 0} />
            <Metric label="Perspective confidence" value={`${result?.analysis.confidence ?? 0}%`} />
            <Metric label="Glare mask coverage" value={`${result?.analysis.glareMaskCoverage ?? 0}%`} />
            <Metric label="Structure mask coverage" value={`${result?.analysis.structureMaskCoverage ?? 0}%`} />
          </div>

          <section className="rounded-xl border border-border p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <BadgeCheck className="h-4 w-4" />
              Selected chemistry canvas
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {result?.analysis.explanation ?? "Run a scan to detect a tablet, paper, whiteboard, or screenshot canvas before OCR."}
            </p>
            {selectedCandidate ? (
              <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 lg:grid-cols-3">
                <Detail label="Bright coverage" value={`${Math.round(selectedCandidate.brightCoverage * 100)}%`} />
                <Detail label="Stroke density" value={`${Math.round(selectedCandidate.strokeDensity * 1000) / 10}%`} />
                <Detail label="Rectangularity" value={`${Math.round(selectedCandidate.rectangularity)}%`} />
                <Detail label="Ring geometry" value={`${selectedCandidate.ringGeometryScore}%`} />
                <Detail label="Clutter rejected" value={`${selectedCandidate.clutterRejected}%`} />
                <Detail label="Quadrilateral" value={`${selectedCandidate.quadrilateral.confidence}%`} />
              </div>
            ) : null}
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-xl border border-border p-4">
              <h3 className="font-semibold">Candidate regions</h3>
              {result?.analysis.candidates.length ? (
                <div className="mt-3 space-y-2">
                  {result.analysis.candidates.slice(0, 5).map((candidate) => (
                    <div key={candidate.id} className={cn("rounded-lg border p-3 text-sm", candidate.selected ? "border-sky-500/40 bg-sky-500/10" : "border-border bg-secondary/30")}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold">Region {candidate.id + 1}</span>
                        <Badge variant={candidate.selected ? "default" : "secondary"} className="rounded-full">{candidate.score}%</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{candidate.reasons.join("; ")}</p>
                      {candidate.rejectionReasons.length ? (
                        <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">Rejected cues: {candidate.rejectionReasons.join("; ")}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No perspective candidate regions have been generated yet.</p>
              )}
            </section>

            <section className="rounded-xl border border-border p-4">
              <h3 className="font-semibold">Variant scores</h3>
              {result?.variants.length ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {result.variants.map((variant) => (
                    <div key={variant.id} className={cn("rounded-lg border p-3 text-sm", variant.id === result.selectedVariantId ? "border-sky-500/40 bg-sky-500/10" : "border-border bg-secondary/30")}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium capitalize">{variant.kind.replace("-", " ")}</span>
                        <Badge variant={variant.id === result.selectedVariantId ? "default" : "secondary"} className="rounded-full">{variant.score.score}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        strokes {variant.score.chemicalStrokeDensity}% · bonds {variant.score.bondLikeSegmentDensity}% · ring {variant.score.ringLikeGeometry}%
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No normalized variants were selected; the scanner will use the existing isolation fallback.</p>
              )}
            </section>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="overflow-hidden rounded-xl border border-border p-4">
              <h3 className="font-semibold">Original scene with selected quadrilateral</h3>
              {sourceUrl && result?.analysis.selectedQuadrilateral ? (
                <div className="relative mt-3 overflow-hidden rounded-lg bg-slate-950">
                  <img src={sourceUrl} alt="Original structure scanner scene" className="block w-full opacity-80" />
                  <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${result.analysis.width} ${result.analysis.height}`} preserveAspectRatio="none">
                    {result.analysis.rejectedRegions.map((candidate) => (
                      <rect
                        key={candidate.id}
                        x={candidate.bounds.x}
                        y={candidate.bounds.y}
                        width={candidate.bounds.width}
                        height={candidate.bounds.height}
                        fill="rgba(239,68,68,0.12)"
                        stroke="#ef4444"
                        strokeDasharray="5 4"
                        strokeWidth="2"
                      />
                    ))}
                    <polygon
                      points={[
                        result.analysis.selectedQuadrilateral.topLeft,
                        result.analysis.selectedQuadrilateral.topRight,
                        result.analysis.selectedQuadrilateral.bottomRight,
                        result.analysis.selectedQuadrilateral.bottomLeft,
                      ].map((point) => `${point.x},${point.y}`).join(" ")}
                      fill="rgba(14,165,233,0.16)"
                      stroke="#0ea5e9"
                      strokeWidth="3"
                    />
                  </svg>
                </div>
              ) : (
                <EmptyImage />
              )}
            </section>

            <section className="overflow-hidden rounded-xl border border-border p-4">
              <h3 className="font-semibold">Normalized preview sent downstream</h3>
              {normalizedUrl ? (
                <div className="mt-3 overflow-hidden rounded-lg border border-border bg-white">
                  <img src={normalizedUrl} alt="Perspective-normalized chemistry crop" className="block w-full" />
                </div>
              ) : (
                <EmptyImage />
              )}
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

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/40 p-3">
      <p>{label}</p>
      <p className="mt-1 font-mono text-foreground">{value}</p>
    </div>
  )
}

function EmptyImage() {
  return (
    <div className="mt-3 flex min-h-44 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border text-center text-sm text-muted-foreground">
      <ImageOff className="h-6 w-6" />
      Run a scan to render this preview.
    </div>
  )
}
