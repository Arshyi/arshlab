"use client"

import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { CandidateEliminationReport, CandidateEliminationResult } from "@/lib/chemistry-intelligence/elimination-report"

interface ChemicalContradictionReportProps {
  report: CandidateEliminationReport | null
}

function CandidateRow({ candidate, primary = false }: { candidate: CandidateEliminationResult; primary?: boolean }) {
  const failed = candidate.status === "eliminated"
  const failures = [...candidate.hardFailures, ...candidate.softFailures].slice(0, primary ? 5 : 3)
  return (
    <div className="rounded-xl border border-border bg-background/80 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {failed ? <XCircle className="h-4 w-4 text-red-500" /> : <CheckCircle2 className="h-4 w-4 text-green-600" />}
          <span className="font-semibold">{candidate.name}</span>
        </div>
        <Badge variant={failed ? "destructive" : "default"} className="rounded-full">
          {failed ? "Eliminated" : "Passed"}
        </Badge>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
        <span>{candidate.satisfied}/{candidate.requirementsEvaluated} satisfied</span>
        <span>{candidate.hardFailures.length} hard</span>
        <span>{candidate.softFailures.length} soft</span>
      </div>
      {failures.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
          {failures.map((failure) => (
            <li key={`${candidate.compoundId}-${failure.id}`} className="rounded-lg bg-secondary/40 p-2">
              <span className="font-medium text-foreground">{failure.label}:</span> {failure.reason}
              <span className="ml-1">Expected {failure.expected}; detected {failure.detected}.</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function ChemicalContradictionReport({ report }: ChemicalContradictionReportProps) {
  if (!report) return null
  return (
    <Card className="rounded-2xl border-emerald-500/20 bg-emerald-500/5">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldCheck className="h-5 w-5" />
              Chemical Contradiction Report
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Impossible identities are eliminated before database ranking and chemistry intelligence.
            </p>
          </div>
          <Badge variant="outline" className="rounded-full">
            ARSHLAB v7.2.0
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Generated" value={report.candidatesGenerated} />
          <Metric label="Eliminated" value={report.candidatesEliminated} />
          <Metric label="Remaining" value={report.remainingCandidates} />
          <Metric label="Hard contradictions" value={report.hardContradictions} />
          <Metric label="Requirements" value={report.requirementsEvaluated} />
        </div>

        {report.topPassed && (
          <div>
            <p className="mb-2 text-sm font-semibold">Top passed candidate</p>
            <CandidateRow candidate={report.topPassed} primary />
          </div>
        )}

        {report.topEliminated.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-semibold">Rejected alternatives</p>
            <div className="grid gap-3 lg:grid-cols-2">
              {report.topEliminated.slice(0, 4).map((candidate) => (
                <CandidateRow key={candidate.compoundId} candidate={candidate} />
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-background/80 p-3">
      <p className="font-mono text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
