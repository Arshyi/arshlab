import type { Metadata } from "next"
import { ProgressClient } from "./progress-client"

export const metadata: Metadata = {
  title: "My Progress | ARSHLAB",
  description: "Review your ARSHLAB study dashboard, XP, daily goals, topic and concept mastery, achievements, and recent activity.",
}

export default function ProgressPage() {
  return <ProgressClient />
}
