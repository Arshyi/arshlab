import type { Metadata } from "next"
import { LearningDashboardClient } from "./learning-dashboard-client"

export const metadata: Metadata = {
  title: "Learning Dashboard | ARSHLAB",
  description: "Adaptive ARSHLAB learning health dashboard with mastery, exam readiness, curriculum progress, weak areas, and achievements.",
}

export default function LearningDashboardPage() {
  return <LearningDashboardClient />
}
