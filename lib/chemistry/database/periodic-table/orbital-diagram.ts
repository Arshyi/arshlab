import type { OrbitalSubshellDiagram } from "../types"
import { getOrbitalOccupancy, ORBITAL_ORDER, SUBSHELL_BOX_COUNT } from "./electron-config"

/** Fill degenerate boxes following Hund's rule and Pauli exclusion (↑ before ↑↓). */
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

  for (const orbital of ORBITAL_ORDER) {
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
