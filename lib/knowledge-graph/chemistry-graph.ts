import {
  deepLinkSlug,
  mechanismHref,
  molecularVisualizerHref,
  reactionHref,
  solverModuleHref,
} from "@/lib/deep-links"
import { formulaHref } from "@/lib/formula-sheet"
import type {
  ChemistryKnowledgeGraph,
  ChemistryKnowledgeGraphMetrics,
  KnowledgeGraphAction,
  KnowledgeGraphCurriculum,
  KnowledgeGraphEdge,
  KnowledgeGraphEdgeType,
  KnowledgeGraphNode,
  KnowledgeGraphNodeType,
  KnowledgeGraphPathway,
} from "./graph-types"

function practiceHref(topic: string): string {
  return `/practice-generator?topic=${encodeURIComponent(topic)}&source=database`
}

function examHref(topic: string): string {
  return `/exam-generator?topic=${encodeURIComponent(topic)}&source=database`
}

function node(input: Omit<KnowledgeGraphNode, "searchText">): KnowledgeGraphNode {
  return {
    ...input,
    searchText: [
      input.label,
      input.subtitle ?? "",
      input.description,
      input.type,
      input.curriculum,
      ...input.pathwayIds,
      ...input.actions.map((action) => action.label),
    ]
      .join(" ")
      .toLowerCase(),
  }
}

function action(label: KnowledgeGraphAction["label"], href: string): KnowledgeGraphAction {
  return { label, href }
}

function edge(
  pathwayId: string,
  from: string,
  to: string,
  type: KnowledgeGraphEdgeType,
  label: string,
): KnowledgeGraphEdge {
  return {
    id: `${pathwayId}:${from}->${to}:${type}`,
    from,
    to,
    type,
    label,
    pathwayId,
  }
}

export const CHEMISTRY_GRAPH_PATHWAYS: KnowledgeGraphPathway[] = [
  {
    id: "alcohol-pathway",
    title: "Alcohol Oxidation and Esterification",
    curriculum: "Organic Chemistry",
    description:
      "Ethanol oxidizes to ethanal, oxidizes again to ethanoic acid, then reacts through esterification to form ethyl ethanoate.",
    nodeIds: [
      "compound:ethanol",
      "reaction:rxn-organic-ethanol-oxidation",
      "compound:ethanal",
      "reaction:rxn-organic-ethanal-oxidation",
      "compound:ethanoic-acid",
      "mechanism:esterification",
      "reaction:rxn-organic-ethanol-ethanoic-acid",
      "compound:ethyl-ethanoate",
    ],
  },
  {
    id: "alkene-pathway",
    title: "Alkene Addition Map",
    curriculum: "Organic Chemistry",
    description:
      "Ethene-style alkene chemistry branches into hydration, bromination, and hydrogenation outcomes.",
    nodeIds: [
      "compound:ethene",
      "mechanism:alkene-hydration",
      "compound:ethanol",
      "reaction:rxn-organic-ethene-bromine",
      "compound:dibromoethane",
      "reaction:rxn-organic-ethene-hydrogen",
      "compound:ethane",
    ],
  },
  {
    id: "acid-base-pathway",
    title: "Acid/Base Calculation Chain",
    curriculum: "General Chemistry",
    description:
      "Neutralization connects HCl and NaOH to salt and water, then pH formulas and the pH solver support practice.",
    nodeIds: [
      "compound:hydrochloric-acid",
      "compound:sodium-hydroxide",
      "reaction:rxn-neutralization-hcl-naoh",
      "compound:sodium-chloride",
      "compound:water",
      "formula:acids-bases-ph",
      "solver:ph",
      "practiceTopic:Acids and Bases",
    ],
  },
  {
    id: "stoichiometry-pathway",
    title: "Stoichiometry Practice Chain",
    curriculum: "General Chemistry",
    description:
      "Balanced reaction records feed mole-ratio formulas, the stoichiometry solver, database practice, and exam sets.",
    nodeIds: [
      "reaction:database",
      "formula:stoichiometry-limiting-reagent",
      "solver:stoichiometry",
      "practiceTopic:Stoichiometry",
      "practiceTopic:Exam Questions",
    ],
  },
]

export const CHEMISTRY_GRAPH_NODES: KnowledgeGraphNode[] = [
  node({
    id: "compound:ethanol",
    type: "compound",
    label: "ethanol",
    subtitle: "CH3CH2OH",
    description: "A primary alcohol that can oxidize to ethanal and participate in esterification.",
    curriculum: "Organic Chemistry",
    pathwayIds: ["alcohol-pathway", "alkene-pathway"],
    x: 80,
    y: 120,
    actions: [
      action("View Compound", molecularVisualizerHref("ethanol")),
      action("Practice This", practiceHref("Organic Reactions")),
      action("Generate Exam Set", examHref("Organic Reactions")),
    ],
  }),
  node({
    id: "functionalGroup:alcohol",
    type: "functionalGroup",
    label: "Alcohol",
    subtitle: "-OH",
    description: "The hydroxyl functional group explains alcohol polarity, IR behavior, and oxidation chemistry.",
    curriculum: "Organic Chemistry",
    pathwayIds: ["alcohol-pathway"],
    x: 80,
    y: 250,
    actions: [
      action("View Compound", molecularVisualizerHref("ethanol")),
      action("Practice This", practiceHref("Functional Group Identification")),
      action("Generate Exam Set", examHref("Functional Group Identification")),
    ],
  }),
  node({
    id: "reaction:rxn-organic-ethanol-oxidation",
    type: "reaction",
    label: "Alcohol oxidation",
    subtitle: "ethanol -> ethanal",
    description: "Oxidation moves ethanol toward the aldehyde oxidation level.",
    curriculum: "Organic Chemistry",
    pathwayIds: ["alcohol-pathway"],
    x: 260,
    y: 120,
    actions: [
      action("View Reaction", reactionHref("rxn-organic-ethanol-oxidation")),
      action("View Mechanism", mechanismHref("alcohol-oxidation")),
      action("Practice This", practiceHref("Organic Reactions")),
    ],
  }),
  node({
    id: "compound:ethanal",
    type: "compound",
    label: "ethanal",
    subtitle: "CH3CHO",
    description: "An aldehyde intermediate between ethanol and ethanoic acid.",
    curriculum: "Organic Chemistry",
    pathwayIds: ["alcohol-pathway"],
    x: 430,
    y: 120,
    actions: [
      action("View Compound", molecularVisualizerHref("ethanal")),
      action("Practice This", practiceHref("IR Spectroscopy")),
      action("Generate Exam Set", examHref("IR Spectroscopy")),
    ],
  }),
  node({
    id: "reaction:rxn-organic-ethanal-oxidation",
    type: "reaction",
    label: "Aldehyde oxidation",
    subtitle: "ethanal -> ethanoic acid",
    description: "Further oxidation of an aldehyde produces a carboxylic acid.",
    curriculum: "Organic Chemistry",
    pathwayIds: ["alcohol-pathway"],
    x: 600,
    y: 120,
    actions: [
      action("View Reaction", reactionHref("rxn-organic-ethanal-oxidation")),
      action("Practice This", practiceHref("Organic Reactions")),
    ],
  }),
  node({
    id: "compound:ethanoic-acid",
    type: "compound",
    label: "ethanoic acid",
    subtitle: "CH3COOH",
    description: "A carboxylic acid that reacts with alcohols to form esters.",
    curriculum: "Organic Chemistry",
    pathwayIds: ["alcohol-pathway"],
    x: 770,
    y: 120,
    actions: [
      action("View Compound", molecularVisualizerHref("ethanoic-acid")),
      action("Practice This", practiceHref("Functional Group Identification")),
    ],
  }),
  node({
    id: "mechanism:esterification",
    type: "mechanism",
    label: "Esterification",
    subtitle: "acid + alcohol -> ester",
    description: "A mechanism connecting carboxylic acids and alcohols to esters under acid catalysis.",
    curriculum: "Organic Chemistry",
    pathwayIds: ["alcohol-pathway"],
    x: 950,
    y: 120,
    actions: [
      action("View Mechanism", mechanismHref("esterification")),
      action("View Reaction", reactionHref("rxn-organic-ethanol-ethanoic-acid")),
      action("Practice This", practiceHref("Organic Mechanisms")),
      action("Generate Exam Set", examHref("Organic Mechanisms")),
    ],
  }),
  node({
    id: "reaction:rxn-organic-ethanol-ethanoic-acid",
    type: "reaction",
    label: "Ethanol esterification",
    subtitle: "ethyl ethanoate formation",
    description: "Ethanoic acid and ethanol form ethyl ethanoate and water.",
    curriculum: "Organic Chemistry",
    pathwayIds: ["alcohol-pathway"],
    x: 1130,
    y: 120,
    actions: [
      action("View Reaction", reactionHref("rxn-organic-ethanol-ethanoic-acid")),
      action("View Mechanism", mechanismHref("esterification")),
    ],
  }),
  node({
    id: "compound:ethyl-ethanoate",
    type: "compound",
    label: "ethyl ethanoate",
    subtitle: "CH3COOCH2CH3",
    description: "An ester product with a carbonyl and C-O single-bond pattern.",
    curriculum: "Organic Chemistry",
    pathwayIds: ["alcohol-pathway"],
    x: 1320,
    y: 120,
    actions: [
      action("View Compound", molecularVisualizerHref("ethyl-ethanoate")),
      action("Practice This", practiceHref("Functional Group Identification")),
    ],
  }),
  node({
    id: "compound:ethene",
    type: "compound",
    label: "ethene",
    subtitle: "C2H4",
    description: "An alkene starting point for addition reactions across a C=C double bond.",
    curriculum: "Organic Chemistry",
    pathwayIds: ["alkene-pathway"],
    x: 80,
    y: 440,
    actions: [
      action("View Compound", molecularVisualizerHref("ethene")),
      action("Practice This", practiceHref("Organic Reactions")),
    ],
  }),
  node({
    id: "mechanism:alkene-hydration",
    type: "mechanism",
    label: "Alkene hydration",
    subtitle: "alkene -> alcohol",
    description: "Water adds across an alkene double bond conceptually to form an alcohol.",
    curriculum: "Organic Chemistry",
    pathwayIds: ["alkene-pathway"],
    x: 330,
    y: 340,
    actions: [
      action("View Mechanism", mechanismHref("alkene-hydration")),
      action("View Reaction", reactionHref("alkene-hydration")),
      action("Practice This", practiceHref("Organic Mechanisms")),
    ],
  }),
  node({
    id: "reaction:rxn-organic-ethene-bromine",
    type: "reaction",
    label: "Alkene bromination",
    subtitle: "ethene + Br2",
    description: "Bromine adds across the double bond, producing a dibromoalkane.",
    curriculum: "Organic Chemistry",
    pathwayIds: ["alkene-pathway"],
    x: 330,
    y: 440,
    actions: [
      action("View Reaction", reactionHref("alkene-bromination")),
      action("View Mechanism", mechanismHref("alkene-bromination")),
      action("Practice This", practiceHref("Organic Mechanisms")),
    ],
  }),
  node({
    id: "reaction:rxn-organic-ethene-hydrogen",
    type: "reaction",
    label: "Alkene hydrogenation",
    subtitle: "ethene + H2",
    description: "Hydrogen adds across a C=C bond to give a saturated alkane.",
    curriculum: "Organic Chemistry",
    pathwayIds: ["alkene-pathway"],
    x: 330,
    y: 540,
    actions: [
      action("View Reaction", reactionHref("rxn-organic-ethene-hydrogen")),
      action("View Mechanism", mechanismHref("alkene-hydrogenation")),
      action("Practice This", practiceHref("Organic Reactions")),
    ],
  }),
  node({
    id: "compound:dibromoethane",
    type: "compound",
    label: "1,2-dibromoethane",
    subtitle: "C2H4Br2",
    description: "A vicinal dibromoalkane product from bromination of ethene.",
    curriculum: "Organic Chemistry",
    pathwayIds: ["alkene-pathway"],
    x: 590,
    y: 440,
    actions: [
      action("View Reaction", reactionHref("alkene-bromination")),
      action("Practice This", practiceHref("Organic Reactions")),
    ],
  }),
  node({
    id: "compound:ethane",
    type: "compound",
    label: "ethane",
    subtitle: "C2H6",
    description: "A saturated alkane product from hydrogenation.",
    curriculum: "Organic Chemistry",
    pathwayIds: ["alkene-pathway"],
    x: 590,
    y: 540,
    actions: [
      action("View Compound", molecularVisualizerHref("ethane")),
      action("Practice This", practiceHref("Organic Reactions")),
    ],
  }),
  node({
    id: "compound:hydrochloric-acid",
    type: "compound",
    label: "hydrochloric acid",
    subtitle: "HCl(aq)",
    description: "A strong acid in the neutralization pathway.",
    curriculum: "General Chemistry",
    pathwayIds: ["acid-base-pathway"],
    x: 80,
    y: 760,
    actions: [
      action("View Compound", molecularVisualizerHref("hydrochloric-acid")),
      action("Practice This", practiceHref("Acids and Bases")),
    ],
  }),
  node({
    id: "compound:sodium-hydroxide",
    type: "compound",
    label: "sodium hydroxide",
    subtitle: "NaOH(aq)",
    description: "A strong base in the neutralization pathway.",
    curriculum: "General Chemistry",
    pathwayIds: ["acid-base-pathway"],
    x: 80,
    y: 880,
    actions: [
      action("View Compound", molecularVisualizerHref("sodium-hydroxide")),
      action("Practice This", practiceHref("Acids and Bases")),
    ],
  }),
  node({
    id: "reaction:rxn-neutralization-hcl-naoh",
    type: "reaction",
    label: "Neutralization",
    subtitle: "HCl + NaOH",
    description: "Acid and base react to form salt and water.",
    curriculum: "General Chemistry",
    pathwayIds: ["acid-base-pathway"],
    x: 320,
    y: 820,
    actions: [
      action("View Reaction", reactionHref("rxn-neutralization-hcl-naoh")),
      action("Practice This", practiceHref("Reaction Types")),
      action("Generate Exam Set", examHref("Acids and Bases")),
    ],
  }),
  node({
    id: "compound:sodium-chloride",
    type: "compound",
    label: "sodium chloride",
    subtitle: "NaCl",
    description: "The salt product from HCl and NaOH neutralization.",
    curriculum: "General Chemistry",
    pathwayIds: ["acid-base-pathway"],
    x: 560,
    y: 760,
    actions: [
      action("View Compound", molecularVisualizerHref("sodium-chloride")),
      action("Practice This", practiceHref("Reaction Types")),
    ],
  }),
  node({
    id: "compound:water",
    type: "compound",
    label: "water",
    subtitle: "H2O",
    description: "The neutral molecular product in acid-base neutralization.",
    curriculum: "General Chemistry",
    pathwayIds: ["acid-base-pathway"],
    x: 560,
    y: 880,
    actions: [
      action("View Compound", molecularVisualizerHref("water")),
      action("Practice This", practiceHref("Acids and Bases")),
    ],
  }),
  node({
    id: "formula:acids-bases-ph",
    type: "formula",
    label: "pH formula",
    subtitle: "pH = -log[H+]",
    description: "A core acid-base formula for hydrogen ion concentration.",
    curriculum: "General Chemistry",
    pathwayIds: ["acid-base-pathway"],
    x: 800,
    y: 820,
    actions: [
      action("View Formula", formulaHref("acids-bases-ph")),
      action("Open Solver", solverModuleHref("ph")),
      action("Practice This", practiceHref("Acids and Bases")),
    ],
  }),
  node({
    id: "solver:ph",
    type: "solver",
    label: "pH solver",
    subtitle: "calculation module",
    description: "Calculates pH and pOH from hydrogen ion concentration.",
    curriculum: "General Chemistry",
    pathwayIds: ["acid-base-pathway"],
    x: 1030,
    y: 820,
    actions: [
      action("Open Solver", solverModuleHref("ph")),
      action("View Formula", formulaHref("acids-bases-ph")),
      action("Practice This", practiceHref("Chemistry Calculations")),
    ],
  }),
  node({
    id: "practiceTopic:Acids and Bases",
    type: "practiceTopic",
    label: "Acids and Bases Practice",
    subtitle: "database questions",
    description: "Practice pH, neutralization, strong/weak acid reasoning, and acid-base calculations.",
    curriculum: "General Chemistry",
    pathwayIds: ["acid-base-pathway"],
    x: 1260,
    y: 820,
    actions: [
      action("Practice This", practiceHref("Acids and Bases")),
      action("Generate Exam Set", examHref("Acids and Bases")),
    ],
  }),
  node({
    id: "reaction:database",
    type: "reaction",
    label: "Reaction Database",
    subtitle: "balanced equations",
    description: "Local reaction records provide balanced equations and deterministic classifications.",
    curriculum: "General Chemistry",
    pathwayIds: ["stoichiometry-pathway"],
    x: 80,
    y: 1120,
    actions: [
      action("View Reaction", "/reaction-database"),
      action("Practice This", practiceHref("Reaction Balancing")),
    ],
  }),
  node({
    id: "formula:stoichiometry-limiting-reagent",
    type: "formula",
    label: "Mole ratio formula",
    subtitle: "coefficient ratio",
    description: "Balanced coefficients connect known reactants to target products.",
    curriculum: "General Chemistry",
    pathwayIds: ["stoichiometry-pathway"],
    x: 330,
    y: 1120,
    actions: [
      action("View Formula", formulaHref("stoichiometry-limiting-reagent")),
      action("Open Solver", solverModuleHref("stoichiometry")),
    ],
  }),
  node({
    id: "solver:stoichiometry",
    type: "solver",
    label: "Stoichiometry solver",
    subtitle: "mole-ratio module",
    description: "Uses a balanced reaction record to convert known moles into product amount.",
    curriculum: "General Chemistry",
    pathwayIds: ["stoichiometry-pathway"],
    x: 600,
    y: 1120,
    actions: [
      action("Open Solver", solverModuleHref("stoichiometry")),
      action("View Formula", formulaHref("stoichiometry-limiting-reagent")),
      action("Practice This", practiceHref("Chemistry Calculations")),
    ],
  }),
  node({
    id: "practiceTopic:Stoichiometry",
    type: "practiceTopic",
    label: "Stoichiometry practice",
    subtitle: "database questions",
    description: "Generate deterministic mole-ratio, limiting reagent, and calculation practice.",
    curriculum: "General Chemistry",
    pathwayIds: ["stoichiometry-pathway"],
    x: 870,
    y: 1120,
    actions: [
      action("Practice This", practiceHref("Stoichiometry")),
      action("Generate Exam Set", examHref("Stoichiometry")),
    ],
  }),
  node({
    id: "practiceTopic:Exam Questions",
    type: "practiceTopic",
    label: "Exam questions",
    subtitle: "database exam set",
    description: "Move from individual practice into a focused database-only exam set.",
    curriculum: "General Chemistry",
    pathwayIds: ["stoichiometry-pathway"],
    x: 1130,
    y: 1120,
    actions: [
      action("Generate Exam Set", examHref("Stoichiometry")),
      action("Practice This", practiceHref("Stoichiometry")),
    ],
  }),
]

export const CHEMISTRY_GRAPH_EDGES: KnowledgeGraphEdge[] = [
  edge("alcohol-pathway", "compound:ethanol", "functionalGroup:alcohol", "contains", "contains"),
  edge("alcohol-pathway", "compound:ethanol", "reaction:rxn-organic-ethanol-oxidation", "oxidizesTo", "oxidizes"),
  edge("alcohol-pathway", "reaction:rxn-organic-ethanol-oxidation", "compound:ethanal", "reactsTo", "forms"),
  edge("alcohol-pathway", "compound:ethanal", "reaction:rxn-organic-ethanal-oxidation", "oxidizesTo", "oxidizes"),
  edge("alcohol-pathway", "reaction:rxn-organic-ethanal-oxidation", "compound:ethanoic-acid", "reactsTo", "forms"),
  edge("alcohol-pathway", "compound:ethanoic-acid", "mechanism:esterification", "usesMechanism", "uses"),
  edge("alcohol-pathway", "mechanism:esterification", "reaction:rxn-organic-ethanol-ethanoic-acid", "reactsTo", "drives"),
  edge("alcohol-pathway", "reaction:rxn-organic-ethanol-ethanoic-acid", "compound:ethyl-ethanoate", "reactsTo", "forms"),
  edge("alkene-pathway", "compound:ethene", "mechanism:alkene-hydration", "usesMechanism", "hydration"),
  edge("alkene-pathway", "mechanism:alkene-hydration", "compound:ethanol", "reactsTo", "forms alcohol"),
  edge("alkene-pathway", "compound:ethene", "reaction:rxn-organic-ethene-bromine", "reactsTo", "bromination"),
  edge("alkene-pathway", "reaction:rxn-organic-ethene-bromine", "compound:dibromoethane", "reactsTo", "forms"),
  edge("alkene-pathway", "compound:ethene", "reaction:rxn-organic-ethene-hydrogen", "reactsTo", "hydrogenation"),
  edge("alkene-pathway", "reaction:rxn-organic-ethene-hydrogen", "compound:ethane", "reactsTo", "forms"),
  edge("acid-base-pathway", "compound:hydrochloric-acid", "reaction:rxn-neutralization-hcl-naoh", "reactsTo", "acid"),
  edge("acid-base-pathway", "compound:sodium-hydroxide", "reaction:rxn-neutralization-hcl-naoh", "reactsTo", "base"),
  edge("acid-base-pathway", "reaction:rxn-neutralization-hcl-naoh", "compound:sodium-chloride", "reactsTo", "salt"),
  edge("acid-base-pathway", "reaction:rxn-neutralization-hcl-naoh", "compound:water", "reactsTo", "water"),
  edge("acid-base-pathway", "reaction:rxn-neutralization-hcl-naoh", "formula:acids-bases-ph", "usesFormula", "connects to pH"),
  edge("acid-base-pathway", "formula:acids-bases-ph", "solver:ph", "solvedBy", "solved by"),
  edge("acid-base-pathway", "solver:ph", "practiceTopic:Acids and Bases", "practiceWith", "practice"),
  edge("stoichiometry-pathway", "reaction:database", "formula:stoichiometry-limiting-reagent", "usesFormula", "balanced equation"),
  edge("stoichiometry-pathway", "formula:stoichiometry-limiting-reagent", "solver:stoichiometry", "solvedBy", "solved by"),
  edge("stoichiometry-pathway", "solver:stoichiometry", "practiceTopic:Stoichiometry", "practiceWith", "practice"),
  edge("stoichiometry-pathway", "practiceTopic:Stoichiometry", "practiceTopic:Exam Questions", "practiceWith", "exam set"),
]

export const CHEMISTRY_KNOWLEDGE_GRAPH: ChemistryKnowledgeGraph = {
  nodes: CHEMISTRY_GRAPH_NODES,
  edges: CHEMISTRY_GRAPH_EDGES,
  pathways: CHEMISTRY_GRAPH_PATHWAYS,
}

function matchesCurriculum(node: KnowledgeGraphNode, curriculum: KnowledgeGraphCurriculum | "All"): boolean {
  if (curriculum === "All") return true
  return node.curriculum === curriculum || node.curriculum === "Both"
}

function matchesQuery(node: KnowledgeGraphNode, query: string): boolean {
  if (!query.trim()) return true
  return node.searchText.includes(query.toLowerCase().trim())
}

export function filterKnowledgeGraph(input: {
  query?: string
  curriculum?: KnowledgeGraphCurriculum | "All"
}): ChemistryKnowledgeGraph {
  const query = input.query ?? ""
  const curriculum = input.curriculum ?? "All"
  const nodes = CHEMISTRY_GRAPH_NODES.filter((node) => matchesCurriculum(node, curriculum) && matchesQuery(node, query))
  const nodeIds = new Set(nodes.map((node) => node.id))
  const edges = CHEMISTRY_GRAPH_EDGES.filter((edge) => nodeIds.has(edge.from) && nodeIds.has(edge.to))
  const pathwayIds = new Set(nodes.flatMap((node) => node.pathwayIds))
  const pathways = CHEMISTRY_GRAPH_PATHWAYS.filter((pathway) => pathwayIds.has(pathway.id))

  return { nodes, edges, pathways }
}

export function getKnowledgeGraphNode(id: string | null | undefined): KnowledgeGraphNode | undefined {
  if (!id) return undefined
  const slug = deepLinkSlug(id)
  return (
    CHEMISTRY_GRAPH_NODES.find((node) => node.id === id) ??
    CHEMISTRY_GRAPH_NODES.find((node) => deepLinkSlug(node.id) === slug || deepLinkSlug(node.label) === slug)
  )
}

export function getKnowledgeGraphMetrics(): ChemistryKnowledgeGraphMetrics {
  const linkedRoutes = new Set(
    CHEMISTRY_GRAPH_NODES.flatMap((node) =>
      node.actions.map((action) => {
        const [route] = action.href.split("?")
        return route.replace(/^\/+/, "")
      }),
    ).filter(Boolean),
  )
  return {
    nodes: CHEMISTRY_GRAPH_NODES.length,
    edges: CHEMISTRY_GRAPH_EDGES.length,
    pathways: CHEMISTRY_GRAPH_PATHWAYS.length,
    linkedTools: linkedRoutes.size,
  }
}
