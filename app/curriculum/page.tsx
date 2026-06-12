import type { Metadata } from "next"
import { CurriculumClient } from "./curriculum-client"

export const metadata: Metadata = {
  title: "Curriculum Engine | ARSHLAB",
  description:
    "Track chemistry curriculum coverage, unit mastery, diagnostic performance, and recommended next steps.",
}

export default function CurriculumPage() {
  return <CurriculumClient />
}
