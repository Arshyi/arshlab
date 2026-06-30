import type {
  ElectronPlacementStep,
  HybridOrbital,
  MolecularOrbitalLevel,
  SvgOrbitalPrimitive,
} from "./types"

export function orbitalLevelY(level: MolecularOrbitalLevel, minEnergy = 1, maxEnergy = 8) {
  const span = Math.max(1, maxEnergy - minEnergy)
  return Number((300 - ((level.energy - minEnergy) / span) * 240).toFixed(2))
}

export function buildOrbitalLevelPrimitives(levels: MolecularOrbitalLevel[]): SvgOrbitalPrimitive[] {
  const maxEnergy = Math.max(...levels.map((level) => level.energy))
  const minEnergy = Math.min(...levels.map((level) => level.energy))

  return levels.flatMap((level) => {
    const y = orbitalLevelY(level, minEnergy, maxEnergy)
    const boxGap = 18
    const startX = 210 - ((level.degeneracy - 1) * boxGap) / 2

    const boxes = Array.from({ length: level.degeneracy }, (_, index) => ({
      id: `${level.id}-box-${index}`,
      type: "line" as const,
      x: startX + index * boxGap,
      y,
      width: 28,
      height: 0,
      label: level.label,
      color: level.antibonding ? "#dc2626" : "#0f766e",
      opacity: 1,
    }))

    return [
      ...boxes,
      {
        id: `${level.id}-label`,
        type: "text" as const,
        x: 260,
        y: y + 4,
        label: level.label,
        color: "#0f172a",
        opacity: 1,
      },
    ]
  })
}

export function electronCoordinateForStep(
  step: ElectronPlacementStep,
  levels: MolecularOrbitalLevel[],
  placedBeforeSameOrbital: number,
) {
  const level = levels.find((item) => item.id === step.orbitalId)
  if (!level) return { x: 210, y: 260 }

  const maxEnergy = Math.max(...levels.map((item) => item.energy))
  const minEnergy = Math.min(...levels.map((item) => item.energy))
  const y = orbitalLevelY(level, minEnergy, maxEnergy)
  const cellIndex = level.degeneracy === 1 ? 0 : placedBeforeSameOrbital % level.degeneracy
  const pairOffset = placedBeforeSameOrbital >= level.degeneracy ? 6 : -6
  const startX = 210 - ((level.degeneracy - 1) * 18) / 2

  return {
    x: Number((startX + cellIndex * 18 + pairOffset).toFixed(2)),
    y: Number((y - 10).toFixed(2)),
  }
}

export function buildHybridOrbitalPrimitives(orbitals: HybridOrbital[]): SvgOrbitalPrimitive[] {
  return orbitals.map((orbital) => ({
    id: orbital.id,
    type: "ellipse",
    x: Number((180 + orbital.x * 86).toFixed(2)),
    y: Number((150 - orbital.y * 62 - orbital.z * 12).toFixed(2)),
    width: orbital.occupancy === "lone-pair" ? 62 : 82,
    height: orbital.occupancy === "lone-pair" ? 26 : 34,
    angle: -orbital.angle,
    label: orbital.label,
    color:
      orbital.occupancy === "lone-pair"
        ? "#f59e0b"
        : orbital.occupancy === "empty"
          ? "#64748b"
          : "#14b8a6",
    opacity: orbital.occupancy === "empty" ? 0.36 : 0.7,
  }))
}

export function lobePath(cx: number, cy: number, angle: number, length = 64, width = 26) {
  const radians = (angle * Math.PI) / 180
  const dx = Math.cos(radians) * length
  const dy = Math.sin(radians) * length
  const wx = Math.cos(radians + Math.PI / 2) * width
  const wy = Math.sin(radians + Math.PI / 2) * width
  const x1 = Number((cx + wx).toFixed(2))
  const y1 = Number((cy + wy).toFixed(2))
  const x2 = Number((cx + dx).toFixed(2))
  const y2 = Number((cy + dy).toFixed(2))
  const x3 = Number((cx - wx).toFixed(2))
  const y3 = Number((cy - wy).toFixed(2))

  return `M ${x1} ${y1} Q ${x2} ${y2} ${x3} ${y3} Q ${cx} ${cy} ${x1} ${y1} Z`
}

export function sigmaPiOverlapPrimitives(mode: "sigma" | "pi", rotationDegrees: number): SvgOrbitalPrimitive[] {
  const tilt = Math.sin((rotationDegrees * Math.PI) / 180)
  if (mode === "sigma") {
    return [
      { id: "sigma-left", type: "ellipse", x: 145, y: 120 + tilt * 8, width: 92, height: 42, angle: 0, color: "#14b8a6", opacity: 0.7 },
      { id: "sigma-right", type: "ellipse", x: 235, y: 120 - tilt * 8, width: 92, height: 42, angle: 0, color: "#22d3ee", opacity: 0.7 },
      { id: "sigma-density", type: "ellipse", x: 190, y: 120, width: 54, height: 32, angle: 0, color: "#f59e0b", opacity: 0.55 },
    ]
  }

  return [
    { id: "pi-left-top", type: "ellipse", x: 155, y: 86 + tilt * 12, width: 52, height: 72, angle: 90, color: "#14b8a6", opacity: 0.62 },
    { id: "pi-left-bottom", type: "ellipse", x: 155, y: 156 - tilt * 12, width: 52, height: 72, angle: 90, color: "#14b8a6", opacity: 0.62 },
    { id: "pi-right-top", type: "ellipse", x: 225, y: 86 - tilt * 12, width: 52, height: 72, angle: 90, color: "#22d3ee", opacity: 0.62 },
    { id: "pi-right-bottom", type: "ellipse", x: 225, y: 156 + tilt * 12, width: 52, height: 72, angle: 90, color: "#22d3ee", opacity: 0.62 },
    { id: "pi-node", type: "line", x: 118, y: 121, width: 145, height: 0, color: "#ef4444", opacity: 0.85 },
  ]
}
