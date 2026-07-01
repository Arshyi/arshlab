export type ChemistryKnowledgeEdgeType =
  | "contains"
  | "participatesIn"
  | "requires"
  | "produces"
  | "explains"
  | "measuredBy"
  | "detectedBy"
  | "reactsWith"
  | "similarTo"
  | "precursorOf"
  | "exampleOf"
  | "usesMechanism"
  | "usedIn"
  | "prerequisiteFor"
  | "visualizedBy"
  | "practicedIn"

export interface ChemistryKnowledgeEdge {
  id: string
  from: string
  to: string
  type: ChemistryKnowledgeEdgeType
  label: string
  weight: number
}

export function createKnowledgeEdge(
  from: string,
  to: string,
  type: ChemistryKnowledgeEdgeType,
  label: string,
  weight = 1,
): ChemistryKnowledgeEdge {
  return {
    id: `${from}->${to}:${type}`,
    from,
    to,
    type,
    label,
    weight,
  }
}
