import type { Metadata } from "next"
import { KnowledgeGraphClient } from "./knowledge-graph-client"

export const metadata: Metadata = {
  title: "Interactive Chemistry Knowledge Graph | ARSHLAB",
  description:
    "Explore deterministic connections between ARSHLAB compounds, reactions, mechanisms, virtual lab experiments, spectroscopy, orbitals, formulas, practice, and curriculum topics.",
}

interface KnowledgeGraphPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export default async function KnowledgeGraphPage({ searchParams }: KnowledgeGraphPageProps) {
  const params = await searchParams
  return (
    <KnowledgeGraphClient
      initialFocus={firstParam(params?.focus)}
      initialQuery={firstParam(params?.q)}
      initialCurriculum={firstParam(params?.curriculum)}
      initialDifficulty={firstParam(params?.difficulty)}
    />
  )
}
