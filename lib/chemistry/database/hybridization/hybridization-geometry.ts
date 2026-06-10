import type {
  HybridizationGeometry,
  HybridizationMode,
  HybridOrbitalDirection,
  OverlapRegime,
} from "./hybridization-types"

function normalize(vector: [number, number, number]): [number, number, number] {
  const length = Math.hypot(vector[0], vector[1], vector[2]) || 1
  return [vector[0] / length, vector[1] / length, vector[2] / length]
}

function direction(
  id: string,
  label: string,
  vector: [number, number, number],
  role: HybridOrbitalDirection["role"] = "available",
): HybridOrbitalDirection {
  return { id, label, vector: normalize(vector), role }
}

const sqrt3 = Math.sqrt(3)

const GEOMETRIES: Record<HybridizationMode, HybridizationGeometry> = {
  unhybridized: {
    mode: "unhybridized",
    hybridOrbitalCount: 0,
    electronDomains: 0,
    electronGeometry: "Separate s and p orbitals",
    idealBondAngles: "p orbitals are perpendicular",
    directions: [
      direction("px-positive", "p_x +", [1, 0, 0]),
      direction("px-negative", "p_x -", [-1, 0, 0]),
      direction("py-positive", "p_y +", [0, 1, 0]),
      direction("py-negative", "p_y -", [0, -1, 0]),
      direction("pz-positive", "p_z +", [0, 0, 1]),
      direction("pz-negative", "p_z -", [0, 0, -1]),
    ],
    unhybridizedPOrbitals: 3,
    explanation:
      "Unhybridized s and p orbitals keep their original shapes. p orbitals can form pi overlap when they remain parallel.",
  },
  sp: {
    mode: "sp",
    hybridOrbitalCount: 2,
    electronDomains: 2,
    electronGeometry: "Linear",
    idealBondAngles: "180 deg",
    directions: [
      direction("linear-left", "sp", [-1, 0, 0]),
      direction("linear-right", "sp", [1, 0, 0]),
    ],
    unhybridizedPOrbitals: 2,
    explanation:
      "One s orbital mixes with one p orbital to make two sp hybrid orbitals arranged linearly.",
  },
  sp2: {
    mode: "sp2",
    hybridOrbitalCount: 3,
    electronDomains: 3,
    electronGeometry: "Trigonal planar",
    idealBondAngles: "120 deg",
    directions: [
      direction("trigonal-1", "sp2", [1, 0, 0]),
      direction("trigonal-2", "sp2", [-0.5, sqrt3 / 2, 0]),
      direction("trigonal-3", "sp2", [-0.5, -sqrt3 / 2, 0]),
    ],
    unhybridizedPOrbitals: 1,
    explanation:
      "One s orbital mixes with two p orbitals to make three sp2 orbitals in a flat trigonal plane.",
  },
  sp3: {
    mode: "sp3",
    hybridOrbitalCount: 4,
    electronDomains: 4,
    electronGeometry: "Tetrahedral",
    idealBondAngles: "109.5 deg",
    directions: [
      direction("tetra-1", "sp3", [1, 1, 1]),
      direction("tetra-2", "sp3", [-1, -1, 1]),
      direction("tetra-3", "sp3", [-1, 1, -1]),
      direction("tetra-4", "sp3", [1, -1, -1]),
    ],
    unhybridizedPOrbitals: 0,
    explanation:
      "One s orbital mixes with three p orbitals to make four sp3 orbitals directed toward a tetrahedron.",
  },
  sp3d: {
    mode: "sp3d",
    hybridOrbitalCount: 5,
    electronDomains: 5,
    electronGeometry: "Trigonal bipyramidal",
    idealBondAngles: "90 deg, 120 deg, 180 deg",
    directions: [
      direction("tbp-equatorial-1", "sp3d eq", [1, 0, 0]),
      direction("tbp-equatorial-2", "sp3d eq", [-0.5, sqrt3 / 2, 0]),
      direction("tbp-equatorial-3", "sp3d eq", [-0.5, -sqrt3 / 2, 0]),
      direction("tbp-axial-up", "sp3d ax", [0, 0, 1]),
      direction("tbp-axial-down", "sp3d ax", [0, 0, -1]),
    ],
    unhybridizedPOrbitals: 0,
    explanation:
      "Five electron domains are arranged as a trigonal bipyramid with three equatorial and two axial positions.",
  },
  sp3d2: {
    mode: "sp3d2",
    hybridOrbitalCount: 6,
    electronDomains: 6,
    electronGeometry: "Octahedral",
    idealBondAngles: "90 deg, 180 deg",
    directions: [
      direction("oct-x-positive", "sp3d2", [1, 0, 0]),
      direction("oct-x-negative", "sp3d2", [-1, 0, 0]),
      direction("oct-y-positive", "sp3d2", [0, 1, 0]),
      direction("oct-y-negative", "sp3d2", [0, -1, 0]),
      direction("oct-z-positive", "sp3d2", [0, 0, 1]),
      direction("oct-z-negative", "sp3d2", [0, 0, -1]),
    ],
    unhybridizedPOrbitals: 0,
    explanation:
      "Six electron domains point toward the corners of an octahedron.",
  },
}

export function getHybridizationGeometry(mode: HybridizationMode): HybridizationGeometry {
  return GEOMETRIES[mode]
}

export function getHybridOrbitalDirections(mode: HybridizationMode): HybridOrbitalDirection[] {
  return getHybridizationGeometry(mode).directions
}

export function getHybridOrbitalRequirement(mode: HybridizationMode): { s: number; p: number; d: number } {
  switch (mode) {
    case "sp":
      return { s: 1, p: 1, d: 0 }
    case "sp2":
      return { s: 1, p: 2, d: 0 }
    case "sp3":
      return { s: 1, p: 3, d: 0 }
    case "sp3d":
      return { s: 1, p: 3, d: 1 }
    case "sp3d2":
      return { s: 1, p: 3, d: 2 }
    default:
      return { s: 1, p: 3, d: 0 }
  }
}

export function classifyOverlap(distance: number): OverlapRegime {
  if (distance < 0.72) return "too-close"
  if (distance <= 1.55) return "overlap"
  return "too-far"
}

export function getOverlapMessage(distance: number): string {
  const regime = classifyOverlap(distance)
  if (regime === "too-close") return "Strong repulsion region."
  if (regime === "overlap") return "Sigma overlap formed."
  return "Atoms are too far apart for strong overlap."
}
