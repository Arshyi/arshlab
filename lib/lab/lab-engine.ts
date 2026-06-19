import { LAB_TECHNIQUES } from "./lab-database"
import type { LabCategory, LabMetrics, LabTechniqueRecord } from "./lab-types"

export const LAB_CATEGORIES: LabCategory[] = [
  "Volumetric Analysis",
  "Measurement",
  "Separation",
  "Organic Techniques",
  "Spectroscopy Prep",
  "Thermochemistry",
  "Safety",
  "Glassware",
]

export function labSlug(value: string | null | undefined): string {
  return decodeURIComponent(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function searchableText(record: LabTechniqueRecord): string {
  return [
    record.id,
    record.name,
    record.category,
    record.difficulty,
    record.purpose,
    ...record.equipment,
    ...record.procedure,
    ...record.commonMistakes,
    ...record.safetyNotes,
    ...record.examClues,
    ...record.labReportChecklist,
    ...record.related.formulas,
    ...record.related.reactions,
    ...record.related.solverModules,
    ...record.related.practiceTopics,
    ...record.aliases,
  ]
    .join(" ")
    .toLowerCase()
}

export function listLabTechniques(category?: LabCategory): LabTechniqueRecord[] {
  return category ? LAB_TECHNIQUES.filter((record) => record.category === category) : LAB_TECHNIQUES
}

export function getLabTechnique(id: string | null | undefined): LabTechniqueRecord | undefined {
  if (!id) return undefined
  const slug = labSlug(id)
  return LAB_TECHNIQUES.find(
    (record) =>
      labSlug(record.id) === slug ||
      labSlug(record.name) === slug ||
      record.aliases.some((alias) => labSlug(alias) === slug),
  )
}

export function searchLabTechniques(query: string, category?: LabCategory): LabTechniqueRecord[] {
  const normalized = query.toLowerCase().trim()
  const candidates = listLabTechniques(category)
  if (!normalized) return candidates
  return candidates.filter((record) => searchableText(record).includes(normalized))
}

export function getLabMetrics(): LabMetrics {
  const equipment = new Set(LAB_TECHNIQUES.flatMap((record) => record.equipment))
  return {
    techniques: LAB_TECHNIQUES.length,
    categories: new Set(LAB_TECHNIQUES.map((record) => record.category)).size,
    safetyRecords: LAB_TECHNIQUES.filter((record) => record.category === "Safety" || record.safetyNotes.length > 0).length,
    equipmentItems: equipment.size,
    procedures: LAB_TECHNIQUES.reduce((sum, record) => sum + record.procedure.length, 0),
  }
}

export function labExplorerHref(input: { technique?: string; category?: string } = {}): string {
  const params = new URLSearchParams()
  if (input.technique) params.set("technique", input.technique)
  if (input.category) params.set("category", input.category)
  const suffix = params.toString() ? `?${params.toString()}` : ""
  return `/lab-explorer${suffix}#lab-explorer`
}

