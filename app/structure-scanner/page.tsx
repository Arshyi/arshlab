import type { Metadata } from "next"
import { Database, ImageUp, Network, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { StructureScanner } from "@/components/chemistry/StructureScanner"

export const metadata: Metadata = {
  title: "Structure Recognition Scanner | ARSHLAB",
  description:
    "Upload or capture a private snapshot, normalize the chemistry canvas locally, optimize molecular graph hypotheses, then fuse local chemistry evidence in the browser.",
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
                <p className="text-muted-foreground">Upload or snapshot-based local recognition workflow</p>
              </div>
            </div>
            <Badge variant="outline" className="w-fit rounded-full px-3 py-1">
              ARSHLAB v6.0.0
            </Badge>
          </div>
          <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
            Upload a structure image or accept a single camera snapshot. ARSHLAB first finds the most likely paper, tablet, whiteboard, or screenshot canvas, deskews it into a flat high-contrast local crop, then isolates chemistry-rich regions while suppressing device frames, glare, hands, and scene edges. The scanner now generates multiple molecular graph hypotheses, optimizes them with whole-molecule chemistry constraints, and passes the best canonical graph into validation and evidence fusion.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted-foreground">
            Molecular reconstruction is an educational estimate built from local line geometry, endpoint graphs, candidate graph search, bond-angle scoring, ring-template fitting, chemical valence checks, and chemistry hints. Always verify inferred atoms and bond orders.
          </p>
        </div>

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <ScannerFeature
            icon={Database}
            title="Global Graph Optimizer"
            description="Multiple plausible atom/bond graphs are generated, scored as whole molecules, optimized, canonicalized, and then validated."
          />
          <ScannerFeature
            icon={ShieldCheck}
            title="Local Image Workspace"
            description="Crop, rotate, adjust contrast, and use grayscale locally. Uploads and camera frames are never stored in scan history."
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
