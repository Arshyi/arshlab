"use client"

import { useState } from "react"
import { CheckCircle2, ChevronDown, FileSearch, Gauge, ListChecks, Wrench } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"
import type { ChemistryOCRResult } from "@/lib/ocr/ocr-engine"
import type { StructureScanMatch } from "@/lib/structure-scanner/scanner-types"

export function OCRDebugPanel({
  ocrResult,
  match,
  matches,
  error,
}: {
  ocrResult: ChemistryOCRResult | null
  match: StructureScanMatch | null
  matches: StructureScanMatch[]
  error?: string | null
}) {
  const [open, setOpen] = useState(false)
  const scoreCategories = [
    { id: "ocr", label: "OCR score" },
    { id: "manual", label: "Manual hint score" },
    { id: "filename", label: "Filename score" },
    { id: "visual", label: "Visual shape score" },
    { id: "ring", label: "Ring / aromatic score" },
    { id: "penalty", label: "Penalties" },
  ].map((category) => ({
    ...category,
    total: match?.contributions
      .filter((contribution) => contribution.category === category.id)
      .reduce((sum, contribution) => sum + contribution.points, 0) ?? 0,
  }))

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="rounded-2xl border-dashed">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 p-5 text-left">
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
              <FileSearch className="h-4 w-4" />
            </span>
            <span>
              <span className="block font-semibold">OCR Debug Panel</span>
              <span className="block text-sm text-muted-foreground">Cleanup, chemistry tokens, candidate scores, and confidence</span>
            </span>
          </span>
          <ChevronDown className={cn("h-5 w-5 shrink-0 transition-transform", open && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-5 border-t border-border pt-5">
            {error && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
                OCR error: {error}
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <DebugValue label="Detected formula" value={ocrResult?.parsed.detectedFormula ?? "Not detected"} />
              <DebugValue label="Condensed formula" value={ocrResult?.parsed.detectedCondensedFormula ?? "Not detected"} />
              <DebugValue label="Detected name" value={ocrResult?.parsed.detectedName ?? "Not detected"} />
              <DebugValue label="OCR text confidence" value={ocrResult ? `${ocrResult.ocrConfidence}%` : "Not run"} />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <TextPanel title="Raw OCR Text" value={ocrResult?.rawText || "No OCR text available yet."} />
              <TextPanel title="Cleaned OCR Text" value={ocrResult?.parsed.cleanedText || "No cleaned OCR text available yet."} />
            </div>

            <div className="grid gap-5 lg:grid-cols-2">
              <section className="rounded-xl border border-border p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <ListChecks className="h-4 w-4" />
                  Parsed Formulas And Names
                </h3>
                <div className="mt-3 space-y-3">
                  <TokenRow label="Formulas" values={ocrResult?.parsed.parsedFormulas ?? []} />
                  <TokenRow label="Names" values={ocrResult?.parsed.parsedNames ?? []} />
                </div>
              </section>

              <section className="rounded-xl border border-border p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Wrench className="h-4 w-4" />
                  Applied Corrections
                </h3>
                {ocrResult?.parsed.corrections.length ? (
                  <div className="mt-3 space-y-2">
                    {ocrResult.parsed.corrections.map((correction, index) => (
                      <div key={`${correction.from}-${correction.to}-${index}`} className="rounded-lg bg-secondary/40 p-3 text-sm">
                        <p className="font-mono">{correction.from} -&gt; {correction.to}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{correction.reason}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">No chemistry-specific corrections applied.</p>
                )}
              </section>
            </div>

            <section className="rounded-xl border border-border p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <ListChecks className="h-4 w-4" />
                Parsed Chemistry Tokens
              </h3>
              {ocrResult?.parsed.tokens.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {ocrResult.parsed.tokens.map((token, index) => (
                    <Badge key={`${token.type}-${token.normalized}-${index}`} variant="outline" className="rounded-full">
                      {token.value} - {token.matchKind.replaceAll("-", " ")} - {token.confidence}%
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No chemistry tokens parsed.</p>
              )}
            </section>

            <div className="grid gap-5 lg:grid-cols-2">
              <section className="rounded-xl border border-border p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <CheckCircle2 className="h-4 w-4" />
                  Best Match Reasoning
                </h3>
                {match?.reasons.length ? (
                  <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {match.reasons.map((reason) => (
                      <li key={reason} className="flex gap-2">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-teal-600" />
                        {reason}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">No database match reasoning available.</p>
                )}
              </section>

              <section className="rounded-xl border border-border p-4">
                <h3 className="flex items-center gap-2 text-sm font-semibold">
                  <Gauge className="h-4 w-4" />
                  Confidence Contributions
                </h3>
                {match?.contributions.length ? (
                  <div className="mt-3 space-y-4">
                    <div className="grid gap-2 sm:grid-cols-2">
                      {scoreCategories.map((category) => (
                        <div key={category.id} className="flex items-center justify-between gap-2 rounded-lg bg-secondary/40 p-2 text-xs">
                          <span className="text-muted-foreground">{category.label}</span>
                          <span className="font-mono font-semibold">{category.total > 0 ? "+" : ""}{category.total}</span>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2 border-t border-border pt-3">
                      {match.contributions.map((contribution, index) => (
                        <div key={`${contribution.label}-${index}`} className="flex items-center justify-between gap-3 text-sm">
                          <span className="text-muted-foreground">{contribution.label}</span>
                          <Badge variant={contribution.points < 0 ? "destructive" : "secondary"} className="rounded-full">
                            {contribution.points > 0 ? "+" : ""}{contribution.points}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">No scoring contributions available.</p>
                )}
              </section>
            </div>

            <section className="rounded-xl border border-border p-4">
              <h3 className="text-sm font-semibold">Top Candidate Scores</h3>
              {matches.length ? (
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {matches.slice(0, 3).map((candidate, index) => (
                    <div key={candidate.record.id} className="rounded-lg bg-secondary/40 p-3">
                      <p className="text-xs text-muted-foreground">Candidate {index + 1}</p>
                      <p className="mt-1 font-semibold">{candidate.record.name}</p>
                      <p className="text-sm text-muted-foreground">Score {candidate.score} / Confidence {candidate.confidence}%</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">No candidate scores available.</p>
              )}
            </section>

            {ocrResult && (
              <p className="text-xs text-muted-foreground">
                OCR completed locally in {(ocrResult.durationMs / 1000).toFixed(1)} seconds using {ocrResult.attempts} layout pass{ocrResult.attempts === 1 ? "" : "es"}. OCR and database confidence measure different stages.
              </p>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

function TextPanel({ title, value }: { title: string; value: string }) {
  return (
    <section className="min-w-0 space-y-2">
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <FileSearch className="h-4 w-4" />
        {title}
      </h3>
      <pre className="max-h-48 min-h-24 overflow-auto whitespace-pre-wrap break-words rounded-xl border border-border bg-secondary/30 p-4 font-mono text-xs">
        {value}
      </pre>
    </section>
  )
}

function TokenRow({ label, values }: { label: string; values: string[] }) {
  return (
    <div>
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <div className="mt-1 flex flex-wrap gap-2">
        {values.length ? values.map((value, index) => (
          <Badge key={`${value}-${index}`} variant="outline" className="rounded-full">{value}</Badge>
        )) : <span className="text-sm text-muted-foreground">None detected</span>}
      </div>
    </div>
  )
}

function DebugValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-background p-3">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 truncate font-mono text-sm font-semibold" title={value}>{value}</p>
    </div>
  )
}
