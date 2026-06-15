import type {
  AtomNode,
  BondEdge,
  BondOrder,
  FunctionalGroupHighlight,
  MolecularStructure2D,
  MoleculeDisplayMode,
} from "@/lib/chemistry/visualization-types"
import { cn } from "@/lib/utils"

interface Molecule2DRendererProps {
  structure: MolecularStructure2D
  highlightFunctionalGroup?: string
  compact?: boolean
  showAtomLabels?: boolean
  displayMode?: MoleculeDisplayMode
  className?: string
}

interface ElementVisual {
  symbol: string
  name: string
  atomicNumber: number
  atomicMass: string
  color: string
  textColor: string
}

export const ELEMENT_COLOR_LEGEND: ElementVisual[] = [
  { symbol: "C", name: "Carbon", atomicNumber: 6, atomicMass: "12.011", color: "#1f2937", textColor: "#ffffff" },
  { symbol: "H", name: "Hydrogen", atomicNumber: 1, atomicMass: "1.008", color: "#e5e7eb", textColor: "#111827" },
  { symbol: "O", name: "Oxygen", atomicNumber: 8, atomicMass: "15.999", color: "#ef4444", textColor: "#ffffff" },
  { symbol: "N", name: "Nitrogen", atomicNumber: 7, atomicMass: "14.007", color: "#2563eb", textColor: "#ffffff" },
  { symbol: "S", name: "Sulfur", atomicNumber: 16, atomicMass: "32.06", color: "#facc15", textColor: "#111827" },
  { symbol: "Cl", name: "Chlorine", atomicNumber: 17, atomicMass: "35.45", color: "#22c55e", textColor: "#052e16" },
  { symbol: "Br", name: "Bromine", atomicNumber: 35, atomicMass: "79.904", color: "#7f1d1d", textColor: "#ffffff" },
  { symbol: "P", name: "Phosphorus", atomicNumber: 15, atomicMass: "30.974", color: "#f97316", textColor: "#111827" },
  { symbol: "Na", name: "Sodium", atomicNumber: 11, atomicMass: "22.990", color: "#a78bfa", textColor: "#111827" },
  { symbol: "K", name: "Potassium", atomicNumber: 19, atomicMass: "39.098", color: "#c084fc", textColor: "#111827" },
  { symbol: "Ca", name: "Calcium", atomicNumber: 20, atomicMass: "40.078", color: "#94a3b8", textColor: "#111827" },
]

const ELEMENT_VISUALS = new Map(ELEMENT_COLOR_LEGEND.map((item) => [item.symbol, item]))

const FALLBACK_ELEMENT: ElementVisual = {
  symbol: "X",
  name: "Element",
  atomicNumber: 0,
  atomicMass: "unlisted",
  color: "#64748b",
  textColor: "#ffffff",
}

const CONDENSED_FORMULAS: Record<string, string> = {
  methane: "CH4",
  ethane: "CH3CH3",
  propane: "CH3CH2CH3",
  butane: "CH3CH2CH2CH3",
  ethene: "CH2=CH2",
  propene: "CH2=CHCH3",
  ethyne: "HC≡CH",
  propyne: "CH3C≡CH",
  methanol: "CH3OH",
  ethanol: "CH3CH2OH",
  "propan-1-ol": "CH3CH2CH2OH",
  "propan-2-ol": "CH3CHOHCH3",
  "butan-1-ol": "CH3CH2CH2CH2OH",
  methanal: "HCHO",
  ethanal: "CH3CHO",
  propanal: "CH3CH2CHO",
  acetone: "CH3COCH3",
  butanone: "CH3COCH2CH3",
  "methanoic-acid": "HCOOH",
  "ethanoic-acid": "CH3COOH",
  "propanoic-acid": "CH3CH2COOH",
  "methyl-ethanoate": "CH3COOCH3",
  "ethyl-ethanoate": "CH3COOCH2CH3",
  benzene: "C6H6",
  phenol: "C6H5OH",
  toluene: "C6H5CH3",
  aniline: "C6H5NH2",
  aspirin: "C6H4(OCOCH3)COOH",
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "")
}

function elementVisual(symbol: string): ElementVisual {
  return ELEMENT_VISUALS.get(symbol) ?? { ...FALLBACK_ELEMENT, symbol, name: symbol }
}

function atomTooltip(atom: AtomNode): string {
  const visual = elementVisual(atom.element)
  const name = visual.name === atom.element ? atom.element : visual.name
  const atomicNumber = visual.atomicNumber > 0 ? String(visual.atomicNumber) : "unlisted"
  return `${name}\nAtomic Number: ${atomicNumber}\nAtomic Mass: ${visual.atomicMass}`
}

function atomLabelFontSize(element: string, compact: boolean): number {
  if (element.length > 2) return compact ? 8 : 10
  if (element.length > 1) return compact ? 10 : 12
  return compact ? 13 : 15
}

function atomTextStroke(textColor: string): string {
  return textColor === "#ffffff" ? "rgba(0, 0, 0, 0.45)" : "rgba(255, 255, 255, 0.75)"
}

function bondSymbol(order: BondOrder): string {
  if (order === 2) return "═"
  if (order === 3) return "≡"
  if (order === "aromatic") return "⌬"
  return "—"
}

function overlayFormulaLabel(group: string): string {
  const key = normalize(group)
  if (key.includes("alcohol") || key.includes("phenoloh")) return "-OH"
  if (key.includes("carbonyl") || key.includes("ketone") || key.includes("aldehyde")) return "C=O"
  if (key.includes("carboxylicacid") || key.includes("carboxyl")) return "-COOH"
  if (key.includes("ester")) return "-COO-"
  if (key.includes("amine") || key.includes("amino")) return "-NH2"
  if (key.includes("amide")) return "-CONH2"
  if (key.includes("nitrile")) return "C≡N"
  if (key.includes("alkyne")) return "C≡C"
  if (key.includes("alkene")) return "C=C"
  if (key.includes("aromatic")) return "aromatic"
  return group
}

function bondLines(bond: BondEdge, from: { x: number; y: number }, to: { x: number; y: number }) {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.max(Math.sqrt(dx * dx + dy * dy), 1)
  const nx = (-dy / length) * 6.5
  const ny = (dx / length) * 6.5

  if (bond.order === 2) {
    return [
      { x1: from.x + nx, y1: from.y + ny, x2: to.x + nx, y2: to.y + ny },
      { x1: from.x - nx, y1: from.y - ny, x2: to.x - nx, y2: to.y - ny },
    ]
  }
  if (bond.order === 3) {
    return [
      { x1: from.x, y1: from.y, x2: to.x, y2: to.y },
      { x1: from.x + nx * 1.45, y1: from.y + ny * 1.45, x2: to.x + nx * 1.45, y2: to.y + ny * 1.45 },
      { x1: from.x - nx * 1.45, y1: from.y - ny * 1.45, x2: to.x - nx * 1.45, y2: to.y - ny * 1.45 },
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
  if (order === 2 || order === 3) return "#1f2937"
  return "#475569"
}

function connectedAtomIds(bonds: BondEdge[], atomId: string): string[] {
  return bonds.flatMap((bond) => {
    if (bond.from === atomId) return [bond.to]
    if (bond.to === atomId) return [bond.from]
    return []
  })
}

function getVisibleAtoms(structure: MolecularStructure2D, mode: MoleculeDisplayMode): AtomNode[] {
  if (mode !== "skeletal") return structure.atoms
  return structure.atoms.filter((atom) => {
    if (atom.element !== "H") return true
    const neighbors = connectedAtomIds(structure.bonds, atom.id)
    return !neighbors.some((neighborId) => structure.atoms.find((candidate) => candidate.id === neighborId)?.element === "C")
  })
}

function getCondensedFormula(structure: MolecularStructure2D): string {
  return structure.condensedFormula ?? CONDENSED_FORMULAS[structure.id] ?? CONDENSED_FORMULAS[structure.compoundId] ?? structure.formula
}

function aromaticRingCenters(structure: MolecularStructure2D, atomsById: Map<string, AtomNode>) {
  const aromaticAtoms = Array.from(
    new Set(
      structure.bonds
        .filter((bond) => bond.order === "aromatic")
        .flatMap((bond) => [bond.from, bond.to]),
    ),
  )
    .map((id) => atomsById.get(id))
    .filter((atom): atom is AtomNode => Boolean(atom))

  if (aromaticAtoms.length < 5) return []
  const cx = aromaticAtoms.reduce((sum, atom) => sum + atom.x, 0) / aromaticAtoms.length
  const cy = aromaticAtoms.reduce((sum, atom) => sum + atom.y, 0) / aromaticAtoms.length
  const radius =
    aromaticAtoms.reduce((sum, atom) => sum + Math.sqrt((atom.x - cx) ** 2 + (atom.y - cy) ** 2), 0) /
    aromaticAtoms.length
  return [{ cx, cy, radius: Math.max(radius * 0.46, 18) }]
}

export function ElementColorLegend({ compact = false }: { compact?: boolean }) {
  const entries = compact ? ELEMENT_COLOR_LEGEND.slice(0, 8) : ELEMENT_COLOR_LEGEND
  return (
    <div className="rounded-xl border border-border bg-background/80 p-3">
      <p className="text-sm font-semibold">Element Colors</p>
      <div className={cn("mt-3 grid gap-2", compact ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3")}>
        {entries.map((item) => (
          <div key={item.symbol} className="flex items-center gap-2 text-xs">
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full border border-border font-bold"
              style={{ backgroundColor: item.color, color: item.textColor }}
            >
              {item.symbol}
            </span>
            <span className="text-muted-foreground">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Molecule2DRenderer({
  structure,
  highlightFunctionalGroup = "all",
  compact = false,
  showAtomLabels = true,
  displayMode = "ball-and-stick",
  className,
}: Molecule2DRendererProps) {
  const visibleAtoms = getVisibleAtoms(structure, displayMode)
  const visibleIds = new Set(visibleAtoms.map((atom) => atom.id))
  const visibleBonds = structure.bonds.filter((bond) => visibleIds.has(bond.from) && visibleIds.has(bond.to))
  const atomsById = new Map(visibleAtoms.map((atom) => [atom.id, atom]))
  const padding = compact ? 44 : 62
  const minX = Math.min(...visibleAtoms.map((atom) => atom.x))
  const maxX = Math.max(...visibleAtoms.map((atom) => atom.x))
  const minY = Math.min(...visibleAtoms.map((atom) => atom.y))
  const maxY = Math.max(...visibleAtoms.map((atom) => atom.y))
  const viewBox = `${minX - padding} ${minY - padding} ${maxX - minX + padding * 2} ${maxY - minY + padding * 2}`
  const highlights = structure.functionalGroupHighlights ?? []

  return (
    <div className={cn("min-w-0 overflow-hidden rounded-xl border border-border bg-background/80 p-3", className)}>
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn("truncate font-semibold", compact ? "text-sm" : "text-base")}>{structure.displayName}</p>
          <p className="font-mono text-xs text-muted-foreground">
            {displayMode === "condensed" ? getCondensedFormula(structure) : structure.formula}
          </p>
        </div>
        {!compact ? (
          <span className="shrink-0 rounded-full bg-teal-500/10 px-2 py-1 text-[10px] font-medium text-teal-700 dark:text-teal-300">
            {displayMode.replace(/-/g, " ")}
          </span>
        ) : null}
      </div>

      {displayMode === "condensed" ? (
        <div className={cn("flex items-center justify-center rounded-xl border border-border bg-secondary/20 px-4 text-center", compact ? "min-h-28" : "min-h-52")}>
          <div>
            <p className="font-mono text-2xl font-bold tracking-wide sm:text-3xl">{getCondensedFormula(structure)}</p>
            <p className="mt-2 text-xs text-muted-foreground">Condensed formula view</p>
          </div>
        </div>
      ) : (
        <svg
          role="img"
          aria-label={`${structure.displayName} 2D structure`}
          viewBox={viewBox}
          className={cn("w-full overflow-visible", compact ? "h-36" : "h-64")}
        >
          <rect x={minX - padding} y={minY - padding} width={maxX - minX + padding * 2} height={maxY - minY + padding * 2} rx="18" fill="transparent" />

          {highlights.map((item) => {
            const highlightedAtoms = item.atomIds.map((id) => atomsById.get(id)).filter((atom): atom is AtomNode => Boolean(atom))
            if (!highlightedAtoms.length) return null
            const left = Math.min(...highlightedAtoms.map((atom) => atom.x)) - 28
            const right = Math.max(...highlightedAtoms.map((atom) => atom.x)) + 28
            const top = Math.min(...highlightedAtoms.map((atom) => atom.y)) - 28
            const bottom = Math.max(...highlightedAtoms.map((atom) => atom.y)) + 28
            const active = shouldEmphasize(item, highlightFunctionalGroup)
            return (
              <g key={item.id} opacity={active ? 1 : 0.24}>
                <rect
                  x={left}
                  y={top}
                  width={right - left}
                  height={bottom - top}
                  rx="18"
                  fill={item.color ?? "#14b8a6"}
                  opacity={active ? 0.18 : 0.08}
                  stroke={item.color ?? "#14b8a6"}
                  strokeWidth={active ? 2.4 : 1.2}
                  strokeDasharray={active ? undefined : "4 4"}
                />
                <text
                  x={left + 9}
                  y={top + 15}
                  className="fill-foreground text-[11px] font-black"
                  paintOrder="stroke"
                  stroke="hsl(var(--background))"
                  strokeWidth="3"
                >
                  {overlayFormulaLabel(item.group)}
                </text>
              </g>
            )
          })}

          {visibleBonds.map((item) => {
            const from = atomsById.get(item.from)
            const to = atomsById.get(item.to)
            if (!from || !to) return null
            const activeHighlight = highlights.find(
              (highlight) => shouldEmphasize(highlight, highlightFunctionalGroup) && highlight.bondIds?.includes(item.id),
            )
            const active = Boolean(activeHighlight)
            const activeColor = activeHighlight?.color ?? "#0f766e"
            const midpoint = { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }
            return (
              <g key={item.id}>
                {bondLines(item, from, to).map((line, index) => (
                  <g key={`${item.id}-${index}`}>
                    {active ? (
                      <line
                        {...line}
                        stroke={activeColor}
                        strokeWidth={displayMode === "skeletal" ? 9 : 10}
                        strokeLinecap="round"
                        opacity={0.24}
                      />
                    ) : null}
                    <line
                      {...line}
                      stroke={active ? activeColor : bondStroke(item.order)}
                      strokeWidth={active ? 5 : displayMode === "skeletal" ? 3.8 : 3.2}
                      strokeLinecap="round"
                    />
                  </g>
                ))}
                {item.order !== "aromatic" ? (
                  <text
                    x={midpoint.x}
                    y={midpoint.y - 9}
                    textAnchor="middle"
                    className="text-[12px] font-black"
                    fill={active ? activeColor : "hsl(var(--muted-foreground))"}
                    paintOrder="stroke"
                    stroke="hsl(var(--background))"
                    strokeWidth="3"
                  >
                    {bondSymbol(item.order)}
                  </text>
                ) : null}
              </g>
            )
          })}

          {aromaticRingCenters(structure, atomsById).map((ring, index) => (
            <circle
              key={`aromatic-ring-${index}`}
              cx={ring.cx}
              cy={ring.cy}
              r={ring.radius}
              fill="none"
              stroke="#0f766e"
              strokeWidth="2.4"
            />
          ))}

          {visibleAtoms.map((item) => {
            const chargeLabel = item.label && item.label !== item.element ? item.label.replace(item.element, "") : ""
            const visual = elementVisual(item.element)
            const activeHighlight = highlights.find(
              (highlight) => shouldEmphasize(highlight, highlightFunctionalGroup) && highlight.atomIds.includes(item.id),
            )
            const active = Boolean(activeHighlight)
            const activeColor = activeHighlight?.color ?? "#0f766e"
            const radius = displayMode === "skeletal" && item.element === "C" ? (compact ? 17 : 18) : compact ? 18 : 21
            return (
              <g key={item.id}>
                <title>{atomTooltip(item)}</title>
                {active ? (
                  <circle
                    cx={item.x}
                    cy={item.y}
                    r={radius + 7}
                    fill={activeColor}
                    opacity={0.18}
                    stroke={activeColor}
                    strokeWidth={2}
                  />
                ) : null}
                <circle
                  cx={item.x}
                  cy={item.y}
                  r={radius}
                  fill={visual.color}
                  stroke={active ? activeColor : "hsl(var(--background))"}
                  strokeWidth={active ? 4.5 : 2.5}
                />
                {showAtomLabels ? (
                  <text
                    x={item.x}
                    y={item.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={atomLabelFontSize(item.element, compact)}
                    fontWeight={900}
                    fontFamily="ui-sans-serif, system-ui, sans-serif"
                    fill={visual.textColor}
                    stroke={atomTextStroke(visual.textColor)}
                    strokeWidth={0.6}
                    paintOrder="stroke"
                    pointerEvents="none"
                  >
                    {item.element}
                  </text>
                ) : null}
                {chargeLabel ? (
                  <text
                    x={item.x + radius - 2}
                    y={item.y - radius + 7}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={compact ? 8 : 9}
                    fontWeight={900}
                    fontFamily="ui-sans-serif, system-ui, sans-serif"
                    fill={visual.textColor}
                    stroke={atomTextStroke(visual.textColor)}
                    strokeWidth={0.45}
                    paintOrder="stroke"
                    pointerEvents="none"
                  >
                    {chargeLabel}
                  </text>
                ) : null}
              </g>
            )
          })}
        </svg>
      )}

      {!compact && highlights.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {highlights.map((item) => (
            <span
              key={item.id}
              className="rounded-full border border-border bg-secondary/40 px-2 py-1 text-[10px] font-medium text-muted-foreground"
            >
              {overlayFormulaLabel(item.group)} · {item.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}
