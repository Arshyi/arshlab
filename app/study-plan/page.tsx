import type { Metadata } from "next"
import { StudyPlanClient } from "./study-plan-client"

export const metadata: Metadata = {
  title: "Study Plan | ARSHLAB",
  description: "Personal adaptive chemistry study recommendations based on diagnostic, practice, recovery, exam, and curriculum progress.",
}

export default function StudyPlanPage() {
  return <StudyPlanClient />
}
