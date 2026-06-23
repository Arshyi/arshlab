"use client"

import { useState } from "react"
import { ChevronDown, GitMerge, Vote } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import type { EvidenceFusionResult } from "@/lib/structure-scanner/evidence-types"
import { cn } from "@/lib/utils"

function displayName(compoundId: string): string {
  return compoundId.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ")
}

export function EvidenceFusionDebugPanel({ fusion }: { fusion: EvidenceFusionResult | null }) {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card className="rounded-2xl border-dashed">
        <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 p-5 text-left">
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal-500/10 text-teal-700 dark:text-teal-300">
              <GitMerge className="h-4 w-4" />
            </span>
            <span>
              <span className="block font-semibold">Evidence Fusion Debug Panel</span>
              <span className="block text-sm text-muted-foreground">Independent engine votes, penalties, agreements, and final ranking</span>
            </span>
          </span>
          <ChevronDown className={cn("h-5 w-5 shrink-0 transition-transform", open && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-5 border-t border-border pt-5">
            {!fusion ? (
              <p className="text-sm text-muted-foreground">Run the scanner to collect engine evidence.</p>
            ) : (
              <>
                <div className="grid gap-4 lg:grid-cols-2">
                  {fusion.engines.map((engine) => (
                    <section key={engine.id} className="min-w-0 rounded-xl border border-border p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h3 className="font-semibold">{engine.label}</h3>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{engine.description}</p>
                        </div>
                        <Badge variant="outline" className="rounded-full">{engine.candidates.length} candidates</Badge>
                      </div>

                      {engine.candidates.length ? (
                        <div className="mt-3 space-y-2">
                          {engine.candidates.slice(0, 3).map((candidate) => {
                            const vote = fusion.candidates
                              .find((item) => item.compoundId === candidate.compoundId)
                              ?.engineVotes.find((item) => item.engineId === engine.id)
                            return (
                              <div key={candidate.compoundId} className="rounded-lg bg-secondary/40 p-3">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="font-medium">{displayName(candidate.compoundId)}</p>
                                  <div className="flex flex-wrap gap-1.5">
                                    <Badge variant="secondary" className="rounded-full">{candidate.confidence}%</Badge>
                                    <Badge variant="outline" className="rounded-full capitalize">{candidate.strength}</Badge>
                                    {vote && <Badge variant="outline" className="rounded-full">+{vote.weightedContribution} vote</Badge>}
                                  </div>
                                </div>
                                <ul className="mt-2 space-y-1 text-xs leading-relaxed text-muted-foreground">
                                  {candidate.reasoning.map((reason) => <li key={reason}>- {reason}</li>)}
                                </ul>
                                {candidate.penalties.length > 0 && (
                                  <ul className="mt-2 space-y-1 border-t border-border pt-2 text-xs text-amber-700 dark:text-amber-300">
                                    {candidate.penalties.map((penalty) => <li key={penalty.reason}>- {penalty.points}: {penalty.reason}</li>)}
                                  </ul>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="mt-3 rounded-lg bg-secondary/30 p-3 text-sm text-muted-foreground">No database-backed candidate from this engine.</p>
                      )}

                      {engine.reasoning.length > 0 && (
                        <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{engine.reasoning.join(" ")}</p>
                      )}
                      {engine.penalties.length > 0 && (
                        <div className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                          {engine.penalties.map((penalty) => <p key={penalty.reason}>Penalty {penalty.points}: {penalty.reason}</p>)}
                        </div>
                      )}
                    </section>
                  ))}
                </div>

                <section className="rounded-xl border border-teal-500/25 bg-teal-500/5 p-4">
                  <h3 className="flex items-center gap-2 font-semibold">
                    <Vote className="h-4 w-4" />
                    Voting Summary
                  </h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <SummaryValue label="Winner" value={fusion.winningCompoundId ? displayName(fusion.winningCompoundId) : "No winner"} />
                    <SummaryValue label="Runners-up" value={fusion.runnerUpCompoundIds.length ? fusion.runnerUpCompoundIds.map(displayName).join(", ") : "None"} />
                    <SummaryValue label="Strongest evidence" value={fusion.strongestEvidence} />
                    <SummaryValue label="Weakest evidence" value={fusion.weakestEvidence} />
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{fusion.whyWinnerBeatRunnerUp}</p>
                </section>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}

function SummaryValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-background/80 p-3">
      <p className="text-xs uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold">{value}</p>
    </div>
  )
}
