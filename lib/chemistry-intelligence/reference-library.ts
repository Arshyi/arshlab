import type { MolecularGraph, MolecularGraphNode } from "../vision/molecular-graph"
import type { IntelligenceCompoundRecord } from "./types"

type ElementSymbol = MolecularGraphNode["inferredElement"]
type BondTuple = [number, number, 1 | 2 | 3]

export interface ReferenceGraph {
  compoundId: string
  graph: MolecularGraph
}

type ReferenceGraphFactory = (
  compoundId: string,
  nodes: Array<ElementSymbol | MolecularGraphNode>,
  bonds: Array<[number, number, (1 | 2 | 3)?]>,
  rings?: Array<{ nodeIds: number[]; aromatic?: boolean; kind?: "benzene-like" | "cyclohexane-like" | "cyclopentane-like" | "ring" }>,
  formula?: string,
) => ReferenceGraph

interface ReferenceSeed {
  id: string
  name: string
  formula: string
  aliases?: string[]
  family: string
  functionalGroups: string[]
  polarity?: IntelligenceCompoundRecord["polarity"]
  physicalState?: IntelligenceCompoundRecord["physicalState"]
  curriculumTopicId?: string
  formulaId?: string
  practiceTopic?: string
  examTopic?: string
  mechanismIds?: string[]
  reactionIds?: string[]
  commonReactions?: string[]
  safetyNotes?: string[]
  graph: (factory: ReferenceGraphFactory) => ReferenceGraph
}

const ORGANIC_FORMULA = "organic-homologous-series"
const ORGANIC_UNSATURATION = "organic-degree-unsaturation"
const PH_FORMULA = "acids-bases-ph"
const STOICHIOMETRY_FORMULA = "stoichiometry-moles-from-mass"

const benzeneRing: BondTuple[] = [
  [0, 1, 2],
  [1, 2, 1],
  [2, 3, 2],
  [3, 4, 1],
  [4, 5, 2],
  [5, 0, 1],
]

function chainBonds(count: number, multipleBonds: Record<number, 1 | 2 | 3> = {}): BondTuple[] {
  return Array.from({ length: Math.max(0, count - 1) }, (_, index) => [
    index,
    index + 1,
    multipleBonds[index] ?? 1,
  ])
}

function chainGraph(
  factory: ReferenceGraphFactory,
  id: string,
  carbons: number,
  formula: string,
  multipleBonds: Record<number, 1 | 2 | 3> = {},
): ReferenceGraph {
  return factory(id, Array.from({ length: carbons }, () => "C" as const), chainBonds(carbons, multipleBonds), [], formula)
}

function alcoholGraph(factory: ReferenceGraphFactory, id: string, carbons: number, position: number, formula: string): ReferenceGraph {
  const nodes: ElementSymbol[] = Array.from({ length: carbons }, () => "C")
  const oxygenIndex = nodes.push("O") - 1
  return factory(id, nodes, [...chainBonds(carbons), [position, oxygenIndex, 1]], [], formula)
}

function carbonylGraph(factory: ReferenceGraphFactory, id: string, carbons: number, carbonylIndex: number, formula: string): ReferenceGraph {
  const nodes: ElementSymbol[] = Array.from({ length: carbons }, () => "C")
  const oxygenIndex = nodes.push("O") - 1
  return factory(id, nodes, [...chainBonds(carbons), [carbonylIndex, oxygenIndex, 2]], [], formula)
}

function acidGraph(factory: ReferenceGraphFactory, id: string, carbons: number, formula: string): ReferenceGraph {
  const nodes: ElementSymbol[] = Array.from({ length: carbons }, () => "C")
  const carbonylCarbon = carbons - 1
  const doubleO = nodes.push("O") - 1
  const singleO = nodes.push("O") - 1
  return factory(id, nodes, [...chainBonds(carbons), [carbonylCarbon, doubleO, 2], [carbonylCarbon, singleO, 1]], [], formula)
}

function esterGraph(
  factory: ReferenceGraphFactory,
  id: string,
  acidCarbons: number,
  alkoxyCarbons: number,
  formula: string,
): ReferenceGraph {
  const nodes: ElementSymbol[] = Array.from({ length: acidCarbons }, () => "C")
  const carbonylCarbon = acidCarbons - 1
  const doubleO = nodes.push("O") - 1
  const singleO = nodes.push("O") - 1
  const alkoxyStart = nodes.length
  for (let index = 0; index < alkoxyCarbons; index += 1) nodes.push("C")
  const bonds: BondTuple[] = [
    ...chainBonds(acidCarbons),
    [carbonylCarbon, doubleO, 2],
    [carbonylCarbon, singleO, 1],
    [singleO, alkoxyStart, 1],
  ]
  for (let index = 0; index < alkoxyCarbons - 1; index += 1) bonds.push([alkoxyStart + index, alkoxyStart + index + 1, 1])
  return factory(id, nodes, bonds, [], formula)
}

function amineGraph(factory: ReferenceGraphFactory, id: string, alkylLengths: number[], formula: string): ReferenceGraph {
  const nodes: ElementSymbol[] = ["N"]
  const bonds: BondTuple[] = []
  alkylLengths.forEach((length) => {
    const start = nodes.length
    for (let index = 0; index < length; index += 1) nodes.push("C")
    bonds.push([0, start, 1])
    for (let index = 0; index < length - 1; index += 1) bonds.push([start + index, start + index + 1, 1])
  })
  return factory(id, nodes, bonds, [], formula)
}

function haloGraph(
  factory: ReferenceGraphFactory,
  id: string,
  carbons: number,
  halogens: Array<{ element: ElementSymbol; position: number }>,
  formula: string,
): ReferenceGraph {
  const nodes: ElementSymbol[] = Array.from({ length: carbons }, () => "C")
  const bonds: BondTuple[] = chainBonds(carbons)
  halogens.forEach((halogen) => {
    const index = nodes.push(halogen.element) - 1
    bonds.push([halogen.position, index, 1])
  })
  return factory(id, nodes, bonds, [], formula)
}

function cycloGraph(
  factory: ReferenceGraphFactory,
  id: string,
  elements: ElementSymbol[],
  formula: string,
  multipleBonds: Record<number, 1 | 2 | 3> = {},
  aromatic = false,
): ReferenceGraph {
  const bonds = elements.map((_, index) => [index, (index + 1) % elements.length, multipleBonds[index] ?? 1] as BondTuple)
  return factory(id, elements, bonds, [{ nodeIds: elements.map((_, index) => index), aromatic }], formula)
}

interface Fragment {
  attachAt: number
  elements: ElementSymbol[]
  bonds?: BondTuple[]
  attachIndex?: number
}

function benzeneDerivative(factory: ReferenceGraphFactory, id: string, formula: string, fragments: Fragment[]): ReferenceGraph {
  const nodes: ElementSymbol[] = ["C", "C", "C", "C", "C", "C"]
  const bonds: BondTuple[] = [...benzeneRing]
  fragments.forEach((fragment) => {
    const offset = nodes.length
    nodes.push(...fragment.elements)
    bonds.push([fragment.attachAt, offset + (fragment.attachIndex ?? 0), 1])
    fragment.bonds?.forEach(([start, end, order]) => bonds.push([offset + start, offset + end, order]))
  })
  return factory(id, nodes, bonds, [{ nodeIds: [0, 1, 2, 3, 4, 5], aromatic: true }], formula)
}

function aminoAcidGraph(factory: ReferenceGraphFactory, id: string, formula: string, sideChain: Fragment): ReferenceGraph {
  const nodes: ElementSymbol[] = ["N", "C", "C", "O", "O", ...sideChain.elements]
  const bonds: BondTuple[] = [
    [0, 1, 1],
    [1, 2, 1],
    [2, 3, 2],
    [2, 4, 1],
    [1, 5 + (sideChain.attachIndex ?? 0), 1],
    ...(sideChain.bonds ?? []).map(([start, end, order]) => [5 + start, 5 + end, order] as BondTuple),
  ]
  return factory(id, nodes, bonds, [], formula)
}

function polyhydroxyCarbonylGraph(factory: ReferenceGraphFactory, id: string, carbons: number, formula: string, ketoneAt = 0): ReferenceGraph {
  const nodes: ElementSymbol[] = Array.from({ length: carbons }, () => "C")
  const bonds: BondTuple[] = chainBonds(carbons)
  const carbonylO = nodes.push("O") - 1
  bonds.push([ketoneAt, carbonylO, 2])
  for (let index = 0; index < carbons; index += 1) {
    if (index === ketoneAt) continue
    const oxygen = nodes.push("O") - 1
    bonds.push([index, oxygen, 1])
  }
  return factory(id, nodes, bonds, [], formula)
}

function seed(
  id: string,
  name: string,
  formula: string,
  family: string,
  functionalGroups: string[],
  graph: ReferenceSeed["graph"],
  options: Omit<Partial<ReferenceSeed>, "id" | "name" | "formula" | "family" | "functionalGroups" | "graph"> = {},
): ReferenceSeed {
  return { id, name, formula, family, functionalGroups, graph, ...options }
}

function topicFor(groups: string[], family: string): string {
  const haystack = `${family} ${groups.join(" ")}`.toLowerCase()
  if (/carboxylic/.test(haystack)) return "carboxylic-acids"
  if (/ester/.test(haystack)) return "esters"
  if (/aldehyde|ketone|amide|carbonyl|acid chloride|anhydride/.test(haystack)) return "carbonyl-chemistry"
  if (/alcohol|phenol/.test(haystack)) return "alcohols"
  if (/aromatic|arene|heteroaromatic/.test(haystack)) return "aromatics"
  if (/alkene/.test(haystack)) return "alkenes"
  if (/alkyne/.test(haystack)) return "alkynes"
  if (/alkane|cycloalkane/.test(haystack)) return "alkanes"
  if (/halo|amine|amino|nitrile|heterocycle/.test(haystack)) return "functional-groups"
  return "functional-groups"
}

function formulaFor(groups: string[], family: string): string {
  const haystack = `${family} ${groups.join(" ")}`.toLowerCase()
  if (/acid|amine/.test(haystack)) return PH_FORMULA
  if (/alkene|alkyne|aromatic|arene|cyclo/.test(haystack)) return ORGANIC_UNSATURATION
  return ORGANIC_FORMULA
}

function polarityFor(groups: string[], family: string): IntelligenceCompoundRecord["polarity"] {
  const haystack = `${family} ${groups.join(" ")}`.toLowerCase()
  if (/salt|ionic/.test(haystack)) return "Ionic"
  if (/alcohol|phenol|acid|amine|amide|ester|ether|carbonyl|ketone|aldehyde|nitrile|halide|hetero|sugar|amino/.test(haystack)) return "Polar"
  return "Nonpolar"
}

function reactionsFor(groups: string[], family: string): string[] {
  const haystack = `${family} ${groups.join(" ")}`.toLowerCase()
  const reactions: string[] = []
  if (/alkene/.test(haystack)) reactions.push("Addition reactions", "Hydrogenation", "Halogenation")
  if (/alkyne/.test(haystack)) reactions.push("Addition reactions")
  if (/alcohol/.test(haystack)) reactions.push("Oxidation", "Esterification")
  if (/aldehyde/.test(haystack)) reactions.push("Oxidation to carboxylic acid")
  if (/ketone/.test(haystack)) reactions.push("Nucleophilic addition")
  if (/carboxylic/.test(haystack)) reactions.push("Esterification", "Acid-base reactions")
  if (/ester|amide/.test(haystack)) reactions.push("Hydrolysis")
  if (/aromatic|arene|phenol/.test(haystack)) reactions.push("Electrophilic aromatic substitution")
  if (/halo/.test(haystack)) reactions.push("Nucleophilic substitution", "Elimination")
  if (/amine/.test(haystack)) reactions.push("Acid-base reactions")
  return reactions.length ? reactions : ["Functional group identification"]
}

function toRecord(current: ReferenceSeed): IntelligenceCompoundRecord {
  return {
    id: current.id,
    name: current.name,
    formula: current.formula,
    aliases: current.aliases ?? [],
    family: current.family,
    functionalGroups: current.functionalGroups,
    polarity: current.polarity ?? polarityFor(current.functionalGroups, current.family),
    physicalState: current.physicalState ?? "unknown",
    commonReactions: current.commonReactions ?? reactionsFor(current.functionalGroups, current.family),
    curriculumTopicId: current.curriculumTopicId ?? topicFor(current.functionalGroups, current.family),
    formulaId: current.formulaId ?? formulaFor(current.functionalGroups, current.family),
    practiceTopic: current.practiceTopic ?? "Functional Group Identification",
    examTopic: current.examTopic ?? "Functional Group Identification",
    mechanismIds: current.mechanismIds,
    reactionIds: current.reactionIds,
    spectroscopyCompoundId: current.id,
    safetyNotes: current.safetyNotes,
  }
}

const alkaneSeeds = [
  ["pentane", "Pentane", 5, "C5H12"],
  ["hexane", "Hexane", 6, "C6H14"],
  ["heptane", "Heptane", 7, "C7H16"],
  ["octane", "Octane", 8, "C8H18"],
  ["nonane", "Nonane", 9, "C9H20"],
  ["decane", "Decane", 10, "C10H22"],
] as const

const alkeneSeeds = [
  ["but-1-ene", "But-1-ene", 4, "C4H8", 0],
  ["but-2-ene", "But-2-ene", 4, "C4H8", 1],
  ["pent-1-ene", "Pent-1-ene", 5, "C5H10", 0],
  ["hex-1-ene", "Hex-1-ene", 6, "C6H12", 0],
] as const

const alkyneSeeds = [
  ["propyne", "Propyne", 3, "C3H4", 0],
  ["but-1-yne", "But-1-yne", 4, "C4H6", 0],
  ["but-2-yne", "But-2-yne", 4, "C4H6", 1],
  ["pent-1-yne", "Pent-1-yne", 5, "C5H8", 0],
  ["hex-1-yne", "Hex-1-yne", 6, "C6H10", 0],
] as const

const REFERENCE_SEEDS: ReferenceSeed[] = [
  ...alkaneSeeds.map(([id, name, carbons, formula]) =>
    seed(id, name, formula, "Alkane", ["alkane"], (factory) => chainGraph(factory, id, carbons, formula), {
      physicalState: carbons <= 4 ? "gas" : carbons <= 10 ? "liquid" : "solid",
      curriculumTopicId: "alkanes",
      formulaId: ORGANIC_FORMULA,
      examTopic: "Organic Reactions",
    })),
  seed("2-methylpropane", "2-Methylpropane", "C4H10", "Alkane", ["alkane", "branched alkane"], (factory) =>
    factory("2-methylpropane", ["C", "C", "C", "C"], [[1, 0, 1], [1, 2, 1], [1, 3, 1]], [], "C4H10"), { aliases: ["isobutane"], curriculumTopicId: "alkanes" }),
  seed("2-methylbutane", "2-Methylbutane", "C5H12", "Alkane", ["alkane", "branched alkane"], (factory) =>
    factory("2-methylbutane", ["C", "C", "C", "C", "C"], [[0, 1, 1], [1, 2, 1], [2, 3, 1], [1, 4, 1]], [], "C5H12"), { aliases: ["isopentane"], curriculumTopicId: "alkanes" }),
  seed("2-2-dimethylpropane", "2,2-Dimethylpropane", "C5H12", "Alkane", ["alkane", "branched alkane"], (factory) =>
    factory("2-2-dimethylpropane", ["C", "C", "C", "C", "C"], [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]], [], "C5H12"), { aliases: ["neopentane"], curriculumTopicId: "alkanes" }),

  ...alkeneSeeds.map(([id, name, carbons, formula, doubleAt]) =>
    seed(id, name, formula, "Alkene", ["alkene"], (factory) => chainGraph(factory, id, carbons, formula, { [doubleAt]: 2 }), {
      curriculumTopicId: "alkenes",
      formulaId: ORGANIC_UNSATURATION,
      mechanismIds: ["alkene-bromination", "alkene-hydration", "alkene-hydrogenation"],
      examTopic: "Organic Reactions",
    })),
  seed("cyclopentene", "Cyclopentene", "C5H8", "Cycloalkene", ["alkene", "cycloalkene"], (factory) =>
    cycloGraph(factory, "cyclopentene", ["C", "C", "C", "C", "C"], "C5H8", { 0: 2 }), { curriculumTopicId: "alkenes", formulaId: ORGANIC_UNSATURATION }),
  ...alkyneSeeds.map(([id, name, carbons, formula, tripleAt]) =>
    seed(id, name, formula, "Alkyne", ["alkyne"], (factory) => chainGraph(factory, id, carbons, formula, { [tripleAt]: 3 }), {
      curriculumTopicId: "alkynes",
      formulaId: ORGANIC_UNSATURATION,
      examTopic: "Organic Reactions",
    })),

  seed("butan-1-ol", "Butan-1-ol", "C4H10O", "Alcohol", ["alcohol"], (factory) => alcoholGraph(factory, "butan-1-ol", 4, 0, "C4H10O"), { aliases: ["1-butanol"], curriculumTopicId: "alcohols", mechanismIds: ["alcohol-oxidation"] }),
  seed("butan-2-ol", "Butan-2-ol", "C4H10O", "Alcohol", ["alcohol"], (factory) => alcoholGraph(factory, "butan-2-ol", 4, 1, "C4H10O"), { aliases: ["2-butanol"], curriculumTopicId: "alcohols", mechanismIds: ["alcohol-oxidation"] }),
  seed("2-methylpropan-2-ol", "2-Methylpropan-2-ol", "C4H10O", "Alcohol", ["alcohol", "tertiary alcohol"], (factory) =>
    factory("2-methylpropan-2-ol", ["C", "C", "C", "C", "O"], [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]], [], "C4H10O"), { aliases: ["tert-butanol"], curriculumTopicId: "alcohols" }),
  seed("pentan-1-ol", "Pentan-1-ol", "C5H12O", "Alcohol", ["alcohol"], (factory) => alcoholGraph(factory, "pentan-1-ol", 5, 0, "C5H12O"), { aliases: ["1-pentanol"], curriculumTopicId: "alcohols" }),
  seed("ethane-1-2-diol", "Ethane-1,2-diol", "C2H6O2", "Diol", ["alcohol", "diol"], (factory) =>
    factory("ethane-1-2-diol", ["C", "C", "O", "O"], [[0, 1, 1], [0, 2, 1], [1, 3, 1]], [], "C2H6O2"), { aliases: ["ethylene glycol"], curriculumTopicId: "alcohols" }),
  seed("glycerol", "Glycerol", "C3H8O3", "Triol", ["alcohol", "triol"], (factory) =>
    factory("glycerol", ["C", "C", "C", "O", "O", "O"], [[0, 1, 1], [1, 2, 1], [0, 3, 1], [1, 4, 1], [2, 5, 1]], [], "C3H8O3"), { aliases: ["propane-1,2,3-triol"], curriculumTopicId: "alcohols" }),
  seed("benzyl-alcohol", "Benzyl alcohol", "C7H8O", "Aromatic alcohol", ["alcohol", "arene"], (factory) =>
    benzeneDerivative(factory, "benzyl-alcohol", "C7H8O", [{ attachAt: 0, elements: ["C", "O"], bonds: [[0, 1, 1]] }]), { curriculumTopicId: "alcohols" }),

  seed("butanal", "Butanal", "C4H8O", "Aldehyde", ["aldehyde", "carbonyl"], (factory) => carbonylGraph(factory, "butanal", 4, 0, "C4H8O"), { curriculumTopicId: "carbonyl-chemistry" }),
  seed("pentanal", "Pentanal", "C5H10O", "Aldehyde", ["aldehyde", "carbonyl"], (factory) => carbonylGraph(factory, "pentanal", 5, 0, "C5H10O"), { curriculumTopicId: "carbonyl-chemistry" }),
  seed("benzaldehyde", "Benzaldehyde", "C7H6O", "Aromatic aldehyde", ["aldehyde", "carbonyl", "arene"], (factory) =>
    benzeneDerivative(factory, "benzaldehyde", "C7H6O", [{ attachAt: 0, elements: ["C", "O"], bonds: [[0, 1, 2]] }]), { curriculumTopicId: "carbonyl-chemistry" }),
  seed("cyclohexanone", "Cyclohexanone", "C6H10O", "Ketone", ["ketone", "carbonyl", "cycloalkanone"], (factory) => {
    const nodes: ElementSymbol[] = ["C", "C", "C", "C", "C", "C", "O"]
    return factory("cyclohexanone", nodes, [[0, 1, 1], [1, 2, 1], [2, 3, 1], [3, 4, 1], [4, 5, 1], [5, 0, 1], [0, 6, 2]], [{ nodeIds: [0, 1, 2, 3, 4, 5] }], "C6H10O")
  }, { curriculumTopicId: "carbonyl-chemistry" }),
  seed("cyclopentanone", "Cyclopentanone", "C5H8O", "Ketone", ["ketone", "carbonyl", "cycloalkanone"], (factory) => {
    const nodes: ElementSymbol[] = ["C", "C", "C", "C", "C", "O"]
    return factory("cyclopentanone", nodes, [[0, 1, 1], [1, 2, 1], [2, 3, 1], [3, 4, 1], [4, 0, 1], [0, 5, 2]], [{ nodeIds: [0, 1, 2, 3, 4] }], "C5H8O")
  }, { curriculumTopicId: "carbonyl-chemistry" }),
  seed("pentan-2-one", "Pentan-2-one", "C5H10O", "Ketone", ["ketone", "carbonyl"], (factory) => carbonylGraph(factory, "pentan-2-one", 5, 1, "C5H10O"), { curriculumTopicId: "carbonyl-chemistry" }),
  seed("pentan-3-one", "Pentan-3-one", "C5H10O", "Ketone", ["ketone", "carbonyl"], (factory) => carbonylGraph(factory, "pentan-3-one", 5, 2, "C5H10O"), { curriculumTopicId: "carbonyl-chemistry" }),

  seed("butanoic-acid", "Butanoic acid", "C4H8O2", "Carboxylic acid", ["carboxylic acid", "carbonyl"], (factory) => acidGraph(factory, "butanoic-acid", 4, "C4H8O2"), { curriculumTopicId: "carboxylic-acids", mechanismIds: ["esterification"] }),
  seed("pentanoic-acid", "Pentanoic acid", "C5H10O2", "Carboxylic acid", ["carboxylic acid", "carbonyl"], (factory) => acidGraph(factory, "pentanoic-acid", 5, "C5H10O2"), { curriculumTopicId: "carboxylic-acids", mechanismIds: ["esterification"] }),
  seed("oxalic-acid", "Oxalic acid", "C2H2O4", "Dicarboxylic acid", ["carboxylic acid", "dicarboxylic acid", "carbonyl"], (factory) =>
    factory("oxalic-acid", ["C", "C", "O", "O", "O", "O"], [[0, 1, 1], [0, 2, 2], [0, 3, 1], [1, 4, 2], [1, 5, 1]], [], "C2H2O4"), { curriculumTopicId: "carboxylic-acids" }),
  seed("lactic-acid", "Lactic acid", "C3H6O3", "Hydroxy acid", ["carboxylic acid", "alcohol", "carbonyl"], (factory) =>
    factory("lactic-acid", ["C", "C", "C", "O", "O", "O"], [[0, 1, 1], [1, 2, 1], [2, 3, 2], [2, 4, 1], [1, 5, 1]], [], "C3H6O3"), { curriculumTopicId: "carboxylic-acids" }),
  seed("salicylic-acid", "Salicylic acid", "C7H6O3", "Aromatic carboxylic acid", ["carboxylic acid", "phenol", "arene"], (factory) =>
    benzeneDerivative(factory, "salicylic-acid", "C7H6O3", [
      { attachAt: 0, elements: ["C", "O", "O"], bonds: [[0, 1, 2], [0, 2, 1]] },
      { attachAt: 1, elements: ["O"] },
    ]), { curriculumTopicId: "carboxylic-acids" }),
  seed("maleic-acid", "Maleic acid", "C4H4O4", "Dicarboxylic acid", ["carboxylic acid", "alkene", "carbonyl"], (factory) =>
    factory("maleic-acid", ["C", "C", "C", "C", "O", "O", "O", "O"], [[0, 1, 2], [0, 2, 1], [1, 3, 1], [2, 4, 2], [2, 5, 1], [3, 6, 2], [3, 7, 1]], [], "C4H4O4"), { curriculumTopicId: "carboxylic-acids" }),
  seed("citric-acid", "Citric acid", "C6H8O7", "Hydroxy tricarboxylic acid", ["carboxylic acid", "alcohol", "carbonyl"], (factory) =>
    factory("citric-acid", ["C", "C", "C", "C", "C", "C", "O", "O", "O", "O", "O", "O", "O"], [[0, 1, 1], [1, 2, 1], [1, 3, 1], [0, 4, 1], [2, 5, 1], [4, 6, 2], [4, 7, 1], [3, 8, 2], [3, 9, 1], [5, 10, 2], [5, 11, 1], [1, 12, 1]], [], "C6H8O7"), { curriculumTopicId: "carboxylic-acids" }),

  seed("ethyl-methanoate", "Ethyl methanoate", "C3H6O2", "Ester", ["ester", "carbonyl"], (factory) => esterGraph(factory, "ethyl-methanoate", 1, 2, "C3H6O2"), { curriculumTopicId: "esters", mechanismIds: ["esterification"] }),
  seed("methyl-propanoate", "Methyl propanoate", "C4H8O2", "Ester", ["ester", "carbonyl"], (factory) => esterGraph(factory, "methyl-propanoate", 3, 1, "C4H8O2"), { curriculumTopicId: "esters", mechanismIds: ["esterification"] }),
  seed("propyl-ethanoate", "Propyl ethanoate", "C5H10O2", "Ester", ["ester", "carbonyl"], (factory) => esterGraph(factory, "propyl-ethanoate", 2, 3, "C5H10O2"), { curriculumTopicId: "esters", mechanismIds: ["esterification"] }),
  seed("ethyl-benzoate", "Ethyl benzoate", "C9H10O2", "Aromatic ester", ["ester", "carbonyl", "arene"], (factory) =>
    benzeneDerivative(factory, "ethyl-benzoate", "C9H10O2", [{ attachAt: 0, elements: ["C", "O", "O", "C", "C"], bonds: [[0, 1, 2], [0, 2, 1], [2, 3, 1], [3, 4, 1]] }]), { curriculumTopicId: "esters" }),
  seed("propanamide", "Propanamide", "C3H7NO", "Amide", ["amide", "carbonyl"], (factory) =>
    factory("propanamide", ["C", "C", "C", "O", "N"], [[0, 1, 1], [1, 2, 1], [2, 3, 2], [2, 4, 1]], [], "C3H7NO"), { curriculumTopicId: "carbonyl-chemistry" }),
  seed("benzamide", "Benzamide", "C7H7NO", "Aromatic amide", ["amide", "carbonyl", "arene"], (factory) =>
    benzeneDerivative(factory, "benzamide", "C7H7NO", [{ attachAt: 0, elements: ["C", "O", "N"], bonds: [[0, 1, 2], [0, 2, 1]] }]), { curriculumTopicId: "carbonyl-chemistry" }),
  seed("urea", "Urea", "CH4N2O", "Amide", ["amide", "carbonyl"], (factory) =>
    factory("urea", ["C", "O", "N", "N"], [[0, 1, 2], [0, 2, 1], [0, 3, 1]], [], "CH4N2O"), { curriculumTopicId: "carbonyl-chemistry" }),
  seed("acetanilide", "Acetanilide", "C8H9NO", "Aromatic amide", ["amide", "carbonyl", "arene"], (factory) =>
    benzeneDerivative(factory, "acetanilide", "C8H9NO", [{ attachAt: 0, elements: ["N", "C", "O", "C"], bonds: [[0, 1, 1], [1, 2, 2], [1, 3, 1]] }]), { curriculumTopicId: "carbonyl-chemistry" }),

  seed("methylamine", "Methylamine", "CH5N", "Amine", ["amine"], (factory) => amineGraph(factory, "methylamine", [1], "CH5N"), { curriculumTopicId: "functional-groups" }),
  seed("dimethylamine", "Dimethylamine", "C2H7N", "Amine", ["amine", "secondary amine"], (factory) => amineGraph(factory, "dimethylamine", [1, 1], "C2H7N"), { curriculumTopicId: "functional-groups" }),
  seed("trimethylamine", "Trimethylamine", "C3H9N", "Amine", ["amine", "tertiary amine"], (factory) => amineGraph(factory, "trimethylamine", [1, 1, 1], "C3H9N"), { curriculumTopicId: "functional-groups" }),
  seed("propylamine", "Propylamine", "C3H9N", "Amine", ["amine", "primary amine"], (factory) => amineGraph(factory, "propylamine", [3], "C3H9N"), { curriculumTopicId: "functional-groups" }),
  seed("diethylamine", "Diethylamine", "C4H11N", "Amine", ["amine", "secondary amine"], (factory) => amineGraph(factory, "diethylamine", [2, 2], "C4H11N"), { curriculumTopicId: "functional-groups" }),
  seed("triethylamine", "Triethylamine", "C6H15N", "Amine", ["amine", "tertiary amine"], (factory) => amineGraph(factory, "triethylamine", [2, 2, 2], "C6H15N"), { curriculumTopicId: "functional-groups", safetyNotes: ["Volatile base; educational reference only."] }),
  seed("pyrrolidine", "Pyrrolidine", "C4H9N", "Cyclic amine", ["amine", "heterocycle"], (factory) => cycloGraph(factory, "pyrrolidine", ["N", "C", "C", "C", "C"], "C4H9N"), { curriculumTopicId: "functional-groups" }),
  seed("piperidine", "Piperidine", "C5H11N", "Cyclic amine", ["amine", "heterocycle"], (factory) => cycloGraph(factory, "piperidine", ["N", "C", "C", "C", "C", "C"], "C5H11N"), { curriculumTopicId: "functional-groups" }),
  seed("morpholine", "Morpholine", "C4H9NO", "Cyclic amine ether", ["amine", "ether", "heterocycle"], (factory) => cycloGraph(factory, "morpholine", ["N", "C", "C", "O", "C", "C"], "C4H9NO"), { curriculumTopicId: "functional-groups" }),

  seed("chloromethane", "Chloromethane", "CH3Cl", "Haloalkane", ["haloalkane", "organohalide"], (factory) => haloGraph(factory, "chloromethane", 1, [{ element: "Cl", position: 0 }], "CH3Cl"), { curriculumTopicId: "organic-mechanisms", mechanismIds: ["sn2-substitution"] }),
  seed("bromomethane", "Bromomethane", "CH3Br", "Haloalkane", ["haloalkane", "organohalide"], (factory) => haloGraph(factory, "bromomethane", 1, [{ element: "Br", position: 0 }], "CH3Br"), { curriculumTopicId: "organic-mechanisms", mechanismIds: ["sn2-substitution"] }),
  seed("iodomethane", "Iodomethane", "CH3I", "Haloalkane", ["haloalkane", "organohalide"], (factory) => haloGraph(factory, "iodomethane", 1, [{ element: "I", position: 0 }], "CH3I"), { curriculumTopicId: "organic-mechanisms", mechanismIds: ["sn2-substitution"] }),
  seed("1-chloropropane", "1-Chloropropane", "C3H7Cl", "Haloalkane", ["haloalkane", "organohalide"], (factory) => haloGraph(factory, "1-chloropropane", 3, [{ element: "Cl", position: 0 }], "C3H7Cl"), { curriculumTopicId: "organic-mechanisms", mechanismIds: ["sn2-substitution", "e2-elimination"] }),
  seed("2-chloropropane", "2-Chloropropane", "C3H7Cl", "Haloalkane", ["haloalkane", "organohalide"], (factory) => haloGraph(factory, "2-chloropropane", 3, [{ element: "Cl", position: 1 }], "C3H7Cl"), { curriculumTopicId: "organic-mechanisms", mechanismIds: ["sn1-substitution", "e1-elimination"] }),
  seed("2-bromopropane", "2-Bromopropane", "C3H7Br", "Haloalkane", ["haloalkane", "organohalide"], (factory) => haloGraph(factory, "2-bromopropane", 3, [{ element: "Br", position: 1 }], "C3H7Br"), { curriculumTopicId: "organic-mechanisms", mechanismIds: ["sn1-substitution", "e1-elimination"] }),
  seed("2-chloro-2-methylpropane", "2-Chloro-2-methylpropane", "C4H9Cl", "Tertiary haloalkane", ["haloalkane", "organohalide"], (factory) =>
    factory("2-chloro-2-methylpropane", ["C", "C", "C", "C", "Cl"], [[0, 1, 1], [0, 2, 1], [0, 3, 1], [0, 4, 1]], [], "C4H9Cl"), { aliases: ["tert-butyl chloride"], curriculumTopicId: "organic-mechanisms", mechanismIds: ["sn1-substitution", "e1-elimination"] }),
  seed("dichloromethane", "Dichloromethane", "CH2Cl2", "Halogenated solvent", ["haloalkane", "organohalide"], (factory) => haloGraph(factory, "dichloromethane", 1, [{ element: "Cl", position: 0 }, { element: "Cl", position: 0 }], "CH2Cl2"), { aliases: ["methylene chloride"], safetyNotes: ["Common organic solvent; educational reference only."] }),
  seed("chloroform", "Chloroform", "CHCl3", "Halogenated solvent", ["haloalkane", "organohalide"], (factory) => haloGraph(factory, "chloroform", 1, [{ element: "Cl", position: 0 }, { element: "Cl", position: 0 }, { element: "Cl", position: 0 }], "CHCl3"), { safetyNotes: ["Volatile halogenated solvent; educational reference only."] }),
  seed("carbon-tetrachloride", "Carbon tetrachloride", "CCl4", "Halogenated solvent", ["haloalkane", "organohalide"], (factory) => haloGraph(factory, "carbon-tetrachloride", 1, [{ element: "Cl", position: 0 }, { element: "Cl", position: 0 }, { element: "Cl", position: 0 }, { element: "Cl", position: 0 }], "CCl4"), { safetyNotes: ["Toxic solvent; educational reference only."] }),

  seed("chlorobenzene", "Chlorobenzene", "C6H5Cl", "Aryl halide", ["arene", "aromatic", "organohalide"], (factory) => benzeneDerivative(factory, "chlorobenzene", "C6H5Cl", [{ attachAt: 0, elements: ["Cl"] }]), { curriculumTopicId: "aromatics" }),
  seed("bromobenzene", "Bromobenzene", "C6H5Br", "Aryl halide", ["arene", "aromatic", "organohalide"], (factory) => benzeneDerivative(factory, "bromobenzene", "C6H5Br", [{ attachAt: 0, elements: ["Br"] }]), { curriculumTopicId: "aromatics" }),
  seed("fluorobenzene", "Fluorobenzene", "C6H5F", "Aryl halide", ["arene", "aromatic", "organohalide"], (factory) => benzeneDerivative(factory, "fluorobenzene", "C6H5F", [{ attachAt: 0, elements: ["F"] }]), { curriculumTopicId: "aromatics" }),
  seed("anisole", "Anisole", "C7H8O", "Aryl ether", ["ether", "arene", "aromatic"], (factory) => benzeneDerivative(factory, "anisole", "C7H8O", [{ attachAt: 0, elements: ["O", "C"], bonds: [[0, 1, 1]] }]), { aliases: ["methoxybenzene"], curriculumTopicId: "aromatics" }),
  seed("styrene", "Styrene", "C8H8", "Aromatic alkene", ["alkene", "arene", "aromatic"], (factory) => benzeneDerivative(factory, "styrene", "C8H8", [{ attachAt: 0, elements: ["C", "C"], bonds: [[0, 1, 2]] }]), { aliases: ["vinylbenzene"], curriculumTopicId: "aromatics" }),
  seed("acetophenone", "Acetophenone", "C8H8O", "Aromatic ketone", ["ketone", "carbonyl", "arene"], (factory) => benzeneDerivative(factory, "acetophenone", "C8H8O", [{ attachAt: 0, elements: ["C", "O", "C"], bonds: [[0, 1, 2], [0, 2, 1]] }]), { curriculumTopicId: "carbonyl-chemistry" }),
  seed("benzonitrile", "Benzonitrile", "C7H5N", "Aromatic nitrile", ["nitrile", "arene", "aromatic"], (factory) => benzeneDerivative(factory, "benzonitrile", "C7H5N", [{ attachAt: 0, elements: ["C", "N"], bonds: [[0, 1, 3]] }]), { curriculumTopicId: "functional-groups" }),
  seed("benzyl-chloride", "Benzyl chloride", "C7H7Cl", "Benzylic halide", ["haloalkane", "organohalide", "arene"], (factory) => benzeneDerivative(factory, "benzyl-chloride", "C7H7Cl", [{ attachAt: 0, elements: ["C", "Cl"], bonds: [[0, 1, 1]] }]), { curriculumTopicId: "organic-mechanisms", mechanismIds: ["sn1-substitution", "sn2-substitution"] }),
  seed("ethylbenzene", "Ethylbenzene", "C8H10", "Alkylbenzene", ["arene", "aromatic"], (factory) => benzeneDerivative(factory, "ethylbenzene", "C8H10", [{ attachAt: 0, elements: ["C", "C"], bonds: [[0, 1, 1]] }]), { curriculumTopicId: "aromatics" }),
  seed("o-xylene", "o-Xylene", "C8H10", "Alkylbenzene", ["arene", "aromatic"], (factory) => benzeneDerivative(factory, "o-xylene", "C8H10", [{ attachAt: 0, elements: ["C"] }, { attachAt: 1, elements: ["C"] }]), { aliases: ["1,2-dimethylbenzene"], curriculumTopicId: "aromatics" }),
  seed("p-xylene", "p-Xylene", "C8H10", "Alkylbenzene", ["arene", "aromatic"], (factory) => benzeneDerivative(factory, "p-xylene", "C8H10", [{ attachAt: 0, elements: ["C"] }, { attachAt: 3, elements: ["C"] }]), { aliases: ["1,4-dimethylbenzene"], curriculumTopicId: "aromatics" }),
  seed("catechol", "Catechol", "C6H6O2", "Phenol", ["phenol", "arene", "aromatic"], (factory) => benzeneDerivative(factory, "catechol", "C6H6O2", [{ attachAt: 0, elements: ["O"] }, { attachAt: 1, elements: ["O"] }]), { aliases: ["1,2-benzenediol"], curriculumTopicId: "alcohols" }),
  seed("resorcinol", "Resorcinol", "C6H6O2", "Phenol", ["phenol", "arene", "aromatic"], (factory) => benzeneDerivative(factory, "resorcinol", "C6H6O2", [{ attachAt: 0, elements: ["O"] }, { attachAt: 2, elements: ["O"] }]), { aliases: ["1,3-benzenediol"], curriculumTopicId: "alcohols" }),
  seed("hydroquinone", "Hydroquinone", "C6H6O2", "Phenol", ["phenol", "arene", "aromatic"], (factory) => benzeneDerivative(factory, "hydroquinone", "C6H6O2", [{ attachAt: 0, elements: ["O"] }, { attachAt: 3, elements: ["O"] }]), { aliases: ["1,4-benzenediol"], curriculumTopicId: "alcohols" }),
  seed("p-cresol", "p-Cresol", "C7H8O", "Phenol", ["phenol", "arene", "aromatic"], (factory) => benzeneDerivative(factory, "p-cresol", "C7H8O", [{ attachAt: 0, elements: ["O"] }, { attachAt: 3, elements: ["C"] }]), { aliases: ["4-methylphenol"], curriculumTopicId: "alcohols" }),
  seed("benzenesulfonic-acid", "Benzenesulfonic acid", "C6H6O3S", "Aromatic sulfonic acid", ["sulfonic acid", "arene", "aromatic"], (factory) => benzeneDerivative(factory, "benzenesulfonic-acid", "C6H6O3S", [{ attachAt: 0, elements: ["S", "O", "O", "O"], bonds: [[0, 1, 2], [0, 2, 2], [0, 3, 1]] }]), { curriculumTopicId: "aromatics" }),
  seed("phenylacetic-acid", "Phenylacetic acid", "C8H8O2", "Aromatic carboxylic acid", ["carboxylic acid", "arene"], (factory) => benzeneDerivative(factory, "phenylacetic-acid", "C8H8O2", [{ attachAt: 0, elements: ["C", "C", "O", "O"], bonds: [[0, 1, 1], [1, 2, 2], [1, 3, 1]] }]), { curriculumTopicId: "carboxylic-acids" }),

  seed("furan", "Furan", "C4H4O", "Heteroaromatic", ["heterocycle", "aromatic", "ether"], (factory) => cycloGraph(factory, "furan", ["O", "C", "C", "C", "C"], "C4H4O", { 1: 2, 3: 2 }, true), { curriculumTopicId: "aromatics" }),
  seed("thiophene", "Thiophene", "C4H4S", "Heteroaromatic", ["heterocycle", "aromatic", "thioether"], (factory) => cycloGraph(factory, "thiophene", ["S", "C", "C", "C", "C"], "C4H4S", { 1: 2, 3: 2 }, true), { curriculumTopicId: "aromatics" }),
  seed("pyrrole", "Pyrrole", "C4H5N", "Heteroaromatic", ["heterocycle", "aromatic", "amine"], (factory) => cycloGraph(factory, "pyrrole", ["N", "C", "C", "C", "C"], "C4H5N", { 1: 2, 3: 2 }, true), { curriculumTopicId: "aromatics" }),
  seed("imidazole", "Imidazole", "C3H4N2", "Heteroaromatic", ["heterocycle", "aromatic", "amine"], (factory) => cycloGraph(factory, "imidazole", ["N", "C", "N", "C", "C"], "C3H4N2", { 0: 2, 3: 2 }, true), { curriculumTopicId: "aromatics" }),
  seed("pyrazole", "Pyrazole", "C3H4N2", "Heteroaromatic", ["heterocycle", "aromatic", "amine"], (factory) => cycloGraph(factory, "pyrazole", ["N", "N", "C", "C", "C"], "C3H4N2", { 1: 2, 3: 2 }, true), { curriculumTopicId: "aromatics" }),
  seed("pyrimidine", "Pyrimidine", "C4H4N2", "Heteroaromatic", ["heterocycle", "aromatic", "amine"], (factory) => cycloGraph(factory, "pyrimidine", ["N", "C", "N", "C", "C", "C"], "C4H4N2", { 0: 2, 2: 2, 4: 2 }, true), { curriculumTopicId: "aromatics" }),
  seed("indole", "Indole", "C8H7N", "Heteroaromatic", ["heterocycle", "aromatic", "amine"], (factory) =>
    factory("indole", ["N", "C", "C", "C", "C", "C", "C", "C", "C"], [[0, 1, 1], [1, 2, 2], [2, 3, 1], [3, 4, 2], [4, 0, 1], [2, 5, 1], [5, 6, 2], [6, 7, 1], [7, 8, 2], [8, 3, 1]], [{ nodeIds: [0, 1, 2, 3, 4], aromatic: true }, { nodeIds: [2, 5, 6, 7, 8, 3], aromatic: true }], "C8H7N"), { curriculumTopicId: "aromatics" }),
  seed("quinoline", "Quinoline", "C9H7N", "Heteroaromatic", ["heterocycle", "aromatic", "amine"], (factory) =>
    factory("quinoline", ["N", "C", "C", "C", "C", "C", "C", "C", "C", "C"], [[0, 1, 2], [1, 2, 1], [2, 3, 2], [3, 4, 1], [4, 5, 2], [5, 0, 1], [4, 6, 1], [6, 7, 2], [7, 8, 1], [8, 9, 2], [9, 5, 1]], [{ nodeIds: [0, 1, 2, 3, 4, 5], aromatic: true }, { nodeIds: [4, 6, 7, 8, 9, 5], aromatic: true }], "C9H7N"), { curriculumTopicId: "aromatics" }),
  seed("tetrahydrofuran", "Tetrahydrofuran", "C4H8O", "Cyclic ether", ["ether", "heterocycle"], (factory) => cycloGraph(factory, "tetrahydrofuran", ["O", "C", "C", "C", "C"], "C4H8O"), { aliases: ["THF"], physicalState: "liquid", safetyNotes: ["Common flammable solvent; educational reference only."] }),
  seed("1-4-dioxane", "1,4-Dioxane", "C4H8O2", "Cyclic ether", ["ether", "heterocycle"], (factory) => cycloGraph(factory, "1-4-dioxane", ["O", "C", "C", "O", "C", "C"], "C4H8O2"), { physicalState: "liquid", safetyNotes: ["Common solvent hazard; educational reference only."] }),

  seed("valine", "Valine", "C5H11NO2", "Amino acid", ["amine", "carboxylic acid", "amino acid"], (factory) =>
    aminoAcidGraph(factory, "valine", "C5H11NO2", { attachAt: 1, elements: ["C", "C", "C"], bonds: [[0, 1, 1], [0, 2, 1]] }), { curriculumTopicId: "functional-groups" }),
  seed("leucine", "Leucine", "C6H13NO2", "Amino acid", ["amine", "carboxylic acid", "amino acid"], (factory) =>
    aminoAcidGraph(factory, "leucine", "C6H13NO2", { attachAt: 1, elements: ["C", "C", "C", "C"], bonds: [[0, 1, 1], [1, 2, 1], [1, 3, 1]] }), { curriculumTopicId: "functional-groups" }),
  seed("isoleucine", "Isoleucine", "C6H13NO2", "Amino acid", ["amine", "carboxylic acid", "amino acid"], (factory) =>
    aminoAcidGraph(factory, "isoleucine", "C6H13NO2", { attachAt: 1, elements: ["C", "C", "C", "C"], bonds: [[0, 1, 1], [0, 2, 1], [2, 3, 1]] }), { curriculumTopicId: "functional-groups" }),
  seed("serine", "Serine", "C3H7NO3", "Amino acid", ["amine", "carboxylic acid", "alcohol", "amino acid"], (factory) =>
    aminoAcidGraph(factory, "serine", "C3H7NO3", { attachAt: 1, elements: ["C", "O"], bonds: [[0, 1, 1]] }), { curriculumTopicId: "functional-groups" }),
  seed("threonine", "Threonine", "C4H9NO3", "Amino acid", ["amine", "carboxylic acid", "alcohol", "amino acid"], (factory) =>
    aminoAcidGraph(factory, "threonine", "C4H9NO3", { attachAt: 1, elements: ["C", "O", "C"], bonds: [[0, 1, 1], [0, 2, 1]] }), { curriculumTopicId: "functional-groups" }),
  seed("cysteine", "Cysteine", "C3H7NO2S", "Amino acid", ["amine", "carboxylic acid", "thiol", "amino acid"], (factory) =>
    aminoAcidGraph(factory, "cysteine", "C3H7NO2S", { attachAt: 1, elements: ["C", "S"], bonds: [[0, 1, 1]] }), { curriculumTopicId: "functional-groups" }),
  seed("lysine", "Lysine", "C6H14N2O2", "Amino acid", ["amine", "carboxylic acid", "amino acid"], (factory) =>
    aminoAcidGraph(factory, "lysine", "C6H14N2O2", { attachAt: 1, elements: ["C", "C", "C", "C", "N"], bonds: [[0, 1, 1], [1, 2, 1], [2, 3, 1], [3, 4, 1]] }), { curriculumTopicId: "functional-groups" }),
  seed("aspartic-acid", "Aspartic acid", "C4H7NO4", "Amino acid", ["amine", "carboxylic acid", "amino acid"], (factory) =>
    aminoAcidGraph(factory, "aspartic-acid", "C4H7NO4", { attachAt: 1, elements: ["C", "C", "O", "O"], bonds: [[0, 1, 1], [1, 2, 2], [1, 3, 1]] }), { curriculumTopicId: "functional-groups" }),
  seed("glutamic-acid", "Glutamic acid", "C5H9NO4", "Amino acid", ["amine", "carboxylic acid", "amino acid"], (factory) =>
    aminoAcidGraph(factory, "glutamic-acid", "C5H9NO4", { attachAt: 1, elements: ["C", "C", "C", "O", "O"], bonds: [[0, 1, 1], [1, 2, 1], [2, 3, 2], [2, 4, 1]] }), { curriculumTopicId: "functional-groups" }),
  seed("phenylalanine", "Phenylalanine", "C9H11NO2", "Amino acid", ["amine", "carboxylic acid", "arene", "amino acid"], (factory) => {
    const base = aminoAcidGraph(factory, "phenylalanine", "C9H11NO2", { attachAt: 1, elements: ["C", "C", "C", "C", "C", "C", "C"], bonds: [[0, 1, 1], [1, 2, 2], [2, 3, 1], [3, 4, 2], [4, 5, 1], [5, 6, 2], [6, 1, 1]] })
    base.graph.rings = [{ id: 0, nodeIds: [6, 7, 8, 9, 10, 11], size: 6, confidence: 94, aromatic: true, closed: true, kind: "benzene-like" }]
    base.graph.aromatic = true
    base.graph.aromaticRingIds = [0]
    return base
  }, { curriculumTopicId: "functional-groups" }),
  seed("tyrosine", "Tyrosine", "C9H11NO3", "Amino acid", ["amine", "carboxylic acid", "phenol", "amino acid"], (factory) => {
    const graph = benzeneDerivative(factory, "tyrosine", "C9H11NO3", [
      { attachAt: 0, elements: ["C", "C", "N", "C", "O", "O"], bonds: [[0, 1, 1], [1, 2, 1], [1, 3, 1], [3, 4, 2], [3, 5, 1]] },
      { attachAt: 3, elements: ["O"] },
    ])
    return graph
  }, { curriculumTopicId: "functional-groups" }),
  seed("proline", "Proline", "C5H9NO2", "Amino acid", ["amine", "carboxylic acid", "amino acid", "heterocycle"], (factory) =>
    factory("proline", ["N", "C", "C", "O", "O", "C", "C", "C"], [[0, 1, 1], [1, 2, 1], [2, 3, 2], [2, 4, 1], [1, 5, 1], [5, 6, 1], [6, 7, 1], [7, 0, 1]], [{ nodeIds: [0, 1, 5, 6, 7] }], "C5H9NO2"), { curriculumTopicId: "functional-groups" }),
  seed("histidine", "Histidine", "C6H9N3O2", "Amino acid", ["amine", "carboxylic acid", "heterocycle", "amino acid"], (factory) =>
    aminoAcidGraph(factory, "histidine", "C6H9N3O2", { attachAt: 1, elements: ["C", "N", "C", "N", "C"], bonds: [[0, 1, 1], [1, 2, 2], [2, 3, 1], [3, 4, 1], [4, 1, 2]] }), { curriculumTopicId: "functional-groups" }),
  seed("methionine", "Methionine", "C5H11NO2S", "Amino acid", ["amine", "carboxylic acid", "thioether", "amino acid"], (factory) =>
    aminoAcidGraph(factory, "methionine", "C5H11NO2S", { attachAt: 1, elements: ["C", "C", "S", "C"], bonds: [[0, 1, 1], [1, 2, 1], [2, 3, 1]] }), { curriculumTopicId: "functional-groups" }),

  seed("ribose", "Ribose", "C5H10O5", "Sugar", ["alcohol", "aldehyde", "sugar"], (factory) => polyhydroxyCarbonylGraph(factory, "ribose", 5, "C5H10O5", 0), { curriculumTopicId: "functional-groups" }),
  seed("deoxyribose", "Deoxyribose", "C5H10O4", "Sugar", ["alcohol", "aldehyde", "sugar"], (factory) =>
    factory("deoxyribose", ["C", "C", "C", "C", "C", "O", "O", "O", "O"], [[0, 1, 1], [1, 2, 1], [2, 3, 1], [3, 4, 1], [0, 5, 2], [2, 6, 1], [3, 7, 1], [4, 8, 1]], [], "C5H10O4"), { curriculumTopicId: "functional-groups" }),
  seed("maltose", "Maltose", "C12H22O11", "Disaccharide", ["alcohol", "ether", "sugar"], (factory) =>
    factory(
      "maltose",
      ([...Array.from({ length: 12 }, () => "C" as const), ...Array.from({ length: 11 }, () => "O" as const)] satisfies ElementSymbol[]),
      [
        ...chainBonds(12),
        ...Array.from({ length: 11 }, (_, index) => [Math.min(index, 11), 12 + index, 1] as BondTuple),
      ],
      [],
      "C12H22O11",
    ), { curriculumTopicId: "functional-groups" }),
  seed("diethyl-ether", "Diethyl ether", "C4H10O", "Ether", ["ether"], (factory) =>
    factory("diethyl-ether", ["C", "C", "O", "C", "C"], [[0, 1, 1], [1, 2, 1], [2, 3, 1], [3, 4, 1]], [], "C4H10O"), { aliases: ["ether"], physicalState: "liquid", safetyNotes: ["Highly flammable solvent; educational reference only."] }),
  seed("dimethyl-sulfoxide", "Dimethyl sulfoxide", "C2H6OS", "Sulfoxide", ["sulfoxide", "polar aprotic solvent"], (factory) =>
    factory("dimethyl-sulfoxide", ["S", "O", "C", "C"], [[0, 1, 2], [0, 2, 1], [0, 3, 1]], [], "C2H6OS"), { aliases: ["DMSO"], physicalState: "liquid" }),
  seed("dimethylformamide", "Dimethylformamide", "C3H7NO", "Amide", ["amide", "carbonyl", "polar aprotic solvent"], (factory) =>
    factory("dimethylformamide", ["C", "O", "N", "C", "C"], [[0, 1, 2], [0, 2, 1], [2, 3, 1], [2, 4, 1]], [], "C3H7NO"), { aliases: ["DMF"], physicalState: "liquid" }),
  seed("acetyl-chloride", "Acetyl chloride", "C2H3ClO", "Acid chloride", ["acyl chloride", "carbonyl", "organohalide"], (factory) =>
    factory("acetyl-chloride", ["C", "C", "O", "Cl"], [[0, 1, 1], [1, 2, 2], [1, 3, 1]], [], "C2H3ClO"), { curriculumTopicId: "carbonyl-chemistry", safetyNotes: ["Acyl chlorides are reactive and corrosive; educational reference only."] }),
  seed("acetic-anhydride", "Acetic anhydride", "C4H6O3", "Acid anhydride", ["anhydride", "carbonyl"], (factory) =>
    factory("acetic-anhydride", ["C", "C", "O", "O", "C", "O", "C"], [[0, 1, 1], [1, 2, 2], [1, 3, 1], [3, 4, 1], [4, 5, 2], [4, 6, 1]], [], "C4H6O3"), { curriculumTopicId: "carbonyl-chemistry", safetyNotes: ["Reactive acylating reagent; educational reference only."] }),
]

export const REFERENCE_LIBRARY_COMPOUND_RECORDS: IntelligenceCompoundRecord[] = REFERENCE_SEEDS.map(toRecord)

export function buildExpandedReferenceGraphs(factory: ReferenceGraphFactory): ReferenceGraph[] {
  return REFERENCE_SEEDS.map((current) => current.graph(factory))
}

export function getReferenceLibraryMetrics() {
  const families = new Set(REFERENCE_SEEDS.map((current) => current.family))
  const groups = new Set(REFERENCE_SEEDS.flatMap((current) => current.functionalGroups))
  return {
    compounds: REFERENCE_SEEDS.length,
    families: families.size,
    functionalGroupAnnotations: groups.size,
  }
}
