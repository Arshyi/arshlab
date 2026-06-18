"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { ArrowRight, BookOpenCheck, Calculator, Database, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  FORMULA_RECORDS,
  formulaHref,
  getFormulaById,
  getFormulaMetrics,
  recordFormulaView,
  searchFormulaRecords,
  type FormulaRecord,
} from "@/lib/formula-sheet"
import {
  getSolverModuleForFormulaDeepLink,
  resolveFormulaDeepLink,
  solverModuleHref,
} from "@/lib/deep-links"
import { cn } from "@/lib/utils"

const allCategories = Array.from(new Set(FORMULA_RECORDS.map((formula) => formula.category)))

export function FormulaSheetClient() {
  const searchParams = useSearchParams()
  const formulaParam = searchParams.get("formula")
  const resolvedFormulaParam = resolveFormulaDeepLink(formulaParam)
  const metrics = getFormulaMetrics()
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("All")
  const [selectedId, setSelectedId] = useState(resolvedFormulaParam ?? FORMULA_RECORDS[0]?.id ?? "")

  useEffect(() => {
    if (resolvedFormulaParam && getFormulaById(resolvedFormulaParam)) {
      setSelectedId(resolvedFormulaParam)
    }
  }, [resolvedFormulaParam])

  const filtered = useMemo(() => {
    const searched = searchFormulaRecords(query)
    return category === "All" ? searched : searched.filter((formula) => formula.category === category)
  }, [query, category])

  const selected = getFormulaById(selectedId) ?? filtered[0] ?? FORMULA_RECORDS[0]

  useEffect(() => {
    if (selected?.id) {
      recordFormulaView(selected.id)
      document.getElementById(`formula-${selected.id}`)?.scrollIntoView({ block: "start" })
    }
  }, [selected?.id])

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <BookOpenCheck className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">ARSHLAB v4.3.1</Badge>
                  <Badge variant="outline">Database mode = no AI usage</Badge>
                  <Badge variant="outline">Deterministic formula records</Badge>
                </div>
                <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Formula Sheet Engine</h1>
                <p className="mt-2 max-w-3xl text-muted-foreground">
                  Search ARSHLAB&apos;s central chemistry formula handbook for variables, required units,
                  when-to-use notes, common mistakes, and worked examples.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button asChild variant="outline" className="w-full rounded-xl sm:w-auto">
                <Link href="/chemistry-solver">
                  Open Solver
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild className="w-full rounded-xl sm:w-auto">
                <Link href="/practice-generator?topic=Chemistry%20Calculations&source=database">
                  Practice
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Metric label="Formula records" value={metrics.formulas} />
            <Metric label="Categories" value={metrics.categories} />
            <Metric label="Worked examples" value={metrics.workedExamples} />
            <Metric label="Variables defined" value={metrics.variablesDefined} />
          </div>
        </motion.section>

        <section className="grid min-w-0 gap-6 lg:grid-cols-[330px_minmax(0,1fr)]">
          <Card className="h-fit rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Search className="h-5 w-5" />
                Search Formulas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search molarity, ideal gas, pH, enthalpy..."
                className="h-11 rounded-xl"
              />
              <div className="flex flex-wrap gap-2">
                {["All", ...allCategories].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setCategory(item)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                      category === item
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-secondary/30 text-muted-foreground hover:bg-secondary",
                    )}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="grid max-h-[620px] gap-2 overflow-y-auto pr-1">
                {filtered.length > 0 ? (
                  filtered.map((formula) => (
                    <Link
                      key={formula.id}
                      href={formulaHref(formula.id)}
                      onClick={() => setSelectedId(formula.id)}
                      className={cn(
                        "rounded-xl border px-3 py-3 transition-colors",
                        selected?.id === formula.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-secondary/20 hover:bg-secondary",
                      )}
                    >
                      <span className="block text-sm font-semibold">{formula.name}</span>
                      <span className="mt-1 block font-mono text-xs text-muted-foreground">{formula.formula}</span>
                      <Badge variant="outline" className="mt-2 rounded-full">
                        {formula.category}
                      </Badge>
                    </Link>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                    No formulas matched that search.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {selected ? <FormulaViewer formula={selected} /> : null}
        </section>
      </div>
    </main>
  )
}

function FormulaViewer({ formula }: { formula: FormulaRecord }) {
  const solverModuleId = getSolverModuleForFormulaDeepLink(formula.id)

  return (
    <div id={`formula-${formula.id}`} className="min-w-0 space-y-6 scroll-mt-24">
      <Card className="rounded-2xl border-primary/20 bg-primary/5">
        <CardContent className="space-y-4 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                <Badge>{formula.category}</Badge>
                <Badge variant="outline">Formula handbook</Badge>
              </div>
              <h2 className="mt-3 text-2xl font-bold tracking-tight">{formula.name}</h2>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{formula.description}</p>
            </div>
            <Button asChild variant="outline" className="w-full rounded-xl sm:w-auto">
              <Link href={solverModuleId ? solverModuleHref(solverModuleId) : "/chemistry-solver"}>
                <Calculator className="h-4 w-4" />
                Try Solver
              </Link>
            </Button>
          </div>
          <div className="rounded-2xl border border-border bg-background/90 p-6 text-center">
            <p className="break-words font-mono text-3xl font-black tracking-wide sm:text-4xl">{formula.formula}</p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg">Variables</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {formula.variables.map((variable) => (
                <div key={`${variable.symbol}-${variable.meaning}`} className="rounded-xl border border-border bg-secondary/20 p-4">
                  <p className="font-mono text-lg font-bold">{variable.symbol}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{variable.meaning}</p>
                  <Badge variant="outline" className="mt-3 rounded-full">
                    {variable.unit}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg">Worked Example</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {formula.workedExample.map((step, index) => (
                <div key={`${step.label}-${index}`} className="grid gap-2 sm:grid-cols-[130px_minmax(0,1fr)]">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                      {index + 1}
                    </div>
                    <p className="font-semibold">{step.label}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-secondary/20 p-3">
                    <p className="break-words font-mono text-sm">{step.expression}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{step.explanation}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6">
          <InfoCard title="When To Use" items={[formula.whenToUse]} />
          <InfoCard title="Units" items={formula.units} />
          <InfoCard title="Common Mistakes" items={formula.commonMistakes} />
          <Card className="rounded-2xl border-teal-500/20 bg-teal-500/5">
            <CardContent className="space-y-3 p-5">
              <div className="flex items-center gap-2">
                <Database className="h-5 w-5 text-teal-600" />
                <p className="font-semibold">Database Only</p>
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Formula records are local deterministic ARSHLAB data. This page does not call AI services.
              </p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number | string }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-4">
        <p className="font-mono text-2xl font-bold">{value}</p>
        <p className="text-sm text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  )
}

function InfoCard({ title, items }: { title: string; items: string[] }) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <p key={item} className="rounded-xl border border-border bg-secondary/20 p-3 text-sm leading-relaxed text-muted-foreground">
            {item}
          </p>
        ))}
      </CardContent>
    </Card>
  )
}
