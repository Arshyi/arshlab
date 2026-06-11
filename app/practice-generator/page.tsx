import type { Metadata } from "next"
import { PracticeGeneratorClient } from "./practice-generator-client"

export const metadata: Metadata = {
  title: "Practice Generator | ARSHLAB",
  description: "Generate original chemistry practice questions with free-model-only AI guardrails.",
}

export default function PracticeGeneratorPage() {
  return <PracticeGeneratorClient />
}
