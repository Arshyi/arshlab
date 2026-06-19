import {
  COMPOUND_SPECTROSCOPY_PROFILES,
  REACTION_SPECTRAL_CHANGES,
  SPECTROSCOPY_SIGNAL_RECORDS,
} from "./spectroscopy-database"
import type {
  CompoundSpectroscopyProfile,
  ReactionSpectralChange,
  SpectroscopyCategory,
  SpectroscopyMetrics,
  SpectroscopySignalRecord,
} from "./spectroscopy-types"

export const SPECTROSCOPY_CATEGORIES: SpectroscopyCategory[] = ["IR", "1H NMR", "13C NMR", "Mass Spec"]

export function spectroscopySlug(value: string | null | undefined): string {
  return decodeURIComponent(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function searchableSignal(record: SpectroscopySignalRecord): string {
  return [
    record.id,
    record.category,
    record.signal,
    record.range,
    record.functionalGroup,
    record.explanation,
    ...record.foundIn,
    ...record.examClues,
    ...record.aliases,
  ]
    .join(" ")
    .toLowerCase()
}

export function listSpectroscopySignals(category?: SpectroscopyCategory): SpectroscopySignalRecord[] {
  return category ? SPECTROSCOPY_SIGNAL_RECORDS.filter((record) => record.category === category) : SPECTROSCOPY_SIGNAL_RECORDS
}

export function getSpectroscopySignal(id: string | null | undefined): SpectroscopySignalRecord | undefined {
  if (!id) return undefined
  const slug = spectroscopySlug(id)
  return SPECTROSCOPY_SIGNAL_RECORDS.find(
    (record) =>
      spectroscopySlug(record.id) === slug ||
      spectroscopySlug(record.signal) === slug ||
      spectroscopySlug(record.functionalGroup) === slug ||
      record.aliases.some((alias) => spectroscopySlug(alias) === slug),
  )
}

export function searchSpectroscopySignals(query: string, category?: SpectroscopyCategory): SpectroscopySignalRecord[] {
  const normalized = query.toLowerCase().trim()
  const candidates = listSpectroscopySignals(category)
  if (!normalized) return candidates
  return candidates.filter((record) => searchableSignal(record).includes(normalized))
}

export function listCompoundSpectroscopyProfiles(): CompoundSpectroscopyProfile[] {
  return COMPOUND_SPECTROSCOPY_PROFILES
}

export function getCompoundSpectroscopyProfile(compoundId: string | null | undefined): CompoundSpectroscopyProfile | undefined {
  if (!compoundId) return undefined
  const slug = spectroscopySlug(compoundId)
  return COMPOUND_SPECTROSCOPY_PROFILES.find(
    (profile) =>
      spectroscopySlug(profile.compoundId) === slug ||
      spectroscopySlug(profile.compoundName) === slug ||
      spectroscopySlug(profile.id) === slug,
  )
}

export function getExpectedIrSignals(profile: CompoundSpectroscopyProfile | undefined): SpectroscopySignalRecord[] {
  if (!profile) return []
  return profile.irSignalIds
    .map((id) => getSpectroscopySignal(id))
    .filter((record): record is SpectroscopySignalRecord => Boolean(record))
}

export function listReactionSpectralChanges(): ReactionSpectralChange[] {
  return REACTION_SPECTRAL_CHANGES
}

export function getReactionSpectralChanges(reactionId: string | null | undefined): ReactionSpectralChange | undefined {
  if (!reactionId) return undefined
  const slug = spectroscopySlug(reactionId)
  return REACTION_SPECTRAL_CHANGES.find(
    (record) => spectroscopySlug(record.reactionId) === slug || spectroscopySlug(record.reactionName) === slug,
  )
}

export function getSpectroscopyMetrics(): SpectroscopyMetrics {
  return {
    signalRecords: SPECTROSCOPY_SIGNAL_RECORDS.length,
    irSignals: SPECTROSCOPY_SIGNAL_RECORDS.filter((record) => record.category === "IR").length,
    protonNmrSignals: SPECTROSCOPY_SIGNAL_RECORDS.filter((record) => record.category === "1H NMR").length,
    carbonNmrSignals: SPECTROSCOPY_SIGNAL_RECORDS.filter((record) => record.category === "13C NMR").length,
    massSpecSignals: SPECTROSCOPY_SIGNAL_RECORDS.filter((record) => record.category === "Mass Spec").length,
    compoundProfiles: COMPOUND_SPECTROSCOPY_PROFILES.length,
    reactionChangeRecords: REACTION_SPECTRAL_CHANGES.length,
  }
}

export function spectroscopyExplorerHref(input: { compound?: string; topic?: string } = {}): string {
  const params = new URLSearchParams()
  if (input.compound) params.set("compound", input.compound)
  if (input.topic) params.set("topic", input.topic)
  const suffix = params.toString() ? `?${params.toString()}` : ""
  return `/spectroscopy-explorer${suffix}#spectroscopy-explorer`
}

