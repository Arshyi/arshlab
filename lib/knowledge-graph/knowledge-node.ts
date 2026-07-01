export type ChemistryKnowledgeNodeType =
  | "compound"
  | "reaction"
  | "functionalGroup"
  | "mechanism"
  | "spectroscopy"
  | "irPeak"
  | "nmrPeak"
  | "massFragment"
  | "hybridization"
  | "conjugation"
  | "aromaticity"
  | "orbital"
  | "moDiagram"
  | "homo"
  | "lumo"
  | "bond"
  | "labTechnique"
  | "examTopic"
  | "curriculumTopic"
  | "formula"
  | "property"
  | "practice"

export type ChemistryKnowledgeDifficulty = "Beginner" | "Intermediate" | "Advanced" | "Graduate"

export type ChemistryKnowledgeCurriculum =
  | "General Chemistry"
  | "Organic Chemistry I"
  | "Organic Chemistry II"
  | "Spectroscopy"
  | "Laboratory Skills"
  | "All"

export interface ChemistryKnowledgeAction {
  label: string
  href: string
}

export interface ChemistryKnowledgeNode {
  id: string
  type: ChemistryKnowledgeNodeType
  label: string
  subtitle?: string
  description: string
  curriculum: ChemistryKnowledgeCurriculum[]
  difficulty: ChemistryKnowledgeDifficulty
  tags: string[]
  completed?: boolean
  actions: ChemistryKnowledgeAction[]
  searchText: string
}

export function createKnowledgeNode(input: Omit<ChemistryKnowledgeNode, "searchText">): ChemistryKnowledgeNode {
  return {
    ...input,
    searchText: [
      input.id,
      input.type,
      input.label,
      input.subtitle ?? "",
      input.description,
      input.difficulty,
      ...input.curriculum,
      ...input.tags,
      ...input.actions.map((action) => action.label),
    ]
      .join(" ")
      .toLowerCase(),
  }
}
