"use client"

import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  Activity,
  Atom,
  BarChart3,
  Box,
  FlaskConical,
  Gem,
  Info,
  Layers,
  Palette,
  Radiation,
  Scale,
  Shield,
  Sparkles,
  Zap,
} from "lucide-react"
import type { ElementType, ReactNode } from "react"
import type { ElementRecord, OctetRuleCategory } from "@/lib/chemistry/database/types"
import {
  ALL_ELEMENTS,
  getElementPokedexProfile,
  getPropertyComparisonMetrics,
  getSuccessiveIonizationSeries,
  TRANSITION_METAL_COLOR_DISCLAIMER,
  type ElementProfileCompleteness,
  type IonizationEnergyPoint,
  type PokedexNumberValue,
  type PropertyComparisonMetric,
} from "@/lib/chemistry/database/periodic-table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const OCTET_LABELS: Record<OctetRuleCategory, string> = {
  "normal-octet": "Normal octet",
  "incomplete-octet": "Incomplete octet",
  "expanded-octet": "Expanded octet",
  "odd-electron": "Odd-electron species",
  "noble-gas-compounds": "Noble gas compounds",
}

const COMPLETENESS_LABELS: Record<ElementProfileCompleteness, string> = {
  complete: "Complete",
  partial: "Partial",
  "basic-only": "Basic only",
}

const COMPLETENESS_STYLES: Record<ElementProfileCompleteness, string> = {
  complete: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  partial: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  "basic-only": "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
}

const TABS = [
  { id: "overview", label: "Overview", icon: Atom },
  { id: "configuration", label: "Electron Configuration", icon: Box },
  { id: "properties", label: "Periodic Properties", icon: BarChart3 },
  { id: "ionization", label: "Ionization & Affinity", icon: Activity },
  { id: "compounds", label: "Oxidation & Compounds", icon: FlaskConical },
  { id: "natural", label: "Natural Form", icon: Gem },
  { id: "colors", label: "Colors / Transition Metal Chemistry", icon: Palette },
  { id: "nuclear", label: "Nuclear / Isotopes", icon: Radiation },
] as const

type TabId = (typeof TABS)[number]["id"]

interface ElementProfilePanelProps {
  element: ElementRecord
}

export function ElementProfilePanel({ element }: ElementProfilePanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview")
  const pokedex = useMemo(() => getElementPokedexProfile(element), [element])
  const ionizationSeries = useMemo(() => getSuccessiveIonizationSeries(element), [element])
  const comparisonMetrics = useMemo(
    () => getPropertyComparisonMetrics(element, ALL_ELEMENTS),
    [element],
  )

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <Card className="rounded-2xl border-primary/20 bg-primary/5">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-2xl">
                {element.name} <span className="font-mono text-primary">({element.symbol})</span>
              </CardTitle>
              <p className="mt-1 text-sm capitalize text-muted-foreground">
                {element.category.replace(/-/g, " ")} · Period {element.period}
                {element.group ? ` · Group ${element.group}` : ""} · {element.block}-block
              </p>
            </div>
            <div className="flex flex-wrap justify-end gap-2">
              <Badge variant="secondary" className="font-mono">
                Z = {element.atomicNumber}
              </Badge>
              <Badge className={cn("border", COMPLETENESS_STYLES[pokedex.completeness])}>
                {COMPLETENESS_LABELS[pokedex.completeness]}
              </Badge>
              {element.nuclear.isRadioactive && (
                <Badge variant="outline" className="border-rose-500/30 text-rose-600">
                  Radioactive
                </Badge>
              )}
              {element.nuclear.isSynthetic && (
                <Badge variant="outline" className="border-violet-500/30 text-violet-600">
                  Synthetic
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
        {pokedex.completeness !== "complete" && (
          <CardContent className="pt-0">
            <div className="rounded-xl border border-dashed border-border bg-background/60 px-4 py-3 text-sm text-muted-foreground">
              Some advanced data is not available yet for this element.
              {pokedex.missingFields.length > 0 && (
                <span className="ml-1">
                  Missing or approximate: {pokedex.missingFields.slice(0, 5).join(", ")}
                  {pokedex.missingFields.length > 5 ? "." : "."}
                </span>
              )}
            </div>
          </CardContent>
        )}
      </Card>

      <div className="overflow-x-auto">
        <div className="flex min-w-max gap-2 rounded-2xl border border-border bg-card/70 p-2">
          {TABS.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-all",
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {activeTab === "overview" && <OverviewSection element={element} pokedex={pokedex} />}
      {activeTab === "configuration" && <ConfigurationSection element={element} />}
      {activeTab === "properties" && (
        <PeriodicPropertiesSection element={element} pokedex={pokedex} metrics={comparisonMetrics} />
      )}
      {activeTab === "ionization" && (
        <IonizationAffinitySection
          element={element}
          ionizationPoints={ionizationSeries.points}
          ionizationNote={ionizationSeries.note}
          dataIncomplete={ionizationSeries.dataIncomplete}
          affinityMetric={comparisonMetrics.find((metric) => metric.key === "electronAffinity")}
          pokedex={pokedex}
        />
      )}
      {activeTab === "compounds" && <CompoundsSection element={element} />}
      {activeTab === "natural" && <NaturalFormSection element={element} pokedex={pokedex} />}
      {activeTab === "colors" && <ColorsSection element={element} colors={pokedex.transitionMetalColors} />}
      {activeTab === "nuclear" && <NuclearSection element={element} />}
    </motion.div>
  )
}

function OverviewSection({
  element,
  pokedex,
}: {
  element: ElementRecord
  pokedex: ReturnType<typeof getElementPokedexProfile>
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <ProfileCard icon={Atom} title="Identity" description="Core element facts">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
          <PropertyItem label="Name" value={element.name} />
          <PropertyItem label="Symbol" value={element.symbol} />
          <PropertyItem label="Atomic number" value={String(element.atomicNumber)} />
          <PropertyItem label="Atomic mass" value={`${element.atomicMass} u`} />
          <PropertyItem label="Category" value={element.category.replace(/-/g, " ")} />
          <PropertyItem label="State at room temp" value={pokedex.stateLabel} />
        </div>
      </ProfileCard>

      <ProfileCard icon={Scale} title="Physical Snapshot" description="Catalogued values where available">
        <div className="grid gap-2">
          <ValueItem label="Melting point" value={pokedex.meltingPoint} />
          <ValueItem label="Boiling point" value={pokedex.boilingPoint} />
          <ValueItem label="Density" value={pokedex.density} />
          <PropertyItem label="Natural form" value={element.naturalForm ?? "Not catalogued"} />
        </div>
      </ProfileCard>

      <ProfileCard icon={Sparkles} title="Teaching Notes" description="Fast context for learners">
        <div className="space-y-3">
          {element.notes.length > 0 ? (
            <ul className="space-y-2">
              {element.notes.map((note) => (
                <li key={note} className="text-sm leading-relaxed text-muted-foreground">
                  {note}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Standard periodic trends and bonding patterns apply for most introductory chemistry.
            </p>
          )}
          <div className="rounded-xl border border-border bg-secondary/20 px-3 py-2 text-xs text-muted-foreground">
            Approximate values are clearly labelled and should be used for trend intuition, not precision lookup.
          </div>
        </div>
      </ProfileCard>
    </div>
  )
}

function ConfigurationSection({ element }: { element: ElementRecord }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ProfileCard icon={Atom} title="Electron Configuration" description="Full and noble gas shorthand notation">
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-[10px] uppercase text-muted-foreground">Full notation</p>
            <p className="font-mono text-sm leading-relaxed">{element.electronConfiguration}</p>
          </div>
          {element.shorthandConfiguration &&
            element.shorthandConfiguration !== element.electronConfiguration && (
              <div>
                <p className="mb-1 text-[10px] uppercase text-muted-foreground">Noble gas shorthand</p>
                <p className="font-mono text-sm leading-relaxed">{element.shorthandConfiguration}</p>
              </div>
            )}
          <p className="pt-1 text-xs text-muted-foreground">
            Valence electrons: {element.valenceElectrons}
          </p>
        </div>
      </ProfileCard>

      <ProfileCard icon={Box} title="Orbital Box Diagram" description="Aufbau · Hund's rule · Pauli exclusion">
        <div className="space-y-2 overflow-x-auto">
          {element.orbitalDiagram.map((subshell) => (
            <div key={subshell.label} className="flex min-w-max items-center gap-2">
              <span className="w-8 shrink-0 font-mono text-xs text-muted-foreground">{subshell.label}</span>
              <div className="flex gap-1">
                {subshell.boxes.map((box, i) => (
                  <div
                    key={`${subshell.label}-${i}`}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded border border-border bg-secondary/30 font-mono text-sm",
                      box && "border-accent/40 bg-accent/5",
                    )}
                  >
                    {box || ""}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ProfileCard>
    </div>
  )
}

function PeriodicPropertiesSection({
  element,
  pokedex,
  metrics,
}: {
  element: ElementRecord
  pokedex: ReturnType<typeof getElementPokedexProfile>
  metrics: PropertyComparisonMetric[]
}) {
  return (
    <div className="space-y-4">
      <ProfileCard icon={Scale} title="Periodic Property Values" description="Clicked element values">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          <PropertyItem label="Atomic radius" value={formatNullable(element.atomicRadiusPm, "pm")} />
          <PropertyItem label="Electronegativity" value={formatNullable(element.electronegativity, "")} />
          <PropertyItem label="First ionization energy" value={formatNullable(element.ionizationEnergyKjMol, "kJ/mol")} />
          <ValueItem label="Electron affinity" value={pokedex.electronAffinity} />
          <ValueItem label="Melting point" value={pokedex.meltingPoint} />
          <ValueItem label="Boiling point" value={pokedex.boilingPoint} />
        </div>
      </ProfileCard>

      <div className="grid gap-4 lg:grid-cols-2">
        {metrics.map((metric) => (
          <ProfileCard key={metric.key} icon={BarChart3} title={metric.label} description="Neighbor comparison">
            <NeighborComparisonChart metric={metric} activeSymbol={element.symbol} />
          </ProfileCard>
        ))}
      </div>
    </div>
  )
}

function IonizationAffinitySection({
  element,
  ionizationPoints,
  ionizationNote,
  dataIncomplete,
  affinityMetric,
  pokedex,
}: {
  element: ElementRecord
  ionizationPoints: IonizationEnergyPoint[]
  ionizationNote: string
  dataIncomplete: boolean
  affinityMetric?: PropertyComparisonMetric
  pokedex: ReturnType<typeof getElementPokedexProfile>
}) {
  const jumpCount = ionizationPoints.filter((point) => point.largeJump).length

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
      <ProfileCard icon={Activity} title="Successive Ionization Energies" description="IE1, IE2, IE3 ... in kJ/mol">
        <IonizationEnergyChart points={ionizationPoints} />
        <div className="mt-4 space-y-2 text-sm text-muted-foreground">
          <p>{ionizationNote}</p>
          {dataIncomplete && (
            <p className="rounded-xl border border-dashed border-border bg-secondary/20 px-3 py-2">
              Data incomplete: available values and educational estimates are shown, not a full reference table.
            </p>
          )}
          <p>
            {jumpCount > 0
              ? "Highlighted jumps usually show the point where valence electrons are gone and removing a core electron requires much more energy."
              : "No large shell jump is visible in the currently displayed values."}
          </p>
        </div>
      </ProfileCard>

      <div className="space-y-4">
        <ProfileCard icon={Zap} title="Electron Affinity" description="Energy change when one electron is added">
          <div className="space-y-3">
            <ValueItem label="Electron affinity" value={pokedex.electronAffinity} />
            <p className="text-sm leading-relaxed text-muted-foreground">
              {pokedex.electronAffinityExplanation}
            </p>
          </div>
        </ProfileCard>

        {affinityMetric && (
          <ProfileCard icon={BarChart3} title="Nearby Affinity Comparison" description="Neighboring elements">
            <NeighborComparisonChart metric={affinityMetric} activeSymbol={element.symbol} compact />
          </ProfileCard>
        )}
      </div>
    </div>
  )
}

function CompoundsSection({ element }: { element: ElementRecord }) {
  const showOctetSection =
    element.octetRuleCategory !== "normal-octet" || element.octetRuleExamples.length > 0

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ProfileCard icon={Zap} title="Oxidation States" description="Common oxidation states and ions">
        <div className="space-y-3">
          <div>
            <p className="mb-2 text-[10px] uppercase text-muted-foreground">Oxidation states</p>
            {element.oxidationStates.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {element.oxidationStates.map((state) => (
                  <Badge key={state} variant="outline" className="font-mono">
                    {state > 0 ? `+${state}` : state}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No common oxidation states catalogued.</p>
            )}
          </div>
          <div>
            <p className="mb-2 text-[10px] uppercase text-muted-foreground">Common ions</p>
            {element.commonIons.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {element.commonIons.map((ion) => (
                  <Badge key={ion} variant="secondary" className="font-mono">
                    {ion}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No common monatomic ions.</p>
            )}
          </div>
        </div>
      </ProfileCard>

      <ProfileCard icon={FlaskConical} title="Example Compounds" description="Common compounds for study">
        {element.exampleCompounds.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {element.exampleCompounds.map((compound) => (
              <Badge key={compound} variant="secondary" className="font-mono">
                {compound}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Noble gases and synthetic elements may have limited introductory compound examples.
          </p>
        )}
      </ProfileCard>

      <ProfileCard
        icon={Shield}
        title="Octet Rule Category"
        description="Representative teaching examples"
        className={showOctetSection ? "lg:col-span-2" : undefined}
      >
        <div className="space-y-2">
          <Badge variant="outline">{OCTET_LABELS[element.octetRuleCategory]}</Badge>
          {element.octetRuleExamples.length > 0 ? (
            <ul className="space-y-1 pt-1">
              {element.octetRuleExamples.map((example) => (
                <li key={example} className="font-mono text-sm text-muted-foreground">
                  {example}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              Follows typical valence-shell patterns in most introductory examples.
            </p>
          )}
        </div>
      </ProfileCard>
    </div>
  )
}

function NaturalFormSection({
  element,
  pokedex,
}: {
  element: ElementRecord
  pokedex: ReturnType<typeof getElementPokedexProfile>
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ProfileCard icon={Gem} title="Natural Form / Allotropes" description="How the element is commonly encountered">
        <div className="space-y-3">
          <p className="text-lg font-semibold">{element.naturalForm ?? "Not catalogued"}</p>
          <PropertyItem label="State at room temperature" value={pokedex.stateLabel} />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Diatomic elements are shown as molecules, noble gases as monatomic gases, carbon with major allotropes,
            phosphorus and sulfur with common molecular allotropes, and metals as metallic lattices where appropriate.
          </p>
        </div>
      </ProfileCard>

      <ProfileCard icon={Info} title="Profile Notes" description="Data caveats and teaching context">
        {element.notes.length > 0 ? (
          <ul className="space-y-2">
            {element.notes.map((note) => (
              <li key={note} className="text-sm leading-relaxed text-muted-foreground">
                {note}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            No special caveats are catalogued for this element in the current educational profile.
          </p>
        )}
      </ProfileCard>
    </div>
  )
}

function ColorsSection({
  element,
  colors,
}: {
  element: ElementRecord
  colors: ReturnType<typeof getElementPokedexProfile>["transitionMetalColors"]
}) {
  if (colors.length === 0) {
    return (
      <Card className="rounded-2xl border-dashed">
        <CardContent className="flex items-start gap-3 p-5">
          <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Transition metal color data for {element.symbol} is not catalogued here. Color often depends on
            oxidation state, ligand identity, complex geometry, concentration, and lighting.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <ProfileCard icon={Palette} title="Transition Metal Colors" description="Ions and compounds in common teaching examples">
      <div className="grid gap-3 sm:grid-cols-2">
        {colors.map((entry) => (
          <div key={entry.species} className="rounded-xl border border-border bg-secondary/20 px-4 py-3">
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="font-mono font-medium">{entry.species}</span>
              <Badge variant="outline">{entry.color}</Badge>
            </div>
            {entry.wavelengthRange && <p className="text-xs text-muted-foreground">{entry.wavelengthRange}</p>}
            {entry.notes && <p className="mt-1 text-xs text-muted-foreground">{entry.notes}</p>}
          </div>
        ))}
      </div>
      <p className="mt-4 border-t border-border pt-3 text-xs leading-relaxed text-muted-foreground">
        {TRANSITION_METAL_COLOR_DISCLAIMER}
      </p>
    </ProfileCard>
  )
}

function NuclearSection({ element }: { element: ElementRecord }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <ProfileCard icon={Radiation} title="Radioactive / Synthetic Status" description="Educational nuclear context">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Badge variant={element.nuclear.isRadioactive ? "destructive" : "secondary"}>
              {element.nuclear.isRadioactive ? "Radioactive" : "No radioactive warning"}
            </Badge>
            <Badge variant={element.nuclear.isSynthetic ? "outline" : "secondary"}>
              {element.nuclear.isSynthetic ? "Synthetic / mostly synthetic" : "Naturally occurring or stable isotopes known"}
            </Badge>
          </div>
          <PropertyItem label="Most stable isotope" value={element.nuclear.mostStableIsotope ?? "Not highlighted"} />
          <PropertyItem label="Half-life" value={element.nuclear.halfLife ?? "Not applicable"} />
          <PropertyItem
            label="Decay mode"
            value={element.nuclear.decayModes.length ? element.nuclear.decayModes.join(", ") : "Not applicable"}
          />
        </div>
      </ProfileCard>

      <ProfileCard icon={Shield} title="Nuclear Data Note" description="Safety and interpretation">
        <p className="text-sm leading-relaxed text-muted-foreground">
          Nuclear data shown for educational purposes. Half-lives and decay modes depend on isotope, and many
          heavy or synthetic elements have limited bulk chemistry data because only small quantities are produced.
        </p>
      </ProfileCard>
    </div>
  )
}

function IonizationEnergyChart({ points }: { points: IonizationEnergyPoint[] }) {
  const max = Math.max(...points.map((point) => point.energy), 1)

  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-[520px] items-end gap-2 rounded-2xl border border-border bg-secondary/20 p-4">
        {points.map((point) => {
          const height = Math.max(16, (point.energy / max) * 190)
          return (
            <div key={point.step} className="flex flex-1 flex-col items-center gap-2">
              <div className="flex h-52 w-full items-end">
                <div
                  className={cn(
                    "w-full rounded-t-lg border transition-all",
                    point.largeJump
                      ? "border-rose-500/40 bg-rose-500/70"
                      : "border-teal-500/30 bg-teal-500/70",
                  )}
                  style={{ height }}
                  title={point.jumpExplanation}
                />
              </div>
              <div className="text-center">
                <p className="font-mono text-xs font-semibold">{point.label}</p>
                <p className="font-mono text-[10px] text-muted-foreground">{Math.round(point.energy)}</p>
                {point.source === "estimated" && <p className="text-[9px] text-muted-foreground">approx</p>}
              </div>
            </div>
          )
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">Units: kJ/mol. Red bars mark large jumps.</p>
    </div>
  )
}

function NeighborComparisonChart({
  metric,
  activeSymbol,
  compact = false,
}: {
  metric: PropertyComparisonMetric
  activeSymbol: string
  compact?: boolean
}) {
  const values = metric.values.filter((entry) => entry.value !== null)
  const raw = values.map((entry) => entry.value as number)
  const min = raw.length ? Math.min(...raw) : 0
  const max = raw.length ? Math.max(...raw) : 1
  const span = max - min || 1

  return (
    <div className="space-y-3">
      <div className={cn("space-y-2", compact && "text-sm")}>
        {metric.values.map((entry) => {
          const value = entry.value
          const percent = value === null ? 0 : ((value - min) / span) * 100
          const isActive = entry.element.symbol === activeSymbol
          return (
            <div key={entry.element.id} className="grid grid-cols-[3.5rem_1fr_5.5rem] items-center gap-2">
              <span className={cn("font-mono text-xs", isActive && "font-bold text-primary")}>
                {entry.element.symbol}
              </span>
              <div className="h-3 overflow-hidden rounded-full border border-border bg-secondary">
                <div
                  className={cn("h-full rounded-full", isActive ? "bg-primary" : "bg-teal-500/70")}
                  style={{ width: `${Math.max(value === null ? 0 : 8, percent)}%` }}
                />
              </div>
              <span className="text-right font-mono text-[11px] text-muted-foreground">
                {value === null ? "n/a" : formatNumber(value)}
                {entry.source === "estimated" ? " approx" : ""}
              </span>
            </div>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        {metric.label} {metric.unit ? `(${metric.unit})` : ""}
        {metric.note ? ` · ${metric.note}` : ""}
      </p>
    </div>
  )
}

function ProfileCard({
  icon: Icon,
  title,
  description,
  children,
  className,
}: {
  icon: ElementType
  title: string
  description?: string
  children: ReactNode
  className?: string
}) {
  return (
    <Card className={cn("h-full rounded-2xl border-border/50 bg-card/80 backdrop-blur-sm", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </div>
          {title}
        </CardTitle>
        {description && <p className="text-xs text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function PropertyItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/20 px-3 py-2">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className="font-mono text-sm capitalize">{value}</p>
    </div>
  )
}

function ValueItem({ label, value }: { label: string; value: PokedexNumberValue }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/20 px-3 py-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
        {value.source === "estimated" && <Badge variant="outline">approx</Badge>}
      </div>
      <p className="font-mono text-sm">{formatPokedexValue(value)}</p>
      {value.note && <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">{value.note}</p>}
    </div>
  )
}

function formatPokedexValue(value: PokedexNumberValue): string {
  if (value.value === null) return "Unavailable"
  if (value.unit === "") return formatNumber(value.value)
  return `${formatNumber(value.value)} ${value.unit}`
}

function formatNullable(value: number | null, unit: string): string {
  if (value === null) return "Unavailable"
  return unit ? `${formatNumber(value)} ${unit}` : formatNumber(value)
}

function formatNumber(value: number): string {
  if (Math.abs(value) < 1 && value !== 0) return value.toPrecision(2)
  if (Math.abs(value) < 10) return value.toFixed(2).replace(/\.?0+$/, "")
  return Math.round(value).toString()
}
