"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import { ArrowRight, Atom, Beaker, Database, FlaskConical, Search, Sigma, Waves } from "lucide-react"
import { ElementColorLegend, Molecule2DRenderer } from "@/components/chemistry/Molecule2DRenderer"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  CHEMISTRY_KNOWLEDGE_CORE_META,
  COMMON_IONS,
  KNOWLEDGE_COMPOUNDS,
  KNOWLEDGE_FUNCTIONAL_GROUPS,
  REACTION_RECORDS,
  REACTION_TEMPLATES_KNOWLEDGE,
  SPECTROSCOPY_RECORDS,
  getCompoundByFormula,
  getCompoundByName,
  getExampleStructureForSpectroscopy,
  getSpectroscopyMapping,
  getStructureForCompound,
  searchChemistry,
} from "@/lib/chemistry/registry"
import type { ChemistryRecordKind, ChemistrySearchResult, Compound } from "@/lib/chemistry/types"
import type { ReactionRecord } from "@/lib/chemistry/reaction-types"
import type { SpectroscopyRecord } from "@/lib/chemistry/spectroscopy-types"
import { cn } from "@/lib/utils"

type Section = ChemistryRecordKind

const sections: Array<{ id: Section; label: string; icon: React.ElementType }> = [
  { id: "compound", label: "Compounds", icon: Beaker },
  { id: "ion", label: "Ions", icon: Atom },
  { id: "functional-group", label: "Functional Groups", icon: Sigma },
  { id: "reaction-record", label: "Reaction Records", icon: FlaskConical },
  { id: "reaction-template", label: "Reaction Templates", icon: FlaskConical },
  { id: "spectroscopy", label: "Spectroscopy", icon: Waves },
]

const quickSearches = ["ethanol", "C2H5OH", "alcohol", "NO3-", "esterification", "carbonyl", "2250"]

function asCompound(record: ChemistrySearchResult["record"]): Compound | null {
  return "molarMass" in record ? record : null
}

function asSpectroscopy(record: ChemistrySearchResult["record"]): SpectroscopyRecord | null {
  return "irPeaks" in record && "peakRange" in record ? record : null
}

function asReactionRecord(record: ChemistrySearchResult["record"]): ReactionRecord | null {
  return "balancedEquation" in record && "reactionType" in record ? record : null
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
  const selectedStructure = selectedCompound ? getStructureForCompound(selectedCompound) : undefined

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

  const reactionRecordResults = useMemo(() => {
    if (!query.trim()) return REACTION_RECORDS.slice(0, 80)
    return searchResults
      .filter((result) => result.kind === "reaction-record")
      .map((result) => asReactionRecord(result.record))
      .filter((record): record is ReactionRecord => Boolean(record))
  }, [query, searchResults])

  const spectroscopyResults = useMemo(() => {
    if (!query.trim()) return SPECTROSCOPY_RECORDS
    return searchResults
      .filter((result) => result.kind === "spectroscopy")
      .map((result) => asSpectroscopy(result.record))
      .filter((record): record is SpectroscopyRecord => Boolean(record))
  }, [query, searchResults])

  function runQuickSearch(value: string) {
    setQuery(value)
    const match = getCompoundByName(value) ?? getCompoundByFormula(value)
    if (match) {
      setSelectedCompoundId(match.id)
      setActiveSection("compound")
    } else if (searchChemistry(value, { kinds: ["spectroscopy"], limit: 1 }).length > 0) {
      setActiveSection("spectroscopy")
    }
  }

  function handleSearchResult(result: ChemistrySearchResult) {
    setActiveSection(result.kind)
    const compound = asCompound(result.record)
    if (compound) setSelectedCompoundId(compound.id)
  }

  function clearSearch() {
    setQuery("")
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
                  Browse ARSHLAB&apos;s local knowledge core for compounds, ions, functional groups, reaction templates, and spectroscopy.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <Badge variant="secondary" className="w-fit rounded-full px-3 py-1">
                v{CHEMISTRY_KNOWLEDGE_CORE_META.version}
              </Badge>
              <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
                Database mode = no AI usage
              </Badge>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard label="Compounds" value={CHEMISTRY_KNOWLEDGE_CORE_META.counts.compounds} />
            <StatCard label="Ions" value={CHEMISTRY_KNOWLEDGE_CORE_META.counts.ions} />
            <StatCard label="Functional Groups" value={CHEMISTRY_KNOWLEDGE_CORE_META.counts.functionalGroups} />
            <StatCard label="Reaction Records" value={CHEMISTRY_KNOWLEDGE_CORE_META.counts.reactionRecords} />
            <StatCard label="2D Structures" value={CHEMISTRY_KNOWLEDGE_CORE_META.counts.molecularStructures} />
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

        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="min-w-0 space-y-4">
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

            <Card className="min-w-0 rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">{sections.find((section) => section.id === activeSection)?.label}</CardTitle>
              </CardHeader>
              <CardContent>
                {activeSection === "compound" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {compoundResults.length > 0 ? (
                      compoundResults.map((compound) => (
                        <button
                          key={compound.id}
                          type="button"
                          onClick={() => setSelectedCompoundId(compound.id)}
                          className={cn(
                            "min-w-0 rounded-xl border px-4 py-3 text-left transition-colors",
                            selectedCompound?.id === compound.id
                              ? "border-primary bg-primary/10"
                              : "border-border bg-secondary/20 hover:bg-secondary",
                          )}
                        >
                          <span className="block break-words font-medium">{compound.name}</span>
                          <span className="mt-1 block break-words text-xs text-muted-foreground">{compoundLabel(compound)}</span>
                        </button>
                      ))
                    ) : (
                      <EmptySectionState query={query} onClear={clearSearch} />
                    )}
                  </div>
                )}

                {activeSection === "ion" && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {ionResults.length > 0 ? ionResults.map((record) => (
                      <div key={record.id} className="rounded-xl border border-border bg-secondary/20 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium">{record.name}</p>
                          <Badge variant="outline">{record.charge}</Badge>
                        </div>
                        <p className="mt-1 font-mono text-sm">{record.formula}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{record.category}</p>
                      </div>
                    )) : <EmptySectionState query={query} onClear={clearSearch} />}
                  </div>
                )}

                {activeSection === "functional-group" && (
                  <div className="grid gap-3">
                    {functionalGroupResults.length > 0 ? functionalGroupResults.map((record) => (
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
                    )) : <EmptySectionState query={query} onClear={clearSearch} />}
                  </div>
                )}

                {activeSection === "reaction-template" && (
                  <div className="grid gap-3">
                    {reactionResults.length > 0 ? reactionResults.map((record) => (
                      <div key={record.id} className="rounded-xl border border-border bg-secondary/20 px-4 py-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="font-medium capitalize">{record.type}</p>
                          <Badge variant="outline" className="w-fit">
                            template
                          </Badge>
                        </div>
                        <p className="mt-2 break-words font-mono text-xs sm:text-sm">{record.generalForm}</p>
                        <p className="mt-2 text-sm text-muted-foreground">{record.description}</p>
                        {record.examples?.[0] && (
                          <p className="mt-2 text-xs text-muted-foreground">Example: {record.examples[0]}</p>
                        )}
                      </div>
                    )) : <EmptySectionState query={query} onClear={clearSearch} />}
                  </div>
                )}

                {activeSection === "reaction-record" && (
                  <div className="grid gap-3">
                    {reactionRecordResults.length > 0 ? reactionRecordResults.map((record) => (
                      <div key={record.id} className="rounded-xl border border-border bg-secondary/20 px-4 py-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="font-medium">{record.name}</p>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary">{record.category}</Badge>
                            <Badge variant="outline">{record.difficulty}</Badge>
                          </div>
                        </div>
                        <p className="mt-2 break-words font-mono text-xs sm:text-sm">{record.balancedEquation}</p>
                        <p className="mt-2 text-sm text-muted-foreground">{record.explanation}</p>
                      </div>
                    )) : <EmptySectionState query={query} onClear={clearSearch} />}
                  </div>
                )}

                {activeSection === "spectroscopy" && (
                  <div className="grid gap-3">
                    {spectroscopyResults.length > 0 ? spectroscopyResults.map((record) => (
                      <div key={record.id} className="rounded-xl border border-border bg-secondary/20 px-4 py-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <p className="font-medium">{record.name}</p>
                          <Badge variant="outline" className="w-fit">
                            {record.peakRange}
                          </Badge>
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">{record.notes}</p>
                        <div className="mt-3 overflow-x-auto rounded-xl border border-border bg-background/70">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-secondary/50 text-muted-foreground">
                              <tr>
                                <th className="px-3 py-2">Range</th>
                                <th className="px-3 py-2">Shape</th>
                                <th className="px-3 py-2">Strength</th>
                                <th className="px-3 py-2">Assignment</th>
                              </tr>
                            </thead>
                            <tbody>
                              {record.irPeaks.map((peak) => (
                                <tr key={peak.id} className="border-t border-border">
                                  <td className="px-3 py-2 font-mono">{peak.range}</td>
                                  <td className="px-3 py-2">{peak.shape}</td>
                                  <td className="px-3 py-2">{peak.strength}</td>
                                  <td className="px-3 py-2">{peak.assignment}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Examples: {record.exampleCompounds.join(", ")}
                        </p>
                        {getSpectroscopyMapping(record.id) ? (
                          <div className="mt-3 rounded-xl border border-teal-500/20 bg-teal-500/5 p-3">
                            <p className="text-xs font-medium uppercase text-muted-foreground">Visual mapping</p>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {getSpectroscopyMapping(record.id)?.assignment} maps to the highlighted{" "}
                              {getSpectroscopyMapping(record.id)?.highlightGroup} region in{" "}
                              {getExampleStructureForSpectroscopy(record.id)?.displayName ?? "an example compound"}.
                            </p>
                          </div>
                        ) : null}
                      </div>
                    )) : <EmptySectionState query={query} onClear={clearSearch} />}
                  </div>
                )}

              </CardContent>
            </Card>
          </div>

          <Card className="h-fit min-w-0 rounded-2xl border-teal-500/20 bg-teal-500/5">
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
                  <div>
                    {selectedStructure ? (
                      <Molecule2DRenderer
                        structure={selectedStructure}
                        highlightFunctionalGroup={selectedCompound.functionalGroups[0] ?? "all"}
                        showAtomLabels
                      />
                    ) : (
                      <div className="rounded-xl border border-dashed border-border bg-background/70 p-4 text-sm text-muted-foreground">
                        Structure not available yet.
                      </div>
                    )}
                  </div>
                  <ElementColorLegend compact />
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
                The v5.4.2 layer now includes local compounds, spectra, reactions, mechanisms, reaction conditions, lab techniques, solvers, formulas, curriculum roadmaps, context-aware deep links, adaptive study progress, reaction graph links, browser-local structure isolation, chemistry-aware label recognition, molecular graph reconstruction, calibrated aromatic-ring scanner hooks, and visual graph debugging, plus synthesis pathway traversal, spectroscopy explorer hooks, layout-polished periodic table hooks, and refined 2D structure hooks for
                larger libraries, pathway maps, reaction databases, mechanism trainers, and RAG-assisted tutoring.
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
      <p className="break-words text-sm font-medium">{value}</p>
    </div>
  )
}

function EmptySectionState({ query, onClear }: { query: string; onClear: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground sm:col-span-2">
      <p className="font-medium text-foreground">No records in this section match.</p>
      <p className="mt-1">{query.trim() ? "Clear the search or try another section." : "This local section has no records yet."}</p>
      {query.trim() ? (
        <Button type="button" variant="outline" size="sm" className="mt-4 rounded-xl" onClick={onClear}>
          Clear search
        </Button>
      ) : null}
    </div>
  )
}
