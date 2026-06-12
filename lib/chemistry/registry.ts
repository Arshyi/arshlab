import { KNOWLEDGE_COMPOUNDS } from "./compounds"
import { KNOWLEDGE_FUNCTIONAL_GROUPS } from "./functional-groups"
import { COMMON_IONS } from "./ions"
import { REACTION_TEMPLATES_KNOWLEDGE } from "./reactions"
import type {
  ChemistryRecordKind,
  ChemistrySearchResult,
  Compound,
  FunctionalGroup,
  Ion,
  ReactionTemplate,
} from "./types"

export const CHEMISTRY_KNOWLEDGE_CORE_VERSION = "3.2.0"

export const CHEMISTRY_KNOWLEDGE_CORE_META = {
  version: CHEMISTRY_KNOWLEDGE_CORE_VERSION,
  counts: {
    compounds: KNOWLEDGE_COMPOUNDS.length,
    ions: COMMON_IONS.length,
    functionalGroups: KNOWLEDGE_FUNCTIONAL_GROUPS.length,
    reactionTemplates: REACTION_TEMPLATES_KNOWLEDGE.length,
  },
}

function normalizeText(value: string): string {
  return value.toLowerCase().trim().replace(/\s+/g, " ")
}

function normalizeCompact(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "").replace(/\^/g, "")
}

function matchesValue(value: string | undefined, query: string): boolean {
  if (!value) return false
  const q = normalizeText(query)
  const compactQ = normalizeCompact(query)
  return normalizeText(value).includes(q) || normalizeCompact(value).includes(compactQ)
}

function firstMatchingField(fields: Array<[string, string | undefined]>, query: string): string | null {
  return fields.find(([, value]) => matchesValue(value, query))?.[0] ?? null
}

function resultSearchValues(result: ChemistrySearchResult): string[] {
  if (result.kind === "compound") {
    const compound = result.record as Compound
    return [
      compound.name,
      compound.formula,
      compound.category,
      compound.functionalGroups.join(" "),
      ...(compound.aliases ?? []),
      compound.description ?? "",
    ]
  }
  if (result.kind === "ion") {
    const ion = result.record as Ion
    return [ion.name, ion.formula, ion.charge, ion.category, ...(ion.aliases ?? [])]
  }
  if (result.kind === "functional-group") {
    const group = result.record as FunctionalGroup
    return [group.name, group.identifier, group.description, ...group.examples]
  }
  const template = result.record as ReactionTemplate
  return [
    template.type,
    template.generalForm,
    template.description,
    ...template.reactants,
    ...template.products,
    ...(template.examples ?? []),
  ]
}

function primarySearchValues(result: ChemistrySearchResult): string[] {
  if (result.kind === "compound") {
    const compound = result.record as Compound
    return [compound.name, compound.formula]
  }
  if (result.kind === "ion") {
    const ion = result.record as Ion
    return [ion.name, ion.formula]
  }
  if (result.kind === "functional-group") {
    const group = result.record as FunctionalGroup
    return [group.name, group.identifier]
  }
  const template = result.record as ReactionTemplate
  return [template.type]
}

function scoreSearchResult(result: ChemistrySearchResult, query: string): number {
  const q = normalizeText(query)
  const compactQ = normalizeCompact(query)
  const values = resultSearchValues(result)
  const primaryValues = primarySearchValues(result)

  if (primaryValues.some((value) => normalizeCompact(value) === compactQ)) return 0
  if (values.some((value) => normalizeCompact(value) === compactQ)) return 1
  if (primaryValues.some((value) => normalizeText(value).startsWith(q) || normalizeCompact(value).startsWith(compactQ))) return 2
  if (values.some((value) => normalizeText(value).startsWith(q) || normalizeCompact(value).startsWith(compactQ))) return 3
  if (result.matchField === "name" || result.matchField === "type") return 4
  if (result.matchField === "formula" || result.matchField === "identifier") return 5
  return 6
}

export function getCompoundByName(name: string): Compound | undefined {
  const q = normalizeCompact(name)
  return KNOWLEDGE_COMPOUNDS.find(
    (compound) =>
      normalizeCompact(compound.name) === q ||
      compound.aliases?.some((alias) => normalizeCompact(alias) === q),
  )
}

export function getCompoundByFormula(formula: string): Compound | undefined {
  const q = normalizeCompact(formula)
  return KNOWLEDGE_COMPOUNDS.find(
    (compound) =>
      normalizeCompact(compound.formula) === q ||
      compound.aliases?.some((alias) => normalizeCompact(alias) === q),
  )
}

export function getIon(query: string): Ion | undefined {
  const q = normalizeCompact(query)
  return COMMON_IONS.find(
    (ion) =>
      normalizeCompact(ion.name) === q ||
      normalizeCompact(ion.formula) === q ||
      ion.aliases?.some((alias) => normalizeCompact(alias) === q),
  )
}

export function getFunctionalGroup(query: string): FunctionalGroup | undefined {
  const q = normalizeCompact(query)
  return KNOWLEDGE_FUNCTIONAL_GROUPS.find(
    (group) =>
      normalizeCompact(group.id) === q ||
      normalizeCompact(group.name) === q ||
      normalizeCompact(group.identifier) === q,
  )
}

export function getReactionTemplate(query: string): ReactionTemplate | undefined {
  const q = normalizeCompact(query)
  return REACTION_TEMPLATES_KNOWLEDGE.find(
    (template) => normalizeCompact(template.id) === q || normalizeCompact(template.type) === q,
  )
}

function compoundResult(compound: Compound, query: string): ChemistrySearchResult | null {
  const matchField = firstMatchingField(
    [
      ["name", compound.name],
      ["formula", compound.formula],
      ["category", compound.category],
      ["functional group", compound.functionalGroups.join(" ")],
      ["alias", compound.aliases?.join(" ")],
      ["description", compound.description],
    ],
    query,
  )
  if (!matchField) return null
  return {
    kind: "compound",
    id: compound.id,
    name: compound.name,
    matchField,
    description: `${compound.formula} | ${compound.category}`,
    record: compound,
  }
}

function ionResult(ion: Ion, query: string): ChemistrySearchResult | null {
  const matchField = firstMatchingField(
    [
      ["name", ion.name],
      ["formula", ion.formula],
      ["charge", ion.charge],
      ["category", ion.category],
      ["alias", ion.aliases?.join(" ")],
    ],
    query,
  )
  if (!matchField) return null
  return {
    kind: "ion",
    id: ion.id,
    name: ion.name,
    matchField,
    description: `${ion.formula} | charge ${ion.charge}`,
    record: ion,
  }
}

function functionalGroupResult(group: FunctionalGroup, query: string): ChemistrySearchResult | null {
  const matchField = firstMatchingField(
    [
      ["name", group.name],
      ["identifier", group.identifier],
      ["description", group.description],
      ["example", group.examples.join(" ")],
    ],
    query,
  )
  if (!matchField) return null
  return {
    kind: "functional-group",
    id: group.id,
    name: group.name,
    matchField,
    description: group.identifier,
    record: group,
  }
}

function reactionTemplateResult(template: ReactionTemplate, query: string): ChemistrySearchResult | null {
  const matchField = firstMatchingField(
    [
      ["type", template.type],
      ["general form", template.generalForm],
      ["reactant", template.reactants.join(" ")],
      ["product", template.products.join(" ")],
      ["description", template.description],
      ["example", template.examples?.join(" ")],
    ],
    query,
  )
  if (!matchField) return null
  return {
    kind: "reaction-template",
    id: template.id,
    name: template.type,
    matchField,
    description: template.generalForm,
    record: template,
  }
}

export function searchChemistry(
  query: string,
  options: { limit?: number; kinds?: ChemistryRecordKind[] } = {},
): ChemistrySearchResult[] {
  const trimmed = query.trim()
  if (!trimmed) return []

  const allowed = new Set(options.kinds ?? ["compound", "ion", "functional-group", "reaction-template"])
  const results: ChemistrySearchResult[] = [
    ...(allowed.has("compound") ? KNOWLEDGE_COMPOUNDS.map((compound) => compoundResult(compound, trimmed)) : []),
    ...(allowed.has("ion") ? COMMON_IONS.map((ion) => ionResult(ion, trimmed)) : []),
    ...(allowed.has("functional-group")
      ? KNOWLEDGE_FUNCTIONAL_GROUPS.map((group) => functionalGroupResult(group, trimmed))
      : []),
    ...(allowed.has("reaction-template")
      ? REACTION_TEMPLATES_KNOWLEDGE.map((template) => reactionTemplateResult(template, trimmed))
      : []),
  ].filter((result): result is ChemistrySearchResult => Boolean(result))

  return results
    .sort((a, b) => scoreSearchResult(a, trimmed) - scoreSearchResult(b, trimmed) || a.name.localeCompare(b.name))
    .slice(0, options.limit ?? 25)
}

export function getChemistryPromptContext(query: string, limit = 6): string {
  const results = searchChemistry(query, { limit })
  if (!results.length) return ""
  return results
    .map((result) => {
      if (result.kind === "compound") {
        const compound = result.record as Compound
        return `Compound: ${compound.name} (${compound.formula}), molar mass ${compound.molarMass} g/mol, category ${compound.category}.`
      }
      if (result.kind === "ion") {
        const ion = result.record as Ion
        return `Ion: ${ion.name} (${ion.formula}), charge ${ion.charge}.`
      }
      if (result.kind === "functional-group") {
        const group = result.record as FunctionalGroup
        return `Functional group: ${group.name} (${group.identifier}). ${group.description}`
      }
      const template = result.record as ReactionTemplate
      return `Reaction template: ${template.type}. ${template.generalForm}. ${template.description}`
    })
    .join("\n")
}

export {
  COMMON_IONS,
  KNOWLEDGE_COMPOUNDS,
  KNOWLEDGE_FUNCTIONAL_GROUPS,
  REACTION_TEMPLATES_KNOWLEDGE,
}
