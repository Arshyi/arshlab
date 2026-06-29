import type { MolecularGraph } from "../vision/molecular-graph"
import type { ReferenceGraph } from "./graph-matcher"
import { analyzeGraphChemicalFeatures, buildIdentityRequirements } from "./chemical-requirements"
import type { CandidateEliminationReport, CandidateEliminationResult } from "./elimination-report"
import { summarizeEliminationReport } from "./elimination-report"
import { validateIdentityRequirements } from "./identity-validator"
import type { IntelligenceCompoundRecord } from "./types"

export interface CandidateEliminatorInput {
  graph: MolecularGraph
  references: ReferenceGraph[]
  records: IntelligenceCompoundRecord[]
  preferredCompoundId?: string
}

function resultSort(left: CandidateEliminationResult, right: CandidateEliminationResult): number {
  const statusDifference = Number(right.status === "passed") - Number(left.status === "passed")
  if (statusDifference) return statusDifference
  return (
    left.hardFailures.length - right.hardFailures.length ||
    left.softFailures.length - right.softFailures.length ||
    right.satisfied - left.satisfied ||
    left.name.localeCompare(right.name)
  )
}

export function eliminateCandidates(input: CandidateEliminatorInput): CandidateEliminationReport {
  const features = analyzeGraphChemicalFeatures(input.graph)
  const recordMap = new Map(input.records.map((record) => [record.id, record]))
  const candidates = input.references
    .map((reference) => {
      const record = recordMap.get(reference.compoundId)
      const requirements = buildIdentityRequirements(reference, record)
      const result = validateIdentityRequirements(reference.compoundId, record?.name ?? reference.compoundId, features, requirements)
      if (input.preferredCompoundId === reference.compoundId && result.status === "passed") {
        return {
          ...result,
          checks: [
            ...result.checks,
            {
              id: "scanner-preferred",
              label: "Scanner preferred candidate",
              severity: "soft" as const,
              status: "satisfied" as const,
              expected: "compatible",
              detected: "compatible",
              reason: "Existing scanner evidence preferred this identity and chemistry requirements did not reject it.",
            },
          ],
          requirementsEvaluated: result.requirementsEvaluated + 1,
          satisfied: result.satisfied + 1,
        }
      }
      return result
    })
    .sort(resultSort)

  return summarizeEliminationReport(candidates)
}
