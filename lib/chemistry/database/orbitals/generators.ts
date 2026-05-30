import type { OrbitalRecord, OrbitalFamily, ExamBoard } from "../types"
import {
  getAngularMomentum,
  getAngularNodes,
  getRadialNodes,
  getTotalNodes,
  isValidOrbitalCombination,
} from "@/lib/orbitalMath"

const BOARDS: ExamBoard[] = ["high-school", "ib-sl", "ib-hl", "ap", "a-level", "university-intro"]

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

/** ml values for real orbitals in Cartesian basis */
const ML_BY_ORIENTATION: Record<string, number> = {
  x: 1,
  y: -1,
  z: 0,
  xy: -2,
  xz: -1,
  yz: 1,
  z2: 0,
  "x2-y2": 2,
  f_z3: 0,
  f_xz2: -1,
  f_yz2: 1,
  f_xyz: 0,
  f_z_x2_y2: 0,
  f_x_x2_3y2: 2,
  f_y_3x2_y2: -2,
}

function buildOrbital(
  partial: Omit<OrbitalRecord, "kind" | "l" | "radialNodes" | "angularNodes" | "totalNodes" | "examBoards" | "topics" | "subtopics" | "tags"> &
    Pick<OrbitalRecord, "shapeDescription" | "chemistryRelevance" | "explanation">,
): OrbitalRecord {
  const l = getAngularMomentum(partial.family)
  const orient = partial.orientation ?? partial.family
  const ml = ML_BY_ORIENTATION[orient] ?? 0

  return {
    kind: "orbital",
    l,
    radialNodes: getRadialNodes(partial.n, l),
    angularNodes: getAngularNodes(l),
    totalNodes: getTotalNodes(partial.n),
    ml,
    examBoards: BOARDS,
    topics: ["atomic-structure", "quantum"],
    subtopics: ["orbitals", `${partial.family}-orbitals`],
    tags: [partial.family, `n-${partial.n}`, `l-${l}`],
    aliases: [partial.label, partial.id],
    name: partial.label,
    ...partial,
  }
}

function sMeta(n: number) {
  const radial = getRadialNodes(n, 0)
  return {
    shapeDescription:
      radial === 0
        ? "Spherical electron density centered on the nucleus."
        : `Spherical shells with ${radial} radial node(s).`,
    chemistryRelevance:
      n === 1 ? "Core orbital in hydrogen." : `${n}s valence orbital for heavier elements.`,
    explanation: `${n}s: l=0, ${radial} radial node(s), total nodes = ${n - 1}.`,
  }
}

function pMeta(n: number, axis: string) {
  const radial = getRadialNodes(n, 1)
  return {
    shapeDescription: `Two lobes along ${axis}; one angular nodal plane.${radial ? ` ${radial} radial node(s).` : ""}`,
    chemistryRelevance: "π bonding, lone pairs, directional bonds.",
    explanation: `${n}p_${axis}: l=1, ml=${ML_BY_ORIENTATION[axis]}. Radial nodes = ${radial}.`,
  }
}

function dMeta(n: number, label: string) {
  const radial = getRadialNodes(n, 2)
  const isZ2 = label.includes("z²")
  return {
    shapeDescription: isZ2
      ? "Two z lobes + equatorial torus (d_z²)."
      : "Four-lobed clover with alternating phase.",
    chemistryRelevance: "Transition metal coordination chemistry.",
    explanation: `${n}${label}: l=2. Radial nodes = ${radial}.`,
  }
}

function fMeta(n: number, label: string) {
  const radial = getRadialNodes(n, 3)
  return {
    shapeDescription: "Multi-lobed f orbital (educational approximation).",
    chemistryRelevance: "Lanthanides and actinides.",
    explanation: `${n}${label}: l=3. Radial nodes = ${radial}.`,
  }
}

export function generateAllOrbitals(): OrbitalRecord[] {
  const orbitals: OrbitalRecord[] = []

  for (let n = 1; n <= 7; n++) {
    orbitals.push(
      buildOrbital({ id: `${n}s`, label: `${n}s`, family: "s", n, ...sMeta(n) }),
    )
  }

  for (let n = 2; n <= 7; n++) {
    for (const axis of P_ORIENTATIONS) {
      orbitals.push(
        buildOrbital({
          id: `${n}p_${axis}`,
          label: `${n}p_${axis}`,
          family: "p",
          n,
          orientation: axis,
          ...pMeta(n, axis),
        }),
      )
    }
  }

  for (let n = 3; n <= 6; n++) {
    for (const v of D_VARIANTS) {
      orbitals.push(
        buildOrbital({
          id: `${n}d_${v.suffix}`,
          label: `${n}${v.label}`,
          family: "d",
          n,
          orientation: v.suffix,
          ...dMeta(n, v.label),
        }),
      )
    }
  }

  for (const n of [4, 5, 6]) {
    for (const v of F_VARIANTS) {
      orbitals.push(
        buildOrbital({
          id: `${n}${v.id}`,
          label: `${n}${v.label}`,
          family: "f",
          n,
          orientation: v.id,
          ...fMeta(n, v.label),
        }),
      )
    }
  }

  return orbitals.filter((o) => isValidOrbitalCombination(o.family, o.n))
}
