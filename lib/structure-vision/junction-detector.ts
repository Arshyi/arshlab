import type { DarkPixelMask, VisionPoint } from "./vision-types"
import type { EndpointCluster, ReconstructedStroke, VisionJunction } from "./vision-reconstruction-report"

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))
}

function distance(left: VisionPoint, right: VisionPoint): number {
  return Math.hypot(left.x - right.x, left.y - right.y)
}

function orientation(a: VisionPoint, b: VisionPoint, c: VisionPoint): number {
  return (b.y - a.y) * (c.x - b.x) - (b.x - a.x) * (c.y - b.y)
}

function segmentsIntersect(a: VisionPoint, b: VisionPoint, c: VisionPoint, d: VisionPoint): boolean {
  return orientation(a, b, c) * orientation(a, b, d) < 0 && orientation(c, d, a) * orientation(c, d, b) < 0
}

function lineIntersection(a: VisionPoint, b: VisionPoint, c: VisionPoint, d: VisionPoint): VisionPoint {
  const denominator = (a.x - b.x) * (c.y - d.y) - (a.y - b.y) * (c.x - d.x)
  if (Math.abs(denominator) < 0.001) return { x: (a.x + b.x + c.x + d.x) / 4, y: (a.y + b.y + c.y + d.y) / 4 }
  const left = a.x * b.y - a.y * b.x
  const right = c.x * d.y - c.y * d.x
  return {
    x: (left * (c.x - d.x) - (a.x - b.x) * right) / denominator,
    y: (left * (c.y - d.y) - (a.y - b.y) * right) / denominator,
  }
}

export function detectJunctions(
  strokes: ReconstructedStroke[],
  clusters: EndpointCluster[],
  mask: DarkPixelMask,
): VisionJunction[] {
  const junctions: VisionJunction[] = clusters.map((cluster, id) => ({
    id,
    point: cluster.center,
    type: cluster.segmentIndexes.length >= 3 || cluster.points.length >= 3 ? "branch" : "endpoint",
    segmentIndexes: cluster.segmentIndexes,
    confidence: cluster.confidence,
  }))
  const crossingTolerance = Math.max(3, Math.min(mask.width, mask.height) * 0.018)

  for (let leftIndex = 0; leftIndex < strokes.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < strokes.length; rightIndex += 1) {
      const left = strokes[leftIndex]
      const right = strokes[rightIndex]
      const sharedEndpoint = [left.start, left.end].some((point) =>
        [right.start, right.end].some((candidate) => distance(point, candidate) <= crossingTolerance),
      )
      if (sharedEndpoint || !segmentsIntersect(left.start, left.end, right.start, right.end)) continue
      const point = lineIntersection(left.start, left.end, right.start, right.end)
      junctions.push({
        id: junctions.length,
        point,
        type: "x-crossing",
        segmentIndexes: Array.from(new Set([...left.sourceSegmentIndexes, ...right.sourceSegmentIndexes])),
        confidence: Math.round(clamp(Math.min(left.confidence, right.confidence) - 10, 10, 88)),
      })
    }
  }

  return junctions
}
