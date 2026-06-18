"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, Database, Filter, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import {
  CHEMISTRY_KNOWLEDGE_GRAPH,
  filterKnowledgeGraph,
  getKnowledgeGraphMetrics,
  getKnowledgeGraphNode,
} from "@/lib/knowledge-graph/chemistry-graph"
import type {
  KnowledgeGraphCurriculum,
  KnowledgeGraphEdge,
  KnowledgeGraphNode,
  KnowledgeGraphNodeType,
  KnowledgeGraphPathway,
} from "@/lib/knowledge-graph/graph-types"
import { cn } from "@/lib/utils"

const curriculumFilters: Array<KnowledgeGraphCurriculum | "All"> = [
  "All",
  "General Chemistry",
  "Organic Chemistry",
]

const nodeStyles: Record<KnowledgeGraphNodeType, string> = {
  compound: "border-teal-500/40 bg-teal-500/10 text-teal-900 dark:text-teal-100",
  functionalGroup: "border-emerald-500/40 bg-emerald-500/10 text-emerald-900 dark:text-emerald-100",
  reaction: "border-blue-500/40 bg-blue-500/10 text-blue-900 dark:text-blue-100",
  mechanism: "border-violet-500/40 bg-violet-500/10 text-violet-900 dark:text-violet-100",
  formula: "border-amber-500/40 bg-amber-500/10 text-amber-900 dark:text-amber-100",
  solver: "border-rose-500/40 bg-rose-500/10 text-rose-900 dark:text-rose-100",
  practiceTopic: "border-primary/40 bg-primary/10 text-foreground",
}

const nodeLabels: Record<KnowledgeGraphNodeType, string> = {
  compound: "Compound",
  functionalGroup: "Functional Group",
  reaction: "Reaction",
  mechanism: "Mechanism",
  formula: "Formula",
  solver: "Solver",
  practiceTopic: "Practice",
}

const GRAPH_X_SCALE = 1.35
const NODE_WIDTH = 176
const NODE_HEIGHT = 84
const EDGE_GAP = 14

function nodeFrame(node: KnowledgeGraphNode) {
  return {
    x: Math.round(node.x * GRAPH_X_SCALE),
    y: node.y,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
  }
}

function nodeCenter(node: KnowledgeGraphNode) {
  const frame = nodeFrame(node)
  return {
    x: frame.x + frame.width / 2,
    y: frame.y + frame.height / 2,
  }
}

function endpointOutsideNode(
  node: KnowledgeGraphNode,
  toward: { x: number; y: number },
) {
  const center = nodeCenter(node)
  const dx = toward.x - center.x
  const dy = toward.y - center.y
  const distance = Math.hypot(dx, dy) || 1
  const unitX = dx / distance
  const unitY = dy / distance
  const scaleX = Math.abs(unitX) > 0.001 ? NODE_WIDTH / 2 / Math.abs(unitX) : Number.POSITIVE_INFINITY
  const scaleY = Math.abs(unitY) > 0.001 ? NODE_HEIGHT / 2 / Math.abs(unitY) : Number.POSITIVE_INFINITY
  const boundary = Math.min(scaleX, scaleY)

  return {
    x: center.x + unitX * (boundary + EDGE_GAP),
    y: center.y + unitY * (boundary + EDGE_GAP),
  }
}

function edgeCurve(edge: KnowledgeGraphEdge, nodesById: Map<string, KnowledgeGraphNode>) {
  const from = nodesById.get(edge.from)
  const to = nodesById.get(edge.to)
  if (!from || !to) return null

  const fromCenter = nodeCenter(from)
  const toCenter = nodeCenter(to)
  const start = endpointOutsideNode(from, toCenter)
  const end = endpointOutsideNode(to, fromCenter)
  const dx = end.x - start.x
  const dy = end.y - start.y
  const length = Math.hypot(dx, dy) || 1
  const normal = { x: -dy / length, y: dx / length }
  const bendSeed = edge.id.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const direction = bendSeed % 2 === 0 ? 1 : -1
  const curveAmount = Math.min(52, Math.max(26, length * 0.12))
  const control = {
    x: start.x + dx / 2 + normal.x * curveAmount * direction,
    y: start.y + dy / 2 + normal.y * curveAmount * direction,
  }
  const label = {
    x: start.x * 0.25 + control.x * 0.5 + end.x * 0.25,
    y: start.y * 0.25 + control.y * 0.5 + end.y * 0.25,
  }

  return {
    path: `M ${start.x.toFixed(1)} ${start.y.toFixed(1)} Q ${control.x.toFixed(1)} ${control.y.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`,
    label,
  }
}

export function ChemistryKnowledgeGraph() {
  const metrics = getKnowledgeGraphMetrics()
  const [query, setQuery] = useState("")
  const [curriculum, setCurriculum] = useState<KnowledgeGraphCurriculum | "All">("All")
  const [selectedId, setSelectedId] = useState(CHEMISTRY_KNOWLEDGE_GRAPH.nodes[0]?.id ?? "")

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const focus = params.get("focus")
    const focusedNode = getKnowledgeGraphNode(focus)
    if (focusedNode) {
      setSelectedId(focusedNode.id)
      setCurriculum(focusedNode.curriculum === "Both" ? "All" : focusedNode.curriculum)
    }
    const initialQuery = params.get("query")
    if (initialQuery) setQuery(initialQuery)
  }, [])

  const graph = useMemo(() => filterKnowledgeGraph({ query, curriculum }), [curriculum, query])
  const nodesById = useMemo(() => new Map(graph.nodes.map((node) => [node.id, node])), [graph.nodes])
  const selected = nodesById.get(selectedId) ?? graph.nodes[0] ?? CHEMISTRY_KNOWLEDGE_GRAPH.nodes[0]

  useEffect(() => {
    if (selected && !nodesById.has(selectedId)) setSelectedId(selected.id)
  }, [nodesById, selected, selectedId])

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label="Graph nodes" value={metrics.nodes} />
        <Metric label="Graph edges" value={metrics.edges} />
        <Metric label="Pathways" value={metrics.pathways} />
        <Metric label="Linked tools" value={metrics.linkedTools} />
      </div>

      <Card className="rounded-2xl border-primary/20 bg-primary/5">
        <CardContent className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search ethanol, oxidation, pH, stoichiometry, SN1..."
                className="h-12 rounded-xl bg-background pl-9"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {curriculumFilters.map((item) => (
                <Button
                  key={item}
                  type="button"
                  size="sm"
                  variant={curriculum === item ? "default" : "outline"}
                  className="rounded-full"
                  onClick={() => setCurriculum(item)}
                >
                  <Filter className="h-4 w-4" />
                  {item}
                </Button>
              ))}
            </div>
          </div>
          <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
            Database mode = no AI usage
          </Badge>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="hidden min-w-0 rounded-2xl lg:block">
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-3 text-lg">
              <span>Chemistry Knowledge Graph</span>
              <Badge variant="outline">{graph.nodes.length} visible nodes</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {graph.nodes.length === 0 ? (
              <EmptyGraph />
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-border bg-background/80">
                <div className="relative h-[1240px] min-w-[1980px]">
                  <svg className="pointer-events-none absolute inset-0 z-0 h-full w-full" aria-hidden="true">
                    <defs>
                      <marker
                        id="graph-arrow"
                        markerWidth="10"
                        markerHeight="10"
                        refX="8"
                        refY="3"
                        orient="auto"
                        markerUnits="strokeWidth"
                      >
                        <path d="M0,0 L0,6 L9,3 z" className="fill-primary/60" />
                      </marker>
                    </defs>
                    {graph.edges.map((edge) => {
                      const curve = edgeCurve(edge, nodesById)
                      if (!curve) return null
                      return (
                        <path
                          key={edge.id}
                          d={curve.path}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          className="text-primary/45"
                          markerEnd="url(#graph-arrow)"
                        />
                      )
                    })}
                  </svg>

                  {graph.edges.map((edge) => {
                    const curve = edgeCurve(edge, nodesById)
                    if (!curve) return null
                    return (
                      <span
                        key={`${edge.id}-label`}
                        className="absolute z-10 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-border bg-background px-2.5 py-1 text-[10px] font-semibold text-muted-foreground shadow-sm"
                        style={{ left: curve.label.x, top: curve.label.y }}
                      >
                        {edge.label}
                      </span>
                    )
                  })}

                  {graph.nodes.map((node) => (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => setSelectedId(node.id)}
                      className={cn(
                        "absolute z-20 h-[84px] w-44 rounded-2xl border p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
                        nodeStyles[node.type],
                        selected?.id === node.id && "z-30 ring-2 ring-primary ring-offset-2 ring-offset-background",
                      )}
                      style={{ left: nodeFrame(node).x, top: nodeFrame(node).y }}
                    >
                      <span className="block text-xs font-medium uppercase opacity-70">{nodeLabels[node.type]}</span>
                      <span className="mt-1 block text-sm font-bold leading-tight">{node.label}</span>
                      {node.subtitle ? <span className="mt-1 block text-xs opacity-75">{node.subtitle}</span> : null}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          <NodeDetail node={selected} />
          <div className="hidden lg:block">
            <PathwayList pathways={graph.pathways} nodesById={nodesById} onSelect={setSelectedId} />
          </div>
        </div>
      </div>

      <MobilePathways pathways={graph.pathways} nodesById={nodesById} onSelect={setSelectedId} />
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

function EmptyGraph() {
  return (
    <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
      <p className="font-medium text-foreground">No graph nodes matched that search.</p>
      <p className="mt-1">Try ethanol, pH, oxidation, alkene, stoichiometry, neutralization, or formula.</p>
    </div>
  )
}

function NodeDetail({ node }: { node: KnowledgeGraphNode | undefined }) {
  if (!node) {
    return (
      <Card className="rounded-2xl border-dashed">
        <CardContent className="p-6 text-sm text-muted-foreground">Select a graph node to inspect it.</CardContent>
      </Card>
    )
  }

  return (
    <Card className="rounded-2xl border-teal-500/20 bg-teal-500/5">
      <CardHeader>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap gap-2">
              <Badge>{nodeLabels[node.type]}</Badge>
              <Badge variant="secondary">{node.curriculum}</Badge>
            </div>
            <CardTitle className="mt-3 text-2xl">{node.label}</CardTitle>
            {node.subtitle ? <p className="mt-1 text-sm font-medium text-muted-foreground">{node.subtitle}</p> : null}
          </div>
          <Badge variant="outline" className="w-fit rounded-full">
            {node.pathwayIds.length} pathway{node.pathwayIds.length === 1 ? "" : "s"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm leading-relaxed text-muted-foreground">{node.description}</p>
        <div className="grid gap-2 sm:grid-cols-2">
          {node.actions.map((item) => (
            <Button key={`${node.id}-${item.label}-${item.href}`} asChild variant="outline" className="justify-between rounded-xl">
              <Link href={item.href}>
                {item.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function PathwayList({
  pathways,
  nodesById,
  onSelect,
}: {
  pathways: KnowledgeGraphPathway[]
  nodesById: Map<string, KnowledgeGraphNode>
  onSelect: (id: string) => void
}) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Database className="h-5 w-5" />
          Visible Pathways
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {pathways.length > 0 ? (
          pathways.map((pathway) => (
            <div key={pathway.id} className="rounded-xl border border-border bg-secondary/20 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <p className="font-semibold">{pathway.title}</p>
                <Badge variant="outline">{pathway.curriculum}</Badge>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{pathway.description}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {pathway.nodeIds
                  .map((id) => nodesById.get(id))
                  .filter((node): node is KnowledgeGraphNode => Boolean(node))
                  .map((node) => (
                    <button
                      key={`${pathway.id}-${node.id}`}
                      type="button"
                      onClick={() => onSelect(node.id)}
                      className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                    >
                      {node.label}
                    </button>
                  ))}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            No pathways visible for this filter.
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function MobilePathways({
  pathways,
  nodesById,
  onSelect,
}: {
  pathways: KnowledgeGraphPathway[]
  nodesById: Map<string, KnowledgeGraphNode>
  onSelect: (id: string) => void
}) {
  return (
    <div className="space-y-4 lg:hidden">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Pathway Cards</h2>
        <Badge variant="outline">Mobile view</Badge>
      </div>
      {pathways.length > 0 ? (
        pathways.map((pathway) => (
          <Card key={pathway.id} className="rounded-2xl">
            <CardContent className="space-y-4 p-5">
              <div>
                <p className="font-semibold">{pathway.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{pathway.description}</p>
              </div>
              <div className="space-y-2">
                {pathway.nodeIds
                  .map((id) => nodesById.get(id))
                  .filter((node): node is KnowledgeGraphNode => Boolean(node))
                  .map((node, index) => (
                    <button
                      key={`${pathway.id}-mobile-${node.id}`}
                      type="button"
                      onClick={() => onSelect(node.id)}
                      className={cn("w-full rounded-xl border p-3 text-left", nodeStyles[node.type])}
                    >
                      <span className="text-xs font-medium uppercase opacity-70">
                        {index + 1}. {nodeLabels[node.type]}
                      </span>
                      <span className="mt-1 block font-semibold">{node.label}</span>
                      {node.subtitle ? <span className="mt-1 block text-xs opacity-75">{node.subtitle}</span> : null}
                    </button>
                  ))}
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        <EmptyGraph />
      )}
    </div>
  )
}
