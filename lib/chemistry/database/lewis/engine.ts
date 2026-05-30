import type { LewisStructure } from "./types"
import { ALL_LEWIS_STRUCTURES, LEWIS_TEMPLATES } from "./templates"

export function getLewisById(id: string): LewisStructure | undefined {
  return ALL_LEWIS_STRUCTURES.find((l) => l.id === id)
}

export function getLewisByFormula(formula: string): LewisStructure | undefined {
  const q = formula.replace(/\s/g, "").toLowerCase()
  return ALL_LEWIS_STRUCTURES.find(
    (l) =>
      l.formula.replace(/\s/g, "").toLowerCase() === q ||
      LEWIS_TEMPLATES.some(
        (t) =>
          t.formula.replace(/\s/g, "").toLowerCase() === q &&
          t.id === l.id,
      ),
  )
}

export function searchLewis(query: string): LewisStructure[] {
  const q = query.toLowerCase().trim()
  if (!q) return []
  return ALL_LEWIS_STRUCTURES.filter(
    (l) =>
      l.name.toLowerCase().includes(q) ||
      l.formula.toLowerCase().includes(q) ||
      LEWIS_TEMPLATES.find((t) => t.id === l.id)?.aliases.some((a) => a.toLowerCase().includes(q)),
  )
}

/** Register new template at runtime — extensibility hook */
export function registerLewisTemplate(template: (typeof LEWIS_TEMPLATES)[0]): void {
  LEWIS_TEMPLATES.push(template)
  ALL_LEWIS_STRUCTURES.push(template.build())
}

export function analyzeOctet(structure: LewisStructure): {
  satisfied: boolean
  notes: string[]
} {
  const notes: string[] = []
  let satisfied = true

  for (const atom of structure.atoms) {
    if (atom.incompleteOctet) {
      satisfied = false
      notes.push(`${atom.symbol}: incomplete octet`)
    }
    if (atom.expandedOctet) {
      notes.push(`${atom.symbol}: expanded octet (hypervalent)`)
    }
    if (atom.formalCharge !== 0) {
      notes.push(`${atom.symbol}: formal charge ${atom.formalCharge > 0 ? "+" : ""}${atom.formalCharge}`)
    }
  }

  if (structure.hasResonance) notes.push("Resonance structures recommended for lowest energy.")
  if (structure.isRadical) {
    satisfied = false
    notes.push("Odd electron count — radical species.")
  }

  return { satisfied, notes }
}
