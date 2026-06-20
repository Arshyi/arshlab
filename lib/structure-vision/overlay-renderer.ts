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
}

export const VISION_OVERLAY_COLORS = {
  endpoints: "#ef4444",
  nodes: "#22c55e",
  edges: "#3b82f6",
  cycles: "#facc15",
  selected: "#f97316",
  parallel: "#a855f7",
  aromatic: "#22d3ee",
  lineSegments: "#94a3b8",
  labels: "#ffffff",
} as const

interface OverlayRenderOptions {
  context: CanvasRenderingContext2D
  analysis: StructureVisionAnalysis
  visibility: VisionOverlayVisibility
  image?: CanvasImageSource | null
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
