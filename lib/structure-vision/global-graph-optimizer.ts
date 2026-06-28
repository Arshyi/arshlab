import { rankMolecularGraphCandidates, type MolecularGraph, type MolecularGraphBond, type MolecularGraphNode } from "../vision/molecular-graph"
import { analyzeBondAngles, type BondAngleAnalysis } from "./bond-angle-engine"
import { canonicalizeMolecularGraph, molecularGraphHash } from "./canonical-molecular-graph"
import { rebuildMolecularGraph, type CandidateGraphHypothesis, type CandidateGraphScoreEntry } from "./candidate-graph-generator"

export interface OptimizerMove {
  label: string
  accepted: boolean
  beforeScore: number
  afterScore: number
  reason: string
}

export interface RingTemplateFit {
  ringId: number
  size: number
  rmsError: number
  confidence: number
  aromatic: boolean
}

export interface OptimizedGraphHypothesis {
  id: string
  label: string
  graph: MolecularGraph
  score: number
  canonicalHash: string
  operations: string[]
  scoreBreakdown: CandidateGraphScoreEntry[]
  angleAnalysis: BondAngleAnalysis
  ringTemplateFits: RingTemplateFit[]
}

export interface GlobalGraphOptimizationResult {
  candidateGraphCount: number
  optimizerIterations: number
  acceptedMoves: OptimizerMove[]
  rejectedMoves: OptimizerMove[]
  selectedHypothesis: OptimizedGraphHypothesis | null
  runnerUpHypotheses: OptimizedGraphHypothesis[]
  finalOptimizationScore: number
  scoreBreakdown: CandidateGraphScoreEntry[]
  convergenceScores: number[]
  canonicalHash: string | null
  explanation: string
}

const VALENCE: Record<string, number> = { C: 4, H: 1, O: 2, N: 3, S: 2, P: 3, F: 1, Cl: 1, Br: 1, I: 1, Unknown: 4 }

function clamp(value: number, minimum = 0, maximum = 100): number {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
}

function distance(left: MolecularGraphNode, right: MolecularGraphNode): number {
  return Math.hypot(left.x - right.x, left.y - right.y)
}

function median(values: number[]): number {
  if (!values.length) return 0
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.floor(sorted.length / 2)]
}

function bondLength(graph: MolecularGraph, bond: MolecularGraphBond): number {
  const start = graph.nodes.find((node) => node.id === bond.startNodeId)
  const end = graph.nodes.find((node) => node.id === bond.endNodeId)
  return start && end ? distance(start, end) : 0
}

function segmentsIntersect(a: MolecularGraphNode, b: MolecularGraphNode, c: MolecularGraphNode, d: MolecularGraphNode): boolean {
  const orientation = (p: MolecularGraphNode, q: MolecularGraphNode, r: MolecularGraphNode) =>
    Math.sign((q.y - p.y) * (r.x - q.x) - (q.x - p.x) * (r.y - q.y))
  const first = orientation(a, b, c)
  const second = orientation(a, b, d)
  const third = orientation(c, d, a)
  const fourth = orientation(c, d, b)
  return first !== second && third !== fourth
}

function crossingCount(graph: MolecularGraph): number {
  let count = 0
  for (let leftIndex = 0; leftIndex < graph.bonds.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < graph.bonds.length; rightIndex += 1) {
      const left = graph.bonds[leftIndex]
      const right = graph.bonds[rightIndex]
      if ([left.startNodeId, left.endNodeId].some((id) => id === right.startNodeId || id === right.endNodeId)) continue
      const a = graph.nodes.find((node) => node.id === left.startNodeId)
      const b = graph.nodes.find((node) => node.id === left.endNodeId)
      const c = graph.nodes.find((node) => node.id === right.startNodeId)
      const d = graph.nodes.find((node) => node.id === right.endNodeId)
      if (a && b && c && d && segmentsIntersect(a, b, c, d)) count += 1
    }
  }
  return count
}

function componentSizes(graph: MolecularGraph): number[] {
  const adjacency = new Map<number, number[]>()
  graph.nodes.forEach((node) => adjacency.set(node.id, []))
  graph.bonds.forEach((bond) => {
    adjacency.get(bond.startNodeId)?.push(bond.endNodeId)
    adjacency.get(bond.endNodeId)?.push(bond.startNodeId)
  })
  const sizes: number[] = []
  const visited = new Set<number>()
  graph.nodes.forEach((node) => {
    if (visited.has(node.id)) return
    const queue = [node.id]
    visited.add(node.id)
    let size = 0
    while (queue.length) {
      const current = queue.shift()
      if (current === undefined) continue
      size += 1
      for (const neighbor of adjacency.get(current) ?? []) {
        if (visited.has(neighbor)) continue
        visited.add(neighbor)
        queue.push(neighbor)
      }
    }
    sizes.push(size)
  })
  return sizes.sort((left, right) => right - left)
}

function valencePenalty(graph: MolecularGraph): number {
  return graph.nodes.reduce((sum, node) => {
    const observed = graph.bonds
      .filter((bond) => bond.startNodeId === node.id || bond.endNodeId === node.id)
      .reduce((total, bond) => total + bond.bondOrder, 0)
    return sum + Math.max(0, observed - (VALENCE[node.inferredElement] ?? 4)) * 15
  }, 0)
}

function bondLengthConsistency(graph: MolecularGraph): number {
  const lengths = graph.bonds.map((bond) => bondLength(graph, bond)).filter((length) => length > 0)
  if (lengths.length <= 1) return 48
  const localMedian = median(lengths)
  const deviations = lengths.map((length) => Math.abs(length - localMedian) / Math.max(1, localMedian))
  return Math.round(clamp(100 - deviations.reduce((sum, deviation) => sum + deviation, 0) / deviations.length * 155))
}

function fitRingTemplates(graph: MolecularGraph): RingTemplateFit[] {
  return graph.rings.map((ring): RingTemplateFit => {
    const nodes = ring.nodeIds
      .map((nodeId) => graph.nodes.find((node) => node.id === nodeId))
      .filter((node): node is MolecularGraphNode => Boolean(node))
    if (nodes.length < 3) return { ringId: ring.id, size: ring.size, rmsError: 999, confidence: 0, aromatic: ring.aromatic }
    const center = {
      x: nodes.reduce((sum, node) => sum + node.x, 0) / nodes.length,
      y: nodes.reduce((sum, node) => sum + node.y, 0) / nodes.length,
    }
    const radii = nodes.map((node) => Math.hypot(node.x - center.x, node.y - center.y))
    const radius = radii.reduce((sum, value) => sum + value, 0) / radii.length
    const rmsError = Math.sqrt(radii.reduce((sum, value) => sum + (value - radius) ** 2, 0) / radii.length)
    const confidence = Math.round(clamp(100 - rmsError / Math.max(1, radius) * 180 + (ring.size >= 5 && ring.size <= 8 ? 8 : -18)))
    return {
      ringId: ring.id,
      size: ring.size,
      rmsError: Math.round(rmsError * 10) / 10,
      confidence,
      aromatic: ring.aromatic,
    }
  })
}

function scoreGraph(graph: MolecularGraph): OptimizedGraphHypothesis {
  const angleAnalysis = analyzeBondAngles(graph)
  const ringTemplateFits = fitRingTemplates(graph)
  const lengthScore = bondLengthConsistency(graph)
  const ringTemplateScore = ringTemplateFits.length ? Math.max(...ringTemplateFits.map((fit) => fit.confidence)) : 35
  const aromaticStability = graph.rings.some((ring) => ring.aromatic && ring.size === 6 && graph.estimates.tripleBonds === 0) ? 94 :
    graph.rings.some((ring) => ring.aromatic && graph.estimates.tripleBonds > 0) ? 36 :
      graph.rings.length ? 58 : 32
  const databaseSimilarity = rankMolecularGraphCandidates(graph)[0]?.confidence ?? 0
  const sizes = componentSizes(graph)
  const connectivityScore = sizes.length <= 1 ? 88 : Math.max(0, 88 - (sizes.length - 1) * 18 - sizes.slice(1).reduce((sum, size) => sum + size * 4, 0))
  const simplicityScore = Math.round(clamp(86 - Math.max(0, graph.bonds.length - graph.nodes.length - 2) * 9 - graph.estimates.tripleBonds * (graph.aromatic ? 16 : 3)))
  const impossibleCrossings = crossingCount(graph)
  const disconnectedPenalty = sizes.length > 1 ? (sizes.length - 1) * 12 : 0
  const valence = valencePenalty(graph)
  const crossingPenalty = impossibleCrossings * 18
  const tinyFragmentPenalty = sizes.slice(1).filter((size) => size <= 2).length * 12
  const scoreBreakdown: CandidateGraphScoreEntry[] = [
    { label: "Visual score", points: Math.round(graph.estimates.confidence * 0.16), maximum: 16 },
    { label: "Bond length consistency", points: Math.round(lengthScore * 0.13), maximum: 13 },
    { label: "Bond angle consistency", points: Math.round(angleAnalysis.idealGeometrySupport * 0.12), maximum: 12 },
    { label: "Valence satisfaction", points: Math.max(0, 14 - Math.round(valence * 0.3)), maximum: 14 },
    { label: "Ring template fit", points: Math.round(ringTemplateScore * 0.1), maximum: 10 },
    { label: "Aromatic stability", points: Math.round(aromaticStability * 0.1), maximum: 10 },
    { label: "Database similarity", points: Math.round(databaseSimilarity * 0.11), maximum: 11 },
    { label: "Graph simplicity", points: Math.round(simplicityScore * 0.06), maximum: 6 },
    { label: "Connectivity score", points: Math.round(connectivityScore * 0.08), maximum: 8 },
    { label: "Impossible crossings", points: -crossingPenalty, maximum: 0 },
    { label: "Disconnected fragments", points: -disconnectedPenalty, maximum: 0 },
    { label: "Valence violations", points: -valence, maximum: 0 },
    { label: "Tiny isolated components", points: -tinyFragmentPenalty, maximum: 0 },
  ]
  const total = Math.round(clamp(scoreBreakdown.reduce((sum, entry) => sum + entry.points, 0), 0, 100))
  return {
    id: molecularGraphHash(graph).slice(0, 18),
    label: "Scored graph",
    graph,
    score: total,
    canonicalHash: molecularGraphHash(graph),
    operations: [],
    scoreBreakdown,
    angleAnalysis,
    ringTemplateFits,
  }
}

function withoutBond(graph: MolecularGraph, bondId: number): MolecularGraph {
  return rebuildMolecularGraph(graph, graph.bonds.filter((bond) => bond.id !== bondId), graph.rings)
}

function withBondOrder(graph: MolecularGraph, bondId: number, order: 1 | 2 | 3): MolecularGraph {
  return rebuildMolecularGraph(graph, graph.bonds.map((bond) => bond.id === bondId ? { ...bond, bondOrder: order, confidence: Math.max(38, bond.confidence - 2) } : bond), graph.rings)
}

function legalNeighborGraphs(graph: MolecularGraph): Array<{ label: string; graph: MolecularGraph; reason: string }> {
  const moves: Array<{ label: string; graph: MolecularGraph; reason: string }> = []
  const lengths = graph.bonds.map((bond) => ({ bond, length: bondLength(graph, bond) })).filter((entry) => entry.length > 0)
  const localMedian = median(lengths.map((entry) => entry.length))
  lengths
    .filter((entry) => localMedian > 0 && entry.length > localMedian * 1.68)
    .slice(0, 3)
    .forEach((entry) => moves.push({ label: `remove edge ${entry.bond.id}`, graph: withoutBond(graph, entry.bond.id), reason: "Very long edge weakens whole-molecule consistency." }))

  graph.bonds
    .filter((bond) => bond.bondOrder === 3)
    .forEach((bond) => moves.push({ label: `triple to double ${bond.id}`, graph: withBondOrder(graph, bond.id, 2), reason: "Triple-like strokes can be better explained as double/aromatic support." }))

  graph.bonds
    .filter((bond) => bond.bondOrder === 2 && (bond.confidence < 55 || valencePenalty(graph) > 0))
    .slice(0, 3)
    .forEach((bond) => moves.push({ label: `double to single ${bond.id}`, graph: withBondOrder(graph, bond.id, 1), reason: "Downgrade weak multiple bond to improve valence and simplicity." }))

  const sixRing = graph.rings.find((ring) => ring.size === 6)
  const aromaticEvidence = Boolean(
    sixRing?.aromatic ||
    graph.estimates.doubleBonds >= 2 ||
    graph.bonds.filter((bond) => sixRing?.nodeIds.includes(bond.startNodeId) && sixRing?.nodeIds.includes(bond.endNodeId) && bond.parallelPairCount > 0).length >= 2,
  )
  if (sixRing && !sixRing.aromatic && aromaticEvidence && graph.estimates.tripleBonds === 0) {
    const aromaticBonds = graph.bonds.map((bond) => {
      if (!sixRing.nodeIds.includes(bond.startNodeId) || !sixRing.nodeIds.includes(bond.endNodeId)) return bond
      const edgeIndex = sixRing.nodeIds.findIndex((nodeId) => nodeId === bond.startNodeId || nodeId === bond.endNodeId)
      return { ...bond, bondOrder: (edgeIndex % 2 === 0 ? 2 : 1) as 1 | 2, confidence: Math.max(68, bond.confidence), parallelPairCount: edgeIndex % 2 === 0 ? Math.max(1, bond.parallelPairCount) : bond.parallelPairCount }
    })
    moves.push({
      label: "promote aromatic six-ring",
      graph: rebuildMolecularGraph(graph, aromaticBonds, graph.rings.map((ring) => ring.id === sixRing.id ? { ...ring, aromatic: true, kind: "benzene-like" } : ring)),
      reason: "Alternating six-member ring may better satisfy aromatic stability and database similarity.",
    })
  }

  return moves
}

function optimizeOne(hypothesis: CandidateGraphHypothesis): OptimizedGraphHypothesis & { accepted: OptimizerMove[]; rejected: OptimizerMove[]; convergence: number[] } {
  let current = canonicalizeMolecularGraph(hypothesis.graph)
  let scored = scoreGraph(current)
  const accepted: OptimizerMove[] = []
  const rejected: OptimizerMove[] = []
  const convergence = [scored.score]
  for (let iteration = 0; iteration < 12; iteration += 1) {
    const moves = legalNeighborGraphs(current)
    let bestMove: { label: string; graph: MolecularGraph; reason: string; score: number } | null = null
    for (const move of moves) {
      const nextScore = scoreGraph(canonicalizeMolecularGraph(move.graph)).score
      if (!bestMove || nextScore > bestMove.score || (nextScore === bestMove.score && move.label.localeCompare(bestMove.label) < 0)) {
        bestMove = { ...move, score: nextScore }
      }
    }
    if (!bestMove || bestMove.score <= scored.score) {
      moves.forEach((move) => rejected.push({
        label: move.label,
        accepted: false,
        beforeScore: scored.score,
        afterScore: scoreGraph(canonicalizeMolecularGraph(move.graph)).score,
        reason: move.reason,
      }))
      break
    }
    accepted.push({
      label: bestMove.label,
      accepted: true,
      beforeScore: scored.score,
      afterScore: bestMove.score,
      reason: bestMove.reason,
    })
    current = canonicalizeMolecularGraph(bestMove.graph)
    scored = scoreGraph(current)
    convergence.push(scored.score)
  }
  return {
    ...scored,
    label: hypothesis.label,
    operations: [...hypothesis.operations, ...accepted.map((move) => move.label)],
    accepted,
    rejected,
    convergence,
  }
}

export function optimizeMolecularGraphHypotheses(hypotheses: CandidateGraphHypothesis[]): GlobalGraphOptimizationResult {
  if (!hypotheses.length) {
    return {
      candidateGraphCount: 0,
      optimizerIterations: 0,
      acceptedMoves: [],
      rejectedMoves: [],
      selectedHypothesis: null,
      runnerUpHypotheses: [],
      finalOptimizationScore: 0,
      scoreBreakdown: [],
      convergenceScores: [],
      canonicalHash: null,
      explanation: "No molecular graph hypotheses were available for global optimization.",
    }
  }
  const optimized = hypotheses.map(optimizeOne).sort((left, right) => right.score - left.score || left.canonicalHash.localeCompare(right.canonicalHash))
  const selected = optimized[0]
  return {
    candidateGraphCount: hypotheses.length,
    optimizerIterations: Math.max(...optimized.map((item) => item.convergence.length - 1), 0),
    acceptedMoves: optimized.flatMap((item) => item.accepted).slice(0, 24),
    rejectedMoves: optimized.flatMap((item) => item.rejected).slice(0, 24),
    selectedHypothesis: selected,
    runnerUpHypotheses: optimized.slice(1, 4),
    finalOptimizationScore: selected?.score ?? 0,
    scoreBreakdown: selected?.scoreBreakdown ?? [],
    convergenceScores: selected?.convergence ?? [],
    canonicalHash: selected?.canonicalHash ?? null,
    explanation: selected
      ? `Selected ${selected.label} at ${selected.score}% after global graph scoring across ${hypotheses.length} deterministic hypothesis${hypotheses.length === 1 ? "" : "es"}.`
      : "No molecular graph hypothesis survived optimization.",
  }
}
