import type { VSEPRShapeId } from "./shapes"

export interface VSEPRPrediction {
  id: string
  compoundId?: string
  formula: string
  name: string
  stericNumber: number
  lonePairs: number
  bondingPairs: number
  electronGeometry: string
  molecularGeometry: string
  shapeId: VSEPRShapeId
  bondAngle: string
  notes: string
}

export const VSEPR_PRESETS: VSEPRPrediction[] = [
  { id: "vsepr-h2o", formula: "H2O", name: "water", stericNumber: 4, lonePairs: 2, bondingPairs: 2, electronGeometry: "Tetrahedral", molecularGeometry: "Bent", shapeId: "bent", bondAngle: "104.5°", notes: "Two lone pairs compress H—O—H angle below tetrahedral." },
  { id: "vsepr-nh3", formula: "NH3", name: "ammonia", stericNumber: 4, lonePairs: 1, bondingPairs: 3, electronGeometry: "Tetrahedral", molecularGeometry: "Trigonal pyramidal", shapeId: "trigonal-pyramidal", bondAngle: "107°", notes: "Lone pair repulsion reduces H—N—H angle." },
  { id: "vsepr-co2", formula: "CO2", name: "carbon dioxide", stericNumber: 2, lonePairs: 0, bondingPairs: 2, electronGeometry: "Linear", molecularGeometry: "Linear", shapeId: "linear", bondAngle: "180°", notes: "No lone pairs on central C." },
  { id: "vsepr-so2", formula: "SO2", name: "sulfur dioxide", stericNumber: 3, lonePairs: 1, bondingPairs: 2, electronGeometry: "Trigonal planar", molecularGeometry: "Bent", shapeId: "bent", bondAngle: "~119°", notes: "S has one lone pair." },
  { id: "vsepr-so3", formula: "SO3", name: "sulfur trioxide", stericNumber: 3, lonePairs: 0, bondingPairs: 3, electronGeometry: "Trigonal planar", molecularGeometry: "Trigonal planar", shapeId: "trigonal-planar", bondAngle: "120°", notes: "" },
  { id: "vsepr-bf3", formula: "BF3", name: "boron trifluoride", stericNumber: 3, lonePairs: 0, bondingPairs: 3, electronGeometry: "Trigonal planar", molecularGeometry: "Trigonal planar", shapeId: "trigonal-planar", bondAngle: "120°", notes: "Incomplete octet on B." },
  { id: "vsepr-ch4", formula: "CH4", name: "methane", stericNumber: 4, lonePairs: 0, bondingPairs: 4, electronGeometry: "Tetrahedral", molecularGeometry: "Tetrahedral", shapeId: "tetrahedral", bondAngle: "109.5°", notes: "Ideal tetrahedral angle." },
  { id: "vsepr-pcl5", formula: "PCl5", name: "phosphorus pentachloride", stericNumber: 5, lonePairs: 0, bondingPairs: 5, electronGeometry: "Trigonal bipyramidal", molecularGeometry: "Trigonal bipyramidal", shapeId: "trigonal-bipyramidal", bondAngle: "90° / 120°", notes: "Axial vs equatorial positions differ." },
  { id: "vsepr-sf4", formula: "SF4", name: "sulfur tetrafluoride", stericNumber: 5, lonePairs: 1, bondingPairs: 4, electronGeometry: "Trigonal bipyramidal", molecularGeometry: "See-saw", shapeId: "see-saw", bondAngle: "173° / 102°", notes: "Lone pair occupies equatorial site." },
  { id: "vsepr-clf3", formula: "ClF3", name: "chlorine trifluoride", stericNumber: 5, lonePairs: 2, bondingPairs: 3, electronGeometry: "Trigonal bipyramidal", molecularGeometry: "T-shaped", shapeId: "t-shaped", bondAngle: "~87°", notes: "Two lone pairs equatorial." },
  { id: "vsepr-sf6", formula: "SF6", name: "sulfur hexafluoride", stericNumber: 6, lonePairs: 0, bondingPairs: 6, electronGeometry: "Octahedral", molecularGeometry: "Octahedral", shapeId: "octahedral", bondAngle: "90°", notes: "Symmetric octahedral." },
  { id: "vsepr-xef4", formula: "XeF4", name: "xenon tetrafluoride", stericNumber: 6, lonePairs: 2, bondingPairs: 4, electronGeometry: "Octahedral", molecularGeometry: "Square planar", shapeId: "square-planar", bondAngle: "90°", notes: "Lone pairs opposite (trans) on octahedron." },
  { id: "vsepr-no2", formula: "NO2", name: "nitrogen dioxide", stericNumber: 3, lonePairs: 1, bondingPairs: 2, electronGeometry: "Trigonal planar", molecularGeometry: "Bent", shapeId: "bent", bondAngle: "~134°", notes: "Radical; resonance affects geometry." },
  { id: "vsepr-o3", formula: "O3", name: "ozone", stericNumber: 3, lonePairs: 1, bondingPairs: 2, electronGeometry: "Trigonal planar", molecularGeometry: "Bent", shapeId: "bent", bondAngle: "~117°", notes: "Resonance between terminal O positions." },
]
