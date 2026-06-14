"use client"

import Link from "next/link"
import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { ArrowRight, GraduationCap, RotateCcw, Scale, Search, TableProperties } from "lucide-react"
import { PeriodicTableGrid } from "@/components/periodic-table-grid"
import {
  formatTrendValue,
  getElementBySymbol,
  getElementTrendValue,
  getDatabaseMeta,
  PERIODIC_TREND_METRICS,
  TREND_MODE_ORDER,
} from "@/lib/chemistry/database"
import type { TrendMode } from "@/lib/chemistry/database"
import type { ElementRecord } from "@/lib/chemistry/database/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const QUICK_EXAMPLES = ["Fe", "Cu", "Xe", "S", "Al", "Cr", "Mn"]

const COMPARISON_PRESETS = [
  { label: "Na vs Mg vs Al", symbols: ["Na", "Mg", "Al"] },
  { label: "Fe vs Co vs Ni", symbols: ["Fe", "Co", "Ni"] },
  { label: "Cl vs Br vs I", symbols: ["Cl", "Br", "I"] },
]

const LEGEND_GRADIENTS: Record<TrendMode, string> = {
  atomicRadius: "linear-gradient(90deg, hsl(172 72% 94%), hsl(172 72% 46%))",
  electronegativity: "linear-gradient(90deg, hsl(205 72% 94%), hsl(205 72% 46%))",
  ionizationEnergy: "linear-gradient(90deg, hsl(265 72% 94%), hsl(265 72% 46%))",
  electronAffinity: "linear-gradient(90deg, hsl(145 72% 94%), hsl(145 72% 46%))",
}

function oxidationStateLabel(element: ElementRecord): string {
  if (!element.oxidationStates.length) return "Varies"
  return element.oxidationStates.map((state) => (state > 0 ? `+${state}` : String(state))).join(", ")
}

export default function PeriodicTablePage() {
  const meta = getDatabaseMeta()
  const [focusSymbol, setFocusSymbol] = useState<string | null>(null)
  const [heatmapMode, setHeatmapMode] = useState<TrendMode | null>(null)
  const [comparisonMode, setComparisonMode] = useState(false)
  const [comparisonSymbols, setComparisonSymbols] = useState<string[]>([])

  const comparisonElements = useMemo(
    () =>
      comparisonSymbols
        .map((symbol) => getElementBySymbol(symbol))
        .filter((element): element is ElementRecord => Boolean(element)),
    [comparisonSymbols],
  )

  const activeMetric = heatmapMode ? PERIODIC_TREND_METRICS[heatmapMode] : null

  function toggleComparisonElement(element: ElementRecord) {
    setComparisonSymbols((current) => {
      if (current.includes(element.symbol)) {
        return current.filter((symbol) => symbol !== element.symbol)
      }
      if (current.length >= 3) return current
      return [...current, element.symbol]
    })
  }

  function applyPreset(symbols: string[]) {
    setComparisonMode(true)
    setComparisonSymbols(symbols)
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <TableProperties className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Periodic Table</h1>
              <p className="text-muted-foreground">
                All {meta.counts.elements} elements - Element Profile data, trends, and comparisons
              </p>
            </div>
          </div>
          <p className="text-lg text-muted-foreground max-w-3xl mt-4">
            Interactive periodic table with Element Explorer profiles, electron configurations,
            ionization graphs, periodic properties, trend heatmaps, and teaching-focused examples.
          </p>
        </motion.div>

        <Card className="rounded-2xl mb-6">
          <CardContent className="pt-6 space-y-6">
            <div className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="min-w-0 space-y-5">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium text-muted-foreground">Quick examples</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {QUICK_EXAMPLES.map((symbol) => (
                      <button
                        key={symbol}
                        type="button"
                        onClick={() => setFocusSymbol(symbol)}
                        className={cn(
                          "rounded-lg border px-3 py-1.5 font-mono text-sm font-medium transition-all",
                          focusSymbol === symbol
                            ? "border-primary bg-primary text-primary-foreground shadow-sm"
                            : "border-border bg-secondary/30 text-foreground hover:bg-secondary",
                        )}
                      >
                        {symbol}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Scale className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm font-medium text-muted-foreground">Heatmap Mode</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={heatmapMode === null ? "default" : "outline"}
                      size="sm"
                      className="rounded-lg"
                      onClick={() => setHeatmapMode(null)}
                    >
                      Category Colors
                    </Button>
                    {TREND_MODE_ORDER.map((mode) => (
                      <Button
                        key={mode}
                        type="button"
                        variant={heatmapMode === mode ? "default" : "outline"}
                        size="sm"
                        className="rounded-lg"
                        onClick={() => setHeatmapMode(mode)}
                      >
                        {PERIODIC_TREND_METRICS[mode].label}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border bg-secondary/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Comparison Mode</p>
                    <p className="text-xs text-muted-foreground">Select up to three elements.</p>
                  </div>
                  <Button
                    type="button"
                    variant={comparisonMode ? "default" : "outline"}
                    size="sm"
                    className="rounded-lg"
                    onClick={() => setComparisonMode((value) => !value)}
                  >
                    {comparisonMode ? "Active" : "Compare"}
                  </Button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {COMPARISON_PRESETS.map((preset) => (
                    <Button
                      key={preset.label}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => applyPreset(preset.symbols)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>

                {comparisonSymbols.length > 0 && (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {comparisonSymbols.map((symbol) => (
                      <Badge key={symbol} variant="secondary" className="font-mono">
                        {symbol}
                      </Badge>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="rounded-lg"
                      onClick={() => setComparisonSymbols([])}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Clear
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {activeMetric && (
              <div className="rounded-2xl border border-border bg-card/70 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-medium">{activeMetric.label}</p>
                    <p className="text-sm text-muted-foreground">{activeMetric.educationalNote}</p>
                  </div>
                  <div className="w-full min-w-0 sm:min-w-64">
                    <div
                      className="h-3 rounded-full border border-border"
                      style={{ background: LEGEND_GRADIENTS[activeMetric.mode] }}
                    />
                    <div className="mt-1 flex justify-between gap-3 text-[11px] text-muted-foreground">
                      <span>{activeMetric.lowLabel}</span>
                      <span>{activeMetric.highLabel}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <PeriodicTableGrid
              focusSymbol={focusSymbol}
              heatmapMode={heatmapMode}
              comparisonMode={comparisonMode}
              comparisonSymbols={comparisonSymbols}
              onComparisonToggle={toggleComparisonElement}
            />
          </CardContent>
        </Card>

        {(comparisonMode || comparisonElements.length > 0) && (
          <ComparisonPanel elements={comparisonElements} />
        )}

        <Card className="rounded-2xl mt-6 border-dashed">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <GraduationCap className="mt-0.5 h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Practice periodic trends</p>
                <p className="text-sm text-muted-foreground">
                  Turn the heatmap patterns into quick comparison questions with explanations.
                </p>
              </div>
            </div>
            <Button asChild className="rounded-xl">
              <Link href="/periodic-trends-quiz">
                Open Trend Quiz
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Data from ARSHLAB Chemistry Database v{meta.version}. Synthetic and heavy-element trend
          values use teaching estimates where direct data is unavailable.
        </p>
      </div>
    </div>
  )
}

function ComparisonPanel({ elements }: { elements: ElementRecord[] }) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg">Element Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        {elements.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            Enable comparison mode and select up to three elements from the table.
          </div>
        ) : (
          <div className="grid min-w-0 gap-4 lg:grid-cols-3">
            {elements.map((element) => (
              <div key={element.id} className="min-w-0 rounded-2xl border border-border bg-secondary/20 p-4">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="break-words text-xl font-bold">{element.name}</h2>
                    <p className="font-mono text-sm text-muted-foreground">{element.symbol}</p>
                  </div>
                  <Badge variant="outline" className="font-mono">
                    Z={element.atomicNumber}
                  </Badge>
                </div>

                <div className="space-y-2">
                  <CompareRow
                    label="Atomic Radius"
                    value={formatTrendValue(
                      "atomicRadius",
                      getElementTrendValue(element, "atomicRadius"),
                    )}
                  />
                  <CompareRow
                    label="Electronegativity"
                    value={formatTrendValue(
                      "electronegativity",
                      getElementTrendValue(element, "electronegativity"),
                    )}
                  />
                  <CompareRow
                    label="Ionization Energy"
                    value={formatTrendValue(
                      "ionizationEnergy",
                      getElementTrendValue(element, "ionizationEnergy"),
                    )}
                  />
                  <CompareRow
                    label="Electron Affinity"
                    value={formatTrendValue(
                      "electronAffinity",
                      getElementTrendValue(element, "electronAffinity"),
                    )}
                  />
                  <CompareRow label="Oxidation States" value={oxidationStateLabel(element)} />
                </div>

                <div className="mt-4 rounded-xl border border-border bg-card/70 px-3 py-2">
                  <p className="text-[10px] uppercase text-muted-foreground">Electron Configuration</p>
                  <p className="mt-1 break-words font-mono text-xs leading-relaxed">{element.electronConfiguration}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function CompareRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-border bg-card/70 px-3 py-2">
      <span className="min-w-0 text-xs text-muted-foreground">{label}</span>
      <span className="break-words text-right font-mono text-xs">{value}</span>
    </div>
  )
}
