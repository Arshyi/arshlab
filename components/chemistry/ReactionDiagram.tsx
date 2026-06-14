import { ArrowRight } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { getStructureByFormulaOrName } from "@/lib/chemistry/structures"
import type { ReactionRecord } from "@/lib/chemistry/reaction-types"
import { Molecule2DRenderer } from "./Molecule2DRenderer"

interface ReactionDiagramProps {
  reaction: ReactionRecord
  compact?: boolean
}

function FormulaCard({ value, compact }: { value: string; compact?: boolean }) {
  const structure = getStructureByFormulaOrName(value)
  return (
    <div className="min-w-0 flex-1 rounded-xl border border-border bg-background/80 p-3">
      {structure ? (
        <Molecule2DRenderer structure={structure} compact={compact} showAtomLabels={compact} />
      ) : (
        <div className="flex min-h-24 items-center justify-center rounded-lg border border-dashed border-border bg-secondary/30 px-3 text-center">
          <span className="font-mono text-sm font-semibold">{value}</span>
        </div>
      )}
    </div>
  )
}

function MoleculeSet({ values, compact }: { values: string[]; compact?: boolean }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      {values.map((value, index) => (
        <div key={`${value}-${index}`} className="flex items-center gap-2">
          {index > 0 ? <span className="text-lg font-bold text-muted-foreground">+</span> : null}
          <FormulaCard value={value} compact={compact} />
        </div>
      ))}
    </div>
  )
}

export function ReactionDiagram({ reaction, compact = false }: ReactionDiagramProps) {
  return (
    <div className="rounded-xl border border-border bg-background/70 p-4">
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="font-semibold">{reaction.name}</p>
          <p className="mt-1 font-mono text-xs text-muted-foreground">{reaction.balancedEquation}</p>
        </div>
        <Badge variant="secondary" className="w-fit">
          {reaction.reactionType}
        </Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-center">
        <MoleculeSet values={reaction.reactants} compact={compact} />
        <div className="flex items-center justify-center">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <ArrowRight className="h-5 w-5" />
          </div>
        </div>
        <MoleculeSet values={reaction.products} compact={compact} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Badge>{reaction.category}</Badge>
        <Badge variant="outline">{reaction.difficulty}</Badge>
        {reaction.curriculum.slice(0, 3).map((item) => (
          <Badge key={item} variant="secondary">
            {item}
          </Badge>
        ))}
      </div>
      {!compact ? <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{reaction.explanation}</p> : null}
    </div>
  )
}
