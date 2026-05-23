"use client"

import { useState } from "react"
import dynamic from "next/dynamic"
import { motion, AnimatePresence } from "framer-motion"
import { Droplets, Zap, FlaskConical, Atom, Copy, Check, Box, Grid2X2, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Compound } from "@/lib/chemistry/compounds"
import { findMolecule3D } from "@/lib/chemistry/molecules3d"

// Dynamically import the 3D viewer to avoid SSR issues
const MoleculeViewer3D = dynamic(
  () => import("@/components/molecule-viewer-3d").then(mod => mod.MoleculeViewer3D),
  { 
    ssr: false,
    loading: () => (
      <div className="aspect-square w-full rounded-xl border border-border bg-secondary/30 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 text-muted-foreground animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Loading 3D viewer...</p>
        </div>
      </div>
    )
  }
)

interface MoleculeResultCardProps {
  compound: Compound
  viewMode: "2d" | "3d"
  onViewModeChange: (mode: "2d" | "3d") => void
}

export function MoleculeResultCard({ compound, viewMode, onViewModeChange }: MoleculeResultCardProps) {
  const [copied, setCopied] = useState(false)
  
  // Try to find 3D molecule data
  const molecule3D = findMolecule3D(compound.name)
  const has3D = molecule3D !== null

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
            <div>
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
                  {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                </button>
              </div>
            </div>
            
            {/* View Mode Toggle */}
            <div className="flex rounded-xl border border-border bg-secondary/50 p-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewModeChange("2d")}
                className={cn(
                  "h-8 rounded-lg px-3",
                  viewMode === "2d" && "bg-background shadow-sm"
                )}
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
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Structure Visualization */}
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
                    {compound.structureArt}
                  </pre>
                  <p className="text-xs text-muted-foreground mt-4">
                    Condensed: <span className="font-mono text-foreground">{compound.condensed}</span>
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
                  <MoleculeViewer3D molecule={molecule3D} />
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

          {/* Properties Grid */}
          <div className="grid gap-3 sm:grid-cols-2">
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
          </div>

          {/* Explanation */}
          <div className="rounded-xl bg-secondary/50 p-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {compound.explanation}
            </p>
          </div>

          {/* Common Reactions */}
          <div>
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
          </div>
          
          {/* 3D availability note */}
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
      <div className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
        highlight ? "bg-accent/10" : "bg-secondary"
      )}>
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
