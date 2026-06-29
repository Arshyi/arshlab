import type { VisionClosedLoop, VisionLineSegment, VisionPoint } from "./vision-types"

export interface ReconstructedStroke extends VisionLineSegment {
  id: number
  sourceSegmentIndexes: number[]
  inferred: boolean
  reason: string
  confidence: number
}

export interface ShapeBridge {
  id: number
  fromStrokeId: number
  toStrokeId: number
  segment: VisionLineSegment
  gapLength: number
  confidence: number
  accepted: boolean
  reason: string
}

export interface PredictedCorner {
  id: number
  point: VisionPoint
  strokeIds: number[]
  angle: number
  confidence: number
  reason: string
}

export interface PolygonFit {
  sides: number
  fitError: number
  rotation: number
  scale: number
  center: VisionPoint
}

export interface ShapePolygonHypothesis {
  id: number
  sides: number
  vertices: VisionPoint[]
  edges: VisionLineSegment[]
  missingEdges: VisionLineSegment[]
  closureError: number
  angleConsistency: number
  edgeLengthConsistency: number
  symmetryScore: number
  crossingCount: number
  confidence: number
  fit: PolygonFit
  accepted: boolean
  reasons: string[]
  rejectionReasons: string[]
}

export interface GlobalShapeReconstructionResult {
  originalSegments: VisionLineSegment[]
  mergedStrokes: ReconstructedStroke[]
  bridgedGaps: ShapeBridge[]
  predictedCorners: PredictedCorner[]
  polygonHypotheses: ShapePolygonHypothesis[]
  acceptedPolygon: ShapePolygonHypothesis | null
  reconstructedSegments: VisionLineSegment[]
  shapeConfidence: number
  polygonConfidence: number
  bridgeConfidence: number
  cornerConfidence: number
  symmetryScore: number
  closureScore: number
  explanation: string
}

export interface GlobalShapeReconstructionInput {
  lineSegments: VisionLineSegment[]
  closedLoops: VisionClosedLoop[]
  imageWidth: number
  imageHeight: number
}

function clamp(value: number, minimum = 0, maximum = 100): number {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
}

function distance(left: VisionPoint, right: VisionPoint): number {
  return Math.hypot(left.x - right.x, left.y - right.y)
}

function angleDifference(left: number, right: number): number {
  const difference = Math.abs(left - right) % 180
  return Math.min(difference, 180 - difference)
}

function segmentAngle(start: VisionPoint, end: VisionPoint): number {
  return (Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI + 180) % 180
}

function midpoint(start: VisionPoint, end: VisionPoint): VisionPoint {
  return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }
}

function makeSegment(start: VisionPoint, end: VisionPoint, strength = 12): VisionLineSegment {
  return {
    start,
    end,
    midpoint: midpoint(start, end),
    length: distance(start, end),
    angle: segmentAngle(start, end),
    strength,
  }
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

function lineEndpointsForProjection(segment: VisionLineSegment, startProjection: number, endProjection: number): VisionLineSegment {
  const radians = segment.angle * Math.PI / 180
  const direction = { x: Math.cos(radians), y: Math.sin(radians) }
  const centerProjection = segment.midpoint.x * direction.x + segment.midpoint.y * direction.y
  const center = segment.midpoint
  const start = {
    x: center.x + direction.x * (startProjection - centerProjection),
    y: center.y + direction.y * (startProjection - centerProjection),
  }
  const end = {
    x: center.x + direction.x * (endProjection - centerProjection),
    y: center.y + direction.y * (endProjection - centerProjection),
  }
  return makeSegment(start, end, segment.strength)
}

function isBorderLike(segment: VisionLineSegment, width: number, height: number): boolean {
  const margin = Math.max(4, Math.min(width, height) * 0.035)
  const nearHorizontalBorder = (segment.start.y <= margin && segment.end.y <= margin) ||
    (segment.start.y >= height - margin && segment.end.y >= height - margin)
  const nearVerticalBorder = (segment.start.x <= margin && segment.end.x <= margin) ||
    (segment.start.x >= width - margin && segment.end.x >= width - margin)
  const tooLong = segment.length > Math.max(width, height) * 0.82
  const axisAligned = angleDifference(segment.angle, 0) <= 5 || angleDifference(segment.angle, 90) <= 5
  return Boolean(tooLong && axisAligned && (nearHorizontalBorder || nearVerticalBorder))
}

function mergeCollinearSegments(segments: VisionLineSegment[], width: number, height: number): ReconstructedStroke[] {
  const filtered = segments.filter((segment) => !isBorderLike(segment, width, height))
  const used = new Set<number>()
  const strokes: ReconstructedStroke[] = []
  const adaptiveGap = Math.max(8, Math.min(width, height) * 0.11)

  filtered.forEach((seed, seedIndex) => {
    if (used.has(seedIndex)) return
    const members: Array<{ segment: VisionLineSegment; index: number }> = [{ segment: seed, index: seedIndex }]
    used.add(seedIndex)
    filtered.forEach((candidate, candidateIndex) => {
      if (used.has(candidateIndex)) return
      if (angleDifference(seed.angle, candidate.angle) > 9) return
      const perpendicular = distanceToLine(candidate.midpoint, seed.start, seed.end)
      if (perpendicular > Math.max(4, Math.min(width, height) * 0.035)) return
      const seedStart = projection(seed.start, seed.start, seed.end)
      const seedEnd = projection(seed.end, seed.start, seed.end)
      const candidateStart = projection(candidate.start, seed.start, seed.end)
      const candidateEnd = projection(candidate.end, seed.start, seed.end)
      const gap = Math.max(0, Math.max(Math.min(seedStart, seedEnd), Math.min(candidateStart, candidateEnd)) -
        Math.min(Math.max(seedStart, seedEnd), Math.max(candidateStart, candidateEnd)))
      if (gap > adaptiveGap) return
      members.push({ segment: candidate, index: candidateIndex })
      used.add(candidateIndex)
    })

    const direction = { x: Math.cos(seed.angle * Math.PI / 180), y: Math.sin(seed.angle * Math.PI / 180) }
    const projections = members.flatMap(({ segment }) => [
      segment.start.x * direction.x + segment.start.y * direction.y,
      segment.end.x * direction.x + segment.end.y * direction.y,
    ])
    const merged = lineEndpointsForProjection(seed, Math.min(...projections), Math.max(...projections))
    strokes.push({
      ...merged,
      id: strokes.length,
      sourceSegmentIndexes: members.map((member) => member.index),
      inferred: false,
      confidence: Math.round(clamp(52 + members.length * 9 + Math.min(18, merged.length / Math.max(1, Math.min(width, height)) * 45), 45, 96)),
      reason: members.length > 1
        ? `Merged ${members.length} near-collinear fragments into a continuous stroke.`
        : "Original stable stroke retained as a reconstruction seed.",
    })
  })

  return strokes.sort((left, right) => right.length - left.length).slice(0, 36).map((stroke, id) => ({ ...stroke, id }))
}

function endpoints(stroke: ReconstructedStroke): Array<{ point: VisionPoint; endpoint: "start" | "end" }> {
  return [
    { point: stroke.start, endpoint: "start" },
    { point: stroke.end, endpoint: "end" },
  ]
}

function bridgeSmallGaps(strokes: ReconstructedStroke[], width: number, height: number): ShapeBridge[] {
  const bridges: ShapeBridge[] = []
  const maxGap = Math.max(7, Math.min(width, height) * 0.09)
  for (let leftIndex = 0; leftIndex < strokes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < strokes.length; rightIndex += 1) {
      const left = strokes[leftIndex]
      const right = strokes[rightIndex]
      if (angleDifference(left.angle, right.angle) > 10) continue
      for (const leftEndpoint of endpoints(left)) {
        for (const rightEndpoint of endpoints(right)) {
          const gap = distance(leftEndpoint.point, rightEndpoint.point)
          if (gap <= 1 || gap > maxGap) continue
          const bridge = makeSegment(leftEndpoint.point, rightEndpoint.point, Math.max(4, Math.min(left.strength, right.strength) * 0.55))
          const orientationCompatible = angleDifference(bridge.angle, left.angle) <= 16
          const accepted = orientationCompatible
          bridges.push({
            id: bridges.length,
            fromStrokeId: left.id,
            toStrokeId: right.id,
            segment: bridge,
            gapLength: Math.round(gap * 10) / 10,
            confidence: Math.round(clamp(82 - gap / maxGap * 38 - (orientationCompatible ? 0 : 28), 0, 88)),
            accepted,
            reason: accepted
              ? "Short gap bridged from collinear stroke continuity evidence."
              : "Rejected bridge: distance alone is not enough without orientation continuity.",
          })
        }
      }
    }
  }
  return bridges.sort((left, right) => right.confidence - left.confidence).slice(0, 18)
}

function inferCorners(strokes: ReconstructedStroke[], width: number, height: number): PredictedCorner[] {
  const corners: PredictedCorner[] = []
  const tolerance = Math.max(8, Math.min(width, height) * 0.085)
  for (let leftIndex = 0; leftIndex < strokes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < strokes.length; rightIndex += 1) {
      const left = strokes[leftIndex]
      const right = strokes[rightIndex]
      const angle = angleDifference(left.angle, right.angle)
      if (angle < 42 || angle > 142) continue
      let closest: { left: VisionPoint; right: VisionPoint; gap: number } | null = null
      endpoints(left).forEach((leftEndpoint) => {
        endpoints(right).forEach((rightEndpoint) => {
          const gap = distance(leftEndpoint.point, rightEndpoint.point)
          if (!closest || gap < closest.gap) closest = { left: leftEndpoint.point, right: rightEndpoint.point, gap }
        })
      })
      if (!closest || closest.gap > tolerance) continue
      corners.push({
        id: corners.length,
        point: midpoint(closest.left, closest.right),
        strokeIds: [left.id, right.id],
        angle: Math.round(angle),
        confidence: Math.round(clamp(92 - closest.gap / tolerance * 32 - Math.abs(angle - 110) * 0.18, 35, 92)),
        reason: "Two reconstructed strokes terminate close together at a chemically plausible bond angle.",
      })
    }
  }
  return corners.sort((left, right) => right.confidence - left.confidence).slice(0, 18)
}

function polygonVertices(center: VisionPoint, radiusX: number, radiusY: number, sides: number, rotation: number): VisionPoint[] {
  return Array.from({ length: sides }, (_, index) => {
    const angle = rotation + (Math.PI * 2 * index) / sides
    return { x: center.x + Math.cos(angle) * radiusX, y: center.y + Math.sin(angle) * radiusY }
  })
}

function edgeSupport(edge: VisionLineSegment, strokes: ReconstructedStroke[]): number {
  const support = strokes.reduce((best, stroke) => {
    const angleScore = Math.max(0, 1 - angleDifference(edge.angle, stroke.angle) / 18)
    if (angleScore < 0.22) return best
    const midpointScore = Math.max(0, 1 - distance(edge.midpoint, stroke.midpoint) / Math.max(10, edge.length * 0.58))
    const lineScore = Math.max(0, 1 - distanceToLine(stroke.midpoint, edge.start, edge.end) / Math.max(5, edge.length * 0.18))
    const endpointScore = Math.max(
      0,
      1 - Math.min(
        distance(edge.start, stroke.start) + distance(edge.end, stroke.end),
        distance(edge.start, stroke.end) + distance(edge.end, stroke.start),
      ) / Math.max(10, edge.length * 0.75),
    )
    return Math.max(best, angleScore * (midpointScore * 0.32 + lineScore * 0.28 + endpointScore * 0.4))
  }, 0)
  return Math.round(clamp(support * 100))
}

function symmetryScore(vertices: VisionPoint[]): number {
  const center = {
    x: vertices.reduce((sum, point) => sum + point.x, 0) / Math.max(1, vertices.length),
    y: vertices.reduce((sum, point) => sum + point.y, 0) / Math.max(1, vertices.length),
  }
  const radii = vertices.map((point) => distance(point, center))
  const averageRadius = radii.reduce((sum, radius) => sum + radius, 0) / Math.max(1, radii.length)
  const radiusVariance = radii.reduce((sum, radius) => sum + Math.abs(radius - averageRadius), 0) / Math.max(1, radii.length)
  const lengths = vertices.map((point, index) => distance(point, vertices[(index + 1) % vertices.length]))
  const averageLength = lengths.reduce((sum, length) => sum + length, 0) / Math.max(1, lengths.length)
  const lengthVariance = lengths.reduce((sum, length) => sum + Math.abs(length - averageLength), 0) / Math.max(1, lengths.length)
  return Math.round(clamp(100 - radiusVariance / Math.max(1, averageRadius) * 130 - lengthVariance / Math.max(1, averageLength) * 120))
}

function uniqueDirectionCount(angles: number[]): number {
  const directions: number[] = []
  angles.forEach((angle) => {
    if (!directions.some((direction) => angleDifference(direction, angle) < 12)) directions.push(angle)
  })
  return directions.length
}

function buildPolygonCandidate(
  loop: VisionClosedLoop,
  strokes: ReconstructedStroke[],
  id: number,
  sides: number,
  rotation: number,
): ShapePolygonHypothesis {
  const center = loop.center
  const radiusX = Math.max(5, loop.bounds.width / 2)
  const radiusY = Math.max(5, loop.bounds.height / 2)
  const vertices = polygonVertices(center, radiusX, radiusY, sides, rotation)
  const edges = vertices.map((vertex, index) => makeSegment(vertex, vertices[(index + 1) % vertices.length], 16))
  const supports = edges.map((edge) => edgeSupport(edge, strokes))
  const missingEdges = edges.filter((_, index) => supports[index] < 34)
  const lengths = edges.map((edge) => edge.length)
  const averageLength = lengths.reduce((sum, value) => sum + value, 0) / lengths.length
  const edgeLengthConsistency = Math.round(clamp(100 - lengths.reduce((sum, value) => sum + Math.abs(value - averageLength), 0) / Math.max(1, averageLength) / lengths.length * 150))
  const angleConsistency = Math.round(clamp(100 - Math.abs(180 * (sides - 2) / sides - (sides === 6 ? 120 : 180 * (sides - 2) / sides)) * 0.1))
  const symmetry = symmetryScore(vertices)
  const supportedAverage = supports.reduce((sum, support) => sum + support, 0) / supports.length
  const observedDirectionCount = uniqueDirectionCount(strokes.map((stroke) => stroke.angle))
  const candidateDirectionCount = uniqueDirectionCount(edges.map((edge) => edge.angle))
  const directionPenalty = observedDirectionCount >= 3
    ? Math.min(16, Math.abs(observedDirectionCount - candidateDirectionCount) * 6)
    : 0
  const complexityPenalty = Math.max(0, strokes.length - sides * 1.75) * (sides < 5 ? 2.2 : 0.45)
  const fitError = Math.round((100 - symmetry) * 0.22 + missingEdges.length * 4)
  const closureError = Math.round(clamp(missingEdges.length / sides * 100))
  const confidence = Math.round(clamp(
    supportedAverage * 0.35 +
    edgeLengthConsistency * 0.2 +
    angleConsistency * 0.16 +
    symmetry * 0.18 +
    (loop.aspectRatio >= 0.62 && loop.aspectRatio <= 1.5 ? 12 : -8) -
    missingEdges.length * 5 -
    directionPenalty -
    complexityPenalty,
    0,
    96,
  ))
  return {
    id,
    sides,
    vertices,
    edges,
    missingEdges,
    closureError,
    angleConsistency,
    edgeLengthConsistency,
    symmetryScore: symmetry,
    crossingCount: 0,
    confidence,
    fit: { sides, fitError, rotation: Math.round(rotation * 1000) / 1000, scale: Math.round(((radiusX + radiusY) / 2) * 10) / 10, center },
    accepted: false,
    reasons: [
      `${sides}-member regular polygon fit from closed-loop geometry`,
      `${Math.round(supportedAverage)}% average stroke-edge support`,
      `${symmetry}% rotational/mirror symmetry score`,
      directionPenalty > 0 ? `${Math.round(directionPenalty)} point stroke-direction mismatch penalty` : "Stroke directions match the polygon family",
      complexityPenalty > 0 ? `${Math.round(complexityPenalty)} point fragment-complexity penalty` : "Fragment count is compatible with the polygon size",
    ],
    rejectionReasons: missingEdges.length > Math.ceil(sides / 3)
      ? ["Too many unsupported inferred edges for safe polygon acceptance."]
      : confidence < 48
        ? ["Fit confidence below acceptance threshold."]
        : [],
  }
}

function polygonFromLoop(loop: VisionClosedLoop, strokes: ReconstructedStroke[], id: number): ShapePolygonHypothesis[] {
  const candidates: ShapePolygonHypothesis[] = []
  for (let sides = 3; sides <= 8; sides += 1) {
    const baseRotation = sides === 6 ? Math.PI / 6 : -Math.PI / 2
    const rotationCandidates = Array.from({ length: sides * 2 }, (_, index) => baseRotation + (Math.PI * index) / sides)
    const bestFit = rotationCandidates
      .map((rotation) => buildPolygonCandidate(loop, strokes, id + candidates.length, sides, rotation))
      .sort((left, right) =>
        right.confidence - left.confidence ||
        left.missingEdges.length - right.missingEdges.length ||
        left.fit.fitError - right.fit.fitError,
      )[0]
    candidates.push(bestFit)
  }
  return candidates
}

function generatePolygonHypotheses(strokes: ReconstructedStroke[], loops: VisionClosedLoop[]): ShapePolygonHypothesis[] {
  const inferredStrokeLoop = inferLoopFromStrokeBounds(strokes)
  const loopSeeds = [
    ...loops,
    ...(inferredStrokeLoop ? [inferredStrokeLoop] : []),
  ]
  const fromLoops = loopSeeds.flatMap((loop, index) => polygonFromLoop(loop, strokes, index * 10))
  return fromLoops
    .sort((left, right) => right.confidence - left.confidence || Math.abs(left.sides - 6) - Math.abs(right.sides - 6))
    .slice(0, 12)
    .map((candidate, id) => ({ ...candidate, id }))
}

function inferLoopFromStrokeBounds(strokes: ReconstructedStroke[]): VisionClosedLoop | null {
  if (strokes.length < 5) return null
  const directions: number[] = []
  strokes.forEach((stroke) => {
    if (!directions.some((direction) => angleDifference(direction, stroke.angle) < 12)) directions.push(stroke.angle)
  })
  if (directions.length < 3) return null
  const points = strokes.flatMap((stroke) => [stroke.start, stroke.end])
  const minimumX = Math.min(...points.map((point) => point.x))
  const maximumX = Math.max(...points.map((point) => point.x))
  const minimumY = Math.min(...points.map((point) => point.y))
  const maximumY = Math.max(...points.map((point) => point.y))
  const width = maximumX - minimumX
  const height = maximumY - minimumY
  const aspectRatio = width / Math.max(1, height)
  const medianLength = [...strokes.map((stroke) => stroke.length)].sort((left, right) => left - right)[Math.floor(strokes.length / 2)] ?? 0
  if (width < medianLength * 1.4 || height < medianLength * 1.4) return null
  if (aspectRatio < 0.48 || aspectRatio > 2.05) return null
  return {
    bounds: { x: minimumX, y: minimumY, width, height },
    center: { x: (minimumX + maximumX) / 2, y: (minimumY + maximumY) / 2 },
    holeArea: width * height * 0.42,
    aspectRatio,
  }
}

function inferredEdgesForPolygon(polygon: ShapePolygonHypothesis | null): VisionLineSegment[] {
  if (!polygon) return []
  return polygon.missingEdges.map((edge) => ({
    ...edge,
    strength: Math.max(8, polygon.confidence * 0.35),
    angle: edge.angle,
  }))
}

export function reconstructGlobalShape(input: GlobalShapeReconstructionInput): GlobalShapeReconstructionResult {
  const mergedStrokes = mergeCollinearSegments(input.lineSegments, input.imageWidth, input.imageHeight)
  const bridgedGaps = bridgeSmallGaps(mergedStrokes, input.imageWidth, input.imageHeight)
  const predictedCorners = inferCorners(mergedStrokes, input.imageWidth, input.imageHeight)
  const polygonHypotheses = generatePolygonHypotheses(mergedStrokes, input.closedLoops)
  const acceptedPolygon = polygonHypotheses.find((candidate) =>
    candidate.confidence >= 52 &&
    candidate.missingEdges.length <= Math.max(1, Math.floor(candidate.sides / 3)) &&
    candidate.symmetryScore >= 45,
  ) ?? null
  if (acceptedPolygon) acceptedPolygon.accepted = true
  const rejectedPolygons = polygonHypotheses.filter((candidate) => candidate !== acceptedPolygon)
  rejectedPolygons.forEach((candidate) => {
    candidate.accepted = false
    if (!candidate.rejectionReasons.length) candidate.rejectionReasons.push("Another polygon hypothesis scored higher.")
  })
  const acceptedBridges = bridgedGaps.filter((bridge) => bridge.accepted && bridge.confidence >= 44).map((bridge) => bridge.segment)
  const polygonEdges = inferredEdgesForPolygon(acceptedPolygon)
  const reconstructedSegments = [
    ...mergedStrokes.map(({ id: _id, sourceSegmentIndexes: _sources, inferred: _inferred, reason: _reason, confidence: _confidence, ...segment }) => segment),
    ...acceptedBridges,
    ...polygonEdges,
  ]
    .sort((left, right) => right.length * right.strength - left.length * left.strength)
    .slice(0, 36)

  const bridgeConfidence = Math.round(bridgedGaps.filter((bridge) => bridge.accepted).reduce((sum, bridge) => sum + bridge.confidence, 0) / Math.max(1, bridgedGaps.filter((bridge) => bridge.accepted).length))
  const cornerConfidence = Math.round(predictedCorners.reduce((sum, corner) => sum + corner.confidence, 0) / Math.max(1, predictedCorners.length))
  const polygonConfidence = acceptedPolygon?.confidence ?? 0
  const symmetry = acceptedPolygon?.symmetryScore ?? 0
  const closureScore = acceptedPolygon ? Math.round(clamp(100 - acceptedPolygon.closureError)) : 0
  const shapeConfidence = Math.round(clamp(
    (mergedStrokes.length ? 28 : 0) +
    polygonConfidence * 0.34 +
    bridgeConfidence * 0.13 +
    cornerConfidence * 0.1 +
    symmetry * 0.14 +
    closureScore * 0.12 -
    Math.max(0, input.lineSegments.length - mergedStrokes.length * 4) * 0.3,
    0,
    98,
  ))

  return {
    originalSegments: input.lineSegments,
    mergedStrokes,
    bridgedGaps,
    predictedCorners,
    polygonHypotheses: [acceptedPolygon, ...rejectedPolygons].filter((candidate): candidate is ShapePolygonHypothesis => Boolean(candidate)),
    acceptedPolygon,
    reconstructedSegments,
    shapeConfidence,
    polygonConfidence,
    bridgeConfidence,
    cornerConfidence,
    symmetryScore: symmetry,
    closureScore,
    explanation: acceptedPolygon
      ? `Accepted a ${acceptedPolygon.sides}-member polygon hypothesis at ${acceptedPolygon.confidence}% after merging ${input.lineSegments.length} fragments into ${mergedStrokes.length} reconstructed strokes.`
      : `Merged ${input.lineSegments.length} fragments into ${mergedStrokes.length} reconstructed strokes; no polygon hypothesis met acceptance safeguards.`,
  }
}
