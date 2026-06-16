import type { Metadata } from "next"
import { CurriculumClient } from "./curriculum-client"

export const metadata: Metadata = {
  title: "Curriculum Engine | ARSHLAB",
  description:
    "Follow deterministic General and Organic Chemistry roadmaps with topic progress, prerequisites, tool links, and recommended next steps.",
}

export default function CurriculumPage() {
  return <CurriculumClient />
}
