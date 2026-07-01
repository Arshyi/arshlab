import type { SpectralPeak, VirtualLabExperiment } from "./experiment-types"

export function peaksByTechnique(experiment: VirtualLabExperiment, technique: SpectralPeak["technique"]): SpectralPeak[] {
  return experiment.spectra.filter((peak) => peak.technique === technique)
}

export function peakForAtom(experiment: VirtualLabExperiment, atomId: string): SpectralPeak[] {
  return experiment.spectra.filter((peak) => peak.linkedAtoms.includes(atomId))
}

export function peakForBond(experiment: VirtualLabExperiment, bondId: string): SpectralPeak[] {
  return experiment.spectra.filter((peak) => peak.linkedBonds.includes(bondId))
}

export function explainPeak(peak: SpectralPeak): string {
  return `${peak.position} ${peak.technique}: ${peak.assignment}. ${peak.explanation}`
}

export function buildUvVisibleBand(conjugationLength: number): SpectralPeak {
  const wavelength = Math.round(180 + Math.max(0, conjugationLength - 1) * 28)
  return {
    id: `uv-${conjugationLength}`,
    technique: "UV-Visible",
    position: `${wavelength} nm`,
    intensity: conjugationLength > 3 ? "moderate" : "weak",
    assignment: "pi to pi* transition",
    explanation: "Longer conjugation lowers the HOMO-LUMO gap and shifts absorption to longer wavelength.",
    linkedAtoms: [],
    linkedBonds: ["pi-system"],
  }
}
