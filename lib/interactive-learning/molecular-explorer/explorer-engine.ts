import { getElementInfo, getExplorerMolecule, listExplorerMolecules } from "./examples"
import type {
  AtomInspection,
  BondInspection,
  ExplorerAtom,
  ExplorerBond,
  ExplorerBondOrder,
  ExplorerElectronSet,
  ExplorerFunctionalGroup,
  ExplorerHybridization,
  ExplorerLayerId,
  ExplorerLearningCard,
  ExplorerMolecule,
  ExplorerReasoningNode,
  ExplorerRing,
  SerializedExplorerGraph,
} from "./types"

export const EXPLORER_LAYER_IDS: ExplorerLayerId[] = [
  "atom-labels",
  "bond-order",
  "sigma-framework",
  "pi-framework",
  "lone-pairs",
  "formal-charges",
  "hybridization",
  "aromatic-atoms",
  "conjugated-atoms",
  "delocalized-electrons",
  "homo",
  "lumo",
  "ring-system",
  "functional-groups",
  "electron-domains",
  "orbital-orientation",
]

export const EXPLORER_LAYER_LABELS: Record<ExplorerLayerId, string> = {
  "atom-labels": "Atom labels",
  "bond-order": "Bond order",
  "sigma-framework": "Sigma framework",
  "pi-framework": "Pi framework",
  "lone-pairs": "Lone pairs",
  "formal-charges": "Formal charges",
  hybridization: "Hybridization",
  "aromatic-atoms": "Aromatic atoms",
  "conjugated-atoms": "Conjugated atoms",
  "delocalized-electrons": "Delocalized electrons",
  homo: "HOMO",
  lumo: "LUMO",
  "ring-system": "Ring system",
  "functional-groups": "Functional groups",
  "electron-domains": "Electron domains",
  "orbital-orientation": "Orbital orientation",
}

export function molecularExplorerHref(options: { compound?: string; graph?: string } = {}) {
  const params = new URLSearchParams()
  if (options.compound) params.set("compound", options.compound)
  if (options.graph) params.set("graph", options.graph)
  const query = params.toString()
  return query ? `/interactive-learning/explorer?${query}` : "/interactive-learning/explorer"
}

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/\+/g, "plus")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function bondOrderValue(order: ExplorerBondOrder): number {
  if (order === "aromatic") return 1.5
  return order
}

function inferHybridization(atom: ExplorerAtom, bonds: ExplorerBond[]): ExplorerHybridization {
  if (atom.element === "H") return "none"
  const attached = bonds.filter((bond) => bond.from === atom.id || bond.to === atom.id)
  if (attached.some((bond) => bond.order === 3)) return "sp"
  if (attached.some((bond) => bond.order === 2 || bond.order === "aromatic") || atom.aromatic || atom.conjugated) return "sp2"
  return "sp3"
}

function electronDomainsForHybridization(hybridization: ExplorerHybridization) {
  if (hybridization === "sp") return 2
  if (hybridization === "sp2") return 3
  if (hybridization === "sp3d") return 5
  if (hybridization === "sp3d2") return 6
  if (hybridization === "none") return 1
  return 4
}

function geometryForHybridization(hybridization: ExplorerHybridization) {
  if (hybridization === "sp") return "linear" as const
  if (hybridization === "sp2") return "trigonal planar" as const
  if (hybridization === "sp3") return "tetrahedral" as const
  if (hybridization === "sp3d2") return "octahedral" as const
  return "none" as const
}

function makeAtom(id: string, element: string, x: number, y: number, bonds: ExplorerBond[], overrides: Partial<ExplorerAtom> = {}): ExplorerAtom {
  const info = getElementInfo(element)
  const placeholder: ExplorerAtom = {
    id,
    element,
    x,
    y,
    formalCharge: overrides.formalCharge ?? 0,
    hybridization: "none",
    geometry: "none",
    electronDomains: 1,
    bondCount: 0,
    sigmaBonds: 0,
    piBonds: 0,
    lonePairs: element === "O" ? 2 : element === "N" ? 1 : 0,
    unpairedElectrons: 0,
    valenceElectrons: info.valenceElectrons,
    conjugated: overrides.conjugated ?? false,
    delocalized: overrides.delocalized ?? false,
    aromatic: overrides.aromatic ?? false,
    ringIds: overrides.ringIds ?? [],
    functionalGroupIds: overrides.functionalGroupIds ?? [],
    homoContribution: overrides.homoContribution ?? 0,
    lumoContribution: overrides.lumoContribution ?? 0,
    orbitalContribution: overrides.orbitalContribution ?? "scanner graph atom",
    electronegativity: info.electronegativity,
    confidence: overrides.confidence ?? 72,
  }
  const connected = bonds.filter((bond) => bond.from === id || bond.to === id)
  const hybridization = overrides.hybridization ?? inferHybridization(placeholder, connected)
  return {
    ...placeholder,
    ...overrides,
    hybridization,
    geometry: overrides.geometry ?? geometryForHybridization(hybridization),
    electronDomains: overrides.electronDomains ?? electronDomainsForHybridization(hybridization),
    bondCount: connected.length,
    sigmaBonds: connected.reduce((sum, bond) => sum + bond.sigmaBonds, 0),
    piBonds: connected.reduce((sum, bond) => sum + bond.piBonds, 0),
  }
}

function makeBond(id: string, from: string, to: string, order: ExplorerBondOrder): ExplorerBond {
  const piBonds = order === 2 ? 1 : order === 3 ? 2 : order === "aromatic" ? 0.5 : 0
  return {
    id,
    from,
    to,
    order,
    normalizedLength: 1,
    sigmaBonds: 1,
    piBonds,
    localized: order !== "aromatic",
    delocalized: order === "aromatic",
    rotatable: order === 1,
    ringMember: false,
    conjugated: order !== 1,
    aromatic: order === "aromatic",
    orbitalOverlap: piBonds ? "sigma overlap plus side-by-side p overlap" : "head-on sigma overlap",
    confidence: 72,
    functionalGroupIds: [],
  }
}

function normalizeBondOrder(value: unknown): ExplorerBondOrder {
  if (value === "aromatic") return "aromatic"
  if (value === 3 || value === "3") return 3
  if (value === 2 || value === "2") return 2
  return 1
}

export function parseSerializedExplorerGraph(value: string | null | undefined): SerializedExplorerGraph | null {
  if (!value) return null
  const candidates = [value]
  try {
    candidates.push(decodeURIComponent(value))
  } catch {
    // Keep the raw value as the only candidate.
  }
  if (typeof window !== "undefined") {
    try {
      candidates.push(window.atob(value))
    } catch {
      // URL query may not be base64; ignore.
    }
  }
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate) as SerializedExplorerGraph
      if (Array.isArray(parsed.atoms) && Array.isArray(parsed.bonds)) return parsed
    } catch {
      // Try the next decoding strategy.
    }
  }
  return null
}

export function buildExplorerFromSerializedGraph(graph: SerializedExplorerGraph): ExplorerMolecule {
  const bonds = graph.bonds.map((bondRecord, index) => {
    const from = String(bondRecord.from ?? bondRecord.startNodeId ?? "")
    const to = String(bondRecord.to ?? bondRecord.endNodeId ?? "")
    return makeBond(String(bondRecord.id ?? `b${index + 1}`), from, to, normalizeBondOrder(bondRecord.order ?? bondRecord.bondOrder))
  }).filter((bondRecord) => bondRecord.from && bondRecord.to)

  const rings: ExplorerRing[] = (graph.rings ?? []).map((ringRecord, index) => {
    const atomIds = (ringRecord.atomIds ?? ringRecord.nodeIds ?? []).map(String)
    return {
      id: String(ringRecord.id ?? `ring${index + 1}`),
      atomIds,
      aromatic: Boolean(ringRecord.aromatic),
      electronCount: ringRecord.aromatic ? 6 : 0,
      label: ringRecord.aromatic ? "Imported aromatic ring" : "Imported ring",
    }
  })

  const ringAtomSet = new Set(rings.flatMap((ring) => ring.atomIds))
  const aromaticAtomSet = new Set(rings.filter((ring) => ring.aromatic).flatMap((ring) => ring.atomIds))

  const atoms = graph.atoms.map((atomRecord, index) => {
    const id = String(atomRecord.id)
    const ringIds = rings.filter((ringRecord) => ringRecord.atomIds.includes(id)).map((ringRecord) => ringRecord.id)
    return makeAtom(
      id,
      atomRecord.element ?? "C",
      typeof atomRecord.x === "number" ? atomRecord.x : 120 + index * 54,
      typeof atomRecord.y === "number" ? atomRecord.y : 180 + (index % 2) * 36,
      bonds,
      {
        formalCharge: atomRecord.charge ?? 0,
        aromatic: aromaticAtomSet.has(id),
        conjugated: aromaticAtomSet.has(id),
        delocalized: aromaticAtomSet.has(id),
        ringIds,
        homoContribution: aromaticAtomSet.has(id) ? 12 : 0,
        lumoContribution: aromaticAtomSet.has(id) ? 12 : 0,
      },
    )
  })

  const ringBondIds = new Set<string>()
  for (const ringRecord of rings) {
    const atomSet = new Set(ringRecord.atomIds)
    for (const bondRecord of bonds) {
      if (atomSet.has(bondRecord.from) && atomSet.has(bondRecord.to)) ringBondIds.add(bondRecord.id)
    }
  }

  const updatedBonds = bonds.map((bondRecord) => {
    const ringMember = ringBondIds.has(bondRecord.id)
    const aromatic = bondRecord.order === "aromatic" || (ringMember && aromaticAtomSet.has(bondRecord.from) && aromaticAtomSet.has(bondRecord.to))
    return {
      ...bondRecord,
      ringMember,
      aromatic,
      conjugated: bondRecord.conjugated || aromatic || ringMember,
      delocalized: bondRecord.delocalized || aromatic,
      rotatable: bondRecord.rotatable && !ringMember && bondRecord.order === 1,
    }
  })

  const functionalGroups = inferFunctionalGroups(atoms, updatedBonds)
  const electronSets = inferElectronSets(atoms, updatedBonds, rings)

  return {
    id: normalize(graph.name) || "scanner-graph",
    name: graph.name ?? "Scanner Graph",
    formula: graph.formula ?? estimateFormula(atoms),
    source: "scanner-graph",
    atoms,
    bonds: updatedBonds,
    rings,
    functionalGroups,
    electronSets,
    notes: "Imported deterministic scanner graph. Properties are estimated from graph topology and local element rules.",
  }
}

function estimateFormula(atoms: ExplorerAtom[]) {
  const counts = new Map<string, number>()
  for (const atomRecord of atoms) counts.set(atomRecord.element, (counts.get(atomRecord.element) ?? 0) + 1)
  return Array.from(counts.entries())
    .sort(([a], [b]) => (a === "C" ? -1 : b === "C" ? 1 : a === "H" ? -1 : b === "H" ? 1 : a.localeCompare(b)))
    .map(([element, count]) => `${element}${count > 1 ? count : ""}`)
    .join("")
}

function inferFunctionalGroups(atoms: ExplorerAtom[], bonds: ExplorerBond[]): ExplorerFunctionalGroup[] {
  const groups: ExplorerFunctionalGroup[] = []
  const atomMap = new Map(atoms.map((atomRecord) => [atomRecord.id, atomRecord]))
  const carbonyl = bonds.find((bondRecord) => bondRecord.order === 2 && [bondRecord.from, bondRecord.to].some((atomId) => atomMap.get(atomId)?.element === "O"))
  const alcoholO = atoms.find((atomRecord) => atomRecord.element === "O" && !carbonyl)
  const areneAtoms = atoms.filter((atomRecord) => atomRecord.aromatic)

  if (carbonyl) {
    groups.push({
      id: "carbonyl",
      name: "Carbonyl",
      atomIds: [carbonyl.from, carbonyl.to],
      bondIds: [carbonyl.id],
      definition: "C=O double bond detected from graph topology.",
      properties: ["Polar pi bond", "sp2 carbon center"],
      commonReactions: ["nucleophilic addition", "oxidation/reduction patterns"],
      hybridization: "Carbonyl carbon is sp2 in the deterministic model.",
      electronFlow: "The pi bond is polarized toward oxygen.",
      examples: ["aldehydes", "ketones", "carboxylic acids", "esters"],
    })
  }
  if (alcoholO) {
    groups.push({
      id: "alcohol",
      name: "Alcohol / ether-like oxygen",
      atomIds: [alcoholO.id],
      bondIds: bonds.filter((bondRecord) => bondRecord.from === alcoholO.id || bondRecord.to === alcoholO.id).map((bondRecord) => bondRecord.id),
      definition: "Oxygen with single sigma bonds and lone pairs.",
      properties: ["Hydrogen bonding possible when O-H is present", "sp3 oxygen center"],
      commonReactions: ["oxidation", "substitution", "esterification"],
      hybridization: "Oxygen is treated as sp3 unless conjugation is detected.",
      electronFlow: "Lone pairs can act as electron donors.",
      examples: ["ethanol", "water"],
    })
  }
  if (areneAtoms.length >= 5) {
    groups.push({
      id: "arene",
      name: "Aromatic ring",
      atomIds: areneAtoms.map((atomRecord) => atomRecord.id),
      bondIds: bonds.filter((bondRecord) => bondRecord.aromatic).map((bondRecord) => bondRecord.id),
      definition: "Ring atoms marked aromatic by the imported graph.",
      properties: ["Delocalized pi electrons", "Restricted bond localization"],
      commonReactions: ["electrophilic aromatic substitution"],
      hybridization: "Aromatic atoms are sp2 with aligned p orbitals.",
      electronFlow: "Pi electrons are delocalized around the ring.",
      examples: ["benzene", "phenol", "pyridine"],
    })
  }
  return groups
}

function inferElectronSets(atoms: ExplorerAtom[], bonds: ExplorerBond[], rings: ExplorerRing[]): ExplorerElectronSet[] {
  const sets: ExplorerElectronSet[] = []
  const piBonds = bonds.filter((bondRecord) => bondRecord.piBonds > 0)
  const lonePairAtoms = atoms.filter((atomRecord) => atomRecord.lonePairs > 0)
  const aromaticRing = rings.find((ringRecord) => ringRecord.aromatic)

  if (piBonds.length) {
    sets.push({
      id: "pi-imported",
      label: "Imported pi framework",
      kind: "pi",
      atomIds: Array.from(new Set(piBonds.flatMap((bondRecord) => [bondRecord.from, bondRecord.to]))),
      bondIds: piBonds.map((bondRecord) => bondRecord.id),
      electronCount: piBonds.reduce((sum, bondRecord) => sum + bondRecord.piBonds * 2, 0),
      resonanceParticipant: true,
      origin: "bond order inference",
      explanation: "Pi electrons are inferred from imported double, triple, or aromatic bond orders.",
    })
  }
  if (aromaticRing) {
    sets.push({
      id: "aromatic-imported",
      label: "Aromatic delocalized electrons",
      kind: "delocalized",
      atomIds: aromaticRing.atomIds,
      bondIds: bonds.filter((bondRecord) => bondRecord.aromatic).map((bondRecord) => bondRecord.id),
      electronCount: aromaticRing.electronCount || 6,
      resonanceParticipant: true,
      origin: "ring aromatic flag",
      explanation: "Aromatic ring evidence creates a delocalized electron set.",
    })
  }
  for (const atomRecord of lonePairAtoms) {
    sets.push({
      id: `lp-${atomRecord.id}`,
      label: `${atomRecord.element} lone pairs`,
      kind: "lone-pair",
      atomIds: [atomRecord.id],
      bondIds: [],
      electronCount: atomRecord.lonePairs * 2,
      resonanceParticipant: atomRecord.conjugated,
      origin: "valence electron count",
      explanation: `${atomRecord.element} is assigned ${atomRecord.lonePairs} lone pair set(s) from deterministic valence rules.`,
    })
  }
  return sets
}

export function resolveExplorerMolecule(options: { compound?: string | null; graph?: string | null } = {}): ExplorerMolecule {
  const parsedGraph = parseSerializedExplorerGraph(options.graph)
  if (parsedGraph) return buildExplorerFromSerializedGraph(parsedGraph)
  return getExplorerMolecule(options.compound)
}

function findBondAtoms(molecule: ExplorerMolecule, bondRecord: ExplorerBond): [ExplorerAtom, ExplorerAtom] {
  const from = molecule.atoms.find((atomRecord) => atomRecord.id === bondRecord.from)
  const to = molecule.atoms.find((atomRecord) => atomRecord.id === bondRecord.to)
  if (!from || !to) throw new Error(`Bond ${bondRecord.id} references missing atoms`)
  return [from, to]
}

function reasoningNode(id: string, title: string, status: ExplorerReasoningNode["status"] = "info", children?: ExplorerReasoningNode[]): ExplorerReasoningNode {
  return { id, title, status, children }
}

export function inspectAtom(molecule: ExplorerMolecule, atomId: string | null | undefined): AtomInspection {
  const atomRecord = molecule.atoms.find((item) => item.id === atomId) ?? molecule.atoms[0]
  const connectedBonds = molecule.bonds.filter((bondRecord) => bondRecord.from === atomRecord.id || bondRecord.to === atomRecord.id)
  const elementInfo = getElementInfo(atomRecord.element)
  const reasoning: ExplorerReasoningNode[] = [
    reasoningNode("element", `${elementInfo.name} has atomic number ${elementInfo.atomicNumber} and ${elementInfo.valenceElectrons} valence electron(s).`, "info"),
    reasoningNode("hybridization", `${atomRecord.electronDomains} electron domain(s) support ${atomRecord.hybridization} hybridization and ${atomRecord.geometry} geometry.`, atomRecord.hybridization === "none" ? "info" : "pass"),
    reasoningNode("bonding", `${atomRecord.sigmaBonds} sigma bond(s), ${atomRecord.piBonds} pi bond component(s), ${atomRecord.lonePairs} lone pair set(s), and ${atomRecord.unpairedElectrons} unpaired electron(s).`, "info"),
    reasoningNode("delocalization", atomRecord.aromatic
      ? "This atom is part of an aromatic ring, so its p orbital participates in delocalized pi bonding."
      : atomRecord.conjugated
        ? "This atom is conjugated because at least one adjacent p orbital or pi bond is aligned."
        : "No deterministic delocalization flag is assigned to this atom.",
    atomRecord.aromatic || atomRecord.conjugated ? "pass" : "info"),
    reasoningNode("confidence", `Atom-level educational annotation confidence: ${Math.round(atomRecord.confidence)}%.`, atomRecord.confidence >= 80 ? "pass" : "warning"),
  ]

  const cards: ExplorerLearningCard[] = [
    {
      id: `hybrid-${atomRecord.id}`,
      title: `Why this atom is ${atomRecord.hybridization}`,
      body: atomRecord.hybridization === "sp2"
        ? "Three electron domains leave one unhybridized p orbital available for pi bonding or conjugation."
        : atomRecord.hybridization === "sp3"
          ? "Four electron domains point toward tetrahedral orbital directions and usually create localized sigma bonds."
          : atomRecord.hybridization === "sp"
            ? "Two electron domains create a linear center with two perpendicular p orbitals available for pi bonding."
            : "Hydrogen contributes a 1s orbital rather than hybrid orbitals.",
      targetType: "atom",
      targetId: atomRecord.id,
    },
    {
      id: `electron-${atomRecord.id}`,
      title: "Electron-domain view",
      body: `ARSHLAB counts local bonding domains, pi components, lone pairs, and charges before assigning geometry or overlay colors.`,
      targetType: "atom",
      targetId: atomRecord.id,
    },
  ]

  if (atomRecord.aromatic || atomRecord.delocalized) {
    cards.push({
      id: `deloc-${atomRecord.id}`,
      title: "Why this atom joins delocalization",
      body: "The atom has an aligned p orbital in a conjugated or aromatic pathway, so its electrons can be shared across more than one bond.",
      targetType: "atom",
      targetId: atomRecord.id,
    })
  }

  return { atom: atomRecord, elementInfo, connectedBonds, reasoning, cards }
}

export function inspectBond(molecule: ExplorerMolecule, bondId: string | null | undefined): BondInspection {
  const bondRecord = molecule.bonds.find((item) => item.id === bondId) ?? molecule.bonds[0]
  const atoms = findBondAtoms(molecule, bondRecord)
  const reasoning: ExplorerReasoningNode[] = [
    reasoningNode("order", `Bond order ${bondRecord.order} gives ${bondRecord.sigmaBonds} sigma component(s) and ${bondRecord.piBonds} pi component(s).`, "pass"),
    reasoningNode("rotation", bondRecord.rotatable
      ? "This bond is rotatable because it is a localized single sigma bond outside a ring."
      : "Rotation is restricted by pi overlap, ring membership, or aromatic delocalization.",
    bondRecord.rotatable ? "info" : "pass"),
    reasoningNode("orbital-overlap", bondRecord.orbitalOverlap, "info"),
    reasoningNode("delocalization", bondRecord.aromatic
      ? "Aromatic bond notation means the pi electrons are distributed around the ring instead of locked into one localized double bond."
      : bondRecord.conjugated
        ? "This bond is in a conjugated path."
        : "This bond is treated as localized.",
    bondRecord.aromatic || bondRecord.conjugated ? "pass" : "info"),
    reasoningNode("confidence", `Bond-level educational annotation confidence: ${Math.round(bondRecord.confidence)}%.`, bondRecord.confidence >= 80 ? "pass" : "warning"),
  ]

  const cards: ExplorerLearningCard[] = [
    {
      id: `sigma-${bondRecord.id}`,
      title: "Why this bond has a sigma component",
      body: "Every covalent bond starts with one sigma component from head-on orbital overlap.",
      targetType: "bond",
      targetId: bondRecord.id,
    },
  ]
  if (bondRecord.piBonds > 0 || bondRecord.aromatic) {
    cards.push({
      id: `pi-${bondRecord.id}`,
      title: "Where the pi electrons are",
      body: "Pi electrons sit above and below the sigma framework in p orbitals, so they restrict rotation and can delocalize.",
      targetType: "bond",
      targetId: bondRecord.id,
    })
  }
  if (!bondRecord.rotatable) {
    cards.push({
      id: `rotate-${bondRecord.id}`,
      title: "Why this bond cannot freely rotate",
      body: "Rotation would break side-by-side p orbital overlap or distort a ring, so the deterministic model marks it restricted.",
      targetType: "bond",
      targetId: bondRecord.id,
    })
  }

  return { bond: bondRecord, atoms, reasoning, cards }
}

export function getMoleculeLearningCards(molecule: ExplorerMolecule): ExplorerLearningCard[] {
  const cards: ExplorerLearningCard[] = [
    {
      id: "sigma-framework",
      title: "Why this molecule has sigma bonds",
      body: `${molecule.name} has ${molecule.bonds.length} drawn bond(s). Each one contributes a sigma framework used to hold the skeleton together.`,
      targetType: "molecule",
    },
    {
      id: "hybridization-map",
      title: "Which atoms are sp, sp2, or sp3",
      body: "Hybridization labels come from local electron domains, bond order, and aromatic/conjugation annotations.",
      targetType: "molecule",
    },
  ]
  const piCount = molecule.bonds.reduce((sum, bondRecord) => sum + bondRecord.piBonds, 0)
  if (piCount > 0 || molecule.rings.some((ringRecord) => ringRecord.aromatic)) {
    cards.push({
      id: "pi-electrons",
      title: "Where the pi electrons are",
      body: "Pi overlays highlight double, triple, aromatic, or delocalized regions where p orbitals overlap side-by-side.",
      targetType: "molecule",
    })
  }
  if (molecule.rings.length) {
    cards.push({
      id: "aromaticity",
      title: "Why this is or is not aromatic",
      body: molecule.rings.some((ringRecord) => ringRecord.aromatic)
        ? "The aromatic ring layer marks cyclic conjugation with a Huckel-style pi-electron count."
        : "This molecule has a ring, but the local data does not mark a continuous aromatic pi system.",
      targetType: "molecule",
    })
  }
  cards.push({
    id: "homo-lumo",
    title: "How HOMO/LUMO relates to reactivity",
    body: "HOMO and LUMO overlays are conceptual: larger highlighted contributions suggest where frontier orbital reasoning starts.",
    targetType: "molecule",
  })
  return cards
}

export function summarizeElectronExplorer(molecule: ExplorerMolecule) {
  const sigmaElectrons = molecule.bonds.reduce((sum, bondRecord) => sum + bondRecord.sigmaBonds * 2, 0)
  const piElectrons = molecule.bonds.reduce((sum, bondRecord) => sum + bondRecord.piBonds * 2, 0)
  const lonePairElectrons = molecule.atoms.reduce((sum, atomRecord) => sum + atomRecord.lonePairs * 2, 0)
  const formalChargeCount = molecule.atoms.filter((atomRecord) => atomRecord.formalCharge !== 0).length
  return {
    sigmaElectrons,
    piElectrons,
    lonePairElectrons,
    formalChargeCount,
    delocalizedElectronSets: molecule.electronSets.filter((set) => set.kind === "delocalized"),
  }
}

export function getMoleculeMetrics(molecule: ExplorerMolecule) {
  return {
    atomCount: molecule.atoms.length,
    bondCount: molecule.bonds.length,
    functionalGroupCount: molecule.functionalGroups.length,
    ringCount: molecule.rings.length,
    aromaticRingCount: molecule.rings.filter((ringRecord) => ringRecord.aromatic).length,
    sigmaBondCount: molecule.bonds.reduce((sum, bondRecord) => sum + bondRecord.sigmaBonds, 0),
    piBondCount: molecule.bonds.reduce((sum, bondRecord) => sum + bondRecord.piBonds, 0),
  }
}

export function getExplorerExampleOptions() {
  return listExplorerMolecules().map((molecule) => ({
    id: molecule.id,
    name: molecule.name,
    formula: molecule.formula,
    groups: molecule.functionalGroups.map((group) => group.name),
  }))
}

export function getExplorerMoleculeById(id: string | null | undefined) {
  return getExplorerMolecule(id)
}

export function orderDescription(order: ExplorerBondOrder) {
  if (order === "aromatic") return "aromatic"
  if (order === 3) return "triple"
  if (order === 2) return "double"
  return "single"
}

export function bondOrderNumber(order: ExplorerBondOrder) {
  return bondOrderValue(order)
}
