import {
  getTopicDeepLinkTargets,
  mechanismHref,
  molecularVisualizerHref,
  reactionHref,
  solverModuleHref,
} from "@/lib/deep-links"

export type CurriculumRoadmapId = "general-chemistry" | "organic-chemistry"

export type CurriculumRoadmapDifficulty = "Introductory" | "Intermediate" | "Advanced"

export interface CurriculumToolLink {
  label: string
  href: string
  description: string
}

export interface CurriculumRoadmapTopic {
  id: string
  title: string
  description: string
  difficulty: CurriculumRoadmapDifficulty
  prerequisites: string[]
  recommendedNextTopics: string[]
  toolLinks: CurriculumToolLink[]
}

export interface CurriculumRoadmap {
  id: CurriculumRoadmapId
  title: string
  subtitle: string
  description: string
  topics: CurriculumRoadmapTopic[]
}

function encodedTopic(topic: string): string {
  return encodeURIComponent(topic)
}

function toolLinksForTopic(topic: string): CurriculumToolLink[] {
  const query = encodedTopic(topic)
  const targets = getTopicDeepLinkTargets(topic)
  const links: CurriculumToolLink[] = [
    {
      label: "Formula Sheet",
      href: `/formula-sheet?formula=${encodeURIComponent(targets.formulaId)}#formula-${targets.formulaId}`,
      description: "Review equations, variables, units, and common mistakes.",
    },
    {
      label: "Chemistry Solver",
      href: solverModuleHref(targets.solverModuleId),
      description: "Open calculation modules and worked step-by-step examples.",
    },
    {
      label: "Practice Generator",
      href: `/practice-generator?topic=${encodedTopic(targets.practiceTopic)}&source=database`,
      description: "Generate deterministic database-backed practice.",
    },
    {
      label: "Exam Generator",
      href: `/exam-generator?topic=${encodedTopic(targets.examTopic)}&source=database&mode=adaptive`,
      description: "Build a focused practice exam around this topic.",
    },
    {
      label: "Molecular Visualizer",
      href: targets.compoundId ? molecularVisualizerHref(targets.compoundId) : `/molecular-visualizer?topic=${query}`,
      description: "Connect the topic to structures, pathways, and visual examples.",
    },
  ]

  if (targets.mechanismId) {
    links.push({
      label: "Mechanism Trainer",
      href: mechanismHref(targets.mechanismId),
      description: "Use mechanism steps when the topic involves organic pathways.",
    })
  }

  if (targets.reactionId) {
    links.push({
      label: "Reaction Database",
      href: reactionHref(targets.reactionId),
      description: "Browse deterministic reaction records and examples.",
    })
  }

  return links
}

function topic(input: Omit<CurriculumRoadmapTopic, "toolLinks">): CurriculumRoadmapTopic {
  return {
    ...input,
    toolLinks: toolLinksForTopic(input.title),
  }
}

export const CURRICULUM_ROADMAPS: CurriculumRoadmap[] = [
  {
    id: "general-chemistry",
    title: "General Chemistry Roadmap",
    subtitle: "Foundations to exam-ready first-year chemistry",
    description:
      "A deterministic study path through atomic structure, bonding, calculations, equilibria, and electrochemistry.",
    topics: [
      topic({
        id: "general-atomic-structure",
        title: "Atomic Structure",
        description:
          "Build the particle model of atoms: protons, neutrons, electrons, isotopes, atomic mass, and nuclear charge.",
        difficulty: "Introductory",
        prerequisites: [],
        recommendedNextTopics: ["Electron Configuration", "Periodic Trends"],
      }),
      topic({
        id: "general-electron-configuration",
        title: "Electron Configuration",
        description:
          "Use orbital filling, subshell notation, noble gas shorthand, and common transition-metal exceptions.",
        difficulty: "Introductory",
        prerequisites: ["Atomic Structure"],
        recommendedNextTopics: ["Periodic Trends", "Bonding"],
      }),
      topic({
        id: "general-periodic-trends",
        title: "Periodic Trends",
        description:
          "Explain atomic radius, ionization energy, electron affinity, electronegativity, shielding, and effective nuclear charge.",
        difficulty: "Intermediate",
        prerequisites: ["Atomic Structure", "Electron Configuration"],
        recommendedNextTopics: ["Bonding", "Intermolecular Forces"],
      }),
      topic({
        id: "general-bonding",
        title: "Bonding",
        description:
          "Compare ionic, covalent, metallic, polar, nonpolar, sigma, and pi bonding with structural evidence.",
        difficulty: "Intermediate",
        prerequisites: ["Electron Configuration", "Periodic Trends"],
        recommendedNextTopics: ["Molecular Geometry", "Intermolecular Forces"],
      }),
      topic({
        id: "general-molecular-geometry",
        title: "Molecular Geometry",
        description:
          "Use Lewis structures, VSEPR, electron domains, lone pairs, and hybridization to predict shapes and bond angles.",
        difficulty: "Intermediate",
        prerequisites: ["Bonding"],
        recommendedNextTopics: ["Intermolecular Forces", "Stoichiometry"],
      }),
      topic({
        id: "general-intermolecular-forces",
        title: "Intermolecular Forces",
        description:
          "Connect structure to dispersion forces, dipole-dipole forces, hydrogen bonding, boiling point, and solubility.",
        difficulty: "Intermediate",
        prerequisites: ["Bonding", "Molecular Geometry"],
        recommendedNextTopics: ["Solutions", "Thermochemistry"],
      }),
      topic({
        id: "general-stoichiometry",
        title: "Stoichiometry",
        description:
          "Convert between mass, moles, particles, balanced equations, limiting reagents, and percent yield.",
        difficulty: "Introductory",
        prerequisites: ["Atomic Structure"],
        recommendedNextTopics: ["Solutions", "Gas Laws"],
      }),
      topic({
        id: "general-solutions",
        title: "Solutions",
        description:
          "Work with concentration, dilution, solution stoichiometry, solubility, and units in aqueous systems.",
        difficulty: "Intermediate",
        prerequisites: ["Stoichiometry", "Intermolecular Forces"],
        recommendedNextTopics: ["Acids and Bases", "Equilibrium"],
      }),
      topic({
        id: "general-gas-laws",
        title: "Gas Laws",
        description:
          "Apply Boyle's law, Charles' law, combined gas law, and the ideal gas equation to quantitative problems.",
        difficulty: "Intermediate",
        prerequisites: ["Stoichiometry"],
        recommendedNextTopics: ["Thermochemistry", "Equilibrium"],
      }),
      topic({
        id: "general-thermochemistry",
        title: "Thermochemistry",
        description:
          "Track heat, enthalpy, calorimetry, Hess Law, entropy, Gibbs free energy, and energy diagrams.",
        difficulty: "Intermediate",
        prerequisites: ["Stoichiometry", "Gas Laws"],
        recommendedNextTopics: ["Equilibrium", "Electrochemistry"],
      }),
      topic({
        id: "general-equilibrium",
        title: "Equilibrium",
        description:
          "Interpret K, Q, ICE tables, Le Chatelier shifts, reaction quotients, and equilibrium calculations.",
        difficulty: "Advanced",
        prerequisites: ["Stoichiometry", "Thermochemistry"],
        recommendedNextTopics: ["Acids and Bases", "Electrochemistry"],
      }),
      topic({
        id: "general-acids-and-bases",
        title: "Acids and Bases",
        description:
          "Study pH, pOH, strong and weak acids, buffers, titrations, conjugate pairs, Ka, and Kb.",
        difficulty: "Advanced",
        prerequisites: ["Solutions", "Equilibrium"],
        recommendedNextTopics: ["Electrochemistry"],
      }),
      topic({
        id: "general-electrochemistry",
        title: "Electrochemistry",
        description:
          "Connect redox reactions, galvanic cells, standard cell potentials, and Faraday relationships.",
        difficulty: "Advanced",
        prerequisites: ["Equilibrium", "Thermochemistry", "Acids and Bases"],
        recommendedNextTopics: ["Organic Chemistry Roadmap"],
      }),
    ],
  },
  {
    id: "organic-chemistry",
    title: "Organic Chemistry Roadmap",
    subtitle: "Structure, names, reactivity, and mechanisms",
    description:
      "A deterministic path through functional groups, naming, isomers, reaction families, and mechanism reasoning.",
    topics: [
      topic({
        id: "organic-functional-groups",
        title: "Functional Groups",
        description:
          "Recognize alcohols, amines, carbonyls, carboxylic acids, esters, amides, haloalkanes, alkenes, alkynes, and arenes.",
        difficulty: "Introductory",
        prerequisites: ["Bonding"],
        recommendedNextTopics: ["Nomenclature", "Isomerism"],
      }),
      topic({
        id: "organic-nomenclature",
        title: "Nomenclature",
        description:
          "Name carbon chains, substituents, locations, suffixes, prefixes, and priority functional groups.",
        difficulty: "Introductory",
        prerequisites: ["Functional Groups"],
        recommendedNextTopics: ["Isomerism", "Alkanes"],
      }),
      topic({
        id: "organic-isomerism",
        title: "Isomerism",
        description:
          "Compare structural, positional, functional group, geometric, and introductory stereochemical isomerism.",
        difficulty: "Intermediate",
        prerequisites: ["Functional Groups", "Nomenclature"],
        recommendedNextTopics: ["Alkanes", "Alkenes"],
      }),
      topic({
        id: "organic-alkanes",
        title: "Alkanes",
        description:
          "Study saturated hydrocarbons, combustion, radical substitution, conformations, and line-angle structure.",
        difficulty: "Introductory",
        prerequisites: ["Nomenclature"],
        recommendedNextTopics: ["Alkenes", "Alkynes"],
      }),
      topic({
        id: "organic-alkenes",
        title: "Alkenes",
        description:
          "Connect double bonds, pi electrons, electrophilic addition, hydration, bromination, and hydrogenation.",
        difficulty: "Intermediate",
        prerequisites: ["Alkanes", "Bonding"],
        recommendedNextTopics: ["Alkynes", "Organic Mechanisms"],
      }),
      topic({
        id: "organic-alkynes",
        title: "Alkynes",
        description:
          "Study triple bonds, linear geometry, acidity trends, addition reactions, and sigma/pi bonding.",
        difficulty: "Intermediate",
        prerequisites: ["Alkenes"],
        recommendedNextTopics: ["Aromatics", "Alcohols"],
      }),
      topic({
        id: "organic-aromatics",
        title: "Aromatics",
        description:
          "Recognize aromatic stability, benzene structures, resonance, substitution patterns, and IR clues.",
        difficulty: "Advanced",
        prerequisites: ["Alkenes", "Isomerism"],
        recommendedNextTopics: ["Alcohols", "Carbonyl Chemistry"],
      }),
      topic({
        id: "organic-alcohols",
        title: "Alcohols",
        description:
          "Explain O-H polarity, hydrogen bonding, oxidation, dehydration, substitution, and spectroscopy markers.",
        difficulty: "Intermediate",
        prerequisites: ["Functional Groups", "Alkenes"],
        recommendedNextTopics: ["Carbonyl Chemistry", "Carboxylic Acids"],
      }),
      topic({
        id: "organic-carbonyl-chemistry",
        title: "Carbonyl Chemistry",
        description:
          "Compare aldehydes, ketones, carbonyl polarity, nucleophilic addition, oxidation, and IR C=O evidence.",
        difficulty: "Advanced",
        prerequisites: ["Alcohols", "Aromatics"],
        recommendedNextTopics: ["Carboxylic Acids", "Esters"],
      }),
      topic({
        id: "organic-carboxylic-acids",
        title: "Carboxylic Acids",
        description:
          "Study acidity, carboxylate stabilization, naming, synthesis, neutralization, and carbonyl reactivity.",
        difficulty: "Advanced",
        prerequisites: ["Carbonyl Chemistry"],
        recommendedNextTopics: ["Esters", "Organic Mechanisms"],
      }),
      topic({
        id: "organic-esters",
        title: "Esters",
        description:
          "Connect ester functional groups, esterification, hydrolysis, scents, naming, and IR carbonyl evidence.",
        difficulty: "Advanced",
        prerequisites: ["Carboxylic Acids", "Alcohols"],
        recommendedNextTopics: ["Organic Mechanisms"],
      }),
      topic({
        id: "organic-mechanisms",
        title: "Organic Mechanisms",
        description:
          "Practice electron-flow logic for SN1, SN2, E1, E2, additions, esterification, oxidation, and product patterns.",
        difficulty: "Advanced",
        prerequisites: ["Alkenes", "Alcohols", "Carbonyl Chemistry", "Esters"],
        recommendedNextTopics: ["Exam Generator", "Mechanism Review"],
      }),
    ],
  },
]

export function listCurriculumRoadmaps(): CurriculumRoadmap[] {
  return CURRICULUM_ROADMAPS
}

export function getCurriculumRoadmap(id: string | null | undefined): CurriculumRoadmap {
  return CURRICULUM_ROADMAPS.find((roadmap) => roadmap.id === id) ?? CURRICULUM_ROADMAPS[0]
}

export function getCurriculumRoadmapMetrics() {
  return {
    roadmaps: CURRICULUM_ROADMAPS.length,
    roadmapTopics: CURRICULUM_ROADMAPS.reduce((sum, roadmap) => sum + roadmap.topics.length, 0),
    roadmapToolLinks: CURRICULUM_ROADMAPS.reduce(
      (sum, roadmap) => sum + roadmap.topics.reduce((topicSum, item) => topicSum + item.toolLinks.length, 0),
      0,
    ),
  }
}
