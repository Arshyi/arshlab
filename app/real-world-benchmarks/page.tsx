import Link from "next/link"
import type { ReactNode } from "react"
import { BarChart3, Camera, CheckCircle2, Clock, Download, Gauge, ImageIcon, TriangleAlert } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { runRealWorldBenchmark } from "@/lib/benchmarks/real-world-benchmark-runner"
import { exportRealWorldBenchmarkCsv, exportRealWorldBenchmarkMarkdown } from "@/lib/benchmarks/real-world-metrics"

function formatPercent(value: number): string {
  return `${value.toFixed(value % 1 === 0 ? 0 : 1)}%`
}

export default function RealWorldBenchmarksPage() {
  const report = runRealWorldBenchmark({ includeImageData: true })
  const failures = report.results.filter((result) => !result.top1Correct)
  const categoryMetrics = Object.entries(report.summary.categoryMetrics)
  const csvPreview = exportRealWorldBenchmarkCsv(report)
  const markdownPreview = exportRealWorldBenchmarkMarkdown(report)
  const metricCards = [
    { label: "Total Samples", value: report.summary.sampleCount, detail: "Local real-world images loaded", icon: ImageIcon },
    { label: "Top-1 Accuracy", value: formatPercent(report.summary.top1Accuracy), detail: "Expected molecule ranked first", icon: CheckCircle2 },
    { label: "Top-3 Accuracy", value: formatPercent(report.summary.top3Accuracy), detail: "Expected molecule in first three", icon: BarChart3 },
    { label: "Average Runtime", value: `${report.summary.averageRuntimeMs} ms`, detail: "Local scanner evaluation time", icon: Clock },
    { label: "Average Confidence", value: formatPercent(report.summary.averageConfidence), detail: "Mean top-candidate confidence", icon: Gauge },
    { label: "Failures", value: report.summary.failureCount, detail: "Samples needing scanner attention", icon: TriangleAlert },
  ]

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <section className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Camera className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-primary">ARSHLAB v11.5.0</p>
              <h1 className="text-3xl font-bold tracking-tight">Real-World Scanner Benchmarks</h1>
              <p className="text-muted-foreground">
                Deterministic benchmark harness for messy student-upload style images, local manifests,
                category metrics, failure analysis, baseline comparison, and timestamped trend reports.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>No AI usage</Badge>
            <Badge>Scanner engines unchanged</Badge>
            <Badge>Local images only</Badge>
            <Badge>Designed to expose weaknesses</Badge>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <InfoCard
            title="Dataset Format"
            text="Place images and manifest.json files under benchmarks/real-world. Each sample records expected formula, functional groups, ring count, aromaticity, difficulty, tags, and notes."
          />
          <InfoCard
            title="What This Measures"
            text="Top-1, top-3, formula, functional-group, ring, aromaticity, atom-count, confidence, runtime, failures, and per-category performance."
          />
          <InfoCard
            title="Honest Scope"
            text="This is a real-world evaluation harness. Low scores are useful signals, not build failures, and should not be patched by changing expected answers."
          />
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

        {report.summary.sampleCount === 0 ? (
          <Card className="rounded-2xl border-amber-500/20 bg-amber-500/5">
            <CardHeader>
              <CardTitle>No Real-World Samples Yet</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>
                Add sample folders or a root manifest at <code>benchmarks/real-world/manifest.json</code>.
                The harness is ready, but no real uploaded-image cases are committed yet.
              </p>
              <pre className="overflow-x-auto rounded-xl bg-background p-4 text-xs">
{`{
  "id": "camera_benzene_001",
  "image": "camera_benzene_001.jpg",
  "expectedName": "Benzene",
  "expectedFormula": "C6H6",
  "expectedFunctionalGroups": ["arene"],
  "expectedRingCount": 1,
  "expectedAromaticity": true,
  "difficulty": "camera_photo",
  "tags": ["phone", "handwritten", "slight_glare"],
  "notes": "Taken on phone under desk lamp."
}`}
              </pre>
            </CardContent>
          </Card>
        ) : (
          <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Failure Explorer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {failures.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No top-1 failures in the current real-world dataset.</p>
                ) : failures.map((failure) => (
                  <div key={failure.sample.id} className="grid gap-4 rounded-xl border border-border p-4 sm:grid-cols-[120px_1fr]">
                    <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-secondary">
                      {failure.sample.imageDataUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={failure.sample.imageDataUrl} alt={failure.sample.id} className="h-full w-full object-cover" />
                      ) : (
                        <ImageIcon className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{failure.sample.id}</p>
                        <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-300">
                          {failure.failureCauses[0] ?? "Unknown"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Expected {failure.sample.expectedName}; predicted {failure.topCandidateName ?? "no match"} at {formatPercent(failure.confidence)}.
                      </p>
                      <p className="text-xs text-muted-foreground">{failure.failureReasons[0] ?? failure.sample.notes}</p>
                      <div className="flex flex-wrap gap-2 pt-1">
                        <DebugLink href={`/structure-scanner?debug=vision&sample=${failure.sample.id}`}>Vision Debug</DebugLink>
                        <DebugLink href={`/structure-scanner?debug=compiler&sample=${failure.sample.id}`}>Compiler Debug</DebugLink>
                        <DebugLink href={`/knowledge-graph?focus=compound:${failure.topCandidateId ?? failure.sample.expectedName.toLowerCase().replace(/\s+/g, "-")}`}>
                          Knowledge Graph
                        </DebugLink>
                        <DebugLink href={`/interactive-learning/explorer?compound=${failure.topCandidateId ?? failure.sample.expectedName.toLowerCase().replace(/\s+/g, "-")}`}>
                          Interactive Explorer
                        </DebugLink>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle>Coverage By Category</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {categoryMetrics.map(([category, summary]) => (
                    <MetricLine key={category} label={category.replace(/_/g, " ")} value={summary.top1Accuracy} detail={`${summary.sampleCount} samples`} />
                  ))}
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle>Failure Causes</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  {Object.entries(report.summary.failureHistogram)
                    .filter(([, count]) => count > 0)
                    .map(([cause, count]) => (
                      <div key={cause} className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">{cause}</span>
                        <span className="font-medium">{count}</span>
                      </div>
                    ))}
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle>Histograms</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                  <div className="space-y-2">
                    <p className="font-medium">Runtime</p>
                    {Object.entries(report.summary.runtimeHistogram).map(([bin, count]) => (
                      <HistogramLine key={bin} label={bin} count={count} total={report.summary.sampleCount} />
                    ))}
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium">Confidence</p>
                    {Object.entries(report.summary.confidenceHistogram).map(([bin, count]) => (
                      <HistogramLine key={bin} label={bin} count={count} total={report.summary.sampleCount} />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>
        )}

        <section className="grid gap-6 lg:grid-cols-3">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Comparison Mode</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              {report.comparison ? (
                <>
                  <p>Accuracy delta: {report.comparison.accuracyDelta >= 0 ? "+" : ""}{report.comparison.accuracyDelta}%</p>
                  <p>Confidence delta: {report.comparison.confidenceDelta >= 0 ? "+" : ""}{report.comparison.confidenceDelta}%</p>
                  <p>Runtime delta: {report.comparison.runtimeDelta >= 0 ? "+" : ""}{report.comparison.runtimeDelta} ms</p>
                  <p>Regressions: {report.comparison.regressionCount}; improvements: {report.comparison.improvementCount}</p>
                </>
              ) : (
                <p>Save a baseline with <code>node scripts/run-real-world-benchmarks.cjs save-baseline</code> to compare future runs.</p>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Exports</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>CLI export writes JSON, CSV, Markdown, and timestamped history under <code>.next/benchmark-reports/real-world</code>.</p>
              <div className="flex items-center gap-2 text-xs">
                <Download className="h-4 w-4" />
                CSV preview rows: {csvPreview.split("\n").length}
              </div>
              <div className="flex items-center gap-2 text-xs">
                <Download className="h-4 w-4" />
                Markdown report lines: {markdownPreview.split("\n").length}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-teal-500/20 bg-teal-500/5">
            <CardContent className="space-y-3 p-5 text-sm">
              <p className="font-semibold">Run locally</p>
              <code className="block rounded-lg bg-background p-3 text-xs">
                npm.cmd run benchmark:real-world
              </code>
              <p className="text-xs text-muted-foreground">
                Every run is saved with a timestamp and version for trend tracking.
              </p>
              <Link href="/scanner-benchmarks" className="inline-flex rounded-lg border border-border bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-secondary">
                Open Controlled Benchmarks
              </Link>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}

function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  )
}

function InfoCard({ title, text }: { title: string; text: string }) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-sm text-muted-foreground">{text}</CardContent>
    </Card>
  )
}

function DebugLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="rounded-lg border border-border px-3 py-1 text-xs font-medium hover:bg-secondary">
      {children}
    </Link>
  )
}

function MetricLine({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3">
        <span className="capitalize text-muted-foreground">{label}</span>
        <span className="font-medium">{formatPercent(value)} · {detail}</span>
      </div>
      <div className="h-2 rounded-full bg-secondary">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
    </div>
  )
}

function HistogramLine({ label, count, total }: { label: string; count: number; total: number }) {
  const width = total ? (count / total) * 100 : 0
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-3 text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{count}</span>
      </div>
      <div className="h-2 rounded-full bg-secondary">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, width))}%` }} />
      </div>
    </div>
  )
}
