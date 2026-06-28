import type {
  EvidenceEngineId,
  EvidenceEngineResult,
  EvidenceFusionResult,
  EvidencePenalty,
  FusedEngineVote,
  FusedEvidenceCandidate,
} from "./evidence-types"

const ENGINE_WEIGHTS: Record<EvidenceEngineId, number> = {
  "ocr-formula": 0.62,
  "atom-label": 0.48,
  "bond-geometry": 0.72,
  "ring-closure": 1.08,
  "ring-aromatic": 1.05,
  "molecular-graph": 1.15,
  "functional-group": 0.7,
  "filename-manual": 1,
}

const STRENGTH_FACTORS = {
  weak: 0.62,
  moderate: 0.84,
  strong: 1,
} as const

function clamp(value: number, minimum = 0, maximum = 100): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function confidenceFromVotes(votes: FusedEngineVote[], penalties: EvidencePenalty[]): number {
  const ordered = [...votes].sort((left, right) => right.confidence - left.confidence)
  if (!ordered.length) return 0
  let confidence = ordered[0].confidence * (ordered.length === 1 ? 0.72 : 0.58)
  confidence += (ordered[1]?.confidence ?? 0) * 0.25
  confidence += (ordered[2]?.confidence ?? 0) * 0.12
  confidence += Math.min(10, Math.max(0, ordered.length - 1) * 3)
  confidence -= Math.min(18, penalties.reduce((sum, penalty) => sum + penalty.points, 0) * 0.18)

  const strongManual = votes.some((vote) => vote.engineId === "filename-manual" && vote.evidenceType === "manual" && vote.confidence >= 88)
  const strongGraph = votes.some((vote) => vote.engineId === "molecular-graph" && vote.strength === "strong")
  const strongClosure = votes.some((vote) => vote.engineId === "ring-closure" && vote.strength === "strong")
  const strongRing = votes.some((vote) => vote.engineId === "ring-aromatic" && vote.strength === "strong")
  if (strongManual) confidence = Math.max(confidence, 94)
  if (strongGraph && strongRing && strongClosure) confidence = Math.max(confidence, 88)
  else if (strongGraph && strongClosure) confidence = Math.max(confidence, 85)
  else if (strongRing && strongClosure) confidence = Math.max(confidence, 82)
  else if (strongGraph && strongRing) confidence = Math.max(confidence, 84)
  else if (strongGraph) confidence = Math.max(confidence, 74)

  if (votes.length === 1) {
    const only = votes[0]
    if (only.engineId === "ocr-formula") confidence = Math.min(confidence, 64)
    if (only.engineId === "atom-label") confidence = Math.min(confidence, 48)
    if (only.engineId === "functional-group") confidence = Math.min(confidence, 58)
    if (only.engineId === "ring-closure") confidence = Math.min(confidence, 74)
    if (only.engineId === "filename-manual" && only.evidenceType === "filename") confidence = Math.min(confidence, 42)
    if (only.engineId === "molecular-graph") confidence = Math.min(confidence, 78)
  }
  return Math.round(clamp(confidence, 8, 97))
}

function comparisonReason(winner: FusedEvidenceCandidate | undefined, runnerUp: FusedEvidenceCandidate | undefined): string {
  if (!winner) return "No engine produced a database-backed candidate."
  if (!runnerUp) return `${winner.strongestEvidence} was the only database-backed evidence path.`
  const scoreMargin = Math.round((winner.score - runnerUp.score) * 10) / 10
  const agreement = `${winner.engineVotes.length} engine${winner.engineVotes.length === 1 ? "" : "s"} supported the winner versus ${runnerUp.engineVotes.length} for the runner-up`
  return `${agreement}; ${winner.strongestEvidence} supplied the strongest vote, producing a ${scoreMargin}-point fusion margin.`
}

export function fuseStructureEvidence(engines: EvidenceEngineResult[]): EvidenceFusionResult {
  const votesByCompound = new Map<string, FusedEngineVote[]>()
  for (const engine of engines) {
    for (const current of engine.candidates) {
      const weightedContribution = current.confidence * ENGINE_WEIGHTS[engine.id] * STRENGTH_FACTORS[current.strength] / 10
      const vote: FusedEngineVote = {
        ...current,
        engineId: engine.id,
        engineLabel: engine.label,
        weightedContribution: Math.round(weightedContribution * 10) / 10,
      }
      votesByCompound.set(current.compoundId, [...(votesByCompound.get(current.compoundId) ?? []), vote])
    }
  }

  const manualWinner = engines
    .find((engine) => engine.id === "filename-manual")
    ?.candidates.find((item) => item.evidenceType === "manual" && item.confidence >= 88)

  const fused = Array.from(votesByCompound, ([compoundId, votes]): FusedEvidenceCandidate => {
    const penalties = votes.flatMap((vote) => vote.penalties)
    if (manualWinner && manualWinner.compoundId !== compoundId) {
      penalties.push({ reason: `Explicit manual evidence favors ${manualWinner.compoundId}`, points: 28 })
    }
    let score = votes.reduce((sum, vote) => sum + vote.weightedContribution, 0)
    score += Math.min(10, Math.max(0, votes.length - 1) * 2.5)
    const strongGraph = votes.some((vote) => vote.engineId === "molecular-graph" && vote.strength === "strong")
    const strongClosure = votes.some((vote) => vote.engineId === "ring-closure" && vote.strength === "strong")
    const strongRing = votes.some((vote) => vote.engineId === "ring-aromatic" && vote.strength === "strong")
    const strongManual = votes.some((vote) => vote.engineId === "filename-manual" && vote.evidenceType === "manual" && vote.confidence >= 88)
    if (strongGraph && strongRing && strongClosure) score += 18
    else if ((strongGraph && strongClosure) || (strongRing && strongClosure)) score += 14
    else if (strongGraph && strongRing) score += 12
    if (strongManual) score += 24
    if (manualWinner && manualWinner.compoundId !== compoundId) score -= 28
    const strongestVote = [...votes].sort((left, right) => right.weightedContribution - left.weightedContribution)[0]
    return {
      compoundId,
      score: Math.round(score * 10) / 10,
      confidence: confidenceFromVotes(votes, penalties),
      engineVotes: [...votes].sort((left, right) => right.weightedContribution - left.weightedContribution),
      reasoning: Array.from(new Set(votes.flatMap((vote) => vote.reasoning))),
      penalties,
      strongestEvidence: strongestVote ? `${strongestVote.engineLabel} (${strongestVote.confidence}%)` : "No strong evidence",
    }
  }).sort((left, right) => right.score - left.score || right.confidence - left.confidence || left.compoundId.localeCompare(right.compoundId))

  const candidates = fused.slice(0, 5)
  const winner = candidates[0]
  const runnerUp = candidates[1]
  const engineStrengths = engines.map((engine) => ({
    label: engine.label,
    confidence: engine.candidates[0]?.confidence ?? 0,
  })).sort((left, right) => right.confidence - left.confidence)

  return {
    engines,
    candidates,
    winningCompoundId: winner?.compoundId ?? null,
    runnerUpCompoundIds: candidates.slice(1, 4).map((item) => item.compoundId),
    whyWinnerBeatRunnerUp: comparisonReason(winner, runnerUp),
    strongestEvidence: engineStrengths[0]?.confidence
      ? `${engineStrengths[0].label} (${engineStrengths[0].confidence}%)`
      : "No strong engine evidence",
    weakestEvidence: engineStrengths[engineStrengths.length - 1]?.confidence
      ? `${engineStrengths[engineStrengths.length - 1].label} (${engineStrengths[engineStrengths.length - 1].confidence}%)`
      : `${engineStrengths[engineStrengths.length - 1]?.label ?? "Evidence engine"} produced no candidate`,
  }
}
