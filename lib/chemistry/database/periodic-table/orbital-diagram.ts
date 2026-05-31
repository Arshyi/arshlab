import type { OrbitalSubshellDiagram } from "../types"
import { getOrbitalOccupancy } from "./electron-config"

const SUBSHELL_BOX_COUNT: Record<string, number> = {
  s: 1,
  p: 3,
  d: 5,
  f: 7,
}

const ORBITAL_DISPLAY_ORDER = [
  "1s", "2s", "2p", "3s", "3p", "4s", "3d", "4p", "5s", "4d", "5p",
  "6s", "4f", "5d", "6p", "7s", "5f", "6d", "7p",
]

/** Fill degenerate boxes following Hund's rule and Pauli exclusion (↑ before ↑↓) */
function fillBoxes(electronCount: number, boxCount: number): string[] {
  const boxes = Array<string>(boxCount).fill("")
  let remaining = electronCount

  for (let i = 0; i < boxCount && remaining > 0; i++) {
    boxes[i] = "↑"
    remaining--
  }

  for (let i = 0; i < boxCount && remaining > 0; i++) {
    if (boxes[i] === "↑") {
      boxes[i] = "↑↓"
      remaining--
    }
  }

  return boxes
}

export function buildOrbitalBoxDiagram(z: number): OrbitalSubshellDiagram[] {
  const occupancy = getOrbitalOccupancy(z)
  const diagram: OrbitalSubshellDiagram[] = []

  for (const orbital of ORBITAL_DISPLAY_ORDER) {
    const count = occupancy.get(orbital)
    if (!count || count <= 0) continue
    const type = orbital.slice(-1)
    const boxCount = SUBSHELL_BOX_COUNT[type] ?? 1
    diagram.push({
      label: orbital,
      boxes: fillBoxes(count, boxCount),
    })
  }

  return diagram
}
