import type { MolecularGraph } from "../vision/molecular-graph"
import type { ChemicalAst, ChemicalAstComponent, ChemicalAstCycle, ChemicalAstEdge, ChemicalAstNode, ChemicalPrimitive } from "./compiler-types"

function distance(left: { x: number; y: number }, right: { x: number; y: number }): number {
  return Math.hypot(left.x - right.x, left.y - right.y)
}

function direction(left: { x: number; y: number }, right: { x: number; y: number }): number {
  return (Math.atan2(right.y - left.y, right.x - left.x) * 180 / Math.PI + 180) % 180
}

function connectedComponents(nodes: ChemicalAstNode[], edges: ChemicalAstEdge[]): ChemicalAstComponent[] {
  const adjacency = new Map<number, number[]>()
  nodes.forEach((node) => adjacency.set(node.id, []))
  edges.forEach((edge) => {
    adjacency.get(edge.startNodeId)?.push(edge.endNodeId)
    adjacency.get(edge.endNodeId)?.push(edge.startNodeId)
  })
  const seen = new Set<number>()
  const components: ChemicalAstComponent[] = []
  nodes.forEach((node) => {
    if (seen.has(node.id)) return
    const stack = [node.id]
    const nodeIds: number[] = []
    seen.add(node.id)
    while (stack.length) {
      const current = stack.pop()
      if (current === undefined) continue
      nodeIds.push(current)
      adjacency.get(current)?.forEach((next) => {
        if (!seen.has(next)) {
          seen.add(next)
          stack.push(next)
        }
      })
    }
    components.push({
      id: components.length,
      nodeIds,
      edgeIds: edges.filter((edge) => nodeIds.includes(edge.startNodeId) && nodeIds.includes(edge.endNodeId)).map((edge) => edge.id),
    })
  })
  return components
}

function primitiveIds(primitives: ChemicalPrimitive[], prefix: string): string[] {
  return primitives.filter((primitive) => primitive.id.startsWith(prefix)).map((primitive) => primitive.id)
}

export function buildChemicalAst(primitives: ChemicalPrimitive[], graph: MolecularGraph): ChemicalAst {
  const nodes: ChemicalAstNode[] = graph.nodes.map((node): ChemicalAstNode => ({
    id: node.id,
    atomType: node.inferredElement,
    coordinates: { x: node.x, y: node.y },
    degree: node.degree,
    charge: 0,
    hybridization: "unknown",
    confidence: node.confidence,
    sourcePrimitiveIds: primitives.some((primitive) => primitive.id === `atom-${node.id}`) ? [`atom-${node.id}`] : primitiveIds(primitives, "token-atom"),
  }))
  const edges: ChemicalAstEdge[] = graph.bonds.map((bond): ChemicalAstEdge => {
    const start = graph.nodes.find((node) => node.id === bond.startNodeId)
    const end = graph.nodes.find((node) => node.id === bond.endNodeId)
    return {
      id: bond.id,
      startNodeId: bond.startNodeId,
      endNodeId: bond.endNodeId,
      bondOrder: bond.bondOrder,
      length: start && end ? Math.round(distance(start, end) * 10) / 10 : 0,
      direction: start && end ? Math.round(direction(start, end)) : 0,
      confidence: bond.confidence,
      recovered: bond.gapBridged,
      original: !bond.gapBridged,
      sourcePrimitiveIds: primitives.some((primitive) => primitive.id === `bond-${bond.id}`) ? [`bond-${bond.id}`] : primitiveIds(primitives, "token-bond"),
    }
  })
  const cycles: ChemicalAstCycle[] = graph.rings.map((ring): ChemicalAstCycle => ({
    id: ring.id,
    nodeIds: [...ring.nodeIds],
    size: ring.size,
    confidence: ring.confidence,
  }))
  const components = connectedComponents(nodes, edges)
  return {
    nodes,
    edges,
    connectedComponents: components,
    cycles,
    branches: nodes.filter((node) => node.degree >= 3).map((node) => node.id),
    fragments: components.filter((component) => component.nodeIds.length <= 1 || component.edgeIds.length === 0),
    reactionParticipants: components,
  }
}
