import { ArrowDown, ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { COMPOUND_PATHWAYS, getStructureByCompoundId } from "@/lib/chemistry/structures"
import type { CompoundPathway } from "@/lib/chemistry/visualization-types"
import { Molecule2DRenderer } from "./Molecule2DRenderer"

interface CompoundPathwayGraphProps {
  pathway?: CompoundPathway
  pathwayId?: string
  compact?: boolean
}

function primaryFunctionalGroup(structure: ReturnType<typeof getStructureByCompoundId>, fallback: string): string {
  return structure?.functionalGroupHighlights?.[0]?.group ?? fallback
}

export function CompoundPathwayGraph({ pathway, pathwayId, compact = false }: CompoundPathwayGraphProps) {
  const selected = pathway ?? COMPOUND_PATHWAYS.find((item) => item.id === pathwayId) ?? COMPOUND_PATHWAYS[0]
  if (!selected) return null

  return (
    <div className="rounded-xl border border-border bg-background/70 p-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold">{selected.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{selected.description}</p>
        </div>
        <Badge variant="secondary" className="w-fit">
          {selected.nodes.length} compounds
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {selected.nodes.map((node, index) => {
          const structure = getStructureByCompoundId(node.compoundId)
          const edge = selected.edges.find((item) => item.from === node.id)
          return (
            <div key={node.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <Badge variant="outline">Step {index + 1}</Badge>
                <Badge variant="secondary" className="capitalize">
                  {primaryFunctionalGroup(structure, node.label)}
                </Badge>
              </div>
              {structure ? (
                <Molecule2DRenderer structure={structure} compact={compact} />
              ) : (
                <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-border bg-secondary/30 text-sm font-medium">
                  {node.label}
                </div>
              )}
              <div className="mt-3 rounded-xl border border-border bg-secondary/20 px-3 py-2">
                <p className="font-semibold">{structure?.displayName ?? node.label}</p>
                <p className="font-mono text-xs text-muted-foreground">{structure?.formula ?? "Formula unavailable"}</p>
                <p className="mt-1 text-xs text-muted-foreground">Functional group: {primaryFunctionalGroup(structure, node.label)}</p>
                {node.note ? <p className="mt-1 text-xs text-muted-foreground">{node.note}</p> : null}
              </div>
              {edge ? (
                <div className="mt-3 rounded-xl border border-primary/20 bg-primary/5 p-3 text-sm">
                  <div className="flex items-center gap-2 font-medium">
                    <span>{edge.reactionType}</span>
                    <ArrowRight className="hidden h-4 w-4 text-primary sm:block" />
                    <ArrowDown className="h-4 w-4 text-primary sm:hidden" />
                  </div>
                  {edge.reagent ? <p className="mt-1 text-xs text-muted-foreground">Conditions: {edge.reagent}</p> : null}
                  {edge.note ? <p className="mt-1 text-xs text-muted-foreground">{edge.note}</p> : null}
                </div>
              ) : (
                <div className="mt-3 rounded-xl border border-border bg-secondary/20 p-3 text-xs text-muted-foreground">
                  Pathway endpoint
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
