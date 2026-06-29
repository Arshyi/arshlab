import type { GraphChemicalFeatures, IdentityRequirements } from "./chemical-requirements"
import type { CandidateEliminationResult, IdentityRequirementCheck, RequirementSeverity } from "./elimination-report"

function check(
  checks: IdentityRequirementCheck[],
  id: string,
  label: string,
  passed: boolean,
  severity: RequirementSeverity,
  expected: string | number,
  detected: string | number,
  reason: string,
): void {
  checks.push({
    id,
    label,
    severity,
    status: passed ? "satisfied" : severity === "hard" ? "hard-failed" : "soft-failed",
    expected: String(expected),
    detected: String(detected),
    reason,
  })
}

function pluralize(value: number, unit: string): string {
  return `${value} ${unit}${value === 1 ? "" : "s"}`
}

export function validateIdentityRequirements(
  compoundId: string,
  name: string,
  features: GraphChemicalFeatures,
  requirements: IdentityRequirements,
): CandidateEliminationResult {
  const checks: IdentityRequirementCheck[] = []

  check(checks, "connected-components", "Connected graph", features.connectedComponents === requirements.connectedComponents, "hard", requirements.connectedComponents, features.connectedComponents, "Candidate identity requires a single consistent molecular graph.")
  check(checks, "carbon-count", "Carbon count", features.carbonCount === requirements.carbonCount, "hard", requirements.carbonCount, features.carbonCount, `Expected ${pluralize(requirements.carbonCount, "carbon")} for ${name}.`)

  Object.entries(requirements.heteroAtoms).forEach(([element, expected]) => {
    const detected = features.heteroAtoms[element] ?? 0
    check(checks, `hetero-${element}`, `${element} atom count`, detected === expected, "hard", expected, detected, expected === 0 ? `Detected ${element} where ${name} requires none.` : `${name} requires ${pluralize(expected, element)}.`)
  })

  check(checks, "ring-count", "Ring count", features.ringCount === requirements.ringCount, "hard", requirements.ringCount, features.ringCount, requirements.ringCount > 0 ? `No correct ring count for ${name}.` : `${name} should not contain a ring.`)

  if (requirements.requiredRingSizes.length) {
    requirements.requiredRingSizes.forEach((size, index) => {
      check(checks, `ring-size-${index}`, `${size}-member ring`, features.ringSizes.includes(size), "hard", size, features.ringSizes.join(", ") || "none", `A required ${size}-member ring is missing.`)
    })
  }

  check(checks, "aromaticity", "Aromaticity", features.aromatic === requirements.aromatic, "hard", requirements.aromatic ? "aromatic" : "non-aromatic", features.aromatic ? "aromatic" : "non-aromatic", requirements.aromatic ? `${name} requires aromatic topology.` : `${name} should not be aromatic.`)
  check(checks, "double-bonds", "Double-bond count", features.doubleBondCount === requirements.doubleBondCount, "hard", requirements.doubleBondCount, features.doubleBondCount, `Wrong number of double bonds for ${name}.`)
  check(checks, "triple-bonds", "Triple-bond count", features.tripleBondCount === requirements.tripleBondCount, "hard", requirements.tripleBondCount, features.tripleBondCount, `Wrong number of triple bonds for ${name}.`)
  check(checks, "terminal-oh", "Terminal alcohol OH", features.terminalOH === requirements.terminalOH, requirements.terminalOH > 0 || features.terminalOH > 0 ? "hard" : "soft", requirements.terminalOH, features.terminalOH, requirements.terminalOH > 0 ? `${name} requires a terminal alcohol/hydroxyl pattern.` : `${name} should not contain a terminal alcohol/hydroxyl pattern.`)
  check(checks, "carbonyl-count", "Carbonyl count", features.carbonylCount === requirements.carbonylCount, requirements.carbonylCount > 0 || features.carbonylCount > 0 ? "hard" : "soft", requirements.carbonylCount, features.carbonylCount, requirements.carbonylCount > 0 ? `${name} requires a carbonyl group.` : `${name} should not contain a carbonyl group.`)
  check(checks, "amine-count", "Nitrogen/amine count", features.amineCount === requirements.amineCount, requirements.amineCount > 0 || features.amineCount > 0 ? "hard" : "soft", requirements.amineCount, features.amineCount, requirements.amineCount > 0 ? `${name} requires nitrogen/amine evidence.` : `${name} should not contain nitrogen/amine evidence.`)
  check(checks, "halogen-count", "Halogen count", features.halogenCount === requirements.halogenCount, requirements.halogenCount > 0 || features.halogenCount > 0 ? "hard" : "soft", requirements.halogenCount, features.halogenCount, requirements.halogenCount > 0 ? `${name} requires halogen evidence.` : `${name} should not contain halogen evidence.`)
  check(checks, "branch-count", "Branch count", features.branchCount === requirements.branchCount, "soft", requirements.branchCount, features.branchCount, "Branching pattern differs from the reference graph.")

  requirements.forbiddenFunctionalGroups.forEach((group) => {
    const detected = features.functionalGroups.some((candidate) => candidate.toLowerCase() === group)
    check(checks, `forbidden-${group}`, `Forbidden ${group}`, !detected, "hard", "absent", detected ? "present" : "absent", `${name} forbids ${group}, but the detected graph contains that feature.`)
  })

  const hardFailures = checks.filter((item) => item.status === "hard-failed")
  const softFailures = checks.filter((item) => item.status === "soft-failed")
  const satisfied = checks.filter((item) => item.status === "satisfied").length
  return {
    compoundId,
    name,
    status: hardFailures.length ? "eliminated" : "passed",
    requirementsEvaluated: checks.length,
    satisfied,
    hardFailures,
    softFailures,
    checks,
    scorePenalty: hardFailures.length * 100 + softFailures.length * 5,
  }
}
