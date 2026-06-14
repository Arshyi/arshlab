import { ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { COMPOUND_PATHWAYS, getStructureByCompoundId } from "@/lib/chemistry/structures"
import type { CompoundPathway } from "@/lib/chemistry/visualization-types"
import { Molecule2DRenderer } from "./Molecule2DRenderer"

interface CompoundPathwayGraphProps {
  pathway?: CompoundPathway
  pathwayId?: string
  compact?: boolean
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

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max items-stretch gap-3">
          {selected.nodes.map((node, index) => {
            const structure = getStructureByCompoundId(node.compoundId)
            const edge = selected.edges.find((item) => item.from === node.id)
            return (
              <div key={node.id} className="flex items-center gap-3">
                <div className="w-56 rounded-xl border border-border bg-card p-3">
                  {structure ? (
                    <Molecule2DRenderer structure={structure} compact={compact} />
                  ) : (
                    <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-border bg-secondary/30 text-sm font-medium">
                      {node.label}
                    </div>
                  )}
                  <p className="mt-2 text-sm font-semibold">{node.label}</p>
                  {node.note ? <p className="mt-1 text-xs text-muted-foreground">{node.note}</p> : null}
                </div>
                {index < selected.nodes.length - 1 ? (
                  <div className="flex w-32 flex-col items-center gap-2 text-center">
                    <ArrowRight className="h-5 w-5 text-primary" />
                    {edge ? (
                      <>
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-medium text-primary">
                          {edge.reactionType}
                        </span>
                        {edge.reagent ? <span className="text-[10px] text-muted-foreground">{edge.reagent}</span> : null}
                      </>
                    ) : null}
                  </div>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
