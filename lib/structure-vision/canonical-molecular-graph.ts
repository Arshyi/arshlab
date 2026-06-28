import type { MolecularGraph, MolecularGraphBond, MolecularGraphNode } from "../vision/molecular-graph"

function bondKey(bond: MolecularGraphBond): string {
  const left = Math.min(bond.startNodeId, bond.endNodeId)
  const right = Math.max(bond.startNodeId, bond.endNodeId)
  return `${left}-${right}-${bond.bondOrder}`
}

function nodeKey(node: MolecularGraphNode): string {
  return `${node.inferredElement}:${Math.round(node.x * 10) / 10}:${Math.round(node.y * 10) / 10}`
}

export function canonicalizeMolecularGraph(graph: MolecularGraph): MolecularGraph {
  const orderedNodes = [...graph.nodes].sort((left, right) =>
    left.inferredElement.localeCompare(right.inferredElement) ||
    left.x - right.x ||
    left.y - right.y ||
    left.id - right.id,
  )
  const idMap = new Map(orderedNodes.map((node, id) => [node.id, id]))
  const nodes = orderedNodes.map((node, id): MolecularGraphNode => ({
    ...node,
    id,
    degree: graph.bonds.filter((bond) => bond.startNodeId === node.id || bond.endNodeId === node.id).length,
  }))
  const bonds = graph.bonds
    .filter((bond) => idMap.has(bond.startNodeId) && idMap.has(bond.endNodeId))
    .map((bond): MolecularGraphBond => ({
      ...bond,
      startNodeId: idMap.get(bond.startNodeId) ?? 0,
      endNodeId: idMap.get(bond.endNodeId) ?? 0,
    }))
    .sort((left, right) => bondKey(left).localeCompare(bondKey(right)))
    .map((bond, id) => ({ ...bond, id }))
  const rings = graph.rings.map((ring, id) => ({
    ...ring,
    id,
    nodeIds: ring.nodeIds.map((nodeId) => idMap.get(nodeId)).filter((nodeId): nodeId is number => nodeId !== undefined).sort((left, right) => left - right),
  }))
  return {
    ...graph,
    nodes,
    bonds,
    rings,
    aromaticRingIds: rings.filter((ring) => ring.aromatic).map((ring) => ring.id),
  }
}

export function molecularGraphHash(graph: MolecularGraph): string {
  const canonical = canonicalizeMolecularGraph(graph)
  const nodePart = canonical.nodes.map(nodeKey).join("|")
  const bondPart = canonical.bonds.map(bondKey).join("|")
  const ringPart = canonical.rings
    .map((ring) => `${ring.size}:${ring.aromatic ? "a" : "s"}:${ring.nodeIds.join(".")}`)
    .sort()
    .join("|")
  return `${nodePart}::${bondPart}::${ringPart}`
}
