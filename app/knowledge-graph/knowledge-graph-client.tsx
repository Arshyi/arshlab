"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, BookOpenCheck, Focus, GraduationCap, Minus, Network, Plus, Search, Target } from "lucide-react"
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
import { cn } from "@/lib/utils"
import {
  findShortestEducationalPath,
  getAromaticityLearningPath,
  getHighlightedSubgraph,
  getInteractiveKnowledgeGraph,
  getKnowledgeNode,
} from "@/lib/knowledge-graph/knowledge-engine"
import { resolveKnowledgeNodeId, searchKnowledgeGraph } from "@/lib/knowledge-graph/knowledge-search"
import type { KnowledgeGraphLayoutNode } from "@/lib/knowledge-graph/graph-layout"
import type { ChemistryKnowledgeCurriculum, ChemistryKnowledgeDifficulty, ChemistryKnowledgeNode } from "@/lib/knowledge-graph/knowledge-node"

interface KnowledgeGraphClientProps {
  initialFocus?: string
  initialQuery?: string
  initialCurriculum?: string
  initialDifficulty?: string
}

const curricula: Array<ChemistryKnowledgeCurriculum | "All"> = [
  "All",
  "General Chemistry",
  "Organic Chemistry I",
  "Organic Chemistry II",
  "Spectroscopy",
  "Laboratory Skills",
]

const difficulties: Array<ChemistryKnowledgeDifficulty | "All"> = [
  "All",
  "Beginner",
  "Intermediate",
  "Advanced",
  "Graduate",
]

const MAX_RENDERED_NODES = 140
const MAX_RENDERED_EDGES = 280

function safeCurriculum(value: string | undefined): ChemistryKnowledgeCurriculum | "All" {
  return curricula.some((item) => item === value) ? (value as ChemistryKnowledgeCurriculum | "All") : "All"
}

function safeDifficulty(value: string | undefined): ChemistryKnowledgeDifficulty | "All" {
  return difficulties.some((item) => item === value) ? (value as ChemistryKnowledgeDifficulty | "All") : "All"
}

export function KnowledgeGraphClient({
  initialFocus,
  initialQuery,
  initialCurriculum,
  initialDifficulty,
}: KnowledgeGraphClientProps) {
  const resolvedInitialFocus = resolveKnowledgeNodeId(initialFocus)
  const invalidInitialFocus = Boolean(initialFocus && !resolvedInitialFocus)
  const [query, setQuery] = useState(initialQuery ?? "")
  const [curriculum, setCurriculum] = useState<ChemistryKnowledgeCurriculum | "All">(safeCurriculum(initialCurriculum))
  const [difficulty, setDifficulty] = useState<ChemistryKnowledgeDifficulty | "All">(safeDifficulty(initialDifficulty))
  const [selectedId, setSelectedId] = useState<string | undefined>(resolvedInitialFocus)
  const [expanded, setExpanded] = useState(true)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })

  const graph = useMemo(() => getInteractiveKnowledgeGraph({ curriculum, difficulty }), [curriculum, difficulty])
  const visibleNodeIds = useMemo(() => new Set(graph.nodes.map((node) => node.id)), [graph.nodes])

  useEffect(() => {
    if (selectedId && !visibleNodeIds.has(selectedId)) setSelectedId(undefined)
  }, [selectedId, visibleNodeIds])

  const searchResults = useMemo(
    () => searchKnowledgeGraph(query, { curriculum, difficulty, limit: 8 }),
    [curriculum, difficulty, query],
  )

  useEffect(() => {
    if (!selectedId && query.trim() && searchResults[0]) {
      setSelectedId(searchResults[0].id)
    }
  }, [query, searchResults, selectedId])

  const selected = selectedId ? getKnowledgeNode(selectedId) : undefined
  const highlighted = useMemo(() => getHighlightedSubgraph(selectedId), [selectedId])
  const highlightedIds = useMemo(() => {
    const ids = new Set<string>()
    if (highlighted.selected) ids.add(highlighted.selected.id)
    for (const neighbor of highlighted.neighbors) ids.add(neighbor.id)
    return ids
  }, [highlighted])

  const renderedNodeIds = useMemo(() => {
    if (expanded || !selectedId) return visibleNodeIds
    return highlightedIds
  }, [expanded, highlightedIds, selectedId, visibleNodeIds])

  const renderedEdges = useMemo(
    () => graph.edges.filter((edge) => renderedNodeIds.has(edge.from) && renderedNodeIds.has(edge.to)),
    [graph.edges, renderedNodeIds],
  )
  const graphPerformanceLimited =
    renderedNodeIds.size > MAX_RENDERED_NODES || renderedEdges.length > MAX_RENDERED_EDGES
  const visibleRenderedNodeIds = useMemo(() => {
    if (!graphPerformanceLimited) return renderedNodeIds
    return new Set([...renderedNodeIds].slice(0, MAX_RENDERED_NODES))
  }, [graphPerformanceLimited, renderedNodeIds])
  const visibleRenderedEdges = useMemo(
    () =>
      renderedEdges
        .filter((edge) => visibleRenderedNodeIds.has(edge.from) && visibleRenderedNodeIds.has(edge.to))
        .slice(0, MAX_RENDERED_EDGES),
    [renderedEdges, visibleRenderedNodeIds],
  )
  const selectedPath = selectedId ? findShortestEducationalPath(selectedId, "concept:aromaticity") : []
  const aromaticPath = getAromaticityLearningPath()
  const noSearchResults = query.trim().length > 0 && searchResults.length === 0

  function focusNode(node: ChemistryKnowledgeNode) {
    setSelectedId(node.id)
    const layoutNode = graph.layout.nodes.find((candidate) => candidate.id === node.id)
    if (layoutNode) {
      setPan({
        x: Math.round(460 - layoutNode.x),
        y: Math.round(260 - layoutNode.y),
      })
    }
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 grid gap-6 lg:grid-cols-[1fr_0.8fr] lg:items-center">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge className="rounded-full">ARSHLAB v13.0.0 bridge</Badge>
              <Badge variant="outline" className="rounded-full">Interactive SVG graph</Badge>
              <Badge variant="outline" className="rounded-full">Database mode = no AI usage</Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Interactive Chemistry Knowledge Graph</h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
              Navigate compounds, functional groups, mechanisms, spectroscopy, orbitals, formulas, lab techniques,
              practice topics, and curriculum concepts as one connected chemistry map.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Button asChild className="rounded-xl">
                <Link href="/structure-scanner">
                  Scan into the graph
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/interactive-learning">
                  Open Interactive Learning
                  <BookOpenCheck className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-xl">
                <Link href="/learning-paths">
                  Open Learning Paths
                  <GraduationCap className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
          <Card className="rounded-2xl border-teal-500/20 bg-teal-500/5">
            <CardContent className="grid gap-3 p-5 sm:grid-cols-2">
              <Metric label="Nodes" value={String(graph.metrics.nodes)} />
              <Metric label="Edges" value={String(graph.metrics.edges)} />
              <Metric label="Components" value={String(graph.metrics.connectedComponents)} />
              <Metric label="Average degree" value={String(graph.metrics.averageDegree)} />
              <Metric label="Coverage" value={`${graph.metrics.curriculumCoverage}%`} />
              <Metric label="Learning progress" value={`${graph.metrics.learningProgress}%`} />
            </CardContent>
          </Card>
        </section>

        <section className="mb-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_18rem_14rem]">
          <Card className="rounded-2xl">
            <CardContent className="p-4">
              <label className="mb-2 flex items-center gap-2 text-sm font-medium">
                <Search className="h-4 w-4" />
                Search the chemistry map
              </label>
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search benzene, SN2, carbonyl, HOMO, sp2..."
                className="h-11 rounded-xl"
              />
              {searchResults.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2" aria-label="Knowledge graph search results">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      type="button"
                      aria-label={`Focus ${result.label} in the knowledge graph`}
                      onClick={() => focusNode(result)}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs transition-colors",
                        selectedId === result.id ? "border-primary bg-primary text-primary-foreground" : "border-border bg-secondary/30 hover:bg-secondary",
                      )}
                    >
                      {result.label}
                    </button>
                  ))}
                </div>
              )}
              {noSearchResults && (
                <div className="mt-3 rounded-xl border border-dashed border-border bg-secondary/20 p-3 text-sm text-muted-foreground" role="status">
                  No graph node matched this search. Try a compound, mechanism, formula, functional group, or spectroscopy clue.
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="p-4">
              <label className="mb-2 block text-sm font-medium">Curriculum mode</label>
              <Select value={curriculum} onValueChange={(value) => setCurriculum(safeCurriculum(value))}>
                <SelectTrigger className="w-full rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {curricula.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card className="rounded-2xl">
            <CardContent className="p-4">
              <label className="mb-2 block text-sm font-medium">Difficulty</label>
              <Select value={difficulty} onValueChange={(value) => setDifficulty(safeDifficulty(value))}>
                <SelectTrigger className="w-full rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {difficulties.map((item) => (
                    <SelectItem key={item} value={item}>
                      {item}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </section>

        {(invalidInitialFocus || graphPerformanceLimited || graph.nodes.length === 0) && (
          <section className="mb-6" aria-live="polite">
            {invalidInitialFocus && (
              <Card className="rounded-2xl border-amber-500/30 bg-amber-500/10">
                <CardContent className="p-4 text-sm text-muted-foreground">
                  That graph focus link did not match a known node, so ARSHLAB opened the default knowledge map instead.
                </CardContent>
              </Card>
            )}
            {graphPerformanceLimited && (
              <Card className="mt-3 rounded-2xl border-teal-500/20 bg-teal-500/5">
                <CardContent className="p-4 text-sm text-muted-foreground">
                  Large graph safeguard active: ARSHLAB is rendering the first {MAX_RENDERED_NODES} nodes and {MAX_RENDERED_EDGES} edges. Use search or curriculum mode to narrow the view.
                </CardContent>
              </Card>
            )}
            {graph.nodes.length === 0 && (
              <Card className="mt-3 rounded-2xl border-dashed">
                <CardContent className="p-4 text-sm text-muted-foreground">
                  No graph nodes match the selected filters. Reset curriculum mode or difficulty to All.
                </CardContent>
              </Card>
            )}
          </section>
        )}

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <Card className="overflow-hidden rounded-2xl">
            <CardHeader className="border-b border-border">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <CardTitle className="flex items-center gap-2">
                  <Network className="h-5 w-5" />
                  Chemistry Map
                </CardTitle>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" className="rounded-full" onClick={() => setExpanded((value) => !value)}>
                    <Focus className="h-4 w-4" />
                    {expanded ? "Collapse to neighbors" : "Expand graph"}
                  </Button>
                  <Button variant="outline" size="icon-sm" aria-label="Zoom out" onClick={() => setZoom((value) => Math.max(0.55, Number((value - 0.1).toFixed(2))))}>
                    <Minus className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon-sm" aria-label="Zoom in" onClick={() => setZoom((value) => Math.min(1.7, Number((value + 0.1).toFixed(2))))}>
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon-sm" aria-label="Pan left" onClick={() => setPan((value) => ({ ...value, x: value.x + 70 }))}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon-sm" aria-label="Pan up" onClick={() => setPan((value) => ({ ...value, y: value.y + 70 }))}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon-sm" aria-label="Pan down" onClick={() => setPan((value) => ({ ...value, y: value.y - 70 }))}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon-sm" aria-label="Pan right" onClick={() => setPan((value) => ({ ...value, x: value.x - 70 }))}>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" className="rounded-full" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}>
                    Reset view
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-auto bg-secondary/20">
                <svg
                  role="img"
                  aria-label="Interactive chemistry knowledge graph"
                  className="min-h-[620px] min-w-[980px]"
                  viewBox={`0 0 ${graph.layout.bounds.width} ${graph.layout.bounds.height}`}
                >
                  <g transform={`translate(${pan.x} ${pan.y}) scale(${zoom})`}>
                    {visibleRenderedEdges.map((edge, index) => {
                      const from = graph.layout.nodes.find((node) => node.id === edge.from)
                      const to = graph.layout.nodes.find((node) => node.id === edge.to)
                      if (!from || !to) return null
                      return <GraphEdge key={edge.id} edge={edge} from={from} to={to} index={index} active={Boolean(selectedId && (edge.from === selectedId || edge.to === selectedId))} />
                    })}
                    {graph.layout.nodes.filter((node) => visibleRenderedNodeIds.has(node.id)).map((node) => (
                      <GraphNode
                        key={node.id}
                        node={node}
                        selected={selectedId === node.id}
                        dimmed={Boolean(selectedId && !highlightedIds.has(node.id))}
                        onClick={() => focusNode(node)}
                      />
                    ))}
                  </g>
                </svg>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <NodeDetail node={selected ?? null} />
            <PathCard title="Shortest educational path" nodes={selectedPath} empty="Select a node to show the shortest path toward aromaticity." />
            <PathCard title="I don't understand aromaticity" nodes={aromaticPath} empty="Aromaticity path is unavailable." />
          </div>
        </section>

        <section className="mt-6 xl:hidden">
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg">Mobile graph list</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              {graph.nodes.length > 0 ? graph.nodes.map((node) => (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => focusNode(node)}
                  className="rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-secondary"
                >
                  <p className="font-medium">{node.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{node.subtitle ?? node.type}</p>
                </button>
              )) : (
                <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                  No nodes match the selected graph filters.
                </p>
              )}
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/80 p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-2xl font-bold">{value}</p>
    </div>
  )
}

function GraphNode({
  node,
  selected,
  dimmed,
  onClick,
}: {
  node: KnowledgeGraphLayoutNode
  selected: boolean
  dimmed: boolean
  onClick: () => void
}) {
  return (
    <g
      tabIndex={0}
      role="button"
      aria-label={node.label}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onClick()
      }}
      className="cursor-pointer outline-none"
      opacity={dimmed ? 0.32 : 1}
    >
      <circle cx={node.x} cy={node.y} r={node.radius + (selected ? 6 : 0)} fill={selected ? "#ccfbf1" : "#ffffff"} stroke={selected ? "#0f766e" : "#cbd5e1"} strokeWidth={selected ? 4 : 1.5} />
      <circle cx={node.x} cy={node.y} r={node.radius} fill={node.color} opacity={0.95} />
      <text x={node.x} y={node.y - 3} textAnchor="middle" className="fill-white text-[11px] font-bold">
        {node.label.length > 14 ? `${node.label.slice(0, 13)}...` : node.label}
      </text>
      <text x={node.x} y={node.y + 12} textAnchor="middle" className="fill-white/90 text-[8px]">
        {node.type}
      </text>
    </g>
  )
}

function GraphEdge({
  edge,
  from,
  to,
  index,
  active,
}: {
  edge: { label: string }
  from: KnowledgeGraphLayoutNode
  to: KnowledgeGraphLayoutNode
  index: number
  active: boolean
}) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const distance = Math.max(1, Math.hypot(dx, dy))
  const nx = -dy / distance
  const ny = dx / distance
  const offset = ((index % 3) - 1) * 18
  const controlX = (from.x + to.x) / 2 + nx * offset
  const controlY = (from.y + to.y) / 2 + ny * offset
  const labelX = (from.x + to.x + controlX) / 3
  const labelY = (from.y + to.y + controlY) / 3

  return (
    <g opacity={active ? 1 : 0.46}>
      <path
        d={`M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`}
        fill="none"
        stroke={active ? "#0f766e" : "#94a3b8"}
        strokeWidth={active ? 3 : 1.5}
        strokeLinecap="round"
      />
      <rect x={labelX - 44} y={labelY - 11} width={88} height={22} rx={11} fill="#ffffff" stroke="#cbd5e1" />
      <text x={labelX} y={labelY + 4} textAnchor="middle" className="fill-slate-700 text-[8px] font-medium">
        {edge.label.length > 18 ? `${edge.label.slice(0, 17)}...` : edge.label}
      </text>
    </g>
  )
}

function NodeDetail({ node }: { node: ChemistryKnowledgeNode | null }) {
  if (!node) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="p-5">
          <p className="font-semibold">Select a concept</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Click any node to see its neighbors, deterministic explanation, and deep links into ARSHLAB tools.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-2xl border-teal-500/20 bg-teal-500/5">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>{node.label}</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{node.subtitle ?? node.type}</p>
          </div>
          <Badge variant="secondary" className="rounded-full">{node.difficulty}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed text-muted-foreground">{node.description}</p>
        <div className="flex flex-wrap gap-2">
          {node.curriculum.map((item) => (
            <Badge key={item} variant="outline" className="rounded-full">
              {item}
            </Badge>
          ))}
        </div>
        <div className="grid gap-2">
          <Button asChild variant="outline" className="h-auto justify-between rounded-xl px-3 py-3 text-left">
            <Link href={`/learning-paths?focus=${encodeURIComponent(node.id)}`}>
              <span className="min-w-0 truncate">Place in Learning Path</span>
              <ArrowRight className="h-4 w-4 shrink-0" />
            </Link>
          </Button>
          {node.actions.map((action) => (
            <Button key={`${node.id}-${action.href}-${action.label}`} asChild variant="outline" className="h-auto justify-between rounded-xl px-3 py-3 text-left">
              <Link href={action.href}>
                <span className="min-w-0 truncate">{action.label}</span>
                <ArrowRight className="h-4 w-4 shrink-0" />
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function PathCard({ title, nodes, empty }: { title: string; nodes: ChemistryKnowledgeNode[]; empty: string }) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          {title.includes("aromaticity") ? <GraduationCap className="h-5 w-5" /> : <Target className="h-5 w-5" />}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {nodes.length ? (
          <ol className="space-y-2">
            {nodes.map((node, index) => (
              <li key={`${title}-${node.id}`} className="flex gap-3 rounded-xl border border-border bg-secondary/20 p-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                  {index + 1}
                </span>
                <div>
                  <p className="text-sm font-medium">{node.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{node.subtitle ?? node.description}</p>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm text-muted-foreground">{empty}</p>
        )}
      </CardContent>
    </Card>
  )
}
