import { EXPLORER_LAYER_IDS } from "./explorer-engine"
import type { ExplorerAtom, ExplorerBond, ExplorerLayerId, ExplorerMolecule } from "./types"

export type ExplorerSvgPrimitiveType =
  | "atom"
  | "atom-label"
  | "bond"
  | "bond-label"
  | "ring"
  | "functional-group"
  | "electron"
  | "orbital"
  | "charge"
  | "domain"

export interface ExplorerSvgPrimitive {
  id: string
  type: ExplorerSvgPrimitiveType
  layer: ExplorerLayerId
  atomId?: string
  bondId?: string
  groupId?: string
  electronSetId?: string
  x: number
  y: number
  x2?: number
  y2?: number
  radius?: number
  label?: string
  color: string
  strokeWidth?: number
  opacity?: number
  dash?: string
}

export const EXPLORER_COLORS = {
  atom: "#f8fafc",
  carbon: "#172033",
  hydrogen: "#e5e7eb",
  oxygen: "#ef4444",
  nitrogen: "#2563eb",
  sulfur: "#facc15",
  phosphorus: "#f97316",
  halogen: "#22c55e",
  sp: "#7c3aed",
  sp2: "#0891b2",
  sp3: "#16a34a",
  aromatic: "#f59e0b",
  conjugated: "#eab308",
  formalCharge: "#dc2626",
  radical: "#db2777",
  lonePair: "#06b6d4",
  pi: "#f97316",
  sigma: "#64748b",
  homo: "#14b8a6",
  lumo: "#a855f7",
  ring: "#fbbf24",
  functionalGroup: "#0f766e",
} as const

export function elementColor(element: string) {
  if (element === "C") return EXPLORER_COLORS.carbon
  if (element === "H") return EXPLORER_COLORS.hydrogen
  if (element === "O") return EXPLORER_COLORS.oxygen
  if (element === "N") return EXPLORER_COLORS.nitrogen
  if (element === "S") return EXPLORER_COLORS.sulfur
  if (element === "P") return EXPLORER_COLORS.phosphorus
  if (["F", "Cl", "Br", "I"].includes(element)) return EXPLORER_COLORS.halogen
  return EXPLORER_COLORS.atom
}

export function hybridizationColor(hybridization: ExplorerAtom["hybridization"]) {
  if (hybridization === "sp") return EXPLORER_COLORS.sp
  if (hybridization === "sp2") return EXPLORER_COLORS.sp2
  if (hybridization === "sp3") return EXPLORER_COLORS.sp3
  return EXPLORER_COLORS.sigma
}

export function readableTextColor(element: string) {
  return ["C", "O", "N", "Br", "I"].includes(element) ? "#ffffff" : "#0f172a"
}

function isEnabled(layers: Set<ExplorerLayerId>, layer: ExplorerLayerId) {
  return layers.has(layer)
}

function bondCoordinates(molecule: ExplorerMolecule, bond: ExplorerBond) {
  const from = molecule.atoms.find((atom) => atom.id === bond.from)
  const to = molecule.atoms.find((atom) => atom.id === bond.to)
  if (!from || !to) return null
  return { from, to, midX: (from.x + to.x) / 2, midY: (from.y + to.y) / 2 }
}

function perpendicularOffset(from: ExplorerAtom, to: ExplorerAtom, distance: number) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.max(1, Math.hypot(dx, dy))
  return { x: (-dy / length) * distance, y: (dx / length) * distance }
}

function bondLinePrimitives(molecule: ExplorerMolecule, bond: ExplorerBond): ExplorerSvgPrimitive[] {
  const coords = bondCoordinates(molecule, bond)
  if (!coords) return []
  const { from, to } = coords
  const color = bond.aromatic ? EXPLORER_COLORS.aromatic : bond.piBonds ? EXPLORER_COLORS.pi : EXPLORER_COLORS.sigma
  const offsets = bond.order === 3
    ? [-7, 0, 7]
    : bond.order === 2
      ? [-4, 4]
      : [0]
  return offsets.map((distance, index) => {
    const offset = perpendicularOffset(from, to, distance)
    return {
      id: `bond-${bond.id}-${index}`,
      type: "bond",
      layer: "bond-order",
      bondId: bond.id,
      x: from.x + offset.x,
      y: from.y + offset.y,
      x2: to.x + offset.x,
      y2: to.y + offset.y,
      color,
      strokeWidth: bond.order === "aromatic" ? 5 : 4,
      opacity: bond.confidence / 100,
      dash: bond.order === "aromatic" ? "10 7" : undefined,
    } satisfies ExplorerSvgPrimitive
  })
}

function atomRadius(atom: ExplorerAtom) {
  if (atom.element === "H") return 16
  if (atom.element.length > 1) return 23
  return 21
}

export function buildExplorerSvgPrimitives(
  molecule: ExplorerMolecule,
  enabledLayers: Iterable<ExplorerLayerId> = EXPLORER_LAYER_IDS,
): ExplorerSvgPrimitive[] {
  const layers = new Set(enabledLayers)
  const primitives: ExplorerSvgPrimitive[] = []

  if (isEnabled(layers, "ring-system")) {
    for (const ring of molecule.rings) {
      const atoms = ring.atomIds.map((id) => molecule.atoms.find((atom) => atom.id === id)).filter(Boolean) as ExplorerAtom[]
      if (atoms.length >= 3) {
        const x = atoms.reduce((sum, atom) => sum + atom.x, 0) / atoms.length
        const y = atoms.reduce((sum, atom) => sum + atom.y, 0) / atoms.length
        const radius = atoms.reduce((sum, atom) => sum + Math.hypot(atom.x - x, atom.y - y), 0) / atoms.length
        primitives.push({
          id: `ring-${ring.id}`,
          type: "ring",
          layer: "ring-system",
          x,
          y,
          radius,
          label: ring.label,
          color: ring.aromatic ? EXPLORER_COLORS.aromatic : EXPLORER_COLORS.ring,
          strokeWidth: 3,
          opacity: ring.aromatic ? 0.24 : 0.16,
        })
      }
    }
  }

  if (isEnabled(layers, "bond-order")) {
    for (const bond of molecule.bonds) {
      primitives.push(...bondLinePrimitives(molecule, bond))
      const coords = bondCoordinates(molecule, bond)
      if (coords) {
        primitives.push({
          id: `bond-label-${bond.id}`,
          type: "bond-label",
          layer: "bond-order",
          bondId: bond.id,
          x: coords.midX,
          y: coords.midY - 12,
          label: String(bond.order),
          color: "#0f172a",
          opacity: 0.86,
        })
      }
    }
  }

  if (isEnabled(layers, "sigma-framework")) {
    for (const bond of molecule.bonds) {
      const coords = bondCoordinates(molecule, bond)
      if (!coords) continue
      primitives.push({
        id: `sigma-${bond.id}`,
        type: "electron",
        layer: "sigma-framework",
        bondId: bond.id,
        x: coords.midX,
        y: coords.midY,
        radius: 9,
        label: "sigma",
        color: EXPLORER_COLORS.sigma,
        opacity: 0.22,
      })
    }
  }

  if (isEnabled(layers, "pi-framework")) {
    for (const bond of molecule.bonds.filter((item) => item.piBonds > 0 || item.aromatic)) {
      const coords = bondCoordinates(molecule, bond)
      if (!coords) continue
      primitives.push({
        id: `pi-${bond.id}`,
        type: "orbital",
        layer: "pi-framework",
        bondId: bond.id,
        x: coords.midX,
        y: coords.midY,
        radius: bond.aromatic ? 17 : 14,
        label: bond.aromatic ? "deloc pi" : "pi",
        color: EXPLORER_COLORS.pi,
        opacity: bond.aromatic ? 0.34 : 0.42,
      })
    }
  }

  for (const atom of molecule.atoms) {
    const baseColor = elementColor(atom.element)
    primitives.push({
      id: `atom-${atom.id}`,
      type: "atom",
      layer: atom.aromatic && isEnabled(layers, "aromatic-atoms") ? "aromatic-atoms" : "atom-labels",
      atomId: atom.id,
      x: atom.x,
      y: atom.y,
      radius: atomRadius(atom),
      label: atom.element,
      color: atom.aromatic && isEnabled(layers, "aromatic-atoms") ? EXPLORER_COLORS.aromatic : baseColor,
      strokeWidth: atom.conjugated && isEnabled(layers, "conjugated-atoms") ? 4 : 2,
      opacity: atom.confidence / 100,
    })

    if (isEnabled(layers, "atom-labels")) {
      primitives.push({
        id: `label-${atom.id}`,
        type: "atom-label",
        layer: "atom-labels",
        atomId: atom.id,
        x: atom.x,
        y: atom.y,
        label: atom.element,
        color: readableTextColor(atom.element),
      })
    }

    if (isEnabled(layers, "hybridization") && atom.hybridization !== "none") {
      primitives.push({
        id: `hybrid-${atom.id}`,
        type: "orbital",
        layer: "hybridization",
        atomId: atom.id,
        x: atom.x,
        y: atom.y + 31,
        radius: 8,
        label: atom.hybridization,
        color: hybridizationColor(atom.hybridization),
        opacity: 0.72,
      })
    }

    if (isEnabled(layers, "lone-pairs") && atom.lonePairs > 0) {
      for (let index = 0; index < atom.lonePairs; index += 1) {
        primitives.push({
          id: `lp-${atom.id}-${index}`,
          type: "electron",
          layer: "lone-pairs",
          atomId: atom.id,
          x: atom.x + (index === 0 ? -18 : 18),
          y: atom.y - 27,
          radius: 5,
          label: "..",
          color: EXPLORER_COLORS.lonePair,
          opacity: 0.9,
        })
      }
    }

    if (isEnabled(layers, "formal-charges") && atom.formalCharge !== 0) {
      primitives.push({
        id: `charge-${atom.id}`,
        type: "charge",
        layer: "formal-charges",
        atomId: atom.id,
        x: atom.x + 20,
        y: atom.y - 20,
        label: atom.formalCharge > 0 ? `+${atom.formalCharge}` : String(atom.formalCharge),
        color: EXPLORER_COLORS.formalCharge,
      })
    }

    if (isEnabled(layers, "electron-domains") && atom.electronDomains > 1) {
      primitives.push({
        id: `domain-${atom.id}`,
        type: "domain",
        layer: "electron-domains",
        atomId: atom.id,
        x: atom.x,
        y: atom.y,
        radius: atomRadius(atom) + 9,
        label: `${atom.electronDomains} domains`,
        color: hybridizationColor(atom.hybridization),
        opacity: 0.18,
      })
    }

    if (isEnabled(layers, "homo") && atom.homoContribution > 0) {
      primitives.push({
        id: `homo-${atom.id}`,
        type: "orbital",
        layer: "homo",
        atomId: atom.id,
        x: atom.x - 12,
        y: atom.y,
        radius: 8 + atom.homoContribution / 6,
        label: "HOMO",
        color: EXPLORER_COLORS.homo,
        opacity: 0.4,
      })
    }

    if (isEnabled(layers, "lumo") && atom.lumoContribution > 0) {
      primitives.push({
        id: `lumo-${atom.id}`,
        type: "orbital",
        layer: "lumo",
        atomId: atom.id,
        x: atom.x + 12,
        y: atom.y,
        radius: 8 + atom.lumoContribution / 6,
        label: "LUMO",
        color: EXPLORER_COLORS.lumo,
        opacity: 0.34,
      })
    }

    if (isEnabled(layers, "orbital-orientation") && ["sp", "sp2"].includes(atom.hybridization)) {
      primitives.push({
        id: `p-orbital-${atom.id}`,
        type: "orbital",
        layer: "orbital-orientation",
        atomId: atom.id,
        x: atom.x,
        y: atom.y,
        radius: 28,
        label: "p",
        color: EXPLORER_COLORS.pi,
        opacity: 0.18,
      })
    }
  }

  if (isEnabled(layers, "functional-groups")) {
    for (const group of molecule.functionalGroups) {
      const atoms = group.atomIds.map((id) => molecule.atoms.find((atom) => atom.id === id)).filter(Boolean) as ExplorerAtom[]
      if (!atoms.length) continue
      const x = atoms.reduce((sum, atom) => sum + atom.x, 0) / atoms.length
      const y = atoms.reduce((sum, atom) => sum + atom.y, 0) / atoms.length
      primitives.push({
        id: `fg-${group.id}`,
        type: "functional-group",
        layer: "functional-groups",
        groupId: group.id,
        x,
        y: y - 42,
        radius: 16,
        label: group.name,
        color: EXPLORER_COLORS.functionalGroup,
        opacity: 0.92,
      })
    }
  }

  if (isEnabled(layers, "delocalized-electrons")) {
    for (const set of molecule.electronSets.filter((item) => item.kind === "delocalized")) {
      const atoms = set.atomIds.map((id) => molecule.atoms.find((atom) => atom.id === id)).filter(Boolean) as ExplorerAtom[]
      if (!atoms.length) continue
      const x = atoms.reduce((sum, atom) => sum + atom.x, 0) / atoms.length
      const y = atoms.reduce((sum, atom) => sum + atom.y, 0) / atoms.length
      primitives.push({
        id: `deloc-${set.id}`,
        type: "electron",
        layer: "delocalized-electrons",
        electronSetId: set.id,
        x,
        y,
        radius: Math.max(35, atoms.length * 10),
        label: `${set.electronCount} e-`,
        color: EXPLORER_COLORS.pi,
        opacity: 0.2,
      })
    }
  }

  return primitives
}

export function buildOverlaySummary(molecule: ExplorerMolecule) {
  const primitives = buildExplorerSvgPrimitives(molecule)
  const counts = new Map<ExplorerLayerId, number>()
  for (const primitive of primitives) counts.set(primitive.layer, (counts.get(primitive.layer) ?? 0) + 1)
  return {
    primitiveCount: primitives.length,
    layerCounts: Object.fromEntries(Array.from(counts.entries())),
    atomPrimitiveCount: primitives.filter((primitive) => primitive.type === "atom").length,
    bondPrimitiveCount: primitives.filter((primitive) => primitive.type === "bond").length,
    orbitalPrimitiveCount: primitives.filter((primitive) => primitive.type === "orbital").length,
    electronPrimitiveCount: primitives.filter((primitive) => primitive.type === "electron").length,
  }
}
