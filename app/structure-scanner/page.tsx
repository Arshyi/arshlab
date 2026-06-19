import type { Metadata } from "next"
import { Database, ImageUp, Network, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { StructureScanner } from "@/components/chemistry/StructureScanner"

export const metadata: Metadata = {
  title: "Structure Recognition Scanner | ARSHLAB",
  description:
    "Upload and preprocess a molecular structure image locally, then match it against ARSHLAB's deterministic chemistry database.",
}

export default function StructureScannerPage() {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <ImageUp className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Molecular Structure Scanner</h1>
                <p className="text-muted-foreground">Upload-first local recognition workflow</p>
              </div>
            </div>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              ARSHLAB v5.0.0
            </Badge>
          </div>
          <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
            Upload a structure image, improve its local preview, add any chemistry clues you recognize, and ARSHLAB searches its local database for likely compounds. No live camera, remote image processing, or permanent image storage is enabled in v5.0.
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
            title="Local Image Workspace"
            description="Crop, rotate, adjust contrast, and use grayscale locally. Uploaded images are never added to scan history."
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
