import type { IsolationBoundingBox } from "./isolation-types"
import type { SceneComponent, ScenePoint } from "./scene-graph"

export type ReactionArrowType = "forward" | "equilibrium" | "retrosynthesis" | "vertical" | "curved-mechanism"
export type ReactionArrowDirection = "right" | "left" | "up" | "down" | "curved" | "unknown"

export interface ReactionArrowCandidate {
  id: number
  bounds: IsolationBoundingBox
  type: ReactionArrowType
  direction: ReactionArrowDirection
  start: ScenePoint
  end: ScenePoint
  confidence: number
  componentIds: number[]
  reasons: string[]
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))
}

function center(bounds: IsolationBoundingBox): ScenePoint {
  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
}

function unionBounds(bounds: IsolationBoundingBox[]): IsolationBoundingBox {
  const minimumX = Math.min(...bounds.map((box) => box.x))
  const minimumY = Math.min(...bounds.map((box) => box.y))
  const maximumX = Math.max(...bounds.map((box) => box.x + box.width))
  const maximumY = Math.max(...bounds.map((box) => box.y + box.height))
  return { x: minimumX, y: minimumY, width: maximumX - minimumX, height: maximumY - minimumY }
}

function gap(left: IsolationBoundingBox, right: IsolationBoundingBox): number {
  const horizontal = Math.max(0, Math.max(left.x, right.x) - Math.min(left.x + left.width, right.x + right.width))
  const vertical = Math.max(0, Math.max(left.y, right.y) - Math.min(left.y + left.height, right.y + right.height))
  return Math.hypot(horizontal, vertical)
}

function arrowFromComponent(component: SceneComponent, width: number, height: number): ReactionArrowCandidate | null {
  const { bounds } = component
  const coverage = bounds.width * bounds.height / Math.max(1, width * height)
  const horizontal = bounds.width / Math.max(1, bounds.height)
  const vertical = bounds.height / Math.max(1, bounds.width)
  const longEnough = Math.max(bounds.width, bounds.height) >= Math.max(14, Math.min(width, height) * 0.075)
  if (!longEnough || coverage > 0.18 || component.density > 0.62) return null

  if (horizontal >= 3.2) {
    const confidence = Math.round(clamp(horizontal * 12 + component.density * 28 + Math.min(18, bounds.width / Math.max(1, width) * 85), 0, 92))
    return {
      id: component.id,
      bounds,
      type: "forward",
      direction: "right",
      start: { x: bounds.x, y: bounds.y + bounds.height / 2 },
      end: { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 },
      confidence,
      componentIds: [component.id],
      reasons: ["Long horizontal stroke with arrow-like aspect ratio"],
    }
  }

  if (vertical >= 3.2) {
    const confidence = Math.round(clamp(vertical * 12 + component.density * 28 + Math.min(18, bounds.height / Math.max(1, height) * 85), 0, 92))
    return {
      id: component.id,
      bounds,
      type: "vertical",
      direction: "down",
      start: { x: bounds.x + bounds.width / 2, y: bounds.y },
      end: { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height },
      confidence,
      componentIds: [component.id],
      reasons: ["Long vertical reaction-arrow-like stroke"],
    }
  }

  const squiggleLike = horizontal >= 1.35 && horizontal <= 3.1 && component.density < 0.35 && bounds.width > 18 && bounds.height > 8
  if (squiggleLike) {
    return {
      id: component.id,
      bounds,
      type: "curved-mechanism",
      direction: "curved",
      start: { x: bounds.x, y: bounds.y + bounds.height * 0.7 },
      end: { x: bounds.x + bounds.width, y: bounds.y + bounds.height * 0.3 },
      confidence: Math.round(clamp(48 + bounds.width / Math.max(1, width) * 45 - component.density * 20, 0, 76)),
      componentIds: [component.id],
      reasons: ["Curved or mechanism-arrow-like elongated stroke"],
    }
  }

  return null
}

export function detectReactionArrows(components: SceneComponent[], width: number, height: number): ReactionArrowCandidate[] {
  const candidates = components
    .filter((component) => !component.touchesBorder)
    .map((component) => arrowFromComponent(component, width, height))
    .filter((candidate): candidate is ReactionArrowCandidate => Boolean(candidate))

  const horizontal = candidates.filter((candidate) => candidate.direction === "right")
  for (let leftIndex = 0; leftIndex < horizontal.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < horizontal.length; rightIndex += 1) {
      const left = horizontal[leftIndex]
      const right = horizontal[rightIndex]
      const verticalDistance = Math.abs(center(left.bounds).y - center(right.bounds).y)
      const horizontalOverlap = Math.min(left.bounds.x + left.bounds.width, right.bounds.x + right.bounds.width) - Math.max(left.bounds.x, right.bounds.x)
      if (verticalDistance > Math.max(5, Math.min(left.bounds.height, right.bounds.height) * 2.5) || horizontalOverlap < Math.min(left.bounds.width, right.bounds.width) * 0.45) continue
      const bounds = unionBounds([left.bounds, right.bounds])
      candidates.push({
        id: 1000 + candidates.length,
        bounds,
        type: "equilibrium",
        direction: "right",
        start: { x: bounds.x, y: bounds.y + bounds.height / 2 },
        end: { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 },
        confidence: Math.round(clamp((left.confidence + right.confidence) / 2 + 12, 0, 96)),
        componentIds: [...left.componentIds, ...right.componentIds],
        reasons: ["Two nearly parallel horizontal arrow strokes indicate equilibrium/reversible reaction"],
      })
    }
  }

  return candidates
    .filter((candidate, index, array) => {
      if (candidate.type === "equilibrium") return true
      return !array.some((other) => other !== candidate && other.type === "equilibrium" && candidate.componentIds.every((id) => other.componentIds.includes(id)))
    })
    .filter((candidate) => candidate.confidence >= 34)
    .sort((left, right) => right.confidence - left.confidence || gap(left.bounds, right.bounds))
    .slice(0, 12)
    .map((candidate, id) => ({ ...candidate, id }))
}
