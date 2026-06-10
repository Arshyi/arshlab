import type { AtomVisual, BondInteractionType, OrbitalOverlapType } from "./bonding-types"

const ATOM_VISUALS: Record<string, AtomVisual> = {
  H: {
    symbol: "H",
    name: "Hydrogen",
    color: "#e2e8f0",
    nucleusColor: "#f43f5e",
    covalentRadius: 0.31,
    cloudRadius: 0.74,
    valenceOrbital: "1s",
  },
  F: {
    symbol: "F",
    name: "Fluorine",
    color: "#38bdf8",
    nucleusColor: "#06b6d4",
    covalentRadius: 0.57,
    cloudRadius: 0.92,
    valenceOrbital: "2p",
  },
  Cl: {
    symbol: "Cl",
    name: "Chlorine",
    color: "#22c55e",
    nucleusColor: "#16a34a",
    covalentRadius: 1.02,
    cloudRadius: 1.2,
    valenceOrbital: "3p",
  },
  O: {
    symbol: "O",
    name: "Oxygen",
    color: "#f97316",
    nucleusColor: "#ef4444",
    covalentRadius: 0.66,
    cloudRadius: 0.98,
    valenceOrbital: "2p",
  },
  N: {
    symbol: "N",
    name: "Nitrogen",
    color: "#60a5fa",
    nucleusColor: "#2563eb",
    covalentRadius: 0.71,
    cloudRadius: 1,
    valenceOrbital: "2p",
  },
  C: {
    symbol: "C",
    name: "Carbon",
    color: "#94a3b8",
    nucleusColor: "#475569",
    covalentRadius: 0.76,
    cloudRadius: 1.05,
    valenceOrbital: "2p",
  },
  He: {
    symbol: "He",
    name: "Helium",
    color: "#facc15",
    nucleusColor: "#eab308",
    covalentRadius: 0.28,
    cloudRadius: 0.72,
    valenceOrbital: "1s filled shell",
  },
  Ne: {
    symbol: "Ne",
    name: "Neon",
    color: "#fb7185",
    nucleusColor: "#e11d48",
    covalentRadius: 0.58,
    cloudRadius: 1.05,
    valenceOrbital: "2p filled shell",
  },
}

export const SUPPORTED_BOND_ATOMS = Object.keys(ATOM_VISUALS)

export function getAtomVisual(symbol: string): AtomVisual {
  return ATOM_VISUALS[symbol] ?? ATOM_VISUALS.C
}

export function getOverlapLabel(overlapType: OrbitalOverlapType): string {
  switch (overlapType) {
    case "s-s":
      return "s-s"
    case "s-p":
      return "s-p"
    case "p-p-sigma":
      return "p-p sigma"
    case "p-p-pi":
      return "p-p pi"
    default:
      return overlapType
  }
}

export function getInteractionLabel(interactionType: BondInteractionType): string {
  switch (interactionType) {
    case "sigma":
      return "Sigma overlap"
    case "pi":
      return "Pi overlap"
    case "nonbonding":
      return "Nonbonding interaction"
    case "repulsive":
      return "Repulsive-only noble gas interaction"
    default:
      return interactionType
  }
}

export function getOverlapExplanation(interactionType: BondInteractionType, overlapType: OrbitalOverlapType): string {
  if (interactionType === "pi" || overlapType === "p-p-pi") {
    return "Pi bonds form by sideways overlap of parallel p orbitals. Electron density lies above and below the bond axis."
  }

  if (interactionType === "nonbonding" || interactionType === "repulsive") {
    return "Closed-shell atoms have filled valence shells, so overlap does not create strong covalent stabilization."
  }

  return "Sigma bonds form by head-on overlap of orbitals along the internuclear axis. Electron density is concentrated between the nuclei."
}

export function getBondOrderLabel(bondOrder: number): string {
  if (bondOrder === 0) return "0 (nonbonding)"
  if (bondOrder === 1) return "1"
  if (bondOrder === 2) return "2"
  if (bondOrder === 3) return "3"
  return bondOrder.toFixed(1)
}
