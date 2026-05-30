import type { CompoundRecord } from "../types"
import { generateAllOrganic } from "./generators/organic"
import { INORGANIC_COMPOUND_SEEDS } from "./seeds/inorganic"
import { BIOMOLECULE_SEEDS } from "./seeds/biomolecules"
import { SPECIALTY_ORGANIC_SEEDS } from "./seeds/specialty-organic"

/** Merge with deduplication by id — generators may overlap specialty names */
function dedupeById(compounds: CompoundRecord[]): CompoundRecord[] {
  const map = new Map<string, CompoundRecord>()
  for (const c of compounds) {
    if (!map.has(c.id)) map.set(c.id, c)
    else {
      // Prefer seed (richer metadata) over generator
      const existing = map.get(c.id)!
      if (c.aliases.length > existing.aliases.length) map.set(c.id, c)
    }
  }
  return Array.from(map.values())
}

const generated = generateAllOrganic()

export const ALL_COMPOUNDS: CompoundRecord[] = dedupeById([
  ...generated,
  ...SPECIALTY_ORGANIC_SEEDS,
  ...INORGANIC_COMPOUND_SEEDS,
  ...BIOMOLECULE_SEEDS,
])

export function getCompoundById(id: string): CompoundRecord | undefined {
  return ALL_COMPOUNDS.find((c) => c.id === id)
}

export function getCompoundByName(name: string): CompoundRecord | undefined {
  const q = name.toLowerCase().trim()
  return ALL_COMPOUNDS.find(
    (c) =>
      c.name.toLowerCase() === q ||
      c.aliases.some((a) => a.toLowerCase() === q) ||
      c.formula?.toLowerCase().replace(/\s/g, "") === q.replace(/\s/g, ""),
  )
}

export function getCompoundsByFamily(family: string): CompoundRecord[] {
  return ALL_COMPOUNDS.filter((c) => c.family.toLowerCase() === family.toLowerCase())
}

export function getCompoundsByFunctionalGroup(fg: string): CompoundRecord[] {
  return ALL_COMPOUNDS.filter((c) => c.functionalGroup.toLowerCase().includes(fg.toLowerCase()))
}

export { generateAllOrganic }
