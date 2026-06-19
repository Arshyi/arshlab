import type { Metadata } from "next"
import { Route } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { SynthesisExplorerClient } from "./synthesis-explorer-client"

export const metadata: Metadata = {
  title: "Synthesis Pathway Explorer | ARSHLAB",
  description:
    "Find deterministic reaction pathways between compounds using ARSHLAB's local chemistry knowledge graph.",
}

export default function SynthesisExplorerPage() {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section id="synthesis-pathway" className="mb-8 scroll-mt-24">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Route className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Synthesis Pathway Explorer</h1>
                <p className="text-muted-foreground">Find shortest deterministic pathways between compounds</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">ARSHLAB v4.9.0</Badge>
              <Badge variant="outline">Database mode = no AI usage</Badge>
            </div>
          </div>

          <Card className="rounded-2xl border-teal-500/20 bg-teal-500/5">
            <CardContent className="p-5">
              <p className="max-w-4xl text-sm leading-relaxed text-muted-foreground">
                Choose a starting compound and target compound. ARSHLAB uses breadth-first search over the existing Reaction Explorer knowledge graph to find the shortest available local pathway. No OpenRouter calls, AI generation, OCR, or external chemistry APIs are used.
              </p>
            </CardContent>
          </Card>
        </section>

        <SynthesisExplorerClient />
      </div>
    </main>
  )
}
