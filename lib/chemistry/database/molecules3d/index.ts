/**
 * 3D molecule visualization module — re-exports coordinates + view mode types.
 */
export type MoleculeViewMode =
  | "ball-and-stick"
  | "space-filling"
  | "wireframe"
  | "electron-density"
  | "hybrid-orbitals"

export interface MoleculeViewerLayerOptions {
  showBondAngles: boolean
  showBondLengths: boolean
  showLonePairs: boolean
  showDipole: boolean
  showPartialCharges: boolean
  showAtomLabels: boolean
  viewMode: MoleculeViewMode
}

export const DEFAULT_VIEWER_LAYERS: MoleculeViewerLayerOptions = {
  showBondAngles: false,
  showBondLengths: false,
  showLonePairs: false,
  showDipole: false,
  showPartialCharges: false,
  showAtomLabels: true,
  viewMode: "ball-and-stick",
}

export {
  molecules3D,
  findMolecule3D,
  findMolecule3DForCompound,
  getAvailable3DMolecules,
  ATOM_COLORS,
  ATOM_RADII,
  VDW_RADII,
} from "@/lib/chemistry/molecules3d"

export type { Molecule3D, Atom3D, Bond3D, LonePair } from "@/lib/chemistry/molecules3d"
