/**
 * Question generation hierarchy — metadata only, no AI generation yet.
 *
 * Subject → Topic → Subtopic → Concept → Question Templates → Generated Variants
 */

export type QuestionSubject = "Chemistry" | "Mathematics" | "Physics" | "Engineering"

export interface QuestionTemplate {
  id: string
  name: string
  description: string
  variantCount: number
  status: "planned" | "ready"
}

export interface QuestionConcept {
  id: string
  name: string
  description: string
  templates: QuestionTemplate[]
}

export interface QuestionSubtopic {
  id: string
  name: string
  concepts: QuestionConcept[]
}

export interface QuestionTopic {
  id: string
  name: string
  subtopics: QuestionSubtopic[]
}

export interface QuestionSubjectHierarchy {
  subject: QuestionSubject
  topics: QuestionTopic[]
}

/** Example hierarchy — Chemistry → Organic Chemistry → Alcohols → Oxidation */
export const QUESTION_HIERARCHY: QuestionSubjectHierarchy[] = [
  {
    subject: "Chemistry",
    topics: [
      {
        id: "chem-organic",
        name: "Organic Chemistry",
        subtopics: [
          {
            id: "chem-organic-alcohols",
            name: "Alcohols",
            concepts: [
              {
                id: "chem-organic-alcohols-oxidation",
                name: "Oxidation",
                description: "Primary and secondary alcohol oxidation to aldehydes, ketones, and carboxylic acids.",
                templates: [
                  {
                    id: "tpl-alcohol-oxidation-product",
                    name: "Predict oxidation product",
                    description: "Given an alcohol structure, predict the major oxidation product under specified conditions.",
                    variantCount: 0,
                    status: "planned",
                  },
                  {
                    id: "tpl-alcohol-oxidation-reagent",
                    name: "Select oxidizing agent",
                    description: "Choose the appropriate reagent for a desired oxidation transformation.",
                    variantCount: 0,
                    status: "planned",
                  },
                ],
              },
              {
                id: "chem-organic-alcohols-nomenclature",
                name: "Nomenclature",
                description: "IUPAC naming of alcohols and related functional groups.",
                templates: [
                  {
                    id: "tpl-alcohol-name-structure",
                    name: "Name to structure",
                    description: "Convert IUPAC alcohol names to structural formulas.",
                    variantCount: 0,
                    status: "planned",
                  },
                ],
              },
            ],
          },
          {
            id: "chem-organic-mechanisms",
            name: "Reaction Mechanisms",
            concepts: [
              {
                id: "chem-organic-sn1-sn2",
                name: "SN1 and SN2",
                description: "Nucleophilic substitution mechanisms and conditions.",
                templates: [
                  {
                    id: "tpl-mechanism-identify",
                    name: "Identify mechanism type",
                    description: "Determine whether SN1 or SN2 is favoured given substrate and conditions.",
                    variantCount: 0,
                    status: "planned",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "chem-stoichiometry",
        name: "Stoichiometry",
        subtopics: [
          {
            id: "chem-stoichiometry-moles",
            name: "Mole Calculations",
            concepts: [
              {
                id: "chem-stoichiometry-limiting",
                name: "Limiting Reagents",
                description: "Determine limiting reagent and theoretical yield from balanced equations.",
                templates: [
                  {
                    id: "tpl-limiting-reagent",
                    name: "Find limiting reagent",
                    description: "Calculate which reactant limits product formation.",
                    variantCount: 0,
                    status: "planned",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "chem-spectroscopy",
        name: "Spectroscopy",
        subtopics: [
          {
            id: "chem-spectroscopy-ir",
            name: "Infrared Spectroscopy",
            concepts: [
              {
                id: "chem-spectroscopy-ir-peaks",
                name: "Peak Identification",
                description: "Identify functional groups from characteristic IR absorptions.",
                templates: [
                  {
                    id: "tpl-ir-functional-group",
                    name: "Functional group from IR",
                    description: "Given IR peak data, identify the most likely functional group.",
                    variantCount: 0,
                    status: "planned",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    subject: "Mathematics",
    topics: [
      {
        id: "math-calculus",
        name: "Calculus",
        subtopics: [
          {
            id: "math-calculus-differentiation",
            name: "Differentiation",
            concepts: [
              {
                id: "math-calculus-chain-rule",
                name: "Chain Rule",
                description: "Differentiate composite functions using the chain rule.",
                templates: [
                  {
                    id: "tpl-chain-rule-derivative",
                    name: "Find derivative",
                    description: "Compute the derivative of a composite function.",
                    variantCount: 0,
                    status: "planned",
                  },
                ],
              },
            ],
          },
          {
            id: "math-calculus-integration",
            name: "Integration",
            concepts: [
              {
                id: "math-calculus-substitution",
                name: "Integration by Substitution",
                description: "Evaluate integrals using u-substitution.",
                templates: [
                  {
                    id: "tpl-u-substitution",
                    name: "Evaluate integral",
                    description: "Integrate using an appropriate substitution.",
                    variantCount: 0,
                    status: "planned",
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: "math-linear-algebra",
        name: "Linear Algebra",
        subtopics: [
          {
            id: "math-la-matrices",
            name: "Matrices",
            concepts: [
              {
                id: "math-la-determinants",
                name: "Determinants",
                description: "Calculate determinants and interpret geometric meaning.",
                templates: [
                  {
                    id: "tpl-determinant-calc",
                    name: "Calculate determinant",
                    description: "Find the determinant of a given matrix.",
                    variantCount: 0,
                    status: "planned",
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
]

export function getHierarchyBySubject(
  subject: QuestionSubject
): QuestionSubjectHierarchy | undefined {
  return QUESTION_HIERARCHY.find((h) => h.subject === subject)
}

export function countTemplates(hierarchy: QuestionSubjectHierarchy): number {
  return hierarchy.topics.reduce(
    (acc, topic) =>
      acc +
      topic.subtopics.reduce(
        (subAcc, subtopic) =>
          subAcc +
          subtopic.concepts.reduce((conAcc, concept) => conAcc + concept.templates.length, 0),
        0
      ),
    0
  )
}
