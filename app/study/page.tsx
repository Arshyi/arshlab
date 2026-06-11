import type { Metadata } from "next"
import { StudyClient } from "./study-client"

export const metadata: Metadata = {
  title: "Study Mode | ARSHLAB",
  description: "Guided adaptive chemistry study sessions with immediate feedback, XP, and topic mastery.",
}

export default function StudyPage() {
  return <StudyClient />
}
