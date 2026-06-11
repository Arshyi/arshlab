import type { Metadata } from "next"
import { ProgressClient } from "./progress-client"

export const metadata: Metadata = {
  title: "My Progress | ARSHLAB",
  description: "Review your ARSHLAB practice accuracy, topic progress, and recent activity.",
}

export default function ProgressPage() {
  return <ProgressClient />
}
