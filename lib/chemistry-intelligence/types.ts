import type { MolecularGraph } from "../vision/molecular-graph"

export type IntelligenceConfidenceBand = "low" | "moderate" | "high"

export interface IntelligenceLink {
  label: string
  href: string
  reason: string
}

export interface IntelligenceCompoundRecord {
  id: string
  name: string
  formula: string
  aliases: string[]
  family: string
  functionalGroups: string[]
  polarity: "Nonpolar" | "Polar" | "Ionic"
  physicalState: "gas" | "liquid" | "solid" | "aqueous/variable" | "unknown"
  commonReactions: string[]
  curriculumTopicId?: string
  formulaId?: string
  practiceTopic?: string
  examTopic?: string
  mechanismIds?: string[]
  reactionIds?: string[]
  spectroscopyCompoundId?: string
  safetyNotes?: string[]
}

export interface GraphMatchResult {
  compoundId: string
  confidence: number
  exact: boolean
  canonicalId: string
  referenceCanonicalId: string
  reasons: string[]
}

export interface FunctionalGroupInsight {
  id: string
  label: string
  parent: string
  hierarchy: string[]
  confidence: number
  evidence: string[]
}

export interface ScaffoldInsight {
  id: string
  name: string
  confidence: number
  reason: string
}

export interface CompoundFamilyInsight {
  id: string
  label: string
  confidence: number
  evidence: string[]
}

export interface ChemicalPropertySummary {
  formula: string
  molarMass: number | null
  formalCharge: number
  aromatic: boolean
  ringCount: number
  atomCount: number
  bondCount: number
  hybridizationSummary: string
  estimatedPolarity: string
  hydrogenBondDonorCount: number
  hydrogenBondAcceptorCount: number
  estimatedSolubilityClass: string
  physicalState: string
}

export interface KnowledgeConfidence {
  vision: number
  graph: number
  chemistry: number
  knowledge: number
  overall: number
  band: IntelligenceConfidenceBand
}

export interface KnowledgeGraphSummary {
  nodes: Array<{ id: string; label: string; type: string; href?: string }>
  edges: Array<{ from: string; to: string; label: string }>
  linkedModules: string[]
}

export interface CompoundIntelligence {
  identity: {
    compoundId: string
    name: string
    formula: string
    confidence: number
    canonicalGraphId: string
    matchedBy: string[]
  }
  graph: MolecularGraph
  graphMatches: GraphMatchResult[]
  functionalGroups: FunctionalGroupInsight[]
  scaffolds: ScaffoldInsight[]
  families: CompoundFamilyInsight[]
  properties: ChemicalPropertySummary
  spectroscopy: {
    available: boolean
    summary: string[]
    href: string
  }
  reactions: Array<{
    id: string
    name: string
    mechanismFamily: string
    difficulty: string
    safety: string[]
    href: string
  }>
  mechanisms: IntelligenceLink[]
  curriculum: IntelligenceLink[]
  resources: IntelligenceLink[]
  safety: string[]
  explainWhy: string[]
  confidence: KnowledgeConfidence
  knowledgeGraph: KnowledgeGraphSummary
}

export interface ChemistryIntelligenceInput {
  graph: MolecularGraph
  preferredCompoundId?: string
  recognizedText?: string
  visionConfidence?: number
  graphConfidence?: number
}
