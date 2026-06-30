import type { ConjugationAnalysis, ConjugationAtom, ConjugationBond } from "./types"

export interface ConjugationSvgPrimitive {
  id: string
  type: "atom" | "bond" | "p-orbital" | "electron" | "arrow" | "path"
  x: number
  y: number
  x2?: number
  y2?: number
  label?: string
  color: string
  opacity: number
  width?: number
  highlight?: boolean
}

function bondCoordinates(bond: ConjugationBond, atoms: Map<string, ConjugationAtom>) {
  const from = atoms.get(bond.from)
  const to = atoms.get(bond.to)
  if (!from || !to) return null
  return { x: from.x, y: from.y, x2: to.x, y2: to.y }
}

export function buildConjugationPrimitives(analysis: ConjugationAnalysis): ConjugationSvgPrimitive[] {
  const atomMap = new Map(analysis.molecule.atoms.map((atom) => [atom.id, atom]))
  const principalAtoms = new Set(analysis.principalSystem?.atomIds ?? [])
  const principalBonds = new Set(analysis.principalSystem?.bondIds ?? [])
  const primitives: ConjugationSvgPrimitive[] = []

  for (const bond of analysis.molecule.bonds) {
    const coords = bondCoordinates(bond, atomMap)
    if (!coords) continue
    const highlight = principalBonds.has(bond.id)
    primitives.push({
      id: `bond-${bond.id}`,
      type: "bond",
      ...coords,
      label: bond.order === "aromatic" ? "aromatic" : String(bond.order),
      color: highlight ? "#14b8a6" : "#64748b",
      opacity: highlight ? 0.95 : 0.42,
      width: highlight ? 5 : 3,
      highlight,
    })
  }

  for (const atom of analysis.molecule.atoms) {
    const highlight = principalAtoms.has(atom.id)
    primitives.push({
      id: `atom-${atom.id}`,
      type: "atom",
      x: atom.x,
      y: atom.y,
      label: atom.label ?? atom.element,
      color: highlight ? "#0f766e" : atom.hybridization === "sp3" ? "#f97316" : "#0f172a",
      opacity: 1,
      width: highlight ? 15 : 12,
      highlight,
    })

    if (highlight) {
      primitives.push({
        id: `p-${atom.id}`,
        type: "p-orbital",
        x: atom.x,
        y: atom.y,
        label: "p",
        color: "#22d3ee",
        opacity: 0.35,
        width: 42,
        highlight,
      })
    }
  }

  analysis.electronContributions
    .filter((item) => item.included)
    .forEach((item, index) => {
      const atom = item.atomId ? atomMap.get(item.atomId) : null
      const bond = item.bondId ? analysis.molecule.bonds.find((candidate) => candidate.id === item.bondId) : null
      const coords = bond ? bondCoordinates(bond, atomMap) : null
      const x = atom?.x ?? (coords ? (coords.x + (coords.x2 ?? coords.x)) / 2 : 40 + index * 24)
      const y = atom?.y ?? (coords ? (coords.y + (coords.y2 ?? coords.y)) / 2 : 36)
      primitives.push({
        id: `electron-${item.id}`,
        type: "electron",
        x,
        y: y - 20 - (index % 2) * 8,
        label: item.electrons === 1 ? "1e" : `${item.electrons}e`,
        color: "#f59e0b",
        opacity: 0.9,
        width: 8,
      })
    })

  return primitives
}

export function buildEnergyDiagram(length: number) {
  const gap = Math.max(24, 130 - length * 5)
  const center = 150
  return {
    homoY: center + gap / 2,
    lumoY: center - gap / 2,
    gap,
    explanation: "More conjugated atoms create more closely spaced pi levels.",
  }
}

export function buildAlgorithmPath(analysis: ConjugationAnalysis, stepIndex: number) {
  const step = analysis.algorithmSteps[Math.min(stepIndex, analysis.algorithmSteps.length - 1)] ?? analysis.algorithmSteps[0]
  return {
    step,
    activeAtomIds: step?.includedAtomIds ?? [],
    activeAtomCount: step?.includedAtomIds.length ?? 0,
  }
}
