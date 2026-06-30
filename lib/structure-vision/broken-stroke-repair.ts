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

function strokeFromEndpoints(left: VisionPoint, right: VisionPoint, id: number, sources: number[], confidence: number): ReconstructedStroke {
  const length = distance(left, right)
  const angle = ((Math.atan2(right.y - left.y, right.x - left.x) * 180 / Math.PI) + 180) % 180
  return {
    id,
    start: left,
    end: right,
    midpoint: { x: (left.x + right.x) / 2, y: (left.y + right.y) / 2 },
    length,
    angle,
    strength: Math.round(length),
    sourceSegmentIndexes: sources,
    confidence,
    merged: false,
    repaired: true,
  }
}

export function repairBrokenStrokes(strokes: ReconstructedStroke[], mask: DarkPixelMask): ReconstructedStroke[] {
  const repaired = [...strokes]
  const maxGap = Math.max(5, Math.min(mask.width, mask.height) * 0.045)
  const initialLength = repaired.length

  for (let leftIndex = 0; leftIndex < initialLength; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < initialLength; rightIndex += 1) {
      const left = repaired[leftIndex]
      const right = repaired[rightIndex]
      if (angleDifference(left.angle, right.angle) > 10) continue
      const pairs = [
        [left.start, right.start],
        [left.start, right.end],
        [left.end, right.start],
        [left.end, right.end],
      ] as const
      const closest = pairs
        .map(([a, b]) => ({ a, b, gap: distance(a, b) }))
        .sort((a, b) => a.gap - b.gap)[0]
      if (!closest || closest.gap <= 1 || closest.gap > maxGap) continue
      const confidence = Math.round(clamp(Math.min(left.confidence, right.confidence) - closest.gap * 1.6, 35, 76))
      repaired.push(strokeFromEndpoints(
        closest.a,
        closest.b,
        repaired.length,
        Array.from(new Set([...left.sourceSegmentIndexes, ...right.sourceSegmentIndexes])),
        confidence,
      ))
    }
  }

  return repaired
}
