import type {
  DiatomicSpeciesId,
  ElectronPlacementStep,
  HomoLumoExample,
  MolecularOrbitalLevel,
  MolecularOrbitalResult,
} from "./types"

interface SpeciesRecord {
  id: DiatomicSpeciesId
  displayName: string
  electronCount: number
  ordering: "first-row-light" | "first-row-heavy" | "hydrogenic" | "heteronuclear"
  note: string
}

const SPECIES: SpeciesRecord[] = [
  { id: "H2", displayName: "H2", electronCount: 2, ordering: "hydrogenic", note: "Only the 1s combination is needed." },
  { id: "He2", displayName: "He2", electronCount: 4, ordering: "hydrogenic", note: "Bonding and antibonding 1s orbitals cancel." },
  { id: "Li2", displayName: "Li2", electronCount: 6, ordering: "first-row-light", note: "Core 1s electrons cancel; the 2s electrons create a weak bond." },
  { id: "Be2", displayName: "Be2", electronCount: 8, ordering: "first-row-light", note: "Filled 2s bonding and antibonding levels cancel." },
  { id: "B2", displayName: "B2", electronCount: 10, ordering: "first-row-light", note: "For B2 through N2, pi 2p lies below sigma 2p." },
  { id: "C2", displayName: "C2", electronCount: 12, ordering: "first-row-light", note: "Pi 2p fills before sigma 2p in the light second-row ordering." },
  { id: "N2", displayName: "N2", electronCount: 14, ordering: "first-row-light", note: "N2 reaches a bond order of 3 with filled sigma 2p." },
  { id: "O2", displayName: "O2", electronCount: 16, ordering: "first-row-heavy", note: "For O2 through Ne2, sigma 2p lies below pi 2p." },
  { id: "F2", displayName: "F2", electronCount: 18, ordering: "first-row-heavy", note: "Extra electrons occupy antibonding pi 2p orbitals." },
  { id: "Ne2", displayName: "Ne2", electronCount: 20, ordering: "first-row-heavy", note: "Bonding and antibonding levels cancel overall." },
  { id: "O2+", displayName: "O2+", electronCount: 15, ordering: "first-row-heavy", note: "Removing one antibonding electron increases bond order." },
  { id: "O2-", displayName: "O2-", electronCount: 17, ordering: "first-row-heavy", note: "Adding one antibonding electron decreases bond order." },
  { id: "B2+", displayName: "B2+", electronCount: 9, ordering: "first-row-light", note: "B2+ has one fewer pi 2p electron than B2." },
  { id: "N2+", displayName: "N2+", electronCount: 13, ordering: "first-row-light", note: "N2+ removes one electron from sigma 2p." },
  { id: "NO", displayName: "NO", electronCount: 15, ordering: "heteronuclear", note: "NO is treated with the O2-like ordering for intro-level MO comparison." },
  { id: "CO", displayName: "CO", electronCount: 14, ordering: "heteronuclear", note: "CO is isoelectronic with N2 and has a filled high-energy HOMO." },
]

const LABEL_EXPLANATIONS: Record<string, string> = {
  "σ1s": "Constructive overlap of two 1s atomic orbitals.",
  "σ*1s": "Destructive 1s overlap creates an antibonding node between nuclei.",
  "σ2s": "Constructive overlap of two 2s atomic orbitals.",
  "σ*2s": "Antibonding 2s combination.",
  "π2p": "Side-by-side constructive overlap of two p orbitals; the pair is degenerate.",
  "σ2p": "Head-on constructive overlap of p orbitals along the internuclear axis.",
  "π*2p": "Degenerate antibonding pi levels with nodes between the nuclei.",
  "σ*2p": "Highest antibonding sigma combination from 2p orbitals.",
}

function level(
  id: string,
  label: string,
  energy: number,
  capacity: number,
  degeneracy: number,
  bonding: boolean,
): MolecularOrbitalLevel {
  return {
    id,
    label,
    kind: label.includes("π") ? "pi" : "sigma",
    shell: label.includes("1s") ? "1s" : label.includes("2s") ? "2s" : "2p",
    energy,
    capacity,
    degeneracy,
    bonding,
    antibonding: label.includes("*"),
    occupancy: 0,
    unpairedElectrons: 0,
    explanation: LABEL_EXPLANATIONS[label] ?? "Molecular orbital level.",
  }
}

function buildLevels(ordering: SpeciesRecord["ordering"]): MolecularOrbitalLevel[] {
  if (ordering === "hydrogenic") {
    return [
      level("sigma_1s", "σ1s", 1, 2, 1, true),
      level("sigma_star_1s", "σ*1s", 2, 2, 1, false),
    ]
  }

  const base = [
    level("sigma_1s", "σ1s", 1, 2, 1, true),
    level("sigma_star_1s", "σ*1s", 2, 2, 1, false),
    level("sigma_2s", "σ2s", 3, 2, 1, true),
    level("sigma_star_2s", "σ*2s", 4, 2, 1, false),
  ]

  if (ordering === "first-row-light" || ordering === "heteronuclear") {
    return [
      ...base,
      level("pi_2p", "π2p", 5, 4, 2, true),
      level("sigma_2p", "σ2p", 6, 2, 1, true),
      level("pi_star_2p", "π*2p", 7, 4, 2, false),
      level("sigma_star_2p", "σ*2p", 8, 2, 1, false),
    ]
  }

  return [
    ...base,
    level("sigma_2p", "σ2p", 5, 2, 1, true),
    level("pi_2p", "π2p", 6, 4, 2, true),
    level("pi_star_2p", "π*2p", 7, 4, 2, false),
    level("sigma_star_2p", "σ*2p", 8, 2, 1, false),
  ]
}

interface LevelState {
  occupancy: number
  cellOccupancy: number[]
  cellSpins: ("up" | "down")[][]
}

function placementRule(state: LevelState): ElectronPlacementStep["rule"] {
  if (state.occupancy === 0) return "Aufbau Principle"
  if (state.cellOccupancy.some((value) => value === 0)) return "Hund's Rule"
  return "Pauli Exclusion Principle"
}

function placeElectron(level: MolecularOrbitalLevel, state: LevelState): "up" | "down" {
  const emptyIndex = state.cellOccupancy.findIndex((value) => value === 0)
  if (emptyIndex >= 0) {
    state.cellOccupancy[emptyIndex] = 1
    state.cellSpins[emptyIndex].push("up")
    state.occupancy += 1
    return "up"
  }

  const singlyOccupiedIndex = state.cellOccupancy.findIndex((value) => value === 1)
  if (singlyOccupiedIndex >= 0 && state.cellOccupancy[singlyOccupiedIndex] < 2) {
    state.cellOccupancy[singlyOccupiedIndex] = 2
    state.cellSpins[singlyOccupiedIndex].push("down")
    state.occupancy += 1
    return "down"
  }

  throw new Error(`No capacity left in ${level.label}`)
}

function countUnpaired(state: LevelState): number {
  return state.cellOccupancy.filter((value) => value === 1).length
}

function calculateBondOrder(levels: MolecularOrbitalLevel[], states: Map<string, LevelState>) {
  let bonding = 0
  let antibonding = 0

  for (const level of levels) {
    const occupancy = states.get(level.id)?.occupancy ?? level.occupancy
    if (level.bonding) bonding += occupancy
    if (level.antibonding) antibonding += occupancy
  }

  return {
    bonding,
    antibonding,
    bondOrder: Number(((bonding - antibonding) / 2).toFixed(2)),
  }
}

function findHomoLumo(levels: MolecularOrbitalLevel[]) {
  const occupied = levels.filter((level) => level.occupancy > 0).sort((a, b) => b.energy - a.energy)
  const unfilled = levels.filter((level) => level.occupancy < level.capacity).sort((a, b) => a.energy - b.energy)

  return {
    homo: occupied[0] ?? null,
    lumo: unfilled.find((level) => level.energy > (occupied[0]?.energy ?? 0)) ?? unfilled[0] ?? null,
  }
}

export function listMolecularOrbitalSpecies(): SpeciesRecord[] {
  return SPECIES
}

export function buildMolecularOrbitalDiagram(speciesId: string): MolecularOrbitalResult {
  const species = SPECIES.find((item) => item.id === speciesId) ?? SPECIES.find((item) => item.id === "O2")!
  const levels = buildLevels(species.ordering)
  const states = new Map<string, LevelState>()
  const steps: ElectronPlacementStep[] = []
  let electronsRemaining = species.electronCount
  let electronNumber = 0

  for (const level of levels) {
    states.set(level.id, {
      occupancy: 0,
      cellOccupancy: Array.from({ length: level.degeneracy }, () => 0),
      cellSpins: Array.from({ length: level.degeneracy }, () => []),
    })
  }

  for (const level of levels) {
    const state = states.get(level.id)!
    while (electronsRemaining > 0 && state.occupancy < level.capacity) {
      const rule = placementRule(state)
      const spin = placeElectron(level, state)
      electronsRemaining -= 1
      electronNumber += 1
      const order = calculateBondOrder(levels, states)

      steps.push({
        step: steps.length + 1,
        orbitalId: level.id,
        orbitalLabel: level.label,
        electronSpin: spin,
        rule,
        electronNumber,
        explanation:
          rule === "Hund's Rule"
            ? `Electron ${electronNumber} enters a separate degenerate ${level.label} box before pairing.`
            : rule === "Pauli Exclusion Principle"
              ? `Electron ${electronNumber} pairs with opposite spin in ${level.label}.`
              : `Electron ${electronNumber} fills the lowest available level, ${level.label}.`,
        bondOrder: order.bondOrder,
      })
    }
  }

  for (const orbital of levels) {
    const state = states.get(orbital.id)!
    orbital.occupancy = state.occupancy
    orbital.unpairedElectrons = countUnpaired(state)
  }

  const order = calculateBondOrder(levels, states)
  const unpairedElectrons = levels.reduce((sum, level) => sum + level.unpairedElectrons, 0)
  const { homo, lumo } = findHomoLumo(levels)
  const orderingName =
    species.ordering === "first-row-light"
      ? "B2/C2/N2 ordering: π2p below σ2p"
      : species.ordering === "hydrogenic"
        ? "Hydrogenic 1s ordering"
        : species.ordering === "heteronuclear"
          ? "Intro heteronuclear ordering"
          : "O2/F2/Ne2 ordering: σ2p below π2p"

  return {
    speciesId: species.id,
    displayName: species.displayName,
    electronCount: species.electronCount,
    ordering: orderingName,
    orbitals: levels,
    fillingSteps: steps,
    bondOrder: order.bondOrder,
    bondingElectrons: order.bonding,
    antibondingElectrons: order.antibonding,
    unpairedElectrons,
    magnetism: unpairedElectrons > 0 ? "Paramagnetic" : "Diamagnetic",
    homo,
    lumo,
    explanation: `${species.note} Bond order is (${order.bonding} bonding electrons - ${order.antibonding} antibonding electrons) / 2 = ${order.bondOrder}.`,
  }
}

export function getBondOrderEquation(result: MolecularOrbitalResult): string {
  return `(${result.bondingElectrons} - ${result.antibondingElectrons}) / 2 = ${result.bondOrder}`
}

export const HOMO_LUMO_EXAMPLES: HomoLumoExample[] = [
  {
    id: "o2",
    name: "O2",
    electronCount: 16,
    homo: "π*2p",
    lumo: "σ*2p",
    energyGap: "Moderate",
    explanation: "O2 has two unpaired electrons in degenerate π*2p orbitals, so π*2p is the HOMO.",
  },
  {
    id: "o2-plus",
    name: "O2+",
    electronCount: 15,
    homo: "π*2p",
    lumo: "π*2p / σ*2p",
    energyGap: "Moderate-high",
    explanation: "Removing one antibonding electron increases bond order and leaves one π*2p electron.",
  },
  {
    id: "ethylene",
    name: "Ethylene",
    electronCount: 12,
    homo: "π C=C",
    lumo: "π* C=C",
    energyGap: "Organic pi gap",
    explanation: "The filled C=C pi orbital is the HOMO; the antibonding pi orbital is the LUMO.",
  },
  {
    id: "benzene",
    name: "Benzene",
    electronCount: 42,
    homo: "Degenerate filled π orbitals",
    lumo: "Degenerate π* orbitals",
    energyGap: "Aromatic pi gap",
    explanation: "Six pi electrons fill the bonding aromatic pi levels and leave antibonding pi levels empty.",
  },
  {
    id: "no",
    name: "NO",
    electronCount: 15,
    homo: "π*2p",
    lumo: "π*2p / σ*2p",
    energyGap: "Small radical gap",
    explanation: "NO has an odd electron in a π* orbital, giving radical and paramagnetic behavior.",
  },
  {
    id: "co",
    name: "CO",
    electronCount: 14,
    homo: "5σ",
    lumo: "2π*",
    energyGap: "Large donor-acceptor gap",
    explanation: "CO's high-energy filled sigma orbital can donate electron density to metals.",
  },
]
