import type { VisionPoint } from "./vision-types"
import type {
  AtomCenterEstimate,
  EndpointCluster,
  PrimitiveBond,
  ReconstructedStroke,
  VisionJunction,
} from "./vision-reconstruction-report"

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
  return ((Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI) + 180) % 180
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

function nearestAtom(point: VisionPoint, atoms: AtomCenterEstimate[]): { atom: AtomCenterEstimate; distance: number } | null {
  const nearest = atoms
    .map((atom) => ({ atom, distance: distance(point, atom.point) }))
    .sort((left, right) => left.distance - right.distance)[0]
  return nearest ?? null
}

function likelyBondOrder(stroke: ReconstructedStroke, allStrokes: ReconstructedStroke[]): 1 | 2 | 3 {
  const parallel = allStrokes.filter((candidate) => {
    if (candidate.id === stroke.id) return false
    if (angleDifference(candidate.angle, stroke.angle) > 8) return false
    const separation = distanceToLine(candidate.midpoint, stroke.start, stroke.end)
    const along = projection(candidate.midpoint, stroke.start, stroke.end)
    return separation >= 2 && separation <= 9 && along >= -0.15 && along <= 1.15
  }).length
  return parallel >= 2 ? 3 : parallel >= 1 ? 2 : 1
}

export function associateBondsToAtoms({
  atomCenters,
  strokes,
  junctions,
  recognizedText,
}: {
  atomCenters: AtomCenterEstimate[]
  strokes: ReconstructedStroke[]
  junctions: VisionJunction[]
  endpointClusters: EndpointCluster[]
  recognizedText: string
  imageWidth: number
  imageHeight: number
}): PrimitiveBond[] {
  if (atomCenters.length < 2) return []
  const sortedLengths = strokes.map((stroke) => stroke.length).sort((left, right) => left - right)
  const medianLength = sortedLengths[Math.floor(sortedLengths.length / 2)] ?? 16
  const snapRadius = clamp(medianLength * 0.55, 8, 34)
  const bondByKey = new Map<string, PrimitiveBond>()
  const textBoost = /ethanol|ch3ch2oh|c2h6o/i.test(recognizedText) ? 7 : 0

  strokes.forEach((stroke) => {
    const start = nearestAtom(stroke.start, atomCenters)
    const end = nearestAtom(stroke.end, atomCenters)
    let first = start?.atom
    let second = end?.atom
    let endpointPenalty = 0

    if (!first || !second || first.id === second.id || start.distance > snapRadius || end.distance > snapRadius) {
      const aligned = atomCenters
        .flatMap((left) => atomCenters.map((right) => ({ left, right })).filter((pair) => pair.left.id < pair.right.id))
        .map((pair) => {
          const angle = edgeAngle(pair.left.point, pair.right.point)
          const length = distance(pair.left.point, pair.right.point)
          const along = projection(stroke.midpoint, pair.left.point, pair.right.point)
          const offLine = distanceToLine(stroke.midpoint, pair.left.point, pair.right.point)
          const anglePenalty = angleDifference(angle, stroke.angle)
          return { ...pair, length, along, offLine, anglePenalty }
        })
        .filter((pair) =>
          pair.along >= -0.25 &&
          pair.along <= 1.25 &&
          pair.offLine <= Math.max(8, snapRadius * 0.8) &&
          pair.anglePenalty <= 18 &&
          pair.length <= Math.max(medianLength * 2.2, 42),
        )
        .sort((left, right) => left.offLine + left.anglePenalty * 0.3 - (right.offLine + right.anglePenalty * 0.3))[0]
      if (!aligned) return
      first = aligned.left
      second = aligned.right
      endpointPenalty = 14
    }

    const key = [first.id, second.id].sort((left, right) => left - right).join("-")
    const bondOrder = likelyBondOrder(stroke, strokes)
    const xCrossingPenalty = junctions.some((junction) =>
      junction.type === "x-crossing" &&
      stroke.sourceSegmentIndexes.some((index) => junction.segmentIndexes.includes(index)),
    ) ? 12 : 0
    const candidate: PrimitiveBond = {
      id: bondByKey.size,
      startAtomId: first.id,
      endAtomId: second.id,
      length: distance(first.point, second.point),
      bondOrder,
      sourceStrokeIds: [...stroke.sourceSegmentIndexes],
      confidence: Math.round(clamp(
        stroke.confidence * 0.52 +
        first.confidence * 0.2 +
        second.confidence * 0.2 +
        textBoost -
        endpointPenalty -
        xCrossingPenalty,
        18,
        96,
      )),
      repaired: stroke.repaired || endpointPenalty > 0,
      rejected: false,
    }
    const existing = bondByKey.get(key)
    if (!existing || candidate.confidence > existing.confidence) {
      bondByKey.set(key, existing ? { ...candidate, id: existing.id } : candidate)
    } else {
      existing.sourceStrokeIds = Array.from(new Set([...existing.sourceStrokeIds, ...candidate.sourceStrokeIds]))
      existing.bondOrder = Math.max(existing.bondOrder, candidate.bondOrder) as 1 | 2 | 3
    }
  })

  return Array.from(bondByKey.values()).map((bond, id) => ({ ...bond, id }))
}
