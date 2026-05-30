import type { SpectroscopyRecord } from "../types"
import { SPECTROSCOPY_RECORDS, FG_IR_DEFAULTS } from "./templates"

export interface IRPeak {
  wavenumber: number
  intensity: number
  label: string
  broad?: boolean
  width?: number
}

export function buildIRSpectrum(peaks: IRPeak[]): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = []
  for (let w = 4000; w >= 400; w -= 20) {
    let y = 5 + Math.sin(w * 0.002) * 2
    for (const peak of peaks) {
      const width = peak.width ?? (peak.broad ? 200 : 40)
      const dist = Math.abs(w - peak.wavenumber)
      y += peak.intensity * Math.exp(-(dist * dist) / (2 * width * width * 0.01))
    }
    points.push({ x: w, y: Math.min(y, 100) })
  }
  return points
}

export const ALL_SPECTROSCOPY: SpectroscopyRecord[] = SPECTROSCOPY_RECORDS

export function getSpectroscopyByCompoundId(compoundId: string): SpectroscopyRecord | undefined {
  return ALL_SPECTROSCOPY.find((s) => s.compoundId === compoundId)
}

export function getSpectroscopyByName(name: string): SpectroscopyRecord | undefined {
  const q = name.toLowerCase().trim()
  return ALL_SPECTROSCOPY.find(
    (s) =>
      s.name.toLowerCase() === q ||
      s.aliases.some((a) => a.toLowerCase() === q),
  )
}

export function getDefaultIRForFunctionalGroup(fgId: string): IRPeak[] {
  const peaks = FG_IR_DEFAULTS[fgId] ?? []
  return peaks.map((p) => ({
    wavenumber: p.wavenumber,
    intensity: p.intensity,
    label: p.assignment,
    broad: p.assignment.includes("broad") || p.assignment.includes("O—H"),
  }))
}

/** Legacy adapter for existing spectroscopy-lab */
export function toLegacySpectroscopyData(record: SpectroscopyRecord) {
  return {
    compoundName: record.name,
    aliases: record.aliases,
    irPeaks: record.irPeaks.map((p) => ({
      wavenumber: p.wavenumber,
      intensity: p.intensity,
      label: p.assignment,
      broad: p.assignment.toLowerCase().includes("broad"),
    })),
    irSummary: record.characteristicAbsorptions.join("; "),
    molecularIon: record.msFragments[0]?.mz ?? 0,
    msFragments: record.msFragments.map((f) => ({
      mz: f.mz,
      intensity: f.intensity,
      label: f.label,
      explanation: f.label,
    })),
    msSummary: record.characteristicFragments.join("; "),
    nmrEnvironments: record.nmrSignals.map((s) => ({
      proton: s.assignment,
      shift: `${s.shiftPpm} ppm`,
      splitting: s.multiplicity,
      integration: `${s.integration}H`,
    })),
    nmrSummary: record.characteristicSignals.join("; "),
  }
}

export { SPECTROSCOPY_RECORDS, FG_IR_DEFAULTS }
