import type { MolecularGraph } from "../vision/molecular-graph"
import type { ChemicalPrimitive, ChemicalPrimitiveType, CompilerBox, VisualToken } from "./compiler-types"

function center(box: CompilerBox): { x: number; y: number } {
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

function primitiveTypeForAtom(element: string | undefined): ChemicalPrimitiveType {
  if (element === "C") return "carbon-atom"
  if (element === "O") return "oxygen-atom"
  if (element === "N") return "nitrogen-atom"
  return "unknown-atom"
}

function primitiveTypeForBond(order: 1 | 2 | 3): ChemicalPrimitiveType {
  if (order === 3) return "triple-bond"
  if (order === 2) return "double-bond"
  return "single-bond"
}

function atomPrimitiveFromGraph(node: MolecularGraph["nodes"][number]): ChemicalPrimitive {
  const radius = node.labelBounds ? Math.max(node.labelBounds.width, node.labelBounds.height) / 2 : 5
  return {
    id: `atom-${node.id}`,
    type: primitiveTypeForAtom(node.inferredElement),
    sourceTokenIds: [`graph-atom-${node.id}`],
    confidence: node.confidence,
    geometry: {
      center: { x: node.x, y: node.y },
      boundingBox: node.labelBounds ?? { x: node.x - radius, y: node.y - radius, width: radius * 2, height: radius * 2 },
      orientation: 0,
      length: radius * 2,
    },
    neighbors: [],
    element: node.inferredElement === "Unknown" ? undefined : node.inferredElement,
  }
}

function bondPrimitiveFromGraph(graph: MolecularGraph, bond: MolecularGraph["bonds"][number]): ChemicalPrimitive | null {
  const start = graph.nodes.find((node) => node.id === bond.startNodeId)
  const end = graph.nodes.find((node) => node.id === bond.endNodeId)
  if (!start || !end) return null
  const length = Math.hypot(end.x - start.x, end.y - start.y)
  const orientation = (Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI + 180) % 180
  return {
    id: `bond-${bond.id}`,
    type: primitiveTypeForBond(bond.bondOrder),
    sourceTokenIds: [`graph-bond-${bond.id}`],
    confidence: bond.confidence,
    geometry: {
      center: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
      boundingBox: {
        x: Math.round(Math.min(start.x, end.x)),
        y: Math.round(Math.min(start.y, end.y)),
        width: Math.round(Math.abs(end.x - start.x)),
        height: Math.round(Math.abs(end.y - start.y)),
      },
      orientation,
      length,
    },
    neighbors: [`atom-${bond.startNodeId}`, `atom-${bond.endNodeId}`],
    bondOrder: bond.bondOrder,
  }
}

export function buildChemicalPrimitives(tokens: VisualToken[], graph?: MolecularGraph | null): ChemicalPrimitive[] {
  const primitives: ChemicalPrimitive[] = []
  if (graph) {
    primitives.push(...graph.nodes.map(atomPrimitiveFromGraph))
    graph.bonds.forEach((bond) => {
      const primitive = bondPrimitiveFromGraph(graph, bond)
      if (primitive) primitives.push(primitive)
    })
    graph.rings.forEach((ring) => {
      if (!ring.aromatic) return
      const nodes = ring.nodeIds.map((nodeId) => graph.nodes.find((node) => node.id === nodeId)).filter((node): node is (typeof graph.nodes)[number] => Boolean(node))
      primitives.push({
        id: `aromatic-${ring.id}`,
        type: "aromatic-hint",
        sourceTokenIds: [`graph-ring-${ring.id}`],
        confidence: ring.confidence,
        geometry: {
          center: {
            x: nodes.reduce((sum, node) => sum + node.x, 0) / Math.max(1, nodes.length),
            y: nodes.reduce((sum, node) => sum + node.y, 0) / Math.max(1, nodes.length),
          },
          boundingBox: nodes.length
            ? {
              x: Math.min(...nodes.map((node) => node.x)),
              y: Math.min(...nodes.map((node) => node.y)),
              width: Math.max(...nodes.map((node) => node.x)) - Math.min(...nodes.map((node) => node.x)),
              height: Math.max(...nodes.map((node) => node.y)) - Math.min(...nodes.map((node) => node.y)),
            }
            : { x: 0, y: 0, width: 0, height: 0 },
          orientation: 0,
          length: ring.size,
        },
        neighbors: ring.nodeIds.map((nodeId) => `atom-${nodeId}`),
      })
    })
  }

  tokens.forEach((token) => {
    if (primitives.some((primitive) => primitive.sourceTokenIds.includes(token.id))) return
    if (token.type === "atom-label") {
      primitives.push({
        id: `token-atom-${token.id}`,
        type: primitiveTypeForAtom(token.text),
        sourceTokenIds: [token.id],
        confidence: token.confidence,
        geometry: {
          center: center(token.boundingBox),
          boundingBox: token.boundingBox,
          orientation: token.orientation,
          length: token.length,
        },
        neighbors: [],
        element: token.text,
      })
    } else if (token.type === "line" || token.type === "double-line" || token.type === "triple-line") {
      const order = token.type === "triple-line" ? 3 : token.type === "double-line" ? 2 : 1
      primitives.push({
        id: `token-bond-${token.id}`,
        type: primitiveTypeForBond(order),
        sourceTokenIds: [token.id],
        confidence: token.confidence,
        geometry: {
          center: center(token.boundingBox),
          boundingBox: token.boundingBox,
          orientation: token.orientation,
          length: token.length,
        },
        neighbors: [],
        bondOrder: order,
      })
    } else if (token.type === "circle") {
      primitives.push({
        id: `token-fragment-${token.id}`,
        type: "fragment",
        sourceTokenIds: [token.id],
        confidence: token.confidence,
        geometry: {
          center: center(token.boundingBox),
          boundingBox: token.boundingBox,
          orientation: token.orientation,
          length: token.length,
        },
        neighbors: [],
      })
    }
  })

  return primitives.sort((left, right) => left.id.localeCompare(right.id))
}
