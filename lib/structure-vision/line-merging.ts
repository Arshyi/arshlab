import type { DarkPixelMask, VisionPoint } from "./vision-types"
import type { ReconstructedStroke } from "./vision-reconstruction-report"

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

function projection(point: VisionPoint, origin: VisionPoint, angle: number): number {
  const radians = angle * Math.PI / 180
  return (point.x - origin.x) * Math.cos(radians) + (point.y - origin.y) * Math.sin(radians)
}

function perpendicularDistance(point: VisionPoint, start: VisionPoint, angle: number): number {
  const radians = angle * Math.PI / 180
  return Math.abs(-(point.x - start.x) * Math.sin(radians) + (point.y - start.y) * Math.cos(radians))
}

function mergedStroke(left: ReconstructedStroke, right: ReconstructedStroke, id: number): ReconstructedStroke {
  const angle = (left.angle * left.length + right.angle * right.length) / Math.max(1, left.length + right.length)
  const points = [left.start, left.end, right.start, right.end]
  const origin = points[0]
  const sorted = points
    .map((point) => ({ point, projected: projection(point, origin, angle) }))
    .sort((a, b) => a.projected - b.projected)
  const start = sorted[0].point
  const end = sorted[sorted.length - 1].point
  return {
    start,
    end,
    midpoint: { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 },
    length: distance(start, end),
    angle,
    strength: left.strength + right.strength,
    id,
    sourceSegmentIndexes: Array.from(new Set([...left.sourceSegmentIndexes, ...right.sourceSegmentIndexes])),
    confidence: Math.round(clamp(Math.max(left.confidence, right.confidence) + 8, 0, 98)),
    merged: true,
    repaired: left.repaired || right.repaired,
  }
}

function canMerge(left: ReconstructedStroke, right: ReconstructedStroke, tolerance: number): boolean {
  if (angleDifference(left.angle, right.angle) > 9) return false
  const endpoints = [
    distance(left.start, right.start),
    distance(left.start, right.end),
    distance(left.end, right.start),
    distance(left.end, right.end),
  ]
  const nearestEndpoint = Math.min(...endpoints)
  const closeEndpoint = nearestEndpoint > 1.5 && nearestEndpoint <= tolerance
  const collinear = perpendicularDistance(right.midpoint, left.start, left.angle) <= tolerance * 0.55
  return closeEndpoint && collinear
}

export function mergeLineSegments(strokes: ReconstructedStroke[], mask: DarkPixelMask): ReconstructedStroke[] {
  const tolerance = Math.max(5, Math.min(mask.width, mask.height) * 0.035)
  const working = strokes.map((stroke) => ({ ...stroke }))
  let changed = true
  while (changed) {
    changed = false
    outer: for (let leftIndex = 0; leftIndex < working.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < working.length; rightIndex += 1) {
        if (!canMerge(working[leftIndex], working[rightIndex], tolerance)) continue
        const merged = mergedStroke(working[leftIndex], working[rightIndex], working[leftIndex].id)
        working.splice(rightIndex, 1)
        working[leftIndex] = merged
        changed = true
        break outer
      }
    }
  }
  return working.map((stroke, id) => ({ ...stroke, id }))
}
