import { canonicalizeMolecularGraph, molecularGraphHash } from "../structure-vision/canonical-molecular-graph"
import type { MolecularGraph } from "../vision/molecular-graph"
import type { CanonicalGraphRepresentation, ChemicalAst, CompilerIR, SemanticValidationResult } from "./compiler-types"

function bondKey(edge: { startNodeId: number; endNodeId: number; bondOrder: 1 | 2 | 3 }): string {
  return [edge.startNodeId, edge.endNodeId].sort((a, b) => a - b).join("-") + `-${edge.bondOrder}`
}

function fingerprint(graph: MolecularGraph): string {
  const elementCounts = new Map<string, number>()
  graph.nodes.forEach((node) => elementCounts.set(node.inferredElement, (elementCounts.get(node.inferredElement) ?? 0) + 1))
  const atoms = Array.from(elementCounts)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([element, count]) => `${element}${count}`)
    .join("")
  const bonds = `b${graph.bonds.length}:s${graph.estimates.singleBonds}:d${graph.estimates.doubleBonds}:t${graph.estimates.tripleBonds}`
  const rings = `r${graph.rings.length}:${graph.rings.map((ring) => `${ring.size}${ring.aromatic ? "a" : "s"}`).sort().join(".")}`
  return `${atoms}|${bonds}|${rings}`
}

function confidenceCeiling(ast: ChemicalAst, graph: MolecularGraph): number {
  const atomConfidence = ast.nodes.reduce((sum, node) => sum + node.confidence, 0) / Math.max(1, ast.nodes.length)
  const edgeConfidence = ast.edges.reduce((sum, edge) => sum + edge.confidence, 0) / Math.max(1, ast.edges.length)
  const graphConfidence = graph.estimates.confidence
  return Math.round(Math.min(atomConfidence || 0, edgeConfidence || 0, graphConfidence || 0))
}

export function canonicalizeCompilerGraph(graph: MolecularGraph): CanonicalGraphRepresentation {
  const canonical = canonicalizeMolecularGraph(graph)
  const adjacencyList = canonical.nodes.map((node) => ({
    nodeId: node.id,
    atom: node.inferredElement,
    neighbors: canonical.bonds
      .filter((bond) => bond.startNodeId === node.id || bond.endNodeId === node.id)
      .map((bond) => ({
        nodeId: bond.startNodeId === node.id ? bond.endNodeId : bond.startNodeId,
        bondOrder: bond.bondOrder,
      }))
      .sort((left, right) => left.nodeId - right.nodeId || left.bondOrder - right.bondOrder),
  }))
  const hash = molecularGraphHash(canonical)
  const fp = fingerprint(canonical)
  return {
    graph: canonical,
    adjacencyList,
    nodeOrdering: canonical.nodes.map((node) => node.id),
    edgeOrdering: canonical.bonds.slice().sort((left, right) => bondKey(left).localeCompare(bondKey(right))).map((bond) => bond.id),
    fingerprint: fp,
    hash,
    canonicalGraphId: `arshlab:${hash}`,
  }
}

export function buildCompilerIR(
  ast: ChemicalAst,
  validation: SemanticValidationResult,
  canonical: CanonicalGraphRepresentation,
): CompilerIR {
  return {
    nodes: ast.nodes,
    edges: ast.edges,
    components: ast.connectedComponents,
    cycles: ast.cycles,
    valenceMap: validation.valenceMap,
    chargeMap: validation.chargeMap,
    fingerprint: canonical.fingerprint,
    hash: canonical.hash,
    canonicalGraphId: canonical.canonicalGraphId,
    canonicalGraph: canonical.graph,
    confidenceCeiling: confidenceCeiling(ast, canonical.graph),
  }
}
