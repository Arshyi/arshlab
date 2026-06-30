import type {
  ExplorerAtom,
  ExplorerBond,
  ExplorerBondOrder,
  ExplorerElectronSet,
  ExplorerFunctionalGroup,
  ExplorerGeometry,
  ExplorerHybridization,
  ExplorerMolecule,
  ExplorerRing,
} from "./types"

export const ELEMENT_INFO = {
  H: { element: "H", name: "Hydrogen", atomicNumber: 1, atomicMass: 1.008, valenceElectrons: 1, electronegativity: 2.2 },
  C: { element: "C", name: "Carbon", atomicNumber: 6, atomicMass: 12.011, valenceElectrons: 4, electronegativity: 2.55 },
  N: { element: "N", name: "Nitrogen", atomicNumber: 7, atomicMass: 14.007, valenceElectrons: 5, electronegativity: 3.04 },
  O: { element: "O", name: "Oxygen", atomicNumber: 8, atomicMass: 15.999, valenceElectrons: 6, electronegativity: 3.44 },
  S: { element: "S", name: "Sulfur", atomicNumber: 16, atomicMass: 32.06, valenceElectrons: 6, electronegativity: 2.58 },
  P: { element: "P", name: "Phosphorus", atomicNumber: 15, atomicMass: 30.974, valenceElectrons: 5, electronegativity: 2.19 },
  F: { element: "F", name: "Fluorine", atomicNumber: 9, atomicMass: 18.998, valenceElectrons: 7, electronegativity: 3.98 },
  Cl: { element: "Cl", name: "Chlorine", atomicNumber: 17, atomicMass: 35.45, valenceElectrons: 7, electronegativity: 3.16 },
  Br: { element: "Br", name: "Bromine", atomicNumber: 35, atomicMass: 79.904, valenceElectrons: 7, electronegativity: 2.96 },
  I: { element: "I", name: "Iodine", atomicNumber: 53, atomicMass: 126.9, valenceElectrons: 7, electronegativity: 2.66 },
} as const

type KnownElement = keyof typeof ELEMENT_INFO

const geometryByHybridization: Record<ExplorerHybridization, ExplorerGeometry> = {
  sp: "linear",
  sp2: "trigonal planar",
  sp3: "tetrahedral",
  sp3d: "trigonal planar",
  sp3d2: "octahedral",
  none: "none",
}

function atom(
  id: string,
  element: KnownElement,
  x: number,
  y: number,
  options: Partial<ExplorerAtom> = {},
): ExplorerAtom {
  const info = ELEMENT_INFO[element]
  const hybridization = options.hybridization ?? (element === "H" ? "none" : "sp3")
  return {
    id,
    element,
    x,
    y,
    formalCharge: options.formalCharge ?? 0,
    hybridization,
    geometry: options.geometry ?? geometryByHybridization[hybridization],
    electronDomains: options.electronDomains ?? (hybridization === "sp" ? 2 : hybridization === "sp2" ? 3 : hybridization === "none" ? 1 : 4),
    bondCount: options.bondCount ?? 0,
    sigmaBonds: options.sigmaBonds ?? 0,
    piBonds: options.piBonds ?? 0,
    lonePairs: options.lonePairs ?? (element === "O" ? 2 : element === "N" ? 1 : 0),
    unpairedElectrons: options.unpairedElectrons ?? 0,
    valenceElectrons: info.valenceElectrons,
    conjugated: options.conjugated ?? false,
    delocalized: options.delocalized ?? false,
    aromatic: options.aromatic ?? false,
    ringIds: options.ringIds ?? [],
    functionalGroupIds: options.functionalGroupIds ?? [],
    homoContribution: options.homoContribution ?? 0,
    lumoContribution: options.lumoContribution ?? 0,
    orbitalContribution: options.orbitalContribution ?? `${hybridization} valence orbital model`,
    electronegativity: options.electronegativity ?? info.electronegativity,
    confidence: options.confidence ?? 96,
  }
}

function bond(
  id: string,
  from: string,
  to: string,
  order: ExplorerBondOrder,
  options: Partial<ExplorerBond> = {},
): ExplorerBond {
  const piBonds = order === 2 ? 1 : order === 3 ? 2 : order === "aromatic" ? 0.5 : 0
  return {
    id,
    from,
    to,
    order,
    normalizedLength: options.normalizedLength ?? 1,
    sigmaBonds: options.sigmaBonds ?? 1,
    piBonds: options.piBonds ?? piBonds,
    localized: options.localized ?? order !== "aromatic",
    delocalized: options.delocalized ?? order === "aromatic",
    rotatable: options.rotatable ?? (order === 1 && !options.ringMember),
    ringMember: options.ringMember ?? false,
    conjugated: options.conjugated ?? order !== 1,
    aromatic: options.aromatic ?? order === "aromatic",
    orbitalOverlap: options.orbitalOverlap ?? (piBonds ? "one sigma overlap plus side-by-side p overlap" : "head-on sigma overlap"),
    confidence: options.confidence ?? 96,
    functionalGroupIds: options.functionalGroupIds ?? [],
  }
}

function functionalGroup(
  id: string,
  name: string,
  atomIds: string[],
  bondIds: string[],
  definition: string,
  options: Partial<ExplorerFunctionalGroup> = {},
): ExplorerFunctionalGroup {
  return {
    id,
    name,
    atomIds,
    bondIds,
    definition,
    properties: options.properties ?? ["Local bonding pattern is detected from deterministic example graph data."],
    commonReactions: options.commonReactions ?? [],
    hybridization: options.hybridization ?? "Use local atom hybridization labels in the inspector.",
    electronFlow: options.electronFlow ?? "Electron flow is described conceptually from the local functional group model.",
    examples: options.examples ?? [],
  }
}

function electronSet(
  id: string,
  label: string,
  kind: ExplorerElectronSet["kind"],
  atomIds: string[],
  bondIds: string[],
  electronCount: number,
  explanation: string,
): ExplorerElectronSet {
  return {
    id,
    label,
    kind,
    atomIds,
    bondIds,
    electronCount,
    resonanceParticipant: kind === "pi" || kind === "delocalized",
    origin: kind === "lone-pair" ? "heteroatom valence electrons" : "bonding orbital",
    explanation,
  }
}

function ring(id: string, atomIds: string[], aromatic: boolean, label: string): ExplorerRing {
  return { id, atomIds, aromatic, electronCount: aromatic ? 6 : 0, label }
}

function finalize(record: ExplorerMolecule): ExplorerMolecule {
  const bondCounts = new Map<string, { count: number; sigma: number; pi: number }>()
  for (const atomRecord of record.atoms) {
    bondCounts.set(atomRecord.id, { count: 0, sigma: 0, pi: 0 })
  }
  for (const bondRecord of record.bonds) {
    for (const atomId of [bondRecord.from, bondRecord.to]) {
      const current = bondCounts.get(atomId)
      if (current) {
        current.count += 1
        current.sigma += bondRecord.sigmaBonds
        current.pi += bondRecord.piBonds
      }
    }
  }

  return {
    ...record,
    atoms: record.atoms.map((atomRecord) => {
      const counts = bondCounts.get(atomRecord.id)
      return counts
        ? { ...atomRecord, bondCount: counts.count, sigmaBonds: counts.sigma, piBonds: counts.pi }
        : atomRecord
    }),
  }
}

function molecule(input: ExplorerMolecule): ExplorerMolecule {
  return finalize(input)
}

function benzeneRing(prefix = "c", centerX = 260, centerY = 180, radius = 90) {
  return Array.from({ length: 6 }, (_, index) => {
    const angle = (-90 + index * 60) * (Math.PI / 180)
    return atom(`${prefix}${index + 1}`, "C", centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle), {
      hybridization: "sp2",
      geometry: "trigonal planar",
      electronDomains: 3,
      conjugated: true,
      delocalized: true,
      aromatic: true,
      ringIds: ["ring1"],
      homoContribution: 16,
      lumoContribution: 16,
      orbitalContribution: "aligned p orbital in the aromatic pi system",
    })
  })
}

function benzeneBonds(prefix = "b", atomPrefix = "c") {
  return Array.from({ length: 6 }, (_, index) => {
    const from = `${atomPrefix}${index + 1}`
    const to = `${atomPrefix}${index === 5 ? 1 : index + 2}`
    return bond(`${prefix}${index + 1}`, from, to, "aromatic", {
      ringMember: true,
      conjugated: true,
      aromatic: true,
      delocalized: true,
      rotatable: false,
      orbitalOverlap: "aromatic sigma framework plus delocalized p overlap",
    })
  })
}

const methane = molecule({
  id: "methane",
  name: "Methane",
  formula: "CH4",
  source: "example",
  atoms: [
    atom("c1", "C", 260, 180, { hybridization: "sp3", electronDomains: 4, geometry: "tetrahedral", orbitalContribution: "four sp3 orbitals form sigma bonds" }),
    atom("h1", "H", 260, 80),
    atom("h2", "H", 370, 180),
    atom("h3", "H", 260, 280),
    atom("h4", "H", 150, 180),
  ],
  bonds: [
    bond("b1", "c1", "h1", 1),
    bond("b2", "c1", "h2", 1),
    bond("b3", "c1", "h3", 1),
    bond("b4", "c1", "h4", 1),
  ],
  rings: [],
  functionalGroups: [],
  electronSets: [electronSet("sigma1", "Four C-H sigma bonds", "sigma", ["c1", "h1", "h2", "h3", "h4"], ["b1", "b2", "b3", "b4"], 8, "Methane is a pure sigma-bonding example.")],
  notes: "Tetrahedral sp3 carbon with four equivalent sigma bonds.",
})

const ethane = molecule({
  id: "ethane",
  name: "Ethane",
  formula: "C2H6",
  source: "example",
  atoms: [
    atom("c1", "C", 210, 180, { hybridization: "sp3", electronDomains: 4 }),
    atom("c2", "C", 330, 180, { hybridization: "sp3", electronDomains: 4 }),
  ],
  bonds: [bond("b1", "c1", "c2", 1, { rotatable: true })],
  rings: [],
  functionalGroups: [functionalGroup("alkane", "Alkane sigma framework", ["c1", "c2"], ["b1"], "Only single C-C and C-H sigma bonds.")],
  electronSets: [electronSet("sigma1", "C-C sigma bond", "sigma", ["c1", "c2"], ["b1"], 2, "The C-C bond is rotatable because it is a single sigma bond.")],
  notes: "Open-chain alkane example with a rotatable single bond.",
})

const ethene = molecule({
  id: "ethene",
  name: "Ethene",
  formula: "C2H4",
  source: "example",
  atoms: [
    atom("c1", "C", 210, 180, { hybridization: "sp2", electronDomains: 3, geometry: "trigonal planar", conjugated: true }),
    atom("c2", "C", 330, 180, { hybridization: "sp2", electronDomains: 3, geometry: "trigonal planar", conjugated: true }),
  ],
  bonds: [bond("b1", "c1", "c2", 2, { rotatable: false, conjugated: true, orbitalOverlap: "one sigma bond plus one pi bond from side-by-side p orbitals" })],
  rings: [],
  functionalGroups: [functionalGroup("alkene", "Alkene", ["c1", "c2"], ["b1"], "Carbon-carbon double bond with one sigma and one pi component.")],
  electronSets: [
    electronSet("sigma1", "C=C sigma component", "sigma", ["c1", "c2"], ["b1"], 2, "Head-on overlap creates the sigma component."),
    electronSet("pi1", "C=C pi component", "pi", ["c1", "c2"], ["b1"], 2, "Parallel p orbitals create the pi component and restrict rotation."),
  ],
  notes: "Simple alkene showing sigma/pi decomposition and restricted rotation.",
})

const ethyne = molecule({
  id: "ethyne",
  name: "Ethyne",
  formula: "C2H2",
  source: "example",
  atoms: [
    atom("c1", "C", 210, 180, { hybridization: "sp", electronDomains: 2, geometry: "linear", conjugated: true }),
    atom("c2", "C", 330, 180, { hybridization: "sp", electronDomains: 2, geometry: "linear", conjugated: true }),
  ],
  bonds: [bond("b1", "c1", "c2", 3, { rotatable: false, conjugated: true, orbitalOverlap: "one sigma bond plus two perpendicular pi bonds" })],
  rings: [],
  functionalGroups: [functionalGroup("alkyne", "Alkyne", ["c1", "c2"], ["b1"], "Carbon-carbon triple bond with two pi components.")],
  electronSets: [electronSet("pi1", "Two alkyne pi bonds", "pi", ["c1", "c2"], ["b1"], 4, "sp carbons retain two perpendicular p orbitals.")],
  notes: "Linear sp-hybridized triple-bond model.",
})

const ethanol = molecule({
  id: "ethanol",
  name: "Ethanol",
  formula: "C2H6O",
  source: "example",
  atoms: [
    atom("c1", "C", 160, 190, { hybridization: "sp3", electronDomains: 4 }),
    atom("c2", "C", 280, 190, { hybridization: "sp3", electronDomains: 4 }),
    atom("o1", "O", 390, 145, { hybridization: "sp3", geometry: "bent", electronDomains: 4, lonePairs: 2, functionalGroupIds: ["alcohol"], orbitalContribution: "two sp3 lone-pair orbitals and two sigma bonds" }),
    atom("h1", "H", 470, 95),
  ],
  bonds: [
    bond("b1", "c1", "c2", 1),
    bond("b2", "c2", "o1", 1, { functionalGroupIds: ["alcohol"] }),
    bond("b3", "o1", "h1", 1, { functionalGroupIds: ["alcohol"] }),
  ],
  rings: [],
  functionalGroups: [functionalGroup("alcohol", "Alcohol", ["o1", "h1"], ["b2", "b3"], "Hydroxyl group attached to an sp3 carbon.", { commonReactions: ["oxidation", "esterification"], examples: ["ethanol", "propanol"] })],
  electronSets: [
    electronSet("sigma1", "C-C and C-O sigma framework", "sigma", ["c1", "c2", "o1"], ["b1", "b2"], 4, "All heavy-atom bonds are sigma bonds."),
    electronSet("lp-o", "Oxygen lone pairs", "lone-pair", ["o1"], [], 4, "Oxygen keeps two lone pairs in sp3-like orbitals."),
  ],
  notes: "Alcohol example with an sp3 oxygen and two lone pairs.",
})

const water = molecule({
  id: "water",
  name: "Water",
  formula: "H2O",
  source: "example",
  atoms: [
    atom("o1", "O", 260, 180, { hybridization: "sp3", geometry: "bent", electronDomains: 4, lonePairs: 2 }),
    atom("h1", "H", 185, 245),
    atom("h2", "H", 335, 245),
  ],
  bonds: [bond("b1", "o1", "h1", 1), bond("b2", "o1", "h2", 1)],
  rings: [],
  functionalGroups: [],
  electronSets: [electronSet("lp-o", "Two oxygen lone pairs", "lone-pair", ["o1"], [], 4, "Two nonbonding pairs compress the H-O-H angle.")],
  notes: "Bent molecule with two occupied lone-pair orbitals.",
})

const ammonia = molecule({
  id: "ammonia",
  name: "Ammonia",
  formula: "NH3",
  source: "example",
  atoms: [
    atom("n1", "N", 260, 180, { hybridization: "sp3", geometry: "trigonal pyramidal", electronDomains: 4, lonePairs: 1 }),
    atom("h1", "H", 260, 85),
    atom("h2", "H", 345, 240),
    atom("h3", "H", 175, 240),
  ],
  bonds: [bond("b1", "n1", "h1", 1), bond("b2", "n1", "h2", 1), bond("b3", "n1", "h3", 1)],
  rings: [],
  functionalGroups: [functionalGroup("amine", "Amine-like lone-pair center", ["n1"], [], "Nitrogen with a lone pair and sigma bonds.")],
  electronSets: [electronSet("lp-n", "Nitrogen lone pair", "lone-pair", ["n1"], [], 2, "The nitrogen lone pair occupies one sp3 orbital.")],
  notes: "Trigonal pyramidal sp3 nitrogen model.",
})

const carbonDioxide = molecule({
  id: "carbon-dioxide",
  name: "Carbon dioxide",
  formula: "CO2",
  source: "example",
  atoms: [
    atom("o1", "O", 140, 180, { hybridization: "sp2", geometry: "trigonal planar", electronDomains: 3, lonePairs: 2 }),
    atom("c1", "C", 260, 180, { hybridization: "sp", geometry: "linear", electronDomains: 2, piBonds: 2 }),
    atom("o2", "O", 380, 180, { hybridization: "sp2", geometry: "trigonal planar", electronDomains: 3, lonePairs: 2 }),
  ],
  bonds: [bond("b1", "o1", "c1", 2, { rotatable: false }), bond("b2", "c1", "o2", 2, { rotatable: false })],
  rings: [],
  functionalGroups: [functionalGroup("carbonyls", "Two carbonyl-like C=O bonds", ["o1", "c1", "o2"], ["b1", "b2"], "Linear O=C=O double-bond system.")],
  electronSets: [electronSet("pi-co2", "Two C=O pi systems", "pi", ["o1", "c1", "o2"], ["b1", "b2"], 4, "Each C=O double bond contributes a pi component.")],
  notes: "Linear molecule with two C=O pi bonds.",
})

const acetone = molecule({
  id: "acetone",
  name: "Acetone",
  formula: "C3H6O",
  source: "example",
  atoms: [
    atom("c1", "C", 150, 220, { hybridization: "sp3" }),
    atom("c2", "C", 270, 180, { hybridization: "sp2", geometry: "trigonal planar", electronDomains: 3, conjugated: true, functionalGroupIds: ["ketone"] }),
    atom("o1", "O", 270, 75, { hybridization: "sp2", geometry: "trigonal planar", electronDomains: 3, lonePairs: 2, conjugated: true, functionalGroupIds: ["ketone"] }),
    atom("c3", "C", 390, 220, { hybridization: "sp3" }),
  ],
  bonds: [
    bond("b1", "c1", "c2", 1),
    bond("b2", "c2", "o1", 2, { functionalGroupIds: ["ketone"], rotatable: false, conjugated: true }),
    bond("b3", "c2", "c3", 1),
  ],
  rings: [],
  functionalGroups: [functionalGroup("ketone", "Ketone carbonyl", ["c2", "o1"], ["b2"], "C=O bonded to two carbon groups.", { commonReactions: ["nucleophilic addition"], examples: ["acetone"] })],
  electronSets: [
    electronSet("pi-carbonyl", "Carbonyl pi bond", "pi", ["c2", "o1"], ["b2"], 2, "The C=O pi bond polarizes toward oxygen."),
    electronSet("lp-o", "Oxygen lone pairs", "lone-pair", ["o1"], [], 4, "Carbonyl oxygen keeps two lone pairs."),
  ],
  notes: "Ketone carbonyl model with a polarized C=O pi bond.",
})

const aceticAcid = molecule({
  id: "acetic-acid",
  name: "Acetic acid",
  formula: "C2H4O2",
  source: "example",
  atoms: [
    atom("c1", "C", 160, 220, { hybridization: "sp3" }),
    atom("c2", "C", 280, 180, { hybridization: "sp2", geometry: "trigonal planar", electronDomains: 3, conjugated: true, functionalGroupIds: ["carboxylic-acid"] }),
    atom("o1", "O", 280, 75, { hybridization: "sp2", electronDomains: 3, lonePairs: 2, conjugated: true, functionalGroupIds: ["carboxylic-acid"] }),
    atom("o2", "O", 390, 220, { hybridization: "sp2", electronDomains: 3, lonePairs: 2, conjugated: true, functionalGroupIds: ["carboxylic-acid"] }),
    atom("h1", "H", 465, 265),
  ],
  bonds: [
    bond("b1", "c1", "c2", 1),
    bond("b2", "c2", "o1", 2, { functionalGroupIds: ["carboxylic-acid"], rotatable: false, conjugated: true }),
    bond("b3", "c2", "o2", 1, { functionalGroupIds: ["carboxylic-acid"], conjugated: true }),
    bond("b4", "o2", "h1", 1, { functionalGroupIds: ["carboxylic-acid"] }),
  ],
  rings: [],
  functionalGroups: [functionalGroup("carboxylic-acid", "Carboxylic acid", ["c2", "o1", "o2", "h1"], ["b2", "b3", "b4"], "C(=O)OH group with resonance between the two oxygens.", { commonReactions: ["esterification", "acid-base"], examples: ["acetic acid"] })],
  electronSets: [electronSet("deloc-acid", "Carboxyl delocalization", "delocalized", ["c2", "o1", "o2"], ["b2", "b3"], 4, "The carboxyl group can delocalize electron density across both oxygens.")],
  notes: "Carboxylic acid model showing carbonyl and hydroxyl oxygen chemistry.",
})

const benzene = molecule({
  id: "benzene",
  name: "Benzene",
  formula: "C6H6",
  source: "example",
  atoms: benzeneRing(),
  bonds: benzeneBonds(),
  rings: [ring("ring1", ["c1", "c2", "c3", "c4", "c5", "c6"], true, "Aromatic six-membered ring")],
  functionalGroups: [functionalGroup("arene", "Arene", ["c1", "c2", "c3", "c4", "c5", "c6"], ["b1", "b2", "b3", "b4", "b5", "b6"], "Cyclic conjugated 6 pi-electron aromatic ring.", { commonReactions: ["electrophilic aromatic substitution"], examples: ["benzene", "toluene", "phenol"] })],
  electronSets: [electronSet("aromatic-pi", "Delocalized aromatic pi sextet", "delocalized", ["c1", "c2", "c3", "c4", "c5", "c6"], ["b1", "b2", "b3", "b4", "b5", "b6"], 6, "Six p orbitals overlap around the ring to make a delocalized pi system.")],
  notes: "Aromatic benchmark: six sp2 carbons, six pi electrons, and a delocalized ring current model.",
})

const phenol = molecule({
  ...benzene,
  id: "phenol",
  name: "Phenol",
  formula: "C6H6O",
  atoms: [...benzene.atoms, atom("o1", "O", 260, 15, { hybridization: "sp2", electronDomains: 3, lonePairs: 2, conjugated: true, functionalGroupIds: ["phenol", "alcohol"], orbitalContribution: "one lone pair can overlap with the aromatic pi system" }), atom("h1", "H", 260, -55)],
  bonds: [...benzene.bonds, bond("b7", "c1", "o1", 1, { functionalGroupIds: ["phenol"], conjugated: true }), bond("b8", "o1", "h1", 1, { functionalGroupIds: ["phenol"] })],
  functionalGroups: [
    ...benzene.functionalGroups,
    functionalGroup("phenol", "Phenol", ["o1", "h1", "c1"], ["b7", "b8"], "A hydroxyl group directly attached to an aromatic ring.", { commonReactions: ["electrophilic aromatic substitution", "acid-base"], examples: ["phenol"] }),
  ],
  electronSets: [...benzene.electronSets, electronSet("lp-phenol", "Phenol oxygen lone-pair donation", "lone-pair", ["o1"], ["b7"], 2, "One oxygen lone pair can donate into the ring pi system.")],
  notes: "Aromatic alcohol where oxygen lone pairs interact with the benzene ring.",
})

const pyridine = molecule({
  ...benzene,
  id: "pyridine",
  name: "Pyridine",
  formula: "C5H5N",
  atoms: benzeneRing().map((item, index) => index === 0
    ? atom("n1", "N", item.x, item.y, { hybridization: "sp2", geometry: "trigonal planar", electronDomains: 3, lonePairs: 1, conjugated: true, delocalized: true, aromatic: true, ringIds: ["ring1"], homoContribution: 12, lumoContribution: 18, orbitalContribution: "sp2 nitrogen with a nonaromatic lone pair" })
    : { ...item, id: `c${index}` }),
  bonds: [
    bond("b1", "n1", "c1", "aromatic", { ringMember: true, aromatic: true, delocalized: true, rotatable: false }),
    bond("b2", "c1", "c2", "aromatic", { ringMember: true, aromatic: true, delocalized: true, rotatable: false }),
    bond("b3", "c2", "c3", "aromatic", { ringMember: true, aromatic: true, delocalized: true, rotatable: false }),
    bond("b4", "c3", "c4", "aromatic", { ringMember: true, aromatic: true, delocalized: true, rotatable: false }),
    bond("b5", "c4", "c5", "aromatic", { ringMember: true, aromatic: true, delocalized: true, rotatable: false }),
    bond("b6", "c5", "n1", "aromatic", { ringMember: true, aromatic: true, delocalized: true, rotatable: false }),
  ],
  functionalGroups: [functionalGroup("heteroarene", "Heteroarene", ["n1", "c1", "c2", "c3", "c4", "c5"], ["b1", "b2", "b3", "b4", "b5", "b6"], "Aromatic ring containing a ring nitrogen.")],
  electronSets: [electronSet("pyridine-pi", "Aromatic pi sextet", "delocalized", ["n1", "c1", "c2", "c3", "c4", "c5"], ["b1", "b2", "b3", "b4", "b5", "b6"], 6, "The nitrogen contributes one p electron to the aromatic sextet; its lone pair is outside the pi count.")],
  notes: "A heteroaromatic ring with a pyridine-like nitrogen lone pair.",
})

const aniline = molecule({
  ...benzene,
  id: "aniline",
  name: "Aniline",
  formula: "C6H7N",
  atoms: [...benzene.atoms, atom("n1", "N", 260, 15, { hybridization: "sp2", electronDomains: 3, lonePairs: 1, conjugated: true, functionalGroupIds: ["amine"], orbitalContribution: "amine lone pair can overlap with the aromatic pi system" }), atom("h1", "H", 220, -55), atom("h2", "H", 300, -55)],
  bonds: [...benzene.bonds, bond("b7", "c1", "n1", 1, { functionalGroupIds: ["amine"], conjugated: true }), bond("b8", "n1", "h1", 1, { functionalGroupIds: ["amine"] }), bond("b9", "n1", "h2", 1, { functionalGroupIds: ["amine"] })],
  functionalGroups: [...benzene.functionalGroups, functionalGroup("amine", "Aromatic amine", ["n1", "h1", "h2"], ["b7", "b8", "b9"], "Amino group attached directly to an aromatic ring.", { commonReactions: ["electrophilic aromatic substitution"], examples: ["aniline"] })],
  electronSets: [...benzene.electronSets, electronSet("lp-aniline", "Aniline lone-pair donation", "lone-pair", ["n1"], ["b7"], 2, "The nitrogen lone pair can donate into the aromatic ring.")],
  notes: "Aromatic amine with lone-pair conjugation.",
})

const naphthaleneAtoms = [
  ...benzeneRing("a", 210, 180, 75),
  atom("b2", "C", 340, 105, { hybridization: "sp2", geometry: "trigonal planar", conjugated: true, delocalized: true, aromatic: true, ringIds: ["ring2"] }),
  atom("b3", "C", 405, 180, { hybridization: "sp2", geometry: "trigonal planar", conjugated: true, delocalized: true, aromatic: true, ringIds: ["ring2"] }),
  atom("b4", "C", 340, 255, { hybridization: "sp2", geometry: "trigonal planar", conjugated: true, delocalized: true, aromatic: true, ringIds: ["ring2"] }),
]

const naphthalene = molecule({
  id: "naphthalene",
  name: "Naphthalene",
  formula: "C10H8",
  source: "example",
  atoms: naphthaleneAtoms,
  bonds: [
    ...benzeneBonds("a", "a"),
    bond("b1", "a2", "b2", "aromatic", { ringMember: true, aromatic: true, delocalized: true, rotatable: false }),
    bond("b2", "b2", "b3", "aromatic", { ringMember: true, aromatic: true, delocalized: true, rotatable: false }),
    bond("b3", "b3", "b4", "aromatic", { ringMember: true, aromatic: true, delocalized: true, rotatable: false }),
    bond("b4", "b4", "a3", "aromatic", { ringMember: true, aromatic: true, delocalized: true, rotatable: false }),
  ],
  rings: [
    ring("ring1", ["a1", "a2", "a3", "a4", "a5", "a6"], true, "First aromatic ring"),
    ring("ring2", ["a2", "b2", "b3", "b4", "a3"], true, "Fused aromatic ring model"),
  ],
  functionalGroups: [functionalGroup("polyarene", "Fused arene", ["a1", "a2", "a3", "a4", "a5", "a6", "b2", "b3", "b4"], [], "Fused aromatic ring system.")],
  electronSets: [electronSet("naph-pi", "Fused aromatic pi system", "delocalized", naphthaleneAtoms.map((item) => item.id), [], 10, "Naphthalene has an extended aromatic pi system.")],
  notes: "Fused aromatic scaffold for delocalization and HOMO/LUMO comparisons.",
})

const cyclohexane = molecule({
  id: "cyclohexane",
  name: "Cyclohexane",
  formula: "C6H12",
  source: "example",
  atoms: benzeneRing().map((item) => ({ ...item, hybridization: "sp3" as const, geometry: "tetrahedral" as const, conjugated: false, delocalized: false, aromatic: false, homoContribution: 0, lumoContribution: 0, orbitalContribution: "sp3 sigma framework", ringIds: ["ring1"] })),
  bonds: benzeneBonds().map((item) => ({ ...item, order: 1 as const, aromatic: false, delocalized: false, conjugated: false, piBonds: 0, localized: true, orbitalOverlap: "localized sigma overlap" })),
  rings: [ring("ring1", ["c1", "c2", "c3", "c4", "c5", "c6"], false, "Saturated six-membered ring")],
  functionalGroups: [functionalGroup("cycloalkane", "Cycloalkane", ["c1", "c2", "c3", "c4", "c5", "c6"], [], "Saturated ring with only sigma bonds.")],
  electronSets: [electronSet("sigma-ring", "Cyclohexane sigma ring", "sigma", ["c1", "c2", "c3", "c4", "c5", "c6"], [], 12, "The ring is closed but not aromatic because it lacks a continuous pi system.")],
  notes: "Saturated ring contrast case: cyclic does not automatically mean aromatic.",
})

const cyclohexene = molecule({
  ...cyclohexane,
  id: "cyclohexene",
  name: "Cyclohexene",
  formula: "C6H10",
  atoms: cyclohexane.atoms.map((item) => ["c1", "c2"].includes(item.id) ? { ...item, hybridization: "sp2" as const, geometry: "trigonal planar" as const, conjugated: true, orbitalContribution: "alkene p orbital" } : item),
  bonds: cyclohexane.bonds.map((item) => item.id === "b1" ? { ...item, order: 2 as const, piBonds: 1, rotatable: false, conjugated: true, orbitalOverlap: "sigma plus one localized pi bond" } : item),
  functionalGroups: [functionalGroup("cycloalkene", "Cycloalkene", ["c1", "c2"], ["b1"], "Ring containing one C=C double bond.")],
  electronSets: [electronSet("pi-alkene", "Localized cyclohexene pi bond", "pi", ["c1", "c2"], ["b1"], 2, "One local pi bond is present, but the whole ring is not aromatic.")],
  notes: "A cyclic alkene with one localized pi bond.",
})

export const EXPLORER_MOLECULES: ExplorerMolecule[] = [
  methane,
  ethane,
  ethene,
  ethyne,
  ethanol,
  water,
  ammonia,
  carbonDioxide,
  acetone,
  aceticAcid,
  benzene,
  phenol,
  pyridine,
  aniline,
  naphthalene,
  cyclohexane,
  cyclohexene,
]

const aliasMap = new Map<string, string>([
  ["co2", "carbon-dioxide"],
  ["carbon dioxide", "carbon-dioxide"],
  ["h2o", "water"],
  ["nh3", "ammonia"],
  ["ch4", "methane"],
  ["c2h4", "ethene"],
  ["c2h2", "ethyne"],
  ["c2h6o", "ethanol"],
  ["ethanoic-acid", "acetic-acid"],
  ["ethanoic acid", "acetic-acid"],
  ["c6h6", "benzene"],
  ["c6h12", "cyclohexane"],
  ["c6h10", "cyclohexene"],
])

function normalize(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .replace(/\+/g, "plus")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

export function listExplorerMolecules(): ExplorerMolecule[] {
  return EXPLORER_MOLECULES
}

export function getExplorerMolecule(id: string | null | undefined): ExplorerMolecule {
  const direct = normalize(id)
  const alias = aliasMap.get(direct) ?? aliasMap.get((id ?? "").toLowerCase())
  return EXPLORER_MOLECULES.find((item) => item.id === direct || item.id === alias) ?? benzene
}

export function getElementInfo(element: string) {
  return ELEMENT_INFO[element as KnownElement] ?? {
    element,
    name: element,
    atomicNumber: 0,
    atomicMass: 0,
    valenceElectrons: 0,
    electronegativity: null,
  }
}
