import Link from "next/link"
import { BarChart3, CheckCircle2, Gauge, ScanSearch, Timer, TriangleAlert } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { runScannerBenchmark } from "@/lib/benchmarks/scanner-benchmark-runner"

function formatPercent(value: number): string {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`
}

export default function ScannerBenchmarksPage() {
  const report = runScannerBenchmark()
  const v113BaselineFixtureIds = new Set([
    "benzene-clean",
    "cyclohexane-camera",
    "cyclohexene-handwritten",
    "ethanol-clean",
    "methanol-low-light",
    "ethene-clean",
    "ethyne-perspective",
    "acetone-clean",
    "acetic-acid-clutter",
    "phenol-handwritten",
    "aniline-perspective",
    "pyridine-clean",
    "naphthalene-camera",
  ])
  const failures = report.results.filter((result) => !result.top1Correct)
  const formerGapTargets = report.results.filter((result) => ["pyridine", "naphthalene"].includes(result.fixture.compoundId))
  const expandedTargets = report.results.filter((result) => !v113BaselineFixtureIds.has(result.fixture.id))
  const familySummaries = Object.entries(report.summary.coverageFamilies)
  const metricCards = [
    { label: "Fixtures", value: report.summary.fixtureCount, detail: "Controlled synthetic scanner cases", icon: ScanSearch },
    { label: "Top-1 Accuracy", value: formatPercent(report.summary.top1Accuracy), detail: "Expected compound ranked first", icon: CheckCircle2 },
    { label: "Top-3 Accuracy", value: formatPercent(report.summary.top3Accuracy), detail: "Expected compound in first three", icon: BarChart3 },
    { label: "Avg Confidence", value: formatPercent(report.summary.averageConfidence), detail: "Mean top-candidate confidence", icon: Gauge },
    { label: "Avg Runtime", value: `${report.summary.averageRuntimeMs} ms`, detail: "Pure local scanStructure run", icon: Timer },
    { label: "Failure Rate", value: formatPercent(report.summary.failedCompilationRate), detail: "No database-valid candidate", icon: TriangleAlert },
  ]

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <BarChart3 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-primary">ARSHLAB v11.4.0</p>
              <h1 className="text-3xl font-bold tracking-tight">Structure Scanner Benchmarks</h1>
              <p className="text-muted-foreground">
                Deterministic local scoreboard for controlled scanner fixtures across hydrocarbons,
                aromatics, carbonyls, acids, esters, amino acids, sugars, and heterocycles.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-teal-500/10 px-3 py-1 text-xs font-medium text-teal-700 dark:text-teal-300">
              No AI usage
            </span>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
              Scanner engines unchanged
            </span>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
              JSON via npm run benchmark:scanner
            </span>
            <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
              Controlled suite, not a universal recognition claim
            </span>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <Card className="rounded-2xl border-teal-500/20 bg-teal-500/5">
            <CardHeader>
              <CardTitle className="text-base">How To Read This</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                Top-1 accuracy means the expected molecule is the scanner&apos;s first-ranked match.
              </p>
              <p>
                Top-3 accuracy means the expected molecule appears anywhere in the first three ranked matches.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">Fixture Scope</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                These are deterministic benchmark fixtures designed to catch regressions and coverage gaps.
              </p>
              <p>
                They do not claim ARSHLAB can identify every real-world chemistry photo or handwritten structure.
              </p>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">v11.4 Benchmark Expansion</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>
                The suite now adds broader controlled fixtures for substituted aromatics, esters, amino acids,
                sugars, and heterocycles. New failures are reported as benchmark gaps instead of hidden.
              </p>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {metricCards.map((metric) => {
            const Icon = metric.icon
            return (
              <Card key={metric.label} className="rounded-2xl">
                <CardContent className="flex items-start gap-4 p-5">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">{metric.label}</p>
                    <p className="text-2xl font-bold">{metric.value}</p>
                    <p className="text-xs text-muted-foreground">{metric.detail}</p>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </section>

        <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Per-Fixture Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="min-w-[860px] w-full text-sm">
                  <thead className="text-left text-xs uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2 pr-4">Fixture</th>
                      <th className="py-2 pr-4">Expected</th>
                      <th className="py-2 pr-4">Top Candidate</th>
                      <th className="py-2 pr-4">Confidence</th>
                      <th className="py-2 pr-4">Top-1</th>
                      <th className="py-2 pr-4">Formula</th>
                      <th className="py-2 pr-4">Groups</th>
                      <th className="py-2 pr-4">Rings</th>
                      <th className="py-2 pr-4">Runtime</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.results.map((result) => (
                      <tr key={result.fixture.id} className="border-t border-border">
                        <td className="py-3 pr-4 font-mono text-xs">{result.fixture.id}</td>
                        <td className="py-3 pr-4">{result.fixture.expectedName}</td>
                        <td className="py-3 pr-4">{result.topCandidateName ?? "No match"}</td>
                        <td className="py-3 pr-4">{formatPercent(result.confidence)}</td>
                        <td className="py-3 pr-4">
                          <ResultBadge passed={result.top1Correct} />
                        </td>
                        <td className="py-3 pr-4">
                          <ResultBadge passed={result.formulaCorrect} />
                        </td>
                        <td className="py-3 pr-4">
                          <ResultBadge passed={result.functionalGroupsCorrect} />
                        </td>
                        <td className="py-3 pr-4">
                          <ResultBadge passed={result.ringCountCorrect} />
                        </td>
                        <td className="py-3 pr-4">{result.runtimeMs} ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Metric Coverage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <MetricLine label="Formula accuracy" value={report.summary.formulaAccuracy} />
                <MetricLine label="Functional groups" value={report.summary.functionalGroupAccuracy} />
                <MetricLine label="Ring count" value={report.summary.ringCountAccuracy} />
                <MetricLine label="Aromaticity" value={report.summary.aromaticityAccuracy} />
                <MetricLine label="Atom counts" value={report.summary.atomCountAccuracy} />
                <MetricLine label="False aromatic rate" value={report.summary.falseAromaticRate} invert />
                <MetricLine label="False ring rate" value={report.summary.falseRingRate} invert />
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Coverage Families</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {familySummaries.map(([family, summary]) => (
                  <div key={family}>
                    <div className="mb-1 flex items-center justify-between gap-3">
                      <span className="capitalize text-muted-foreground">{family}</span>
                      <span className="font-medium">
                        {formatPercent(summary.top1Accuracy)} top-1 · {summary.fixtureCount} fixtures
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary">
                      <div
                        className="h-2 rounded-full bg-primary"
                        style={{ width: `${Math.max(0, Math.min(100, summary.top1Accuracy))}%` }}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Current Failures</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {failures.length === 0 ? (
                  <p className="text-muted-foreground">All fixtures currently pass top-1 matching.</p>
                ) : (
                  failures.map((failure) => (
                    <div key={failure.fixture.id} className="rounded-xl border border-border p-3">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <p className="font-medium">{failure.fixture.expectedName}</p>
                        <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                          {v113BaselineFixtureIds.has(failure.fixture.id) ? "Baseline regression" : "New benchmark gap"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{failure.fixture.notes}</p>
                      <ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                        {failure.validationFailureReasons.slice(0, 3).map((reason) => (
                          <li key={reason}>{reason}</li>
                        ))}
                      </ul>
                      {failure.topCandidates.length > 0 && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Top candidates: {failure.topCandidates.map((candidate) => candidate.name).join(", ")}
                        </p>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>v11.4 Expanded Targets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">
                  These fixtures extend the original 13-case suite. They are intentionally allowed to reveal
                  new coverage gaps so future scanner work has a scoreboard.
                </p>
                <div className="flex flex-wrap gap-2">
                  {expandedTargets.map((gap) => (
                    <span
                      key={gap.fixture.id}
                      className={
                        gap.top1Correct
                          ? "rounded-full bg-green-500/10 px-3 py-1 text-xs font-medium text-green-700 dark:text-green-300"
                          : "rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300"
                      }
                    >
                      {gap.fixture.expectedName}: {gap.top1Correct ? "Passing" : "Check"}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Pyridine and naphthalene remain tracked separately as former v11.2 gaps:{" "}
                  {formerGapTargets.map((gap) => `${gap.fixture.expectedName} ${gap.top1Correct ? "passing" : "check"}`).join(", ")}.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-teal-500/20 bg-teal-500/5">
              <CardContent className="space-y-3 p-5 text-sm">
                <p className="font-semibold">Run locally</p>
                <code className="block rounded-lg bg-background p-3 text-xs">
                  npm.cmd run benchmark:scanner
                </code>
                <p className="text-xs text-muted-foreground">
                  Writes a JSON report to .next/benchmark-reports/scanner-benchmark-report.json.
                </p>
                <Link
                  href="/structure-scanner"
                  className="inline-flex rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary"
                >
                  Open Structure Scanner
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </main>
  )
}

function ResultBadge({ passed }: { passed: boolean }) {
  return (
    <span
      className={
        passed
          ? "rounded-full bg-green-500/10 px-2 py-1 text-xs font-medium text-green-700 dark:text-green-300"
          : "rounded-full bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-700 dark:text-amber-300"
      }
    >
      {passed ? "Pass" : "Check"}
    </span>
  )
}

function MetricLine({ label, value, invert = false }: { label: string; value: number; invert?: boolean }) {
  const barValue = invert ? 100 - value : value
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{formatPercent(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-secondary">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, barValue))}%` }} />
      </div>
    </div>
  )
}
