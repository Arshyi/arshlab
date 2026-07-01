import { KNOWLEDGE_GRAPH } from "./knowledge-graph"
import type { ChemistryKnowledgeCurriculum, ChemistryKnowledgeDifficulty, ChemistryKnowledgeNode } from "./knowledge-node"

export interface KnowledgeSearchOptions {
  limit?: number
  curriculum?: ChemistryKnowledgeCurriculum | "All"
  difficulty?: ChemistryKnowledgeDifficulty | "All"
}

export function normalizeKnowledgeQuery(query: string): string {
  return query
    .trim()
    .toLowerCase()
    .replace(/\u00b2/g, "2")
    .replace(/\u00b3/g, "3")
    .replace(/\s+/g, " ")
}

function matchesFilter(node: ChemistryKnowledgeNode, options: KnowledgeSearchOptions): boolean {
  const curriculumOk =
    !options.curriculum ||
    options.curriculum === "All" ||
    node.curriculum.includes(options.curriculum)
  const difficultyOk = !options.difficulty || options.difficulty === "All" || node.difficulty === options.difficulty
  return curriculumOk && difficultyOk
}

export function searchKnowledgeGraph(query: string, options: KnowledgeSearchOptions = {}): ChemistryKnowledgeNode[] {
  const normalized = normalizeKnowledgeQuery(query)
  const limit = options.limit ?? 12
  const nodes = KNOWLEDGE_GRAPH.nodes.filter((node) => matchesFilter(node, options))

  if (!normalized) return nodes.slice(0, limit)

  return nodes
    .map((node) => {
      const exactLabel = node.label.toLowerCase() === normalized ? 80 : 0
      const exactId = node.id.toLowerCase().endsWith(`:${normalized}`) ? 70 : 0
      const tagMatch = node.tags.some((tag) => normalizeKnowledgeQuery(tag) === normalized) ? 45 : 0
      const includes = node.searchText.includes(normalized) ? 25 : 0
      const score = exactLabel + exactId + tagMatch + includes
      return { node, score }
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.node.label.localeCompare(b.node.label))
    .slice(0, limit)
    .map((item) => item.node)
}

export function resolveKnowledgeNodeId(value: string | undefined): string | undefined {
  if (!value) return undefined
  const decoded = decodeURIComponent(value)
  const direct = KNOWLEDGE_GRAPH.nodes.find((node) => node.id === decoded)
  if (direct) return direct.id

  const normalized = normalizeKnowledgeQuery(decoded.replace(/^(compound|mechanism|reaction|functional-group):/, ""))
  const result = searchKnowledgeGraph(normalized, { limit: 1 })[0]
  return result?.id
}
