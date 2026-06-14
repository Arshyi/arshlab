import type {
  AtomNode,
  BondEdge,
  BondOrder,
  CompoundPathway,
  FunctionalGroupHighlight,
  MolecularStructure2D,
  SpectroscopyMapping,
} from "./visualization-types"

function atom(id: string, element: string, x: number, y: number, label?: string): AtomNode {
  return { id, element, x, y, label }
}

function bond(id: string, from: string, to: string, order: BondOrder = 1): BondEdge {
  return { id, from, to, order }
}

function highlight(input: FunctionalGroupHighlight): FunctionalGroupHighlight {
  return input
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "")
}

function formulaKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "")
}

function chainAtoms(count: number, y = 92): AtomNode[] {
  return Array.from({ length: count }, (_, index) => atom(`c${index + 1}`, "C", 42 + index * 62, y))
}

function chainBonds(count: number, orders: Record<string, BondOrder> = {}): BondEdge[] {
  return Array.from({ length: Math.max(0, count - 1) }, (_, index) => {
    const from = `c${index + 1}`
    const to = `c${index + 2}`
    return bond(`${from}-${to}`, from, to, orders[`${from}-${to}`] ?? 1)
  })
}

function hydrocarbon(input: {
  id: string
  displayName: string
  formula: string
  carbonCount: number
  orders?: Record<string, BondOrder>
  highlights?: FunctionalGroupHighlight[]
}): MolecularStructure2D {
  return {
    id: input.id,
    compoundId: input.id,
    displayName: input.displayName,
    formula: input.formula,
    atoms: chainAtoms(input.carbonCount),
    bonds: chainBonds(input.carbonCount, input.orders),
    functionalGroupHighlights: input.highlights,
  }
}

function alcohol(input: {
  id: string
  displayName: string
  formula: string
  carbonCount: number
  terminalCarbon?: number
}): MolecularStructure2D {
  const terminal = input.terminalCarbon ?? input.carbonCount
  const atoms = [
    ...chainAtoms(input.carbonCount),
    atom("o1", "O", 42 + terminal * 62, 92),
    atom("h-o", "H", 42 + terminal * 62 + 38, 62),
  ]
  const bonds = [
    ...chainBonds(input.carbonCount),
    bond(`c${terminal}-o1`, `c${terminal}`, "o1"),
    bond("o1-h-o", "o1", "h-o"),
  ]
  return {
    id: input.id,
    compoundId: input.id,
    displayName: input.displayName,
    formula: input.formula,
    atoms,
    bonds,
    functionalGroupHighlights: [
      highlight({
        id: `${input.id}-oh`,
        group: "alcohol",
        label: "O-H alcohol group",
        atomIds: ["o1", "h-o"],
        bondIds: [`c${terminal}-o1`, "o1-h-o"],
        color: "#14b8a6",
        description: "The hydroxyl group gives alcohols their broad O-H IR stretch.",
      }),
    ],
  }
}

function aldehyde(input: {
  id: string
  displayName: string
  formula: string
  carbonCount: number
}): MolecularStructure2D {
  const carbonylCarbon = input.carbonCount
  const x = 42 + (carbonylCarbon - 1) * 62
  const atoms = [
    ...chainAtoms(input.carbonCount),
    atom("o1", "O", x, 30),
    atom("h-aldehyde", "H", x + 52, 122),
  ]
  const bonds = [
    ...chainBonds(input.carbonCount),
    bond(`c${carbonylCarbon}-o1`, `c${carbonylCarbon}`, "o1", 2),
    bond(`c${carbonylCarbon}-h-aldehyde`, `c${carbonylCarbon}`, "h-aldehyde"),
  ]
  return {
    id: input.id,
    compoundId: input.id,
    displayName: input.displayName,
    formula: input.formula,
    atoms,
    bonds,
    functionalGroupHighlights: [
      highlight({
        id: `${input.id}-aldehyde`,
        group: "aldehyde",
        label: "Aldehyde carbonyl",
        atomIds: [`c${carbonylCarbon}`, "o1", "h-aldehyde"],
        bondIds: [`c${carbonylCarbon}-o1`, `c${carbonylCarbon}-h-aldehyde`],
        color: "#f97316",
        description: "A terminal C=O with an aldehydic hydrogen identifies an aldehyde.",
      }),
      highlight({
        id: `${input.id}-carbonyl`,
        group: "carbonyl",
        label: "C=O carbonyl",
        atomIds: [`c${carbonylCarbon}`, "o1"],
        bondIds: [`c${carbonylCarbon}-o1`],
        color: "#f97316",
      }),
    ],
  }
}

function ketone(input: {
  id: string
  displayName: string
  formula: string
  carbonCount: number
  carbonylCarbon: number
}): MolecularStructure2D {
  const x = 42 + (input.carbonylCarbon - 1) * 62
  return {
    id: input.id,
    compoundId: input.id,
    displayName: input.displayName,
    formula: input.formula,
    atoms: [...chainAtoms(input.carbonCount), atom("o1", "O", x, 30)],
    bonds: [...chainBonds(input.carbonCount), bond(`c${input.carbonylCarbon}-o1`, `c${input.carbonylCarbon}`, "o1", 2)],
    functionalGroupHighlights: [
      highlight({
        id: `${input.id}-ketone`,
        group: "ketone",
        label: "Ketone carbonyl",
        atomIds: [`c${input.carbonylCarbon}`, "o1"],
        bondIds: [`c${input.carbonylCarbon}-o1`],
        color: "#f97316",
        description: "A C=O inside a carbon chain identifies a ketone.",
      }),
      highlight({
        id: `${input.id}-carbonyl`,
        group: "carbonyl",
        label: "C=O carbonyl",
        atomIds: [`c${input.carbonylCarbon}`, "o1"],
        bondIds: [`c${input.carbonylCarbon}-o1`],
        color: "#f97316",
      }),
    ],
  }
}

function carboxylicAcid(input: {
  id: string
  displayName: string
  formula: string
  carbonCount: number
}): MolecularStructure2D {
  const terminal = input.carbonCount
  const x = 42 + (terminal - 1) * 62
  return {
    id: input.id,
    compoundId: input.id,
    displayName: input.displayName,
    formula: input.formula,
    atoms: [...chainAtoms(input.carbonCount), atom("o1", "O", x, 30), atom("o2", "O", x + 58, 92), atom("h-o", "H", x + 96, 60)],
    bonds: [
      ...chainBonds(input.carbonCount),
      bond(`c${terminal}-o1`, `c${terminal}`, "o1", 2),
      bond(`c${terminal}-o2`, `c${terminal}`, "o2"),
      bond("o2-h-o", "o2", "h-o"),
    ],
    functionalGroupHighlights: [
      highlight({
        id: `${input.id}-carboxyl`,
        group: "carboxylic acid",
        label: "COOH carboxyl group",
        atomIds: [`c${terminal}`, "o1", "o2", "h-o"],
        bondIds: [`c${terminal}-o1`, `c${terminal}-o2`, "o2-h-o"],
        color: "#22c55e",
        description: "The COOH group combines a carbonyl and acidic O-H.",
      }),
      highlight({
        id: `${input.id}-carbonyl`,
        group: "carbonyl",
        label: "C=O carbonyl",
        atomIds: [`c${terminal}`, "o1"],
        bondIds: [`c${terminal}-o1`],
        color: "#f97316",
      }),
    ],
  }
}

function ester(input: {
  id: string
  displayName: string
  formula: string
  acidCarbons: number
  alkoxyCarbons: number
}): MolecularStructure2D {
  const acidAtoms = chainAtoms(input.acidCarbons)
  const carbonylCarbon = input.acidCarbons
  const carbonylX = 42 + (carbonylCarbon - 1) * 62
  const alkoxyStartX = carbonylX + 116
  const alkoxyAtoms = Array.from({ length: input.alkoxyCarbons }, (_, index) =>
    atom(`r${index + 1}`, "C", alkoxyStartX + index * 62, 92),
  )
  const alkoxyBonds = Array.from({ length: Math.max(0, input.alkoxyCarbons - 1) }, (_, index) =>
    bond(`r${index + 1}-r${index + 2}`, `r${index + 1}`, `r${index + 2}`),
  )
  return {
    id: input.id,
    compoundId: input.id,
    displayName: input.displayName,
    formula: input.formula,
    atoms: [...acidAtoms, atom("o1", "O", carbonylX, 30), atom("o2", "O", carbonylX + 58, 92), ...alkoxyAtoms],
    bonds: [
      ...chainBonds(input.acidCarbons),
      bond(`c${carbonylCarbon}-o1`, `c${carbonylCarbon}`, "o1", 2),
      bond(`c${carbonylCarbon}-o2`, `c${carbonylCarbon}`, "o2"),
      bond("o2-r1", "o2", "r1"),
      ...alkoxyBonds,
    ],
    functionalGroupHighlights: [
      highlight({
        id: `${input.id}-ester`,
        group: "ester",
        label: "Ester linkage",
        atomIds: [`c${carbonylCarbon}`, "o1", "o2", "r1"],
        bondIds: [`c${carbonylCarbon}-o1`, `c${carbonylCarbon}-o2`, "o2-r1"],
        color: "#8b5cf6",
        description: "The C(=O)-O linkage identifies an ester.",
      }),
      highlight({
        id: `${input.id}-carbonyl`,
        group: "carbonyl",
        label: "C=O carbonyl",
        atomIds: [`c${carbonylCarbon}`, "o1"],
        bondIds: [`c${carbonylCarbon}-o1`],
        color: "#f97316",
      }),
    ],
  }
}

function benzeneDerivative(input: {
  id: string
  displayName: string
  formula: string
  substituent?: "oh" | "methyl" | "amine" | "nitro"
  highlights?: FunctionalGroupHighlight[]
}): MolecularStructure2D {
  const centerX = 122
  const centerY = 96
  const radius = 58
  const atoms = Array.from({ length: 6 }, (_, index) => {
    const angle = (-90 + index * 60) * (Math.PI / 180)
    return atom(`c${index + 1}`, "C", centerX + Math.cos(angle) * radius, centerY + Math.sin(angle) * radius)
  })
  const bonds = Array.from({ length: 6 }, (_, index) =>
    bond(`c${index + 1}-c${((index + 1) % 6) + 1}`, `c${index + 1}`, `c${((index + 1) % 6) + 1}`, "aromatic"),
  )
  const highlights: FunctionalGroupHighlight[] = [
    highlight({
      id: `${input.id}-aromatic`,
      group: "aromatic ring",
      label: "Aromatic benzene ring",
      atomIds: atoms.map((item) => item.id),
      bondIds: bonds.map((item) => item.id),
      color: "#0ea5e9",
      description: "The six-carbon ring is drawn as an aromatic system.",
    }),
    ...(input.highlights ?? []),
  ]

  if (input.substituent === "oh") {
    atoms.push(atom("o1", "O", centerX, centerY - radius - 50), atom("h-o", "H", centerX + 36, centerY - radius - 78))
    bonds.push(bond("c1-o1", "c1", "o1"), bond("o1-h-o", "o1", "h-o"))
    highlights.push(
      highlight({
        id: `${input.id}-phenol-oh`,
        group: "phenol O-H",
        label: "Phenol O-H",
        atomIds: ["o1", "h-o"],
        bondIds: ["c1-o1", "o1-h-o"],
        color: "#14b8a6",
        description: "Phenol has an O-H group directly attached to an aromatic ring.",
      }),
    )
  }
  if (input.substituent === "methyl") {
    atoms.push(atom("c7", "C", centerX, centerY - radius - 54))
    bonds.push(bond("c1-c7", "c1", "c7"))
    highlights.push(
      highlight({
        id: `${input.id}-methyl`,
        group: "alkyl substituent",
        label: "Methyl substituent",
        atomIds: ["c7"],
        bondIds: ["c1-c7"],
        color: "#f59e0b",
      }),
    )
  }
  if (input.substituent === "amine") {
    atoms.push(atom("n1", "N", centerX, centerY - radius - 50), atom("h-n1", "H", centerX - 28, centerY - radius - 82), atom("h-n2", "H", centerX + 28, centerY - radius - 82))
    bonds.push(bond("c1-n1", "c1", "n1"), bond("n1-h-n1", "n1", "h-n1"), bond("n1-h-n2", "n1", "h-n2"))
    highlights.push(
      highlight({
        id: `${input.id}-amine`,
        group: "amine",
        label: "Amino group",
        atomIds: ["n1", "h-n1", "h-n2"],
        bondIds: ["c1-n1", "n1-h-n1", "n1-h-n2"],
        color: "#a855f7",
        description: "Aniline contains an amino group attached to benzene.",
      }),
    )
  }
  if (input.substituent === "nitro") {
    atoms.push(atom("n1", "N", centerX, centerY - radius - 50), atom("o1", "O", centerX - 38, centerY - radius - 86), atom("o2", "O", centerX + 38, centerY - radius - 86))
    bonds.push(bond("c1-n1", "c1", "n1"), bond("n1-o1", "n1", "o1", 2), bond("n1-o2", "n1", "o2"))
    highlights.push(
      highlight({
        id: `${input.id}-nitro`,
        group: "nitro",
        label: "Nitro group",
        atomIds: ["n1", "o1", "o2"],
        bondIds: ["c1-n1", "n1-o1", "n1-o2"],
        color: "#ef4444",
      }),
    )
  }

  return {
    id: input.id,
    compoundId: input.id,
    displayName: input.displayName,
    formula: input.formula,
    atoms,
    bonds,
    functionalGroupHighlights: highlights,
  }
}

export const MOLECULAR_STRUCTURES: MolecularStructure2D[] = [
  {
    id: "water",
    compoundId: "water",
    displayName: "water",
    formula: "H2O",
    atoms: [atom("o1", "O", 90, 80), atom("h1", "H", 38, 128), atom("h2", "H", 142, 128)],
    bonds: [bond("o1-h1", "o1", "h1"), bond("o1-h2", "o1", "h2")],
    notes: ["Bent molecular shape; lone pairs are not shown in this simplified renderer."],
  },
  hydrocarbon({ id: "methane", displayName: "methane", formula: "CH4", carbonCount: 1 }),
  hydrocarbon({ id: "ethane", displayName: "ethane", formula: "C2H6", carbonCount: 2 }),
  hydrocarbon({ id: "propane", displayName: "propane", formula: "C3H8", carbonCount: 3 }),
  hydrocarbon({ id: "butane", displayName: "butane", formula: "C4H10", carbonCount: 4 }),
  hydrocarbon({
    id: "ethene",
    displayName: "ethene",
    formula: "C2H4",
    carbonCount: 2,
    orders: { "c1-c2": 2 },
    highlights: [
      highlight({
        id: "ethene-alkene",
        group: "alkene",
        label: "C=C alkene",
        atomIds: ["c1", "c2"],
        bondIds: ["c1-c2"],
        color: "#0ea5e9",
      }),
    ],
  }),
  hydrocarbon({
    id: "propene",
    displayName: "propene",
    formula: "C3H6",
    carbonCount: 3,
    orders: { "c1-c2": 2 },
    highlights: [
      highlight({
        id: "propene-alkene",
        group: "alkene",
        label: "C=C alkene",
        atomIds: ["c1", "c2"],
        bondIds: ["c1-c2"],
        color: "#0ea5e9",
      }),
    ],
  }),
  hydrocarbon({
    id: "ethyne",
    displayName: "ethyne",
    formula: "C2H2",
    carbonCount: 2,
    orders: { "c1-c2": 3 },
    highlights: [
      highlight({
        id: "ethyne-alkyne",
        group: "alkyne",
        label: "C triple C alkyne",
        atomIds: ["c1", "c2"],
        bondIds: ["c1-c2"],
        color: "#06b6d4",
      }),
    ],
  }),
  hydrocarbon({
    id: "propyne",
    displayName: "propyne",
    formula: "C3H4",
    carbonCount: 3,
    orders: { "c1-c2": 3 },
    highlights: [
      highlight({
        id: "propyne-alkyne",
        group: "alkyne",
        label: "C triple C alkyne",
        atomIds: ["c1", "c2"],
        bondIds: ["c1-c2"],
        color: "#06b6d4",
      }),
    ],
  }),
  alcohol({ id: "methanol", displayName: "methanol", formula: "CH4O", carbonCount: 1 }),
  alcohol({ id: "ethanol", displayName: "ethanol", formula: "C2H6O", carbonCount: 2 }),
  alcohol({ id: "propan-1-ol", displayName: "propanol", formula: "C3H8O", carbonCount: 3 }),
  alcohol({ id: "propan-2-ol", displayName: "propan-2-ol", formula: "C3H8O", carbonCount: 3, terminalCarbon: 2 }),
  alcohol({ id: "butan-1-ol", displayName: "butanol", formula: "C4H10O", carbonCount: 4 }),
  aldehyde({ id: "methanal", displayName: "formaldehyde", formula: "CH2O", carbonCount: 1 }),
  aldehyde({ id: "ethanal", displayName: "ethanal", formula: "C2H4O", carbonCount: 2 }),
  aldehyde({ id: "propanal", displayName: "propanal", formula: "C3H6O", carbonCount: 3 }),
  ketone({ id: "acetone", displayName: "acetone", formula: "C3H6O", carbonCount: 3, carbonylCarbon: 2 }),
  ketone({ id: "butanone", displayName: "butanone", formula: "C4H8O", carbonCount: 4, carbonylCarbon: 2 }),
  carboxylicAcid({ id: "methanoic-acid", displayName: "methanoic acid", formula: "CH2O2", carbonCount: 1 }),
  carboxylicAcid({ id: "ethanoic-acid", displayName: "ethanoic acid", formula: "C2H4O2", carbonCount: 2 }),
  carboxylicAcid({ id: "propanoic-acid", displayName: "propanoic acid", formula: "C3H6O2", carbonCount: 3 }),
  ester({ id: "methyl-ethanoate", displayName: "methyl ethanoate", formula: "C3H6O2", acidCarbons: 2, alkoxyCarbons: 1 }),
  ester({ id: "ethyl-ethanoate", displayName: "ethyl ethanoate", formula: "C4H8O2", acidCarbons: 2, alkoxyCarbons: 2 }),
  {
    id: "ammonia",
    compoundId: "ammonia",
    displayName: "ammonia",
    formula: "NH3",
    atoms: [atom("n1", "N", 90, 78), atom("h1", "H", 38, 128), atom("h2", "H", 142, 128), atom("h3", "H", 90, 20)],
    bonds: [bond("n1-h1", "n1", "h1"), bond("n1-h2", "n1", "h2"), bond("n1-h3", "n1", "h3")],
    functionalGroupHighlights: [
      highlight({
        id: "ammonia-amine-like",
        group: "amine",
        label: "N-H bonds",
        atomIds: ["n1", "h1", "h2", "h3"],
        bondIds: ["n1-h1", "n1-h2", "n1-h3"],
        color: "#a855f7",
      }),
    ],
  },
  {
    id: "hydrogen-chloride",
    compoundId: "hydrogen-chloride",
    displayName: "hydrogen chloride",
    formula: "HCl",
    atoms: [atom("h1", "H", 48, 86), atom("cl1", "Cl", 136, 86)],
    bonds: [bond("h1-cl1", "h1", "cl1")],
  },
  {
    id: "sodium-chloride",
    compoundId: "sodium-chloride",
    displayName: "sodium chloride",
    formula: "NaCl",
    atoms: [atom("na1", "Na", 48, 86, "Na+"), atom("cl1", "Cl", 140, 86, "Cl-")],
    bonds: [bond("na1-cl1", "na1", "cl1")],
    notes: ["Drawn as an ionic pair; the real solid is an extended lattice."],
  },
  {
    id: "sodium-hydroxide",
    compoundId: "sodium-hydroxide",
    displayName: "sodium hydroxide",
    formula: "NaOH",
    atoms: [atom("na1", "Na", 36, 88, "Na+"), atom("o1", "O", 118, 88, "O-"), atom("h1", "H", 174, 88)],
    bonds: [bond("o1-h1", "o1", "h1")],
    functionalGroupHighlights: [
      highlight({
        id: "sodium-hydroxide-hydroxide",
        group: "hydroxide",
        label: "Hydroxide ion",
        atomIds: ["o1", "h1"],
        bondIds: ["o1-h1"],
        color: "#14b8a6",
      }),
    ],
  },
  {
    id: "potassium-hydroxide",
    compoundId: "potassium-hydroxide",
    displayName: "potassium hydroxide",
    formula: "KOH",
    atoms: [atom("k1", "K", 36, 88, "K+"), atom("o1", "O", 118, 88, "O-"), atom("h1", "H", 174, 88)],
    bonds: [bond("o1-h1", "o1", "h1")],
  },
  {
    id: "hydrochloric-acid",
    compoundId: "hydrochloric-acid",
    displayName: "hydrochloric acid",
    formula: "HCl",
    atoms: [atom("h1", "H", 48, 86), atom("cl1", "Cl", 136, 86)],
    bonds: [bond("h1-cl1", "h1", "cl1")],
    notes: ["Aqueous HCl is represented by this acid formula card."],
  },
  {
    id: "sulfuric-acid",
    compoundId: "sulfuric-acid",
    displayName: "sulfuric acid",
    formula: "H2SO4",
    atoms: [
      atom("s1", "S", 116, 92),
      atom("o1", "O", 116, 24),
      atom("o2", "O", 116, 160),
      atom("o3", "O", 48, 92),
      atom("o4", "O", 184, 92),
      atom("h1", "H", 20, 62),
      atom("h2", "H", 212, 62),
    ],
    bonds: [bond("s1-o1", "s1", "o1", 2), bond("s1-o2", "s1", "o2", 2), bond("s1-o3", "s1", "o3"), bond("s1-o4", "s1", "o4"), bond("o3-h1", "o3", "h1"), bond("o4-h2", "o4", "h2")],
  },
  {
    id: "nitric-acid",
    compoundId: "nitric-acid",
    displayName: "nitric acid",
    formula: "HNO3",
    atoms: [atom("n1", "N", 112, 92), atom("o1", "O", 112, 24), atom("o2", "O", 48, 126), atom("o3", "O", 176, 126), atom("h1", "H", 20, 98)],
    bonds: [bond("n1-o1", "n1", "o1", 2), bond("n1-o2", "n1", "o2"), bond("n1-o3", "n1", "o3"), bond("o2-h1", "o2", "h1")],
  },
  benzeneDerivative({ id: "benzene", displayName: "benzene", formula: "C6H6" }),
  benzeneDerivative({ id: "phenol", displayName: "phenol", formula: "C6H6O", substituent: "oh" }),
  benzeneDerivative({ id: "toluene", displayName: "toluene", formula: "C7H8", substituent: "methyl" }),
  benzeneDerivative({ id: "aniline", displayName: "aniline", formula: "C6H7N", substituent: "amine" }),
  benzeneDerivative({ id: "nitrobenzene", displayName: "nitrobenzene", formula: "C6H5NO2", substituent: "nitro" }),
  {
    id: "hydrogen-peroxide",
    compoundId: "hydrogen-peroxide",
    displayName: "hydrogen peroxide",
    formula: "H2O2",
    atoms: [atom("h1", "H", 32, 92), atom("o1", "O", 88, 92), atom("o2", "O", 148, 92), atom("h2", "H", 204, 92)],
    bonds: [bond("h1-o1", "h1", "o1"), bond("o1-o2", "o1", "o2"), bond("o2-h2", "o2", "h2")],
  },
  {
    id: "carbon-dioxide",
    compoundId: "carbon-dioxide",
    displayName: "carbon dioxide",
    formula: "CO2",
    atoms: [atom("o1", "O", 40, 88), atom("c1", "C", 112, 88), atom("o2", "O", 184, 88)],
    bonds: [bond("o1-c1", "o1", "c1", 2), bond("c1-o2", "c1", "o2", 2)],
    functionalGroupHighlights: [
      highlight({
        id: "carbon-dioxide-double-bonds",
        group: "carbonyl",
        label: "C=O bonds",
        atomIds: ["o1", "c1", "o2"],
        bondIds: ["o1-c1", "c1-o2"],
        color: "#f97316",
      }),
    ],
  },
  {
    id: "glucose",
    compoundId: "glucose",
    displayName: "glucose",
    formula: "C6H12O6",
    atoms: [
      ...chainAtoms(6),
      atom("o1", "O", 42, 30),
      atom("o2", "O", 104, 154),
      atom("o3", "O", 166, 30),
      atom("o4", "O", 228, 154),
      atom("o5", "O", 290, 30),
      atom("o6", "O", 352, 154),
    ],
    bonds: [...chainBonds(6), bond("c1-o1", "c1", "o1"), bond("c2-o2", "c2", "o2"), bond("c3-o3", "c3", "o3"), bond("c4-o4", "c4", "o4"), bond("c5-o5", "c5", "o5"), bond("c6-o6", "c6", "o6")],
    functionalGroupHighlights: [
      highlight({
        id: "glucose-hydroxyls",
        group: "alcohol",
        label: "Multiple hydroxyl groups",
        atomIds: ["o1", "o2", "o3", "o4", "o5", "o6"],
        bondIds: ["c1-o1", "c2-o2", "c3-o3", "c4-o4", "c5-o5", "c6-o6"],
        color: "#14b8a6",
        description: "Glucose has several O-H groups; this is a simplified open-chain teaching sketch.",
      }),
    ],
  },
  {
    id: "aspirin",
    compoundId: "aspirin",
    displayName: "aspirin",
    formula: "C9H8O4",
    atoms: [
      ...benzeneDerivative({ id: "aspirin-ring", displayName: "aspirin ring", formula: "C6H4" }).atoms.map((item) => ({
        ...item,
        id: item.id,
      })),
      atom("c7", "C", 122, 0),
      atom("o1", "O", 122, -54),
      atom("o2", "O", 182, 0),
      atom("h-o", "H", 220, -28),
      atom("o3", "O", 70, 194),
      atom("c8", "C", 18, 220),
      atom("o4", "O", 18, 276),
      atom("c9", "C", -42, 220),
    ],
    bonds: [
      ...benzeneDerivative({ id: "aspirin-ring", displayName: "aspirin ring", formula: "C6H4" }).bonds,
      bond("c1-c7", "c1", "c7"),
      bond("c7-o1", "c7", "o1", 2),
      bond("c7-o2", "c7", "o2"),
      bond("o2-h-o", "o2", "h-o"),
      bond("c4-o3", "c4", "o3"),
      bond("o3-c8", "o3", "c8"),
      bond("c8-o4", "c8", "o4", 2),
      bond("c8-c9", "c8", "c9"),
    ],
    functionalGroupHighlights: [
      highlight({
        id: "aspirin-aromatic",
        group: "aromatic ring",
        label: "Aromatic ring",
        atomIds: ["c1", "c2", "c3", "c4", "c5", "c6"],
        bondIds: ["c1-c2", "c2-c3", "c3-c4", "c4-c5", "c5-c6", "c6-c1"],
        color: "#0ea5e9",
      }),
      highlight({
        id: "aspirin-carboxyl",
        group: "carboxylic acid",
        label: "Carboxylic acid",
        atomIds: ["c7", "o1", "o2", "h-o"],
        bondIds: ["c7-o1", "c7-o2", "o2-h-o"],
        color: "#22c55e",
      }),
      highlight({
        id: "aspirin-ester",
        group: "ester",
        label: "Ester",
        atomIds: ["o3", "c8", "o4", "c9"],
        bondIds: ["c4-o3", "o3-c8", "c8-o4", "c8-c9"],
        color: "#8b5cf6",
      }),
    ],
    notes: ["Simplified aspirin scaffold showing aromatic, ester, and carboxylic acid regions."],
  },
  {
    id: "ethanamide",
    compoundId: "ethanamide",
    displayName: "ethanamide",
    formula: "C2H5NO",
    atoms: [atom("c1", "C", 48, 92), atom("c2", "C", 110, 92), atom("o1", "O", 110, 30), atom("n1", "N", 174, 92), atom("h1", "H", 212, 62), atom("h2", "H", 212, 122)],
    bonds: [bond("c1-c2", "c1", "c2"), bond("c2-o1", "c2", "o1", 2), bond("c2-n1", "c2", "n1"), bond("n1-h1", "n1", "h1"), bond("n1-h2", "n1", "h2")],
    functionalGroupHighlights: [
      highlight({
        id: "ethanamide-amide",
        group: "amide",
        label: "Amide group",
        atomIds: ["c2", "o1", "n1", "h1", "h2"],
        bondIds: ["c2-o1", "c2-n1", "n1-h1", "n1-h2"],
        color: "#a855f7",
      }),
    ],
  },
  {
    id: "ethanenitrile",
    compoundId: "ethanenitrile",
    displayName: "ethanenitrile",
    formula: "C2H3N",
    atoms: [atom("c1", "C", 48, 92), atom("c2", "C", 112, 92), atom("n1", "N", 184, 92)],
    bonds: [bond("c1-c2", "c1", "c2"), bond("c2-n1", "c2", "n1", 3)],
    functionalGroupHighlights: [
      highlight({
        id: "ethanenitrile-nitrile",
        group: "nitrile",
        label: "C triple N nitrile",
        atomIds: ["c2", "n1"],
        bondIds: ["c2-n1"],
        color: "#06b6d4",
      }),
    ],
  },
]

const STRUCTURE_ALIASES: Record<string, string[]> = {
  "acetone": ["propanone", "dimethyl ketone"],
  "methanal": ["formaldehyde"],
  "methanol": ["CH3OH", "methyl alcohol"],
  "ethanol": ["C2H5OH", "CH3CH2OH", "ethyl alcohol"],
  "propan-1-ol": ["propanol", "C3H7OH", "CH3CH2CH2OH", "propyl alcohol", "1-propanol"],
  "butan-1-ol": ["butanol", "C4H9OH", "butyl alcohol", "1-butanol"],
  "ethanal": ["CH3CHO", "acetaldehyde"],
  "ethanoic-acid": ["acetic acid", "CH3COOH"],
  "methanoic-acid": ["formic acid", "HCOOH"],
  "methyl-ethanoate": ["CH3COOCH3"],
  "ethyl-ethanoate": ["CH3COOC2H5", "CH3COOCH2CH3"],
  "hydrogen-chloride": ["hydrochloric acid gas"],
  "hydrochloric-acid": ["aqueous hcl", "hcl aq"],
}

function structureKeys(structure: MolecularStructure2D): string[] {
  return [
    structure.id,
    structure.compoundId,
    structure.displayName,
    structure.formula,
    ...(STRUCTURE_ALIASES[structure.id] ?? []),
  ]
}

export function getStructureByCompoundId(id: string): MolecularStructure2D | undefined {
  const key = normalize(id.replace(/^compound-/, ""))
  return MOLECULAR_STRUCTURES.find((structure) =>
    [structure.id, structure.compoundId, ...structureKeys(structure)].some((value) => normalize(value.replace(/^compound-/, "")) === key),
  )
}

export function getStructureByName(name: string): MolecularStructure2D | undefined {
  const key = normalize(name)
  return MOLECULAR_STRUCTURES.find((structure) => structureKeys(structure).some((value) => normalize(value) === key))
}

export function getStructureByFormula(formula: string): MolecularStructure2D | undefined {
  const key = formulaKey(formula)
  return MOLECULAR_STRUCTURES.find((structure) => formulaKey(structure.formula) === key)
}

export function getStructureByFormulaOrName(value: string): MolecularStructure2D | undefined {
  return getStructureByName(value) ?? getStructureByFormula(value) ?? getStructureByCompoundId(value)
}

export function getStructureForCompound(compound: {
  id?: string
  name?: string
  formula?: string
  aliases?: string[]
}): MolecularStructure2D | undefined {
  const values = [compound.id, compound.name, compound.formula, ...(compound.aliases ?? [])].filter(
    (value): value is string => Boolean(value),
  )
  for (const value of values) {
    const match = getStructureByCompoundId(value) ?? getStructureByName(value) ?? getStructureByFormula(value)
    if (match) return match
  }
  return undefined
}

export function getStructuresWithHighlight(group: string): MolecularStructure2D[] {
  const key = normalize(group)
  return MOLECULAR_STRUCTURES.filter((structure) =>
    structure.functionalGroupHighlights?.some((item) => normalize(item.group).includes(key) || normalize(item.label).includes(key)),
  )
}

export function countFunctionalGroupHighlights(): number {
  return MOLECULAR_STRUCTURES.reduce((sum, structure) => sum + (structure.functionalGroupHighlights?.length ?? 0), 0)
}

export const SPECTROSCOPY_MAPPINGS: SpectroscopyMapping[] = [
  { id: "mapping-alcohol", spectroscopyRecordId: "alcohol", functionalGroup: "alcohol", exampleCompoundId: "ethanol", highlightGroup: "alcohol", assignment: "O-H stretch" },
  { id: "mapping-aldehyde", spectroscopyRecordId: "aldehyde", functionalGroup: "aldehyde", exampleCompoundId: "ethanal", highlightGroup: "aldehyde", assignment: "C=O stretch and aldehydic C-H stretch" },
  { id: "mapping-ketone", spectroscopyRecordId: "ketone", functionalGroup: "ketone", exampleCompoundId: "acetone", highlightGroup: "carbonyl", assignment: "Ketone C=O stretch" },
  { id: "mapping-carboxylic-acid", spectroscopyRecordId: "carboxylic-acid", functionalGroup: "carboxylic acid", exampleCompoundId: "ethanoic-acid", highlightGroup: "carboxylic acid", assignment: "Acid O-H and C=O stretches" },
  { id: "mapping-ester", spectroscopyRecordId: "ester", functionalGroup: "ester", exampleCompoundId: "ethyl-ethanoate", highlightGroup: "ester", assignment: "Ester C=O and C-O stretches" },
  { id: "mapping-amine", spectroscopyRecordId: "amine", functionalGroup: "amine", exampleCompoundId: "aniline", highlightGroup: "amine", assignment: "N-H stretch" },
  { id: "mapping-amide", spectroscopyRecordId: "amide", functionalGroup: "amide", exampleCompoundId: "ethanamide", highlightGroup: "amide", assignment: "Amide C=O and N-H stretches" },
  { id: "mapping-alkene", spectroscopyRecordId: "alkene", functionalGroup: "alkene", exampleCompoundId: "ethene", highlightGroup: "alkene", assignment: "C=C stretch" },
  { id: "mapping-alkyne", spectroscopyRecordId: "alkyne", functionalGroup: "alkyne", exampleCompoundId: "ethyne", highlightGroup: "alkyne", assignment: "C triple C stretch" },
  { id: "mapping-arene", spectroscopyRecordId: "arene", functionalGroup: "arene", exampleCompoundId: "benzene", highlightGroup: "aromatic ring", assignment: "Aromatic ring stretches" },
  { id: "mapping-nitrile", spectroscopyRecordId: "nitrile", functionalGroup: "nitrile", exampleCompoundId: "ethanenitrile", highlightGroup: "nitrile", assignment: "C triple N stretch" },
]

export function getSpectroscopyMapping(recordId: string): SpectroscopyMapping | undefined {
  const key = normalize(recordId)
  return SPECTROSCOPY_MAPPINGS.find((mapping) => normalize(mapping.spectroscopyRecordId) === key)
}

export function getExampleStructureForSpectroscopy(recordId: string): MolecularStructure2D | undefined {
  const mapping = getSpectroscopyMapping(recordId)
  return mapping ? getStructureByCompoundId(mapping.exampleCompoundId) : undefined
}

export const COMPOUND_PATHWAYS: CompoundPathway[] = [
  {
    id: "alkane-to-ester",
    title: "Alkane to Ester",
    description: "A classroom pathway from a saturated hydrocarbon toward an ester through unsaturation, hydration, oxidation, and esterification.",
    nodes: [
      { id: "alkane", compoundId: "ethane", label: "alkane", note: "Saturated starting point" },
      { id: "alkene", compoundId: "ethene", label: "alkene", note: "Unsaturated intermediate" },
      { id: "alcohol", compoundId: "ethanol", label: "alcohol" },
      { id: "aldehyde", compoundId: "ethanal", label: "aldehyde" },
      { id: "acid", compoundId: "ethanoic-acid", label: "carboxylic acid" },
      { id: "ester", compoundId: "ethyl-ethanoate", label: "ester" },
    ],
    edges: [
      { id: "alkane-alkene", from: "alkane", to: "alkene", reactionType: "elimination/cracking", note: "Create a C=C bond" },
      { id: "alkene-alcohol", from: "alkene", to: "alcohol", reactionType: "hydration", reagent: "H2O / acid catalyst" },
      { id: "alcohol-aldehyde", from: "alcohol", to: "aldehyde", reactionType: "oxidation", reagent: "[O]" },
      { id: "aldehyde-acid", from: "aldehyde", to: "acid", reactionType: "oxidation", reagent: "[O]" },
      { id: "acid-ester", from: "acid", to: "ester", reactionType: "esterification", reagent: "ethanol / H+" },
    ],
  },
  {
    id: "benzene-functionalization",
    title: "Benzene Functionalization",
    description: "Aromatic pathway examples showing how benzene can lead to nitro, amine, and phenol derivatives.",
    nodes: [
      { id: "benzene", compoundId: "benzene", label: "benzene" },
      { id: "nitrobenzene", compoundId: "nitrobenzene", label: "nitrobenzene" },
      { id: "aniline", compoundId: "aniline", label: "aniline" },
      { id: "phenol", compoundId: "phenol", label: "phenol" },
    ],
    edges: [
      { id: "benzene-nitrobenzene", from: "benzene", to: "nitrobenzene", reactionType: "nitration", reagent: "HNO3 / H2SO4" },
      { id: "nitrobenzene-aniline", from: "nitrobenzene", to: "aniline", reactionType: "reduction", reagent: "Sn/HCl or H2 catalyst" },
      { id: "aniline-phenol", from: "aniline", to: "phenol", reactionType: "diazotization then hydrolysis", note: "Conceptual advanced pathway" },
    ],
  },
  {
    id: "ethene-to-ethyl-ethanoate",
    title: "Ethene to Ethyl Ethanoate",
    description: "A focused pathway linking alkene hydration, oxidation, and ester formation.",
    nodes: [
      { id: "ethene", compoundId: "ethene", label: "ethene" },
      { id: "ethanol", compoundId: "ethanol", label: "ethanol" },
      { id: "ethanoic-acid", compoundId: "ethanoic-acid", label: "ethanoic acid" },
      { id: "ethyl-ethanoate", compoundId: "ethyl-ethanoate", label: "ethyl ethanoate" },
    ],
    edges: [
      { id: "ethene-ethanol", from: "ethene", to: "ethanol", reactionType: "hydration", reagent: "steam / acid catalyst" },
      { id: "ethanol-ethanoic-acid", from: "ethanol", to: "ethanoic-acid", reactionType: "oxidation", reagent: "acidified oxidizing agent" },
      { id: "ethanoic-acid-ethyl-ethanoate", from: "ethanoic-acid", to: "ethyl-ethanoate", reactionType: "esterification", reagent: "ethanol / H+" },
    ],
  },
]
