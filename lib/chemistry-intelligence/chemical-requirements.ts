import type { MolecularGraph, MolecularGraphBond, MolecularGraphNode } from "../vision/molecular-graph"
import type { IntelligenceCompoundRecord } from "./types"
import type { ReferenceGraph } from "./graph-matcher"

export interface GraphChemicalFeatures {
  carbonCount: number
  heteroAtoms: Record<string, number>
  ringCount: number
  ringSizes: number[]
  aromatic: boolean
  doubleBondCount: number
  tripleBondCount: number
  branchCount: number
  terminalOH: number
  carbonylCount: number
  amineCount: number
  halogenCount: number
  connectedComponents: number
  functionalGroups: string[]
}

export interface IdentityRequirements {
  compoundId: string
  carbonCount: number
  heteroAtoms: Record<string, number>
  ringCount: number
  minimumRingSize?: number
  maximumRingSize?: number
  requiredRingSizes: number[]
  aromatic: boolean
  doubleBondCount: number
  tripleBondCount: number
  branchCount: number
  terminalOH: number
  carbonylCount: number
  amineCount: number
  halogenCount: number
  connectedComponents: number
  allowedFunctionalGroups: string[]
  forbiddenFunctionalGroups: string[]
}

const HETERO_ELEMENTS = ["O", "N", "S", "P", "F", "Cl", "Br", "I"]
const HALOGENS = new Set(["F", "Cl", "Br", "I"])

function nodeById(graph: MolecularGraph, id: number): MolecularGraphNode | undefined {
  return graph.nodes.find((node) => node.id === id)
}

function bondsFor(graph: MolecularGraph, nodeId: number): MolecularGraphBond[] {
  return graph.bonds.filter((bond) => bond.startNodeId === nodeId || bond.endNodeId === nodeId)
}

function otherNode(graph: MolecularGraph, bond: MolecularGraphBond, nodeId: number): MolecularGraphNode | undefined {
  return nodeById(graph, bond.startNodeId === nodeId ? bond.endNodeId : bond.startNodeId)
}

function countComponents(graph: MolecularGraph): number {
  if (!graph.nodes.length) return 0
  const adjacency = new Map<number, number[]>()
  graph.nodes.forEach((node) => adjacency.set(node.id, []))
  graph.bonds.forEach((bond) => {
    adjacency.get(bond.startNodeId)?.push(bond.endNodeId)
    adjacency.get(bond.endNodeId)?.push(bond.startNodeId)
  })
  const seen = new Set<number>()
  let components = 0
  graph.nodes.forEach((node) => {
    if (seen.has(node.id)) return
    components += 1
    const stack = [node.id]
    seen.add(node.id)
    while (stack.length) {
      const current = stack.pop()
      adjacency.get(current ?? -1)?.forEach((next) => {
        if (!seen.has(next)) {
          seen.add(next)
          stack.push(next)
        }
      })
    }
  })
  return components
}

function detectFunctionalGroups(features: Omit<GraphChemicalFeatures, "functionalGroups">): string[] {
  const groups: string[] = []
  if (features.aromatic) groups.push("aromatic", "arene")
  if (features.terminalOH > 0) groups.push("alcohol")
  if (features.carbonylCount > 0) groups.push("carbonyl")
  if (features.carbonylCount > 0 && features.terminalOH > 0) groups.push("carboxylic acid")
  if (features.amineCount > 0) groups.push("amine")
  if (features.halogenCount > 0) groups.push("organohalide")
  if (features.doubleBondCount > 0) groups.push("alkene")
  if (features.tripleBondCount > 0) groups.push("alkyne")
  if ((features.heteroAtoms.N ?? 0) > 0 && features.tripleBondCount > 0) groups.push("nitrile")
  return groups
}

export function analyzeGraphChemicalFeatures(graph: MolecularGraph): GraphChemicalFeatures {
  const heteroAtoms: Record<string, number> = {}
  HETERO_ELEMENTS.forEach((element) => { heteroAtoms[element] = 0 })
  graph.nodes.forEach((node) => {
    if (HETERO_ELEMENTS.includes(node.inferredElement)) {
      heteroAtoms[node.inferredElement] = (heteroAtoms[node.inferredElement] ?? 0) + 1
    }
  })
  const carbonylCount = graph.bonds.filter((bond) => {
    const ends = [nodeById(graph, bond.startNodeId), nodeById(graph, bond.endNodeId)]
    return bond.bondOrder === 2 && ends.some((node) => node?.inferredElement === "C") && ends.some((node) => node?.inferredElement === "O")
  }).length
  const terminalOH = graph.nodes.filter((node) => {
    if (node.inferredElement !== "O") return false
    const oxygenBonds = bondsFor(graph, node.id)
    if (oxygenBonds.length !== 1 || oxygenBonds[0]?.bondOrder !== 1) return false
    const carbon = otherNode(graph, oxygenBonds[0], node.id)
    if (carbon?.inferredElement !== "C") return false
    const carbonHasCarbonyl = bondsFor(graph, carbon.id).some((bond) => bond.bondOrder === 2 && otherNode(graph, bond, carbon.id)?.inferredElement === "O")
    return !carbonHasCarbonyl
  }).length
  const featuresWithoutGroups = {
    carbonCount: graph.nodes.filter((node) => node.inferredElement === "C").length,
    heteroAtoms,
    ringCount: graph.rings.length,
    ringSizes: graph.rings.map((ring) => ring.size),
    aromatic: graph.aromatic || graph.rings.some((ring) => ring.aromatic),
    doubleBondCount: graph.bonds.filter((bond) => bond.bondOrder === 2).length,
    tripleBondCount: graph.bonds.filter((bond) => bond.bondOrder === 3).length,
    branchCount: graph.nodes.filter((node) => node.inferredElement === "C" && bondsFor(graph, node.id).filter((bond) => otherNode(graph, bond, node.id)?.inferredElement === "C").length > 2).length,
    terminalOH,
    carbonylCount,
    amineCount: graph.nodes.filter((node) => node.inferredElement === "N").length,
    halogenCount: graph.nodes.filter((node) => HALOGENS.has(node.inferredElement)).length,
    connectedComponents: countComponents(graph),
  }
  return {
    ...featuresWithoutGroups,
    functionalGroups: detectFunctionalGroups(featuresWithoutGroups),
  }
}

export function buildIdentityRequirements(reference: ReferenceGraph, record?: IntelligenceCompoundRecord): IdentityRequirements {
  const features = analyzeGraphChemicalFeatures(reference.graph)
  const allowedFunctionalGroups = Array.from(new Set([...(record?.functionalGroups ?? []), ...features.functionalGroups].map((group) => group.toLowerCase())))
  const forbiddenFunctionalGroups: string[] = []
  if ((features.heteroAtoms.O ?? 0) === 0) forbiddenFunctionalGroups.push("alcohol", "carbonyl", "carboxylic acid", "ester", "amide")
  if ((features.heteroAtoms.N ?? 0) === 0) forbiddenFunctionalGroups.push("amine", "amide", "nitrile")
  if (features.halogenCount === 0) forbiddenFunctionalGroups.push("organohalide", "haloalkane")
  if (!features.aromatic) forbiddenFunctionalGroups.push("aromatic", "arene")
  if (features.ringCount === 0) forbiddenFunctionalGroups.push("ring", "heterocycle")
  return {
    compoundId: reference.compoundId,
    carbonCount: features.carbonCount,
    heteroAtoms: features.heteroAtoms,
    ringCount: features.ringCount,
    minimumRingSize: features.ringSizes.length ? Math.min(...features.ringSizes) : undefined,
    maximumRingSize: features.ringSizes.length ? Math.max(...features.ringSizes) : undefined,
    requiredRingSizes: features.ringSizes,
    aromatic: features.aromatic,
    doubleBondCount: features.doubleBondCount,
    tripleBondCount: features.tripleBondCount,
    branchCount: features.branchCount,
    terminalOH: features.terminalOH,
    carbonylCount: features.carbonylCount,
    amineCount: features.amineCount,
    halogenCount: features.halogenCount,
    connectedComponents: Math.max(1, features.connectedComponents),
    allowedFunctionalGroups,
    forbiddenFunctionalGroups: Array.from(new Set(forbiddenFunctionalGroups)),
  }
}
