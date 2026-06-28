import { scoreMolecularGraphSimilarity } from "../vision/molecular-graph"
import { STRUCTURE_SCANNER_RECORDS } from "./scanner-database"
import type {
  EvidenceEngineCandidate,
  EvidenceEngineResult,
  EvidencePenalty,
  EvidenceStrength,
  ScannerEvidenceType,
} from "./evidence-types"
import type { StructureScanInput, StructureScannerRecord } from "./scanner-types"

function clamp(value: number, minimum = 0, maximum = 100): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function normalizeText(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim()
}

function normalizeFormula(value: string | null | undefined): string {
  return (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "")
}

function formulaCounts(value: string | null | undefined): Map<string, number> {
  const source = (value ?? "").replace(/[\s()[\]{}+\-=#]/g, "")
  const tokens = source.match(/[A-Z][a-z]?\d*/g)
  if (!tokens || tokens.join("") !== source) return new Map()
  const counts = new Map<string, number>()
  for (const token of tokens) {
    const match = token.match(/^([A-Z][a-z]?)(\d*)$/)
    if (!match) continue
    counts.set(match[1], (counts.get(match[1]) ?? 0) + Number(match[2] || "1"))
  }
  return counts
}

function sameComposition(left: string | undefined, right: string): boolean {
  const leftCounts = formulaCounts(left)
  const rightCounts = formulaCounts(right)
  if (!leftCounts.size || leftCounts.size !== rightCounts.size) return false
  return Array.from(leftCounts).every(([element, count]) => rightCounts.get(element) === count)
}

function compatibleWithConfidentAtomGraph(record: StructureScannerRecord, input: StructureScanInput): boolean {
  const graph = input.visualAnalysis?.molecularGraph
  if (!graph?.atomCentered || graph.nodes.length < 5 || graph.estimates.confidence < 65) return true
  const expected = formulaCounts(record.formula)
  const detected = new Map<string, number>()
  graph.nodes.forEach((node) => detected.set(node.inferredElement, (detected.get(node.inferredElement) ?? 0) + 1))
  const expectedCarbons = expected.get("C") ?? 0
  const detectedCarbons = detected.get("C") ?? 0
  if (expectedCarbons !== detectedCarbons) return false
  for (const element of ["N", "O", "S", "P", "F", "Cl", "Br", "I"]) {
    if ((expected.get(element) ?? 0) !== (detected.get(element) ?? 0)) return false
  }
  return true
}

function strengthFor(confidence: number): EvidenceStrength {
  if (confidence >= 75) return "strong"
  if (confidence >= 45) return "moderate"
  return "weak"
}

function candidate(
  compoundId: string,
  confidence: number,
  evidenceType: ScannerEvidenceType,
  reasoning: string[],
  penalties: EvidencePenalty[] = [],
): EvidenceEngineCandidate {
  const calibrated = Math.round(clamp(confidence - penalties.reduce((sum, penalty) => sum + penalty.points, 0)))
  return {
    compoundId,
    confidence: calibrated,
    evidenceType,
    strength: strengthFor(calibrated),
    reasoning: Array.from(new Set(reasoning)),
    penalties,
  }
}

function finalizeCandidates(candidates: EvidenceEngineCandidate[], limit = 6): EvidenceEngineCandidate[] {
  const merged = new Map<string, EvidenceEngineCandidate>()
  for (const current of candidates) {
    const existing = merged.get(current.compoundId)
    if (!existing) {
      merged.set(current.compoundId, current)
      continue
    }
    const confidence = Math.max(existing.confidence, current.confidence)
    merged.set(current.compoundId, {
      ...existing,
      confidence,
      strength: strengthFor(confidence),
      reasoning: Array.from(new Set([...existing.reasoning, ...current.reasoning])),
      penalties: [...existing.penalties, ...current.penalties],
    })
  }
  return Array.from(merged.values())
    .filter((item) => item.confidence > 0)
    .sort((left, right) => right.confidence - left.confidence || left.compoundId.localeCompare(right.compoundId))
    .slice(0, limit)
}

function engine(
  id: EvidenceEngineResult["id"],
  label: string,
  description: string,
  candidates: EvidenceEngineCandidate[],
  reasoning: string[] = [],
  penalties: EvidencePenalty[] = [],
): EvidenceEngineResult {
  return { id, label, description, candidates: finalizeCandidates(candidates), reasoning, penalties }
}

function ringClosureAgreement(input: StructureScanInput): {
  selectedSixRing: boolean
  aromaticAgreement: boolean
  saturatedSixRingOnly: boolean
  heteroAtomInSelectedRing: boolean
  aromaticSupport: number
} {
  const closure = input.visualAnalysis?.ringClosure
  const validation = input.visualAnalysis?.chemicalGraphValidation
  const graphRing = input.visualAnalysis?.molecularGraph.rings.find((ring) => ring.size === 6)
  const selected = closure?.candidates.find((candidate) => candidate.selected)
  const selectedNodeIds = validation?.selectedValidatedRing?.nodeIds ?? graphRing?.nodeIds ?? selected?.nodeIds ?? []
  const heteroAtomInSelectedRing = Boolean(selectedNodeIds.some((nodeId) => {
    const graphNode = input.visualAnalysis?.molecularGraph.nodes.find((node) => node.id === nodeId)
    const label = graphNode?.inferredElement ?? input.visualAnalysis?.atomLabels[nodeId]?.label
    return Boolean(label && label !== "C" && label !== "H")
  }))
  const aromaticSupport = Math.max(0, ...(closure?.candidates ?? []).map((candidate) =>
    candidate.memberCount >= 5 &&
    candidate.memberCount <= 6 &&
    candidate.confidence >= 55 &&
    candidate.doubleBondCount >= 2
      ? candidate.aromaticSupport
      : 0,
  ), validation?.selectedValidatedRing?.aromatic ? 88 : 0, graphRing?.aromatic ? 82 : 0)
  const aromaticAgreement = aromaticSupport >= 52 || Boolean(validation?.selectedValidatedRing?.aromatic || graphRing?.aromatic)
  const selectedSixRing = selected?.memberCount === 6 || validation?.selectedValidatedRing?.size === 6 || graphRing?.size === 6
  return {
    selectedSixRing,
    aromaticAgreement,
    saturatedSixRingOnly: Boolean(selectedSixRing && !aromaticAgreement && (selected?.doubleBondCount ?? 0) < 2 && !validation?.selectedValidatedRing?.aromatic),
    heteroAtomInSelectedRing,
    aromaticSupport,
  }
}

function ocrFormulaEngine(input: StructureScanInput): EvidenceEngineResult {
  const output: EvidenceEngineCandidate[] = []
  const quality = clamp(input.ocrQuality ?? 0)
  const chemistryConfidence = clamp(input.ocrChemistryConfidence ?? quality)
  const noisePenalty = Math.min(32, input.ocrNoisePenalty ?? 0)
  const qualityPenalty = input.ocrQuality === undefined
    ? 0
    : quality < 35
      ? 24
      : quality < 55
        ? 14
        : quality < 70
          ? 6
          : 0
  const compactOCR = normalizeFormula(input.ocrText)
  const ocrName = normalizeText(input.ocrText)
  for (const record of STRUCTURE_SCANNER_RECORDS) {
    const reasons: string[] = []
    let confidence = 0
    const recordFormula = normalizeFormula(record.formula)
    const recordName = normalizeText(record.name)
    const aliases = record.commonAliases.map(normalizeText)
    const formulaCameFromOCR = Boolean(
      input.formula && compactOCR.includes(normalizeFormula(input.formula)) &&
      (normalizeFormula(input.formula) === recordFormula || sameComposition(input.formula, record.formula)),
    )
    const condensedCameFromOCR = Boolean(
      input.condensedFormula && compactOCR.includes(normalizeFormula(input.condensedFormula)) &&
      sameComposition(input.condensedFormula, record.formula),
    )
    const nameCameFromOCR = Boolean(
      input.moleculeName && ocrName.includes(normalizeText(input.moleculeName)) &&
      (normalizeText(input.moleculeName) === recordName || aliases.includes(normalizeText(input.moleculeName))),
    )
    if (formulaCameFromOCR || condensedCameFromOCR) {
      confidence = Math.max(confidence, 68 + quality * 0.16 + chemistryConfidence * 0.12)
      reasons.push(input.ocrFormulaCorrected ? "Corrected OCR formula exactly matches a local compound" : "Clean OCR formula exactly matches a local compound")
    }
    if (nameCameFromOCR) {
      confidence = Math.max(confidence, 70 + quality * 0.15 + chemistryConfidence * 0.1)
      reasons.push("Clean OCR chemical name or alias exactly matches a local compound")
    }
    if (input.ocrFormulaCompoundIds?.includes(record.id)) {
      confidence = Math.max(confidence, 55 + quality * 0.2 + chemistryConfidence * 0.2)
      reasons.push(input.ocrFormulaCorrected ? "Corrected OCR formula matches a local compound" : "OCR formula matches a local compound")
    }
    if (input.ocrNameCompoundIds?.includes(record.id)) {
      confidence = Math.max(confidence, 58 + quality * 0.18 + chemistryConfidence * 0.18)
      reasons.push("OCR chemical name or alias matches a local compound")
    }
    if (!reasons.length && input.ocrCompoundIds?.includes(record.id)) {
      confidence = Math.max(confidence, 38 + chemistryConfidence * 0.2)
      reasons.push("A parsed OCR chemistry token points to this compound")
    }
    if (!confidence) continue
    const penalties: EvidencePenalty[] = []
    if (qualityPenalty) penalties.push({ reason: "OCR quality penalty remains inside the OCR engine", points: qualityPenalty })
    if (noisePenalty) penalties.push({ reason: "Rejected OCR noise reduced only the OCR vote", points: noisePenalty })
    output.push(candidate(record.id, confidence, "ocr", reasons, penalties))
  }
  const penalties: EvidencePenalty[] = []
  if (qualityPenalty) penalties.push({ reason: "OCR quality was too low for a strong text-only vote", points: qualityPenalty })
  if (noisePenalty) penalties.push({ reason: "Invalid or unsupported OCR tokens were rejected", points: noisePenalty })
  return engine(
    "ocr-formula",
    "OCR Formula Engine",
    "Extracts database-valid names, molecular formulas, and condensed formulas without controlling other engines.",
    output,
    output.length ? ["OCR produced one or more database-backed chemistry candidates."] : ["OCR produced no database-valid compound candidate."],
    penalties,
  )
}

function atomLabelEngine(input: StructureScanInput): EvidenceEngineResult {
  const positioned = input.visualAnalysis?.atomLabels ?? []
  const labels = positioned.length ? positioned.map((label) => label.label) : (input.ocrAtomLabels ?? [])
  const counts = new Map<string, number>()
  labels.forEach((label) => counts.set(label, (counts.get(label) ?? 0) + 1))
  if (!counts.size) {
    return engine("atom-label", "Atom Label Engine", "Uses chemistry glyphs and their approximate positions as element and atom-count evidence.", [], ["No stable atom glyphs were detected."])
  }
  const graph = input.visualAnalysis?.molecularGraph
  const output = STRUCTURE_SCANNER_RECORDS.map((record) => {
    if (!compatibleWithConfidentAtomGraph(record, input)) return null
    const recordCounts = formulaCounts(record.formula)
    const detectedElements = Array.from(counts.keys())
    const matchedElements = detectedElements.filter((element) => recordCounts.has(element))
    if (!matchedElements.length) return null
    const heteroatoms = detectedElements.filter((element) => element !== "C" && element !== "H")
    if (heteroatoms.some((element) => !recordCounts.has(element))) return null
    let confidence = 20 + matchedElements.length * 8
    const reasons = [`Detected atom labels agree on ${matchedElements.join(", ")}`]
    if (positioned.length >= 2) {
      confidence += 8
      reasons.push(`${positioned.length} positioned atom glyphs contribute spatial evidence`)
    }
    if (graph?.atomCentered && graph.estimates.carbons > 0) {
      const expectedCarbons = recordCounts.get("C") ?? 0
      if (expectedCarbons === graph.estimates.carbons) {
        confidence += 24
        reasons.push(`Detected carbon count matches ${expectedCarbons}`)
      } else if (Math.abs(expectedCarbons - graph.estimates.carbons) > 1) {
        confidence -= 14
      }
    }
    return candidate(record.id, Math.min(72, confidence), "atom-label", reasons)
  }).filter((item): item is EvidenceEngineCandidate => Boolean(item))
  return engine(
    "atom-label",
    "Atom Label Engine",
    "Detects C, H, O, N, S, P, F, Cl, Br, and I glyphs and compares their positions and counts.",
    output,
    [`Detected labels: ${Array.from(counts).map(([label, count]) => `${label} x${count}`).join(", ")}`],
  )
}

function bondGeometryEngine(input: StructureScanInput): EvidenceEngineResult {
  const graph = input.visualAnalysis?.molecularGraph
  if (!graph?.bonds.length) {
    return engine("bond-geometry", "Bond Geometry Engine", "Classifies single, double, triple, and parallel bond strokes.", [], ["No stable bond graph was reconstructed."])
  }
  const { singleBonds, doubleBonds, tripleBonds } = graph.estimates
  const output: EvidenceEngineCandidate[] = []
  for (const record of STRUCTURE_SCANNER_RECORDS) {
    if (!compatibleWithConfidentAtomGraph(record, input)) continue
    const groups = record.functionalGroups.map(normalizeText)
    const reasons: string[] = []
    let confidence = 0
    if (tripleBonds > 0 && (groups.includes("alkyne") || groups.includes("nitrile"))) {
      confidence = groups.includes("alkyne") ? 82 : 65
      reasons.push(`${tripleBonds} reconstructed triple bond${tripleBonds === 1 ? "" : "s"}`)
    } else if (doubleBonds > 0 && groups.includes("alkene")) {
      confidence = 62 + Math.min(15, doubleBonds * 5)
      reasons.push(`${doubleBonds} reconstructed double bond${doubleBonds === 1 ? "" : "s"}`)
    } else if (doubleBonds >= 2 && groups.includes("arene")) {
      confidence = 68 + Math.min(14, doubleBonds * 4)
      reasons.push("Multiple double-bond or parallel-stroke cues support an aromatic system")
    } else if (singleBonds > 0 && doubleBonds === 0 && tripleBonds === 0 && groups.includes("cycloalkane")) {
      confidence = 58
      reasons.push("Only single bonds were reconstructed in a cyclic candidate")
    }
    if (confidence) output.push(candidate(record.id, confidence, "bond", reasons))
  }
  return engine(
    "bond-geometry",
    "Bond Geometry Engine",
    "Uses reconstructed bond orders and parallel strokes independently of OCR.",
    output,
    [`Bond estimate: ${singleBonds} single, ${doubleBonds} double, ${tripleBonds} triple`],
  )
}

function ringClosureEngine(input: StructureScanInput): EvidenceEngineResult {
  const closure = input.visualAnalysis?.ringClosure
  const selected = closure?.candidates.find((candidate) => candidate.selected) ?? closure?.candidates[0]
  if (!closure || !selected || selected.memberCount < 5 || selected.memberCount > 8) {
    return engine(
      "ring-closure",
      "Ring Closure Engine",
      "Snaps atom-label endpoints, bridges short missing edges, and votes on recovered ring topology.",
      [],
      [closure?.explanation ?? "No ring-closure candidate was available."],
    )
  }

  const output: EvidenceEngineCandidate[] = []
  const globalAromaticSupport = Math.max(
    selected.aromaticSupport,
    ringClosureAgreement(input).aromaticSupport,
    input.visualAnalysis?.graph.aromaticCueScore ?? 0,
    input.visualAnalysis?.ringCandidates.find((candidate) => candidate.benzeneLike && candidate.doubleBondCue >= 55)?.aromaticCueScore ?? 0,
    input.visualAnalysis?.molecularGraph.aromatic ? 82 : 0,
  )
  const aromatic = selected.memberCount === 6 &&
    globalAromaticSupport >= 55 &&
    (selected.doubleBondCount >= 2 || ringClosureAgreement(input).aromaticAgreement || (input.visualAnalysis?.molecularGraph.estimates.doubleBonds ?? 0) >= 2 || Boolean(input.visualAnalysis?.molecularGraph.aromatic))
  const nearRing = selected.recovered || selected.closureGaps.length > 0
  const heteroAtomInRing = ringClosureAgreement(input).heteroAtomInSelectedRing
  const closureReason = `${selected.memberCount}-member ${nearRing ? "recovered near-ring" : "closed ring"}: closure ${selected.closureConfidence}%, regularity ${selected.regularity}%, line coverage ${selected.lineCoverage}%.`
  const aromaticReason = selected.aromaticSupport >= 55
    ? "Ring closure found aromatic/double-bond support around the polygon."
    : "Ring closure found no reliable aromatic double-bond support."
  const topologyPenalties = selected.rejectedReasons
    .filter((reason) => !/aromatic\/double-bond support is absent/i.test(reason))
    .map((reason) => ({ reason, points: 14 }))
  const benzenePenalties = selected.rejectedReasons.map((reason) => ({ reason, points: /aromatic/.test(reason) ? 10 : 14 }))

  if (selected.memberCount === 6 && aromatic && !heteroAtomInRing) {
    output.push(candidate("benzene", Math.min(96, selected.confidence * 0.46 + globalAromaticSupport * 0.36 + selected.closureConfidence * 0.18), "ring-closure", [
      closureReason,
      aromaticReason,
      selected.selectedReason,
    ], topologyPenalties))
    output.push(candidate("cyclohexane", 30, "ring-closure", [
      "A six-member ring is present.",
    ], [{ reason: "Aromatic/double-bond closure evidence contradicts saturated cyclohexane.", points: 26 }]))
  } else if (selected.memberCount === 6 && !heteroAtomInRing) {
    output.push(candidate("cyclohexane", Math.min(94, selected.confidence * 0.52 + selected.closureConfidence * 0.28 + selected.lineCoverage * 0.2), "ring-closure", [
      closureReason,
      "Six-member ring closure has saturated-ring support.",
    ], topologyPenalties))
    output.push(candidate("benzene", 34, "ring-closure", [
      "Six-member geometry alone can resemble benzene.",
    ], [{ reason: "No alternating double-bond/aromatic support was detected.", points: 26 }]))
  } else if (selected.memberCount === 5 && selected.aromaticSupport >= 52) {
    output.push(candidate("benzene", Math.min(68, selected.confidence * 0.42 + selected.aromaticSupport * 0.35), "ring-closure", [
      closureReason,
      "A five-member fuzzy ring is treated only as weak arene support unless other engines agree.",
    ], benzenePenalties))
  }

  return engine(
    "ring-closure",
    "Ring Closure Engine",
    "Snaps atom-label endpoints, bridges short missing edges, and votes on recovered ring topology.",
    output,
    [
      closure.explanation,
      `Detected ring sizes: ${closure.detectedRingSizes.length ? closure.detectedRingSizes.join(", ") : "none"}.`,
      `Snap events: ${closure.snapEvents.length}; bridge events: ${closure.bridgeEvents.length}.`,
    ],
  )
}

function ringAromaticEngine(input: StructureScanInput): EvidenceEngineResult {
  const analysis = input.visualAnalysis
  const graphRing = analysis ? [...analysis.molecularGraph.rings].sort((left, right) => right.confidence - left.confidence)[0] : undefined
  const visualRing = analysis ? [...analysis.ringCandidates].sort((left, right) => right.confidence - left.confidence)[0] : undefined
  const closureRing = analysis?.ringClosure?.candidates.find((candidate) => candidate.selected)
  const closureAgreement = ringClosureAgreement(input)
  const size = graphRing?.size ?? visualRing?.sidesEstimate ?? 0
  const ringConfidence = graphRing?.confidence ?? visualRing?.confidence ?? 0
  if (size < 5 || size > 7) {
    return engine("ring-aromatic", "Ring/Aromatic Engine", "Detects 5-7 member cycles, near-rings, and aromatic double-bond support.", [], ["No stable 5-7 member ring candidate was found."])
  }
  const ringLocalDoubleBondSupport = Math.max(
    closureRing?.doubleBondCount ?? 0,
    closureAgreement.aromaticAgreement ? 2 : 0,
    analysis?.molecularGraph.estimates.doubleBonds ?? 0,
  )
  const aromaticSupport = Boolean(
    (graphRing?.aromatic && !closureAgreement.saturatedSixRingOnly && !closureAgreement.heteroAtomInSelectedRing) ||
    (closureAgreement.selectedSixRing && closureAgreement.aromaticAgreement && !closureAgreement.heteroAtomInSelectedRing) ||
    (visualRing?.benzeneLike && ringLocalDoubleBondSupport >= 2 && !closureAgreement.heteroAtomInSelectedRing) ||
    ((analysis?.graph.aromaticCueScore ?? 0) >= 50 && ringLocalDoubleBondSupport >= 2 && !closureAgreement.heteroAtomInSelectedRing) ||
    ((analysis?.molecularGraph.estimates.doubleBonds ?? 0) >= 2 && !closureAgreement.heteroAtomInSelectedRing),
  )
  const nearRing = Boolean(visualRing?.nearRing || !graphRing?.closed)
  const output: EvidenceEngineCandidate[] = []
  if (size === 6 && aromaticSupport) {
    output.push(candidate("benzene", Math.min(96, ringConfidence * 0.55 + 48), "ring", [
      `${nearRing ? "Near-ring" : "Six-member ring"} geometry supports benzene`,
      "Aromatic support detected from double-bond or parallel strokes",
    ]))
    for (const record of STRUCTURE_SCANNER_RECORDS.filter((record) =>
      record.id !== "benzene" && record.functionalGroups.includes("arene") && compatibleWithConfidentAtomGraph(record, input),
    )) {
      output.push(candidate(record.id, Math.min(72, ringConfidence * 0.45 + 28), "ring", ["Aromatic ring evidence supports an arene derivative"]))
    }
    output.push(candidate("cyclohexane", 28, "ring", ["A six-member ring is present"], [{ reason: "Aromatic strokes contradict a saturated cyclohexane ring", points: 24 }]))
  } else if (size === 6) {
    output.push(candidate("cyclohexane", Math.min(94, ringConfidence * 0.62 + 36), "ring", ["Six-member ring detected without aromatic bond support"]))
    output.push(candidate("benzene", 30, "ring", ["Six-member geometry alone is compatible with benzene"], [{ reason: "No double-bond or aromatic support was detected", points: 24 }]))
  } else if (aromaticSupport && nearRing) {
    output.push(candidate("benzene", Math.min(78, ringConfidence * 0.5 + 30), "ring", [
      `${size}-member fuzzy near-ring may represent an imperfect aromatic drawing`,
      "Parallel or double-bond support is present",
    ]))
  }
  return engine(
    "ring-aromatic",
    "Ring/Aromatic Engine",
    "Separates saturated six-member rings from aromatic and fuzzy near-ring evidence.",
    output,
    [`Best ring: ${size} members at ${Math.round(ringConfidence)}%; aromatic support ${aromaticSupport ? "present" : "absent"}.`],
  )
}

function molecularGraphEngine(input: StructureScanInput): EvidenceEngineResult {
  const graph = input.visualAnalysis?.molecularGraph
  if (!graph?.nodes.length || !graph.bonds.length) {
    return engine("molecular-graph", "Molecular Graph Engine", "Reconstructs and compares atom/bond topology against local compound signatures.", [], ["No valid molecular graph was available for comparison."])
  }
  const closureAgreement = ringClosureAgreement(input)
  const output = STRUCTURE_SCANNER_RECORDS.map((record) => {
    const similarity = scoreMolecularGraphSimilarity(graph, record.id)
    if (!similarity || similarity.score <= 0) return null
    const penalties: EvidencePenalty[] = []
    if (record.id === "benzene" && closureAgreement.saturatedSixRingOnly) {
      penalties.push({ reason: "Ring-closure geometry found a six-member ring without reliable alternating double-bond support.", points: 30 })
    }
    if (record.id === "benzene" && closureAgreement.heteroAtomInSelectedRing) {
      penalties.push({ reason: "A heteroatom label in the selected ring contradicts benzene.", points: 36 })
    }
    if (record.id === "cyclohexane" && closureAgreement.aromaticAgreement) {
      penalties.push({ reason: "Ring-closure geometry found aromatic/double-bond support that contradicts saturated cyclohexane.", points: 24 })
    }
    const confidence = clamp(similarity.score * 1.15 + graph.estimates.confidence * 0.28, 0, 97)
    return candidate(record.id, confidence, "graph", similarity.reasons, penalties)
  }).filter((item): item is EvidenceEngineCandidate => Boolean(item))
  return engine(
    "molecular-graph",
    "Molecular Graph Engine",
    "High-priority atom, bond-order, ring, and aromatic topology comparison.",
    output,
    [`Graph contains ${graph.nodes.length} atoms, ${graph.bonds.length} bonds, and ${graph.rings.length} ring${graph.rings.length === 1 ? "" : "s"}.`],
  )
}

const CUE_GROUPS: Record<string, string[]> = {
  aromatic: ["arene", "aromatic"],
  carbonyl: ["carbonyl", "aldehyde", "ketone", "ester", "amide", "acid anhydride"],
  hydroxyl: ["alcohol", "phenol"],
  carboxyl: ["carboxylic acid"],
  "double-bond": ["alkene"],
}

function functionalGroupEngine(input: StructureScanInput): EvidenceEngineResult {
  const cues = input.visualAnalysis?.functionalGroupCues ?? []
  const source = normalizeText(`${input.ocrText ?? ""} ${(input.ocrAtomLabels ?? []).join(" ")}`)
  const output: EvidenceEngineCandidate[] = []
  for (const record of STRUCTURE_SCANNER_RECORDS) {
    if (!compatibleWithConfidentAtomGraph(record, input)) continue
    const groups = record.functionalGroups.map(normalizeText)
    const matchingCues = cues.filter((cue) => (CUE_GROUPS[cue.kind] ?? []).some((group) => groups.includes(group)))
    let confidence = matchingCues.length ? Math.max(...matchingCues.map((cue) => cue.confidence)) * 0.78 : 0
    const reasons = matchingCues.map((cue) => `${cue.label}: ${cue.evidence}`)
    if (/\b(cl|br|halo)\b/.test(source) && groups.includes("haloalkane")) {
      confidence = Math.max(confidence, 54)
      reasons.push("Halogen atom-label evidence supports a haloalkane")
    }
    if (/\b(n|nh|nh2|amine)\b/.test(source) && groups.includes("amine")) {
      confidence = Math.max(confidence, 48)
      reasons.push("Nitrogen label evidence may support an amine")
    }
    if (confidence) output.push(candidate(record.id, Math.min(82, confidence), "functional-group", reasons))
  }
  return engine(
    "functional-group",
    "Functional Group Engine",
    "Matches visual and chemistry-label clues for alcohols, carbonyls, acids, esters, alkenes, arenes, haloalkanes, and amines.",
    output,
    cues.length ? cues.map((cue) => `${cue.label}: ${cue.confidence}%`) : ["No stable functional-group cue was detected."],
  )
}

function filenameManualEngine(input: StructureScanInput): EvidenceEngineResult {
  const manual = input.manualHints ?? {}
  const name = normalizeText(manual.moleculeName)
  const formula = normalizeFormula(manual.formula)
  const condensed = normalizeFormula(manual.condensedFormula)
  const groupHint = normalizeText(manual.functionalGroupHint)
  const fileName = normalizeText(input.fileName?.replace(/\.[a-z0-9]+$/i, ""))
  const output: EvidenceEngineCandidate[] = []
  for (const record of STRUCTURE_SCANNER_RECORDS) {
    const recordName = normalizeText(record.name)
    const aliases = record.commonAliases.map(normalizeText)
    const recordFormula = normalizeFormula(record.formula)
    const reasons: string[] = []
    let confidence = 0
    let evidenceType: ScannerEvidenceType = "manual"
    if (name && (name === recordName || aliases.includes(name))) {
      confidence = 99
      reasons.push("Manual compound name or alias exactly matches")
    } else if (name && (recordName.includes(name) || name.includes(recordName))) {
      confidence = 82
      reasons.push("Manual compound name closely matches")
    }
    if (formula && formula === recordFormula) {
      confidence = Math.max(confidence, 98)
      reasons.push("Manual molecular formula exactly matches")
    } else if (manual.formula && sameComposition(manual.formula, record.formula)) {
      confidence = Math.max(confidence, 88)
      reasons.push("Manual formula composition matches")
    }
    if (condensed && (condensed === recordFormula || sameComposition(manual.condensedFormula, record.formula))) {
      confidence = Math.max(confidence, 95)
      reasons.push("Manual condensed formula matches")
    }
    for (const group of record.functionalGroups.map(normalizeText)) {
      if (group && groupHint.includes(group)) {
        confidence = Math.max(confidence, 76)
        reasons.push(`Manual functional-group hint matches ${group}`)
      }
    }
    if (!confidence && fileName && (fileName.includes(recordName) || aliases.some((alias) => alias && fileName.includes(alias)))) {
      confidence = 34
      evidenceType = "filename"
      reasons.push("Weak filename hint matches this compound")
    }
    if (confidence) output.push(candidate(record.id, confidence, evidenceType, reasons))
  }
  return engine(
    "filename-manual",
    "Filename/Manual Hint Engine",
    "Treats explicit user corrections as strongest evidence while keeping filenames weak.",
    output,
    output.length ? ["Manual and filename evidence was evaluated separately from OCR."] : ["No manual correction or useful filename hint was supplied."],
  )
}

export function runStructureEvidenceEngines(input: StructureScanInput): EvidenceEngineResult[] {
  return [
    ocrFormulaEngine(input),
    atomLabelEngine(input),
    bondGeometryEngine(input),
    ringClosureEngine(input),
    ringAromaticEngine(input),
    molecularGraphEngine(input),
    functionalGroupEngine(input),
    filenameManualEngine(input),
  ]
}

export function getStructureScannerRecord(compoundId: string): StructureScannerRecord | undefined {
  return STRUCTURE_SCANNER_RECORDS.find((record) => record.id === compoundId)
}
