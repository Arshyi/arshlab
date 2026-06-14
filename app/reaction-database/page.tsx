import type { Metadata } from "next"
import { ReactionDatabaseClient } from "./reaction-database-client"

export const metadata: Metadata = {
  title: "Reaction Database | ARSHLAB",
  description: "Browse ARSHLAB's deterministic chemistry reaction database and reaction engine records.",
}

export default function ReactionDatabasePage() {
  return <ReactionDatabaseClient />
}
