import type { Metadata } from "next"
import { MechanismSimulatorClient } from "./mechanisms-client"

export const metadata: Metadata = {
  title: "Interactive Reaction Mechanism Simulator | ARSHLAB",
  description:
    "Deterministic SVG reaction mechanism simulator with curved arrows, live bond updates, atom tracking, electron tracking, energy diagrams, and practice mode.",
}

interface MechanismSimulatorPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export default async function MechanismSimulatorPage({ searchParams }: MechanismSimulatorPageProps) {
  const params = await searchParams
  return (
    <MechanismSimulatorClient
      initialReaction={firstParam(params?.reaction)}
      initialCompound={firstParam(params?.compound)}
    />
  )
}
