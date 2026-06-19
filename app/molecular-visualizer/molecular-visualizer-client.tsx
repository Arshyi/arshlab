"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRightLeft, Database, Network, Search, Sparkles, Waves } from "lucide-react"
import { CompoundPathwayGraph } from "@/components/chemistry/CompoundPathwayGraph"
import { ElementColorLegend, Molecule2DRenderer } from "@/components/chemistry/Molecule2DRenderer"
import { ReactionDiagram } from "@/components/chemistry/ReactionDiagram"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { COMPOUND_PATHWAYS, MOLECULAR_STRUCTURES } from "@/lib/chemistry/structures"
import { REACTION_RECORDS } from "@/lib/chemistry/reactions"
import { deepLinkSlug, resolveCompoundDeepLink } from "@/lib/deep-links"
import { synthesisExplorerHref } from "@/lib/synthesis/pathfinder"
import {
  getCompoundSpectroscopyProfile,
  getExpectedIrSignals,
  spectroscopyExplorerHref,
} from "@/lib/spectroscopy/spectroscopy-engine"
import type { ReactionRecord } from "@/lib/chemistry/reaction-types"
import type { MoleculeDisplayMode } from "@/lib/chemistry/visualization-types"
import { cn } from "@/lib/utils"

const quickCompounds = ["ethanol", "ethanoic acid", "acetone", "ethyl ethanoate", "benzene", "phenol", "aspirin"]
const displayModes: Array<{ value: MoleculeDisplayMode; label: string }> = [
  { value: "ball-and-stick", label: "Ball-and-Stick" },
  { value: "condensed", label: "Condensed Formula" },
  { value: "skeletal", label: "Skeletal Organic" },
]
const reactionExampleIds = [
  "rxn-organic-ethanol-ethanoic-acid",
  "rxn-organic-ethene-bromine",
  "rxn-neutralization-hcl-naoh",
  "rxn-combustion-methane",
]

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "")
}

export function MolecularVisualizerClient() {
  const [query, setQuery] = useState("")
  const [selectedId, setSelectedId] = useState("ethanol")
  const [highlight, setHighlight] = useState("all")
  const [displayMode, setDisplayMode] = useState<MoleculeDisplayMode>("ball-and-stick")
  const [pathwayId, setPathwayId] = useState(COMPOUND_PATHWAYS[0]?.id ?? "")
  const [reactionId, setReactionId] = useState(reactionExampleIds[0])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const requestedCompound = resolveCompoundDeepLink(params.get("compound"))
    if (!requestedCompound) return

    const requestedSlug = deepLinkSlug(requestedCompound)
    const match = MOLECULAR_STRUCTURES.find(
      (structure) =>
        structure.id === requestedCompound ||
        structure.compoundId === requestedCompound ||
        deepLinkSlug(structure.id) === requestedSlug ||
        deepLinkSlug(structure.compoundId) === requestedSlug ||
        deepLinkSlug(structure.displayName) === requestedSlug,
    )
    if (match) {
      setSelectedId(match.id)
      setQuery(match.displayName)
      setHighlight("all")
    }
  }, [])

  const filteredStructures = useMemo(() => {
    const trimmed = normalize(query)
    if (!trimmed) return MOLECULAR_STRUCTURES
    return MOLECULAR_STRUCTURES.filter((structure) =>
      [structure.displayName, structure.formula, structure.compoundId, ...(structure.notes ?? [])].some((value) =>
        normalize(value).includes(trimmed),
      ),
    )
  }, [query])

  const selectedStructure =
    MOLECULAR_STRUCTURES.find((structure) => structure.id === selectedId) ??
    filteredStructures[0] ??
    MOLECULAR_STRUCTURES[0]
  const availableHighlights = selectedStructure?.functionalGroupHighlights ?? []
  const spectroscopyProfile = getCompoundSpectroscopyProfile(selectedStructure?.compoundId ?? selectedStructure?.id)
  const expectedIrSignals = getExpectedIrSignals(spectroscopyProfile)
  const reaction =
    REACTION_RECORDS.find((record) => record.id === reactionId) ??
    REACTION_RECORDS.find((record) => reactionExampleIds.includes(record.id)) ??
    REACTION_RECORDS[0]
  const reactionExamples = reactionExampleIds
    .map((id) => REACTION_RECORDS.find((record) => record.id === id))
    .filter((record): record is ReactionRecord => Boolean(record))

  useEffect(() => {
    document.getElementById("molecule-viewer")?.scrollIntoView({ block: "start" })
  }, [selectedStructure?.id])

  function chooseCompound(value: string) {
    const match = MOLECULAR_STRUCTURES.find(
      (structure) => normalize(structure.displayName) === normalize(value) || normalize(structure.id) === normalize(value),
    )
    if (match) {
      setSelectedId(match.id)
      setHighlight("all")
      setQuery(value)
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="rounded-3xl border border-border bg-card p-6 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Network className="h-6 w-6" />
              </div>
              <div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">ARSHLAB v4.9.0</Badge>
                  <Badge variant="outline">Database mode = no AI usage</Badge>
                </div>
                <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Molecular Visualizer</h1>
                <p className="mt-2 max-w-3xl text-muted-foreground">
                  Explore deterministic 2D molecular sketches, functional group highlights, reaction diagrams, and compound pathways.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/chemistry-database">Open Database</Link>
              </Button>
              <Button asChild className="rounded-xl">
                <Link href={synthesisExplorerHref(selectedStructure?.compoundId ?? selectedStructure?.id)}>
                  Explore Synthesis
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-xl">
                <Link href={spectroscopyExplorerHref({ compound: selectedStructure?.compoundId ?? selectedStructure?.id })}>
                  Expected Spectroscopy
                </Link>
              </Button>
            </div>
          </div>
        </motion.section>

        <section className="grid min-w-0 gap-6 xl:grid-cols-[300px_minmax(0,1fr)_340px]">
          <Card className="h-fit min-w-0 rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Search className="h-5 w-5" />
                Compound Selector
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search ethanol, benzene, aspirin..."
                className="h-11 rounded-xl"
              />
              <div className="flex flex-wrap gap-2">
                {quickCompounds.map((compound) => (
                  <Button key={compound} type="button" variant="outline" size="sm" onClick={() => chooseCompound(compound)}>
                    {compound}
                  </Button>
                ))}
              </div>
              <div className="grid max-h-[420px] gap-2 overflow-y-auto pr-1">
                {filteredStructures.length > 0 ? (
                  filteredStructures.map((structure) => (
                    <button
                      key={structure.id}
                      type="button"
                      onClick={() => {
                        setSelectedId(structure.id)
                        setHighlight("all")
                      }}
                      className={cn(
                        "min-w-0 rounded-xl border px-3 py-2 text-left transition-colors",
                        selectedStructure?.id === structure.id
                          ? "border-primary bg-primary/10"
                          : "border-border bg-secondary/20 hover:bg-secondary",
                      )}
                    >
                      <span className="block break-words text-sm font-medium">{structure.displayName}</span>
                      <span className="mt-0.5 block break-words font-mono text-xs text-muted-foreground">{structure.formula}</span>
                    </button>
                  ))
                ) : (
                  <div className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                    <p className="font-medium text-foreground">No structure matched that search.</p>
                    <p className="mt-1">Try ethanol, benzene, aspirin, or another local structure.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="min-w-0 space-y-6">
            <Card id="molecule-viewer" className="scroll-mt-24 rounded-2xl border-teal-500/20 bg-teal-500/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Sparkles className="h-5 w-5" />
                  Structure Workspace
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {displayModes.map((mode) => (
                    <Button
                      key={mode.value}
                      type="button"
                      variant={displayMode === mode.value ? "default" : "outline"}
                      size="sm"
                      onClick={() => setDisplayMode(mode.value)}
                    >
                      {mode.label}
                    </Button>
                  ))}
                </div>
                {selectedStructure ? (
                  <Molecule2DRenderer
                    structure={selectedStructure}
                    highlightFunctionalGroup={highlight}
                    displayMode={displayMode}
                    showAtomLabels
                    className="bg-background/80"
                  />
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
                    Structure not available yet.
                  </div>
                )}
                {availableHighlights.length ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant={highlight === "all" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setHighlight("all")}
                    >
                      All highlights
                    </Button>
                    {availableHighlights.map((item) => (
                      <Button
                        key={item.id}
                        type="button"
                        variant={highlight === item.group ? "default" : "outline"}
                        size="sm"
                        onClick={() => setHighlight(item.group)}
                      >
                        {item.label}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl border border-border bg-background/70 p-3 text-sm text-muted-foreground">
                    No functional group highlight is attached to this structure yet.
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Waves className="h-5 w-5" />
                  Expected Spectroscopy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {spectroscopyProfile ? (
                  <>
                    <p className="text-sm leading-relaxed text-muted-foreground">{spectroscopyProfile.notes}</p>
                    <div className="grid gap-3 md:grid-cols-2">
                      <SpectraMiniList title="IR" items={expectedIrSignals.map((signal) => `${signal.signal}: ${signal.range}`)} />
                      <SpectraMiniList
                        title="1H NMR"
                        items={spectroscopyProfile.protonNmr.map((signal) => `${signal.environment}: ${signal.shiftRange}`)}
                      />
                      <SpectraMiniList
                        title="13C NMR"
                        items={spectroscopyProfile.carbonNmr.map((signal) => `${signal.environment}: ${signal.shiftRange}`)}
                      />
                      <SpectraMiniList
                        title="Mass Spec"
                        items={spectroscopyProfile.massSpec.map((signal) => `${signal.peak} m/z ${signal.mz}`)}
                      />
                    </div>
                    <Button asChild className="rounded-xl">
                      <Link href={spectroscopyExplorerHref({ compound: spectroscopyProfile.compoundId })}>
                        Open Spectroscopy Explorer
                      </Link>
                    </Button>
                  </>
                ) : (
                  <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                    No expected spectra profile is attached to this local structure yet.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ArrowRightLeft className="h-5 w-5" />
                  Reaction Diagram Example
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {reactionExamples.map((record) => (
                    <Button
                      key={record.id}
                      type="button"
                      variant={reaction?.id === record.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setReactionId(record.id)}
                    >
                      {record.name}
                    </Button>
                  ))}
                </div>
                {reaction ? <ReactionDiagram reaction={reaction} compact /> : null}
              </CardContent>
            </Card>
          </div>

          <Card className="h-fit min-w-0 rounded-2xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="h-5 w-5" />
                Visual Data
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <InfoRow label="Structure records" value={String(MOLECULAR_STRUCTURES.length)} />
              <InfoRow
                label="Current highlights"
                value={availableHighlights.length ? availableHighlights.map((item) => item.label).join(", ") : "None yet"}
              />
              <InfoRow label="Pathway examples" value={String(COMPOUND_PATHWAYS.length)} />
              <ElementColorLegend compact />
              <p className="rounded-xl border border-border bg-secondary/20 p-3 text-xs leading-relaxed text-muted-foreground">
                Structures are simplified educational sketches. They are meant to show connectivity and functional groups, not exact bond lengths or 3D geometry.
              </p>
            </CardContent>
          </Card>
        </section>

        <Card id="pathways" className="rounded-2xl border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Network className="h-5 w-5" />
              Visual Reaction Pathways
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {COMPOUND_PATHWAYS.map((pathway) => (
                <Button
                  key={pathway.id}
                  type="button"
                  variant={pathwayId === pathway.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPathwayId(pathway.id)}
                >
                  {pathway.title}
                </Button>
              ))}
            </div>
            <CompoundPathwayGraph pathwayId={pathwayId} compact />
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/20 px-3 py-2">
      <p className="text-xs font-medium uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-medium">{value}</p>
    </div>
  )
}

function SpectraMiniList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-border bg-background/80 p-3">
      <p className="text-sm font-semibold">{title}</p>
      <div className="mt-2 space-y-1">
        {items.length ? (
          items.slice(0, 3).map((item) => (
            <p key={item} className="text-xs leading-relaxed text-muted-foreground">
              {item}
            </p>
          ))
        ) : (
          <p className="text-xs text-muted-foreground">No local signals listed yet.</p>
        )}
      </div>
    </div>
  )
}
