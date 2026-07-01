"use client"

import Link from "next/link"
import { useEffect, useMemo, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from "react"
import {
  ArrowRight,
  Atom,
  BookOpenCheck,
  Eye,
  MousePointer2,
  Network,
  RotateCcw,
  ScanSearch,
  Sparkles,
  ZoomIn,
  ZoomOut,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  buildExplorerSvgPrimitives,
  EXPLORER_COLORS,
  EXPLORER_LAYER_IDS,
  EXPLORER_LAYER_LABELS,
  elementColor,
  getExplorerExampleOptions,
  getMoleculeLearningCards,
  getMoleculeMetrics,
  inspectAtom,
  inspectBond,
  molecularExplorerHref,
  orderDescription,
  readableTextColor,
  resolveExplorerMolecule,
  summarizeElectronExplorer,
  type BondInspection,
  type ExplorerAtom,
  type ExplorerBond,
  type ExplorerLayerId,
  type ExplorerLearningCard,
  type ExplorerMolecule,
  type ExplorerReasoningNode,
  type ExplorerSvgPrimitive,
} from "@/lib/interactive-learning/molecular-explorer"
import { getMechanismBridgeHref } from "@/lib/interactive-learning/mechanisms"
import { scannerKnowledgeGraphHref } from "@/lib/knowledge-graph/knowledge-engine"

interface MolecularExplorerClientProps {
  initialCompound?: string
  initialGraph?: string
}

type SelectedTarget = { type: "atom"; id: string } | { type: "bond"; id: string } | null

const defaultLayers = new Set<ExplorerLayerId>([
  "atom-labels",
  "bond-order",
  "sigma-framework",
  "pi-framework",
  "lone-pairs",
  "hybridization",
  "aromatic-atoms",
  "delocalized-electrons",
  "ring-system",
  "functional-groups",
])

export function MolecularExplorerClient({ initialCompound, initialGraph }: MolecularExplorerClientProps) {
  const [compoundId, setCompoundId] = useState(initialCompound ?? "benzene")
  const [graphParam, setGraphParam] = useState(initialGraph)
  const [selected, setSelected] = useState<SelectedTarget>(null)
  const [layers, setLayers] = useState(defaultLayers)
  const [scale, setScale] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [dragStart, setDragStart] = useState<{ x: number; y: number; offsetX: number; offsetY: number } | null>(null)

  const molecule = useMemo(
    () => resolveExplorerMolecule({ compound: compoundId, graph: graphParam }),
    [compoundId, graphParam],
  )
  const primitives = useMemo(() => buildExplorerSvgPrimitives(molecule, layers), [layers, molecule])
  const metrics = useMemo(() => getMoleculeMetrics(molecule), [molecule])
  const electronSummary = useMemo(() => summarizeElectronExplorer(molecule), [molecule])
  const moleculeCards = useMemo(() => getMoleculeLearningCards(molecule), [molecule])
  const examples = useMemo(() => getExplorerExampleOptions(), [])
  const selectedAtomInspection = useMemo(
    () => selected?.type === "atom" ? inspectAtom(molecule, selected.id) : inspectAtom(molecule, molecule.atoms[0]?.id),
    [molecule, selected],
  )
  const selectedBondInspection = useMemo(
    () => selected?.type === "bond" ? inspectBond(molecule, selected.id) : null,
    [molecule, selected],
  )

  useEffect(() => {
    setCompoundId(initialCompound ?? "benzene")
    setGraphParam(initialGraph)
  }, [initialCompound, initialGraph])

  useEffect(() => {
    setSelected(molecule.atoms[0] ? { type: "atom", id: molecule.atoms[0].id } : null)
  }, [molecule.id])

  function toggleLayer(layer: ExplorerLayerId) {
    setLayers((current) => {
      const next = new Set(current)
      if (next.has(layer)) next.delete(layer)
      else next.add(layer)
      return next
    })
  }

  function resetView() {
    setScale(1)
    setOffset({ x: 0, y: 0 })
  }

  function handleWheel(event: WheelEvent<SVGSVGElement>) {
    event.preventDefault()
    setScale((current) => Math.min(2.4, Math.max(0.55, current + (event.deltaY < 0 ? 0.08 : -0.08))))
  }

  function handlePointerDown(event: PointerEvent<SVGSVGElement>) {
    if (event.button !== 0) return
    setDragStart({ x: event.clientX, y: event.clientY, offsetX: offset.x, offsetY: offset.y })
  }

  function handlePointerMove(event: PointerEvent<SVGSVGElement>) {
    if (!dragStart) return
    setOffset({
      x: dragStart.offsetX + (event.clientX - dragStart.x) / scale,
      y: dragStart.offsetY + (event.clientY - dragStart.y) / scale,
    })
  }

  function handlePointerUp() {
    setDragStart(null)
  }

  function chooseExample(id: string) {
    setGraphParam(undefined)
    setCompoundId(id)
    window.history.replaceState(null, "", molecularExplorerHref({ compound: id }))
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="mb-8 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <Badge className="rounded-full">ARSHLAB v10.0.0</Badge>
              <Badge variant="outline" className="rounded-full">SVG only</Badge>
              <Badge variant="outline" className="rounded-full">Database mode = no AI usage</Badge>
              {molecule.source === "scanner-graph" && <Badge variant="outline" className="rounded-full">Scanner graph input</Badge>}
            </div>
            <h1 className="text-3xl font-bold tracking-tight sm:text-5xl">Interactive Molecular Explorer</h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground">
              Click atoms and bonds to inspect hybridization, formal charge, sigma and pi bonding, lone pairs,
              aromaticity, functional groups, electron domains, conceptual HOMO/LUMO contribution, and the
              deterministic reasoning behind each label.
            </p>
          </div>
          <Card className="rounded-2xl border-teal-500/20 bg-teal-500/5">
            <CardContent className="grid grid-cols-2 gap-3 p-5">
              <Metric label="Atoms" value={String(metrics.atomCount)} />
              <Metric label="Bonds" value={String(metrics.bondCount)} />
              <Metric label="Functional groups" value={String(metrics.functionalGroupCount)} />
              <Metric label="Aromatic rings" value={String(metrics.aromaticRingCount)} />
            </CardContent>
          </Card>
        </section>

        <div className="grid gap-6 xl:grid-cols-[290px_minmax(0,1fr)_360px]">
          <aside className="space-y-4">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Atom className="h-5 w-5" />
                  Example Library
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <label className="block text-sm font-medium">
                  Molecule
                  <select
                    value={molecule.source === "scanner-graph" ? "scanner-graph" : molecule.id}
                    onChange={(event) => chooseExample(event.target.value)}
                    className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm"
                    aria-label="Choose molecular explorer example"
                  >
                    {molecule.source === "scanner-graph" && <option value="scanner-graph">Scanner Graph</option>}
                    {examples.map((example) => (
                      <option key={example.id} value={example.id}>
                        {example.name} ({example.formula})
                      </option>
                    ))}
                  </select>
                </label>
                <div className="rounded-xl border border-border bg-secondary/30 p-3">
                  <p className="font-semibold">{molecule.name}</p>
                  <p className="text-sm text-muted-foreground">{molecule.formula}</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{molecule.notes}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Eye className="h-5 w-5" />
                  Overlay Layers
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                {EXPLORER_LAYER_IDS.map((layer) => (
                  <label key={layer} className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm">
                    <span>{EXPLORER_LAYER_LABELS[layer]}</span>
                    <input
                      type="checkbox"
                      checked={layers.has(layer)}
                      onChange={() => toggleLayer(layer)}
                      className="h-4 w-4 accent-teal-600"
                    />
                  </label>
                ))}
              </CardContent>
            </Card>

            <ColorLegend />
          </aside>

          <main className="space-y-4">
            <Card className="rounded-2xl overflow-hidden">
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MousePointer2 className="h-5 w-5" />
                    Molecular Canvas
                  </CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">Hover or click atoms and bonds. Drag to pan, scroll to zoom.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => setScale((value) => Math.min(2.4, value + 0.15))}>
                    <ZoomIn className="h-4 w-4" />
                    Zoom
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={() => setScale((value) => Math.max(0.55, value - 0.15))}>
                    <ZoomOut className="h-4 w-4" />
                    Out
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="rounded-xl" onClick={resetView}>
                    <RotateCcw className="h-4 w-4" />
                    Reset
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <svg
                  viewBox="0 0 560 380"
                  className="h-[460px] w-full touch-none bg-[radial-gradient(circle_at_top_left,_rgba(20,184,166,0.08),_transparent_35%),linear-gradient(180deg,_hsl(var(--card)),_hsl(var(--background)))]"
                  role="img"
                  aria-label={`${molecule.name} interactive molecular explorer canvas`}
                  onWheel={handleWheel}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                >
                  <defs>
                    <filter id="soft-glow" x="-40%" y="-40%" width="180%" height="180%">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>
                  <g transform={`translate(${offset.x} ${offset.y}) scale(${scale})`}>
                    {primitives.filter((primitive) => ["ring", "domain", "electron", "orbital", "functional-group"].includes(primitive.type)).map((primitive) => (
                      <OverlayPrimitive key={primitive.id} primitive={primitive} />
                    ))}
                    {molecule.bonds.map((bond) => (
                      <BondGlyph
                        key={bond.id}
                        molecule={molecule}
                        bond={bond}
                        selected={selected?.type === "bond" && selected.id === bond.id}
                        onSelect={() => setSelected({ type: "bond", id: bond.id })}
                      />
                    ))}
                    {molecule.atoms.map((atom) => (
                      <AtomGlyph
                        key={atom.id}
                        atom={atom}
                        selected={selected?.type === "atom" && selected.id === atom.id}
                        showLabel={layers.has("atom-labels")}
                        onSelect={() => setSelected({ type: "atom", id: atom.id })}
                      />
                    ))}
                    {primitives.filter((primitive) => primitive.type === "bond-label" && layers.has("bond-order")).map((primitive) => (
                      <text key={primitive.id} x={primitive.x} y={primitive.y} textAnchor="middle" className="fill-muted-foreground text-[10px] font-semibold">
                        {primitive.label}
                      </text>
                    ))}
                  </g>
                </svg>
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-3">
              <MetricCard title="Electron Explorer" items={[
                `${electronSummary.sigmaElectrons} sigma electrons`,
                `${electronSummary.piElectrons} pi electrons`,
                `${electronSummary.lonePairElectrons} lone-pair electrons`,
              ]} />
              <MetricCard title="Orbital Overlay" items={[
                `${metrics.sigmaBondCount} sigma bond components`,
                `${metrics.piBondCount} pi bond components`,
                `${metrics.aromaticRingCount} aromatic ring(s)`,
              ]} />
              <MetricCard title="Interaction" items={[
                "Atoms and bonds are keyboard selectable",
                "Reduced-motion friendly SVG layers",
                "No images, canvas, or AI calls",
              ]} />
            </div>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle className="text-lg">Teaching Cards</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-2">
                {moleculeCards.map((card) => (
                  <LearningCard key={card.id} card={card} />
                ))}
              </CardContent>
            </Card>
          </main>

          <aside className="space-y-4">
            <InspectorPanel
              molecule={molecule}
              atomInspection={selectedAtomInspection}
              bondInspection={selectedBondInspection}
            />
            <FunctionalGroupPanel molecule={molecule} />
            <Card className="rounded-2xl border-primary/20 bg-primary/5">
              <CardContent className="space-y-3 p-4">
                <p className="flex items-center gap-2 font-semibold">
                  <ScanSearch className="h-4 w-4" />
                  Scanner bridge
                </p>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Scanner results can open this page with the detected compound or a serialized deterministic graph.
                </p>
                <Button asChild variant="outline" className="w-full justify-between rounded-xl">
                  <Link href="/structure-scanner">
                    Open Structure Scanner
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-between rounded-xl">
                  <Link href={getMechanismBridgeHref(molecule.id)}>
                    Explore Possible Mechanisms
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full justify-between rounded-xl">
                  <Link href={scannerKnowledgeGraphHref(molecule.id)}>
                    Open Knowledge Graph
                    <Network className="h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </aside>
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/80 p-3">
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function MetricCard({ title, items }: { title: string; items: string[] }) {
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-4">
        <p className="font-semibold">{title}</p>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {items.map((item) => <li key={item}>- {item}</li>)}
        </ul>
      </CardContent>
    </Card>
  )
}

function ColorLegend() {
  const items = [
    ["sp", EXPLORER_COLORS.sp],
    ["sp2", EXPLORER_COLORS.sp2],
    ["sp3", EXPLORER_COLORS.sp3],
    ["aromatic", EXPLORER_COLORS.aromatic],
    ["conjugated", EXPLORER_COLORS.conjugated],
    ["formal charge", EXPLORER_COLORS.formalCharge],
    ["lone pair", EXPLORER_COLORS.lonePair],
    ["HOMO", EXPLORER_COLORS.homo],
    ["LUMO", EXPLORER_COLORS.lumo],
  ]
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg">Accessible Legend</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2">
        {items.map(([label, color]) => (
          <div key={label} className="flex items-center gap-3 text-sm">
            <span className="h-4 w-4 rounded-full border border-border" style={{ backgroundColor: color }} />
            <span>{label}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function OverlayPrimitive({ primitive }: { primitive: ExplorerSvgPrimitive }) {
  if (primitive.type === "ring" || primitive.type === "domain" || primitive.type === "electron" || primitive.type === "orbital") {
    return (
      <g aria-hidden="true">
        <circle
          cx={primitive.x}
          cy={primitive.y}
          r={primitive.radius ?? 10}
          fill={primitive.type === "ring" || primitive.type === "domain" ? "none" : primitive.color}
          stroke={primitive.color}
          strokeWidth={primitive.strokeWidth ?? 2}
          strokeDasharray={primitive.dash}
          opacity={primitive.opacity ?? 0.5}
          filter={primitive.type === "orbital" ? "url(#soft-glow)" : undefined}
        />
        {primitive.label && primitive.type !== "ring" && (
          <text x={primitive.x} y={primitive.y + 4} textAnchor="middle" className="fill-foreground text-[9px] font-semibold">
            {primitive.label}
          </text>
        )}
      </g>
    )
  }
  if (primitive.type === "functional-group") {
    return (
      <g aria-hidden="true">
        <rect x={primitive.x - 44} y={primitive.y - 13} width="88" height="24" rx="10" fill={primitive.color} opacity="0.9" />
        <text x={primitive.x} y={primitive.y + 4} textAnchor="middle" className="fill-white text-[10px] font-bold">
          {primitive.label}
        </text>
      </g>
    )
  }
  return null
}

function AtomGlyph({
  atom,
  selected,
  showLabel,
  onSelect,
}: {
  atom: ExplorerAtom
  selected: boolean
  showLabel: boolean
  onSelect: () => void
}) {
  const radius = atom.element === "H" ? 16 : atom.element.length > 1 ? 23 : 21
  const fillColor = atom.aromatic ? EXPLORER_COLORS.aromatic : elementColor(atom.element)
  function onKeyDown(event: KeyboardEvent<SVGGElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onSelect()
    }
  }
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${atom.element} atom ${atom.id}, ${atom.hybridization} hybridization`}
      onClick={(event) => {
        event.stopPropagation()
        onSelect()
      }}
      onKeyDown={onKeyDown}
      className="cursor-pointer outline-none"
    >
      <circle
        cx={atom.x}
        cy={atom.y}
        r={radius}
        fill={fillColor}
        stroke={selected ? "#14b8a6" : atom.conjugated ? EXPLORER_COLORS.conjugated : "#ffffff"}
        strokeWidth={selected ? 5 : atom.conjugated ? 4 : 2}
      />
      <circle cx={atom.x} cy={atom.y} r={radius - 2} fill={fillColor} opacity="0.95" />
      {showLabel && (
        <text
          x={atom.x}
          y={atom.y + 5}
          textAnchor="middle"
          className="pointer-events-none text-sm font-black"
          style={{ fill: atom.aromatic ? "#111827" : readableTextColor(atom.element) }}
        >
          {atom.element}
        </text>
      )}
      <title>{`${atom.element} atom - ${atom.hybridization}, ${atom.geometry}, confidence ${Math.round(atom.confidence)}%`}</title>
    </g>
  )
}

function BondGlyph({
  molecule,
  bond,
  selected,
  onSelect,
}: {
  molecule: ExplorerMolecule
  bond: ExplorerBond
  selected: boolean
  onSelect: () => void
}) {
  const from = molecule.atoms.find((atom) => atom.id === bond.from)
  const to = molecule.atoms.find((atom) => atom.id === bond.to)
  if (!from || !to) return null
  const dx = to.x - from.x
  const dy = to.y - from.y
  const length = Math.max(1, Math.hypot(dx, dy))
  const offset = (distance: number) => ({ x: (-dy / length) * distance, y: (dx / length) * distance })
  const offsets = bond.order === 3 ? [-7, 0, 7] : bond.order === 2 ? [-4, 4] : [0]
  const color = bond.aromatic ? EXPLORER_COLORS.aromatic : bond.piBonds ? EXPLORER_COLORS.pi : EXPLORER_COLORS.sigma

  function onKeyDown(event: KeyboardEvent<SVGGElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onSelect()
    }
  }

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`${orderDescription(bond.order)} bond ${bond.id}`}
      onClick={(event) => {
        event.stopPropagation()
        onSelect()
      }}
      onKeyDown={onKeyDown}
      className="cursor-pointer outline-none"
    >
      <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="transparent" strokeWidth="26" />
      {offsets.map((distance, index) => {
        const point = offset(distance)
        return (
          <line
            key={`${bond.id}-${index}`}
            x1={from.x + point.x}
            y1={from.y + point.y}
            x2={to.x + point.x}
            y2={to.y + point.y}
            stroke={selected ? "#14b8a6" : color}
            strokeWidth={selected ? 7 : bond.aromatic ? 5 : 4}
            strokeLinecap="round"
            strokeDasharray={bond.aromatic ? "10 7" : undefined}
            opacity={bond.confidence / 100}
          />
        )
      })}
      <title>{`${orderDescription(bond.order)} bond - ${bond.orbitalOverlap}`}</title>
    </g>
  )
}

function InspectorPanel({
  molecule,
  atomInspection,
  bondInspection,
}: {
  molecule: ExplorerMolecule
  atomInspection: ReturnType<typeof inspectAtom>
  bondInspection: BondInspection | null
}) {
  if (bondInspection) {
    const { bond, atoms, reasoning, cards } = bondInspection
    return (
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg">Bond Inspector</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <Info label="Atoms" value={`${atoms[0].element}${atoms[0].id} - ${atoms[1].element}${atoms[1].id}`} />
            <Info label="Order" value={String(bond.order)} />
            <Info label="Sigma / pi" value={`${bond.sigmaBonds} / ${bond.piBonds}`} />
            <Info label="Rotatable" value={bond.rotatable ? "Yes" : "No"} />
            <Info label="Aromatic" value={bond.aromatic ? "Yes" : "No"} />
            <Info label="Confidence" value={`${Math.round(bond.confidence)}%`} />
          </div>
          <ReasoningTree nodes={reasoning} />
          <div className="space-y-2">
            {cards.map((card) => <LearningCard key={card.id} card={card} />)}
          </div>
        </CardContent>
      </Card>
    )
  }

  const { atom, elementInfo, connectedBonds, reasoning, cards } = atomInspection
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg">Atom Inspector</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <Info label="Element" value={elementInfo.name} />
          <Info label="Atomic number" value={String(elementInfo.atomicNumber)} />
          <Info label="Atomic mass" value={elementInfo.atomicMass ? `${elementInfo.atomicMass}` : "Unknown"} />
          <Info label="Valence e-" value={String(atom.valenceElectrons)} />
          <Info label="Formal charge" value={String(atom.formalCharge)} />
          <Info label="Hybridization" value={atom.hybridization} />
          <Info label="Domains" value={String(atom.electronDomains)} />
          <Info label="Geometry" value={atom.geometry} />
          <Info label="Bonds" value={String(connectedBonds.length)} />
          <Info label="Sigma / pi" value={`${atom.sigmaBonds} / ${atom.piBonds}`} />
          <Info label="Lone pairs" value={String(atom.lonePairs)} />
          <Info label="Unpaired e-" value={String(atom.unpairedElectrons)} />
          <Info label="Conjugated" value={atom.conjugated ? "Yes" : "No"} />
          <Info label="Aromatic" value={atom.aromatic ? "Yes" : "No"} />
          <Info label="HOMO / LUMO" value={`${atom.homoContribution}% / ${atom.lumoContribution}%`} />
          <Info label="Electronegativity" value={atom.electronegativity ? `${atom.electronegativity}` : "Unavailable"} />
        </div>
        <ReasoningTree nodes={reasoning} />
        <div className="space-y-2">
          {cards.map((card) => <LearningCard key={card.id} card={card} />)}
        </div>
        <p className="rounded-xl border border-border bg-secondary/30 p-3 text-sm text-muted-foreground">
          Molecule context: {molecule.name} ({molecule.formula})
        </p>
      </CardContent>
    </Card>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/80 p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm font-semibold">{value}</p>
    </div>
  )
}

function ReasoningTree({ nodes }: { nodes: ExplorerReasoningNode[] }) {
  return (
    <div className="rounded-xl border border-border bg-background/80 p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <Sparkles className="h-4 w-4" />
        Reasoning Tree
      </p>
      <ul className="space-y-2 text-sm">
        {nodes.map((node) => (
          <li key={node.id} className="rounded-lg border border-border/70 p-2">
            <span className={node.status === "pass" ? "text-teal-600" : node.status === "warning" ? "text-amber-600" : "text-muted-foreground"}>
              {node.status === "pass" ? "Pass: " : node.status === "warning" ? "Check: " : "Info: "}
            </span>
            {node.title}
          </li>
        ))}
      </ul>
    </div>
  )
}

function LearningCard({ card }: { card: ExplorerLearningCard }) {
  return (
    <div className="rounded-xl border border-border bg-background/80 p-3">
      <p className="flex items-center gap-2 text-sm font-semibold">
        <BookOpenCheck className="h-4 w-4" />
        {card.title}
      </p>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{card.body}</p>
    </div>
  )
}

function FunctionalGroupPanel({ molecule }: { molecule: ExplorerMolecule }) {
  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-lg">Functional Group Explorer</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {molecule.functionalGroups.length ? (
          molecule.functionalGroups.map((group) => (
            <div key={group.id} className="rounded-xl border border-border bg-background/80 p-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{group.name}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{group.definition}</p>
                </div>
                <Badge variant="outline" className="rounded-full">{group.atomIds.length} atoms</Badge>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">{group.hybridization}</p>
              {group.commonReactions.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {group.commonReactions.map((reaction) => (
                    <Badge key={reaction} variant="secondary" className="rounded-full">{reaction}</Badge>
                  ))}
                </div>
              )}
            </div>
          ))
        ) : (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            No named functional group is attached to this deterministic example yet.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
