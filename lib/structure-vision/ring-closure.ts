import type {
  VisionAtomLabel,
  VisionGraphAnalysis,
  VisionLineSegment,
  VisionParallelBondPair,
  VisionPoint,
  VisionRingClosureAnalysis,
  VisionRingClosureBridgeEvent,
  VisionRingClosureCandidate,
  VisionRingClosureSnapEvent,
  VisionRingCandidate,
  VisionScoreBreakdown,
} from "./vision-types"

interface ClosureNode {
  id: number
  point: VisionPoint
  label?: VisionAtomLabel["label"]
  atomLabelId?: number
  confidence: number
  source: "atom-centroid" | "endpoint-graph"
}

interface ClosureEdge {
  startNodeId: number
  endNodeId: number
  sourceSegmentIndexes: number[]
  bondOrder: 1 | 2 | 3
  confidence: number
  bridged: boolean
}

interface ClosureGraph {
  nodes: ClosureNode[]
  edges: ClosureEdge[]
  parallelBondPairs: VisionParallelBondPair[]
  snapEvents: VisionRingClosureSnapEvent[]
  bridgeEvents: VisionRingClosureBridgeEvent[]
  typicalBondLength: number
  source: VisionRingClosureCandidate["source"]
}

export interface RingClosureInput {
  graph: VisionGraphAnalysis
  lineSegments: VisionLineSegment[]
  parallelBondPairs: VisionParallelBondPair[]
  atomLabels: VisionAtomLabel[]
  recognizedText?: string
  imageWidth: number
  imageHeight: number
}

function clamp(value: number, minimum = 0, maximum = 100): number {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
}

function distance(left: VisionPoint, right: VisionPoint): number {
  return Math.hypot(left.x - right.x, left.y - right.y)
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length)
}

function median(values: number[]): number {
  if (!values.length) return 0
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.floor(sorted.length / 2)]
}

function coefficientRegularity(values: number[]): number {
  if (!values.length) return 0
  const mean = average(values)
  if (mean <= 0) return 0
  const deviation = Math.sqrt(average(values.map((value) => (value - mean) ** 2)))
  return clamp(100 - (deviation / mean) * 150)
}

function polygonArea(points: VisionPoint[]): number {
  let area = 0
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index]
    const next = points[(index + 1) % points.length]
    area += current.x * next.y - next.x * current.y
  }
  return Math.abs(area) / 2
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

function isSimplePolygon(points: VisionPoint[]): boolean {
  for (let left = 0; left < points.length; left += 1) {
    const leftNext = (left + 1) % points.length
    for (let right = left + 1; right < points.length; right += 1) {
      const rightNext = (right + 1) % points.length
      if (left === right || leftNext === right || rightNext === left) continue
      if (segmentsIntersect(points[left], points[leftNext], points[right], points[rightNext])) return false
    }
  }
  return true
}

function edgeAngle(start: VisionPoint, end: VisionPoint): number {
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

function canonicalCycle(nodeIds: number[]): string {
  const variants: string[] = []
  const add = (values: number[]) => {
    values.forEach((_, index) => variants.push([...values.slice(index), ...values.slice(0, index)].join("-")))
  }
  add(nodeIds)
  add([...nodeIds].reverse())
  return variants.sort()[0] ?? ""
}

function bondKey(left: number, right: number): string {
  return [left, right].sort((a, b) => a - b).join("-")
}

function findEdge(edges: ClosureEdge[], left: number, right: number): ClosureEdge | undefined {
  return edges.find((edge) =>
    (edge.startNodeId === left && edge.endNodeId === right) ||
    (edge.startNodeId === right && edge.endNodeId === left),
  )
}

function nearestDistances(nodes: ClosureNode[]): number[] {
  return nodes
    .map((node) => Math.min(...nodes.filter((candidate) => candidate.id !== node.id).map((candidate) => distance(node.point, candidate.point))))
    .filter(Number.isFinite)
}

function parallelPairsNearEdge(
  pairs: VisionParallelBondPair[],
  start: VisionPoint,
  end: VisionPoint,
  tolerance: number,
): VisionParallelBondPair[] {
  const angle = edgeAngle(start, end)
  return pairs.filter((pair) => {
    const ratio = projection(pair.center, start, end)
    return angleDifference(pair.angle, angle) <= 15 &&
      ratio >= -0.12 &&
      ratio <= 1.12 &&
      distanceToLine(pair.center, start, end) <= tolerance
  })
}

function edgeSegmentSupport(
  segments: VisionLineSegment[],
  pairs: VisionParallelBondPair[],
  start: VisionPoint,
  end: VisionPoint,
  snapRadius: number,
): { indexes: number[]; direct: boolean; bridged: boolean; bondOrder: 1 | 2 | 3; confidence: number } {
  const angle = edgeAngle(start, end)
  const qualifying: Array<{ index: number; direct: boolean; overlap: number }> = []
  segments.forEach((segment, index) => {
    if (angleDifference(segment.angle, angle) > 18) return
    const forwardStart = distance(segment.start, start)
    const forwardEnd = distance(segment.end, end)
    const reverseStart = distance(segment.start, end)
    const reverseEnd = distance(segment.end, start)
    const forward = forwardStart + forwardEnd <= reverseStart + reverseEnd
    const firstDistance = forward ? forwardStart : reverseStart
    const secondDistance = forward ? forwardEnd : reverseEnd
    const direct = firstDistance <= snapRadius && secondDistance <= snapRadius
    const ratios = [projection(segment.start, start, end), projection(segment.end, start, end)].sort((a, b) => a - b)
    const overlap = Math.max(0, Math.min(1.12, ratios[1]) - Math.max(-0.12, ratios[0]))
    const collinear = distanceToLine(segment.midpoint, start, end) <= Math.max(5, snapRadius * 1.25)
    const bridged = overlap >= 0.32 && ratios[1] >= 0.16 && ratios[0] <= 0.84 && collinear
    if (direct || bridged) qualifying.push({ index, direct, overlap })
  })
  const nearbyPairs = parallelPairsNearEdge(pairs, start, end, Math.max(6, snapRadius * 1.1))
  const indexes = Array.from(new Set([
    ...qualifying.map((candidate) => candidate.index),
    ...nearbyPairs.flatMap((pair) => [pair.firstSegmentIndex, pair.secondSegmentIndex]),
  ]))
  const bondOrder: 1 | 2 | 3 = nearbyPairs.length >= 2 ? 3 : nearbyPairs.length === 1 ? 2 : 1
  const direct = qualifying.some((candidate) => candidate.direct)
  const bridged = qualifying.length > 0 && !direct
  const bestOverlap = Math.max(0, ...qualifying.map((candidate) => candidate.overlap))
  return {
    indexes,
    direct,
    bridged,
    bondOrder,
    confidence: qualifying.length
      ? Math.round(clamp(42 + Math.min(24, bestOverlap * 24) + (direct ? 18 : 8) + nearbyPairs.length * 5))
      : 0,
  }
}

function buildAtomClosureGraph(input: RingClosureInput): ClosureGraph | null {
  if (input.atomLabels.length < 3) return null
  const nodes = input.atomLabels.map((label, id): ClosureNode => ({
    id,
    point: label.centroid,
    label: label.label,
    atomLabelId: label.id,
    confidence: label.confidence,
    source: "atom-centroid",
  }))
  const typicalBondLength = median(nearestDistances(nodes))
  if (!typicalBondLength) return null
  const largestGlyph = Math.max(...input.atomLabels.map((label) => Math.max(label.bounds.width, label.bounds.height)), 1)
  const snapRadius = clamp(Math.max(largestGlyph * 1.45, typicalBondLength * 0.36, 8), 8, 38)
  const edges = new Map<string, ClosureEdge>()
  const snapEvents: VisionRingClosureSnapEvent[] = []
  const bridgeEvents: VisionRingClosureBridgeEvent[] = []

  input.lineSegments.forEach((segment, segmentIndex) => {
    for (const endpoint of ["start", "end"] as const) {
      const point = segment[endpoint]
      const nearest = nodes
        .map((node) => ({ node, gap: distance(point, node.point) }))
        .sort((left, right) => left.gap - right.gap)[0]
      if (!nearest || nearest.gap > snapRadius * 1.55) continue
      const accepted = nearest.gap <= snapRadius
      snapEvents.push({
        segmentIndex,
        endpoint,
        nodeId: nearest.node.id,
        atomLabelId: nearest.node.atomLabelId,
        distance: Math.round(nearest.gap * 10) / 10,
        accepted,
        reason: accepted ? "Bond endpoint snapped to nearby atom label centroid." : "Endpoint was near an atom label but outside strict snap radius.",
      })
    }
  })

  for (let leftIndex = 0; leftIndex < nodes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < nodes.length; rightIndex += 1) {
      const left = nodes[leftIndex]
      const right = nodes[rightIndex]
      const atomDistance = distance(left.point, right.point)
      if (atomDistance < Math.max(largestGlyph * 0.55, typicalBondLength * 0.42) || atomDistance > typicalBondLength * 1.72) continue
      const support = edgeSegmentSupport(input.lineSegments, input.parallelBondPairs, left.point, right.point, snapRadius)
      if (!support.indexes.length) continue
      const gapBridged = support.bridged || !support.direct
      const edge: ClosureEdge = {
        startNodeId: left.id,
        endNodeId: right.id,
        sourceSegmentIndexes: support.indexes,
        bondOrder: support.bondOrder,
        confidence: Math.round(clamp((left.confidence + right.confidence) * 0.24 + support.confidence * 0.55 + (gapBridged ? 6 : 12))),
        bridged: gapBridged,
      }
      edges.set(bondKey(left.id, right.id), edge)
      if (gapBridged) {
        bridgeEvents.push({
          fromNodeId: left.id,
          toNodeId: right.id,
          gapLength: Math.round(atomDistance * 10) / 10,
          confidence: edge.confidence,
          accepted: true,
          reason: "Short bond-to-label gap bridged because the line segment is collinear with both atom centroids.",
        })
      }
    }
  }

  return {
    nodes,
    edges: Array.from(edges.values()),
    parallelBondPairs: input.parallelBondPairs,
    snapEvents,
    bridgeEvents,
    typicalBondLength,
    source: "atom-centroid",
  }
}

function buildEndpointClosureGraph(input: RingClosureInput): ClosureGraph {
  const nodes = input.graph.nodes.map((node): ClosureNode => ({
    id: node.id,
    point: node.point,
    confidence: node.mergeQuality,
    source: "endpoint-graph",
  }))
  const edges = input.graph.edges.map((edge): ClosureEdge => {
    const start = input.graph.nodes[edge.startNodeId]?.point ?? { x: 0, y: 0 }
    const end = input.graph.nodes[edge.endNodeId]?.point ?? { x: 0, y: 0 }
    const pairs = parallelPairsNearEdge(input.parallelBondPairs, start, end, Math.max(6, input.graph.endpointTolerance * 0.9))
    return {
      startNodeId: edge.startNodeId,
      endNodeId: edge.endNodeId,
      sourceSegmentIndexes: Array.from(new Set([...edge.sourceSegmentIndexes, ...pairs.flatMap((pair) => [pair.firstSegmentIndex, pair.secondSegmentIndex])])),
      bondOrder: pairs.length >= 2 ? 3 : pairs.length === 1 ? 2 : 1,
      confidence: Math.round(clamp((input.graph.nodes[edge.startNodeId]?.mergeQuality ?? 50) * 0.25 + (input.graph.nodes[edge.endNodeId]?.mergeQuality ?? 50) * 0.25 + 36 + pairs.length * 4)),
      bridged: false,
    }
  })
  return {
    nodes,
    edges,
    parallelBondPairs: input.parallelBondPairs,
    snapEvents: [],
    bridgeEvents: [],
    typicalBondLength: input.graph.averageLineLength || median(edges.map((edge) => {
      const start = nodes.find((node) => node.id === edge.startNodeId)
      const end = nodes.find((node) => node.id === edge.endNodeId)
      return start && end ? distance(start.point, end.point) : 0
    }).filter(Boolean)),
    source: "endpoint-graph",
  }
}

function graphAdjacency(graph: ClosureGraph): Map<number, number[]> {
  const adjacency = new Map<number, number[]>()
  graph.nodes.forEach((node) => adjacency.set(node.id, []))
  graph.edges.forEach((edge) => {
    adjacency.get(edge.startNodeId)?.push(edge.endNodeId)
    adjacency.get(edge.endNodeId)?.push(edge.startNodeId)
  })
  return adjacency
}

function findTrueCycles(graph: ClosureGraph): number[][] {
  const adjacency = graphAdjacency(graph)
  const found = new Map<string, number[]>()
  const walk = (start: number, current: number, path: number[]) => {
    if (path.length > 8) return
    for (const neighbor of adjacency.get(current) ?? []) {
      if (neighbor === start && path.length >= 5 && path.length <= 8) {
        found.set(canonicalCycle(path), path)
        continue
      }
      if (path.includes(neighbor) || path.length >= 8) continue
      walk(start, neighbor, [...path, neighbor])
    }
  }
  graph.nodes.forEach((node) => walk(node.id, node.id, [node.id]))
  return Array.from(found.values())
}

function findNearCycles(graph: ClosureGraph, closedCycles: number[][]): Array<{ nodeIds: number[]; gap: VisionRingClosureBridgeEvent }> {
  const adjacency = graphAdjacency(graph)
  const closedSets = closedCycles.map((cycle) => new Set(cycle))
  const found = new Map<string, { nodeIds: number[]; gap: VisionRingClosureBridgeEvent }>()
  const typical = graph.typicalBondLength || median(nearestDistances(graph.nodes)) || 20
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]))

  const walk = (current: number, path: number[]) => {
    if (path.length >= 5 && path.length <= 8) {
      const first = path[0]
      const hasClosingEdge = adjacency.get(current)?.includes(first)
      const containedByCycle = closedSets.some((cycle) => path.every((nodeId) => cycle.has(nodeId)))
      const firstNode = nodeById.get(first)
      const currentNode = nodeById.get(current)
      if (!hasClosingEdge && !containedByCycle && firstNode && currentNode) {
        const gapLength = distance(firstNode.point, currentNode.point)
        const withinBondScale = gapLength >= typical * 0.48 && gapLength <= typical * 1.88
        if (withinBondScale) {
          const confidence = Math.round(clamp(88 - Math.abs(gapLength - typical) / Math.max(1, typical) * 50, 38, 88))
          const key = canonicalCycle(path)
          found.set(key, {
            nodeIds: path,
            gap: {
              fromNodeId: current,
              toNodeId: first,
              gapLength: Math.round(gapLength * 10) / 10,
              confidence,
              accepted: true,
              reason: "One missing closing edge was short enough to recover from surrounding polygon geometry.",
            },
          })
        }
      }
    }
    if (path.length >= 8) return
    for (const neighbor of adjacency.get(current) ?? []) {
      if (path.includes(neighbor)) continue
      walk(neighbor, [...path, neighbor])
    }
  }
  graph.nodes.forEach((node) => walk(node.id, [node.id]))
  return Array.from(found.values())
}

function atomPolygonCandidates(graph: ClosureGraph): Array<{ nodeIds: number[]; gap?: VisionRingClosureBridgeEvent }> {
  if (graph.source !== "atom-centroid" || graph.nodes.length < 5 || graph.nodes.length > 10) return []
  const carbonLike = graph.nodes.filter((node) => !node.label || node.label === "C")
  const candidates: Array<{ nodeIds: number[]; gap?: VisionRingClosureBridgeEvent }> = []
  for (const pool of [carbonLike, graph.nodes]) {
    if (pool.length < 5 || pool.length > 8) continue
    const center = { x: average(pool.map((node) => node.point.x)), y: average(pool.map((node) => node.point.y)) }
    const ordered = [...pool].sort((left, right) =>
      Math.atan2(left.point.y - center.y, left.point.x - center.x) -
      Math.atan2(right.point.y - center.y, right.point.x - center.x),
    )
    const key = ordered.map((node) => node.id).join("-")
    if (candidates.some((candidate) => candidate.nodeIds.join("-") === key)) continue
    candidates.push({ nodeIds: ordered.map((node) => node.id) })
  }
  return candidates
}

function scoreCandidate(
  graph: ClosureGraph,
  nodeIds: number[],
  closed: boolean,
  gap: VisionRingClosureBridgeEvent | undefined,
  recognizedText: string,
  existingId: number,
): VisionRingClosureCandidate | null {
  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]))
  const nodes = nodeIds.map((nodeId) => nodeById.get(nodeId)).filter((node): node is ClosureNode => Boolean(node))
  if (nodes.length !== nodeIds.length || nodes.length < 5 || nodes.length > 8) return null
  const points = nodes.map((node) => node.point)
  if (!isSimplePolygon(points)) return null
  const minX = Math.min(...points.map((point) => point.x))
  const maxX = Math.max(...points.map((point) => point.x))
  const minY = Math.min(...points.map((point) => point.y))
  const maxY = Math.max(...points.map((point) => point.y))
  const width = maxX - minX
  const height = maxY - minY
  if (width < 8 || height < 8) return null
  const areaRatio = polygonArea(points) / Math.max(1, width * height)
  const rejectedReasons: string[] = []
  if (areaRatio < 0.24) rejectedReasons.push("Polygon area is too thin and looks more like an open chain.")
  const sideLengths = points.map((point, index) => distance(point, points[(index + 1) % points.length]))
  const center = { x: average(points.map((point) => point.x)), y: average(points.map((point) => point.y)) }
  const regularity = Math.round(coefficientRegularity(sideLengths) * 0.58 + coefficientRegularity(points.map((point) => distance(point, center))) * 0.42)
  if (regularity < 36) rejectedReasons.push("Side lengths/radii are too irregular for a reliable ring.")
  const edges = nodeIds.map((nodeId, index) => findEdge(graph.edges, nodeId, nodeIds[(index + 1) % nodeIds.length]))
  const coveredEdges = edges.filter(Boolean).length
  const lineCoverage = Math.round(coveredEdges / nodeIds.length * 100)
  const ringSideDoubleBonds = points.filter((point, index) => {
    const next = points[(index + 1) % points.length]
    return parallelPairsNearEdge(graph.parallelBondPairs, point, next, Math.max(7, (graph.typicalBondLength || 20) * 0.34)).length > 0
  }).length
  const doubleBondCount = Math.max(edges.filter((edge) => (edge?.bondOrder ?? 1) >= 2).length, ringSideDoubleBonds)
  const closureConfidence = closed
    ? 100
    : gap
      ? gap.confidence
      : lineCoverage >= 80 ? 72 : 45
  const text = recognizedText.toLowerCase().replace(/[^a-z0-9]/g, "")
  const aromaticHint = /benzene|arene|aromatic|phenyl|c6h6|ring/.test(text)
  const aromaticSupport = Math.round(clamp(
    (nodeIds.length === 6 ? 10 : 0) +
    Math.min(62, doubleBondCount * 22) +
    (aromaticHint ? 24 : 0) +
    (lineCoverage >= 80 && doubleBondCount >= 2 ? 8 : 0),
  ))
  if (nodeIds.length === 6 && aromaticSupport < 35 && doubleBondCount === 0) {
    rejectedReasons.push("Six-member ring is present, but aromatic/double-bond support is absent.")
  }
  if (lineCoverage < 58) rejectedReasons.push("Too many ring sides are unsupported by bond strokes.")
  if (!closed && closureConfidence < 48) rejectedReasons.push("The missing closing edge is too long or weak to bridge.")

  const memberPoints = nodeIds.length === 6 ? 18 : nodeIds.length === 5 || nodeIds.length === 7 ? 12 : 8
  const scoreBreakdown: VisionScoreBreakdown[] = [
    { label: `${nodeIds.length}-member ring size`, points: memberPoints, maximum: 18 },
    { label: closed ? "Closed cycle" : "Recoverable closure gap", points: Math.round(closureConfidence * 0.18), maximum: 18 },
    { label: "Polygon regularity", points: Math.round(regularity * 0.2), maximum: 20 },
    { label: "Bond-line coverage", points: Math.round(lineCoverage * 0.18), maximum: 18 },
    { label: "Aromatic/double-bond support", points: Math.round(aromaticSupport * 0.2), maximum: 20 },
  ]
  const confidence = Math.round(clamp(scoreBreakdown.reduce((sum, entry) => sum + entry.points, 0) - rejectedReasons.length * 5, 0, 96))
  return {
    id: existingId,
    memberCount: nodeIds.length,
    nodeIds,
    points,
    center,
    width,
    height,
    closed,
    recovered: !closed,
    selected: false,
    confidence,
    closureConfidence: Math.round(closureConfidence),
    regularity,
    lineCoverage,
    aromaticSupport,
    doubleBondCount,
    closureGaps: gap ? [gap] : [],
    source: graph.source,
    selectedReason: rejectedReasons.length
      ? "Candidate kept for debugging but not selected because geometric safeguards failed."
      : closed
        ? "Closed ring topology passed geometry, coverage, and chemistry-support checks."
        : "One missing edge was bridged because surrounding ring geometry was strong.",
    rejectedReasons,
    scoreBreakdown,
  }
}

function dedupeCandidates(candidates: VisionRingClosureCandidate[]): VisionRingClosureCandidate[] {
  const seen = new Set<string>()
  const output: VisionRingClosureCandidate[] = []
  for (const candidate of candidates.sort((left, right) => right.confidence - left.confidence)) {
    const key = canonicalCycle(candidate.nodeIds)
    if (seen.has(key)) continue
    seen.add(key)
    output.push({ ...candidate, id: output.length })
  }
  return output
}

function analyzeGraphCandidates(graph: ClosureGraph, recognizedText: string): VisionRingClosureCandidate[] {
  const closed = findTrueCycles(graph)
  const near = findNearCycles(graph, closed)
  const atomPolygons = atomPolygonCandidates(graph)
  const candidates: VisionRingClosureCandidate[] = []
  closed.forEach((nodeIds) => {
    const candidate = scoreCandidate(graph, nodeIds, true, undefined, recognizedText, candidates.length)
    if (candidate) candidates.push(candidate)
  })
  near.forEach(({ nodeIds, gap }) => {
    const candidate = scoreCandidate(graph, nodeIds, false, gap, recognizedText, candidates.length)
    if (candidate) candidates.push(candidate)
  })
  atomPolygons.forEach(({ nodeIds, gap }) => {
    const hasAllEdges = nodeIds.every((nodeId, index) => Boolean(findEdge(graph.edges, nodeId, nodeIds[(index + 1) % nodeIds.length])))
    const missing = nodeIds
      .map((nodeId, index) => ({ left: nodeId, right: nodeIds[(index + 1) % nodeIds.length] }))
      .filter(({ left, right }) => !findEdge(graph.edges, left, right))
    if (missing.length > 1) return
    const closureGap = gap ?? (missing[0]
      ? {
        fromNodeId: missing[0].left,
        toNodeId: missing[0].right,
        gapLength: Math.round(distance(
          graph.nodes.find((node) => node.id === missing[0].left)?.point ?? { x: 0, y: 0 },
          graph.nodes.find((node) => node.id === missing[0].right)?.point ?? { x: 0, y: 0 },
        ) * 10) / 10,
        confidence: 64,
        accepted: true,
        reason: "Atom labels form a regular polygon with one short missing bond stroke.",
      }
      : undefined)
    const candidate = scoreCandidate(graph, nodeIds, hasAllEdges, closureGap, recognizedText, candidates.length)
    if (candidate) candidates.push({
      ...candidate,
      source: graph.source === "atom-centroid" ? "atom-centroid" : "hybrid",
      selectedReason: candidate.selectedReason.includes("Closed")
        ? "Atom-label centroids form a closed polygon with bond support."
        : candidate.selectedReason,
    })
  })
  return dedupeCandidates(candidates)
}

export function analyzeRingClosure(input: RingClosureInput): VisionRingClosureAnalysis {
  const graphs = [
    buildAtomClosureGraph(input),
    buildEndpointClosureGraph(input),
  ].filter((graph): graph is ClosureGraph => Boolean(graph))

  const allCandidates: VisionRingClosureCandidate[] = []
  const snapEvents: VisionRingClosureSnapEvent[] = []
  const bridgeEvents: VisionRingClosureBridgeEvent[] = []
  graphs.forEach((graph) => {
    snapEvents.push(...graph.snapEvents)
    bridgeEvents.push(...graph.bridgeEvents)
    allCandidates.push(...analyzeGraphCandidates(graph, input.recognizedText ?? ""))
  })
  const candidates = dedupeCandidates(allCandidates).slice(0, 14)
  const selectable = candidates
    .filter((candidate) =>
      candidate.confidence >= 50 &&
      candidate.rejectedReasons.filter((reason) => !/aromatic\/double-bond support is absent/.test(reason)).length === 0,
    )
    .sort((left, right) => {
      const score = (candidate: VisionRingClosureCandidate) =>
        candidate.confidence +
        candidate.aromaticSupport * 0.3 +
        candidate.closureConfidence * 0.08 +
        candidate.lineCoverage * 0.05 +
        (candidate.memberCount === 6 ? 8 : 0) -
        (candidate.recovered ? 2 : 0)
      return score(right) - score(left) || right.confidence - left.confidence
    })
  const selected = selectable[0] ?? null
  const finalCandidates = candidates.map((candidate) => ({
    ...candidate,
    selected: Boolean(selected && candidate.id === selected.id),
  }))
  const aromaticSupportScore = selected?.aromaticSupport ?? candidates[0]?.aromaticSupport ?? 0
  const ringVoteContribution = selected
    ? Math.round(clamp(selected.confidence * 0.52 + selected.closureConfidence * 0.18 + selected.aromaticSupport * 0.22 + selected.lineCoverage * 0.08))
    : 0

  return {
    candidates: finalCandidates,
    selectedCandidateId: selected?.id ?? null,
    detectedRingSizes: Array.from(new Set(finalCandidates.map((candidate) => candidate.memberCount))).sort((a, b) => a - b),
    snapEvents,
    bridgeEvents: [
      ...bridgeEvents,
      ...finalCandidates.flatMap((candidate) => candidate.closureGaps),
    ].filter((event, index, events) =>
      events.findIndex((candidate) =>
        candidate.fromNodeId === event.fromNodeId &&
        candidate.toNodeId === event.toNodeId &&
        candidate.reason === event.reason,
      ) === index,
    ),
    aromaticSupportScore,
    ringVoteContribution,
    explanation: selected
      ? selected.selectedReason
      : finalCandidates.length
        ? "Ring-like polygons were found, but coverage, closure, or open-chain safeguards prevented a confident ring vote."
        : "No 5-8 member ring closure could be recovered from atom labels or endpoint geometry.",
  }
}

export function ringClosureCandidateToVisionRing(candidate: VisionRingClosureCandidate): VisionRingCandidate {
  return {
    center: candidate.center,
    width: candidate.width,
    height: candidate.height,
    sidesEstimate: candidate.memberCount,
    confidence: candidate.confidence,
    benzeneLike: candidate.memberCount === 6 && candidate.aromaticSupport >= 55,
    nearRing: candidate.recovered,
    source: "ring-closure",
    nodeIds: candidate.nodeIds,
    closureQuality: candidate.closureConfidence,
    endpointMergeQuality: candidate.source === "atom-centroid" ? 92 : 78,
    polygonRegularity: candidate.regularity,
    lineCoverage: candidate.lineCoverage,
    doubleBondCue: Math.round(clamp(candidate.doubleBondCount / Math.max(1, Math.floor(candidate.memberCount / 2)) * 100)),
    aromaticCueScore: candidate.aromaticSupport,
    reason: candidate.selectedReason,
    scoreBreakdown: candidate.scoreBreakdown,
    selectedReason: candidate.selectedReason,
    rejectedReasons: candidate.rejectedReasons,
    closureGapCount: candidate.closureGaps.length,
  }
}
