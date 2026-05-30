/**
 * @deprecated Import from `@/lib/chemistry/database/orbitals` for new code.
 * Re-exports maintained for backward compatibility.
 */
export type { OrbitalRecord as OrbitalData, OrbitalFamily } from "@/lib/chemistry/database/types"
export {
  ALL_ORBITALS,
  DEFAULT_ORBITAL_ID,
  generateAllOrbitals as generateOrbitalList,
  getOrbitalById,
  filterOrbitals,
  getAvailableNValues,
} from "@/lib/chemistry/database/orbitals"

export {
  getAngularMomentum,
  getRadialNodes,
  getAngularNodes,
  getTotalNodes,
  isValidOrbitalCombination,
} from "@/lib/orbitalMath"
