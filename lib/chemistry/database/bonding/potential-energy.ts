import type { BondPreset, InteractionRegime, PotentialEnergyPoint } from "./bonding-types"

const DEFAULT_WIDTH = 2.2

function getCurveWidth(preset: BondPreset): number {
  if (preset.mode === "nonbonding" || preset.mode === "repulsive") return 1.2
  if (preset.bondOrder >= 3) return 2.7
  if (preset.bondOrder === 2) return 2.4
  return DEFAULT_WIDTH
}

export function calculateMorsePotential(distance: number, preset: BondPreset): number {
  const r = Math.max(0.05, distance)
  const re = preset.equilibriumDistance
  const de = Math.max(0.01, preset.bondEnergy)
  const a = getCurveWidth(preset)
  const stretch = 1 - Math.exp(-a * (r - re))
  return de * stretch * stretch - de
}

export function generatePotentialEnergyCurve(preset: BondPreset): PotentialEnergyPoint[] {
  const points: PotentialEnergyPoint[] = []
  const minDistance = 0.3
  const maxDistance = 5
  const steps = 96

  for (let i = 0; i <= steps; i += 1) {
    const distance = minDistance + ((maxDistance - minDistance) * i) / steps
    points.push({
      distance: Number(distance.toFixed(3)),
      energy: calculateMorsePotential(distance, preset),
    })
  }

  return points
}

export function classifyInteractionRegime(distance: number, equilibriumDistance: number): InteractionRegime {
  const tolerance = Math.max(0.05, equilibriumDistance * 0.07)

  if (distance < equilibriumDistance - tolerance) return "repulsive"
  if (distance > equilibriumDistance + tolerance) return "attractive"
  return "equilibrium"
}

export function getForceExplanation(regime: InteractionRegime): string {
  if (regime === "attractive") {
    return "At this distance, nucleus-electron attractions dominate, pulling the atoms together."
  }

  if (regime === "repulsive") {
    return "At very short distances, nucleus-nucleus and electron-electron repulsions dominate."
  }

  return "At the equilibrium bond length, attractive and repulsive forces balance."
}

export function isLikelyStableBond(preset: BondPreset, distance: number): boolean {
  if (preset.mode === "nonbonding" || preset.mode === "repulsive" || preset.bondOrder === 0) return false
  return classifyInteractionRegime(distance, preset.equilibriumDistance) === "equilibrium"
}
