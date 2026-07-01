import type { Metadata } from "next"
import { VirtualLabClient } from "./virtual-lab-client"

export const metadata: Metadata = {
  title: "Virtual Chemistry Laboratory | ARSHLAB",
  description:
    "Deterministic virtual undergraduate chemistry lab with SVG glassware, guided and free lab modes, observations, spectra, safety, lab notebook, and assessment.",
}

interface VirtualLabPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export default async function VirtualLabPage({ searchParams }: VirtualLabPageProps) {
  const params = await searchParams
  return (
    <VirtualLabClient
      initialExperiment={firstParam(params?.experiment)}
      initialCompound={firstParam(params?.compound)}
      initialMode={firstParam(params?.mode)}
    />
  )
}
