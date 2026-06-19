export type SpectroscopyCategory = "IR" | "1H NMR" | "13C NMR" | "Mass Spec"

export interface SpectroscopySignalRecord {
  id: string
  category: SpectroscopyCategory
  signal: string
  range: string
  functionalGroup: string
  foundIn: string[]
  explanation: string
  examClues: string[]
  aliases: string[]
}

export interface ProtonNmrSignal {
  id: string
  environment: string
  shiftRange: string
  integration: string
  splitting: string
  explanation: string
}

export interface CarbonNmrSignal {
  id: string
  environment: string
  shiftRange: string
  explanation: string
}

export interface MassSpecSignal {
  id: string
  peak: string
  mz: string
  explanation: string
}

export interface CompoundSpectroscopyProfile {
  id: string
  compoundId: string
  compoundName: string
  formula: string
  irSignalIds: string[]
  protonNmr: ProtonNmrSignal[]
  carbonNmr: CarbonNmrSignal[]
  massSpec: MassSpecSignal[]
  notes: string
}

export interface ReactionSpectralChange {
  reactionId: string
  reactionName: string
  reactantClass: string
  productClass: string
  irChanges: string[]
  protonNmrChanges: string[]
  carbonNmrChanges: string[]
  massSpecChanges: string[]
  explanation: string
}

export interface SpectroscopyMetrics {
  signalRecords: number
  irSignals: number
  protonNmrSignals: number
  carbonNmrSignals: number
  massSpecSignals: number
  compoundProfiles: number
  reactionChangeRecords: number
}

