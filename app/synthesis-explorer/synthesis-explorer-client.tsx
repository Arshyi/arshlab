"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowDown, ArrowRight, Database, History, Route, Search, Shuffle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  findSynthesisPathway,
  getSynthesisExplorerStats,
  listSynthesisCompoundNodes,
  readSynthesisHistory,
  recordSynthesisPathway,
  resolveSynthesisCompound,
  synthesisExplorerHref,
} from "@/lib/synthesis/pathfinder"
import type { SynthesisExplorerStats, SynthesisPathwayResult } from "@/lib/synthesis/pathway-types"
import type { KnowledgeGraphNode } from "@/lib/knowledge-graph/graph-types"
import { cn } from "@/lib/utils"

const examplePairs = [
  { label: "Ethene to Ethanoic Acid", start: "ethene", target: "ethanoic-acid" },
  { label: "Ethanol to Ethyl Ethanoate", start: "ethanol", target: "ethyl-ethanoate" },
  { label: "HCl to Water", start: "hydrochloric-acid", target: "water" },
]

export function SynthesisExplorerClient() {
  const compounds = useMemo(() => listSynthesisCompoundNodes(), [])
  const [startId, setStartId] = useState("compound:ethene")
  const [targetId, setTargetId] = useState("compound:ethanoic-acid")
  const [query, setQuery] = useState("")
  const [result, setResult] = useState<SynthesisPathwayResult | null>(null)
  const [searched, setSearched] = useState(false)
  const [stats, setStats] = useState<SynthesisExplorerStats>(getSynthesisExplorerStats([]))

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const start = resolveSynthesisCompound(params.get("start"))
    const target = resolveSynthesisCompound(params.get("target"))
    if (start) setStartId(start.id)
    if (target) setTargetId(target.id)
    setStats(getSynthesisExplorerStats(readSynthesisHistory()))

    if (start && target && start.id !== target.id) {
      const next = findSynthesisPathway(start.id, target.id)
      setResult(next)
      setSearched(true)
      if (next) setStats(getSynthesisExplorerStats(recordSynthesisPathway(next)))
    }
  }, [])

  const filteredCompounds = useMemo(() => {
    const normalized = query.toLowerCase().trim()
    if (!normalized) return compounds
    return compounds.filter((node) =>
      [node.label, node.subtitle ?? "", node.description].some((value) => value.toLowerCase().includes(normalized)),
    )
  }, [compounds, query])

  function runPathwaySearch() {
    const next = findSynthesisPathway(startId, targetId)
    setResult(next)
    setSearched(true)
    if (next) setStats(getSynthesisExplorerStats(recordSynthesisPathway(next)))
  }

  function applyExample(start: string, target: string) {
    const startNode = resolveSynthesisCompound(start)
    const targetNode = resolveSynthesisCompound(target)
    if (!startNode || !targetNode) return
    setStartId(startNode.id)
    setTargetId(targetNode.id)
    const next = findSynthesisPathway(startNode.id, targetNode.id)
    setResult(next)
    setSearched(true)
    if (next) setStats(getSynthesisExplorerStats(recordSynthesisPathway(next)))
  }

  function swapCompounds() {
    setStartId(targetId)
    setTargetId(startId)
    setSearched(false)
    setResult(null)
  }

  const startNode = compounds.find((node) => node.id === startId)
  const targetNode = compounds.find((node) => node.id === targetId)

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <Metric label="Pathways explored" value={stats.pathwaysExplored} />
        <Metric label="Compounds available" value={compounds.length} />
        <Metric label="Longest pathway completed" value={stats.longestPathwayCompleted} />
      </div>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Search className="h-5 w-5" />
            Pathway Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] lg:items-end">
            <CompoundSelect label="Starting compound" value={startId} compounds={compounds} onChange={setStartId} />
            <Button type="button" variant="outline" className="rounded-xl" onClick={swapCompounds}>
              <Shuffle className="h-4 w-4" />
              Swap
            </Button>
            <CompoundSelect label="Target compound" value={targetId} compounds={compounds} onChange={setTargetId} />
          </div>

          <div className="flex flex-wrap gap-2">
            {examplePairs.map((example) => (
              <Button
                key={example.label}
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full"
                onClick={() => applyExample(example.start, example.target)}
              >
                {example.label}
              </Button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
            <div className="space-y-2">
              <Label htmlFor="compound-filter">Filter compound selector</Label>
              <Input
                id="compound-filter"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter available graph compounds..."
                className="rounded-xl"
              />
            </div>
            <Button type="button" onClick={runPathwaySearch} className="rounded-xl sm:self-end">
              <Route className="h-4 w-4" />
              Find Shortest Pathway
            </Button>
          </div>

          {query && (
            <div className="rounded-xl border border-border bg-secondary/20 p-3 text-sm text-muted-foreground">
              {filteredCompounds.length} compound{filteredCompounds.length === 1 ? "" : "s"} match that filter.
            </div>
          )}
        </CardContent>
      </Card>

      {result ? (
        <PathwayResult result={result} />
      ) : searched ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="p-8 text-center">
            <p className="font-semibold">No directed pathway found yet</p>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">
              The current local graph does not contain a directed synthesis route from {startNode?.label ?? "the start"} to {targetNode?.label ?? "the target"}. Try ethene to ethanoic acid, ethanol to ethyl ethanoate, or HCl to water.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5" />
              Available Graph Compounds
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid max-h-[420px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {filteredCompounds.map((compound) => (
                <button
                  key={compound.id}
                  type="button"
                  className={cn(
                    "rounded-xl border px-3 py-2 text-left transition-colors hover:bg-secondary",
                    compound.id === startId || compound.id === targetId ? "border-primary bg-primary/10" : "border-border",
                  )}
                  onClick={() => setStartId(compound.id)}
                >
                  <span className="block text-sm font-medium">{compound.label}</span>
                  <span className="block text-xs text-muted-foreground">{compound.subtitle}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5" />
              Local Pathway History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.recent.length > 0 ? (
              stats.recent.map((entry) => (
                <Link
                  key={entry.id}
                  href={synthesisExplorerHref(entry.startId, entry.targetId)}
                  className="block rounded-xl border border-border p-3 transition-colors hover:bg-secondary/50"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">
                      {entry.startLabel} {" -> "} {entry.targetLabel}
                    </p>
                    <Badge variant="secondary">{entry.totalSteps} steps</Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{entry.difficulty}</p>
                </Link>
              ))
            ) : (
              <p className="text-sm leading-relaxed text-muted-foreground">
                Your last 10 explored pathways will appear here. History stays in this browser.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function CompoundSelect({
  label,
  value,
  compounds,
  onChange,
}: {
  label: string
  value: string
  compounds: KnowledgeGraphNode[]
  onChange: (value: string) => void
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-input bg-background px-3 text-sm"
      >
        {compounds.map((compound) => (
          <option key={compound.id} value={compound.id}>
            {compound.label} {compound.subtitle ? `(${compound.subtitle})` : ""}
          </option>
        ))}
      </select>
    </div>
  )
}

function PathwayResult({ result }: { result: SynthesisPathwayResult }) {
  return (
    <div className="space-y-4">
      <Card className="rounded-2xl border-teal-500/20 bg-teal-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Route className="h-5 w-5" />
            Shortest Reaction Pathway
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 sm:grid-cols-4">
            <InfoTile label="Start compound" value={result.start.label} />
            <InfoTile label="Target compound" value={result.target.label} />
            <InfoTile label="Total steps" value={String(result.totalSteps)} />
            <InfoTile label="Estimated difficulty" value={result.difficulty} />
          </div>

          <div className="rounded-xl border border-border bg-background/80 p-4">
            <p className="text-sm font-medium">Intermediate compounds</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {result.intermediateCompounds.length > 0 ? (
                result.intermediateCompounds.map((compound) => (
                  <Badge key={compound.id} variant="outline" className="rounded-full">
                    {compound.label}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground">No compound intermediate in this shortest path.</span>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {result.nodes.map((node, index) => (
              <div key={`${node.id}-${index}`} className="space-y-3">
                <PathNodeCard node={node} />
                {index < result.nodes.length - 1 && (
                  <div className="flex items-center gap-3 pl-5 text-sm text-muted-foreground">
                    <ArrowDown className="h-4 w-4 text-primary" />
                    <span>{result.steps[index]?.reactionName ?? result.edges[index]?.label}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function PathNodeCard({ node }: { node: KnowledgeGraphNode }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="grid gap-4 p-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
        <div>
          <div className="flex flex-wrap gap-2">
            <Badge>{node.type === "practiceTopic" ? "Practice" : node.type}</Badge>
            <Badge variant="secondary">{node.curriculum}</Badge>
          </div>
          <p className="mt-2 text-lg font-semibold">{node.label}</p>
          {node.subtitle ? <p className="text-sm font-mono text-muted-foreground">{node.subtitle}</p> : null}
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{node.description}</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 md:w-72">
          {node.actions.map((action) => (
            <Button key={`${node.id}-${action.label}`} asChild variant="outline" size="sm" className="justify-between rounded-xl">
              <Link href={action.href}>
                {action.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
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

function InfoTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/80 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  )
}
