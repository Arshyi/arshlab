export type RequirementSeverity = "hard" | "soft"
export type RequirementStatus = "satisfied" | "soft-failed" | "hard-failed"
export type CandidateEliminationStatus = "passed" | "eliminated"

export interface IdentityRequirementCheck {
  id: string
  label: string
  severity: RequirementSeverity
  status: RequirementStatus
  expected: string
  detected: string
  reason: string
}

export interface CandidateEliminationResult {
  compoundId: string
  name: string
  status: CandidateEliminationStatus
  requirementsEvaluated: number
  satisfied: number
  hardFailures: IdentityRequirementCheck[]
  softFailures: IdentityRequirementCheck[]
  checks: IdentityRequirementCheck[]
  scorePenalty: number
}

export interface CandidateEliminationReport {
  candidatesGenerated: number
  candidatesEliminated: number
  hardContradictions: number
  softContradictions: number
  requirementsEvaluated: number
  remainingCandidates: number
  topPassed: CandidateEliminationResult | null
  topEliminated: CandidateEliminationResult[]
  candidates: CandidateEliminationResult[]
}

export function summarizeEliminationReport(candidates: CandidateEliminationResult[]): CandidateEliminationReport {
  const eliminated = candidates.filter((candidate) => candidate.status === "eliminated")
  const passed = candidates.filter((candidate) => candidate.status === "passed")
  return {
    candidatesGenerated: candidates.length,
    candidatesEliminated: eliminated.length,
    hardContradictions: candidates.reduce((sum, candidate) => sum + candidate.hardFailures.length, 0),
    softContradictions: candidates.reduce((sum, candidate) => sum + candidate.softFailures.length, 0),
    requirementsEvaluated: candidates.reduce((sum, candidate) => sum + candidate.requirementsEvaluated, 0),
    remainingCandidates: passed.length,
    topPassed: passed[0] ?? null,
    topEliminated: eliminated.slice(0, 8),
    candidates,
  }
}
