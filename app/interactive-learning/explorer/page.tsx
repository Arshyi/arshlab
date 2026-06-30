import type { Metadata } from "next"
import { MolecularExplorerClient } from "./explorer-client"

export const metadata: Metadata = {
  title: "Interactive Molecular Explorer | ARSHLAB",
  description:
    "Explore molecular graphs with clickable atoms, bonds, orbitals, electron domains, functional groups, HOMO/LUMO overlays, and deterministic chemistry reasoning.",
}

interface MolecularExplorerPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export default async function MolecularExplorerPage({ searchParams }: MolecularExplorerPageProps) {
  const params = await searchParams
  return (
    <MolecularExplorerClient
      initialCompound={firstParam(params?.compound)}
      initialGraph={firstParam(params?.graph)}
    />
  )
}
