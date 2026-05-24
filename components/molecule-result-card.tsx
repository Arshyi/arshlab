"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { motion, AnimatePresence } from "framer-motion"
import Link from "next/link"
import {
  Droplets,
  Zap,
  FlaskConical,
  Atom,
  Copy,
  Check,
  Box,
  Grid2X2,
  Loader2,
  FlipHorizontal,
  Circle,
  Layers,
  GraduationCap,
  Radio,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { getStructureArt, type Compound } from "@/lib/chemistry/compounds"
import { findMolecule3DForCompound } from "@/lib/chemistry/molecules3d"
import {
  detectFunctionalGroups,
  getCompoundClassification,
  getStudyNotes,
} from "@/lib/chemistry/functional-group-detection"
import { getSpectroscopyForCompound } from "@/lib/chemistry/spectroscopy"
import { getFgColors } from "@/lib/fg-colors"

const MoleculeViewer3D = dynamic(
  () => import("@/components/molecule-viewer-3d").then((mod) => mod.MoleculeViewer3D),
  {
    ssr: false,
    loading: () => (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="aspect-square w-full rounded-xl border border-border bg-secondary/30 flex items-center justify-center"
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="text-center"
        >
          <Loader2 className="h-8 w-8 text-muted-foreground animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading 3D viewer...</p>
        </motion.div>
      </motion.div>
    ),
  }
)

interface MoleculeResultCardProps {
  compound: Compound
  viewMode: "2d" | "3d"
  onViewModeChange: (mode: "2d" | "3d") => void
  alternateOrientation?: boolean
  showLonePairs: boolean
  onShowLonePairsChange: (value: boolean) => void
  showSymmetry: boolean
  onShowSymmetryChange: (value: boolean) => void
  showStudyMode?: boolean
  onShowStudyModeChange?: (value: boolean) => void
}

export function MoleculeResultCard({
  compound,
  viewMode,
  onViewModeChange,
  alternateOrientation,
  showLonePairs,
  onShowLonePairsChange,
  showSymmetry,
  onShowSymmetryChange,
  showStudyMode = false,
  onShowStudyModeChange,
}: MoleculeResultCardProps) {
  const [copied, setCopied] = useState(false)

  const molecule3D = findMolecule3DForCompound(compound.name, compound.aliases)
  const has3D = molecule3D !== null
  const structureDisplay = getStructureArt(compound, showLonePairs)
  const detectedGroups = detectFunctionalGroups(compound)
  const classification = getCompoundClassification(compound)
  const studyNotes = getStudyNotes(compound)
  const hasSpectroscopy = getSpectroscopyForCompound(compound.name, compound.aliases) !== null

  const handleCopy = async () => {
    await navigator.clipboard.writeText(compound.formula)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="rounded-2xl overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <CardTitle className="text-2xl capitalize">{compound.name}</CardTitle>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/20 bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
                  {compound.family}
                </span>
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary/50 px-3 py-1 text-sm font-mono text-foreground hover:bg-secondary transition-colors"
                >
                  {compound.formula}
                  {copied ? (
                    <Check className="h-3 w-3 text-green-500" />
                  ) : (
                    <Copy className="h-3 w-3 text-muted-foreground" />
                  )}
                </button>
              </div>
            </motion.div>

            <div className="flex rounded-xl border border-border bg-secondary/50 p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewModeChange("2d")}
                className={cn("h-8 rounded-lg px-3", viewMode === "2d" && "bg-background shadow-sm")}
              >
                <Grid2X2 className="h-4 w-4 mr-1.5" />
                2D
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewModeChange("3d")}
                className={cn(
                  "h-8 rounded-lg px-3",
                  viewMode === "3d" && "bg-background shadow-sm",
                  !has3D && "opacity-50"
                )}
                disabled={!has3D}
                title={!has3D ? "3D structure not yet available for this molecule" : undefined}
              >
                <Box className="h-4 w-4 mr-1.5" />
                3D
              </Button>
            </div>
          </div>

          {alternateOrientation && (
            <div className="mt-3 rounded-lg border border-accent/20 bg-accent/5 px-3 py-2">
              <p className="text-sm text-accent">
                Recognized as equivalent structure:{" "}
                <span className="font-medium capitalize">{compound.name}</span>
              </p>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex flex-wrap gap-4 rounded-xl border border-border bg-secondary/30 px-4 py-3">
            <div className="flex items-center gap-2">
              <Switch
                id="show-lone-pairs"
                checked={showLonePairs}
                onCheckedChange={onShowLonePairsChange}
              />
              <Label htmlFor="show-lone-pairs" className="text-sm cursor-pointer flex items-center gap-1.5">
                <Circle className="h-3.5 w-3.5 text-muted-foreground" />
                Show Lone Pairs
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                id="show-symmetry"
                checked={showSymmetry}
                onCheckedChange={onShowSymmetryChange}
              />
              <Label htmlFor="show-symmetry" className="text-sm cursor-pointer flex items-center gap-1.5">
                <FlipHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
                Show Symmetry
              </Label>
            </div>
            {onShowStudyModeChange && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex items-center gap-2"
              >
                <Switch
                  id="show-study-mode"
                  checked={showStudyMode}
                  onCheckedChange={onShowStudyModeChange}
                />
                <Label htmlFor="show-study-mode" className="text-sm cursor-pointer flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5 text-muted-foreground" />
                  Study Mode
                </Label>
              </motion.div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {viewMode === "2d" ? (
              <motion.div
                key="2d"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="rounded-xl border border-border bg-secondary/30 p-6"
              >
                <div className="text-center">
                  <p className="text-xs text-muted-foreground mb-3">2D Structure (Text Art)</p>
                  <pre className="font-mono text-lg sm:text-xl text-foreground whitespace-pre leading-relaxed">
                    {structureDisplay}
                  </pre>
                  <p className="text-xs text-muted-foreground mt-4">
                    Condensed:{" "}
                    <span className="font-mono text-foreground">{compound.condensed}</span>
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="3d"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {molecule3D ? (
                  <MoleculeViewer3D
                    molecule={molecule3D}
                    showLonePairs={showLonePairs}
                    onShowLonePairsChange={onShowLonePairsChange}
                  />
                ) : (
                  <div className="rounded-xl border border-border bg-secondary/30 p-6 text-center min-h-[300px] flex flex-col items-center justify-center">
                    <Atom className="h-12 w-12 text-muted-foreground/50 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      3D structure not yet available for this molecule
                    </p>
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      Switch to 2D view to see the structure
                    </p>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {showSymmetry && compound.symmetry && (
            <div className="rounded-xl border border-border bg-secondary/50 p-4 space-y-2">
              <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                <FlipHorizontal className="h-4 w-4" />
                Symmetry
              </h4>
              <div className="grid gap-2 sm:grid-cols-2 text-sm">
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <span className="text-muted-foreground">Type: </span>
                  <span className="font-medium capitalize">{compound.symmetry.type}</span>
                </motion.div>
                <div>
                  <span className="text-muted-foreground">Equivalent ends: </span>
                  <span className="font-medium">{compound.symmetry.equivalentEnds ? "Yes" : "No"}</span>
                </div>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {compound.symmetry.explanation}
              </p>
              {compound.symmetry.equivalentEnds && (
                <p className="text-xs text-accent">Left and right ends are equivalent.</p>
              )}
              {compound.symmetry.type === "symmetric" && !compound.symmetry.equivalentEnds && (
                <p className="text-xs text-accent">Molecule has a plane or axis of symmetry.</p>
              )}
              {compound.symmetry.type === "asymmetric" && (
                <p className="text-xs text-muted-foreground">
                  Asymmetric due to functional group placement.
                </p>
              )}
            </div>
          )}

          {(detectedGroups.length > 0 || classification) && (
            <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-3">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Layers className="h-4 w-4" />
                Functional Groups
                {detectedGroups.length > 0 && (
                  <span className="text-xs font-normal text-muted-foreground">
                    ({detectedGroups.length} detected)
                  </span>
                )}
              </h4>
              {classification && (
                <span className="inline-flex rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent capitalize">
                  {classification}
                </span>
              )}
              <div className="flex flex-wrap gap-2">
                {detectedGroups.map((g) => {
                  const colors = getFgColors(g.color)
                  return (
                    <Link
                      key={g.id}
                      href={`/functional-groups`}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:opacity-80",
                        colors.badge
                      )}
                    >
                      {g.name}
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

          {showStudyMode && (
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-4 space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2 text-accent">
                <GraduationCap className="h-4 w-4" />
                Study Mode
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{studyNotes}</p>
              <p className="text-xs text-muted-foreground">
                IUPAC hint: <span className="font-mono text-foreground">{compound.condensed}</span>
              </p>
              {hasSpectroscopy && (
                <Link href={`/spectroscopy-lab?q=${encodeURIComponent(compound.name)}`}>
                  <Button variant="outline" size="sm" className="mt-2 rounded-lg gap-1.5">
                    <Radio className="h-3.5 w-3.5" />
                    View Spectra
                  </Button>
                </Link>
              )}
            </div>
          )}

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="grid gap-3 sm:grid-cols-2"
          >
            <PropertyCard
              icon={Zap}
              label="Polarity"
              value={compound.polarity}
              highlight={compound.polarity === "Polar"}
            />
            <PropertyCard
              icon={Droplets}
              label="H-Bonding"
              value={compound.hydrogenBonding ? "Yes" : "No"}
              highlight={compound.hydrogenBonding}
            />
            <PropertyCard
              icon={Atom}
              label="Functional Group"
              value={compound.functionalGroup}
              className="sm:col-span-2"
            />
            {compound.lonePairs && compound.lonePairs.length > 0 && (
              <PropertyCard
                icon={Circle}
                label="Lone Pairs"
                value={compound.lonePairs.map((lp) => `${lp.count} on ${lp.atom}`).join(", ")}
                className="sm:col-span-2"
                highlight
              />
            )}
          </motion.div>

          <div className="rounded-xl bg-secondary/50 p-4">
            <p className="text-sm text-muted-foreground leading-relaxed">{compound.explanation}</p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <h4 className="text-sm font-medium text-foreground mb-3 flex items-center gap-2">
              <FlaskConical className="h-4 w-4" />
              Common Reactions
            </h4>
            <div className="flex flex-wrap gap-2">
              {compound.commonReactions.map((reaction) => (
                <span
                  key={reaction}
                  className="rounded-full border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground"
                >
                  {reaction}
                </span>
              ))}
            </div>
          </motion.div>

          {has3D && viewMode === "2d" && (
            <div className="rounded-xl border border-accent/20 bg-accent/5 p-3">
              <p className="text-xs text-accent flex items-center gap-2">
                <Box className="h-4 w-4" />
                Interactive 3D model available! Click the 3D button above to explore.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

function PropertyCard({
  icon: Icon,
  label,
  value,
  highlight = false,
  className,
}: {
  icon: React.ElementType
  label: string
  value: string
  highlight?: boolean
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border p-3",
        highlight && "border-accent/30 bg-accent/5",
        className
      )}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          highlight ? "bg-accent/10" : "bg-secondary"
        )}
      >
        <Icon className={cn("h-4 w-4", highlight ? "text-accent" : "text-muted-foreground")} />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("text-sm font-medium", highlight ? "text-accent" : "text-foreground")}>
          {value}
        </p>
      </div>
    </div>
  )
}
