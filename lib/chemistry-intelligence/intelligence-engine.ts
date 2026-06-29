import { getReactionConditionForMechanism, getReactionConditions } from "../reaction-conditions/reaction-conditions"
import { REACTION_RECORDS } from "../chemistry/reactions"
import { STRUCTURE_SCANNER_RECORDS } from "../structure-scanner/scanner-database"
import { getCompoundSpectroscopyProfile, getExpectedIrSignals, spectroscopyExplorerHref } from "../spectroscopy/spectroscopy-engine"
import type { MolecularGraph } from "../vision/molecular-graph"
import { buildChemistryIntelligenceGraph } from "./chemistry-intelligence-graph"
import { classifyFamilies, classifyFunctionalGroups, classifyScaffolds } from "./functional-group-engine"
import { REFERENCE_MOLECULAR_GRAPHS, canonicalGraphId, matchCanonicalGraph } from "./graph-matcher"
import type {
  ChemicalPropertySummary,
  ChemistryIntelligenceInput,
  CompoundIntelligence,
  IntelligenceCompoundRecord,
  IntelligenceLink,
  KnowledgeConfidence,
} from "./types"

const ATOMIC_MASSES: Record<string, number> = {
  H: 1.008,
  C: 12.011,
  N: 14.007,
  O: 15.999,
  F: 18.998,
  P: 30.974,
  S: 32.06,
  Cl: 35.45,
  Br: 79.904,
  I: 126.904,
  Na: 22.99,
  K: 39.098,
  Ca: 40.078,
}

function normalize(value: string | undefined): string {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

function clamp(value: number, minimum = 0, maximum = 100): number {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
}

function toRecord(record: (typeof STRUCTURE_SCANNER_RECORDS)[number]): IntelligenceCompoundRecord {
  return {
    id: record.id,
    name: record.name,
    formula: record.formula,
    aliases: record.commonAliases,
    family: record.functionalGroups[0] ?? "Organic compound",
    functionalGroups: record.functionalGroups,
    polarity: record.functionalGroups.some((group) => /ionic|salt/i.test(group))
      ? "Ionic"
      : record.functionalGroups.some((group) => /alcohol|amine|acid|carbonyl|ester|amide|nitrile|oxide|peroxide/i.test(group))
        ? "Polar"
        : "Nonpolar",
    physicalState: physicalStateFor(record.id, record.functionalGroups),
    commonReactions: [...(record.relatedReactions?.map((item) => item.label) ?? []), ...record.reactionGraphLinks],
    curriculumTopicId: record.curriculumTopicId,
    formulaId: record.formulaId,
    practiceTopic: record.practiceTopic,
    examTopic: record.examTopic,
    mechanismIds: record.relatedMechanisms?.map((item) => item.id),
    reactionIds: record.relatedReactions?.map((item) => item.id),
    spectroscopyCompoundId: record.id,
    safetyNotes: safetyFor(record.id, record.functionalGroups),
  }
}

function physicalStateFor(id: string, groups: string[]): IntelligenceCompoundRecord["physicalState"] {
  if (["methane", "ethane", "ethene", "ethyne", "ammonia", "carbon-dioxide", "carbon-monoxide", "hydrogen-chloride"].includes(id)) return "gas"
  if (["benzene", "toluene", "ethanol", "methanol", "acetone", "ethyl-ethanoate", "methyl-ethanoate", "water"].includes(id)) return "liquid"
  if (groups.some((group) => /ionic|salt|carbonate|sulfate|chloride/i.test(group))) return "solid"
  if (groups.some((group) => /acid|base/i.test(group))) return "aqueous/variable"
  return "unknown"
}

function safetyFor(id: string, groups: string[]): string[] {
  const notes: string[] = []
  if (["benzene", "nitrobenzene", "aniline"].includes(id)) notes.push("Use fume-hood-level caution in real labs; this is educational data only.")
  if (groups.some((group) => /acid|base/i.test(group))) notes.push("Acids/bases may be corrosive depending on concentration.")
  if (groups.some((group) => /oxidizing agent|peroxide/i.test(group))) notes.push("Oxidizers/peroxides require careful handling.")
  if (groups.some((group) => /haloalkane|organohalide/i.test(group))) notes.push("Organohalides may be harmful and should be handled with ventilation.")
  return notes
}

const EXTRA_INTELLIGENCE_RECORDS: IntelligenceCompoundRecord[] = [
  {
    id: "pyridine",
    name: "Pyridine",
    formula: "C5H5N",
    aliases: ["azabenzene"],
    family: "Heteroaromatic",
    functionalGroups: ["aromatic", "heterocycle", "amine"],
    polarity: "Polar",
    physicalState: "liquid",
    commonReactions: ["Electrophilic substitution is deactivated; nitrogen acts as a weak base"],
    curriculumTopicId: "aromatics",
    formulaId: "organic-degree-unsaturation",
    practiceTopic: "Spectroscopy",
    examTopic: "Organic Reactions",
    mechanismIds: ["sn1-substitution"],
    reactionIds: [],
    spectroscopyCompoundId: "pyridine",
    safetyNotes: ["Pyridine is volatile and irritating; educational reference only."],
  },
  {
    id: "naphthalene",
    name: "Naphthalene",
    formula: "C10H8",
    aliases: ["fused benzene rings"],
    family: "Polycyclic aromatic hydrocarbon",
    functionalGroups: ["arene", "aromatic"],
    polarity: "Nonpolar",
    physicalState: "solid",
    commonReactions: ["Electrophilic aromatic substitution"],
    curriculumTopicId: "aromatics",
    formulaId: "organic-degree-unsaturation",
    practiceTopic: "Spectroscopy",
    examTopic: "Organic Reactions",
    mechanismIds: [],
    reactionIds: [],
    spectroscopyCompoundId: "naphthalene",
    safetyNotes: ["Polycyclic aromatic hydrocarbons require careful handling in real labs."],
  },
  {
    id: "caffeine",
    name: "Caffeine",
    formula: "C8H10N4O2",
    aliases: ["trimethylxanthine"],
    family: "Xanthine alkaloid",
    functionalGroups: ["amide", "carbonyl", "heterocycle"],
    polarity: "Polar",
    physicalState: "solid",
    commonReactions: ["Acid-base extraction context", "Spectroscopy identification"],
    curriculumTopicId: "functional-groups",
    formulaId: "organic-degree-unsaturation",
    practiceTopic: "Functional Group Identification",
    examTopic: "Spectroscopy",
    mechanismIds: [],
    reactionIds: [],
    spectroscopyCompoundId: "caffeine",
    safetyNotes: ["Biologically active compound; educational reference only."],
  },
  {
    id: "alanine",
    name: "Alanine",
    formula: "C3H7NO2",
    aliases: ["2-aminopropanoic acid"],
    family: "Amino acid",
    functionalGroups: ["amine", "carboxylic acid", "amino acid"],
    polarity: "Polar",
    physicalState: "solid",
    commonReactions: ["Peptide bond formation"],
    curriculumTopicId: "functional-groups",
    formulaId: "acids-bases-ph",
    practiceTopic: "Functional Group Identification",
    examTopic: "Functional Group Identification",
    spectroscopyCompoundId: "alanine",
    safetyNotes: [],
  },
]

export const INTELLIGENCE_COMPOUND_RECORDS: IntelligenceCompoundRecord[] = [
  ...STRUCTURE_SCANNER_RECORDS.map(toRecord),
  ...EXTRA_INTELLIGENCE_RECORDS,
]

function getRecord(id: string | undefined): IntelligenceCompoundRecord | undefined {
  if (!id) return undefined
  const slug = normalize(id)
  return INTELLIGENCE_COMPOUND_RECORDS.find((record) =>
    record.id === id ||
    normalize(record.id) === slug ||
    normalize(record.name) === slug ||
    record.aliases.some((alias) => normalize(alias) === slug),
  )
}

function formulaCounts(formula: string): Map<string, number> {
  const counts = new Map<string, number>()
  for (const match of formula.matchAll(/([A-Z][a-z]?)(\d*)/g)) {
    counts.set(match[1], (counts.get(match[1]) ?? 0) + Number(match[2] || "1"))
  }
  return counts
}

function molarMass(formula: string): number | null {
  const counts = formulaCounts(formula)
  if (!counts.size) return null
  let mass = 0
  counts.forEach((count, element) => {
    mass += (ATOMIC_MASSES[element] ?? 0) * count
  })
  return mass > 0 ? Number(mass.toFixed(3)) : null
}

function heteroCount(graph: MolecularGraph): number {
  return graph.nodes.filter((node) => !["C", "H", "Unknown"].includes(node.inferredElement)).length
}

function propertiesFor(graph: MolecularGraph, record: IntelligenceCompoundRecord, groupLabels: string[]): ChemicalPropertySummary {
  const formula = record.formula || graph.estimates.estimatedFormula
  const counts = formulaCounts(formula)
  const donorCount = groupLabels.filter((group) => /alcohol|phenol|carboxylic acid|amine|amide/i.test(group)).length
  const acceptorCount = (counts.get("O") ?? 0) + (counts.get("N") ?? 0)
  const hasSp = graph.estimates.tripleBonds > 0
  const hasSp2 = graph.estimates.doubleBonds > 0 || graph.aromatic
  const hybridizationSummary = [
    graph.nodes.some((node) => node.inferredElement === "C") ? "sp3 carbon centers likely present" : "",
    hasSp2 ? "sp2 centers from double bonds/aromatic rings" : "",
    hasSp ? "sp centers from triple bonds" : "",
  ].filter(Boolean).join("; ") || "Hybridization unavailable from graph."
  const solubility = record.polarity === "Ionic"
    ? "Often water-soluble if ions are small/common; verify solubility rules."
    : donorCount >= 2 || acceptorCount >= 3
      ? "High polarity / hydrogen-bonding; water solubility likely for small molecules."
      : record.polarity === "Polar"
        ? "Moderate polarity; solubility depends on carbon skeleton size."
        : "Low water solubility; more soluble in nonpolar organic solvents."
  return {
    formula,
    molarMass: molarMass(formula),
    formalCharge: 0,
    aromatic: graph.aromatic || groupLabels.some((group) => /arene|aromatic|phenol/i.test(group)),
    ringCount: Math.max(graph.rings.length, groupLabels.some((group) => /arene|aromatic|phenol/i.test(group)) ? 1 : 0),
    atomCount: Array.from(counts.values()).reduce((sum, count) => sum + count, 0) || graph.nodes.length,
    bondCount: graph.bonds.length,
    hybridizationSummary,
    estimatedPolarity: record.polarity,
    hydrogenBondDonorCount: donorCount,
    hydrogenBondAcceptorCount: acceptorCount,
    estimatedSolubilityClass: solubility,
    physicalState: record.physicalState,
  }
}

function reactionLinks(record: IntelligenceCompoundRecord) {
  const terms = [record.id, record.name, record.formula, ...record.aliases].map((value) => value.toLowerCase())
  const related = REACTION_RECORDS.filter((reaction) => {
    if (record.reactionIds?.includes(reaction.id)) return true
    const haystack = [
      reaction.name,
      reaction.balancedEquation,
      ...reaction.reactants,
      ...reaction.products,
      reaction.explanation,
    ].join(" ").toLowerCase()
    return terms.some((term) => term && haystack.includes(term))
  }).slice(0, 5)
  return related.map((reaction) => {
    const conditions = getReactionConditions(reaction.id)
    return {
      id: reaction.id,
      name: reaction.name,
      mechanismFamily: conditions?.mechanismFamily ?? reaction.reactionType,
      difficulty: reaction.difficulty,
      safety: conditions?.safetyNotes ?? [],
      href: `/reaction-database?reaction=${encodeURIComponent(reaction.id)}#reaction-viewer`,
    }
  })
}

function mechanismLinks(record: IntelligenceCompoundRecord): IntelligenceLink[] {
  const ids = new Set(record.mechanismIds ?? [])
  record.reactionIds?.forEach((reactionId) => {
    const conditions = getReactionConditions(reactionId)
    if (conditions?.mechanismFamily) {
      const normalized = normalize(conditions.mechanismFamily)
      if (normalized.includes("oxidation")) ids.add("alcohol-oxidation")
      if (normalized.includes("addition")) ids.add("alkene-bromination")
      if (normalized.includes("condensation")) ids.add("esterification")
      if (normalized.includes("substitution")) ids.add("sn2-substitution")
    }
  })
  return Array.from(ids).slice(0, 5).map((id) => {
    const conditions = getReactionConditionForMechanism(id)
    return {
      label: conditions?.mechanismFamily ?? id.replace(/-/g, " "),
      href: `/mechanism-trainer?mechanism=${encodeURIComponent(id)}#mechanism-viewer`,
      reason: conditions ? `${conditions.reagents.join(" + ")} under ${conditions.temperature}` : "Connected by local mechanism metadata.",
    }
  })
}

function curriculumLinks(record: IntelligenceCompoundRecord, families: string[]): IntelligenceLink[] {
  const links: IntelligenceLink[] = []
  if (record.curriculumTopicId) {
    links.push({
      label: record.curriculumTopicId.replace(/-/g, " "),
      href: `/curriculum?topic=${encodeURIComponent(record.curriculumTopicId)}#curriculum-topic`,
      reason: "Primary curriculum topic from the local compound record.",
    })
  }
  if (families.some((family) => /aromatic|phenol|arene/i.test(family))) {
    links.push({ label: "Aromatics", href: "/curriculum?topic=aromatics#curriculum-topic", reason: "Aromatic scaffold detected." })
  }
  if (families.some((family) => /ketone|aldehyde|carboxylic|ester|amide/i.test(family))) {
    links.push({ label: "Carbonyl Chemistry", href: "/curriculum?topic=carbonyl-chemistry#curriculum-topic", reason: "Carbonyl-family functional group detected." })
  }
  return links.filter((item, index, all) => all.findIndex((candidate) => candidate.href === item.href) === index).slice(0, 4)
}

function resourceLinks(record: IntelligenceCompoundRecord): IntelligenceLink[] {
  const links: IntelligenceLink[] = [
    {
      label: "View Molecule",
      href: `/molecular-visualizer?compound=${encodeURIComponent(record.id)}#molecule-viewer`,
      reason: "Open the connected 2D molecule viewer.",
    },
    {
      label: "Reaction Explorer",
      href: `/reaction-explorer?query=${encodeURIComponent(record.name)}#reaction-graph`,
      reason: "See this compound in the chemistry knowledge graph.",
    },
    {
      label: "Synthesis Explorer",
      href: `/synthesis-explorer?start=${encodeURIComponent(record.id)}#synthesis-explorer`,
      reason: "Use this molecule as a synthesis starting point.",
    },
    {
      label: "Practice This",
      href: `/practice-generator?topic=${encodeURIComponent(record.practiceTopic ?? "Functional Group Identification")}&source=database`,
      reason: "Generate deterministic practice linked to the recognized chemistry.",
    },
    {
      label: "Generate Exam Set",
      href: `/exam-generator?topic=${encodeURIComponent(record.examTopic ?? record.practiceTopic ?? "Functional Group Identification")}&source=database`,
      reason: "Generate a database-backed exam focus.",
    },
  ]
  if (record.formulaId) {
    links.push({
      label: "Relevant Formula",
      href: `/formula-sheet?formula=${encodeURIComponent(record.formulaId)}#formula-record`,
      reason: "Formula sheet entry connected by local metadata.",
    })
  }
  return links
}

function spectroscopyFor(record: IntelligenceCompoundRecord, groupLabels: string[]) {
  const profile = getCompoundSpectroscopyProfile(record.spectroscopyCompoundId ?? record.id)
  const irSignals = getExpectedIrSignals(profile)
  const functionalGroupSummary = groupLabels
    .filter((label) => /alcohol|phenol|aldehyde|ketone|carboxylic|ester|amide|amine|arene|alkene|alkyne|nitrile/i.test(label))
    .slice(0, 4)
    .map((label) => `Expected ${label} spectroscopy clues`)
  return {
    available: Boolean(profile || functionalGroupSummary.length),
    summary: profile
      ? [
        ...irSignals.slice(0, 4).map((signal) => `${signal.category}: ${signal.signal} (${signal.range})`),
        ...profile.protonNmr.slice(0, 2).map((signal) => `1H NMR: ${signal.environment} (${signal.shiftRange}, ${signal.splitting})`),
        ...profile.carbonNmr.slice(0, 2).map((signal) => `13C NMR: ${signal.environment} (${signal.shiftRange})`),
        ...profile.massSpec.slice(0, 2).map((signal) => `MS: ${signal.peak} (${signal.mz})`),
      ]
      : functionalGroupSummary,
    href: spectroscopyExplorerHref({ compound: record.id }),
  }
}

function confidenceBand(value: number): KnowledgeConfidence["band"] {
  if (value >= 80) return "high"
  if (value >= 55) return "moderate"
  return "low"
}

function confidenceFor(input: ChemistryIntelligenceInput, chemistry: number, knowledge: number): KnowledgeConfidence {
  const vision = Math.round(clamp(input.visionConfidence ?? input.graph.estimates.confidence))
  const graph = Math.round(clamp(input.graphConfidence ?? input.graph.estimates.confidence))
  const overall = Math.round(clamp(vision * 0.16 + graph * 0.28 + chemistry * 0.34 + knowledge * 0.22))
  return { vision, graph, chemistry, knowledge, overall, band: confidenceBand(overall) }
}

function explainWhy(record: IntelligenceCompoundRecord, graph: MolecularGraph, canonicalId: string, matchReasons: string[], groups: string[], scaffolds: string[]): string[] {
  const lines = [
    `Canonical graph ID: ${canonicalId.slice(0, 80)}${canonicalId.length > 80 ? "..." : ""}`,
    ...matchReasons.slice(0, 4),
  ]
  if (graph.rings.some((ring) => ring.size === 6 && ring.aromatic)) lines.push("Six-member aromatic ring survived canonical graph consensus.")
  if (graph.estimates.carbons > 0) lines.push(`${graph.estimates.carbons} carbon center${graph.estimates.carbons === 1 ? "" : "s"} reconstructed.`)
  if (graph.estimates.doubleBonds > 0) lines.push(`${graph.estimates.doubleBonds} double bond${graph.estimates.doubleBonds === 1 ? "" : "s"} present in the selected graph.`)
  if (groups.length) lines.push(`Functional groups classified: ${groups.slice(0, 4).join(", ")}.`)
  if (scaffolds.length) lines.push(`Scaffold recognition: ${scaffolds.slice(0, 3).join(", ")}.`)
  lines.push(`Local database identity: ${record.name} (${record.formula}).`)
  return Array.from(new Set(lines))
}

export function analyzeChemistryIntelligence(input: ChemistryIntelligenceInput): CompoundIntelligence | null {
  if (!input.graph.nodes.length) return null
  const matches = matchCanonicalGraph(input.graph, INTELLIGENCE_COMPOUND_RECORDS, input.preferredCompoundId)
  const topMatch = matches[0]
  const fallbackRecord = getRecord(input.preferredCompoundId)
  const record = getRecord(topMatch?.compoundId) ?? fallbackRecord
  if (!record) return null

  const groups = classifyFunctionalGroups(input.graph, record)
  const scaffolds = classifyScaffolds(input.graph, record)
  const families = classifyFamilies(groups, input.graph, record)
  const groupLabels = groups.map((group) => group.label)
  const familyLabels = families.map((family) => family.label)
  const properties = propertiesFor(input.graph, record, groupLabels)
  const spectroscopy = spectroscopyFor(record, groupLabels)
  const reactions = reactionLinks(record)
  const mechanisms = mechanismLinks(record)
  const curriculum = curriculumLinks(record, familyLabels)
  const resources = resourceLinks(record)
  const chemistryConfidence = Math.round(clamp((topMatch?.confidence ?? 48) * 0.58 + Math.min(32, groups.length * 8) + Math.min(12, scaffolds.length * 4)))
  const knowledgeConfidence = Math.round(clamp(
    (spectroscopy.available ? 18 : 0) +
    Math.min(24, reactions.length * 8) +
    Math.min(18, mechanisms.length * 8) +
    Math.min(20, curriculum.length * 8) +
    Math.min(20, resources.length * 4),
  ))
  const confidence = confidenceFor(input, chemistryConfidence, knowledgeConfidence)
  const identity = {
    compoundId: record.id,
    name: record.name,
    formula: record.formula,
    confidence: topMatch?.confidence ?? 52,
    canonicalGraphId: topMatch?.canonicalId ?? canonicalGraphId(input.graph),
    matchedBy: [
      topMatch?.exact ? "graph isomorphism" : "graph feature similarity",
      input.preferredCompoundId ? "scanner evidence" : "",
      groups.length ? "functional-group hierarchy" : "",
      scaffolds.length ? "scaffold recognition" : "",
    ].filter(Boolean),
  }
  const withoutKnowledgeGraph = {
    identity,
    graph: input.graph,
    graphMatches: matches,
    functionalGroups: groups,
    scaffolds,
    families,
    properties,
    spectroscopy,
    reactions,
    mechanisms,
    curriculum,
    resources,
    safety: Array.from(new Set([
      ...(record.safetyNotes ?? []),
      ...reactions.flatMap((reaction) => reaction.safety),
    ])),
    explainWhy: explainWhy(record, input.graph, identity.canonicalGraphId, topMatch?.reasons ?? [], groupLabels, scaffolds.map((item) => item.name)),
    confidence,
  }
  return {
    ...withoutKnowledgeGraph,
    knowledgeGraph: buildChemistryIntelligenceGraph(withoutKnowledgeGraph),
  }
}

export function getChemistryIntelligenceMetrics() {
  return {
    compoundRecords: INTELLIGENCE_COMPOUND_RECORDS.length,
    referenceGraphs: REFERENCE_MOLECULAR_GRAPHS.length,
    functionalGroupFamilies: 17,
    scaffoldRules: 12,
    linkedModules: 9,
  }
}
