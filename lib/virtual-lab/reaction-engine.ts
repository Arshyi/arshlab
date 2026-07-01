import type { ExperimentRunState, LabActionId, VirtualLabExperiment } from "./experiment-types"

export function allowedActions(experiment: VirtualLabExperiment, state: ExperimentRunState): LabActionId[] {
  const nextStep = experiment.steps[state.currentStepIndex]
  if (state.mode === "guided") return nextStep ? [nextStep.action] : []
  return Array.from(new Set(experiment.steps.map((step) => step.action)))
}

export function actionConsequence(
  experiment: VirtualLabExperiment,
  state: ExperimentRunState,
  action: LabActionId,
): { yieldDelta: number; purityDelta: number; warning?: string } {
  const expected = experiment.steps[state.currentStepIndex]?.action
  if (action === expected) return { yieldDelta: 0, purityDelta: 0 }
  if (state.mode === "guided") {
    return { yieldDelta: 0, purityDelta: 0, warning: "Guided mode prevents actions out of order." }
  }
  const severe: LabActionId[] = ["heat", "distill", "add-reagent"]
  return {
    yieldDelta: severe.includes(action) ? -12 : -6,
    purityDelta: severe.includes(action) ? -10 : -5,
    warning: `Free Lab Mode consequence: ${action} was performed before the recommended step.`,
  }
}

export function reactionProgressLabel(state: ExperimentRunState): string {
  if (state.completedActions.includes("purify")) return "Products purified"
  if (state.completedActions.includes("wait")) return "Reaction mixture aging"
  if (state.completedActions.includes("heat")) return "Reaction in progress"
  if (state.completedActions.includes("add-reagent")) return "Reactants combined"
  return "Setup"
}
