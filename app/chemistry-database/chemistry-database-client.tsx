"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { ArrowRight, Atom, Beaker, Database, FlaskConical, Search, Sigma } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  CHEMISTRY_KNOWLEDGE_CORE_META,
  COMMON_IONS,
  KNOWLEDGE_COMPOUNDS,
  KNOWLEDGE_FUNCTIONAL_GROUPS,
  REACTION_TEMPLATES_KNOWLEDGE,
  getCompoundByFormula,
  getCompoundByName,
  searchChemistry,
} from "@/lib/chemistry/registry"
import type { ChemistryRecordKind, ChemistrySearchResult, Compound } from "@/lib/chemistry/types"
import { cn } from "@/lib/utils"

type Section = ChemistryRecordKind

const sections: Array<{ id: Section; label: string; icon: React.ElementType }> = [
  { id: "compound", label: "Compounds", icon: Beaker },
  { id: "ion", label: "Ions", icon: Atom },
  { id: "functional-group", label: "Functional Groups", icon: Sigma },
  { id: "reaction-template", label: "Reaction Templates", icon: FlaskConical },
]

const quickSearches = ["ethanol", "C2H5OH", "alcohol", "NO3-", "esterification"]

function asCompound(record: ChemistrySearchResult["record"]): Compound | null {
  return "molarMass" in record ? record : null
}

function compoundLabel(compound: Compound): string {
  return `${compound.formula} | ${compound.molarMass.toFixed(3)} g/mol`
}

export function ChemistryDatabaseClient() {
  const [query, setQuery] = useState("")
  const [activeSection, setActiveSection] = useState<Section>("compound")
  const [selectedCompoundId, setSelectedCompoundId] = useState(
    getCompoundByName("ethanol")?.id ?? KNOWLEDGE_COMPOUNDS[0]?.id ?? "",
  )

  const searchResults = useMemo(() => searchChemistry(query, { limit: 80 }), [query])
  const selectedCompound =
    KNOWLEDGE_COMPOUNDS.find((compound) => compound.id === selectedCompoundId) ??
    getCompoundByName("ethanol") ??
    KNOWLEDGE_COMPOUNDS[0]

  const compoundResults = useMemo(() => {
    if (!query.trim()) return KNOWLEDGE_COMPOUNDS.slice(0, 48)
    return searchResults
      .filter((result) => result.kind === "compound")
      .map((result) => asCompound(result.record))
      .filter((compound): compound is Compound => Boolean(compound))
  }, [query, searchResults])

  const ionResults = useMemo(() => {
    if (!query.trim()) return COMMON_IONS.slice(0, 52)
    return searchResults.filter((result) => result.kind === "ion").map((result) => result.record)
  }, [query, searchResults])

  const functionalGroupResults = useMemo(() => {
    if (!query.trim()) return KNOWLEDGE_FUNCTIONAL_GROUPS
    return searchResults.filter((result) => result.kind === "functional-group").map((result) => result.record)
  }, [query, searchResults])

  const reactionResults = useMemo(() => {
    if (!query.trim()) return REACTION_TEMPLATES_KNOWLEDGE
    return searchResults.filter((result) => result.kind === "reaction-template").map((result) => result.record)
  }, [query, searchResults])

  function runQuickSearch(value: string) {
    setQuery(value)
    const match = getCompoundByName(value) ?? getCompoundByFormula(value)
    if (match) {
      setSelectedCompoundId(match.id)
      setActiveSection("compound")
    }
  }

  function handleSearchResult(result: ChemistrySearchResult) {
    setActiveSection(result.kind)
    const compound = asCompound(result.record)
    if (compound) setSelectedCompoundId(compound.id)
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Database className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Chemistry Database</h1>
                <p className="max-w-3xl text-muted-foreground">
                  Browse ARSHLAB&apos;s local knowledge core for compounds, ions, functional groups, and reaction templates.
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="w-fit rounded-full px-3 py-1">
              v{CHEMISTRY_KNOWLEDGE_CORE_META.version}
            </Badge>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Compounds" value={CHEMISTRY_KNOWLEDGE_CORE_META.counts.compounds} />
            <StatCard label="Ions" value={CHEMISTRY_KNOWLEDGE_CORE_META.counts.ions} />
            <StatCard label="Functional Groups" value={CHEMISTRY_KNOWLEDGE_CORE_META.counts.functionalGroups} />
            <StatCard label="Reaction Templates" value={CHEMISTRY_KNOWLEDGE_CORE_META.counts.reactionTemplates} />
          </div>
        </motion.div>

        <Card className="rounded-2xl border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Search className="h-5 w-5" />
              Search the Knowledge Core
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search ethanol, C2H5OH, alcohol, NO3-, esterification..."
              className="h-12 rounded-xl bg-background"
            />
            <div className="flex flex-wrap gap-2">
              {quickSearches.map((value) => (
                <Button key={value} type="button" variant="outline" size="sm" onClick={() => runQuickSearch(value)}>
                  {value}
                </Button>
              ))}
            </div>
            {query.trim() && (
              <div className="grid gap-2 md:grid-cols-2">
                {searchResults.slice(0, 12).map((result) => (
                  <button
                    key={`${result.kind}-${result.id}`}
                    type="button"
                    onClick={() => handleSearchResult(result)}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 text-left text-sm transition-colors hover:bg-secondary"
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{result.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">{result.description}</span>
                    </span>
                    <span className="shrink-0 rounded-full bg-secondary px-2 py-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                      {result.kind.replace("-", " ")}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-4">
            <div className="flex gap-2 overflow-x-auto pb-2">
              {sections.map((section) => {
                const Icon = section.icon
                return (
                  <Button
                    key={section.id}
                    type="button"
                    variant={activeSection === section.id ? "default" : "outline"}
                    className="shrink-0"
                    onClick={() => setActiveSection(section.id)}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    {section.label}
                  </Button>
                )
              })}
            </div>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">{sections.find((section) => section.id === activeSection)?.label}</CardTitle>
              </CardHeader>
              <CardContent>
                {activeSection === "compound" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {compoundResults.map((compound) => (
                      <button
                        key={compound.id}
                        type="button"
                        onClick={() => setSelectedCompoundId(compound.id)}
                        className={cn(
                          "rounded-xl border px-4 py-3 text-left transition-colors",
                          selectedCompound?.id === compound.id
                            ? "border-primary bg-primary/10"
                            : "border-border bg-secondary/20 hover:bg-secondary",
                        )}
                      >
                        <span className="block font-medium">{compound.name}</span>
                        <span className="mt-1 block text-xs text-muted-foreground">{compoundLabel(compound)}</span>
                      </button>
                    ))}
                  </div>
                )}

                {activeSection === "ion" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {ionResults.map((record) => (
                      <div key={record.id} className="rounded-xl border border-border bg-secondary/20 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium">{record.name}</p>
                          <Badge variant="outline">{record.charge}</Badge>
                        </div>
                        <p className="mt-1 font-mono text-sm">{record.formula}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{record.category}</p>
                      </div>
                    ))}
                  </div>
                )}

                {activeSection === "functional-group" && (
                  <div className="grid gap-3">
                    {functionalGroupResults.map((record) => (
                      <div key={record.id} className="rounded-xl border border-border bg-secondary/20 px-4 py-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="font-medium">{record.name}</p>
                          <Badge variant="outline" className="w-fit font-mono">
                            {record.identifier}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{record.description}</p>
                        <p className="mt-2 text-xs text-muted-foreground">Examples: {record.examples.join(", ")}</p>
                      </div>
                    ))}
                  </div>
                )}

                {activeSection === "reaction-template" && (
                  <div className="grid gap-3">
                    {reactionResults.map((record) => (
                      <div key={record.id} className="rounded-xl border border-border bg-secondary/20 px-4 py-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="font-medium capitalize">{record.type}</p>
                          <Badge variant="outline" className="w-fit">
                            template
                          </Badge>
                        </div>
                        <p className="mt-2 font-mono text-xs sm:text-sm">{record.generalForm}</p>
                        <p className="mt-2 text-sm text-muted-foreground">{record.description}</p>
                        {record.examples?.[0] && (
                          <p className="mt-2 text-xs text-muted-foreground">Example: {record.examples[0]}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {query.trim() && searchResults.length === 0 && (
                  <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                    No local chemistry records matched that search yet.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card className="h-fit rounded-2xl border-teal-500/20 bg-teal-500/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Beaker className="h-5 w-5" />
                Compound Viewer
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedCompound && (
                <>
                  <div>
                    <p className="text-2xl font-bold">{selectedCompound.name}</p>
                    <p className="mt-1 font-mono text-lg text-primary">{selectedCompound.formula}</p>
                  </div>
                  <div className="grid gap-3">
                    <InfoRow label="Molar mass" value={`${selectedCompound.molarMass.toFixed(3)} g/mol`} />
                    <InfoRow label="Category" value={selectedCompound.category} />
                    <InfoRow
                      label="Functional groups"
                      value={selectedCompound.functionalGroups.length ? selectedCompound.functionalGroups.join(", ") : "None listed"}
                    />
                  </div>
                  {selectedCompound.description && (
                    <p className="rounded-xl border border-border bg-background/70 p-3 text-sm text-muted-foreground">
                      {selectedCompound.description}
                    </p>
                  )}
                  {selectedCompound.aliases?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedCompound.aliases.slice(0, 8).map((alias) => (
                        <Badge key={alias} variant="secondary" className="rounded-full">
                          {alias}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </>
              )}
              <div className="rounded-xl border border-border bg-background/70 p-3 text-xs leading-relaxed text-muted-foreground">
                Registry hooks are local and deterministic, so future question generation, curriculum validation,
                compound lookup, and retrieval-assisted tutoring can use them without new API keys.
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="rounded-2xl">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">Future-ready chemistry core</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                The v3.1.0 layer is designed to expand toward larger compound libraries, spectroscopy data,
                ligand records, reaction databases, and RAG-assisted tutoring.
              </p>
            </div>
            <Button asChild variant="outline">
              <a href="/chemistry-hub">
                Chemistry Hub
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-4 py-3">
      <p className="font-mono text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/70 px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  )
}
