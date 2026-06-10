"use client"

import { useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { motion } from "framer-motion"
import {
  Activity,
  Atom,
  Eye,
  Gauge,
  Info,
  Move3D,
  Sparkles,
  Target,
  Waves,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BondEnergyGraph } from "@/components/BondEnergyGraph"
import {
  calculateMorsePotential,
  classifyInteractionRegime,
  createEducationalBondPreset,
  getBondOrderLabel,
  getForceExplanation,
  getInteractionLabel,
  getOverlapExplanation,
  getOverlapLabel,
  isLikelyStableBond,
  listBondPresets,
  SUPPORTED_BOND_ATOMS,
  type BondInteractionType,
  type BondPreset,
  type BondVisualizationMode,
  type OrbitalOverlapType,
} from "@/lib/chemistry/database/bonding"
import {
  DEFAULT_BONDING_VIEWER_SETTINGS,
  type BondingViewerSettings,
} from "@/components/BondingExplorer3D"
import { cn } from "@/lib/utils"

const BondingExplorer3D = dynamic(
  () => import("@/components/BondingExplorer3D").then((mod) => mod.BondingExplorer3D),
  {
    ssr: false,
    loading: () => (
      <div className="flex aspect-[4/3] min-h-[340px] items-center justify-center rounded-2xl border border-border bg-secondary/30 lg:aspect-square">
        <p className="text-sm text-muted-foreground">Loading bonding viewer...</p>
      </div>
    ),
  },
)

const interactionOptions: { value: BondInteractionType; label: string }[] = [
  { value: "sigma", label: "Sigma overlap" },
  { value: "pi", label: "Pi overlap" },
  { value: "nonbonding", label: "Nonbonding interaction" },
  { value: "repulsive", label: "Repulsive-only noble gas interaction" },
]

const overlapOptions: { value: OrbitalOverlapType; label: string }[] = [
  { value: "s-s", label: "s-s" },
  { value: "s-p", label: "s-p" },
  { value: "p-p-sigma", label: "p-p sigma" },
  { value: "p-p-pi", label: "p-p pi" },
]

const visualizationOptions: { value: BondVisualizationMode; label: string }[] = [
  { value: "electron-cloud", label: "Electron cloud" },
  { value: "space-filling", label: "Space filling" },
  { value: "orbital-lobes", label: "Orbital lobes" },
  { value: "simple-spheres", label: "Simple spheres" },
]

const toggleOptions: { key: keyof BondingViewerSettings; label: string }[] = [
  { key: "showNuclei", label: "Show nuclei" },
  { key: "showElectronClouds", label: "Show electron clouds" },
  { key: "showOrbitalLobes", label: "Show orbital lobes" },
  { key: "showOverlapRegion", label: "Show overlap region" },
  { key: "showForceArrows", label: "Show force arrows" },
  { key: "showBondLengthMarker", label: "Show bond length marker" },
  { key: "showLabels", label: "Show labels" },
]

const explanationCards = [
  {
    title: "Why Bonds Form",
    body: "Bonding becomes favorable when nuclei are attracted to shared electron density between atoms.",
    icon: Sparkles,
  },
  {
    title: "Short-Range Repulsion",
    body: "If atoms get too close, nucleus-nucleus and electron-electron repulsions push the energy sharply upward.",
    icon: Zap,
  },
  {
    title: "Bond Length",
    body: "The stable bond length is the internuclear distance at the minimum of the potential energy curve.",
    icon: Target,
  },
  {
    title: "Bond Energy",
    body: "Bond energy corresponds to the depth of the energy well: deeper wells are harder bonds to break.",
    icon: Gauge,
  },
  {
    title: "Sigma vs Pi",
    body: "Sigma overlap is head-on along the bond axis. Pi overlap is side-on above and below the axis.",
    icon: Waves,
  },
  {
    title: "Noble Gases",
    body: "Filled valence shells make strong covalent overlap unfavorable, so noble gas interactions are weak.",
    icon: Atom,
  },
]

const presets = listBondPresets()

function formatDistance(distance: number): string {
  return `${distance.toFixed(2)} A`
}

function formatEnergy(energy: number): string {
  if (Math.abs(energy) < 1) return `${energy.toFixed(2)} kJ/mol`
  if (Math.abs(energy) < 10) return `${energy.toFixed(1)} kJ/mol`
  return `${Math.round(energy)} kJ/mol`
}

function getRegimeTone(regime: ReturnType<typeof classifyInteractionRegime>): string {
  if (regime === "attractive") return "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300"
  if (regime === "repulsive") return "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300"
  return "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300"
}

function applyControlPreset(
  preset: BondPreset,
  setLeftAtom: (value: string) => void,
  setRightAtom: (value: string) => void,
  setInteractionType: (value: BondInteractionType) => void,
  setOverlapType: (value: OrbitalOverlapType) => void,
  setDistance: (value: number) => void,
) {
  setLeftAtom(preset.atoms[0])
  setRightAtom(preset.atoms[1])
  setInteractionType(preset.bondType)
  setOverlapType(preset.overlapType)
  setDistance(preset.equilibriumDistance)
}

export default function BondingExplorerPage() {
  const initialPreset = presets[0]
  const [leftAtom, setLeftAtom] = useState(initialPreset.atoms[0])
  const [rightAtom, setRightAtom] = useState(initialPreset.atoms[1])
  const [selectedPresetId, setSelectedPresetId] = useState(initialPreset.id)
  const [interactionType, setInteractionType] = useState<BondInteractionType>(initialPreset.bondType)
  const [overlapType, setOverlapType] = useState<OrbitalOverlapType>(initialPreset.overlapType)
  const [distance, setDistance] = useState(initialPreset.equilibriumDistance)
  const [settings, setSettings] = useState<BondingViewerSettings>(DEFAULT_BONDING_VIEWER_SETTINGS)
  const [showPotentialCurve, setShowPotentialCurve] = useState(true)
  const [showEducation, setShowEducation] = useState(true)

  const activePreset = useMemo(
    () =>
      createEducationalBondPreset(leftAtom, rightAtom, {
        bondType: interactionType,
        overlapType,
      }),
    [leftAtom, rightAtom, interactionType, overlapType],
  )

  const currentEnergy = calculateMorsePotential(distance, activePreset)
  const regime = classifyInteractionRegime(distance, activePreset.equilibriumDistance)
  const stable = isLikelyStableBond(activePreset, distance)
  const forceExplanation = getForceExplanation(regime)
  const overlapExplanation = getOverlapExplanation(interactionType, overlapType)

  const handlePresetSelect = (preset: BondPreset) => {
    setSelectedPresetId(preset.id)
    applyControlPreset(preset, setLeftAtom, setRightAtom, setInteractionType, setOverlapType, setDistance)
  }

  const handleAtomChange = (side: "left" | "right", value: string) => {
    setSelectedPresetId("custom")
    if (side === "left") setLeftAtom(value)
    if (side === "right") setRightAtom(value)
  }

  const handleInteractionChange = (value: BondInteractionType) => {
    setSelectedPresetId("custom")
    setInteractionType(value)
    if (value === "pi") setOverlapType("p-p-pi")
    if (value === "sigma" && overlapType === "p-p-pi") setOverlapType("p-p-sigma")
  }

  const updateSetting = (key: keyof BondingViewerSettings, value: boolean | BondVisualizationMode) => {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Waves className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Bonding Explorer</h1>
              <p className="text-muted-foreground">Bond energy, orbital overlap, and force balance</p>
            </div>
          </div>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-muted-foreground">
            Move atoms together and watch bonding become physical: attraction lowers energy, repulsion raises it,
            and stable bonds sit at the bottom of the potential well.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)_360px]">
          <motion.aside initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <Card className="rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Move3D className="h-5 w-5" />
                  Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <label className="space-y-1.5 text-sm">
                    <span className="font-medium">Left atom</span>
                    <select
                      value={leftAtom}
                      onChange={(event) => handleAtomChange("left", event.target.value)}
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                    >
                      {SUPPORTED_BOND_ATOMS.map((atom) => (
                        <option key={atom} value={atom}>
                          {atom}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1.5 text-sm">
                    <span className="font-medium">Right atom</span>
                    <select
                      value={rightAtom}
                      onChange={(event) => handleAtomChange("right", event.target.value)}
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                    >
                      {SUPPORTED_BOND_ATOMS.map((atom) => (
                        <option key={atom} value={atom}>
                          {atom}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <label className="space-y-1.5 text-sm">
                  <span className="font-medium">Bond / interaction type</span>
                  <select
                    value={interactionType}
                    onChange={(event) => handleInteractionChange(event.target.value as BondInteractionType)}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  >
                    {interactionOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5 text-sm">
                  <span className="font-medium">Orbital overlap type</span>
                  <select
                    value={overlapType}
                    onChange={(event) => {
                      setSelectedPresetId("custom")
                      setOverlapType(event.target.value as OrbitalOverlapType)
                    }}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  >
                    {overlapOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-2 text-sm">
                  <span className="flex items-center justify-between font-medium">
                    Internuclear distance
                    <span className="font-mono text-xs text-muted-foreground">{formatDistance(distance)}</span>
                  </span>
                  <input
                    type="range"
                    min={0.3}
                    max={5}
                    step={0.01}
                    value={distance}
                    onChange={(event) => setDistance(Number(event.target.value))}
                    className="w-full accent-teal-500"
                  />
                  <div className="flex justify-between text-[11px] text-muted-foreground">
                    <span>0.30 A</span>
                    <span>5.00 A</span>
                  </div>
                </label>

                <label className="space-y-1.5 text-sm">
                  <span className="font-medium">Visualization mode</span>
                  <select
                    value={settings.visualizationMode}
                    onChange={(event) => updateSetting("visualizationMode", event.target.value as BondVisualizationMode)}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  >
                    {visualizationOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="space-y-2">
                  {toggleOptions.map((option) => (
                    <label
                      key={option.key}
                      className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-secondary/20 px-3 py-2 text-sm"
                    >
                      <span>{option.label}</span>
                      <input
                        type="checkbox"
                        checked={Boolean(settings[option.key])}
                        onChange={(event) => updateSetting(option.key, event.target.checked)}
                        className="h-4 w-4 accent-teal-500"
                      />
                    </label>
                  ))}
                  <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-secondary/20 px-3 py-2 text-sm">
                    <span>Show potential energy curve</span>
                    <input
                      type="checkbox"
                      checked={showPotentialCurve}
                      onChange={(event) => setShowPotentialCurve(event.target.checked)}
                      className="h-4 w-4 accent-teal-500"
                    />
                  </label>
                  <label className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-secondary/20 px-3 py-2 text-sm">
                    <span>Show educational explanation</span>
                    <input
                      type="checkbox"
                      checked={showEducation}
                      onChange={(event) => setShowEducation(event.target.checked)}
                      className="h-4 w-4 accent-teal-500"
                    />
                  </label>
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Quick Examples</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                {presets.map((preset) => (
                  <Button
                    key={preset.id}
                    variant={selectedPresetId === preset.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => handlePresetSelect(preset)}
                    className="justify-start rounded-lg"
                  >
                    {preset.label}
                  </Button>
                ))}
              </CardContent>
            </Card>
          </motion.aside>

          <motion.main initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <BondingExplorer3D
              preset={activePreset}
              distance={distance}
              interactionType={interactionType}
              overlapType={overlapType}
              settings={settings}
            />

            <Card className="rounded-2xl border-dashed">
              <CardContent className="flex gap-3 p-4">
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <p className="text-sm leading-relaxed text-muted-foreground">
                  This is a simplified educational model. The graphs and orbital surfaces are conceptual
                  approximations designed to explain bonding, not quantum-chemistry calculations.
                </p>
              </CardContent>
            </Card>

            {showEducation && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
              >
                {explanationCards.map((card) => {
                  const Icon = card.icon
                  return (
                    <Card key={card.title} className="rounded-2xl">
                      <CardContent className="p-4">
                        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                          <Icon className="h-4 w-4" />
                        </div>
                        <h3 className="font-semibold">{card.title}</h3>
                        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{card.body}</p>
                      </CardContent>
                    </Card>
                  )
                })}
              </motion.div>
            )}
          </motion.main>

          <motion.aside initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <Card className="rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Activity className="h-5 w-5" />
                  Potential Energy
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BondEnergyGraph
                  preset={activePreset}
                  currentDistance={distance}
                  showCurve={showPotentialCurve}
                  className="h-[260px] w-full"
                />
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Eye className="h-5 w-5" />
                  Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-xl border border-border bg-secondary/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Selected atoms</p>
                      <p className="text-xl font-bold">
                        {leftAtom}-{rightAtom}
                      </p>
                    </div>
                    <span className={cn("rounded-full border px-3 py-1 text-xs font-medium capitalize", getRegimeTone(regime))}>
                      {regime}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-xs text-muted-foreground">Bond type</p>
                    <p className="mt-1 font-medium">{getInteractionLabel(interactionType)}</p>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-xs text-muted-foreground">Overlap</p>
                    <p className="mt-1 font-medium">{getOverlapLabel(overlapType)}</p>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-xs text-muted-foreground">Current distance</p>
                    <p className="mt-1 font-mono font-medium">{formatDistance(distance)}</p>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-xs text-muted-foreground">Equilibrium length</p>
                    <p className="mt-1 font-mono font-medium">{formatDistance(activePreset.equilibriumDistance)}</p>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-xs text-muted-foreground">Bond energy</p>
                    <p className="mt-1 font-mono font-medium">{formatEnergy(activePreset.bondEnergy)}</p>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-xs text-muted-foreground">Potential now</p>
                    <p className="mt-1 font-mono font-medium">{formatEnergy(currentEnergy)}</p>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-xs text-muted-foreground">Bond order</p>
                    <p className="mt-1 font-medium">{getBondOrderLabel(activePreset.bondOrder)}</p>
                  </div>
                  <div className="rounded-xl border border-border p-3">
                    <p className="text-xs text-muted-foreground">Likely stable?</p>
                    <p className="mt-1 font-medium">{stable ? "Yes" : "No"}</p>
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border border-border bg-secondary/20 p-4 text-sm leading-relaxed text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">Force regime: </span>
                    {forceExplanation}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Overlap: </span>
                    {overlapExplanation}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Preset note: </span>
                    {activePreset.explanation}
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.aside>
        </div>
      </div>
    </div>
  )
}
