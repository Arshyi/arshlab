import type { EducationHubSection, ExamBoard } from "../types"

export const EDUCATION_HUB_SECTIONS: EducationHubSection[] = [
  {
    id: "edu-lessons",
    title: "Lessons",
    description: "Structured topic lessons for HS, IB, AP, A-Level, and first-year university.",
    contentType: "lesson",
    examBoards: ["high-school", "ib-sl", "ib-hl", "ap", "a-level", "university-intro"],
    topics: ["all"],
    itemCount: 0,
    status: "planned",
  },
  {
    id: "edu-worked-examples",
    title: "Worked Examples",
    description: "Step-by-step solutions with reasoning for calculations and mechanisms.",
    contentType: "worked-example",
    examBoards: ["ib-sl", "ib-hl", "ap", "a-level"],
    topics: ["stoichiometry", "equilibrium", "organic"],
    itemCount: 0,
    status: "planned",
  },
  {
    id: "edu-proofs",
    title: "Proofs & Derivations",
    description: "Mathematical derivations for thermodynamics, kinetics, and electrochemistry.",
    contentType: "proof",
    examBoards: ["ib-hl", "ap", "university-intro"],
    topics: ["thermodynamics", "kinetics"],
    itemCount: 0,
    status: "planned",
  },
  {
    id: "edu-practice",
    title: "Practice Problems",
    description: "Graded problem sets with instant feedback (AI generation coming soon).",
    contentType: "practice-problem",
    examBoards: ["ib-sl", "ib-hl", "ap", "a-level", "high-school"],
    topics: ["all"],
    itemCount: 0,
    status: "planned",
  },
  {
    id: "edu-past-papers",
    title: "Past Paper Walkthroughs",
    description: "IB, AP, and A-Level past paper question breakdowns.",
    contentType: "past-paper",
    examBoards: ["ib-hl", "ap", "a-level"],
    topics: ["exam-prep"],
    itemCount: 0,
    status: "planned",
  },
  {
    id: "edu-videos",
    title: "Video Library",
    description: "Curated and original video explanations linked to database topics.",
    contentType: "video",
    examBoards: ["high-school", "ib-sl", "ib-hl", "ap", "a-level"],
    topics: ["all"],
    itemCount: 0,
    status: "planned",
  },
  {
    id: "edu-creator",
    title: "Creator Content",
    description: "Community and educator-uploaded materials (future).",
    contentType: "creator",
    examBoards: ["high-school", "ib-sl", "ib-hl", "ap", "a-level"],
    topics: ["all"],
    itemCount: 0,
    status: "planned",
  },
]

export function getSectionsByBoard(board: ExamBoard): EducationHubSection[] {
  return EDUCATION_HUB_SECTIONS.filter((s) => s.examBoards.includes(board))
}

export function getSectionById(id: string): EducationHubSection | undefined {
  return EDUCATION_HUB_SECTIONS.find((s) => s.id === id)
}
