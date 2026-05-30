import type { OrbitalFamily } from "../types"
import { generateAllOrbitals } from "./generators"
import { isValidOrbitalCombination } from "@/lib/orbitalMath"

export const ALL_ORBITALS = generateAllOrbitals()
export const DEFAULT_ORBITAL_ID = "2p_z"

export function getOrbitalById(id: string) {
  return ALL_ORBITALS.find((o) => o.id === id)
}

export function filterOrbitals(family: OrbitalFamily | "all", n: number | "all") {
  return ALL_ORBITALS.filter((o) => {
    if (family !== "all" && o.family !== family) return false
    if (n !== "all" && o.n !== n) return false
    return isValidOrbitalCombination(o.family, o.n)
  })
}

export function getAvailableNValues(family: OrbitalFamily | "all"): number[] {
  const filtered = family === "all" ? ALL_ORBITALS : ALL_ORBITALS.filter((o) => o.family === family)
  return [...new Set(filtered.map((o) => o.n))].sort((a, b) => a - b)
}

export { generateAllOrbitals }
export type { OrbitalRecord, OrbitalFamily } from "../types"
