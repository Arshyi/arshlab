import type { MolecularGraph, MolecularGraphNode } from "../vision/molecular-graph"

export interface BondAngleObservation {
  nodeId: number
  angle: number
  nearestGeometry: "sp" | "sp2" | "sp3" | "other"
  deviation: number
}

export interface BondAngleAnalysis {
  observations: BondAngleObservation[]
  averageAngle: number
  variance: number
  idealGeometrySupport: number
  impossibleGeometryPenalty: number
  explanation: string
}

function clamp(value: number, minimum = 0, maximum = 100): number {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
}

function angleBetween(center: MolecularGraphNode, left: MolecularGraphNode, right: MolecularGraphNode): number {
  const first = Math.atan2(left.y - center.y, left.x - center.x)
  const second = Math.atan2(right.y - center.y, right.x - center.x)
  const raw = Math.abs((first - second) * 180 / Math.PI) % 360
  return raw > 180 ? 360 - raw : raw
}

function nearestGeometry(angle: number): BondAngleObservation["nearestGeometry"] {
  const candidates = [
    { geometry: "sp3" as const, ideal: 109.5 },
    { geometry: "sp2" as const, ideal: 120 },
    { geometry: "sp" as const, ideal: 180 },
  ]
  return candidates.sort((left, right) => Math.abs(angle - left.ideal) - Math.abs(angle - right.ideal))[0]?.geometry ?? "other"
}

function deviationFromIdeal(angle: number): number {
  return Math.min(Math.abs(angle - 109.5), Math.abs(angle - 120), Math.abs(angle - 180))
}

export function analyzeBondAngles(graph: MolecularGraph): BondAngleAnalysis {
  const observations: BondAngleObservation[] = []
  for (const node of graph.nodes) {
    const neighbors = graph.bonds
      .filter((bond) => bond.startNodeId === node.id || bond.endNodeId === node.id)
      .map((bond) => graph.nodes.find((candidate) => candidate.id === (bond.startNodeId === node.id ? bond.endNodeId : bond.startNodeId)))
      .filter((candidate): candidate is MolecularGraphNode => Boolean(candidate))
    for (let leftIndex = 0; leftIndex < neighbors.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < neighbors.length; rightIndex += 1) {
        const angle = angleBetween(node, neighbors[leftIndex], neighbors[rightIndex])
        const deviation = deviationFromIdeal(angle)
        observations.push({
          nodeId: node.id,
          angle: Math.round(angle * 10) / 10,
          nearestGeometry: nearestGeometry(angle),
          deviation: Math.round(deviation * 10) / 10,
        })
      }
    }
  }
  if (!observations.length) {
    return {
      observations,
      averageAngle: 0,
      variance: 0,
      idealGeometrySupport: graph.bonds.length <= 1 ? 42 : 18,
      impossibleGeometryPenalty: graph.bonds.length > 2 ? 18 : 0,
      explanation: "Not enough connected bond angles were available for geometry scoring.",
    }
  }
  const averageAngle = observations.reduce((sum, observation) => sum + observation.angle, 0) / observations.length
  const variance = observations.reduce((sum, observation) => sum + (observation.angle - averageAngle) ** 2, 0) / observations.length
  const averageDeviation = observations.reduce((sum, observation) => sum + observation.deviation, 0) / observations.length
  const idealGeometrySupport = Math.round(clamp(100 - averageDeviation * 2.2 - Math.sqrt(variance) * 0.35))
  const impossibleGeometryPenalty = Math.round(clamp(
    observations.filter((observation) => observation.angle < 38 || (observation.angle > 145 && observation.nearestGeometry !== "sp")).length * 18 +
    Math.max(0, Math.sqrt(variance) - 34) * 0.55,
    0,
    70,
  ))
  return {
    observations,
    averageAngle: Math.round(averageAngle * 10) / 10,
    variance: Math.round(variance * 10) / 10,
    idealGeometrySupport,
    impossibleGeometryPenalty,
    explanation: `Measured ${observations.length} local bond angle${observations.length === 1 ? "" : "s"} against sp3 ~109.5, sp2 ~120, and sp ~180 geometry.`,
  }
}
