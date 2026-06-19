import type { DatabaseMeta, EntityKind } from "./types"
import { ALL_COMPOUNDS } from "./compounds"
import { ALL_ELEMENTS } from "./periodic-table"
import { ALL_IONS } from "./ions"
import { HYBRIDIZATION_PRESETS } from "./hybridization"
import { ALL_FUNCTIONAL_GROUPS } from "./functional-groups"
import { ALL_ORBITALS } from "./orbitals"
import { ALL_SPECTROSCOPY } from "./spectroscopy"
import { REACTION_TEMPLATES } from "./reactions/families"
import { REACTION_RECORDS } from "../reactions"
import { getMechanismMetrics } from "../mechanisms"
import { getSolverMetrics } from "@/lib/solver-engine"
import { getFormulaMetrics } from "@/lib/formula-sheet"
import { getCurriculumRoadmapMetrics } from "@/lib/curriculum/roadmap"
import { getKnowledgeGraphMetrics } from "@/lib/knowledge-graph/chemistry-graph"
import { getStructureScannerMetrics } from "@/lib/structure-scanner/scanner-database"
import { getSynthesisPathfinderMetrics } from "@/lib/synthesis/pathfinder"
import { getReactionConditionMetrics } from "@/lib/reaction-conditions/reaction-conditions"
import { getSpectroscopyMetrics } from "@/lib/spectroscopy/spectroscopy-engine"
import { getLabMetrics } from "@/lib/lab/lab-engine"
import { COMPOUND_PATHWAYS, MOLECULAR_STRUCTURES, SPECTROSCOPY_MAPPINGS, countFunctionalGroupHighlights } from "../structures"
import { VSEPR_PRESETS } from "./vsepr/engine"
import { ALL_LEWIS_STRUCTURES } from "./lewis/templates"
import { QUESTION_TOPICS } from "./questions/topics"
import { EDUCATION_HUB_SECTIONS } from "./education/hub"

export const DATABASE_VERSION = "5.0.0"

export function getDatabaseMeta(): DatabaseMeta {
  const mechanismMetrics = getMechanismMetrics()
  const solverMetrics = getSolverMetrics()
  const formulaMetrics = getFormulaMetrics()
  const curriculumRoadmapMetrics = getCurriculumRoadmapMetrics()
  const knowledgeGraphMetrics = getKnowledgeGraphMetrics()
  const structureScannerMetrics = getStructureScannerMetrics()
  const synthesisPathfinderMetrics = getSynthesisPathfinderMetrics()
  const reactionConditionMetrics = getReactionConditionMetrics()
  const spectroscopyExplorerMetrics = getSpectroscopyMetrics()
  const labMetrics = getLabMetrics()
  return {
    version: DATABASE_VERSION,
    updatedAt: new Date().toISOString().split("T")[0],
    counts: {
      compounds: ALL_COMPOUNDS.length,
      elements: ALL_ELEMENTS.length,
      ions: ALL_IONS.length,
      hybridizationPresets: HYBRIDIZATION_PRESETS.length,
      functionalGroups: ALL_FUNCTIONAL_GROUPS.length,
      orbitals: ALL_ORBITALS.length,
      spectroscopy: ALL_SPECTROSCOPY.length,
      reactions: REACTION_TEMPLATES.length,
      reactionRecords: REACTION_RECORDS.length,
      molecularStructures: MOLECULAR_STRUCTURES.length,
      functionalGroupHighlights: countFunctionalGroupHighlights(),
      spectroscopyMappings: SPECTROSCOPY_MAPPINGS.length,
      compoundPathways: COMPOUND_PATHWAYS.length,
      mechanisms: mechanismMetrics.mechanismsAvailable,
      mechanismSteps: mechanismMetrics.mechanismSteps,
      mechanismExercises: mechanismMetrics.interactiveExercises,
      solverModules: solverMetrics.solverModules,
      solverExamples: solverMetrics.workedExamplesGenerated,
      formulaRecords: formulaMetrics.formulas,
      formulaCategories: formulaMetrics.categories,
      curriculumRoadmaps: curriculumRoadmapMetrics.roadmaps,
      curriculumRoadmapTopics: curriculumRoadmapMetrics.roadmapTopics,
      curriculumRoadmapToolLinks: curriculumRoadmapMetrics.roadmapToolLinks,
      knowledgeGraphNodes: knowledgeGraphMetrics.nodes,
      knowledgeGraphEdges: knowledgeGraphMetrics.edges,
      knowledgeGraphPathways: knowledgeGraphMetrics.pathways,
      knowledgeGraphLinkedTools: knowledgeGraphMetrics.linkedTools,
      structureScannerCompounds: structureScannerMetrics.compounds,
      structureScannerFunctionalGroups: structureScannerMetrics.functionalGroups,
      structureScannerVisualizerLinks: structureScannerMetrics.visualizerLinks,
      structureScannerReactionGraphLinks: structureScannerMetrics.reactionGraphLinks,
      synthesisPathfinderCompounds: synthesisPathfinderMetrics.compounds,
      synthesisPathfinderGraphNodes: synthesisPathfinderMetrics.graphNodes,
      synthesisPathfinderGraphEdges: synthesisPathfinderMetrics.graphEdges,
      reactionConditionRecords: reactionConditionMetrics.records,
      reactionConditionMechanismFamilies: reactionConditionMetrics.mechanismFamilies,
      reactionConditionReagentSets: reactionConditionMetrics.reagentSets,
      spectroscopyExplorerSignals: spectroscopyExplorerMetrics.signalRecords,
      spectroscopyExplorerCompoundProfiles: spectroscopyExplorerMetrics.compoundProfiles,
      spectroscopyExplorerReactionChanges: spectroscopyExplorerMetrics.reactionChangeRecords,
      labTechniques: labMetrics.techniques,
      labCategories: labMetrics.categories,
      labEquipmentItems: labMetrics.equipmentItems,
      vseprPresets: VSEPR_PRESETS.length,
      lewisStructures: ALL_LEWIS_STRUCTURES.length,
      questionTopics: QUESTION_TOPICS.length,
      educationSections: EDUCATION_HUB_SECTIONS.length,
    },
  }
}

export function getCount(kind: EntityKind): number {
  switch (kind) {
    case "compound":
      return ALL_COMPOUNDS.length
    case "element":
      return ALL_ELEMENTS.length
    case "ion":
      return ALL_IONS.length
    case "functional-group":
      return ALL_FUNCTIONAL_GROUPS.length
    case "orbital":
      return ALL_ORBITALS.length
    case "spectroscopy":
      return ALL_SPECTROSCOPY.length
    case "reaction":
      return REACTION_TEMPLATES.length
    default:
      return 0
  }
}

export {
  ALL_COMPOUNDS,
  ALL_ELEMENTS,
  ALL_IONS,
  HYBRIDIZATION_PRESETS,
  ALL_FUNCTIONAL_GROUPS,
  ALL_ORBITALS,
  ALL_SPECTROSCOPY,
  COMPOUND_PATHWAYS,
  MOLECULAR_STRUCTURES,
  SPECTROSCOPY_MAPPINGS,
  REACTION_TEMPLATES,
  VSEPR_PRESETS,
  ALL_LEWIS_STRUCTURES,
  QUESTION_TOPICS,
  EDUCATION_HUB_SECTIONS,
}
