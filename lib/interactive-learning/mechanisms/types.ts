export type MechanismStageKind = "reactants" | "intermediate" | "transition-state" | "products"

export type MechanismArrowKind =
  | "lone-pair-donation"
  | "bond-formation"
  | "bond-breaking"
  | "pi-bond-movement"
  | "resonance-movement"
  | "electron-shift"

export type MechanismPracticeStatus = "idle" | "correct" | "incorrect" | "partial"

export interface MechanismPoint {
  x: number
  y: number
}

export interface MechanismAtom {
  id: string
  trackingId: string
  element: string
  x: number
  y: number
  formalCharge: number
  hybridization: "sp" | "sp2" | "sp3" | "none"
  electronCount: number
  sigmaBonds: number
  piBonds: number
  lonePairs: number
  conjugated: boolean
  aromatic: boolean
  homoContribution: number
  lumoContribution: number
  role: string
  explanation: string
}

export interface MechanismBond {
  id: string
  trackingId: string
  from: string
  to: string
  order: 0 | 1 | 2 | 3 | "aromatic"
  sigmaBonds: number
  piBonds: number
  conjugated: boolean
  aromatic: boolean
  breaking: boolean
  forming: boolean
  explanation: string
}

export interface MechanismGraphState {
  id: string
  title: string
  formula: string
  atoms: MechanismAtom[]
  bonds: MechanismBond[]
}

export interface CurvedArrowEndpoint extends MechanismPoint {
  atomId?: string
  bondId?: string
  label: string
}

export interface CurvedArrow {
  id: string
  kind: MechanismArrowKind
  from: CurvedArrowEndpoint
  to: CurvedArrowEndpoint
  control: MechanismPoint
  electronCount: 1 | 2
  movingPair: boolean
  stationary: boolean
  origin: string
  destination: string
  explanation: string
}

export interface MechanismEnergyPoint {
  stepId: string
  label: string
  energy: number
  reactionProgress: number
}

export interface MechanismStep {
  id: string
  label: string
  stageKind: MechanismStageKind
  graph: MechanismGraphState
  arrows: CurvedArrow[]
  energy: number
  transitionState: boolean
  highlightAtoms: string[]
  highlightBonds: string[]
  reasoning: string[]
  electronOrigin: string
  electronDestination: string
}

export interface MechanismMistake {
  id: string
  title: string
  wrongAction: string
  explanation: string
  relatedStepId: string
}

export interface MechanismLearningCard {
  id: string
  title: string
  body: string
}

export interface MechanismPracticePrompt {
  id: string
  stepId: string
  prompt: string
  expectedArrowIds: string[]
  hint: string
  choices: Array<{
    id: string
    label: string
    arrowIds: string[]
    explanation: string
  }>
}

export interface ReactionMechanism {
  id: string
  name: string
  category: string
  difficulty: "Introductory" | "Intermediate" | "Advanced"
  reactants: string[]
  products: string[]
  reagentContext: string
  supportedCompoundIds: string[]
  summary: string
  steps: MechanismStep[]
  energyProfile: MechanismEnergyPoint[]
  commonMistakes: MechanismMistake[]
  learningCards: MechanismLearningCard[]
  practicePrompts: MechanismPracticePrompt[]
}

export interface BondTransition {
  bondTrackingId: string
  fromOrder: MechanismBond["order"] | "missing"
  toOrder: MechanismBond["order"] | "missing"
  change: "formed" | "broken" | "order-increased" | "order-decreased" | "unchanged"
  explanation: string
}

export interface AtomTrackingPath {
  trackingId: string
  element: string
  appearances: Array<{
    stepId: string
    atomId: string
    x: number
    y: number
    formalCharge: number
    hybridization: MechanismAtom["hybridization"]
  }>
}

export interface PracticeEvaluation {
  status: MechanismPracticeStatus
  score: number
  message: string
  missingArrowIds: string[]
  extraArrowIds: string[]
  hint: string
}
