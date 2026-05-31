/**
 * Curriculum architecture organized by knowledge domains,
 * not primarily by exam board.
 */

export type CurriculumDomain = "Chemistry" | "Mathematics" | "Physics" | "Engineering"

export type CurriculumLevel = "High School" | "First Year University"

export interface CurriculumDomainRecord {
  id: string
  domain: CurriculumDomain
  levelRange: string
  description: string
  topics: string[]
  relevantCurricula: string[]
}

export const CURRICULUM_DOMAINS: CurriculumDomainRecord[] = [
  {
    id: "curriculum-chemistry",
    domain: "Chemistry",
    levelRange: "High School → First Year University Chemistry",
    description:
      "Core chemistry concepts from atomic structure through organic chemistry and spectroscopy.",
    topics: [
      "Atomic Structure",
      "Periodic Trends",
      "Bonding",
      "VSEPR",
      "Hybridization",
      "Stoichiometry",
      "Thermochemistry",
      "Equilibrium",
      "Acids and Bases",
      "Redox",
      "Electrochemistry",
      "Kinetics",
      "Organic Chemistry",
      "Spectroscopy",
    ],
    relevantCurricula: [
      "IB Chemistry SL",
      "IB Chemistry HL",
      "AP Chemistry",
      "A-Level Chemistry",
      "UBC CHEM 121",
      "UBC CHEM 123",
      "UBC CHEM 154",
    ],
  },
  {
    id: "curriculum-mathematics",
    domain: "Mathematics",
    levelRange: "High School → First Year University Mathematics",
    description:
      "Foundational and advanced mathematics from algebra through linear algebra and statistics.",
    topics: [
      "Algebra",
      "Functions",
      "Trigonometry",
      "Complex Numbers",
      "Proofs",
      "Limits",
      "Differentiation",
      "Integration",
      "Differential Equations",
      "Linear Algebra",
      "Matrices",
      "Vectors",
      "Probability",
      "Statistics",
    ],
    relevantCurricula: [
      "IB Math AA SL",
      "IB Math AA HL",
      "AP Calculus AB",
      "AP Calculus BC",
      "A-Level Mathematics",
      "UBC MATH 100",
      "UBC MATH 101",
      "UBC MATH 152",
      "UBC STAT 251",
    ],
  },
  {
    id: "curriculum-physics",
    domain: "Physics",
    levelRange: "High School → First Year University Physics",
    description: "Mechanics, waves, electricity, and modern physics foundations.",
    topics: [
      "Kinematics",
      "Forces & Newton's Laws",
      "Energy & Momentum",
      "Waves & Optics",
      "Electricity & Magnetism",
      "Thermodynamics",
      "Modern Physics",
    ],
    relevantCurricula: [
      "IB Physics SL",
      "IB Physics HL",
      "AP Physics 1",
      "AP Physics 2",
      "A-Level Physics",
    ],
  },
  {
    id: "curriculum-engineering",
    domain: "Engineering",
    levelRange: "High School → First Year University Engineering",
    description: "Engineering design, systems thinking, and applied STEM foundations.",
    topics: [
      "Engineering Design Process",
      "Systems Analysis",
      "Materials Science",
      "Circuit Analysis",
      "Statics & Dynamics",
      "Computational Methods",
    ],
    relevantCurricula: [
      "IB Design Technology",
      "AP Physics C",
      "First Year Engineering Foundations",
    ],
  },
]

export function getCurriculumByDomain(domain: CurriculumDomain): CurriculumDomainRecord | undefined {
  return CURRICULUM_DOMAINS.find((c) => c.domain === domain)
}
