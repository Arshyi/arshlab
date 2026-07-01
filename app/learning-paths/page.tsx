import type { Metadata } from "next"
import { LearningPathClient } from "./learning-path-client"

export const metadata: Metadata = {
  title: "Learning Paths | ARSHLAB",
  description:
    "Structured ARSHLAB chemistry learning paths that connect scanner results, molecular explorers, mechanisms, virtual labs, spectroscopy, quizzes, and the Knowledge Graph.",
}

interface LearningPathsPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export default async function LearningPathsPage({ searchParams }: LearningPathsPageProps) {
  const params = await searchParams
  return (
    <LearningPathClient
      initialPath={firstParam(params?.path)}
      initialLesson={firstParam(params?.lesson)}
      initialFocus={firstParam(params?.focus)}
    />
  )
}
