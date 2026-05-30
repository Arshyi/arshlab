import type { SpectroscopyRecord } from "../types"

const boards = ["ib-sl", "ib-hl", "ap", "a-level"] as const

function spec(
  partial: Omit<SpectroscopyRecord, "kind" | "examBoards" | "topics" | "subtopics" | "tags"> &
    Partial<Pick<SpectroscopyRecord, "topics" | "subtopics" | "tags">>,
): SpectroscopyRecord {
  return {
    kind: "spectroscopy",
    examBoards: [...boards, "high-school", "university-intro"],
    topics: partial.topics ?? ["spectroscopy"],
    subtopics: ["ir", "nmr", "mass-spec"],
    tags: partial.tags ?? [],
    aliases: partial.aliases ?? [partial.name],
    ...partial,
  }
}

/** Scalable spectroscopy records — link to compoundId */
export const SPECTROSCOPY_RECORDS: SpectroscopyRecord[] = [
  spec({
    id: "spec-ethanol",
    compoundId: "compound-ethanol",
    name: "ethanol",
    irPeaks: [
      { wavenumber: 3400, intensity: 55, assignment: "O—H stretch (broad)" },
      { wavenumber: 2980, intensity: 25, assignment: "C—H stretch" },
      { wavenumber: 1100, intensity: 35, assignment: "C—O stretch" },
    ],
    nmrSignals: [
      { shiftPpm: 1.1, multiplicity: "triplet", integration: 3, assignment: "CH₃" },
      { shiftPpm: 3.6, multiplicity: "quartet", integration: 2, assignment: "CH₂" },
      { shiftPpm: 2.5, multiplicity: "broad singlet", integration: 1, assignment: "OH" },
    ],
    msFragments: [
      { mz: 46, intensity: 30, label: "M+" },
      { mz: 31, intensity: 100, label: "CH₂OH+" },
      { mz: 29, intensity: 45, label: "C₂H₅+" },
    ],
    characteristicAbsorptions: ["Broad O—H 3200–3600 cm⁻¹", "C—O ~1100 cm⁻¹"],
    characteristicSignals: ["CH₃ triplet ~1.1 ppm", "CH₂ quartet ~3.6 ppm"],
    characteristicFragments: ["m/z 31 (CH₂OH+)"],
    notes: "IB HL standard ethanol spectra.",
    tags: ["alcohol"],
  }),
  spec({
    id: "spec-propanone",
    compoundId: "compound-propanone",
    name: "propanone",
    irPeaks: [{ wavenumber: 1715, intensity: 80, assignment: "C=O stretch (ketone)" }],
    nmrSignals: [{ shiftPpm: 2.1, multiplicity: "singlet", integration: 6, assignment: "CH₃ (equivalent)" }],
    msFragments: [
      { mz: 58, intensity: 40, label: "M+" },
      { mz: 43, intensity: 100, label: "CH₃CO+" },
    ],
    characteristicAbsorptions: ["C=O ~1715 cm⁻¹"],
    characteristicSignals: ["Singlet ~2.1 ppm (6H)"],
    characteristicFragments: ["m/z 43 (acylium ion)"],
    notes: "Simplest ketone — strong C=O IR.",
    tags: ["ketone", "carbonyl"],
  }),
  spec({
    id: "spec-benzene",
    compoundId: "compound-benzene",
    name: "benzene",
    irPeaks: [
      { wavenumber: 3100, intensity: 20, assignment: "C—H aromatic" },
      { wavenumber: 1600, intensity: 30, assignment: "C=C ring" },
    ],
    nmrSignals: [{ shiftPpm: 7.3, multiplicity: "singlet", integration: 6, assignment: "aromatic H" }],
    msFragments: [{ mz: 78, intensity: 100, label: "M+" }],
    characteristicAbsorptions: ["Aromatic C—H ~3100 cm⁻¹"],
    characteristicSignals: ["δ ~7.3 ppm aromatic"],
    characteristicFragments: ["M+ = 78"],
    notes: "Highly symmetrical — single NMR signal.",
    tags: ["aromatic"],
  }),
]

/** Default IR peaks by functional group id — fallback when no full record */
export const FG_IR_DEFAULTS: Record<string, { wavenumber: number; intensity: number; assignment: string }[]> = {
  hydroxyl: [{ wavenumber: 3350, intensity: 55, assignment: "O—H stretch (broad)" }],
  carbonyl: [{ wavenumber: 1710, intensity: 75, assignment: "C=O stretch" }],
  carboxyl: [
    { wavenumber: 3000, intensity: 40, assignment: "O—H (acid)" },
    { wavenumber: 1710, intensity: 70, assignment: "C=O" },
  ],
  amino: [{ wavenumber: 3300, intensity: 50, assignment: "N—H stretch" }],
  halogeno: [{ wavenumber: 650, intensity: 30, assignment: "C—X stretch" }],
  ester: [{ wavenumber: 1740, intensity: 70, assignment: "C=O ester" }],
}
