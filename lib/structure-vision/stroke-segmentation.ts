import type { DarkPixelMask, VisionLineSegment } from "./vision-types"
import type { ReconstructedStroke } from "./vision-reconstruction-report"

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))
}

export function segmentStrokes(mask: DarkPixelMask, lineSegments: VisionLineSegment[]): ReconstructedStroke[] {
  const expectedLength = Math.max(8, Math.min(mask.width, mask.height) * 0.08)
  return lineSegments.map((segment, id) => {
    const lengthScore = clamp((segment.length / Math.max(1, expectedLength)) * 42, 12, 42)
    const strengthScore = clamp((segment.strength / Math.max(1, segment.length)) * 32, 8, 32)
    const borderPenalty =
      segment.start.x <= 1 || segment.start.y <= 1 || segment.end.x <= 1 || segment.end.y <= 1 ||
      segment.start.x >= mask.width - 2 || segment.end.x >= mask.width - 2 ||
      segment.start.y >= mask.height - 2 || segment.end.y >= mask.height - 2
        ? 12
        : 0
    return {
      ...segment,
      id,
      sourceSegmentIndexes: [id],
      confidence: Math.round(clamp(28 + lengthScore + strengthScore - borderPenalty, 8, 96)),
      merged: false,
      repaired: false,
      rejectionReason: borderPenalty ? "Touches image border; treated as weaker stroke evidence." : undefined,
    }
  })
}
