export type PaperSubject =
  | "Chemistry"
  | "Mathematics"
  | "Physics"
  | "Biology"
  | "Engineering"

export type PaperDifficulty = "Introductory" | "Intermediate" | "Advanced"

export type EducationalLevel = "High School" | "First Year University"

export interface PastPaper {
  id: string
  title: string
  subject: PaperSubject
  difficulty: PaperDifficulty
  educationalLevel: EducationalLevel
  topics: string[]
  date: string
  pdfAvailable: boolean
  videoSolutionAvailable: boolean
  relatedVideoId?: string
}

export const PAST_PAPER_SUBJECTS: PaperSubject[] = [
  "Chemistry",
  "Mathematics",
  "Physics",
  "Biology",
  "Engineering",
]

export const PAST_PAPER_DIFFICULTIES: PaperDifficulty[] = [
  "Introductory",
  "Intermediate",
  "Advanced",
]

export const PAST_PAPER_LEVELS: EducationalLevel[] = [
  "High School",
  "First Year University",
]

/** Metadata only — PDF uploads coming soon */
export const PAST_PAPERS: PastPaper[] = [
  // Chemistry
  {
    id: "chem-structure-bonding",
    title: "Structure and Bonding Practice Set",
    subject: "Chemistry",
    difficulty: "Intermediate",
    educationalLevel: "High School",
    topics: ["Atomic Structure", "Bonding", "VSEPR", "Hybridization"],
    date: "2026-05",
    pdfAvailable: false,
    videoSolutionAvailable: false,
  },
  {
    id: "chem-organic",
    title: "Organic Chemistry Practice Set",
    subject: "Chemistry",
    difficulty: "Intermediate",
    educationalLevel: "First Year University",
    topics: ["Functional Groups", "Nomenclature", "Reaction Mechanisms"],
    date: "2026-05",
    pdfAvailable: false,
    videoSolutionAvailable: false,
  },
  {
    id: "chem-spectroscopy",
    title: "Spectroscopy Practice Set",
    subject: "Chemistry",
    difficulty: "Advanced",
    educationalLevel: "First Year University",
    topics: ["IR Spectroscopy", "NMR", "Mass Spectrometry"],
    date: "2026-05",
    pdfAvailable: false,
    videoSolutionAvailable: false,
  },
  {
    id: "chem-stoichiometry",
    title: "Stoichiometry Practice Set",
    subject: "Chemistry",
    difficulty: "Introductory",
    educationalLevel: "High School",
    topics: ["Mole Calculations", "Limiting Reagents", "Percent Yield"],
    date: "2026-05",
    pdfAvailable: false,
    videoSolutionAvailable: false,
  },
  {
    id: "chem-equilibrium",
    title: "Equilibrium Practice Set",
    subject: "Chemistry",
    difficulty: "Advanced",
    educationalLevel: "First Year University",
    topics: ["Le Chatelier", "Kc and Kp", "ICE Tables"],
    date: "2026-05",
    pdfAvailable: false,
    videoSolutionAvailable: false,
  },
  // Mathematics
  {
    id: "math-calculus",
    title: "Calculus Practice Set",
    subject: "Mathematics",
    difficulty: "Intermediate",
    educationalLevel: "First Year University",
    topics: ["Limits", "Differentiation", "Integration"],
    date: "2026-05",
    pdfAvailable: false,
    videoSolutionAvailable: false,
  },
  {
    id: "math-integration-techniques",
    title: "Integration Techniques Practice Set",
    subject: "Mathematics",
    difficulty: "Advanced",
    educationalLevel: "First Year University",
    topics: ["Substitution", "Integration by Parts", "Partial Fractions"],
    date: "2026-05",
    pdfAvailable: false,
    videoSolutionAvailable: false,
  },
  {
    id: "math-differential-equations",
    title: "Differential Equations Practice Set",
    subject: "Mathematics",
    difficulty: "Advanced",
    educationalLevel: "First Year University",
    topics: ["Separable DEs", "First Order Linear", "Applications"],
    date: "2026-05",
    pdfAvailable: false,
    videoSolutionAvailable: false,
  },
  {
    id: "math-linear-algebra",
    title: "Linear Algebra Practice Set",
    subject: "Mathematics",
    difficulty: "Intermediate",
    educationalLevel: "First Year University",
    topics: ["Matrices", "Vectors", "Linear Systems"],
    date: "2026-05",
    pdfAvailable: false,
    videoSolutionAvailable: false,
  },
  {
    id: "math-probability-statistics",
    title: "Probability and Statistics Practice Set",
    subject: "Mathematics",
    difficulty: "Intermediate",
    educationalLevel: "First Year University",
    topics: ["Probability", "Distributions", "Hypothesis Testing"],
    date: "2026-05",
    pdfAvailable: false,
    videoSolutionAvailable: false,
  },
]

export function filterPastPapers(options: {
  subject?: PaperSubject | "All"
  difficulty?: PaperDifficulty | "All"
  level?: EducationalLevel | "All"
}): PastPaper[] {
  return PAST_PAPERS.filter((paper) => {
    if (options.subject && options.subject !== "All" && paper.subject !== options.subject) {
      return false
    }
    if (
      options.difficulty &&
      options.difficulty !== "All" &&
      paper.difficulty !== options.difficulty
    ) {
      return false
    }
    if (options.level && options.level !== "All" && paper.educationalLevel !== options.level) {
      return false
    }
    return true
  })
}
