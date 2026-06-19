import type { Metadata } from "next"
import { SpectroscopyExplorerClient } from "./spectroscopy-explorer-client"

export const metadata: Metadata = {
  title: "Spectroscopy Explorer | ARSHLAB",
  description:
    "Explore deterministic IR, 1H NMR, 13C NMR, and mass spectrometry references with compound spectra and practice links.",
}

export default function SpectroscopyExplorerPage() {
  return <SpectroscopyExplorerClient />
}

