"use client"

import { useState, useMemo, useCallback, useEffect } from "react"
import dynamic from "next/dynamic"
import { motion } from "framer-motion"
import { Orbit } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { OrbitalControls } from "@/components/OrbitalControls"
import { OrbitalInfoCard } from "@/components/OrbitalInfoCard"
import { NodeSummaryCard, EducationalPanel } from "@/components/NodeSummaryCard"
import { DEFAULT_ORBITAL_SETTINGS } from "@/components/OrbitalViewer3D"
import type { OrbitalViewerSettings } from "@/components/OrbitalViewer3D"
import {
  DEFAULT_ORBITAL_ID,
  getOrbitalById,
  filterOrbitals,
  type OrbitalFamily,
} from "@/data/orbitals"

const OrbitalViewer3D = dynamic(
  () => import("@/components/OrbitalViewer3D").then((mod) => mod.OrbitalViewer3D),
  {
    ssr: false,
    loading: () => (
      <div className="flex aspect-[4/3] min-h-[320px] items-center justify-center rounded-xl border border-border bg-secondary/30 lg:aspect-square">
        <p className="text-sm text-muted-foreground">Loading 3D viewer…</p>
      </div>
    ),
  },
)

const PhaseLegend = dynamic(
  () => import("@/components/OrbitalViewer3D").then((mod) => mod.PhaseLegend),
  { ssr: false },
)

export default function OrbitalViewerPage() {
  const [family, setFamily] = useState<OrbitalFamily | "all">("p")
  const [nFilter, setNFilter] = useState<number | "all">(2)
  const [orbitalId, setOrbitalId] = useState(DEFAULT_ORBITAL_ID)
  const [settings, setSettings] = useState<OrbitalViewerSettings>(DEFAULT_ORBITAL_SETTINGS)
  const [showExplanation, setShowExplanation] = useState(true)
  const [resetToken, setResetToken] = useState(0)

  const filteredOrbitals = useMemo(() => filterOrbitals(family, nFilter), [family, nFilter])

  useEffect(() => {
    if (!filteredOrbitals.some((o) => o.id === orbitalId)) {
      const next = filteredOrbitals[0]
      if (next) setOrbitalId(next.id)
    }
  }, [filteredOrbitals, orbitalId])

  const orbital = useMemo(() => getOrbitalById(orbitalId) ?? getOrbitalById(DEFAULT_ORBITAL_ID)!, [orbitalId])

  const handleFamilyChange = useCallback((f: OrbitalFamily | "all") => {
    setFamily(f)
    setNFilter("all")
  }, [])

  const handleResetCamera = useCallback(() => {
    setResetToken((t) => t + 1)
  }, [])

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Orbit className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Orbital Viewer</h1>
              <p className="text-muted-foreground">Interactive 3D atomic orbitals — s, p, d & f</p>
            </div>
          </div>
          <p className="text-lg text-muted-foreground max-w-3xl mt-4">
            Explore electron probability regions across the periodic table. Rotate, zoom, and toggle node
            surfaces to build intuition for quantum numbers and orbital shapes.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <OrbitalControls
            family={family}
            nFilter={nFilter}
            orbitalId={orbitalId}
            settings={settings}
            showExplanation={showExplanation}
            onFamilyChange={handleFamilyChange}
            onNFilterChange={setNFilter}
            onOrbitalChange={setOrbitalId}
            onSettingsChange={setSettings}
            onShowExplanationChange={setShowExplanation}
            onResetCamera={handleResetCamera}
          />

          <div className="space-y-4">
            <OrbitalViewer3D orbital={orbital} settings={settings} resetToken={resetToken} />

            <Card className="rounded-2xl">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Phase Legend</CardTitle>
              </CardHeader>
              <CardContent>
                <PhaseLegend />
                <p className="mt-3 text-xs text-muted-foreground">
                  Phase colors show wavefunction sign (+ψ / −ψ). They do not represent electric charge.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {showExplanation && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 grid gap-6 lg:grid-cols-3"
          >
            <div className="lg:col-span-2">
              <OrbitalInfoCard orbital={orbital} visible={showExplanation} />
            </div>
            <div className="space-y-6">
              <NodeSummaryCard orbital={orbital} />
              <EducationalPanel />
            </div>
          </motion.div>
        )}

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Mouse: rotate · Scroll: zoom · Right-click / Shift-drag: pan · These models are educational
          approximations, not research-grade quantum chemistry.
        </p>
      </div>
    </div>
  )
}
