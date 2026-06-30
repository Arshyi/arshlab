import type { MolecularGraph } from "../vision/molecular-graph"
import type { StructureVisionAnalysis, VisionLineSegment } from "../structure-vision/vision-types"
import type { CompilerBox, VisualToken } from "./compiler-types"

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))
}

function boxFromLine(segment: VisionLineSegment, padding = 1): CompilerBox {
  const minX = Math.min(segment.start.x, segment.end.x)
  const minY = Math.min(segment.start.y, segment.end.y)
  const maxX = Math.max(segment.start.x, segment.end.x)
  const maxY = Math.max(segment.start.y, segment.end.y)
  return {
    x: Math.round(minX - padding),
    y: Math.round(minY - padding),
    width: Math.round(maxX - minX + padding * 2),
    height: Math.round(maxY - minY + padding * 2),
  }
}

function boxFromPoints(points: Array<{ x: number; y: number }>, padding = 2): CompilerBox {
  if (!points.length) return { x: 0, y: 0, width: 0, height: 0 }
  const minX = Math.min(...points.map((point) => point.x))
  const minY = Math.min(...points.map((point) => point.y))
  const maxX = Math.max(...points.map((point) => point.x))
  const maxY = Math.max(...points.map((point) => point.y))
  return {
    x: Math.round(minX - padding),
    y: Math.round(minY - padding),
    width: Math.round(maxX - minX + padding * 2),
    height: Math.round(maxY - minY + padding * 2),
  }
}

function graphTokens(graph: MolecularGraph): VisualToken[] {
  const tokens: VisualToken[] = []
  graph.nodes.forEach((node) => {
    const radius = Math.max(6, node.labelBounds ? Math.max(node.labelBounds.width, node.labelBounds.height) / 2 : 5)
    tokens.push({
      id: `graph-atom-${node.id}`,
      type: "atom-label",
      boundingBox: node.labelBounds ?? { x: node.x - radius, y: node.y - radius, width: radius * 2, height: radius * 2 },
      confidence: clamp(node.confidence),
      rotation: 0,
      length: radius * 2,
      width: radius * 2,
      orientation: 0,
      sourcePixels: node.snappedSegmentIndexes,
      text: node.inferredElement === "Unknown" ? undefined : node.inferredElement,
      metadata: { nodeId: node.id },
    })
  })
  graph.bonds.forEach((bond) => {
    const start = graph.nodes.find((node) => node.id === bond.startNodeId)
    const end = graph.nodes.find((node) => node.id === bond.endNodeId)
    if (!start || !end) return
    const length = Math.hypot(end.x - start.x, end.y - start.y)
    const orientation = (Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI + 180) % 180
    tokens.push({
      id: `graph-bond-${bond.id}`,
      type: bond.bondOrder === 3 ? "triple-line" : bond.bondOrder === 2 ? "double-line" : "line",
      boundingBox: boxFromPoints([start, end], 1),
      confidence: clamp(bond.confidence),
      rotation: orientation,
      length,
      width: Math.max(1, bond.bondOrder),
      orientation,
      sourcePixels: bond.sourceSegmentIndexes,
      metadata: {
        bondId: bond.id,
        startNodeId: bond.startNodeId,
        endNodeId: bond.endNodeId,
        recovered: bond.gapBridged,
      },
    })
  })
  graph.rings.forEach((ring) => {
    const points = ring.nodeIds
      .map((nodeId) => graph.nodes.find((node) => node.id === nodeId))
      .filter((node): node is (typeof graph.nodes)[number] => Boolean(node))
    if (!points.length) return
    tokens.push({
      id: `graph-ring-${ring.id}`,
      type: "circle",
      boundingBox: boxFromPoints(points, 3),
      confidence: clamp(ring.confidence),
      rotation: 0,
      length: ring.size,
      width: ring.size,
      orientation: 0,
      sourcePixels: [],
      metadata: { ringId: ring.id, aromatic: ring.aromatic, size: ring.size },
    })
  })
  return tokens
}

export function tokenizeVisualInput(analysis?: StructureVisionAnalysis | null, fallbackGraph?: MolecularGraph | null): VisualToken[] {
  const tokens: VisualToken[] = []
  analysis?.lineSegments.forEach((segment, index) => {
    tokens.push({
      id: `line-${index}`,
      type: "line",
      boundingBox: boxFromLine(segment),
      confidence: clamp(segment.strength),
      rotation: segment.angle,
      length: segment.length,
      width: 1,
      orientation: segment.angle,
      sourcePixels: [index],
    })
  })
  analysis?.parallelBondPairs.forEach((pair) => {
    const first = analysis.lineSegments[pair.firstSegmentIndex]
    const second = analysis.lineSegments[pair.secondSegmentIndex]
    const points = [first?.start, first?.end, second?.start, second?.end].filter((point): point is { x: number; y: number } => Boolean(point))
    tokens.push({
      id: `parallel-${pair.id}`,
      type: "double-line",
      boundingBox: boxFromPoints(points, 2),
      confidence: clamp(pair.overlap + Math.max(0, 22 - pair.separation)),
      rotation: pair.angle,
      length: pair.overlap,
      width: pair.separation,
      orientation: pair.angle,
      sourcePixels: [pair.firstSegmentIndex, pair.secondSegmentIndex],
      metadata: { pairId: pair.id },
    })
  })
  analysis?.atomLabels.forEach((label) => {
    tokens.push({
      id: `atom-label-${label.id}`,
      type: "atom-label",
      boundingBox: label.bounds,
      confidence: clamp(label.confidence),
      rotation: 0,
      length: Math.max(label.bounds.width, label.bounds.height),
      width: Math.min(label.bounds.width, label.bounds.height),
      orientation: 0,
      sourcePixels: [],
      text: label.label,
      metadata: { atomLabelId: label.id },
    })
  })
  analysis?.ringCandidates.forEach((ring, index) => {
    tokens.push({
      id: `ring-candidate-${index}`,
      type: "circle",
      boundingBox: {
        x: Math.round(ring.center.x - ring.width / 2),
        y: Math.round(ring.center.y - ring.height / 2),
        width: Math.round(ring.width),
        height: Math.round(ring.height),
      },
      confidence: clamp(ring.confidence),
      rotation: 0,
      length: ring.sidesEstimate,
      width: ring.sidesEstimate,
      orientation: 0,
      sourcePixels: ring.nodeIds,
      metadata: { sidesEstimate: ring.sidesEstimate, benzeneLike: ring.benzeneLike },
    })
  })
  const graph = analysis?.graphValidation?.selectedGraph ?? analysis?.molecularGraph ?? fallbackGraph
  tokens.push(...graphTokens(graph ?? {
    nodes: [],
    bonds: [],
    rings: [],
    aromatic: false,
    aromaticRingIds: [],
    estimates: { atoms: 0, carbons: 0, bonds: 0, rings: 0, singleBonds: 0, doubleBonds: 0, tripleBonds: 0, estimatedFormula: "Unavailable", confidence: 0 },
    warnings: [],
    atomCentered: false,
    snapRadius: 0,
  }))
  return tokens.sort((left, right) => left.id.localeCompare(right.id))
}
