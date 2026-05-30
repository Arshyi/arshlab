import {
  getAngularMomentum,
  getAngularNodes,
  getRadialNodes,
  getTotalNodes,
  isValidOrbitalCombination,
} from "@/lib/orbitalMath"

export type OrbitalFamily = "s" | "p" | "d" | "f"

export type OrbitalData = {
  id: string
  label: string
  family: OrbitalFamily
  n: number
  l: number
  orientation?: string
  radialNodes: number
  angularNodes: number
  totalNodes: number
  shapeDescription: string
  chemistryRelevance: string
  explanation: string
}

const P_ORIENTATIONS = ["x", "y", "z"] as const
const D_VARIANTS = [
  { suffix: "xy", label: "d_xy" },
  { suffix: "xz", label: "d_xz" },
  { suffix: "yz", label: "d_yz" },
  { suffix: "z2", label: "d_z²" },
  { suffix: "x2-y2", label: "d_x²-y²" },
] as const

const F_VARIANTS = [
  { id: "f_z3", label: "f_z³" },
  { id: "f_xz2", label: "f_xz²" },
  { id: "f_yz2", label: "f_yz²" },
  { id: "f_xyz", label: "f_xyz" },
  { id: "f_z_x2_y2", label: "f_z(x²-y²)" },
  { id: "f_x_x2_3y2", label: "f_x(x²-3y²)" },
  { id: "f_y_3x2_y2", label: "f_y(3x²-y²)" },
] as const

function buildOrbitalMeta(
  partial: Omit<OrbitalData, "l" | "radialNodes" | "angularNodes" | "totalNodes">,
): OrbitalData {
  const l = getAngularMomentum(partial.family)
  return {
    ...partial,
    l,
    radialNodes: getRadialNodes(partial.n, l),
    angularNodes: getAngularNodes(l),
    totalNodes: getTotalNodes(partial.n),
  }
}

function sDescriptions(n: number): Pick<OrbitalData, "shapeDescription" | "chemistryRelevance" | "explanation"> {
  const radial = getRadialNodes(n, 0)
  return {
    shapeDescription:
      radial === 0
        ? "A single spherical region of electron density centered on the nucleus."
        : `A spherical shell with ${radial} radial node${radial > 1 ? "s" : ""} — nested regions of zero probability.`,
    chemistryRelevance:
      n === 1
        ? "Core orbital in hydrogen; valence orbital for H and Group 1 metals."
        : `${n}s is a valence orbital for heavier main-group elements and participates in bonding.`,
    explanation: `${n}s has l = 0, so there are no angular nodes. Total nodes = ${n - 1}, all radial.`,
  }
}

function pDescriptions(
  n: number,
  axis: string,
): Pick<OrbitalData, "shapeDescription" | "chemistryRelevance" | "explanation"> {
  const radial = getRadialNodes(n, 1)
  return {
    shapeDescription: `Two lobes along the ${axis}-axis with opposite phase, separated by a nodal plane through the nucleus.${radial > 0 ? ` ${radial} spherical radial node${radial > 1 ? "s" : ""}.` : ""}`,
    chemistryRelevance: "Essential for π bonding, lone pairs, and directional covalent bonds in organic chemistry.",
    explanation: `${n}p has l = 1 (one angular node). Radial nodes = ${radial}. Opposite lobes show opposite wavefunction phase, not charge.`,
  }
}

function dDescriptions(
  n: number,
  label: string,
): Pick<OrbitalData, "shapeDescription" | "chemistryRelevance" | "explanation"> {
  const radial = getRadialNodes(n, 2)
  const isZ2 = label.includes("z²")
  return {
    shapeDescription: isZ2
      ? "Two lobes along z with a toroidal ring in the xy-plane — characteristic d_z² shape."
      : "Four-lobed clover-like shape with alternating phases between lobes.",
    chemistryRelevance: "Central to transition-metal coordination chemistry, crystal field splitting, and complex ion color.",
    explanation: `${label} has l = 2 (two angular nodes). ${n}d has ${radial} radial node${radial !== 1 ? "s" : ""}. Total nodes = ${n - 1}.`,
  }
}

function fDescriptions(
  n: number,
  label: string,
): Pick<OrbitalData, "shapeDescription" | "chemistryRelevance" | "explanation"> {
  const radial = getRadialNodes(n, 3)
  return {
    shapeDescription: "Multi-lobed f orbital with complex angular structure — shown here as a stylized educational approximation.",
    chemistryRelevance: "Filled in lanthanides and actinides; governs properties of f-block elements.",
    explanation: `${label} has l = 3 (three angular nodes). ${n}f has ${radial} radial node${radial !== 1 ? "s" : ""}. Total nodes = ${n - 1}.`,
  }
}

function generateSOrbitals(): OrbitalData[] {
  return Array.from({ length: 7 }, (_, i) => {
    const n = i + 1
    const meta = sDescriptions(n)
    return buildOrbitalMeta({
      id: `${n}s`,
      label: `${n}s`,
      family: "s",
      n,
      ...meta,
    })
  })
}

function generatePOrbitals(): OrbitalData[] {
  const orbitals: OrbitalData[] = []
  for (let n = 2; n <= 7; n++) {
    for (const axis of P_ORIENTATIONS) {
      const meta = pDescriptions(n, axis)
      orbitals.push(
        buildOrbitalMeta({
          id: `${n}p_${axis}`,
          label: `${n}p_${axis}`,
          family: "p",
          n,
          orientation: axis,
          ...meta,
        }),
      )
    }
  }
  return orbitals
}

function generateDOrbitals(): OrbitalData[] {
  const orbitals: OrbitalData[] = []
  for (let n = 3; n <= 6; n++) {
    for (const variant of D_VARIANTS) {
      const meta = dDescriptions(n, variant.label)
      orbitals.push(
        buildOrbitalMeta({
          id: `${n}d_${variant.suffix}`,
          label: `${n}${variant.label}`,
          family: "d",
          n,
          orientation: variant.suffix,
          ...meta,
        }),
      )
    }
  }
  return orbitals
}

function generateFOrbitals(): OrbitalData[] {
  const orbitals: OrbitalData[] = []
  for (const n of [4, 5]) {
    for (const variant of F_VARIANTS) {
      const meta = fDescriptions(n, variant.label)
      orbitals.push(
        buildOrbitalMeta({
          id: `${n}${variant.id}`,
          label: `${n}${variant.label}`,
          family: "f",
          n,
          orientation: variant.id,
          ...meta,
        }),
      )
    }
  }
  return orbitals
}

export function generateOrbitalList(): OrbitalData[] {
  return [...generateSOrbitals(), ...generatePOrbitals(), ...generateDOrbitals(), ...generateFOrbitals()]
}

export const ALL_ORBITALS: OrbitalData[] = generateOrbitalList()

export const DEFAULT_ORBITAL_ID = "2p_z"

export function getOrbitalById(id: string): OrbitalData | undefined {
  return ALL_ORBITALS.find((o) => o.id === id)
}

export function filterOrbitals(family: OrbitalFamily | "all", n: number | "all"): OrbitalData[] {
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

export { getAngularMomentum, getRadialNodes, getAngularNodes, getTotalNodes, isValidOrbitalCombination }
