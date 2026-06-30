export type HybridizationLabel = "sp" | "sp2" | "sp3"
export type BondOrderLabel = 1 | 2 | 3 | "aromatic"
export type AromaticityLabel = "Aromatic" | "Antiaromatic" | "Non-aromatic"
export type ElectronContributionKind = "pi-bond" | "lone-pair" | "negative-charge" | "positive-charge" | "radical"

export interface ConjugationAtom {
  id: string
  element: string
  x: number
  y: number
  hybridization: HybridizationLabel
  charge?: -1 | 0 | 1
  radical?: boolean
  lonePairs?: number
  participatingLonePairs?: number
  emptyPOrbital?: boolean
  breakReason?: string
  label?: string
}

export interface ConjugationBond {
  id: string
  from: string
  to: string
  order: BondOrderLabel
  sigma: boolean
  pi: boolean
  conjugationBreak?: boolean
  label?: string
}

export interface ResonanceArrow {
  id: string
  source: string
  destination: string
  description: string
}

export interface ResonanceForm {
  id: string
  title: string
  description: string
  movedElectrons: string[]
}

export interface ResonanceLesson {
  forms: ResonanceForm[]
  arrows: ResonanceArrow[]
  hybridDescription: string
}

export interface UVVisLesson {
  lambdaMaxNm: number
  absorbedWavelength: string
  observedColor: string
  explanation: string
}

export interface ConjugationMolecule {
  id: string
  name: string
  formula: string
  category: "acyclic" | "aromatic" | "heteroaromatic" | "polyene" | "resonance" | "carbonyl" | "material"
  atoms: ConjugationAtom[]
  bonds: ConjugationBond[]
  rings?: string[][]
  planar: boolean
  cyclicConjugation: boolean
  notes: string
  resonance?: ResonanceLesson
  uvvis?: UVVisLesson
}

export interface ConjugatedSystem {
  id: string
  atomIds: string[]
  bondIds: string[]
  length: number
  piBondCount: number
  participatingLonePairs: number
  radicals: number
  emptyPOrbitals: number
  piElectrons: number
  principal: boolean
  explanation: string
}

export interface ElectronContribution {
  id: string
  kind: ElectronContributionKind
  atomId?: string
  bondId?: string
  electrons: number
  included: boolean
  explanation: string
}

export interface AromaticityResult {
  label: AromaticityLabel
  piElectrons: number
  nValue: number | null
  ringAtomIds: string[]
  rule: string
  explanation: string
}

export interface AlgorithmStep {
  id: string
  atomId?: string
  title: string
  check: string
  result: string
  includedAtomIds: string[]
  explanation: string
}

export interface ConjugationAnalysis {
  molecule: ConjugationMolecule
  conjugatedSystems: ConjugatedSystem[]
  principalSystem: ConjugatedSystem | null
  electronContributions: ElectronContribution[]
  aromaticity: AromaticityResult
  breakAtoms: ConjugationAtom[]
  algorithmSteps: AlgorithmStep[]
  uvvis: UVVisLesson
}

export interface CurvedArrowAttempt {
  source: string
  destination: string
}

export interface CurvedArrowFeedback {
  correct: boolean
  expected: ResonanceArrow | null
  message: string
}

export interface ConjugationPracticeQuestion {
  id: string
  moleculeId: string
  prompt: string
  choices: string[]
  correctAnswer: string
  explanation: string
  topic: "electron-count" | "conjugation" | "lone-pair" | "conjugation-break" | "principal-path" | "aromaticity"
}
