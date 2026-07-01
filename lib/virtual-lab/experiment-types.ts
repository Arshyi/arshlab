export type VirtualLabCategory =
  | "Organic Chemistry"
  | "General Chemistry"
  | "Spectroscopy"
  | "Analytical Chemistry"
  | "Laboratory Techniques"
  | "Reaction Mechanisms"

export type VirtualLabDifficulty = "Introductory" | "Intermediate" | "Advanced"
export type VirtualLabMode = "guided" | "free"

export type LabActionId =
  | "weigh"
  | "add-solvent"
  | "add-reagent"
  | "mix"
  | "heat"
  | "cool"
  | "wait"
  | "filter"
  | "extract"
  | "distill"
  | "recrystallize"
  | "purify"
  | "measure-ph"
  | "record-temperature"
  | "analyze-ir"
  | "analyze-nmr"
  | "analyze-ms"

export interface LabChemical {
  id: string
  name: string
  formula: string
  role: "reactant" | "reagent" | "solvent" | "product" | "standard" | "sample"
  hazards: string[]
}

export interface LabEquipment {
  id: string
  name: string
  category: "glassware" | "instrument" | "support" | "heating" | "analysis"
  svgKind: string
  controls: string[]
  purpose: string
}

export interface LabTechnique {
  id: string
  name: string
  category: string
  steps: LabActionId[]
  commonMistakes: string[]
  scoreWeight: number
}

export interface SafetyProfile {
  hazards: string[]
  ppe: string[]
  waste: string
  notes: string[]
}

export interface SpectralPeak {
  id: string
  technique: "IR" | "1H NMR" | "13C NMR" | "Mass Spec" | "UV-Visible"
  position: string
  intensity: string
  assignment: string
  explanation: string
  linkedAtoms: string[]
  linkedBonds: string[]
}

export interface LabObservation {
  id: string
  afterAction: LabActionId
  timeMinutes: number
  text: string
  kind: "color" | "phase" | "gas" | "temperature" | "crystal" | "instrument" | "safety"
}

export interface LabMeasurement {
  id: string
  label: string
  value: number
  unit: string
  uncertainty: number
  explanation: string
}

export interface AssessmentQuestion {
  id: string
  type: "prediction" | "observation" | "mechanism" | "spectroscopy" | "calculation"
  prompt: string
  choices: string[]
  answer: string
  explanation: string
}

export interface ExperimentStep {
  id: string
  action: LabActionId
  title: string
  instruction: string
  why: string
  equipmentIds: string[]
  chemicalIds: string[]
  measurementIds?: string[]
}

export interface VirtualLabExperiment {
  id: string
  title: string
  category: VirtualLabCategory
  compoundId: string
  difficulty: VirtualLabDifficulty
  estimatedMinutes: number
  concepts: string[]
  prerequisites: string[]
  chemicals: LabChemical[]
  equipmentIds: string[]
  techniques: string[]
  steps: ExperimentStep[]
  observations: LabObservation[]
  measurements: LabMeasurement[]
  spectra: SpectralPeak[]
  safety: SafetyProfile
  assessment: AssessmentQuestion[]
  expectedProduct?: string
  yieldPercent: number
  purityPercent: number
}

export interface LabNotebookEntry {
  stepId: string
  action: LabActionId
  title: string
  procedure: string
  observation: string
  measurements: string[]
  timestampMinutes: number
}

export interface ExperimentRunState {
  experimentId: string
  mode: VirtualLabMode
  completedActions: LabActionId[]
  currentStepIndex: number
  observations: LabObservation[]
  measurements: LabMeasurement[]
  notebook: LabNotebookEntry[]
  yieldPercent: number
  purityPercent: number
  techniqueScore: number
  theoryScore: number
  completionScore: number
  warnings: string[]
}

export interface ExperimentDashboardCard {
  id: string
  title: string
  category: VirtualLabCategory
  difficulty: VirtualLabDifficulty
  estimatedMinutes: number
  concepts: string[]
  prerequisites: string[]
}
