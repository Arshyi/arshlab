import { rankMolecularGraphCandidates, type MolecularGraph, type MolecularGraphBond, type MolecularGraphNode, type MolecularGraphRing } from "../vision/molecular-graph"
import { analyzeBondAngles } from "./bond-angle-engine"
import { canonicalizeMolecularGraph, molecularGraphHash } from "./canonical-molecular-graph"
import { rebuildMolecularGraph, type CandidateGraphHypothesis } from "./candidate-graph-generator"
import type { ChemicalGraphValidationResult } from "./chemical-graph-validator"
import type { GlobalGraphOptimizationResult, OptimizedGraphHypothesis, RingTemplateFit } from "./global-graph-optimizer"
import type { GlobalShapeReconstructionResult } from "./global-shape-reconstruction"
import type { SceneVariantEvaluation, VisionLineSegment, VisionParallelBondPair, VisionRingCandidate, VisionRingClosureAnalysis } from "./vision-types"

export type ConsensusGraphSource = "raw" | "candidate" | "optimizer" | "validator" | "repair"

export interface ConsensusPolygonTemplate {
  sides: number
  idealInteriorAngle: number
  idealEdgeRatio: number
  angleTolerance: number
  perspectiveTolerance: number
}

export interface ConsensusScoreChannel {
  label: string
  score: number
  weight: number
  contribution: number
  reason: string
}

export interface ConsensusGraphHistoryEntry {
  id: string
  label: string
  source: ConsensusGraphSource
  canonicalHash: string
  score: number
  nodes: number
  bonds: number
  rings: number
  aromatic: boolean
  reasons: string[]
}

export interface ConsensusRepairIteration {
  generation: number
  label: string
  accepted: boolean
  beforeScore: number
  afterScore: number
  reason: string
  graphHash: string
}

export interface ConsensusRingConflict {
  issue: string
  winner: string
  rejected: string
  reason: string
}

export interface ConsensusConfidenceCalibration {
  visual: number
  graph: number
  chemical: number
  database: number
  ocr: number
  overall: number
}

export interface ConsensusGraphHypothesis {
  id: string
  label: string
  source: ConsensusGraphSource
  sourceLabels: string[]
  graph: MolecularGraph
  canonicalHash: string
  score: number
  calibratedConfidence: number
  scoreChannels: ConsensusScoreChannel[]
  databaseMatches: ReturnType<typeof rankMolecularGraphCandidates>
  ringTemplateFits: RingTemplateFit[]
  repairHistory: ConsensusRepairIteration[]
  rejectionReasons: string[]
}

export interface ConsensusGraphSolverInput {
  rawGraph: MolecularGraph
  candidateGraphHypotheses: CandidateGraphHypothesis[]
  globalGraphOptimization: GlobalGraphOptimizationResult
  chemicalGraphValidation: ChemicalGraphValidationResult
  ringClosure: VisionRingClosureAnalysis
  ringCandidates: VisionRingCandidate[]
  globalShapeReconstruction: GlobalShapeReconstructionResult
  lineSegments: VisionLineSegment[]
  parallelBondPairs: VisionParallelBondPair[]
  recognizedText?: string
  sceneVariants?: SceneVariantEvaluation[]
}

export interface ConsensusGraphSolverResult {
  hypothesisCount: number
  duplicateGraphsRemoved: number
  selectedGraph: MolecularGraph
  selectedHypothesis: ConsensusGraphHypothesis | null
  runnerUpHypotheses: ConsensusGraphHypothesis[]
  repairIterations: ConsensusRepairIteration[]
  conflictResolutions: ConsensusRingConflict[]
  confidenceCalibration: ConsensusConfidenceCalibration
  finalConsensusScore: number
  polygonTemplates: ConsensusPolygonTemplate[]
  graphHistory: ConsensusGraphHistoryEntry[]
  explanation: string
}

interface PoolEntry {
  id: string
  label: string
  source: ConsensusGraphSource
  sourceLabels: string[]
  graph: MolecularGraph
  canonicalHash: string
  sourceScores: number[]
  repairHistory: ConsensusRepairIteration[]
}

interface Move {
  label: string
  graph: MolecularGraph
  reason: string
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

export const CONSENSUS_POLYGON_TEMPLATES: ConsensusPolygonTemplate[] = [3, 4, 5, 6, 7, 8].map((sides) => ({
  sides,
  idealInteriorAngle: Math.round(((sides - 2) * 180) / sides),
  idealEdgeRatio: 1,
  angleTolerance: sides === 6 ? 24 : 30,
  perspectiveTolerance: sides === 6 ? 0.36 : 0.42,
}))

function clamp(value: number, minimum = 0, maximum = 100): number {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
}

function round(value: number, digits = 0): number {
  const scale = 10 ** digits
  return Math.round(value * scale) / scale
}

function distance(left: Pick<MolecularGraphNode, "x" | "y">, right: Pick<MolecularGraphNode, "x" | "y">): number {
  return Math.hypot(left.x - right.x, left.y - right.y)
}

function median(values: number[]): number {
  if (!values.length) return 0
  const sorted = [...values].sort((left, right) => left - right)
  return sorted[Math.floor(sorted.length / 2)]
}

function bondKey(left: number, right: number): string {
  return `${Math.min(left, right)}-${Math.max(left, right)}`
}

function findBond(graph: MolecularGraph, left: number, right: number): MolecularGraphBond | undefined {
  return graph.bonds.find((bond) => bondKey(bond.startNodeId, bond.endNodeId) === bondKey(left, right))
}

function bondLength(graph: MolecularGraph, bond: MolecularGraphBond): number {
  const start = graph.nodes.find((node) => node.id === bond.startNodeId)
  const end = graph.nodes.find((node) => node.id === bond.endNodeId)
  return start && end ? distance(start, end) : 0
}

function bondLengthConsistency(graph: MolecularGraph): number {
  const lengths = graph.bonds.map((bond) => bondLength(graph, bond)).filter((length) => length > 0)
  if (lengths.length <= 1) return lengths.length ? 62 : 0
  const localMedian = median(lengths)
  const deviation = lengths.reduce((sum, length) => sum + Math.abs(length - localMedian) / Math.max(1, localMedian), 0) / lengths.length
  return Math.round(clamp(100 - deviation * 155))
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
    return sum + Math.max(0, observed - (VALENCE[node.inferredElement] ?? 4)) * 18
  }, 0)
}

function segmentOrientation(first: MolecularGraphNode, second: MolecularGraphNode, third: MolecularGraphNode): number {
  return (second.y - first.y) * (third.x - second.x) - (second.x - first.x) * (third.y - second.y)
}

function segmentsIntersect(a: MolecularGraphNode, b: MolecularGraphNode, c: MolecularGraphNode, d: MolecularGraphNode): boolean {
  const first = segmentOrientation(a, b, c)
  const second = segmentOrientation(a, b, d)
  const third = segmentOrientation(c, d, a)
  const fourth = segmentOrientation(c, d, b)
  return first * second < 0 && third * fourth < 0
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

function ringTemplateFits(graph: MolecularGraph): RingTemplateFit[] {
  return graph.rings.map((ring): RingTemplateFit => {
    const nodes = ring.nodeIds
      .map((nodeId) => graph.nodes.find((node) => node.id === nodeId))
      .filter((node): node is MolecularGraphNode => Boolean(node))
    if (nodes.length < 3) return { ringId: ring.id, size: ring.size, rmsError: 999, confidence: 0, aromatic: ring.aromatic }
    const center = {
      x: nodes.reduce((sum, node) => sum + node.x, 0) / nodes.length,
      y: nodes.reduce((sum, node) => sum + node.y, 0) / nodes.length,
    }
    const radii = nodes.map((node) => distance(node, center))
    const radius = radii.reduce((sum, value) => sum + value, 0) / radii.length
    const rmsError = Math.sqrt(radii.reduce((sum, value) => sum + (value - radius) ** 2, 0) / radii.length)
    const template = CONSENSUS_POLYGON_TEMPLATES.find((candidate) => candidate.sides === ring.size)
    const tolerance = template?.perspectiveTolerance ?? 0.42
    const normalizedError = rmsError / Math.max(1, radius)
    const confidence = Math.round(clamp(100 - normalizedError / tolerance * 70 + (ring.size === 6 ? 8 : 0) + (ring.aromatic ? 6 : 0)))
    return { ringId: ring.id, size: ring.size, rmsError: round(rmsError, 1), confidence, aromatic: ring.aromatic }
  })
}

function graphRingScore(graph: MolecularGraph, input: ConsensusGraphSolverInput): number {
  const fits = ringTemplateFits(graph)
  const templateScore = fits.length ? Math.max(...fits.map((fit) => fit.confidence)) : 0
  const closureScore = Math.max(0, ...input.ringClosure.candidates.map((candidate) => candidate.confidence))
  const visualRingScore = Math.max(0, ...input.ringCandidates.map((candidate) => candidate.confidence))
  const aromaticBonus = graph.rings.some((ring) => ring.size === 6 && ring.aromatic) ? 8 : 0
  return Math.round(clamp(Math.max(templateScore, closureScore * 0.88, visualRingScore * 0.78) + aromaticBonus))
}

function shapeScore(input: ConsensusGraphSolverInput): number {
  const shape = input.globalShapeReconstruction
  return Math.round(clamp(
    shape.shapeConfidence * 0.32 +
    shape.polygonConfidence * 0.26 +
    shape.symmetryScore * 0.18 +
    shape.closureScore * 0.18 +
    (shape.acceptedPolygon ? 6 : 0),
  ))
}

function ocrSupportScore(graph: MolecularGraph, recognizedText = ""): number {
  const text = recognizedText.toLowerCase()
  if (!text.trim()) return 0
  const formula = graph.estimates.estimatedFormula.toLowerCase()
  let score = 0
  if (formula !== "unavailable" && text.replace(/\s+/g, "").includes(formula)) score = Math.max(score, 82)
  if (graph.rings.some((ring) => ring.size === 6 && ring.aromatic) && /(benzene|aromatic|phenyl|c6h6)/i.test(text)) score = Math.max(score, 86)
  if (graph.rings.some((ring) => ring.size === 6 && !ring.aromatic) && /(cyclohexane|c6h12)/i.test(text)) score = Math.max(score, 78)
  if (graph.estimates.carbons === 2 && graph.nodes.some((node) => node.inferredElement === "O") && /(ethanol|ch3ch2oh|c2h6o)/i.test(text)) score = Math.max(score, 74)
  return score
}

function atomLabelScore(graph: MolecularGraph): number {
  const atomLabels = graph.nodes.filter((node) => node.source === "atom-label")
  if (!atomLabels.length) return graph.atomCentered ? 38 : 0
  const averageConfidence = atomLabels.reduce((sum, node) => sum + node.confidence, 0) / atomLabels.length
  return Math.round(clamp(averageConfidence * 0.82 + Math.min(14, atomLabels.length * 2)))
}

function validatorAgreementScore(graph: MolecularGraph, validation: ChemicalGraphValidationResult): number {
  const selectedHash = molecularGraphHash(graph)
  const validatedHash = molecularGraphHash(validation.validatedGraph)
  const base = validation.graphValidityScore
  return selectedHash === validatedHash ? base : Math.round(clamp(base * 0.62))
}

function optimizerAgreementScore(entry: PoolEntry, input: ConsensusGraphSolverInput): number {
  const selectedHash = input.globalGraphOptimization.canonicalHash
  if (selectedHash && selectedHash === entry.canonicalHash) return input.globalGraphOptimization.finalOptimizationScore
  const sourceScore = entry.sourceScores.length ? Math.max(...entry.sourceScores) : 0
  return Math.round(clamp(sourceScore * 0.72))
}

function databaseScore(graph: MolecularGraph): number {
  return rankMolecularGraphCandidates(graph)[0]?.confidence ?? 0
}

function sourceConsensusScore(entry: PoolEntry): number {
  const agreement = Math.min(100, entry.sourceLabels.length * 22)
  const sourceScore = entry.sourceScores.length ? Math.max(...entry.sourceScores) * 0.42 : 0
  return Math.round(clamp(agreement + sourceScore))
}

function graphStabilityScore(graph: MolecularGraph): number {
  const sizes = componentSizes(graph)
  const connectivity = sizes.length <= 1 ? 92 : Math.max(0, 92 - (sizes.length - 1) * 20 - sizes.slice(1).reduce((sum, size) => sum + size * 3, 0))
  const lengthScore = bondLengthConsistency(graph)
  const angle = analyzeBondAngles(graph)
  const crossings = crossingCount(graph)
  return Math.round(clamp(
    connectivity * 0.32 +
    lengthScore * 0.3 +
    angle.idealGeometrySupport * 0.28 +
    graph.estimates.confidence * 0.1 -
    crossings * 12,
  ))
}

function chemicalLegalityScore(graph: MolecularGraph): number {
  const penalty = valencePenalty(graph)
  const sizes = componentSizes(graph)
  const disconnectedPenalty = Math.max(0, sizes.length - 1) * 8
  const impossibleRingPenalty = graph.rings.some((ring) => ring.size === 6 && ring.aromatic && graph.estimates.tripleBonds > 0) ? 32 : 0
  return Math.round(clamp(100 - penalty - disconnectedPenalty - impossibleRingPenalty))
}

function contradictionPenalty(graph: MolecularGraph, input: ConsensusGraphSolverInput): number {
  let penalty = 0
  const hasHeteroInAromaticRing = graph.rings.some((ring) =>
    ring.aromatic &&
    ring.nodeIds.some((nodeId) => {
      const node = graph.nodes.find((candidate) => candidate.id === nodeId)
      return node && !["C", "H", "Unknown"].includes(node.inferredElement)
    }),
  )
  if (hasHeteroInAromaticRing) penalty += 22
  if (graph.rings.some((ring) => ring.size === 6 && ring.aromatic) && input.ringClosure.candidates.some((candidate) => candidate.selected && candidate.memberCount === 6 && candidate.aromaticSupport < 35)) {
    penalty += 10
  }
  if (graph.rings.length === 0 && input.ringClosure.candidates.some((candidate) => candidate.selected && candidate.confidence >= 65)) {
    penalty += 16
  }
  return penalty
}

function scoreEntry(entry: PoolEntry, input: ConsensusGraphSolverInput): ConsensusGraphHypothesis {
  const graph = canonicalizeMolecularGraph(entry.graph)
  const matches = rankMolecularGraphCandidates(graph)
  const ringFits = ringTemplateFits(graph)
  const scoreChannels: ConsensusScoreChannel[] = [
    {
      label: "Perspective/isolation support",
      score: Math.max(...(input.sceneVariants?.map((variant) => variant.score) ?? [0]), shapeScore(input) * 0.72),
      weight: 0.06,
      contribution: 0,
      reason: "Best normalized crop or global shape score.",
    },
    {
      label: "Stroke continuity",
      score: bondLengthConsistency(graph),
      weight: 0.1,
      contribution: 0,
      reason: "Molecular bonds should use a consistent local scale.",
    },
    {
      label: "Atom labels",
      score: atomLabelScore(graph),
      weight: 0.1,
      contribution: 0,
      reason: "Trusted chemistry OCR labels are used as graph vertices when available.",
    },
    {
      label: "Ring/polygon evidence",
      score: graphRingScore(graph, input),
      weight: 0.13,
      contribution: 0,
      reason: "Cycle, near-cycle, ring closure, and polygon-template agreement.",
    },
    {
      label: "Bond angle geometry",
      score: analyzeBondAngles(graph).idealGeometrySupport,
      weight: 0.1,
      contribution: 0,
      reason: "Bond angles are compared with chemically plausible local geometry.",
    },
    {
      label: "Valence legality",
      score: chemicalLegalityScore(graph),
      weight: 0.13,
      contribution: 0,
      reason: "Impossible valence, disconnected fragments, and triple-in-ring artifacts are penalized.",
    },
    {
      label: "Database similarity",
      score: databaseScore(graph),
      weight: 0.14,
      contribution: 0,
      reason: "Reconstructed topology is compared against local deterministic compound signatures.",
    },
    {
      label: "Optimizer agreement",
      score: optimizerAgreementScore(entry, input),
      weight: 0.1,
      contribution: 0,
      reason: "Global graph optimizer and canonical hashes must agree with the selected graph.",
    },
    {
      label: "Validator agreement",
      score: validatorAgreementScore(graph, input.chemicalGraphValidation),
      weight: 0.08,
      contribution: 0,
      reason: "Chemical graph validation must retain a plausible version of the graph.",
    },
    {
      label: "OCR support",
      score: ocrSupportScore(graph, input.recognizedText),
      weight: 0.04,
      contribution: 0,
      reason: "OCR can support a clean graph but cannot dominate weak topology.",
    },
    {
      label: "Source consensus",
      score: sourceConsensusScore(entry),
      weight: 0.12,
      contribution: 0,
      reason: "Independent graph producers that converge on the same canonical graph increase confidence.",
    },
  ].map((channel) => ({
    ...channel,
    score: Math.round(clamp(channel.score)),
    contribution: round(clamp(channel.score) * channel.weight, 1),
  }))

  const penalty = contradictionPenalty(graph, input)
  const total = clamp(scoreChannels.reduce((sum, channel) => sum + channel.contribution, 0) - penalty, 0, 100)
  const calibratedConfidence = calibrateConfidence({
    visual: graph.estimates.confidence,
    graph: graphStabilityScore(graph),
    chemical: chemicalLegalityScore(graph),
    database: matches[0]?.confidence ?? 0,
    ocr: ocrSupportScore(graph, input.recognizedText),
  }, penalty).overall

  return {
    id: entry.id,
    label: entry.label,
    source: entry.source,
    sourceLabels: entry.sourceLabels,
    graph,
    canonicalHash: molecularGraphHash(graph),
    score: Math.round(total),
    calibratedConfidence,
    scoreChannels,
    databaseMatches: matches,
    ringTemplateFits: ringFits,
    repairHistory: entry.repairHistory,
    rejectionReasons: penalty
      ? [`${penalty} points of contradiction penalty applied during consensus scoring.`]
      : [],
  }
}

function calibrateConfidence(
  values: Omit<ConsensusConfidenceCalibration, "overall">,
  penalty = 0,
): ConsensusConfidenceCalibration {
  const overall = Math.round(clamp(
    values.visual * 0.18 +
    values.graph * 0.24 +
    values.chemical * 0.22 +
    values.database * 0.24 +
    values.ocr * 0.06 -
    penalty * 0.4,
    0,
    98,
  ))
  return {
    visual: Math.round(clamp(values.visual)),
    graph: Math.round(clamp(values.graph)),
    chemical: Math.round(clamp(values.chemical)),
    database: Math.round(clamp(values.database)),
    ocr: Math.round(clamp(values.ocr)),
    overall,
  }
}

function withBondOrder(graph: MolecularGraph, bondId: number, order: 1 | 2 | 3): MolecularGraph {
  return rebuildMolecularGraph(
    graph,
    graph.bonds.map((bond) => bond.id === bondId ? { ...bond, bondOrder: order, confidence: Math.max(38, bond.confidence - 2) } : bond),
    graph.rings,
  )
}

function withoutBond(graph: MolecularGraph, bondId: number): MolecularGraph {
  return rebuildMolecularGraph(graph, graph.bonds.filter((bond) => bond.id !== bondId), graph.rings)
}

function ringEdgeIndex(ring: MolecularGraphRing, bond: MolecularGraphBond): number {
  return ring.nodeIds.findIndex((nodeId, index) => {
    const next = ring.nodeIds[(index + 1) % ring.nodeIds.length]
    return bondKey(nodeId, next) === bondKey(bond.startNodeId, bond.endNodeId)
  })
}

function legalRepairMoves(graph: MolecularGraph, input: ConsensusGraphSolverInput): Move[] {
  const moves: Move[] = []
  const lengths = graph.bonds.map((bond) => ({ bond, length: bondLength(graph, bond) })).filter((entry) => entry.length > 0)
  const localMedian = median(lengths.map((entry) => entry.length))
  lengths
    .filter((entry) => localMedian > 0 && entry.length > localMedian * (entry.bond.gapBridged ? 2.28 : 1.74))
    .slice(0, 4)
    .forEach((entry) => moves.push({
      label: `remove long edge ${entry.bond.id}`,
      graph: withoutBond(graph, entry.bond.id),
      reason: "Long edge is inconsistent with local bond length scale.",
    }))

  graph.bonds
    .filter((bond) => bond.bondOrder === 3)
    .slice(0, 4)
    .forEach((bond) => moves.push({
      label: `triple to double ${bond.id}`,
      graph: withBondOrder(graph, bond.id, 2),
      reason: "Triple-like stroke may be a parallel aromatic/double-bond artifact.",
    }))

  if (valencePenalty(graph) > 0) {
    graph.bonds
      .filter((bond) => bond.bondOrder === 2 || bond.bondOrder === 3)
      .slice(0, 4)
      .forEach((bond) => moves.push({
        label: `downgrade multiple bond ${bond.id}`,
        graph: withBondOrder(graph, bond.id, (bond.bondOrder - 1) as 1 | 2),
        reason: "Downgrading the weakest multiple bond may restore valence legality.",
      }))
  }

  const selectedClosure = input.ringClosure.candidates.find((candidate) =>
    candidate.selected &&
    candidate.memberCount >= 5 &&
    candidate.memberCount <= 8 &&
    candidate.confidence >= 50 &&
    candidate.nodeIds.every((nodeId) => graph.nodes.some((node) => node.id === nodeId)),
  )
  if (selectedClosure) {
    let nextBonds = [...graph.bonds]
    let added = 0
    selectedClosure.nodeIds.forEach((nodeId, index) => {
      const nextNodeId = selectedClosure.nodeIds[(index + 1) % selectedClosure.nodeIds.length]
      if (findBond({ ...graph, bonds: nextBonds }, nodeId, nextNodeId)) return
      const aromaticTarget = selectedClosure.memberCount === 6 && selectedClosure.aromaticSupport >= 55
      const currentDoubleCount = nextBonds.filter((bond) =>
        selectedClosure.nodeIds.includes(bond.startNodeId) &&
        selectedClosure.nodeIds.includes(bond.endNodeId) &&
        bond.bondOrder >= 2,
      ).length
      nextBonds.push({
        id: nextBonds.length,
        startNodeId: nodeId,
        endNodeId: nextNodeId,
        bondOrder: aromaticTarget && currentDoubleCount < 3 ? 2 : 1,
        confidence: Math.round(clamp(selectedClosure.confidence * 0.74, 42, 78)),
        sourceSegmentIndexes: [],
        parallelPairCount: aromaticTarget ? 1 : 0,
        gapBridged: true,
      })
      added += 1
    })
    if (added > 0) {
      const ring: MolecularGraphRing = {
        id: 0,
        nodeIds: selectedClosure.nodeIds,
        size: selectedClosure.memberCount,
        confidence: selectedClosure.confidence,
        aromatic: selectedClosure.memberCount === 6 && selectedClosure.aromaticSupport >= 55,
        closed: selectedClosure.closed,
        kind: selectedClosure.memberCount === 6 && selectedClosure.aromaticSupport >= 55
          ? "benzene-like"
          : selectedClosure.memberCount === 6 ? "cyclohexane-like" : selectedClosure.memberCount === 5 ? "cyclopentane-like" : "ring",
      }
      moves.push({
        label: "recover missing ring closure",
        graph: rebuildMolecularGraph(graph, nextBonds, [ring]),
        reason: "Selected ring-closure candidate supplies one or more short missing edges.",
      })
    }
  }

  const sixRing = graph.rings.find((ring) => ring.size === 6)
  const aromaticSupport = Boolean(
    sixRing &&
    !sixRing.aromatic &&
    graph.estimates.tripleBonds === 0 &&
    (
      graph.bonds.filter((bond) => sixRing.nodeIds.includes(bond.startNodeId) && sixRing.nodeIds.includes(bond.endNodeId) && bond.parallelPairCount > 0).length >= 2 ||
      graph.estimates.doubleBonds >= 2 ||
      input.ringClosure.aromaticSupportScore >= 55 ||
      /(benzene|aromatic|phenyl|c6h6)/i.test(input.recognizedText ?? "")
    )
  )
  if (sixRing && aromaticSupport) {
    const aromaticBonds = graph.bonds.map((bond) => {
      const index = ringEdgeIndex(sixRing, bond)
      if (index < 0) return bond
      return {
        ...bond,
        bondOrder: (index % 2 === 0 ? 2 : 1) as 1 | 2,
        confidence: Math.max(66, bond.confidence),
        parallelPairCount: index % 2 === 0 ? Math.max(1, bond.parallelPairCount) : bond.parallelPairCount,
      }
    })
    moves.push({
      label: "promote six-ring aromatic pattern",
      graph: rebuildMolecularGraph(
        graph,
        aromaticBonds,
        graph.rings.map((ring) => ring.id === sixRing.id ? { ...ring, aromatic: true, kind: "benzene-like", confidence: Math.max(84, ring.confidence) } : ring),
      ),
      reason: "Six-member ring has enough parallel or double-bond support to test aromatic consensus.",
    })
  }

  return moves
}

function repairEntry(entry: PoolEntry, input: ConsensusGraphSolverInput): PoolEntry {
  let current = entry.graph
  let currentScore = scoreEntry({ ...entry, graph: current }, input).score
  const repairHistory = [...entry.repairHistory]
  for (let generation = 1; generation <= 6; generation += 1) {
    const moves = legalRepairMoves(current, input)
    let best: (Move & { score: number; hash: string }) | null = null
    for (const move of moves) {
      const graph = canonicalizeMolecularGraph(move.graph)
      const score = scoreEntry({ ...entry, graph }, input).score
      const hash = molecularGraphHash(graph)
      if (!best || score > best.score || (score === best.score && hash.localeCompare(best.hash) < 0)) {
        best = { ...move, score, hash }
      }
    }
    if (!best || best.score <= currentScore + 1) {
      if (best) {
        repairHistory.push({
          generation,
          label: best.label,
          accepted: false,
          beforeScore: currentScore,
          afterScore: best.score,
          reason: best.reason,
          graphHash: best.hash,
        })
      }
      break
    }
    repairHistory.push({
      generation,
      label: best.label,
      accepted: true,
      beforeScore: currentScore,
      afterScore: best.score,
      reason: best.reason,
      graphHash: best.hash,
    })
    current = canonicalizeMolecularGraph(best.graph)
    currentScore = best.score
  }
  return {
    ...entry,
    id: `${entry.id}-repair`,
    label: `${entry.label} plus consensus repair`,
    source: "repair",
    sourceLabels: [...entry.sourceLabels, "Consensus repair"],
    graph: current,
    canonicalHash: molecularGraphHash(current),
    sourceScores: [...entry.sourceScores, currentScore],
    repairHistory,
  }
}

function addPoolEntry(pool: Map<string, PoolEntry>, entry: Omit<PoolEntry, "canonicalHash">): number {
  const graph = canonicalizeMolecularGraph(entry.graph)
  const canonicalHash = molecularGraphHash(graph)
  const existing = pool.get(canonicalHash)
  if (existing) {
    existing.sourceLabels = Array.from(new Set([...existing.sourceLabels, ...entry.sourceLabels]))
    existing.sourceScores.push(...entry.sourceScores)
    existing.repairHistory.push(...entry.repairHistory)
    return 1
  }
  pool.set(canonicalHash, { ...entry, graph, canonicalHash })
  return 0
}

function sourceFromOptimizer(item: OptimizedGraphHypothesis, sourceLabels: string[]): Omit<PoolEntry, "canonicalHash"> {
  return {
    id: item.id,
    label: item.label,
    source: "optimizer",
    sourceLabels,
    graph: item.graph,
    sourceScores: [item.score],
    repairHistory: [],
  }
}

function buildPool(input: ConsensusGraphSolverInput): { pool: PoolEntry[]; duplicates: number } {
  const pool = new Map<string, PoolEntry>()
  let duplicates = 0
  duplicates += addPoolEntry(pool, {
    id: "raw-graph",
    label: "Raw reconstructed graph",
    source: "raw",
    sourceLabels: ["Raw molecular graph"],
    graph: input.rawGraph,
    sourceScores: [input.rawGraph.estimates.confidence],
    repairHistory: [],
  })
  input.candidateGraphHypotheses.forEach((hypothesis) => {
    duplicates += addPoolEntry(pool, {
      id: hypothesis.id,
      label: hypothesis.label,
      source: "candidate",
      sourceLabels: [hypothesis.label],
      graph: hypothesis.graph,
      sourceScores: [hypothesis.initialScore],
      repairHistory: [],
    })
  })
  if (input.globalGraphOptimization.selectedHypothesis) {
    duplicates += addPoolEntry(pool, sourceFromOptimizer(input.globalGraphOptimization.selectedHypothesis, ["Global graph optimizer winner"]))
  }
  input.globalGraphOptimization.runnerUpHypotheses.forEach((hypothesis, index) => {
    duplicates += addPoolEntry(pool, sourceFromOptimizer(hypothesis, [`Global graph optimizer runner-up ${index + 1}`]))
  })
  duplicates += addPoolEntry(pool, {
    id: "validated-graph",
    label: "Chemically validated graph",
    source: "validator",
    sourceLabels: ["Chemical graph validator"],
    graph: input.chemicalGraphValidation.validatedGraph,
    sourceScores: [input.chemicalGraphValidation.graphValidityScore],
    repairHistory: [],
  })
  return { pool: Array.from(pool.values()), duplicates }
}

function resolveRingConflicts(selected: ConsensusGraphHypothesis | null, input: ConsensusGraphSolverInput): ConsensusRingConflict[] {
  if (!selected) return []
  const graph = selected.graph
  const conflicts: ConsensusRingConflict[] = []
  const selectedRing = graph.rings[0]
  const visualRing = [...input.ringClosure.candidates, ...input.ringCandidates]
    .sort((left, right) => (right.confidence ?? 0) - (left.confidence ?? 0))[0]
  if (selectedRing && visualRing && "memberCount" in visualRing && visualRing.memberCount !== selectedRing.size && visualRing.confidence >= 58) {
    conflicts.push({
      issue: "Ring size disagreement",
      winner: `${selectedRing.size}-member graph ring`,
      rejected: `${visualRing.memberCount}-member visual ring`,
      reason: "Consensus selected the graph ring because it survived valence validation, optimizer scoring, and database similarity.",
    })
  }
  if (selectedRing?.size === 6 && selectedRing.aromatic) {
    conflicts.push({
      issue: "Benzene versus saturated six-ring",
      winner: "aromatic six-member ring",
      rejected: "saturated cyclohexane interpretation",
      reason: "Double-bond/parallel support and database similarity outweighed the saturated-ring fallback.",
    })
  } else if (selectedRing?.size === 6 && !selectedRing.aromatic) {
    conflicts.push({
      issue: "Saturated six-ring selected",
      winner: "cyclohexane-like six-member ring",
      rejected: "benzene/aromatic interpretation",
      reason: "No reliable alternating double-bond evidence survived graph validation.",
    })
  }
  return conflicts
}

function historyFromHypotheses(hypotheses: ConsensusGraphHypothesis[]): ConsensusGraphHistoryEntry[] {
  return hypotheses.map((hypothesis) => ({
    id: hypothesis.id,
    label: hypothesis.label,
    source: hypothesis.source,
    canonicalHash: hypothesis.canonicalHash,
    score: hypothesis.score,
    nodes: hypothesis.graph.nodes.length,
    bonds: hypothesis.graph.bonds.length,
    rings: hypothesis.graph.rings.length,
    aromatic: hypothesis.graph.aromatic,
    reasons: [
      hypothesis.databaseMatches[0]
        ? `Top database match: ${hypothesis.databaseMatches[0].compoundId} (${hypothesis.databaseMatches[0].confidence}%)`
        : "No database match",
      `Sources: ${hypothesis.sourceLabels.join(", ")}`,
    ],
  }))
}

function selectedCalibration(selected: ConsensusGraphHypothesis | null): ConsensusConfidenceCalibration {
  if (!selected) return { visual: 0, graph: 0, chemical: 0, database: 0, ocr: 0, overall: 0 }
  const values = {
    visual: selected.scoreChannels.find((channel) => channel.label === "Stroke continuity")?.score ?? 0,
    graph: selected.scoreChannels.find((channel) => channel.label === "Bond angle geometry")?.score ?? 0,
    chemical: selected.scoreChannels.find((channel) => channel.label === "Valence legality")?.score ?? 0,
    database: selected.scoreChannels.find((channel) => channel.label === "Database similarity")?.score ?? 0,
    ocr: selected.scoreChannels.find((channel) => channel.label === "OCR support")?.score ?? 0,
  }
  return { ...values, overall: selected.calibratedConfidence }
}

export function solveConsensusGraph(input: ConsensusGraphSolverInput): ConsensusGraphSolverResult {
  const { pool, duplicates } = buildPool(input)
  const repaired = pool.map((entry) => repairEntry(entry, input))
  const repairedPool = new Map<string, PoolEntry>()
  let repairDuplicates = 0
  ;[...pool, ...repaired].forEach((entry) => {
    repairDuplicates += addPoolEntry(repairedPool, entry)
  })
  const hypotheses = Array.from(repairedPool.values())
    .map((entry) => scoreEntry(entry, input))
    .sort((left, right) => right.score - left.score || right.calibratedConfidence - left.calibratedConfidence || left.canonicalHash.localeCompare(right.canonicalHash))
  const selected = hypotheses[0] ?? null
  const conflictResolutions = resolveRingConflicts(selected, input)
  const graphHistory = historyFromHypotheses(hypotheses.slice(0, 12))
  const repairIterations = repaired.flatMap((entry) => entry.repairHistory).slice(0, 24)
  return {
    hypothesisCount: hypotheses.length,
    duplicateGraphsRemoved: duplicates + repairDuplicates,
    selectedGraph: selected?.graph ?? input.chemicalGraphValidation.validatedGraph,
    selectedHypothesis: selected,
    runnerUpHypotheses: hypotheses.slice(1, 4),
    repairIterations,
    conflictResolutions,
    confidenceCalibration: selectedCalibration(selected),
    finalConsensusScore: selected?.score ?? 0,
    polygonTemplates: CONSENSUS_POLYGON_TEMPLATES,
    graphHistory,
    explanation: selected
      ? `Consensus selected ${selected.label} at ${selected.score}% from ${hypotheses.length} canonical graph hypothesis${hypotheses.length === 1 ? "" : "es"}.`
      : "No graph hypothesis survived consensus scoring; falling back to chemical validation.",
  }
}
