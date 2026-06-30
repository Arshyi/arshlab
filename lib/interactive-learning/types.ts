export type DiatomicSpeciesId =
  | "H2"
  | "He2"
  | "Li2"
  | "Be2"
  | "B2"
  | "C2"
  | "N2"
  | "O2"
  | "F2"
  | "Ne2"
  | "O2+"
  | "O2-"
  | "B2+"
  | "N2+"
  | "NO"
  | "CO"

export type OrbitalKind = "sigma" | "pi"
export type Magnetism = "Diamagnetic" | "Paramagnetic"
export type HybridizationMode = "sp" | "sp2" | "sp3" | "sp3d" | "sp3d2"
export type HybridizationStage = "before" | "promotion" | "hybridization" | "bond-formation"
export type OverlapMode = "sigma" | "pi"
export type ViewerOrientation = "front" | "side" | "top"

export interface MolecularOrbitalLevel {
  id: string
  label: string
  kind: OrbitalKind
  shell: "1s" | "2s" | "2p" | "pi"
  energy: number
  capacity: number
  degeneracy: number
  bonding: boolean
  antibonding: boolean
  occupancy: number
  unpairedElectrons: number
  explanation: string
}

export interface ElectronPlacementStep {
  step: number
  orbitalId: string
  orbitalLabel: string
  electronSpin: "up" | "down"
  rule: "Aufbau Principle" | "Hund's Rule" | "Pauli Exclusion Principle"
  electronNumber: number
  explanation: string
  bondOrder: number
}

export interface MolecularOrbitalResult {
  speciesId: string
  displayName: string
  electronCount: number
  ordering: string
  orbitals: MolecularOrbitalLevel[]
  fillingSteps: ElectronPlacementStep[]
  bondOrder: number
  bondingElectrons: number
  antibondingElectrons: number
  unpairedElectrons: number
  magnetism: Magnetism
  homo: MolecularOrbitalLevel | null
  lumo: MolecularOrbitalLevel | null
  explanation: string
}

export interface HomoLumoExample {
  id: string
  name: string
  electronCount: number
  homo: string
  lumo: string
  energyGap: string
  explanation: string
}

export interface HybridOrbital {
  id: string
  label: string
  angle: number
  x: number
  y: number
  z: number
  occupancy: "bonding" | "lone-pair" | "empty"
}

export interface HybridizationModel {
  mode: HybridizationMode
  title: string
  geometry: string
  molecularGeometry: string
  electronDomains: number
  bondingDomains: number
  lonePairs: number
  idealAngles: string
  sCharacter: number
  pCharacter: number
  dCharacter: number
  relativeEnergy: number
  orbitals: HybridOrbital[]
  stages: Record<HybridizationStage, string>
  explanation: string
}

export interface SigmaPiModel {
  id: string
  mode: OverlapMode
  title: string
  orientation: ViewerOrientation
  constructiveOverlap: string
  nodeDescription: string
  rotationRule: string
  explanation: string
}

export interface LonePairExample {
  id: string
  name: string
  centralAtom: string
  hybridization: HybridizationMode
  molecularGeometry: string
  lonePairs: number
  lonePairOrbitals: string[]
  unhybridizedOrbitals: string[]
  explanation: string
}

export interface PiBondExample {
  id: string
  name: string
  hybridization: HybridizationMode
  sigmaBonds: number
  piBonds: number
  remainingPOrbitals: number
  steps: string[]
  explanation: string
}

export interface InteractiveExample {
  id: string
  name: string
  category: "diatomic" | "organic" | "inorganic"
  electronConfiguration: string
  hybridization: string
  orbitalDiagram: string
  moDiagram: string
  sigmaPiDecomposition: string
  bondOrder: string
  homo: string
  lumo: string
  magnetism: Magnetism | "Context dependent"
  lonePairs: string
  explanation: string
}

export interface OrbitalQuizQuestion {
  id: string
  prompt: string
  hiddenLabel: string
  choices: string[]
  correctAnswer: string
  explanation: string
  topic: "HOMO/LUMO" | "Hybridization" | "Lone Pairs" | "Sigma/Pi" | "Bond Order"
}

export interface SvgOrbitalPrimitive {
  id: string
  type: "line" | "ellipse" | "path" | "circle" | "text"
  x: number
  y: number
  width?: number
  height?: number
  angle?: number
  label?: string
  color: string
  opacity: number
}
