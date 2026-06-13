export interface IRPeak {
  id: string
  range: string
  peakRange: string
  shape: string
  peakShape: string
  strength: string
  peakStrength: string
  assignment: string
  notes?: string
}

export interface NMRSignal {
  id: string
  shiftRange: string
  multiplicity?: string
  integration?: string
  assignment: string
  notes?: string
}

export interface SpectroscopyRecord {
  id: string
  name: string
  category: string
  functionalGroup: string
  aliases: string[]
  irPeaks: IRPeak[]
  nmrSignals?: NMRSignal[]
  peakRange: string
  peakShape: string
  peakStrength: string
  notes: string
  exampleCompounds: string[]
}

export interface SpectroscopyQuestion {
  id: string
  topic: "Spectroscopy"
  subtopic: "IR Spectroscopy"
  question: string
  choices: Array<{ label: string; text: string }>
  correctAnswer: string
  explanation: string
  sourceRecordId: string
}
