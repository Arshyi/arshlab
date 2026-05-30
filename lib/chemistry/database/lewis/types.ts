export interface LewisAtom {
  symbol: string
  valenceElectrons: number
  formalCharge: number
  lonePairs: number
  bondingElectrons: number
  expandedOctet?: boolean
  incompleteOctet?: boolean
}

export interface LewisBond {
  from: number
  to: number
  order: 1 | 2 | 3
}

export interface LewisStructure {
  id: string
  formula: string
  name: string
  atoms: LewisAtom[]
  bonds: LewisBond[]
  totalElectrons: number
  octetAnalysis: string
  formalChargeSum: number
  hasResonance: boolean
  resonanceNote?: string
  isRadical: boolean
  isHypervalent: boolean
  bondOrders: string
  lonePairSummary: string
}

export interface LewisTemplate {
  id: string
  formula: string
  name: string
  aliases: string[]
  build: () => LewisStructure
}
