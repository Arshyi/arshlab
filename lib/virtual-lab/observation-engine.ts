import type { LabActionId, LabObservation, VirtualLabExperiment } from "./experiment-types"

export function observationsAfterAction(experiment: VirtualLabExperiment, action: LabActionId): LabObservation[] {
  return experiment.observations
    .filter((observation) => observation.afterAction === action)
    .sort((left, right) => left.timeMinutes - right.timeMinutes)
}

export function observationTimeline(experiment: VirtualLabExperiment): LabObservation[] {
  const actionOrder = new Map(experiment.steps.map((step, index) => [step.action, index]))
  return experiment.observations.slice().sort((left, right) => {
    const actionDelta = (actionOrder.get(left.afterAction) ?? 0) - (actionOrder.get(right.afterAction) ?? 0)
    return actionDelta || left.timeMinutes - right.timeMinutes
  })
}

export function observationSentence(observation: LabObservation): string {
  return `${observation.timeMinutes} min: ${observation.text}`
}
