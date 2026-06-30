import type { Metadata } from "next"
import { MechanismSimulatorClient } from "../interactive-learning/mechanisms/mechanisms-client"

export const metadata: Metadata = {
  title: "Reaction Mechanisms | ARSHLAB",
  description: "Shortcut route for the ARSHLAB interactive reaction mechanism simulator.",
}

interface MechanismsAliasPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export default async function MechanismsAliasPage({ searchParams }: MechanismsAliasPageProps) {
  const params = await searchParams
  return (
    <MechanismSimulatorClient
      initialReaction={firstParam(params?.reaction)}
      initialCompound={firstParam(params?.compound)}
    />
  )
}
