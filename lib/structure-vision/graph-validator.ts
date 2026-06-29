import type { MolecularGraph } from "../vision/molecular-graph"
import { validateBridges, type BridgeValidationResult } from "./bridge-validator"
import { validateCycles, type CycleValidationResult } from "./cycle-validator"
import { validateEdges, type EdgeValidationResult } from "./edge-validator"
import { analyzeGraphSanity, type GraphSanityResult } from "./graph-sanity"
import { reconstructTopologyVariants, type TopologyReconstructionResult } from "./topology-reconstructor"

export type GraphValidationStatus = "passed" | "passed-with-warnings" | "failed"

export interface GraphValidationMetrics {
  primitiveNodes: number
  primitiveEdges: number
  acceptedEdges: number
  weakEdges: number
  rejectedEdges: number
  recoveredEdges: number
  safeBridges: number
  unsafeBridges: number
  acceptedCycles: number
  rejectedCycles: number
  connectedComponents: number
  topologyScore: number
  chemicalLegality: number
  visualAgreement: number
}

export interface GraphValidationResult {
  status: GraphValidationStatus
  message: string
  candidateGateOpen: boolean
  edgeValidation: EdgeValidationResult
  bridgeValidation: BridgeValidationResult
  cycleValidation: CycleValidationResult
  sanity: GraphSanityResult
  topology: TopologyReconstructionResult
  selectedGraph: MolecularGraph | null
  metrics: GraphValidationMetrics
  blockingReasons: string[]
  warningReasons: string[]
}

function statusLabel(status: GraphValidationStatus): string {
  if (status === "passed") return "Graph Validation PASSED"
  if (status === "passed-with-warnings") return "Graph Validation PASSED WITH WARNINGS"
  return "Graph Validation FAILED"
}

export function validateGraphTopology(graph: MolecularGraph): GraphValidationResult {
  const edgeValidation = validateEdges(graph)
  const bridgeValidation = validateBridges(graph, edgeValidation)
  const cycleValidation = validateCycles(graph, edgeValidation)
  const sanity = analyzeGraphSanity(graph, edgeValidation, cycleValidation)
  const topology = reconstructTopologyVariants(graph, edgeValidation, bridgeValidation, cycleValidation, sanity)
  const selectedVariant = topology.variants.find((variant) => variant.id === topology.selectedVariantId) ?? null
  const selectedGraph = topology.selectedGraph

  const blockingReasons: string[] = []
  const warningReasons: string[] = []
  const errorIssues = sanity.issues.filter((issue) => issue.severity === "error")
  const warningIssues = sanity.issues.filter((issue) => issue.severity === "warning")
  const rejectionRatio = edgeValidation.rejected / Math.max(1, graph.bonds.length)

  if (!graph.nodes.length || !graph.bonds.length) blockingReasons.push("No stable primitive molecular graph was reconstructed.")
  if (!selectedGraph || !selectedVariant) blockingReasons.push("No topology variant passed legality and visual-agreement scoring.")
  if (selectedVariant && selectedVariant.chemicalLegality < 50) blockingReasons.push("Selected topology has low chemical-legality score.")
  if (errorIssues.length >= 2) blockingReasons.push(errorIssues.map((issue) => issue.explanation).join(" "))
  if (edgeValidation.crossingPairs.length >= 2) blockingReasons.push("Multiple crossing bonds remain in the primitive graph.")
  if (rejectionRatio > 0.42 && edgeValidation.rejected >= 3) blockingReasons.push("Too many primitive edges were rejected for a reliable topology.")
  if (bridgeValidation.unsafe > 0 && bridgeValidation.unsafe >= bridgeValidation.likely + bridgeValidation.guaranteed + 2) {
    blockingReasons.push("Recovered bridge evidence is mostly unsafe.")
  }

  if (edgeValidation.weak > 0) warningReasons.push(`${edgeValidation.weak} weak edge${edgeValidation.weak === 1 ? "" : "s"} retained for topology scoring.`)
  if (edgeValidation.recovered > 0) warningReasons.push(`${edgeValidation.recovered} recovered edge${edgeValidation.recovered === 1 ? "" : "s"} required bridge validation.`)
  if (bridgeValidation.possible > 0) warningReasons.push(`${bridgeValidation.possible} possible bridge${bridgeValidation.possible === 1 ? "" : "s"} withheld from conservative topology.`)
  if (cycleValidation.warnings > 0) warningReasons.push("One or more rings passed with geometric warnings.")
  warningReasons.push(...warningIssues.map((issue) => issue.explanation))
  if (selectedVariant && selectedVariant.topologyScore < 72) warningReasons.push("Selected topology is usable but moderate confidence.")

  const status: GraphValidationStatus = blockingReasons.length
    ? "failed"
    : warningReasons.length
      ? "passed-with-warnings"
      : "passed"

  const message = status === "failed"
    ? "Graph reconstruction unreliable. Chemistry interpretation intentionally skipped."
    : `${statusLabel(status)}. ${topology.explanation}`

  return {
    status,
    message,
    candidateGateOpen: status !== "failed",
    edgeValidation,
    bridgeValidation,
    cycleValidation,
    sanity,
    topology,
    selectedGraph,
    metrics: {
      primitiveNodes: graph.nodes.length,
      primitiveEdges: graph.bonds.length,
      acceptedEdges: edgeValidation.accepted,
      weakEdges: edgeValidation.weak,
      rejectedEdges: edgeValidation.rejected,
      recoveredEdges: edgeValidation.recovered,
      safeBridges: bridgeValidation.guaranteed + bridgeValidation.likely,
      unsafeBridges: bridgeValidation.unsafe,
      acceptedCycles: cycleValidation.accepted,
      rejectedCycles: cycleValidation.rejected,
      connectedComponents: sanity.fingerprint.connectedComponents,
      topologyScore: selectedVariant?.topologyScore ?? 0,
      chemicalLegality: selectedVariant?.chemicalLegality ?? 0,
      visualAgreement: selectedVariant?.visualAgreement ?? 0,
    },
    blockingReasons,
    warningReasons: Array.from(new Set(warningReasons)),
  }
}
