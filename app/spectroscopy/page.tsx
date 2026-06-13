import { SpectroscopyClient } from "./spectroscopy-client"

export const metadata = {
  title: "Spectroscopy Reference | ARSHLAB",
  description: "Browse deterministic IR spectroscopy reference data for common functional groups.",
}

export default function SpectroscopyPage() {
  return <SpectroscopyClient />
}
