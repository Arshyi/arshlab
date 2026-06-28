import type { MolecularGraph, MolecularGraphBond, MolecularGraphNode, MolecularGraphRing } from "../vision/molecular-graph"
import type { VisionLineSegment, VisionParallelBondPair, VisionRingCandidate, VisionRingClosureAnalysis } from "./vision-types"
import { molecularGraphHash } from "./canonical-molecular-graph"

export interface CandidateGraphScoreEntry {
  label: string
  points: number
  maximum: number
}

export interface CandidateGraphHypothesis {
  id: string
  label: string
  graph: MolecularGraph
  operations: string[]
  scoreBreakdown: CandidateGraphScoreEntry[]
  initialScore: number
}

export interface CandidateGraphGeneratorInput {
  baseGraph: MolecularGraph
  lineSegments: VisionLineSegment[]
  parallelBondPairs: VisionParallelBondPair[]
  ringClosure?: VisionRingClosureAnalysis
  ringCandidates?: VisionRingCandidate[]
  recognizedText?: string
}

const VALENCE: Record<string, number> = { C: 4, H: 1, O: 2, N: 3, S: 2, P: 3, F: 1, Cl: 1, Br: 1, I: 1, Unknown: 4 }

function clamp(value: number, minimum = 0, maximum = 100): number {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
}

function distance(left: MolecularGraphNode, right: MolecularGraphNode): number {
  return Math.hypot(left.x - right.x, left.y - right.y)
}

function median(values: number[]): number {
  if (!values.length) return 0
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.floor(sorted.length / 2)]
}

function bondKey(left: number, right: number): string {
  return `${Math.min(left, right)}-${Math.max(left, right)}`
}

function findBond(graph: MolecularGraph, left: number, right: number): MolecularGraphBond | undefined {
  return graph.bonds.find((bond) => bondKey(bond.startNodeId, bond.endNodeId) === bondKey(left, right))
}

function bondLength(graph: MolecularGraph, bond: MolecularGraphBond): number {
  const start = graph.nodes.find((node) => node.id === bond.startNodeId)
  const end = graph.nodes.find((node) => node.id === bond.endNodeId)
  return start && end ? distance(start, end) : 0
}

function cycleKey(nodeIds: number[]): string {
  const variants: string[] = []
  const add = (values: number[]) => {
    values.forEach((_, index) => variants.push([...values.slice(index), ...values.slice(0, index)].join("-")))
  }
  add(nodeIds)
  add([...nodeIds].reverse())
  return variants.sort()[0] ?? ""
}

function findCycles(nodes: MolecularGraphNode[], bonds: MolecularGraphBond[]): number[][] {
  const adjacency = new Map<number, number[]>()
  nodes.forEach((node) => adjacency.set(node.id, []))
  bonds.forEach((bond) => {
    adjacency.get(bond.startNodeId)?.push(bond.endNodeId)
    adjacency.get(bond.endNodeId)?.push(bond.startNodeId)
  })
  const found = new Map<string, number[]>()
  const walk = (start: number, current: number, path: number[]) => {
    if (path.length > 8) return
    for (const neighbor of adjacency.get(current) ?? []) {
      if (neighbor === start && path.length >= 3) {
        found.set(cycleKey(path), path)
        continue
      }
      if (path.includes(neighbor) || path.length >= 8) continue
      walk(start, neighbor, [...path, neighbor])
    }
  }
  nodes.forEach((node) => walk(node.id, node.id, [node.id]))
  return Array.from(found.values()).filter((cycle) => cycle.length >= 3 && cycle.length <= 8)
}

function estimateFormula(nodes: MolecularGraphNode[], bonds: MolecularGraphBond[]): string {
  const counts = new Map<string, number>()
  nodes.forEach((node) => counts.set(node.inferredElement, (counts.get(node.inferredElement) ?? 0) + 1))
  let hydrogens = 0
  nodes.forEach((node) => {
    const used = bonds
      .filter((bond) => bond.startNodeId === node.id || bond.endNodeId === node.id)
      .reduce((sum, bond) => sum + bond.bondOrder, 0)
    hydrogens += Math.max(0, (VALENCE[node.inferredElement] ?? 4) - used)
  })
  if (hydrogens > 0) counts.set("H", hydrogens)
  return ["C", "H", "O", "N", "S", "P", "F", "Cl", "Br", "I"]
    .filter((element) => counts.has(element))
    .map((element) => `${element}${(counts.get(element) ?? 1) === 1 ? "" : counts.get(element)}`)
    .join("") || "Unavailable"
}

export function rebuildMolecularGraph(graph: MolecularGraph, bonds: MolecularGraphBond[], extraRings: MolecularGraphRing[] = []): MolecularGraph {
  const nextBonds = bonds
    .filter((bond) => graph.nodes.some((node) => node.id === bond.startNodeId) && graph.nodes.some((node) => node.id === bond.endNodeId))
    .map((bond, id) => ({ ...bond, id }))
  const nodes = graph.nodes.map((node) => ({
    ...node,
    degree: nextBonds.filter((bond) => bond.startNodeId === node.id || bond.endNodeId === node.id).length,
  }))
  const supportedRingKeys = new Set([
    ...graph.rings
      .filter((ring) => ring.size === 6 || ring.confidence >= 74 || ring.aromatic)
      .map((ring) => cycleKey(ring.nodeIds)),
    ...extraRings.map((ring) => cycleKey(ring.nodeIds)),
  ])
  const ringsByKey = new Map<string, MolecularGraphRing>()
  findCycles(nodes, nextBonds).forEach((nodeIds, id) => {
    if (!supportedRingKeys.has(cycleKey(nodeIds))) return
    const orders = nodeIds.map((nodeId, index) => findBond({ ...graph, bonds: nextBonds }, nodeId, nodeIds[(index + 1) % nodeIds.length])?.bondOrder ?? 1)
    const doubleCount = orders.filter((order) => order >= 2).length
    const aromatic = nodeIds.length === 6 && doubleCount >= 3
    ringsByKey.set(cycleKey(nodeIds), {
      id,
      nodeIds,
      size: nodeIds.length,
      confidence: aromatic ? 90 : 72,
      aromatic,
      closed: true,
      kind: aromatic ? "benzene-like" : nodeIds.length === 6 ? "cyclohexane-like" : nodeIds.length === 5 ? "cyclopentane-like" : "ring",
    })
  })
  extraRings.forEach((ring) => {
    if (ring.nodeIds.length >= 3 && ring.nodeIds.every((nodeId) => nodes.some((node) => node.id === nodeId))) {
      const key = cycleKey(ring.nodeIds)
      const existing = ringsByKey.get(key)
      ringsByKey.set(key, existing && existing.confidence >= ring.confidence ? existing : { ...ring, id: ringsByKey.size })
    }
  })
  const rings = Array.from(ringsByKey.values()).map((ring, id) => ({ ...ring, id }))
  const carbons = nodes.filter((node) => node.inferredElement === "C").length
  const averageNodeConfidence = nodes.reduce((sum, node) => sum + node.confidence, 0) / Math.max(1, nodes.length)
  const averageBondConfidence = nextBonds.reduce((sum, bond) => sum + bond.confidence, 0) / Math.max(1, nextBonds.length)
  const confidence = Math.round(clamp(averageNodeConfidence * 0.38 + averageBondConfidence * 0.42 + (rings[0]?.confidence ?? 42) * 0.2))
  return {
    ...graph,
    nodes,
    bonds: nextBonds,
    rings,
    aromatic: rings.some((ring) => ring.aromatic),
    aromaticRingIds: rings.filter((ring) => ring.aromatic).map((ring) => ring.id),
    estimates: {
      atoms: nodes.length,
      carbons,
      bonds: nextBonds.length,
      rings: rings.length,
      singleBonds: nextBonds.filter((bond) => bond.bondOrder === 1).length,
      doubleBonds: nextBonds.filter((bond) => bond.bondOrder === 2).length,
      tripleBonds: nextBonds.filter((bond) => bond.bondOrder === 3).length,
      estimatedFormula: estimateFormula(nodes, nextBonds),
      confidence,
    },
  }
}

function scoreSeed(graph: MolecularGraph, label: string, operations: string[]): CandidateGraphHypothesis {
  const lengths = graph.bonds.map((bond) => bondLength(graph, bond)).filter((length) => length > 0)
  const localMedian = median(lengths)
  const variance = lengths.length
    ? lengths.reduce((sum, length) => sum + (length - localMedian) ** 2, 0) / lengths.length
    : 0
  const valencePenalty = graph.nodes.reduce((sum, node) => {
    const observed = graph.bonds
      .filter((bond) => bond.startNodeId === node.id || bond.endNodeId === node.id)
      .reduce((total, bond) => total + bond.bondOrder, 0)
    return sum + Math.max(0, observed - (VALENCE[node.inferredElement] ?? 4)) * 9
  }, 0)
  const ringBonus = graph.rings.some((ring) => ring.aromatic) ? 22 : graph.rings.length ? 12 : 0
  const score = Math.round(clamp(
    graph.estimates.confidence * 0.58 +
    Math.max(0, 24 - Math.sqrt(variance) * 0.35) +
    ringBonus +
    Math.min(8, graph.bonds.length) -
    valencePenalty,
    0,
    100,
  ))
  return {
    id: molecularGraphHash(graph).slice(0, 18),
    label,
    graph,
    operations,
    initialScore: score,
    scoreBreakdown: [
      { label: "Visual graph confidence", points: Math.round(graph.estimates.confidence * 0.58), maximum: 58 },
      { label: "Bond-length consistency", points: Math.round(Math.max(0, 24 - Math.sqrt(variance) * 0.35)), maximum: 24 },
      { label: "Ring/aromatic seed support", points: ringBonus, maximum: 22 },
      { label: "Valence seed penalty", points: -valencePenalty, maximum: 0 },
    ],
  }
}

function addUnique(hypotheses: CandidateGraphHypothesis[], graph: MolecularGraph, label: string, operations: string[]) {
  const hash = molecularGraphHash(graph)
  if (hypotheses.some((hypothesis) => molecularGraphHash(hypothesis.graph) === hash)) return
  hypotheses.push(scoreSeed(graph, label, operations))
}

export function generateCandidateGraphs(input: CandidateGraphGeneratorInput): CandidateGraphHypothesis[] {
  const hypotheses: CandidateGraphHypothesis[] = []
  const base = rebuildMolecularGraph(input.baseGraph, input.baseGraph.bonds, input.baseGraph.rings)
  addUnique(hypotheses, base, "Base reconstructed graph", ["accept raw reconstruction"])

  const lengths = base.bonds.map((bond) => bondLength(base, bond)).filter((length) => length > 0)
  const localMedian = median(lengths)
  if (localMedian > 0) {
    const pruned = base.bonds.filter((bond) => bondLength(base, bond) <= localMedian * (bond.gapBridged ? 2.2 : 1.72))
    addUnique(hypotheses, rebuildMolecularGraph(base, pruned, base.rings), "Long-edge-pruned graph", ["remove very long diagonal/background bonds"])
  }

  const downgradedRingTriples = base.bonds.map((bond) => {
    const inRing = base.rings.some((ring) => ring.nodeIds.includes(bond.startNodeId) && ring.nodeIds.includes(bond.endNodeId))
    return inRing && bond.bondOrder === 3 ? { ...bond, bondOrder: 2 as const, confidence: Math.max(40, bond.confidence - 6) } : bond
  })
  addUnique(hypotheses, rebuildMolecularGraph(base, downgradedRingTriples, base.rings), "Aromatic-safe bond orders", ["downgrade ring triples to double bonds"])

  const selectedClosure = input.ringClosure?.candidates.find((candidate) =>
    candidate.selected && candidate.memberCount >= 5 && candidate.memberCount <= 8 && candidate.confidence >= 48,
  )
  if (selectedClosure) {
    let nextBonds = [...base.bonds]
    selectedClosure.nodeIds.forEach((nodeId, index) => {
      const next = selectedClosure.nodeIds[(index + 1) % selectedClosure.nodeIds.length]
      if (findBond({ ...base, bonds: nextBonds }, nodeId, next)) return
      const aromaticTarget = selectedClosure.memberCount === 6 && selectedClosure.aromaticSupport >= 55
      const existingDoubles = nextBonds.filter((bond) =>
        selectedClosure.nodeIds.includes(bond.startNodeId) &&
        selectedClosure.nodeIds.includes(bond.endNodeId) &&
        bond.bondOrder >= 2,
      ).length
      nextBonds.push({
        id: nextBonds.length,
        startNodeId: nodeId,
        endNodeId: next,
        bondOrder: aromaticTarget && existingDoubles < 3 ? 2 : 1,
        confidence: Math.round(clamp(selectedClosure.confidence * 0.74, 42, 78)),
        sourceSegmentIndexes: [],
        parallelPairCount: aromaticTarget ? 1 : 0,
        gapBridged: true,
      })
    })
    const closureRing: MolecularGraphRing = {
      id: 0,
      nodeIds: selectedClosure.nodeIds,
      size: selectedClosure.memberCount,
      confidence: selectedClosure.confidence,
      aromatic: selectedClosure.memberCount === 6 && selectedClosure.aromaticSupport >= 55,
      closed: selectedClosure.closed,
      kind: selectedClosure.memberCount === 6 && selectedClosure.aromaticSupport >= 55
        ? "benzene-like"
        : selectedClosure.memberCount === 6 ? "cyclohexane-like" : selectedClosure.memberCount === 5 ? "cyclopentane-like" : "ring",
    }
    addUnique(hypotheses, rebuildMolecularGraph(base, nextBonds, [closureRing]), "Ring-closure hypothesis", ["bridge short closure gaps", "fit selected ring candidate"])
  }

  if (base.rings.some((ring) => ring.size === 6)) {
    const sixRing = base.rings.find((ring) => ring.size === 6)
    const aromaticEvidence = Boolean(
      sixRing?.aromatic ||
      base.estimates.doubleBonds >= 2 ||
      base.bonds.filter((bond) => sixRing?.nodeIds.includes(bond.startNodeId) && sixRing?.nodeIds.includes(bond.endNodeId) && bond.parallelPairCount > 0).length >= 2 ||
      /(benzene|aromatic|phenyl|c6h6)/i.test(input.recognizedText ?? ""),
    )
    if (aromaticEvidence) {
      const aromaticBonds = base.bonds.map((bond) => {
        if (!sixRing?.nodeIds.includes(bond.startNodeId) || !sixRing.nodeIds.includes(bond.endNodeId)) return bond
        const edgeIndex = sixRing.nodeIds.findIndex((nodeId) => nodeId === bond.startNodeId || nodeId === bond.endNodeId)
        return { ...bond, bondOrder: (edgeIndex % 2 === 0 ? 2 : 1) as 1 | 2, confidence: Math.max(bond.confidence, 72), parallelPairCount: edgeIndex % 2 === 0 ? Math.max(1, bond.parallelPairCount) : bond.parallelPairCount }
      })
      addUnique(hypotheses, rebuildMolecularGraph(base, aromaticBonds, base.rings.map((ring) => ring.id === sixRing?.id ? { ...ring, aromatic: true, kind: "benzene-like" } : ring)), "Aromatic interpretation", ["promote alternating six-ring double bonds"])
    }
    addUnique(hypotheses, rebuildMolecularGraph(base, base.bonds.map((bond) => ({ ...bond, bondOrder: 1 as const, parallelPairCount: 0 })), base.rings.map((ring) => ({ ...ring, aromatic: false, kind: ring.size === 6 ? "cyclohexane-like" : ring.kind }))), "Saturated ring interpretation", ["test saturated ring hypothesis"])
  }

  return hypotheses
    .sort((left, right) => right.initialScore - left.initialScore || left.label.localeCompare(right.label))
    .slice(0, 30)
}
