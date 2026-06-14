import { ArrowDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { getStructureByFormulaOrName } from "@/lib/chemistry/structures"
import type { ReactionRecord } from "@/lib/chemistry/reaction-types"
import { Molecule2DRenderer } from "./Molecule2DRenderer"

interface ReactionDiagramProps {
  reaction: ReactionRecord
  compact?: boolean
}

function inferReactionConditions(reaction: ReactionRecord): string {
  const text = `${reaction.name} ${reaction.reactionType} ${reaction.category} ${reaction.explanation}`.toLowerCase()
  if (text.includes("esterification")) return "Acid catalyst + heat"
  if (text.includes("combustion")) return "Heat / ignition"
  if (text.includes("chlorination")) return "UV light"
  if (text.includes("hydrogenation")) return "Metal catalyst + pressure"
  if (text.includes("dehydration")) return "Heat + acid catalyst"
  if (text.includes("haber")) return "Fe catalyst + pressure"
  if (text.includes("contact") || text.includes("sulfur dioxide")) return "V2O5 catalyst"
  if (text.includes("electrolysis")) return "Electric current"
  if (text.includes("precipitation") || text.includes("double displacement")) return "Aqueous solutions"
  if (text.includes("neutralization") || text.includes("acid-base")) return "Aqueous solution"
  if (text.includes("thermal decomposition")) return "Heat"
  if (text.includes("bromination")) return "Room temperature"
  return "Standard classroom conditions"
}

function FormulaCard({ value, compact }: { value: string; compact?: boolean }) {
  const structure = getStructureByFormulaOrName(value)
  return (
    <div className="min-w-0 rounded-xl border border-border bg-background/80 p-3">
      {structure ? (
        <Molecule2DRenderer structure={structure} compact={compact} />
      ) : (
        <div className="flex min-h-24 items-center justify-center rounded-lg border border-dashed border-border bg-secondary/30 px-3 text-center">
          <span className="font-mono text-sm font-semibold">{value}</span>
        </div>
      )}
    </div>
  )
}

function MoleculeSet({ title, values, compact }: { title: string; values: string[]; compact?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card/80 p-3">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
        <Badge variant="outline">{values.length}</Badge>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
        {values.map((value, index) => (
          <div key={`${value}-${index}`} className="min-w-0">
            <FormulaCard value={value} compact={compact} />
            {index < values.length - 1 ? <p className="mt-1 text-center text-sm font-bold text-muted-foreground">+</p> : null}
          </div>
        ))}
      </div>
    </div>
  )
}

export function ReactionDiagram({ reaction, compact = false }: ReactionDiagramProps) {
  const conditions = inferReactionConditions(reaction)

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

      <div className="space-y-3">
        <MoleculeSet title="Reactants" values={reaction.reactants} compact={compact} />
        <div className="flex flex-col items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 py-3 text-center">
          <Badge variant="outline" className="bg-background">
            {conditions}
          </Badge>
          <ArrowDown className="h-6 w-6 text-primary" />
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">reaction pathway</p>
        </div>
        <MoleculeSet title="Products" values={reaction.products} compact={compact} />
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
