"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import {
  AlertTriangle,
  Beaker,
  BookOpenCheck,
  CheckSquare,
  ClipboardList,
  Database,
  FlaskConical,
  Search,
  ShieldCheck,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { formulaHref } from "@/lib/formula-sheet"
import { reactionHref, solverModuleHref } from "@/lib/deep-links"
import {
  LAB_CATEGORIES,
  getLabMetrics,
  getLabTechnique,
  labSlug,
  searchLabTechniques,
} from "@/lib/lab/lab-engine"
import type { LabCategory, LabTechniqueRecord } from "@/lib/lab/lab-types"
import { cn } from "@/lib/utils"

const quickSearches = ["titration", "meniscus", "tlc", "recrystallization", "ppe", "waste"]

function categoryFromParam(value: string | null): LabCategory | undefined {
  if (!value) return undefined
  const slug = labSlug(value)
  return LAB_CATEGORIES.find((category) => labSlug(category) === slug)
}

export function LabExplorerClient() {
  const metrics = useMemo(() => getLabMetrics(), [])
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<LabCategory | "All">("All")
  const [selectedId, setSelectedId] = useState("titration")

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requestedCategory = categoryFromParam(params.get("category"))
    const requestedTechnique = getLabTechnique(params.get("technique"))

    if (requestedCategory) setCategory(requestedCategory)
    if (requestedTechnique) {
      setSelectedId(requestedTechnique.id)
      setQuery(requestedTechnique.name)
      setCategory(requestedTechnique.category)
    }
  }, [])

  const filtered = useMemo(
    () => searchLabTechniques(query, category === "All" ? undefined : category),
    [category, query],
  )
  const selected = getLabTechnique(selectedId) ?? filtered[0] ?? getLabTechnique("titration")

  useEffect(() => {
    document.getElementById("lab-technique-detail")?.scrollIntoView({ block: "nearest" })
  }, [selected?.id])

  function chooseQuick(value: string) {
    const record = getLabTechnique(value) ?? searchLabTechniques(value)[0]
    setQuery(value)
    if (record) {
      setSelectedId(record.id)
      setCategory(record.category)
    }
  }

  return (
    <main id="lab-explorer" className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-border bg-card p-6 sm:p-8"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Beaker className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">ARSHLAB v6.3.0</Badge>
                  <Badge variant="outline">Database mode = no AI usage</Badge>
                </div>
                <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Lab Explorer</h1>
                <p className="mt-2 max-w-3xl text-muted-foreground">
                  Study deterministic chemistry lab techniques, safety, glassware, procedure logic, and lab-report evidence.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/practice-generator?topic=Lab%20Skills&source=database">Practice Lab Skills</Link>
              </Button>
              <Button asChild className="rounded-xl">
                <Link href="/exam-generator?topic=Lab%20Skills&source=database">Generate Lab Exam Set</Link>
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Metric label="Techniques" value={metrics.techniques} />
            <Metric label="Categories" value={metrics.categories} />
            <Metric label="Safety Records" value={metrics.safetyRecords} />
            <Metric label="Equipment Items" value={metrics.equipmentItems} />
            <Metric label="Procedure Steps" value={metrics.procedures} />
          </div>
        </motion.section>

        <section className="grid min-w-0 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <div className="space-y-6">
            <Card className="rounded-2xl border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Search className="h-5 w-5" />
                  Search Lab Techniques
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search titration, TLC, PPE, meniscus..."
                  className="h-12 rounded-xl bg-background"
                />
                <div className="flex flex-wrap gap-2">
                  {quickSearches.map((value) => (
                    <Button key={value} type="button" variant="outline" size="sm" onClick={() => chooseQuick(value)}>
                      {value}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Database className="h-5 w-5" />
                  Categories
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {(["All", ...LAB_CATEGORIES] as const).map((item) => (
                  <Button
                    key={item}
                    type="button"
                    variant={category === item ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCategory(item)}
                  >
                    {item}
                  </Button>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center justify-between gap-3 text-lg">
                  <span className="flex items-center gap-2">
                    <ClipboardList className="h-5 w-5" />
                    Techniques
                  </span>
                  <Badge variant="outline">{filtered.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filtered.length ? (
                  <div className="grid max-h-[560px] gap-2 overflow-y-auto pr-1">
                    {filtered.map((record) => (
                      <button
                        key={record.id}
                        type="button"
                        onClick={() => setSelectedId(record.id)}
                        className={cn(
                          "rounded-xl border px-3 py-3 text-left transition-colors",
                          selected?.id === record.id
                            ? "border-primary bg-primary/10"
                            : "border-border bg-secondary/20 hover:bg-secondary",
                        )}
                      >
                        <span className="block font-medium">{record.name}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">{record.category}</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                    No lab technique matched that search.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {selected && <TechniqueDetail technique={selected} />}
        </section>
      </div>
    </main>
  )
}

function TechniqueDetail({ technique }: { technique: LabTechniqueRecord }) {
  return (
    <div id="lab-technique-detail" className="scroll-mt-24 space-y-6">
      <Card className="rounded-2xl border-teal-500/20 bg-teal-500/5">
        <CardHeader>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-2xl">{technique.name}</CardTitle>
              <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{technique.purpose}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge>{technique.category}</Badge>
              <Badge variant="outline">{technique.difficulty}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
          <div className="rounded-xl border border-border bg-background/80 p-4">
            <p className="mb-3 flex items-center gap-2 font-semibold">
              <CheckSquare className="h-4 w-4" />
              Step-by-Step Procedure
            </p>
            <ol className="space-y-2 text-sm leading-relaxed text-muted-foreground">
              {technique.procedure.map((step, index) => (
                <li key={step} className="grid grid-cols-[28px_minmax(0,1fr)] gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </div>

          <div className="space-y-3">
            <InfoPanel title="Equipment" icon={FlaskConical} items={technique.equipment} />
            <InfoPanel title="Exam / Lab-Report Clues" icon={BookOpenCheck} items={technique.examClues} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <InfoPanel title="Safety Notes" icon={ShieldCheck} items={technique.safetyNotes} tone="teal" />
        <InfoPanel title="Common Mistakes" icon={AlertTriangle} items={technique.commonMistakes} tone="amber" />
        <InfoPanel title="Lab Report Checklist" icon={ClipboardList} items={technique.labReportChecklist} />
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database className="h-5 w-5" />
            Related ARSHLAB Links
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <RelatedGroup
            title="Formulas"
            empty="No formula link"
            links={technique.related.formulas.map((id) => ({ href: formulaHref(id), label: id.replace(/-/g, " ") }))}
          />
          <RelatedGroup
            title="Solvers"
            empty="No solver link"
            links={technique.related.solverModules.map((id) => ({ href: solverModuleHref(id), label: id.replace(/-/g, " ") }))}
          />
          <RelatedGroup
            title="Reactions"
            empty="No reaction link"
            links={technique.related.reactions.map((id) => ({ href: reactionHref(id), label: id.replace(/^rxn-/, "").replace(/-/g, " ") }))}
          />
          <RelatedGroup
            title="Practice"
            empty="No practice link"
            links={technique.related.practiceTopics.map((topic) => ({
              href: `/practice-generator?topic=${encodeURIComponent(topic)}&source=database`,
              label: topic,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-background/80 px-4 py-3">
      <p className="font-mono text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

function InfoPanel({
  title,
  icon: Icon,
  items,
  tone,
}: {
  title: string
  icon: React.ElementType
  items: string[]
  tone?: "teal" | "amber"
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        tone === "teal" && "border-teal-500/20 bg-teal-500/5",
        tone === "amber" && "border-amber-500/20 bg-amber-500/5",
        !tone && "border-border bg-card",
      )}
    >
      <p className="mb-3 flex items-center gap-2 font-semibold">
        <Icon className="h-4 w-4" />
        {title}
      </p>
      <ul className="space-y-2 text-sm leading-relaxed text-muted-foreground">
        {items.map((item) => (
          <li key={item}>- {item}</li>
        ))}
      </ul>
    </div>
  )
}

function RelatedGroup({
  title,
  links,
  empty,
}: {
  title: string
  links: Array<{ href: string; label: string }>
  empty: string
}) {
  return (
    <div className="rounded-xl border border-border bg-secondary/20 p-3">
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {links.length ? (
          links.map((link) => (
            <Button key={link.href} asChild variant="outline" size="sm" className="rounded-full">
              <Link href={link.href}>{link.label}</Link>
            </Button>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">{empty}</p>
        )}
      </div>
    </div>
  )
}
