export type BondOrder = 1 | 2 | 3 | "aromatic"

export interface AtomNode {
  id: string
  element: string
  x: number
  y: number
  label?: string
  charge?: string
}

export interface BondEdge {
  id: string
  from: string
  to: string
  order: BondOrder
  label?: string
}

export interface FunctionalGroupHighlight {
  id: string
  group: string
  label: string
  atomIds: string[]
  bondIds?: string[]
  color?: string
  description?: string
}

export interface MolecularStructure2D {
  id: string
  compoundId: string
  displayName: string
  formula: string
  atoms: AtomNode[]
  bonds: BondEdge[]
  functionalGroupHighlights?: FunctionalGroupHighlight[]
  notes?: string[]
}

export interface ReactionStep {
  id: string
  label: string
  description: string
  reactants: string[]
  products: string[]
  conditions?: string
}

export interface ReactionDiagram {
  id: string
  reactionId?: string
  name: string
  reactionType: string
  reactants: string[]
  products: string[]
  balancedEquation: string
  steps?: ReactionStep[]
  explanation: string
}

export interface SpectroscopyMapping {
  id: string
  spectroscopyRecordId: string
  peakId?: string
  functionalGroup: string
  exampleCompoundId: string
  highlightGroup: string
  assignment: string
}

export interface CompoundPathwayNode {
  id: string
  compoundId: string
  label: string
  note?: string
}

export interface CompoundPathwayEdge {
  id: string
  from: string
  to: string
  reactionType: string
  reagent?: string
  note?: string
}

export interface CompoundPathway {
  id: string
  title: string
  description: string
  nodes: CompoundPathwayNode[]
  edges: CompoundPathwayEdge[]
}
