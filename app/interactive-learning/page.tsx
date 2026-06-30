import type { Metadata } from "next"
import { InteractiveLearningClient } from "./interactive-learning-client"

export const metadata: Metadata = {
  title: "Interactive Molecular Orbital & Hybridization Learning | ARSHLAB",
  description:
    "Programmatic SVG molecular orbital diagrams, electron filling animations, HOMO/LUMO exploration, hybridization, sigma/pi overlap, lone pairs, and orbital quiz mode.",
}

export default function InteractiveLearningPage() {
  return <InteractiveLearningClient />
}
