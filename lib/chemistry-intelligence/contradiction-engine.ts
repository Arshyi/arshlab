import type { MolecularGraph } from "../vision/molecular-graph"
import type { ReferenceGraph } from "./graph-matcher"
import { eliminateCandidates } from "./candidate-eliminator"
import type { CandidateEliminationReport } from "./elimination-report"
import type { IntelligenceCompoundRecord } from "./types"

export interface ChemicalContradictionEngineInput {
  graph: MolecularGraph
  references: ReferenceGraph[]
  records: IntelligenceCompoundRecord[]
  preferredCompoundId?: string
}

export function runChemicalContradictionEngine(input: ChemicalContradictionEngineInput): CandidateEliminationReport {
  return eliminateCandidates(input)
}

export function hasPassedIdentity(report: CandidateEliminationReport, compoundId: string): boolean {
  return report.candidates.some((candidate) => candidate.compoundId === compoundId && candidate.status === "passed")
}
