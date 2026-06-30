import type { Metadata } from "next"
import { ConjugationLearningClient } from "./conjugation-client"

export const metadata: Metadata = {
  title: "Conjugation, Resonance & Delocalization | ARSHLAB",
  description:
    "Interactive SVG learning engine for conjugation detection, resonance, pi electron counting, Huckel aromaticity, HOMO-LUMO gaps, UV-Vis color, and practice.",
}

export default function ConjugationLearningPage() {
  return <ConjugationLearningClient />
}
