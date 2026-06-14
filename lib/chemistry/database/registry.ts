import type { DatabaseMeta, EntityKind } from "./types"
import { ALL_COMPOUNDS } from "./compounds"
import { ALL_ELEMENTS } from "./periodic-table"
import { ALL_IONS } from "./ions"
import { HYBRIDIZATION_PRESETS } from "./hybridization"
import { ALL_FUNCTIONAL_GROUPS } from "./functional-groups"
import { ALL_ORBITALS } from "./orbitals"
import { ALL_SPECTROSCOPY } from "./spectroscopy"
import { REACTION_TEMPLATES } from "./reactions/families"
import { VSEPR_PRESETS } from "./vsepr/engine"
import { ALL_LEWIS_STRUCTURES } from "./lewis/templates"
import { QUESTION_TOPICS } from "./questions/topics"
import { EDUCATION_HUB_SECTIONS } from "./education/hub"

export const DATABASE_VERSION = "3.5.0"

export function getDatabaseMeta(): DatabaseMeta {
  return {
    version: DATABASE_VERSION,
    updatedAt: new Date().toISOString().split("T")[0],
    counts: {
      compounds: ALL_COMPOUNDS.length,
      elements: ALL_ELEMENTS.length,
      ions: ALL_IONS.length,
      hybridizationPresets: HYBRIDIZATION_PRESETS.length,
      functionalGroups: ALL_FUNCTIONAL_GROUPS.length,
      orbitals: ALL_ORBITALS.length,
      spectroscopy: ALL_SPECTROSCOPY.length,
      reactions: REACTION_TEMPLATES.length,
      vseprPresets: VSEPR_PRESETS.length,
      lewisStructures: ALL_LEWIS_STRUCTURES.length,
      questionTopics: QUESTION_TOPICS.length,
      educationSections: EDUCATION_HUB_SECTIONS.length,
    },
  }
}

export function getCount(kind: EntityKind): number {
  switch (kind) {
    case "compound":
      return ALL_COMPOUNDS.length
    case "element":
      return ALL_ELEMENTS.length
    case "ion":
      return ALL_IONS.length
    case "functional-group":
      return ALL_FUNCTIONAL_GROUPS.length
    case "orbital":
      return ALL_ORBITALS.length
    case "spectroscopy":
      return ALL_SPECTROSCOPY.length
    case "reaction":
      return REACTION_TEMPLATES.length
    default:
      return 0
  }
}

export {
  ALL_COMPOUNDS,
  ALL_ELEMENTS,
  ALL_IONS,
  HYBRIDIZATION_PRESETS,
  ALL_FUNCTIONAL_GROUPS,
  ALL_ORBITALS,
  ALL_SPECTROSCOPY,
  REACTION_TEMPLATES,
  VSEPR_PRESETS,
  ALL_LEWIS_STRUCTURES,
  QUESTION_TOPICS,
  EDUCATION_HUB_SECTIONS,
}
