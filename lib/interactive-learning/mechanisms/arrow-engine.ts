import type { CurvedArrow, MechanismPoint } from "./types"

export interface CurvedArrowPrimitive {
  id: string
  path: string
  headPath: string
  labelX: number
  labelY: number
  label: string
  explanation: string
  color: string
}

function pointOnQuadratic(from: MechanismPoint, control: MechanismPoint, to: MechanismPoint, t: number): MechanismPoint {
  const oneMinus = 1 - t
  return {
    x: oneMinus * oneMinus * from.x + 2 * oneMinus * t * control.x + t * t * to.x,
    y: oneMinus * oneMinus * from.y + 2 * oneMinus * t * control.y + t * t * to.y,
  }
}

function tangentOnQuadratic(from: MechanismPoint, control: MechanismPoint, to: MechanismPoint, t: number): MechanismPoint {
  return {
    x: 2 * (1 - t) * (control.x - from.x) + 2 * t * (to.x - control.x),
    y: 2 * (1 - t) * (control.y - from.y) + 2 * t * (to.y - control.y),
  }
}

function arrowHead(to: MechanismPoint, tangent: MechanismPoint) {
  const length = Math.max(1, Math.hypot(tangent.x, tangent.y))
  const ux = tangent.x / length
  const uy = tangent.y / length
  const left = {
    x: to.x - ux * 13 - uy * 6,
    y: to.y - uy * 13 + ux * 6,
  }
  const right = {
    x: to.x - ux * 13 + uy * 6,
    y: to.y - uy * 13 - ux * 6,
  }
  return `M ${to.x.toFixed(1)} ${to.y.toFixed(1)} L ${left.x.toFixed(1)} ${left.y.toFixed(1)} L ${right.x.toFixed(1)} ${right.y.toFixed(1)} Z`
}

function arrowColor(kind: CurvedArrow["kind"]) {
  if (kind === "bond-breaking") return "#ef4444"
  if (kind === "bond-formation" || kind === "lone-pair-donation") return "#14b8a6"
  if (kind === "pi-bond-movement" || kind === "resonance-movement") return "#f97316"
  return "#8b5cf6"
}

export function buildCurvedArrowPrimitive(arrow: CurvedArrow, progress = 1): CurvedArrowPrimitive {
  const clamped = Math.max(0.05, Math.min(1, progress))
  const end = pointOnQuadratic(arrow.from, arrow.control, arrow.to, clamped)
  const tangent = tangentOnQuadratic(arrow.from, arrow.control, arrow.to, clamped)
  const mid = pointOnQuadratic(arrow.from, arrow.control, arrow.to, 0.52)
  return {
    id: arrow.id,
    path: `M ${arrow.from.x.toFixed(1)} ${arrow.from.y.toFixed(1)} Q ${arrow.control.x.toFixed(1)} ${arrow.control.y.toFixed(1)} ${end.x.toFixed(1)} ${end.y.toFixed(1)}`,
    headPath: arrowHead(end, tangent),
    labelX: mid.x,
    labelY: mid.y - 10,
    label: arrow.electronCount === 1 ? "1e-" : "2e-",
    explanation: arrow.explanation,
    color: arrowColor(arrow.kind),
  }
}

export function buildCurvedArrowPrimitives(arrows: CurvedArrow[], progress = 1) {
  return arrows.map((arrow) => buildCurvedArrowPrimitive(arrow, progress))
}

export function describeArrowMotion(arrow: CurvedArrow) {
  return `${arrow.electronCount} electron${arrow.electronCount === 1 ? "" : "s"} move from ${arrow.origin} to ${arrow.destination}.`
}
