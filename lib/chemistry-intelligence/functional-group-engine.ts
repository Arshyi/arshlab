import type { MolecularGraph, MolecularGraphBond, MolecularGraphNode } from "../vision/molecular-graph"
import type { CompoundFamilyInsight, FunctionalGroupInsight, IntelligenceCompoundRecord, ScaffoldInsight } from "./types"

function clamp(value: number, minimum = 0, maximum = 100): number {
  return Math.min(maximum, Math.max(minimum, Number.isFinite(value) ? value : minimum))
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
}

function bondsFor(graph: MolecularGraph, nodeId: number): MolecularGraphBond[] {
  return graph.bonds.filter((bond) => bond.startNodeId === nodeId || bond.endNodeId === nodeId)
}

function otherNodeId(bond: MolecularGraphBond, nodeId: number): number {
  return bond.startNodeId === nodeId ? bond.endNodeId : bond.startNodeId
}

function nodeById(graph: MolecularGraph, id: number): MolecularGraphNode | undefined {
  return graph.nodes.find((node) => node.id === id)
}

function addGroup(
  groups: Map<string, FunctionalGroupInsight>,
  label: string,
  parent: string,
  hierarchy: string[],
  confidence: number,
  evidence: string[],
): void {
  const id = normalize(label)
  const existing = groups.get(id)
  if (!existing || confidence > existing.confidence) {
    groups.set(id, { id, label, parent, hierarchy, confidence: Math.round(clamp(confidence)), evidence })
  }
}

function carbonNeighbors(graph: MolecularGraph, nodeId: number): MolecularGraphNode[] {
  return bondsFor(graph, nodeId)
    .map((bond) => nodeById(graph, otherNodeId(bond, nodeId)))
    .filter((node): node is MolecularGraphNode => Boolean(node && node.inferredElement === "C"))
}

function isAromaticCarbon(graph: MolecularGraph, nodeId: number): boolean {
  return graph.rings.some((ring) => ring.aromatic && ring.nodeIds.includes(nodeId))
}

export function classifyFunctionalGroups(graph: MolecularGraph, record?: IntelligenceCompoundRecord): FunctionalGroupInsight[] {
  const groups = new Map<string, FunctionalGroupInsight>()
  const recordGroups = record?.functionalGroups.map((group) => group.toLowerCase()) ?? []
  const graphHasAromatic = graph.aromatic || recordGroups.some((group) => /arene|aromatic|phenol/.test(group))

  for (const oxygen of graph.nodes.filter((node) => node.inferredElement === "O")) {
    const oxygenBonds = bondsFor(graph, oxygen.id)
    const carbonSingleBond = oxygenBonds.find((bond) => bond.bondOrder === 1 && nodeById(graph, otherNodeId(bond, oxygen.id))?.inferredElement === "C")
    if (carbonSingleBond) {
      const carbon = nodeById(graph, otherNodeId(carbonSingleBond, oxygen.id))
      if (carbon && isAromaticCarbon(graph, carbon.id)) {
        addGroup(groups, "Phenol", "Alcohol", ["Oxygen functional groups", "Alcohol", "Phenol"], 92, ["Oxygen is singly bonded to an aromatic ring carbon."])
      } else if (carbon) {
        const neighbors = carbonNeighbors(graph, carbon.id).length
        const label = neighbors >= 3 ? "Tertiary Alcohol" : neighbors === 2 ? "Secondary Alcohol" : "Primary Alcohol"
        addGroup(groups, label, "Alcohol", ["Oxygen functional groups", "Alcohol", label], 82, [`Hydroxyl oxygen is attached to a carbon with ${neighbors} carbon neighbor${neighbors === 1 ? "" : "s"}.`])
      }
    }
  }

  for (const carbon of graph.nodes.filter((node) => node.inferredElement === "C")) {
    const carbonBonds = bondsFor(graph, carbon.id)
    const carbonyl = carbonBonds.find((bond) => bond.bondOrder === 2 && nodeById(graph, otherNodeId(bond, carbon.id))?.inferredElement === "O")
    if (!carbonyl) continue
    const singleO = carbonBonds.some((bond) => bond.bondOrder === 1 && nodeById(graph, otherNodeId(bond, carbon.id))?.inferredElement === "O")
    const singleN = carbonBonds.some((bond) => bond.bondOrder === 1 && nodeById(graph, otherNodeId(bond, carbon.id))?.inferredElement === "N")
    const singleHalogen = carbonBonds.some((bond) => {
      const element = nodeById(graph, otherNodeId(bond, carbon.id))?.inferredElement
      return ["F", "Cl", "Br", "I"].includes(element ?? "")
    })
    const carbonCount = carbonNeighbors(graph, carbon.id).length
    if (singleO && recordGroups.some((group) => group.includes("ester"))) {
      addGroup(groups, "Ester", "Carbonyl", ["Carbonyl compounds", "Carboxylic acid derivatives", "Ester"], 94, ["Carbonyl carbon is bonded to an additional oxygen in an ester database record."])
    } else if (singleO) {
      addGroup(groups, "Carboxylic Acid", "Carbonyl", ["Carbonyl compounds", "Carboxylic acids"], 90, ["Carbonyl carbon has a single-bonded oxygen, giving a carboxyl pattern."])
    } else if (singleN) {
      addGroup(groups, "Amide", "Carbonyl", ["Carbonyl compounds", "Carboxylic acid derivatives", "Amide"], 88, ["Carbonyl carbon is attached to nitrogen."])
    } else if (singleHalogen) {
      addGroup(groups, "Acyl Chloride", "Carbonyl", ["Carbonyl compounds", "Acid derivatives", "Acyl chloride"], 82, ["Carbonyl carbon is attached to a halogen."])
    } else if (carbonCount >= 2) {
      addGroup(groups, "Ketone", "Carbonyl", ["Carbonyl compounds", "Ketone"], 86, ["Carbonyl carbon is bonded to two carbon groups."])
    } else {
      addGroup(groups, "Aldehyde", "Carbonyl", ["Carbonyl compounds", "Aldehyde"], 82, ["Terminal carbonyl pattern implies an aldehyde hydrogen."])
    }
  }

  if (graph.bonds.some((bond) => bond.bondOrder === 2 && bondEndpoints(graph, bond).every((node) => node?.inferredElement === "C"))) {
    addGroup(groups, "Alkene", "Hydrocarbon", ["Hydrocarbons", "Unsaturated", "Alkene"], 82, ["C=C double bond found in the graph."])
  }
  if (graph.bonds.some((bond) => bond.bondOrder === 3 && bondEndpoints(graph, bond).every((node) => node?.inferredElement === "C"))) {
    addGroup(groups, "Alkyne", "Hydrocarbon", ["Hydrocarbons", "Unsaturated", "Alkyne"], 86, ["C≡C triple bond found in the graph."])
  }
  if (graph.bonds.some((bond) => bond.bondOrder === 3 && bondEndpoints(graph, bond).some((node) => node?.inferredElement === "N"))) {
    addGroup(groups, "Nitrile", "Nitrogen functional group", ["Nitrogen compounds", "Nitrile"], 88, ["C≡N triple bond found in the graph."])
  }
  if (graphHasAromatic) {
    addGroup(groups, "Arene", "Aromatic", ["Aromatic systems", "Arene"], 92, ["Aromatic ring retained by the canonical graph."])
  }
  if (graph.nodes.some((node) => node.inferredElement === "N") || recordGroups.some((group) => group.includes("amine"))) {
    addGroup(groups, recordGroups.some((group) => group.includes("amide")) ? "Amide" : "Amine", "Nitrogen functional group", ["Nitrogen compounds"], 76, ["Nitrogen atom or amine database metadata is present."])
  }
  if (graph.nodes.some((node) => ["F", "Cl", "Br", "I"].includes(node.inferredElement)) || recordGroups.some((group) => group.includes("halo"))) {
    addGroup(groups, "Organohalide", "Halogen functional group", ["Halogen compounds", "Organohalide"], 78, ["Halogen atom attached to an organic skeleton."])
  }

  for (const group of recordGroups) {
    if (group.includes("phenol")) addGroup(groups, "Phenol", "Alcohol", ["Oxygen functional groups", "Alcohol", "Phenol"], 94, ["Local compound database marks this as a phenol."])
    else if (group.includes("ester")) addGroup(groups, "Ester", "Carbonyl", ["Carbonyl compounds", "Carboxylic acid derivatives", "Ester"], 92, ["Local compound database marks this as an ester."])
    else if (group.includes("carboxylic acid")) addGroup(groups, "Carboxylic Acid", "Carbonyl", ["Carbonyl compounds", "Carboxylic acids"], 92, ["Local compound database marks this as a carboxylic acid."])
    else if (group.includes("aldehyde")) addGroup(groups, "Aldehyde", "Carbonyl", ["Carbonyl compounds", "Aldehyde"], 90, ["Local compound database marks this as an aldehyde."])
    else if (group.includes("ketone")) addGroup(groups, "Ketone", "Carbonyl", ["Carbonyl compounds", "Ketone"], 90, ["Local compound database marks this as a ketone."])
    else if (group.includes("alcohol")) addGroup(groups, "Alcohol", "Alcohol", ["Oxygen functional groups", "Alcohol"], 78, ["Local compound database marks this as an alcohol."])
    else if (group.includes("arene") || group.includes("aromatic")) addGroup(groups, "Arene", "Aromatic", ["Aromatic systems", "Arene"], 90, ["Local compound database marks this as aromatic."])
    else if (group.includes("alkene")) addGroup(groups, "Alkene", "Hydrocarbon", ["Hydrocarbons", "Unsaturated", "Alkene"], 88, ["Local compound database marks this as an alkene."])
    else if (group.includes("alkane")) addGroup(groups, "Alkane", "Hydrocarbon", ["Hydrocarbons", "Saturated", "Alkane"], 84, ["Local compound database marks this as an alkane."])
  }

  return Array.from(groups.values()).sort((left, right) => right.confidence - left.confidence || left.label.localeCompare(right.label))
}

function bondEndpoints(graph: MolecularGraph, bond: MolecularGraphBond): Array<MolecularGraphNode | undefined> {
  return [nodeById(graph, bond.startNodeId), nodeById(graph, bond.endNodeId)]
}

export function classifyScaffolds(graph: MolecularGraph, record?: IntelligenceCompoundRecord): ScaffoldInsight[] {
  const scaffolds: ScaffoldInsight[] = []
  const id = record?.id ?? ""
  const name = record?.name.toLowerCase() ?? ""
  const aromaticSix = graph.rings.filter((ring) => ring.size === 6 && ring.aromatic).length
  const saturatedSix = graph.rings.some((ring) => ring.size === 6 && !ring.aromatic)
  const fiveRing = graph.rings.some((ring) => ring.size === 5)
  const hasN = graph.nodes.some((node) => node.inferredElement === "N")
  const hasO = graph.nodes.some((node) => node.inferredElement === "O")
  const hasS = graph.nodes.some((node) => node.inferredElement === "S")

  if (id === "naphthalene" || aromaticSix >= 2) scaffolds.push({ id: "naphthalene", name: "Naphthalene", confidence: 92, reason: "Two fused aromatic six-member rings are present or matched by database identity." })
  if (id === "benzene" || (aromaticSix >= 1 && !hasN && !hasO && !hasS)) scaffolds.push({ id: "benzene", name: "Benzene", confidence: id === "benzene" ? 98 : 86, reason: "Six-member aromatic carbon ring detected." })
  if (id === "pyridine" || (aromaticSix >= 1 && hasN)) scaffolds.push({ id: "pyridine", name: "Pyridine", confidence: id === "pyridine" ? 96 : 72, reason: "Aromatic six-member ring contains nitrogen." })
  if (saturatedSix || id === "cyclohexane") scaffolds.push({ id: "cyclohexane", name: "Cyclohexane", confidence: id === "cyclohexane" ? 96 : 82, reason: "Saturated six-member ring detected." })
  if (fiveRing && hasS) scaffolds.push({ id: "thiophene", name: "Thiophene", confidence: 70, reason: "Five-member heteroaromatic sulfur ring pattern." })
  if (fiveRing && hasO) scaffolds.push({ id: "furan", name: "Furan", confidence: 70, reason: "Five-member heteroaromatic oxygen ring pattern." })
  if (fiveRing && hasN) scaffolds.push({ id: "imidazole", name: "Imidazole / nitrogen heterocycle", confidence: 66, reason: "Five-member nitrogen heterocycle pattern." })
  if (/aspirin/.test(id) || /aspirin/.test(name)) scaffolds.push({ id: "salicylate", name: "Salicylate / aspirin scaffold", confidence: 94, reason: "Aromatic ring with ester and carboxylic acid metadata." })
  if (/caffeine/.test(id) || /caffeine/.test(name)) scaffolds.push({ id: "purine", name: "Purine/xanthine scaffold", confidence: 92, reason: "Fused nitrogen heterocycle with two carbonyls in the local reference graph." })

  return scaffolds.sort((left, right) => right.confidence - left.confidence)
}

export function classifyFamilies(groups: FunctionalGroupInsight[], graph: MolecularGraph, record?: IntelligenceCompoundRecord): CompoundFamilyInsight[] {
  const families = new Map<string, CompoundFamilyInsight>()
  const add = (label: string, confidence: number, evidence: string[]) => {
    const id = normalize(label)
    const existing = families.get(id)
    if (!existing || confidence > existing.confidence) {
      families.set(id, { id, label, confidence: Math.round(clamp(confidence)), evidence })
    }
  }
  const labels = groups.map((group) => group.label.toLowerCase())
  labels.forEach((label) => {
    if (label.includes("alcohol") || label === "phenol") add(label === "phenol" ? "Phenol" : "Alcohol", 86, ["Functional group hierarchy contains an alcohol branch."])
    if (label.includes("ketone")) add("Ketone", 88, ["Carbonyl hierarchy resolved to ketone."])
    if (label.includes("aldehyde")) add("Aldehyde", 88, ["Carbonyl hierarchy resolved to aldehyde."])
    if (label.includes("carboxylic")) add("Carboxylic Acid", 88, ["Carbonyl hierarchy resolved to carboxylic acid."])
    if (label.includes("ester")) add("Ester", 88, ["Carbonyl hierarchy resolved to ester."])
    if (label.includes("amide")) add("Amide", 86, ["Carbonyl/nitrogen hierarchy resolved to amide."])
    if (label.includes("amine")) add("Amine", 82, ["Nitrogen functional group detected."])
    if (label.includes("alkene")) add("Alkene", 82, ["C=C unsaturation detected."])
    if (label.includes("alkyne")) add("Alkyne", 84, ["C≡C unsaturation detected."])
    if (label.includes("arene")) add("Aromatic", 90, ["Arene functional group detected."])
    if (label.includes("organohalide")) add("Organohalide", 78, ["Halogen functional group detected."])
    if (label.includes("nitrile")) add("Nitrile", 86, ["C≡N group detected."])
  })
  if (!families.size && graph.estimates.tripleBonds > 0) add("Alkyne", 72, ["Triple bond found in molecular graph."])
  if (!families.size && graph.estimates.doubleBonds > 0) add("Alkene", 70, ["Double bond found in molecular graph."])
  if (!families.size && graph.nodes.every((node) => node.inferredElement === "C") && graph.estimates.doubleBonds === 0 && graph.estimates.tripleBonds === 0) add("Alkane", 74, ["Only carbon skeleton and single bonds detected."])
  if (record?.family) add(record.family, 80, ["Local compound database family metadata."])
  return Array.from(families.values()).sort((left, right) => right.confidence - left.confidence || left.label.localeCompare(right.label))
}
