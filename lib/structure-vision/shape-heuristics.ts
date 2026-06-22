import type {
  DarkPixelMask,
  StructureVisionAnalysis,
  VisionClosedLoop,
  VisionAtomLabel,
  VisionCompoundCandidate,
  VisionFunctionalGroupCue,
  VisionGraphAnalysis,
  VisionGraphEdge,
  VisionGraphNode,
  VisionLineSegment,
  VisionParallelBondPair,
  VisionPoint,
  VisionRingCandidate,
} from "./vision-types"
import { reconstructMolecularGraph } from "../vision/molecular-graph"

const DEGREE_STEP = 5

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function angleDifference(left: number, right: number): number {
  const difference = Math.abs(left - right) % 180
  return Math.min(difference, 180 - difference)
}

function distance(left: VisionPoint, right: VisionPoint): number {
  return Math.hypot(left.x - right.x, left.y - right.y)
}

function darkPoints(mask: DarkPixelMask): VisionPoint[] {
  const points: VisionPoint[] = []
  for (let y = 0; y < mask.height; y += 1) {
    for (let x = 0; x < mask.width; x += 1) {
      if (mask.pixels[y * mask.width + x]) points.push({ x, y })
    }
  }
  return points
}

export function detectLineSegments(mask: DarkPixelMask): VisionLineSegment[] {
  const points = darkPoints(mask)
  const minimumLength = Math.max(8, Math.min(mask.width, mask.height) * 0.07)
  if (points.length < minimumLength) return []

  const diagonal = Math.ceil(Math.hypot(mask.width, mask.height))
  const rhoSize = diagonal * 2 + 1
  const peaks: Array<{ angle: number; rho: number; votes: number }> = []

  for (let angle = 0; angle < 180; angle += DEGREE_STEP) {
    const radians = (angle * Math.PI) / 180
    const cosine = Math.cos(radians)
    const sine = Math.sin(radians)
    const accumulator = new Uint16Array(rhoSize)

    for (const point of points) {
      const rhoIndex = Math.round(point.x * cosine + point.y * sine) + diagonal
      if (rhoIndex >= 0 && rhoIndex < rhoSize) accumulator[rhoIndex] += 1
    }

    const voteThreshold = Math.max(7, Math.round(minimumLength * 0.7))
    for (let index = 1; index < rhoSize - 1; index += 1) {
      const votes = accumulator[index]
      if (votes < voteThreshold || votes < accumulator[index - 1] || votes < accumulator[index + 1]) continue
      peaks.push({ angle, rho: index - diagonal, votes })
    }
  }

  const rawSegments = peaks
    .sort((left, right) => right.votes - left.votes)
    .slice(0, 80)
    .map((peak): VisionLineSegment | null => {
      const radians = (peak.angle * Math.PI) / 180
      const cosine = Math.cos(radians)
      const sine = Math.sin(radians)
      const projections: number[] = []

      for (const point of points) {
        const pointRho = point.x * cosine + point.y * sine
        if (Math.abs(pointRho - peak.rho) <= 1.4) projections.push(-point.x * sine + point.y * cosine)
      }

      if (projections.length < 5) return null
      projections.sort((left, right) => left - right)
      const startProjection = projections[Math.floor(projections.length * 0.03)]
      const endProjection = projections[Math.ceil(projections.length * 0.97) - 1]
      const length = endProjection - startProjection
      if (length < minimumLength) return null

      const pointAt = (projection: number): VisionPoint => ({
        x: clamp(peak.rho * cosine - projection * sine, 0, mask.width - 1),
        y: clamp(peak.rho * sine + projection * cosine, 0, mask.height - 1),
      })
      const start = pointAt(startProjection)
      const end = pointAt(endProjection)
      return {
        start,
        end,
        midpoint: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
        length,
        angle: (peak.angle + 90) % 180,
        strength: peak.votes,
      }
    })
    .filter((segment): segment is VisionLineSegment => Boolean(segment))
    .sort((left, right) => right.length * right.strength - left.length * left.strength)

  const selected: VisionLineSegment[] = []
  for (const segment of rawSegments) {
    const duplicate = selected.some((existing) =>
      angleDifference(existing.angle, segment.angle) <= 7 &&
      distance(existing.midpoint, segment.midpoint) <= 2.3,
    )
    if (!duplicate) selected.push(segment)
    if (selected.length >= 28) break
  }
  return selected
}

export function detectClosedLoops(mask: DarkPixelMask): VisionClosedLoop[] {
  const { width, height, pixels } = mask
  const size = width * height
  const external = new Uint8Array(size)
  const queue = new Int32Array(size)
  let head = 0
  let tail = 0

  const enqueue = (index: number) => {
    if (index < 0 || index >= size || pixels[index] || external[index]) return
    external[index] = 1
    queue[tail++] = index
  }

  for (let x = 0; x < width; x += 1) {
    enqueue(x)
    enqueue((height - 1) * width + x)
  }
  for (let y = 0; y < height; y += 1) {
    enqueue(y * width)
    enqueue(y * width + width - 1)
  }

  while (head < tail) {
    const index = queue[head++]
    const x = index % width
    const y = Math.floor(index / width)
    if (x > 0) enqueue(index - 1)
    if (x < width - 1) enqueue(index + 1)
    if (y > 0) enqueue(index - width)
    if (y < height - 1) enqueue(index + width)
  }

  const visited = new Uint8Array(size)
  const loops: VisionClosedLoop[] = []
  const minimumHoleArea = Math.max(12, size * 0.0015)

  for (let start = 0; start < size; start += 1) {
    if (pixels[start] || external[start] || visited[start]) continue
    head = 0
    tail = 0
    queue[tail++] = start
    visited[start] = 1
    let area = 0
    let minX = width
    let maxX = 0
    let minY = height
    let maxY = 0

    while (head < tail) {
      const index = queue[head++]
      const x = index % width
      const y = Math.floor(index / width)
      area += 1
      minX = Math.min(minX, x)
      maxX = Math.max(maxX, x)
      minY = Math.min(minY, y)
      maxY = Math.max(maxY, y)

      const neighbors = [index - 1, index + 1, index - width, index + width]
      for (const neighbor of neighbors) {
        if (neighbor < 0 || neighbor >= size || pixels[neighbor] || external[neighbor] || visited[neighbor]) continue
        const neighborX = neighbor % width
        if (Math.abs(neighborX - x) > 1) continue
        visited[neighbor] = 1
        queue[tail++] = neighbor
      }
    }

    const loopWidth = maxX - minX + 1
    const loopHeight = maxY - minY + 1
    if (area < minimumHoleArea || loopWidth < 6 || loopHeight < 6) continue
    loops.push({
      bounds: { x: minX, y: minY, width: loopWidth, height: loopHeight },
      center: { x: minX + loopWidth / 2, y: minY + loopHeight / 2 },
      holeArea: area,
      aspectRatio: loopWidth / loopHeight,
    })
  }

  return loops.sort((left, right) => right.holeArea - left.holeArea).slice(0, 8)
}

function segmentNearLoop(segment: VisionLineSegment, loop: VisionClosedLoop): boolean {
  const padding = Math.max(loop.bounds.width, loop.bounds.height) * 0.35
  return segment.midpoint.x >= loop.bounds.x - padding &&
    segment.midpoint.x <= loop.bounds.x + loop.bounds.width + padding &&
    segment.midpoint.y >= loop.bounds.y - padding &&
    segment.midpoint.y <= loop.bounds.y + loop.bounds.height + padding
}

export function detectRingCandidates(
  mask: DarkPixelMask,
  loops: VisionClosedLoop[],
  segments: VisionLineSegment[],
): VisionRingCandidate[] {
  const minimumRingSize = Math.min(mask.width, mask.height) * 0.13
  return loops
    .filter((loop) => loop.bounds.width >= minimumRingSize && loop.bounds.height >= minimumRingSize)
    .map((loop) => {
      const nearbySegments = segments.filter((segment) => segmentNearLoop(segment, loop))
      const directions: number[] = []
      for (const segment of nearbySegments) {
        if (!directions.some((direction) => angleDifference(direction, segment.angle) < 12)) directions.push(segment.angle)
      }
      const balanced = loop.aspectRatio >= 0.68 && loop.aspectRatio <= 1.45
      const benzeneLike = balanced && nearbySegments.length >= 5 && directions.length >= 3
      const sidesEstimate = benzeneLike ? 6 : clamp(Math.round(nearbySegments.length / 2), 3, 8)
      const confidence = clamp(
        35 + Math.min(30, nearbySegments.length * 4) + (balanced ? 12 : 0) + (directions.length >= 3 ? 10 : 0),
        0,
        96,
      )
      return {
        center: loop.center,
        width: loop.bounds.width,
        height: loop.bounds.height,
        sidesEstimate,
        confidence,
        benzeneLike,
        nearRing: false,
        source: "pixel-loop" as const,
        nodeIds: [] as number[],
        closureQuality: 100,
        endpointMergeQuality: 90,
        polygonRegularity: balanced ? 82 : 55,
        lineCoverage: 100,
        doubleBondCue: 0,
        aromaticCueScore: 0,
        reason: "A fully enclosed light region was found inside connected bond strokes.",
        scoreBreakdown: [
          { label: "Pixel-loop closure", points: 35, maximum: 35 },
          { label: "Balanced ring bounds", points: balanced ? 12 : 6, maximum: 12 },
          { label: "Bond-direction coverage", points: directions.length >= 3 ? 10 : 4, maximum: 10 },
        ],
      }
    })
    .sort((left, right) => right.confidence - left.confidence)
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length)
}

function coefficientRegularity(values: number[]): number {
  if (!values.length) return 0
  const mean = average(values)
  if (mean <= 0) return 0
  const deviation = Math.sqrt(average(values.map((value) => (value - mean) ** 2)))
  return clamp(100 - (deviation / mean) * 145, 0, 100)
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

function canonicalCycle(nodeIds: number[]): string {
  const rotations: string[] = []
  const addRotations = (values: number[]) => {
    for (let index = 0; index < values.length; index += 1) {
      rotations.push([...values.slice(index), ...values.slice(0, index)].join("-"))
    }
  }
  addRotations(nodeIds)
  addRotations([...nodeIds].reverse())
  return rotations.sort()[0]
}

function canonicalPath(nodeIds: number[]): string {
  const forward = nodeIds.join("-")
  const reverse = [...nodeIds].reverse().join("-")
  return forward < reverse ? forward : reverse
}

export function buildSegmentGraph(mask: DarkPixelMask, segments: VisionLineSegment[]): VisionGraphAnalysis {
  const sortedLengths = segments.map((segment) => segment.length).sort((left, right) => left - right)
  const averageLineLength = sortedLengths.length
    ? sortedLengths[Math.floor(sortedLengths.length / 2)]
    : 0
  const maximumDimension = Math.max(mask.width, mask.height)
  const endpointTolerance = clamp(
    averageLineLength * 0.32,
    Math.max(10, maximumDimension * 0.09),
    Math.min(35, maximumDimension * 0.16),
  )

  interface EndpointCluster {
    points: VisionPoint[]
    segmentIndexes: Set<number>
    center: VisionPoint
  }

  const clusters: EndpointCluster[] = []
  const endpointClusterIds: Array<[number, number]> = []
  segments.forEach((segment, segmentIndex) => {
    const clusterIds = [segment.start, segment.end].map((point) => {
      let nearestIndex = -1
      let nearestDistance = Number.POSITIVE_INFINITY
      clusters.forEach((cluster, clusterIndex) => {
        if (cluster.segmentIndexes.has(segmentIndex)) return
        const candidateDistance = distance(cluster.center, point)
        if (candidateDistance <= endpointTolerance && candidateDistance < nearestDistance) {
          nearestIndex = clusterIndex
          nearestDistance = candidateDistance
        }
      })

      if (nearestIndex < 0) {
        clusters.push({ points: [point], segmentIndexes: new Set([segmentIndex]), center: { ...point } })
        return clusters.length - 1
      }

      const cluster = clusters[nearestIndex]
      cluster.points.push(point)
      cluster.segmentIndexes.add(segmentIndex)
      cluster.center = {
        x: average(cluster.points.map((clusterPoint) => clusterPoint.x)),
        y: average(cluster.points.map((clusterPoint) => clusterPoint.y)),
      }
      return nearestIndex
    })
    endpointClusterIds.push([clusterIds[0], clusterIds[1]])
  })

  const nodes: VisionGraphNode[] = clusters.map((cluster, id) => {
    const mergeRadius = Math.max(0, ...cluster.points.map((point) => distance(point, cluster.center)))
    return {
      id,
      point: cluster.center,
      endpointCount: cluster.points.length,
      mergeRadius,
      mergeQuality: clamp(100 - (mergeRadius / Math.max(1, endpointTolerance)) * 70, 20, 100),
    }
  })

  const edgeByNodes = new Map<string, VisionGraphEdge>()
  endpointClusterIds.forEach(([startNodeId, endNodeId], segmentIndex) => {
    if (startNodeId === endNodeId) return
    const nodeDistance = distance(nodes[startNodeId].point, nodes[endNodeId].point)
    if (nodeDistance < endpointTolerance * 0.42) return
    const key = [startNodeId, endNodeId].sort((left, right) => left - right).join("-")
    const existing = edgeByNodes.get(key)
    if (existing) {
      existing.sourceSegmentIndexes.push(segmentIndex)
      existing.length = Math.max(existing.length, nodeDistance)
      return
    }
    edgeByNodes.set(key, {
      id: edgeByNodes.size,
      startNodeId,
      endNodeId,
      length: nodeDistance,
      sourceSegmentIndexes: [segmentIndex],
    })
  })
  const edges = Array.from(edgeByNodes.values()).map((edge, id) => ({ ...edge, id }))
  const mergedEndpointCount = segments.length * 2 - nodes.length

  return {
    nodes,
    edges,
    mergedEndpointCount,
    endpointTolerance,
    averageLineLength,
    cycleCandidates: [],
    nearRingCandidates: [],
    bestRingConfidence: 0,
    aromaticCueScore: 0,
    explanation: segments.length
      ? "Line endpoints were merged into an adaptive graph; cycle scoring has not run yet."
      : "No stable line segments were available for graph construction.",
  }
}

function scoreGraphRing(
  graph: VisionGraphAnalysis,
  nodeIds: number[],
  nearRing: boolean,
  parallelLinePairs: number,
  recognizedText: string,
): VisionRingCandidate | null {
  const points = nodeIds.map((nodeId) => graph.nodes[nodeId].point)
  if (!isSimplePolygon(points)) return null
  const area = polygonArea(points)
  const minimumX = Math.min(...points.map((point) => point.x))
  const maximumX = Math.max(...points.map((point) => point.x))
  const minimumY = Math.min(...points.map((point) => point.y))
  const maximumY = Math.max(...points.map((point) => point.y))
  const width = maximumX - minimumX
  const height = maximumY - minimumY
  if (width < graph.endpointTolerance * 1.1 || height < graph.endpointTolerance * 1.1) return null
  if (area / Math.max(1, width * height) < 0.22) return null

  const sideLengths = points.map((point, index) => distance(point, points[(index + 1) % points.length]))
  const pathSideLengths = nearRing ? sideLengths.slice(0, -1) : sideLengths
  const meanSideLength = average(pathSideLengths)
  const closureGap = sideLengths[sideLengths.length - 1]
  if (nearRing && (closureGap > meanSideLength * 1.75 || closureGap < graph.endpointTolerance * 0.42)) return null

  const center = { x: average(points.map((point) => point.x)), y: average(points.map((point) => point.y)) }
  const polygonRegularity = Math.round(
    coefficientRegularity(sideLengths) * 0.58 +
    coefficientRegularity(points.map((point) => distance(point, center))) * 0.42,
  )
  const closureQuality = nearRing
    ? clamp(88 - Math.abs(closureGap - meanSideLength) / Math.max(1, meanSideLength) * 55, 35, 88)
    : 100
  const endpointMergeQuality = average(nodeIds.map((nodeId) => graph.nodes[nodeId].mergeQuality))
  const lineCoverage = nearRing ? ((nodeIds.length - 1) / nodeIds.length) * 100 : 100
  const cycleLengthQuality = nodeIds.length === 6 ? 100 : 82
  const doubleBondCue = clamp((parallelLinePairs / 3) * 100, 0, 100)
  const compactText = recognizedText.toLowerCase().replace(/[^a-z0-9]/g, "")
  const hasAromaticText = /benzene|aromatic|c6h6|phenyl|hexagon|ring/.test(compactText)
  const aromaticCueScore = hasAromaticText ? 100 : 0
  const scoreBreakdown = [
    { label: `${nodeIds.length}-member cycle fit`, points: cycleLengthQuality * 0.22, maximum: 22 },
    { label: nearRing ? "Near-ring closure" : "Closed-cycle quality", points: closureQuality * 0.15, maximum: 15 },
    { label: "Endpoint merge quality", points: endpointMergeQuality * 0.14, maximum: 14 },
    { label: "Polygon regularity", points: polygonRegularity * 0.18, maximum: 18 },
    { label: "Line coverage", points: lineCoverage * 0.12, maximum: 12 },
    { label: "Parallel/double-bond cues", points: doubleBondCue * 0.12, maximum: 12 },
    { label: "Aromatic text cue", points: aromaticCueScore * 0.07, maximum: 7 },
  ].map((entry) => ({ ...entry, points: Math.round(entry.points * 10) / 10 }))
  const confidence = clamp(
    Math.round(scoreBreakdown.reduce((sum, entry) => sum + entry.points, 0) - (nearRing ? 5 : 0)),
    0,
    96,
  )
  const benzeneLike = (
    nodeIds.length === 6 && confidence >= 56 && (parallelLinePairs >= 2 || hasAromaticText)
  ) || (
    nodeIds.length >= 5 && nodeIds.length <= 7 && parallelLinePairs >= 3 && hasAromaticText && confidence >= 54
  )

  return {
    center,
    width,
    height,
    sidesEstimate: nodeIds.length,
    confidence,
    benzeneLike,
    nearRing,
    source: nearRing ? "graph-near-cycle" : "graph-cycle",
    nodeIds,
    closureQuality: Math.round(closureQuality),
    endpointMergeQuality: Math.round(endpointMergeQuality),
    polygonRegularity,
    lineCoverage: Math.round(lineCoverage),
    doubleBondCue: Math.round(doubleBondCue),
    aromaticCueScore,
    reason: nearRing
      ? `${nodeIds.length}-member path is missing one short closing edge but has ring-like geometry.`
      : `${nodeIds.length}-member graph cycle closes through merged bond endpoints.`,
    scoreBreakdown,
  }
}

export function detectGraphRings(
  graph: VisionGraphAnalysis,
  parallelLinePairs: number,
  recognizedText: string,
): VisionGraphAnalysis {
  const adjacency = graph.nodes.map(() => [] as number[])
  graph.edges.forEach((edge) => {
    adjacency[edge.startNodeId].push(edge.endNodeId)
    adjacency[edge.endNodeId].push(edge.startNodeId)
  })

  const cycleKeys = new Set<string>()
  const cycles: VisionRingCandidate[] = []
  const visitCycle = (start: number, current: number, path: number[]) => {
    if (path.length > 7) return
    for (const neighbor of adjacency[current]) {
      if (neighbor === start && path.length >= 5 && path.length <= 7) {
        const key = canonicalCycle(path)
        if (cycleKeys.has(key)) continue
        cycleKeys.add(key)
        const candidate = scoreGraphRing(graph, path, false, parallelLinePairs, recognizedText)
        if (candidate) cycles.push(candidate)
        continue
      }
      if (path.includes(neighbor) || path.length >= 7) continue
      visitCycle(start, neighbor, [...path, neighbor])
    }
  }
  graph.nodes.forEach((node) => visitCycle(node.id, node.id, [node.id]))

  const closedNodeSets = cycles.map((cycle) => new Set(cycle.nodeIds))
  const nearKeys = new Set<string>()
  const nearRings: VisionRingCandidate[] = []
  const visitPath = (current: number, path: number[]) => {
    if (path.length >= 5 && path.length <= 7) {
      const first = path[0]
      const hasClosingEdge = adjacency[current].includes(first)
      const containedByCycle = closedNodeSets.some((cycleNodes) => path.every((nodeId) => cycleNodes.has(nodeId)))
      if (!hasClosingEdge && !containedByCycle) {
        const key = canonicalPath(path)
        if (!nearKeys.has(key)) {
          nearKeys.add(key)
          const candidate = scoreGraphRing(graph, path, true, parallelLinePairs, recognizedText)
          if (candidate) nearRings.push(candidate)
        }
      }
    }
    if (path.length >= 7) return
    for (const neighbor of adjacency[current]) {
      if (path.includes(neighbor)) continue
      visitPath(neighbor, [...path, neighbor])
    }
  }
  graph.nodes.forEach((node) => visitPath(node.id, [node.id]))

  cycles.sort((left, right) => right.confidence - left.confidence)
  nearRings.sort((left, right) => right.confidence - left.confidence)
  const best = [...cycles, ...nearRings].sort((left, right) => right.confidence - left.confidence)[0]
  const aromaticCueScore = best
    ? clamp(Math.round(best.doubleBondCue * 0.65 + best.aromaticCueScore * 0.35), 0, 100)
    : 0
  const explanation = best
    ? best.nearRing
      ? `A ${best.sidesEstimate}-member near-ring was recovered by adaptive endpoint merging; closure confidence is ${best.closureQuality}%.`
      : `A ${best.sidesEstimate}-member graph cycle was recovered with ${best.polygonRegularity}% polygon regularity.`
    : graph.edges.length >= 4
      ? "Ring-like strokes detected, but closure was weak. Try cropping closer or increasing contrast."
      : "Too few connected graph edges were available to test a 5-7 member ring."

  return {
    ...graph,
    cycleCandidates: cycles.slice(0, 12),
    nearRingCandidates: nearRings.slice(0, 12),
    bestRingConfidence: best?.confidence ?? 0,
    aromaticCueScore,
    explanation,
  }
}

function projectedOverlap(left: VisionLineSegment, right: VisionLineSegment): number {
  const radians = (left.angle * Math.PI) / 180
  const direction = { x: Math.cos(radians), y: Math.sin(radians) }
  const project = (point: VisionPoint) => point.x * direction.x + point.y * direction.y
  const leftRange = [project(left.start), project(left.end)].sort((a, b) => a - b)
  const rightRange = [project(right.start), project(right.end)].sort((a, b) => a - b)
  return Math.max(0, Math.min(leftRange[1], rightRange[1]) - Math.max(leftRange[0], rightRange[0]))
}

export function detectParallelBondPairs(
  segments: VisionLineSegment[],
  mask: DarkPixelMask,
): VisionParallelBondPair[] {
  const pairs: Array<VisionParallelBondPair & { length: number }> = []
  const minimumSeparation = Math.max(3.2, Math.min(mask.width, mask.height) * 0.018)
  const maximumSeparation = Math.max(4, Math.min(mask.width, mask.height) * 0.055)
  for (let leftIndex = 0; leftIndex < segments.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < segments.length; rightIndex += 1) {
      const left = segments[leftIndex]
      const right = segments[rightIndex]
      if (angleDifference(left.angle, right.angle) > 7) continue
      const radians = (left.angle * Math.PI) / 180
      const separation = Math.abs(
        (right.midpoint.x - left.midpoint.x) * -Math.sin(radians) +
        (right.midpoint.y - left.midpoint.y) * Math.cos(radians),
      )
      if (separation < minimumSeparation || separation > maximumSeparation) continue
      const overlap = projectedOverlap(left, right)
      if (overlap < Math.min(left.length, right.length) * 0.42) continue
      const pair = {
        id: pairs.length,
        firstSegmentIndex: leftIndex,
        secondSegmentIndex: rightIndex,
        angle: left.angle,
        center: {
          x: (left.midpoint.x + right.midpoint.x) / 2,
          y: (left.midpoint.y + right.midpoint.y) / 2,
        },
        separation,
        overlap,
        length: Math.min(left.length, right.length),
      }
      const duplicate = pairs.some((existing) =>
        angleDifference(existing.angle, pair.angle) <= 9 &&
        distance(existing.center, pair.center) <= Math.min(existing.length, pair.length) * 0.28,
      )
      if (!duplicate) pairs.push(pair)
    }
  }
  return pairs.slice(0, 8).map(({ length: _length, ...pair }, id) => ({ ...pair, id }))
}

export function countParallelLinePairs(segments: VisionLineSegment[], mask: DarkPixelMask): number {
  return detectParallelBondPairs(segments, mask).length
}

export function estimateSimpleChainLength(segments: VisionLineSegment[], mask: DarkPixelMask): number {
  if (!segments.length) return 0
  const minimumBondLength = Math.min(mask.width, mask.height) * 0.07
  const candidates = segments.filter((segment) => segment.length >= minimumBondLength)
  const bonds: VisionLineSegment[] = []
  const mergeDistance = Math.max(5, Math.min(mask.width, mask.height) * 0.065)
  for (const candidate of candidates) {
    const duplicateBond = bonds.some((bond) =>
      angleDifference(bond.angle, candidate.angle) <= 10 &&
      distance(bond.midpoint, candidate.midpoint) <= Math.max(bond.length, candidate.length) &&
      projectedOverlap(bond, candidate) >= Math.min(bond.length, candidate.length) * 0.48 &&
      Math.abs(
        (candidate.midpoint.x - bond.midpoint.x) * -Math.sin((bond.angle * Math.PI) / 180) +
        (candidate.midpoint.y - bond.midpoint.y) * Math.cos((bond.angle * Math.PI) / 180),
      ) <= mergeDistance,
    )
    if (!duplicateBond) bonds.push(candidate)
    if (bonds.length >= 14) break
  }
  const nodes: VisionPoint[] = []
  const edges: Array<[number, number]> = []
  const snapDistance = Math.max(4, Math.min(mask.width, mask.height) * 0.045)

  const nodeIndex = (point: VisionPoint) => {
    const existing = nodes.findIndex((node) => distance(node, point) <= snapDistance)
    if (existing >= 0) return existing
    nodes.push(point)
    return nodes.length - 1
  }

  for (const bond of bonds) {
    const start = nodeIndex(bond.start)
    const end = nodeIndex(bond.end)
    if (start !== end && !edges.some(([left, right]) => (left === start && right === end) || (left === end && right === start))) {
      edges.push([start, end])
    }
  }

  const adjacency = nodes.map(() => [] as number[])
  for (const [left, right] of edges) {
    adjacency[left].push(right)
    adjacency[right].push(left)
  }

  let longestEdges = 0
  const visit = (node: number, seen: Set<number>, depth: number) => {
    longestEdges = Math.max(longestEdges, depth)
    for (const neighbor of adjacency[node]) {
      if (seen.has(neighbor)) continue
      const nextSeen = new Set(seen)
      nextSeen.add(neighbor)
      visit(neighbor, nextSeen, depth + 1)
    }
  }
  nodes.forEach((_, index) => visit(index, new Set([index]), 0))
  return longestEdges > 0 ? Math.min(10, longestEdges + 1) : 0
}

function buildCues(
  rings: VisionRingCandidate[],
  parallelLinePairs: number,
  chainLength: number,
  recognizedText: string,
): VisionFunctionalGroupCue[] {
  const text = recognizedText.toLowerCase().replace(/\s+/g, " ")
  const compact = text.replace(/[^a-z0-9=#-]/g, "")
  const cues: VisionFunctionalGroupCue[] = []
  const add = (cue: VisionFunctionalGroupCue) => {
    if (!cues.some((existing) => existing.kind === cue.kind)) cues.push(cue)
  }

  const aromaticRing = rings.find((ring) => ring.benzeneLike)
  if (aromaticRing) {
    add({
      kind: "aromatic",
      label: aromaticRing.nearRing ? "Fuzzy aromatic near-ring" : "Six-membered aromatic ring",
      confidence: clamp(Math.round(aromaticRing.confidence * 0.72 + aromaticRing.doubleBondCue * 0.28), 0, 94),
      evidence: `${aromaticRing.reason} ${parallelLinePairs} double-bond-like cue${parallelLinePairs === 1 ? "" : "s"} support aromaticity.`,
    })
  }
  if (parallelLinePairs > 0) {
    add({ kind: "double-bond", label: "Parallel bond strokes", confidence: clamp(55 + parallelLinePairs * 8, 0, 90), evidence: `${parallelLinePairs} close parallel line pair${parallelLinePairs === 1 ? "" : "s"}` })
  }
  if (/c=o|carbonyl|h2co|hcho|ch3cho|coch/.test(compact) && parallelLinePairs > 0) {
    add({ kind: "carbonyl", label: "Carbonyl-like C=O", confidence: 88, evidence: "Parallel bond strokes occur with a C/O text cue" })
  }
  if (/cooh|carbox/.test(compact)) {
    add({ kind: "carboxyl", label: "Carboxyl-like COOH", confidence: parallelLinePairs > 0 ? 92 : 76, evidence: "COOH text cue with nearby bond strokes" })
  }
  if (/o-h|oh|hydroxyl|alcohol/.test(compact)) {
    add({ kind: "hydroxyl", label: "Hydroxyl-like O-H", confidence: 82, evidence: "O-H or OH text cue detected in the drawing" })
  }
  if (chainLength >= 2 && rings.length === 0) {
    add({ kind: "simple-chain", label: `${chainLength}-atom simple chain`, confidence: clamp(45 + chainLength * 5, 0, 82), evidence: "Connected line-segment endpoint path" })
  }
  return cues
}

export function calibrateBenzeneCandidate(
  ring: VisionRingCandidate | undefined,
  parallelLinePairs: number,
  aromaticCueScore: number,
  recognizedText: string,
): VisionCompoundCandidate | null {
  if (!ring || ring.sidesEstimate < 5 || ring.sidesEstimate > 7 || ring.confidence < 48) return null

  const text = recognizedText.toLowerCase().replace(/[^a-z0-9]/g, "")
  const hasBenzeneHint = /benzene|arene|aromatic|phenyl|c6h6|hexagon|ring/.test(text)
  const effectiveAromaticScore = Math.max(
    aromaticCueScore,
    Math.round(ring.doubleBondCue * 0.65 + ring.aromaticCueScore * 0.35),
  )
  const hasAromaticStrokes = effectiveAromaticScore >= 50 || parallelLinePairs >= 3
  const calibratedMatch = ring.confidence >= 55 &&
    parallelLinePairs >= 3 &&
    effectiveAromaticScore >= 50 &&
    hasBenzeneHint

  const nearRingPoints = ring.nearRing ? 25 : ring.confidence >= 55 ? 20 : 12
  const aromaticPoints = hasAromaticStrokes ? 25 : 0
  const fuzzyRingPoints = ring.confidence >= 55 ? 15 : 10
  const hintPoints = hasBenzeneHint ? 25 : 0
  const score = nearRingPoints + aromaticPoints + fuzzyRingPoints + hintPoints
  const aromaticReason = hasAromaticStrokes
    ? "Aromatic support detected from parallel/double-bond strokes."
    : "Aromatic support missing"
  const label = ring.confidence >= 55 && hasAromaticStrokes
    ? "Likely benzene / aromatic ring"
    : "Possible benzene / aromatic ring"

  return {
    compoundId: "benzene",
    label,
    score: clamp(score, 0, calibratedMatch ? 90 : hasBenzeneHint ? 78 : 50),
    reasons: [ring.reason, aromaticReason, ...(hasBenzeneHint ? ["Benzene/arene hint supports the visual ring"] : [])],
    scoreBreakdown: [
      { label: ring.nearRing ? "Near-ring candidate" : "Closed ring candidate", points: nearRingPoints, maximum: 25 },
      { label: hasAromaticStrokes ? "Aromatic/double-bond support" : "Aromatic support missing", points: aromaticPoints, maximum: 25 },
      { label: "5-7 member fuzzy ring", points: fuzzyRingPoints, maximum: 15 },
      { label: "Benzene/arene hint support", points: hintPoints, maximum: 25 },
    ],
  }
}

function buildCandidates(
  cues: VisionFunctionalGroupCue[],
  rings: VisionRingCandidate[],
  parallelLinePairs: number,
  chainLength: number,
  recognizedText: string,
  aromaticCueScore: number,
): VisionCompoundCandidate[] {
  const text = recognizedText.toLowerCase().replace(/[^a-z0-9=#-]/g, "")
  const hasCue = (kind: VisionFunctionalGroupCue["kind"]) => cues.some((cue) => cue.kind === kind)
  const candidates: VisionCompoundCandidate[] = []
  const add = (
    compoundId: string,
    label: string,
    score: number,
    reasons: string[],
    scoreBreakdown: VisionCompoundCandidate["scoreBreakdown"],
    maximumScore = 58,
  ) => {
    candidates.push({ compoundId, label, score: clamp(Math.round(score), 0, maximumScore), reasons, scoreBreakdown })
  }

  const bestRing = rings[0]
  const benzeneCandidate = calibrateBenzeneCandidate(
    bestRing,
    parallelLinePairs,
    aromaticCueScore,
    recognizedText,
  )
  if (benzeneCandidate) candidates.push(benzeneCandidate)

  if (bestRing?.sidesEstimate === 6 && !bestRing.benzeneLike) {
    const ringPoints = Math.min(44, Math.round(bestRing.confidence * 0.5))
    const namePoints = /cyclohexane|c6h12/.test(text) ? 10 : 0
    add(
      "cyclohexane",
      "Cyclohexane-like ring",
      ringPoints + namePoints,
      [bestRing.reason, "Six-membered ring without reliable aromatic double-bond evidence"],
      [
        { label: "Saturated six-membered ring", points: ringPoints, maximum: 44 },
        { label: "Cyclohexane text support", points: namePoints, maximum: 10 },
      ],
    )
  }

  if (hasCue("carbonyl")) {
    const methanalReasons = ["Carbonyl-like double bond and C/O cue"]
    let methanalScore = 38
    const explicitMethanal = /h2c=?o|hcho|och2|formaldehyde|methanal/.test(text)
    if (explicitMethanal) {
      methanalScore += 16
      methanalReasons.push("H2C=O / HCHO text arrangement")
    } else if (chainLength > 0 && chainLength <= 2) {
      methanalScore += 7
      methanalReasons.push("Small carbonyl skeleton")
    }
    add("methanal", "Methanal", methanalScore, methanalReasons, [
      { label: "Carbonyl visual cue", points: 38, maximum: 38 },
      { label: "Methanal text arrangement", points: explicitMethanal ? 16 : 0, maximum: 16 },
    ])

    if (!explicitMethanal && (chainLength >= 3 || /ch3coch3|propanone|acetone/.test(text))) {
      const chainPoints = Math.min(16, chainLength * 3)
      add("acetone", "Acetone", 36 + chainPoints, ["Carbonyl cue within a longer carbon chain"], [
        { label: "Carbonyl visual cue", points: 36, maximum: 36 },
        { label: "Longer chain support", points: chainPoints, maximum: 16 },
      ])
    }
  }

  if (hasCue("carboxyl")) {
    const chainPoints = chainLength >= 2 ? 9 : 2
    add("ethanoic-acid", "Ethanoic acid", 45 + chainPoints, ["COOH-like visual cue", "Carbon chain attached to carboxyl group"], [
      { label: "Carboxyl visual cue", points: 45, maximum: 45 },
      { label: "Carbon chain support", points: chainPoints, maximum: 9 },
    ])
  }

  if (hasCue("hydroxyl") && chainLength >= 2) {
    const formulaCue = /ch3ch2oh|c2h5oh|cco-h|ccoh/.test(text)
    const chainPoints = Math.min(10, chainLength * 3)
    add("ethanol", "Ethanol", 38 + chainPoints + (formulaCue ? 10 : 0), [
      "Hydroxyl cue at a simple chain",
      formulaCue ? "C-C-O-H text sequence" : "Connected chain with terminal O-H cue",
    ], [
      { label: "Hydroxyl visual cue", points: 38, maximum: 38 },
      { label: "Simple chain support", points: chainPoints, maximum: 10 },
      { label: "C-C-O-H text support", points: formulaCue ? 10 : 0, maximum: 10 },
    ])
  }

  if (parallelLinePairs > 0 && chainLength === 2 && !hasCue("carbonyl")) {
    add("ethene", "Ethene", 34, ["Two-atom chain with a double-bond-like line pair"], [
      { label: "Open-chain double bond", points: 34, maximum: 34 },
    ])
  }

  return candidates.sort((left, right) => right.score - left.score || left.label.localeCompare(right.label)).slice(0, 5)
}

export function analyzeDarkPixelMask(
  mask: DarkPixelMask,
  recognizedText = "",
  atomLabels: VisionAtomLabel[] = [],
): StructureVisionAnalysis {
  const lineSegments = detectLineSegments(mask)
  const closedLoops = detectClosedLoops(mask)
  const parallelBondPairs = detectParallelBondPairs(lineSegments, mask)
  const parallelLinePairs = parallelBondPairs.length
  const aromaticText = /benzene|aromatic|c6h6|phenyl|hexagon|ring/.test(
    recognizedText.toLowerCase().replace(/[^a-z0-9]/g, ""),
  )
  const pixelRings = detectRingCandidates(mask, closedLoops, lineSegments).map((ring) => ({
    ...ring,
    benzeneLike: ring.sidesEstimate === 6 && (parallelLinePairs >= 2 || aromaticText),
    doubleBondCue: clamp(Math.round((parallelLinePairs / 3) * 100), 0, 100),
    aromaticCueScore: aromaticText ? 100 : 0,
  }))
  const graph = detectGraphRings(buildSegmentGraph(mask, lineSegments), parallelLinePairs, recognizedText)
  const rawRingCandidates = [
    ...graph.cycleCandidates,
    ...graph.nearRingCandidates,
    ...pixelRings,
  ].sort((left, right) => right.confidence - left.confidence)
  const ringCandidates: VisionRingCandidate[] = []
  rawRingCandidates.forEach((candidate) => {
    const duplicate = ringCandidates.some((existing) =>
      existing.sidesEstimate === candidate.sidesEstimate &&
      distance(existing.center, candidate.center) <= Math.max(5, Math.min(existing.width, existing.height) * 0.22),
    )
    if (!duplicate) ringCandidates.push(candidate)
  })
  const bestRing = ringCandidates[0]
  const graphSummary: VisionGraphAnalysis = {
    ...graph,
    bestRingConfidence: Math.max(graph.bestRingConfidence, bestRing?.confidence ?? 0),
    aromaticCueScore: Math.max(
      graph.aromaticCueScore,
      bestRing ? Math.round(bestRing.doubleBondCue * 0.65 + bestRing.aromaticCueScore * 0.35) : 0,
    ),
    explanation: graph.bestRingConfidence > 0
      ? graph.explanation
      : bestRing
        ? bestRing.reason
        : graph.explanation,
  }
  const simpleChainLength = estimateSimpleChainLength(lineSegments, mask)
  const functionalGroupCues = buildCues(ringCandidates, parallelLinePairs, simpleChainLength, recognizedText)
  const molecularGraph = reconstructMolecularGraph({
    graph: graphSummary,
    lineSegments,
    parallelBondPairs,
    ringCandidates,
    functionalGroupCues,
    recognizedText,
    atomLabels,
    imageWidth: mask.width,
    imageHeight: mask.height,
  })
  const atomRingCandidates: VisionRingCandidate[] = molecularGraph.atomCentered
    ? molecularGraph.rings.map((ring) => {
      const nodes = ring.nodeIds
        .map((nodeId) => molecularGraph.nodes.find((node) => node.id === nodeId))
        .filter((node): node is (typeof molecularGraph.nodes)[number] => Boolean(node))
      const minimumX = Math.min(...nodes.map((node) => node.x))
      const maximumX = Math.max(...nodes.map((node) => node.x))
      const minimumY = Math.min(...nodes.map((node) => node.y))
      const maximumY = Math.max(...nodes.map((node) => node.y))
      const ringDoubleBonds = molecularGraph.bonds.filter((bond) =>
        ring.nodeIds.includes(bond.startNodeId) && ring.nodeIds.includes(bond.endNodeId) && bond.bondOrder >= 2,
      ).length
      return {
        center: { x: average(nodes.map((node) => node.x)), y: average(nodes.map((node) => node.y)) },
        width: maximumX - minimumX,
        height: maximumY - minimumY,
        sidesEstimate: ring.size,
        confidence: ring.confidence,
        benzeneLike: ring.aromatic && ring.size === 6,
        nearRing: false,
        source: "graph-cycle" as const,
        nodeIds: ring.nodeIds,
        closureQuality: 100,
        endpointMergeQuality: Math.round(average(nodes.map((node) => node.confidence))),
        polygonRegularity: ring.confidence,
        lineCoverage: 100,
        doubleBondCue: clamp(Math.round(ringDoubleBonds / Math.max(1, Math.floor(ring.size / 2)) * 100), 0, 100),
        aromaticCueScore: ring.aromatic ? 95 : 0,
        reason: `${ring.size}-member cycle reconstructed from snapped atom-label bonds.`,
        scoreBreakdown: [
          { label: "Atom-centroid cycle", points: 30, maximum: 30 },
          { label: "Snapped bond closure", points: 25, maximum: 25 },
          { label: "Parallel bond support", points: ring.aromatic ? 25 : 0, maximum: 25 },
        ],
      }
    })
    : []
  const finalRingCandidates = [...atomRingCandidates, ...ringCandidates]
    .sort((left, right) => right.confidence - left.confidence)
  const finalGraphSummary: VisionGraphAnalysis = molecularGraph.atomCentered
    ? {
      nodes: molecularGraph.nodes.map((node) => ({
        id: node.id,
        point: { x: node.x, y: node.y },
        endpointCount: node.degree,
        mergeRadius: node.labelBounds ? Math.max(node.labelBounds.width, node.labelBounds.height) / 2 : 0,
        mergeQuality: node.confidence,
      })),
      edges: molecularGraph.bonds.map((bond) => {
        const start = molecularGraph.nodes.find((node) => node.id === bond.startNodeId)
        const end = molecularGraph.nodes.find((node) => node.id === bond.endNodeId)
        return {
          id: bond.id,
          startNodeId: bond.startNodeId,
          endNodeId: bond.endNodeId,
          length: start && end ? Math.hypot(end.x - start.x, end.y - start.y) : 0,
          sourceSegmentIndexes: bond.sourceSegmentIndexes,
        }
      }),
      mergedEndpointCount: molecularGraph.bonds.reduce((sum, bond) => sum + bond.sourceSegmentIndexes.length, 0),
      endpointTolerance: molecularGraph.snapRadius,
      averageLineLength: graphSummary.averageLineLength,
      cycleCandidates: atomRingCandidates,
      nearRingCandidates: [],
      bestRingConfidence: atomRingCandidates[0]?.confidence ?? 0,
      aromaticCueScore: atomRingCandidates.some((ring) => ring.benzeneLike) ? 95 : 0,
      explanation: atomRingCandidates.length
        ? `${atomRingCandidates[0].sidesEstimate}-member cycle reconstructed from positioned atom labels and snapped bond strokes.`
        : "Atom labels were positioned and bonds were snapped, but no 3-8 member cycle closed.",
    }
    : graphSummary
  const finalFunctionalGroupCues = molecularGraph.atomCentered
    ? buildCues(finalRingCandidates, parallelLinePairs, simpleChainLength, recognizedText)
    : functionalGroupCues
  const candidates = buildCandidates(
    finalFunctionalGroupCues,
    finalRingCandidates,
    parallelLinePairs,
    simpleChainLength,
    recognizedText,
    finalGraphSummary.aromaticCueScore,
  )
  const visualConfidence = candidates[0]?.score ?? 0
  const darkPixelRatio = mask.darkPixelCount / Math.max(1, mask.width * mask.height)
  const warnings: string[] = []
  if (darkPixelRatio < 0.003) warnings.push("Very few dark strokes were detected. Increase contrast or crop closer.")
  if (darkPixelRatio > 0.42) warnings.push("The preview is unusually dark. Reduce contrast or use a cleaner crop.")
  if (!lineSegments.length) warnings.push("No stable bond-like line segments were detected.")
  if (!finalRingCandidates.length && finalGraphSummary.edges.length >= 4) {
    warnings.push("Ring-like strokes detected, but closure was weak. Try cropping closer or increasing contrast.")
  }

  return {
    width: mask.width,
    height: mask.height,
    darkPixelCount: mask.darkPixelCount,
    darkPixelRatio,
    threshold: mask.threshold,
    atomLabels,
    lineSegments,
    closedLoops,
    ringCandidates: finalRingCandidates,
    graph: finalGraphSummary,
    molecularGraph,
    parallelBondPairs,
    parallelLinePairs,
    simpleChainLength,
    functionalGroupCues: finalFunctionalGroupCues,
    candidates,
    visualConfidence,
    isUncertain: visualConfidence < 45,
    warnings,
  }
}
