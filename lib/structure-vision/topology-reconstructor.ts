import type { MolecularGraph, MolecularGraphBond, MolecularGraphNode, MolecularGraphRing } from "../vision/molecular-graph"
import type { BridgeValidationResult } from "./bridge-validator"
import type { CycleValidationResult } from "./cycle-validator"
import type { EdgeValidationResult, EdgeValidationStatus } from "./edge-validator"
import type { GraphSanityResult } from "./graph-sanity"

export interface TopologyVariant {
  id: string
  label: string
  graph: MolecularGraph
  topologyScore: number
  chemicalLegality: number
  visualAgreement: number
  accepted: boolean
  reasons: string[]
}

export interface TopologyReconstructionResult {
  variants: TopologyVariant[]
  selectedVariantId: string | null
  selectedGraph: MolecularGraph | null
  explanation: string
}

const VALENCE: Record<string, number> = {
  C: 4,
  H: 1,
  O: 2,
  N: 3,
  S: 6,
  P: 5,
  F: 1,
  Cl: 1,
  Br: 1,
  I: 1,
  Unknown: 4,
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))
}

function bondKey(left: number, right: number): string {
  return [left, right].sort((a, b) => a - b).join("-")
}

function nodeValence(nodeId: number, bonds: MolecularGraphBond[]): number {
  return bonds
    .filter((bond) => bond.startNodeId === nodeId || bond.endNodeId === nodeId)
    .reduce((sum, bond) => sum + bond.bondOrder, 0)
}

function remapGraph(graph: MolecularGraph, retainedBonds: MolecularGraphBond[], warnings: string[]): MolecularGraph {
  const participatingIds = new Set<number>()
  retainedBonds.forEach((bond) => {
    participatingIds.add(bond.startNodeId)
    participatingIds.add(bond.endNodeId)
  })
  graph.nodes
    .filter((node) => !participatingIds.has(node.id) && node.degree > 0 && retainedBonds.length === 0)
    .forEach((node) => participatingIds.add(node.id))

  const retainedNodes = graph.nodes.filter((node) => participatingIds.has(node.id))
  const idMap = new Map(retainedNodes.map((node, index) => [node.id, index]))
  const nodes: MolecularGraphNode[] = retainedNodes.map((node, id) => ({
    ...node,
    id,
    degree: retainedBonds.filter((bond) => bond.startNodeId === node.id || bond.endNodeId === node.id).length,
    snappedSegmentIndexes: [...node.snappedSegmentIndexes],
  }))
  const bonds: MolecularGraphBond[] = retainedBonds
    .filter((bond) => idMap.has(bond.startNodeId) && idMap.has(bond.endNodeId))
    .map((bond) => ({
      ...bond,
      startNodeId: idMap.get(bond.startNodeId) ?? 0,
      endNodeId: idMap.get(bond.endNodeId) ?? 0,
      sourceSegmentIndexes: [...bond.sourceSegmentIndexes],
    }))

  nodes.forEach((node) => {
    node.degree = bonds.filter((bond) => bond.startNodeId === node.id || bond.endNodeId === node.id).length
  })

  const retainedRingKeys = new Set<string>()
  graph.rings.forEach((ring) => {
    const allNodesRetained = ring.nodeIds.every((nodeId) => idMap.has(nodeId))
    const allEdgesRetained = ring.nodeIds.every((nodeId, index) => {
      const next = ring.nodeIds[(index + 1) % ring.nodeIds.length]
      const left = idMap.get(nodeId)
      const right = idMap.get(next)
      return left !== undefined && right !== undefined && bonds.some((bond) => bondKey(bond.startNodeId, bond.endNodeId) === bondKey(left, right))
    })
    if (allNodesRetained && allEdgesRetained) retainedRingKeys.add(ring.nodeIds.map((nodeId) => idMap.get(nodeId)).join("-"))
  })
  const rings: MolecularGraphRing[] = graph.rings
    .map((ring): MolecularGraphRing | null => {
      const nodeIds = ring.nodeIds.map((nodeId) => idMap.get(nodeId)).filter((nodeId): nodeId is number => nodeId !== undefined)
      const key = nodeIds.join("-")
      if (nodeIds.length !== ring.nodeIds.length || !retainedRingKeys.has(key)) return null
      return { ...ring, id: 0, nodeIds }
    })
    .filter((ring): ring is MolecularGraphRing => Boolean(ring))
    .map((ring) => ({ ...ring }))

  const carbons = nodes.filter((node) => node.inferredElement === "C").length
  const confidence = Math.round(clamp(
    (nodes.reduce((sum, node) => sum + node.confidence, 0) / Math.max(1, nodes.length)) * 0.42 +
    (bonds.reduce((sum, bond) => sum + bond.confidence, 0) / Math.max(1, bonds.length)) * 0.43 +
    (rings.length ? Math.max(...rings.map((ring) => ring.confidence)) : 45) * 0.15,
  ))

  return {
    ...graph,
    nodes,
    bonds,
    rings,
    aromatic: rings.some((ring) => ring.aromatic),
    aromaticRingIds: rings.filter((ring) => ring.aromatic).map((ring) => ring.id),
    estimates: {
      ...graph.estimates,
      atoms: nodes.length,
      carbons,
      bonds: bonds.length,
      rings: rings.length,
      singleBonds: bonds.filter((bond) => bond.bondOrder === 1).length,
      doubleBonds: bonds.filter((bond) => bond.bondOrder === 2).length,
      tripleBonds: bonds.filter((bond) => bond.bondOrder === 3).length,
      confidence,
    },
    warnings: [...graph.warnings, ...warnings],
  }
}

function scoreVariant(
  graph: MolecularGraph,
  edgeValidation: EdgeValidationResult,
  bridgeValidation: BridgeValidationResult,
  cycleValidation: CycleValidationResult,
  sanity: GraphSanityResult,
  bondStatuses: Map<number, EdgeValidationStatus>,
): Pick<TopologyVariant, "topologyScore" | "chemicalLegality" | "visualAgreement" | "accepted" | "reasons"> {
  const reasons: string[] = []
  const illegalValences = graph.nodes.filter((node) => nodeValence(node.id, graph.bonds) > (VALENCE[node.inferredElement] ?? 4)).length
  const retainedRejectedEdges = graph.bonds.filter((bond) => bondStatuses.get(bond.id) === "rejected").length
  const unsafeBridges = bridgeValidation.bridges.filter((bridge) =>
    bridge.classification === "unsafe" && graph.bonds.some((bond) => bond.id === bridge.bondId),
  ).length
  const acceptedCycleCount = graph.rings.filter((ring) =>
    cycleValidation.cycles.some((cycle) => cycle.status !== "rejected" && cycle.ringId === ring.id),
  ).length
  const componentPenalty = sanity.fingerprint.connectedComponents > 1 ? 8 : 0

  const chemicalLegality = clamp(
    92 -
    illegalValences * 22 -
    retainedRejectedEdges * 18 -
    unsafeBridges * 18 -
    edgeValidation.crossingPairs.length * 14 -
    cycleValidation.rejected * 7 -
    sanity.issues.filter((issue) => issue.severity === "error").length * 16,
  )
  const visualAgreement = clamp(
    graph.estimates.confidence -
    Math.max(0, edgeValidation.accepted - graph.bonds.length) * 2 -
    componentPenalty +
    Math.min(10, acceptedCycleCount * 5),
  )
  const topologyScore = Math.round(clamp(chemicalLegality * 0.48 + visualAgreement * 0.42 + graph.estimates.confidence * 0.1))

  if (illegalValences) reasons.push(`${illegalValences} atom valence issue${illegalValences === 1 ? "" : "s"} remain.`)
  if (retainedRejectedEdges) reasons.push(`${retainedRejectedEdges} rejected edge${retainedRejectedEdges === 1 ? "" : "s"} remain in this topology.`)
  if (unsafeBridges) reasons.push(`${unsafeBridges} unsafe bridge${unsafeBridges === 1 ? "" : "s"} remain in this topology.`)
  if (acceptedCycleCount) reasons.push(`${acceptedCycleCount} validated cycle${acceptedCycleCount === 1 ? "" : "s"} retained.`)
  if (!reasons.length) reasons.push("Topology keeps accepted graph evidence without introducing impossible chemistry.")

  return {
    topologyScore,
    chemicalLegality: Math.round(chemicalLegality),
    visualAgreement: Math.round(visualAgreement),
    accepted: chemicalLegality >= 55 && graph.bonds.length > 0,
    reasons,
  }
}

function variant(
  id: string,
  label: string,
  graph: MolecularGraph,
  bonds: MolecularGraphBond[],
  warnings: string[],
  edgeValidation: EdgeValidationResult,
  bridgeValidation: BridgeValidationResult,
  cycleValidation: CycleValidationResult,
  sanity: GraphSanityResult,
  bondStatuses: Map<number, EdgeValidationStatus>,
): TopologyVariant {
  const nextGraph = remapGraph(graph, bonds, warnings)
  return {
    id,
    label,
    graph: nextGraph,
    ...scoreVariant(nextGraph, edgeValidation, bridgeValidation, cycleValidation, sanity, bondStatuses),
  }
}

export function reconstructTopologyVariants(
  graph: MolecularGraph,
  edgeValidation: EdgeValidationResult,
  bridgeValidation: BridgeValidationResult,
  cycleValidation: CycleValidationResult,
  sanity: GraphSanityResult,
): TopologyReconstructionResult {
  const statusMap = new Map(edgeValidation.edges.map((edge) => [edge.bondId, edge.status]))
  const bridgeMap = new Map(bridgeValidation.bridges.map((bridge) => [bridge.bondId, bridge.classification]))
  const acceptedOrWeak = graph.bonds.filter((bond) => statusMap.get(bond.id) !== "rejected")
  const acceptedOrSafeBridge = graph.bonds.filter((bond) => {
    const status = statusMap.get(bond.id)
    const bridge = bridgeMap.get(bond.id)
    return status !== "rejected" && bridge !== "unsafe" && bridge !== "possible"
  })
  const conservative = graph.bonds.filter((bond) => {
    const status = statusMap.get(bond.id)
    const bridge = bridgeMap.get(bond.id)
    return status === "accepted" || bridge === "guaranteed" || bridge === "likely"
  })
  const noBridges = graph.bonds.filter((bond) => !bond.gapBridged && statusMap.get(bond.id) !== "rejected")

  const variants = [
    variant("raw", "Graph A: no repairs", graph, graph.bonds, [], edgeValidation, bridgeValidation, cycleValidation, sanity, statusMap),
    variant("pruned", "Graph B: rejected edges removed", graph, acceptedOrWeak, ["Rejected edges were removed before chemistry interpretation."], edgeValidation, bridgeValidation, cycleValidation, sanity, statusMap),
    variant("safe-bridges", "Graph C: only safe bridges", graph, acceptedOrSafeBridge, ["Unsafe and possible bridges were withheld."], edgeValidation, bridgeValidation, cycleValidation, sanity, statusMap),
    variant("conservative", "Graph D: conservative topology", graph, conservative, ["Only accepted edges and likely/guaranteed bridges were retained."], edgeValidation, bridgeValidation, cycleValidation, sanity, statusMap),
    variant("no-bridges", "Graph E: bridge-free topology", graph, noBridges, ["Recovered bridge edges were removed for comparison."], edgeValidation, bridgeValidation, cycleValidation, sanity, statusMap),
  ]
    .sort((left, right) =>
      Number(right.accepted) - Number(left.accepted) ||
      right.topologyScore - left.topologyScore ||
      right.chemicalLegality - left.chemicalLegality,
    )

  const selected = variants.find((item) => item.accepted) ?? null
  return {
    variants,
    selectedVariantId: selected?.id ?? null,
    selectedGraph: selected?.graph ?? null,
    explanation: selected
      ? `${selected.label} selected with topology score ${selected.topologyScore} and chemical legality ${selected.chemicalLegality}.`
      : "No reconstructed topology passed legality and visual-agreement checks.",
  }
}
