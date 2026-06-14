import type { SpectroscopyRecord } from "./spectroscopy-types"
import type { ReactionRecord } from "./reaction-types"

export interface Compound {
  id: string
  name: string
  formula: string
  molarMass: number
  category: string
  functionalGroups: string[]
  aliases?: string[]
  description?: string
}

export interface Ion {
  id: string
  name: string
  formula: string
  charge: string
  category: string
  aliases?: string[]
}

export interface FunctionalGroup {
  id: string
  name: string
  identifier: string
  description: string
  examples: string[]
}

export interface ReactionTemplate {
  id: string
  type: string
  reactants: string[]
  products: string[]
  generalForm: string
  description: string
  examples?: string[]
}

export type ChemistryRecordKind =
  | "compound"
  | "ion"
  | "functional-group"
  | "reaction-template"
  | "reaction-record"
  | "spectroscopy"

export interface ChemistrySearchResult {
  kind: ChemistryRecordKind
  id: string
  name: string
  matchField: string
  description: string
  record: Compound | Ion | FunctionalGroup | ReactionTemplate | ReactionRecord | SpectroscopyRecord
}
