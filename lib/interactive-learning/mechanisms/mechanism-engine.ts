import { getReactionMechanism, listReactionMechanisms } from "./examples"
import type {
  AtomTrackingPath,
  BondTransition,
  MechanismArrowKind,
  MechanismAtom,
  MechanismBond,
  MechanismEnergyPoint,
  MechanismPracticeStatus,
  MechanismStep,
  PracticeEvaluation,
  ReactionMechanism,
} from "./types"

export function mechanismSimulatorHref(options: { reaction?: string; compound?: string } = {}) {
  const params = new URLSearchParams()
  if (options.reaction) params.set("reaction", options.reaction)
  if (options.compound) params.set("compound", options.compound)
  const query = params.toString()
  return query ? `/interactive-learning/mechanisms?${query}` : "/interactive-learning/mechanisms"
}

export function legacyMechanismsHref(options: { reaction?: string } = {}) {
  const params = new URLSearchParams()
  if (options.reaction) params.set("reaction", options.reaction)
  const query = params.toString()
  return query ? `/mechanisms?${query}` : "/mechanisms"
}

export function getMechanismByReaction(value: string | null | undefined): ReactionMechanism {
  return getReactionMechanism(value)
}

export function getMechanismLibraryMetrics() {
  const mechanisms = listReactionMechanisms()
  const stepCount = mechanisms.reduce((sum, mechanism) => sum + mechanism.steps.length, 0)
  const arrowCount = mechanisms.reduce((sum, mechanism) => sum + mechanism.steps.reduce((stepSum, step) => stepSum + step.arrows.length, 0), 0)
  const practiceCount = mechanisms.reduce((sum, mechanism) => sum + mechanism.practicePrompts.length, 0)
  const categories = new Set(mechanisms.map((mechanism) => mechanism.category))
  return {
    mechanisms: mechanisms.length,
    steps: stepCount,
    curvedArrows: arrowCount,
    practicePrompts: practiceCount,
    categories: categories.size,
  }
}

export function getCurrentStep(mechanism: ReactionMechanism, index: number): MechanismStep {
  return mechanism.steps[Math.max(0, Math.min(mechanism.steps.length - 1, index))] ?? mechanism.steps[0]
}

function bondKey(bond: MechanismBond) {
  return bond.trackingId || bond.id
}

export function computeBondTransitions(fromStep: MechanismStep, toStep: MechanismStep): BondTransition[] {
  const fromMap = new Map(fromStep.graph.bonds.map((bond) => [bondKey(bond), bond]))
  const toMap = new Map(toStep.graph.bonds.map((bond) => [bondKey(bond), bond]))
  const keys = new Set([...fromMap.keys(), ...toMap.keys()])

  return Array.from(keys).map((key) => {
    const before = fromMap.get(key)
    const after = toMap.get(key)
    if (!before && after) {
      return {
        bondTrackingId: key,
        fromOrder: "missing",
        toOrder: after.order,
        change: "formed",
        explanation: `${key} forms in this step.`,
      }
    }
    if (before && !after) {
      return {
        bondTrackingId: key,
        fromOrder: before.order,
        toOrder: "missing",
        change: "broken",
        explanation: `${key} breaks in this step.`,
      }
    }
    const fromOrder = before?.order ?? "missing"
    const toOrder = after?.order ?? "missing"
    const numericBefore = orderValue(fromOrder)
    const numericAfter = orderValue(toOrder)
    return {
      bondTrackingId: key,
      fromOrder,
      toOrder,
      change: numericAfter > numericBefore ? "order-increased" : numericAfter < numericBefore ? "order-decreased" : "unchanged",
      explanation:
        numericAfter > numericBefore
          ? `${key} gains pi character or bond order.`
          : numericAfter < numericBefore
            ? `${key} loses bond order as electrons move.`
            : `${key} is unchanged.`,
    }
  })
}

function orderValue(order: MechanismBond["order"] | "missing") {
  if (order === "missing") return 0
  if (order === "aromatic") return 1.5
  return order
}

export function getReactionTimeline(mechanism: ReactionMechanism) {
  return mechanism.steps.map((step, index) => ({
    stepId: step.id,
    index,
    label: step.label,
    stageKind: step.stageKind,
    energy: step.energy,
    transitionState: step.transitionState,
  }))
}

export function getEnergyDiagramPoints(mechanism: ReactionMechanism): MechanismEnergyPoint[] {
  return mechanism.energyProfile
}

export function getEnergyExtrema(mechanism: ReactionMechanism) {
  const energies = mechanism.energyProfile.map((point) => point.energy)
  return {
    min: Math.min(...energies),
    max: Math.max(...energies),
    highest: mechanism.energyProfile.reduce((best, point) => (point.energy > best.energy ? point : best), mechanism.energyProfile[0]),
  }
}

export function buildAtomTrackingPaths(mechanism: ReactionMechanism): AtomTrackingPath[] {
  const paths = new Map<string, AtomTrackingPath>()
  for (const step of mechanism.steps) {
    for (const atom of step.graph.atoms) {
      const id = atom.trackingId || atom.id
      const current = paths.get(id) ?? { trackingId: id, element: atom.element, appearances: [] }
      current.appearances.push({
        stepId: step.id,
        atomId: atom.id,
        x: atom.x,
        y: atom.y,
        formalCharge: atom.formalCharge,
        hybridization: atom.hybridization,
      })
      paths.set(id, current)
    }
  }
  return Array.from(paths.values())
}

export function traceAtom(mechanism: ReactionMechanism, trackingId: string | null | undefined): AtomTrackingPath | null {
  if (!trackingId) return null
  return buildAtomTrackingPaths(mechanism).find((path) => path.trackingId === trackingId) ?? null
}

export function getElectronTracking(step: MechanismStep) {
  return step.arrows.map((arrow) => ({
    arrowId: arrow.id,
    kind: arrow.kind,
    origin: arrow.origin,
    destination: arrow.destination,
    electronCount: arrow.electronCount,
    movingPair: arrow.movingPair,
    explanation: arrow.explanation,
  }))
}

export function explainAtom(step: MechanismStep, atomId: string | null | undefined): string {
  const atom = step.graph.atoms.find((item) => item.id === atomId)
  if (!atom) return "Select an atom to see why it reacts in this step."
  const reactive = step.highlightAtoms.includes(atom.id)
  return reactive
    ? `${atom.element}${atom.id}: ${atom.explanation} It is highlighted because it participates in this elementary electron-flow step.`
    : `${atom.element}${atom.id}: ${atom.explanation} It is stationary in this step.`
}

export function explainBond(step: MechanismStep, bondId: string | null | undefined): string {
  const bond = step.graph.bonds.find((item) => item.id === bondId)
  if (!bond) return "Select a bond to see whether it forms, breaks, or changes order."
  if (bond.breaking) return `${bond.explanation} This bond is marked as breaking as electrons move away from it.`
  if (bond.forming) return `${bond.explanation} This bond is marked as forming from electron donation.`
  return `${bond.explanation} Its order is ${bond.order} in this step.`
}

export function explainArrow(step: MechanismStep, arrowId: string | null | undefined): string {
  const arrow = step.arrows.find((item) => item.id === arrowId)
  if (!arrow) return "Select a curved arrow to inspect the moving electron pair."
  return `${arrow.kind}: ${arrow.explanation} Origin: ${arrow.origin}. Destination: ${arrow.destination}.`
}

export function evaluatePracticePrompt(
  mechanism: ReactionMechanism,
  promptId: string,
  chosenArrowIds: string[],
): PracticeEvaluation {
  const prompt = mechanism.practicePrompts.find((item) => item.id === promptId) ?? mechanism.practicePrompts[0]
  if (!prompt) {
    return { status: "idle", score: 0, message: "No practice prompt is available.", missingArrowIds: [], extraArrowIds: [], hint: "" }
  }
  const expected = new Set(prompt.expectedArrowIds)
  const chosen = new Set(chosenArrowIds)
  const missingArrowIds = Array.from(expected).filter((id) => !chosen.has(id))
  const extraArrowIds = Array.from(chosen).filter((id) => !expected.has(id))
  const status: MechanismPracticeStatus =
    missingArrowIds.length === 0 && extraArrowIds.length === 0
      ? "correct"
      : chosenArrowIds.length === 0
        ? "idle"
        : missingArrowIds.length < expected.size
          ? "partial"
          : "incorrect"
  const score = status === "correct" ? 100 : status === "partial" ? 50 : status === "idle" ? 0 : 0
  return {
    status,
    score,
    message:
      status === "correct"
        ? "Correct arrow placement."
        : status === "partial"
          ? "Some electron movement is right, but the full elementary step is incomplete."
          : "That arrow placement does not match the deterministic mechanism step.",
    missingArrowIds,
    extraArrowIds,
    hint: prompt.hint,
  }
}

export function recommendedMechanismsForCompound(compoundId: string | null | undefined) {
  if (!compoundId) return []
  const normalized = compoundId.toLowerCase().replace(/[^a-z0-9]+/g, "-")
  return listReactionMechanisms()
    .filter((mechanism) =>
      mechanism.supportedCompoundIds.some((id) => normalized.includes(id) || id.includes(normalized)),
    )
    .sort((left, right) => {
      const exactLeft = left.supportedCompoundIds.includes(normalized) ? 1 : 0
      const exactRight = right.supportedCompoundIds.includes(normalized) ? 1 : 0
      if (exactLeft !== exactRight) return exactRight - exactLeft
      const specificLeft = left.id.includes(normalized) || left.name.toLowerCase().includes(normalized) ? 1 : 0
      const specificRight = right.id.includes(normalized) || right.name.toLowerCase().includes(normalized) ? 1 : 0
      return specificRight - specificLeft
    })
}

export function getMechanismBridgeHref(compoundId: string | null | undefined) {
  const recommendations = recommendedMechanismsForCompound(compoundId)
  const reaction = recommendations[0]?.id
  return mechanismSimulatorHref({ reaction, compound: compoundId ?? undefined })
}

export function classifyArrowKind(kind: MechanismArrowKind) {
  if (kind === "lone-pair-donation") return "Lone pair donation"
  if (kind === "bond-formation") return "Bond formation"
  if (kind === "bond-breaking") return "Bond breaking"
  if (kind === "pi-bond-movement") return "Pi bond movement"
  if (kind === "resonance-movement") return "Resonance movement"
  return "Electron shift"
}

export function atomById(step: MechanismStep, atomId: string | null | undefined): MechanismAtom | null {
  return step.graph.atoms.find((atom) => atom.id === atomId) ?? null
}

export function bondById(step: MechanismStep, bondId: string | null | undefined): MechanismBond | null {
  return step.graph.bonds.find((bond) => bond.id === bondId) ?? null
}
