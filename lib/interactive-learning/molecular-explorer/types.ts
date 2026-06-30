export type ExplorerHybridization = "sp" | "sp2" | "sp3" | "sp3d" | "sp3d2" | "none"
export type ExplorerGeometry =
  | "linear"
  | "trigonal planar"
  | "tetrahedral"
  | "bent"
  | "trigonal pyramidal"
  | "octahedral"
  | "none"
export type ExplorerBondOrder = 1 | 2 | 3 | "aromatic"
export type ExplorerLayerId =
  | "atom-labels"
  | "bond-order"
  | "sigma-framework"
  | "pi-framework"
  | "lone-pairs"
  | "formal-charges"
  | "hybridization"
  | "aromatic-atoms"
  | "conjugated-atoms"
  | "delocalized-electrons"
  | "homo"
  | "lumo"
  | "ring-system"
  | "functional-groups"
  | "electron-domains"
  | "orbital-orientation"

export interface ExplorerAtom {
  id: string
  element: string
  x: number
  y: number
  formalCharge: number
  hybridization: ExplorerHybridization
  geometry: ExplorerGeometry
  electronDomains: number
  bondCount: number
  sigmaBonds: number
  piBonds: number
  lonePairs: number
  unpairedElectrons: number
  valenceElectrons: number
  conjugated: boolean
  delocalized: boolean
  aromatic: boolean
  ringIds: string[]
  functionalGroupIds: string[]
  homoContribution: number
  lumoContribution: number
  orbitalContribution: string
  electronegativity: number | null
  confidence: number
}

export interface ExplorerBond {
  id: string
  from: string
  to: string
  order: ExplorerBondOrder
  normalizedLength: number
  sigmaBonds: number
  piBonds: number
  localized: boolean
  delocalized: boolean
  rotatable: boolean
  ringMember: boolean
  conjugated: boolean
  aromatic: boolean
  orbitalOverlap: string
  confidence: number
  functionalGroupIds: string[]
}

export interface ExplorerRing {
  id: string
  atomIds: string[]
  aromatic: boolean
  electronCount: number
  label: string
}

export interface ExplorerFunctionalGroup {
  id: string
  name: string
  atomIds: string[]
  bondIds: string[]
  definition: string
  properties: string[]
  commonReactions: string[]
  hybridization: string
  electronFlow: string
  examples: string[]
}

export interface ExplorerElectronSet {
  id: string
  label: string
  kind: "sigma" | "pi" | "lone-pair" | "radical" | "formal-charge" | "delocalized"
  atomIds: string[]
  bondIds: string[]
  electronCount: number
  resonanceParticipant: boolean
  origin: string
  explanation: string
}

export interface ExplorerReasoningNode {
  id: string
  title: string
  status: "pass" | "info" | "warning"
  children?: ExplorerReasoningNode[]
}

export interface ExplorerLearningCard {
  id: string
  title: string
  body: string
  targetType: "atom" | "bond" | "molecule" | "functional-group"
  targetId?: string
}

export interface ExplorerMolecule {
  id: string
  name: string
  formula: string
  source: "example" | "scanner-graph"
  atoms: ExplorerAtom[]
  bonds: ExplorerBond[]
  rings: ExplorerRing[]
  functionalGroups: ExplorerFunctionalGroup[]
  electronSets: ExplorerElectronSet[]
  notes: string
}

export interface ExplorerAtomElementInfo {
  element: string
  name: string
  atomicNumber: number
  atomicMass: number
  valenceElectrons: number
  electronegativity: number | null
}

export interface AtomInspection {
  atom: ExplorerAtom
  elementInfo: ExplorerAtomElementInfo
  connectedBonds: ExplorerBond[]
  reasoning: ExplorerReasoningNode[]
  cards: ExplorerLearningCard[]
}

export interface BondInspection {
  bond: ExplorerBond
  atoms: [ExplorerAtom, ExplorerAtom]
  reasoning: ExplorerReasoningNode[]
  cards: ExplorerLearningCard[]
}

export interface SerializedExplorerGraph {
  name?: string
  formula?: string
  atoms: Array<{ id: string | number; element?: string; x?: number; y?: number; charge?: number }>
  bonds: Array<{ id?: string | number; from?: string | number; to?: string | number; startNodeId?: string | number; endNodeId?: string | number; order?: ExplorerBondOrder | number; bondOrder?: number }>
  rings?: Array<{ id?: string | number; atomIds?: Array<string | number>; nodeIds?: Array<string | number>; aromatic?: boolean }>
}
