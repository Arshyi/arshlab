import type { ExperimentRunState, LabActionId, LabNotebookEntry, VirtualLabExperiment, VirtualLabMode } from "./experiment-types"
import { measurementsForAction } from "./measurement-engine"
import { observationsAfterAction } from "./observation-engine"
import { actionConsequence } from "./reaction-engine"

export function createExperimentState(experiment: VirtualLabExperiment, mode: VirtualLabMode): ExperimentRunState {
  return {
    experimentId: experiment.id,
    mode,
    completedActions: [],
    currentStepIndex: 0,
    observations: [],
    measurements: [],
    notebook: [],
    yieldPercent: experiment.yieldPercent,
    purityPercent: experiment.purityPercent,
    techniqueScore: 100,
    theoryScore: 0,
    completionScore: 0,
    warnings: [],
  }
}

function notebookEntry(experiment: VirtualLabExperiment, action: LabActionId, stepIndex: number): LabNotebookEntry {
  const step = experiment.steps.find((item) => item.action === action) ?? experiment.steps[stepIndex]
  const observations = observationsAfterAction(experiment, action)
  const measurements = measurementsForAction(experiment, step?.measurementIds)
  return {
    stepId: step?.id ?? action,
    action,
    title: step?.title ?? action,
    procedure: step?.instruction ?? `Performed ${action}.`,
    observation: observations.map((observation) => observation.text).join(" ") || "No visible change yet.",
    measurements: measurements.map((measurement) => `${measurement.label}: ${measurement.value} ${measurement.unit}`),
    timestampMinutes: observations[0]?.timeMinutes ?? stepIndex * 4,
  }
}

export function applyLabAction(
  experiment: VirtualLabExperiment,
  state: ExperimentRunState,
  action: LabActionId,
): ExperimentRunState {
  const expected = experiment.steps[state.currentStepIndex]?.action
  const consequence = actionConsequence(experiment, state, action)
  if (state.mode === "guided" && action !== expected) {
    return { ...state, warnings: Array.from(new Set([...state.warnings, consequence.warning ?? "Action blocked."])) }
  }
  const actionStepIndex = experiment.steps.findIndex((step) => step.action === action)
  const nextIndex = action === expected
    ? state.currentStepIndex + 1
    : Math.max(state.currentStepIndex, actionStepIndex + 1)
  const observations = observationsAfterAction(experiment, action)
  const measurements = measurementsForAction(experiment, experiment.steps[actionStepIndex]?.measurementIds)
  const completedActions = [...state.completedActions, action]
  const completionScore = Math.round((new Set(completedActions).size / experiment.steps.length) * 100)
  const techniqueScore = Math.max(0, Math.min(100, state.techniqueScore + (consequence.warning ? -12 : 0)))
  return {
    ...state,
    completedActions,
    currentStepIndex: Math.min(experiment.steps.length, nextIndex),
    observations: [...state.observations, ...observations],
    measurements: [...state.measurements, ...measurements],
    notebook: [...state.notebook, notebookEntry(experiment, action, state.currentStepIndex)],
    yieldPercent: Math.max(0, Math.min(100, state.yieldPercent + consequence.yieldDelta)),
    purityPercent: Math.max(0, Math.min(100, state.purityPercent + consequence.purityDelta)),
    techniqueScore,
    completionScore,
    warnings: consequence.warning ? Array.from(new Set([...state.warnings, consequence.warning])) : state.warnings,
  }
}

export function scoreAssessment(experiment: VirtualLabExperiment, answers: Record<string, string>): number {
  if (!experiment.assessment.length) return 0
  const correct = experiment.assessment.filter((question) => answers[question.id] === question.answer).length
  return Math.round((correct / experiment.assessment.length) * 100)
}

export function buildPrintableLabReport(experiment: VirtualLabExperiment, state: ExperimentRunState): string {
  const observations = state.notebook.length
    ? state.notebook.map((entry, index) =>
        `${index + 1}. ${entry.title}: ${entry.observation}`,
      )
    : ["No actions have been recorded yet. Run the experiment to collect deterministic observations."]
  const measurements = state.measurements.length
    ? state.measurements.map((measurement) =>
        `- ${measurement.label}: ${measurement.value} ${measurement.unit} (uncertainty ±${measurement.uncertainty})`,
      )
    : ["- No measurements recorded yet."]
  const spectra = experiment.spectra.length
    ? experiment.spectra.map((peak) => `- ${peak.technique} ${peak.position}: ${peak.assignment}`)
    : ["- No spectra are linked to this experiment."]
  const safety = experiment.safety.hazards.length
    ? experiment.safety.hazards.map((hazard) => `- ${hazard}`)
    : ["- Standard lab PPE and careful handling are still required."]
  const lines = [
    `# ARSHLAB Virtual Lab Report: ${experiment.title}`,
    "",
    "## Objective",
    `Investigate ${experiment.expectedProduct.toLowerCase()} using deterministic ARSHLAB lab steps connected to ${experiment.concepts.join(", ")}.`,
    "",
    "## Method",
    ...experiment.steps.map((step, index) => `${index + 1}. ${step.instruction} (${step.title})`),
    "",
    "## Observations",
    ...observations,
    "",
    "## Spectra",
    ...spectra,
    "",
    "## Results",
    `Mode: ${state.mode}`,
    `Yield: ${state.yieldPercent}%`,
    `Purity: ${state.purityPercent}%`,
    `Completion: ${state.completionScore}%`,
    `Technique score: ${state.techniqueScore}%`,
    ...measurements,
    "",
    "## Safety",
    ...safety,
    "",
    "## Conclusion",
    `The deterministic simulation completed ${state.completionScore}% of the procedure with a technique score of ${state.techniqueScore}%. The expected outcome is ${experiment.expectedProduct}.`,
  ]
  return lines.join("\n")
}
