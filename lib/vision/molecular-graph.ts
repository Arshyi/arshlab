import type {
  VisionFunctionalGroupCue,
  VisionGraphAnalysis,
  VisionLineSegment,
  VisionParallelBondPair,
  VisionPoint,
  VisionRingCandidate,
} from "../structure-vision/vision-types"

export type InferredElement = "C" | "H" | "O" | "N" | "S" | "P" | "F" | "Cl" | "Br" | "I" | "Unknown"
export type MolecularRingKind = "benzene-like" | "cyclohexane-like" | "cyclopentane-like" | "ring"

export interface MolecularGraphNode {
  id: number
  x: number
  y: number
  degree: number
  inferredElement: InferredElement
  confidence: number
}

export interface MolecularGraphBond {
  id: number
  startNodeId: number
  endNodeId: number
  bondOrder: 1 | 2 | 3
  confidence: number
  sourceSegmentIndexes: number[]
  parallelPairCount: number
}

export interface MolecularGraphRing {
  id: number
  nodeIds: number[]
  size: number
  confidence: number
  aromatic: boolean
  closed: boolean
  kind: MolecularRingKind
}

export interface MolecularGraphEstimates {
  atoms: number
  carbons: number
  bonds: number
  rings: number
  singleBonds: number
  doubleBonds: number
  tripleBonds: number
  estimatedFormula: string
  confidence: number
}

export interface MolecularGraph {
  nodes: MolecularGraphNode[]
  bonds: MolecularGraphBond[]
  rings: MolecularGraphRing[]
  aromatic: boolean
  aromaticRingIds: number[]
  estimates: MolecularGraphEstimates
  warnings: string[]
}

export interface MolecularGraphInput {
  graph: VisionGraphAnalysis
  lineSegments: VisionLineSegment[]
  parallelBondPairs: VisionParallelBondPair[]
  ringCandidates: VisionRingCandidate[]
  functionalGroupCues: VisionFunctionalGroupCue[]
  recognizedText?: string
}

export interface MolecularGraphSimilarity {
  compoundId: string
  score: number
  confidence: number
  reasons: string[]
}

interface CompoundGraphSignature {
  compoundId: string
  carbons: number
  oxygens?: number
  ringSize?: number
  aromatic?: boolean
  doubleBonds?: number
  tripleBonds?: number
  cue?: VisionFunctionalGroupCue["kind"]
}

const GRAPH_SIGNATURES: CompoundGraphSignature[] = [
  { compoundId: "benzene", carbons: 6, ringSize: 6, aromatic: true, doubleBonds: 3 },
  { compoundId: "cyclohexane", carbons: 6, ringSize: 6, aromatic: false, doubleBonds: 0 },
  { compoundId: "ethanol", carbons: 2, oxygens: 1, cue: "hydroxyl" },
  { compoundId: "methanal", carbons: 1, oxygens: 1, doubleBonds: 1, cue: "carbonyl" },
  { compoundId: "ethanal", carbons: 2, oxygens: 1, doubleBonds: 1, cue: "carbonyl" },
  { compoundId: "ethanoic-acid", carbons: 2, oxygens: 2, doubleBonds: 1, cue: "carboxyl" },
  { compoundId: "acetone", carbons: 3, oxygens: 1, doubleBonds: 1, cue: "carbonyl" },
  { compoundId: "ethene", carbons: 2, doubleBonds: 1 },
  { compoundId: "ethyne", carbons: 2, tripleBonds: 1 },
]

const ELEMENT_ORDER: InferredElement[] = ["C", "H", "O", "N", "S", "P", "F", "Cl", "Br", "I"]
const VALENCE: Partial<Record<InferredElement, number>> = { C: 4, H: 1, O: 2, N: 3, S: 2, P: 3, F: 1, Cl: 1, Br: 1, I: 1 }

function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : min))
}

function distance(left: VisionPoint, right: VisionPoint): number {
  return Math.hypot(left.x - right.x, left.y - right.y)
}

function angleDifference(left: number, right: number): number {
  const difference = Math.abs(left - right) % 180
  return Math.min(difference, 180 - difference)
}

function edgeAngle(start: VisionPoint, end: VisionPoint): number {
  const angle = Math.atan2(end.y - start.y, end.x - start.x) * 180 / Math.PI
  return (angle + 180) % 180
}

function pairBelongsToEdge(
  pair: VisionParallelBondPair,
  sourceSegmentIndexes: number[],
  start: VisionPoint,
  end: VisionPoint,
): boolean {
  if (sourceSegmentIndexes.includes(pair.firstSegmentIndex) || sourceSegmentIndexes.includes(pair.secondSegmentIndex)) {
    return true
  }
  const center = { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 }
  return angleDifference(pair.angle, edgeAngle(start, end)) <= 12 &&
    distance(pair.center, center) <= Math.max(8, distance(start, end) * 0.42)
}

function canonicalCycle(nodeIds: number[]): string {
  const variants: string[] = []
  const add = (values: number[]) => {
    values.forEach((_, index) => variants.push([...values.slice(index), ...values.slice(0, index)].join("-")))
  }
  add(nodeIds)
  add([...nodeIds].reverse())
  return variants.sort()[0] ?? ""
}

function findClosedCycles(graph: VisionGraphAnalysis): number[][] {
  const adjacency = new Map<number, number[]>()
  graph.nodes.forEach((node) => adjacency.set(node.id, []))
  graph.edges.forEach((edge) => {
    adjacency.get(edge.startNodeId)?.push(edge.endNodeId)
    adjacency.get(edge.endNodeId)?.push(edge.startNodeId)
  })

  const found = new Map<string, number[]>()
  const walk = (start: number, current: number, path: number[]) => {
    if (path.length > 7) return
    for (const neighbor of adjacency.get(current) ?? []) {
      if (neighbor === start && path.length >= 3) {
        found.set(canonicalCycle(path), path)
        continue
      }
      if (path.includes(neighbor) || path.length >= 7) continue
      walk(start, neighbor, [...path, neighbor])
    }
  }
  graph.nodes.forEach((node) => walk(node.id, node.id, [node.id]))
  return Array.from(found.values()).filter((cycle) => cycle.length >= 3 && cycle.length <= 7)
}

function parseFormulaCounts(text: string): Map<InferredElement, number> {
  const counts = new Map<InferredElement, number>()
  const compact = text.replace(/[=#-]/g, "").replace(/\s+/g, " ")
  const candidates = compact.match(/(?:[A-Z][a-z]?\d*){2,}/g) ?? []
  const likelyFormula = candidates.sort((left, right) => right.length - left.length)[0]
  if (!likelyFormula) return counts
  for (const match of likelyFormula.matchAll(/([A-Z][a-z]?)(\d*)/g)) {
    const element = match[1] as InferredElement
    if (!ELEMENT_ORDER.includes(element)) continue
    counts.set(element, (counts.get(element) ?? 0) + Number(match[2] || "1"))
  }
  return counts
}

function assignElements(
  graph: VisionGraphAnalysis,
  bonds: MolecularGraphBond[],
  functionalGroupCues: VisionFunctionalGroupCue[],
  recognizedText: string,
): MolecularGraphNode[] {
  const degrees = new Map<number, number>()
  bonds.forEach((bond) => {
    degrees.set(bond.startNodeId, (degrees.get(bond.startNodeId) ?? 0) + 1)
    degrees.set(bond.endNodeId, (degrees.get(bond.endNodeId) ?? 0) + 1)
  })
  const formulaCounts = parseFormulaCounts(recognizedText)
  const oxygenCount = formulaCounts.get("O") ?? (
    functionalGroupCues.some((cue) => cue.kind === "carboxyl") ? 2 :
      functionalGroupCues.some((cue) => cue.kind === "carbonyl" || cue.kind === "hydroxyl") ? 1 : 0
  )
  const nitrogenCount = formulaCounts.get("N") ?? 0
  const nodes = graph.nodes.map((node): MolecularGraphNode => ({
    id: node.id,
    x: node.point.x,
    y: node.point.y,
    degree: degrees.get(node.id) ?? 0,
    inferredElement: "C",
    confidence: Math.round(clamp(node.mergeQuality * 0.7 + 22, 35, 92)),
  }))
  const terminalNodes = [...nodes].sort((left, right) => left.degree - right.degree || right.x - left.x || left.id - right.id)
  let cursor = 0
  for (let index = 0; index < Math.min(oxygenCount, nodes.length); index += 1) {
    terminalNodes[cursor].inferredElement = "O"
    terminalNodes[cursor].confidence = formulaCounts.has("O") ? 78 : 58
    cursor += 1
  }
  for (let index = 0; index < Math.min(nitrogenCount, nodes.length - cursor); index += 1) {
    terminalNodes[cursor].inferredElement = "N"
    terminalNodes[cursor].confidence = 76
    cursor += 1
  }
  return nodes
}

function estimateFormula(nodes: MolecularGraphNode[], bonds: MolecularGraphBond[], recognizedText: string): string {
  const parsed = parseFormulaCounts(recognizedText)
  if (parsed.size > 0) {
    return ELEMENT_ORDER
      .filter((element) => parsed.has(element))
      .map((element) => `${element}${(parsed.get(element) ?? 1) === 1 ? "" : parsed.get(element)}`)
      .join("")
  }

  const counts = new Map<InferredElement, number>()
  nodes.forEach((node) => counts.set(node.inferredElement, (counts.get(node.inferredElement) ?? 0) + 1))
  let hydrogens = 0
  nodes.forEach((node) => {
    const usedValence = bonds
      .filter((bond) => bond.startNodeId === node.id || bond.endNodeId === node.id)
      .reduce((sum, bond) => sum + bond.bondOrder, 0)
    hydrogens += Math.max(0, (VALENCE[node.inferredElement] ?? 0) - usedValence)
  })
  if (hydrogens > 0) counts.set("H", hydrogens)
  return ELEMENT_ORDER
    .filter((element) => counts.has(element))
    .map((element) => `${element}${(counts.get(element) ?? 1) === 1 ? "" : counts.get(element)}`)
    .join("") || "Unavailable"
}

export function reconstructMolecularGraph(input: MolecularGraphInput): MolecularGraph {
  const bonds = input.graph.edges.map((edge): MolecularGraphBond => {
    const start = input.graph.nodes[edge.startNodeId]?.point ?? { x: 0, y: 0 }
    const end = input.graph.nodes[edge.endNodeId]?.point ?? { x: 0, y: 0 }
    const pairs = input.parallelBondPairs.filter((pair) =>
      pairBelongsToEdge(pair, edge.sourceSegmentIndexes, start, end),
    )
    const sourceStrokeCount = new Set([
      ...edge.sourceSegmentIndexes,
      ...pairs.flatMap((pair) => [pair.firstSegmentIndex, pair.secondSegmentIndex]),
    ]).size
    const bondOrder: 1 | 2 | 3 = sourceStrokeCount >= 3 || pairs.length >= 2 ? 3 : pairs.length === 1 || sourceStrokeCount === 2 ? 2 : 1
    const averageMerge = (
      (input.graph.nodes[edge.startNodeId]?.mergeQuality ?? 40) +
      (input.graph.nodes[edge.endNodeId]?.mergeQuality ?? 40)
    ) / 2
    return {
      id: edge.id,
      startNodeId: edge.startNodeId,
      endNodeId: edge.endNodeId,
      bondOrder,
      confidence: Math.round(clamp(averageMerge * 0.55 + (bondOrder > 1 ? 30 : 22), 35, 94)),
      sourceSegmentIndexes: Array.from(new Set(edge.sourceSegmentIndexes)),
      parallelPairCount: pairs.length,
    }
  })

  const detectedCycles = findClosedCycles(input.graph)
  const ringMap = new Map<string, { nodeIds: number[]; confidence: number; aromatic: boolean; closed: boolean }>()
  detectedCycles.forEach((nodeIds) => {
    ringMap.set(canonicalCycle(nodeIds), { nodeIds, confidence: 65, aromatic: false, closed: true })
  })
  input.ringCandidates.forEach((candidate) => {
    if (candidate.sidesEstimate < 3 || candidate.sidesEstimate > 7) return
    const nodeIds = candidate.nodeIds.length === candidate.sidesEstimate
      ? candidate.nodeIds
      : detectedCycles.find((cycle) => cycle.length === candidate.sidesEstimate) ?? []
    if (!nodeIds.length) return
    const key = canonicalCycle(nodeIds)
    const existing = ringMap.get(key)
    ringMap.set(key, {
      nodeIds,
      confidence: Math.max(existing?.confidence ?? 0, candidate.confidence),
      aromatic: Boolean(existing?.aromatic || candidate.benzeneLike || candidate.aromaticCueScore >= 50),
      closed: Boolean(existing?.closed || !candidate.nearRing),
    })
  })

  const rings = Array.from(ringMap.values()).map((ring, id): MolecularGraphRing => {
    const ringBondOrders = bonds
      .filter((bond) => ring.nodeIds.includes(bond.startNodeId) && ring.nodeIds.includes(bond.endNodeId))
      .map((bond) => bond.bondOrder)
    const alternatingSupport = ringBondOrders.filter((order) => order >= 2).length >= Math.floor(ring.nodeIds.length / 2)
    const aromatic = ring.aromatic || (ring.nodeIds.length === 6 && alternatingSupport)
    const kind: MolecularRingKind = aromatic && ring.nodeIds.length === 6
      ? "benzene-like"
      : ring.nodeIds.length === 6
        ? "cyclohexane-like"
        : ring.nodeIds.length === 5
          ? "cyclopentane-like"
          : "ring"
    return { id, nodeIds: ring.nodeIds, size: ring.nodeIds.length, confidence: Math.round(ring.confidence), aromatic, closed: ring.closed, kind }
  })

  const nodes = assignElements(input.graph, bonds, input.functionalGroupCues, input.recognizedText ?? "")
  const carbons = nodes.filter((node) => node.inferredElement === "C").length
  const confidence = Math.round(clamp(
    (nodes.reduce((sum, node) => sum + node.confidence, 0) / Math.max(1, nodes.length)) * 0.45 +
    (bonds.reduce((sum, bond) => sum + bond.confidence, 0) / Math.max(1, bonds.length)) * 0.4 +
    (rings.length ? Math.max(...rings.map((ring) => ring.confidence)) : 50) * 0.15,
    0,
    94,
  ))
  const warnings: string[] = []
  if (!nodes.length) warnings.push("No stable molecular graph nodes were reconstructed.")
  if (input.graph.nearRingCandidates.length && !rings.some((ring) => ring.closed)) {
    warnings.push("A near-ring was retained with an inferred closing bond; verify the drawing crop.")
  }
  if (nodes.some((node) => node.inferredElement !== "C" && node.confidence < 70)) {
    warnings.push("Heteroatom placement is inferred from text or functional-group cues and may need confirmation.")
  }

  return {
    nodes,
    bonds,
    rings,
    aromatic: rings.some((ring) => ring.aromatic),
    aromaticRingIds: rings.filter((ring) => ring.aromatic).map((ring) => ring.id),
    estimates: {
      atoms: nodes.length,
      carbons,
      bonds: bonds.length,
      rings: rings.length,
      singleBonds: bonds.filter((bond) => bond.bondOrder === 1).length,
      doubleBonds: bonds.filter((bond) => bond.bondOrder === 2).length,
      tripleBonds: bonds.filter((bond) => bond.bondOrder === 3).length,
      estimatedFormula: estimateFormula(nodes, bonds, input.recognizedText ?? ""),
      confidence,
    },
    warnings,
  }
}

function countElement(graph: MolecularGraph, element: InferredElement): number {
  return graph.nodes.filter((node) => node.inferredElement === element).length
}

export function scoreMolecularGraphSimilarity(graph: MolecularGraph, compoundId: string): MolecularGraphSimilarity | null {
  const signature = GRAPH_SIGNATURES.find((candidate) => candidate.compoundId === compoundId)
  if (!signature || graph.nodes.length === 0) return null
  const reasons: string[] = []
  let score = 0
  const carbonDifference = Math.abs(graph.estimates.carbons - signature.carbons)
  if (carbonDifference === 0) {
    score += 18
    reasons.push(`Carbon skeleton matches ${signature.carbons} carbon${signature.carbons === 1 ? "" : "s"}`)
  } else if (carbonDifference === 1) {
    score += 7
    reasons.push("Carbon skeleton is within one detected vertex")
  }

  if (signature.oxygens !== undefined) {
    const oxygenDifference = Math.abs(countElement(graph, "O") - signature.oxygens)
    if (oxygenDifference === 0) {
      score += 10
      reasons.push(`${signature.oxygens} oxygen atom${signature.oxygens === 1 ? "" : "s"} inferred`)
    } else score -= Math.min(14, oxygenDifference * 10)
  }
  if (signature.ringSize !== undefined) {
    const ring = graph.rings.find((candidate) => candidate.size === signature.ringSize)
    if (ring) {
      score += 17
      reasons.push(`${signature.ringSize}-member reconstructed ring`)
      if (signature.aromatic === ring.aromatic) {
        score += 15
        reasons.push(signature.aromatic ? "Aromatic ring bond pattern" : "Saturated ring bond pattern")
      } else if (signature.aromatic) {
        score -= 12
      }
    } else {
      score -= 10
    }
  } else if (graph.rings.length > 0) {
    score -= 12
  }

  if (signature.doubleBonds !== undefined) {
    const difference = Math.abs(graph.estimates.doubleBonds - signature.doubleBonds)
    if (difference === 0) {
      score += 12
      reasons.push(`${signature.doubleBonds} double bond${signature.doubleBonds === 1 ? "" : "s"} reconstructed`)
    } else if (difference === 1 && signature.doubleBonds > 1) score += 5
  }
  if (signature.tripleBonds !== undefined && graph.estimates.tripleBonds === signature.tripleBonds) {
    score += 18
    reasons.push("Triple bond reconstructed from three parallel strokes")
  }
  if (signature.cue) {
    const formula = graph.estimates.estimatedFormula.toLowerCase()
    const cueSupported = signature.cue === "hydroxyl" ? countElement(graph, "O") > 0 :
      signature.cue === "carbonyl" ? countElement(graph, "O") > 0 && graph.estimates.doubleBonds > 0 :
        signature.cue === "carboxyl" ? countElement(graph, "O") >= 2 && graph.estimates.doubleBonds > 0 : false
    if (cueSupported || (signature.cue === "hydroxyl" && /o/.test(formula))) {
      score += 12
      reasons.push(`${signature.cue} graph pattern`)
    } else score -= 8
  }

  score = Math.round(clamp(score, 0, 62))
  if (score < 12) return null
  return {
    compoundId,
    score,
    confidence: Math.round(clamp(score * 1.25 + graph.estimates.confidence * 0.18, 18, 90)),
    reasons,
  }
}

export function rankMolecularGraphCandidates(graph: MolecularGraph): MolecularGraphSimilarity[] {
  return GRAPH_SIGNATURES
    .map((signature) => scoreMolecularGraphSimilarity(graph, signature.compoundId))
    .filter((candidate): candidate is MolecularGraphSimilarity => Boolean(candidate))
    .sort((left, right) => right.score - left.score || left.compoundId.localeCompare(right.compoundId))
}
