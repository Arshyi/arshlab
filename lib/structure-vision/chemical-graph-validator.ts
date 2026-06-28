import type {
  InferredElement,
  MolecularGraph,
  MolecularGraphBond,
  MolecularGraphNode,
  MolecularGraphRing,
  MolecularRingKind,
} from "../vision/molecular-graph"
import type {
  VisionLineSegment,
  VisionParallelBondPair,
  VisionPoint,
  VisionRingCandidate,
  VisionRingClosureAnalysis,
} from "./vision-types"

export type ChemicalGraphRejectionKind = "long-bond" | "crossing-bond" | "valence" | "disconnected-noise"

export interface ChemicalGraphRejectedBond {
  id: number
  startNodeId: number
  endNodeId: number
  start: VisionPoint
  end: VisionPoint
  length: number
  bondOrder: 1 | 2 | 3
  kind: ChemicalGraphRejectionKind
  reason: string
}

export interface ChemicalGraphBondCorrection {
  bondId: number
  startNodeId: number
  endNodeId: number
  start: VisionPoint
  end: VisionPoint
  fromOrder: 1 | 2 | 3
  toOrder: 1 | 2 | 3
  reason: string
}

export interface ChemicalGraphValenceSummary {
  nodeId: number
  element: InferredElement
  maxValence: number
  observedValence: number
  observedDegree: number
  valid: boolean
  fixes: string[]
}

export interface ChemicalGraphAcceptedBond {
  id: number
  startNodeId: number
  endNodeId: number
  start: VisionPoint
  end: VisionPoint
  length: number
  bondOrder: 1 | 2 | 3
  confidence: number
  ringEdge: boolean
}

export interface ChemicalGraphValidationResult {
  rawBondCount: number
  prunedBondCount: number
  rejectedBonds: ChemicalGraphRejectedBond[]
  correctedBondOrders: ChemicalGraphBondCorrection[]
  valenceSummaries: ChemicalGraphValenceSummary[]
  acceptedBonds: ChemicalGraphAcceptedBond[]
  selectedValidatedRing: {
    nodeIds: number[]
    size: number
    aromatic: boolean
    confidence: number
    reason: string
  } | null
  medianBondLength: number
  graphValidityScore: number
  plausible: boolean
  diagnostics: string[]
  validatedGraph: MolecularGraph
}

export interface ChemicalGraphValidationInput {
  graph: MolecularGraph
  lineSegments: VisionLineSegment[]
  parallelBondPairs: VisionParallelBondPair[]
  ringClosure?: VisionRingClosureAnalysis
  ringCandidates?: VisionRingCandidate[]
  recognizedText?: string
}

const VALENCE: Partial<Record<InferredElement, number>> = {
  C: 4,
  H: 1,
  O: 2,
  N: 3,
  S: 2,
  P: 3,
  F: 1,
  Cl: 1,
  Br: 1,
  I: 1,
  Unknown: 4,
}

const ELEMENT_ORDER: InferredElement[] = ["C", "H", "O", "N", "S", "P", "F", "Cl", "Br", "I"]

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))
}

function distance(left: VisionPoint, right: VisionPoint): number {
  return Math.hypot(left.x - right.x, left.y - right.y)
}

function median(values: number[]): number {
  if (!values.length) return 0
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.floor(sorted.length / 2)]
}

function robustBondMedian(values: number[]): number {
  if (!values.length) return 0
  const sorted = [...values].sort((left, right) => left - right)
  const trimmed = sorted.slice(0, Math.max(1, Math.ceil(sorted.length * 0.72)))
  return median(trimmed)
}

function nodePoint(node: MolecularGraphNode): VisionPoint {
  return { x: node.x, y: node.y }
}

function bondLength(nodes: MolecularGraphNode[], bond: MolecularGraphBond): number {
  const start = nodes.find((node) => node.id === bond.startNodeId)
  const end = nodes.find((node) => node.id === bond.endNodeId)
  return start && end ? distance(start, end) : 0
}

function bondKey(left: number, right: number): string {
  return left < right ? `${left}-${right}` : `${right}-${left}`
}

function canonicalCycle(nodeIds: number[]): string {
  const variants: string[] = []
  const add = (values: number[]) => {
    values.forEach((_, index) => variants.push([...values.slice(index), ...values.slice(0, index)].join("-")))
  }
  add(nodeIds)
  add([...nodeIds].reverse())
  return variants.sort()[0] ?? ""
}

function orientation(first: VisionPoint, second: VisionPoint, third: VisionPoint): number {
  return (second.y - first.y) * (third.x - second.x) - (second.x - first.x) * (third.y - second.y)
}

function segmentsIntersect(first: VisionPoint, second: VisionPoint, third: VisionPoint, fourth: VisionPoint): boolean {
  const firstOrientation = orientation(first, second, third)
  const secondOrientation = orientation(first, second, fourth)
  const thirdOrientation = orientation(third, fourth, first)
  const fourthOrientation = orientation(third, fourth, second)
  return firstOrientation * secondOrientation < 0 && thirdOrientation * fourthOrientation < 0
}

function angleBetween(start: VisionPoint, end: VisionPoint): number {
  const angle = Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI
  return (angle + 180) % 180
}

function angleDifference(left: number, right: number): number {
  const difference = Math.abs(left - right) % 180
  return Math.min(difference, 180 - difference)
}

function projection(point: VisionPoint, start: VisionPoint, end: VisionPoint): number {
  const dx = end.x - start.x
  const dy = end.y - start.y
  return ((point.x - start.x) * dx + (point.y - start.y) * dy) / Math.max(1, dx * dx + dy * dy)
}

function distanceToLine(point: VisionPoint, start: VisionPoint, end: VisionPoint): number {
  const ratio = projection(point, start, end)
  const projected = { x: start.x + (end.x - start.x) * ratio, y: start.y + (end.y - start.y) * ratio }
  return distance(point, projected)
}

function ringEdgeKeys(graph: MolecularGraph, closure?: VisionRingClosureAnalysis, candidates: VisionRingCandidate[] = []): Set<string> {
  const keys = new Set<string>()
  const addCycle = (nodeIds: number[]) => {
    nodeIds.forEach((nodeId, index) => keys.add(bondKey(nodeId, nodeIds[(index + 1) % nodeIds.length])))
  }
  graph.rings.forEach((ring) => addCycle(ring.nodeIds))
  closure?.candidates.filter((candidate) => candidate.selected || candidate.confidence >= 58).forEach((candidate) => addCycle(candidate.nodeIds))
  candidates.filter((candidate) => candidate.confidence >= 55 && candidate.nodeIds.length >= 3).forEach((candidate) => addCycle(candidate.nodeIds))
  return keys
}

function ringAromaticSupport(closure?: VisionRingClosureAnalysis, candidates: VisionRingCandidate[] = []): number {
  return Math.max(
    closure?.aromaticSupportScore ?? 0,
    ...(closure?.candidates.map((candidate) => candidate.aromaticSupport) ?? [0]),
    ...candidates.map((candidate) => Math.max(candidate.aromaticCueScore, candidate.doubleBondCue)),
    0,
  )
}

function crossingCount(
  nodes: MolecularGraphNode[],
  bond: MolecularGraphBond,
  bonds: MolecularGraphBond[],
): number {
  const start = nodes.find((node) => node.id === bond.startNodeId)
  const end = nodes.find((node) => node.id === bond.endNodeId)
  if (!start || !end) return 0
  return bonds.filter((other) => {
    if (other.id === bond.id) return false
    if (
      other.startNodeId === bond.startNodeId ||
      other.startNodeId === bond.endNodeId ||
      other.endNodeId === bond.startNodeId ||
      other.endNodeId === bond.endNodeId
    ) return false
    const otherStart = nodes.find((node) => node.id === other.startNodeId)
    const otherEnd = nodes.find((node) => node.id === other.endNodeId)
    if (!otherStart || !otherEnd) return false
    return segmentsIntersect(nodePoint(start), nodePoint(end), nodePoint(otherStart), nodePoint(otherEnd))
  }).length
}

function hasRealTripleSupport(
  bond: MolecularGraphBond,
  nodes: MolecularGraphNode[],
  lineSegments: VisionLineSegment[],
  parallelBondPairs: VisionParallelBondPair[],
  ringEdge: boolean,
): boolean {
  if (ringEdge) return false
  if (bond.parallelPairCount < 2) return false
  const start = nodes.find((node) => node.id === bond.startNodeId)
  const end = nodes.find((node) => node.id === bond.endNodeId)
  if (!start || !end) return false
  const startPoint = nodePoint(start)
  const endPoint = nodePoint(end)
  const edgeAngle = angleBetween(startPoint, endPoint)
  const segmentIndexes = new Set([
    ...bond.sourceSegmentIndexes,
    ...parallelBondPairs
      .filter((pair) => bond.sourceSegmentIndexes.includes(pair.firstSegmentIndex) || bond.sourceSegmentIndexes.includes(pair.secondSegmentIndex))
      .flatMap((pair) => [pair.firstSegmentIndex, pair.secondSegmentIndex]),
  ])
  const segments = [...segmentIndexes].map((index) => lineSegments[index]).filter((segment): segment is VisionLineSegment => Boolean(segment))
  if (segments.length < 3) return false
  const bondDistance = distance(startPoint, endPoint)
  const compact = segments.filter((segment) => {
    const angleOk = angleDifference(segment.angle, edgeAngle) <= 8
    const centerOk = projection(segment.midpoint, startPoint, endPoint) >= -0.1 &&
      projection(segment.midpoint, startPoint, endPoint) <= 1.1 &&
      distanceToLine(segment.midpoint, startPoint, endPoint) <= Math.max(5, bondDistance * 0.16)
    const lengthOk = segment.length >= bondDistance * 0.55 && segment.length <= bondDistance * 1.2
    return angleOk && centerOk && lengthOk
  })
  if (compact.length < 3) return false
  const lengths = compact.map((segment) => segment.length)
  const minLength = Math.min(...lengths)
  const maxLength = Math.max(...lengths)
  return maxLength / Math.max(1, minLength) <= 1.35
}

function makeRejectedBond(
  nodes: MolecularGraphNode[],
  bond: MolecularGraphBond,
  length: number,
  kind: ChemicalGraphRejectionKind,
  reason: string,
): ChemicalGraphRejectedBond {
  const start = nodes.find((node) => node.id === bond.startNodeId)
  const end = nodes.find((node) => node.id === bond.endNodeId)
  return {
    id: bond.id,
    startNodeId: bond.startNodeId,
    endNodeId: bond.endNodeId,
    start: start ? nodePoint(start) : { x: 0, y: 0 },
    end: end ? nodePoint(end) : { x: 0, y: 0 },
    length: Math.round(length * 10) / 10,
    bondOrder: bond.bondOrder,
    kind,
    reason,
  }
}

function correctionFor(
  nodes: MolecularGraphNode[],
  bond: MolecularGraphBond,
  fromOrder: 1 | 2 | 3,
  toOrder: 1 | 2 | 3,
  reason: string,
): ChemicalGraphBondCorrection {
  const start = nodes.find((node) => node.id === bond.startNodeId)
  const end = nodes.find((node) => node.id === bond.endNodeId)
  return {
    bondId: bond.id,
    startNodeId: bond.startNodeId,
    endNodeId: bond.endNodeId,
    start: start ? nodePoint(start) : { x: 0, y: 0 },
    end: end ? nodePoint(end) : { x: 0, y: 0 },
    fromOrder,
    toOrder,
    reason,
  }
}

function findMolecularCycles(nodes: MolecularGraphNode[], bonds: MolecularGraphBond[]): number[][] {
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
        found.set(canonicalCycle(path), path)
        continue
      }
      if (path.includes(neighbor) || path.length >= 8) continue
      walk(start, neighbor, [...path, neighbor])
    }
  }
  nodes.forEach((node) => walk(node.id, node.id, [node.id]))
  return Array.from(found.values()).filter((cycle) => cycle.length >= 3 && cycle.length <= 8)
}

function bondBetween(bonds: MolecularGraphBond[], left: number, right: number): MolecularGraphBond | undefined {
  return bonds.find((bond) =>
    (bond.startNodeId === left && bond.endNodeId === right) ||
    (bond.startNodeId === right && bond.endNodeId === left),
  )
}

function buildRings(
  nodes: MolecularGraphNode[],
  bonds: MolecularGraphBond[],
  original: MolecularGraph,
  closure?: VisionRingClosureAnalysis,
  ringCandidates: VisionRingCandidate[] = [],
): MolecularGraphRing[] {
  const cycles = findMolecularCycles(nodes, bonds)
  const ringMap = new Map<string, { nodeIds: number[]; confidence: number; aromatic: boolean; closed: boolean }>()
  cycles.forEach((nodeIds) => ringMap.set(canonicalCycle(nodeIds), { nodeIds, confidence: 70, aromatic: false, closed: true }))
  original.rings.forEach((ring) => {
    if (!ring.nodeIds.every((nodeId) => nodes.some((node) => node.id === nodeId))) return
    const retainedEdges = ring.nodeIds.filter((nodeId, index) =>
      Boolean(bondBetween(bonds, nodeId, ring.nodeIds[(index + 1) % ring.nodeIds.length])),
    ).length
    if (retainedEdges < Math.max(3, ring.nodeIds.length - (ring.closed ? 0 : 1))) return
    const key = canonicalCycle(ring.nodeIds)
    const existing = ringMap.get(key)
    ringMap.set(key, {
      nodeIds: ring.nodeIds,
      confidence: Math.max(existing?.confidence ?? 0, ring.confidence),
      aromatic: Boolean(existing?.aromatic || ring.aromatic),
      closed: Boolean(existing?.closed || ring.closed),
    })
  })
  closure?.candidates.filter((candidate) => candidate.selected && candidate.confidence >= 54).forEach((candidate) => {
    if (!candidate.nodeIds.every((nodeId) => nodes.some((node) => node.id === nodeId))) return
    const retainedEdges = candidate.nodeIds.filter((nodeId, index) =>
      Boolean(bondBetween(bonds, nodeId, candidate.nodeIds[(index + 1) % candidate.nodeIds.length])),
    ).length
    if (retainedEdges < Math.max(3, candidate.memberCount - 1)) return
    const key = canonicalCycle(candidate.nodeIds)
    const existing = ringMap.get(key)
    ringMap.set(key, {
      nodeIds: candidate.nodeIds,
      confidence: Math.max(existing?.confidence ?? 0, candidate.confidence),
      aromatic: Boolean(existing?.aromatic || (candidate.memberCount === 6 && candidate.aromaticSupport >= 55)),
      closed: Boolean(existing?.closed || candidate.closed),
    })
  })
  ringCandidates.filter((candidate) => candidate.confidence >= 58 && candidate.nodeIds.length >= 5).forEach((candidate) => {
    if (!candidate.nodeIds.every((nodeId) => nodes.some((node) => node.id === nodeId))) return
    const retainedEdges = candidate.nodeIds.filter((nodeId, index) =>
      Boolean(bondBetween(bonds, nodeId, candidate.nodeIds[(index + 1) % candidate.nodeIds.length])),
    ).length
    if (retainedEdges < Math.max(3, candidate.nodeIds.length - (candidate.nearRing ? 1 : 0))) return
    const key = canonicalCycle(candidate.nodeIds)
    const existing = ringMap.get(key)
    ringMap.set(key, {
      nodeIds: candidate.nodeIds,
      confidence: Math.max(existing?.confidence ?? 0, candidate.confidence),
      aromatic: Boolean(existing?.aromatic || candidate.benzeneLike || candidate.aromaticCueScore >= 55),
      closed: Boolean(existing?.closed || !candidate.nearRing),
    })
  })

  return Array.from(ringMap.values()).map((ring, id): MolecularGraphRing => {
    const orders = ring.nodeIds.map((nodeId, index) =>
      bondBetween(bonds, nodeId, ring.nodeIds[(index + 1) % ring.nodeIds.length])?.bondOrder ?? 1,
    )
    const doubleCount = orders.filter((order) => order >= 2).length
    const closureSupport = closure?.candidates.some((candidate) =>
      candidate.selected &&
      canonicalCycle(candidate.nodeIds) === canonicalCycle(ring.nodeIds) &&
      candidate.aromaticSupport >= 55 &&
      candidate.doubleBondCount >= 2
    ) ?? false
    const aromatic = ring.nodeIds.length === 6 && (doubleCount >= 3 || closureSupport)
    const kind: MolecularRingKind = aromatic
      ? "benzene-like"
      : ring.nodeIds.length === 6
        ? "cyclohexane-like"
        : ring.nodeIds.length === 5
          ? "cyclopentane-like"
          : "ring"
    return {
      id,
      nodeIds: ring.nodeIds,
      size: ring.nodeIds.length,
      confidence: Math.round(clamp(ring.confidence + Math.min(12, doubleCount * 3) + (aromatic ? 6 : 0), 0, 97)),
      aromatic,
      closed: ring.closed,
      kind,
    }
  }).sort((left, right) => right.confidence - left.confidence)
}

function estimateFormula(nodes: MolecularGraphNode[], bonds: MolecularGraphBond[], recognizedText = ""): string {
  const compact = recognizedText.replace(/[=#-]/g, "").replace(/\s+/g, " ")
  const likelyFormula = (compact.match(/(?:[A-Z][a-z]?\d*){2,}/g) ?? []).sort((left, right) => right.length - left.length)[0]
  if (likelyFormula) return likelyFormula

  const counts = new Map<InferredElement, number>()
  nodes.forEach((node) => counts.set(node.inferredElement, (counts.get(node.inferredElement) ?? 0) + 1))
  let hydrogens = 0
  nodes.forEach((node) => {
    if (node.inferredElement === "H") return
    const usedValence = bonds
      .filter((bond) => bond.startNodeId === node.id || bond.endNodeId === node.id)
      .reduce((sum, bond) => sum + bond.bondOrder, 0)
    hydrogens += Math.max(0, (VALENCE[node.inferredElement] ?? 0) - usedValence)
  })
  if (hydrogens > 0) counts.set("H", (counts.get("H") ?? 0) + hydrogens)
  return ELEMENT_ORDER
    .filter((element) => counts.has(element))
    .map((element) => `${element}${(counts.get(element) ?? 1) === 1 ? "" : counts.get(element)}`)
    .join("") || "Unavailable"
}

function rebuildGraph(
  original: MolecularGraph,
  bonds: MolecularGraphBond[],
  rings: MolecularGraphRing[],
  confidence: number,
  recognizedText?: string,
): MolecularGraph {
  const nodes = original.nodes.map((node) => ({
    ...node,
    degree: bonds.filter((bond) => bond.startNodeId === node.id || bond.endNodeId === node.id).length,
  }))
  return {
    ...original,
    nodes,
    bonds,
    rings,
    aromatic: rings.some((ring) => ring.aromatic),
    aromaticRingIds: rings.filter((ring) => ring.aromatic).map((ring) => ring.id),
    estimates: {
      atoms: nodes.length,
      carbons: nodes.filter((node) => node.inferredElement === "C").length,
      bonds: bonds.length,
      rings: rings.length,
      singleBonds: bonds.filter((bond) => bond.bondOrder === 1).length,
      doubleBonds: bonds.filter((bond) => bond.bondOrder === 2).length,
      tripleBonds: bonds.filter((bond) => bond.bondOrder === 3).length,
      estimatedFormula: estimateFormula(nodes, bonds, recognizedText),
      confidence,
    },
    warnings: [...original.warnings],
  }
}

function valenceFor(node: MolecularGraphNode, bonds: MolecularGraphBond[]): number {
  return bonds
    .filter((bond) => bond.startNodeId === node.id || bond.endNodeId === node.id)
    .reduce((sum, bond) => sum + bond.bondOrder, 0)
}

function degreeFor(node: MolecularGraphNode, bonds: MolecularGraphBond[]): number {
  return bonds.filter((bond) => bond.startNodeId === node.id || bond.endNodeId === node.id).length
}

export function validateChemicalGraph(input: ChemicalGraphValidationInput): ChemicalGraphValidationResult {
  const { graph } = input
  const rawBondCount = graph.bonds.length
  if (!graph.nodes.length || !graph.bonds.length) {
    return {
      rawBondCount,
      prunedBondCount: 0,
      rejectedBonds: [],
      correctedBondOrders: [],
      valenceSummaries: [],
      acceptedBonds: [],
      selectedValidatedRing: null,
      medianBondLength: 0,
      graphValidityScore: 0,
      plausible: false,
      diagnostics: ["No molecular graph was available for chemical validation."],
      validatedGraph: graph,
    }
  }

  const ringKeys = ringEdgeKeys(graph, input.ringClosure, input.ringCandidates)
  const aromaticSupport = ringAromaticSupport(input.ringClosure, input.ringCandidates)
  const lengths = graph.bonds.map((bond) => bondLength(graph.nodes, bond)).filter((length) => length > 0)
  const medianBondLength = robustBondMedian(lengths) || median(lengths)
  const rejectedBonds: ChemicalGraphRejectedBond[] = []
  const correctedBondOrders: ChemicalGraphBondCorrection[] = []
  const retained: MolecularGraphBond[] = []

  graph.bonds.forEach((bond) => {
    const length = bondLength(graph.nodes, bond)
    const start = graph.nodes.find((node) => node.id === bond.startNodeId)
    const end = graph.nodes.find((node) => node.id === bond.endNodeId)
    const ringEdge = ringKeys.has(bondKey(bond.startNodeId, bond.endNodeId))
    const crossings = crossingCount(graph.nodes, bond, graph.bonds)
    const bothTrustedAtoms = start?.source === "atom-label" && end?.source === "atom-label"
    const longThreshold = medianBondLength * (bond.gapBridged ? 2.2 : 1.8)
    const protectedRingEdge = ringEdge && bothTrustedAtoms && crossings === 0 && length <= medianBondLength * 2.45

    if (medianBondLength > 0 && length > longThreshold && !protectedRingEdge) {
      rejectedBonds.push(makeRejectedBond(
        graph.nodes,
        bond,
        length,
        "long-bond",
        `Bond length ${length.toFixed(1)} px exceeds the local median ${medianBondLength.toFixed(1)} px by more than ${bond.gapBridged ? "2.2x" : "1.8x"}.`,
      ))
      return
    }
    if (crossings >= 2 || (crossings >= 1 && !ringEdge && (bond.confidence < 74 || length > medianBondLength * 1.25))) {
      rejectedBonds.push(makeRejectedBond(
        graph.nodes,
        bond,
        length,
        "crossing-bond",
        `Bond crosses ${crossings} unrelated edge${crossings === 1 ? "" : "s"}, so it is treated as a likely diagonal/background artifact.`,
      ))
      return
    }

    let nextBond = { ...bond }
    if (nextBond.bondOrder === 3 && !hasRealTripleSupport(nextBond, graph.nodes, input.lineSegments, input.parallelBondPairs, ringEdge)) {
      const toOrder: 1 | 2 = ringEdge && aromaticSupport >= 45 ? 2 : nextBond.parallelPairCount >= 1 ? 2 : 1
      correctedBondOrders.push(correctionFor(
        graph.nodes,
        nextBond,
        3,
        toOrder,
        ringEdge
          ? "Triple-like strokes occur inside a ring; retained as aromatic/double-bond evidence instead of a true triple bond."
          : "Triple bond lacked three compact, collinear strokes between the same atom centers.",
      ))
      nextBond = { ...nextBond, bondOrder: toOrder, confidence: Math.max(38, nextBond.confidence - 8) }
    }
    retained.push(nextBond)
  })

  const valenceFixes = new Map<number, string[]>()
  const removedByValence = new Set<number>()
  const bondById = new Map(retained.map((bond) => [bond.id, bond]))
  const removeBond = (bond: MolecularGraphBond, node: MolecularGraphNode, reason: string) => {
    if (!bondById.has(bond.id)) return
    bondById.delete(bond.id)
    removedByValence.add(bond.id)
    valenceFixes.set(node.id, [...(valenceFixes.get(node.id) ?? []), reason])
    rejectedBonds.push(makeRejectedBond(graph.nodes, bond, bondLength(graph.nodes, bond), "valence", reason))
  }

  for (const node of graph.nodes) {
    const maxValence = VALENCE[node.inferredElement] ?? 4
    let currentBonds = [...bondById.values()].filter((bond) => bond.startNodeId === node.id || bond.endNodeId === node.id)
    let observedValence = currentBonds.reduce((sum, bond) => sum + bond.bondOrder, 0)
    while (observedValence > maxValence && currentBonds.length) {
      currentBonds.sort((left, right) => {
        const leftLength = bondLength(graph.nodes, left)
        const rightLength = bondLength(graph.nodes, right)
        const leftRing = ringKeys.has(bondKey(left.startNodeId, left.endNodeId))
        const rightRing = ringKeys.has(bondKey(right.startNodeId, right.endNodeId))
        return (
          (leftRing ? 28 : 0) - (rightRing ? 28 : 0) +
          left.confidence - right.confidence -
          (leftLength / Math.max(1, medianBondLength)) * 8 +
          (rightLength / Math.max(1, medianBondLength)) * 8 +
          (left.gapBridged ? -8 : 0) -
          (right.gapBridged ? -8 : 0)
        )
      })
      const target = currentBonds[0]
      if (!target) break
      const maxDegreeOne = node.inferredElement === "H" || ["F", "Cl", "Br", "I"].includes(node.inferredElement)
      if (!maxDegreeOne && target.bondOrder > 1 && observedValence - maxValence < target.bondOrder) {
        const nextOrder = (target.bondOrder - 1) as 1 | 2
        bondById.set(target.id, { ...target, bondOrder: nextOrder, confidence: Math.max(35, target.confidence - 6) })
        correctedBondOrders.push(correctionFor(
          graph.nodes,
          target,
          target.bondOrder,
          nextOrder,
          `${node.inferredElement} valence exceeded ${maxValence}; downgraded lowest-confidence incident multiple bond.`,
        ))
        valenceFixes.set(node.id, [
          ...(valenceFixes.get(node.id) ?? []),
          `Downgraded bond ${target.id} to order ${nextOrder} to respect ${node.inferredElement} valence.`,
        ])
      } else {
        removeBond(
          target,
          node,
          `${node.inferredElement} valence exceeded ${maxValence}; pruned bond ${target.id} as the weakest/longest incident edge.`,
        )
      }
      currentBonds = [...bondById.values()].filter((bond) => bond.startNodeId === node.id || bond.endNodeId === node.id)
      observedValence = currentBonds.reduce((sum, bond) => sum + bond.bondOrder, 0)
    }
  }

  const cleanedBonds = [...bondById.values()].map((bond, id) => ({ ...bond, id }))
  const rings = buildRings(graph.nodes, cleanedBonds, graph, input.ringClosure, input.ringCandidates)
  const selectedValidatedRing = rings[0]
    ? {
      nodeIds: rings[0].nodeIds,
      size: rings[0].size,
      aromatic: rings[0].aromatic,
      confidence: rings[0].confidence,
      reason: rings[0].aromatic
        ? "Validated six-member ring retained aromatic/double-bond support after pruning noisy edges."
        : "Validated ring retained chemically plausible edges after pruning.",
    }
    : null

  const valenceSummaries = graph.nodes.map((node): ChemicalGraphValenceSummary => {
    const observedValence = valenceFor(node, cleanedBonds)
    const observedDegree = degreeFor(node, cleanedBonds)
    const maxValence = VALENCE[node.inferredElement] ?? 4
    const valid = observedValence <= maxValence && observedDegree <= (node.inferredElement === "H" ? 1 : 6)
    return {
      nodeId: node.id,
      element: node.inferredElement,
      maxValence,
      observedValence,
      observedDegree,
      valid,
      fixes: valenceFixes.get(node.id) ?? [],
    }
  })

  const acceptedBonds: ChemicalGraphAcceptedBond[] = cleanedBonds.map((bond) => {
    const start = graph.nodes.find((node) => node.id === bond.startNodeId)
    const end = graph.nodes.find((node) => node.id === bond.endNodeId)
    return {
      id: bond.id,
      startNodeId: bond.startNodeId,
      endNodeId: bond.endNodeId,
      start: start ? nodePoint(start) : { x: 0, y: 0 },
      end: end ? nodePoint(end) : { x: 0, y: 0 },
      length: Math.round(bondLength(graph.nodes, bond) * 10) / 10,
      bondOrder: bond.bondOrder,
      confidence: bond.confidence,
      ringEdge: ringKeys.has(bondKey(bond.startNodeId, bond.endNodeId)),
    }
  })

  const longRejected = rejectedBonds.filter((bond) => bond.kind === "long-bond").length
  const crossingRejected = rejectedBonds.filter((bond) => bond.kind === "crossing-bond").length
  const valenceRejected = rejectedBonds.filter((bond) => bond.kind === "valence").length
  const invalidValenceCount = valenceSummaries.filter((summary) => !summary.valid).length
  const aromaticRingBonus = rings.some((ring) => ring.aromatic) ? 12 : rings.length ? 6 : 0
  const pruningPenalty = rawBondCount ? (rejectedBonds.length / rawBondCount) * 22 : 0
  const correctionPenalty = correctedBondOrders.length * 3
  const valencePenalty = invalidValenceCount * 16
  const graphValidityScore = Math.round(clamp(
    graph.estimates.confidence * 0.56 +
    (cleanedBonds.length ? 24 : 0) +
    aromaticRingBonus -
    pruningPenalty -
    correctionPenalty -
    valencePenalty,
    0,
    98,
  ))
  const validatedGraph = rebuildGraph(graph, cleanedBonds, rings, graphValidityScore, input.recognizedText)
  if (rejectedBonds.length) {
    validatedGraph.warnings = [
      ...validatedGraph.warnings,
      `${rejectedBonds.length} chemically implausible bond${rejectedBonds.length === 1 ? "" : "s"} pruned before evidence fusion.`,
    ]
  }
  if (correctedBondOrders.length) {
    validatedGraph.warnings = [
      ...validatedGraph.warnings,
      `${correctedBondOrders.length} bond order${correctedBondOrders.length === 1 ? "" : "s"} corrected by valence/triple-bond validation.`,
    ]
  }

  const diagnostics = [
    cleanedBonds.length
      ? `${cleanedBonds.length}/${rawBondCount} bonds survived chemical graph validation.`
      : "No bonds survived chemical graph validation.",
    longRejected ? `${longRejected} long false bond${longRejected === 1 ? "" : "s"} rejected.` : "No long false bonds rejected.",
    crossingRejected ? `${crossingRejected} high-crossing diagonal bond${crossingRejected === 1 ? "" : "s"} rejected.` : "No high-crossing bonds rejected.",
    valenceRejected ? `${valenceRejected} valence cleanup bond${valenceRejected === 1 ? "" : "s"} pruned.` : "Basic valence limits are satisfied.",
    correctedBondOrders.length
      ? `${correctedBondOrders.length} unsupported triple/multiple bond${correctedBondOrders.length === 1 ? "" : "s"} corrected.`
      : "No unsupported triple bonds found.",
    selectedValidatedRing
      ? selectedValidatedRing.reason
      : "No chemically validated ring candidate was retained.",
  ]

  return {
    rawBondCount,
    prunedBondCount: rawBondCount - cleanedBonds.length,
    rejectedBonds,
    correctedBondOrders,
    valenceSummaries,
    acceptedBonds,
    selectedValidatedRing,
    medianBondLength: Math.round(medianBondLength * 10) / 10,
    graphValidityScore,
    plausible: graphValidityScore >= 45 && cleanedBonds.length > 0 && invalidValenceCount === 0,
    diagnostics,
    validatedGraph,
  }
}
