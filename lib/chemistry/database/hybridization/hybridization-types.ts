export type HybridizationMode = "unhybridized" | "sp" | "sp2" | "sp3" | "sp3d" | "sp3d2"

export type OverlapRegime = "too-far" | "overlap" | "too-close"

export interface HybridOrbitalDirection {
  id: string
  label: string
  vector: [number, number, number]
  role: "bonding" | "lone-pair" | "available"
}

export interface HybridizationGeometry {
  mode: HybridizationMode
  hybridOrbitalCount: number
  electronDomains: number
  electronGeometry: string
  idealBondAngles: string
  directions: HybridOrbitalDirection[]
  unhybridizedPOrbitals: number
  explanation: string
}

export interface HybridizationPreset {
  id: string
  label: string
  formula: string
  centralAtom: string
  outerAtoms: string[]
  mode: HybridizationMode
  electronDomains: number
  bondingDomains: number
  lonePairs: number
  electronGeometry: string
  molecularGeometry: string
  idealBondAngles: string
  explanation: string
}

export interface OuterHybridAtom {
  id: string
  symbol: string
  directionIndex: number
  distance: number
}
