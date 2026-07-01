import type { LabActionId, VirtualLabExperiment, VirtualLabMode } from "./experiment-types"
import {
  experimentsForCompound,
  getVirtualLabExperiment,
  listVirtualLabExperiments,
} from "./experiment-library"

export interface VirtualLabBridge {
  label: string
  href: string
  experiment: VirtualLabExperiment
  reason: string
}

const mechanismExperimentMap: Record<string, string> = {
  esterification: "esterification-ethyl-acetate",
  "alkene-bromination": "cyclohexene-bromine-test",
  bromination: "cyclohexene-bromine-test",
}

const reactionExperimentMap: Record<string, string> = {
  "rxn-organic-ethanol-ethanoic-acid": "esterification-ethyl-acetate",
  "alkene-bromination": "cyclohexene-bromine-test",
  "rxn-organic-ethene-bromine": "cyclohexene-bromine-test",
}

const techniqueExperimentMap: Record<string, string> = {
  reflux: "esterification-ethyl-acetate",
  extraction: "esterification-ethyl-acetate",
  drying: "esterification-ethyl-acetate",
  evaporation: "esterification-ethyl-acetate",
  "ir-analysis": "caffeine-spectroscopy",
  "nmr-analysis": "caffeine-spectroscopy",
  "mass-spectrometry": "caffeine-spectroscopy",
  recrystallization: "aspirin-recrystallization",
  "vacuum-filtration": "aspirin-recrystallization",
  "melting-point": "aspirin-recrystallization",
  "qualitative-test": "cyclohexene-bromine-test",
  observation: "cyclohexene-bromine-test",
  "ph-measurement": "acid-base-ph-ammonia",
}

function normalizeId(id: string | null | undefined): string {
  return (id ?? "")
    .trim()
    .toLowerCase()
    .replace(/^compound:/, "")
    .replace(/^reaction:/, "")
    .replace(/^mechanism:/, "")
    .replace(/^labTechnique:/, "")
    .replace(/\s+/g, "-")
}

function experimentHref(experimentId: string, options?: { compoundId?: string; mode?: VirtualLabMode }): string {
  const params = new URLSearchParams({ experiment: experimentId })
  if (options?.compoundId) params.set("compound", options.compoundId)
  if (options?.mode) params.set("mode", options.mode)
  return `/virtual-lab?${params.toString()}`
}

function bridgeFromExperiment(
  experiment: VirtualLabExperiment | undefined,
  reason: string,
  options?: { compoundId?: string; mode?: VirtualLabMode },
): VirtualLabBridge | null {
  if (!experiment) return null
  return {
    label: "Open Virtual Lab",
    href: experimentHref(experiment.id, { compoundId: options?.compoundId ?? experiment.compoundId, mode: options?.mode }),
    experiment,
    reason,
  }
}

export function virtualLabHrefForExperiment(experimentId: string, mode?: VirtualLabMode): string | null {
  const experiment = getVirtualLabExperiment(normalizeId(experimentId))
  return experiment ? experimentHref(experiment.id, { compoundId: experiment.compoundId, mode }) : null
}

export function getVirtualLabBridgeForCompound(compoundId: string | null | undefined): VirtualLabBridge | null {
  const normalized = normalizeId(compoundId)
  const experiment = experimentsForCompound(normalized)[0]
  return bridgeFromExperiment(
    experiment,
    `ARSHLAB has a deterministic virtual experiment connected to ${normalized || "this compound"}.`,
    { compoundId: normalized || undefined },
  )
}

export function virtualLabHrefForCompound(compoundId: string | null | undefined): string | null {
  return getVirtualLabBridgeForCompound(compoundId)?.href ?? null
}

export function hasVirtualLabCoverageForCompound(compoundId: string | null | undefined): boolean {
  return Boolean(getVirtualLabBridgeForCompound(compoundId))
}

export function getVirtualLabBridgeForMechanism(mechanismId: string | null | undefined): VirtualLabBridge | null {
  const normalized = normalizeId(mechanismId)
  const experimentId = mechanismExperimentMap[normalized]
  return bridgeFromExperiment(
    experimentId ? getVirtualLabExperiment(experimentId) : undefined,
    "This mechanism has a matching deterministic lab scenario.",
  )
}

export function virtualLabHrefForMechanism(mechanismId: string | null | undefined): string | null {
  return getVirtualLabBridgeForMechanism(mechanismId)?.href ?? null
}

export function getVirtualLabBridgeForReaction(reactionId: string | null | undefined): VirtualLabBridge | null {
  const normalized = normalizeId(reactionId)
  const experimentId = reactionExperimentMap[normalized]
  return bridgeFromExperiment(
    experimentId ? getVirtualLabExperiment(experimentId) : undefined,
    "This reaction has a connected virtual experiment.",
  )
}

export function virtualLabHrefForReaction(reactionId: string | null | undefined): string | null {
  return getVirtualLabBridgeForReaction(reactionId)?.href ?? null
}

export function getVirtualLabBridgeForTechnique(techniqueId: string | null | undefined): VirtualLabBridge | null {
  const normalized = normalizeId(techniqueId)
  const experimentId = techniqueExperimentMap[normalized]
  return bridgeFromExperiment(
    experimentId ? getVirtualLabExperiment(experimentId) : undefined,
    "This lab technique is practiced in a deterministic virtual experiment.",
  )
}

export function virtualLabHrefForTechnique(techniqueId: string | null | undefined): string | null {
  return getVirtualLabBridgeForTechnique(techniqueId)?.href ?? null
}

export function unsupportedVirtualLabMessage(compoundId: string | null | undefined): string {
  const normalized = normalizeId(compoundId)
  return normalized
    ? `No guided virtual experiment is linked to ${normalized} yet. Choose a supported experiment from the library, or use the linked practice and knowledge graph tools while lab coverage expands.`
    : "Choose a compound or experiment to open a deterministic virtual lab."
}

export function virtualLabControlGroups(experiment: VirtualLabExperiment): Array<{
  id: string
  label: string
  actions: LabActionId[]
}> {
  const actions = Array.from(new Set(experiment.steps.map((step) => step.action)))
  const analysis = actions.filter((action) => action.startsWith("analyze") || action === "measure-ph" || action === "record-temperature")
  const workup = actions.filter((action) => ["filter", "extract", "distill", "recrystallize", "purify", "wait"].includes(action))
  const setup = actions.filter((action) => !analysis.includes(action) && !workup.includes(action))
  return [
    { id: "setup", label: "Setup and reaction", actions: setup },
    { id: "workup", label: "Workup", actions: workup },
    { id: "analysis", label: "Analysis", actions: analysis },
  ].filter((group) => group.actions.length > 0)
}

export function virtualLabBridgeMetrics() {
  const experiments = listVirtualLabExperiments()
  return {
    compoundBridges: new Set(experiments.flatMap((experiment) => [experiment.compoundId, ...experiment.chemicals.map((chemical) => chemical.id)])).size,
    mechanismBridges: Object.keys(mechanismExperimentMap).length,
    reactionBridges: Object.keys(reactionExperimentMap).length,
    techniqueBridges: Object.keys(techniqueExperimentMap).length,
  }
}
