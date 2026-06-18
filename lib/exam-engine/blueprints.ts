import type { ExamBlueprint, ExamBlueprintSection } from "./types"

function section(
  id: string,
  label: string,
  topic: string,
  count: number,
  unit?: string,
  subtopic?: string,
): ExamBlueprintSection {
  return { id, label, topic, count, unit, subtopic }
}

export const EXAM_BLUEPRINTS: ExamBlueprint[] = [
  {
    id: "general-first-year-20",
    name: "General First-Year Chemistry",
    curriculum: "General First-Year Chemistry",
    questionCount: 20,
    difficulty: "Intermediate",
    description: "Balanced first-year coverage with deterministic database questions.",
    sections: [
      section("atomic-structure", "Atomic Structure", "Electron Configuration", 3, "atomic-structure"),
      section("periodicity", "Periodicity", "Periodic Trends", 3, "periodicity"),
      section("bonding", "Bonding", "Hybridization", 3, "bonding"),
      section("reactions", "Chemical Reactions", "Reaction Classification", 2, "chemical-reactions"),
      section("reaction-conditions", "Reaction Conditions", "Reaction Conditions", 1, "chemical-reactions", "Reagent Selection"),
      section("stoichiometry", "Stoichiometry", "Stoichiometry", 3, "stoichiometry"),
      section("thermodynamics", "Thermodynamics", "Thermodynamics", 2, "energetics"),
      section("kinetics", "Kinetics", "Kinetics", 2, "kinetics"),
      section("equilibrium", "Equilibrium", "Equilibrium", 2, "equilibrium"),
      section("acids-bases", "Acids/Bases", "Acids and Bases", 2, "acids-bases"),
      section("spectroscopy", "Spectroscopy", "Spectroscopy", 1, "organic-chemistry", "IR Spectroscopy"),
      section("organic-mechanisms", "Organic Mechanisms", "Organic Mechanisms", 1, "organic-chemistry"),
    ],
  },
  {
    id: "chem-121-25",
    name: "CHEM 121 Style",
    curriculum: "CHEM 121",
    questionCount: 25,
    difficulty: "Intermediate",
    description: "Weighted toward stoichiometry, thermodynamics, periodic trends, and bonding.",
    sections: [
      section("stoichiometry", "Stoichiometry", "Stoichiometry", 7, "stoichiometry"),
      section("reactions", "Chemical Reactions", "Reaction Prediction", 4, "chemical-reactions"),
      section("reaction-conditions", "Reaction Conditions", "Reaction Conditions", 2, "chemical-reactions", "Reagent Selection"),
      section("thermodynamics", "Thermodynamics", "Thermodynamics", 6, "energetics"),
      section("periodic-trends", "Periodic Trends", "Periodic Trends", 6, "periodicity"),
      section("bonding", "Bonding", "Hybridization", 6, "bonding"),
      section("spectroscopy", "Spectroscopy", "Spectroscopy", 2, "measurement-data", "IR Spectroscopy"),
      section("organic-mechanisms", "Organic Mechanisms", "Organic Mechanisms", 2, "organic-chemistry"),
    ],
  },
  {
    id: "ib-chemistry-30",
    name: "IB Chemistry Style",
    curriculum: "IB Chemistry Style",
    questionCount: 30,
    difficulty: "Advanced",
    description: "Broad conceptual coverage for IB-style practice.",
    sections: [
      section("stoichiometry", "Stoichiometry", "Stoichiometry", 4, "stoichiometry"),
      section("reactions", "Chemical Reactions", "Reaction Types", 4, "chemical-reactions"),
      section("reaction-conditions", "Reaction Conditions", "Reaction Conditions", 2, "chemical-reactions", "Reagent Selection"),
      section("atomic-structure", "Atomic Structure", "Electron Configuration", 4, "atomic-structure"),
      section("periodicity", "Periodicity", "Periodic Trends", 4, "periodicity"),
      section("bonding", "Bonding", "Hybridization", 4, "bonding"),
      section("energetics", "Energetics", "Thermodynamics", 4, "energetics"),
      section("kinetics", "Kinetics", "Kinetics", 3, "kinetics"),
      section("equilibrium", "Equilibrium", "Equilibrium", 3, "equilibrium"),
      section("acids-bases", "Acids/Bases", "Acids and Bases", 2, "acids-bases"),
      section("organic", "Organic Chemistry", "Functional Group Identification", 2, "organic"),
      section("spectroscopy", "Spectroscopy", "Spectroscopy", 2, "organic", "IR Spectroscopy"),
      section("organic-mechanisms", "Organic Mechanisms", "Organic Mechanisms", 2, "organic"),
    ],
  },
  {
    id: "ap-chemistry-30",
    name: "AP Chemistry Style",
    curriculum: "AP Chemistry Style",
    questionCount: 30,
    difficulty: "Advanced",
    description: "Higher emphasis on equilibrium, thermodynamics, kinetics, and acid/base work.",
    sections: [
      section("equilibrium", "Equilibrium", "Equilibrium", 6, "equilibrium"),
      section("thermodynamics", "Thermodynamics", "Thermodynamics", 6, "energetics"),
      section("kinetics", "Kinetics", "Kinetics", 5, "kinetics"),
      section("acids-bases", "Acid/Base", "Acids and Bases", 5, "acids-bases"),
      section("reactions", "Chemical Reactions", "Reaction Balancing", 3, "chemical-reactions"),
      section("reaction-conditions", "Reaction Conditions", "Reaction Conditions", 2, "chemical-reactions", "Reagent Selection"),
      section("periodicity", "Periodic Trends", "Periodic Trends", 3, "periodicity"),
      section("bonding", "Bonding", "Hybridization", 3, "bonding"),
      section("stoichiometry", "Stoichiometry", "Stoichiometry", 2, "stoichiometry"),
      section("spectroscopy", "Spectroscopy", "Spectroscopy", 1, "measurement-data", "IR Spectroscopy"),
      section("organic-mechanisms", "Organic Mechanisms", "Organic Mechanisms", 1, "organic-chemistry"),
    ],
  },
  {
    id: "a-level-chemistry-25",
    name: "A-Level Chemistry Style",
    curriculum: "A-Level Chemistry Style",
    questionCount: 25,
    difficulty: "Intermediate",
    description: "Balanced theoretical coverage for A-Level style review.",
    sections: [
      section("atomic-structure", "Atomic Structure", "Electron Configuration", 4, "atomic-structure"),
      section("periodicity", "Periodicity", "Periodic Trends", 4, "periodicity"),
      section("bonding", "Bonding", "Hybridization", 4, "bonding"),
      section("reactions", "Chemical Reactions", "Reaction Classification", 4, "chemical-reactions"),
      section("reaction-conditions", "Reaction Conditions", "Reaction Conditions", 2, "chemical-reactions", "Reagent Selection"),
      section("energetics", "Energetics", "Thermodynamics", 4, "energetics"),
      section("organic", "Organic Chemistry", "Functional Group Identification", 4, "organic"),
      section("organic-mechanisms", "Organic Mechanisms", "Organic Mechanisms", 3, "organic"),
      section("equilibrium", "Equilibria", "Equilibrium", 3, "equilibrium"),
      section("acids-bases", "Acids/Bases", "Acids and Bases", 2, "acids-bases"),
      section("spectroscopy", "Spectroscopy", "Spectroscopy", 2, "organic", "IR Spectroscopy"),
    ],
  },
]

export function listExamBlueprints(): ExamBlueprint[] {
  return EXAM_BLUEPRINTS
}

export function getExamBlueprint(id: string | undefined): ExamBlueprint | undefined {
  if (!id) return undefined
  return EXAM_BLUEPRINTS.find((blueprint) => blueprint.id === id)
}

export function getBlueprintForCurriculum(curriculum: string, count?: number): ExamBlueprint {
  const normalized = curriculum.toLowerCase()
  const candidates = EXAM_BLUEPRINTS.filter(
    (blueprint) =>
      blueprint.curriculum.toLowerCase() === normalized ||
      blueprint.name.toLowerCase() === normalized ||
      normalized.includes(blueprint.curriculum.toLowerCase()) ||
      blueprint.curriculum.toLowerCase().includes(normalized),
  )

  if (candidates.length) {
    return (
      candidates.sort((a, b) =>
        typeof count === "number"
          ? Math.abs(a.questionCount - count) - Math.abs(b.questionCount - count)
          : a.questionCount - b.questionCount,
      )[0] ?? EXAM_BLUEPRINTS[0]
    )
  }

  return EXAM_BLUEPRINTS[0]
}
