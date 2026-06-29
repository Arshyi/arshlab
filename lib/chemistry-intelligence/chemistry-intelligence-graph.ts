import type { CompoundIntelligence, KnowledgeGraphSummary } from "./types"

function pushUnique<T>(items: T[], item: T, key: (value: T) => string): void {
  if (!items.some((current) => key(current) === key(item))) items.push(item)
}

export function buildChemistryIntelligenceGraph(intelligence: Omit<CompoundIntelligence, "knowledgeGraph">): KnowledgeGraphSummary {
  const nodes: KnowledgeGraphSummary["nodes"] = []
  const edges: KnowledgeGraphSummary["edges"] = []
  const modules = new Set<string>()
  const compoundNode = {
    id: `compound:${intelligence.identity.compoundId}`,
    label: intelligence.identity.name,
    type: "Compound",
    href: `/molecular-visualizer?compound=${encodeURIComponent(intelligence.identity.compoundId)}#molecule-viewer`,
  }
  nodes.push(compoundNode)

  const linkNode = (id: string, label: string, type: string, href: string | undefined, edgeLabel: string) => {
    pushUnique(nodes, { id, label, type, href }, (node) => node.id)
    pushUnique(edges, { from: compoundNode.id, to: id, label: edgeLabel }, (edge) => `${edge.from}:${edge.to}:${edge.label}`)
    if (href) modules.add(href.split("?")[0].replace(/^\/+/, "") || href)
  }

  intelligence.functionalGroups.slice(0, 5).forEach((group) => {
    linkNode(`functional-group:${group.id}`, group.label, "Functional Group", "/functional-groups", "contains")
  })
  intelligence.scaffolds.slice(0, 3).forEach((scaffold) => {
    linkNode(`scaffold:${scaffold.id}`, scaffold.name, "Scaffold", undefined, "has scaffold")
  })
  intelligence.reactions.slice(0, 5).forEach((reaction) => {
    linkNode(`reaction:${reaction.id}`, reaction.name, "Reaction", reaction.href, "reacts in")
  })
  intelligence.mechanisms.slice(0, 4).forEach((mechanism) => {
    linkNode(`mechanism:${mechanism.label}`, mechanism.label, "Mechanism", mechanism.href, "uses mechanism")
  })
  if (intelligence.spectroscopy.available) {
    linkNode(`spectroscopy:${intelligence.identity.compoundId}`, "Expected spectroscopy", "Spectroscopy", intelligence.spectroscopy.href, "has spectra")
  }
  intelligence.curriculum.slice(0, 3).forEach((item) => {
    linkNode(`curriculum:${item.label}`, item.label, "Curriculum", item.href, "studied in")
  })
  intelligence.resources.slice(0, 6).forEach((item) => {
    linkNode(`resource:${item.label}`, item.label, "Learning Resource", item.href, "learn with")
  })

  return {
    nodes,
    edges,
    linkedModules: Array.from(modules).sort(),
  }
}
