export type LearningPathId =
  | "general-chemistry-i"
  | "organic-chemistry-i"
  | "organic-chemistry-ii"
  | "analytical-chemistry"
  | "spectroscopy"
  | "laboratory-skills"
  | "molecular-orbital-theory"
  | "reaction-mechanisms"

export type LearningLessonStatus = "not-started" | "in-progress" | "completed"
export type LearningLessonDifficulty = "Introductory" | "Intermediate" | "Advanced"
export type LearningModuleType =
  | "lesson"
  | "scanner"
  | "explorer"
  | "knowledge-graph"
  | "virtual-lab"
  | "mechanism"
  | "spectroscopy"
  | "quiz"

export interface LearningPathLink {
  label: string
  href: string
  kind: LearningModuleType
}

export interface LearningLesson {
  id: string
  pathId: LearningPathId
  title: string
  summary: string
  order: number
  difficulty: LearningLessonDifficulty
  estimatedMinutes: number
  moduleType: LearningModuleType
  href: string
  prerequisites: string[]
  outcomes: string[]
  reviewAfterDays: number
  links: LearningPathLink[]
  relatedKnowledgeNode?: string
  relatedScannerExercise?: string
}

export interface LearningPath {
  id: LearningPathId
  title: string
  subtitle: string
  description: string
  audience: string
  lessons: LearningLesson[]
}

function link(label: string, href: string, kind: LearningModuleType): LearningPathLink {
  return { label, href, kind }
}

function lesson(input: Omit<LearningLesson, "links" | "reviewAfterDays"> & {
  links?: LearningPathLink[]
  reviewAfterDays?: number
}): LearningLesson {
  return {
    reviewAfterDays: input.reviewAfterDays ?? (input.difficulty === "Advanced" ? 7 : 10),
    links: input.links ?? [],
    ...input,
  }
}

function practice(topic: string): string {
  return `/practice-generator?topic=${encodeURIComponent(topic)}&source=database`
}

function exam(topic: string): string {
  return `/exam-generator?topic=${encodeURIComponent(topic)}&source=database`
}

export const LEARNING_PATHS: LearningPath[] = [
  {
    id: "general-chemistry-i",
    title: "General Chemistry I",
    subtitle: "Atoms, bonding, calculations, and equilibrium foundations",
    audience: "High school, AP, IB, A-Level, and first-year chemistry",
    description: "A structured route through the first half of general chemistry using ARSHLAB tools.",
    lessons: [
      lesson({
        id: "gen-atomic-structure",
        pathId: "general-chemistry-i",
        title: "Atomic Structure",
        summary: "Start with protons, neutrons, electrons, isotopes, and atomic mass.",
        order: 1,
        difficulty: "Introductory",
        estimatedMinutes: 18,
        moduleType: "lesson",
        href: "/periodic-table",
        prerequisites: [],
        outcomes: ["Explain atomic number", "Connect isotope mass to element identity"],
        relatedKnowledgeNode: "compound:water",
        links: [link("Open Periodic Table", "/periodic-table", "lesson"), link("Practice Atomic Structure", practice("Atomic Structure"), "quiz")],
      }),
      lesson({
        id: "gen-electron-configuration",
        pathId: "general-chemistry-i",
        title: "Electron Configuration",
        summary: "Use Aufbau, Hund, Pauli, and exceptions to place electrons in orbitals.",
        order: 2,
        difficulty: "Introductory",
        estimatedMinutes: 22,
        moduleType: "lesson",
        href: "/electron-configurations",
        prerequisites: ["gen-atomic-structure"],
        outcomes: ["Write full configurations", "Recognize noble gas shorthand"],
        links: [link("Open Electron Builder", "/electron-configurations", "lesson"), link("Practice Configurations", practice("Electron Configuration"), "quiz")],
      }),
      lesson({
        id: "gen-periodic-trends",
        pathId: "general-chemistry-i",
        title: "Periodic Trends",
        summary: "Connect radius, ionization energy, electron affinity, and electronegativity to shielding and effective nuclear charge.",
        order: 3,
        difficulty: "Intermediate",
        estimatedMinutes: 24,
        moduleType: "lesson",
        href: "/periodic-table",
        prerequisites: ["gen-electron-configuration"],
        outcomes: ["Predict trend direction", "Explain shielding and nuclear charge"],
        links: [link("Open Heatmaps", "/periodic-table", "lesson"), link("Trend Quiz", "/periodic-trends-quiz", "quiz")],
      }),
      lesson({
        id: "gen-bonding",
        pathId: "general-chemistry-i",
        title: "Bonding",
        summary: "Compare ionic, covalent, metallic, sigma, pi, polar, and nonpolar bonding.",
        order: 4,
        difficulty: "Intermediate",
        estimatedMinutes: 25,
        moduleType: "explorer",
        href: "/bonding-explorer",
        prerequisites: ["gen-periodic-trends"],
        outcomes: ["Identify bonding type", "Relate bond energy to distance"],
        links: [link("Open Bonding Explorer", "/bonding-explorer", "explorer"), link("Open Knowledge Graph", "/knowledge-graph?focus=formula:stoichiometry-limiting-reagent", "knowledge-graph")],
      }),
      lesson({
        id: "gen-stoichiometry",
        pathId: "general-chemistry-i",
        title: "Stoichiometry",
        summary: "Use balanced equations to connect moles, mass, limiting reagents, and percent yield.",
        order: 5,
        difficulty: "Introductory",
        estimatedMinutes: 30,
        moduleType: "lesson",
        href: "/chemistry-solver?module=stoichiometry",
        prerequisites: ["gen-atomic-structure"],
        outcomes: ["Convert mass to moles", "Use mole ratios"],
        links: [link("Open Solver", "/chemistry-solver?module=stoichiometry", "lesson"), link("Practice Stoichiometry", practice("Stoichiometry"), "quiz")],
      }),
      lesson({
        id: "gen-solutions-acids",
        pathId: "general-chemistry-i",
        title: "Solutions, Acids, and Bases",
        summary: "Practice molarity, dilution, pH, pOH, and neutralization reasoning.",
        order: 6,
        difficulty: "Intermediate",
        estimatedMinutes: 32,
        moduleType: "lesson",
        href: "/chemistry-solver?module=molarity",
        prerequisites: ["gen-stoichiometry"],
        outcomes: ["Calculate molarity", "Connect pH to concentration"],
        links: [
          link("Molarity Solver", "/chemistry-solver?module=molarity", "lesson"),
          link("pH Solver", "/chemistry-solver?module=ph", "lesson"),
          link("Ammonia Virtual Lab", "/virtual-lab?experiment=acid-base-ph-ammonia&compound=ammonia", "virtual-lab"),
        ],
      }),
      lesson({
        id: "gen-thermochemistry",
        pathId: "general-chemistry-i",
        title: "Thermochemistry",
        summary: "Use q = mc delta T, enthalpy, and energy changes to interpret chemical processes.",
        order: 7,
        difficulty: "Intermediate",
        estimatedMinutes: 26,
        moduleType: "lesson",
        href: "/formula-sheet?formula=thermochemistry-q-mcdt",
        prerequisites: ["gen-stoichiometry"],
        outcomes: ["Calculate heat transfer", "Interpret exothermic and endothermic processes"],
        links: [link("Open Formula", "/formula-sheet?formula=thermochemistry-q-mcdt", "lesson"), link("Practice Thermochemistry", practice("Thermochemistry"), "quiz")],
      }),
      lesson({
        id: "gen-equilibrium",
        pathId: "general-chemistry-i",
        title: "Equilibrium",
        summary: "Interpret K, Q, ICE tables, and Le Chatelier shifts.",
        order: 8,
        difficulty: "Advanced",
        estimatedMinutes: 32,
        moduleType: "lesson",
        href: "/practice-generator?topic=Equilibrium&source=database",
        prerequisites: ["gen-thermochemistry", "gen-solutions-acids"],
        outcomes: ["Distinguish K and Q", "Predict shifts from stress"],
        links: [link("Practice Equilibrium", practice("Equilibrium"), "quiz"), link("Generate Exam Set", exam("Equilibrium"), "quiz")],
      }),
    ],
  },
  {
    id: "organic-chemistry-i",
    title: "Organic Chemistry I",
    subtitle: "Functional groups, structure, stereochemistry, and first mechanisms",
    audience: "Intro organic chemistry students",
    description: "A path from functional group recognition to reaction mechanism reasoning.",
    lessons: [
      lesson({
        id: "org1-functional-groups",
        pathId: "organic-chemistry-i",
        title: "Functional Groups",
        summary: "Recognize alcohols, amines, carbonyls, acids, esters, haloalkanes, alkenes, alkynes, and aromatics.",
        order: 1,
        difficulty: "Introductory",
        estimatedMinutes: 25,
        moduleType: "lesson",
        href: "/functional-groups",
        prerequisites: ["gen-bonding"],
        outcomes: ["Name common functional groups", "Connect groups to reactivity"],
        links: [link("Open Functional Groups", "/functional-groups", "lesson"), link("Practice Groups", practice("Functional Group Identification"), "quiz")],
      }),
      lesson({
        id: "org1-hybridization",
        pathId: "organic-chemistry-i",
        title: "Hybridization",
        summary: "Use electron domains to assign sp, sp2, and sp3 hybridization.",
        order: 2,
        difficulty: "Intermediate",
        estimatedMinutes: 24,
        moduleType: "explorer",
        href: "/interactive-learning?topic=hybridization",
        prerequisites: ["org1-functional-groups"],
        outcomes: ["Assign hybridization", "Predict shape and sigma/pi bonding"],
        links: [link("Open Hybridization Lesson", "/interactive-learning?topic=hybridization", "explorer"), link("Open Builder", "/hybridization-builder", "explorer")],
      }),
      lesson({
        id: "org1-conjugation",
        pathId: "organic-chemistry-i",
        title: "Conjugation",
        summary: "See how neighboring p orbitals share electrons and change stability.",
        order: 3,
        difficulty: "Intermediate",
        estimatedMinutes: 28,
        moduleType: "explorer",
        href: "/interactive-learning/conjugation",
        prerequisites: ["org1-hybridization"],
        outcomes: ["Identify conjugated systems", "Explain delocalization"],
        links: [link("Open Conjugation", "/interactive-learning/conjugation", "explorer"), link("Open Benzene", "/interactive-learning/conjugation?compound=benzene&focus=aromaticity", "explorer")],
      }),
      lesson({
        id: "org1-resonance",
        pathId: "organic-chemistry-i",
        title: "Resonance",
        summary: "Use curved-arrow ideas to compare resonance contributors and delocalized charge.",
        order: 4,
        difficulty: "Intermediate",
        estimatedMinutes: 28,
        moduleType: "explorer",
        href: "/interactive-learning/conjugation?focus=resonance",
        prerequisites: ["org1-conjugation"],
        outcomes: ["Draw resonance logic", "Rank contributors"],
        links: [link("Open Resonance Lesson", "/interactive-learning/conjugation?focus=resonance", "explorer"), link("Practice Resonance", practice("Aromaticity"), "quiz")],
      }),
      lesson({
        id: "org1-aromaticity",
        pathId: "organic-chemistry-i",
        title: "Aromaticity",
        summary: "Apply Huckel's rule to benzene, pyridine, phenol, and related aromatic compounds.",
        order: 5,
        difficulty: "Advanced",
        estimatedMinutes: 30,
        moduleType: "explorer",
        href: "/interactive-learning/conjugation?compound=benzene&focus=aromaticity",
        prerequisites: ["org1-resonance"],
        outcomes: ["Apply 4n+2", "Separate aromatic from nonaromatic structures"],
        relatedKnowledgeNode: "compound:benzene",
        relatedScannerExercise: "benzene",
        links: [
          link("Aromaticity Lesson", "/interactive-learning/conjugation?compound=benzene&focus=aromaticity", "explorer"),
          link("Open Knowledge Graph", "/knowledge-graph?focus=compound:benzene", "knowledge-graph"),
        ],
      }),
      lesson({
        id: "org1-substitution-elimination",
        pathId: "organic-chemistry-i",
        title: "Substitution and Elimination",
        summary: "Compare SN1, SN2, E1, and E2 using substrate, nucleophile, base, solvent, and leaving group clues.",
        order: 6,
        difficulty: "Advanced",
        estimatedMinutes: 34,
        moduleType: "mechanism",
        href: "/interactive-learning/mechanisms?reaction=sn2",
        prerequisites: ["org1-functional-groups", "org1-resonance"],
        outcomes: ["Choose SN1/SN2/E1/E2", "Predict stereochemical and elimination outcomes"],
        links: [link("Open Mechanism Simulator", "/interactive-learning/mechanisms?reaction=sn2", "mechanism"), link("Practice Mechanisms", practice("Organic Mechanisms"), "quiz")],
      }),
    ],
  },
  {
    id: "organic-chemistry-ii",
    title: "Organic Chemistry II",
    subtitle: "Aromatics, carbonyls, synthesis, and lab-connected reactivity",
    audience: "Second-term organic chemistry students",
    description: "A mechanism-heavy path through aromatic and carbonyl chemistry.",
    lessons: [
      lesson({
        id: "org2-eas",
        pathId: "organic-chemistry-ii",
        title: "Electrophilic Aromatic Substitution",
        summary: "Connect aromaticity to substitution, directing effects, and reaction conditions.",
        order: 1,
        difficulty: "Advanced",
        estimatedMinutes: 32,
        moduleType: "mechanism",
        href: "/interactive-learning/mechanisms?reaction=eas",
        prerequisites: ["org1-aromaticity"],
        outcomes: ["Explain why benzene substitutes", "Predict directing patterns"],
        links: [link("Open Aromaticity", "/interactive-learning/conjugation?compound=benzene&focus=aromaticity", "explorer"), link("Practice Aromatics", practice("Aromaticity"), "quiz")],
      }),
      lesson({
        id: "org2-carbonyls",
        pathId: "organic-chemistry-ii",
        title: "Carbonyl Chemistry",
        summary: "Use C=O polarity, IR evidence, and nucleophile/electrophile logic.",
        order: 2,
        difficulty: "Advanced",
        estimatedMinutes: 34,
        moduleType: "explorer",
        href: "/interactive-learning/explorer?compound=acetone",
        prerequisites: ["org1-hybridization"],
        outcomes: ["Identify carbonyl reactivity", "Interpret carbonyl spectra"],
        relatedScannerExercise: "acetone",
        links: [link("Explore Acetone", "/interactive-learning/explorer?compound=acetone", "explorer"), link("View Spectra", "/spectroscopy-explorer?compound=acetone", "spectroscopy")],
      }),
      lesson({
        id: "org2-carboxylic-acids-esters",
        pathId: "organic-chemistry-ii",
        title: "Carboxylic Acids and Esters",
        summary: "Connect acid derivatives to esterification, hydrolysis, spectroscopy, and lab workup.",
        order: 3,
        difficulty: "Advanced",
        estimatedMinutes: 36,
        moduleType: "virtual-lab",
        href: "/virtual-lab?experiment=esterification-ethyl-acetate&compound=ethyl-ethanoate",
        prerequisites: ["org2-carbonyls", "org1-substitution-elimination"],
        outcomes: ["Recognize ester formation", "Connect spectra to product identity"],
        links: [
          link("Run Esterification Lab", "/virtual-lab?experiment=esterification-ethyl-acetate&compound=ethyl-ethanoate", "virtual-lab"),
          link("Open Mechanism", "/mechanism-trainer?mechanism=esterification", "mechanism"),
        ],
      }),
      lesson({
        id: "org2-synthesis-pathways",
        pathId: "organic-chemistry-ii",
        title: "Synthesis Pathways",
        summary: "Plan compound-to-compound transformations using deterministic reaction graphs.",
        order: 4,
        difficulty: "Advanced",
        estimatedMinutes: 30,
        moduleType: "knowledge-graph",
        href: "/synthesis-explorer?start=ethanol&target=ethyl-ethanoate",
        prerequisites: ["org2-carboxylic-acids-esters"],
        outcomes: ["Find intermediates", "Connect reactions to mechanisms and lab conditions"],
        links: [link("Open Synthesis Explorer", "/synthesis-explorer?start=ethanol&target=ethyl-ethanoate", "knowledge-graph"), link("Open Reaction Explorer", "/reaction-explorer", "knowledge-graph")],
      }),
    ],
  },
  {
    id: "analytical-chemistry",
    title: "Analytical Chemistry",
    subtitle: "Measurements, uncertainty, titrations, and technique choice",
    audience: "First-year lab and analysis students",
    description: "A practical path through measurement quality and analysis decisions.",
    lessons: [
      lesson({
        id: "analytical-glassware",
        pathId: "analytical-chemistry",
        title: "Glassware and Measurement",
        summary: "Choose burettes, pipettes, volumetric flasks, balances, and reading techniques.",
        order: 1,
        difficulty: "Introductory",
        estimatedMinutes: 18,
        moduleType: "virtual-lab",
        href: "/lab-explorer?category=measurement",
        prerequisites: [],
        outcomes: ["Choose suitable glassware", "Explain uncertainty sources"],
        links: [link("Open Lab Explorer", "/lab-explorer?category=measurement", "virtual-lab"), link("Practice Lab Skills", practice("Lab Skills"), "quiz")],
      }),
      lesson({
        id: "analytical-titration",
        pathId: "analytical-chemistry",
        title: "Titration and Meniscus Reading",
        summary: "Use burette readings, endpoints, and stoichiometry for quantitative analysis.",
        order: 2,
        difficulty: "Intermediate",
        estimatedMinutes: 26,
        moduleType: "virtual-lab",
        href: "/lab-explorer?technique=titration",
        prerequisites: ["analytical-glassware", "gen-stoichiometry"],
        outcomes: ["Read a burette", "Connect endpoint to moles"],
        links: [link("Open Titration Technique", "/lab-explorer?technique=titration", "virtual-lab"), link("Open Molarity Solver", "/chemistry-solver?module=molarity", "lesson")],
      }),
      lesson({
        id: "analytical-error-analysis",
        pathId: "analytical-chemistry",
        title: "Error Analysis",
        summary: "Distinguish random, systematic, procedural, and instrumental error.",
        order: 3,
        difficulty: "Intermediate",
        estimatedMinutes: 22,
        moduleType: "quiz",
        href: "/practice-generator?topic=Lab%20Skills&source=database",
        prerequisites: ["analytical-titration"],
        outcomes: ["Classify errors", "Predict direction of error"],
        links: [link("Practice Error Analysis", practice("Lab Skills"), "quiz"), link("Open Lab Explorer", "/lab-explorer", "virtual-lab")],
      }),
    ],
  },
  {
    id: "spectroscopy",
    title: "Spectroscopy",
    subtitle: "IR, NMR, mass spec, and structure identification",
    audience: "Organic and analytical chemistry students",
    description: "A spectrum-first path for interpreting structural evidence.",
    lessons: [
      lesson({
        id: "spec-ir",
        pathId: "spectroscopy",
        title: "IR Spectroscopy",
        summary: "Recognize O-H, N-H, C=O, C=C, C=N, and aromatic absorptions.",
        order: 1,
        difficulty: "Introductory",
        estimatedMinutes: 22,
        moduleType: "spectroscopy",
        href: "/spectroscopy-explorer?topic=ir-carbonyl",
        prerequisites: ["org1-functional-groups"],
        outcomes: ["Identify major IR peaks", "Connect peaks to functional groups"],
        links: [link("Open IR Explorer", "/spectroscopy-explorer?topic=ir-carbonyl", "spectroscopy"), link("Practice IR", practice("IR Spectroscopy"), "quiz")],
      }),
      lesson({
        id: "spec-nmr",
        pathId: "spectroscopy",
        title: "1H and 13C NMR",
        summary: "Use chemical shift, integration, splitting, and carbon environments.",
        order: 2,
        difficulty: "Intermediate",
        estimatedMinutes: 30,
        moduleType: "spectroscopy",
        href: "/spectroscopy-explorer?topic=nmr",
        prerequisites: ["spec-ir"],
        outcomes: ["Interpret splitting", "Assign carbon environments"],
        links: [link("Open NMR Explorer", "/spectroscopy-explorer?topic=nmr", "spectroscopy"), link("Practice NMR", practice("NMR Spectroscopy"), "quiz")],
      }),
      lesson({
        id: "spec-unknowns",
        pathId: "spectroscopy",
        title: "Unknown Identification",
        summary: "Combine IR, NMR, and mass spec to narrow possible compounds.",
        order: 3,
        difficulty: "Advanced",
        estimatedMinutes: 35,
        moduleType: "spectroscopy",
        href: "/spectroscopy-explorer?compound=caffeine",
        prerequisites: ["spec-ir", "spec-nmr"],
        outcomes: ["Combine spectra", "Justify compound identity"],
        relatedScannerExercise: "caffeine",
        links: [link("Caffeine Spectroscopy Lab", "/virtual-lab?experiment=caffeine-spectroscopy&compound=caffeine", "virtual-lab"), link("Open Spectroscopy Explorer", "/spectroscopy-explorer?compound=caffeine", "spectroscopy")],
      }),
    ],
  },
  {
    id: "laboratory-skills",
    title: "Laboratory Skills",
    subtitle: "Safety, glassware, separation, workup, and reporting",
    audience: "Students entering wet labs",
    description: "A practical skills path that connects lab technique records to virtual experiments.",
    lessons: [
      lesson({
        id: "lab-safety",
        pathId: "laboratory-skills",
        title: "Safety and PPE",
        summary: "Use PPE, waste, hazards, and safe handling logic.",
        order: 1,
        difficulty: "Introductory",
        estimatedMinutes: 16,
        moduleType: "virtual-lab",
        href: "/lab-explorer?category=safety",
        prerequisites: [],
        outcomes: ["Match hazards to PPE", "Choose safe waste practices"],
        links: [link("Open Safety Techniques", "/lab-explorer?category=safety", "virtual-lab"), link("Practice Safety", practice("Lab Skills"), "quiz")],
      }),
      lesson({
        id: "lab-recrystallization",
        pathId: "laboratory-skills",
        title: "Recrystallization and Filtration",
        summary: "Purify solids, collect crystals, and interpret melting point.",
        order: 2,
        difficulty: "Intermediate",
        estimatedMinutes: 28,
        moduleType: "virtual-lab",
        href: "/virtual-lab?experiment=aspirin-recrystallization&compound=aspirin",
        prerequisites: ["lab-safety"],
        outcomes: ["Choose a solvent", "Explain purity from melting point"],
        links: [link("Run Aspirin Lab", "/virtual-lab?experiment=aspirin-recrystallization&compound=aspirin", "virtual-lab"), link("Open Lab Explorer", "/lab-explorer?technique=recrystallization", "virtual-lab")],
      }),
      lesson({
        id: "lab-reporting",
        pathId: "laboratory-skills",
        title: "Lab Notebook and Reporting",
        summary: "Build objective, method, observation, result, safety, and conclusion sections.",
        order: 3,
        difficulty: "Introductory",
        estimatedMinutes: 20,
        moduleType: "virtual-lab",
        href: "/virtual-lab",
        prerequisites: ["lab-safety"],
        outcomes: ["Write clear observations", "Separate result from conclusion"],
        links: [link("Open Virtual Lab", "/virtual-lab", "virtual-lab"), link("Open Lab Explorer", "/lab-explorer", "virtual-lab")],
      }),
    ],
  },
  {
    id: "molecular-orbital-theory",
    title: "Molecular Orbital Theory",
    subtitle: "Orbital filling, HOMO/LUMO, bond order, and magnetism",
    audience: "Students learning orbital explanations of bonding",
    description: "A diagram-first path for MO diagrams and orbital-based reactivity.",
    lessons: [
      lesson({
        id: "mo-orbital-filling",
        pathId: "molecular-orbital-theory",
        title: "MO Diagram Filling",
        summary: "Fill molecular orbitals using Aufbau, Hund, and Pauli rules.",
        order: 1,
        difficulty: "Intermediate",
        estimatedMinutes: 24,
        moduleType: "explorer",
        href: "/interactive-learning?topic=mo&molecule=O2",
        prerequisites: ["gen-electron-configuration", "gen-bonding"],
        outcomes: ["Fill O2 and N2 diagrams", "Predict unpaired electrons"],
        links: [link("Open MO Builder", "/interactive-learning?topic=mo&molecule=O2", "explorer"), link("Practice MO Theory", practice("Molecular Orbital Theory"), "quiz")],
      }),
      lesson({
        id: "mo-homo-lumo",
        pathId: "molecular-orbital-theory",
        title: "HOMO and LUMO",
        summary: "Use frontier orbitals to reason about reactivity and electron movement.",
        order: 2,
        difficulty: "Advanced",
        estimatedMinutes: 26,
        moduleType: "explorer",
        href: "/interactive-learning?topic=mo&molecule=CO",
        prerequisites: ["mo-orbital-filling"],
        outcomes: ["Identify HOMO and LUMO", "Relate orbital energy to reactivity"],
        links: [link("Open HOMO/LUMO", "/interactive-learning?topic=mo&molecule=CO", "explorer"), link("Open Knowledge Graph", "/knowledge-graph?query=HOMO", "knowledge-graph")],
      }),
    ],
  },
  {
    id: "reaction-mechanisms",
    title: "Reaction Mechanisms",
    subtitle: "Electron flow, conditions, products, and lab consequences",
    audience: "Students practicing organic mechanism logic",
    description: "A simulator-centered path for reaction mechanism practice.",
    lessons: [
      lesson({
        id: "mech-curved-arrows",
        pathId: "reaction-mechanisms",
        title: "Curved Arrow Logic",
        summary: "Track electron sources, destinations, bond formation, and bond breaking.",
        order: 1,
        difficulty: "Intermediate",
        estimatedMinutes: 24,
        moduleType: "mechanism",
        href: "/interactive-learning/mechanisms?reaction=sn2",
        prerequisites: ["org1-functional-groups"],
        outcomes: ["Locate electron sources", "Choose plausible arrow destinations"],
        links: [link("Open Simulator", "/interactive-learning/mechanisms?reaction=sn2", "mechanism"), link("Open Mechanism Trainer", "/mechanism-trainer", "mechanism")],
      }),
      lesson({
        id: "mech-alkene-addition",
        pathId: "reaction-mechanisms",
        title: "Alkene Addition Mechanisms",
        summary: "Connect pi bonds, electrophiles, bromonium ions, and product stereochemistry.",
        order: 2,
        difficulty: "Advanced",
        estimatedMinutes: 30,
        moduleType: "mechanism",
        href: "/mechanism-trainer?mechanism=alkene-bromination",
        prerequisites: ["mech-curved-arrows", "org1-hybridization"],
        outcomes: ["Explain electrophilic addition", "Predict dibromoalkane products"],
        links: [link("Run Bromine Test Lab", "/virtual-lab?experiment=cyclohexene-bromine-test&compound=cyclohexene", "virtual-lab"), link("Open Mechanism", "/mechanism-trainer?mechanism=alkene-bromination", "mechanism")],
      }),
      lesson({
        id: "mech-esterification",
        pathId: "reaction-mechanisms",
        title: "Esterification Mechanism",
        summary: "Follow acid-catalyzed carbonyl activation, nucleophilic attack, proton transfer, and water loss.",
        order: 3,
        difficulty: "Advanced",
        estimatedMinutes: 32,
        moduleType: "mechanism",
        href: "/mechanism-trainer?mechanism=esterification",
        prerequisites: ["mech-curved-arrows", "org2-carboxylic-acids-esters"],
        outcomes: ["Follow acid catalysis", "Connect mechanism to lab conditions"],
        links: [link("Open Mechanism", "/mechanism-trainer?mechanism=esterification", "mechanism"), link("Run Esterification Lab", "/virtual-lab?experiment=esterification-ethyl-acetate&compound=ethyl-ethanoate", "virtual-lab")],
      }),
    ],
  },
]

export function listLearningPaths(): LearningPath[] {
  return LEARNING_PATHS
}

export function listLearningLessons(): LearningLesson[] {
  return LEARNING_PATHS.flatMap((path) => path.lessons)
}

export function getLearningPath(id: string | null | undefined): LearningPath {
  return LEARNING_PATHS.find((path) => path.id === id) ?? LEARNING_PATHS[0]
}

export function getLearningLesson(id: string | null | undefined): LearningLesson | undefined {
  return listLearningLessons().find((lesson) => lesson.id === id)
}

export function learningPathHref(pathId?: string, lessonId?: string): string {
  const params = new URLSearchParams()
  if (pathId) params.set("path", pathId)
  if (lessonId) params.set("lesson", lessonId)
  return params.size ? `/learning-paths?${params.toString()}` : "/learning-paths"
}

export function getLearningPathMetrics() {
  const lessons = listLearningLessons()
  return {
    paths: LEARNING_PATHS.length,
    lessons: lessons.length,
    links: lessons.reduce((sum, lesson) => sum + lesson.links.length, 0),
    scannerExercises: lessons.filter((lesson) => lesson.relatedScannerExercise).length,
    virtualLabs: lessons.flatMap((lesson) => lesson.links).filter((item) => item.kind === "virtual-lab").length,
    mechanisms: lessons.flatMap((lesson) => lesson.links).filter((item) => item.kind === "mechanism").length,
  }
}
