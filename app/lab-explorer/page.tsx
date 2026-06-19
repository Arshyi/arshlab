import type { Metadata } from "next"
import { LabExplorerClient } from "./lab-explorer-client"

export const metadata: Metadata = {
  title: "Lab Explorer | ARSHLAB",
  description:
    "Browse deterministic chemistry lab skills, safety, glassware, and technique records for first-year and organic chemistry.",
}

export default function LabExplorerPage() {
  return <LabExplorerClient />
}

