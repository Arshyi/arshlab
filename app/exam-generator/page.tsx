import type { Metadata } from "next"
import { ExamGeneratorClient } from "./exam-generator-client"

export const metadata: Metadata = {
  title: "Exam Generator | ARSHLAB",
  description: "Generate original chemistry practice exams with free-model-only AI guardrails.",
}

export default function ExamGeneratorPage() {
  return <ExamGeneratorClient />
}
