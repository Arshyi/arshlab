import type { FunctionalGroupRecord } from "../types"
import { functionalGroups as legacyGroups } from "@/lib/chemistry/functional-groups"

const boards = ["ib-sl", "ib-hl", "ap", "a-level", "high-school", "university-intro"] as const

export const ALL_FUNCTIONAL_GROUPS: FunctionalGroupRecord[] = legacyGroups.map((fg) => ({
  id: `fg-${fg.id}`,
  kind: "functional-group" as const,
  name: fg.name,
  aliases: fg.searchKeywords,
  formula: fg.generalFormula,
  tags: [fg.id, fg.representativeClass],
  examBoards: [...boards],
  topics: ["organic-chemistry", "functional-groups"],
  subtopics: [fg.id],
  structures: fg.structures,
  representativeClass: fg.representativeClass,
  generalFormula: fg.generalFormula,
  color: fg.color,
  polarity: fg.polarity,
  hydrogenBonding: fg.hydrogenBonding,
  properties: fg.properties,
  characteristicReactions: fg.characteristicReactions,
  iupacNamingRules: fg.iupacNamingRules,
  irAbsorptionRanges: fg.irAbsorptionRanges,
  msFragmentationNotes: fg.msFragmentationNotes,
  nmrHints: fg.nmrHints,
  exampleCompoundIds: fg.exampleCompoundNames.map((n) => `compound-${n.replace(/\s/g, "-")}`),
  structureArtExamples: fg.structureArtExamples,
  explanation: fg.explanation,
}))

export function getFunctionalGroupById(id: string): FunctionalGroupRecord | undefined {
  const normalized = id.startsWith("fg-") ? id : `fg-${id}`
  return ALL_FUNCTIONAL_GROUPS.find((f) => f.id === normalized)
}

export { legacyGroups as functionalGroupsLegacy }
