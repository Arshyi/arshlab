import type { Metadata } from "next"
import { Camera, Database, Network, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { StructureScanner } from "@/components/chemistry/StructureScanner"

export const metadata: Metadata = {
  title: "Molecular Structure Scanner | ARSHLAB",
  description:
    "Upload or describe a molecule and match it against ARSHLAB's local chemistry database with deterministic scanner links.",
}

export default function StructureScannerPage() {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Camera className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Molecular Structure Scanner</h1>
                <p className="text-muted-foreground">Database-first structure recognition bridge</p>
              </div>
            </div>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              ARSHLAB v4.6.0
            </Badge>
          </div>
          <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
            Upload a structure image, add a formula or name hint, and ARSHLAB searches its local chemistry database for the most likely compound. The scanner is deterministic, private, and built to connect structures to visualizers, reactions, formulas, practice, exams, and curriculum topics.
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <ScannerFeature
            icon={Database}
            title="Local Chemistry Database"
            description="Matches are generated from ARSHLAB records. No OpenRouter calls, no paid models, no external chemistry API."
          />
          <ScannerFeature
            icon={ShieldCheck}
            title="Private Preview"
            description="Images stay in the browser for preview and are not permanently stored by this alpha scanner."
          />
          <ScannerFeature
            icon={Network}
            title="Deep Linked Results"
            description="Open the matched compound in the molecular visualizer, reaction graph, formula sheet, practice, exams, and curriculum."
          />
        </div>

        <StructureScanner />
      </div>
    </main>
  )
}

function ScannerFeature({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType
  title: string
  description: string
}) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="flex gap-3 p-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-semibold">{title}</h2>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  )
}
