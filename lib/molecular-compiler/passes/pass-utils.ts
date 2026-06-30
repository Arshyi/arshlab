import { buildCompilerIR, canonicalizeCompilerGraph } from "../canonicalizer"
import { buildChemicalAst } from "../chemical-ast"
import type { CompilerIR } from "../compiler-types"
import { validateChemicalSemantics } from "../semantic-validator"
import type { MolecularGraph, MolecularGraphBond, MolecularGraphNode, MolecularGraphRing } from "../../vision/molecular-graph"

const VALENCE: Record<string, number> = {
  C: 4,
  H: 1,
  O: 2,
  N: 3,
  S: 6,
  P: 5,
  F: 1,
  Cl: 1,
  Br: 1,
  I: 1,
  Unknown: 4,
}

export function cloneGraph(graph: MolecularGraph): MolecularGraph {
  return {
    ...graph,
    nodes: graph.nodes.map((node) => ({ ...node, snappedSegmentIndexes: [...node.snappedSegmentIndexes], labelBounds: node.labelBounds ? { ...node.labelBounds } : undefined })),
    bonds: graph.bonds.map((bond) => ({ ...bond, sourceSegmentIndexes: [...bond.sourceSegmentIndexes] })),
    rings: graph.rings.map((ring) => ({ ...ring, nodeIds: [...ring.nodeIds] })),
    aromaticRingIds: [...graph.aromaticRingIds],
    warnings: [...graph.warnings],
    estimates: { ...graph.estimates },
  }
}

function countHydrogens(nodes: MolecularGraphNode[], bonds: MolecularGraphBond[]): number {
  return nodes.reduce((sum, node) => {
    if (node.inferredElement === "H") return sum
    const usedValence = bonds
      .filter((bond) => bond.startNodeId === node.id || bond.endNodeId === node.id)
      .reduce((total, bond) => total + bond.bondOrder, 0)
    return sum + Math.max(0, (VALENCE[node.inferredElement] ?? 0) - usedValence)
  }, 0)
}

function estimatedFormula(nodes: MolecularGraphNode[], bonds: MolecularGraphBond[]): string {
  const counts = new Map<string, number>()
  nodes.forEach((node) => {
    if (node.inferredElement !== "Unknown" && node.inferredElement !== "H") {
      counts.set(node.inferredElement, (counts.get(node.inferredElement) ?? 0) + 1)
    }
  })
  const hydrogens = countHydrogens(nodes, bonds)
  if (hydrogens > 0) counts.set("H", hydrogens)
  return ["C", "H", "N", "O", "S", "P", "F", "Cl", "Br", "I"]
    .filter((element) => counts.has(element))
    .map((element) => `${element}${(counts.get(element) ?? 1) === 1 ? "" : counts.get(element)}`)
    .join("") || "Unavailable"
}

export function normalizeGraph(graph: MolecularGraph): MolecularGraph {
  const nodeIds = new Set(graph.nodes.map((node) => node.id))
  const bonds = graph.bonds
    .filter((bond) => nodeIds.has(bond.startNodeId) && nodeIds.has(bond.endNodeId) && bond.startNodeId !== bond.endNodeId)
    .map((bond, id) => ({ ...bond, id }))
  const nodes = graph.nodes.map((node) => ({
    ...node,
    degree: bonds.filter((bond) => bond.startNodeId === node.id || bond.endNodeId === node.id).length,
  }))
  const validBondKeys = new Set(bonds.map((bond) => [bond.startNodeId, bond.endNodeId].sort((a, b) => a - b).join("-")))
  const rings = graph.rings
    .filter((ring) =>
      ring.nodeIds.every((nodeId) => nodeIds.has(nodeId)) &&
      ring.nodeIds.every((nodeId, index) => validBondKeys.has([nodeId, ring.nodeIds[(index + 1) % ring.nodeIds.length]].sort((a, b) => a - b).join("-"))),
    )
    .map((ring, id): MolecularGraphRing => ({ ...ring, id }))
  return {
    ...graph,
    nodes,
    bonds,
    rings,
    aromatic: rings.some((ring) => ring.aromatic),
    aromaticRingIds: rings.filter((ring) => ring.aromatic).map((ring) => ring.id),
    estimates: {
      atoms: nodes.length,
      carbons: nodes.filter((node) => node.inferredElement === "C").length,
      bonds: bonds.length,
      rings: rings.length,
      singleBonds: bonds.filter((bond) => bond.bondOrder === 1).length,
      doubleBonds: bonds.filter((bond) => bond.bondOrder === 2).length,
      tripleBonds: bonds.filter((bond) => bond.bondOrder === 3).length,
      estimatedFormula: estimatedFormula(nodes, bonds),
      confidence: Math.round(Math.min(
        graph.estimates.confidence,
        nodes.reduce((sum, node) => sum + node.confidence, 0) / Math.max(1, nodes.length),
        bonds.reduce((sum, bond) => sum + bond.confidence, 0) / Math.max(1, bonds.length),
      )),
    },
  }
}

export function rebuildIrFromGraph(previous: CompilerIR, graph: MolecularGraph): CompilerIR {
  const normalized = normalizeGraph(graph)
  const canonical = canonicalizeCompilerGraph(normalized)
  const ast = buildChemicalAst([], canonical.graph)
  const validation = validateChemicalSemantics(ast)
  const next = buildCompilerIR(ast, validation, canonical)
  return {
    ...next,
    confidenceCeiling: Math.min(previous.confidenceCeiling, next.confidenceCeiling),
  }
}

export function validateIr(ir: CompilerIR) {
  const ast = buildChemicalAst([], ir.canonicalGraph)
  return validateChemicalSemantics(ast)
}

export function structuralScore(ir: CompilerIR): number {
  const validation = validateIr(ir)
  const errors = validation.issues.filter((issue) => issue.severity === "error").length
  const warnings = validation.issues.filter((issue) => issue.severity === "warning").length
  const componentPenalty = Math.max(0, ir.components.length - 1) * 6
  return Math.round(100 - errors * 60 - warnings * 8 - componentPenalty)
}

export function edgeKey(bond: MolecularGraphBond): string {
  return [bond.startNodeId, bond.endNodeId].sort((a, b) => a - b).join("-")
}

export function valenceForNode(graph: MolecularGraph, nodeId: number): number {
  return graph.bonds
    .filter((bond) => bond.startNodeId === nodeId || bond.endNodeId === nodeId)
    .reduce((sum, bond) => sum + bond.bondOrder, 0)
}

export function maxValence(element: string): number {
  return VALENCE[element] ?? 4
}
