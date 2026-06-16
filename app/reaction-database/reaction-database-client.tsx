"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { ArrowRightLeft, Beaker, BookOpenCheck, Database, Filter, Search } from "lucide-react"
import { ReactionDiagram } from "@/components/chemistry/ReactionDiagram"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { REACTION_CATEGORIES, REACTION_DIFFICULTIES } from "@/lib/chemistry/reaction-types"
import type { ReactionCategory, ReactionDifficulty, ReactionRecord } from "@/lib/chemistry/reaction-types"
import { REACTION_RECORDS, getReactionKnowledgeMetrics } from "@/lib/chemistry/reactions"
import { classifyReaction } from "@/lib/reaction-engine/classifier"
import { predictReaction } from "@/lib/reaction-engine/predictor"
import { cn } from "@/lib/utils"

const curricula = [
  "All",
  "High School",
  "General First-Year Chemistry",
  "CHEM 121",
  "IB Chemistry Style",
  "AP Chemistry Style",
  "A-Level Chemistry Style",
]

const quickSearches = ["HCl + NaOH", "AgNO3 + NaCl", "CH4 + O2", "Zn + CuSO4", "C2H4 + Br2"]

type CategoryFilter = "All" | ReactionCategory
type DifficultyFilter = "All" | ReactionDifficulty

function normalize(value: string): string {
  return value.toLowerCase().replace(/\s+/g, " ").trim()
}

function recordMatches(record: ReactionRecord, query: string): boolean {
  if (!query.trim()) return true
  const q = normalize(query)
  return normalize(
    [
      record.name,
      record.reactionType,
      record.category,
      record.difficulty,
      record.balancedEquation,
      record.unbalancedEquation,
      record.explanation,
      ...record.reactants,
      ...record.products,
      ...record.curriculum,
    ].join(" "),
  ).includes(q)
}

export function ReactionDatabaseClient() {
  const metrics = getReactionKnowledgeMetrics()
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<CategoryFilter>("All")
  const [difficulty, setDifficulty] = useState<DifficultyFilter>("All")
  const [curriculum, setCurriculum] = useState("All")
  const [selectedId, setSelectedId] = useState(REACTION_RECORDS[0]?.id ?? "")

  const filteredRecords = useMemo(
    () =>
      REACTION_RECORDS.filter((record) => {
        const categoryOk = category === "All" || record.category === category
        const difficultyOk = difficulty === "All" || record.difficulty === difficulty
        const curriculumOk = curriculum === "All" || record.curriculum.includes(curriculum)
        return categoryOk && difficultyOk && curriculumOk && recordMatches(record, query)
      }),
    [category, curriculum, difficulty, query],
  )

  const selected = REACTION_RECORDS.find((record) => record.id === selectedId) ?? filteredRecords[0] ?? REACTION_RECORDS[0]
  const prediction = selected ? predictReaction(selected.reactants) : null
  const classification = selected ? classifyReaction(selected.balancedEquation) : null

  function runQuickSearch(value: string) {
    setQuery(value)
    const predicted = predictReaction(value)
    if (predicted.matchedReactionId) setSelectedId(predicted.matchedReactionId)
  }

  function resetFilters() {
    setQuery("")
    setCategory("All")
    setDifficulty("All")
    setCurriculum("All")
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <ArrowRightLeft className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Reaction Database</h1>
                <p className="max-w-3xl text-muted-foreground">
                  Browse deterministic reaction records for prediction, classification, balancing practice, and future curriculum-aware learning.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Badge variant="secondary" className="w-fit rounded-full px-3 py-1">
                ARSHLAB v4.2.0
              </Badge>
              <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
                Database mode = no AI usage
              </Badge>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Metric label="Reaction Records" value={metrics.reactionRecords} />
            <Metric label="Categories" value={metrics.categories} />
            <Metric label="Reaction Types" value={metrics.reactionTypes} />
            <Metric label="Balancing Exercises" value={metrics.balancingExercises} />
            <Metric label="Prediction Templates" value={metrics.predictionTemplates} />
          </div>
        </motion.div>

        <Card className="rounded-2xl border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Search className="h-5 w-5" />
              Search and Filter
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search HCl + NaOH, combustion, precipitation, redox, esterification..."
              className="h-12 rounded-xl bg-background"
            />
            <div className="flex flex-wrap gap-2">
              {quickSearches.map((value) => (
                <Button key={value} type="button" variant="outline" size="sm" onClick={() => runQuickSearch(value)}>
                  {value}
                </Button>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <FilterSelect label="Category" value={category} options={["All", ...REACTION_CATEGORIES]} onChange={(value) => setCategory(value as CategoryFilter)} />
              <FilterSelect label="Difficulty" value={difficulty} options={["All", ...REACTION_DIFFICULTIES]} onChange={(value) => setDifficulty(value as DifficultyFilter)} />
              <FilterSelect label="Curriculum" value={curriculum} options={curricula} onChange={setCurriculum} />
            </div>
          </CardContent>
        </Card>

        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <Card className="min-w-0 rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center justify-between gap-3 text-lg">
                <span className="flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  Reaction Records
                </span>
                <Badge variant="outline">{filteredRecords.length} shown</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredRecords.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">No reaction records matched those filters.</p>
                  <p className="mt-1">Try clearing the query or choosing a broader category.</p>
                  <Button type="button" variant="outline" size="sm" className="mt-4 rounded-xl" onClick={resetFilters}>
                    Reset filters
                  </Button>
                </div>
              ) : (
                <div className="grid max-h-[680px] gap-3 overflow-y-auto pr-1">
                  {filteredRecords.map((record) => (
                    <button
                      key={record.id}
                      type="button"
                      onClick={() => setSelectedId(record.id)}
                      className={cn(
                        "rounded-xl border px-4 py-3 text-left transition-colors",
                        selected?.id === record.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-secondary/20 hover:bg-secondary",
                      )}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <p className="font-medium">{record.name}</p>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">{record.category}</Badge>
                          <Badge variant="outline">{record.difficulty}</Badge>
                        </div>
                      </div>
                      <p className="mt-2 break-words font-mono text-xs text-muted-foreground sm:text-sm">{record.balancedEquation}</p>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {selected && (
            <aside className="min-w-0 space-y-4">
              <Card className="rounded-2xl border-teal-500/20 bg-teal-500/5">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Beaker className="h-5 w-5" />
                    Reaction Viewer
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold">{selected.name}</h2>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Badge>{selected.category}</Badge>
                      <Badge variant="secondary">{selected.reactionType}</Badge>
                      <Badge variant="outline">{selected.difficulty}</Badge>
                    </div>
                  </div>

                  <ReactionDiagram reaction={selected} compact />

                  <div className="rounded-xl border border-border bg-background/80 p-4">
                    <p className="text-xs font-medium uppercase text-muted-foreground">Balanced Equation</p>
                    <p className="mt-2 break-words font-mono text-sm">{selected.balancedEquation}</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <InfoBlock label="Reactants" value={selected.reactants.join(" + ")} />
                    <InfoBlock label="Products" value={selected.products.join(" + ")} />
                    <InfoBlock label="Skeleton" value={selected.unbalancedEquation} />
                  </div>

                  <p className="rounded-xl border border-border bg-background/80 p-3 text-sm text-muted-foreground">
                    {selected.explanation}
                  </p>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BookOpenCheck className="h-5 w-5" />
                    Engine Checks
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <InfoBlock
                    label="Prediction"
                    value={
                      prediction?.recognized
                        ? `${prediction.products.join(" + ")} (${Math.round(prediction.confidence * 100)}% confidence)`
                        : "No exact prediction"
                    }
                  />
                  <InfoBlock
                    label="Classification"
                    value={
                      classification
                        ? `${classification.category} / ${classification.reactionType} (${Math.round(classification.confidence * 100)}% confidence)`
                        : "No classification"
                    }
                  />
                  <p className="rounded-xl border border-border bg-secondary/20 p-3 text-xs leading-relaxed text-muted-foreground">
                    Reaction Engine outputs are deterministic. If a reaction is not in the local database or a safe heuristic, ARSHLAB does not invent products.
                  </p>
                </CardContent>
              </Card>
            </aside>
          )}
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3">
      <p className="font-mono text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

function InfoBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-border bg-background/80 px-3 py-2">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 break-words font-mono text-sm">{value}</p>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: readonly string[]
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
        <Filter className="h-3.5 w-3.5" />
        {label}
      </p>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-11 rounded-xl bg-background">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
