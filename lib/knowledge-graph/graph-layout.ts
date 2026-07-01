import type { ChemistryKnowledgeEdge } from "./knowledge-edge"
import type { ChemistryKnowledgeNode, ChemistryKnowledgeNodeType } from "./knowledge-node"

export interface KnowledgeGraphPosition {
  id: string
  x: number
  y: number
}

export interface KnowledgeGraphLayoutNode extends ChemistryKnowledgeNode {
  x: number
  y: number
  radius: number
  color: string
}

export interface KnowledgeGraphLayout {
  nodes: KnowledgeGraphLayoutNode[]
  edges: ChemistryKnowledgeEdge[]
  bounds: {
    width: number
    height: number
  }
}

const TYPE_COLORS: Record<ChemistryKnowledgeNodeType, string> = {
  compound: "#14b8a6",
  reaction: "#f97316",
  functionalGroup: "#22c55e",
  mechanism: "#ef4444",
  spectroscopy: "#06b6d4",
  irPeak: "#0891b2",
  nmrPeak: "#2563eb",
  massFragment: "#7c3aed",
  hybridization: "#a855f7",
  conjugation: "#ec4899",
  aromaticity: "#f59e0b",
  orbital: "#6366f1",
  moDiagram: "#4f46e5",
  homo: "#0f766e",
  lumo: "#7c2d12",
  bond: "#64748b",
  labTechnique: "#84cc16",
  examTopic: "#0ea5e9",
  curriculumTopic: "#10b981",
  formula: "#334155",
  property: "#475569",
  practice: "#db2777",
}

const TYPE_LANES: Record<ChemistryKnowledgeNodeType, number> = {
  compound: 0,
  functionalGroup: 1,
  hybridization: 2,
  orbital: 2,
  bond: 2,
  conjugation: 3,
  aromaticity: 3,
  homo: 4,
  lumo: 4,
  moDiagram: 4,
  spectroscopy: 5,
  irPeak: 5,
  nmrPeak: 5,
  massFragment: 5,
  mechanism: 6,
  reaction: 6,
  labTechnique: 7,
  formula: 7,
  curriculumTopic: 8,
  examTopic: 8,
  practice: 8,
  property: 7,
}

export function getKnowledgeNodeColor(type: ChemistryKnowledgeNodeType): string {
  return TYPE_COLORS[type] ?? "#0f766e"
}

export function layoutKnowledgeGraph(
  nodes: ChemistryKnowledgeNode[],
  edges: ChemistryKnowledgeEdge[],
): KnowledgeGraphLayout {
  const lanes = new Map<number, ChemistryKnowledgeNode[]>()

  for (const node of nodes) {
    const lane = TYPE_LANES[node.type] ?? 4
    lanes.set(lane, [...(lanes.get(lane) ?? []), node])
  }

  const laneEntries = [...lanes.entries()].sort(([a], [b]) => a - b)
  const positions = new Map<string, KnowledgeGraphPosition>()
  const laneSpacing = 175
  const rowSpacing = 115
  const horizontalPadding = 100
  const verticalPadding = 90
  let maxRows = 1

  for (const [lane, laneNodes] of laneEntries) {
    const sorted = [...laneNodes].sort((a, b) => a.label.localeCompare(b.label))
    maxRows = Math.max(maxRows, sorted.length)
    sorted.forEach((node, index) => {
      const wave = (index % 2) * 26
      positions.set(node.id, {
        id: node.id,
        x: horizontalPadding + lane * laneSpacing + wave,
        y: verticalPadding + index * rowSpacing,
      })
    })
  }

  const layoutNodes = nodes.map((node) => {
    const position = positions.get(node.id) ?? { id: node.id, x: horizontalPadding, y: verticalPadding }
    return {
      ...node,
      x: position.x,
      y: position.y,
      radius: node.type === "compound" ? 34 : 29,
      color: getKnowledgeNodeColor(node.type),
    }
  })

  return {
    nodes: layoutNodes,
    edges,
    bounds: {
      width: horizontalPadding * 2 + Math.max(1, laneEntries.length) * laneSpacing + 120,
      height: verticalPadding * 2 + maxRows * rowSpacing,
    },
  }
}

export function getGraphBounds(layout: KnowledgeGraphLayout): KnowledgeGraphLayout["bounds"] {
  return layout.bounds
}
