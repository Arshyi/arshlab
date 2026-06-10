export type BondInteractionType = "sigma" | "pi" | "nonbonding" | "repulsive"

export type OrbitalOverlapType = "s-s" | "s-p" | "p-p-sigma" | "p-p-pi"

export type BondVisualizationMode = "electron-cloud" | "space-filling" | "orbital-lobes" | "simple-spheres"

export type InteractionRegime = "attractive" | "equilibrium" | "repulsive"

export interface BondPreset {
  id: string
  label: string
  atoms: [string, string]
  bondOrder: number
  bondType: BondInteractionType
  overlapType: OrbitalOverlapType
  equilibriumDistance: number
  bondEnergy: number
  orbitalDescription: string
  explanation: string
  examples: string[]
  mode: "covalent" | "multiple-bond" | "nonbonding" | "repulsive"
}

export interface PotentialEnergyPoint {
  distance: number
  energy: number
}

export interface AtomVisual {
  symbol: string
  name: string
  color: string
  nucleusColor: string
  covalentRadius: number
  cloudRadius: number
  valenceOrbital: string
}
