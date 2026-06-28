import type {
  StructureVisionAnalysis,
  VisionLineSegment,
  VisionPoint,
  VisionRingCandidate,
} from "./vision-types"

export interface VisionOverlayVisibility {
  rawImage: boolean
  lineSegments: boolean
  endpoints: boolean
  graphNodes: boolean
  graphEdges: boolean
  cycles: boolean
  nearRings: boolean
  selectedRing: boolean
  parallelBonds: boolean
  aromaticCues: boolean
  functionalGroupCues: boolean
  snappedEndpoints: boolean
  bridgedGaps: boolean
  selectedClosureRing: boolean
  rejectedClosureRings: boolean
  atomLabelCentroids: boolean
  rejectedValidatedBonds: boolean
  acceptedValidatedBonds: boolean
  valenceViolations: boolean
  bondOrderCorrections: boolean
  validatedRingCandidate: boolean
}

export const DEFAULT_VISION_OVERLAYS: VisionOverlayVisibility = {
  rawImage: true,
  lineSegments: true,
  endpoints: false,
  graphNodes: true,
  graphEdges: true,
  cycles: true,
  nearRings: true,
  selectedRing: true,
  parallelBonds: true,
  aromaticCues: true,
  functionalGroupCues: false,
  snappedEndpoints: false,
  bridgedGaps: true,
  selectedClosureRing: true,
  rejectedClosureRings: false,
  atomLabelCentroids: true,
  rejectedValidatedBonds: true,
  acceptedValidatedBonds: false,
  valenceViolations: true,
  bondOrderCorrections: true,
  validatedRingCandidate: true,
}

export const VISION_OVERLAY_COLORS = {
  endpoints: "#ef4444",
  nodes: "#22c55e",
  edges: "#3b82f6",
  cycles: "#facc15",
  selected: "#f97316",
  parallel: "#a855f7",
  aromatic: "#22d3ee",
  closureBridge: "#f59e0b",
  rejectedRing: "#fbbf24",
  lineSegments: "#94a3b8",
  rejectedBond: "#ef4444",
  acceptedBond: "#10b981",
  valence: "#fb7185",
  correction: "#f97316",
  validatedRing: "#34d399",
  labels: "#ffffff",
} as const

interface OverlayRenderOptions {
  context: CanvasRenderingContext2D
  analysis: StructureVisionAnalysis
  visibility: VisionOverlayVisibility
  image?: CanvasImageSource | null
}

function drawPoint(
  context: CanvasRenderingContext2D,
  point: VisionPoint,
  color: string,
  scaleX: number,
  scaleY: number,
  radius: number,
) {
  context.beginPath()
  context.arc(point.x * scaleX, point.y * scaleY, radius * Math.max(scaleX, scaleY), 0, Math.PI * 2)
  context.fillStyle = color
  context.fill()
}

function drawLabel(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  scale: number,
) {
  const fontSize = Math.max(10, 3.2 * scale)
  context.save()
  context.font = `600 ${fontSize}px ui-monospace, SFMono-Regular, Menlo, monospace`
  const metrics = context.measureText(text)
  const padding = Math.max(3, scale)
  context.fillStyle = "rgba(15, 23, 42, 0.86)"
  context.fillRect(x - padding, y - fontSize, metrics.width + padding * 2, fontSize + padding * 1.5)
  context.fillStyle = VISION_OVERLAY_COLORS.labels
  context.fillText(text, x, y)
  context.restore()
}

function drawSegment(
  context: CanvasRenderingContext2D,
  segment: VisionLineSegment,
  color: string,
  scaleX: number,
  scaleY: number,
  width = 1.5,
) {
  context.beginPath()
  context.moveTo(segment.start.x * scaleX, segment.start.y * scaleY)
  context.lineTo(segment.end.x * scaleX, segment.end.y * scaleY)
  context.strokeStyle = color
  context.lineWidth = width * Math.max(scaleX, scaleY)
  context.stroke()
}

function ringPoints(analysis: StructureVisionAnalysis, ring: VisionRingCandidate): VisionPoint[] {
  return ring.nodeIds
    .map((nodeId) => analysis.graph.nodes.find((node) => node.id === nodeId)?.point)
    .filter((point): point is VisionPoint => Boolean(point))
}

function drawRing(
  context: CanvasRenderingContext2D,
  analysis: StructureVisionAnalysis,
  ring: VisionRingCandidate,
  color: string,
  scaleX: number,
  scaleY: number,
  dashed: boolean,
  width: number,
) {
  const points = ringPoints(analysis, ring)
  context.save()
  context.strokeStyle = color
  context.fillStyle = `${color}22`
  context.lineWidth = width * Math.max(scaleX, scaleY)
  context.setLineDash(dashed ? [5 * scaleX, 4 * scaleX] : [])
  context.beginPath()
  if (points.length >= 3) {
    context.moveTo(points[0].x * scaleX, points[0].y * scaleY)
    points.slice(1).forEach((point) => context.lineTo(point.x * scaleX, point.y * scaleY))
    context.closePath()
  } else {
    context.ellipse(
      ring.center.x * scaleX,
      ring.center.y * scaleY,
      Math.max(4, ring.width * scaleX * 0.55),
      Math.max(4, ring.height * scaleY * 0.55),
      0,
      0,
      Math.PI * 2,
    )
  }
  context.fill()
  context.stroke()
  context.restore()
}

function drawClosurePolygon(
  context: CanvasRenderingContext2D,
  points: VisionPoint[],
  color: string,
  scaleX: number,
  scaleY: number,
  dashed: boolean,
  width: number,
) {
  if (points.length < 3) return
  context.save()
  context.strokeStyle = color
  context.fillStyle = `${color}1f`
  context.lineWidth = width * Math.max(scaleX, scaleY)
  context.setLineDash(dashed ? [5 * scaleX, 4 * scaleX] : [])
  context.beginPath()
  context.moveTo(points[0].x * scaleX, points[0].y * scaleY)
  points.slice(1).forEach((point) => context.lineTo(point.x * scaleX, point.y * scaleY))
  context.closePath()
  context.fill()
  context.stroke()
  context.restore()
}

export function renderVisionOverlay({ context, analysis, visibility, image }: OverlayRenderOptions) {
  const canvas = context.canvas
  const scaleX = canvas.width / analysis.width
  const scaleY = canvas.height / analysis.height
  const scale = Math.max(scaleX, scaleY)
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = "#111827"
  context.fillRect(0, 0, canvas.width, canvas.height)

  if (visibility.rawImage && image) {
    context.save()
    context.globalAlpha = 0.82
    context.drawImage(image, 0, 0, canvas.width, canvas.height)
    context.restore()
  }

  if (visibility.lineSegments) {
    analysis.lineSegments.forEach((segment) => {
      drawSegment(context, segment, VISION_OVERLAY_COLORS.lineSegments, scaleX, scaleY, 0.75)
    })
  }

  if (visibility.graphEdges) {
    analysis.graph.edges.forEach((edge) => {
      const start = analysis.graph.nodes.find((node) => node.id === edge.startNodeId)
      const end = analysis.graph.nodes.find((node) => node.id === edge.endNodeId)
      if (!start || !end) return
      const segment: VisionLineSegment = {
        start: start.point,
        end: end.point,
        midpoint: { x: (start.point.x + end.point.x) / 2, y: (start.point.y + end.point.y) / 2 },
        length: edge.length,
        angle: 0,
        strength: 1,
      }
      drawSegment(context, segment, VISION_OVERLAY_COLORS.edges, scaleX, scaleY, 1.25)
      drawLabel(
        context,
        `E${edge.id} ${edge.startNodeId}-${edge.endNodeId} ${edge.length.toFixed(1)}`,
        segment.midpoint.x * scaleX,
        segment.midpoint.y * scaleY,
        scale,
      )
    })
  }

  if (visibility.acceptedValidatedBonds) {
    analysis.chemicalGraphValidation.acceptedBonds.forEach((bond) => {
      drawSegment(context, {
        start: bond.start,
        end: bond.end,
        midpoint: { x: (bond.start.x + bond.end.x) / 2, y: (bond.start.y + bond.end.y) / 2 },
        length: bond.length,
        angle: 0,
        strength: bond.confidence,
      }, VISION_OVERLAY_COLORS.acceptedBond, scaleX, scaleY, 1.8)
      drawLabel(context, `V${bond.id} o${bond.bondOrder}`, ((bond.start.x + bond.end.x) / 2) * scaleX, ((bond.start.y + bond.end.y) / 2) * scaleY, scale)
    })
  }

  if (visibility.rejectedValidatedBonds) {
    analysis.chemicalGraphValidation.rejectedBonds.forEach((bond) => {
      drawSegment(context, {
        start: bond.start,
        end: bond.end,
        midpoint: { x: (bond.start.x + bond.end.x) / 2, y: (bond.start.y + bond.end.y) / 2 },
        length: bond.length,
        angle: 0,
        strength: 1,
      }, VISION_OVERLAY_COLORS.rejectedBond, scaleX, scaleY, 2.2)
      drawLabel(context, `X${bond.id} ${bond.kind}`, ((bond.start.x + bond.end.x) / 2) * scaleX, ((bond.start.y + bond.end.y) / 2) * scaleY, scale)
    })
  }

  if (visibility.bondOrderCorrections) {
    analysis.chemicalGraphValidation.correctedBondOrders.forEach((correction) => {
      drawSegment(context, {
        start: correction.start,
        end: correction.end,
        midpoint: { x: (correction.start.x + correction.end.x) / 2, y: (correction.start.y + correction.end.y) / 2 },
        length: Math.hypot(correction.end.x - correction.start.x, correction.end.y - correction.start.y),
        angle: 0,
        strength: 1,
      }, VISION_OVERLAY_COLORS.correction, scaleX, scaleY, 2.6)
      drawLabel(
        context,
        `${correction.fromOrder}->${correction.toOrder}`,
        ((correction.start.x + correction.end.x) / 2) * scaleX,
        ((correction.start.y + correction.end.y) / 2) * scaleY,
        scale,
      )
    })
  }

  if (visibility.valenceViolations) {
    analysis.chemicalGraphValidation.valenceSummaries.filter((summary) => !summary.valid || summary.fixes.length).forEach((summary) => {
      const node = analysis.molecularGraph.nodes.find((candidate) => candidate.id === summary.nodeId)
      if (!node) return
      drawPoint(context, { x: node.x, y: node.y }, VISION_OVERLAY_COLORS.valence, scaleX, scaleY, 3.2)
      drawLabel(context, `${summary.element} ${summary.observedValence}/${summary.maxValence}`, node.x * scaleX + 5 * scale, node.y * scaleY + 5 * scale, scale)
    })
  }

  if (visibility.validatedRingCandidate && analysis.chemicalGraphValidation.selectedValidatedRing) {
    const points = analysis.chemicalGraphValidation.selectedValidatedRing.nodeIds
      .map((nodeId) => analysis.molecularGraph.nodes.find((node) => node.id === nodeId))
      .filter((node): node is (typeof analysis.molecularGraph.nodes)[number] => Boolean(node))
      .map((node) => ({ x: node.x, y: node.y }))
    if (points.length >= 3) {
      drawClosurePolygon(context, points, VISION_OVERLAY_COLORS.validatedRing, scaleX, scaleY, false, 3.2)
      const center = {
        x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
        y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
      }
      drawLabel(context, `Validated ${analysis.chemicalGraphValidation.selectedValidatedRing.size}m`, center.x * scaleX, center.y * scaleY, scale)
    }
  }

  if (visibility.cycles) {
    analysis.graph.cycleCandidates.forEach((ring, index) => {
      drawRing(context, analysis, ring, VISION_OVERLAY_COLORS.cycles, scaleX, scaleY, false, 1.5)
      drawLabel(context, `C${index + 1} ${ring.sidesEstimate}m ${ring.confidence}%`, ring.center.x * scaleX, ring.center.y * scaleY, scale)
    })
  }

  if (visibility.nearRings) {
    analysis.graph.nearRingCandidates.forEach((ring, index) => {
      drawRing(context, analysis, ring, VISION_OVERLAY_COLORS.cycles, scaleX, scaleY, true, 1.25)
      drawLabel(context, `N${index + 1} ${ring.sidesEstimate}m ${ring.confidence}%`, ring.center.x * scaleX, ring.center.y * scaleY, scale)
    })
  }

  if (visibility.parallelBonds) {
    analysis.parallelBondPairs.forEach((pair) => {
      const first = analysis.lineSegments[pair.firstSegmentIndex]
      const second = analysis.lineSegments[pair.secondSegmentIndex]
      if (!first || !second) return
      drawSegment(context, first, VISION_OVERLAY_COLORS.parallel, scaleX, scaleY, 1.75)
      drawSegment(context, second, VISION_OVERLAY_COLORS.parallel, scaleX, scaleY, 1.75)
      drawLabel(context, `P${pair.id + 1}`, pair.center.x * scaleX, pair.center.y * scaleY, scale)
    })
  }

  if (visibility.atomLabelCentroids) {
    analysis.atomLabels.forEach((label) => {
      drawPoint(context, label.centroid, VISION_OVERLAY_COLORS.aromatic, scaleX, scaleY, 2.1)
      drawLabel(context, `${label.label}${label.id}`, label.centroid.x * scaleX + 4 * scale, label.centroid.y * scaleY - 4 * scale, scale)
    })
  }

  if (visibility.snappedEndpoints) {
    analysis.ringClosure.snapEvents.filter((event) => event.accepted).forEach((event) => {
      const segment = analysis.lineSegments[event.segmentIndex]
      const node = analysis.ringClosure.candidates.flatMap((candidate) => candidate.points)[event.nodeId]
      const endpoint = segment?.[event.endpoint]
      const atomPoint = analysis.atomLabels.find((label) => label.id === event.atomLabelId)?.centroid ?? node
      if (!endpoint || !atomPoint) return
      drawSegment(context, {
        start: endpoint,
        end: atomPoint,
        midpoint: { x: (endpoint.x + atomPoint.x) / 2, y: (endpoint.y + atomPoint.y) / 2 },
        length: event.distance,
        angle: 0,
        strength: 1,
      }, VISION_OVERLAY_COLORS.endpoints, scaleX, scaleY, 0.9)
    })
  }

  if (visibility.endpoints) {
    context.fillStyle = VISION_OVERLAY_COLORS.endpoints
    analysis.lineSegments.forEach((segment, index) => {
      for (const [suffix, point] of [["a", segment.start], ["b", segment.end]] as const) {
        context.beginPath()
        context.arc(point.x * scaleX, point.y * scaleY, Math.max(3, scale * 1.25), 0, Math.PI * 2)
        context.fill()
        drawLabel(context, `${index}${suffix}`, point.x * scaleX + 3 * scale, point.y * scaleY - 2 * scale, scale)
      }
    })
  }

  if (visibility.graphNodes) {
    analysis.graph.nodes.forEach((node) => {
      const degree = analysis.graph.edges.filter((edge) => edge.startNodeId === node.id || edge.endNodeId === node.id).length
      context.beginPath()
      context.arc(node.point.x * scaleX, node.point.y * scaleY, Math.max(4, scale * 1.6), 0, Math.PI * 2)
      context.fillStyle = VISION_OVERLAY_COLORS.nodes
      context.fill()
      context.strokeStyle = "#052e16"
      context.lineWidth = Math.max(1, scale * 0.5)
      context.stroke()
      drawLabel(
        context,
        `N${node.id} d${degree} (${node.point.x.toFixed(0)},${node.point.y.toFixed(0)})`,
        node.point.x * scaleX + 4 * scale,
        node.point.y * scaleY - 3 * scale,
        scale,
      )
    })
  }

  const selectedRing = analysis.ringCandidates[0]
  const selectedClosure = analysis.ringClosure.candidates.find((candidate) => candidate.selected)
  if (visibility.rejectedClosureRings) {
    analysis.ringClosure.candidates.filter((candidate) => !candidate.selected).slice(0, 5).forEach((candidate, index) => {
      drawClosurePolygon(context, candidate.points, VISION_OVERLAY_COLORS.rejectedRing, scaleX, scaleY, true, 1.15)
      drawLabel(context, `R${index + 1} ${candidate.memberCount}m ${candidate.confidence}%`, candidate.center.x * scaleX, candidate.center.y * scaleY, scale)
    })
  }

  if (visibility.bridgedGaps) {
    analysis.ringClosure.candidates.flatMap((candidate) => candidate.closureGaps).forEach((gap, index) => {
      const candidate = analysis.ringClosure.candidates.find((item) =>
        item.nodeIds.includes(gap.fromNodeId) && item.nodeIds.includes(gap.toNodeId),
      )
      const fromIndex = candidate?.nodeIds.indexOf(gap.fromNodeId) ?? -1
      const toIndex = candidate?.nodeIds.indexOf(gap.toNodeId) ?? -1
      const from = fromIndex >= 0 ? candidate?.points[fromIndex] : undefined
      const to = toIndex >= 0 ? candidate?.points[toIndex] : undefined
      if (!from || !to) return
      drawSegment(context, {
        start: from,
        end: to,
        midpoint: { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 },
        length: gap.gapLength,
        angle: 0,
        strength: 1,
      }, VISION_OVERLAY_COLORS.closureBridge, scaleX, scaleY, 2)
      drawLabel(context, `B${index + 1} ${gap.confidence}%`, ((from.x + to.x) / 2) * scaleX, ((from.y + to.y) / 2) * scaleY, scale)
    })
  }

  if (visibility.selectedClosureRing && selectedClosure) {
    drawClosurePolygon(context, selectedClosure.points, VISION_OVERLAY_COLORS.selected, scaleX, scaleY, false, 3)
    drawLabel(
      context,
      `Ring closure ${selectedClosure.memberCount}m ${selectedClosure.confidence}%`,
      selectedClosure.center.x * scaleX,
      (selectedClosure.center.y + selectedClosure.height * 0.72) * scaleY,
      scale,
    )
  }

  if (visibility.aromaticCues && selectedRing && (analysis.graph.aromaticCueScore > 0 || selectedRing.benzeneLike)) {
    drawRing(context, analysis, selectedRing, VISION_OVERLAY_COLORS.aromatic, scaleX, scaleY, true, 2.3)
    drawLabel(
      context,
      `Aromatic ${analysis.graph.aromaticCueScore}%`,
      selectedRing.center.x * scaleX,
      (selectedRing.center.y - selectedRing.height * 0.6) * scaleY,
      scale,
    )
  }

  if (visibility.selectedRing && selectedRing) {
    drawRing(context, analysis, selectedRing, VISION_OVERLAY_COLORS.selected, scaleX, scaleY, false, 2.6)
    drawLabel(
      context,
      `Selected ${selectedRing.sidesEstimate}m ${selectedRing.confidence}%`,
      selectedRing.center.x * scaleX,
      (selectedRing.center.y + selectedRing.height * 0.62) * scaleY,
      scale,
    )
  }

  if (visibility.functionalGroupCues && analysis.functionalGroupCues.length) {
    let y = canvas.height - Math.max(12, 4 * scale)
    analysis.functionalGroupCues.slice(0, 5).reverse().forEach((cue) => {
      drawLabel(context, `${cue.label} ${cue.confidence}%`, Math.max(6, 2 * scale), y, scale)
      y -= Math.max(16, 5 * scale)
    })
  }
}
