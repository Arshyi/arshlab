import {
  ALL_SPECTROSCOPY as LEGACY_COMPOUND_SPECTROSCOPY,
  buildIRSpectrum,
  getDefaultIRForFunctionalGroup,
  getSpectroscopyByName,
  toLegacySpectroscopyData,
} from "./database/spectroscopy"
import type { IRPeak as CoreIRPeak, SpectroscopyRecord } from "./spectroscopy-types"

export { buildIRSpectrum }
export type { IRPeak } from "./database/spectroscopy"
export type SpectroscopyData = ReturnType<typeof toLegacySpectroscopyData>

function peak(input: Omit<CoreIRPeak, "id" | "peakRange" | "peakShape" | "peakStrength"> & { id?: string }): CoreIRPeak {
  return {
    id: input.id ?? input.assignment.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    range: input.range,
    peakRange: input.range,
    shape: input.shape,
    peakShape: input.shape,
    strength: input.strength,
    peakStrength: input.strength,
    assignment: input.assignment,
    notes: input.notes,
  }
}

export function getSpectroscopyForCompound(name: string, aliases: string[] = []): SpectroscopyData | null {
  const match = [name, ...aliases].map((value) => getSpectroscopyByName(value)).find(Boolean)
  return match ? toLegacySpectroscopyData(match) : null
}

export function getAvailableSpectroscopyCompounds(): string[] {
  return LEGACY_COMPOUND_SPECTROSCOPY.map((record) => record.name).sort((a, b) => a.localeCompare(b))
}

export function getDefaultIRForGroup(functionalGroupId: string) {
  return getDefaultIRForFunctionalGroup(functionalGroupId)
}

export const SPECTROSCOPY_RECORDS: SpectroscopyRecord[] = [
  {
    id: "alcohol",
    name: "Alcohols",
    category: "functional group",
    functionalGroup: "alcohol",
    aliases: ["alcohol", "hydroxyl", "O-H", "OH stretch"],
    peakRange: "3200-3600 cm^-1",
    peakShape: "broad",
    peakStrength: "strong",
    irPeaks: [
      peak({
        range: "3200-3600 cm^-1",
        shape: "broad",
        strength: "strong",
        assignment: "O-H stretch",
        notes: "Hydrogen bonding usually makes the alcohol O-H peak broad.",
      }),
      peak({ range: "1000-1300 cm^-1", shape: "sharp", strength: "medium-strong", assignment: "C-O stretch" }),
    ],
    nmrSignals: [
      { id: "alcohol-oh", shiftRange: "1-5 ppm", multiplicity: "broad singlet", assignment: "exchangeable O-H proton" },
    ],
    notes: "A broad O-H stretch plus a C-O stretch supports an alcohol assignment.",
    exampleCompounds: ["ethanol", "methanol", "propan-1-ol"],
  },
  {
    id: "aldehyde",
    name: "Aldehydes",
    category: "functional group",
    functionalGroup: "aldehyde",
    aliases: ["aldehyde", "terminal carbonyl", "CHO", "aldehydic C-H"],
    peakRange: "1720-1740 cm^-1",
    peakShape: "sharp",
    peakStrength: "strong",
    irPeaks: [
      peak({ range: "1720-1740 cm^-1", shape: "sharp", strength: "strong", assignment: "C=O stretch" }),
      peak({
        range: "2720-2820 cm^-1",
        shape: "two weak sharp bands",
        strength: "weak-medium",
        assignment: "aldehydic C-H stretch",
      }),
    ],
    nmrSignals: [{ id: "aldehyde-h", shiftRange: "9-10 ppm", assignment: "aldehyde proton" }],
    notes: "A strong carbonyl plus weak bands near 2720-2820 cm^-1 is characteristic of aldehydes.",
    exampleCompounds: ["ethanal", "benzaldehyde", "methanal"],
  },
  {
    id: "ketone",
    name: "Ketones",
    category: "functional group",
    functionalGroup: "ketone",
    aliases: ["ketone", "internal carbonyl", "C=O"],
    peakRange: "1705-1725 cm^-1",
    peakShape: "sharp",
    peakStrength: "strong",
    irPeaks: [peak({ range: "1705-1725 cm^-1", shape: "sharp", strength: "strong", assignment: "C=O stretch" })],
    nmrSignals: [{ id: "ketone-alpha", shiftRange: "2.0-2.7 ppm", assignment: "protons alpha to carbonyl" }],
    notes: "Ketones show a strong carbonyl peak but lack the aldehydic C-H doublet.",
    exampleCompounds: ["propanone", "butanone", "cyclohexanone"],
  },
  {
    id: "carboxylic-acid",
    name: "Carboxylic Acids",
    category: "functional group",
    functionalGroup: "carboxylic acid",
    aliases: ["carboxylic acid", "COOH", "acid O-H", "carboxyl"],
    peakRange: "2500-3300 cm^-1",
    peakShape: "very broad",
    peakStrength: "strong",
    irPeaks: [
      peak({ range: "2500-3300 cm^-1", shape: "very broad", strength: "strong", assignment: "acid O-H stretch" }),
      peak({ range: "1700-1725 cm^-1", shape: "sharp", strength: "strong", assignment: "C=O stretch" }),
    ],
    nmrSignals: [{ id: "acid-h", shiftRange: "10-13 ppm", assignment: "carboxylic acid proton" }],
    notes: "The very broad O-H band can overlap the C-H stretch region.",
    exampleCompounds: ["ethanoic acid", "methanoic acid", "benzoic acid"],
  },
  {
    id: "ester",
    name: "Esters",
    category: "functional group",
    functionalGroup: "ester",
    aliases: ["ester", "COOR", "ester carbonyl"],
    peakRange: "1735-1750 cm^-1",
    peakShape: "sharp",
    peakStrength: "strong",
    irPeaks: [
      peak({ range: "1735-1750 cm^-1", shape: "sharp", strength: "strong", assignment: "C=O stretch" }),
      peak({ range: "1050-1300 cm^-1", shape: "sharp", strength: "strong", assignment: "C-O stretch" }),
    ],
    nmrSignals: [{ id: "ester-alkoxy", shiftRange: "3.5-4.5 ppm", assignment: "alkoxy protons next to oxygen" }],
    notes: "Ester carbonyls often absorb slightly higher than ketone carbonyls.",
    exampleCompounds: ["ethyl ethanoate", "methyl propanoate", "aspirin"],
  },
  {
    id: "amine",
    name: "Amines",
    category: "functional group",
    functionalGroup: "amine",
    aliases: ["amine", "N-H", "amino"],
    peakRange: "3300-3500 cm^-1",
    peakShape: "medium sharp or broad",
    peakStrength: "medium",
    irPeaks: [
      peak({ range: "3300-3500 cm^-1", shape: "medium sharp or broad", strength: "medium", assignment: "N-H stretch" }),
      peak({ range: "1020-1250 cm^-1", shape: "sharp", strength: "medium", assignment: "C-N stretch" }),
    ],
    nmrSignals: [{ id: "amine-h", shiftRange: "1-5 ppm", assignment: "exchangeable N-H proton" }],
    notes: "Primary amines can show two N-H bands; secondary amines often show one.",
    exampleCompounds: ["methylamine", "ethylamine", "aniline"],
  },
  {
    id: "amide",
    name: "Amides",
    category: "functional group",
    functionalGroup: "amide",
    aliases: ["amide", "CONH", "peptide", "amide carbonyl"],
    peakRange: "1630-1690 cm^-1",
    peakShape: "sharp",
    peakStrength: "strong",
    irPeaks: [
      peak({ range: "1630-1690 cm^-1", shape: "sharp", strength: "strong", assignment: "amide C=O stretch" }),
      peak({ range: "3100-3500 cm^-1", shape: "medium broad", strength: "medium", assignment: "N-H stretch" }),
    ],
    nmrSignals: [{ id: "amide-h", shiftRange: "5-9 ppm", assignment: "amide N-H proton" }],
    notes: "Amide carbonyls are usually lower than ester or ketone carbonyls because of resonance.",
    exampleCompounds: ["ethanamide", "benzamide", "acetamide"],
  },
  {
    id: "alkene",
    name: "Alkenes",
    category: "functional group",
    functionalGroup: "alkene",
    aliases: ["alkene", "C=C", "double bond"],
    peakRange: "1620-1680 cm^-1",
    peakShape: "sharp",
    peakStrength: "medium",
    irPeaks: [
      peak({ range: "1620-1680 cm^-1", shape: "sharp", strength: "medium", assignment: "C=C stretch" }),
      peak({ range: "3000-3100 cm^-1", shape: "sharp", strength: "medium", assignment: "sp2 C-H stretch" }),
    ],
    nmrSignals: [{ id: "alkene-h", shiftRange: "4.5-6.5 ppm", assignment: "vinylic protons" }],
    notes: "Alkene C=C stretches are often weaker than carbonyl peaks.",
    exampleCompounds: ["ethene", "propene", "cyclohexene"],
  },
  {
    id: "alkyne",
    name: "Alkynes",
    category: "functional group",
    functionalGroup: "alkyne",
    aliases: ["alkyne", "C triple C", "C#C", "terminal alkyne"],
    peakRange: "2100-2260 cm^-1",
    peakShape: "sharp",
    peakStrength: "weak-medium",
    irPeaks: [
      peak({ range: "2100-2260 cm^-1", shape: "sharp", strength: "weak-medium", assignment: "C triple C stretch" }),
      peak({ range: "3260-3330 cm^-1", shape: "sharp", strength: "strong", assignment: "terminal alkyne C-H stretch" }),
    ],
    nmrSignals: [{ id: "alkyne-h", shiftRange: "2-3 ppm", assignment: "terminal alkyne proton" }],
    notes: "Internal alkynes can have very weak or absent C triple C IR peaks if symmetrical.",
    exampleCompounds: ["ethyne", "propyne", "but-1-yne"],
  },
  {
    id: "arene",
    name: "Arenes",
    category: "functional group",
    functionalGroup: "arene",
    aliases: ["arene", "aromatic", "benzene ring", "aromatic ring"],
    peakRange: "1450-1600 cm^-1",
    peakShape: "several sharp bands",
    peakStrength: "medium",
    irPeaks: [
      peak({ range: "1450-1600 cm^-1", shape: "several sharp bands", strength: "medium", assignment: "aromatic C=C ring stretch" }),
      peak({ range: "3000-3100 cm^-1", shape: "sharp", strength: "weak-medium", assignment: "aromatic C-H stretch" }),
    ],
    nmrSignals: [{ id: "arene-h", shiftRange: "6.5-8.5 ppm", assignment: "aromatic protons" }],
    notes: "Aromatic rings often show multiple peaks in the fingerprint region as well.",
    exampleCompounds: ["benzene", "toluene", "phenol"],
  },
  {
    id: "nitrile",
    name: "Nitriles",
    category: "functional group",
    functionalGroup: "nitrile",
    aliases: ["nitrile", "cyano", "C triple N", "C#N"],
    peakRange: "2210-2260 cm^-1",
    peakShape: "sharp",
    peakStrength: "medium",
    irPeaks: [peak({ range: "2210-2260 cm^-1", shape: "sharp", strength: "medium", assignment: "C triple N stretch" })],
    nmrSignals: [{ id: "nitrile-alpha", shiftRange: "2.0-3.0 ppm", assignment: "protons alpha to nitrile" }],
    notes: "A sharp peak near 2250 cm^-1 is a strong clue for nitriles.",
    exampleCompounds: ["ethanenitrile", "benzonitrile", "propanenitrile"],
  },
]

export function getSpectroscopyRecord(query: string): SpectroscopyRecord | undefined {
  const normalized = query.toLowerCase().replace(/[^a-z0-9]+/g, "")
  return SPECTROSCOPY_RECORDS.find((record) => {
    const values = [record.id, record.name, record.functionalGroup, ...record.aliases]
    return values.some((value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "") === normalized)
  })
}

export function searchSpectroscopyRecords(query: string): SpectroscopyRecord[] {
  const normalized = query.toLowerCase().trim()
  if (!normalized) return SPECTROSCOPY_RECORDS
  return SPECTROSCOPY_RECORDS.filter((record) => {
    const haystack = [
      record.name,
      record.functionalGroup,
      record.category,
      record.peakRange,
      record.peakShape,
      record.peakStrength,
      record.notes,
      ...record.aliases,
      ...record.exampleCompounds,
      ...record.irPeaks.flatMap((peakRecord) => [
        peakRecord.range,
        peakRecord.shape,
        peakRecord.strength,
        peakRecord.assignment,
        peakRecord.notes ?? "",
      ]),
    ].join(" ").toLowerCase()
    return haystack.includes(normalized)
  })
}

export function countIRPeaks(): number {
  return SPECTROSCOPY_RECORDS.reduce((sum, record) => sum + record.irPeaks.length, 0)
}
