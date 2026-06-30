import type {
  HybridOrbital,
  HybridizationMode,
  HybridizationModel,
  HybridizationStage,
  LonePairExample,
  PiBondExample,
  SigmaPiModel,
  ViewerOrientation,
} from "./types"

function orbital(id: string, label: string, angle: number, occupancy: HybridOrbital["occupancy"], z = 0): HybridOrbital {
  const radians = (angle * Math.PI) / 180
  return {
    id,
    label,
    angle,
    x: Number(Math.cos(radians).toFixed(3)),
    y: Number(Math.sin(radians).toFixed(3)),
    z,
    occupancy,
  }
}

const STAGES: Record<HybridizationStage, string> = {
  before: "Separate 2s and 2p orbitals are shown before mixing.",
  promotion: "A valence electron can be promoted conceptually to create more singly occupied orbitals.",
  hybridization: "s and p character mix into directional hybrid orbitals.",
  "bond-formation": "Hybrid orbitals overlap head-on with outer atoms to make sigma bonds.",
}

export const HYBRIDIZATION_MODELS: HybridizationModel[] = [
  {
    mode: "sp",
    title: "sp hybridization",
    geometry: "Linear electron geometry",
    molecularGeometry: "Linear",
    electronDomains: 2,
    bondingDomains: 2,
    lonePairs: 0,
    idealAngles: "180 degrees",
    sCharacter: 50,
    pCharacter: 50,
    dCharacter: 0,
    relativeEnergy: 0.35,
    orbitals: [orbital("sp-a", "sp", 0, "bonding"), orbital("sp-b", "sp", 180, "bonding")],
    stages: STAGES,
    explanation: "Two sp orbitals point in opposite directions, leaving two unhybridized p orbitals for pi bonding.",
  },
  {
    mode: "sp2",
    title: "sp2 hybridization",
    geometry: "Trigonal planar electron geometry",
    molecularGeometry: "Trigonal planar",
    electronDomains: 3,
    bondingDomains: 3,
    lonePairs: 0,
    idealAngles: "120 degrees",
    sCharacter: 33,
    pCharacter: 67,
    dCharacter: 0,
    relativeEnergy: 0.55,
    orbitals: [orbital("sp2-a", "sp2", 90, "bonding"), orbital("sp2-b", "sp2", 210, "bonding"), orbital("sp2-c", "sp2", 330, "bonding")],
    stages: STAGES,
    explanation: "Three sp2 orbitals lie in a plane and one p orbital remains perpendicular for pi overlap.",
  },
  {
    mode: "sp3",
    title: "sp3 hybridization",
    geometry: "Tetrahedral electron geometry",
    molecularGeometry: "Tetrahedral, trigonal pyramidal, or bent depending on lone pairs",
    electronDomains: 4,
    bondingDomains: 4,
    lonePairs: 0,
    idealAngles: "109.5 degrees",
    sCharacter: 25,
    pCharacter: 75,
    dCharacter: 0,
    relativeEnergy: 0.72,
    orbitals: [
      orbital("sp3-a", "sp3", 45, "bonding", 0.58),
      orbital("sp3-b", "sp3", 135, "bonding", -0.58),
      orbital("sp3-c", "sp3", 225, "bonding", 0.58),
      orbital("sp3-d", "sp3", 315, "bonding", -0.58),
    ],
    stages: STAGES,
    explanation: "Four sp3 orbitals point toward the corners of a tetrahedron.",
  },
  {
    mode: "sp3d",
    title: "sp3d hybridization",
    geometry: "Trigonal bipyramidal electron geometry",
    molecularGeometry: "Trigonal bipyramidal or derived shapes",
    electronDomains: 5,
    bondingDomains: 5,
    lonePairs: 0,
    idealAngles: "90, 120, and 180 degrees",
    sCharacter: 20,
    pCharacter: 60,
    dCharacter: 20,
    relativeEnergy: 0.84,
    orbitals: [
      orbital("sp3d-a", "equatorial", 90, "bonding"),
      orbital("sp3d-b", "equatorial", 210, "bonding"),
      orbital("sp3d-c", "equatorial", 330, "bonding"),
      orbital("sp3d-d", "axial", 0, "bonding", 1),
      orbital("sp3d-e", "axial", 180, "bonding", -1),
    ],
    stages: STAGES,
    explanation: "Five domains are arranged as three equatorial and two axial directions.",
  },
  {
    mode: "sp3d2",
    title: "sp3d2 hybridization",
    geometry: "Octahedral electron geometry",
    molecularGeometry: "Octahedral or square planar with lone pairs",
    electronDomains: 6,
    bondingDomains: 6,
    lonePairs: 0,
    idealAngles: "90 and 180 degrees",
    sCharacter: 17,
    pCharacter: 50,
    dCharacter: 33,
    relativeEnergy: 0.94,
    orbitals: [
      orbital("sp3d2-a", "equatorial", 0, "bonding"),
      orbital("sp3d2-b", "equatorial", 90, "bonding"),
      orbital("sp3d2-c", "equatorial", 180, "bonding"),
      orbital("sp3d2-d", "equatorial", 270, "bonding"),
      orbital("sp3d2-e", "axial", 45, "bonding", 1),
      orbital("sp3d2-f", "axial", 225, "bonding", -1),
    ],
    stages: STAGES,
    explanation: "Six domains point to the corners of an octahedron.",
  },
]

export function getHybridizationModel(mode: HybridizationMode): HybridizationModel {
  return HYBRIDIZATION_MODELS.find((model) => model.mode === mode) ?? HYBRIDIZATION_MODELS[2]
}

export function getHybridizationEnergySeries() {
  return HYBRIDIZATION_MODELS.slice(0, 3).map((model) => ({
    mode: model.mode,
    energy: model.relativeEnergy,
    sCharacter: model.sCharacter,
    pCharacter: model.pCharacter,
    explanation:
      model.mode === "sp"
        ? "More s-character lowers energy and holds electrons closer to the nucleus."
        : model.mode === "sp2"
          ? "sp2 sits between sp and sp3 because it has intermediate s-character."
          : "More p-character raises the hybrid orbital energy relative to sp and sp2.",
  }))
}

export function buildSigmaPiModel(mode: "sigma" | "pi", orientation: ViewerOrientation): SigmaPiModel {
  if (mode === "sigma") {
    return {
      id: `sigma-${orientation}`,
      mode,
      title: "Sigma overlap",
      orientation,
      constructiveOverlap: "Head-on overlap concentrates electron density along the internuclear axis.",
      nodeDescription: "A sigma bond has cylindrical symmetry around the bond axis.",
      rotationRule: "Sigma bonds can rotate because overlap remains head-on during rotation.",
      explanation: "Hybrid orbitals or s orbitals overlap end-to-end to form a sigma bond.",
    }
  }

  return {
    id: `pi-${orientation}`,
    mode,
    title: "Pi overlap",
    orientation,
    constructiveOverlap: "Side-by-side p orbitals overlap above and below the sigma framework.",
    nodeDescription: "A pi bond has a nodal plane through the internuclear axis.",
    rotationRule: "Pi bonds resist rotation because twisting breaks side-by-side overlap.",
    explanation: "Unhybridized p orbitals overlap sideways to create pi electron density.",
  }
}

export const LONE_PAIR_EXAMPLES: LonePairExample[] = [
  {
    id: "nh3",
    name: "NH3",
    centralAtom: "N",
    hybridization: "sp3",
    molecularGeometry: "Trigonal pyramidal",
    lonePairs: 1,
    lonePairOrbitals: ["one occupied sp3 orbital"],
    unhybridizedOrbitals: [],
    explanation: "Nitrogen has four electron domains: three N-H sigma bonds and one sp3 lone pair.",
  },
  {
    id: "h2o",
    name: "H2O",
    centralAtom: "O",
    hybridization: "sp3",
    molecularGeometry: "Bent",
    lonePairs: 2,
    lonePairOrbitals: ["two occupied sp3 orbitals"],
    unhybridizedOrbitals: [],
    explanation: "Oxygen uses two sp3 orbitals for O-H sigma bonds and two sp3 orbitals for lone pairs.",
  },
  {
    id: "co2",
    name: "CO2",
    centralAtom: "C",
    hybridization: "sp",
    molecularGeometry: "Linear",
    lonePairs: 0,
    lonePairOrbitals: ["oxygen lone pairs occupy oxygen-centered orbitals"],
    unhybridizedOrbitals: ["two carbon p orbitals form pi bonds"],
    explanation: "Carbon is sp hybridized; each oxygen contains lone pairs outside the carbon-centered sigma framework.",
  },
  {
    id: "ch4",
    name: "CH4",
    centralAtom: "C",
    hybridization: "sp3",
    molecularGeometry: "Tetrahedral",
    lonePairs: 0,
    lonePairOrbitals: [],
    unhybridizedOrbitals: [],
    explanation: "All four carbon sp3 orbitals form C-H sigma bonds.",
  },
  {
    id: "ethanol",
    name: "Ethanol",
    centralAtom: "O",
    hybridization: "sp3",
    molecularGeometry: "Bent at oxygen",
    lonePairs: 2,
    lonePairOrbitals: ["two oxygen sp3 lone pairs"],
    unhybridizedOrbitals: [],
    explanation: "The alcohol oxygen has two sigma bonds and two sp3 lone-pair orbitals.",
  },
  {
    id: "phenol",
    name: "Phenol",
    centralAtom: "O",
    hybridization: "sp2",
    molecularGeometry: "Bent at oxygen",
    lonePairs: 2,
    lonePairOrbitals: ["one in-plane oxygen orbital", "one p-like orbital conjugated with the ring"],
    unhybridizedOrbitals: ["oxygen p orbital can interact with the aromatic pi system"],
    explanation: "Phenol's oxygen lone-pair description is resonance-aware, so one pair can interact with benzene pi orbitals.",
  },
  {
    id: "acetone",
    name: "Acetone",
    centralAtom: "O",
    hybridization: "sp2",
    molecularGeometry: "Trigonal planar at carbonyl carbon",
    lonePairs: 2,
    lonePairOrbitals: ["two oxygen-centered lone-pair orbitals"],
    unhybridizedOrbitals: ["C and O p orbitals form the carbonyl pi bond"],
    explanation: "The carbonyl uses a sigma bond plus a pi bond; oxygen retains two lone pairs.",
  },
]

export const PI_BOND_EXAMPLES: PiBondExample[] = [
  {
    id: "ethene",
    name: "Ethene",
    hybridization: "sp2",
    sigmaBonds: 5,
    piBonds: 1,
    remainingPOrbitals: 2,
    steps: ["sp2 forms on each carbon", "one p orbital remains on each carbon", "side overlap forms one pi bond"],
    explanation: "Ethene has one C-C sigma bond and one C=C pi bond.",
  },
  {
    id: "ethyne",
    name: "Ethyne",
    hybridization: "sp",
    sigmaBonds: 3,
    piBonds: 2,
    remainingPOrbitals: 4,
    steps: ["sp forms on each carbon", "two p orbitals remain on each carbon", "two perpendicular pi overlaps form"],
    explanation: "Ethyne has one C-C sigma bond and two pi bonds.",
  },
  {
    id: "benzene",
    name: "Benzene",
    hybridization: "sp2",
    sigmaBonds: 12,
    piBonds: 3,
    remainingPOrbitals: 6,
    steps: ["six sp2 carbons form a sigma ring", "six p orbitals remain", "pi electrons delocalize around the ring"],
    explanation: "Benzene's pi bonding is delocalized across the aromatic ring.",
  },
  {
    id: "carbonyl",
    name: "Carbonyl",
    hybridization: "sp2",
    sigmaBonds: 1,
    piBonds: 1,
    remainingPOrbitals: 2,
    steps: ["carbon and oxygen use sp2-like sigma overlap", "parallel p orbitals overlap", "C=O pi bond forms"],
    explanation: "The carbonyl double bond contains one sigma and one pi bond.",
  },
  {
    id: "nitrile",
    name: "Nitrile",
    hybridization: "sp",
    sigmaBonds: 1,
    piBonds: 2,
    remainingPOrbitals: 4,
    steps: ["carbon and nitrogen are sp hybridized", "one sigma bond forms along the axis", "two pi bonds form perpendicular to each other"],
    explanation: "A nitrile C≡N triple bond contains one sigma bond and two pi bonds.",
  },
]
