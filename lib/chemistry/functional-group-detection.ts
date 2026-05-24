import type { Compound, SearchResult } from "./compounds"
import { compoundDatabase, searchCompoundDetailed } from "./compounds"
import { functionalGroups, type FunctionalGroup } from "./functional-groups"

export interface DetectedFunctionalGroup {
  id: string
  name: string
  color: string
}

const FAMILY_TO_GROUP: Record<string, string[]> = {
  Alkane: [],
  Alkene: [],
  Alkyne: [],
  Alcohol: ["hydroxyl"],
  "Alcohol (Secondary)": ["hydroxyl"],
  "Carboxylic Acid": ["carboxyl"],
  Amine: ["amino"],
  Ester: ["ester"],
  "Aromatic Hydrocarbon": ["phenyl"],
  Phenol: ["phenyl", "hydroxyl"],
  Halogenoalkane: ["halogeno"],
  Aldehyde: ["carbonyl"],
  Ketone: ["carbonyl"],
  Ether: ["alkoxy"],
  Amide: ["amido"],
}

function detectFromName(name: string): string[] {
  const n = name.toLowerCase()
  const ids: string[] = []
  if (/chloro|bromo|fluoro|iodo|halogeno/.test(n)) ids.push("halogeno")
  if (/ethanal|propanal|butanal|methanal|aldehyde/.test(n)) ids.push("carbonyl")
  if (/propanone|butanone|pentanone|ketone/.test(n)) ids.push("carbonyl")
  if (/amide|ethanamide/.test(n)) ids.push("amido")
  if (/methoxy|ethoxy|propoxy|ether/.test(n)) ids.push("alkoxy")
  if (/toluene|methylbenzene|benzene|phenol|aniline/.test(n)) ids.push("phenyl")
  if (/phenol/.test(n)) ids.push("hydroxyl")
  if (/amine|ammonia/.test(n) && !/amide/.test(n)) ids.push("amino")
  return ids
}

export function getCompoundClassification(compound: Compound): string | undefined {
  const name = compound.name.toLowerCase()
  const family = compound.family

  if (family === "Alcohol (Secondary)") return "Secondary alcohol"
  if (family === "Alcohol") return "Primary alcohol"
  if (family === "Amine") {
    if (name.includes("aniline")) return "Primary amine (aromatic)"
    return "Primary amine"
  }
  if (family === "Ketone" || name.includes("propanone") || name.includes("butanone")) return "Ketone"
  if (family === "Aldehyde" || name.includes("ethanal") || name.includes("propanal")) return "Aldehyde"
  if (family === "Halogenoalkane") return "Halogenoalkane"
  if (family === "Ether") return "Ether"
  if (family === "Amide") return "Primary amide"
  if (family === "Ester") return "Ester"
  if (family === "Carboxylic Acid") return "Carboxylic acid"
  if (family === "Phenol") return "Phenol (aromatic alcohol)"
  if (family === "Aromatic Hydrocarbon") return "Arene"
  return undefined
}

export function detectFunctionalGroups(compound: Compound): DetectedFunctionalGroup[] {
  const ids = new Set<string>()

  const familyIds = FAMILY_TO_GROUP[compound.family] ?? []
  familyIds.forEach((id) => ids.add(id))

  detectFromName(compound.name).forEach((id) => ids.add(id))

  const fg = compound.functionalGroup.toLowerCase()
  if (fg.includes("oh") || fg.includes("hydroxyl")) ids.add("hydroxyl")
  if (fg.includes("cooh") || fg.includes("carboxyl")) ids.add("carboxyl")
  if (fg.includes("nh2") || fg.includes("amine")) ids.add("amino")
  if (fg.includes("coo") && fg.includes("ester")) ids.add("ester")
  if (fg.includes("co") && fg.includes("ester")) ids.add("ester")
  if (fg.includes("benzene") || fg.includes("aromatic") || fg.includes("phenyl")) ids.add("phenyl")
  if (fg.includes("c=o") || fg.includes("carbonyl") || fg.includes("aldehyde")) ids.add("carbonyl")
  if (fg.includes("conh") || fg.includes("amide")) ids.add("amido")
  if (fg.includes("cl") || fg.includes("br") || fg.includes("halogen")) ids.add("halogeno")
  if (fg.includes("o—") && fg.includes("ether")) ids.add("alkoxy")

  return Array.from(ids)
    .map((id) => {
      const group = functionalGroups.find((g) => g.id === id)
      if (!group) return null
      return {
        id: group.id,
        name: group.name,
        color: group.color,
      }
    })
    .filter(Boolean) as DetectedFunctionalGroup[]
}

export function getStudyNotes(compound: Compound): string {
  const groups = detectFunctionalGroups(compound)
  const classification = getCompoundClassification(compound)
  const parts: string[] = []

  if (classification) {
    parts.push(`This molecule is classified as a ${classification.toLowerCase()}.`)
  }

  if (groups.length > 0) {
    parts.push(
      `It contains ${groups.length} IB HL functional group${groups.length > 1 ? "s" : ""}: ${groups.map((g) => g.name).join(", ")}.`
    )
  }

  if (compound.hydrogenBonding) {
    parts.push("Hydrogen bonding increases boiling point and solubility in water.")
  } else if (compound.polarity === "Polar") {
    parts.push("Polarity affects intermolecular forces and solubility.")
  }

  if (compound.family.includes("Alcohol")) {
    parts.push("Alcohols can be oxidized and form esters with carboxylic acids.")
  }
  if (compound.family === "Amine") {
    parts.push("The nitrogen lone pair makes amines basic and nucleophilic.")
  }
  if (compound.family === "Carboxylic Acid") {
    parts.push("The carboxyl group donates H⁺ weakly in aqueous solution.")
  }

  return parts.join(" ")
}

/** Category search: "alcohol", "amine", "ketone", etc. */
const CATEGORY_MAP: Record<string, string> = {
  alcohol: "hydroxyl",
  hydroxyl: "hydroxyl",
  amine: "amino",
  amino: "amino",
  ester: "ester",
  ketone: "carbonyl",
  aldehyde: "carbonyl",
  carbonyl: "carbonyl",
  amide: "amido",
  amido: "amido",
  ether: "alkoxy",
  alkoxy: "alkoxy",
  phenol: "phenyl",
  arene: "phenyl",
  aromatic: "phenyl",
  benzene: "phenyl",
  phenyl: "phenyl",
  halogeno: "halogeno",
  halo: "halogeno",
  halogen: "halogeno",
  carboxylic: "carboxyl",
  carboxyl: "carboxyl",
  acid: "carboxyl",
}

export interface CategorySearchResult {
  categoryId: string
  categoryName: string
  compounds: Compound[]
  functionalGroup: FunctionalGroup
}

export function searchByFunctionalGroupCategory(query: string): CategorySearchResult | null {
  const q = query.toLowerCase().trim().replace(/\s+/g, "")
  const categoryId = CATEGORY_MAP[q]
  if (!categoryId) return null

  const group = functionalGroups.find((g) => g.id === categoryId)
  if (!group) return null

  const compounds = compoundDatabase.filter((c) => {
    const detected = detectFunctionalGroups(c)
    return detected.some((d) => d.id === categoryId)
  })

  if (compounds.length === 0) return null

  return {
    categoryId,
    categoryName: group.representativeClass,
    compounds,
    functionalGroup: group,
  }
}

export interface ExtendedSearchResult {
  type: "compound" | "category"
  compoundResult?: SearchResult
  category?: CategorySearchResult
}

export function searchExtended(query: string): ExtendedSearchResult | null {
  const compoundResult = searchCompoundDetailed(query)
  if (compoundResult) return { type: "compound", compoundResult }

  const category = searchByFunctionalGroupCategory(query)
  if (category) return { type: "category", category }

  return null
}

export function getCompoundsForFunctionalGroup(groupId: string): Compound[] {
  return compoundDatabase.filter((c) =>
    detectFunctionalGroups(c).some((d) => d.id === groupId)
  )
}
