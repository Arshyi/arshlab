import type { EntityKind, SearchableRecord } from "../types"
import { ALL_COMPOUNDS } from "../compounds"
import { ALL_ELEMENTS } from "../periodic-table"
import { ALL_IONS } from "../ions"
import { ALL_FUNCTIONAL_GROUPS } from "../functional-groups"
import { ALL_ORBITALS } from "../orbitals"
import { ALL_SPECTROSCOPY } from "../spectroscopy"
import { REACTION_TEMPLATES } from "../reactions/families"
import { VSEPR_PRESETS } from "../vsepr/engine"
import { ALL_LEWIS_STRUCTURES } from "../lewis/templates"

export interface SearchOptions {
  kinds?: EntityKind[]
  examBoard?: string
  limit?: number
}

export interface SearchHit {
  record: SearchableRecord
  score: number
  matchField: string
}

function normalize(q: string): string {
  return q.toLowerCase().trim().replace(/\s+/g, "")
}

function scoreRecord(record: SearchableRecord, query: string): SearchHit | null {
  const q = query.toLowerCase().trim()
  const qn = normalize(query)

  if (record.name.toLowerCase() === q) return { record, score: 100, matchField: "name" }
  if (record.aliases.some((a) => a.toLowerCase() === q)) return { record, score: 95, matchField: "alias" }
  if (record.formula && normalize(record.formula) === qn)
    return { record, score: 90, matchField: "formula" }

  if (record.name.toLowerCase().startsWith(q)) return { record, score: 80, matchField: "name" }
  if (record.aliases.some((a) => a.toLowerCase().startsWith(q)))
    return { record, score: 75, matchField: "alias" }

  if (record.name.toLowerCase().includes(q)) return { record, score: 60, matchField: "name" }
  if (record.aliases.some((a) => a.toLowerCase().includes(q)))
    return { record, score: 55, matchField: "alias" }
  if (record.tags.some((t) => t.toLowerCase().includes(q)))
    return { record, score: 50, matchField: "tag" }
  if (record.topics.some((t) => t.toLowerCase().includes(q)))
    return { record, score: 45, matchField: "topic" }

  return null
}

function getAllSearchable(): SearchableRecord[] {
  return [
    ...ALL_COMPOUNDS,
    ...ALL_ELEMENTS,
    ...ALL_IONS,
    ...ALL_FUNCTIONAL_GROUPS,
    ...ALL_ORBITALS,
    ...ALL_SPECTROSCOPY,
    ...REACTION_TEMPLATES,
  ]
}

export function searchChemistry(query: string, options: SearchOptions = {}): SearchHit[] {
  if (!query.trim()) return []

  const kinds = options.kinds
  const limit = options.limit ?? 30
  const pool = getAllSearchable().filter((r) => !kinds || kinds.includes(r.kind))

  const hits: SearchHit[] = []
  for (const record of pool) {
    const hit = scoreRecord(record, query)
    if (hit) {
      if (options.examBoard && !hit.record.examBoards.includes(options.examBoard as never)) continue
      hits.push(hit)
    }
  }

  return hits.sort((a, b) => b.score - a.score).slice(0, limit)
}

export function searchByFunctionalGroup(fgId: string): SearchableRecord[] {
  return ALL_COMPOUNDS.filter(
    (c) =>
      c.functionalGroup.toLowerCase().includes(fgId.replace("fg-", "")) ||
      c.tags.includes(fgId.replace("fg-", "")),
  )
}

export function searchByVSEPRShape(shapeQuery: string): typeof VSEPR_PRESETS {
  const q = shapeQuery.toLowerCase()
  return VSEPR_PRESETS.filter(
    (v) =>
      v.molecularGeometry.toLowerCase().includes(q) ||
      v.shapeId.includes(q) ||
      v.electronGeometry.toLowerCase().includes(q),
  )
}

export function searchByResonance(): SearchableRecord[] {
  return ALL_LEWIS_STRUCTURES.filter((l) => l.hasResonance) as unknown as SearchableRecord[]
}

export function searchByHypervalency(): SearchableRecord[] {
  return [
    ...ALL_COMPOUNDS.filter((c) => c.tags.includes("hypervalent")),
    ...(ALL_LEWIS_STRUCTURES.filter((l) => l.isHypervalent) as unknown as SearchableRecord[]),
  ]
}

export function searchByElement(symbol: string): SearchableRecord[] {
  const el = ALL_ELEMENTS.find((e) => e.symbol.toLowerCase() === symbol.toLowerCase())
  if (!el) return []
  return [
    el,
    ...ALL_COMPOUNDS.filter(
      (c) =>
        c.formula?.toLowerCase().includes(symbol.toLowerCase()) ||
        c.name.toLowerCase().includes(symbol.toLowerCase()),
    ),
  ]
}
