// 3D Molecule data with atom coordinates and bonds
// Coordinates are approximate educational models

export interface Atom3D {
  element: string
  x: number
  y: number
  z: number
}

export interface Bond3D {
  a: number
  b: number
  order: 1 | 2 | 3
}

export interface LonePair {
  atomIndex: number
  count: number
}

export interface BondAngle {
  atoms: [number, number, number] // center atom is middle
  angle: string
}

export interface Molecule3D {
  name: string
  aliases: string[]
  formula: string
  atoms: Atom3D[]
  bonds: Bond3D[]
  lonePairs: LonePair[]
  bondAngles: BondAngle[]
}

// Bond lengths in Angstroms for reference
export const BOND_LENGTHS = {
  "C-C": 1.54,
  "C=C": 1.34,
  "C≡C": 1.20,
  "C-H": 1.09,
  "C-O": 1.43,
  "O-H": 0.96,
  "C=O": 1.23,
  "C-N": 1.47,
  "N-H": 1.01,
  "O=C=O": 1.16,
} as const

// Atom colors for visualization
export const ATOM_COLORS: Record<string, string> = {
  C: "#1a1a1a",
  H: "#ffffff",
  O: "#ef4444",
  N: "#3b82f6",
  Cl: "#22c55e",
  Br: "#a16207",
  S: "#eab308",
}

// Atom radii for visualization (relative scale)
export const ATOM_RADII: Record<string, number> = {
  C: 0.4,
  H: 0.25,
  O: 0.35,
  N: 0.35,
  Cl: 0.45,
  Br: 0.5,
  S: 0.45,
}

// Space-filling radii (van der Waals)
export const VDW_RADII: Record<string, number> = {
  C: 1.7,
  H: 1.2,
  O: 1.52,
  N: 1.55,
  Cl: 1.75,
  Br: 1.85,
  S: 1.8,
}

// Calculate bond length based on bond type and elements
export function getBondLength(element1: string, element2: string, order: number): string {
  const sortedPair = [element1, element2].sort().join("-")
  
  if (order === 2) {
    if (sortedPair === "C-C") return "1.34 Å"
    if (sortedPair === "C-O") return "1.23 Å"
  }
  if (order === 3) {
    if (sortedPair === "C-C") return "1.20 Å"
  }
  
  const lengths: Record<string, string> = {
    "C-C": "1.54 Å",
    "C-H": "1.09 Å",
    "C-O": "1.43 Å",
    "H-O": "0.96 Å",
    "C-N": "1.47 Å",
    "H-N": "1.01 Å",
  }
  
  return lengths[sortedPair] || "~1.5 Å"
}

// Tetrahedral angle helper
const TET = 109.5 * Math.PI / 180
const COS_TET = Math.cos(TET)
const SIN_TET = Math.sin(TET)

// 3D molecule database
export const molecules3D: Molecule3D[] = [
  // Water
  {
    name: "water",
    aliases: ["H2O", "dihydrogen monoxide"],
    formula: "H2O",
    atoms: [
      { element: "O", x: 0, y: 0, z: 0 },
      { element: "H", x: 0.76, y: 0.59, z: 0 },
      { element: "H", x: -0.76, y: 0.59, z: 0 },
    ],
    bonds: [
      { a: 0, b: 1, order: 1 },
      { a: 0, b: 2, order: 1 },
    ],
    lonePairs: [{ atomIndex: 0, count: 2 }],
    bondAngles: [{ atoms: [1, 0, 2], angle: "104.5°" }],
  },

  // Carbon Dioxide
  {
    name: "carbon dioxide",
    aliases: ["CO2"],
    formula: "CO2",
    atoms: [
      { element: "C", x: 0, y: 0, z: 0 },
      { element: "O", x: -1.16, y: 0, z: 0 },
      { element: "O", x: 1.16, y: 0, z: 0 },
    ],
    bonds: [
      { a: 0, b: 1, order: 2 },
      { a: 0, b: 2, order: 2 },
    ],
    lonePairs: [
      { atomIndex: 1, count: 2 },
      { atomIndex: 2, count: 2 },
    ],
    bondAngles: [{ atoms: [1, 0, 2], angle: "180°" }],
  },

  // Ammonia
  {
    name: "ammonia",
    aliases: ["NH3"],
    formula: "NH3",
    atoms: [
      { element: "N", x: 0, y: 0, z: 0 },
      { element: "H", x: 0.94, y: 0.38, z: 0 },
      { element: "H", x: -0.47, y: 0.38, z: 0.81 },
      { element: "H", x: -0.47, y: 0.38, z: -0.81 },
    ],
    bonds: [
      { a: 0, b: 1, order: 1 },
      { a: 0, b: 2, order: 1 },
      { a: 0, b: 3, order: 1 },
    ],
    lonePairs: [{ atomIndex: 0, count: 1 }],
    bondAngles: [
      { atoms: [1, 0, 2], angle: "107°" },
      { atoms: [2, 0, 3], angle: "107°" },
      { atoms: [1, 0, 3], angle: "107°" },
    ],
  },

  // Methane
  {
    name: "methane",
    aliases: ["CH4"],
    formula: "CH4",
    atoms: [
      { element: "C", x: 0, y: 0, z: 0 },
      { element: "H", x: 0.63, y: 0.63, z: 0.63 },
      { element: "H", x: -0.63, y: -0.63, z: 0.63 },
      { element: "H", x: -0.63, y: 0.63, z: -0.63 },
      { element: "H", x: 0.63, y: -0.63, z: -0.63 },
    ],
    bonds: [
      { a: 0, b: 1, order: 1 },
      { a: 0, b: 2, order: 1 },
      { a: 0, b: 3, order: 1 },
      { a: 0, b: 4, order: 1 },
    ],
    lonePairs: [],
    bondAngles: [
      { atoms: [1, 0, 2], angle: "109.5°" },
    ],
  },

  // Ethane
  {
    name: "ethane",
    aliases: ["C2H6", "CH3CH3", "CH3-CH3"],
    formula: "C2H6",
    atoms: [
      { element: "C", x: -0.77, y: 0, z: 0 },
      { element: "C", x: 0.77, y: 0, z: 0 },
      { element: "H", x: -1.16, y: 0.63, z: 0.78 },
      { element: "H", x: -1.16, y: 0.37, z: -0.93 },
      { element: "H", x: -1.16, y: -1, z: 0.15 },
      { element: "H", x: 1.16, y: -0.63, z: -0.78 },
      { element: "H", x: 1.16, y: -0.37, z: 0.93 },
      { element: "H", x: 1.16, y: 1, z: -0.15 },
    ],
    bonds: [
      { a: 0, b: 1, order: 1 },
      { a: 0, b: 2, order: 1 },
      { a: 0, b: 3, order: 1 },
      { a: 0, b: 4, order: 1 },
      { a: 1, b: 5, order: 1 },
      { a: 1, b: 6, order: 1 },
      { a: 1, b: 7, order: 1 },
    ],
    lonePairs: [],
    bondAngles: [
      { atoms: [2, 0, 1], angle: "109.5°" },
    ],
  },

  // Propane
  {
    name: "propane",
    aliases: ["C3H8", "CH3CH2CH3", "CH3-CH2-CH3"],
    formula: "C3H8",
    atoms: [
      { element: "C", x: -1.27, y: -0.26, z: 0 },
      { element: "C", x: 0, y: 0.55, z: 0 },
      { element: "C", x: 1.27, y: -0.26, z: 0 },
      { element: "H", x: -1.27, y: -0.9, z: 0.88 },
      { element: "H", x: -1.27, y: -0.9, z: -0.88 },
      { element: "H", x: -2.15, y: 0.4, z: 0 },
      { element: "H", x: 0, y: 1.19, z: 0.88 },
      { element: "H", x: 0, y: 1.19, z: -0.88 },
      { element: "H", x: 1.27, y: -0.9, z: 0.88 },
      { element: "H", x: 1.27, y: -0.9, z: -0.88 },
      { element: "H", x: 2.15, y: 0.4, z: 0 },
    ],
    bonds: [
      { a: 0, b: 1, order: 1 },
      { a: 1, b: 2, order: 1 },
      { a: 0, b: 3, order: 1 },
      { a: 0, b: 4, order: 1 },
      { a: 0, b: 5, order: 1 },
      { a: 1, b: 6, order: 1 },
      { a: 1, b: 7, order: 1 },
      { a: 2, b: 8, order: 1 },
      { a: 2, b: 9, order: 1 },
      { a: 2, b: 10, order: 1 },
    ],
    lonePairs: [],
    bondAngles: [
      { atoms: [0, 1, 2], angle: "109.5°" },
    ],
  },

  // Ethene (Ethylene)
  {
    name: "ethene",
    aliases: ["ethylene", "C2H4", "CH2CH2", "CH2=CH2"],
    formula: "C2H4",
    atoms: [
      { element: "C", x: -0.67, y: 0, z: 0 },
      { element: "C", x: 0.67, y: 0, z: 0 },
      { element: "H", x: -1.24, y: 0.93, z: 0 },
      { element: "H", x: -1.24, y: -0.93, z: 0 },
      { element: "H", x: 1.24, y: 0.93, z: 0 },
      { element: "H", x: 1.24, y: -0.93, z: 0 },
    ],
    bonds: [
      { a: 0, b: 1, order: 2 },
      { a: 0, b: 2, order: 1 },
      { a: 0, b: 3, order: 1 },
      { a: 1, b: 4, order: 1 },
      { a: 1, b: 5, order: 1 },
    ],
    lonePairs: [],
    bondAngles: [
      { atoms: [2, 0, 1], angle: "120°" },
      { atoms: [3, 0, 1], angle: "120°" },
    ],
  },

  // Ethyne (Acetylene)
  {
    name: "ethyne",
    aliases: ["acetylene", "C2H2", "CHCH", "CH≡CH"],
    formula: "C2H2",
    atoms: [
      { element: "C", x: -0.6, y: 0, z: 0 },
      { element: "C", x: 0.6, y: 0, z: 0 },
      { element: "H", x: -1.66, y: 0, z: 0 },
      { element: "H", x: 1.66, y: 0, z: 0 },
    ],
    bonds: [
      { a: 0, b: 1, order: 3 },
      { a: 0, b: 2, order: 1 },
      { a: 1, b: 3, order: 1 },
    ],
    lonePairs: [],
    bondAngles: [
      { atoms: [2, 0, 1], angle: "180°" },
    ],
  },

  // Methanol
  {
    name: "methanol",
    aliases: ["CH3OH", "CH3-OH", "methyl alcohol"],
    formula: "CH4O",
    atoms: [
      { element: "C", x: -0.55, y: 0, z: 0 },
      { element: "O", x: 0.85, y: 0, z: 0 },
      { element: "H", x: 1.25, y: 0.88, z: 0 },
      { element: "H", x: -0.95, y: 0.63, z: 0.78 },
      { element: "H", x: -0.95, y: 0.37, z: -0.93 },
      { element: "H", x: -0.95, y: -1, z: 0.15 },
    ],
    bonds: [
      { a: 0, b: 1, order: 1 },
      { a: 1, b: 2, order: 1 },
      { a: 0, b: 3, order: 1 },
      { a: 0, b: 4, order: 1 },
      { a: 0, b: 5, order: 1 },
    ],
    lonePairs: [{ atomIndex: 1, count: 2 }],
    bondAngles: [
      { atoms: [0, 1, 2], angle: "108.5°" },
    ],
  },

  // Ethanol
  {
    name: "ethanol",
    aliases: ["ethan-1-ol", "CH3CH2OH", "CH3-CH2-OH", "C2H5OH", "ethyl alcohol"],
    formula: "C2H6O",
    atoms: [
      { element: "C", x: -1.27, y: -0.26, z: 0 },
      { element: "C", x: 0, y: 0.55, z: 0 },
      { element: "O", x: 1.2, y: -0.2, z: 0 },
      { element: "H", x: 1.95, y: 0.38, z: 0 },
      { element: "H", x: -1.27, y: -0.9, z: 0.88 },
      { element: "H", x: -1.27, y: -0.9, z: -0.88 },
      { element: "H", x: -2.15, y: 0.4, z: 0 },
      { element: "H", x: 0, y: 1.19, z: 0.88 },
      { element: "H", x: 0, y: 1.19, z: -0.88 },
    ],
    bonds: [
      { a: 0, b: 1, order: 1 },
      { a: 1, b: 2, order: 1 },
      { a: 2, b: 3, order: 1 },
      { a: 0, b: 4, order: 1 },
      { a: 0, b: 5, order: 1 },
      { a: 0, b: 6, order: 1 },
      { a: 1, b: 7, order: 1 },
      { a: 1, b: 8, order: 1 },
    ],
    lonePairs: [{ atomIndex: 2, count: 2 }],
    bondAngles: [
      { atoms: [0, 1, 2], angle: "109.5°" },
      { atoms: [1, 2, 3], angle: "108.5°" },
    ],
  },

  // Propan-1-ol
  {
    name: "propan-1-ol",
    aliases: ["1-propanol", "CH3CH2CH2OH", "CH3-CH2-CH2-OH", "n-propanol", "propyl alcohol"],
    formula: "C3H8O",
    atoms: [
      { element: "C", x: -1.9, y: -0.3, z: 0 },
      { element: "C", x: -0.55, y: 0.4, z: 0 },
      { element: "C", x: 0.75, y: -0.4, z: 0 },
      { element: "O", x: 2, y: 0.3, z: 0 },
      { element: "H", x: 2.75, y: -0.2, z: 0 },
      { element: "H", x: -1.9, y: -0.95, z: 0.88 },
      { element: "H", x: -1.9, y: -0.95, z: -0.88 },
      { element: "H", x: -2.8, y: 0.35, z: 0 },
      { element: "H", x: -0.55, y: 1.05, z: 0.88 },
      { element: "H", x: -0.55, y: 1.05, z: -0.88 },
      { element: "H", x: 0.75, y: -1.05, z: 0.88 },
      { element: "H", x: 0.75, y: -1.05, z: -0.88 },
    ],
    bonds: [
      { a: 0, b: 1, order: 1 },
      { a: 1, b: 2, order: 1 },
      { a: 2, b: 3, order: 1 },
      { a: 3, b: 4, order: 1 },
      { a: 0, b: 5, order: 1 },
      { a: 0, b: 6, order: 1 },
      { a: 0, b: 7, order: 1 },
      { a: 1, b: 8, order: 1 },
      { a: 1, b: 9, order: 1 },
      { a: 2, b: 10, order: 1 },
      { a: 2, b: 11, order: 1 },
    ],
    lonePairs: [{ atomIndex: 3, count: 2 }],
    bondAngles: [
      { atoms: [0, 1, 2], angle: "109.5°" },
      { atoms: [1, 2, 3], angle: "109.5°" },
      { atoms: [2, 3, 4], angle: "108.5°" },
    ],
  },

  // Propan-2-ol
  {
    name: "propan-2-ol",
    aliases: ["2-propanol", "isopropanol", "isopropyl alcohol", "(CH3)2CHOH"],
    formula: "C3H8O",
    atoms: [
      { element: "C", x: -1.27, y: -0.35, z: 0.5 },
      { element: "C", x: 0, y: 0.4, z: 0 },
      { element: "C", x: 1.27, y: -0.35, z: 0.5 },
      { element: "O", x: 0, y: 1.65, z: 0.6 },
      { element: "H", x: 0, y: 0.5, z: -1.1 },
      { element: "H", x: 0.65, y: 2.3, z: 0.3 },
      { element: "H", x: -1.27, y: -1.35, z: 0.1 },
      { element: "H", x: -1.27, y: -0.35, z: 1.6 },
      { element: "H", x: -2.15, y: 0.15, z: 0.15 },
      { element: "H", x: 1.27, y: -1.35, z: 0.1 },
      { element: "H", x: 1.27, y: -0.35, z: 1.6 },
      { element: "H", x: 2.15, y: 0.15, z: 0.15 },
    ],
    bonds: [
      { a: 0, b: 1, order: 1 },
      { a: 1, b: 2, order: 1 },
      { a: 1, b: 3, order: 1 },
      { a: 1, b: 4, order: 1 },
      { a: 3, b: 5, order: 1 },
      { a: 0, b: 6, order: 1 },
      { a: 0, b: 7, order: 1 },
      { a: 0, b: 8, order: 1 },
      { a: 2, b: 9, order: 1 },
      { a: 2, b: 10, order: 1 },
      { a: 2, b: 11, order: 1 },
    ],
    lonePairs: [{ atomIndex: 3, count: 2 }],
    bondAngles: [
      { atoms: [0, 1, 2], angle: "109.5°" },
      { atoms: [0, 1, 3], angle: "109.5°" },
      { atoms: [1, 3, 5], angle: "108.5°" },
    ],
  },

  // Ethanoic Acid (Acetic Acid)
  {
    name: "ethanoic acid",
    aliases: ["acetic acid", "CH3COOH", "CH3-COOH", "vinegar"],
    formula: "C2H4O2",
    atoms: [
      { element: "C", x: -0.8, y: 0, z: 0 },
      { element: "C", x: 0.65, y: 0, z: 0 },
      { element: "O", x: 1.3, y: 1.1, z: 0 },
      { element: "O", x: 1.3, y: -1.1, z: 0 },
      { element: "H", x: 2.26, y: -1.1, z: 0 },
      { element: "H", x: -1.18, y: 0.63, z: 0.78 },
      { element: "H", x: -1.18, y: 0.37, z: -0.93 },
      { element: "H", x: -1.18, y: -1, z: 0.15 },
    ],
    bonds: [
      { a: 0, b: 1, order: 1 },
      { a: 1, b: 2, order: 2 },
      { a: 1, b: 3, order: 1 },
      { a: 3, b: 4, order: 1 },
      { a: 0, b: 5, order: 1 },
      { a: 0, b: 6, order: 1 },
      { a: 0, b: 7, order: 1 },
    ],
    lonePairs: [
      { atomIndex: 2, count: 2 },
      { atomIndex: 3, count: 2 },
    ],
    bondAngles: [
      { atoms: [0, 1, 2], angle: "120°" },
      { atoms: [2, 1, 3], angle: "120°" },
    ],
  },

  // Benzene
  {
    name: "benzene",
    aliases: ["C6H6"],
    formula: "C6H6",
    atoms: [
      // Carbons in hexagon
      { element: "C", x: 1.4, y: 0, z: 0 },
      { element: "C", x: 0.7, y: 1.21, z: 0 },
      { element: "C", x: -0.7, y: 1.21, z: 0 },
      { element: "C", x: -1.4, y: 0, z: 0 },
      { element: "C", x: -0.7, y: -1.21, z: 0 },
      { element: "C", x: 0.7, y: -1.21, z: 0 },
      // Hydrogens
      { element: "H", x: 2.49, y: 0, z: 0 },
      { element: "H", x: 1.24, y: 2.16, z: 0 },
      { element: "H", x: -1.24, y: 2.16, z: 0 },
      { element: "H", x: -2.49, y: 0, z: 0 },
      { element: "H", x: -1.24, y: -2.16, z: 0 },
      { element: "H", x: 1.24, y: -2.16, z: 0 },
    ],
    bonds: [
      // Ring bonds (alternating single/double for visualization)
      { a: 0, b: 1, order: 2 },
      { a: 1, b: 2, order: 1 },
      { a: 2, b: 3, order: 2 },
      { a: 3, b: 4, order: 1 },
      { a: 4, b: 5, order: 2 },
      { a: 5, b: 0, order: 1 },
      // C-H bonds
      { a: 0, b: 6, order: 1 },
      { a: 1, b: 7, order: 1 },
      { a: 2, b: 8, order: 1 },
      { a: 3, b: 9, order: 1 },
      { a: 4, b: 10, order: 1 },
      { a: 5, b: 11, order: 1 },
    ],
    lonePairs: [],
    bondAngles: [
      { atoms: [5, 0, 1], angle: "120°" },
    ],
  },
]

// Search function to find a 3D molecule by name or alias
export function findMolecule3D(query: string): Molecule3D | null {
  const normalizedQuery = query.toLowerCase().trim().replace(/[-\s]/g, "")
  
  for (const molecule of molecules3D) {
    // Check main name
    if (molecule.name.toLowerCase().replace(/[-\s]/g, "") === normalizedQuery) {
      return molecule
    }
    
    // Check aliases
    for (const alias of molecule.aliases) {
      if (alias.toLowerCase().replace(/[-\s]/g, "") === normalizedQuery) {
        return molecule
      }
    }
  }
  
  return null
}

// Get all available molecule names
export function getAvailable3DMolecules(): string[] {
  return molecules3D.map(m => m.name)
}
