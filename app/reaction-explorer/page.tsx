import type { Metadata } from "next"
import Link from "next/link"
import { Database, Network } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ChemistryKnowledgeGraph } from "@/components/chemistry/ChemistryKnowledgeGraph"

export const metadata: Metadata = {
  title: "Reaction Explorer | ARSHLAB",
  description:
    "Explore a deterministic chemistry knowledge graph connecting compounds, reactions, mechanisms, formulas, solvers, and practice.",
}

export default function ReactionExplorerPage() {
  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section id="reaction-graph" className="mb-8 scroll-mt-24">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Network className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Reaction Explorer</h1>
                <p className="text-muted-foreground">Compounds, reactions, mechanisms, formulas, solvers, and practice</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">ARSHLAB v4.6.0</Badge>
              <Badge variant="outline">Database mode = no AI usage</Badge>
            </div>
          </div>

          <Card className="rounded-2xl border-teal-500/20 bg-teal-500/5">
            <CardContent className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
              <div>
                <h2 className="font-semibold">Deterministic chemistry knowledge graph</h2>
                <p className="mt-1 max-w-4xl text-sm leading-relaxed text-muted-foreground">
                  Follow how alcohol oxidation, alkene additions, acid-base neutralization, pH formulas,
                  stoichiometry solvers, and practice tools connect inside ARSHLAB. Every link opens the
                  relevant tool in context using the existing deep-link system.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" className="rounded-xl">
                  <Link href="/chemistry-database">
                    <Database className="h-4 w-4" />
                    Chemistry Database
                  </Link>
                </Button>
                <Button asChild className="rounded-xl">
                  <Link href="/practice-generator?source=database">Practice from Graph</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        <ChemistryKnowledgeGraph />
      </div>
    </div>
  )
}
