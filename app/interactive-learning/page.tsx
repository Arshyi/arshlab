import type { Metadata } from "next"
import { InteractiveLearningClient } from "./interactive-learning-client"

export const metadata: Metadata = {
  title: "Interactive Molecular Orbital & Hybridization Learning | ARSHLAB",
  description:
    "Programmatic SVG molecular orbital diagrams, electron filling animations, HOMO/LUMO exploration, hybridization, sigma/pi overlap, lone pairs, and orbital quiz mode.",
}

interface InteractiveLearningPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export default async function InteractiveLearningPage({ searchParams }: InteractiveLearningPageProps) {
  const params = await searchParams
  return (
    <InteractiveLearningClient
      initialTopic={firstParam(params?.topic)}
      initialCompound={firstParam(params?.compound)}
      initialMolecule={firstParam(params?.molecule)}
    />
  )
}
