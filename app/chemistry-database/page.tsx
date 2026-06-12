import type { Metadata } from "next"
import { ChemistryDatabaseClient } from "./chemistry-database-client"

export const metadata: Metadata = {
  title: "Chemistry Database | ARSHLAB",
  description: "Browse ARSHLAB's internal chemistry knowledge core for compounds, ions, functional groups, and reaction templates.",
}

export default function ChemistryDatabasePage() {
  return <ChemistryDatabaseClient />
}
