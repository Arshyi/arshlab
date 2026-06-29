import { canonicalizeMolecularGraph, molecularGraphHash } from "../structure-vision/canonical-molecular-graph"
import type { MolecularGraph, MolecularGraphBond, MolecularGraphNode, MolecularGraphRing } from "../vision/molecular-graph"
import type { GraphMatchResult, IntelligenceCompoundRecord } from "./types"
import { buildExpandedReferenceGraphs } from "./reference-library"
import { runChemicalContradictionEngine } from "./contradiction-engine"
import type { CandidateEliminationReport } from "./elimination-report"

type ElementSymbol = MolecularGraphNode["inferredElement"]

export interface ReferenceGraph {
  compoundId: string
  graph: MolecularGraph
}

const VALENCE: Record<string, number> = {
  C: 4,
  H: 1,
  O: 2,
  N: 3,
  S: 2,
  P: 3,
  F: 1,
  Cl: 1,
  Br: 1,
  I: 1,
  Unknown: 4,
}

function clamp(value: number, minimum = 0, maximum = 100): number {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
}

function node(id: number, element: ElementSymbol = "C", x = id * 20, y = 0): MolecularGraphNode {
  return {
    id,
    x,
    y,
    degree: 0,
    inferredElement: element,
    confidence: 96,
    source: "atom-label",
    snappedSegmentIndexes: [],
  }
}

function bond(id: number, startNodeId: number, endNodeId: number, order: 1 | 2 | 3 = 1): MolecularGraphBond {
  return {
    id,
    startNodeId,
    endNodeId,
    bondOrder: order,
    confidence: 94,
    sourceSegmentIndexes: [id],
    parallelPairCount: order > 1 ? order - 1 : 0,
    gapBridged: false,
  }
}

function countHydrogens(nodes: MolecularGraphNode[], bonds: MolecularGraphBond[]): number {
  return nodes.reduce((sum, current) => {
    if (current.inferredElement === "H") return sum
    const used = bonds
      .filter((item) => item.startNodeId === current.id || item.endNodeId === current.id)
      .reduce((total, item) => total + item.bondOrder, 0)
    return sum + Math.max(0, (VALENCE[current.inferredElement] ?? 0) - used)
  }, 0)
}

function formulaFromGraph(nodes: MolecularGraphNode[], bonds: MolecularGraphBond[], fallbackFormula?: string): string {
  if (fallbackFormula) return fallbackFormula
  const counts = new Map<string, number>()
  nodes.forEach((current) => {
    if (current.inferredElement !== "H" && current.inferredElement !== "Unknown") {
      counts.set(current.inferredElement, (counts.get(current.inferredElement) ?? 0) + 1)
    }
  })
  const hydrogens = countHydrogens(nodes, bonds)
  if (hydrogens > 0) counts.set("H", hydrogens)
  const order = ["C", "H", "N", "O", "S", "P", "F", "Cl", "Br", "I"]
  return order
    .filter((element) => counts.has(element))
    .map((element) => `${element}${(counts.get(element) ?? 1) === 1 ? "" : counts.get(element)}`)
    .join("") || "Unavailable"
}

export function createReferenceGraph(
  compoundId: string,
  nodes: Array<ElementSymbol | MolecularGraphNode>,
  bonds: Array<[number, number, (1 | 2 | 3)?]>,
  rings: Array<{ nodeIds: number[]; aromatic?: boolean; kind?: MolecularGraphRing["kind"] }> = [],
  formula?: string,
): ReferenceGraph {
  const graphNodes = nodes.map((current, id) =>
    typeof current === "string" ? node(id, current) : { ...current, id },
  )
  const graphBonds = bonds.map(([start, end, order = 1], id) => bond(id, start, end, order))
  graphNodes.forEach((current) => {
    current.degree = graphBonds.filter((item) => item.startNodeId === current.id || item.endNodeId === current.id).length
  })
  const graphRings: MolecularGraphRing[] = rings.map((ring, id) => ({
    id,
    nodeIds: ring.nodeIds,
    size: ring.nodeIds.length,
    confidence: 94,
    aromatic: Boolean(ring.aromatic),
    closed: true,
    kind: ring.kind ?? (ring.aromatic && ring.nodeIds.length === 6 ? "benzene-like" : ring.nodeIds.length === 6 ? "cyclohexane-like" : "ring"),
  }))
  const estimates = {
    atoms: graphNodes.length,
    carbons: graphNodes.filter((item) => item.inferredElement === "C").length,
    bonds: graphBonds.length,
    rings: graphRings.length,
    singleBonds: graphBonds.filter((item) => item.bondOrder === 1).length,
    doubleBonds: graphBonds.filter((item) => item.bondOrder === 2).length,
    tripleBonds: graphBonds.filter((item) => item.bondOrder === 3).length,
    estimatedFormula: formulaFromGraph(graphNodes, graphBonds, formula),
    confidence: 94,
  }
  return {
    compoundId,
    graph: {
      nodes: graphNodes,
      bonds: graphBonds,
      rings: graphRings,
      aromatic: graphRings.some((ring) => ring.aromatic),
      aromaticRingIds: graphRings.filter((ring) => ring.aromatic).map((ring) => ring.id),
      estimates,
      warnings: [],
      atomCentered: true,
      snapRadius: 12,
    },
  }
}

const benzeneRing: Array<[number, number, 1 | 2]> = [
  [0, 1, 2],
  [1, 2, 1],
  [2, 3, 2],
  [3, 4, 1],
  [4, 5, 2],
  [5, 0, 1],
]

const cyclohexaneRing: Array<[number, number, 1]> = [
  [0, 1, 1],
  [1, 2, 1],
  [2, 3, 1],
  [3, 4, 1],
  [4, 5, 1],
  [5, 0, 1],
]

const CORE_REFERENCE_MOLECULAR_GRAPHS: ReferenceGraph[] = [
  createReferenceGraph("benzene", ["C", "C", "C", "C", "C", "C"], benzeneRing, [{ nodeIds: [0, 1, 2, 3, 4, 5], aromatic: true }], "C6H6"),
  createReferenceGraph("phenol", ["C", "C", "C", "C", "C", "C", "O"], [...benzeneRing, [0, 6, 1]], [{ nodeIds: [0, 1, 2, 3, 4, 5], aromatic: true }], "C6H6O"),
  createReferenceGraph("aniline", ["C", "C", "C", "C", "C", "C", "N"], [...benzeneRing, [0, 6, 1]], [{ nodeIds: [0, 1, 2, 3, 4, 5], aromatic: true }], "C6H7N"),
  createReferenceGraph("nitrobenzene", ["C", "C", "C", "C", "C", "C", "N", "O", "O"], [...benzeneRing, [0, 6, 1], [6, 7, 2], [6, 8, 1]], [{ nodeIds: [0, 1, 2, 3, 4, 5], aromatic: true }], "C6H5NO2"),
  createReferenceGraph("cyclohexane", ["C", "C", "C", "C", "C", "C"], cyclohexaneRing, [{ nodeIds: [0, 1, 2, 3, 4, 5], aromatic: false }], "C6H12"),
  createReferenceGraph("cyclohexene", ["C", "C", "C", "C", "C", "C"], [[0, 1, 2], [1, 2, 1], [2, 3, 1], [3, 4, 1], [4, 5, 1], [5, 0, 1]], [{ nodeIds: [0, 1, 2, 3, 4, 5], aromatic: false }], "C6H10"),
  createReferenceGraph("pyridine", ["N", "C", "C", "C", "C", "C"], benzeneRing, [{ nodeIds: [0, 1, 2, 3, 4, 5], aromatic: true }], "C5H5N"),
  createReferenceGraph("naphthalene", ["C", "C", "C", "C", "C", "C", "C", "C", "C", "C"], [
    ...benzeneRing,
    [2, 6, 1],
    [6, 7, 2],
    [7, 8, 1],
    [8, 9, 2],
    [9, 3, 1],
  ], [
    { nodeIds: [0, 1, 2, 3, 4, 5], aromatic: true },
    { nodeIds: [2, 6, 7, 8, 9, 3], aromatic: true },
  ], "C10H8"),
  createReferenceGraph("methanol", ["C", "O"], [[0, 1, 1]], [], "CH4O"),
  createReferenceGraph("ethanol", ["C", "C", "O"], [[0, 1, 1], [1, 2, 1]], [], "C2H6O"),
  createReferenceGraph("acetone", ["C", "C", "O", "C"], [[0, 1, 1], [1, 2, 2], [1, 3, 1]], [], "C3H6O"),
  createReferenceGraph("ethanoic-acid", ["C", "C", "O", "O"], [[0, 1, 1], [1, 2, 2], [1, 3, 1]], [], "C2H4O2"),
  createReferenceGraph("ethyl-ethanoate", ["C", "C", "O", "O", "C", "C"], [[0, 1, 1], [1, 2, 2], [1, 3, 1], [3, 4, 1], [4, 5, 1]], [], "C4H8O2"),
  createReferenceGraph("glycine", ["N", "C", "C", "O", "O"], [[0, 1, 1], [1, 2, 1], [2, 3, 2], [2, 4, 1]], [], "C2H5NO2"),
  createReferenceGraph("alanine", ["N", "C", "C", "O", "O", "C"], [[0, 1, 1], [1, 2, 1], [2, 3, 2], [2, 4, 1], [1, 5, 1]], [], "C3H7NO2"),
  createReferenceGraph("aspirin", ["C", "C", "C", "C", "C", "C", "C", "O", "O", "O", "C", "C", "O"], [
    ...benzeneRing,
    [0, 6, 1],
    [6, 7, 2],
    [6, 8, 1],
    [1, 9, 1],
    [9, 10, 1],
    [10, 11, 1],
    [10, 12, 2],
  ], [{ nodeIds: [0, 1, 2, 3, 4, 5], aromatic: true }], "C9H8O4"),
  createReferenceGraph("glucose", ["C", "C", "C", "C", "C", "C", "O", "O", "O", "O", "O", "O"], [[0, 1, 1], [1, 2, 1], [2, 3, 1], [3, 4, 1], [4, 5, 1], [0, 6, 2], [1, 7, 1], [2, 8, 1], [3, 9, 1], [4, 10, 1], [5, 11, 1]], [], "C6H12O6"),
  createReferenceGraph("caffeine", ["C", "N", "C", "N", "C", "C", "N", "C", "N", "O", "O", "C", "C", "C"], [[0, 1, 1], [1, 2, 2], [2, 3, 1], [3, 4, 1], [4, 5, 2], [5, 0, 1], [4, 6, 1], [6, 7, 2], [7, 8, 1], [8, 5, 1], [0, 9, 2], [2, 10, 2], [1, 11, 1], [3, 12, 1], [8, 13, 1]], [
    { nodeIds: [0, 1, 2, 3, 4, 5], aromatic: true },
    { nodeIds: [4, 6, 7, 8, 5], aromatic: true },
  ], "C8H10N4O2"),
]

function dedupeReferenceGraphs(graphs: ReferenceGraph[]): ReferenceGraph[] {
  const byId = new Map<string, ReferenceGraph>()
  graphs.forEach((graph) => {
    if (!byId.has(graph.compoundId)) byId.set(graph.compoundId, graph)
  })
  return Array.from(byId.values())
}

export const REFERENCE_MOLECULAR_GRAPHS: ReferenceGraph[] = dedupeReferenceGraphs([
  ...CORE_REFERENCE_MOLECULAR_GRAPHS,
  ...buildExpandedReferenceGraphs(createReferenceGraph),
])

function adjacencySignature(graph: MolecularGraph, order: number[]): string {
  const indexByNodeId = new Map(order.map((nodeId, index) => [nodeId, index]))
  const nodes = order
    .map((id) => graph.nodes.find((candidate) => candidate.id === id))
    .filter((candidate): candidate is MolecularGraphNode => Boolean(candidate))
  const matrix: string[] = []
  for (let left = 0; left < nodes.length; left += 1) {
    for (let right = left + 1; right < nodes.length; right += 1) {
      const bondOrder = graph.bonds.find((bond) => {
        const a = indexByNodeId.get(bond.startNodeId)
        const b = indexByNodeId.get(bond.endNodeId)
        return (a === left && b === right) || (a === right && b === left)
      })?.bondOrder ?? 0
      matrix.push(String(bondOrder))
    }
  }
  const ringPart = graph.rings
    .map((ring) => `${ring.size}${ring.aromatic ? "a" : "s"}`)
    .sort()
    .join(".")
  return `${nodes.map((item) => item.inferredElement).join(",")}::${matrix.join("")}::${ringPart}`
}

function graphDegrees(graph: MolecularGraph): Map<number, number> {
  const degrees = new Map<number, number>()
  graph.nodes.forEach((item) => degrees.set(item.id, 0))
  graph.bonds.forEach((item) => {
    degrees.set(item.startNodeId, (degrees.get(item.startNodeId) ?? 0) + 1)
    degrees.set(item.endNodeId, (degrees.get(item.endNodeId) ?? 0) + 1)
  })
  return degrees
}

export function canonicalGraphId(graph: MolecularGraph): string {
  const canonical = canonicalizeMolecularGraph(graph)
  if (canonical.nodes.length > 12) return featureSignature(canonical)
  const degrees = graphDegrees(canonical)
  const ordered = [...canonical.nodes].sort((left, right) =>
    left.inferredElement.localeCompare(right.inferredElement) ||
    (degrees.get(left.id) ?? 0) - (degrees.get(right.id) ?? 0) ||
    left.id - right.id,
  )
  const groups = new Map<string, number[]>()
  ordered.forEach((item) => {
    const key = `${item.inferredElement}:${degrees.get(item.id) ?? 0}`
    groups.set(key, [...(groups.get(key) ?? []), item.id])
  })
  const buckets = Array.from(groups.values())
  let best = ""
  let visited = 0
  const walk = (bucketIndex: number, prefix: number[]) => {
    if (visited > 200000) return
    if (bucketIndex >= buckets.length) {
      visited += 1
      const signature = adjacencySignature(canonical, prefix)
      if (!best || signature < best) best = signature
      return
    }
    const values = buckets[bucketIndex]
    const permute = (remaining: number[], selected: number[]) => {
      if (!remaining.length) {
        walk(bucketIndex + 1, [...prefix, ...selected])
        return
      }
      remaining.forEach((value, index) => {
        permute([...remaining.slice(0, index), ...remaining.slice(index + 1)], [...selected, value])
      })
    }
    permute(values, [])
  }
  walk(0, [])
  return best || molecularGraphHash(canonical)
}

function featureSignature(graph: MolecularGraph): string {
  const elements = graph.nodes
    .map((item) => item.inferredElement)
    .sort()
    .join(".")
  const bonds = graph.bonds
    .map((item) => item.bondOrder)
    .sort()
    .join(".")
  const rings = graph.rings
    .map((item) => `${item.size}${item.aromatic ? "a" : "s"}`)
    .sort()
    .join(".")
  return `${elements}::${bonds}::${rings}::${graph.estimates.estimatedFormula}`
}

function formulaCounts(formula: string | undefined): Map<string, number> {
  const counts = new Map<string, number>()
  if (!formula) return counts
  for (const match of formula.matchAll(/([A-Z][a-z]?)(\d*)/g)) {
    counts.set(match[1], (counts.get(match[1]) ?? 0) + Number(match[2] || "1"))
  }
  return counts
}

function featureSimilarity(graph: MolecularGraph, reference: MolecularGraph, record?: IntelligenceCompoundRecord): { score: number; reasons: string[] } {
  const reasons: string[] = []
  let score = 0
  const graphFormula = formulaCounts(graph.estimates.estimatedFormula)
  const refFormula = formulaCounts(record?.formula ?? reference.estimates.estimatedFormula)
  const elements = new Set([...graphFormula.keys(), ...refFormula.keys()])
  let elementPenalty = 0
  elements.forEach((element) => {
    elementPenalty += Math.abs((graphFormula.get(element) ?? 0) - (refFormula.get(element) ?? 0))
  })
  if (refFormula.size && elementPenalty === 0) {
    score += 28
    reasons.push("Formula/composition matches the reference record")
  } else if (elementPenalty <= 2) {
    score += 12
    reasons.push("Formula/composition is close to the reference record")
  }
  const atomDifference = Math.abs(graph.nodes.length - reference.nodes.length)
  score += Math.max(0, 16 - atomDifference * 4)
  const bondDifference = Math.abs(graph.bonds.length - reference.bonds.length)
  score += Math.max(0, 12 - bondDifference * 3)
  const ringDifference = Math.abs(graph.rings.length - reference.rings.length)
  if (ringDifference === 0) {
    score += 10
    if (graph.rings.length) reasons.push("Ring count matches")
  }
  const aromaticMatch = graph.aromatic === reference.aromatic
  if (aromaticMatch) {
    score += 12
    if (graph.aromatic) reasons.push("Aromatic topology agrees")
  }
  const doubleDifference = Math.abs(graph.estimates.doubleBonds - reference.estimates.doubleBonds)
  score += Math.max(0, 10 - doubleDifference * 4)
  const tripleDifference = Math.abs(graph.estimates.tripleBonds - reference.estimates.tripleBonds)
  score += Math.max(0, 6 - tripleDifference * 4)
  return { score: Math.round(clamp(score, 0, 92)), reasons }
}

export function areGraphsIsomorphic(left: MolecularGraph, right: MolecularGraph): boolean {
  return canonicalGraphId(left) === canonicalGraphId(right)
}

export function matchCanonicalGraph(
  graph: MolecularGraph,
  records: IntelligenceCompoundRecord[],
  preferredCompoundId?: string,
): GraphMatchResult[] {
  const canonicalId = canonicalGraphId(graph)
  const recordMap = new Map(records.map((record) => [record.id, record]))
  const eliminationReport = generateCandidateEliminationReport(graph, records, preferredCompoundId)
  const candidateStatus = new Map(eliminationReport.candidates.map((candidate) => [candidate.compoundId, candidate]))
  const passedIds = new Set(eliminationReport.candidates.filter((candidate) => candidate.status === "passed").map((candidate) => candidate.compoundId))
  const matches = REFERENCE_MOLECULAR_GRAPHS
    .filter((reference) => passedIds.has(reference.compoundId))
    .map((reference) => {
    const referenceCanonicalId = canonicalGraphId(reference.graph)
    const exact = canonicalId === referenceCanonicalId
    const feature = featureSimilarity(graph, reference.graph, recordMap.get(reference.compoundId))
    const preferredBonus = preferredCompoundId === reference.compoundId ? 8 : 0
    const confidence = exact ? 100 : Math.round(clamp(feature.score + graph.estimates.confidence * 0.16 + preferredBonus, 0, 96))
    const elimination = candidateStatus.get(reference.compoundId)
    return {
      compoundId: reference.compoundId,
      confidence,
      exact,
      canonicalId,
      referenceCanonicalId,
      reasons: exact
        ? [
          "Graph isomorphism matched atom connectivity independent of rotation, mirroring, or numbering.",
          elimination ? `Chemical requirements passed (${elimination.satisfied}/${elimination.requirementsEvaluated}).` : "Chemical requirements passed.",
        ]
        : [
          ...feature.reasons,
          elimination ? `Chemical requirements passed (${elimination.satisfied}/${elimination.requirementsEvaluated}).` : "Chemical requirements passed.",
        ],
    }
  })
    .filter((match) => match.exact || match.confidence >= 38)
    .sort((left, right) => right.confidence - left.confidence || Number(right.exact) - Number(left.exact) || left.compoundId.localeCompare(right.compoundId))

  if (preferredCompoundId && passedIds.has(preferredCompoundId) && !matches.some((item) => item.compoundId === preferredCompoundId)) {
    matches.push({
      compoundId: preferredCompoundId,
      confidence: 52,
      exact: false,
      canonicalId,
      referenceCanonicalId: "database-record-fallback",
      reasons: ["Existing scanner evidence selected this database record, and chemical contradiction checks did not reject it."],
    })
  }
  return matches.slice(0, 8)
}

export function generateCandidateEliminationReport(
  graph: MolecularGraph,
  records: IntelligenceCompoundRecord[],
  preferredCompoundId?: string,
): CandidateEliminationReport {
  return runChemicalContradictionEngine({
    graph,
    references: REFERENCE_MOLECULAR_GRAPHS,
    records,
    preferredCompoundId,
  })
}
