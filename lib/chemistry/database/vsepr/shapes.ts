export type VSEPRShapeId =
  | "linear"
  | "bent"
  | "trigonal-planar"
  | "trigonal-pyramidal"
  | "tetrahedral"
  | "trigonal-bipyramidal"
  | "see-saw"
  | "t-shaped"
  | "octahedral"
  | "square-pyramidal"
  | "square-planar"

export interface VSEPRShapeDefinition {
  id: VSEPRShapeId
  name: string
  electronGeometry: string
  molecularGeometry: string
  stericNumber: number
  lonePairs: number
  bondingPairs: number
  typicalBondAngle: string
  examples: string[]
}

export const VSEPR_SHAPES: VSEPRShapeDefinition[] = [
  {
    id: "linear",
    name: "Linear",
    electronGeometry: "Linear",
    molecularGeometry: "Linear",
    stericNumber: 2,
    lonePairs: 0,
    bondingPairs: 2,
    typicalBondAngle: "180°",
    examples: ["CO2", "BeCl2", "HCN"],
  },
  {
    id: "bent",
    name: "Bent",
    electronGeometry: "Tetrahedral",
    molecularGeometry: "Bent",
    stericNumber: 4,
    lonePairs: 2,
    bondingPairs: 2,
    typicalBondAngle: "~104.5° (H2O)",
    examples: ["H2O", "SO2", "O3", "NO2"],
  },
  {
    id: "trigonal-planar",
    name: "Trigonal planar",
    electronGeometry: "Trigonal planar",
    molecularGeometry: "Trigonal planar",
    stericNumber: 3,
    lonePairs: 0,
    bondingPairs: 3,
    typicalBondAngle: "120°",
    examples: ["BF3", "SO3", "CO3^2-"],
  },
  {
    id: "trigonal-pyramidal",
    name: "Trigonal pyramidal",
    electronGeometry: "Tetrahedral",
    molecularGeometry: "Trigonal pyramidal",
    stericNumber: 4,
    lonePairs: 1,
    bondingPairs: 3,
    typicalBondAngle: "~107° (NH3)",
    examples: ["NH3", "PCl3"],
  },
  {
    id: "tetrahedral",
    name: "Tetrahedral",
    electronGeometry: "Tetrahedral",
    molecularGeometry: "Tetrahedral",
    stericNumber: 4,
    lonePairs: 0,
    bondingPairs: 4,
    typicalBondAngle: "109.5°",
    examples: ["CH4", "CCl4", "NH4+"],
  },
  {
    id: "trigonal-bipyramidal",
    name: "Trigonal bipyramidal",
    electronGeometry: "Trigonal bipyramidal",
    molecularGeometry: "Trigonal bipyramidal",
    stericNumber: 5,
    lonePairs: 0,
    bondingPairs: 5,
    typicalBondAngle: "90° / 120°",
    examples: ["PCl5", "PF5"],
  },
  {
    id: "see-saw",
    name: "See-saw",
    electronGeometry: "Trigonal bipyramidal",
    molecularGeometry: "See-saw",
    stericNumber: 5,
    lonePairs: 1,
    bondingPairs: 4,
    typicalBondAngle: "173° / 102° / 87°",
    examples: ["SF4"],
  },
  {
    id: "t-shaped",
    name: "T-shaped",
    electronGeometry: "Trigonal bipyramidal",
    molecularGeometry: "T-shaped",
    stericNumber: 5,
    lonePairs: 2,
    bondingPairs: 3,
    typicalBondAngle: "90°",
    examples: ["ClF3", "BrF3"],
  },
  {
    id: "octahedral",
    name: "Octahedral",
    electronGeometry: "Octahedral",
    molecularGeometry: "Octahedral",
    stericNumber: 6,
    lonePairs: 0,
    bondingPairs: 6,
    typicalBondAngle: "90°",
    examples: ["SF6", "PF6-"],
  },
  {
    id: "square-pyramidal",
    name: "Square pyramidal",
    electronGeometry: "Octahedral",
    molecularGeometry: "Square pyramidal",
    stericNumber: 6,
    lonePairs: 1,
    bondingPairs: 5,
    typicalBondAngle: "90°",
    examples: ["BrF5", "ClF5"],
  },
  {
    id: "square-planar",
    name: "Square planar",
    electronGeometry: "Octahedral",
    molecularGeometry: "Square planar",
    stericNumber: 6,
    lonePairs: 2,
    bondingPairs: 4,
    typicalBondAngle: "90°",
    examples: ["XeF4", "I3-"],
  },
]
