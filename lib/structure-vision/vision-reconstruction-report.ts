import type {
  DarkPixelMask,
  VisionAtomLabel,
  VisionGraphAnalysis,
  VisionGraphEdge,
  VisionGraphNode,
  VisionLineSegment,
  VisionPoint,
} from "./vision-types"
import { associateBondsToAtoms } from "./bond-association"
import { repairBrokenStrokes } from "./broken-stroke-repair"
import { estimateAtomCenters } from "./atom-center-estimator"
import { clusterStrokeEndpoints } from "./endpoint-clustering"
import { filterCrossingBonds } from "./crossing-bond-filter"
import { detectJunctions } from "./junction-detector"
import { mergeLineSegments } from "./line-merging"
import { scorePrimitiveGraphConfidence } from "./primitive-confidence"
import { segmentStrokes } from "./stroke-segmentation"

export type AtomCenterSource = "atom-label" | "endpoint-cluster" | "text-inferred"
export type JunctionType = "endpoint" | "t-junction" | "x-crossing" | "branch"

export interface ReconstructedStroke extends VisionLineSegment {
  id: number
  sourceSegmentIndexes: number[]
  confidence: number
  merged: boolean
  repaired: boolean
  rejectionReason?: string
}

export interface EndpointCluster {
  id: number
  center: VisionPoint
  points: VisionPoint[]
  segmentIndexes: number[]
  radius: number
  confidence: number
}

export interface VisionJunction {
  id: number
  point: VisionPoint
  type: JunctionType
  segmentIndexes: number[]
  confidence: number
}

export interface AtomCenterEstimate {
  id: number
  element: VisionAtomLabel["label"] | "C"
  point: VisionPoint
  source: AtomCenterSource
  confidence: number
  clusterId?: number
  atomLabelId?: number
}

export interface PrimitiveBond {
  id: number
  startAtomId: number
  endAtomId: number
  length: number
  bondOrder: 1 | 2 | 3
  sourceStrokeIds: number[]
  confidence: number
  repaired: boolean
  rejected: boolean
  rejectionReason?: string
}

export interface PrimitiveConfidenceSummary {
  strokeConfidence: number
  junctionConfidence: number
  atomConfidence: number
  bondConfidence: number
  repairConfidence: number
  overallConfidence: number
  histogram: Array<{ label: string; count: number }>
}

export interface PrimitiveGraph {
  nodes: VisionGraphNode[]
  edges: VisionGraphEdge[]
  endpointTolerance: number
  averageLineLength: number
  mergedEndpointCount: number
  acceptedBonds: PrimitiveBond[]
  rejectedBonds: PrimitiveBond[]
}

export interface VisionReconstructionReport {
  rawStrokes: ReconstructedStroke[]
  mergedStrokes: ReconstructedStroke[]
  repairedStrokes: ReconstructedStroke[]
  junctions: VisionJunction[]
  endpointClusters: EndpointCluster[]
  atomCenters: AtomCenterEstimate[]
  acceptedBonds: PrimitiveBond[]
  rejectedBonds: PrimitiveBond[]
  repairedBonds: PrimitiveBond[]
  primitiveGraph: PrimitiveGraph
  confidence: PrimitiveConfidenceSummary
  explanation: string
}

function distance(left: VisionPoint, right: VisionPoint): number {
  return Math.hypot(left.x - right.x, left.y - right.y)
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length)
}

function graphFromBonds(
  atomCenters: AtomCenterEstimate[],
  acceptedBonds: PrimitiveBond[],
  endpointTolerance: number,
  averageLineLength: number,
): PrimitiveGraph {
  const nodes: VisionGraphNode[] = atomCenters.map((atom) => {
    const connectedBonds = acceptedBonds.filter((bond) => bond.startAtomId === atom.id || bond.endAtomId === atom.id)
    return {
      id: atom.id,
      point: atom.point,
      endpointCount: connectedBonds.length,
      mergeRadius: atom.source === "atom-label" ? endpointTolerance * 0.35 : endpointTolerance * 0.55,
      mergeQuality: atom.confidence,
    }
  })

  const edgeByKey = new Map<string, VisionGraphEdge>()
  acceptedBonds.forEach((bond) => {
    if (bond.startAtomId === bond.endAtomId) return
    const key = [bond.startAtomId, bond.endAtomId].sort((left, right) => left - right).join("-")
    const existing = edgeByKey.get(key)
    if (existing) {
      existing.sourceSegmentIndexes.push(...bond.sourceStrokeIds)
      existing.length = Math.max(existing.length, bond.length)
      return
    }
    edgeByKey.set(key, {
      id: edgeByKey.size,
      startNodeId: bond.startAtomId,
      endNodeId: bond.endAtomId,
      length: bond.length,
      sourceSegmentIndexes: [...bond.sourceStrokeIds],
    })
  })

  return {
    nodes,
    edges: Array.from(edgeByKey.values()).map((edge, id) => ({
      ...edge,
      id,
      sourceSegmentIndexes: Array.from(new Set(edge.sourceSegmentIndexes)),
    })),
    endpointTolerance,
    averageLineLength,
    mergedEndpointCount: Math.max(0, acceptedBonds.reduce((sum, bond) => sum + bond.sourceStrokeIds.length, 0) - nodes.length),
    acceptedBonds,
    rejectedBonds: [],
  }
}

function fallbackGraphFromClusters(
  endpointClusters: EndpointCluster[],
  strokes: ReconstructedStroke[],
  endpointTolerance: number,
  averageLineLength: number,
): PrimitiveGraph {
  const nodes: VisionGraphNode[] = endpointClusters.map((cluster) => ({
    id: cluster.id,
    point: cluster.center,
    endpointCount: cluster.points.length,
    mergeRadius: cluster.radius,
    mergeQuality: cluster.confidence,
  }))
  const edgeByKey = new Map<string, VisionGraphEdge>()
  strokes.forEach((stroke) => {
    const start = endpointClusters
      .map((cluster) => ({ cluster, distance: distance(cluster.center, stroke.start) }))
      .sort((left, right) => left.distance - right.distance)[0]
    const end = endpointClusters
      .map((cluster) => ({ cluster, distance: distance(cluster.center, stroke.end) }))
      .sort((left, right) => left.distance - right.distance)[0]
    if (!start || !end || start.cluster.id === end.cluster.id) return
    if (start.distance > endpointTolerance * 1.2 || end.distance > endpointTolerance * 1.2) return
    const key = [start.cluster.id, end.cluster.id].sort((left, right) => left - right).join("-")
    if (edgeByKey.has(key)) return
    edgeByKey.set(key, {
      id: edgeByKey.size,
      startNodeId: start.cluster.id,
      endNodeId: end.cluster.id,
      length: distance(start.cluster.center, end.cluster.center),
      sourceSegmentIndexes: [...stroke.sourceSegmentIndexes],
    })
  })
  return {
    nodes,
    edges: Array.from(edgeByKey.values()).map((edge, id) => ({ ...edge, id })),
    endpointTolerance,
    averageLineLength,
    mergedEndpointCount: Math.max(0, strokes.length * 2 - nodes.length),
    acceptedBonds: [],
    rejectedBonds: [],
  }
}

export function buildVisionReconstructionReport({
  mask,
  lineSegments,
  atomLabels,
  recognizedText,
}: {
  mask: DarkPixelMask
  lineSegments: VisionLineSegment[]
  atomLabels: VisionAtomLabel[]
  recognizedText: string
}): VisionReconstructionReport {
  const rawStrokes = segmentStrokes(mask, lineSegments)
  const mergedStrokes = mergeLineSegments(rawStrokes, mask)
  const repairedStrokes = repairBrokenStrokes(mergedStrokes, mask)
  const endpointClusters = clusterStrokeEndpoints(repairedStrokes, mask)
  const junctions = detectJunctions(repairedStrokes, endpointClusters, mask)
  const atomCenters = estimateAtomCenters({
    atomLabels,
    endpointClusters,
    strokes: repairedStrokes,
    recognizedText,
    imageWidth: mask.width,
    imageHeight: mask.height,
  })
  const associated = associateBondsToAtoms({
    atomCenters,
    strokes: repairedStrokes,
    junctions,
    endpointClusters,
    recognizedText,
    imageWidth: mask.width,
    imageHeight: mask.height,
  })
  const filtered = filterCrossingBonds(associated, atomCenters)
  const averageLineLength = Math.round(average(repairedStrokes.map((stroke) => stroke.length)) * 10) / 10
  const endpointTolerance = endpointClusters.length
    ? Math.round(average(endpointClusters.map((cluster) => Math.max(8, cluster.radius * 2.8))) * 10) / 10
    : Math.max(8, Math.min(mask.width, mask.height) * 0.08)
  const graph = filtered.accepted.length
    ? graphFromBonds(atomCenters, filtered.accepted, endpointTolerance, averageLineLength)
    : fallbackGraphFromClusters(endpointClusters, repairedStrokes, endpointTolerance, averageLineLength)
  const primitiveGraph = {
    ...graph,
    rejectedBonds: filtered.rejected,
  }
  const repairedBonds = filtered.accepted.filter((bond) => bond.repaired)
  const confidence = scorePrimitiveGraphConfidence({
    rawStrokes,
    mergedStrokes,
    repairedStrokes,
    junctions,
    atomCenters,
    acceptedBonds: filtered.accepted,
    rejectedBonds: filtered.rejected,
    repairedBonds,
  })

  return {
    rawStrokes,
    mergedStrokes,
    repairedStrokes,
    junctions,
    endpointClusters,
    atomCenters,
    acceptedBonds: filtered.accepted,
    rejectedBonds: filtered.rejected,
    repairedBonds,
    primitiveGraph,
    confidence,
    explanation: filtered.accepted.length
      ? `Vision reconstruction accepted ${filtered.accepted.length} primitive bond${filtered.accepted.length === 1 ? "" : "s"} from ${repairedStrokes.length} repaired stroke${repairedStrokes.length === 1 ? "" : "s"}.`
      : "Vision reconstruction fell back to endpoint-cluster graph construction because atom-to-bond association was weak.",
  }
}
