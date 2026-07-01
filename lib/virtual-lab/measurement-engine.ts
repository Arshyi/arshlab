import type { LabMeasurement, VirtualLabExperiment } from "./experiment-types"

export function calculateYield(actualMass: number, theoreticalMass: number): number {
  if (theoreticalMass <= 0) return 0
  return Math.round((actualMass / theoreticalMass) * 1000) / 10
}

export function calculatePurity(observedMeltingPoint: number, literatureMeltingPoint: number): number {
  const depression = Math.abs(literatureMeltingPoint - observedMeltingPoint)
  return Math.max(45, Math.round((100 - depression * 4) * 10) / 10)
}

export function measurementSummary(measurement: LabMeasurement): string {
  return `${measurement.label}: ${measurement.value} ${measurement.unit} +/- ${measurement.uncertainty} ${measurement.unit}`
}

export function measurementsForAction(experiment: VirtualLabExperiment, measurementIds: string[] = []): LabMeasurement[] {
  const ids = new Set(measurementIds)
  return experiment.measurements.filter((measurement) => ids.has(measurement.id))
}

export function estimateCompletionTime(experiment: VirtualLabExperiment, completedSteps: number): number {
  const minutesPerStep = experiment.estimatedMinutes / Math.max(1, experiment.steps.length)
  return Math.max(0, Math.round((experiment.steps.length - completedSteps) * minutesPerStep))
}
