import type { Metadata } from "next"
import { ConjugationLearningClient } from "./conjugation-client"

export const metadata: Metadata = {
  title: "Conjugation, Resonance & Delocalization | ARSHLAB",
  description:
    "Interactive SVG learning engine for conjugation detection, resonance, pi electron counting, Huckel aromaticity, HOMO-LUMO gaps, UV-Vis color, and practice.",
}

interface ConjugationLearningPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export default async function ConjugationLearningPage({ searchParams }: ConjugationLearningPageProps) {
  const params = await searchParams
  return (
    <ConjugationLearningClient
      initialCompound={firstParam(params?.compound)}
      initialFocus={firstParam(params?.focus)}
    />
  )
}
