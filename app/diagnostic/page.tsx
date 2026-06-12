import type { Metadata } from "next"
import { DiagnosticClient } from "./diagnostic-client"

export const metadata: Metadata = {
  title: "Diagnostic Assessment | ARSHLAB",
  description:
    "Take an AI-generated chemistry diagnostic assessment to identify strengths, weaknesses, and recommended study paths.",
}

export default function DiagnosticPage() {
  return <DiagnosticClient />
}
