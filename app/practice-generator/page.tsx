import type { Metadata } from "next"
import { PracticeGeneratorClient } from "./practice-generator-client"

export const metadata: Metadata = {
  title: "Practice Generator | ARSHLAB",
  description: "Generate original chemistry practice question sets with database, AI, or hybrid sources.",
}

export default function PracticeGeneratorPage() {
  return <PracticeGeneratorClient />
}
