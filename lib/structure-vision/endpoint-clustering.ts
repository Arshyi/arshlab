import type { DarkPixelMask, VisionPoint } from "./vision-types"
import type { EndpointCluster, ReconstructedStroke } from "./vision-reconstruction-report"

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))
}

function distance(left: VisionPoint, right: VisionPoint): number {
  return Math.hypot(left.x - right.x, left.y - right.y)
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length)
}

export function clusterStrokeEndpoints(strokes: ReconstructedStroke[], mask: DarkPixelMask): EndpointCluster[] {
  const sortedLengths = strokes.map((stroke) => stroke.length).sort((left, right) => left - right)
  const medianLength = sortedLengths[Math.floor(sortedLengths.length / 2)] ?? 0
  const tolerance = clamp(medianLength * 0.24, Math.max(6, Math.min(mask.width, mask.height) * 0.025), Math.min(24, Math.max(mask.width, mask.height) * 0.1))
  const clusters: EndpointCluster[] = []

  strokes.forEach((stroke) => {
    ;[stroke.start, stroke.end].forEach((point) => {
      let nearestIndex = -1
      let nearestDistance = Number.POSITIVE_INFINITY
      clusters.forEach((cluster, index) => {
        const candidateDistance = distance(cluster.center, point)
        if (candidateDistance <= tolerance && candidateDistance < nearestDistance) {
          nearestDistance = candidateDistance
          nearestIndex = index
        }
      })
      if (nearestIndex < 0) {
        clusters.push({
          id: clusters.length,
          center: { ...point },
          points: [{ ...point }],
          segmentIndexes: [...stroke.sourceSegmentIndexes],
          radius: 0,
          confidence: stroke.confidence,
        })
        return
      }
      const cluster = clusters[nearestIndex]
      cluster.points.push({ ...point })
      cluster.segmentIndexes = Array.from(new Set([...cluster.segmentIndexes, ...stroke.sourceSegmentIndexes]))
      cluster.center = {
        x: average(cluster.points.map((clusterPoint) => clusterPoint.x)),
        y: average(cluster.points.map((clusterPoint) => clusterPoint.y)),
      }
      cluster.radius = Math.max(...cluster.points.map((clusterPoint) => distance(clusterPoint, cluster.center)))
      cluster.confidence = Math.round(clamp(92 - (cluster.radius / Math.max(1, tolerance)) * 45 + Math.min(10, cluster.points.length * 2), 25, 98))
    })
  })

  return clusters.map((cluster, id) => ({ ...cluster, id }))
}
