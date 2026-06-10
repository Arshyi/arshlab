import type { BondPreset } from "./bonding-types"

export const BOND_PRESETS: BondPreset[] = [
  {
    id: "h-h",
    label: "H-H sigma bond",
    atoms: ["H", "H"],
    bondOrder: 1,
    bondType: "sigma",
    overlapType: "s-s",
    equilibriumDistance: 0.74,
    bondEnergy: 436,
    orbitalDescription: "1s-1s sigma overlap",
    explanation:
      "Hydrogen atoms form a sigma bond when their 1s orbitals overlap head-on and concentrate electron density between the nuclei.",
    examples: ["H2", "simple covalent sigma bonding"],
    mode: "covalent",
  },
  {
    id: "h-f",
    label: "H-F polar sigma bond",
    atoms: ["H", "F"],
    bondOrder: 1,
    bondType: "sigma",
    overlapType: "s-p",
    equilibriumDistance: 0.92,
    bondEnergy: 565,
    orbitalDescription: "1s-2p sigma overlap",
    explanation:
      "Hydrogen fluoride forms a strong polar sigma bond through head-on overlap between hydrogen 1s and fluorine 2p character.",
    examples: ["HF", "polar covalent bonding"],
    mode: "covalent",
  },
  {
    id: "f-f",
    label: "F-F sigma bond",
    atoms: ["F", "F"],
    bondOrder: 1,
    bondType: "sigma",
    overlapType: "p-p-sigma",
    equilibriumDistance: 1.42,
    bondEnergy: 158,
    orbitalDescription: "2p-2p sigma overlap",
    explanation:
      "Fluorine atoms share a single sigma bond, but lone-pair repulsions make the bond weaker than many other single bonds.",
    examples: ["F2", "halogen single bonds"],
    mode: "covalent",
  },
  {
    id: "cl-cl",
    label: "Cl-Cl sigma bond",
    atoms: ["Cl", "Cl"],
    bondOrder: 1,
    bondType: "sigma",
    overlapType: "p-p-sigma",
    equilibriumDistance: 1.99,
    bondEnergy: 243,
    orbitalDescription: "3p-3p sigma overlap",
    explanation:
      "Chlorine atoms form a longer sigma bond because their valence orbitals are larger and more diffuse than fluorine's.",
    examples: ["Cl2", "halogen single bonds"],
    mode: "covalent",
  },
  {
    id: "o-o-double",
    label: "O=O sigma + pi bond",
    atoms: ["O", "O"],
    bondOrder: 2,
    bondType: "pi",
    overlapType: "p-p-pi",
    equilibriumDistance: 1.21,
    bondEnergy: 498,
    orbitalDescription: "one 2p-2p sigma overlap plus one side-on pi overlap",
    explanation:
      "Oxygen's double bond contains one sigma bond along the internuclear axis and one pi bond above and below that axis.",
    examples: ["O2", "double bonds", "sigma plus pi overlap"],
    mode: "multiple-bond",
  },
  {
    id: "n-n-triple",
    label: "N=N triple-style overlap",
    atoms: ["N", "N"],
    bondOrder: 3,
    bondType: "pi",
    overlapType: "p-p-pi",
    equilibriumDistance: 1.1,
    bondEnergy: 945,
    orbitalDescription: "one sigma overlap plus two perpendicular pi overlaps",
    explanation:
      "Nitrogen's very strong triple bond combines one sigma bond with two perpendicular pi overlaps, creating a deep energy well.",
    examples: ["N2", "triple bonds", "high bond energy"],
    mode: "multiple-bond",
  },
  {
    id: "c-c-double",
    label: "C=C sigma + pi bond",
    atoms: ["C", "C"],
    bondOrder: 2,
    bondType: "pi",
    overlapType: "p-p-pi",
    equilibriumDistance: 1.34,
    bondEnergy: 614,
    orbitalDescription: "one sigma overlap plus one p-p pi overlap",
    explanation:
      "A carbon-carbon double bond is shorter and stronger than a single bond because a pi overlap is added to the sigma framework.",
    examples: ["ethene", "alkenes", "C=C"],
    mode: "multiple-bond",
  },
  {
    id: "c-c-triple",
    label: "C=C triple-style overlap",
    atoms: ["C", "C"],
    bondOrder: 3,
    bondType: "pi",
    overlapType: "p-p-pi",
    equilibriumDistance: 1.2,
    bondEnergy: 839,
    orbitalDescription: "one sigma overlap plus two perpendicular p-p pi overlaps",
    explanation:
      "A carbon-carbon triple bond is shorter and stronger than a double bond because two pi overlaps reinforce the sigma bond.",
    examples: ["ethyne", "alkynes", "C2H2"],
    mode: "multiple-bond",
  },
  {
    id: "he-he",
    label: "He-He nonbonding comparison",
    atoms: ["He", "He"],
    bondOrder: 0,
    bondType: "nonbonding",
    overlapType: "s-s",
    equilibriumDistance: 2.97,
    bondEnergy: 0.08,
    orbitalDescription: "closed-shell 1s clouds with almost no covalent stabilization",
    explanation:
      "Helium atoms have filled 1s shells. Any attraction is extremely weak, so the model shows a nearly flat well rather than a stable covalent bond.",
    examples: ["He-He", "noble gas comparison"],
    mode: "nonbonding",
  },
  {
    id: "ne-ne",
    label: "Ne-Ne repulsive comparison",
    atoms: ["Ne", "Ne"],
    bondOrder: 0,
    bondType: "repulsive",
    overlapType: "p-p-sigma",
    equilibriumDistance: 3.1,
    bondEnergy: 0.35,
    orbitalDescription: "closed-shell clouds with weak dispersion and dominant short-range repulsion",
    explanation:
      "Neon atoms are closed-shell particles. They do not form strong covalent bonds, and pushing their clouds together quickly becomes repulsive.",
    examples: ["Ne-Ne", "noble gas comparison"],
    mode: "repulsive",
  },
]

const presetById = new Map(BOND_PRESETS.map((preset) => [preset.id, preset]))

export function listBondPresets(): BondPreset[] {
  return BOND_PRESETS
}

export function getBondPreset(id: string): BondPreset | undefined {
  return presetById.get(id)
}

export function findBondPresetForAtoms(leftAtom: string, rightAtom: string): BondPreset | undefined {
  const pair = [leftAtom, rightAtom].sort().join("-")
  return BOND_PRESETS.find((preset) => preset.atoms.slice().sort().join("-") === pair)
}

export function createEducationalBondPreset(
  leftAtom: string,
  rightAtom: string,
  fallback?: Partial<BondPreset>,
): BondPreset {
  const found = findBondPresetForAtoms(leftAtom, rightAtom)
  if (found) return { ...found, ...fallback, atoms: [leftAtom, rightAtom] }

  const hasNobleGas = ["He", "Ne"].includes(leftAtom) || ["He", "Ne"].includes(rightAtom)
  const bondType = hasNobleGas ? "nonbonding" : fallback?.bondType ?? "sigma"
  const overlapType = fallback?.overlapType ?? (leftAtom === "H" || rightAtom === "H" ? "s-p" : "p-p-sigma")

  const preset: BondPreset = {
    id: `${leftAtom.toLowerCase()}-${rightAtom.toLowerCase()}-custom`,
    label: `${leftAtom}-${rightAtom} conceptual interaction`,
    atoms: [leftAtom, rightAtom],
    bondOrder: hasNobleGas ? 0 : 1,
    bondType,
    overlapType,
    equilibriumDistance: hasNobleGas ? 3.0 : 1.45,
    bondEnergy: hasNobleGas ? 0.2 : 320,
    orbitalDescription: hasNobleGas ? "closed-shell nonbonding interaction" : "conceptual valence-orbital overlap",
    explanation: hasNobleGas
      ? "Closed-shell atoms have little tendency to share electron density, so the interaction is weak and mostly useful as a repulsion comparison."
      : "This custom pair uses an educational approximation to show how overlap and distance affect bond stability.",
    examples: ["custom comparison"],
    mode: hasNobleGas ? "nonbonding" : "covalent",
    ...fallback,
  }

  return { ...preset, atoms: [leftAtom, rightAtom] }
}
