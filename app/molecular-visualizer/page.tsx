import type { Metadata } from "next"
import { MolecularVisualizerClient } from "./molecular-visualizer-client"

export const metadata: Metadata = {
  title: "Molecular Visualizer | ARSHLAB",
  description: "Explore deterministic 2D molecule structures, functional group highlights, pathways, and reaction diagrams.",
}

export default function MolecularVisualizerPage() {
  return <MolecularVisualizerClient />
}
