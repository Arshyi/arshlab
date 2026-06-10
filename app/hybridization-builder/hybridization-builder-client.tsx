"use client"

import { useMemo, useState } from "react"
import dynamic from "next/dynamic"
import { motion } from "framer-motion"
import {
  Atom,
  BookOpen,
  CircleDot,
  Layers3,
  Move3D,
  Orbit,
  Plus,
  RotateCcw,
  Sparkles,
  Target,
  Waves,
  X,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"
import {
  classifyOverlap,
  getHybridizationGeometry,
  getHybridOrbitalRequirement,
  listHybridizationPresets,
  type HybridizationMode,
  type HybridizationPreset,
  type OuterHybridAtom,
} from "@/lib/chemistry/database/hybridization"
import type { HybridizationOrbitalCounts } from "@/components/HybridizationBuilder3D"

const HybridizationBuilder3D = dynamic(
  () => import("@/components/HybridizationBuilder3D").then((mod) => mod.HybridizationBuilder3D),
  {
    ssr: false,
    loading: () => (
      <div className="flex aspect-[4/3] min-h-[340px] items-center justify-center rounded-2xl border border-border bg-secondary/30 lg:aspect-square">
        <p className="text-sm text-muted-foreground">Loading hybridization viewer...</p>
      </div>
    ),
  },
)

const centralAtoms = ["C", "N", "O", "B", "Be", "P", "S", "Xe"]
const outerAtomOptions = ["H", "F", "Cl", "O", "N", "C"]

const modeOptions: { value: HybridizationMode; label: string; detail: string }[] = [
  { value: "unhybridized", label: "unhybridized", detail: "separate s and p orbitals" },
  { value: "sp", label: "sp", detail: "linear, 180 deg" },
  { value: "sp2", label: "sp2", detail: "trigonal planar, 120 deg" },
  { value: "sp3", label: "sp3", detail: "tetrahedral, 109.5 deg" },
  { value: "sp3d", label: "sp3d", detail: "trigonal bipyramidal" },
  { value: "sp3d2", label: "sp3d2", detail: "octahedral" },
]

const presets = listHybridizationPresets()
const initialPreset = presets.find((preset) => preset.id === "ch4") ?? presets[0]

const educationCards = [
  {
    title: "What Hybridization Means",
    body: "Atomic orbitals can be combined into directional hybrid orbitals that point toward bonding regions.",
    icon: Orbit,
  },
  {
    title: "Why Orbitals Hybridize",
    body: "Hybridization helps explain observed bond angles and molecular shapes using electron-domain geometry.",
    icon: Sparkles,
  },
  {
    title: "sp vs sp2 vs sp3",
    body: "More p-orbital character creates more hybrid directions: two for sp, three for sp2, and four for sp3.",
    icon: Layers3,
  },
  {
    title: "Sigma Bonds",
    body: "Sigma bonds form from head-on overlap along the internuclear axis.",
    icon: Target,
  },
  {
    title: "Pi Bonds",
    body: "Pi bonds form when unhybridized p orbitals overlap side by side above and below a sigma framework.",
    icon: Waves,
  },
  {
    title: "Lone Pairs Shape Molecules",
    body: "Lone pairs count as electron domains, but they do not appear as outer atoms in molecular geometry.",
    icon: CircleDot,
  },
]

function buildOuterAtomsFromPreset(preset: HybridizationPreset): OuterHybridAtom[] {
  return preset.outerAtoms.map((symbol, index) => ({
    id: `${preset.id}-${symbol}-${index}`,
    symbol,
    directionIndex: index,
    distance: 1.18,
  }))
}

function getDefaultOrbitalCounts(mode: HybridizationMode): HybridizationOrbitalCounts {
  if (mode === "unhybridized") return { s: 1, p: 3, d: 0 }
  return getHybridOrbitalRequirement(mode)
}

function formatMode(mode: HybridizationMode): string {
  return mode === "unhybridized" ? "Unhybridized" : mode
}

function getFeedback(outerAtoms: OuterHybridAtom[]) {
  if (outerAtoms.length === 0) {
    return {
      title: "No outer atoms yet",
      body: "Add an outer atom, then drag it toward the central atom to test orbital overlap.",
      tone: "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
    }
  }

  const nearest = outerAtoms.reduce((closest, atom) => (atom.distance < closest.distance ? atom : closest), outerAtoms[0])
  const regime = classifyOverlap(nearest.distance)

  if (regime === "overlap") {
    return {
      title: "Sigma overlap formed",
      body: "Hybrid orbital overlap detected near the bonding direction.",
      tone: "border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300",
    }
  }

  if (regime === "too-close") {
    return {
      title: "Strong repulsion region",
      body: "The nuclei and electron clouds are too close for a stable bonding picture.",
      tone: "border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300",
    }
  }

  return {
    title: "Atoms too far apart",
    body: "Atoms are too far apart for strong overlap.",
    tone: "border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300",
  }
}

export function HybridizationBuilderClient() {
  const [selectedPresetId, setSelectedPresetId] = useState(initialPreset.id)
  const [centralAtom, setCentralAtom] = useState(initialPreset.centralAtom)
  const [mode, setMode] = useState<HybridizationMode>(initialPreset.mode)
  const [orbitalCounts, setOrbitalCounts] = useState<HybridizationOrbitalCounts>(
    getDefaultOrbitalCounts(initialPreset.mode),
  )
  const [isHybridized, setIsHybridized] = useState(true)
  const [outerAtomSymbol, setOuterAtomSymbol] = useState("H")
  const [outerAtoms, setOuterAtoms] = useState<OuterHybridAtom[]>(buildOuterAtomsFromPreset(initialPreset))

  const activePreset = useMemo(
    () => presets.find((preset) => preset.id === selectedPresetId),
    [selectedPresetId],
  )
  const geometry = getHybridizationGeometry(mode)
  const feedback = getFeedback(outerAtoms)
  const bondingDomains = activePreset?.bondingDomains ?? Math.min(outerAtoms.length, geometry.electronDomains)
  const lonePairs = activePreset?.lonePairs ?? Math.max(0, geometry.electronDomains - bondingDomains)
  const electronDomains = activePreset?.electronDomains ?? geometry.electronDomains
  const molecularGeometry = activePreset?.molecularGeometry ?? (lonePairs > 0 ? "Custom shape with lone pairs" : geometry.electronGeometry)
  const exampleMolecule = activePreset?.formula ?? "Custom model"
  const explanation = activePreset?.explanation ?? geometry.explanation

  const selectPreset = (preset: HybridizationPreset) => {
    setSelectedPresetId(preset.id)
    setCentralAtom(preset.centralAtom)
    setMode(preset.mode)
    setOrbitalCounts(getDefaultOrbitalCounts(preset.mode))
    setIsHybridized(true)
    setOuterAtomSymbol(preset.outerAtoms[0] ?? "H")
    setOuterAtoms(buildOuterAtomsFromPreset(preset))
  }

  const handleModeChange = (nextMode: HybridizationMode) => {
    setSelectedPresetId("custom")
    setMode(nextMode)
    setOrbitalCounts(getDefaultOrbitalCounts(nextMode))
    setIsHybridized(nextMode !== "unhybridized")
  }

  const addOuterAtom = () => {
    setSelectedPresetId("custom")
    setOuterAtoms((current) => [
      ...current,
      {
        id: `custom-${outerAtomSymbol}-${Date.now()}-${current.length}`,
        symbol: outerAtomSymbol,
        directionIndex: current.length % Math.max(1, geometry.directions.length),
        distance: 2.35,
      },
    ])
  }

  const updateOuterAtomDistance = (id: string, distance: number) => {
    setOuterAtoms((current) => current.map((atom) => (atom.id === id ? { ...atom, distance } : atom)))
  }

  const removeOuterAtom = (id: string) => {
    setSelectedPresetId("custom")
    setOuterAtoms((current) => current.filter((atom) => atom.id !== id))
  }

  const addSOrbital = () => {
    setSelectedPresetId("custom")
    setIsHybridized(false)
    setOrbitalCounts((current) => ({ ...current, s: Math.min(1, current.s + 1) }))
  }

  const addPOrbital = () => {
    setSelectedPresetId("custom")
    setIsHybridized(false)
    setOrbitalCounts((current) => ({ ...current, p: Math.min(3, current.p + 1) }))
  }

  const resetOrbitals = () => {
    setSelectedPresetId("custom")
    setIsHybridized(false)
    setOrbitalCounts({ s: 0, p: 0, d: 0 })
  }

  const hybridizeOrbitals = () => {
    setSelectedPresetId("custom")
    setOrbitalCounts(getDefaultOrbitalCounts(mode))
    setIsHybridized(mode !== "unhybridized")
  }

  const detailRows = [
    { label: "Central atom", value: centralAtom },
    { label: "Hybridization", value: formatMode(mode) },
    { label: "Electron domains", value: String(electronDomains) },
    { label: "Bonding domains", value: String(bondingDomains) },
    { label: "Lone pairs", value: String(lonePairs) },
    { label: "Electron geometry", value: geometry.electronGeometry },
    { label: "Molecular geometry", value: molecularGeometry },
    { label: "Ideal bond angles", value: activePreset?.idealBondAngles ?? geometry.idealBondAngles },
    { label: "Example molecule", value: exampleMolecule },
  ]

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Orbit className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Hybridization Builder</h1>
              <p className="text-muted-foreground">Build orbitals, hybridize them, and test conceptual overlap.</p>
            </div>
          </div>
          <p className="max-w-3xl text-lg leading-relaxed text-muted-foreground">
            Choose a central atom, switch between sp, sp2, sp3, sp3d, and sp3d2 modes, then move outer atoms
            into bonding directions to see sigma overlap and lone-pair shape effects.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[310px_minmax(0,1fr)_360px]">
          <motion.aside initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <Card className="rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Move3D className="h-5 w-5" />
                  Controls
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <label className="space-y-1.5 text-sm">
                  <span className="font-medium">Central atom</span>
                  <select
                    value={centralAtom}
                    onChange={(event) => {
                      setSelectedPresetId("custom")
                      setCentralAtom(event.target.value)
                    }}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  >
                    {centralAtoms.map((atom) => (
                      <option key={atom} value={atom}>
                        {atom}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="space-y-1.5 text-sm">
                  <span className="font-medium">Hybridization mode</span>
                  <select
                    value={mode}
                    onChange={(event) => handleModeChange(event.target.value as HybridizationMode)}
                    className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                  >
                    {modeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label} - {option.detail}
                      </option>
                    ))}
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" size="sm" onClick={addSOrbital} className="justify-start rounded-lg">
                    <Plus className="mr-2 h-4 w-4" />
                    Add s orbital
                  </Button>
                  <Button variant="outline" size="sm" onClick={addPOrbital} className="justify-start rounded-lg">
                    <Plus className="mr-2 h-4 w-4" />
                    Add p orbital
                  </Button>
                  <Button variant="outline" size="sm" onClick={resetOrbitals} className="justify-start rounded-lg">
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset orbitals
                  </Button>
                  <Button size="sm" onClick={hybridizeOrbitals} className="justify-start rounded-lg">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Hybridize
                  </Button>
                </div>

                <div className="rounded-xl border border-border bg-secondary/20 p-3">
                  <p className="text-xs font-medium text-muted-foreground">Orbital inventory</p>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="rounded-lg border border-border bg-background p-2">
                      <p className="font-mono text-lg font-bold">{orbitalCounts.s}</p>
                      <p className="text-xs text-muted-foreground">s</p>
                    </div>
                    <div className="rounded-lg border border-border bg-background p-2">
                      <p className="font-mono text-lg font-bold">{orbitalCounts.p}</p>
                      <p className="text-xs text-muted-foreground">p</p>
                    </div>
                    <div className="rounded-lg border border-border bg-background p-2">
                      <p className="font-mono text-lg font-bold">{orbitalCounts.d}</p>
                      <p className="text-xs text-muted-foreground">d</p>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Status: {isHybridized ? "hybrid orbitals shown" : "unhybridized orbitals shown"}
                  </p>
                </div>

                <div className="grid grid-cols-[1fr_auto] gap-2">
                  <label className="space-y-1.5 text-sm">
                    <span className="font-medium">Outer atom</span>
                    <select
                      value={outerAtomSymbol}
                      onChange={(event) => setOuterAtomSymbol(event.target.value)}
                      className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm"
                    >
                      {outerAtomOptions.map((atom) => (
                        <option key={atom} value={atom}>
                          {atom}
                        </option>
                      ))}
                    </select>
                  </label>
                  <Button onClick={addOuterAtom} className="mt-6 rounded-lg">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Distance / drag mode</p>
                    <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                      {outerAtoms.length} atoms
                    </span>
                  </div>
                  {outerAtoms.length === 0 ? (
                    <p className="rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">
                      Add an outer atom to control distance.
                    </p>
                  ) : (
                    outerAtoms.map((atom, index) => (
                      <div key={atom.id} className="rounded-xl border border-border bg-secondary/20 p-3">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="text-sm font-medium">
                            {atom.symbol} #{index + 1}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeOuterAtom(atom.id)}
                            className="h-7 w-7 rounded-lg p-0"
                            aria-label={`Remove ${atom.symbol}`}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <input
                          type="range"
                          min={0.48}
                          max={3.6}
                          step={0.01}
                          value={atom.distance}
                          onChange={(event) => updateOuterAtomDistance(atom.id, Number(event.target.value))}
                          className="w-full accent-teal-500"
                        />
                        <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
                          <span>{atom.distance.toFixed(2)} model units</span>
                          <span>{classifyOverlap(atom.distance).replace("-", " ")}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Example Presets</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-2">
                {presets.map((preset) => (
                  <Button
                    key={preset.id}
                    variant={selectedPresetId === preset.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => selectPreset(preset)}
                    className="justify-between rounded-lg"
                  >
                    <span>{preset.formula}</span>
                    <span className="text-xs opacity-75">{preset.mode}</span>
                  </Button>
                ))}
              </CardContent>
            </Card>
          </motion.aside>

          <motion.main initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <HybridizationBuilder3D
              centralAtom={centralAtom}
              mode={mode}
              orbitalCounts={orbitalCounts}
              isHybridized={isHybridized}
              outerAtoms={outerAtoms}
              lonePairs={lonePairs}
              onOuterAtomDistanceChange={updateOuterAtomDistance}
            />

            <Card className="rounded-2xl border-dashed">
              <CardContent className="flex gap-3 p-4">
                <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                <p className="text-sm leading-relaxed text-muted-foreground">
                  This is a simplified educational model. Hybrid orbitals are shown conceptually to help students
                  understand geometry and bonding.
                </p>
              </CardContent>
            </Card>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {educationCards.map((card) => {
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
            </div>
          </motion.main>

          <motion.aside initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <Card className="rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Zap className="h-5 w-5" />
                  Live Feedback
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className={cn("rounded-xl border p-4", feedback.tone)}>
                  <p className="font-semibold">{feedback.title}</p>
                  <p className="mt-1 text-sm leading-relaxed">{feedback.body}</p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  {detailRows.map((row) => (
                    <div key={row.label} className="rounded-xl border border-border p-3">
                      <p className="text-xs text-muted-foreground">{row.label}</p>
                      <p className="mt-1 font-medium">{row.value}</p>
                    </div>
                  ))}
                </div>

                <div className="rounded-xl border border-border bg-secondary/20 p-4 text-sm leading-relaxed text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground">Explanation: </span>
                    {explanation}
                  </p>
                  {activePreset && activePreset.lonePairs > 0 && (
                    <p className="mt-3">
                      <span className="font-medium text-foreground">Lone-pair note: </span>
                      Electron geometry counts both bonds and lone pairs, while molecular geometry names only the
                      atom positions.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Atom className="h-5 w-5" />
                  Shape Guide
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
                {modeOptions.slice(1).map((option) => (
                  <div key={option.value} className="rounded-xl border border-border bg-secondary/20 p-3">
                    <p className="font-medium text-foreground">{option.label}</p>
                    <p>{option.detail}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.aside>
        </div>
      </div>
    </div>
  )
}
