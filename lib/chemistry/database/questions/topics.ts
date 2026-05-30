import type { QuestionTopicRecord, ExamBoard, Difficulty } from "../types"

/** Question generation metadata — infrastructure only, no questions yet */
export const QUESTION_TOPICS: QuestionTopicRecord[] = [
  {
    id: "topic-stoichiometry-moles",
    topic: "Stoichiometry",
    subtopic: "Mole calculations",
    difficulty: "standard",
    examBoards: ["ib-sl", "ib-hl", "ap", "a-level", "high-school"],
    learningOutcomes: [
      "Convert between mass, moles, and particles",
      "Use balanced equations for mole ratios",
    ],
    commonMistakes: [
      "Using molecular mass instead of molar mass",
      "Incorrect significant figures in final answer",
    ],
    questionTypes: ["calculation", "mcq"],
    tags: ["stoichiometry", "moles"],
  },
  {
    id: "topic-atomic-orbitals",
    topic: "Atomic structure",
    subtopic: "Orbitals and quantum numbers",
    difficulty: "standard",
    examBoards: ["ib-sl", "ib-hl", "ap", "a-level"],
    learningOutcomes: [
      "State values of n, l, ml for given orbitals",
      "Relate node count to quantum numbers",
      "Interpret phase in orbital diagrams",
    ],
    commonMistakes: [
      "Confusing phase with charge",
      "Incorrect radial node formula",
    ],
    questionTypes: ["mcq", "structured"],
    relatedCompoundIds: [],
    tags: ["orbitals", "quantum"],
  },
  {
    id: "topic-vsepr-shapes",
    topic: "Molecular shape",
    subtopic: "VSEPR theory",
    difficulty: "standard",
    examBoards: ["ib-sl", "ib-hl", "ap", "a-level", "high-school"],
    learningOutcomes: [
      "Predict electron and molecular geometry",
      "Explain bond angle deviations from lone pairs",
    ],
    commonMistakes: [
      "Confusing electron geometry with molecular geometry",
      "Ignoring lone pairs in steric number",
    ],
    questionTypes: ["mcq", "structured", "vsepr-predict"],
    tags: ["vsepr", "molecular-geometry"],
  },
  {
    id: "topic-lewis-resonance",
    topic: "Bonding",
    subtopic: "Lewis structures and resonance",
    difficulty: "advanced",
    examBoards: ["ib-hl", "ap", "a-level", "university-intro"],
    learningOutcomes: [
      "Draw Lewis structures for polyatomic ions",
      "Assign formal charges",
      "Identify resonance contributors",
    ],
    commonMistakes: [
      "Incorrect formal charge assignment",
      "Drawing expanded octets where not allowed",
    ],
    questionTypes: ["lewis-draw", "structured"],
    tags: ["lewis", "resonance", "formal-charge"],
  },
  {
    id: "topic-spectroscopy-ir",
    topic: "Spectroscopy",
    subtopic: "Infrared spectroscopy",
    difficulty: "advanced",
    examBoards: ["ib-hl", "ap", "a-level"],
    learningOutcomes: [
      "Identify functional groups from IR peaks",
      "Interpret broad O—H and N—H stretches",
    ],
    commonMistakes: [
      "Confusing fingerprint region with functional group peaks",
    ],
    questionTypes: ["spectra-interpretation", "mcq"],
    tags: ["ir", "spectroscopy"],
  },
  {
    id: "topic-organic-mechanisms",
    topic: "Organic chemistry",
    subtopic: "Reaction mechanisms",
    difficulty: "extension",
    examBoards: ["ib-hl", "ap", "a-level", "university-intro"],
    learningOutcomes: [
      "Describe SN1, SN2, E1, E2 mechanisms",
      "Predict products from mechanism type",
    ],
    commonMistakes: [
      "Confusing SN1 with SN2 conditions",
    ],
    questionTypes: ["mechanism", "structured"],
    tags: ["organic", "mechanisms"],
  },
]

export function getTopicsByExamBoard(board: ExamBoard): QuestionTopicRecord[] {
  return QUESTION_TOPICS.filter((t) => t.examBoards.includes(board))
}

export function getTopicsByDifficulty(difficulty: Difficulty): QuestionTopicRecord[] {
  return QUESTION_TOPICS.filter((t) => t.difficulty === difficulty)
}

export function getTopicById(id: string): QuestionTopicRecord | undefined {
  return QUESTION_TOPICS.find((t) => t.id === id)
}
