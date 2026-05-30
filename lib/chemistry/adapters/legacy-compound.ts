import type { CompoundRecord } from "@/lib/chemistry/database/types"
import type { Compound } from "@/lib/chemistry/compounds"

/** Map database compound records to legacy Compound shape for existing UI */
export function toLegacyCompound(record: CompoundRecord): Compound {
  return {
    name: record.name,
    aliases: record.aliases,
    formula: record.formula ?? "",
    condensed: record.condensed,
    family: record.family,
    functionalGroup: record.functionalGroup,
    polarity: record.polarity,
    hydrogenBonding: record.hydrogenBonding,
    explanation: record.explanation,
    structureArt: record.structureArt,
    structureArtWithLonePairs: record.structureArtWithLonePairs,
    lonePairs: record.lonePairs,
    symmetry: record.symmetry,
    commonReactions: record.commonReactions,
  }
}
