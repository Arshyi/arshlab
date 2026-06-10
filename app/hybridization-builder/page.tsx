import type { Metadata } from "next"
import { HybridizationBuilderClient } from "./hybridization-builder-client"

export const metadata: Metadata = {
  title: "Hybridization Builder | ARSHLAB",
  description:
    "Build conceptual hybrid orbitals, place outer atoms, and explore sigma and pi overlap in an interactive 3D ARSHLAB tool.",
}

export default function HybridizationBuilderPage() {
  return <HybridizationBuilderClient />
}
