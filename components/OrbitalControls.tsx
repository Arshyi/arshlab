"use client"

import { RotateCcw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { OrbitalData, OrbitalFamily } from "@/data/orbitals"
import { filterOrbitals, getAvailableNValues } from "@/data/orbitals"
import type { OrbitalViewerSettings } from "@/components/OrbitalViewer3D"

interface OrbitalControlsProps {
  family: OrbitalFamily | "all"
  nFilter: number | "all"
  orbitalId: string
  settings: OrbitalViewerSettings
  showExplanation: boolean
  onFamilyChange: (family: OrbitalFamily | "all") => void
  onNFilterChange: (n: number | "all") => void
  onOrbitalChange: (id: string) => void
  onSettingsChange: (settings: OrbitalViewerSettings) => void
  onShowExplanationChange: (value: boolean) => void
  onResetCamera: () => void
}

const TOGGLE_ITEMS: { key: keyof OrbitalViewerSettings; label: string }[] = [
  { key: "showPhaseColors", label: "Show phase colors" },
  { key: "showRadialNodes", label: "Show radial nodes" },
  { key: "showAngularNodes", label: "Show angular nodes" },
  { key: "showNodeAsymptotes", label: "Show node asymptotes" },
  { key: "showAxes", label: "Show coordinate axes" },
  { key: "showNucleus", label: "Show nucleus" },
  { key: "showLabels", label: "Show orbital labels" },
  { key: "showWireframe", label: "Show wireframe overlay" },
  { key: "showDensityShell", label: "Show transparent density shell" },
  { key: "autoRotate", label: "Auto-rotate" },
]

export function OrbitalControls({
  family,
  nFilter,
  orbitalId,
  settings,
  showExplanation,
  onFamilyChange,
  onNFilterChange,
  onOrbitalChange,
  onSettingsChange,
  onShowExplanationChange,
  onResetCamera,
}: OrbitalControlsProps) {
  const availableN = getAvailableNValues(family)
  const filteredOrbitals = filterOrbitals(family, nFilter)

  const toggle = (key: keyof OrbitalViewerSettings) => {
    onSettingsChange({ ...settings, [key]: !settings[key] })
  }

  return (
    <div className="space-y-4">
      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Orbital Selection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Orbital family</Label>
            <Select value={family} onValueChange={(v) => onFamilyChange(v as OrbitalFamily | "all")}>
              <SelectTrigger className="w-full rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All families</SelectItem>
                <SelectItem value="s">s orbitals</SelectItem>
                <SelectItem value="p">p orbitals</SelectItem>
                <SelectItem value="d">d orbitals</SelectItem>
                <SelectItem value="f">f orbitals</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Principal quantum number (n)</Label>
            <Select
              value={nFilter === "all" ? "all" : String(nFilter)}
              onValueChange={(v) => onNFilterChange(v === "all" ? "all" : Number(v))}
            >
              <SelectTrigger className="w-full rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All n values</SelectItem>
                {availableN.map((n) => (
                  <SelectItem key={n} value={String(n)}>
                    n = {n}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Specific orbital</Label>
            <Select value={orbitalId} onValueChange={onOrbitalChange}>
              <SelectTrigger className="w-full rounded-xl">
                <SelectValue placeholder="Select orbital" />
              </SelectTrigger>
              <SelectContent>
                {filteredOrbitals.map((o: OrbitalData) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Visualization Layers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {TOGGLE_ITEMS.map(({ key, label }) => (
            <div key={key} className="flex items-center justify-between gap-3">
              <Label htmlFor={key} className="text-sm font-normal cursor-pointer">
                {label}
              </Label>
              <Switch id={key} checked={settings[key]} onCheckedChange={() => toggle(key)} />
            </div>
          ))}

          <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
            <Label htmlFor="show-explanation" className="text-sm font-normal cursor-pointer">
              Show explanation
            </Label>
            <Switch
              id="show-explanation"
              checked={showExplanation}
              onCheckedChange={onShowExplanationChange}
            />
          </div>

          <Button variant="outline" size="sm" className="mt-2 w-full gap-2" onClick={onResetCamera}>
            <RotateCcw className="h-3.5 w-3.5" />
            Reset camera
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-amber-500/30 bg-amber-500/5">
        <CardContent className="pt-4">
          <p className="text-xs leading-relaxed text-muted-foreground">
            <strong className="text-foreground">Educational disclaimer:</strong> These visuals are simplified
            teaching approximations — not outputs from a quantum chemistry solver. Phase colors represent
            wavefunction sign, not electric charge.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
