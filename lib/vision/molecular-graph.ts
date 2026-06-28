import type {
  VisionFunctionalGroupCue,
  VisionAtomLabel,
  VisionGraphAnalysis,
  VisionLineSegment,
  VisionParallelBondPair,
  VisionPoint,
  VisionRingCandidate,
  VisionRingClosureAnalysis,
} from "../structure-vision/vision-types"

export type InferredElement = "C" | "H" | "O" | "N" | "S" | "P" | "F" | "Cl" | "Br" | "I" | "Unknown"
export type MolecularRingKind = "benzene-like" | "cyclohexane-like" | "cyclopentane-like" | "ring"

export interface MolecularGraphNode {
  id: number
  x: number
  y: number
  degree: number
  inferredElement: InferredElement
  confidence: number
  source: "atom-label" | "stroke"
  labelBounds?: VisionAtomLabel["bounds"]
  snappedSegmentIndexes: number[]
}

export interface MolecularGraphBond {
  id: number
  startNodeId: number
  endNodeId: number
  bondOrder: 1 | 2 | 3
  confidence: number
  sourceSegmentIndexes: number[]
  parallelPairCount: number
  gapBridged: boolean
}

export interface MolecularGraphRing {
  id: number
  nodeIds: number[]
  size: number
  confidence: number
  aromatic: boolean
  closed: boolean
  kind: MolecularRingKind
}

export interface MolecularGraphEstimates {
  atoms: number
  carbons: number
  bonds: number
  rings: number
  singleBonds: number
  doubleBonds: number
  tripleBonds: number
  estimatedFormula: string
  confidence: number
}

export interface MolecularGraph {
  nodes: MolecularGraphNode[]
  bonds: MolecularGraphBond[]
  rings: MolecularGraphRing[]
  aromatic: boolean
  aromaticRingIds: number[]
  estimates: MolecularGraphEstimates
  warnings: string[]
  atomCentered: boolean
  snapRadius: number
}

export interface MolecularGraphInput {
  graph: VisionGraphAnalysis
  lineSegments: VisionLineSegment[]
  parallelBondPairs: VisionParallelBondPair[]
  ringCandidates: VisionRingCandidate[]
  functionalGroupCues: VisionFunctionalGroupCue[]
  recognizedText?: string
  atomLabels?: VisionAtomLabel[]
  atomSnapRadius?: number
  imageWidth?: number
  imageHeight?: number
  ringClosure?: VisionRingClosureAnalysis
}

export interface MolecularGraphSimilarity {
  compoundId: string
  score: number
  confidence: number
  reasons: string[]
}

interface CompoundGraphSignature {
  compoundId: string
  carbons: number
  oxygens?: number
  ringSize?: number
  aromatic?: boolean
  doubleBonds?: number
  tripleBonds?: number
  cue?: VisionFunctionalGroupCue["kind"]
}

const GRAPH_SIGNATURES: CompoundGraphSignature[] = [
  { compoundId: "benzene", carbons: 6, ringSize: 6, aromatic: true, doubleBonds: 3 },
  { compoundId: "cyclohexane", carbons: 6, ringSize: 6, aromatic: false, doubleBonds: 0 },
  { compoundId: "ethanol", carbons: 2, oxygens: 1, cue: "hydroxyl" },
  { compoundId: "methanal", carbons: 1, oxygens: 1, doubleBonds: 1, cue: "carbonyl" },
  { compoundId: "ethanal", carbons: 2, oxygens: 1, doubleBonds: 1, cue: "carbonyl" },
  { compoundId: "ethanoic-acid", carbons: 2, oxygens: 2, doubleBonds: 1, cue: "carboxyl" },
  { compoundId: "acetone", carbons: 3, oxygens: 1, doubleBonds: 1, cue: "carbonyl" },
  { compoundId: "ethene", carbons: 2, doubleBonds: 1 },
  { compoundId: "ethyne", carbons: 2, tripleBonds: 1 },
]

const ELEMENT_ORDER: InferredElement[] = ["C", "H", "O", "N", "S", "P", "F", "Cl", "Br", "I"]
const VALENCE: Partial<Record<InferredElement, number>> = { C: 4, H: 1, O: 2, N: 3, S: 2, P: 3, F: 1, Cl: 1, Br: 1, I: 1 }

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))
}

function distance(left: VisionPoint, right: VisionPoint): number {
  return Math.hypot(left.x - right.x, left.y - right.y)
}

function angleDifference(left: number, right: number): number {
  const difference = Math.abs(left - right) % 180
  return Math.min(difference, 180 - difference)
}

function edgeAngle(start: VisionPoint, end: VisionPoint): number {
  const angle = Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI
  return (angle + 180) % 180
}

function pairBelongsToEdge(
  pair: VisionParallelBondPair,
  sourceSegmentIndexes: number[],
  start: VisionPoint,
  end: VisionPoint,
): boolean {
  if (sourceSegmentIndexes.includes(pair.firstSegmentIndex) || sourceSegmentIndexes.includes(pair.secondSegmentIndex)) {
    return true
  }
  const center = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }
  return angleDifference(pair.angle, edgeAngle(start, end)) <= 12 &&
    distance(pair.center, center) <= Math.max(8, distance(start, end) * 0.42)
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

function findClosedCycles(graph: VisionGraphAnalysis): number[][] {
  const adjacency = new Map<number, number[]>()
  graph.nodes.forEach((node) => adjacency.set(node.id, []))
  graph.edges.forEach((edge) => {
    adjacency.get(edge.startNodeId)?.push(edge.endNodeId)
    adjacency.get(edge.endNodeId)?.push(edge.startNodeId)
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
  graph.nodes.forEach((node) => walk(node.id, node.id, [node.id]))
  return Array.from(found.values()).filter((cycle) => cycle.length >= 3 && cycle.length <= 8)
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
  return Array.from(found.values())
}

function parseFormulaCounts(text: string): Map<InferredElement, number> {
  const counts = new Map<InferredElement, number>()
  const compact = text.replace(/[=#-]/g, "").replace(/\s+/g, " ")
  const candidates = compact.match(/(?:[A-Z][a-z]?\d*){2,}/g) ?? []
  const likelyFormula = candidates.sort((left, right) => right.length - left.length)[0]
  if (!likelyFormula) return counts
  for (const match of likelyFormula.matchAll(/([A-Z][a-z]?)(\d*)/g)) {
    const element = match[1] as InferredElement
    if (!ELEMENT_ORDER.includes(element)) continue
    counts.set(element, (counts.get(element) ?? 0) + Number(match[2] || "1"))
  }
  return counts
}

function assignElements(
  graph: VisionGraphAnalysis,
  bonds: MolecularGraphBond[],
  functionalGroupCues: VisionFunctionalGroupCue[],
  recognizedText: string,
): MolecularGraphNode[] {
  const degrees = new Map<number, number>()
  bonds.forEach((bond) => {
    degrees.set(bond.startNodeId, (degrees.get(bond.startNodeId) ?? 0) + 1)
    degrees.set(bond.endNodeId, (degrees.get(bond.endNodeId) ?? 0) + 1)
  })
  const formulaCounts = parseFormulaCounts(recognizedText)
  const oxygenCount = formulaCounts.get("O") ?? (
    functionalGroupCues.some((cue) => cue.kind === "carboxyl") ? 2 :
      functionalGroupCues.some((cue) => cue.kind === "carbonyl" || cue.kind === "hydroxyl") ? 1 : 0
  )
  const nitrogenCount = formulaCounts.get("N") ?? 0
  const nodes = graph.nodes.map((node): MolecularGraphNode => ({
    id: node.id,
    x: node.point.x,
    y: node.point.y,
    degree: degrees.get(node.id) ?? 0,
    inferredElement: "C",
    confidence: Math.round(clamp(node.mergeQuality * 0.7 + 22, 35, 92)),
    source: "stroke",
    snappedSegmentIndexes: [],
  }))
  const terminalNodes = [...nodes].sort((left, right) => left.degree - right.degree || right.x - left.x || left.id - right.id)
  let cursor = 0
  for (let index = 0; index < Math.min(oxygenCount, nodes.length); index += 1) {
    terminalNodes[cursor].inferredElement = "O"
    terminalNodes[cursor].confidence = formulaCounts.has("O") ? 78 : 58
    cursor += 1
  }
  for (let index = 0; index < Math.min(nitrogenCount, nodes.length - cursor); index += 1) {
    terminalNodes[cursor].inferredElement = "N"
    terminalNodes[cursor].confidence = 76
    cursor += 1
  }
  return nodes
}

function median(values: number[]): number {
  if (!values.length) return 0
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.floor(sorted.length / 2)]
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

function bondBetween(bonds: MolecularGraphBond[], left: number, right: number): MolecularGraphBond | undefined {
  return bonds.find((bond) =>
    (bond.startNodeId === left && bond.endNodeId === right) ||
    (bond.startNodeId === right && bond.endNodeId === left),
  )
}

function atomCenteredGraph(input: MolecularGraphInput): MolecularGraph | null {
  const labels = input.atomLabels ?? []
  if (labels.length < 2) return null
  let nodes: MolecularGraphNode[] = labels.map((label, id) => ({
    id,
    x: label.centroid.x,
    y: label.centroid.y,
    degree: 0,
    inferredElement: label.label,
    confidence: label.confidence,
    source: "atom-label",
    labelBounds: label.bounds,
    snappedSegmentIndexes: [],
  }))
  const nearestDistances = nodes.map((node) => Math.min(
    ...nodes.filter((candidate) => candidate.id !== node.id).map((candidate) => distance(node, candidate)),
  )).filter(Number.isFinite)
  const typicalBondLength = median(nearestDistances)
  if (!typicalBondLength) return null
  const largestGlyph = Math.max(...labels.map((label) => Math.max(label.bounds.width, label.bounds.height)), 1)
  const snapRadius = input.atomSnapRadius ?? clamp(Math.max(largestGlyph * 1.35, typicalBondLength * 0.34, 8), 8, 34)
  const maximumBondLength = typicalBondLength * 1.62
  let bonds: MolecularGraphBond[] = []

  for (let leftIndex = 0; leftIndex < nodes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < nodes.length; rightIndex += 1) {
      const left = nodes[leftIndex]
      const right = nodes[rightIndex]
      const atomDistance = distance(left, right)
      if (atomDistance > maximumBondLength || atomDistance < largestGlyph * 0.55) continue
      const atomAngle = edgeAngle(left, right)
      const qualifying: Array<{ index: number; direct: boolean }> = []
      input.lineSegments.forEach((segment, segmentIndex) => {
        if (angleDifference(segment.angle, atomAngle) > 16) return
        const forwardStart = distance(segment.start, left)
        const forwardEnd = distance(segment.end, right)
        const reverseStart = distance(segment.start, right)
        const reverseEnd = distance(segment.end, left)
        const forward = forwardStart + forwardEnd <= reverseStart + reverseEnd
        const firstDistance = forward ? forwardStart : reverseStart
        const secondDistance = forward ? forwardEnd : reverseEnd
        const direct = firstDistance <= snapRadius && secondDistance <= snapRadius
        const ratios = [projection(segment.start, left, right), projection(segment.end, left, right)].sort((a, b) => a - b)
        const overlap = Math.max(0, Math.min(1.12, ratios[1]) - Math.max(-0.12, ratios[0]))
        const collinear = distanceToLine(segment.midpoint, left, right) <= Math.max(6, snapRadius * 1.25)
        const bridged = overlap >= 0.35 && ratios[1] >= 0.2 && ratios[0] <= 0.8 && collinear
        if (direct || bridged) qualifying.push({ index: segmentIndex, direct })
      })
      if (!qualifying.length) continue

      const parallelPairs = input.parallelBondPairs.filter((pair) => {
        if (angleDifference(pair.angle, atomAngle) > 14) return false
        const ratio = projection(pair.center, left, right)
        return ratio >= -0.08 && ratio <= 1.08 && distanceToLine(pair.center, left, right) <= Math.max(6, snapRadius * 1.1)
      })
      const bondOrder: 1 | 2 | 3 = parallelPairs.length >= 2 ? 3 : parallelPairs.length === 1 ? 2 : 1
      const sourceSegmentIndexes = Array.from(new Set([
        ...qualifying.map((candidate) => candidate.index),
        ...parallelPairs.flatMap((pair) => [pair.firstSegmentIndex, pair.secondSegmentIndex]),
      ]))
      const gapBridged = !qualifying.some((candidate) => candidate.direct)
      const averageLabelConfidence = (left.confidence + right.confidence) / 2
      bonds.push({
        id: bonds.length,
        startNodeId: left.id,
        endNodeId: right.id,
        bondOrder,
        confidence: Math.round(clamp(averageLabelConfidence * 0.55 + (gapBridged ? 24 : 34) + (bondOrder > 1 ? 5 : 0), 38, 96)),
        sourceSegmentIndexes,
        parallelPairCount: parallelPairs.length,
        gapBridged,
      })
      left.snappedSegmentIndexes.push(...sourceSegmentIndexes)
      right.snappedSegmentIndexes.push(...sourceSegmentIndexes)
    }
  }
  if (!bonds.length) return null

  const initialDegree = (nodeId: number) => bonds.filter((bond) =>
    bond.startNodeId === nodeId || bond.endNodeId === nodeId,
  ).length
  const continuationPairs: Array<{ left: MolecularGraphNode; right: MolecularGraphNode; distance: number }> = []
  for (let leftIndex = 0; leftIndex < nodes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < nodes.length; rightIndex += 1) {
      const left = nodes[leftIndex]
      const right = nodes[rightIndex]
      const atomDistance = distance(left, right)
      if (bondBetween(bonds, left.id, right.id) || atomDistance > typicalBondLength * 1.28 || atomDistance < typicalBondLength * 0.62) continue
      if (initialDegree(left.id) === 0 || initialDegree(right.id) === 0) continue
      continuationPairs.push({ left, right, distance: atomDistance })
    }
  }
  continuationPairs.sort((left, right) => left.distance - right.distance)
  for (const candidate of continuationPairs) {
    const { left, right } = candidate
    if (bondBetween(bonds, left.id, right.id) || initialDegree(left.id) >= 3 || initialDegree(right.id) >= 3) continue
    const atomAngle = edgeAngle(left, right)
    const continuationSegments = input.lineSegments.map((segment, index) => ({ segment, index })).filter(({ segment }) => {
      if (angleDifference(segment.angle, atomAngle) > 18) return false
      const ratios = [projection(segment.start, left, right), projection(segment.end, left, right)].sort((a, b) => a - b)
      const reachesBondSpan = ratios[1] >= 0.08 && ratios[0] <= 0.92
      return reachesBondSpan && distanceToLine(segment.midpoint, left, right) <= Math.max(7, snapRadius * 1.35)
    })
    if (!continuationSegments.length) continue
    const parallelPairs = input.parallelBondPairs.filter((pair) =>
      angleDifference(pair.angle, atomAngle) <= 15 &&
      projection(pair.center, left, right) >= -0.08 &&
      projection(pair.center, left, right) <= 1.08 &&
      distanceToLine(pair.center, left, right) <= Math.max(7, snapRadius * 1.2),
    )
    const bondOrder: 1 | 2 | 3 = parallelPairs.length >= 2 ? 3 : parallelPairs.length === 1 ? 2 : 1
    const sourceSegmentIndexes = Array.from(new Set([
      ...continuationSegments.map(({ index }) => index),
      ...parallelPairs.flatMap((pair) => [pair.firstSegmentIndex, pair.secondSegmentIndex]),
    ]))
    bonds.push({
      id: bonds.length,
      startNodeId: left.id,
      endNodeId: right.id,
      bondOrder,
      confidence: Math.round(clamp(48 + Math.min(12, continuationSegments.length * 3) + (bondOrder > 1 ? 6 : 0), 48, 72)),
      sourceSegmentIndexes,
      parallelPairCount: parallelPairs.length,
      gapBridged: true,
    })
    left.snappedSegmentIndexes.push(...sourceSegmentIndexes)
    right.snappedSegmentIndexes.push(...sourceSegmentIndexes)
  }

  const selectedClosure = input.ringClosure?.candidates.find((candidate) =>
    candidate.selected &&
    candidate.source === "atom-centroid" &&
    candidate.memberCount >= 5 &&
    candidate.memberCount <= 8 &&
    candidate.confidence >= 50 &&
    candidate.lineCoverage >= 58 &&
    candidate.closureConfidence >= 48,
  )
  if (selectedClosure) {
    selectedClosure.closureGaps.forEach((gap) => {
      const left = nodes.find((node) => node.id === gap.fromNodeId)
      const right = nodes.find((node) => node.id === gap.toNodeId)
      if (!left || !right || bondBetween(bonds, left.id, right.id)) return
      const ringDoubleBondTarget = selectedClosure.aromaticSupport >= 55 && selectedClosure.memberCount === 6
      const existingDoubleBonds = bonds.filter((bond) =>
        selectedClosure.nodeIds.includes(bond.startNodeId) &&
        selectedClosure.nodeIds.includes(bond.endNodeId) &&
        bond.bondOrder >= 2,
      ).length
      const bondOrder: 1 | 2 = ringDoubleBondTarget && existingDoubleBonds < 3 ? 2 : 1
      bonds.push({
        id: bonds.length,
        startNodeId: left.id,
        endNodeId: right.id,
        bondOrder,
        confidence: Math.round(clamp(gap.confidence * 0.72 + selectedClosure.regularity * 0.18 + selectedClosure.lineCoverage * 0.1, 45, 76)),
        sourceSegmentIndexes: [],
        parallelPairCount: bondOrder === 2 ? 1 : 0,
        gapBridged: true,
      })
    })
  }

  const adjacency = new Map(nodes.map((node) => [node.id, [] as number[]]))
  bonds.forEach((bond) => {
    adjacency.get(bond.startNodeId)?.push(bond.endNodeId)
    adjacency.get(bond.endNodeId)?.push(bond.startNodeId)
  })
  const components: number[][] = []
  const visited = new Set<number>()
  nodes.forEach((node) => {
    if (visited.has(node.id)) return
    const component: number[] = []
    const queue = [node.id]
    visited.add(node.id)
    while (queue.length) {
      const current = queue.shift()
      if (current === undefined) continue
      component.push(current)
      for (const neighbor of adjacency.get(current) ?? []) {
        if (visited.has(neighbor)) continue
        visited.add(neighbor)
        queue.push(neighbor)
      }
    }
    components.push(component)
  })
  components.sort((left, right) => {
    const edgesIn = (ids: number[]) => bonds.filter((bond) => ids.includes(bond.startNodeId) && ids.includes(bond.endNodeId)).length
    return edgesIn(right) - edgesIn(left) || right.length - left.length
  })
  const primaryIds = new Set(components[0] ?? [])
  if (components.length > 1 && primaryIds.size >= 2) {
    const retained = nodes.filter((node) => primaryIds.has(node.id))
    const idMap = new Map(retained.map((node, index) => [node.id, index]))
    nodes = retained.map((node, id) => ({ ...node, id }))
    bonds = bonds
      .filter((bond) => primaryIds.has(bond.startNodeId) && primaryIds.has(bond.endNodeId))
      .map((bond, id) => ({
        ...bond,
        id,
        startNodeId: idMap.get(bond.startNodeId) ?? 0,
        endNodeId: idMap.get(bond.endNodeId) ?? 0,
      }))
  }
  nodes.forEach((node) => {
    node.degree = bonds.filter((bond) => bond.startNodeId === node.id || bond.endNodeId === node.id).length
    node.snappedSegmentIndexes = Array.from(new Set(node.snappedSegmentIndexes))
  })

  const cycles = findMolecularCycles(nodes, bonds)
  const ringCycleMap = new Map<string, { nodeIds: number[]; inferred: boolean }>()
  cycles.forEach((nodeIds) => ringCycleMap.set(canonicalCycle(nodeIds), { nodeIds, inferred: false }))
  if (selectedClosure && selectedClosure.recovered && selectedClosure.confidence >= 55) {
    ringCycleMap.set(canonicalCycle(selectedClosure.nodeIds), { nodeIds: selectedClosure.nodeIds, inferred: true })
  }
  const rings = Array.from(ringCycleMap.values()).map(({ nodeIds, inferred }, id): MolecularGraphRing => {
    const orders = nodeIds.map((nodeId, index) =>
      bondBetween(bonds, nodeId, nodeIds[(index + 1) % nodeIds.length])?.bondOrder ?? 1,
    )
    const doubleCount = orders.filter((order) => order >= 2).length
    const alternating = nodeIds.length === 6 && doubleCount >= 3 && orders.every((order, index) =>
      order !== orders[(index + 1) % orders.length],
    )
    const closureSupport = selectedClosure && canonicalCycle(selectedClosure.nodeIds) === canonicalCycle(nodeIds)
    const aromatic = nodeIds.length === 6 && (
      alternating || doubleCount >= 3 || (closureSupport && selectedClosure.aromaticSupport >= 55)
    )
    const kind: MolecularRingKind = aromatic
      ? "benzene-like"
      : nodeIds.length === 6
        ? "cyclohexane-like"
        : nodeIds.length === 5
          ? "cyclopentane-like"
          : "ring"
    return {
      id,
      nodeIds,
      size: nodeIds.length,
      confidence: Math.round(clamp(
        68 + Math.min(18, doubleCount * 5) + (aromatic ? 8 : 0) + (closureSupport ? selectedClosure.confidence * 0.12 : 0),
        0,
        96,
      )),
      aromatic,
      closed: !inferred,
      kind,
    }
  })
  const confidence = Math.round(clamp(
    nodes.reduce((sum, node) => sum + node.confidence, 0) / nodes.length * 0.45 +
    bonds.reduce((sum, bond) => sum + bond.confidence, 0) / bonds.length * 0.4 +
    (rings.length ? Math.max(...rings.map((ring) => ring.confidence)) : 45) * 0.15,
    0,
    96,
  ))
  const carbons = nodes.filter((node) => node.inferredElement === "C").length
  return {
    nodes,
    bonds,
    rings,
    aromatic: rings.some((ring) => ring.aromatic),
    aromaticRingIds: rings.filter((ring) => ring.aromatic).map((ring) => ring.id),
    estimates: {
      atoms: nodes.length,
      carbons,
      bonds: bonds.length,
      rings: rings.length,
      singleBonds: bonds.filter((bond) => bond.bondOrder === 1).length,
      doubleBonds: bonds.filter((bond) => bond.bondOrder === 2).length,
      tripleBonds: bonds.filter((bond) => bond.bondOrder === 3).length,
      estimatedFormula: estimateFormula(nodes, bonds, ""),
      confidence,
    },
    warnings: bonds.some((bond) => bond.gapBridged)
      ? ["Short label-to-bond gaps were bridged during atom-centered reconstruction."]
      : [],
    atomCentered: true,
    snapRadius: Math.round(snapRadius * 10) / 10,
  }
}

function cleanupStrokeInput(input: MolecularGraphInput): MolecularGraphInput {
  const width = input.imageWidth ?? 0
  const height = input.imageHeight ?? 0
  if (!width || !height || input.graph.nodes.length < 2) return input
  const borderMargin = Math.max(3, Math.min(width, height) * 0.035)
  const labelRadius = Math.max(8, input.graph.endpointTolerance * 0.8)
  const allowedNodes = input.graph.nodes.filter((node) => {
    const nearBorder = node.point.x <= borderMargin || node.point.y <= borderMargin ||
      node.point.x >= width - borderMargin || node.point.y >= height - borderMargin
    if (!nearBorder) return true
    return (input.atomLabels ?? []).some((label) => distance(label.centroid, node.point) <= labelRadius)
  })
  const allowedIds = new Set(allowedNodes.map((node) => node.id))
  const allowedEdges = input.graph.edges.filter((edge) => allowedIds.has(edge.startNodeId) && allowedIds.has(edge.endNodeId))
  const adjacency = new Map<number, number[]>()
  allowedNodes.forEach((node) => adjacency.set(node.id, []))
  allowedEdges.forEach((edge) => {
    adjacency.get(edge.startNodeId)?.push(edge.endNodeId)
    adjacency.get(edge.endNodeId)?.push(edge.startNodeId)
  })
  const components: number[][] = []
  const visited = new Set<number>()
  allowedNodes.forEach((node) => {
    if (visited.has(node.id)) return
    const component: number[] = []
    const queue = [node.id]
    visited.add(node.id)
    while (queue.length) {
      const current = queue.shift()
      if (current === undefined) continue
      component.push(current)
      for (const neighbor of adjacency.get(current) ?? []) {
        if (visited.has(neighbor)) continue
        visited.add(neighbor)
        queue.push(neighbor)
      }
    }
    components.push(component)
  })
  components.sort((left, right) => {
    const leftEdges = allowedEdges.filter((edge) => left.includes(edge.startNodeId) && left.includes(edge.endNodeId)).length
    const rightEdges = allowedEdges.filter((edge) => right.includes(edge.startNodeId) && right.includes(edge.endNodeId)).length
    return rightEdges - leftEdges || right.length - left.length
  })
  const primaryIds = new Set(components[0] ?? [])
  const primaryNodes = allowedNodes.filter((node) => primaryIds.has(node.id))
  if (!primaryNodes.length) return input
  const idMap = new Map(primaryNodes.map((node, index) => [node.id, index]))
  const nodes = primaryNodes.map((node, id) => ({ ...node, id }))
  const edges = allowedEdges
    .filter((edge) => primaryIds.has(edge.startNodeId) && primaryIds.has(edge.endNodeId))
    .map((edge, id) => ({
      ...edge,
      id,
      startNodeId: idMap.get(edge.startNodeId) ?? 0,
      endNodeId: idMap.get(edge.endNodeId) ?? 0,
    }))
  const remapRing = (ring: VisionRingCandidate): VisionRingCandidate | null => {
    if (!ring.nodeIds.every((nodeId) => primaryIds.has(nodeId))) return null
    return { ...ring, nodeIds: ring.nodeIds.map((nodeId) => idMap.get(nodeId) ?? 0) }
  }
  const ringCandidates = input.ringCandidates.map(remapRing).filter((ring): ring is VisionRingCandidate => Boolean(ring))
  return {
    ...input,
    graph: {
      ...input.graph,
      nodes,
      edges,
      cycleCandidates: input.graph.cycleCandidates.map(remapRing).filter((ring): ring is VisionRingCandidate => Boolean(ring)),
      nearRingCandidates: input.graph.nearRingCandidates.map(remapRing).filter((ring): ring is VisionRingCandidate => Boolean(ring)),
      explanation: components.length > 1 || allowedNodes.length !== input.graph.nodes.length
        ? "Border artifacts and disconnected graph components were removed before molecular reconstruction."
        : input.graph.explanation,
    },
    ringCandidates,
  }
}

function estimateFormula(nodes: MolecularGraphNode[], bonds: MolecularGraphBond[], recognizedText: string): string {
  const parsed = parseFormulaCounts(recognizedText)
  if (parsed.size > 0) {
    return ELEMENT_ORDER
      .filter((element) => parsed.has(element))
      .map((element) => `${element}${(parsed.get(element) ?? 1) === 1 ? "" : parsed.get(element)}`)
      .join("")
  }

  const counts = new Map<InferredElement, number>()
  nodes.forEach((node) => counts.set(node.inferredElement, (counts.get(node.inferredElement) ?? 0) + 1))
  let hydrogens = 0
  nodes.forEach((node) => {
    const usedValence = bonds
      .filter((bond) => bond.startNodeId === node.id || bond.endNodeId === node.id)
      .reduce((sum, bond) => sum + bond.bondOrder, 0)
    hydrogens += Math.max(0, (VALENCE[node.inferredElement] ?? 0) - usedValence)
  })
  if (hydrogens > 0) counts.set("H", hydrogens)
  return ELEMENT_ORDER
    .filter((element) => counts.has(element))
    .map((element) => `${element}${(counts.get(element) ?? 1) === 1 ? "" : counts.get(element)}`)
    .join("") || "Unavailable"
}

export function reconstructMolecularGraph(input: MolecularGraphInput): MolecularGraph {
  const centered = atomCenteredGraph(input)
  if (centered) return centered
  input = cleanupStrokeInput(input)
  const bonds = input.graph.edges.map((edge): MolecularGraphBond => {
    const start = input.graph.nodes[edge.startNodeId]?.point ?? { x: 0, y: 0 }
    const end = input.graph.nodes[edge.endNodeId]?.point ?? { x: 0, y: 0 }
    const pairs = input.parallelBondPairs.filter((pair) =>
      pairBelongsToEdge(pair, edge.sourceSegmentIndexes, start, end),
    )
    const sourceStrokeCount = new Set([
      ...edge.sourceSegmentIndexes,
      ...pairs.flatMap((pair) => [pair.firstSegmentIndex, pair.secondSegmentIndex]),
    ]).size
    const bondOrder: 1 | 2 | 3 = sourceStrokeCount >= 3 || pairs.length >= 2 ? 3 : pairs.length === 1 || sourceStrokeCount === 2 ? 2 : 1
    const averageMerge = (
      (input.graph.nodes[edge.startNodeId]?.mergeQuality ?? 40) +
      (input.graph.nodes[edge.endNodeId]?.mergeQuality ?? 40)
    ) / 2
    return {
      id: edge.id,
      startNodeId: edge.startNodeId,
      endNodeId: edge.endNodeId,
      bondOrder,
      confidence: Math.round(clamp(averageMerge * 0.55 + (bondOrder > 1 ? 30 : 22), 35, 94)),
      sourceSegmentIndexes: Array.from(new Set(edge.sourceSegmentIndexes)),
      parallelPairCount: pairs.length,
      gapBridged: false,
    }
  })

  const detectedCycles = findClosedCycles(input.graph)
  const ringMap = new Map<string, { nodeIds: number[]; confidence: number; aromatic: boolean; closed: boolean }>()
  detectedCycles.forEach((nodeIds) => {
    ringMap.set(canonicalCycle(nodeIds), { nodeIds, confidence: 65, aromatic: false, closed: true })
  })
  input.ringCandidates.forEach((candidate) => {
    if (candidate.sidesEstimate < 3 || candidate.sidesEstimate > 8) return
    const nodeIds = candidate.nodeIds.length === candidate.sidesEstimate
      ? candidate.nodeIds
      : detectedCycles.find((cycle) => cycle.length === candidate.sidesEstimate) ?? []
    if (!nodeIds.length) return
    const key = canonicalCycle(nodeIds)
    const existing = ringMap.get(key)
    ringMap.set(key, {
      nodeIds,
      confidence: Math.max(existing?.confidence ?? 0, candidate.confidence),
      aromatic: Boolean(existing?.aromatic || candidate.benzeneLike || candidate.aromaticCueScore >= 50),
      closed: Boolean(existing?.closed || !candidate.nearRing),
    })
  })
  input.ringClosure?.candidates.forEach((candidate) => {
    if (!candidate.selected || candidate.memberCount < 5 || candidate.memberCount > 8 || candidate.confidence < 50) return
    const nodeIds = candidate.nodeIds.every((nodeId) => input.graph.nodes.some((node) => node.id === nodeId))
      ? candidate.nodeIds
      : []
    if (!nodeIds.length) return
    const key = canonicalCycle(nodeIds)
    const existing = ringMap.get(key)
    ringMap.set(key, {
      nodeIds,
      confidence: Math.max(existing?.confidence ?? 0, candidate.confidence),
      aromatic: Boolean(existing?.aromatic || (candidate.memberCount === 6 && candidate.aromaticSupport >= 55)),
      closed: Boolean(existing?.closed || candidate.closed),
    })
  })

  const rings = Array.from(ringMap.values()).map((ring, id): MolecularGraphRing => {
    const ringBondOrders = bonds
      .filter((bond) => ring.nodeIds.includes(bond.startNodeId) && ring.nodeIds.includes(bond.endNodeId))
      .map((bond) => bond.bondOrder)
    const alternatingSupport = ringBondOrders.filter((order) => order >= 2).length >= Math.floor(ring.nodeIds.length / 2)
    const aromatic = ring.aromatic || (ring.nodeIds.length === 6 && alternatingSupport)
    const kind: MolecularRingKind = aromatic && ring.nodeIds.length === 6
      ? "benzene-like"
      : ring.nodeIds.length === 6
        ? "cyclohexane-like"
        : ring.nodeIds.length === 5
          ? "cyclopentane-like"
          : "ring"
    return { id, nodeIds: ring.nodeIds, size: ring.nodeIds.length, confidence: Math.round(ring.confidence), aromatic, closed: ring.closed, kind }
  })

  const nodes = assignElements(input.graph, bonds, input.functionalGroupCues, input.recognizedText ?? "")
  const carbons = nodes.filter((node) => node.inferredElement === "C").length
  const confidence = Math.round(clamp(
    (nodes.reduce((sum, node) => sum + node.confidence, 0) / Math.max(1, nodes.length)) * 0.45 +
    (bonds.reduce((sum, bond) => sum + bond.confidence, 0) / Math.max(1, bonds.length)) * 0.4 +
    (rings.length ? Math.max(...rings.map((ring) => ring.confidence)) : 50) * 0.15,
    0,
    94,
  ))
  const warnings: string[] = []
  if (!nodes.length) warnings.push("No stable molecular graph nodes were reconstructed.")
  if (input.graph.nearRingCandidates.length && !rings.some((ring) => ring.closed)) {
    warnings.push("A near-ring was retained with an inferred closing bond; verify the drawing crop.")
  }
  if (nodes.some((node) => node.inferredElement !== "C" && node.confidence < 70)) {
    warnings.push("Heteroatom placement is inferred from text or functional-group cues and may need confirmation.")
  }

  return {
    nodes,
    bonds,
    rings,
    aromatic: rings.some((ring) => ring.aromatic),
    aromaticRingIds: rings.filter((ring) => ring.aromatic).map((ring) => ring.id),
    estimates: {
      atoms: nodes.length,
      carbons,
      bonds: bonds.length,
      rings: rings.length,
      singleBonds: bonds.filter((bond) => bond.bondOrder === 1).length,
      doubleBonds: bonds.filter((bond) => bond.bondOrder === 2).length,
      tripleBonds: bonds.filter((bond) => bond.bondOrder === 3).length,
      estimatedFormula: estimateFormula(nodes, bonds, input.recognizedText ?? ""),
      confidence,
    },
    warnings,
    atomCentered: false,
    snapRadius: 0,
  }
}

function countElement(graph: MolecularGraph, element: InferredElement): number {
  return graph.nodes.filter((node) => node.inferredElement === element).length
}

export function scoreMolecularGraphSimilarity(graph: MolecularGraph, compoundId: string): MolecularGraphSimilarity | null {
  const signature = GRAPH_SIGNATURES.find((candidate) => candidate.compoundId === compoundId)
  if (!signature || graph.nodes.length === 0) return null
  const reasons: string[] = []
  let score = 0
  const carbonDifference = Math.abs(graph.estimates.carbons - signature.carbons)
  if (carbonDifference === 0) {
    score += 18
    reasons.push(`Carbon skeleton matches ${signature.carbons} carbon${signature.carbons === 1 ? "" : "s"}`)
  } else if (carbonDifference === 1) {
    score += 7
    reasons.push("Carbon skeleton is within one detected vertex")
  }

  if (signature.oxygens !== undefined) {
    const oxygenDifference = Math.abs(countElement(graph, "O") - signature.oxygens)
    if (oxygenDifference === 0) {
      score += 10
      reasons.push(`${signature.oxygens} oxygen atom${signature.oxygens === 1 ? "" : "s"} inferred`)
    } else score -= Math.min(14, oxygenDifference * 10)
  }
  if (signature.ringSize !== undefined) {
    const ring = graph.rings.find((candidate) => candidate.size === signature.ringSize)
    if (ring) {
      score += 17
      reasons.push(`${signature.ringSize}-member reconstructed ring`)
      if (signature.aromatic === ring.aromatic) {
        score += 15
        reasons.push(signature.aromatic ? "Aromatic ring bond pattern" : "Saturated ring bond pattern")
      } else if (signature.aromatic) {
        score -= 12
      }
    } else {
      score -= 10
    }
  } else if (graph.rings.length > 0) {
    score -= 12
  }

  if (signature.doubleBonds !== undefined) {
    const difference = Math.abs(graph.estimates.doubleBonds - signature.doubleBonds)
    if (difference === 0) {
      score += 12
      reasons.push(`${signature.doubleBonds} double bond${signature.doubleBonds === 1 ? "" : "s"} reconstructed`)
    } else if (difference === 1 && signature.doubleBonds > 1) score += 5
  }
  if (signature.tripleBonds !== undefined && graph.estimates.tripleBonds === signature.tripleBonds) {
    score += 18
    reasons.push("Triple bond reconstructed from three parallel strokes")
  }
  if (signature.cue) {
    const formula = graph.estimates.estimatedFormula.toLowerCase()
    const cueSupported = signature.cue === "hydroxyl" ? countElement(graph, "O") > 0 :
      signature.cue === "carbonyl" ? countElement(graph, "O") > 0 && graph.estimates.doubleBonds > 0 :
        signature.cue === "carboxyl" ? countElement(graph, "O") >= 2 && graph.estimates.doubleBonds > 0 : false
    if (cueSupported || (signature.cue === "hydroxyl" && /o/.test(formula))) {
      score += 12
      reasons.push(`${signature.cue} graph pattern`)
    } else score -= 8
  }

  score = Math.round(clamp(score, 0, 62))
  if (score < 12) return null
  return {
    compoundId,
    score,
    confidence: Math.round(clamp(score * 1.25 + graph.estimates.confidence * 0.18, 18, 90)),
    reasons,
  }
}

export function rankMolecularGraphCandidates(graph: MolecularGraph): MolecularGraphSimilarity[] {
  return GRAPH_SIGNATURES
    .map((signature) => scoreMolecularGraphSimilarity(graph, signature.compoundId))
    .filter((candidate): candidate is MolecularGraphSimilarity => Boolean(candidate))
    .sort((left, right) => right.score - left.score || left.compoundId.localeCompare(right.compoundId))
}
