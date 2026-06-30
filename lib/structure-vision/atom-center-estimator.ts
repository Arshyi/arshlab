import type { VisionAtomLabel, VisionPoint } from "./vision-types"
import type { AtomCenterEstimate, EndpointCluster, ReconstructedStroke } from "./vision-reconstruction-report"

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))
}

function distance(left: VisionPoint, right: VisionPoint): number {
  return Math.hypot(left.x - right.x, left.y - right.y)
}

function normalizeFormula(text: string): string {
  return text.toUpperCase().replace(/[^A-Z0-9]/g, "")
}

function condensedHeavyAtomPattern(text: string): Array<VisionAtomLabel["label"] | "C"> {
  const normalized = normalizeFormula(text)
  if (/CH3CH2OH|C2H6O|ETHANOL/.test(normalized)) return ["C", "C", "O"]
  if (/CH3OH|METHANOL/.test(normalized)) return ["C", "O"]
  if (/CH3COOH|C2H4O2|ETHANOICACID/.test(normalized)) return ["C", "C", "O", "O"]
  if (/CH3CHO|C2H4O|ETHANAL/.test(normalized)) return ["C", "C", "O"]
  if (/CH3COCH3|C3H6O|ACETONE|PROPANONE/.test(normalized)) return ["C", "C", "C", "O"]
  if (/C6H6|BENZENE/.test(normalized)) return ["C", "C", "C", "C", "C", "C"]
  return []
}

function strokeAxis(strokes: ReconstructedStroke[]): { start: VisionPoint; end: VisionPoint } | null {
  if (!strokes.length) return null
  const points = strokes.flatMap((stroke) => [stroke.start, stroke.end])
  const minX = Math.min(...points.map((point) => point.x))
  const maxX = Math.max(...points.map((point) => point.x))
  const minY = Math.min(...points.map((point) => point.y))
  const maxY = Math.max(...points.map((point) => point.y))
  return (maxX - minX) >= (maxY - minY)
    ? { start: { x: minX, y: (minY + maxY) / 2 }, end: { x: maxX, y: (minY + maxY) / 2 } }
    : { start: { x: (minX + maxX) / 2, y: minY }, end: { x: (minX + maxX) / 2, y: maxY } }
}

function connectedClusters(clusters: EndpointCluster[]): EndpointCluster[] {
  return clusters
    .filter((cluster) => cluster.segmentIndexes.length > 0)
    .sort((left, right) => left.center.x - right.center.x || left.center.y - right.center.y)
}

export function estimateAtomCenters({
  atomLabels,
  endpointClusters,
  strokes,
  recognizedText,
  imageWidth,
  imageHeight,
}: {
  atomLabels: VisionAtomLabel[]
  endpointClusters: EndpointCluster[]
  strokes: ReconstructedStroke[]
  recognizedText: string
  imageWidth: number
  imageHeight: number
}): AtomCenterEstimate[] {
  const centers: AtomCenterEstimate[] = atomLabels.map((label, id) => ({
    id,
    element: label.label,
    point: label.centroid,
    source: "atom-label",
    confidence: label.confidence,
    atomLabelId: label.id,
  }))
  const pattern = condensedHeavyAtomPattern(recognizedText)
  if (centers.length >= 2) return centers

  const axis = strokeAxis(strokes)
  const candidates = connectedClusters(endpointClusters)
  if (pattern.length >= 2) {
    const ordered = candidates.length >= pattern.length
      ? candidates.slice(0, pattern.length)
      : []
    const points = ordered.length === pattern.length
      ? ordered.map((cluster) => cluster.center)
      : axis
        ? pattern.map((_, index) => ({
          x: axis.start.x + (axis.end.x - axis.start.x) * (index / Math.max(1, pattern.length - 1)),
          y: axis.start.y + (axis.end.y - axis.start.y) * (index / Math.max(1, pattern.length - 1)),
        }))
        : pattern.map((_, index) => ({
          x: imageWidth * (0.3 + index * 0.18),
          y: imageHeight * 0.5,
        }))
    return points.map((point, index) => ({
      id: index,
      element: pattern[index],
      point,
      source: "text-inferred",
      confidence: Math.round(clamp(68 - index * 2, 48, 78)),
      clusterId: ordered[index]?.id,
    }))
  }

  return candidates.slice(0, 10).map((cluster, id) => ({
    id,
    element: "C",
    point: cluster.center,
    source: "endpoint-cluster",
    confidence: Math.round(clamp(cluster.confidence - Math.min(18, distance(cluster.center, { x: imageWidth / 2, y: imageHeight / 2 }) / Math.max(imageWidth, imageHeight) * 12), 32, 82)),
    clusterId: cluster.id,
  }))
}
