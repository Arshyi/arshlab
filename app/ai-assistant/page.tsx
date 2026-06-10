import type { Metadata } from "next"
import { AiAssistantClient } from "./ai-assistant-client"

export const metadata: Metadata = {
  title: "AI Chemistry Assistant | ARSHLAB",
  description:
    "Free-model-only AI chemistry assistant alpha for explaining concepts, ARSHLAB tools, and small practice questions.",
}

export default function AiAssistantPage() {
  return <AiAssistantClient />
}
