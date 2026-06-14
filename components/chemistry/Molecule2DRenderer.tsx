import type { AtomNode, BondEdge, BondOrder, FunctionalGroupHighlight, MolecularStructure2D } from "@/lib/chemistry/visualization-types"
import { cn } from "@/lib/utils"

interface Molecule2DRendererProps {
  structure: MolecularStructure2D
  highlightFunctionalGroup?: string
  compact?: boolean
  showAtomLabels?: boolean
  className?: string
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "")
}

function bondLines(bond: BondEdge, from: { x: number; y: number }, to: { x: number; y: number }) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
  const nx = (-dy / length) * 5
  const ny = (dx / length) * 5

  if (bond.order === 2) {
    return [
      { x1: from.x + nx, y1: from.y + ny, x2: to.x + nx, y2: to.y + ny },
      { x1: from.x - nx, y1: from.y - ny, x2: to.x - nx, y2: to.y - ny },
    ]
  }
  if (bond.order === 3) {
    return [
      { x1: from.x, y1: from.y, x2: to.x, y2: to.y },
      { x1: from.x + nx * 1.35, y1: from.y + ny * 1.35, x2: to.x + nx * 1.35, y2: to.y + ny * 1.35 },
      { x1: from.x - nx * 1.35, y1: from.y - ny * 1.35, x2: to.x - nx * 1.35, y2: to.y - ny * 1.35 },
    ]
  }
  return [{ x1: from.x, y1: from.y, x2: to.x, y2: to.y }]
}

function shouldEmphasize(highlight: FunctionalGroupHighlight, active?: string): boolean {
  if (!active || active === "all") return true
  const key = normalize(active)
  return [highlight.id, highlight.group, highlight.label].some((value) => normalize(value).includes(key))
}

function bondStroke(order: BondOrder): string {
  if (order === "aromatic") return "#0f766e"
  if (order === 2 || order === 3) return "#334155"
  return "#475569"
}

export function Molecule2DRenderer({
  structure,
  highlightFunctionalGroup = "all",
  compact = false,
  showAtomLabels = false,
  className,
}: Molecule2DRendererProps) {
  const atomsById = new Map(structure.atoms.map((atom) => [atom.id, atom]))
  const padding = compact ? 28 : 38
  const minX = Math.min(...structure.atoms.map((atom) => atom.x))
  const maxX = Math.max(...structure.atoms.map((atom) => atom.x))
  const minY = Math.min(...structure.atoms.map((atom) => atom.y))
  const maxY = Math.max(...structure.atoms.map((atom) => atom.y))
  const viewBox = `${minX - padding} ${minY - padding} ${maxX - minX + padding * 2} ${maxY - minY + padding * 2}`
  const highlights = structure.functionalGroupHighlights ?? []

  return (
    <div className={cn("rounded-xl border border-border bg-background/80 p-3", className)}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("truncate font-semibold", compact ? "text-sm" : "text-base")}>{structure.displayName}</p>
          <p className="font-mono text-xs text-muted-foreground">{structure.formula}</p>
        </div>
        {highlights.length > 0 && !compact ? (
          <span className="shrink-0 rounded-full bg-teal-500/10 px-2 py-1 text-[10px] font-medium text-teal-700 dark:text-teal-300">
            {highlights.length} highlight{highlights.length === 1 ? "" : "s"}
          </span>
        ) : null}
      </div>
      <svg
        role="img"
        aria-label={`${structure.displayName} 2D structure`}
        viewBox={viewBox}
        className={cn("w-full", compact ? "h-28" : "h-52")}
      >
        <rect x={minX - padding} y={minY - padding} width={maxX - minX + padding * 2} height={maxY - minY + padding * 2} rx="18" fill="transparent" />

        {highlights.map((item) => {
          const highlightedAtoms = item.atomIds.map((id) => atomsById.get(id)).filter((atom): atom is AtomNode => Boolean(atom))
          if (!highlightedAtoms.length) return null
          const left = Math.min(...highlightedAtoms.map((atom) => atom.x)) - 24
          const right = Math.max(...highlightedAtoms.map((atom) => atom.x)) + 24
          const top = Math.min(...highlightedAtoms.map((atom) => atom.y)) - 22
          const bottom = Math.max(...highlightedAtoms.map((atom) => atom.y)) + 22
          const active = shouldEmphasize(item, highlightFunctionalGroup)
          return (
            <g key={item.id} opacity={active ? 1 : 0.28}>
              <rect
                x={left}
                y={top}
                width={right - left}
                height={bottom - top}
                rx="18"
                fill={item.color ?? "#14b8a6"}
                opacity={active ? 0.18 : 0.08}
                stroke={item.color ?? "#14b8a6"}
                strokeWidth={active ? 2 : 1}
                strokeDasharray={active ? undefined : "4 4"}
              />
            </g>
          )
        })}

        {structure.bonds.map((item) => {
          const from = atomsById.get(item.from)
          const to = atomsById.get(item.to)
          if (!from || !to) return null
          const active = highlights.some((highlight) => shouldEmphasize(highlight, highlightFunctionalGroup) && highlight.bondIds?.includes(item.id))
          return (
            <g key={item.id}>
              {bondLines(item, from, to).map((line, index) => (
                <line
                  key={`${item.id}-${index}`}
                  {...line}
                  stroke={active ? "#0f766e" : bondStroke(item.order)}
                  strokeWidth={active ? 4 : 3}
                  strokeLinecap="round"
                  strokeDasharray={item.order === "aromatic" ? "7 5" : undefined}
                />
              ))}
            </g>
          )
        })}

        {structure.atoms.map((item) => {
          const label = item.label ?? item.element
          const visibleLabel = showAtomLabels || item.element !== "C" || Boolean(item.label)
          const active = highlights.some((highlight) => shouldEmphasize(highlight, highlightFunctionalGroup) && highlight.atomIds.includes(item.id))
          return (
            <g key={item.id}>
              <circle
                cx={item.x}
                cy={item.y}
                r={visibleLabel ? 15 : 6}
                fill={visibleLabel ? "hsl(var(--background))" : active ? "#0f766e" : "#475569"}
                stroke={active ? "#0f766e" : "#94a3b8"}
                strokeWidth={active ? 3 : visibleLabel ? 2 : 0}
              />
              {visibleLabel ? (
                <text
                  x={item.x}
                  y={item.y + 4}
                  textAnchor="middle"
                  className="fill-foreground text-[13px] font-bold"
                >
                  {label}
                </text>
              ) : null}
            </g>
          )
        })}
      </svg>
      {!compact && highlights.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {highlights.map((item) => (
            <span
              key={item.id}
              className="rounded-full border border-border bg-secondary/40 px-2 py-1 text-[10px] font-medium text-muted-foreground"
            >
              {item.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
