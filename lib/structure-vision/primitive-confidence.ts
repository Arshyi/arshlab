import type {
  AtomCenterEstimate,
  PrimitiveBond,
  PrimitiveConfidenceSummary,
  ReconstructedStroke,
  VisionJunction,
} from "./vision-reconstruction-report"

function average(values: number[]): number {
  return Math.round(values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length))
}

function bucket(value: number): string {
  if (value >= 80) return "80-100"
  if (value >= 60) return "60-79"
  if (value >= 40) return "40-59"
  if (value >= 20) return "20-39"
  return "0-19"
}

function histogram(values: number[]): Array<{ label: string; count: number }> {
  const counts = new Map<string, number>([
    ["80-100", 0],
    ["60-79", 0],
    ["40-59", 0],
    ["20-39", 0],
    ["0-19", 0],
  ])
  values.forEach((value) => counts.set(bucket(value), (counts.get(bucket(value)) ?? 0) + 1))
  return Array.from(counts, ([label, count]) => ({ label, count }))
}

export function scorePrimitiveGraphConfidence({
  rawStrokes,
  mergedStrokes,
  repairedStrokes,
  junctions,
  atomCenters,
  acceptedBonds,
  repairedBonds,
}: {
  rawStrokes: ReconstructedStroke[]
  mergedStrokes: ReconstructedStroke[]
  repairedStrokes: ReconstructedStroke[]
  junctions: VisionJunction[]
  atomCenters: AtomCenterEstimate[]
  acceptedBonds: PrimitiveBond[]
  rejectedBonds: PrimitiveBond[]
  repairedBonds: PrimitiveBond[]
}): PrimitiveConfidenceSummary {
  const strokeConfidence = average(repairedStrokes.map((stroke) => stroke.confidence))
  const junctionConfidence = average(junctions.map((junction) => junction.confidence))
  const atomConfidence = average(atomCenters.map((atom) => atom.confidence))
  const bondConfidence = average(acceptedBonds.map((bond) => bond.confidence))
  const repairConfidence = repairedBonds.length ? average(repairedBonds.map((bond) => bond.confidence)) : 100
  const mergeGain = Math.max(0, rawStrokes.length - mergedStrokes.length)
  const overallConfidence = Math.round(Math.min(
    98,
    strokeConfidence * 0.22 +
    junctionConfidence * 0.12 +
    atomConfidence * 0.24 +
    bondConfidence * 0.32 +
    repairConfidence * 0.1 +
    Math.min(5, mergeGain),
  ))
  return {
    strokeConfidence,
    junctionConfidence,
    atomConfidence,
    bondConfidence,
    repairConfidence,
    overallConfidence,
    histogram: histogram([
      ...repairedStrokes.map((stroke) => stroke.confidence),
      ...junctions.map((junction) => junction.confidence),
      ...atomCenters.map((atom) => atom.confidence),
      ...acceptedBonds.map((bond) => bond.confidence),
    ]),
  }
}
