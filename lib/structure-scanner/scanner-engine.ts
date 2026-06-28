import { fuseStructureEvidence } from "./evidence-fusion"
import { getStructureScannerRecord, runStructureEvidenceEngines } from "./evidence-engines"
import type { EvidenceEngineId, FusedEngineVote } from "./evidence-types"
import type {
  StructureScanInput,
  StructureScanMatch,
  StructureScanResult,
  StructureScoreContribution,
} from "./scanner-types"

const CONFIDENCE_THRESHOLD = 58

function contributionCategory(vote: FusedEngineVote): StructureScoreContribution["category"] {
  const label = vote.reasoning.join(" ")
  if (vote.engineId === "ocr-formula") {
    if (/formula/i.test(label)) return "formula"
    if (/name|alias/i.test(label)) return "name"
    return "ocr"
  }
  const categories: Partial<Record<EvidenceEngineId, StructureScoreContribution["category"]>> = {
    "atom-label": "atom-label",
    "bond-geometry": "visual",
    "ring-closure": "ring",
    "ring-aromatic": "ring",
    "molecular-graph": "graph",
    "functional-group": "visual",
  }
  if (vote.engineId === "filename-manual") return vote.evidenceType === "filename" ? "filename" : "manual"
  return categories[vote.engineId] ?? "other"
}

function toScanMatch(compoundId: string, fusion: ReturnType<typeof fuseStructureEvidence>): StructureScanMatch | null {
  const fused = fusion.candidates.find((candidate) => candidate.compoundId === compoundId)
  const record = getStructureScannerRecord(compoundId)
  if (!fused || !record) return null
  const contributions: StructureScoreContribution[] = fused.engineVotes.map((vote) => ({
    label: `${vote.engineLabel}: ${vote.reasoning[0] ?? "candidate support"}`,
    points: vote.weightedContribution,
    category: contributionCategory(vote),
  }))
  contributions.push(...fused.penalties.map((penalty) => ({
    label: penalty.reason,
    points: -penalty.points,
    category: "penalty" as const,
  })))
  return {
    record,
    confidence: fused.confidence,
    score: Math.round(fused.score * 10),
    reasons: Array.from(new Set(fused.reasoning)),
    contributions,
  }
}

function engineCandidateConfidence(
  fusion: ReturnType<typeof fuseStructureEvidence>,
  engineId: EvidenceEngineId,
  compoundId: string | undefined,
): number {
  if (!compoundId) return 0
  return fusion.engines
    .find((engine) => engine.id === engineId)
    ?.candidates.find((candidate) => candidate.compoundId === compoundId)
    ?.confidence ?? 0
}

export function scanStructure(input: StructureScanInput): StructureScanResult {
  const engines = runStructureEvidenceEngines(input)
  const evidenceFusion = fuseStructureEvidence(engines)
  const matches = evidenceFusion.candidates
    .map((candidate) => toScanMatch(candidate.compoundId, evidenceFusion))
    .filter((match): match is StructureScanMatch => Boolean(match))
  const bestMatch = matches[0] ?? null
  const winnerId = bestMatch?.record.id
  const isConfident = Boolean(bestMatch && bestMatch.confidence >= CONFIDENCE_THRESHOLD)
  const ocrConfidence = engineCandidateConfidence(evidenceFusion, "ocr-formula", winnerId) || Math.round(input.ocrQuality ?? 0)
  const graphConfidence = engineCandidateConfidence(evidenceFusion, "molecular-graph", winnerId)
  const ringConfidence = Math.max(
    engineCandidateConfidence(evidenceFusion, "ring-aromatic", winnerId),
    engineCandidateConfidence(evidenceFusion, "ring-closure", winnerId),
  )
  const strongTopologyLowOCR = isConfident && graphConfidence >= 70 && ringConfidence >= 70 && ocrConfidence < 40
  const message = isConfident
    ? strongTopologyLowOCR
      ? "Graph and ring engines agree strongly. Weak OCR did not suppress the chemistry topology evidence."
      : `Evidence fusion selected this compound after ${bestMatch?.contributions.filter((item) => item.points > 0).length ?? 0} independent engine votes.`
    : input.visualAnalysis?.isUncertain
      ? "Visual structure recognition is uncertain. Add a formula/name hint or crop closer."
      : bestMatch
        ? "ARSHLAB could not confidently identify this structure. Review the engine disagreements below."
        : "No recognition engine produced a database-valid compound candidate. Add a hint or improve the image crop."

  return {
    query: input,
    bestMatch,
    matches,
    message,
    isConfident,
    confidenceThreshold: CONFIDENCE_THRESHOLD,
    confidenceBreakdown: {
      ocr: ocrConfidence,
      graph: graphConfidence,
      ring: ringConfidence,
      chemistry: bestMatch?.confidence ?? 0,
    },
    evidenceFusion,
  }
}
