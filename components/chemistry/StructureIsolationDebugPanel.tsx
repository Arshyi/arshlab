"use client"

import { useEffect, useState } from "react"
import { BoxSelect, ChevronDown, ImageOff } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { StructureIsolationResult } from "@/lib/structure-vision/isolation-types"
import { cn } from "@/lib/utils"

function useObjectUrl(blob: Blob | null): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!blob) {
      setUrl(null)
      return
    }
    const nextUrl = URL.createObjectURL(blob)
    setUrl(nextUrl)
    return () => URL.revokeObjectURL(nextUrl)
  }, [blob])
  return url
}

export function StructureIsolationDebugPanel({
  sourceBlob,
  result,
  error,
}: {
  sourceBlob: Blob | null
  result: StructureIsolationResult | null
  error?: string | null
}) {
  const [open, setOpen] = useState(false)
  const sourceUrl = useObjectUrl(sourceBlob)
  const cropUrl = useObjectUrl(result?.isolatedBlob ?? null)
  const analysis = result?.analysis ?? null

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="rounded-2xl border-dashed border-orange-500/30">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 p-5 text-left">
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-orange-500/10 text-orange-700 dark:text-orange-300">
              <BoxSelect className="h-4 w-4" />
            </span>
            <span>
              <span className="block font-semibold">Structure Isolation Debug Panel</span>
              <span className="block text-sm text-muted-foreground">Original frame, candidate regions, selected drawing, and final scanner crop</span>
            </span>
          </span>
          <ChevronDown className={cn("h-5 w-5 shrink-0 transition-transform", open && "rotate-180")} />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-5 border-t border-border pt-5">
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="rounded-full">Browser-local preprocessing</Badge>
              <Badge variant="secondary" className="rounded-full">No image upload</Badge>
              {analysis && (
                <Badge className="rounded-full">
                  {analysis.usedFullImage ? "Full preview retained" : "Drawing isolated"}
                </Badge>
              )}
            </div>

            {error && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
                Isolation error: {error} The full preview remains available as a safe fallback.
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-3">
              <Metric label="drawingCoverage" value={analysis ? `${analysis.drawingCoverage}%` : "Not run"} />
              <Metric label="chemistryPixelDensity" value={analysis ? `${analysis.chemistryPixelDensity}%` : "Not run"} />
              <Metric label="isolationConfidence" value={analysis ? `${analysis.isolationConfidence}%` : "Not run"} />
            </div>

            {!analysis ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-10 text-center">
                <ImageOff className="h-7 w-7 text-muted-foreground" />
                <div>
                  <p className="font-semibold">Run a scan to isolate the drawing</p>
                  <p className="mt-1 text-sm text-muted-foreground">Candidate boxes and the selected crop will appear here.</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-5 lg:grid-cols-2">
                <section className="min-w-0 rounded-xl border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold">Original preprocessing frame</h3>
                    <span className="text-xs text-muted-foreground">Red = candidate, orange = selected crop</span>
                  </div>
                  <div className="relative mt-3 overflow-hidden rounded-lg border border-border bg-white">
                    {sourceUrl ? (
                      <img src={sourceUrl} alt="Original structure preprocessing frame" className="block h-auto w-full" />
                    ) : (
                      <div className="p-8 text-center text-sm text-muted-foreground">Original frame unavailable.</div>
                    )}
                    {analysis.candidates.slice(0, 8).map((candidate) => (
                      <div
                        key={candidate.id}
                        className={cn("pointer-events-none absolute border-2", candidate.selected ? "border-orange-500" : "border-red-500/80")}
                        style={{
                          left: `${candidate.bounds.x / analysis.width * 100}%`,
                          top: `${candidate.bounds.y / analysis.height * 100}%`,
                          width: `${candidate.bounds.width / analysis.width * 100}%`,
                          height: `${candidate.bounds.height / analysis.height * 100}%`,
                        }}
                        title={`Candidate ${candidate.id + 1}: ${candidate.score}%`}
                      >
                        <span className={cn("absolute left-0 top-0 px-1 py-0.5 text-[10px] font-semibold text-white", candidate.selected ? "bg-orange-500" : "bg-red-500")}>
                          {candidate.selected ? "Selected" : `C${candidate.id + 1}`} {candidate.score}%
                        </span>
                      </div>
                    ))}
                    {!analysis.usedFullImage && (
                      <div
                        className="pointer-events-none absolute border-2 border-dashed border-orange-300"
                        style={{
                          left: `${analysis.cropBounds.x / analysis.width * 100}%`,
                          top: `${analysis.cropBounds.y / analysis.height * 100}%`,
                          width: `${analysis.cropBounds.width / analysis.width * 100}%`,
                          height: `${analysis.cropBounds.height / analysis.height * 100}%`,
                        }}
                      />
                    )}
                  </div>
                </section>

                <section className="min-w-0 rounded-xl border border-border p-4">
                  <h3 className="font-semibold">Final crop sent downstream</h3>
                  <p className="mt-1 text-xs text-muted-foreground">This exact crop feeds OCR, vision, graph reconstruction, matching, and overlay export.</p>
                  <div className="mt-3 overflow-hidden rounded-lg border border-border bg-white">
                    {cropUrl ? (
                      <img src={cropUrl} alt="Isolated chemistry drawing crop" className="block h-auto max-h-80 w-full object-contain" />
                    ) : (
                      <div className="p-8 text-center text-sm text-muted-foreground">Final crop unavailable.</div>
                    )}
                  </div>
                </section>
              </div>
            )}

            {analysis && (
              <div className="grid gap-4 lg:grid-cols-2">
                <section className="rounded-xl border border-border p-4 text-sm text-muted-foreground">
                  <h3 className="font-semibold text-foreground">Isolation details</h3>
                  <dl className="mt-3 grid grid-cols-2 gap-2">
                    <dt>Connected components</dt><dd className="text-right font-mono text-foreground">{analysis.components.length}</dd>
                    <dt>Candidate regions</dt><dd className="text-right font-mono text-foreground">{analysis.candidates.length}</dd>
                    <dt>Rejected backgrounds</dt><dd className="text-right font-mono text-foreground">{analysis.components.filter((component) => component.rejected).length}</dd>
                    <dt>Adaptive threshold</dt><dd className="text-right font-mono text-foreground">{analysis.adaptiveThresholdMean}</dd>
                    <dt>Grayscale mean</dt><dd className="text-right font-mono text-foreground">{analysis.grayscaleMean}</dd>
                  </dl>
                </section>
                <section className="rounded-xl border border-border p-4">
                  <h3 className="font-semibold">Selection reasoning</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {analysis.candidates.find((candidate) => candidate.selected)?.reason ?? "No candidate exceeded the confidence threshold, so no automatic crop was forced."}
                  </p>
                  {analysis.warnings.length > 0 && (
                    <ul className="mt-3 space-y-1 text-xs text-amber-700 dark:text-amber-300">
                      {analysis.warnings.map((warning) => <li key={warning}>{warning}</li>)}
                    </ul>
                  )}
                </section>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background p-3">
      <p className="text-2xl font-bold">{value}</p>
      <p className="break-all text-sm text-muted-foreground">{label}</p>
    </div>
  )
}
