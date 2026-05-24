// Educational spectroscopy data (approximate, IB HL level)

export interface IRPeak {
  wavenumber: number
  intensity: number
  label: string
  broad?: boolean
  width?: number
}

export interface MSFragment {
  mz: number
  intensity: number
  label: string
  explanation: string
}

export interface NMREnvironment {
  proton: string
  shift: string
  splitting: string
  integration: string
}

export interface SpectroscopyData {
  compoundName: string
  aliases: string[]
  irPeaks: IRPeak[]
  irSummary: string
  molecularIon: number
  msFragments: MSFragment[]
  msSummary: string
  nmrEnvironments: NMREnvironment[]
  nmrSummary: string
}

/** Build approximate IR curve from peak definitions */
export function buildIRSpectrum(peaks: IRPeak[]): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = []
  for (let w = 4000; w >= 400; w -= 20) {
    let y = 5 + Math.sin(w * 0.002) * 2
    for (const peak of peaks) {
      const width = peak.width ?? (peak.broad ? 200 : 40)
      const dist = Math.abs(w - peak.wavenumber)
      y += peak.intensity * Math.exp(-(dist * dist) / (2 * width * width * 0.01))
    }
    points.push({ x: w, y: Math.min(y, 100) })
  }
  return points
}

export const spectroscopyDatabase: SpectroscopyData[] = [
  {
    compoundName: "ethanol",
    aliases: ["ethanol", "ethan-1-ol", "C2H5OH", "CH3CH2OH"],
    irPeaks: [
      { wavenumber: 3400, intensity: 55, label: "O—H stretch", broad: true, width: 280 },
      { wavenumber: 2980, intensity: 25, label: "C—H stretch", width: 50 },
      { wavenumber: 1100, intensity: 35, label: "C—O stretch", width: 45 },
    ],
    irSummary: "Broad O—H around 3200–3600 cm⁻¹; C—O stretch near 1100 cm⁻¹.",
    molecularIon: 46,
    msFragments: [
      { mz: 46, intensity: 30, label: "M+", explanation: "Molecular ion (C2H5OH+)" },
      { mz: 31, intensity: 100, label: "CH2OH+", explanation: "α-cleavage fragment from CH2OH+" },
      { mz: 29, intensity: 45, label: "CH2CH2+", explanation: "Alkyl fragment" },
    ],
    msSummary: "M+ = 46. Prominent fragment at m/z 31 from CH2OH+.",
    nmrEnvironments: [
      { proton: "CH3", shift: "1.1 ppm", splitting: "Triplet", integration: "3H" },
      { proton: "CH2", shift: "3.6 ppm", splitting: "Quartet", integration: "2H" },
      { proton: "OH", shift: "2–5 ppm", splitting: "Broad singlet", integration: "1H" },
    ],
    nmrSummary: "CH3 triplet, CH2 quartet, OH broad singlet (exchange broadens).",
  },
  {
    compoundName: "methanol",
    aliases: ["methanol", "CH3OH"],
    irPeaks: [
      { wavenumber: 3350, intensity: 60, label: "O—H stretch", broad: true, width: 300 },
      { wavenumber: 2950, intensity: 20, label: "C—H stretch", width: 45 },
      { wavenumber: 1050, intensity: 40, label: "C—O stretch", width: 40 },
    ],
    irSummary: "Broad O—H stretch; strong C—O near 1050 cm⁻¹.",
    molecularIon: 32,
    msFragments: [
      { mz: 32, intensity: 40, label: "M+", explanation: "Molecular ion" },
      { mz: 31, intensity: 100, label: "CH2OH+", explanation: "After H loss from M+" },
      { mz: 15, intensity: 25, label: "CH3+", explanation: "Methyl fragment" },
    ],
    msSummary: "M+ = 32; base peak often m/z 31.",
    nmrEnvironments: [
      { proton: "CH3", shift: "3.4 ppm", splitting: "Singlet", integration: "3H" },
      { proton: "OH", shift: "2–4 ppm", splitting: "Broad singlet", integration: "1H" },
    ],
    nmrSummary: "Methyl singlet deshielded by oxygen; broad OH.",
  },
  {
    compoundName: "ethanal",
    aliases: ["ethanal", "acetaldehyde", "CH3CHO"],
    irPeaks: [
      { wavenumber: 1730, intensity: 85, label: "C=O stretch", width: 35 },
      { wavenumber: 2980, intensity: 25, label: "C—H stretch", width: 50 },
      { wavenumber: 2720, intensity: 15, label: "Aldehyde C—H", width: 30 },
    ],
    irSummary: "Strong sharp C=O peak ~1730 cm⁻¹; aldehyde C—H ~2720 cm⁻¹.",
    molecularIon: 44,
    msFragments: [
      { mz: 44, intensity: 50, label: "M+", explanation: "Molecular ion CH3CHO+" },
      { mz: 43, intensity: 100, label: "CH3CO+", explanation: "Acylium ion after H loss" },
      { mz: 29, intensity: 35, label: "CHO+", explanation: "Formyl fragment" },
    ],
    msSummary: "M+ = 44; prominent m/z 43 (CH3CO+).",
    nmrEnvironments: [
      { proton: "CH3", shift: "2.2 ppm", splitting: "Doublet", integration: "3H" },
      { proton: "CHO", shift: "9.8 ppm", splitting: "Quartet", integration: "1H" },
    ],
    nmrSummary: "Aldehyde proton ~9–10 ppm; methyl coupled to CHO.",
  },
  {
    compoundName: "propanone",
    aliases: ["propanone", "acetone", "CH3COCH3"],
    irPeaks: [
      { wavenumber: 1715, intensity: 90, label: "C=O stretch", width: 35 },
      { wavenumber: 2970, intensity: 25, label: "C—H stretch", width: 50 },
    ],
    irSummary: "Strong C=O peak ~1715 cm⁻¹; no O—H or N—H.",
    molecularIon: 58,
    msFragments: [
      { mz: 58, intensity: 35, label: "M+", explanation: "Molecular ion" },
      { mz: 43, intensity: 100, label: "CH3CO+", explanation: "Acylium ion (base peak)" },
      { mz: 15, intensity: 30, label: "CH3+", explanation: "Methyl fragment" },
    ],
    msSummary: "M+ = 58; base peak m/z 43 (CH3CO+).",
    nmrEnvironments: [
      { proton: "CH3", shift: "2.1 ppm", splitting: "Singlet", integration: "6H" },
    ],
    nmrSummary: "Equivalent methyl groups singlet ~2.1 ppm (6H total).",
  },
  {
    compoundName: "ethanoic acid",
    aliases: ["ethanoic acid", "acetic acid", "CH3COOH"],
    irPeaks: [
      { wavenumber: 3000, intensity: 50, label: "O—H stretch", broad: true, width: 350 },
      { wavenumber: 1710, intensity: 80, label: "C=O stretch", width: 35 },
      { wavenumber: 1280, intensity: 40, label: "C—O stretch", width: 45 },
    ],
    irSummary: "Very broad O—H (2500–3300) plus C=O ~1710 cm⁻¹.",
    molecularIon: 60,
    msFragments: [
      { mz: 60, intensity: 15, label: "M+", explanation: "Molecular ion (weak)" },
      { mz: 43, intensity: 100, label: "CH3CO+", explanation: "Acylium ion" },
      { mz: 45, intensity: 40, label: "COOH+", explanation: "Carboxyl fragment" },
    ],
    msSummary: "M+ = 60 (weak); m/z 43 dominant.",
    nmrEnvironments: [
      { proton: "CH3", shift: "2.1 ppm", splitting: "Singlet", integration: "3H" },
      { proton: "COOH", shift: "11–12 ppm", splitting: "Broad singlet", integration: "1H" },
    ],
    nmrSummary: "COOH very downfield (~11 ppm); methyl singlet ~2.1 ppm.",
  },
  {
    compoundName: "methylamine",
    aliases: ["methylamine", "CH3NH2"],
    irPeaks: [
      { wavenumber: 3380, intensity: 45, label: "N—H stretch", width: 60 },
      { wavenumber: 3350, intensity: 40, label: "N—H stretch", width: 55 },
      { wavenumber: 2970, intensity: 25, label: "C—H stretch", width: 50 },
    ],
    irSummary: "Two N—H stretches ~3300–3500 cm⁻¹ (primary amine).",
    molecularIon: 31,
    msFragments: [
      { mz: 31, intensity: 60, label: "M+", explanation: "Molecular ion CH3NH2+" },
      { mz: 30, intensity: 100, label: "[M−H]+", explanation: "Loss of H from M+" },
      { mz: 15, intensity: 20, label: "CH3+", explanation: "Methyl fragment" },
    ],
    msSummary: "M+ = 31; fragmentation often shows [M−H]+.",
    nmrEnvironments: [
      { proton: "CH3", shift: "2.4 ppm", splitting: "Singlet", integration: "3H" },
      { proton: "NH2", shift: "1–3 ppm", splitting: "Broad singlet", integration: "2H" },
    ],
    nmrSummary: "Methyl singlet ~2.4 ppm; NH2 broad (exchange).",
  },
  {
    compoundName: "benzene",
    aliases: ["benzene", "C6H6"],
    irPeaks: [
      { wavenumber: 3030, intensity: 20, label: "sp² C—H", width: 40 },
      { wavenumber: 1600, intensity: 45, label: "C=C ring", width: 25 },
      { wavenumber: 1500, intensity: 35, label: "C=C ring", width: 25 },
    ],
    irSummary: "Aromatic C=C at 1600 & 1500 cm⁻¹; sp² C—H ~3000 cm⁻¹.",
    molecularIon: 78,
    msFragments: [
      { mz: 78, intensity: 100, label: "M+", explanation: "Molecular ion C6H6+" },
      { mz: 77, intensity: 35, label: "C6H5+", explanation: "Phenyl cation" },
      { mz: 52, intensity: 20, label: "C4H4+", explanation: "Ring fragmentation" },
    ],
    msSummary: "M+ = 78; phenyl cation m/z 77 common.",
    nmrEnvironments: [
      { proton: "Aromatic H", shift: "7.3 ppm", splitting: "Singlet", integration: "6H" },
    ],
    nmrSummary: "All aromatic protons equivalent singlet ~7.3 ppm.",
  },
  {
    compoundName: "methyl ethanoate",
    aliases: ["methyl ethanoate", "methyl acetate"],
    irPeaks: [
      { wavenumber: 1740, intensity: 85, label: "C=O stretch", width: 35 },
      { wavenumber: 1200, intensity: 45, label: "C—O stretch", width: 40 },
      { wavenumber: 2980, intensity: 20, label: "C—H stretch", width: 50 },
    ],
    irSummary: "C=O ~1740 cm⁻¹; no broad O—H (vs carboxylic acid).",
    molecularIon: 74,
    msFragments: [
      { mz: 74, intensity: 25, label: "M+", explanation: "Molecular ion" },
      { mz: 43, intensity: 100, label: "CH3CO+", explanation: "Acylium ion" },
      { mz: 59, intensity: 40, label: "COOCH3+", explanation: "Methoxy carbonyl" },
    ],
    msSummary: "M+ = 74; m/z 43 base peak.",
    nmrEnvironments: [
      { proton: "OCH3", shift: "3.7 ppm", splitting: "Singlet", integration: "3H" },
      { proton: "CH3CO", shift: "2.0 ppm", splitting: "Singlet", integration: "3H" },
    ],
    nmrSummary: "OCH3 singlet ~3.7 ppm; acetyl methyl ~2.0 ppm.",
  },
  {
    compoundName: "ethanamide",
    aliases: ["ethanamide", "acetamide", "CH3CONH2"],
    irPeaks: [
      { wavenumber: 3350, intensity: 40, label: "N—H stretch", width: 55 },
      { wavenumber: 3180, intensity: 35, label: "N—H stretch", width: 50 },
      { wavenumber: 1660, intensity: 75, label: "C=O (amide)", width: 40 },
    ],
    irSummary: "N—H stretches + amide C=O ~1660 cm⁻¹.",
    molecularIon: 59,
    msFragments: [
      { mz: 59, intensity: 50, label: "M+", explanation: "Molecular ion" },
      { mz: 44, intensity: 100, label: "Amide fragment", explanation: "Cleavage at amide bond" },
      { mz: 43, intensity: 60, label: "CH3CO+", explanation: "Acylium ion" },
    ],
    msSummary: "M+ = 59; cleavage at amide bond possible.",
    nmrEnvironments: [
      { proton: "CH3", shift: "2.0 ppm", splitting: "Singlet", integration: "3H" },
      { proton: "NH2", shift: "5–7 ppm", splitting: "Broad singlet", integration: "2H" },
    ],
    nmrSummary: "NH2 broad ~5–7 ppm; methyl singlet ~2.0 ppm.",
  },
  {
    compoundName: "methoxyethane",
    aliases: ["methoxyethane", "ethyl methyl ether"],
    irPeaks: [
      { wavenumber: 2980, intensity: 25, label: "C—H stretch", width: 50 },
      { wavenumber: 1100, intensity: 50, label: "C—O—C stretch", width: 45 },
    ],
    irSummary: "C—O—C stretch ~1100 cm⁻¹; no O—H peak.",
    molecularIon: 60,
    msFragments: [
      { mz: 60, intensity: 30, label: "M+", explanation: "Molecular ion" },
      { mz: 45, intensity: 100, label: "CH3OCH2+", explanation: "α-cleavage at ether" },
      { mz: 29, intensity: 40, label: "CH3CH2+", explanation: "Ethyl fragment" },
    ],
    msSummary: "M+ = 60; α-cleavage at ether linkage.",
    nmrEnvironments: [
      { proton: "OCH3", shift: "3.3 ppm", splitting: "Singlet", integration: "3H" },
      { proton: "CH2", shift: "3.4 ppm", splitting: "Quartet", integration: "2H" },
      { proton: "CH3", shift: "1.1 ppm", splitting: "Triplet", integration: "3H" },
    ],
    nmrSummary: "OCH3 singlet; ethyl triplet-quartet; no OH.",
  },
  {
    compoundName: "chloromethane",
    aliases: ["chloromethane", "CH3Cl"],
    irPeaks: [
      { wavenumber: 730, intensity: 55, label: "C—Cl stretch", width: 35 },
      { wavenumber: 2980, intensity: 25, label: "C—H stretch", width: 50 },
    ],
    irSummary: "C—Cl stretch in fingerprint region ~700–800 cm⁻¹.",
    molecularIon: 50,
    msFragments: [
      { mz: 50, intensity: 40, label: "M+", explanation: "Molecular ion (Cl isotope pattern)" },
      { mz: 15, intensity: 100, label: "CH3+", explanation: "Loss of Cl" },
    ],
    msSummary: "M+ = 50; watch for Cl isotope 3:1 pattern.",
    nmrEnvironments: [
      { proton: "CH3", shift: "3.0 ppm", splitting: "Singlet", integration: "3H" },
    ],
    nmrSummary: "Methyl singlet deshielded by chlorine ~3 ppm.",
  },
  {
    compoundName: "bromoethane",
    aliases: ["bromoethane", "CH3CH2Br"],
    irPeaks: [
      { wavenumber: 650, intensity: 50, label: "C—Br stretch", width: 35 },
      { wavenumber: 2980, intensity: 25, label: "C—H stretch", width: 50 },
    ],
    irSummary: "C—Br stretch ~600–700 cm⁻¹.",
    molecularIon: 108,
    msFragments: [
      { mz: 108, intensity: 25, label: "M+", explanation: "Molecular ion (Br isotope 1:1)" },
      { mz: 29, intensity: 100, label: "CH2CH2+", explanation: "Loss of Br" },
    ],
    msSummary: "M+ = 108; Br gives 1:1 isotope pattern.",
    nmrEnvironments: [
      { proton: "CH3", shift: "1.5 ppm", splitting: "Triplet", integration: "3H" },
      { proton: "CH2", shift: "3.4 ppm", splitting: "Quartet", integration: "2H" },
    ],
    nmrSummary: "CH2 deshielded by Br; ethyl pattern.",
  },
]

export function findSpectroscopyData(query: string): SpectroscopyData | null {
  const q = query.toLowerCase().trim().replace(/\s+/g, "")
  for (const data of spectroscopyDatabase) {
    if (data.compoundName.toLowerCase().replace(/\s+/g, "") === q) return data
    if (data.aliases.some((a) => a.toLowerCase().replace(/\s+/g, "") === q)) return data
  }
  return null
}

export function getSpectroscopyForCompound(compoundName: string, aliases: string[] = []): SpectroscopyData | null {
  const fromName = findSpectroscopyData(compoundName)
  if (fromName) return fromName
  for (const alias of aliases) {
    const match = findSpectroscopyData(alias)
    if (match) return match
  }
  return null
}

export function getAvailableSpectroscopyCompounds(): string[] {
  return spectroscopyDatabase.map((d) => d.compoundName)
}

export function getDefaultIRForGroup(groupId: string): IRPeak[] {
  const defaults: Record<string, IRPeak[]> = {
    hydroxyl: [{ wavenumber: 3400, intensity: 55, label: "O—H stretch", broad: true, width: 280 }],
    carbonyl: [{ wavenumber: 1710, intensity: 85, label: "C=O stretch", width: 35 }],
    carboxyl: [
      { wavenumber: 3000, intensity: 50, label: "O—H stretch", broad: true, width: 350 },
      { wavenumber: 1710, intensity: 80, label: "C=O stretch", width: 35 },
    ],
    amino: [
      { wavenumber: 3380, intensity: 42, label: "N—H stretch", width: 55 },
      { wavenumber: 3340, intensity: 38, label: "N—H stretch", width: 50 },
    ],
    amido: [
      { wavenumber: 3350, intensity: 40, label: "N—H stretch", width: 55 },
      { wavenumber: 1660, intensity: 75, label: "C=O (amide)", width: 40 },
    ],
    ester: [{ wavenumber: 1740, intensity: 85, label: "C=O stretch", width: 35 }],
    phenyl: [
      { wavenumber: 1600, intensity: 45, label: "Aromatic C=C", width: 25 },
      { wavenumber: 1500, intensity: 35, label: "Aromatic C=C", width: 25 },
    ],
    alkoxy: [{ wavenumber: 1100, intensity: 50, label: "C—O—C stretch", width: 45 }],
    halogeno: [{ wavenumber: 700, intensity: 50, label: "C—X stretch", width: 35 }],
  }
  return defaults[groupId] ?? []
}
